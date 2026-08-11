// One-time, offline data-prep script (like the other scripts/add-*.js files)
// that adds a Health Score trend line to each account — "fell from 48 to 9
// over 7 weeks" instead of just today's snapshot.
//
// The score is a function of live account data, so we can't recompute what
// it "really" was in the past — instead we synthesize a plausible weekly
// trajectory whose direction matches the account's known trend signal
// (riskArchetype, falling back to the computed CSAT trend), and whose LAST
// point always equals today's actual computed score, so it never
// contradicts the live Score Breakdown shown elsewhere. Deterministic, no
// AI/API calls.
//
// Usage: node scripts/add-health-score-history.js

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeHealthScore, computeTrend } from "../src/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "accounts.json");
const TODAY = new Date("2026-08-11");
const WEEKS = 7;

function seededInt(seed, min, max) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return min + (h % (max - min + 1));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function directionFor(account) {
  if (account.riskArchetype === "critical" || account.riskArchetype === "at_risk") return "declining";
  if (account.riskArchetype === "healthy_growth") return "improving";
  if (account.riskArchetype === "watch" || account.riskArchetype === "stable") return "flat";
  // no riskArchetype on this account — fall back to the computed CSAT trend
  const trend = computeTrend(account);
  return trend === "down" ? "declining" : trend === "up" ? "improving" : "flat";
}

function buildHistory(account, currentScore) {
  const direction = directionFor(account);
  const spread = seededInt(account.accountId + ":spread", 15, 35);
  const startScore = direction === "declining"
    ? clamp(currentScore + spread, 0, 100)
    : direction === "improving"
      ? clamp(currentScore - spread, 0, 100)
      : currentScore;

  const history = [];
  for (let i = 0; i <= WEEKS; i++) {
    const t = i / WEEKS; // 0 at start, 1 at today
    const base = startScore + (currentScore - startScore) * t;
    const noise = direction === "flat" ? seededInt(account.accountId + ":n" + i, -4, 4) : seededInt(account.accountId + ":n" + i, -2, 2);
    const date = new Date(TODAY);
    date.setDate(date.getDate() - (WEEKS - i) * 7);
    const score = i === WEEKS ? currentScore : clamp(Math.round(base + noise), 0, 100);
    history.push({ date: date.toISOString().slice(0, 10), score });
  }
  return history;
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

  for (const a of data.accounts) {
    const currentScore = computeHealthScore(a).score;
    a.healthScoreHistory = buildHistory(a, currentScore);
  }

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Added a ${WEEKS + 1}-point healthScoreHistory to ${data.accounts.length} accounts.`);
}

main();
