const TODAY = new Date("2026-08-10");

function daysBetween(fromISO, toDate) {
  const from = new Date(fromISO);
  return Math.round((toDate - from) / (1000 * 60 * 60 * 24));
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const ALL_MODULES = [
  "Journey Orchestration", "Digital Intelligence", "Identity Resolution",
  "Offer Management", "Data Activation Hub", "Predictive Analytics"
];

const WEIGHTS = {
  usageDecline: 0.20,
  recurringTicket: 0.15,
  csatTrend: 0.15,
  nps: 0.15,
  championRisk: 0.15,
  interactionRecency: 0.10,
  execSponsor: 0.05,
  qbrOverdue: 0.05,
};

function scoreUsageDecline(account) {
  const { adoptionRatePct, sessionsTrendPct } = account.usage;
  const trendRisk = clamp(((-sessionsTrendPct) + 10) / 60 * 100, 0, 100);
  const adoptionRisk = clamp(100 - adoptionRatePct, 0, 100);
  const risk = trendRisk * 0.5 + adoptionRisk * 0.5;
  return {
    key: "usageDecline", label: "Nutzungs-/Adoptionsrückgang",
    rawValue: `Adoption ${adoptionRatePct}% · Sessions-Trend ${sessionsTrendPct > 0 ? "+" : ""}${sessionsTrendPct}%`,
    riskPct: Math.round(risk),
  };
}

function scoreRecurringTicket(account) {
  const { recurringTicketTopic, openTickets } = account.support;
  const risk = recurringTicketTopic ? 100 : clamp(openTickets * 15, 0, 60);
  return {
    key: "recurringTicket", label: "Wiederkehrendes Ticket-Thema",
    rawValue: recurringTicketTopic ? recurringTicketTopic : `${openTickets} offene Tickets, kein wiederkehrendes Thema`,
    riskPct: Math.round(risk),
  };
}

function scoreCSATTrend(account) {
  const scores = account.relationship.weeklyCSAT.map(w => w.score);
  const first4 = scores.slice(0, 4);
  const last4 = scores.slice(-4);
  const avgFirst = first4.reduce((a, b) => a + b, 0) / first4.length;
  const avgLast = last4.reduce((a, b) => a + b, 0) / last4.length;
  const levelRisk = clamp((5 - avgLast) / 4 * 100, 0, 100);
  const trendRisk = avgLast < avgFirst ? 20 : 0;
  const risk = clamp(levelRisk + trendRisk, 0, 100);
  return {
    key: "csatTrend", label: "CSAT-Trend (8 Wochen)",
    rawValue: `Ø aktuell ${avgLast.toFixed(1)} (vorher ${avgFirst.toFixed(1)})`,
    riskPct: Math.round(risk),
  };
}

function scoreNPS(account) {
  const hist = account.relationship.npsHistory;
  const latest = hist[hist.length - 1].score;
  const first = hist[0].score;
  const levelRisk = clamp((10 - latest) / 10 * 100, 0, 100);
  const trendRisk = latest < first ? 15 : 0;
  const risk = clamp(levelRisk + trendRisk, 0, 100);
  return {
    key: "nps", label: "NPS (3 Quartale)",
    rawValue: `aktuell ${latest} (vorher ${first})`,
    riskPct: Math.round(risk),
  };
}

function scoreChampionRisk(account) {
  const status = account.relationship.championStatus;
  const risk = status === "recently_departed" ? 100 : status === "unknown" ? 50 : 0;
  const labelMap = { active: "aktiv", unknown: "unklar", recently_departed: "kürzlich abgesprungen" };
  return {
    key: "championRisk", label: "Champion-Risiko",
    rawValue: `${account.relationship.championName} (${labelMap[status]})`,
    riskPct: risk,
  };
}

function scoreInteractionRecency(account) {
  const days = account.relationship.lastInteractionDaysAgo;
  const risk = clamp(days / 30 * 100, 0, 100);
  return {
    key: "interactionRecency", label: "Interaktions-Aktualität",
    rawValue: `${days} Tage seit letzter Interaktion`,
    riskPct: Math.round(risk),
  };
}

function scoreExecSponsor(account) {
  const engaged = account.relationship.execSponsorEngaged;
  return {
    key: "execSponsor", label: "Exec-Sponsor-Engagement",
    rawValue: engaged ? "engagiert" : "nicht engagiert",
    riskPct: engaged ? 0 : 100,
  };
}

function scoreQBROverdue(account) {
  const daysSinceLastQBR = daysBetween(account.relationship.lastQBRDate, TODAY);
  const daysToNextQBR = daysBetween(TODAY, new Date(account.relationship.nextQBRDate));
  let risk = 0;
  if (daysSinceLastQBR > 100 && daysToNextQBR > 20) risk = 100;
  else if (daysSinceLastQBR > 70) risk = 50;
  return {
    key: "qbrOverdue", label: "QBR-Kadenz",
    rawValue: `letztes QBR vor ${daysSinceLastQBR} Tagen · nächstes in ${daysToNextQBR} Tagen`,
    riskPct: risk,
  };
}

export function computeHealthScore(account) {
  const criteria = [
    scoreUsageDecline(account),
    scoreRecurringTicket(account),
    scoreCSATTrend(account),
    scoreNPS(account),
    scoreChampionRisk(account),
    scoreInteractionRecency(account),
    scoreExecSponsor(account),
    scoreQBROverdue(account),
  ].map(c => ({ ...c, weight: WEIGHTS[c.key], points: c.riskPct * WEIGHTS[c.key] }));

  const score = Math.round(criteria.reduce((sum, c) => sum + c.points, 0));
  const riskCategory = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  return { score, riskCategory, criteria: criteria.sort((a, b) => b.points - a.points) };
}

export function computeExpansionScore(account) {
  const { adoptionRatePct } = account.usage;
  const scores = account.relationship.weeklyCSAT.map(w => w.score);
  const avgRecentCSAT = scores.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const latestNPS = account.relationship.npsHistory.slice(-1)[0].score;
  const licensedNames = account.licensedModules.map(m => m.name);
  const whitespaceRatio = (ALL_MODULES.length - licensedNames.length) / ALL_MODULES.length;

  const score = clamp(Math.round(
    adoptionRatePct * 0.30 +
    (avgRecentCSAT / 5 * 100) * 0.25 +
    (latestNPS / 10 * 100) * 0.25 +
    whitespaceRatio * 100 * 0.20
  ), 0, 100);

  const whitespaceModules = ALL_MODULES.filter(m => !licensedNames.includes(m));
  return { score, whitespaceModules };
}

export function daysSince(dateISO) {
  return daysBetween(dateISO, TODAY);
}

export function daysFromToday(dateISO) {
  return daysBetween(TODAY.toISOString(), new Date(dateISO));
}
