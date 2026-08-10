import { computeHealthScore, computeExpansionScore, daysSince, daysFromToday, computeTrend } from "./scoring.js";
import { fetchAccountInsight, askAboutAccount, fetchTeamPriority } from "./ai.js";

const RISK_LABEL = { high: "High", medium: "Medium", low: "Low" };
const fmtUSD = n => "$" + n.toLocaleString("en-US");
const fmtDate = iso => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });

let state = {
  accounts: [], csms: [], view: "portfolio",
  filters: { csm: "all", region: "all", risk: "all", expansion: "all", trend: "all" },
  sort: { key: "score", dir: "asc" }, expanded: null, // asc = lowest Health Score (most concerning) first
  matrixSelected: null, // accountId selected in the Matrix view (inline detail, no navigation)
  matrixMode: "value",  // "value" = Health x ARR, "renewal" = Health x days-to-renewal (bubble = ARR)
  aiInsights: {}, // accountId -> { status: 'idle'|'loading'|'done'|'error', data, error }
  aiAsk: {},      // accountId -> { question, status, answer, error }
  teamPriority: { status: "idle", data: null, error: null },
};

async function init() {
  const res = await fetch("data/accounts.json");
  const data = await res.json();
  state.csms = data.csms;
  state.accounts = data.accounts.map(acc => {
    const health = computeHealthScore(acc);
    const expansion = computeExpansionScore(acc);
    const trend = computeTrend(acc);
    return { ...acc, health, expansion, trend };
  });
  bindControls();
  render();
}

function bindControls() {
  document.getElementById("tab-portfolio").addEventListener("click", () => { state.view = "portfolio"; render(); });
  document.getElementById("tab-matrix").addEventListener("click", () => { state.view = "matrix"; render(); });
  document.getElementById("tab-team").addEventListener("click", () => { state.view = "team"; render(); });

  const csmSelect = document.getElementById("filter-csm");
  state.csms.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.csmId; opt.textContent = c.name;
    csmSelect.appendChild(opt);
  });
  csmSelect.addEventListener("change", e => { state.filters.csm = e.target.value; render(); });

  const regionSelect = document.getElementById("filter-region");
  regionSelect.addEventListener("change", e => { state.filters.region = e.target.value; render(); });

  const riskSelect = document.getElementById("filter-risk");
  riskSelect.addEventListener("change", e => { state.filters.risk = e.target.value; render(); });

  const expansionSelect = document.getElementById("filter-expansion");
  expansionSelect.addEventListener("change", e => { state.filters.expansion = e.target.value; render(); });

  const trendSelect = document.getElementById("filter-trend");
  trendSelect.addEventListener("change", e => { state.filters.trend = e.target.value; render(); });
}

function getFilteredAccounts() {
  return state.accounts.filter(a =>
    (state.filters.csm === "all" || a.csmId === state.filters.csm) &&
    (state.filters.region === "all" || a.region === state.filters.region) &&
    (state.filters.risk === "all" || a.health.riskCategory === state.filters.risk) &&
    (state.filters.expansion === "all" || a.expansion.category === state.filters.expansion) &&
    (state.filters.trend === "all" || a.trend === state.filters.trend)
  );
}

function getSorted(list) {
  const { key, dir } = state.sort;
  const sorted = [...list].sort((a, b) => {
    let va, vb;
    if (key === "score") { va = a.health.score; vb = b.health.score; }
    else if (key === "expansion") { va = a.expansion.score; vb = b.expansion.score; }
    else if (key === "renewal") { va = new Date(a.contract.nextRenewalDate); vb = new Date(b.contract.nextRenewalDate); }
    else if (key === "arr") { va = a.contract.arrUSD; vb = b.contract.arrUSD; }
    else { va = a.accountName; vb = b.accountName; }
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}

function csmName(csmId) {
  return state.csms.find(c => c.csmId === csmId)?.name ?? csmId;
}

function render() {
  document.getElementById("tab-portfolio").classList.toggle("active", state.view === "portfolio");
  document.getElementById("tab-matrix").classList.toggle("active", state.view === "matrix");
  document.getElementById("tab-team").classList.toggle("active", state.view === "team");
  document.getElementById("filters").style.display = state.view === "team" ? "none" : "flex";

  const root = document.getElementById("app");
  root.innerHTML = "";
  if (state.view === "portfolio") root.appendChild(renderPortfolio());
  else if (state.view === "matrix") root.appendChild(renderMatrix());
  else root.appendChild(renderTeam());
}

function renderSortHeader(label, key) {
  const th = document.createElement("th");
  th.className = "sortable";
  th.textContent = label + (state.sort.key === key ? (state.sort.dir === "asc" ? " ▲" : " ▼") : "");
  th.addEventListener("click", () => {
    if (state.sort.key === key) state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
    else { state.sort.key = key; state.sort.dir = "desc"; }
    render();
  });
  return th;
}

function renderPortfolio() {
  const wrap = document.createElement("div");
  const list = getSorted(getFilteredAccounts());

  const summary = document.createElement("div");
  summary.className = "summary-bar";
  const counts = { high: 0, medium: 0, low: 0 };
  list.forEach(a => counts[a.health.riskCategory]++);
  summary.innerHTML = `
    <div class="summary-chip risk-high">${counts.high} High</div>
    <div class="summary-chip risk-medium">${counts.medium} Medium</div>
    <div class="summary-chip risk-low">${counts.low} Low</div>
    <div class="summary-chip neutral">${list.length} accounts total</div>
  `;
  wrap.appendChild(summary);

  const legend = document.createElement("p");
  legend.className = "color-legend";
  legend.textContent = "Color legend: green/orange/red on Health Score = risk level (same signal, just colored). Green/orange/gray on Expansion = upsell opportunity (low is neutral, not a warning).";
  wrap.appendChild(legend);

  const table = document.createElement("table");
  table.className = "portfolio-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.appendChild(renderSortHeader("Account", "name"));
  const staticHeaders = ["Region", "CSM", ];
  staticHeaders.forEach(h => { const th = document.createElement("th"); th.textContent = h; headRow.appendChild(th); });
  headRow.appendChild(renderSortHeader("ARR", "arr"));
  headRow.appendChild(renderSortHeader("Renewal", "renewal"));
  headRow.appendChild(renderSortHeader("Health Score", "score"));
  const th2 = document.createElement("th"); th2.textContent = "Risk"; headRow.appendChild(th2);
  headRow.appendChild(renderSortHeader("Expansion", "expansion"));
  ["Last Interaction", "Next QBR"].forEach(h => { const th = document.createElement("th"); th.textContent = h; headRow.appendChild(th); });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  list.forEach(acc => {
    const row = document.createElement("tr");
    row.className = `risk-row-${acc.health.riskCategory}`;
    row.innerHTML = `
      <td class="account-cell">${escapeHtml(acc.accountName)}<div class="sub">${escapeHtml(acc.industry)}</div></td>
      <td>${acc.region}<div class="sub">${escapeHtml(acc.subregion)}</div></td>
      <td>${escapeHtml(csmName(acc.csmId))}</td>
      <td>${fmtUSD(acc.contract.arrUSD)}</td>
      <td>${fmtDate(acc.contract.nextRenewalDate)}</td>
      <td><span class="score-num risk-text-${acc.health.riskCategory}">${acc.health.score}</span></td>
      <td><span class="status-pill risk-${acc.health.riskCategory}">${RISK_LABEL[acc.health.riskCategory]}</span></td>
      <td><span class="score-num exp-text-${acc.expansion.category}">${acc.expansion.score}</span></td>
      <td>${acc.relationship.lastInteractionDaysAgo}d</td>
      <td>${fmtDate(acc.relationship.nextQBRDate)}</td>
    `;
    row.addEventListener("click", () => {
      state.expanded = state.expanded === acc.accountId ? null : acc.accountId;
      render();
      if (state.expanded) document.getElementById(`detail-${acc.accountId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    tbody.appendChild(row);

    if (state.expanded === acc.accountId) {
      const detailRow = document.createElement("tr");
      detailRow.id = `detail-${acc.accountId}`;
      detailRow.className = "detail-row";
      const td = document.createElement("td");
      td.colSpan = 10;
      td.appendChild(renderAccountDetail(acc));
      detailRow.appendChild(td);
      tbody.appendChild(detailRow);
    }
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function renderAccountDetail(acc) {
  const div = document.createElement("div");
  div.className = "account-detail";

  const criteriaRows = acc.health.criteria.map(c => `
    <tr>
      <td>${escapeHtml(c.label)}</td>
      <td class="sub">${escapeHtml(String(c.rawValue))}</td>
      <td>${Math.round(c.weight * 100)}%</td>
      <td>${c.points.toFixed(1)} pts</td>
      <td style="width:120px;"><div class="bar-wrap"><div class="bar-fill" style="width:${c.riskPct}%;"></div></div></td>
    </tr>
  `).join("");

  const modules = acc.licensedModules.map(m => `<li>${escapeHtml(m.name)} — ${m.tier} (${m.licensedUsers} users)</li>`).join("");
  const whitespace = acc.expansion.whitespaceModules.length
    ? `<p class="sub">Unused modules (expansion whitespace): ${acc.expansion.whitespaceModules.join(", ")}</p>`
    : `<p class="sub">All modules licensed.</p>`;

  const artifacts = acc.freeTextArtifacts.map(a => `
    <div class="artifact">
      <span class="artifact-type">${a.type}</span> · <span class="sub">${fmtDate(a.date)}</span>
      <p>"${escapeHtml(a.text)}"</p>
    </div>
  `).join("");

  div.innerHTML = `
    <div class="detail-grid">
      <div>
        <h4>Score Breakdown</h4>
        <p class="sub">Risk points per criterion — the total is subtracted from the Health Score (100). Health Score ${acc.health.score} = 100 − ${Math.round(acc.health.criteria.reduce((s, c) => s + c.points, 0))} risk points.</p>
        <table class="breakdown-table"><tbody>${criteriaRows}</tbody></table>
      </div>
      <div>
        <h4>Contract & Licensing</h4>
        <p>${acc.contract.type === "multi-year" ? `Multi-year contract (${acc.contract.termYears} years)` : "Single-year contract"}, since ${fmtDate(acc.contract.startDate)}</p>
        <ul>${modules}</ul>
        ${whitespace}
        <h4>Relationship</h4>
        <p>Champion: ${escapeHtml(acc.relationship.championName)} (${acc.relationship.championStatus})<br/>
        Exec sponsor: ${acc.relationship.execSponsorEngaged ? "engaged" : "not engaged"}<br/>
        Last QBR: ${fmtDate(acc.relationship.lastQBRDate)}</p>
        <h4>Notes (Support/Communication)</h4>
        ${artifacts}
      </div>
    </div>
    <div class="ai-section" id="ai-section-${acc.accountId}"></div>
  `;

  renderAiSection(div.querySelector(`#ai-section-${acc.accountId}`), acc);
  return div;
}

function renderAiSection(container, acc) {
  const insight = state.aiInsights[acc.accountId] || { status: "idle" };
  const ask = state.aiAsk[acc.accountId] || { status: "idle", question: "" };

  container.innerHTML = `
    <h4>AI Insights <span class="ai-disclaimer">— AI-generated, may be inaccurate, verify before acting</span></h4>
    <div class="ai-insight-body"></div>
    <div class="ai-ask">
      <input type="text" class="ai-ask-input" placeholder="Ask a question about this account…" value="${escapeHtml(ask.question || "")}" />
      <button class="ai-ask-btn">Ask</button>
    </div>
    <div class="ai-ask-answer"></div>
  `;

  const body = container.querySelector(".ai-insight-body");
  if (insight.status === "idle") {
    const btn = document.createElement("button");
    btn.className = "ai-load-btn";
    btn.textContent = "Load AI Insights";
    btn.addEventListener("click", () => loadInsight(acc.accountId));
    body.appendChild(btn);
  } else if (insight.status === "loading") {
    body.innerHTML = `<p class="sub">Loading…</p>`;
  } else if (insight.status === "error") {
    body.innerHTML = `<p class="ai-unavailable">AI insights unavailable (${escapeHtml(insight.error)}). Calculated score remains valid.</p>`;
  } else if (insight.status === "done") {
    const d = insight.data;
    const recs = (d.recommendations || []).map(r => `<li>${escapeHtml(r)}</li>`).join("");
    body.innerHTML = `
      <p><strong>Sentiment:</strong> ${escapeHtml(d.sentiment?.label ?? "-")} — <span class="sub">${escapeHtml(d.sentiment?.rationale ?? "")}</span></p>
      <p>${escapeHtml(d.narrative ?? "")}</p>
      <ul>${recs}</ul>
    `;
  }

  const askInput = container.querySelector(".ai-ask-input");
  const askBtn = container.querySelector(".ai-ask-btn");
  askBtn.addEventListener("click", () => submitAsk(acc.accountId, askInput.value));
  askInput.addEventListener("keydown", e => { if (e.key === "Enter") submitAsk(acc.accountId, askInput.value); });

  const answerBox = container.querySelector(".ai-ask-answer");
  if (ask.status === "loading") answerBox.innerHTML = `<p class="sub">Loading…</p>`;
  else if (ask.status === "error") answerBox.innerHTML = `<p class="ai-unavailable">Answer unavailable (${escapeHtml(ask.error)}).</p>`;
  else if (ask.status === "done") answerBox.innerHTML = `<p class="ai-answer">${escapeHtml(ask.answer)}</p>`;
}

async function loadInsight(accountId) {
  state.aiInsights[accountId] = { status: "loading" };
  render();
  try {
    const data = await fetchAccountInsight(accountId);
    state.aiInsights[accountId] = { status: "done", data };
  } catch (e) {
    state.aiInsights[accountId] = { status: "error", error: e.message };
  }
  render();
}

async function submitAsk(accountId, questionText) {
  if (!questionText || !questionText.trim()) return;
  state.aiAsk[accountId] = { status: "loading", question: questionText };
  render();
  try {
    const data = await askAboutAccount(accountId, questionText);
    state.aiAsk[accountId] = { status: "done", question: questionText, answer: data.answer };
  } catch (e) {
    state.aiAsk[accountId] = { status: "error", question: questionText, error: e.message };
  }
  render();
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const TREND_GLYPH = { up: "▲", down: "▼", flat: "" };

function renderMatrix() {
  const wrap = document.createElement("div");
  const list = getFilteredAccounts();

  if (list.length === 0) {
    wrap.innerHTML = `<p class="sub">No accounts match the current filters.</p>`;
    return wrap;
  }

  const mode = state.matrixMode;
  const W = 820, H = 520;
  const marginLeft = 70, marginRight = 24, marginTop = 20, marginBottom = 50;
  const plotW = W - marginLeft - marginRight;
  const plotH = H - marginTop - marginBottom;
  const healthMid = 50;

  const arrValues = list.map(a => a.contract.arrUSD);
  const minArr = Math.min(...arrValues);
  const maxArr = Math.max(...arrValues);

  // yPlot is the value actually placed on the Y axis (higher = nearer the top).
  // Value mode: yPlot = ARR (bigger deal = higher up).
  // Renewal mode: yPlot = -daysToRenewal (sooner renewal = higher up = more urgent).
  const yPlotOf = a => mode === "renewal" ? -daysFromToday(a.contract.nextRenewalDate) : a.contract.arrUSD;
  const yPlotValues = list.map(yPlotOf);
  const minY = Math.min(...yPlotValues);
  const maxY = Math.max(...yPlotValues);
  const yPlotMedian = median(yPlotValues);

  const xScale = health => marginLeft + (health / 100) * plotW;
  const yScale = yPlot => {
    if (maxY === minY) return marginTop + plotH / 2;
    return marginTop + (1 - (yPlot - minY) / (maxY - minY)) * plotH;
  };
  const radiusOf = a => {
    if (mode !== "renewal") return 7;
    if (maxArr === minArr) return 9;
    return 5 + ((a.contract.arrUSD - minArr) / (maxArr - minArr)) * 11;
  };

  const quadrantX = xScale(healthMid);
  const quadrantY = yScale(yPlotMedian);

  const dots = list.map(a => {
    const cx = xScale(a.health.score);
    const cy = yScale(yPlotOf(a));
    const r = radiusOf(a);
    const glyph = TREND_GLYPH[a.trend];
    const glyphSpan = glyph ? `<text x="${(cx + r + 2).toFixed(1)}" y="${(cy + 4).toFixed(1)}" class="trend-glyph trend-${a.trend}">${glyph}</text>` : "";
    const yDesc = mode === "renewal" ? `renewal in ${daysFromToday(a.contract.nextRenewalDate)}d, ARR ${fmtUSD(a.contract.arrUSD)}` : `ARR ${fmtUSD(a.contract.arrUSD)}`;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" class="matrix-dot risk-dot-${a.health.riskCategory}" data-account-id="${a.accountId}">
      <title>${escapeHtml(a.accountName)} — Health ${a.health.score}, ${yDesc}, trend ${a.trend}</title>
    </circle>${glyphSpan}`;
  }).join("");

  // Quadrant label blocks: title + one-line description, with a background
  // chip so they stay legible over dots. Positioned inset from the corners.
  const quadrantLabels = mode === "renewal" ? [
    { x: marginLeft + 12, y: marginTop + 12, anchor: "start", cls: "ql-save", title: "Save — Urgent!", desc: "At risk, renewing soon. Call today." },
    { x: marginLeft + plotW - 12, y: marginTop + 12, anchor: "end", cls: "ql-protect", title: "Confirm & Expand", desc: "Healthy, renewal coming up. Upsell moment." },
    { x: marginLeft + 12, y: marginTop + plotH - 34, anchor: "start", cls: "ql-monitor", title: "Fix Quietly", desc: "At risk, renewal is distant. Fix before urgent." },
    { x: marginLeft + plotW - 12, y: marginTop + plotH - 34, anchor: "end", cls: "ql-nurture", title: "Steady — Low Touch", desc: "Healthy, renewal is distant. No rush." },
  ] : [
    { x: marginLeft + 12, y: marginTop + 12, anchor: "start", cls: "ql-save", title: "Save — Priority", desc: "High value, at risk. Act now." },
    { x: marginLeft + plotW - 12, y: marginTop + 12, anchor: "end", cls: "ql-protect", title: "Protect & Expand", desc: "High value, healthy. Nurture & upsell." },
    { x: marginLeft + 12, y: marginTop + plotH - 34, anchor: "start", cls: "ql-monitor", title: "Monitor", desc: "Lower value, at risk. Watch, don't panic." },
    { x: marginLeft + plotW - 12, y: marginTop + plotH - 34, anchor: "end", cls: "ql-nurture", title: "Nurture / Grow", desc: "Lower value, healthy. Growth candidate." },
  ];
  const labelBlocks = quadrantLabels.map(l => `
    <text x="${l.x}" y="${l.y}" class="quadrant-label ${l.cls}" text-anchor="${l.anchor}">${escapeHtml(l.title)}</text>
    <text x="${l.x}" y="${l.y + 16}" class="quadrant-desc ${l.cls}" text-anchor="${l.anchor}">${escapeHtml(l.desc)}</text>
  `).join("");

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" class="matrix-svg">
      <!-- quadrant backgrounds -->
      <rect x="${marginLeft}" y="${marginTop}" width="${quadrantX - marginLeft}" height="${quadrantY - marginTop}" class="quadrant-bg quadrant-save" />
      <rect x="${quadrantX}" y="${marginTop}" width="${marginLeft + plotW - quadrantX}" height="${quadrantY - marginTop}" class="quadrant-bg quadrant-protect" />
      <rect x="${marginLeft}" y="${quadrantY}" width="${quadrantX - marginLeft}" height="${marginTop + plotH - quadrantY}" class="quadrant-bg quadrant-monitor" />
      <rect x="${quadrantX}" y="${quadrantY}" width="${marginLeft + plotW - quadrantX}" height="${marginTop + plotH - quadrantY}" class="quadrant-bg quadrant-nurture" />

      <!-- quadrant divider lines -->
      <line x1="${quadrantX}" y1="${marginTop}" x2="${quadrantX}" y2="${marginTop + plotH}" class="quadrant-divider" />
      <line x1="${marginLeft}" y1="${quadrantY}" x2="${marginLeft + plotW}" y2="${quadrantY}" class="quadrant-divider" />

      <!-- axes -->
      <line x1="${marginLeft}" y1="${marginTop + plotH}" x2="${marginLeft + plotW}" y2="${marginTop + plotH}" class="axis-line" />
      <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${marginTop + plotH}" class="axis-line" />

      <!-- quadrant labels (title + description) -->
      ${labelBlocks}

      <!-- axis titles -->
      <text x="${marginLeft + plotW / 2}" y="${H - 12}" class="axis-title" text-anchor="middle">Health Score →</text>
      <text x="16" y="${marginTop + plotH / 2}" class="axis-title" text-anchor="middle" transform="rotate(-90, 16, ${marginTop + plotH / 2})">${mode === "renewal" ? "Renewal urgency →" : "ARR →"}</text>
      ${mode === "renewal" ? `<text x="${marginLeft + plotW / 2}" y="${marginTop - 4}" class="axis-title" text-anchor="middle">(bubble size = ARR)</text>` : ""}

      ${dots}
    </svg>
  `;

  const selected = state.matrixSelected ? list.find(a => a.accountId === state.matrixSelected) : null;
  const TREND_TEXT = { up: "Improving ▲", down: "Declining ▼", flat: "Stable" };
  const detailPanel = selected ? `
    <div class="matrix-detail">
      <button class="matrix-detail-close" aria-label="Close">&times;</button>
      <h4>${escapeHtml(selected.accountName)} <span class="status-pill risk-${selected.health.riskCategory}">${RISK_LABEL[selected.health.riskCategory]}</span></h4>
      <p class="sub">${escapeHtml(selected.industry)} · ${escapeHtml(selected.subregion)} · ${escapeHtml(csmName(selected.csmId))} · CSAT trend: <span class="trend-${selected.trend}">${TREND_TEXT[selected.trend]}</span></p>
      <div class="matrix-detail-stats">
        <div><span class="stat-num risk-text-${selected.health.riskCategory}">${selected.health.score}</span><span class="stat-label">Health Score</span></div>
        <div><span class="stat-num">${fmtUSD(selected.contract.arrUSD)}</span><span class="stat-label">ARR</span></div>
        <div><span class="stat-num exp-text-${selected.expansion.category}">${selected.expansion.score}</span><span class="stat-label">Expansion</span></div>
        <div><span class="stat-num">${daysFromToday(selected.contract.nextRenewalDate)}d</span><span class="stat-label">To Renewal</span></div>
      </div>
      <p class="sub">Top driver: ${escapeHtml(selected.health.criteria[0].label)} (${escapeHtml(String(selected.health.criteria[0].rawValue))})</p>
      <button class="ai-load-btn matrix-detail-link">View full details in Portfolio →</button>
    </div>
  ` : "";

  const modeDesc = mode === "renewal"
    ? `X: Health Score, Y: renewal urgency (sooner = higher), bubble size: ARR. Quadrant lines split at Health ${healthMid} and the median renewal date of the filtered accounts.`
    : `X: Health Score, Y: ARR. Quadrant lines split at Health ${healthMid} and median ARR (${fmtUSD(Math.round(mode === "renewal" ? 0 : yPlotMedian))}) of the filtered accounts.`;

  wrap.innerHTML = `
    <div class="matrix-toggle">
      <button class="matrix-toggle-btn ${mode === "value" ? "active" : ""}" data-mode="value">Value (Health × ARR)</button>
      <button class="matrix-toggle-btn ${mode === "renewal" ? "active" : ""}" data-mode="renewal">Renewal Radar (Health × Time-to-Renewal)</button>
    </div>
    <p class="sub">Each dot is an account. ${modeDesc} ▲/▼ next to a dot = CSAT trend over the last 8 weeks. Click a dot for details.</p>
    <div class="matrix-wrap">${svg}</div>
    ${detailPanel}
    <div class="summary-bar" style="margin-top:14px;">
      <div class="summary-chip risk-high">● High risk</div>
      <div class="summary-chip risk-medium">● Medium risk</div>
      <div class="summary-chip risk-low">● Low risk</div>
      <div class="summary-chip neutral">▲ improving / ▼ declining CSAT</div>
    </div>
  `;

  wrap.querySelectorAll(".matrix-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.matrixMode = btn.dataset.mode;
      state.matrixSelected = null;
      render();
    });
  });

  wrap.querySelectorAll(".matrix-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      state.matrixSelected = dot.dataset.accountId;
      render();
    });
  });

  wrap.querySelector(".matrix-detail-close")?.addEventListener("click", () => {
    state.matrixSelected = null;
    render();
  });

  wrap.querySelector(".matrix-detail-link")?.addEventListener("click", () => {
    const id = state.matrixSelected;
    state.view = "portfolio";
    state.expanded = id;
    state.matrixSelected = null;
    render();
    document.getElementById(`detail-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  return wrap;
}

function renderTeam() {
  const wrap = document.createElement("div");

  const priorityBox = document.createElement("div");
  priorityBox.className = "team-priority-box";
  priorityBox.innerHTML = `<h4>AI Weekly Priorities <span class="ai-disclaimer">— AI-generated, may be inaccurate, verify before acting</span></h4><div class="team-priority-body"></div>`;
  const body = priorityBox.querySelector(".team-priority-body");

  if (state.teamPriority.status === "idle") {
    const btn = document.createElement("button");
    btn.className = "ai-load-btn";
    btn.textContent = "Load AI Prioritization for the Whole Team";
    btn.addEventListener("click", loadTeamPriority);
    body.appendChild(btn);
  } else if (state.teamPriority.status === "loading") {
    body.innerHTML = `<p class="sub">Loading…</p>`;
  } else if (state.teamPriority.status === "error") {
    body.innerHTML = `<p class="ai-unavailable">Unavailable (${escapeHtml(state.teamPriority.error)}).</p>`;
  } else if (state.teamPriority.status === "done") {
    const items = (state.teamPriority.data.priorities || []).map(p => `
      <li><strong>${escapeHtml(p.accountName)}</strong> — <span class="sub">${escapeHtml(p.reason)}</span></li>
    `).join("");
    body.innerHTML = `<ol class="priority-list">${items}</ol>`;
  }
  wrap.appendChild(priorityBox);

  const grid = document.createElement("div");
  grid.className = "team-view";
  wrap.appendChild(grid);

  state.csms.forEach(csm => {
    const accs = state.accounts.filter(a => a.csmId === csm.csmId);
    const counts = { high: 0, medium: 0, low: 0 };
    accs.forEach(a => counts[a.health.riskCategory]++);
    const arrAtRisk = accs.filter(a => a.health.riskCategory === "high").reduce((s, a) => s + a.contract.arrUSD, 0);
    const upcomingRenewals = accs.filter(a => daysFromToday(a.contract.nextRenewalDate) <= 90 && daysFromToday(a.contract.nextRenewalDate) >= 0).length;
    const overdueQBRs = accs.filter(a => daysSince(a.relationship.lastQBRDate) > 100 && daysFromToday(a.relationship.nextQBRDate) > 20).length;

    const card = document.createElement("div");
    card.className = "csm-card";
    card.innerHTML = `
      <h3>${escapeHtml(csm.name)}</h3>
      <p class="sub">${escapeHtml(csm.regionCoverage)} · ${accs.length} Accounts</p>
      <div class="summary-bar">
        <div class="summary-chip risk-high">${counts.high} High</div>
        <div class="summary-chip risk-medium">${counts.medium} Medium</div>
        <div class="summary-chip risk-low">${counts.low} Low</div>
      </div>
      <div class="csm-stats">
        <div><span class="stat-num">${fmtUSD(arrAtRisk)}</span><span class="stat-label">ARR in high-risk accounts</span></div>
        <div><span class="stat-num">${upcomingRenewals}</span><span class="stat-label">Renewals within 90 days</span></div>
        <div><span class="stat-num">${overdueQBRs}</span><span class="stat-label">QBR overdue</span></div>
      </div>
    `;
    grid.appendChild(card);
  });
  return wrap;
}

async function loadTeamPriority() {
  state.teamPriority = { status: "loading" };
  render();
  try {
    const data = await fetchTeamPriority();
    state.teamPriority = { status: "done", data };
  } catch (e) {
    state.teamPriority = { status: "error", error: e.message };
  }
  render();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();
