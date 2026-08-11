async function callAnalyze(body) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function fetchAccountInsight(accountId) {
  return callAnalyze({ mode: "account-insight", accountId });
}

export function askAboutAccount(accountId, question) {
  return callAnalyze({ mode: "ask", accountId, question });
}

export function fetchTeamPriority(csmId) {
  return callAnalyze({ mode: "team-priority", csmId });
}

export async function approveAction(accountId, nba) {
  const res = await fetch("/api/approve-action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accountId, action: nba.action, category: nba.category, rationale: nba.rationale }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}
