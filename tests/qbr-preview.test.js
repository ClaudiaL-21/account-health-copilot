// QBR Repair & Hardening — selectCustomerSafeSections() (src/qbrPreview.js).
// This is the actual internal/customer-safe security boundary for the
// Customer QBR Preview. Pure-function unit tests, no DOM, no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import { selectCustomerSafeSections } from "../src/qbrPreview.js";

const SECTIONS = [
  { key: "risks", title: "Risks", internal: "INTERNAL RISK TEXT — must never leak", customerSafeDefault: null },
  { key: "adoption", title: "Adoption", internal: "INTERNAL ADOPTION TEXT", customerSafeDefault: "safe default" },
  { key: "businessObjectives", title: "Business Objectives", internal: "Not available in current customer data.", customerSafeDefault: null },
];

test("a sensitive section (Manual Review Required) with empty safeText cannot reach the preview, even if included is true", () => {
  const review = {
    risks: { included: true, safeText: "" }, // e.g. a stray click before any text was written
    adoption: { included: true, safeText: "Adoption is healthy." },
    businessObjectives: { included: false, safeText: "" },
  };
  const result = selectCustomerSafeSections(SECTIONS, review);
  assert.deepEqual(result.map(s => s.key), ["adoption"]);
});

test("a sensitive section becomes includable once the CSM has written a real safeText", () => {
  const review = {
    risks: { included: true, safeText: "We are addressing the reported issues with your team." },
    adoption: { included: false, safeText: "" },
    businessObjectives: { included: false, safeText: "" },
  };
  const result = selectCustomerSafeSections(SECTIONS, review);
  assert.deepEqual(result.map(s => s.key), ["risks"]);
});

test("included=false always excludes a section regardless of safeText content", () => {
  const review = {
    risks: { included: false, safeText: "Some text was typed but never included." },
    adoption: { included: false, safeText: "" },
    businessObjectives: { included: false, safeText: "" },
  };
  assert.deepEqual(selectCustomerSafeSections(SECTIONS, review), []);
});

test("whitespace-only safeText does not count as a real customer-safe version", () => {
  const review = {
    risks: { included: true, safeText: "   \n  " },
    adoption: { included: false, safeText: "" },
    businessObjectives: { included: false, safeText: "" },
  };
  assert.deepEqual(selectCustomerSafeSections(SECTIONS, review), []);
});

test("a section missing from the review map is safely excluded, not a crash", () => {
  const review = { adoption: { included: true, safeText: "Adoption is healthy." } };
  const result = selectCustomerSafeSections(SECTIONS, review);
  assert.deepEqual(result.map(s => s.key), ["adoption"]);
});

test("selected sections still carry their original section object (title etc.) — the render layer reads safeText from `review`, not from the section itself", () => {
  const review = {
    risks: { included: true, safeText: "Reviewed customer-safe text." },
    adoption: { included: false, safeText: "" },
    businessObjectives: { included: false, safeText: "" },
  };
  const [result] = selectCustomerSafeSections(SECTIONS, review);
  assert.equal(result.title, "Risks");
  assert.equal(result.internal, "INTERNAL RISK TEXT — must never leak"); // present on the object, but never rendered by renderQbrPreview
});
