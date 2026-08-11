// One-time, offline data-prep script (like enrich-history.js) that adds
// "how long has this account been waiting, and how do they feel about it"
// to each account's topFeatureRequest.
//
// Deterministic, no AI/API calls — seeded from accountId so re-runs are
// reproducible. Age and sentiment are derived from the account's existing
// riskArchetype/featureRequestsCount, not invented from nothing.
//
// Usage: node scripts/augment-feature-sentiment.js

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "accounts.json");
const TODAY = new Date("2026-08-11");

function seededInt(seed, min, max) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return min + (h % (max - min + 1));
}

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  let updated = 0;

  for (const a of data.accounts) {
    if (!a.support.topFeatureRequest) continue;

    const jitter = seededInt(a.accountId + ":days", 0, 60);
    const base = 30 + (a.support.featureRequestsCount || 1) * 35;
    const daysWaiting = base + jitter;

    const since = new Date(TODAY);
    since.setDate(since.getDate() - daysWaiting);

    let sentiment;
    if (daysWaiting > 180 || ["critical", "at_risk"].includes(a.riskArchetype)) sentiment = "frustrated";
    else if (daysWaiting > 90 || a.riskArchetype === "watch") sentiment = "neutral";
    else sentiment = "patient";

    a.support.featureRequestSince = since.toISOString().slice(0, 10);
    a.support.featureRequestSentiment = sentiment;
    updated++;
  }

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Updated ${updated} accounts with featureRequestSince + featureRequestSentiment.`);
}

main();
