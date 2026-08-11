// Human-approval handoff: a CSM approves an AI-suggested Next Best Action in
// the UI, and this endpoint forwards it to an n8n workflow to actually carry
// out (create a task, notify someone, log it in a CRM, etc.). The AI never
// acts on its own — this endpoint only ever runs after a human click.
//
// If N8N_APPROVAL_WEBHOOK_URL isn't configured, the action is just logged
// server-side instead of failing — so the approve/UI flow can be demoed
// without an n8n workflow wired up yet.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applyGate } from "./_security.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(__dirname, "..", "data", "accounts.json"), "utf-8"));
const ACCOUNTS = DATA.accounts;
const CSMS = DATA.csms;

const N8N_APPROVAL_WEBHOOK_URL = process.env.N8N_APPROVAL_WEBHOOK_URL;

export default async function handler(req, res) {
  if (!applyGate(req, res)) return;

  const { accountId, action, category, rationale } = req.body || {};
  if (!accountId || !action) {
    return res.status(400).json({ error: "Missing accountId or action" });
  }

  const account = ACCOUNTS.find(a => a.accountId === accountId);
  if (!account) return res.status(404).json({ error: "Unknown accountId" });
  const csm = CSMS.find(c => c.csmId === account.csmId);

  const payload = {
    accountId: account.accountId,
    accountName: account.accountName,
    csmName: csm?.name ?? "Unknown",
    action: String(action).slice(0, 500),
    category: category === "growth" ? "growth" : "risk_mitigation",
    rationale: String(rationale || "").slice(0, 500),
    approvedAt: new Date().toISOString(),
  };

  if (!N8N_APPROVAL_WEBHOOK_URL) {
    console.log("Human-approved action (no n8n webhook configured, logged only):", payload);
    return res.status(200).json({ status: "logged", workflowConnected: false });
  }

  try {
    const wres = await fetch(N8N_APPROVAL_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!wres.ok) {
      const text = await wres.text().catch(() => "");
      throw new Error(`n8n webhook ${wres.status}: ${text.slice(0, 300)}`);
    }
    return res.status(200).json({ status: "sent", workflowConnected: true });
  } catch (err) {
    console.error("approve-action.js n8n webhook error:", err.message);
    return res.status(502).json({ error: "Could not reach the approval workflow" });
  }
}
