// Development Day 2 — Account Activity Feed: buildAccountActivity()
// (src/activity.js). Pure-function unit tests, no DOM, no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildAccountActivity } from "../src/activity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;

const RICH_ACCOUNT = ACCOUNTS.find(a => a.valueMilestone && a.freeTextArtifacts.length >= 3);

test("merges CSM notes, value milestone, and last QBR from a real account", () => {
  const items = buildAccountActivity(RICH_ACCOUNT, {});
  const types = items.map(i => i.type);
  assert.ok(RICH_ACCOUNT.freeTextArtifacts.every(a => types.includes(a.type)));
  assert.ok(types.includes("value_milestone"));
  assert.ok(types.includes("qbr_held"));
  // No session events without session state.
  assert.ok(!types.includes("ai_insight_loaded"));
  assert.ok(!types.includes("action_reviewed"));
});

test("items are sorted newest-first by timestamp", () => {
  const items = buildAccountActivity(RICH_ACCOUNT, {});
  for (let i = 1; i < items.length; i++) {
    assert.ok(new Date(items[i - 1].timestamp) >= new Date(items[i].timestamp), "expected descending chronological order");
  }
});

test("an account with no artifacts, no milestone, and no lastQBRDate produces an empty feed — nothing invented", () => {
  const bare = { accountId: "SYN-BARE", freeTextArtifacts: [], relationship: {} };
  const items = buildAccountActivity(bare, {});
  assert.deepEqual(items, []);
});

test("account without a value milestone never produces a value_milestone entry", () => {
  const noMilestone = ACCOUNTS.find(a => !a.valueMilestone);
  assert.ok(noMilestone, "expected at least one account without a valueMilestone in the dataset");
  const items = buildAccountActivity(noMilestone, {});
  assert.ok(!items.some(i => i.type === "value_milestone"));
});

test("aiInsight without a captured `at` timestamp produces no entry (mid-flight loading/idle state)", () => {
  const items = buildAccountActivity(RICH_ACCOUNT, { aiInsight: { status: "loading" } });
  assert.ok(!items.some(i => i.type.startsWith("ai_insight")));
});

test("aiInsight with a real `at` timestamp produces exactly one session-only entry", () => {
  const items = buildAccountActivity(RICH_ACCOUNT, {
    aiInsight: { status: "done", data: { narrative: "test narrative" }, at: "2026-08-17T10:00:00.000Z" },
  });
  const entry = items.find(i => i.type === "ai_insight_loaded");
  assert.ok(entry);
  assert.equal(entry.sessionOnly, true);
  assert.equal(entry.timestamp, "2026-08-17T10:00:00.000Z");
});

test("approval sent to a connected workflow is labeled 'Sent to Workflow', never 'Executed'", () => {
  const items = buildAccountActivity(RICH_ACCOUNT, {
    approval: { status: "done", result: { status: "sent", workflowConnected: true }, at: "2026-08-17T10:05:00.000Z" },
  });
  const entry = items.find(i => i.type === "action_reviewed");
  assert.match(entry.title, /Sent to Workflow/);
  assert.doesNotMatch(entry.title, /Executed/i);
});

test("approval logged without a connected workflow is labeled 'Logged', not 'Sent' or 'Executed'", () => {
  const items = buildAccountActivity(RICH_ACCOUNT, {
    approval: { status: "done", result: { status: "logged", workflowConnected: false }, at: "2026-08-17T10:05:00.000Z" },
  });
  const entry = items.find(i => i.type === "action_reviewed");
  assert.match(entry.title, /Logged/);
  assert.doesNotMatch(entry.title, /Sent to Workflow|Executed/i);
});

test("approval error state is shown honestly as a failed attempt, not silently dropped or marked done", () => {
  const items = buildAccountActivity(RICH_ACCOUNT, {
    approval: { status: "error", error: "network down", at: "2026-08-17T10:06:00.000Z" },
  });
  const entry = items.find(i => i.type === "action_error");
  assert.ok(entry);
  assert.match(entry.title, /Failed/i);
});

test("no duplicate ids in a full, real-account feed with both session sources populated", () => {
  const items = buildAccountActivity(RICH_ACCOUNT, {
    aiInsight: { status: "done", data: {}, at: "2026-08-17T10:00:00.000Z" },
    approval: { status: "done", result: { status: "sent", workflowConnected: true }, at: "2026-08-17T10:05:00.000Z" },
  });
  const ids = items.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every account in the dataset produces a feed without throwing", () => {
  for (const account of ACCOUNTS) {
    assert.doesNotThrow(() => buildAccountActivity(account, {}));
  }
});
