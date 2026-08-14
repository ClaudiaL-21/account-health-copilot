// Sprint 06 — correction round: healthScoreHistory (data/accounts.json) must
// never drift from the fixed reference date used everywhere else in the app
// (src/scoring.js's REFERENCE_DATE_ISO). This regression-tests the bug the
// correction round fixed — the generator script hardcoded its own "today"
// literal, one day ahead of REFERENCE_DATE_ISO, which the new trend x-axis
// then made directly visible ("Aug 11" vs. the "Snapshot as of Aug 10" text).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeHealthScore, REFERENCE_DATE_ISO } from "../src/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
);

test("data.generatedAt matches REFERENCE_DATE_ISO", () => {
  assert.equal(DATA.generatedAt, REFERENCE_DATE_ISO);
});

test("every account's healthScoreHistory ends on REFERENCE_DATE_ISO", () => {
  for (const account of DATA.accounts) {
    const history = account.healthScoreHistory;
    const lastPoint = history[history.length - 1];
    assert.equal(
      lastPoint.date, REFERENCE_DATE_ISO,
      `${account.accountId}: history ends ${lastPoint.date}, expected ${REFERENCE_DATE_ISO}`
    );
  }
});

test("no healthScoreHistory point is dated after REFERENCE_DATE_ISO", () => {
  const referenceDate = new Date(REFERENCE_DATE_ISO);
  for (const account of DATA.accounts) {
    for (const point of account.healthScoreHistory) {
      assert.ok(
        new Date(point.date) <= referenceDate,
        `${account.accountId}: history point ${point.date} is after ${REFERENCE_DATE_ISO}`
      );
    }
  }
});

test("the last healthScoreHistory score matches the currently computed Health Score", () => {
  for (const account of DATA.accounts) {
    const history = account.healthScoreHistory;
    const lastPoint = history[history.length - 1];
    const live = computeHealthScore(account).score;
    assert.equal(
      lastPoint.score, live,
      `${account.accountId}: last history score ${lastPoint.score} != live computed ${live}`
    );
  }
});
