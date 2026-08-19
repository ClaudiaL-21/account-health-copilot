// Block D — deterministic tests for src/qbrMasterContentMap.js (Slides 3, 9,
// 10 content contract).
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

test("slide3 uses real usage.adoptionRatePct/activeUsers and real support.topFeatureRequest fields, verbatim", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.equal(content.slide3.adoptionRatePct, ALPENBANK.usage.adoptionRatePct);
  assert.equal(content.slide3.activeUsers, ALPENBANK.usage.activeUsers);
  assert.equal(content.slide3.topFeatureRequestText, ALPENBANK.support.topFeatureRequest);
  assert.equal(content.slide3.featureRequestSentiment, ALPENBANK.support.featureRequestSentiment);
  assert.equal(content.slide3.featureRequestsCount, ALPENBANK.support.featureRequestsCount);
});

test("slide3 has no engagementScore/avgWeeklySessions/nextSteps fields — no unsupported data invented", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  const keys = JSON.stringify(content.slide3);
  for (const forbidden of ["engagementScore", "avgWeeklySessions", "nextSteps"]) {
    assert.doesNotMatch(keys, new RegExp(forbidden, "i"));
  }
});

test("slide9 hero fields map to valueDelivered/adoption presentationText, buildFuture prefers relationship over nextQuarterPlan", () => {
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [
      { key: "valueDelivered", safeText: "full", presentationText: "Value story." },
      { key: "adoption", safeText: "full", presentationText: "Adoption story." },
      { key: "relationship", safeText: "full", presentationText: "Relationship story." },
      { key: "nextQuarterPlan", safeText: "full", presentationText: "Plan story." },
    ],
  });
  assert.equal(content.slide9.driveImpactText, "Value story.");
  assert.equal(content.slide9.scaleWorksText, "Adoption story.");
  assert.equal(content.slide9.buildFutureText, "Relationship story.");
  assert.equal(content.slide9.nextStepsText, "Plan story.");
});

test("slide9 buildFuture falls back to nextQuarterPlan when relationship is absent", () => {
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "nextQuarterPlan", safeText: "full", presentationText: "Plan story." }],
  });
  assert.equal(content.slide9.buildFutureText, "Plan story.");
});

test("slide9 has no invented seat-count field", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.doesNotMatch(JSON.stringify(content.slide9), /seat/i);
});

test("slide10 avgResolutionDays is the real deterministic field, never converted to hours", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.equal(content.slide10.avgResolutionDays, ALPENBANK.support.avgResolutionDays);
});

test("slide10 NPS delta only computed with >=2 historical values, current always latest", () => {
  const points = ALPENBANK.relationship.npsHistory;
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.equal(content.slide10.npsCurrent, points[points.length - 1].score);
  assert.equal(content.slide10.npsDelta, points[points.length - 1].score - points[points.length - 2].score);

  const oneAccount = { ...ALPENBANK, relationship: { ...ALPENBANK.relationship, npsHistory: [points[0]] } };
  const { content: single } = mapQbrToMasterContent({ account: oneAccount, sections: [] });
  assert.equal(single.slide10.npsDelta, null);
});

test("slide10 previousInterventions (sensitive) never falls back to draft/default — null unless reviewed", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.equal(content.slide10.previousInterventionsText, null);
});

test("slide10 previousInterventions used once reviewed, and no Sources/ticketDeflection fields exist", () => {
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "previousInterventions", safeText: "full", presentationText: "Reviewed intervention note." }],
  });
  assert.equal(content.slide10.previousInterventionsText, "Reviewed intervention note.");
  assert.doesNotMatch(JSON.stringify(content.slide10), /source|deflection/i);
});

test("a realistic long feature-request text blocks export with a field-level warning on slide3", () => {
  const longText = "Faster segment refresh rates across every workspace, ideally near-real-time instead of the current 24-hour batch cadence, requested repeatedly by the operations and analytics teams this quarter.";
  const acc = { ...ALPENBANK, support: { ...ALPENBANK.support, topFeatureRequest: longText } };
  const { warnings } = mapQbrToMasterContent({ account: acc, sections: [] });
  assert.ok(warnings.some(w => w.slot.includes("top feature request")));
});
