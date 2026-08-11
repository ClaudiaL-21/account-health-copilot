# n8n Integration

Two independent integration points. Both are optional — the app works fully without either (mock mode, or direct Anthropic/OpenAI calls, and locally-logged approvals). Wire whichever fits your course project.

## A. n8n as the AI compute layer

Lets n8n's own AI connection do the actual analysis, instead of `api/analyze.js` calling Anthropic/OpenAI directly. Useful if your working AI credentials/credits live in n8n.

**Setup:**
1. In `.env`, set `AI_PROVIDER=n8n` and `N8N_ANALYZE_WEBHOOK_URL=<your webhook URL>`.
2. In n8n, build: **Webhook** (POST) → your AI node (OpenAI/Anthropic/whatever you have working) → **Respond to Webhook**.

**Request we send to your webhook:**
```json
{ "system": "<system prompt>", "user": "<user prompt with account context + JSON schema instructions>", "maxTokens": 600 }
```

**Response your workflow must return:**
```json
{ "text": "<the AI's raw text output, unmodified>" }
```
We parse `text` as JSON ourselves (same schema Anthropic/OpenAI would return directly) — your AI node inside n8n should be given the `system` and `user` fields as its system/user prompts respectively, and its raw output just gets passed through in `text`.

## B. Human-Approval workflow

When a CSM clicks **"Approve & Send to Workflow"** on an AI-suggested Next Best Action, this fires — independent of which AI provider generated the suggestion. This is the app's core responsibility principle in action: AI proposes, a human approves, only then does anything happen.

**Setup:**
1. In `.env`, set `N8N_APPROVAL_WEBHOOK_URL=<your webhook URL>`.
2. In n8n, build: **Webhook** (POST) → whatever you want to happen (Slack message, CRM task, log to a sheet, email draft, etc.).

**Payload we send:**
```json
{
  "accountId": "ACC-10",
  "accountName": "Benelux Mobility Group",
  "csmName": "Fiona Callahan",
  "action": "Call the customer and clarify the main open issue.",
  "category": "risk_mitigation",
  "rationale": "This is the top-weighted risk driver for this account right now.",
  "approvedAt": "2026-08-11T21:18:35.437Z"
}
```
No response body is required — any 2xx status is treated as success.

If `N8N_APPROVAL_WEBHOOK_URL` isn't set, approvals are still tracked in the UI ("✓ Approved — logged, no workflow connected yet") and logged server-side, so the flow is demoable without n8n.
