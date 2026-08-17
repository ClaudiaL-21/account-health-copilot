// Development Day 1 — Manager View: computePortfolioKpis() (src/scoring.js).
// Pure-function unit tests, no network, no AI. Run with: node --test tests/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computePortfolioKpis, computeHealthScore, daysFromToday, REFERENCE_DATE_ISO } from "../src/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNTS = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8")
).accounts;

function isoDaysFromToday(n) {
  return new Date(Date.UTC(2026, 7, 10) + n * 86400000).toISOString().slice(0, 10);
}

test("empty list returns all-zero KPIs, no division-by-zero NaN", () => {
  const kpis = computePortfolioKpis([]);
  assert.equal(kpis.totalAccounts, 0);
  assert.equal(kpis.totalArrUSD, 0);
  assert.equal(kpis.avgHealth, 0);
  assert.deepEqual(kpis.riskCounts, { high: 0, medium: 0, low: 0 });
  assert.equal(kpis.arrAtRiskUSD, 0);
  for (const w of Object.values(kpis.renewalWindows)) {
    assert.equal(w.accountCount, 0);
    assert.equal(w.arrUSD, 0);
    assert.equal(w.arrAtRiskUSD, 0);
  }
});

test("totalAccounts and totalArrUSD match a manual sum over the full dataset", () => {
  const kpis = computePortfolioKpis(ACCOUNTS);
  assert.equal(kpis.totalAccounts, ACCOUNTS.length);
  const manualArr = ACCOUNTS.reduce((s, a) => s + a.contract.arrUSD, 0);
  assert.equal(kpis.totalArrUSD, manualArr);
});

test("riskCounts sum to totalAccounts and match computeHealthScore per account", () => {
  const kpis = computePortfolioKpis(ACCOUNTS);
  const manualCounts = { high: 0, medium: 0, low: 0 };
  ACCOUNTS.forEach(a => { manualCounts[computeHealthScore(a).riskCategory]++; });
  assert.deepEqual(kpis.riskCounts, manualCounts);
  assert.equal(kpis.riskCounts.high + kpis.riskCounts.medium + kpis.riskCounts.low, kpis.totalAccounts);
});

test("arrAtRiskUSD matches the sum of ARR for exactly the high-risk accounts", () => {
  const kpis = computePortfolioKpis(ACCOUNTS);
  const manual = ACCOUNTS
    .filter(a => computeHealthScore(a).riskCategory === "high")
    .reduce((s, a) => s + a.contract.arrUSD, 0);
  assert.equal(kpis.arrAtRiskUSD, manual);
});

test("avgHealth matches a manual average of computeHealthScore().score, rounded", () => {
  const kpis = computePortfolioKpis(ACCOUNTS);
  const manual = Math.round(ACCOUNTS.reduce((s, a) => s + computeHealthScore(a).score, 0) / ACCOUNTS.length);
  assert.equal(kpis.avgHealth, manual);
});

test("scoping to a subset only reflects that subset, not the full dataset", () => {
  const subset = ACCOUNTS.slice(0, 2);
  const kpis = computePortfolioKpis(subset);
  assert.equal(kpis.totalAccounts, 2);
  assert.equal(kpis.totalArrUSD, subset[0].contract.arrUSD + subset[1].contract.arrUSD);
});

test("renewal windows are disjoint and correctly bucket by days-to-renewal boundaries", () => {
  const base = ACCOUNTS[0];
  const mk = daysOut => ({ ...base, accountId: `SYN-${daysOut}`, contract: { ...base.contract, nextRenewalDate: isoDaysFromToday(daysOut), arrUSD: 1000 } });
  const synthetic = [mk(0), mk(30), mk(31), mk(60), mk(61), mk(90), mk(91)];
  // Sanity: daysFromToday of each synthetic date matches the intended offset.
  synthetic.forEach((a, i) => assert.equal(daysFromToday(a.contract.nextRenewalDate), [0, 30, 31, 60, 61, 90, 91][i]));

  const kpis = computePortfolioKpis(synthetic);
  assert.equal(kpis.renewalWindows.days30.accountCount, 2, "0d and 30d fall in the ≤30 window");
  assert.equal(kpis.renewalWindows.days3160.accountCount, 2, "31d and 60d fall in the 31-60 window");
  assert.equal(kpis.renewalWindows.days6190.accountCount, 2, "61d and 90d fall in the 61-90 window");
  // 91d falls outside all three windows — not silently double-counted or dropped-in.
  const totalBucketed = kpis.renewalWindows.days30.accountCount + kpis.renewalWindows.days3160.accountCount + kpis.renewalWindows.days6190.accountCount;
  assert.equal(totalBucketed, 6);
});

test("renewal-window ARR and ARR-at-risk reflect only the accounts in that window", () => {
  const base = ACCOUNTS.find(a => computeHealthScore(a).riskCategory === "high");
  const healthy = ACCOUNTS.find(a => computeHealthScore(a).riskCategory === "low");
  const highRiskIn30 = { ...base, accountId: "SYN-HR-30", contract: { ...base.contract, nextRenewalDate: isoDaysFromToday(10), arrUSD: 5000 } };
  const lowRiskIn30 = { ...healthy, accountId: "SYN-LR-30", contract: { ...healthy.contract, nextRenewalDate: isoDaysFromToday(20), arrUSD: 7000 } };

  const kpis = computePortfolioKpis([highRiskIn30, lowRiskIn30]);
  assert.equal(kpis.renewalWindows.days30.accountCount, 2);
  assert.equal(kpis.renewalWindows.days30.arrUSD, 12000);
  assert.equal(kpis.renewalWindows.days30.arrAtRiskUSD, 5000, "only the high-risk account's ARR counts as at-risk");
});
