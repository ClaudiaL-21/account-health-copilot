// Sprint 14C — Canonical Customer AI Context: regression tests for
// src/customerContext.js, the single source of truth every AI prompt
// (account-insight, account-ask, portfolio-ask — shared by Portfolio/Map/
// Value Matrix/Renewal Radar/Features — and team-priority) now builds its
// customer data from. Mostly pure-function tests against the real demo
// dataset (no AI/network cost); one integration-style block at the bottom
// extends the existing dummy-n8n-webhook pattern (see
// portfolio-ask-csm-name.test.js) to prove the real request pipeline — not
// just the unit-tested functions — actually uses this context.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildCustomerContext, formatAccountContextText, formatCustomerSummaryLine } from "../src/customerContext.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8"));
const ACCOUNTS = DATA.accounts;
const CSM_NAME_BY_ID = new Map(DATA.csms.map(c => [c.csmId, c.name]));
const csmName = csmId => CSM_NAME_BY_ID.get(csmId) ?? csmId;

const lukas = DATA.csms.find(c => c.name.includes("Lukas"));
const lukasAccounts = ACCOUNTS.filter(a => a.csmId === lukas.csmId);
const alpenbank = ACCOUNTS.find(a => a.accountId === "ACC-01"); // Vienna, Austria; has a feature request
const accountWithoutFeatureRequest = ACCOUNTS.find(a => !a.support.topFeatureRequest); // ACC-09 as of writing

// --- buildCustomerContext: structured fields ---

test("buildCustomerContext: CSM name and ID are both present", () => {
  const ctx = buildCustomerContext(alpenbank, { csmName: csmName(alpenbank.csmId) });
  assert.equal(ctx.facts.csmId, alpenbank.csmId);
  assert.equal(ctx.facts.csmName, csmName(alpenbank.csmId));
  assert.notEqual(ctx.facts.csmName, alpenbank.csmId, "csmName must resolve to the real name, not fall back to the raw ID when one is given");
});

test("buildCustomerContext: falls back to the raw csmId if no name is supplied (never crashes, never blank)", () => {
  const ctx = buildCustomerContext(alpenbank, {});
  assert.equal(ctx.facts.csmName, alpenbank.csmId);
});

test("buildCustomerContext: country/region/location are carried through verbatim", () => {
  const ctx = buildCustomerContext(alpenbank, {});
  assert.equal(ctx.facts.region, alpenbank.region);
  assert.equal(ctx.facts.subregion, alpenbank.subregion);
  assert.deepEqual(ctx.facts.location, { city: alpenbank.location.city, country: alpenbank.location.country });
});

test("buildCustomerContext: ARR and renewal date are present", () => {
  const ctx = buildCustomerContext(alpenbank, {});
  assert.equal(ctx.facts.contract.arrUSD, alpenbank.contract.arrUSD);
  assert.equal(ctx.facts.contract.nextRenewalDate, alpenbank.contract.nextRenewalDate);
  assert.equal(typeof ctx.derived.daysToRenewal, "number");
});

test("buildCustomerContext: feature request (text, sentiment, count, since) is present when the account has one", () => {
  const ctx = buildCustomerContext(alpenbank, {});
  assert.ok(ctx.facts.featureRequest);
  assert.equal(ctx.facts.featureRequest.text, alpenbank.support.topFeatureRequest);
  assert.equal(ctx.facts.featureRequest.sentiment, alpenbank.support.featureRequestSentiment);
  assert.equal(ctx.facts.featureRequest.count, alpenbank.support.featureRequestsCount);
  assert.equal(ctx.facts.featureRequest.since, alpenbank.support.featureRequestSince);
});

// --- Grounding: missing data must surface as "not available", never guessed ---

test("buildCustomerContext: an account with no feature request logged gets null, not an invented one", () => {
  assert.ok(accountWithoutFeatureRequest, "expected at least one real demo account without a feature request");
  const ctx = buildCustomerContext(accountWithoutFeatureRequest, {});
  assert.equal(ctx.facts.featureRequest, null);
});

test("buildCustomerContext: a synthetic account with no location gets null, never inferred from its name/industry", () => {
  const fictionalAccountNoLocation = {
    ...alpenbank,
    accountName: "Definitely A German Sounding GmbH", // deliberately misleading name
    location: undefined,
  };
  const ctx = buildCustomerContext(fictionalAccountNoLocation, {});
  assert.equal(ctx.facts.location, null, "must not infer a country from the account name");
});

test("formatAccountContextText: says location is not on record instead of omitting the topic entirely", () => {
  const fictionalAccountNoLocation = { ...alpenbank, location: undefined };
  const text = formatAccountContextText(buildCustomerContext(fictionalAccountNoLocation, {}));
  assert.match(text, /Location: not on record — do not guess it\./);
});

test("formatAccountContextText / formatCustomerSummaryLine: 'no feature request' is stated explicitly, not silently dropped", () => {
  const ctx = buildCustomerContext(accountWithoutFeatureRequest, {});
  assert.match(formatAccountContextText(ctx), /No open feature request on record\./);
  assert.match(formatCustomerSummaryLine(ctx), /Feature request: none logged/);
});

// --- Format functions: the exact substrings prior sprints' regressions checked for ---

test("formatAccountContextText: includes CSM name+ID, location, ARR and renewal date", () => {
  const ctx = buildCustomerContext(alpenbank, { csmName: csmName(alpenbank.csmId) });
  const text = formatAccountContextText(ctx);
  assert.match(text, new RegExp(`CSM: ${csmName(alpenbank.csmId)} \\(${alpenbank.csmId}\\)`));
  assert.match(text, new RegExp(`Location: ${alpenbank.location.city}, ${alpenbank.location.country}`));
  assert.ok(text.includes(`$${alpenbank.contract.arrUSD}`));
  assert.ok(text.includes(alpenbank.contract.nextRenewalDate));
});

test("formatCustomerSummaryLine: includes CSM name+ID, region/location and ARR in the compact multi-account line", () => {
  const ctx = buildCustomerContext(alpenbank, { csmName: csmName(alpenbank.csmId) });
  const line = formatCustomerSummaryLine(ctx);
  assert.match(line, new RegExp(`CSM: ${csmName(alpenbank.csmId)} \\(${alpenbank.csmId}\\)`));
  assert.match(line, new RegExp(`Location: ${alpenbank.location.city}, ${alpenbank.location.country}`));
  assert.ok(line.includes(`ARR $${alpenbank.contract.arrUSD}`));
  assert.ok(line.includes(`Renewal ${alpenbank.contract.nextRenewalDate}`));
});

// --- CSM -> accounts / portfolio-level aggregation (still a pure-function check:
// this is exactly what the AI is given, one line per account) ---

test("CSM -> accounts: every one of Lukas's real accounts formats with his name and no other CSM's", () => {
  assert.ok(lukasAccounts.length > 0);
  const lines = lukasAccounts.map(a => formatCustomerSummaryLine(buildCustomerContext(a, { csmName: csmName(a.csmId) })));
  lines.forEach(line => assert.ok(line.includes(`CSM: ${lukas.name} (${lukas.csmId})`)));
});

// --- Filter/search scope: only the given subset of accounts ends up in the
// built context set — mirrors what getFilteredAccounts()/search narrows
// list to client-side before accountIds ever reaches the server. ---

test("Filter/search scope: building context for a narrowed account subset never includes accounts outside it", () => {
  const narrowed = lukasAccounts.slice(0, 2); // simulates e.g. a search narrowing the visible list
  const lines = narrowed.map(a => formatCustomerSummaryLine(buildCustomerContext(a, { csmName: csmName(a.csmId) })));
  assert.equal(lines.length, 2);
  const otherAccountId = ACCOUNTS.find(a => !narrowed.includes(a)).accountId;
  lines.forEach(line => assert.ok(!line.includes(otherAccountId)));
});

// --- Integration: the real request pipeline (api/analyze.js) actually uses
// this module, via a local dummy n8n webhook — no real AI/network call. ---

const TEST_ORIGIN = "http://localhost:test-runner";
const TEST_SECRET = "test-only-secret-do-not-use";

let lastRequestBody = null;
const dummyServer = createServer((req, res) => {
  let body = "";
  req.on("data", c => { body += c; });
  req.on("end", () => {
    lastRequestBody = JSON.parse(body);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ text: JSON.stringify({ answer: "ok" }) }));
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

let callCounter = 0;
function callHandler(body) {
  callCounter += 1;
  return new Promise((resolve, reject) => {
    const req = { method: "POST", headers: { origin: TEST_ORIGIN, "x-forwarded-for": `10.1.0.${callCounter}` }, socket: {}, body };
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

test("integration: portfolio-ask outbound prompt (scoped to a subset of accountIds) contains CSM name, location, ARR, renewal and feature request — and excludes accounts outside that scope", async () => {
  const excluded = ACCOUNTS.find(a => a.csmId !== lukas.csmId);
  const { statusCode } = await callHandler({
    mode: "portfolio-ask",
    accountIds: lukasAccounts.map(a => a.accountId),
    question: "Summarize this portfolio.",
  });
  assert.equal(statusCode, 200);
  const prompt = lastRequestBody.user;
  assert.ok(prompt.includes(lukas.name), "CSM name missing from prompt");
  assert.ok(prompt.includes(alpenbank.location.country), "location missing from prompt");
  assert.ok(prompt.includes(String(alpenbank.contract.arrUSD)), "ARR missing from prompt");
  assert.ok(prompt.includes(alpenbank.contract.nextRenewalDate), "renewal date missing from prompt");
  assert.ok(prompt.includes(alpenbank.support.topFeatureRequest), "feature request text missing from prompt");
  assert.ok(!prompt.includes(excluded.accountId), "an account outside the filtered/searched scope leaked into the prompt");
});

test("integration: account-ask outbound prompt for a single account includes CSM name and location", async () => {
  const { statusCode } = await callHandler({
    mode: "ask",
    accountId: alpenbank.accountId,
    question: "Where is this account and who is the CSM?",
  });
  assert.equal(statusCode, 200);
  const prompt = lastRequestBody.user;
  assert.ok(prompt.includes(`CSM: ${lukas.name} (${lukas.csmId})`));
  assert.ok(prompt.includes(`Location: ${alpenbank.location.city}, ${alpenbank.location.country}`));
});

after(() => new Promise(resolve => dummyServer.close(resolve)));
