// QBR Master-Template PPTX — deterministic content mapper for Block B
// (Slides 1, 2, 6, 7 only). Pure function, no pptx-automizer/DOM dependency
// so it's unit-testable on its own — mirrors the shape of the earlier
// PptxGenJS-era src/qbrPresentationMap.js, but built for the master-editing
// approach and the extended presentationText/presentationItems content
// contract (2026-08 PO decisions).
//
// Security boundary: `sections` is exactly the {key, safeText,
// presentationText, presentationItems} tuples the client already produced
// via selectCustomerSafeSections() (src/qbrPreview.js) — a section not in
// this array (not included, or safeText empty) never reaches this function
// at all. Sensitive sections' presentationText/presentationItems are also
// already forced null server-side at draft time (applyQbrSensitiveGuardrail
// in api/analyze.js) unless a CSM has explicitly typed a reviewed version.
// This function never falls back from presentationText/presentationItems to
// safeText or internal — an empty presentation field means that slot is
// omitted from the deck, not silently filled from another field.
import { computeHealthScore, REFERENCE_DATE_ISO } from "./scoring.js";
import { estimateCapacity, planFit } from "./qbrCapacityModel.js";
import { SLOT_GEOMETRY } from "./qbrMasterGeometry.js";

function quarterOf(dateISO) {
  const d = new Date(dateISO);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

function formatAsOf(dateISO) {
  const d = new Date(dateISO);
  return `AS OF ${d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase()}`;
}

function formatSince(dateISO) {
  if (typeof dateISO !== "string" || !dateISO.trim()) return null;
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  return `Since ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

// NPS — same pattern as CSAT: current = latest historical value, delta only
// with >=2 points, never fabricated.
function computeNps(npsHistory) {
  const points = (npsHistory || []).filter(p => typeof p.score === "number");
  if (points.length === 0) return { current: null, delta: null };
  const current = points[points.length - 1].score;
  if (points.length < 2) return { current, delta: null };
  const delta = current - points[points.length - 2].score;
  return { current, delta };
}

function healthScoreFactText(account, currentScore) {
  const history = (account.healthScoreHistory || []).filter(p => typeof p.score === "number");
  if (history.length === 0) return null;
  const first = history[0].score;
  if (first === currentScore) return `Health Score has held steady at ${currentScore} over the reviewed period.`;
  const verb = currentScore > first ? "improved" : "declined";
  return `Health Score ${verb} from ${first} to ${currentScore} over the reviewed period.`;
}

// CSAT — decision: real 1-5 scale, never converted to /100. Delta only
// computed when >=2 valid historical weekly observations exist, and stays
// on the same 1-5 scale (e.g. "+0.3"), one decimal place.
function computeCsat(weeklyCSAT) {
  const points = (weeklyCSAT || []).filter(p => typeof p.score === "number");
  if (points.length === 0) return { current: null, delta: null };
  const current = points[points.length - 1].score;
  if (points.length < 2) return { current, delta: null };
  const delta = Math.round((current - points[points.length - 2].score) * 10) / 10;
  return { current, delta };
}

export function mapQbrToMasterContent({ account, sections }) {
  const bySection = new Map((sections || []).map(s => [s.key, s]));
  const presentationText = key => {
    const v = bySection.get(key)?.presentationText;
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  };
  const safeText = key => {
    const v = bySection.get(key)?.safeText;
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  };
  // presentationItems — only meaningful for list-capable sections
  // (openCommitments, nextQuarterPlan); already validated server-side
  // (api/analyze.js) to be an array of 1-5 trimmed, non-empty strings.
  const presentationItems = key => {
    const v = bySection.get(key)?.presentationItems;
    return Array.isArray(v) ? v.filter(i => typeof i === "string" && i.trim().length > 0) : [];
  };
  const firstNonEmpty = (...vals) => vals.find(v => typeof v === "string" && v.trim().length > 0) || null;

  const health = computeHealthScore(account);
  const warnings = [];
  const checkLen = (slide, slot, slotGeometryKey, text) => {
    if (!text) return;
    const plan = planFit(SLOT_GEOMETRY[slotGeometryKey], text);
    if (plan.action === "overflow") {
      warnings.push({
        slide, slot,
        message: `"${slot}" is ${text.length} characters, over the ~${plan.capacityChars}-character capacity for this layout slot (geometry-based, including the approved font-shrink range). Shorten the reviewed presentation text and try again.`,
      });
    }
  };

  const interpretationText = presentationText("healthTrends");
  const areasForAttentionText = presentationText("risks");
  const valueDeliveredText = presentationText("valueDelivered");
  const adoptionText = presentationText("adoption");
  const renewalOutlookText = presentationText("renewalOutlook");
  const businessObjectivesText = presentationText("businessObjectives");
  const valueDeliveredFullText = safeText("valueDelivered");
  const factText = healthScoreFactText(account, health.score);
  const csat = computeCsat(account.relationship?.weeklyCSAT);

  checkLen("02 Health & Trends", "interpretation (healthTrends)", "slide2.interpretation", interpretationText);
  checkLen("02 Health & Trends", "areasForAttention (risks)", "slide2.areasForAttention", areasForAttentionText);
  checkLen("06 Executive Summary", "valueDelivered", "slide6.valueDelivered", valueDeliveredText);
  checkLen("06 Executive Summary", "adoption", "slide6.adoption", adoptionText);
  checkLen("06 Executive Summary", "renewalOutlook", "slide6.renewalOutlook", renewalOutlookText);
  checkLen("06 Executive Summary", "fact", "slide6.fact", factText);
  checkLen("06 Executive Summary", "interpretation (healthTrends)", "slide6.interpretation", interpretationText);
  checkLen("07 Business Objectives & Value", "valueDelivered (full, safeText)", "slide7.valueDeliveredFull", valueDeliveredFullText);
  checkLen("07 Business Objectives & Value", "businessObjectives", "slide7.businessObjectives", businessObjectivesText);

  // Slide 4 — Open Commitments (list-capable, up to 5 rows in the master).
  const commitmentItems = presentationItems("openCommitments").slice(0, 5);
  commitmentItems.forEach((text, i) => checkLen("04 Open Commitments", `commitment row ${i + 1}`, "slide4.commitmentRow", text));

  // Slide 5 — Next Quarter Plan (list-capable, up to 5 rows in the master).
  const planItems = presentationItems("nextQuarterPlan").slice(0, 5);
  planItems.forEach((text, i) => checkLen("05 Next Quarter Plan", `planned action row ${i + 1}`, "slide5.planIntentRow", text));

  // Slide 8 — Priorities & Areas for Attention.
  const itemsToAlignText = presentationText("risks");
  // Opportunities has exactly ONE text slot in the master — decision 1
  // forbids merging two sections' prose into one string, so this takes the
  // first available of the two candidate sources rather than concatenating.
  const opportunitiesText = firstNonEmpty(presentationText("featureRequests"), presentationText("relationship"));
  checkLen("08 Priorities & Areas for Attention", "itemsToAlign (risks)", "slide8.itemsToAlign", itemsToAlignText);
  checkLen("08 Priorities & Areas for Attention", "opportunities", "slide8.opportunities", opportunitiesText);

  // Slide 3 — Adoption & Product Feedback.
  checkLen("03 Adoption & Product Feedback", "adoption interpretation", "slide3.interpretation", adoptionText);
  const topFeatureRequestText = firstNonEmpty(account.support?.topFeatureRequest);
  checkLen("03 Adoption & Product Feedback", "top feature request", "slide3.featureRequest", topFeatureRequestText);

  // Slide 9 — Partnership Outlook.
  const partnershipContextText = presentationText("relationship");
  const buildFutureText = firstNonEmpty(partnershipContextText, presentationText("nextQuarterPlan"));
  const documentedNextStepsText = presentationText("nextQuarterPlan");
  checkLen("09 Partnership Outlook", "Drive measurable impact (valueDelivered)", "slide9.hero", valueDeliveredText);
  checkLen("09 Partnership Outlook", "Scale what works (adoption)", "slide9.hero", adoptionText);
  checkLen("09 Partnership Outlook", "Build the future together", "slide9.hero", buildFutureText);
  checkLen("09 Partnership Outlook", "Partnership Context", "slide9.partnershipContext", partnershipContextText);
  checkLen("09 Partnership Outlook", "Commercial / Renewal Outlook", "slide9.renewalOutlook", renewalOutlookText);
  checkLen("09 Partnership Outlook", "Documented Next Steps", "slide9.nextSteps", documentedNextStepsText);

  // Slide 10 — Evidence / Appendix.
  const nps = computeNps(account.relationship?.npsHistory);
  const previousInterventionsText = presentationText("previousInterventions");
  checkLen("10 Evidence / Appendix", "Previous Interventions", "slide10.previousInterventions", previousInterventionsText);

  return {
    warnings,
    content: {
      slide1: {
        customerName: account.accountName,
        period: quarterOf(REFERENCE_DATE_ISO),
        asOf: formatAsOf(REFERENCE_DATE_ISO),
      },
      slide2: {
        healthScoreCurrent: health.score,
        adoptionTrendPct: account.usage?.sessionsTrendPct ?? null,
        healthTrendsChart: (account.healthScoreHistory || []).filter(
          p => typeof p.score === "number" && typeof p.date === "string"
        ),
        interpretationText,
        areasForAttentionText,
      },
      slide6: {
        valueDeliveredText,
        adoptionText,
        renewalOutlookText,
        factText,
        interpretationText,
      },
      slide7: {
        valueDeliveredFullText,
        businessObjectivesText,
        csatCurrent: csat.current,
        csatDelta: csat.delta,
      },
      slide4: {
        commitmentItems,
      },
      slide5: {
        planItems,
      },
      slide8: {
        itemsToAlignText,
        opportunitiesText,
      },
      slide3: {
        adoptionRatePct: account.usage?.adoptionRatePct ?? null,
        activeUsers: account.usage?.activeUsers ?? null,
        interpretationText: adoptionText,
        topFeatureRequestText,
        featureRequestSentiment: firstNonEmpty(account.support?.featureRequestSentiment),
        featureRequestsCount: typeof account.support?.featureRequestsCount === "number" ? account.support.featureRequestsCount : null,
        featureRequestSinceText: formatSince(account.support?.featureRequestSince),
      },
      slide9: {
        driveImpactText: valueDeliveredText,
        scaleWorksText: adoptionText,
        buildFutureText,
        partnershipContextText,
        renewalOutlookText,
        nextStepsText: documentedNextStepsText,
      },
      slide10: {
        avgResolutionDays: typeof account.support?.avgResolutionDays === "number" ? account.support.avgResolutionDays : null,
        npsCurrent: nps.current,
        npsDelta: nps.delta,
        previousInterventionsText,
      },
    },
  };
}

export { estimateCapacity }; // re-exported for tests that assert on raw capacity numbers
