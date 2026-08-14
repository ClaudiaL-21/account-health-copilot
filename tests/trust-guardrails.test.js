// Sprint 01 — Trust Guardrails: verification for the two server-side rules
// in api/analyze.js (applyExpansionGuardrail, computeEvidenceConfidence).
// Run with: node --test tests/
//
// These are pure-function unit tests. They import the real handler module
// (which only reads data/accounts.json at import time — no network call, no
// AI cost) so the guardrail/confidence logic under test is the exact code
// path used by both the mock and real providers in account-insight and
// team-priority (see api/analyze.js: handleAccountInsight, mockInsight,
// handleTeamPriority, mockTeamPriority all call the same two functions).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applyExpansionGuardrail, computeEvidenceConfidence } from "../api/analyze.js";
import { computeHealthScore } from "../src/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;

// Fixed reference date used by src/scoring.js daysSince(): 2026-08-10.
function isoDaysAgo(n) {
  return new Date(Date.UTC(2026, 7, 10) - n * 86400000).toISOString().slice(0, 10);
}
function artifact(daysAgo, type = "email") {
  return { type, date: isoDaysAgo(daysAgo), text: "placeholder" };
}

const HIGH_HEALTH = {
  riskCategory: "high",
  criteria: [{ key: "usageDecline", label: "Usage/Adoption Decline", rawValue: "Adoption 20% · Sessions trend -30%", points: 18 }],
};
const MEDIUM_HEALTH = { ...HIGH_HEALTH, riskCategory: "medium" };
const LOW_HEALTH = { ...HIGH_HEALTH, riskCategory: "low" };
const GROWTH_NBA = { category: "growth", action: "Propose a new module.", rationale: "Account is healthy." };
const RISK_MITIGATION_NBA = { category: "risk_mitigation", action: "Call now about the open ticket.", rationale: "Top risk driver." };

// --- Rule 1: hard expansion guardrail -------------------------------------

test("high risk + growth is converted to a risk-mitigation action, not just relabeled", () => {
  const account = { relationship: { championName: "Jane Doe" } };
  const result = applyExpansionGuardrail(account, HIGH_HEALTH, GROWTH_NBA);
  assert.equal(result.category, "risk_mitigation");
  assert.notEqual(result.action, GROWTH_NBA.action);
  assert.notEqual(result.rationale, GROWTH_NBA.rationale);
  assert.match(result.action, /Jane Doe/);
  assert.match(result.action, /usage\/adoption decline/i);
});

test("high risk fallback action omits champion name when none is on record (no invented facts)", () => {
  const account = { relationship: {} };
  const result = applyExpansionGuardrail(account, HIGH_HEALTH, GROWTH_NBA);
  assert.equal(result.category, "risk_mitigation");
  assert.doesNotMatch(result.action, /Jane Doe/);
});

test("high risk + already risk_mitigation is left content-unchanged", () => {
  const account = { relationship: { championName: "Jane Doe" } };
  const result = applyExpansionGuardrail(account, HIGH_HEALTH, RISK_MITIGATION_NBA);
  assert.deepEqual(result, RISK_MITIGATION_NBA);
});

test("low risk + growth is left unchanged", () => {
  const account = { relationship: { championName: "Jane Doe" } };
  const result = applyExpansionGuardrail(account, LOW_HEALTH, GROWTH_NBA);
  assert.deepEqual(result, GROWTH_NBA);
});

test("medium risk + growth is NOT auto-recategorized (spec: only high risk is gated)", () => {
  const account = { relationship: { championName: "Jane Doe" } };
  const result = applyExpansionGuardrail(account, MEDIUM_HEALTH, GROWTH_NBA);
  assert.deepEqual(result, GROWTH_NBA);
});

test("missing nextBestAction (e.g. AI omitted it) passes through without throwing", () => {
  const account = { relationship: { championName: "Jane Doe" } };
  assert.equal(applyExpansionGuardrail(account, HIGH_HEALTH, null), null);
});

test("guardrail applied against a real high-risk account from data/accounts.json", () => {
  const real = ACCOUNTS.map(a => ({ account: a, health: computeHealthScore(a) }))
    .find(x => x.health.riskCategory === "high");
  assert.ok(real, "expected at least one high-risk account in the dataset for this test");
  const result = applyExpansionGuardrail(real.account, real.health, GROWTH_NBA);
  assert.equal(result.category, "risk_mitigation");
  assert.notEqual(result.action, GROWTH_NBA.action);
});

// --- Rule 2: evidence confidence thresholds -------------------------------

test("0 points (0 artifacts) -> low", () => {
  const { level, reason } = computeEvidenceConfidence({ freeTextArtifacts: [] });
  assert.equal(level, "low");
  assert.match(reason, /0 artifact/);
});

test("1 point (1 stale artifact, single type) -> low", () => {
  const { level } = computeEvidenceConfidence({ freeTextArtifacts: [artifact(45)] });
  assert.equal(level, "low");
});

test("2 points (1 recent artifact, single type) -> medium", () => {
  const { level } = computeEvidenceConfidence({ freeTextArtifacts: [artifact(10)] });
  assert.equal(level, "medium");
});

test("3 points (2 recent artifacts, single type) -> medium", () => {
  const { level } = computeEvidenceConfidence({ freeTextArtifacts: [artifact(10), artifact(20)] });
  assert.equal(level, "medium");
});

test("4 points (4 recent artifacts, single type) -> high", () => {
  const { level } = computeEvidenceConfidence({
    freeTextArtifacts: [artifact(10), artifact(15), artifact(20), artifact(25)],
  });
  assert.equal(level, "high");
});

test("5 points (4 recent artifacts, 2 source types) -> high, reason mentions counts", () => {
  const { level, reason } = computeEvidenceConfidence({
    freeTextArtifacts: [artifact(5, "email"), artifact(10, "chat"), artifact(15), artifact(20)],
  });
  assert.equal(level, "high");
  assert.match(reason, /4 artifact/);
  assert.match(reason, /2 distinct source type/);
});

test("confidence for a real account never returns an undefined level", () => {
  for (const account of ACCOUNTS) {
    const { level } = computeEvidenceConfidence(account);
    assert.ok(["low", "medium", "high"].includes(level), `unexpected level for ${account.accountId}: ${level}`);
  }
});
