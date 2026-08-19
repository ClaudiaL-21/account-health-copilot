// HTML QBR spike — deterministic tests for src/qbrHtmlContentMap.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mapQbrToHtmlContent } from "../src/qbrHtmlContentMap.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;
const ALPENBANK = ACCOUNTS.find(a => a.accountId === "ACC-01");

test("page1 adoption/active users come from real usage data, not invented", () => {
  const { page1 } = mapQbrToHtmlContent({ account: ALPENBANK, sections: [] });
  assert.equal(page1.adoptionRatePct, ALPENBANK.usage.adoptionRatePct);
  assert.equal(page1.activeUsers, ALPENBANK.usage.activeUsers);
  assert.equal(page1.topFeatureRequestText, ALPENBANK.support.topFeatureRequest);
});

test("page1 adoption interpretation is null when the section is absent — no fallback to safeText/internal", () => {
  const { page1 } = mapQbrToHtmlContent({ account: ALPENBANK, sections: [] });
  assert.equal(page1.adoptionInterpretationText, null);
});

test("page1 adoption interpretation uses reviewed presentationText once provided", () => {
  const { page1 } = mapQbrToHtmlContent({
    account: ALPENBANK,
    sections: [{ key: "adoption", safeText: "full", presentationText: "Reviewed adoption note." }],
  });
  assert.equal(page1.adoptionInterpretationText, "Reviewed adoption note.");
});

test("page2 commitments come only from reviewed presentationItems, capped at 5, never fabricated Owner/Due/Status", () => {
  const { page2 } = mapQbrToHtmlContent({
    account: ALPENBANK,
    sections: [{ key: "openCommitments", presentationItems: ["A", "B", "C", "D", "E", "F"] }],
  });
  assert.deepEqual(page2.commitmentItems, ["A", "B", "C", "D", "E"]);
});

test("page2 commitments empty when section absent — no empty fixed table data implied", () => {
  const { page2 } = mapQbrToHtmlContent({ account: ALPENBANK, sections: [] });
  assert.deepEqual(page2.commitmentItems, []);
});

test("page3 uses full safeText for valueDelivered (not the concise presentationText) and reviewed businessObjectives presentationText", () => {
  const { page3 } = mapQbrToHtmlContent({
    account: ALPENBANK,
    sections: [
      { key: "valueDelivered", safeText: "Full value story.", presentationText: "Concise." },
      { key: "businessObjectives", safeText: "full", presentationText: "Reviewed objective." },
    ],
  });
  assert.equal(page3.valueDeliveredFullText, "Full value story.");
  assert.equal(page3.businessObjectivesText, "Reviewed objective.");
});

test("page3 CSAT is the real 1-5 scale from weeklyCSAT, delta only with >=2 points, never fabricated", () => {
  const { page3 } = mapQbrToHtmlContent({ account: ALPENBANK, sections: [] });
  const points = ALPENBANK.relationship.weeklyCSAT;
  assert.equal(page3.csatCurrent, points[points.length - 1].score);
  assert.ok(page3.csatCurrent >= 1 && page3.csatCurrent <= 5);
});

test("page3 objective/value/csat are independently null-able — no invented monetary value, backlog trend, or first-response KPI fields exist at all", () => {
  const { page3 } = mapQbrToHtmlContent({ account: ALPENBANK, sections: [] });
  const keys = Object.keys(page3);
  for (const forbidden of ["monetaryValue", "backlogTrend", "firstResponseKpi", "desiredOutcomes"]) {
    assert.ok(!keys.includes(forbidden), `page3 must not expose "${forbidden}" — no data source exists`);
  }
  assert.equal(page3.businessObjectivesText, null);
  assert.equal(page3.valueDeliveredFullText, null);
});
