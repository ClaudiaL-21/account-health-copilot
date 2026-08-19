// QBR Master-Template PPTX — Block B renderer.
//
// Uses pptx-automizer against the approved master (assets/qbr-master/
// QBR_Customer.pptx — an SVG-blip-patched copy of the design-approved file;
// the patch only duplicates an existing r:embed onto the outer <a:blip> so
// pptx-automizer's shape-type detector can read it, it changes nothing
// visually, see assets/qbr-master/README.md) instead of rebuilding slides
// in PptxGenJS, per the validated feasibility spike.
//
// Scope: Block B edited Slides 1, 2, 6, 7; Block C added Slides 4, 5, 8;
// Block D added Slides 3, 9, 10 — all 10 master slides are now edited.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { readFile, unlink } from "node:fs/promises";
// pptx-automizer ships as CJS with `exports.default = Automizer` — under
// Node ESM interop that means a plain `import Automizer from "pptx-automizer"`
// binds to the whole exports object, not the class itself (confirmed during
// the feasibility spike, which used require(...).default from CJS scripts).
import pptxAutomizer from "pptx-automizer";
const Automizer = pptxAutomizer.default;
const { ModifyTextHelper } = pptxAutomizer;

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, "..", "assets", "qbr-master");
const TEMPLATE_FILE = "QBR_Customer.pptx";

// setText() replaces the first run's text but DELETES every other run/
// paragraph in the shape — correct for single-purpose shapes, but wrong for
// a shape combining two differently-styled runs in one paragraph (e.g. "58"
// + a smaller "of 100" caption): using it there would silently delete the
// caption. This helper instead only touches the first run, leaving sibling
// runs (and their own styling) untouched — used only for that case.
function setFirstRunText(text) {
  return (element) => {
    const tNode = element.getElementsByTagName("a:t")[0];
    if (tNode && tNode.firstChild) tNode.firstChild.textContent = String(text);
  };
}

// Fixes a confirmed, PDF-visible rendering defect: shapes using
// <a:normAutofit/> with NO cached fontScale (every text shape in this
// master) force PowerPoint to recompute the autofit shrink/line-wrap live
// on first paint — and for any shape whose text wraps to more than one
// line, that live recompute duplicates the last word ("...gains.\ngains.").
// Confirmed via pdftotext on a real exported PDF (not just an on-screen
// artifact) after the 2026-08 PO correction — "PowerPoint paint artifact"
// is not an acceptable excuse once it is visible in the actual deliverable.
// Fix: stamp fontScale="100000" (100%, i.e. no shrink) + lnSpcReduction="0"
// onto <a:normAutofit/> for every shape whose text we set, so PowerPoint
// treats the autofit calculation as already-done instead of recomputing it
// live. Only touches shapes we actually populate — untouched pass-through
// slides (3, 9, 10) keep the master's original (also-affected) markup,
// tracked as a Block D follow-up.
function fixAutofit() {
  return (element) => {
    const bodyPr = element.getElementsByTagName("a:bodyPr")[0];
    const normAutofit = bodyPr && bodyPr.getElementsByTagName("a:normAutofit")[0];
    if (!normAutofit) return;
    const noAutofit = element.ownerDocument.createElement("a:noAutofit");
    bodyPr.replaceChild(noAutofit, normAutofit);
  };
}

function setTextFixed(text) {
  return [ModifyTextHelper.setText(text), fixAutofit()];
}
function setFirstRunTextFixed(text) {
  return [setFirstRunText(text), fixAutofit()];
}

function fmtSignedNum(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

// Deterministic layout fallbacks (2026-08 PO correction) — geometry-only
// XML modifiers (position/size), no pptx-automizer built-in for this. Used
// to widen/recenter/compact shapes strictly as a function of how much
// reviewed content actually exists — never a free-form redesign, and never
// applied to slides where the data volume didn't change (Slides 1/2/6/7).
function setPosition(x, y) {
  return (element) => {
    const off = element.getElementsByTagName("a:off")[0];
    if (off) { off.setAttribute("x", String(Math.round(x))); off.setAttribute("y", String(Math.round(y))); }
  };
}
function setSize(cx, cy) {
  return (element) => {
    const ext = element.getElementsByTagName("a:ext")[0];
    if (ext) { ext.setAttribute("cx", String(Math.round(cx))); ext.setAttribute("cy", String(Math.round(cy))); }
  };
}

function slide1Modifiers(slide1) {
  return (slide) => {
    slide.modifyElement("Text 2", setTextFixed(slide1.period));
    slide.modifyElement("Text 3", setTextFixed(slide1.customerName));
    slide.modifyElement("Text 4", setTextFixed(slide1.asOf));
  };
}

function slide2Modifiers(slide2) {
  const EMU_PER_IN = 914400;
  return (slide, pres) => {
    slide.modifyElement("Text 5", setFirstRunTextFixed(slide2.healthScoreCurrent));
    if (typeof slide2.adoptionTrendPct === "number") {
      slide.modifyElement("Text 9", setFirstRunTextFixed(fmtSignedNum(slide2.adoptionTrendPct)));
    }
    // Items to Align tile — no deterministic itemsToAlignCount source
    // (standing PO decision: never derive from internal risk criteria).
    // Every icon in this master is two layered shapes at the same position
    // (a colored circle "Shape N" background + a glyph "Image N" foreground)
    // — removing only one leaves a floating, mismatched leftover, so both
    // are always removed together (confirmed by position-matching all three
    // edited slides against the original master).
    ["Shape 11", "Shape 12", "Text 13", "Text 14", "Text 15", "Image 3"].forEach(n => slide.removeElement(n));
    // Second chart ("Adoption Trend (Point Change/Month)") — no monthly
    // point-change time series exists in the data model. Shape 18 = its
    // card background/border container.
    ["Text 19", "Image 5", "Shape 18"].forEach(n => slide.removeElement(n));
    // Stale hardcoded source/date footer — not the real reference date.
    slide.removeElement("Text 40");

    // Widened to the card's own available width (2026-08 layout-fallback +
    // wrap-avoidance revision — see qbrMasterRenderer's fixAutofit comment):
    // fewer forced line-wraps means less exposure to the confirmed
    // PDF-export line-duplication defect.
    if (slide2.interpretationText) {
      slide.modifyElement("Text 25", [...setTextFixed(slide2.interpretationText), setSize(7500975, 285750)]);
    } else {
      slide.removeElement("Text 25");
    }
    slide.removeElement("Text 27");
    slide.removeElement("Text 29");

    if (slide2.areasForAttentionText) {
      slide.modifyElement("Text 35", [...setTextFixed(slide2.areasForAttentionText), setSize(7500975, 285750)]);
    } else {
      slide.removeElement("Text 35");
    }
    slide.removeElement("Text 37");
    slide.removeElement("Text 39");

    // Native, editable chart from real healthScoreHistory — same placement
    // as the master's own "Image 4" (validated in the Step 1 spike).
    slide.removeElement("Image 4");
    const history = slide2.healthTrendsChart;
    if (history.length >= 2) {
      const x = 1114425 / EMU_PER_IN, y = 3932188 / EMU_PER_IN;
      const w = 7658100 / EMU_PER_IN, h = 2762250 / EMU_PER_IN;
      slide.generate((pSlide, pptxGenJs) => {
        const labels = history.map(p => new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
        const values = history.map(p => p.score);
        pSlide.addChart(pptxGenJs.ChartType.line, [{ name: "Health Score", labels, values }], {
          x, y, w, h,
          valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 25,
          chartColors: ["007F83"],
          lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 7,
          showLegend: false, showTitle: false,
          catAxisLabelColor: "5C6B72", valAxisLabelColor: "5C6B72",
          gridLineColor: "E4E9EA",
        });
      }, "HealthScoreChart");
    }
  };
}

function slide6Modifiers(slide6) {
  return (slide) => {
    // Each card icon is a colored-circle "Shape N" + glyph "Image N" pair at
    // the same position (Shape3+Image1, Shape7+Image2, Shape11+Image3) —
    // both removed together when a card has no reviewed content.
    const card = (labelName, contentName, shapeName, imageName, text) => {
      if (text) {
        slide.modifyElement(contentName, setTextFixed(text));
      } else {
        [labelName, contentName, shapeName, imageName].forEach(n => slide.removeElement(n));
      }
    };
    card("Text 4", "Text 5", "Shape 3", "Image 1", slide6.valueDeliveredText);
    card("Text 8", "Text 9", "Shape 7", "Image 2", slide6.adoptionText);
    card("Text 12", "Text 13", "Shape 11", "Image 3", slide6.renewalOutlookText);

    if (slide6.factText) {
      slide.modifyElement("Text 19", setTextFixed(slide6.factText));
    } else {
      ["Text 16", "Text 19", "Shape 15", "Image 4"].forEach(n => slide.removeElement(n));
    }
    slide.removeElement("Text 21");

    if (slide6.interpretationText) {
      slide.modifyElement("Text 27", setTextFixed(slide6.interpretationText));
    } else {
      ["Text 24", "Text 27", "Shape 23", "Image 5"].forEach(n => slide.removeElement(n));
    }
    slide.removeElement("Text 29");

    // Recommendation — V1: no separately reviewed recommendation field
    // exists yet (standing PO decision), never inferred from other
    // sections. Slot stays empty/hidden until that field is introduced.
    // Shape 30 = card background, Shape 31 = icon circle (+ Image 6 glyph),
    // Shape 33 = underline decoration below the "RECOMMENDATION" label.
    ["Text 32", "Text 34", "Shape 30", "Shape 31", "Image 6", "Shape 33"].forEach(n => slide.removeElement(n));
    // Customer Commitment — no dedicated data source. Shape 35 = the full-
    // width teal background bar, Shape 36 = icon circle (+ Image 7 glyph).
    ["Text 37", "Text 38", "Text 39", "Text 40", "Text 41", "Shape 35", "Shape 36", "Image 7"].forEach(n => slide.removeElement(n));
  };
}

function slide7Modifiers(slide7) {
  return (slide) => {
    // Icon pairs (Shape N background circle + Image N glyph) PLUS each
    // tile's own outer card background (Shape 2 = Value Delivered banner,
    // Shape 8 = Ticket Backlog card, Shape 19 = First Response card) — all
    // position-matched against the original master (Shape 13 = CSAT card,
    // always kept, not listed here).
    if (slide7.valueDeliveredFullText) {
      slide.modifyElement("Text 7", setTextFixed(slide7.valueDeliveredFullText));
    } else {
      ["Text 4", "Text 7", "Shape 2", "Shape 3", "Image 1"].forEach(n => slide.removeElement(n));
    }
    // Illustrative monetary KPI — no separate numeric $-figure field exists.
    slide.removeElement("Text 5");

    // Unsupported ops metrics — no matching fields in the data model.
    ["Text 10", "Text 11", "Text 12", "Shape 8", "Shape 9", "Image 2"].forEach(n => slide.removeElement(n));
    ["Text 21", "Text 22", "Text 23", "Shape 19", "Shape 20", "Image 4"].forEach(n => slide.removeElement(n));

    // CSAT — real 1-5 scale, never converted to /100.
    if (typeof slide7.csatCurrent === "number") {
      slide.modifyElement("Text 16", setTextFixed(slide7.csatCurrent.toFixed(1)));
      slide.modifyElement("Text 17", setTextFixed("/5"));
      if (typeof slide7.csatDelta === "number") {
        slide.modifyElement("Text 18", setTextFixed(`${fmtSignedNum(slide7.csatDelta)} vs prior week`));
      } else {
        slide.removeElement("Text 18");
      }
    } else {
      ["Text 15", "Text 16", "Text 17", "Text 18", "Shape 14", "Image 3"].forEach(n => slide.removeElement(n));
    }

    // Business Objectives — one reviewed item only (decision 1); the other
    // two placeholder bullets and their icons have no second/third source.
    if (slide7.businessObjectivesText) {
      slide.modifyElement("Text 28", [...setTextFixed(slide7.businessObjectivesText), setSize(8000000, 285750)]);
    } else {
      ["Text 28", "Image 5"].forEach(n => slide.removeElement(n));
    }
    ["Text 29", "Image 6"].forEach(n => slide.removeElement(n));
    ["Text 30", "Image 7"].forEach(n => slide.removeElement(n));
    // Desired Outcomes — always omitted (standing PO decision, no source).
    ["Text 32", "Text 33", "Text 34", "Image 8", "Image 9"].forEach(n => slide.removeElement(n));
    // Section header referenced "& Desired Outcomes" — that column no
    // longer exists, so the header is adjusted to match what remains
    // (content-removal consequence, not a new layout decision).
    slide.modifyElement("Text 25", setTextFixed("Business Objectives"));
  };
}

// Slide 4 — Open Commitments. 5 table rows; each row's "title" line has no
// separate short-label data (only one reviewed commitment string exists per
// item) and is always removed — the "description" line carries the
// reviewed text instead. Owner/Role/Due Date/Status are explicitly out of
// scope this sprint (no structured data source) and are always removed,
// including their badge background and per-row icon.
// icon/iconImage: same Shape-background + Image-glyph pairing as slide 5's
// rows (see its comment) — confirmed via position-matching.
const SLIDE4_ROWS = [
  { title: "Text 10", desc: "Text 11", owner: "Text 12", role: "Text 13", date: "Text 14", statusText: "Text 16", statusBg: "Shape 15", icon: "Shape 9", iconImage: "Image 1" },
  { title: "Text 19", desc: "Text 20", owner: "Text 21", role: "Text 22", date: "Text 23", statusText: "Text 25", statusBg: "Shape 24", icon: "Shape 18", iconImage: "Image 2" },
  { title: "Text 28", desc: "Text 29", owner: "Text 30", role: "Text 31", date: "Text 32", statusText: "Text 34", statusBg: "Shape 33", icon: "Shape 27", iconImage: "Image 3" },
  { title: "Text 37", desc: "Text 38", owner: "Text 39", role: "Text 40", date: "Text 41", statusText: "Text 43", statusBg: "Shape 42", icon: "Shape 36", iconImage: "Image 4" },
  { title: "Text 45", desc: "Text 46", owner: "Text 47", role: "Text 48", date: "Text 49", statusText: "Text 51", statusBg: "Shape 50", icon: "Shape 44", iconImage: "Image 5" },
];
// Dividers sit BETWEEN rows (SLIDE4_DIVIDERS[i] = divider after row i).
const SLIDE4_DIVIDERS = ["Shape 8", "Shape 17", "Shape 26", "Shape 35"];
// Real geometry from the master (all 5 rows share the same x/width, only y
// differs by a constant row spacing) — used to widen rows across the space
// freed by removing Owner/Due Date/Status, and to compact the table
// container to exactly N rows instead of leaving empty ones. See the
// Block C revision report for the exact numbers and their derivation.
const SLIDE4_TABLE = { x: 838200, y: 1542008, cx: 16611600, rightMargin: 300000 };
const SLIDE4_HEADER_BOTTOM = 2013496;
const SLIDE4_ROW_SPACING = 1228725;
const SLIDE4_DESC_X = 2085975;

function slide4Modifiers(slide4) {
  const itemCount = slide4.commitmentItems.length;
  const contentRight = SLIDE4_TABLE.x + SLIDE4_TABLE.cx - SLIDE4_TABLE.rightMargin;
  return (slide) => {
    // Header — Owner/Due Date/Status columns removed, "Commitment / Action"
    // widened to span the freed width (deterministic: table width minus
    // margin minus its own x).
    ["Text 5", "Text 6", "Text 7"].forEach(name => slide.removeElement(name));
    slide.modifyElement("Text 4", setSize(contentRight - 1076325, 195263));

    SLIDE4_ROWS.forEach((row, i) => {
      const text = slide4.commitmentItems[i];
      [row.owner, row.role, row.date, row.statusText, row.statusBg].forEach(name => slide.removeElement(name));
      slide.removeElement(row.title);
      if (text) {
        slide.modifyElement(row.desc, [...setTextFixed(text), setSize(contentRight - SLIDE4_DESC_X, 278011)]);
      } else {
        [row.desc, row.icon, row.iconImage].forEach(name => slide.removeElement(name));
      }
      // Drop dividers/rows at or after the first unused row — no empty rows.
      if (i >= Math.max(itemCount - 1, 0) && SLIDE4_DIVIDERS[i]) slide.removeElement(SLIDE4_DIVIDERS[i]);
    });

    // Compact the table container to exactly N rows (never leaves the
    // trailing empty-row whitespace the un-revised Block C had).
    const newCy = itemCount > 0 ? (SLIDE4_HEADER_BOTTOM + itemCount * SLIDE4_ROW_SPACING + 200000) - SLIDE4_TABLE.y : SLIDE4_HEADER_BOTTOM - SLIDE4_TABLE.y;
    slide.modifyElement("Shape 2", setSize(SLIDE4_TABLE.cx, newCy));

    // Status Legend — nothing left to explain once status badges are gone.
    // Shape 52 = legend background, Shape 54/57/60/63 = color swatch dots.
    ["Text 53", "Text 55", "Text 56", "Text 58", "Text 59", "Text 61", "Text 62", "Text 64", "Text 65",
      "Shape 52", "Shape 54", "Shape 57", "Shape 60", "Shape 63"].forEach(n => slide.removeElement(n));
  };
}

// Slide 5 — Next Quarter Plan. Populates the "Expected Outcomes" column —
// the only full-sentence-capable slot per row (the bold "Workstream" label
// is a 1-3 word category with no matching data, the 3 monthly milestone
// pills have no per-month breakdown) — with one reviewed
// nextQuarterPlan.presentationItems[] entry. Header relabeled to match.
// Each row's icon is TWO overlapping elements at the same position: a
// near-invisible "Shape N" plus the actually-visible glyph "Image N" (the
// colored circle is baked into the image itself here, unlike slides 2/6/7
// where the circle is a separate colored Shape) — confirmed by position-
// matching against the original master; removing only the Shape left the
// image glyph fully visible.
const SLIDE5_ROWS = [
  { wsTitle: "Text 11", wsSub: "Text 12", m1: "Text 14", m2: "Text 16", m3: "Text 18", outcome: "Text 19", outcomeY: 2449264, iconShape: "Shape 10", iconImage: "Image 1", m1bg: "Shape 13", m2bg: "Shape 15", m3bg: "Shape 17" },
  { wsTitle: "Text 22", wsSub: "Text 23", m1: "Text 25", m2: "Text 27", m3: "Text 29", outcome: "Text 30", outcomeY: 3563689, iconShape: "Shape 21", iconImage: "Image 2", m1bg: "Shape 24", m2bg: "Shape 26", m3bg: "Shape 28" },
  { wsTitle: "Text 33", wsSub: "Text 34", m1: "Text 36", m2: "Text 38", m3: "Text 40", outcome: "Text 41", outcomeY: 4678114, iconShape: "Shape 32", iconImage: "Image 3", m1bg: "Shape 35", m2bg: "Shape 37", m3bg: "Shape 39" },
  { wsTitle: "Text 44", wsSub: "Text 45", m1: "Text 47", m2: "Text 49", m3: "Text 51", outcome: "Text 52", outcomeY: 5792539, iconShape: "Shape 43", iconImage: "Image 4", m1bg: "Shape 46", m2bg: "Shape 48", m3bg: "Shape 50" },
  { wsTitle: "Text 54", wsSub: "Text 55", m1: "Text 57", m2: "Text 59", m3: "Text 61", outcome: "Text 62", outcomeY: 6906964, iconShape: "Shape 53", iconImage: "Image 5", m1bg: "Shape 56", m2bg: "Shape 58", m3bg: "Shape 60" },
];
const SLIDE5_DIVIDERS = ["Shape 9", "Shape 20", "Shape 31", "Shape 42"];
const SLIDE5_TABLE = { x: 838200, y: 1542008, cx: 16611600, rightMargin: 300000 };
const SLIDE5_HEADER_BOTTOM = 2013496;
const SLIDE5_ROW_SPACING = 1114425;
const SLIDE5_ACTION_X = 2026425; // icon right edge (1076325+800100) + gap

function slide5Modifiers(slide5) {
  const itemCount = slide5.planItems.length;
  const contentRight = SLIDE5_TABLE.x + SLIDE5_TABLE.cx - SLIDE5_TABLE.rightMargin;
  return (slide) => {
    // Header — OCT/NOV/DEC/EXPECTED OUTCOMES columns removed; "PLANNED
    // ACTIONS" widened to span the freed width (was the narrow "WORKSTREAM"
    // column).
    slide.modifyElement("Text 4", [...setTextFixed("PLANNED ACTIONS"), setSize(contentRight - 1076325, 195263)]);
    ["Text 5", "Text 6", "Text 7", "Text 8"].forEach(name => slide.removeElement(name));

    SLIDE5_ROWS.forEach((row, i) => {
      const text = slide5.planItems[i];
      [row.wsTitle, row.wsSub, row.m1, row.m2, row.m3, row.m1bg, row.m2bg, row.m3bg].forEach(name => slide.removeElement(name));
      if (text) {
        // Action text moves from the far-right "Expected Outcomes" slot to
        // right after the icon, widened across the freed row — a full
        // action row/card instead of a narrow right-aligned column.
        slide.modifyElement(row.outcome, [
          ...setTextFixed(text),
          setPosition(SLIDE5_ACTION_X, row.outcomeY),
          setSize(contentRight - SLIDE5_ACTION_X, 271463),
        ]);
      } else {
        [row.outcome, row.iconShape, row.iconImage].forEach(name => slide.removeElement(name));
      }
      if (i >= Math.max(itemCount - 1, 0) && SLIDE5_DIVIDERS[i]) slide.removeElement(SLIDE5_DIVIDERS[i]);
    });

    const newCy = itemCount > 0 ? (SLIDE5_HEADER_BOTTOM + itemCount * SLIDE5_ROW_SPACING + 200000) - SLIDE5_TABLE.y : SLIDE5_HEADER_BOTTOM - SLIDE5_TABLE.y;
    slide.modifyElement("Shape 2", setSize(SLIDE5_TABLE.cx, newCy));

    // "Planned Actions / Ongoing Commitments" legend — no longer a
    // meaningful distinction without the removed monthly breakdown.
    ["Text 65", "Text 66", "Text 68", "Text 69", "Shape 63", "Shape 64", "Shape 67"].forEach(name => slide.removeElement(name));
  };
}

// Items to Align / Opportunities cards — every sub-element's offset from
// its OWN card's top-left corner is identical between the two cards in the
// master (confirmed by direct geometry comparison), so one relative
// template drives both. When Customer Priorities + Recommendation are both
// gone (the standing case), the remaining 1-2 cards are re-centered in the
// full vertical band and widened to fill the freed horizontal space —
// deterministically, from data volume alone, never a free redesign.
const SLIDE8_CARD_REL = { icon: 238125, label: 1009650, underline: 238125, bodyLeftMargin: 238125, bodyRightMargin: 90106 };
const SLIDE8_CARD = { origX: 838200, origY: 6037213, cx: 5410200, cy: 2045791, iconDy: 200025, labelDy: 429816, underlineDy: 952500, bodyDy: 1085850 };
const SLIDE8_BAND_TOP = 1678186; // where "Customer Priorities" used to start
const SLIDE8_BAND_BOTTOM = 8073504; // where "Status Legend" used to start, minus a margin
const SLIDE8_GAP = 190500;
const SLIDE8_FULL_X = 838200;
const SLIDE8_FULL_CX = 16611600;
const SLIDE8_HALF_CX = (SLIDE8_FULL_CX - SLIDE8_GAP) / 2;

function positionCard(slide, { bgName, iconName, iconImageName, labelName, underlineName, bodyName, bodyCy }, newX, newY, newCx) {
  slide.modifyElement(bgName, [setPosition(newX, newY), setSize(newCx, SLIDE8_CARD.cy)]);
  slide.modifyElement(iconName, setPosition(newX + SLIDE8_CARD_REL.icon, newY + SLIDE8_CARD.iconDy));
  // Icon glyph "Image N" overlaps "Shape N" at the same position (same
  // layering as every other icon in this master) — moved together, or it
  // gets left behind at its old position, as a floating orphaned circle.
  slide.modifyElement(iconImageName, setPosition(newX + SLIDE8_CARD_REL.icon, newY + SLIDE8_CARD.iconDy));
  slide.modifyElement(labelName, setPosition(newX + SLIDE8_CARD_REL.label, newY + SLIDE8_CARD.labelDy));
  slide.modifyElement(underlineName, setPosition(newX + SLIDE8_CARD_REL.underline, newY + SLIDE8_CARD.underlineDy));
  const bodyX = newX + SLIDE8_CARD_REL.bodyLeftMargin;
  slide.modifyElement(bodyName, [
    setPosition(bodyX, newY + SLIDE8_CARD.bodyDy),
    setSize(newCx - SLIDE8_CARD_REL.bodyLeftMargin - SLIDE8_CARD_REL.bodyRightMargin, bodyCy),
  ]);
}

function slide8Modifiers(slide8) {
  const ITEMS = { bgName: "Shape 21", iconName: "Shape 22", iconImageName: "Image 4", labelName: "Text 23", underlineName: "Shape 24", bodyName: "Text 25", bodyCy: 544711 };
  const OPPS = { bgName: "Shape 26", iconName: "Shape 27", iconImageName: "Image 5", labelName: "Text 28", underlineName: "Shape 29", bodyName: "Text 30", bodyCy: 798016 };
  return (slide) => {
    // Customer Priorities / Focus Areas — always omitted (standing PO
    // decision, no customerPriorities data source). Image 1/2/3 = the 3
    // row icon glyphs (Shape-background + Image-glyph pairing, as above).
    ["Text 3", "Text 6", "Text 7", "Text 8", "Text 10", "Text 13", "Text 14", "Text 15", "Text 17", "Text 20",
      "Shape 2", "Shape 4", "Shape 5", "Shape 9", "Shape 11", "Shape 12", "Shape 16", "Shape 18", "Shape 19",
      "Image 1", "Image 2", "Image 3"].forEach(n => slide.removeElement(n));
    // Recommendation — V1: no separately reviewed recommendation field
    // exists yet (standing PO decision), never inferred from other
    // sections. Slot stays empty/hidden until that field is introduced.
    ["Text 33", "Text 35", "Shape 31", "Shape 32", "Image 6", "Shape 34"].forEach(n => slide.removeElement(n));
    // Status Legend — nothing left to explain, no status badges remain.
    ["Text 37", "Text 39", "Text 40", "Text 42", "Text 43", "Text 45", "Text 46", "Text 48", "Text 49",
      "Shape 36", "Shape 38", "Shape 41", "Shape 44", "Shape 47"].forEach(n => slide.removeElement(n));

    const hasItems = Boolean(slide8.itemsToAlignText);
    const hasOpps = Boolean(slide8.opportunitiesText);
    const bandHeight = SLIDE8_BAND_BOTTOM - SLIDE8_BAND_TOP;
    const newY = SLIDE8_BAND_TOP + (bandHeight - SLIDE8_CARD.cy) / 2;

    if (hasItems) slide.modifyElement(ITEMS.bodyName, setTextFixed(slide8.itemsToAlignText));
    else [ITEMS.labelName, ITEMS.bodyName, ITEMS.bgName, ITEMS.iconName, "Image 4", ITEMS.underlineName].forEach(n => slide.removeElement(n));
    if (hasOpps) slide.modifyElement(OPPS.bodyName, setTextFixed(slide8.opportunitiesText));
    else [OPPS.labelName, OPPS.bodyName, OPPS.bgName, OPPS.iconName, "Image 5", OPPS.underlineName].forEach(n => slide.removeElement(n));

    if (hasItems && hasOpps) {
      positionCard(slide, ITEMS, SLIDE8_FULL_X, newY, SLIDE8_HALF_CX);
      positionCard(slide, OPPS, SLIDE8_FULL_X + SLIDE8_HALF_CX + SLIDE8_GAP, newY, SLIDE8_HALF_CX);
    } else if (hasItems) {
      positionCard(slide, ITEMS, SLIDE8_FULL_X, newY, SLIDE8_FULL_CX);
    } else if (hasOpps) {
      positionCard(slide, OPPS, SLIDE8_FULL_X, newY, SLIDE8_FULL_CX);
    }
    // Neither reviewed: both cards already fully removed above — nothing
    // invented to fill the slide, per "no new content" rule.
  };
}

// Slide 3 — Adoption & Product Feedback (Block D). Replaces the unsupported
// donut/engagement-score/weekly-trend content with real usage data and the
// reviewed adoption interpretation, and replaces "Next Steps" (no reviewed
// source) with the real feature-request evidence.
function slide3Modifiers(slide3) {
  return (slide) => {
    // Title — real content replaces "Adoption & Engagement".
    slide.modifyElement("Text 0", setTextFixed("Adoption & Product Feedback"));

    // Unsupported donut chart image — real adoptionRatePct is shown as text
    // instead (a static illustration fixed at 78%/22% would misrepresent
    // the real number). Shape4/Shape6 were its tiny legend-dot markers.
    // Text5/7 widened (were sized for their old short single-word runs) to
    // avoid a forced 2-line wrap, which is exactly the confirmed
    // duplication trigger (see fixAutofit comment).
    ["Image 1", "Shape 4", "Shape 6"].forEach(n => slide.removeElement(n));
    if (typeof slide3.adoptionRatePct === "number") {
      slide.modifyElement("Text 5", [...setTextFixed(`${slide3.adoptionRatePct}% Active`), setPosition(2500000, 3200000), setSize(2000000, 258366)]);
      slide.modifyElement("Text 7", [...setTextFixed(`${100 - slide3.adoptionRatePct}% Inactive`), setPosition(2500000, 3600000), setSize(2000000, 258366)]);
    } else {
      ["Text 5", "Text 7"].forEach(n => slide.removeElement(n));
    }

    // Engagement Trend weekly chart — no weekly time series in the data
    // model. Shape8 = its now-empty card container, removed too so the
    // slide doesn't show a large blank white box.
    ["Image 2", "Text 9", "Text 10", "Shape 8"].forEach(n => slide.removeElement(n));

    // Active Users (Current) — real; no month-over-month delta source.
    if (typeof slide3.activeUsers === "number") {
      slide.modifyElement("Text 14", setTextFixed(String(slide3.activeUsers)));
      slide.removeElement("Text 15");
    } else {
      ["Shape 11", "Shape 12", "Image 3", "Text 13", "Text 14", "Text 15"].forEach(n => slide.removeElement(n));
    }

    // Engagement Score / Avg Weekly Sessions — no data source, explicitly
    // removed per PO decision.
    ["Shape 16", "Shape 17", "Image 4", "Text 18", "Text 19", "Text 20"].forEach(n => slide.removeElement(n));
    ["Shape 21", "Shape 22", "Image 5", "Text 23", "Text 24", "Text 25"].forEach(n => slide.removeElement(n));

    // Interpretation — one reviewed item (decision 1); other 2 bullets +
    // their dot markers have no second/third source.
    if (slide3.interpretationText) {
      slide.modifyElement("Text 31", [...setTextFixed(slide3.interpretationText), setSize(7520025, 285750)]);
    } else {
      ["Text 28", "Shape 29", "Text 31", "Shape 30"].forEach(n => slide.removeElement(n));
    }
    ["Text 33", "Shape 32"].forEach(n => slide.removeElement(n));
    ["Text 35", "Shape 34"].forEach(n => slide.removeElement(n));

    // "NEXT STEPS" -> real feature-request evidence (no reviewed "next
    // steps" source exists distinct from nextQuarterPlan, out of scope here
    // per the approved Slide 3 field list).
    const hasFeatureRequest = Boolean(slide3.topFeatureRequestText);
    if (hasFeatureRequest) {
      slide.modifyElement("Text 38", setTextFixed("FEATURE REQUEST"));
      slide.modifyElement("Text 41", [...setTextFixed(slide3.topFeatureRequestText), setSize(7520025, 285750)]);
      const meta = [
        slide3.featureRequestSentiment ? `Sentiment: ${slide3.featureRequestSentiment}` : null,
        typeof slide3.featureRequestsCount === "number" ? `${slide3.featureRequestsCount} request(s) logged` : null,
      ].filter(Boolean).join(" · ");
      if (meta) {
        slide.modifyElement("Text 43", [...setTextFixed(meta), setSize(7520025, 285750)]);
      } else {
        ["Text 43", "Shape 42"].forEach(n => slide.removeElement(n));
      }
      if (slide3.featureRequestSinceText) {
        slide.modifyElement("Text 45", [...setTextFixed(slide3.featureRequestSinceText), setSize(7520025, 285750)]);
      } else {
        ["Text 45", "Shape 44"].forEach(n => slide.removeElement(n));
      }
    } else {
      ["Shape 36", "Shape 37", "Image 7", "Text 38", "Shape 39",
        "Text 41", "Shape 40", "Text 43", "Shape 42", "Text 45", "Shape 44"].forEach(n => slide.removeElement(n));
    }

    // Stale hardcoded source/date footer.
    slide.removeElement("Text 46");
  };
}

// Slide 9 — Partnership Outlook (Block D). Hero banners + cards use only
// reviewed presentation content; unsupported seat-count figure removed.
function slide9Modifiers(slide9) {
  const hero = (labelName, contentName, shapeName, imageName, text) => (slide) => {
    if (text) slide.modifyElement(contentName, setTextFixed(text));
    else [labelName, contentName, shapeName, imageName].forEach(n => slide.removeElement(n));
  };
  return (slide) => {
    hero("Text 3", "Text 4", "Shape 2", "Image 2", slide9.driveImpactText)(slide);
    hero("Text 6", "Text 7", "Shape 5", "Image 3", slide9.scaleWorksText)(slide);
    hero("Text 9", "Text 10", "Shape 8", "Image 4", slide9.buildFutureText)(slide);

    if (slide9.partnershipContextText) {
      slide.modifyElement("Text 14", setTextFixed(slide9.partnershipContextText));
    } else {
      ["Shape 11", "Shape 12", "Image 5", "Text 13", "Text 14"].forEach(n => slide.removeElement(n));
    }

    if (slide9.renewalOutlookText) {
      slide.modifyElement("Text 18", setTextFixed(slide9.renewalOutlookText));
      // Unsupported illustrative seat-expansion figure.
      ["Shape 19", "Text 20"].forEach(n => slide.removeElement(n));
    } else {
      ["Shape 15", "Shape 16", "Image 6", "Text 17", "Text 18", "Shape 19", "Text 20"].forEach(n => slide.removeElement(n));
    }

    // Documented Next Steps — one reviewed item (decision 1), widened into
    // the space freed by the other 2 (unsourced) bullets.
    if (slide9.nextStepsText) {
      slide.modifyElement("Text 25", [...setTextFixed(slide9.nextStepsText), setSize(4738725, 276225)]);
    } else {
      ["Shape 21", "Shape 22", "Image 7", "Text 23", "Text 25", "Shape 24"].forEach(n => slide.removeElement(n));
    }
    ["Text 27", "Shape 26"].forEach(n => slide.removeElement(n));
    ["Text 29", "Shape 28"].forEach(n => slide.removeElement(n));
    // Thank-you banner (Shape30/31, Image8/9/10, Text32) is static template
    // copy, not data-dependent — kept as-is.
  };
}

// Slide 10 — Evidence/Appendix (Block D). Ticket Deflection and Sources
// removed entirely (no data source); NPS repositioned into the freed
// middle slot; Previous Interventions widened to full width once Sources
// is gone.
function slide10Modifiers(slide10) {
  return (slide) => {
    if (typeof slide10.avgResolutionDays === "number") {
      slide.modifyElement("Text 4", setTextFixed(`${slide10.avgResolutionDays}d`));
    } else {
      ["Shape 1", "Shape 2", "Image 1", "Text 3", "Text 4"].forEach(n => slide.removeElement(n));
    }

    // Ticket Deflection — no data source.
    ["Shape 5", "Shape 6", "Image 2", "Text 7", "Text 8"].forEach(n => slide.removeElement(n));

    if (typeof slide10.npsCurrent === "number") {
      // Moved into Ticket Deflection's freed middle slot so the 2 real
      // tiles read as evenly spaced, not left+far-right with a gap.
      slide.modifyElement("Shape 9", setPosition(6438900, 1361033));
      slide.modifyElement("Shape 10", setPosition(6657975, 1542008));
      slide.modifyElement("Image 3", setPosition(6657975, 1542008));
      slide.modifyElement("Text 11", setPosition(7762875, 1591270));
      slide.modifyElement("Text 12", [...setTextFixed(String(slide10.npsCurrent)), setPosition(7762875, 1773138)]);
      if (typeof slide10.npsDelta === "number") {
        slide.modifyElement("Text 13", [...setTextFixed(`${fmtSignedNum(slide10.npsDelta)} QoQ`), setPosition(7762875, 2190304), setSize(1600000, 254794)]);
      } else {
        slide.removeElement("Text 13");
      }
    } else {
      ["Shape 9", "Shape 10", "Image 3", "Text 11", "Text 12", "Text 13"].forEach(n => slide.removeElement(n));
    }

    // Previous Interventions — one reviewed item (decision 1); the other 3
    // dated entries have no per-entry date data and are removed along with
    // their timeline connector/bullet marks. Card widened to fill the
    // width freed by removing Sources entirely.
    slide.modifyElement("Shape 14", setSize(16311600, 3975199));
    if (slide10.previousInterventionsText) {
      // Date label (e.g. "Q1 2026 · Jan") is unsupported per-entry
      // metadata we don't have — removed, only the reviewed text remains.
      slide.removeElement("Text 18");
      slide.modifyElement("Text 19", [...setTextFixed(slide10.previousInterventionsText), setSize(15449625, 284708)]);
      slide.removeElement("Shape 16"); // long timeline connector, dangling with only 1 entry
    } else {
      ["Text 15", "Shape 16", "Shape 17", "Text 18", "Text 19"].forEach(n => slide.removeElement(n));
    }
    ["Shape 20", "Shape 21", "Text 22", "Text 23"].forEach(n => slide.removeElement(n));
    ["Shape 24", "Shape 25", "Text 26", "Text 27"].forEach(n => slide.removeElement(n));
    ["Shape 28", "Text 29", "Text 30"].forEach(n => slide.removeElement(n));

    // Sources — always omitted (standing PO decision, no invented
    // provenance).
    ["Shape 31", "Text 32", "Shape 33", "Image 4", "Text 34",
      "Shape 35", "Image 5", "Text 36", "Shape 37", "Image 6", "Text 38",
      "Shape 39", "Image 7", "Text 40"].forEach(n => slide.removeElement(n));
  };
}

export async function renderQbrMasterPptx(content) {
  // pptx-automizer's write() writes to disk (it has no in-memory buffer
  // API) — output goes to the OS temp dir under a per-call unique name
  // (never the bundled assets/qbr-master dir) and is read back + deleted
  // here so the rest of the app only ever deals with a Buffer, same as the
  // old PptxGenJS renderer's return contract.
  const outputDir = tmpdir();
  const outputFile = `qbr-export-${Date.now()}-${Math.random().toString(36).slice(2)}.pptx`;

  const automizer = new Automizer({
    templateDir: TEMPLATE_DIR,
    outputDir,
    autoImportSlideMasters: true,
    removeExistingSlides: true,
    verbosity: 0,
  });

  const pres = automizer.loadRoot(TEMPLATE_FILE).load(TEMPLATE_FILE, "master");
  const info = await pres.getInfo();
  const slideNumbers = info.slidesByTemplate("master").map(s => s.number).sort((a, b) => a - b);

  const modifiersBySlide = {
    1: slide1Modifiers(content.slide1),
    2: slide2Modifiers(content.slide2),
    3: slide3Modifiers(content.slide3),
    4: slide4Modifiers(content.slide4),
    5: slide5Modifiers(content.slide5),
    6: slide6Modifiers(content.slide6),
    7: slide7Modifiers(content.slide7),
    8: slide8Modifiers(content.slide8),
    9: slide9Modifiers(content.slide9),
    10: slide10Modifiers(content.slide10),
  };

  for (const num of slideNumbers) {
    const modify = modifiersBySlide[num];
    if (modify) pres.addSlide("master", num, modify);
    else pres.addSlide("master", num); // Slides 3-5, 8-10 — untouched (Block C/D)
  }

  await pres.write(outputFile);
  const outputPath = join(outputDir, outputFile);
  try {
    return await readFile(outputPath);
  } finally {
    await unlink(outputPath).catch(() => {});
  }
}
