// Sprint 15 — AI QBR Copilot: shape validation, missing-evidence grounding,
// and the server-side sensitive-section guardrail for api/analyze.js's new
// "qbr-draft" mode. Run with: node --test tests/
//
// Uses MOCK_AI=true so these tests never make a real AI call (no cost, no
// network) — the mock draft path (mockQbrDraft in api/analyze.js) runs the
// exact same shape-building, title-attaching, and guardrail code as the real
// provider path, so it's a faithful test of the contract the client relies on.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;

const TEST_ORIGIN = "http://localhost:test-runner";
process.env.ALLOWED_ORIGINS = TEST_ORIGIN;
process.env.MOCK_AI = "true";
delete process.env.N8N_ANALYZE_WEBHOOK_URL;

const { default: handler, QBR_SECTION_DEFS, applyQbrSensitiveGuardrail } = await import("../api/analyze.js");

const QBR_SECTION_KEYS = QBR_SECTION_DEFS.map(s => s.key);
const SENSITIVE_KEYS = ["healthTrends", "risks", "previousInterventions"];
const LIST_CAPABLE_KEYS = QBR_SECTION_DEFS.filter(s => s.listCapable).map(s => s.key);
const NO_STRUCTURED_EVIDENCE_KEYS = ["businessObjectives", "previousInterventions", "openCommitments"];

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

// --- Shape ------------------------------------------------------------

test("qbr-draft returns exactly the 12 fixed sections, in order, with the expected keys", async () => {
  const { statusCode, body } = await callHandler({ mode: "qbr-draft", accountId: ACCOUNTS[0].accountId });
  assert.equal(statusCode, 200);
  assert.equal(body.accountId, ACCOUNTS[0].accountId);
  assert.ok(body.generatedAt);
  assert.equal(body.sections.length, 12);
  assert.deepEqual(body.sections.map(s => s.key), QBR_SECTION_KEYS);
});

test("every section carries a title and a non-empty internal draft", async () => {
  const { body } = await callHandler({ mode: "qbr-draft", accountId: ACCOUNTS[0].accountId });
  for (const s of body.sections) {
    assert.ok(s.title && s.title.length > 0, `section ${s.key} missing title`);
    assert.ok(typeof s.internal === "string" && s.internal.trim().length > 0, `section ${s.key} missing internal text`);
  }
});

test("unknown accountId is rejected", async () => {
  const { statusCode, body } = await callHandler({ mode: "qbr-draft", accountId: "ACC-does-not-exist" });
  assert.equal(statusCode, 404);
  assert.match(body.error, /accountId/i);
});

// --- Missing-evidence grounding ----------------------------------------

test("previousInterventions and openCommitments are never fabricated: every account states 'not available' (no such data exists in the dataset at all)", async () => {
  for (const account of ACCOUNTS.slice(0, 5)) { // a handful is enough; the field simply doesn't exist in the schema for any account
    const { body } = await callHandler({ mode: "qbr-draft", accountId: account.accountId });
    for (const key of ["previousInterventions", "openCommitments"]) {
      const section = body.sections.find(s => s.key === key);
      assert.match(section.internal, /not available/i, `expected "${key}" to state no evidence is available for ${account.accountId}`);
    }
  }
});

test("businessObjectives states 'not available' for an account with no recorded value milestone", async () => {
  const noMilestoneAccount = ACCOUNTS.find(a => !a.valueMilestone);
  assert.ok(noMilestoneAccount, "expected at least one account without a valueMilestone in the dataset");
  const { body } = await callHandler({ mode: "qbr-draft", accountId: noMilestoneAccount.accountId });
  const section = body.sections.find(s => s.key === "businessObjectives");
  assert.match(section.internal, /not available/i);
});

test("businessObjectives is grounded in the recorded value milestone when one exists (not invented)", async () => {
  const milestoneAccount = ACCOUNTS.find(a => a.valueMilestone);
  assert.ok(milestoneAccount, "expected at least one account with a valueMilestone in the dataset");
  const { body } = await callHandler({ mode: "qbr-draft", accountId: milestoneAccount.accountId });
  const section = body.sections.find(s => s.key === "businessObjectives");
  assert.doesNotMatch(section.internal, /not available/i);
  assert.match(section.internal, new RegExp(milestoneAccount.valueMilestone.achievedDate));
});

// --- Sensitive-section guardrail ----------------------------------------

test("applyQbrSensitiveGuardrail forces customerSafeDefault to null for healthTrends/risks/previousInterventions regardless of input", () => {
  const input = QBR_SECTION_KEYS.map(key => ({ key, internal: "x", customerSafeDefault: "a plausible-looking but forbidden customer-safe string" }));
  const result = applyQbrSensitiveGuardrail(input);
  for (const s of result) {
    if (SENSITIVE_KEYS.includes(s.key)) assert.equal(s.customerSafeDefault, null, `expected ${s.key} to be nulled`);
    else assert.equal(s.customerSafeDefault, "a plausible-looking but forbidden customer-safe string");
  }
});

test("applyQbrSensitiveGuardrail leaves non-sensitive sections' customerSafeDefault untouched, including null", () => {
  const input = [
    { key: "executiveSummary", internal: "x", customerSafeDefault: "safe text" },
    { key: "adoption", internal: "x", customerSafeDefault: null },
  ];
  const result = applyQbrSensitiveGuardrail(input);
  assert.equal(result[0].customerSafeDefault, "safe text");
  assert.equal(result[1].customerSafeDefault, null);
});

test("the qbr-draft endpoint itself never leaks a customer-safe default for the 3 sensitive sections, even though the mock draft supplies one (proves the guardrail is unconditional, not just a mock omission)", async () => {
  const { body } = await callHandler({ mode: "qbr-draft", accountId: ACCOUNTS[0].accountId });
  for (const key of SENSITIVE_KEYS) {
    const section = body.sections.find(s => s.key === key);
    assert.equal(section.customerSafeDefault, null, `expected ${key}.customerSafeDefault to be null`);
  }
});

test("non-sensitive sections may still carry a customer-safe draft (not blanket-nulled)", async () => {
  const { body } = await callHandler({ mode: "qbr-draft", accountId: ACCOUNTS[0].accountId });
  const nonSensitiveWithDefault = body.sections.filter(s => !SENSITIVE_KEYS.includes(s.key) && s.customerSafeDefault !== null);
  assert.ok(nonSensitiveWithDefault.length > 0, "expected at least one non-sensitive section to carry a customer-safe draft");
});

// --- Presentation content contract (2026-08 PPTX content model) ---------

test("applyQbrSensitiveGuardrail also forces presentationText/presentationItems to null for sensitive sections", () => {
  const input = QBR_SECTION_KEYS.map(key => ({
    key, internal: "x", customerSafeDefault: "forbidden",
    presentationText: "forbidden concise text",
    presentationItems: LIST_CAPABLE_KEYS.includes(key) ? ["forbidden item"] : null,
  }));
  const result = applyQbrSensitiveGuardrail(input);
  for (const s of result) {
    if (SENSITIVE_KEYS.includes(s.key)) {
      assert.equal(s.presentationText, null, `expected ${s.key}.presentationText to be nulled`);
      assert.equal(s.presentationItems, null, `expected ${s.key}.presentationItems to be nulled`);
    } else {
      assert.equal(s.presentationText, "forbidden concise text");
    }
  }
});

test("the qbr-draft endpoint never leaks presentationText/presentationItems for the 3 sensitive sections", async () => {
  const { body } = await callHandler({ mode: "qbr-draft", accountId: ACCOUNTS[0].accountId });
  for (const key of SENSITIVE_KEYS) {
    const section = body.sections.find(s => s.key === key);
    assert.equal(section.presentationText, null, `expected ${key}.presentationText to be null`);
    assert.equal(section.presentationItems, null, `expected ${key}.presentationItems to be null`);
  }
});

test("non-sensitive sections carry a presentationText draft", async () => {
  const { body } = await callHandler({ mode: "qbr-draft", accountId: ACCOUNTS[0].accountId });
  const withPresentationText = body.sections.filter(s => !SENSITIVE_KEYS.includes(s.key) && typeof s.presentationText === "string" && s.presentationText.trim().length > 0);
  assert.ok(withPresentationText.length > 0, "expected at least one non-sensitive section to carry a presentationText draft");
});

test("only list-capable sections (openCommitments, nextQuarterPlan) carry presentationItems; every other section is null", async () => {
  const { body } = await callHandler({ mode: "qbr-draft", accountId: ACCOUNTS[0].accountId });
  for (const s of body.sections) {
    if (LIST_CAPABLE_KEYS.includes(s.key) && !SENSITIVE_KEYS.includes(s.key)) {
      assert.ok(Array.isArray(s.presentationItems) && s.presentationItems.length > 0, `expected ${s.key}.presentationItems to be a non-empty array`);
    } else if (!SENSITIVE_KEYS.includes(s.key)) {
      assert.equal(s.presentationItems, null, `expected ${s.key}.presentationItems to be null (not list-capable)`);
    }
  }
});
