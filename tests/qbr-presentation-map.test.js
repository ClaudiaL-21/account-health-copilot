// QBR PPTX export — pure mapper tests (src/qbrPresentationMap.js).
// No PptxGenJS/browser dependency here — fast, and covers the PO decisions
// this file encodes:
//   1. one reviewed section -> one list item, never split.
//   2. recommendation/recommendedNextSteps: never present.
//   3. itemsToAlignCount: never derived from risk criteria.
//   4. sources: never present.
//   5. desiredOutcomes/customerPriorities/supportingMetrics: never present.
//   6. health chart data comes only from account.healthScoreHistory.
//   7. healthScoreCurrent/adoptionTrendPct are deterministic account facts,
//      present regardless of review state.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mapQbrToPresentation, SLOT_CHAR_LIMITS } from "../src/qbrPresentationMap.js";
import { computeHealthScore } from "../src/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;
const alpenbank = ACCOUNTS.find(a => a.accountId === "ACC-01");

const baseSections = [
  { key: "executiveSummary", safeText: "Steady engagement this quarter with strong executive sponsorship." },
  { key: "valueDelivered", safeText: "Champion presented platform ROI to leadership, unprompted." },
  { key: "adoption", safeText: "Adoption is steady at 57%, with room to grow in Offer Management." },
  { key: "relationship", safeText: "Executive sponsor engaged; champion active and advocating internally." },
  { key: "renewalOutlook", safeText: "Contract runs through April 2027 with continued budget support." },
  { key: "openCommitments", safeText: "We will provide an updated onboarding checklist and schedule a walkthrough." },
  { key: "nextQuarterPlan", safeText: "Planned: resolve outstanding items and run adoption workshop." },
];

// --- Field mapping -----------------------------------------------------

test("DIRECT sections map verbatim from the reviewed safeText", () => {
  const { content } = mapQbrToPresentation({ account: alpenbank, sections: baseSections });
  assert.equal(content.valueDelivered, "Champion presented platform ROI to leadership, unprompted.");
  assert.equal(content.adoption, "Adoption is steady at 57%, with room to grow in Offer Management.");
  assert.equal(content.relationship, "Executive sponsor engaged; champion active and advocating internally.");
  assert.equal(content.renewalOutlook, "Contract runs through April 2027 with continued budget support.");
});

test("customerName and period are deterministic account facts, not from sections", () => {
  const { content } = mapQbrToPresentation({ account: alpenbank, sections: [] });
  assert.equal(content.customerName, alpenbank.accountName);
  assert.match(content.period, /^Q[1-4] \d{4}$/);
});

test("healthScoreCurrent and adoptionTrendPct are present even with zero reviewed sections (decision 7)", () => {
  const { content } = mapQbrToPresentation({ account: alpenbank, sections: [] });
  assert.equal(content.healthScoreCurrent, computeHealthScore(alpenbank).score);
  assert.equal(content.adoptionTrendPct, alpenbank.usage.sessionsTrendPct);
});

// --- Decision 1: one item, never split ----------------------------------

test("a reviewed section becomes exactly one list item, not split into several", () => {
  const multiSentence = "First point about adoption. Second point about risk. Third point about renewal.";
  const { content } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "executiveSummary", safeText: multiSentence }],
  });
  assert.deepEqual(content.executiveSummary, [multiSentence]);
});

// --- Customer-safe-only: only given keys ever surface -------------------

test("a section key not included by the CSM never appears in any output field", () => {
  const { content } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "valueDelivered", safeText: "Only value delivered was included." }],
  });
  assert.equal(content.adoption, null);
  assert.equal(content.relationship, null);
  assert.deepEqual(content.executiveSummary, []);
  assert.deepEqual(content.openCommitments, []);
});

test("unknown/malformed section entries are ignored, not surfaced or thrown", () => {
  const { content, warnings } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "not-a-real-key", safeText: "should never appear anywhere" }],
  });
  assert.equal(JSON.stringify(content).includes("should never appear anywhere"), false);
  assert.deepEqual(warnings, []);
});

// --- Decisions 2, 3, 4, 5: always-omitted fields -------------------------

test("recommendation/recommendedNextSteps are never present, regardless of nextQuarterPlan content", () => {
  const { content } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "nextQuarterPlan", safeText: "We recommend a workshop next quarter." }],
  });
  assert.equal("recommendation" in content, false);
  assert.equal("recommendedNextSteps" in content, false);
});

test("itemsToAlignCount, sources, desiredOutcomes, customerPriorities, supportingMetrics are never present", () => {
  const { content } = mapQbrToPresentation({ account: alpenbank, sections: baseSections });
  for (const key of ["itemsToAlignCount", "sources", "desiredOutcomes", "customerPriorities", "supportingMetrics"]) {
    assert.equal(key in content, false, `"${key}" must never be present in mapper output`);
  }
});

// --- Decision 6: health chart from healthScoreHistory only ---------------

test("healthTrendsChart comes from account.healthScoreHistory, not from any reviewed prose", () => {
  const { content } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "healthTrends", safeText: "This text must never become chart data." }],
  });
  assert.deepEqual(content.healthTrendsChart, alpenbank.healthScoreHistory);
  assert.ok(content.healthTrendsChart.every(p => typeof p.score === "number" && typeof p.date === "string"));
});

test("healthTrendsChart is an empty array (not fabricated points) for an account with no history", () => {
  const noHistory = { ...alpenbank, healthScoreHistory: [] };
  const { content } = mapQbrToPresentation({ account: noHistory, sections: [] });
  assert.deepEqual(content.healthTrendsChart, []);
});

// --- Commitment rendering -------------------------------------------------

test("openCommitments with one reviewed item produces a single-item list", () => {
  const { content } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "openCommitments", safeText: "We will send the updated checklist." }],
  });
  assert.deepEqual(content.openCommitments, ["We will send the updated checklist."]);
  assert.deepEqual(content.ongoingCommitments, ["We will send the updated checklist."]);
});

test("openCommitments is an empty list (not a placeholder) when not reviewed", () => {
  const { content } = mapQbrToPresentation({ account: alpenbank, sections: [] });
  assert.deepEqual(content.openCommitments, []);
});

// --- Overflow validation ---------------------------------------------------

test("text within the slot limit produces no warning", () => {
  const { warnings } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "valueDelivered", safeText: "Short and within limits." }],
  });
  assert.deepEqual(warnings, []);
});

test("text over the slot limit produces a warning identifying slide and slot, and does not truncate content", () => {
  const longText = "x".repeat(SLOT_CHAR_LIMITS.valueDelivered + 50);
  const { content, warnings } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "valueDelivered", safeText: longText }],
  });
  assert.equal(content.valueDelivered, longText, "content must be passed through verbatim, never silently truncated");
  assert.ok(warnings.length >= 1);
  assert.ok(warnings.some(w => w.slot === "valueDelivered" && w.slide.includes("Executive Summary")));
});

test("a section feeding two slides (valueDelivered -> businessImpact) warns for both when over limit", () => {
  const longText = "x".repeat(SLOT_CHAR_LIMITS.valueDelivered + 50);
  const { warnings } = mapQbrToPresentation({
    account: alpenbank,
    sections: [{ key: "valueDelivered", safeText: longText }],
  });
  const slides = warnings.map(w => w.slide);
  assert.ok(slides.some(s => s.includes("02")));
  assert.ok(slides.some(s => s.includes("03")));
});
