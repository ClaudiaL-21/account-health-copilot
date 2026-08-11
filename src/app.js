import { computeHealthScore, computeExpansionScore, daysSince, daysFromToday, computeTrend } from "./scoring.js";
import { fetchAccountInsight, askAboutAccount, fetchTeamPriority, approveAction } from "./ai.js";

const RISK_LABEL = { high: "High", medium: "Medium", low: "Low" };
const fmtUSD = n => "$" + n.toLocaleString("en-US");
const fmtDate = iso => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
const adoptionCategory = pct => pct >= 70 ? "good" : pct >= 40 ? "warn" : "poor";
const CHAMPION_LABEL = { active: "active", unknown: "unclear", recently_departed: "recently departed" };

let state = {
  accounts: [], csms: [], view: "portfolio",
  filters: { csm: "all", region: "all", risk: "all", expansion: "all", trend: "all" },
  sort: { key: "score", dir: "asc" }, expanded: null, // asc = lowest Health Score (most concerning) first
  feedbackSort: { key: "count", dir: "desc" },
  matrixSelected: null, // accountId selected in the Matrix view (inline detail, no navigation)
  matrixMode: "value",  // "value" = Health x ARR, "renewal" = Health x days-to-renewal (bubble = ARR)
  mapSelected: null,    // accountId selected in the Map view (inline detail, no navigation)
  aiInsights: {}, // accountId -> { status: 'idle'|'loading'|'done'|'error', data, error }
  aiAsk: {},      // accountId -> { question, status, answer, error }
  approvals: {},  // accountId -> { status: 'idle'|'pending'|'done'|'error', result, error }
  teamPriority: { status: "idle", data: null, error: null, csmId: null }, // csmId: null = whole-team scope
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
  document.getElementById("tab-map").addEventListener("click", () => { state.view = "map"; render(); });
  document.getElementById("tab-team").addEventListener("click", () => { state.view = "team"; render(); });
  document.getElementById("tab-feedback").addEventListener("click", () => { state.view = "feedback"; render(); });

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
    else if (key === "adoption") { va = a.usage.adoptionRatePct; vb = b.usage.adoptionRatePct; }
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
  document.getElementById("tab-map").classList.toggle("active", state.view === "map");
  document.getElementById("tab-team").classList.toggle("active", state.view === "team");
  document.getElementById("tab-feedback").classList.toggle("active", state.view === "feedback");
  document.getElementById("filters").style.display = state.view === "team" ? "none" : "flex";

  const root = document.getElementById("app");
  root.innerHTML = "";
  if (state.view === "portfolio") root.appendChild(renderPortfolio());
  else if (state.view === "matrix") root.appendChild(renderMatrix());
  else if (state.view === "map") root.appendChild(renderMap());
  else if (state.view === "feedback") root.appendChild(renderFeedback());
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

  if (state.filters.csm !== "all") {
    wrap.appendChild(renderPriorityBox(state.filters.csm, `AI Priorities for ${csmName(state.filters.csm)}`));
  }

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
  legend.textContent = "Color legend: green/orange/red on Health Score and Adoption = risk level (Adoption is a real warning signal — low usage of what's licensed). Green/orange/gray on Expansion = upsell opportunity (low is neutral, not a warning).";
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
  headRow.appendChild(renderSortHeader("Adoption", "adoption"));
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
      <td><span class="score-num adopt-text-${adoptionCategory(acc.usage.adoptionRatePct)}">${acc.usage.adoptionRatePct}%</span></td>
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

function renderScoreTrend(history) {
  const first = history[0].score;
  const last = history[history.length - 1].score;
  const diff = last - first;
  const weeks = history.length - 1;
  const color = diff <= -8 ? "var(--red)" : diff >= 8 ? "var(--green)" : "var(--muted)";
  const summary = diff <= -8
    ? `Health Score fell from ${first} to ${last} over the last ${weeks} weeks.`
    : diff >= 8
      ? `Health Score rose from ${first} to ${last} over the last ${weeks} weeks.`
      : `Health Score stayed roughly steady around ${last} over the last ${weeks} weeks.`;

  const w = 180, h = 36, pad = 3;
  const points = history.map((p, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const y = pad + (1 - p.score / 100) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `
    <div class="score-trend">
      <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="score-sparkline">
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
      <p class="sub">${escapeHtml(summary)}</p>
    </div>
  `;
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

  const milestone = acc.valueMilestone
    ? `<div class="milestone-box"><p class="milestone-label">Value Milestone — ${fmtDate(acc.valueMilestone.achievedDate)}</p><p>${escapeHtml(acc.valueMilestone.description)}</p></div>`
    : "";

  const scoreTrend = acc.healthScoreHistory ? renderScoreTrend(acc.healthScoreHistory) : "";

  div.innerHTML = `
    <div class="detail-grid">
      <div>
        <h4>Score Breakdown</h4>
        <p class="sub">Risk points per criterion — the total is subtracted from the Health Score (100). Health Score ${acc.health.score} = 100 − ${Math.round(acc.health.criteria.reduce((s, c) => s + c.points, 0))} risk points.</p>
        ${scoreTrend}
        <table class="breakdown-table"><tbody>${criteriaRows}</tbody></table>
      </div>
      <div>
        <h4>Contract & Licensing</h4>
        <p>${acc.contract.type === "multi-year" ? `Multi-year contract (${acc.contract.termYears} years)` : "Single-year contract"}, since ${fmtDate(acc.contract.startDate)}</p>
        <ul>${modules}</ul>
        ${whitespace}
        ${milestone}
        <h4>Relationship</h4>
        <p>Champion: ${escapeHtml(acc.relationship.championName)} (${CHAMPION_LABEL[acc.relationship.championStatus]})<br/>
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
    const conf = d.confidence || { level: "high", reason: "" };
    const confRisk = conf.level === "low" ? "high" : conf.level === "medium" ? "medium" : "low";
    const confLabel = conf.level === "low" ? "Low confidence" : conf.level === "medium" ? "Medium confidence" : "High confidence";
    const nba = d.nextBestAction;
    const nbaLabel = nba?.category === "growth" ? "Next Best Action — Growth" : "Next Best Action — Risk Mitigation";
    const nbaClass = nba?.category === "growth" ? "low" : "high";
    body.innerHTML = `
      <p><strong>Sentiment:</strong> ${escapeHtml(d.sentiment?.label ?? "-")} — <span class="sub">${escapeHtml(d.sentiment?.rationale ?? "")}</span></p>
      <p>${escapeHtml(d.narrative ?? "")}</p>
      <p><span class="status-pill risk-${confRisk}">${confLabel}</span>${conf.reason ? ` <span class="sub">${escapeHtml(conf.reason)}</span>` : ""}</p>
      ${nba ? `
        <div class="nba-box">
          <p class="nba-label risk-text-${nbaClass}">${nbaLabel}</p>
          <p><strong>${escapeHtml(nba.action)}</strong></p>
          <p class="sub">${escapeHtml(nba.rationale)}</p>
          <div class="nba-approval"></div>
        </div>
      ` : ""}
    `;

    if (nba) renderApprovalControl(container.querySelector(".nba-approval"), acc.accountId, nba);
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

function renderApprovalControl(container, accountId, nba) {
  const approval = state.approvals[accountId] || { status: "idle" };

  if (approval.status === "idle") {
    const btn = document.createElement("button");
    btn.className = "ai-load-btn approve-btn";
    btn.textContent = "Approve & Send to Workflow";
    btn.addEventListener("click", () => submitApproval(accountId, nba));
    container.appendChild(btn);
  } else if (approval.status === "pending") {
    container.innerHTML = `<p class="sub">Sending…</p>`;
  } else if (approval.status === "error") {
    container.innerHTML = `<p class="ai-unavailable">Could not send (${escapeHtml(approval.error)}).</p>`;
  } else if (approval.status === "done") {
    container.innerHTML = approval.result.workflowConnected
      ? `<p class="approval-confirm">✓ Approved and sent to your n8n workflow.</p>`
      : `<p class="approval-confirm">✓ Approved (logged — no n8n workflow connected yet).</p>`;
  }
}

async function submitApproval(accountId, nba) {
  state.approvals[accountId] = { status: "pending" };
  render();
  try {
    const result = await approveAction(accountId, nba);
    state.approvals[accountId] = { status: "done", result };
  } catch (e) {
    state.approvals[accountId] = { status: "error", error: e.message };
  }
  render();
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
const TREND_TEXT = { up: "Improving ▲", down: "Declining ▼", flat: "Stable" };

// Shared custom tooltip for chart dots (replaces native SVG <title>, which
// can't be styled — no bold text, no forced line breaks). contentFn(account)
// returns the tooltip's inner HTML; delegated to `.matrix-dot` elements so it
// works for both the Matrix and Map views without duplicating listener setup.
function attachDotTooltip(wrap, list, contentFn) {
  const tip = document.createElement("div");
  tip.className = "chart-tooltip";
  wrap.appendChild(tip);

  wrap.querySelectorAll(".matrix-dot").forEach(dot => {
    dot.addEventListener("mouseenter", () => {
      const account = list.find(a => a.accountId === dot.dataset.accountId);
      if (!account) return;
      tip.innerHTML = contentFn(account);
      tip.style.display = "block";
    });
    dot.addEventListener("mousemove", e => {
      tip.style.left = `${e.clientX + 14}px`;
      tip.style.top = `${e.clientY + 14}px`;
    });
    dot.addEventListener("mouseleave", () => {
      tip.style.display = "none";
    });
  });
}

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
  // Bubble size encodes a signal beyond the two axes: renewal mode already
  // plots ARR on neither axis, so size = ARR fills that gap. Value mode
  // already puts ARR on the Y axis, so size = Expansion Score instead —
  // turning it into a 3-signal view (risk × value × growth potential).
  const radiusOf = a => {
    if (mode === "renewal") {
      if (maxArr === minArr) return 9;
      return 5 + ((a.contract.arrUSD - minArr) / (maxArr - minArr)) * 11;
    }
    return 5 + (a.expansion.score / 100) * 11;
  };

  const quadrantX = xScale(healthMid);
  const quadrantY = yScale(yPlotMedian);

  const dots = list.map(a => {
    const cx = xScale(a.health.score);
    const cy = yScale(yPlotOf(a));
    const r = radiusOf(a);
    const glyph = TREND_GLYPH[a.trend];
    const glyphSpan = glyph ? `<text x="${(cx + r + 2).toFixed(1)}" y="${(cy + 4).toFixed(1)}" class="trend-glyph trend-${a.trend}">${glyph}</text>` : "";
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" class="matrix-dot risk-dot-${a.health.riskCategory}" data-account-id="${a.accountId}"></circle>${glyphSpan}`;
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
      <text x="${marginLeft + plotW / 2}" y="${marginTop - 4}" class="axis-title" text-anchor="middle">(bubble size = ${mode === "renewal" ? "ARR" : "Expansion Score"})</text>

      ${dots}
    </svg>
  `;

  const selected = state.matrixSelected ? list.find(a => a.accountId === state.matrixSelected) : null;
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
    : `X: Health Score, Y: ARR, bubble size: Expansion Score (bigger = more upsell potential). Quadrant lines split at Health ${healthMid} and median ARR (${fmtUSD(Math.round(yPlotMedian))}) of the filtered accounts.`;

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

  attachDotTooltip(wrap, list, a => `
    <div class="tt-name">${escapeHtml(a.accountName)}</div>
    <div class="tt-row"><span class="tt-label">Health Score:</span> <strong>${a.health.score}</strong> (${RISK_LABEL[a.health.riskCategory]} risk)</div>
    <div class="tt-row"><span class="tt-label">ARR:</span> ${fmtUSD(a.contract.arrUSD)}</div>
    ${mode === "renewal" ? `<div class="tt-row"><span class="tt-label">Renewal in:</span> ${daysFromToday(a.contract.nextRenewalDate)} days</div>` : `<div class="tt-row"><span class="tt-label">Expansion:</span> ${a.expansion.score} (${a.expansion.category})</div>`}
    <div class="tt-row"><span class="tt-label">CSAT trend:</span> ${TREND_TEXT[a.trend]}</div>
  `);

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

const RISK_HEX = { high: "#dc2626", medium: "#d97706", low: "#16a34a" };
let leafletMapInstance = null;

function renderMap() {
  const wrap = document.createElement("div");
  const list = getFilteredAccounts().filter(a => a.location);

  if (list.length === 0) {
    wrap.innerHTML = `<p class="sub">No accounts with location data match the current filters.</p>`;
    return wrap;
  }

  const selected = state.mapSelected ? list.find(a => a.accountId === state.mapSelected) : null;
  const detailPanel = selected ? `
    <div class="matrix-detail">
      <button class="matrix-detail-close" aria-label="Close">&times;</button>
      <h4>${escapeHtml(selected.accountName)} <span class="status-pill risk-${selected.health.riskCategory}">${RISK_LABEL[selected.health.riskCategory]}</span></h4>
      <p class="sub">${escapeHtml(selected.location.city)}, ${escapeHtml(selected.location.country)} · ${escapeHtml(selected.industry)} · ${escapeHtml(csmName(selected.csmId))}</p>
      <div class="matrix-detail-stats">
        <div><span class="stat-num risk-text-${selected.health.riskCategory}">${selected.health.score}</span><span class="stat-label">Health Score</span></div>
        <div><span class="stat-num">${fmtUSD(selected.contract.arrUSD)}</span><span class="stat-label">ARR</span></div>
        <div><span class="stat-num">${daysFromToday(selected.contract.nextRenewalDate)}d</span><span class="stat-label">To Renewal</span></div>
      </div>
      <button class="ai-load-btn matrix-detail-link">View full details in Portfolio →</button>
    </div>
  ` : "";

  wrap.innerHTML = `
    <p class="sub">Fictional HQ location per account, plotted on real OpenStreetMap data. Dot color = risk level. Click a marker for details.</p>
    <div id="leaflet-map" class="leaflet-map"></div>
    ${detailPanel}
    <div class="summary-bar" style="margin-top:14px;">
      <div class="summary-chip risk-high">● High risk</div>
      <div class="summary-chip risk-medium">● Medium risk</div>
      <div class="summary-chip risk-low">● Low risk</div>
    </div>
  `;

  wrap.querySelector(".matrix-detail-close")?.addEventListener("click", () => {
    state.mapSelected = null;
    render();
  });

  wrap.querySelector(".matrix-detail-link")?.addEventListener("click", () => {
    const id = state.mapSelected;
    state.view = "portfolio";
    state.expanded = id;
    state.mapSelected = null;
    render();
    document.getElementById(`detail-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // The map div isn't attached to the live DOM yet when renderMap() runs —
  // render() appends the returned wrap right after this returns. Defer
  // Leaflet init to the next tick so the container has a real size.
  setTimeout(() => initLeafletMap(list), 0);

  return wrap;
}

function initLeafletMap(list) {
  const el = document.getElementById("leaflet-map");
  if (!el || typeof L === "undefined") return;

  if (leafletMapInstance) {
    leafletMapInstance.remove();
    leafletMapInstance = null;
  }

  const map = L.map(el, { scrollWheelZoom: true }).setView([20, 10], 2);
  leafletMapInstance = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  list.forEach(a => {
    const marker = L.circleMarker([a.location.lat, a.location.lng], {
      radius: 8,
      color: "#ffffff",
      weight: 1.5,
      fillColor: RISK_HEX[a.health.riskCategory],
      fillOpacity: 0.9,
    }).addTo(map);

    marker.bindTooltip(`
      <div class="tt-name">${escapeHtml(a.accountName)}</div>
      <div class="tt-row">${escapeHtml(a.location.city)}, ${escapeHtml(a.location.country)}</div>
      <div class="tt-row"><span class="tt-label">Health Score:</span> <strong>${a.health.score}</strong> (${RISK_LABEL[a.health.riskCategory]} risk)</div>
      <div class="tt-row"><span class="tt-label">CSAT trend:</span> ${TREND_TEXT[a.trend]}</div>
    `, { direction: "top", className: "leaflet-chart-tooltip", sticky: true });

    marker.on("click", () => {
      state.mapSelected = a.accountId;
      render();
    });
  });
}

const SENTIMENT_LABEL = { frustrated: "Frustrated", neutral: "Neutral", patient: "Patient" };
const SENTIMENT_RISK = { frustrated: "high", neutral: "medium", patient: "low" };

function renderFeedback() {
  const wrap = document.createElement("div");
  const list = getFilteredAccounts();

  const groups = {};
  list.forEach(a => {
    const req = a.support.topFeatureRequest;
    if (!req) return;
    if (!groups[req]) groups[req] = { accounts: [] };
    groups[req].accounts.push(a);
  });

  const rows = Object.entries(groups).map(([request, { accounts }]) => {
    const withSince = accounts.filter(a => a.support.featureRequestSince);
    const oldestDays = withSince.length
      ? Math.max(...withSince.map(a => daysSince(a.support.featureRequestSince)))
      : null;
    const sentimentCounts = { frustrated: 0, neutral: 0, patient: 0 };
    accounts.forEach(a => {
      if (a.support.featureRequestSentiment) sentimentCounts[a.support.featureRequestSentiment]++;
    });
    return {
      request,
      count: accounts.length,
      totalArr: accounts.reduce((s, a) => s + a.contract.arrUSD, 0),
      avgHealth: Math.round(accounts.reduce((s, a) => s + a.health.score, 0) / accounts.length),
      oldestDays,
      sentimentCounts,
      accounts,
    };
  });

  if (rows.length === 0) {
    wrap.innerHTML = `<p class="sub">No feature requests recorded for the currently filtered accounts.</p>`;
    return wrap;
  }

  const requesters = new Set(list.filter(a => a.support.topFeatureRequest).map(a => a.accountId)).size;

  const summary = document.createElement("div");
  summary.className = "summary-bar";
  summary.innerHTML = `
    <div class="summary-chip neutral">${rows.length} distinct requests</div>
    <div class="summary-chip neutral">${requesters} accounts with a request</div>
    <div class="summary-chip neutral">${list.length} accounts in view</div>
  `;
  wrap.appendChild(summary);

  const intro = document.createElement("p");
  intro.className = "sub";
  intro.textContent = "Aggregated across the currently filtered accounts — not AI-generated, just counting. \"Oldest Ask\" and \"Sentiment\" are estimated from each account's risk trajectory (a proxy, not a live satisfaction survey) — click a column to sort.";
  wrap.appendChild(intro);

  const sorted = [...rows].sort((a, b) => {
    const { key, dir } = state.feedbackSort;
    let va, vb;
    if (key === "arr") { va = a.totalArr; vb = b.totalArr; }
    else if (key === "health") { va = a.avgHealth; vb = b.avgHealth; }
    else if (key === "oldest") { va = a.oldestDays ?? -1; vb = b.oldestDays ?? -1; }
    else { va = a.count; vb = b.count; }
    return dir === "asc" ? va - vb : vb - va;
  });

  const table = document.createElement("table");
  table.className = "portfolio-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const reqTh = document.createElement("th");
  reqTh.textContent = "Feature Request";
  headRow.appendChild(reqTh);
  headRow.appendChild(renderFeedbackSortHeader("# Accounts", "count"));
  headRow.appendChild(renderFeedbackSortHeader("Total ARR", "arr"));
  headRow.appendChild(renderFeedbackSortHeader("Avg Health Score", "health"));
  headRow.appendChild(renderFeedbackSortHeader("Oldest Ask", "oldest"));
  const sentimentTh = document.createElement("th");
  sentimentTh.textContent = "Sentiment";
  headRow.appendChild(sentimentTh);
  const reqAccTh = document.createElement("th");
  reqAccTh.textContent = "Requesting Accounts";
  headRow.appendChild(reqAccTh);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  sorted.forEach(r => {
    const tr = document.createElement("tr");
    const healthCat = r.avgHealth >= 70 ? "low" : r.avgHealth >= 40 ? "medium" : "high";
    const sentimentBadges = ["frustrated", "neutral", "patient"]
      .filter(s => r.sentimentCounts[s] > 0)
      .map(s => `<span class="status-pill risk-${SENTIMENT_RISK[s]}">${r.sentimentCounts[s]} ${SENTIMENT_LABEL[s]}</span>`)
      .join(" ");
    tr.innerHTML = `
      <td class="account-cell">${escapeHtml(r.request)}</td>
      <td><span class="score-num">${r.count}</span></td>
      <td>${fmtUSD(r.totalArr)}</td>
      <td><span class="score-num risk-text-${healthCat}">${r.avgHealth}</span></td>
      <td class="sub">${r.oldestDays != null ? r.oldestDays + "d" : "—"}</td>
      <td>${sentimentBadges || "—"}</td>
      <td class="sub">${r.accounts.map(a => escapeHtml(a.accountName)).join(", ")}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);

  return wrap;
}

function renderFeedbackSortHeader(label, key) {
  const th = document.createElement("th");
  th.className = "sortable";
  th.textContent = label + (state.feedbackSort.key === key ? (state.feedbackSort.dir === "asc" ? " ▲" : " ▼") : "");
  th.addEventListener("click", () => {
    if (state.feedbackSort.key === key) state.feedbackSort.dir = state.feedbackSort.dir === "asc" ? "desc" : "asc";
    else { state.feedbackSort.key = key; state.feedbackSort.dir = "desc"; }
    render();
  });
  return th;
}

function renderPriorityBox(scopeCsmId, title) {
  const box = document.createElement("div");
  box.className = "team-priority-box";
  box.innerHTML = `<h4>${escapeHtml(title)} <span class="ai-disclaimer">— AI-generated, may be inaccurate, verify before acting</span></h4><div class="team-priority-body"></div>`;
  const body = box.querySelector(".team-priority-body");
  const tp = state.teamPriority;
  const inScope = tp.csmId === (scopeCsmId || null);

  if (!inScope || tp.status === "idle") {
    const btn = document.createElement("button");
    btn.className = "ai-load-btn";
    btn.textContent = scopeCsmId ? "Load AI Prioritization for This Portfolio" : "Load AI Prioritization for the Whole Team";
    btn.addEventListener("click", () => loadTeamPriority(scopeCsmId));
    body.appendChild(btn);
  } else if (tp.status === "loading") {
    body.innerHTML = `<p class="sub">Loading…</p>`;
  } else if (tp.status === "error") {
    body.innerHTML = `<p class="ai-unavailable">Unavailable (${escapeHtml(tp.error)}).</p>`;
  } else if (tp.status === "done") {
    const items = (tp.data.priorities || []).map(p => `
      <li><strong>${escapeHtml(p.accountName)}</strong> — <span class="sub">${escapeHtml(p.reason)}</span></li>
    `).join("");
    body.innerHTML = `<ol class="priority-list">${items}</ol>`;
  }
  return box;
}

function goToCsmPortfolio(csmId) {
  state.filters.csm = csmId;
  document.getElementById("filter-csm").value = csmId;
  state.view = "portfolio";
  render();
}

function renderTeam() {
  const wrap = document.createElement("div");
  wrap.appendChild(renderPriorityBox(null, "AI Weekly Priorities"));

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
      <p class="sub csm-card-link">View portfolio & AI-analyze →</p>
    `;
    card.addEventListener("click", () => goToCsmPortfolio(csm.csmId));
    grid.appendChild(card);
  });
  return wrap;
}

async function loadTeamPriority(csmId) {
  state.teamPriority = { status: "loading", csmId: csmId || null };
  render();
  try {
    const data = await fetchTeamPriority(csmId);
    state.teamPriority = { status: "done", data, csmId: csmId || null };
  } catch (e) {
    state.teamPriority = { status: "error", error: e.message, csmId: csmId || null };
  }
  render();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();
