// Development Day 2 — Account Activity Feed. Pure adapter: turns already-
// existing data sources into one chronological view model. No new
// persistence, no new AI call, no new account data model — a read-only
// composition of what already exists elsewhere in the app:
//   - account.freeTextArtifacts / valueMilestone / relationship.lastQBRDate
//     — persisted in data/accounts.json, real dates, never invented.
//   - aiInsight / approval (state.aiInsights[id] / state.approvals[id] in
//     src/app.js) — session-only, real only once a runtime timestamp has
//     actually been captured at the moment of the event (see loadInsight/
//     submitApproval) — never backfilled or guessed.
//
// sessionOnly: true means the timestamp is a real runtime capture, lost on
// reload. false means the timestamp is a real, persisted date already in
// the account record. Never invented either way — see buildAccountActivity.

function artifactTitle(type) {
  if (type === "csm_note") return "CSM Note";
  if (type === "customer_email") return "Customer Email";
  if (type === "customer_chat") return "Customer Chat";
  return type; // unknown artifact type: show it as-is, don't invent a nicer label
}

function activityFromArtifacts(account) {
  return (account.freeTextArtifacts || []).map((a, i) => ({
    id: `artifact-${i}`,
    type: a.type,
    timestamp: a.date,
    title: artifactTitle(a.type),
    detail: a.text,
    source: a.author || "Account record",
    sessionOnly: false,
  }));
}

function activityFromMilestone(account) {
  if (!account.valueMilestone) return [];
  return [{
    id: "value-milestone",
    type: "value_milestone",
    timestamp: account.valueMilestone.achievedDate,
    title: "Value Milestone",
    detail: account.valueMilestone.description,
    source: "Account record",
    sessionOnly: false,
  }];
}

function activityFromLastQbr(account) {
  if (!account.relationship?.lastQBRDate) return [];
  return [{
    id: "last-qbr",
    type: "qbr_held",
    timestamp: account.relationship.lastQBRDate,
    title: "QBR Held",
    detail: null,
    source: "Account record",
    sessionOnly: false,
  }];
}

// aiInsight: state.aiInsights[accountId] — only produces an entry once it
// actually carries an `at` runtime timestamp (set by loadInsight() at the
// moment status becomes "done"/"error"), never for "idle"/"loading".
function activityFromAiInsight(aiInsight) {
  if (!aiInsight || !aiInsight.at) return [];
  if (aiInsight.status === "done") {
    return [{
      id: "ai-insight-done",
      type: "ai_insight_loaded",
      timestamp: aiInsight.at,
      title: "AI Insight Loaded",
      detail: aiInsight.data?.narrative || null,
      source: "This session",
      sessionOnly: true,
    }];
  }
  if (aiInsight.status === "error") {
    return [{
      id: "ai-insight-error",
      type: "ai_insight_error",
      timestamp: aiInsight.at,
      title: "AI Insight Unavailable",
      detail: aiInsight.error || null,
      source: "This session",
      sessionOnly: true,
    }];
  }
  return [];
}

// approval: state.approvals[accountId] — the title is driven strictly by
// the server's own result contract (status "sent"|"logged",
// workflowConnected — see api/approve-action.js). Never "executed": the app
// has no confirmation that the downstream n8n workflow actually completed
// its side effects, only that the workflow accepted the reviewed action (or
// that no workflow is connected and it was only logged).
function activityFromApproval(approval) {
  if (!approval || !approval.at) return [];
  if (approval.status === "done") {
    const sent = approval.result?.status === "sent" && approval.result?.workflowConnected === true;
    return [{
      id: "approval-done",
      type: "action_reviewed",
      timestamp: approval.at,
      title: sent ? "Reviewed by CSM — Sent to Workflow" : "Reviewed by CSM — Logged (No Workflow Connected)",
      detail: null,
      source: "This session",
      sessionOnly: true,
    }];
  }
  if (approval.status === "error") {
    return [{
      id: "approval-error",
      type: "action_error",
      timestamp: approval.at,
      title: "Approval Attempt Failed",
      detail: approval.error || null,
      source: "This session",
      sessionOnly: true,
    }];
  }
  return [];
}

export function buildAccountActivity(account, { aiInsight, approval } = {}) {
  const items = [
    ...activityFromArtifacts(account),
    ...activityFromMilestone(account),
    ...activityFromLastQbr(account),
    ...activityFromAiInsight(aiInsight),
    ...activityFromApproval(approval),
  ];

  // Defensive de-dupe by id — each source above already produces unique
  // ids by construction, but this guards against a future source collision
  // silently rendering the same event twice rather than failing loudly.
  const seen = new Set();
  const deduped = items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return deduped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
