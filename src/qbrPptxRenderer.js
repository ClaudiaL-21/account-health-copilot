// QBR Customer Presentation — deterministic PowerPoint renderer.
//
// Recreates the approved Claude Design LIGHT deck (QBR-Template-Light.dc.html,
// QBR-Template-Handoff.md) as native, editable PptxGenJS shapes/text — never
// a flattened image of the HTML. Consumes ONLY the flat `content` object
// produced by qbrPresentationMap.js (mapQbrToPresentation) — never touches
// `internal`/`customerSafeDefault`, never calls an LLM, never invents text.
//
// Coordinate system: the design canvas is 1920x1080px. PowerPoint's standard
// 16:9 "widescreen" layout is 13.333in x 7.5in — 1920/13.333 = 144 px/in
// exactly (a 2x/Retina-style ratio), so px→pt is simply px/2 (144px/in ÷
// 72pt/in = 2px/pt). Every position below is authored in the SAME px units
// as the source HTML and converted through inX()/pt() at the point of use,
// so this file's numbers stay directly comparable to the design file.
import PptxGenJS from "pptxgenjs";

const SLIDE_W_IN = 13.333;
const PX_PER_IN = 1920 / SLIDE_W_IN;
const inX = px => +(px / PX_PER_IN).toFixed(4);
const pt = px => +(px / 2).toFixed(1);

const COLOR = {
  teal: "007F83",
  tealDark: "00666A",
  slate: "25333A",
  canvas: "F7FAF9",
  blue: "226FBD",
  violet: "7462A6",
  mint: "A9E5D3",
  surface: "FFFFFF",
  surfaceDeep: "0F4548",
  border: "D8DEE0",
  muted: "5C6B72",
};
const FONT_HEAD = "Manrope";
const FONT_BODY = "Source Sans 3";
const LOGO_PATH = "assets/logo-horizontal-light.png";
const LOGO_ASPECT = 484 / 1536; // h/w of the approved horizontal LIGHT lockup

const PAD_X = 88;
const PAD_Y = 52;
const CONTENT_W = 1920 - PAD_X * 2; // 1744

function fmtAxisDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addLogo(slide, { xPx, yPx, wPx }) {
  const w = inX(wPx), h = w * LOGO_ASPECT;
  slide.addImage({ path: LOGO_PATH, x: inX(xPx), y: inX(yPx), w, h });
}
function addLogoTopRight(slide, wPx = 180) {
  addLogo(slide, { xPx: 1920 - PAD_X - wPx, yPx: PAD_Y + 4, wPx });
}

function newContentSlide(pptx, { title, subtitle } = {}) {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR.canvas };
  if (title) {
    slide.addText(title, {
      x: inX(PAD_X), y: inX(PAD_Y), w: inX(1300), h: inX(56),
      fontFace: FONT_HEAD, fontSize: pt(42), bold: true, color: COLOR.slate,
    });
  }
  if (subtitle) {
    slide.addText(subtitle, {
      x: inX(PAD_X), y: inX(PAD_Y + 58), w: inX(900), h: inX(28),
      fontFace: FONT_BODY, fontSize: pt(18), bold: true, color: COLOR.muted,
    });
  }
  addLogoTopRight(slide);
  return slide;
}

function addCard(slide, { x, y, w, h, accent, accentSide = "top", fill = COLOR.surface }) {
  slide.addShape("roundRect", {
    x: inX(x), y: inX(y), w: inX(w), h: inX(h),
    fill: { color: fill }, line: { color: COLOR.border, width: 1 },
    rectRadius: 0.09, shadow: { type: "none" },
  });
  if (accent) {
    if (accentSide === "top") {
      slide.addShape("rect", { x: inX(x), y: inX(y), w: inX(w), h: inX(5), fill: { color: accent }, line: { type: "none" } });
    } else {
      slide.addShape("rect", { x: inX(x), y: inX(y), w: inX(6), h: inX(h), fill: { color: accent }, line: { type: "none" } });
    }
  }
}

function addKicker(slide, text, { x, y, w = 400, color = COLOR.slate }) {
  slide.addText(text.toUpperCase(), {
    x: inX(x), y: inX(y), w: inX(w), h: inX(24),
    fontFace: FONT_HEAD, fontSize: pt(13), bold: true, color,
  });
}

function addParagraph(slide, text, { x, y, w, h, size = 16, color = COLOR.slate, bold = false, italic = false, align = "left", valign = "top" }) {
  slide.addText(text, {
    x: inX(x), y: inX(y), w: inX(w), h: inX(h),
    fontFace: FONT_BODY, fontSize: pt(size), color, bold, italic, align, valign,
    wrap: true, autoFit: false,
  });
}

function addBulletList(slide, items, { x, y, w, h, size = 16, color = COLOR.slate, dotColor = COLOR.teal }) {
  if (!items || items.length === 0) return;
  const runs = items.map((text, i) => ({
    text,
    options: {
      bullet: { code: "25CF", color: dotColor, indent: 18 },
      breakLine: i < items.length - 1,
      color, fontFace: FONT_BODY, fontSize: pt(size),
    },
  }));
  slide.addText(runs, { x: inX(x), y: inX(y), w: inX(w), h: inX(h), valign: "top", wrap: true });
}

function addStatCard(slide, { x, y, w, h, kicker, value }) {
  addCard(slide, { x, y, w, h });
  addKicker(slide, kicker, { x: x + 20, y: y + 14, w: w - 40, color: COLOR.muted });
  addParagraph(slide, value, { x: x + 20, y: y + 40, w: w - 40, h: h - 50, size: 22, bold: true, color: COLOR.slate });
}

function addHealthChart(slide, points, { x, y, w, h }) {
  if (!points || points.length < 2) {
    slide.addShape("roundRect", {
      x: inX(x), y: inX(y), w: inX(w), h: inX(h),
      fill: { color: "F1F7F7" }, line: { color: COLOR.teal, width: 1.5, dashType: "dash" }, rectRadius: 0.07,
    });
    addParagraph(slide, "Renders from healthTrends once available", {
      x, y, w, h, size: 18, italic: true, color: COLOR.tealDark, align: "center", valign: "middle",
    });
    return;
  }
  const labels = points.map(p => fmtAxisDate(p.date));
  const values = points.map(p => p.score);
  slide.addChart("line", [{ name: "Health Score", labels, values }], {
    x: inX(x), y: inX(y), w: inX(w), h: inX(h),
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 25,
    chartColors: [COLOR.teal],
    lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 7, lineSmooth: false,
    showLegend: false, showTitle: false,
    catAxisLabelColor: COLOR.muted, catAxisLabelFontFace: FONT_BODY, catAxisLabelFontSize: pt(15),
    valAxisLabelColor: COLOR.muted, valAxisLabelFontFace: FONT_BODY, valAxisLabelFontSize: pt(15),
    dataLabelColor: COLOR.slate,
    gridLineColor: "E4E9EA",
  });
}

// --- Slide builders --------------------------------------------------------

function buildCover(pptx, content) {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR.surface };
  addLogo(slide, { xPx: 88, yPx: 72, wPx: 340 });

  slide.addShape("rect", { x: inX(88), y: inX(330), w: inX(56), h: inX(6), fill: { color: COLOR.teal }, line: { type: "none" } });
  slide.addText("Quarterly\nBusiness Review", {
    x: inX(88), y: inX(354), w: inX(880), h: inX(150),
    fontFace: FONT_HEAD, fontSize: pt(66), bold: true, color: COLOR.slate, lineSpacingMultiple: 1.08,
  });

  addKicker(slide, "Account", { x: 88, y: 520, color: COLOR.teal });
  addParagraph(slide, content.customerName, { x: 88, y: 548, w: 420, h: 44, size: 32, bold: true, color: COLOR.slate });
  addKicker(slide, "Period", { x: 320, y: 520, color: COLOR.teal });
  addParagraph(slide, content.period, { x: 320, y: 548, w: 300, h: 44, size: 32, bold: true, color: COLOR.slate });

  addParagraph(slide, "A customer-facing review of outcomes, progress, opportunities and next steps.", {
    x: 88, y: 610, w: 760, h: 60, size: 18, bold: true, color: COLOR.muted,
  });
  addParagraph(slide, "Prepared by Customer Success", { x: 88, y: 984, w: 500, h: 30, size: 16, color: COLOR.muted });

  slide.addShape("rect", { x: inX(1104), y: 0, w: inX(816), h: 7.5, fill: { color: COLOR.surfaceDeep }, line: { type: "none" } });
  slide.addShape("ellipse", { x: inX(1104 + 60), y: inX(60), w: inX(440), h: inX(440), fill: { type: "none" }, line: { color: "FFFFFF", width: 1, transparency: 88 } });
  slide.addShape("ellipse", { x: inX(1104 + 220), y: inX(460), w: inX(600), h: inX(600), fill: { type: "none" }, line: { color: COLOR.mint, width: 1, transparency: 88 } });
}

function buildExecutiveSummary(pptx, content) {
  const slide = newContentSlide(pptx, { title: "Executive Summary", subtitle: "What matters most this quarter." });

  const colW = (CONTENT_W - 40) / 3;
  const row1 = [
    { key: "valueDelivered", label: "Value Delivered", color: COLOR.teal, value: content.valueDelivered },
    { key: "adoption", label: "Adoption & Engagement", color: COLOR.blue, value: content.adoption },
    { key: "renewalOutlook", label: "Renewal Outlook", color: COLOR.violet, value: content.renewalOutlook },
  ];
  row1.forEach((c, i) => {
    const x = PAD_X + i * (colW + 20);
    addCard(slide, { x, y: 176, w: colW, h: 140 });
    addKicker(slide, c.label, { x: x + 22, y: 194, w: colW - 44, color: COLOR.muted });
    if (c.value) addParagraph(slide, c.value, { x: x + 22, y: 222, w: colW - 44, h: 88, size: 15, color: COLOR.slate });
  });

  // recommendation card intentionally omitted (PO decision 2 — no reviewed
  // source exists); Fact/Interpretation use a 2-column split (not the
  // template's 3-column grid) so the row stays visually balanced instead of
  // leaving a blank third slot.
  const row2ColW = (CONTENT_W - 20) / 2;
  const row2 = [
    { label: "Fact", color: COLOR.teal, items: content.executiveSummary },
    { label: "Interpretation", color: COLOR.blue, items: content.interpretation },
  ];
  row2.forEach((c, i) => {
    const x = PAD_X + i * (row2ColW + 20);
    addCard(slide, { x, y: 336, w: row2ColW, h: 260, accent: c.color });
    addKicker(slide, c.label, { x: x + 22, y: 356, w: row2ColW - 44, color: c.color });
    addBulletList(slide, c.items, { x: x + 22, y: 390, w: row2ColW - 44, h: 190, size: 15, dotColor: c.color });
  });

  if (content.openCommitments.length) {
    addCard(slide, { x: PAD_X, y: 616, w: CONTENT_W, h: 130, accent: null });
    addKicker(slide, "Customer Commitment", { x: PAD_X + 26, y: 636, w: 260, color: COLOR.tealDark });
    addParagraph(slide, content.openCommitments[0], { x: PAD_X + 26, y: 668, w: CONTENT_W - 52, h: 60, size: 16, color: COLOR.slate });
  }
}

function buildObjectivesAndValue(pptx, content) {
  const slide = newContentSlide(pptx, { title: "Business Objectives & Value" });
  const colW = (CONTENT_W - 22) / 2;

  // desiredOutcomes column intentionally omitted (PO decision 5 — no
  // source); Business Objectives uses the card's full width, not the
  // template's 2-column split.
  addCard(slide, { x: PAD_X, y: 176, w: colW, h: 840 });
  addParagraph(slide, "Business Objectives", { x: PAD_X + 26, y: 202, w: colW - 52, h: 34, size: 19, bold: true, color: COLOR.slate });
  addBulletList(slide, content.businessObjectives, { x: PAD_X + 26, y: 250, w: colW - 52, h: 726, size: 16 });

  const rightX = PAD_X + colW + 22;
  addCard(slide, { x: rightX, y: 176, w: colW, h: 140, accent: null, fill: "EAF5F4" });
  addKicker(slide, "Value Delivered", { x: rightX + 26, y: 200, w: colW - 52, color: COLOR.tealDark });
  if (content.valueDelivered) addParagraph(slide, content.valueDelivered, { x: rightX + 26, y: 232, w: colW - 52, h: 74, size: 17, color: COLOR.slate });

  addCard(slide, { x: rightX, y: 336, w: colW, h: 680 });
  addKicker(slide, "Business Impact", { x: rightX + 26, y: 358, w: colW - 52, color: COLOR.slate });
  addBulletList(slide, content.businessImpact, { x: rightX + 26, y: 392, w: colW - 52, h: 560, size: 16 });
}

function buildHealthAdoption(pptx, content) {
  const slide = newContentSlide(pptx, { title: "Health, Adoption & Engagement" });
  const statW = (CONTENT_W - 18) / 2;

  addStatCard(slide, { x: PAD_X, y: 142, w: statW, h: 100, kicker: "Current Health Score", value: `${content.healthScoreCurrent} / 100` });
  const trendLabel = `${content.adoptionTrendPct > 0 ? "+" : ""}${content.adoptionTrendPct}% vs last period`;
  addStatCard(slide, { x: PAD_X + statW + 18, y: 142, w: statW, h: 100, kicker: "Adoption Trend", value: trendLabel });
  // itemsToAlignCount card intentionally omitted (PO decision 3)

  const chartW = 1726 * 1.55 / 2.55;
  const chartX = PAD_X, chartY = 260, chartH = 604;
  addCard(slide, { x: chartX, y: chartY, w: chartW, h: chartH });
  addParagraph(slide, "Health Score Trend", { x: chartX + 24, y: chartY + 16, w: chartW - 48, h: 30, size: 19, bold: true, color: COLOR.slate });
  addHealthChart(slide, content.healthTrendsChart, { x: chartX + 24, y: chartY + 60, w: chartW - 48, h: chartH - 90 });

  const rightX = chartX + chartW + 18;
  const rightW = 1726 - chartW;
  const rightH = (chartH - 18) / 2;
  addCard(slide, { x: rightX, y: chartY, w: rightW, h: rightH });
  addKicker(slide, "Adoption & Engagement", { x: rightX + 22, y: chartY + 18, w: rightW - 44, color: COLOR.slate });
  if (content.adoption) addParagraph(slide, content.adoption, { x: rightX + 22, y: chartY + 48, w: rightW - 44, h: rightH - 66, size: 15, color: COLOR.slate });

  const attY = chartY + rightH + 18;
  addCard(slide, { x: rightX, y: attY, w: rightW, h: rightH, accent: COLOR.blue });
  addKicker(slide, "Interpretation — Areas for Attention", { x: rightX + 22, y: attY + 18, w: rightW - 44, color: COLOR.blue });
  addBulletList(slide, content.areasForAttention, { x: rightX + 22, y: attY + 50, w: rightW - 44, h: rightH - 68, size: 15, dotColor: COLOR.blue });
}

function buildPriorities(pptx, content) {
  const slide = newContentSlide(pptx, { title: "Priorities & Areas for Attention" });
  // customerPriorities list intentionally omitted (PO decision 5 — no source);
  // the two derived cards below expand to fill the freed vertical space.
  const colW = (CONTENT_W - 20) / 2;
  const y = 176, h = 852;

  addCard(slide, { x: PAD_X, y, w: colW, h, accent: COLOR.blue });
  addParagraph(slide, "Items to Align", { x: PAD_X + 24, y: y + 20, w: colW - 48, h: 34, size: 19, bold: true, color: COLOR.slate });
  addBulletList(slide, content.itemsToAlign, { x: PAD_X + 24, y: y + 64, w: colW - 48, h: h - 90, size: 16, dotColor: COLOR.blue });

  const x2 = PAD_X + colW + 20;
  addCard(slide, { x: x2, y, w: colW, h, accent: COLOR.violet });
  addParagraph(slide, "Opportunities", { x: x2 + 24, y: y + 20, w: colW - 48, h: 34, size: 19, bold: true, color: COLOR.slate });
  addBulletList(slide, content.opportunities, { x: x2 + 24, y: y + 64, w: colW - 48, h: h - 90, size: 16, dotColor: COLOR.violet });
}

function buildOpenCommitments(pptx, content) {
  const slide = newContentSlide(pptx, { title: "Open Commitments & Actions" });
  let y = 176;
  content.openCommitments.forEach(text => {
    addCard(slide, { x: PAD_X, y, w: CONTENT_W, h: 140, accent: COLOR.blue, accentSide: "left" });
    addParagraph(slide, text, { x: PAD_X + 32, y: y + 22, w: CONTENT_W - 64, h: 96, size: 17, color: COLOR.slate });
    y += 160;
  });
}

function buildNextQuarterPlan(pptx, content) {
  const slide = newContentSlide(pptx, { title: "Next Quarter Plan" });
  // recommendedNextSteps card intentionally omitted (PO decision 2); the
  // documented-actions row below expands to fill the freed vertical space.
  const colW = (CONTENT_W - 20) / 2;
  const y = 176, h = 852;

  addCard(slide, { x: PAD_X, y, w: colW, h, accent: COLOR.teal });
  addParagraph(slide, "Documented / Planned Actions", { x: PAD_X + 26, y: y + 20, w: colW - 52, h: 34, size: 19, bold: true, color: COLOR.slate });
  addBulletList(slide, content.nextQuarterPlan, { x: PAD_X + 26, y: y + 64, w: colW - 52, h: h - 90, size: 16 });

  const x2 = PAD_X + colW + 20;
  addCard(slide, { x: x2, y, w: colW, h, accent: COLOR.blue });
  addParagraph(slide, "Ongoing Commitments", { x: x2 + 26, y: y + 20, w: colW - 52, h: 34, size: 19, bold: true, color: COLOR.slate });
  addBulletList(slide, content.ongoingCommitments, { x: x2 + 26, y: y + 64, w: colW - 52, h: h - 90, size: 16, dotColor: COLOR.blue });
}

function buildPartnershipOutlook(pptx, content) {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR.canvas };
  slide.addText("Partnership Outlook", {
    x: inX(PAD_X), y: inX(PAD_Y), w: inX(1300), h: inX(56),
    fontFace: FONT_HEAD, fontSize: pt(42), bold: true, color: COLOR.slate,
  });

  const colW = (CONTENT_W - 20) / 2;
  addCard(slide, { x: PAD_X, y: 122, w: colW, h: 420, accent: COLOR.teal });
  addParagraph(slide, "Partnership Context / Outlook", { x: PAD_X + 26, y: 142, w: colW - 52, h: 34, size: 19, bold: true, color: COLOR.slate });
  if (content.relationship) addParagraph(slide, content.relationship, { x: PAD_X + 26, y: 186, w: colW - 52, h: 330, size: 16, color: COLOR.slate });

  const x2 = PAD_X + colW + 20;
  addCard(slide, { x: x2, y: 122, w: colW, h: 420, accent: COLOR.violet });
  addParagraph(slide, "Commercial / Renewal Outlook", { x: x2 + 26, y: 142, w: colW - 52, h: 34, size: 19, bold: true, color: COLOR.slate });
  if (content.renewalOutlook) addParagraph(slide, content.renewalOutlook, { x: x2 + 26, y: 186, w: colW - 52, h: 330, size: 16, color: COLOR.slate });

  addCard(slide, { x: PAD_X, y: 562, w: CONTENT_W, h: 230 });
  addParagraph(slide, "Documented Next Steps", { x: PAD_X + 28, y: 586, w: CONTENT_W - 56, h: 34, size: 19, bold: true, color: COLOR.slate });
  addBulletList(slide, content.partnershipOutlook, { x: PAD_X + 28, y: 630, w: CONTENT_W - 56, h: 150, size: 16 });

  addCard(slide, { x: PAD_X, y: 948, w: CONTENT_W, h: 80, fill: COLOR.surfaceDeep });
  slide.addText("Thank you for your partnership and trust.", {
    x: inX(PAD_X + 32), y: inX(948), w: inX(1200), h: inX(80),
    fontFace: FONT_HEAD, fontSize: pt(20), bold: true, color: "FFFFFF", valign: "middle",
  });
  addLogo(slide, { xPx: 1920 - PAD_X - 210, yPx: 948 + 12, wPx: 210 });
}

function buildAppendix(pptx, content) {
  const slide = newContentSlide(pptx, { title: "Evidence / Appendix" });
  // sources / supportingMetrics intentionally omitted (PO decisions 4, 5);
  // previousInterventions expands to full width to keep the slide balanced.
  addCard(slide, { x: PAD_X, y: 176, w: CONTENT_W, h: 840, accent: COLOR.teal });
  addParagraph(slide, "Previous Interventions / Evidence", { x: PAD_X + 26, y: 200, w: CONTENT_W - 52, h: 34, size: 19, bold: true, color: COLOR.slate });
  addBulletList(slide, content.previousInterventions, { x: PAD_X + 26, y: 244, w: CONTENT_W - 52, h: 750, size: 17 });
}

// --- Entry point ------------------------------------------------------------

// Returns a Node Buffer (pptxgenjs "nodebuffer" output) — the caller streams
// it back as application/vnd.openxmlformats-officedocument.presentationml.presentation.
export async function renderQbrPptx(content) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "QBR_WIDE", width: SLIDE_W_IN, height: 7.5 });
  pptx.layout = "QBR_WIDE";
  pptx.author = "Customer Success AI Hub";
  pptx.title = `${content.customerName} — Customer QBR`;

  buildCover(pptx, content);
  buildExecutiveSummary(pptx, content);
  buildObjectivesAndValue(pptx, content);
  buildHealthAdoption(pptx, content);
  buildPriorities(pptx, content);
  buildOpenCommitments(pptx, content);
  buildNextQuarterPlan(pptx, content);
  buildPartnershipOutlook(pptx, content);
  buildAppendix(pptx, content);

  return pptx.write({ outputType: "nodebuffer" });
}
