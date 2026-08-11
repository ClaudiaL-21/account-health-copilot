// One-time, offline enrichment: replaces the short templated
// freeTextArtifacts of a curated set of accounts with a richer,
// AI-generated interaction history (CSM notes + customer emails/chats).
//
// This is NOT part of the live app's runtime AI layer — it's a data-prep
// script you run once, locally, with your own API key. The output is
// written back into data/accounts.json as plain static data; the app
// itself never calls this script or knows it exists.
//
// Usage:
//   1. Put ANTHROPIC_API_KEY=sk-ant-... in account-health-copilot/.env
//   2. npm run enrich-data
//
// Cost: ~11 accounts x one Claude call each, short output — a few cents.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data", "accounts.json");
const MODEL = "claude-sonnet-5";

// --- minimal .env loader (same pattern as dev-server.js) ---------------
const envPath = join(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Missing ANTHROPIC_API_KEY. Add it to account-health-copilot/.env and re-run.");
  process.exit(1);
}

// Curated selection: covers the full narrative spectrum for the demo,
// not all 35 accounts (see docs/05_project_brief.md — a convincing demo
// beats a fully-enriched but expensive-to-generate portfolio).
const TARGET_IDS = [
  "ACC-06", "ACC-10", // critical
  "ACC-09", "ACC-11", "ACC-16", "ACC-19", // at_risk
  "ACC-05", "ACC-13", "ACC-21", // healthy_growth (positive/growth story)
  "ACC-01", "ACC-23", // watch (middle ground)
];

const DIRECTION_HINT = {
  critical: "sharply declining — things have gotten notably worse over these 4 months",
  at_risk: "declining — a gradual worsening trend over these 4 months",
  watch: "mixed/flat — some early warning signs but nothing dramatic yet",
  stable: "steady — no major change over these 4 months",
  healthy_growth: "improving — a positive trajectory, possible expansion interest",
};

async function callClaude(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      // Sonnet 5 runs adaptive thinking by default, and max_tokens caps
      // thinking + visible output combined — with thinking on, our JSON
      // response was getting cut off mid-way (root cause of the first
      // real run's "Unexpected end of JSON input" failures). This is a
      // plain structured-text task, no reasoning needed, so disable it.
      thinking: { type: "disabled" },
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  if (data.stop_reason === "max_tokens") {
    throw new Error(`response truncated (stop_reason=max_tokens), got ${text.length} chars: ${text.slice(-200)}`);
  }
  return text;
}

function parseJsonLoose(text) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`${err.message} — raw response (first 300 chars): ${cleaned.slice(0, 300)}`);
  }
}

const SYSTEM_PROMPT = `You generate realistic, entirely fictional Customer Success interaction
history for a synthetic demo dataset. No real companies, products, or people —
everything must be invented. Vary tone, sentence structure, and specificity
across entries so they don't read as templated. Respond with ONLY valid JSON,
no markdown fences, no commentary.`;

function buildPrompt(account) {
  const direction = DIRECTION_HINT[account.riskArchetype] || "steady";
  const modules = account.licensedModules.map(m => m.name).join(", ");
  return `Generate a 4-month interaction history for this fictional B2B SaaS account.

Account: ${account.accountName} (${account.industry}, ${account.subregion})
Licensed modules: ${modules}
Current adoption rate: ${account.usage.adoptionRatePct}%, sessions trend: ${account.usage.sessionsTrendPct}%
Support: ${account.support.openTickets} open ticket(s)${account.support.recurringTicketTopic ? `, recurring topic: ${account.support.recurringTicketTopic}` : ""}
Champion: ${account.relationship.championName} (status: ${account.relationship.championStatus})
Exec sponsor engaged: ${account.relationship.execSponsorEngaged}
Overall trajectory over these 4 months: ${direction}

Today's date is 2026-08-11. Generate 5 entries dated between 2026-04-15 and 2026-08-05,
in chronological order, telling a coherent story consistent with the trajectory above.
Mix these types:
- "csm_note": a CSM's own meeting/call notes, written in first person from the CSM's
  perspective (professional, concise, may include next steps)
- "customer_email": an email excerpt in the customer's voice (the champion or another
  stakeholder), realistic tone for a business email
- "customer_chat": a shorter, more informal chat/Slack-style message from the customer

Each entry needs specific, concrete details (reference an actual module name from the
list above, a real-sounding number, a specific feature or issue) — avoid generic
filler like "things are going well" with no substance.

Respond with ONLY this JSON schema:
{ "entries": [ { "date": "YYYY-MM-DD", "type": "csm_note|customer_email|customer_chat", "author": "name", "text": "2-4 sentences" } ] }`;
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const byId = new Map(data.accounts.map(a => [a.accountId, a]));

  const limitArg = process.argv.find(a => a.startsWith("--limit="));
  const skipArg = process.argv.find(a => a.startsWith("--skip="));
  const skip = skipArg ? parseInt(skipArg.split("=")[1], 10) : 0;
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : TARGET_IDS.length;
  const ids = TARGET_IDS.slice(skip, skip + limit);
  if (skip || limit < TARGET_IDS.length) console.log(`(processing accounts ${skip + 1}-${skip + ids.length} of ${TARGET_IDS.length})\n`);

  for (const id of ids) {
    const account = byId.get(id);
    if (!account) {
      console.warn(`Skipping ${id}: not found`);
      continue;
    }
    process.stdout.write(`Generating history for ${id} ${account.accountName}... `);
    try {
      const raw = await callClaude(SYSTEM_PROMPT, buildPrompt(account));
      const parsed = parseJsonLoose(raw);
      if (!Array.isArray(parsed.entries) || parsed.entries.length === 0) {
        throw new Error("empty or malformed entries array");
      }
      account.freeTextArtifacts = parsed.entries.map(e => ({
        type: e.type,
        date: e.date,
        author: e.author,
        text: e.text,
      }));
      console.log(`ok (${parsed.entries.length} entries)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log("\nDone. data/accounts.json updated.");
}

main();
