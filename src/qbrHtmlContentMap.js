// HTML QBR spike — deterministic content mapper for the 3-page web preview
// (Adoption & Product Feedback / Open Commitments & Actions / Business
// Objectives & Value). Pure function, no DOM/rendering dependency, so it's
// unit-testable on its own.
//
// Security boundary: identical shape and guarantee as
// src/qbrMasterContentMap.js — `sections` is exactly the {key, safeText,
// presentationText, presentationItems} tuples selectCustomerSafeSections()
// already produced client-side, and sensitive sections' presentationText/
// presentationItems are already forced null server-side unless a CSM
// explicitly reviewed them (applyQbrSensitiveGuardrail in api/analyze.js).
// This function never falls back from presentationText/presentationItems to
// safeText/internal — an absent field means that slot is simply omitted.
// Duplicated in full (not imported) from qbrMasterContentMap.js on purpose:
// the existing PPTX pipeline must not be touched for this spike.

function formatSince(dateISO) {
  if (typeof dateISO !== "string" || !dateISO.trim()) return null;
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  return `Since ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

// Same 1-5 scale, delta only with >=2 historical points — never fabricated.
function computeCsat(weeklyCSAT) {
  const points = (weeklyCSAT || []).filter(p => typeof p.score === "number");
  if (points.length === 0) return { current: null, delta: null };
  const current = points[points.length - 1].score;
  if (points.length < 2) return { current, delta: null };
  const delta = Math.round((current - points[points.length - 2].score) * 10) / 10;
  return { current, delta };
}

export function mapQbrToHtmlContent({ account, sections }) {
  const bySection = new Map((sections || []).map(s => [s.key, s]));
  const presentationText = key => {
    const v = bySection.get(key)?.presentationText;
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  };
  const safeText = key => {
    const v = bySection.get(key)?.safeText;
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  };
  const presentationItems = key => {
    const v = bySection.get(key)?.presentationItems;
    return Array.isArray(v) ? v.filter(i => typeof i === "string" && i.trim().length > 0) : [];
  };

  const csat = computeCsat(account.relationship?.weeklyCSAT);

  return {
    page1: {
      adoptionRatePct: account.usage?.adoptionRatePct ?? null,
      activeUsers: account.usage?.activeUsers ?? null,
      adoptionInterpretationText: presentationText("adoption"),
      topFeatureRequestText: account.support?.topFeatureRequest || null,
      featureRequestSentiment: account.support?.featureRequestSentiment || null,
      featureRequestsCount: typeof account.support?.featureRequestsCount === "number" ? account.support.featureRequestsCount : null,
      featureRequestSinceText: formatSince(account.support?.featureRequestSince),
    },
    page2: {
      commitmentItems: presentationItems("openCommitments").slice(0, 5),
    },
    page3: {
      businessObjectivesText: presentationText("businessObjectives"),
      valueDeliveredFullText: safeText("valueDelivered"),
      csatCurrent: csat.current,
      csatDelta: csat.delta,
    },
  };
}
