// Co-PO review round 1 — Point 1: mode-specific AI response validation.
// Syntactically valid JSON is not enough; each mode's actually expected shape
// must hold, and team-priority's accountId/order must exactly match the
// deterministic ranking so a model reorder can never attach content to the
// wrong customer. Uses the n8n provider path with a local dummy server to
// inject arbitrary (but valid-JSON) AI output — no real n8n/OpenAI call.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computePriorityScore } from "../src/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;

const TOP5_ACCOUNT_IDS = ACCOUNTS
  .map(a => ({ id: a.accountId, score: computePriorityScore(a).score }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
  .map(x => x.id);

const TEST_ORIGIN = "http://localhost:test-runner";
const TEST_SECRET = "test-only-secret-do-not-use";

let currentResponseText = "{}";
const dummyServer = createServer((req, res) => {
  let body = "";
  req.on("data", c => { body += c; });
  req.on("end", () => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ text: currentResponseText }));
  });
});
const dummyUrl = await new Promise(resolve => {
  dummyServer.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${dummyServer.address().port}`));
});

process.env.ALLOWED_ORIGINS = TEST_ORIGIN;
process.env.MOCK_AI = "false";
process.env.AI_PROVIDER = "n8n";
process.env.N8N_ANALYZE_WEBHOOK_URL = dummyUrl;
process.env.N8N_WEBHOOK_SECRET = TEST_SECRET;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;

const { default: handler } = await import("../api/analyze.js");

// This file now makes more calls than api/_security.js's per-IP rate limit
// (15/60s) — give each call a distinct simulated client IP so the shared
// in-memory limiter never interferes with what these tests actually check.
let callCounter = 0;

function callHandler(body) {
  callCounter += 1;
  return new Promise((resolve, reject) => {
    const req = {
      method: "POST",
      headers: { origin: TEST_ORIGIN, "x-forwarded-for": `10.0.0.${callCounter}` },
      socket: {},
      body,
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      setHeader() {},
      json(obj) { resolve({ statusCode: this.statusCode, body: obj }); },
      end() { resolve({ statusCode: this.statusCode, body: null }); },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

// --- account-insight ---

test("account-insight: well-formed response passes", async () => {
  currentResponseText = JSON.stringify({
    sentiment: { label: "neutral", rationale: "ok" },
    narrative: "ok narrative",
    nextBestAction: { category: "risk_mitigation", action: "Call.", rationale: "Because." },
  });
  const { statusCode, body } = await callHandler({ mode: "account-insight", accountId: ACCOUNTS[0].accountId });
  assert.equal(statusCode, 200);
  assert.equal(body.narrative, "ok narrative");
});

test("account-insight: invalid sentiment.label is rejected", async () => {
  currentResponseText = JSON.stringify({
    sentiment: { label: "furious", rationale: "ok" },
    narrative: "ok narrative",
    nextBestAction: { category: "risk_mitigation", action: "Call.", rationale: "Because." },
  });
  const { statusCode } = await callHandler({ mode: "account-insight", accountId: ACCOUNTS[0].accountId });
  assert.equal(statusCode, 502);
});

test("account-insight: empty narrative is rejected", async () => {
  currentResponseText = JSON.stringify({
    sentiment: { label: "neutral", rationale: "ok" },
    narrative: "",
    nextBestAction: { category: "risk_mitigation", action: "Call.", rationale: "Because." },
  });
  const { statusCode } = await callHandler({ mode: "account-insight", accountId: ACCOUNTS[0].accountId });
  assert.equal(statusCode, 502);
});

test("account-insight: nextBestAction.action over 700 chars is rejected", async () => {
  currentResponseText = JSON.stringify({
    sentiment: { label: "neutral", rationale: "ok" },
    narrative: "ok",
    nextBestAction: { category: "risk_mitigation", action: "a".repeat(701), rationale: "Because." },
  });
  const { statusCode } = await callHandler({ mode: "account-insight", accountId: ACCOUNTS[0].accountId });
  assert.equal(statusCode, 502);
});

test("account-insight: unknown nextBestAction.category is rejected", async () => {
  currentResponseText = JSON.stringify({
    sentiment: { label: "neutral", rationale: "ok" },
    narrative: "ok",
    nextBestAction: { category: "expand_wildly", action: "Call.", rationale: "Because." },
  });
  const { statusCode } = await callHandler({ mode: "account-insight", accountId: ACCOUNTS[0].accountId });
  assert.equal(statusCode, 502);
});

// --- ask ---

test("ask: well-formed answer passes", async () => {
  currentResponseText = JSON.stringify({ answer: "42" });
  const { statusCode, body } = await callHandler({ mode: "ask", accountId: ACCOUNTS[0].accountId, question: "?" });
  assert.equal(statusCode, 200);
  assert.equal(body.answer, "42");
});

test("ask: empty answer is rejected", async () => {
  currentResponseText = JSON.stringify({ answer: "" });
  const { statusCode } = await callHandler({ mode: "ask", accountId: ACCOUNTS[0].accountId, question: "?" });
  assert.equal(statusCode, 502);
});

// --- portfolio-ask ---

test("portfolio-ask: well-formed answer passes", async () => {
  currentResponseText = JSON.stringify({ answer: "summary" });
  const { statusCode, body } = await callHandler({ mode: "portfolio-ask", accountIds: [ACCOUNTS[0].accountId], question: "?" });
  assert.equal(statusCode, 200);
  assert.equal(body.answer, "summary");
});

test("portfolio-ask: missing answer field is rejected", async () => {
  currentResponseText = JSON.stringify({ notAnswer: "oops" });
  const { statusCode } = await callHandler({ mode: "portfolio-ask", accountIds: [ACCOUNTS[0].accountId], question: "?" });
  assert.equal(statusCode, 502);
});

// --- team-priority ---

function validTeamPriorityResponse() {
  return JSON.stringify({
    accounts: TOP5_ACCOUNT_IDS.map(id => ({
      accountId: id,
      synthesis: "ok",
      nextBestAction: { category: "risk_mitigation", action: "Call.", rationale: "Because." },
    })),
    patternAlert: "",
  });
}

test("team-priority: well-formed, correctly ordered response passes", async () => {
  currentResponseText = validTeamPriorityResponse();
  const { statusCode, body } = await callHandler({ mode: "team-priority", csmId: null });
  assert.equal(statusCode, 200);
  assert.deepEqual(body.priorities.map(p => p.accountId), TOP5_ACCOUNT_IDS);
});

test("team-priority: wrong accounts array length is rejected", async () => {
  const parsed = JSON.parse(validTeamPriorityResponse());
  parsed.accounts.pop();
  currentResponseText = JSON.stringify(parsed);
  const { statusCode } = await callHandler({ mode: "team-priority", csmId: null });
  assert.equal(statusCode, 502);
});

test("team-priority: reordered/swapped accountId is rejected (never attaches content to the wrong customer)", async () => {
  const parsed = JSON.parse(validTeamPriorityResponse());
  [parsed.accounts[0], parsed.accounts[1]] = [parsed.accounts[1], parsed.accounts[0]];
  currentResponseText = JSON.stringify(parsed);
  const { statusCode } = await callHandler({ mode: "team-priority", csmId: null });
  assert.equal(statusCode, 502);
});

test("team-priority: an unknown accountId in a position is rejected", async () => {
  const parsed = JSON.parse(validTeamPriorityResponse());
  parsed.accounts[0].accountId = "ACC-does-not-exist";
  currentResponseText = JSON.stringify(parsed);
  const { statusCode } = await callHandler({ mode: "team-priority", csmId: null });
  assert.equal(statusCode, 502);
});

// Co-PO review, round 2 — Point 1: the product promise is exactly one
// synthesis and exactly one Next Best Action per prioritized account, so
// neither may be missing/empty — unlike the earlier (now removed) tolerance
// for a null nextBestAction.

test("team-priority: an empty synthesis at one position is rejected", async () => {
  const parsed = JSON.parse(validTeamPriorityResponse());
  parsed.accounts[2].synthesis = "";
  currentResponseText = JSON.stringify(parsed);
  const { statusCode } = await callHandler({ mode: "team-priority", csmId: null });
  assert.equal(statusCode, 502);
});

test("team-priority: a missing nextBestAction at one position is rejected", async () => {
  const parsed = JSON.parse(validTeamPriorityResponse());
  delete parsed.accounts[2].nextBestAction;
  currentResponseText = JSON.stringify(parsed);
  const { statusCode } = await callHandler({ mode: "team-priority", csmId: null });
  assert.equal(statusCode, 502);
});

test("team-priority: a null nextBestAction at one position is rejected", async () => {
  const parsed = JSON.parse(validTeamPriorityResponse());
  parsed.accounts[2].nextBestAction = null;
  currentResponseText = JSON.stringify(parsed);
  const { statusCode } = await callHandler({ mode: "team-priority", csmId: null });
  assert.equal(statusCode, 502);
});

after(() => new Promise(resolve => dummyServer.close(resolve)));
