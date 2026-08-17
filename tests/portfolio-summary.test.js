// Development Day 1 — Manager View: shape, scope, and grounding tests for
// api/analyze.js's new "portfolio-summary" mode. Run with: node --test tests/
//
// Uses MOCK_AI=true — no real AI call, no cost. The mock path
// (mockPortfolioSummary in api/analyze.js) runs through the exact same
// kpis-computation, shape-construction, and allowlist-response code as the
// real provider path.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeHealthScore } from "../src/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;

const TEST_ORIGIN = "http://localhost:test-runner";
process.env.ALLOWED_ORIGINS = TEST_ORIGIN;
process.env.MOCK_AI = "true";
delete process.env.N8N_ANALYZE_WEBHOOK_URL;

const { default: handler } = await import("../api/analyze.js");

function callHandler(body) {
  return new Promise((resolve, reject) => {
    const req = { method: "POST", headers: { origin: TEST_ORIGIN }, socket: {}, body };
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

const ALL_IDS = ACCOUNTS.map(a => a.accountId);
const HIGH_RISK_IDS = ACCOUNTS.filter(a => computeHealthScore(a).riskCategory === "high").map(a => a.accountId);

// --- Shape ---------------------------------------------------------------

test("portfolio-summary returns kpis + summary with exactly 3 topPriorities", async () => {
  const { statusCode, body } = await callHandler({ mode: "portfolio-summary", accountIds: ALL_IDS });
  assert.equal(statusCode, 200);
  assert.ok(body.kpis);
  assert.ok(body.summary);
  assert.ok(typeof body.summary.whatNeedsAttention === "string" && body.summary.whatNeedsAttention.length > 0);
  assert.ok(typeof body.summary.whyItMatters === "string" && body.summary.whyItMatters.length > 0);
  assert.equal(body.summary.topPriorities.length, 3);
  body.summary.topPriorities.forEach(p => assert.ok(typeof p === "string" && p.length > 0));
});

test("response contains no unexpected top-level or summary fields beyond the known contract", async () => {
  const { body } = await callHandler({ mode: "portfolio-summary", accountIds: ALL_IDS });
  assert.deepEqual(Object.keys(body).sort(), ["kpis", "summary"]);
  assert.deepEqual(Object.keys(body.summary).sort(), ["topPriorities", "whatNeedsAttention", "whyItMatters"]);
});

test("empty accountIds returns a safe, deterministic response without calling the AI provider", async () => {
  const { statusCode, body } = await callHandler({ mode: "portfolio-summary", accountIds: [] });
  assert.equal(statusCode, 200);
  assert.equal(body.kpis.totalAccounts, 0);
  assert.match(body.summary.whatNeedsAttention, /no accounts/i);
});

test("missing accountIds field (not an array) is treated as empty, not a crash", async () => {
  const { statusCode, body } = await callHandler({ mode: "portfolio-summary" });
  assert.equal(statusCode, 200);
  assert.equal(body.kpis.totalAccounts, 0);
});

// --- Scope -----------------------------------------------------------------

test("High-risk filter scope: kpis.totalAccounts and riskCounts reflect only the high-risk accountIds sent, not the full portfolio", async () => {
  const { body } = await callHandler({ mode: "portfolio-summary", accountIds: HIGH_RISK_IDS });
  assert.equal(body.kpis.totalAccounts, HIGH_RISK_IDS.length);
  assert.equal(body.kpis.riskCounts.high, HIGH_RISK_IDS.length);
  assert.equal(body.kpis.riskCounts.medium, 0);
  assert.equal(body.kpis.riskCounts.low, 0);
});

test("a small explicit subset of accountIds produces kpis matching exactly that subset's ARR", async () => {
  const subset = ACCOUNTS.slice(0, 3);
  const { body } = await callHandler({ mode: "portfolio-summary", accountIds: subset.map(a => a.accountId) });
  const manualArr = subset.reduce((s, a) => s + a.contract.arrUSD, 0);
  assert.equal(body.kpis.totalAccounts, 3);
  assert.equal(body.kpis.totalArrUSD, manualArr);
});

test("full portfolio scope (all accountIds) matches the dataset total, confirming scope isn't silently narrowed or widened", async () => {
  const { body } = await callHandler({ mode: "portfolio-summary", accountIds: ALL_IDS });
  assert.equal(body.kpis.totalAccounts, ACCOUNTS.length);
});

// --- Grounding (mock path exercises the real prompt-building/kpis code) ----

test("mock summary text only references accounts/numbers actually in the given scope (High-risk scope never mentions 0 as the at-risk count when high-risk accounts exist)", async () => {
  const { body } = await callHandler({ mode: "portfolio-summary", accountIds: HIGH_RISK_IDS });
  assert.ok(body.kpis.arrAtRiskUSD > 0);
  assert.match(body.summary.whatNeedsAttention, new RegExp(String(HIGH_RISK_IDS.length)));
});

test("unknown accountId in the list is silently excluded from the scope, not fabricated into a phantom account", async () => {
  const { body } = await callHandler({ mode: "portfolio-summary", accountIds: [ALL_IDS[0], "ACC-does-not-exist"] });
  assert.equal(body.kpis.totalAccounts, 1);
});
