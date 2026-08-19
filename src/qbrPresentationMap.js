// QBR Customer Presentation — deterministic content mapper.
//
// Pure function, no PptxGenJS/DOM dependency, so it's unit-testable on its
// own. Turns the CSM-reviewed, customer-safe QBR section tuples (exactly
// what selectCustomerSafeSections() in qbrPreview.js already produces, plus
// the reviewed safeText for each) into the flat content structure the PPTX
// renderer (qbrPptxRenderer.js) consumes — never the other way around, and
// never touching `internal` or `customerSafeDefault`.
//
// PO decisions this file encodes (2026-08 QBR PPTX handoff):
//   1. Each reviewed section renders as exactly ONE list item — no
//      heuristic splitting of prose into multiple bullets.
//   2. recommendation / recommendedNextSteps: no reviewed source exists
//      today: always omitted, never inferred from nextQuarterPlan.
//   3. itemsToAlignCount: never derived from internal risk criteria.
//      Always omitted.
//   4. sources: always omitted (would expose internal artifact metadata).
//   5. desiredOutcomes / customerPriorities / supportingMetrics: always
//      omitted — no deterministic source exists for any of them.
//   6. Health chart is built only from account.healthScoreHistory
//      (deterministic, not AI prose).
//   7. healthScoreCurrent / adoptionTrend are deterministic account
//      metrics (computeHealthScore / usage.sessionsTrendPct) — shown
//      regardless of review state, per explicit PO approval, since they
//      are facts, not AI-authored text.
import { computeHealthScore, REFERENCE_DATE_ISO } from "./scoring.js";

// Approved char budgets per slot — deliberately generous (a full reviewed
// paragraph becomes one list item, see decision 1 above) but still a real
// gate: existing QBR sections are capped at 1500 chars server-side, which
// would visibly break the fixed-geometry deck if rendered verbatim. These
// numbers are a first pass; the renderer's warnings tell you exactly which
// slot is over, so they're easy to retune without touching mapping logic.
export const SLOT_CHAR_LIMITS = {
  customerName: 40,
  period: 24,
  valueDelivered: 260,
  adoption: 260,
  renewalOutlook: 260,
  relationship: 260,
  executiveSummary: 220,
  interpretation: 220,
  openCommitmentsStripItem: 90, // slide 02's short 3-up strip
  businessObjectives: 220,
  businessImpact: 260,
  areasForAttention: 220,
  itemsToAlign: 220,
  opportunities: 220,
  nextQuarterPlan: 260,
  ongoingCommitments: 260,
  partnershipOutlook: 220,
  previousInterventions: 260,
  openCommitmentsCard: 320, // slide 06's full commitment card
};

function quarterOf(dateISO) {
  const d = new Date(dateISO);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

function firstNonEmpty(...vals) {
  return vals.find(v => typeof v === "string" && v.trim().length > 0) || null;
}

// `sections` = the exact tuples the client sends: only sections the CSM
// included, each { key, safeText }. Never `internal`, never
// `customerSafeDefault` — the caller (api/qbr-export.js) enforces this by
// construction, this function just trusts the shape it's given.
export function mapQbrToPresentation({ account, sections }) {
  const bySection = new Map((sections || []).map(s => [s.key, (s.safeText || "").trim()]));
  const get = key => firstNonEmpty(bySection.get(key));

  const health = computeHealthScore(account);
  const warnings = [];
  const checkLen = (slide, slot, limitKey, text) => {
    if (text && text.length > SLOT_CHAR_LIMITS[limitKey]) {
      warnings.push({
        slide, slot,
        message: `"${slot}" is ${text.length} characters, over the ${SLOT_CHAR_LIMITS[limitKey]}-character guideline for this layout. Shorten the reviewed text and try again.`,
      });
    }
  };

  const valueDelivered = get("valueDelivered");
  const adoption = get("adoption");
  const renewalOutlook = get("renewalOutlook");
  const relationship = get("relationship");
  const executiveSummary = get("executiveSummary");
  const healthTrendsSafe = get("healthTrends"); // sensitive — feeds "interpretation"
  const businessObjectives = get("businessObjectives");
  const risksSafe = get("risks"); // sensitive — feeds both areasForAttention and itemsToAlign
  const featureRequests = get("featureRequests");
  const nextQuarterPlan = get("nextQuarterPlan");
  const openCommitments = get("openCommitments");
  const previousInterventions = get("previousInterventions");

  checkLen("02 Executive Summary", "valueDelivered", "valueDelivered", valueDelivered);
  checkLen("02 Executive Summary", "adoption", "adoption", adoption);
  checkLen("02 Executive Summary", "renewalOutlook", "renewalOutlook", renewalOutlook);
  checkLen("02 Executive Summary", "executiveSummary", "executiveSummary", executiveSummary);
  checkLen("02 Executive Summary", "interpretation (from healthTrends)", "interpretation", healthTrendsSafe);
  checkLen("02 Executive Summary", "openCommitments (commitment strip)", "openCommitmentsStripItem", openCommitments);
  checkLen("03 Objectives & Value", "businessObjectives", "businessObjectives", businessObjectives);
  checkLen("03 Objectives & Value", "businessImpact (from valueDelivered)", "businessImpact", valueDelivered);
  checkLen("04 Health/Adoption", "adoption", "adoption", adoption);
  checkLen("04 Health/Adoption", "areasForAttention (from risks)", "areasForAttention", risksSafe);
  checkLen("05 Priorities", "itemsToAlign (from risks)", "itemsToAlign", risksSafe);
  checkLen("05 Priorities", "opportunities (from featureRequests)", "opportunities", featureRequests);
  checkLen("05 Priorities", "opportunities (from relationship)", "opportunities", relationship);
  checkLen("06 Open Commitments", "openCommitments", "openCommitmentsCard", openCommitments);
  checkLen("07 Next Quarter Plan", "nextQuarterPlan", "nextQuarterPlan", nextQuarterPlan);
  checkLen("07 Next Quarter Plan", "ongoingCommitments (from openCommitments)", "ongoingCommitments", openCommitments);
  checkLen("08 Partnership Outlook", "relationship", "relationship", relationship);
  checkLen("08 Partnership Outlook", "renewalOutlook", "renewalOutlook", renewalOutlook);
  checkLen("08 Partnership Outlook", "partnershipOutlook (from nextQuarterPlan)", "partnershipOutlook", nextQuarterPlan);
  checkLen("08 Partnership Outlook", "partnershipOutlook (from openCommitments)", "partnershipOutlook", openCommitments);
  checkLen("09 Appendix", "previousInterventions", "previousInterventions", previousInterventions);

  const listOrEmpty = text => (text ? [text] : []);
  const opportunities = [featureRequests, relationship].filter(Boolean);
  const partnershipOutlook = [nextQuarterPlan, openCommitments].filter(Boolean);

  return {
    warnings,
    content: {
      // Deterministic account facts — always present, never gated by review.
      customerName: account.accountName,
      period: quarterOf(REFERENCE_DATE_ISO),
      healthScoreCurrent: health.score,
      adoptionTrendPct: account.usage.sessionsTrendPct,

      // DIRECT reviewed text (1 item per decision 1)
      valueDelivered,
      adoption,
      renewalOutlook,
      relationship,
      executiveSummary: listOrEmpty(executiveSummary),
      businessObjectives: listOrEmpty(businessObjectives),
      nextQuarterPlan: listOrEmpty(nextQuarterPlan),
      previousInterventions: listOrEmpty(previousInterventions),
      openCommitments: listOrEmpty(openCommitments), // used both as the strip (02) and the card list (06)

      // DERIVED from a single reviewed section, reused verbatim
      interpretation: listOrEmpty(healthTrendsSafe),       // slide 02, from healthTrends
      areasForAttention: listOrEmpty(risksSafe),           // slide 04, from risks
      itemsToAlign: listOrEmpty(risksSafe),                // slide 05, from risks (same text as above)
      businessImpact: listOrEmpty(valueDelivered),         // slide 03, from valueDelivered
      ongoingCommitments: listOrEmpty(openCommitments),    // slide 07, from openCommitments
      opportunities,                                        // slide 05, from featureRequests + relationship
      partnershipOutlook,                                   // slide 08, from nextQuarterPlan + openCommitments

      // Chart — raw deterministic series, never AI prose (decision 6)
      healthTrendsChart: (account.healthScoreHistory || []).filter(
        p => typeof p.score === "number" && typeof p.date === "string"
      ),

      // Always omitted (decisions 2, 3, 4, 5) — intentionally absent, not
      // present-but-empty, so the renderer's generic "omit if absent" rule
      // handles hiding them without a separate flag list.
    },
  };
}
