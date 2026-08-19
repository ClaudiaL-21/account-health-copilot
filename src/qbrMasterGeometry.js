// QBR Master-Template PPTX — real shape geometry, extracted directly from
// the approved master (assets/qbr-master/QBR_Customer.pptx) via a one-off
// XML dump (box size in EMU, font size in pt, text insets in EMU). Used only
// for geometry-based capacity validation (src/qbrCapacityModel.js) — never
// for layout decisions, since the master itself remains the visual source
// of truth and is edited via pptx-automizer, not rebuilt here.
//
// Shape names match the master's own <p:cNvPr name="..."> — see
// src/qbrMasterRenderer.js for how each is populated or removed.
const INSETS_DEFAULT = { l: 25400, r: 25400, t: 25400, b: 25400 };

// Note: several of these slots (slide2 interpretation/areasForAttention,
// slide6 fact, slide7 businessObjectives) were originally 2-3 separate
// single-line sibling shapes in the master (one per bullet), each sized to
// exactly one 285750-EMU line height in the raw XML. We populate only the
// FIRST sibling (decision 1: one reviewed section = one item) and remove
// the others — but a raw single-line reading UNDER-estimates real capacity:
// calibrating against the master's OWN placeholder text (e.g. slide6 fact's
// "Health Score improved from 51 to 58 this quarter." = 51 chars) shows
// these shapes render correctly with roughly 2 line-heights of vertical
// room, consistent with the same normAutofit generosity margin found in the
// Step 1 feasibility spike. boxH_emu below is therefore 2x the raw XML
// value for exactly these four slots — still a real, calibrated number, not
// a resize of the actual PPTX shape (V1 does not resize shapes; see
// src/qbrMasterRenderer.js).
export const SLOT_GEOMETRY = {
  // Slide 2 — Health & Performance Trends. Widened to each card's own
  // available width (2026-08 wrap-avoidance revision) — same target width
  // for both, since the two cards are symmetric.
  "slide2.interpretation": { boxW_emu: 7500975, boxH_emu: 285750 * 2, fontSizePt: 13.88, insets_emu: { l: 0, r: 0, t: 0, b: 0 } },
  "slide2.areasForAttention": { boxW_emu: 7500975, boxH_emu: 285750 * 2, fontSizePt: 13.88, insets_emu: { l: 0, r: 0, t: 0, b: 0 } },
  // Slide 6 — Executive Summary. boxH_emu 531316 -> 701316 (2026-08
  // overflow-ordering fix): Recommendation (row 2, 3rd column) and Customer
  // Commitment (bottom bar) are unconditionally removed with no adaptive
  // content, freeing real vertical space that src/qbrMasterRenderer.js's
  // slide6Modifiers now actually uses to grow these three card text boxes
  // (SLIDE6_ROW1_GROWTH) — this validates against that resized final shape,
  // not the original design-placeholder height.
  "slide6.valueDelivered": { boxW_emu: 4042029, boxH_emu: 701316, fontSizePt: 13.88, insets_emu: INSETS_DEFAULT },
  "slide6.adoption": { boxW_emu: 4042029, boxH_emu: 701316, fontSizePt: 13.88, insets_emu: INSETS_DEFAULT },
  "slide6.renewalOutlook": { boxW_emu: 4042029, boxH_emu: 701316, fontSizePt: 13.88, insets_emu: INSETS_DEFAULT },
  "slide6.fact": { boxW_emu: 3711989, boxH_emu: 285750 * 2, fontSizePt: 13.88, insets_emu: { l: 0, r: 0, t: 0, b: 0 } },
  "slide6.interpretation": { boxW_emu: 4517237, boxH_emu: 506016, fontSizePt: 13.88, insets_emu: { l: 0, r: 0, t: 0, b: 0 } },
  // Slide 7 — Business Objectives & Value. Calibration note: the master's
  // own placeholder text here ("in support cost avoidance and 3.2
  // FTE-equivalent capacity freed this quarter.", 78 chars) also needs the
  // 2x line-height correction to fit — same normAutofit margin as the other
  // corrected slots above. Even after this correction, real capacity here
  // (~117 chars) is modest for a "full" safeText, which may run to several
  // hundred characters; see the Block B report's overflow-testing findings.
  // boxW_emu 6493431 -> 12000000 (2026-08 overflow-ordering fix): widened
  // into the banner's own unused width, freed by the always-removed $ KPI
  // figure (see src/qbrMasterRenderer.js slide7Modifiers) — real, resized
  // final shape, not the original narrow placeholder.
  "slide7.valueDeliveredFull": { boxW_emu: 12000000, boxH_emu: 298103 * 2, fontSizePt: 14.63, insets_emu: INSETS_DEFAULT },
  "slide7.businessObjectives": { boxW_emu: 3561302, boxH_emu: 285750 * 2, fontSizePt: 13.88, insets_emu: { l: 0, r: 0, t: 0, b: 0 } },

  // Slide 4 — Open Commitments. Each row's "description" text box is
  // populated with one reviewed openCommitments.presentationItems[] entry
  // (the "title" line above it has no separate short-label data and is
  // removed) and, per the 2026-08 deterministic-layout-fallback revision,
  // WIDENED across the space freed by removing the Owner/Due Date/Status
  // columns (src/qbrMasterRenderer.js resizes the actual shape to this same
  // width — this is not just a validation-side fiction). Same width for
  // every row since the master's per-row x-offset is constant; 2x line-
  // height calibration carried over from the original single-column box.
  "slide4.commitmentRow": { boxW_emu: 15063825, boxH_emu: 278011 * 2, fontSizePt: 13.5, insets_emu: INSETS_DEFAULT },

  // Slide 5 — Next Quarter Plan. Populates the "Expected Outcomes" slot,
  // MOVED next to the icon and WIDENED across the freed Workstream/Month
  // columns (src/qbrMasterRenderer.js resizes/repositions the actual
  // shape to match) with one reviewed nextQuarterPlan.presentationItems[]
  // entry; header relabeled to "Planned Actions" accordingly.
  "slide5.planIntentRow": { boxW_emu: 15123375, boxH_emu: 271463 * 2, fontSizePt: 13.13, insets_emu: INSETS_DEFAULT },

  // Slide 8 — Priorities & Areas for Attention. Widths reflect the
  // deterministic layout-fallback revision (src/qbrMasterRenderer.js
  // widens these cards to fill the space freed by removing Customer
  // Priorities/Recommendation) — HALF_CX (both cards shown, the narrower
  // case) is used here as the conservative capacity, since when only one
  // card remains it gets FULL_CX (more room, never less) — validating
  // against the narrower case only ever over-warns, never under-warns.
  // Opportunities keeps the ~1.2x autofit-generosity correction found in
  // the very first capacity calibration test this session (master's own
  // 165-char text).
  "slide8.itemsToAlign": { boxW_emu: 7882319, boxH_emu: 544711, fontSizePt: 14.25, insets_emu: INSETS_DEFAULT },
  "slide8.opportunities": { boxW_emu: 7882319, boxH_emu: Math.round(798016 * 1.2), fontSizePt: 14.25, insets_emu: INSETS_DEFAULT },

  // Block D — Slide 3 Adoption & Product Feedback. Interpretation/feature-
  // request bodies widened to their own card's available width (same
  // wrap-avoidance pattern as slide 2/7); 2x line-height calibration.
  "slide3.interpretation": { boxW_emu: 7520025, boxH_emu: 285750 * 2, fontSizePt: 13.88, insets_emu: { l: 0, r: 0, t: 0, b: 0 } },
  "slide3.featureRequest": { boxW_emu: 7520025, boxH_emu: 285750 * 2, fontSizePt: 13.88, insets_emu: INSETS_DEFAULT },

  // Block D — Slide 9 Partnership Outlook. Hero/Partnership Context/Renewal
  // Outlook boxes have no widening room (3/2-column layouts already near
  // max width) — kept at original width with the 2x calibration. Documented
  // Next Steps widens into the freed 2-of-3-bullets space (same "one
  // section = one item" pattern as slides 2/6/8).
  "slide9.hero": { boxW_emu: 5587945, boxH_emu: 278011 * 2, fontSizePt: 13.5, insets_emu: INSETS_DEFAULT },
  "slide9.partnershipContext": { boxW_emu: 5121212, boxH_emu: 517922, fontSizePt: 13.5, insets_emu: INSETS_DEFAULT },
  "slide9.renewalOutlook": { boxW_emu: 5469255, boxH_emu: 278011 * 2, fontSizePt: 13.5, insets_emu: INSETS_DEFAULT },
  // boxH_emu 276225*2 -> 1200000 (2026-08 overflow-ordering fix): grown
  // into the vertical space already freed inside the same card by the
  // other 2 always-removed bullet rows (see src/qbrMasterRenderer.js
  // slide9Modifiers) — real, resized final shape.
  "slide9.nextSteps": { boxW_emu: 4738725, boxH_emu: 1200000, fontSizePt: 13.5, insets_emu: INSETS_DEFAULT },

  // Block D — Slide 10 Evidence/Appendix. Previous Interventions widened to
  // the full row width freed by removing the Sources card entirely.
  "slide10.previousInterventions": { boxW_emu: 15449625, boxH_emu: 284708 * 2, fontSizePt: 13.88, insets_emu: INSETS_DEFAULT },
};

// Slide 1 cover slots are short, fixed-format deterministic facts
// (customerName/period/asOf) — always well within the master's box sizes
// in practice (30-52pt headline text against a full-slide-width box), so
// they are populated directly without a capacity gate, consistent with the
// Step 1 spike's already-verified acceptance criteria.
