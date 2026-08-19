// Block B — deterministic tests for src/qbrMasterContentMap.js (Slides 1, 2,
// 6, 7 content contract). Pure function, no pptx-automizer/file I/O needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mapQbrToMasterContent } from "../src/qbrMasterContentMap.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;
const ALPENBANK = ACCOUNTS.find(a => a.accountId === "ACC-01");

function sections(overrides) {
  const defaults = { valueDelivered: "", adoption: "", renewalOutlook: "", businessObjectives: "", healthTrends: "", risks: "" };
  const merged = { ...defaults, ...overrides };
  return Object.entries(merged)
    .filter(([, presentationText]) => presentationText !== undefined)
    .map(([key, presentationText]) => ({ key, safeText: `${presentationText || "x"} (full)`, presentationText }));
}

test("no unsupported/sample values leak — slide7 valueDelivered $ KPI, ticket backlog, first response, desired outcomes have no field in the content contract at all", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: sections({}) });
  const slide7Keys = Object.keys(content.slide7);
  for (const forbidden of ["kpiAmount", "ticketBacklog", "firstResponse", "desiredOutcomes"]) {
    assert.ok(!slide7Keys.includes(forbidden), `slide7 content must not expose "${forbidden}" — no data source exists`);
  }
});

test("deterministic Health Score maps from computeHealthScore, not from reviewed prose", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.equal(typeof content.slide2.healthScoreCurrent, "number");
  assert.ok(content.slide2.healthScoreCurrent >= 0 && content.slide2.healthScoreCurrent <= 100);
});

test("healthTrendsChart comes from account.healthScoreHistory verbatim, empty sections included", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.deepEqual(content.slide2.healthTrendsChart, ALPENBANK.healthScoreHistory.filter(p => typeof p.score === "number" && typeof p.date === "string"));
});

test("slide6 fact text is derived from real healthScoreHistory (first vs current), not invented", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  const first = ALPENBANK.healthScoreHistory[0].score;
  assert.match(content.slide6.factText, new RegExp(String(first)));
  assert.match(content.slide6.factText, new RegExp(String(content.slide2.healthScoreCurrent)));
});

test("reviewed presentationText is used where specified; sections absent from the input never populate a slot", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: sections({ valueDelivered: "Concise value story." }) });
  assert.equal(content.slide6.valueDeliveredText, "Concise value story.");
  assert.equal(content.slide6.adoptionText, null, "adoption section absent from input -> null, not a fallback");
});

test("sensitive presentation fields (healthTrends, risks) never fall back to default content — absent input means null, not internal/customerSafeDefault text", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] }); // simulates an un-reviewed sensitive section
  assert.equal(content.slide2.interpretationText, null);
  assert.equal(content.slide2.areasForAttentionText, null);
  assert.equal(content.slide6.interpretationText, null);
});

test("sensitive presentation fields ARE used once actually reviewed/entered by the CSM", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: sections({ healthTrends: "Reviewed trend note.", risks: "Reviewed risk note." }) });
  assert.equal(content.slide2.interpretationText, "Reviewed trend note.");
  assert.equal(content.slide2.areasForAttentionText, "Reviewed risk note.");
});

test("slide7 valueDelivered uses the FULL safeText, distinct from slide6's concise presentationText (no duplication)", () => {
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "valueDelivered", safeText: "The full, longer reviewed value story with more detail.", presentationText: "Concise version." }],
  });
  assert.equal(content.slide6.valueDeliveredText, "Concise version.");
  assert.equal(content.slide7.valueDeliveredFullText, "The full, longer reviewed value story with more detail.");
});

test("CSAT is reported on the real 1-5 scale, current value = latest weekly observation", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  const points = ALPENBANK.relationship.weeklyCSAT;
  assert.equal(content.slide7.csatCurrent, points[points.length - 1].score);
  assert.ok(content.slide7.csatCurrent <= 5, "CSAT must stay on the 1-5 scale, never converted to /100");
});

test("CSAT delta is computed only with >=2 historical observations, and stays on the 1-5 scale", () => {
  const account = { ...ALPENBANK, relationship: { ...ALPENBANK.relationship, weeklyCSAT: [{ weekStartDate: "2026-08-03", score: 4 }] } };
  const { content: onePoint } = mapQbrToMasterContent({ account, sections: [] });
  assert.equal(onePoint.slide7.csatDelta, null, "a single observation must never produce a delta");

  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  const points = ALPENBANK.relationship.weeklyCSAT;
  const expectedDelta = Math.round((points[points.length - 1].score - points[points.length - 2].score) * 10) / 10;
  assert.equal(content.slide7.csatDelta, expectedDelta);
});

test("missing weeklyCSAT history entirely -> csatCurrent is null (slot hidden), never fabricated", () => {
  const account = { ...ALPENBANK, relationship: { ...ALPENBANK.relationship, weeklyCSAT: [] } };
  const { content } = mapQbrToMasterContent({ account, sections: [] });
  assert.equal(content.slide7.csatCurrent, null);
  assert.equal(content.slide7.csatDelta, null);
});

// --- Overflow / geometry-based capacity validation -----------------------

test("short reviewed presentation text produces no overflow warning", () => {
  const { warnings } = mapQbrToMasterContent({ account: ALPENBANK, sections: sections({ valueDelivered: "Short, fits easily." }) });
  assert.equal(warnings.length, 0);
});

test("a realistic long reviewed text (276 chars, the kind that overflowed the old PptxGenJS slots) is blocked with a field-level warning, not silently truncated", () => {
  const longText = "Your team has already used the platform to build an ROI case that was presented internally in April, which shows value recognition at leadership level. Usage growth since Q1 has been modest, and we acknowledge there are technical and workflow blockers we want to remove.";
  assert.ok(longText.length > 250, "sanity: this must be a realistically long presentation text");
  const { warnings, content } = mapQbrToMasterContent({ account: ALPENBANK, sections: sections({ valueDelivered: longText }) });
  assert.ok(warnings.length > 0, "expected at least one overflow warning for a 276-char value-delivered card slot");
  assert.ok(warnings.some(w => w.slot.includes("valueDelivered")));
  // content still carries the full text (never truncated by the mapper itself — the export endpoint blocks on warnings instead)
  assert.equal(content.slide6.valueDeliveredText, longText);
});
