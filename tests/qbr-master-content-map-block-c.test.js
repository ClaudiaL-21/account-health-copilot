// Block C — deterministic tests for src/qbrMasterContentMap.js (Slides 4, 5,
// 8 content contract). Pure function, no pptx-automizer/file I/O needed.
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

test("openCommitments presentationItems map into slide4.commitmentItems verbatim, capped at 5", () => {
  const items = ["Confirm data residency requirements.", "Onboard two new analysts.", "Ship the report export fix.", "Item 4", "Item 5", "Item 6 must be dropped"];
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "openCommitments", safeText: "full", presentationItems: items }],
  });
  assert.equal(content.slide4.commitmentItems.length, 5);
  assert.deepEqual(content.slide4.commitmentItems, items.slice(0, 5));
});

test("no owner/role/dueDate/status fields exist anywhere in slide4 content — no structured field invented", () => {
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "openCommitments", safeText: "full", presentationItems: ["One commitment."] }],
  });
  const keys = JSON.stringify(content.slide4);
  for (const forbidden of ["owner", "role", "dueDate", "status"]) {
    assert.doesNotMatch(keys, new RegExp(forbidden, "i"), `slide4 content must never carry a "${forbidden}" field`);
  }
});

test("nextQuarterPlan presentationItems map into slide5.planItems verbatim, capped at 5", () => {
  const items = ["Launch role-based prompts.", "Data quality audit.", "Complete CRM sync."];
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "nextQuarterPlan", safeText: "full", presentationItems: items }],
  });
  assert.deepEqual(content.slide5.planItems, items);
});

test("no workstream/month fields exist anywhere in slide5 content — no monthly breakdown invented", () => {
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "nextQuarterPlan", safeText: "full", presentationItems: ["One plan item."] }],
  });
  const keys = JSON.stringify(content.slide5);
  for (const forbidden of ["workstream", "october", "november", "december", "oct", "nov", "dec"]) {
    assert.doesNotMatch(keys, new RegExp(`\\b${forbidden}\\b`, "i"), `slide5 content must never carry a "${forbidden}" field`);
  }
});

test("slide8 itemsToAlign uses risks.presentationText, absent when not reviewed", () => {
  const { content: withRisk } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "risks", safeText: "full", presentationText: "Three items need alignment." }],
  });
  assert.equal(withRisk.slide8.itemsToAlignText, "Three items need alignment.");

  const { content: withoutRisk } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.equal(withoutRisk.slide8.itemsToAlignText, null);
});

test("slide8 opportunities takes the first available of featureRequests/relationship — never merges both into one string", () => {
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [
      { key: "featureRequests", safeText: "full", presentationText: "Faster segment refresh requested." },
      { key: "relationship", safeText: "full", presentationText: "Two new stakeholders joined." },
    ],
  });
  assert.equal(content.slide8.opportunitiesText, "Faster segment refresh requested.");
  assert.doesNotMatch(content.slide8.opportunitiesText, /stakeholders/);
});

test("slide8 opportunities falls back to relationship only when featureRequests is absent", () => {
  const { content } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "relationship", safeText: "full", presentationText: "Two new stakeholders joined." }],
  });
  assert.equal(content.slide8.opportunitiesText, "Two new stakeholders joined.");
});

test("no recommendation field exists anywhere in slide8 content (no reviewed recommendation source in this sprint)", () => {
  const { content } = mapQbrToMasterContent({ account: ALPENBANK, sections: [] });
  assert.doesNotMatch(JSON.stringify(content.slide8), /recommendation/i);
});

// --- Overflow ----------------------------------------------------------
// 2026-08 deterministic-layout-fallback revision: commitment/plan rows are
// now widened to fill the space freed by the removed Owner/Due Date/Status
// and Workstream/Month columns, giving each row far more real capacity —
// enough that even a presentationItems item at its schema-enforced maximum
// (200 chars) fits comfortably. Overflow is no longer reachable for these
// two slots with schema-valid input, so the contract worth testing is the
// positive case: the max-length item still fits.

test("a max-length (200 char) commitment item fits the widened row without a warning", () => {
  const longText = "x".repeat(200);
  const { warnings } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "openCommitments", safeText: "full", presentationItems: [longText] }],
  });
  assert.equal(warnings.filter(w => w.slot.includes("commitment row 1")).length, 0);
});

test("a max-length (200 char) planned-action item fits the widened row without a warning", () => {
  const longText = "x".repeat(200);
  const { warnings } = mapQbrToMasterContent({
    account: ALPENBANK,
    sections: [{ key: "nextQuarterPlan", safeText: "full", presentationItems: [longText] }],
  });
  assert.equal(warnings.filter(w => w.slot.includes("planned action row 1")).length, 0);
});
