// One-time, offline data-prep script (like augment-feature-sentiment.js)
// that adds a positive "value milestone" to accounts that have earned one —
// something worth celebrating, grounded in the account's own usage/relationship
// data, not invented from nothing. Deterministic, no AI/API calls.
//
// Not every account gets one: a milestone implies real traction, so accounts
// with low health/adoption are left at null rather than getting a hollow one.
//
// Usage: node scripts/add-value-milestones.js

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeHealthScore } from "../src/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "accounts.json");
const TODAY = new Date("2026-08-11");

function seededInt(seed, min, max) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return min + (h % (max - min + 1));
}

const TEMPLATES = [
  a => {
    const total = a.usage.sessionsLast3Months.reduce((s, n) => s + n, 0);
    const module = a.licensedModules[0]?.name || "the platform";
    return `Crossed ${total.toLocaleString("en-US")} total sessions in ${module} over the last 3 months.`;
  },
  a => `${a.usage.activeUsers} of ${a.usage.licensedUsersTotal} licensed users are now active — the account's highest adoption rate on record.`,
  a => {
    const module = a.licensedModules[a.licensedModules.length - 1]?.name || "a licensed module";
    return `Went live with ${module} across the full team after a successful pilot phase.`;
  },
  a => {
    const nps = a.relationship.npsHistory[a.relationship.npsHistory.length - 1]?.score;
    return `Reached an NPS of ${nps} this quarter — the account's best score in the last year.`;
  },
  a => `Champion ${a.relationship.championName} presented the platform's ROI to their own leadership team, unprompted.`,
];

function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  let assigned = 0;

  for (const a of data.accounts) {
    const health = computeHealthScore(a);
    const eligible = health.score >= 60 || a.usage.adoptionRatePct >= 55;
    if (!eligible) {
      a.valueMilestone = null;
      continue;
    }
    const template = TEMPLATES[seededInt(a.accountId + ":tmpl", 0, TEMPLATES.length - 1)];
    const daysAgo = seededInt(a.accountId + ":days", 5, 110);
    const achieved = new Date(TODAY);
    achieved.setDate(achieved.getDate() - daysAgo);

    a.valueMilestone = {
      achievedDate: achieved.toISOString().slice(0, 10),
      description: template(a),
    };
    assigned++;
  }

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Assigned a value milestone to ${assigned} of ${data.accounts.length} accounts.`);
}

main();
