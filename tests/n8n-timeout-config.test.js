// Co-PO review round 1 — Point 3, round 2 — Point 2: timeout configuration
// must only ever resolve to a finite, whole-millisecond value within a
// documented [min, max] range. Pure-function tests against api/_n8n.js's
// resolveTimeoutMs — no network, no dummy server needed, safe to statically
// import (see trust-guardrails.test.js for the same reasoning about
// api/analyze.js).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveTimeoutMs,
  DEFAULT_ANALYZE_TIMEOUT_MS,
  DEFAULT_APPROVAL_TIMEOUT_MS,
  MIN_WEBHOOK_TIMEOUT_MS,
  MAX_WEBHOOK_TIMEOUT_MS,
} from "../api/_n8n.js";

test("a valid short timeout passes through unchanged (keeps other tests fast)", () => {
  assert.equal(resolveTimeoutMs("150", DEFAULT_ANALYZE_TIMEOUT_MS), 150);
});

test("a negative value falls back to the default", () => {
  assert.equal(resolveTimeoutMs("-5", DEFAULT_ANALYZE_TIMEOUT_MS), DEFAULT_ANALYZE_TIMEOUT_MS);
});

test("zero falls back to the default", () => {
  assert.equal(resolveTimeoutMs("0", DEFAULT_APPROVAL_TIMEOUT_MS), DEFAULT_APPROVAL_TIMEOUT_MS);
});

test("a non-numeric value falls back to the default", () => {
  assert.equal(resolveTimeoutMs("not-a-number", DEFAULT_ANALYZE_TIMEOUT_MS), DEFAULT_ANALYZE_TIMEOUT_MS);
});

test('the string "Infinity" falls back to the default', () => {
  assert.equal(resolveTimeoutMs("Infinity", DEFAULT_ANALYZE_TIMEOUT_MS), DEFAULT_ANALYZE_TIMEOUT_MS);
});

test("an already-NaN input falls back to the default", () => {
  assert.equal(resolveTimeoutMs(NaN, DEFAULT_ANALYZE_TIMEOUT_MS), DEFAULT_ANALYZE_TIMEOUT_MS);
});

test("an extreme positive value is capped at the documented upper bound, not left unbounded", () => {
  assert.equal(resolveTimeoutMs("999999999", DEFAULT_ANALYZE_TIMEOUT_MS), MAX_WEBHOOK_TIMEOUT_MS);
});

test("an unset (undefined) value falls back to the default", () => {
  assert.equal(resolveTimeoutMs(undefined, DEFAULT_APPROVAL_TIMEOUT_MS), DEFAULT_APPROVAL_TIMEOUT_MS);
});

test("a positive value below the documented minimum falls back to the default", () => {
  assert.ok(MIN_WEBHOOK_TIMEOUT_MS > 10, "test assumes the minimum is above 10ms");
  assert.equal(resolveTimeoutMs("10", DEFAULT_ANALYZE_TIMEOUT_MS), DEFAULT_ANALYZE_TIMEOUT_MS);
});

test("a decimal value at or above the minimum is converted to whole milliseconds", () => {
  assert.equal(resolveTimeoutMs("150.7", DEFAULT_ANALYZE_TIMEOUT_MS), 151);
});

test("the local test timeout of 150ms remains valid and unchanged", () => {
  assert.equal(resolveTimeoutMs("150", DEFAULT_ANALYZE_TIMEOUT_MS), 150);
});
