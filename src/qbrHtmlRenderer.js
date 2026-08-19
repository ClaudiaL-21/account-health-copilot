// HTML QBR spike — renders the 3-page web presentation from the content
// produced by src/qbrHtmlContentMap.js. Pure function returning a
// self-contained HTML document string (own <style>, no external assets),
// so it can be opened directly in a new tab via a Blob URL. Reuses the
// approved CUSTOMER SUCCESS AI | HUB LIGHT design tokens (see src/styles.css)
// rather than re-deriving a new palette.
//
// No new LLM call happens here or anywhere in this module — every string is
// either a deterministic account fact or reviewed presentationText/
// presentationItems/safeText already produced upstream.

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SENTIMENT_LABEL = { frustrated: "Frustrated", neutral: "Neutral", patient: "Patient" };
// Deliberately muted, not alarming — no red/neon. Frustrated reads as an
// amber signal (attention-worthy, not a crisis), patient/neutral as calm.
const SENTIMENT_CLASS = { frustrated: "sentiment-amber", neutral: "sentiment-slate", patient: "sentiment-teal" };

function kpiTile(value, unit, label) {
  return `
    <div class="kpi-tile">
      <div class="kpi-value">${escapeHtml(value)}${unit ? `<span class="kpi-unit">${escapeHtml(unit)}</span>` : ""}</div>
      <div class="kpi-label">${escapeHtml(label)}</div>
    </div>`;
}

function renderPage1(p1) {
  const hasInterpretation = Boolean(p1.adoptionInterpretationText);
  const hasFeatureRequest = Boolean(p1.topFeatureRequestText);
  const sentimentKey = p1.featureRequestSentiment;
  const sentimentBadge = sentimentKey && SENTIMENT_LABEL[sentimentKey]
    ? `<span class="sentiment-badge ${SENTIMENT_CLASS[sentimentKey]}">${escapeHtml(SENTIMENT_LABEL[sentimentKey])}</span>`
    : "";
  const evidenceBits = [
    typeof p1.featureRequestsCount === "number" ? `${p1.featureRequestsCount} request${p1.featureRequestsCount === 1 ? "" : "s"}` : null,
    p1.featureRequestSinceText,
  ].filter(Boolean).join(" · ");

  return `
    <section class="page page-adoption${hasFeatureRequest ? "" : " no-feature-card"}">
      <header class="page-head">
        <p class="eyebrow">Adoption &amp; Product Feedback</p>
      </header>
      <div class="page-body two-col">
        <div class="col col-adoption">
          <div class="kpi-row">
            ${p1.adoptionRatePct != null ? kpiTile(p1.adoptionRatePct, "%", "Adoption Rate") : ""}
            ${p1.activeUsers != null ? kpiTile(p1.activeUsers, "", "Active Users") : ""}
          </div>
          ${hasInterpretation ? `<p class="interpretation">${escapeHtml(p1.adoptionInterpretationText)}</p>` : ""}
        </div>
        ${hasFeatureRequest ? `
        <div class="col col-feature">
          <div class="feature-card">
            <p class="feature-card-eyebrow">Product Feedback</p>
            <p class="feature-quote">&ldquo;${escapeHtml(p1.topFeatureRequestText)}&rdquo;</p>
            <div class="feature-meta">
              ${sentimentBadge}
              ${evidenceBits ? `<span class="feature-evidence">${escapeHtml(evidenceBits)}</span>` : ""}
            </div>
          </div>
        </div>` : ""}
      </div>
    </section>`;
}

function commitmentDensityClass(n) {
  if (n <= 1) return "density-1";
  if (n <= 3) return "density-2-3";
  return "density-4-5";
}

function renderPage2(p2) {
  const items = p2.commitmentItems || [];
  const cols = items.length <= 1 ? 1 : items.length <= 3 ? items.length : 2;
  const body = items.length
    ? `<div class="commitments-grid ${commitmentDensityClass(items.length)}" style="--cols:${cols}">
        ${items.map((text, i) => `
          <div class="commitment-card">
            <span class="commitment-index">${i + 1}</span>
            <p class="commitment-text">${escapeHtml(text)}</p>
          </div>`).join("")}
      </div>`
    : `<p class="empty-state">No open commitments in the reviewed content.</p>`;

  return `
    <section class="page page-commitments">
      <header class="page-head">
        <p class="eyebrow">Open Commitments &amp; Actions</p>
      </header>
      <div class="page-body">${body}</div>
    </section>`;
}

function csatDots(current) {
  if (current == null) return "";
  const dots = [1, 2, 3, 4, 5].map(n => `<span class="csat-dot${n <= Math.round(current) ? " filled" : ""}"></span>`).join("");
  return `<div class="csat-dots">${dots}</div>`;
}

function renderPage3(p3) {
  const hasObjective = Boolean(p3.businessObjectivesText);
  const hasValue = Boolean(p3.valueDeliveredFullText);
  const hasCsat = p3.csatCurrent != null;
  const deltaText = p3.csatDelta != null
    ? `<span class="csat-delta ${p3.csatDelta >= 0 ? "csat-delta-up" : "csat-delta-down"}">${p3.csatDelta >= 0 ? "+" : ""}${p3.csatDelta.toFixed(1)}</span>`
    : "";

  return `
    <section class="page page-objectives">
      <header class="page-head">
        <p class="eyebrow">Business Objectives &amp; Value</p>
      </header>
      <div class="page-body three-col">
        ${hasObjective ? `
        <div class="col col-objective">
          <div class="objective-card">
            <p class="block-eyebrow">Business Objective</p>
            <p class="objective-text">${escapeHtml(p3.businessObjectivesText)}</p>
          </div>
        </div>` : ""}
        ${hasValue ? `
        <div class="col col-value">
          <div class="value-card">
            <p class="block-eyebrow">Value Delivered</p>
            <p class="value-text">${escapeHtml(p3.valueDeliveredFullText)}</p>
          </div>
        </div>` : ""}
        ${hasCsat ? `
        <div class="col col-csat">
          <div class="csat-card">
            <p class="block-eyebrow">Current CSAT</p>
            <div class="csat-value">${p3.csatCurrent.toFixed(1)}<span class="csat-scale">/5</span> ${deltaText}</div>
            ${csatDots(p3.csatCurrent)}
          </div>
        </div>` : ""}
      </div>
    </section>`;
}

const STYLE = `
  :root {
    --navy: #25333a; --teal: #007f83; --teal-bg: #e5f3f3; --mint: #a9e5d3;
    --clarity-blue: #226fbd; --insight-violet: #7462a6; --canvas: #f7faf9;
    --canvas-alt: #eef3f1; --text: #1f2937; --muted: #6b7280; --border: #e5e7eb;
    --amber: #b6790a; --amber-bg: #fbf3e2;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--navy); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  .deck-viewport { height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .deck-stage { position: relative; width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16)); background: var(--canvas); box-shadow: 0 20px 60px rgba(0,0,0,0.35); overflow: hidden; }
  .page { position: absolute; inset: 0; display: none; flex-direction: column; padding: 5.5% 6%; }
  .page.active { display: flex; }
  .page-head { flex: 0 0 auto; margin-bottom: 2.2%; border-bottom: 2px solid var(--teal); padding-bottom: 1.4%; }
  .eyebrow { margin: 0; font-size: clamp(11px, 1.5vw, 15px); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--teal); }
  .page-body { flex: 1 1 auto; display: flex; min-height: 0; }
  .page-body.two-col { gap: 4%; }
  .page-body.three-col { gap: 3.5%; }
  .col { display: flex; flex-direction: column; min-width: 0; }
  .col-adoption { flex: 1 1 55%; justify-content: flex-start; gap: 3.5%; }
  .col-feature { flex: 1 1 45%; justify-content: center; }
  .kpi-row { display: flex; gap: 4%; }
  .kpi-tile { flex: 1; background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 6% 5%; box-shadow: 0 6px 18px rgba(15,23,42,0.07); }
  .kpi-value { font-size: clamp(30px, 5.2vw, 58px); font-weight: 800; color: var(--navy); line-height: 1; }
  .kpi-unit { font-size: 0.5em; font-weight: 700; color: var(--teal); margin-left: 2px; }
  .kpi-label { margin-top: 10px; font-size: clamp(11px, 1.3vw, 14px); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .interpretation { font-size: clamp(13px, 1.6vw, 17px); line-height: 1.6; color: var(--text); margin: 0; }
  .feature-card { background: linear-gradient(165deg, var(--teal-bg) 0%, #fff 65%); border: 1px solid var(--teal); border-radius: 16px; padding: 7%; box-shadow: 0 8px 24px rgba(0,127,131,0.12); }
  .feature-card-eyebrow { margin: 0 0 3%; font-size: clamp(10px, 1.2vw, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--teal); }
  .feature-quote { margin: 0 0 5%; font-size: clamp(15px, 2.1vw, 22px); font-weight: 600; line-height: 1.4; color: var(--navy); }
  .feature-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .sentiment-badge { font-size: clamp(10px, 1.1vw, 12px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; padding: 5px 12px; border-radius: 999px; }
  .sentiment-amber { background: var(--amber-bg); color: var(--amber); }
  .sentiment-slate { background: var(--canvas-alt); color: var(--navy); }
  .sentiment-teal { background: var(--teal-bg); color: var(--teal); }
  .feature-evidence { font-size: clamp(11px, 1.2vw, 13px); color: var(--muted); }
  .no-feature-card .col-adoption { flex: 1 1 100%; }

  .commitments-grid { display: grid; gap: 4%; width: 100%; align-content: center; }
  .density-1 { grid-template-columns: 1fr; }
  .density-1 .commitment-card { padding: 6%; }
  .density-1 .commitment-text { font-size: clamp(18px, 2.6vw, 28px); }
  .density-2-3 { grid-template-columns: repeat(var(--cols, 2), 1fr); align-items: stretch; }
  .density-4-5 { grid-template-columns: repeat(2, 1fr); }
  .commitment-card { background: #fff; border: 1px solid var(--border); border-left: 4px solid var(--teal); border-radius: 12px; padding: 5% 6%; box-shadow: 0 4px 14px rgba(15,23,42,0.06); display: flex; flex-direction: column; gap: 10px; }
  .commitment-index { font-size: clamp(11px, 1.2vw, 13px); font-weight: 800; color: var(--teal); }
  .commitment-text { margin: 0; font-size: clamp(13px, 1.6vw, 18px); line-height: 1.5; color: var(--text); font-weight: 500; }
  .empty-state { margin: auto; color: var(--muted); font-size: 16px; }

  .col-objective { flex: 1 1 40%; justify-content: center; }
  .col-value { flex: 1 1 35%; justify-content: center; }
  .col-csat { flex: 1 1 25%; justify-content: center; }
  .objective-card, .value-card, .csat-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 9% 8%; box-shadow: 0 6px 18px rgba(15,23,42,0.06); width: 100%; }
  .objective-card { border-top: 4px solid var(--insight-violet); }
  .value-card { border-top: 4px solid var(--mint); }
  .csat-card { border-top: 4px solid var(--clarity-blue); }
  .block-eyebrow { margin: 0 0 5%; font-size: clamp(10px, 1.2vw, 13px); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--insight-violet); }
  .objective-text { margin: 0; font-size: clamp(16px, 2.3vw, 24px); font-weight: 700; line-height: 1.45; color: var(--navy); }
  .value-text { margin: 0; font-size: clamp(13px, 1.6vw, 17px); line-height: 1.6; color: var(--text); }
  .col-csat .block-eyebrow { color: var(--clarity-blue); }
  .csat-value { font-size: clamp(28px, 4.2vw, 46px); font-weight: 800; color: var(--navy); display: flex; align-items: baseline; gap: 8px; }
  .csat-scale { font-size: 0.4em; font-weight: 700; color: var(--muted); }
  .csat-delta { font-size: clamp(13px, 1.6vw, 17px); font-weight: 700; }
  .csat-delta-up { color: var(--teal); }
  .csat-delta-down { color: var(--amber); }
  .csat-dots { display: flex; gap: 6px; margin-top: 10px; }
  .csat-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--canvas-alt); border: 1px solid var(--border); }
  .csat-dot.filled { background: var(--clarity-blue); border-color: var(--clarity-blue); }

  .deck-nav { position: absolute; left: 0; right: 0; bottom: 3%; display: flex; align-items: center; justify-content: center; gap: 16px; z-index: 5; }
  .deck-nav button { font: inherit; font-weight: 700; font-size: 13px; letter-spacing: 0.02em; color: var(--navy); background: rgba(255,255,255,0.85); border: 1px solid var(--border); border-radius: 999px; padding: 8px 18px; cursor: pointer; }
  .deck-nav button:hover { background: #fff; border-color: var(--teal); color: var(--teal); }
  .deck-nav button:disabled { opacity: 0.35; cursor: default; }
  .deck-nav .deck-page-count { font-size: 12px; color: var(--muted); font-weight: 600; }
  .deck-brand { position: absolute; top: 5.5%; right: 6%; font-size: clamp(10px, 1.1vw, 13px); font-weight: 700; color: var(--muted); letter-spacing: 0.03em; z-index: 4; }
`;

const SCRIPT = `
  (function () {
    var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
    var idx = 0;
    var counter = document.getElementById("deck-page-count");
    var prevBtn = document.getElementById("deck-prev");
    var nextBtn = document.getElementById("deck-next");
    function render() {
      pages.forEach(function (p, i) { p.classList.toggle("active", i === idx); });
      counter.textContent = (idx + 1) + " / " + pages.length;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === pages.length - 1;
    }
    prevBtn.addEventListener("click", function () { if (idx > 0) { idx--; render(); } });
    nextBtn.addEventListener("click", function () { if (idx < pages.length - 1) { idx++; render(); } });
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { if (idx < pages.length - 1) { idx++; render(); } }
      if (e.key === "ArrowLeft") { if (idx > 0) { idx--; render(); } }
    });
    render();
  })();
`;

export function renderQbrHtml({ account, content }) {
  const pagesHtml = [renderPage1(content.page1), renderPage2(content.page2), renderPage3(content.page3)].join("\n");
  const title = `${account?.accountName || "Customer"} — Web QBR`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
  <div class="deck-viewport">
    <div class="deck-stage">
      <div class="deck-brand">${escapeHtml(account?.accountName || "")}</div>
      ${pagesHtml}
      <nav class="deck-nav">
        <button id="deck-prev" type="button">← Prev</button>
        <span id="deck-page-count" class="deck-page-count"></span>
        <button id="deck-next" type="button">Next →</button>
      </nav>
    </div>
  </div>
  <script>${SCRIPT}</script>
</body>
</html>`;
}
