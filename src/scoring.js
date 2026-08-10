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
    key: "usageDecline", label: "Usage/Adoption Decline",
    rawValue: `Adoption ${adoptionRatePct}% · Sessions trend ${sessionsTrendPct > 0 ? "+" : ""}${sessionsTrendPct}%`,
    riskPct: Math.round(risk),
  };
}

function scoreRecurringTicket(account) {
  const { recurringTicketTopic, openTickets } = account.support;
  const risk = recurringTicketTopic ? 100 : clamp(openTickets * 15, 0, 60);
  return {
    key: "recurringTicket", label: "Recurring Ticket Topic",
    rawValue: recurringTicketTopic ? recurringTicketTopic : `${openTickets} open ticket(s), no recurring topic`,
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
    key: "csatTrend", label: "CSAT Trend (8 weeks)",
    rawValue: `avg. now ${avgLast.toFixed(1)} (was ${avgFirst.toFixed(1)})`,
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
    key: "nps", label: "NPS (3 quarters)",
    rawValue: `now ${latest} (was ${first})`,
    riskPct: Math.round(risk),
  };
}

function scoreChampionRisk(account) {
  const status = account.relationship.championStatus;
  const risk = status === "recently_departed" ? 100 : status === "unknown" ? 50 : 0;
  const labelMap = { active: "active", unknown: "unclear", recently_departed: "recently departed" };
  return {
    key: "championRisk", label: "Champion Risk",
    rawValue: `${account.relationship.championName} (${labelMap[status]})`,
    riskPct: risk,
  };
}

function scoreInteractionRecency(account) {
  const days = account.relationship.lastInteractionDaysAgo;
  const risk = clamp(days / 30 * 100, 0, 100);
  return {
    key: "interactionRecency", label: "Interaction Recency",
    rawValue: `${days} days since last interaction`,
    riskPct: Math.round(risk),
  };
}

function scoreExecSponsor(account) {
  const engaged = account.relationship.execSponsorEngaged;
  return {
    key: "execSponsor", label: "Exec Sponsor Engagement",
    rawValue: engaged ? "engaged" : "not engaged",
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
    key: "qbrOverdue", label: "QBR Cadence",
    rawValue: `last QBR ${daysSinceLastQBR} days ago · next in ${daysToNextQBR} days`,
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

  // Each criterion's `points` is a risk contribution (higher = more concerning) —
  // that's what the breakdown table explains. The Health Score itself is the
  // inverse, matching standard CS convention (Gainsight etc.): higher = healthier.
  const riskPoints = criteria.reduce((sum, c) => sum + c.points, 0);
  const score = Math.round(100 - riskPoints);
  const riskCategory = riskPoints >= 60 ? "high" : riskPoints >= 30 ? "medium" : "low";

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
  const category = score >= 70 ? "high" : score >= 30 ? "medium" : "low";
  return { score, whitespaceModules, category };
}

export function daysSince(dateISO) {
  return daysBetween(dateISO, TODAY);
}

export function daysFromToday(dateISO) {
  return daysBetween(TODAY.toISOString(), new Date(dateISO));
}

// Directional signal from the most recent weekly CSAT data: are the last
// 4 weeks trending up, down, or flat vs. the first 4 weeks of the window.
export function computeTrend(account) {
  const scores = account.relationship.weeklyCSAT.map(w => w.score);
  const avgFirst = scores.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
  const avgLast = scores.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const diff = avgLast - avgFirst;
  if (diff > 0.15) return "up";
  if (diff < -0.15) return "down";
  return "flat";
}
