import { computeHealthScore, computeExpansionScore, computePriorityScore, daysSince, daysFromToday, computeTrend, REFERENCE_DATE_ISO } from "./scoring.js";
import { fetchAccountInsight, askAboutAccount, fetchTeamPriority, approveAction, askAboutPortfolio } from "./ai.js";

const RISK_LABEL = { high: "High", medium: "Medium", low: "Low" };
const fmtUSD = n => "$" + n.toLocaleString("en-US");
const fmtDate = iso => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
// Sprint 06 — compact calendar-date form for x-axis tick labels (space is
// tight there); the full fmtDate() form is still used for the axis's
// accessible name/title, so no precision is lost, only the on-axis label.
const fmtAxisDate = iso => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const adoptionCategory = pct => pct >= 70 ? "good" : pct >= 40 ? "warn" : "poor";
const CHAMPION_LABEL = { active: "active", unknown: "unclear", recently_departed: "recently departed" };
// Sprint 05B — Team: an initials placeholder derived from the CSM's own name
// field (already in data/accounts.json's csms list) — explicitly not a real
// photo, matching the sprint's "no real profile pictures" instruction.
const initialsOf = name => (name || "").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?";

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
  portfolioAsk: { status: "idle", question: "", answer: "", error: "" }, // scoped to whatever getFilteredAccounts() returns at ask time
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
  // Sprint 05B — the same fixed reference date the scoring math itself uses
  // (src/scoring.js), just made visible in the topbar so the "snapshot, not
  // live" framing is unavoidable rather than buried in the Trust view alone.
  const snapshotEl = document.getElementById("topbar-snapshot");
  if (snapshotEl) snapshotEl.textContent = `Snapshot as of ${fmtDate(REFERENCE_DATE_ISO)}`;
  bindControls();
  render();
}

function bindControls() {
  document.getElementById("tab-portfolio").addEventListener("click", () => { state.view = "portfolio"; render(); });
  document.getElementById("tab-matrix").addEventListener("click", () => { state.view = "matrix"; render(); });
  document.getElementById("tab-map").addEventListener("click", () => { state.view = "map"; render(); });
  document.getElementById("tab-team").addEventListener("click", () => { state.view = "team"; render(); });
  document.getElementById("tab-feedback").addEventListener("click", () => { state.view = "feedback"; render(); });
  document.getElementById("tab-trust").addEventListener("click", () => { state.view = "trust"; render(); });

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

const RISK_SORT_RANK = { low: 1, medium: 2, high: 3 };

function getSorted(list) {
  const { key, dir } = state.sort;
  const sorted = [...list].sort((a, b) => {
    let va, vb;
    if (key === "score") { va = a.health.score; vb = b.health.score; }
    else if (key === "expansion") { va = a.expansion.score; vb = b.expansion.score; }
    else if (key === "adoption") { va = a.usage.adoptionRatePct; vb = b.usage.adoptionRatePct; }
    else if (key === "renewal") { va = new Date(a.contract.nextRenewalDate); vb = new Date(b.contract.nextRenewalDate); }
    else if (key === "arr") { va = a.contract.arrUSD; vb = b.contract.arrUSD; }
    else if (key === "region") { va = a.region; vb = b.region; }
    else if (key === "csm") { va = csmName(a.csmId); vb = csmName(b.csmId); }
    else if (key === "risk") { va = RISK_SORT_RANK[a.health.riskCategory]; vb = RISK_SORT_RANK[b.health.riskCategory]; }
    else if (key === "lastInteraction") { va = a.relationship.lastInteractionDaysAgo; vb = b.relationship.lastInteractionDaysAgo; }
    else if (key === "qbr") { va = new Date(a.relationship.nextQBRDate); vb = new Date(b.relationship.nextQBRDate); }
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

// Sprint 05 — Part A.1/A.2: every view opens with the same title+description
// pattern instead of jumping straight into content, so the six views read as
// one product. Purely presentational — no state or behavior here. Trust
// keeps its own Sprint 04 hero instead of this (it already does more).
function renderViewHeader(title, description) {
  const header = document.createElement("div");
  header.className = "view-header";
  header.innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p>`;
  return header;
}

// Sprint 05B — Part 3: both AI-generated panels (Portfolio Ask, Team/Portfolio
// Prioritization) get the same clearly-labeled "AI Copilot" identity — an
// icon + eyebrow label + the existing trust disclaimer — instead of looking
// like a plain form box. Purely presentational; the underlying AI call and
// disclaimer text are unchanged.
const AI_SPARKLE_ICON = `<svg class="ai-copilot-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2.3 11.7 7.9 17.3 9.6l-5.6 1.7L10 17l-1.7-5.7-5.6-1.7 5.6-1.7L10 2.3Z" fill="currentColor"/></svg>`;

function aiCopilotHeader(title) {
  return `
    <div class="ai-copilot-header">
      ${AI_SPARKLE_ICON}
      <div>
        <p class="ai-copilot-eyebrow">AI Copilot</p>
        <h4>${escapeHtml(title)} <span class="ai-disclaimer">— AI-generated, may be inaccurate, verify before acting</span></h4>
      </div>
    </div>
  `;
}

function render() {
  document.getElementById("tab-portfolio").classList.toggle("active", state.view === "portfolio");
  document.getElementById("tab-matrix").classList.toggle("active", state.view === "matrix");
  document.getElementById("tab-map").classList.toggle("active", state.view === "map");
  document.getElementById("tab-team").classList.toggle("active", state.view === "team");
  document.getElementById("tab-feedback").classList.toggle("active", state.view === "feedback");
  document.getElementById("tab-trust").classList.toggle("active", state.view === "trust");
  document.getElementById("filters").style.display = (state.view === "team" || state.view === "trust") ? "none" : "flex";

  const root = document.getElementById("app");
  root.innerHTML = "";
  if (state.view === "portfolio") root.appendChild(renderPortfolio());
  else if (state.view === "matrix") root.appendChild(renderMatrix());
  else if (state.view === "map") root.appendChild(renderMap());
  else if (state.view === "feedback") root.appendChild(renderFeedback());
  else if (state.view === "trust") root.appendChild(renderTrust());
  else root.appendChild(renderTeam());
}

function renderSortHeader(label, key) {
  const th = document.createElement("th");
  th.className = "sortable";
  th.tabIndex = 0;
  th.textContent = label + (state.sort.key === key ? (state.sort.dir === "asc" ? " ▲" : " ▼") : "");
  th.setAttribute("aria-sort", state.sort.key === key ? (state.sort.dir === "asc" ? "ascending" : "descending") : "none");
  const doSort = () => {
    if (state.sort.key === key) state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
    else { state.sort.key = key; state.sort.dir = "desc"; }
    render();
  };
  th.addEventListener("click", doSort);
  th.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doSort(); } });
  return th;
}

// Sprint 05B — KPI strip: four numbers that already exist elsewhere in this
// file (health.riskCategory, contract.arrUSD, and the same "renewal within
// 90 days" pattern renderTeam() already uses per CSM), just surfaced above
// the table for the currently filtered list. No new formulas, no new data.
function renderPortfolioKpis(list) {
  const wrap = document.createElement("div");
  wrap.className = "kpi-strip";

  const highRisk = list.filter(a => a.health.riskCategory === "high");
  const arrAtRisk = highRisk.reduce((s, a) => s + a.contract.arrUSD, 0);
  const upcomingRenewals = list.filter(a => {
    const d = daysFromToday(a.contract.nextRenewalDate);
    return d <= 90 && d >= 0;
  }).length;

  const kpis = [
    { label: "Accounts in view", value: String(list.length), tone: "neutral" },
    { label: "High risk", value: String(highRisk.length), tone: "high" },
    { label: "ARR at risk", value: fmtUSD(arrAtRisk), tone: "high" },
    { label: "Renewals ≤ 90 days", value: String(upcomingRenewals), tone: "medium" },
  ];

  wrap.innerHTML = kpis.map(k => `
    <div class="kpi-tile kpi-tile-${k.tone}">
      <span class="kpi-value">${escapeHtml(k.value)}</span>
      <span class="kpi-label">${escapeHtml(k.label)}</span>
    </div>
  `).join("");

  return wrap;
}

function renderPortfolio() {
  const wrap = document.createElement("div");
  const list = getSorted(getFilteredAccounts());

  wrap.appendChild(renderViewHeader("Portfolio", "Prioritized view of every account — click a row to see the full score breakdown, evidence, and AI insight."));
  wrap.appendChild(renderPortfolioKpis(list));

  if (state.filters.csm !== "all") {
    wrap.appendChild(renderPriorityBox(state.filters.csm, `AI Priorities for ${csmName(state.filters.csm)}`));
  }

  // PO review, round 2: the AI Copilot uses the full workspace width at
  // every breakpoint; the deterministic Attention Queue stays below it as
  // a compact area — see the .portfolio-ai-row rule.
  const aiRow = document.createElement("div");
  aiRow.className = "portfolio-ai-row";
  aiRow.appendChild(renderPortfolioAsk(list));
  aiRow.appendChild(renderAttentionQueue(list));
  wrap.appendChild(aiRow);

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
  headRow.appendChild(renderSortHeader("Region", "region"));
  headRow.appendChild(renderSortHeader("CSM", "csm"));
  headRow.appendChild(renderSortHeader("ARR", "arr"));
  headRow.appendChild(renderSortHeader("Renewal", "renewal"));
  headRow.appendChild(renderSortHeader("Health Score", "score"));
  headRow.appendChild(renderSortHeader("Risk", "risk"));
  headRow.appendChild(renderSortHeader("Adoption", "adoption"));
  headRow.appendChild(renderSortHeader("Expansion", "expansion"));
  headRow.appendChild(renderSortHeader("Last Interaction", "lastInteraction"));
  headRow.appendChild(renderSortHeader("Next QBR", "qbr"));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  list.forEach(acc => {
    const row = document.createElement("tr");
    row.className = `risk-row-${acc.health.riskCategory}${state.expanded === acc.accountId ? " row-expanded" : ""}`;
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
  const scrollWrap = document.createElement("div");
  scrollWrap.className = "table-scroll";
  scrollWrap.appendChild(table);
  wrap.appendChild(scrollWrap);
  const hint = document.createElement("p");
  hint.className = "table-scroll-hint";
  hint.textContent = "← Scroll horizontally to see all columns →";
  wrap.appendChild(hint);
  return wrap;
}

// Sprint 06 — x-axis tick selection: always the first/last history index,
// plus up to `midCount` additional interior indices spaced as evenly as
// possible across the array. Used to keep intermediate marks legible —
// they're only added where renderScoreTrend's width tier has room for them.
function pickTickIndices(n, midCount) {
  if (midCount <= 0 || n <= 2) return [0, n - 1];
  const indices = new Set([0, n - 1]);
  for (let k = 1; k <= midCount; k++) {
    const idx = Math.round((k / (midCount + 1)) * (n - 1));
    if (idx > 0 && idx < n - 1) indices.add(idx);
  }
  return [...indices].sort((a, b) => a - b);
}

function renderScoreTrend(history) {
  const first = history[0].score;
  const last = history[history.length - 1].score;
  const diff = last - first;
  const weeks = history.length - 1;
  const color = diff <= -8 ? "var(--red)" : diff >= 8 ? "var(--green)" : "var(--muted)";
  const arrow = diff <= -8 ? "▼" : diff >= 8 ? "▲" : "";
  const pct = first > 0 ? Math.round((diff / first) * 100) : 0;
  const pctLabel = `${diff > 0 ? "+" : ""}${pct}%`;
  const summary = diff <= -8
    ? `Health Score fell from ${first} to ${last} over the last ${weeks} weeks.`
    : diff >= 8
      ? `Health Score rose from ${first} to ${last} over the last ${weeks} weeks.`
      : `Health Score stayed roughly steady around ${last} over the last ${weeks} weeks.`;

  // Sprint 06 — real x-axis under the trend line, with a calendar-date range
  // and (width permitting) intermediate ticks. The pre-existing plot geometry
  // below (padTop/plotH/gridlines/polyline/start-end dots+labels, all on a
  // fixed 0-100 y-scale) is untouched — plotH stays 48 regardless of tier, so
  // the line's own shape never changes; the axis is purely additive height
  // beneath it. Tick density is picked from window width, since the card this
  // renders into shares its available width with a sibling column only above
  // the existing 700px detail-grid breakpoint (see .detail-grid in styles.css) —
  // narrower than that, it's the sole, full-width column.
  // Sprint 09 — from 901px up, .score-trend lays the graph and the
  // percent/summary text out side by side (see styles.css), so the graph
  // needs a narrower intrinsic width to leave the text room to breathe;
  // below that it's still full-width and stacked, so it can stay wider.
  const tier = window.innerWidth >= 1200 ? { w: 170, midCount: 1 }
    : window.innerWidth >= 901 ? { w: 150, midCount: 0 }
    : window.innerWidth >= 700 ? { w: 260, midCount: 1 }
    : { w: 200, midCount: 0 };
  const w = tier.w;
  const padTop = 6, padBottom = 6, padRight = 8, plotH = 48, xAxisH = 18;
  const h = padTop + plotH + padBottom + xAxisH;
  const axisLabelW = 24;
  const plotX0 = axisLabelW, plotW = w - axisLabelW - padRight;
  const yFor = score => padTop + (1 - score / 100) * plotH;
  const xFor = i => plotX0 + (i / (history.length - 1)) * plotW;
  const points = history.map((p, i) => `${xFor(i).toFixed(1)},${yFor(p.score).toFixed(1)}`).join(" ");
  const firstX = plotX0;
  const lastX = plotX0 + plotW;

  const gridlines = [0, 50, 100].map(v => `
    <line x1="${plotX0}" y1="${yFor(v).toFixed(1)}" x2="${w - padRight}" y2="${yFor(v).toFixed(1)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,2" />
    <text x="${plotX0 - 4}" y="${(yFor(v) + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="var(--muted)">${v}</text>
  `).join("");

  const axisLineY = padTop + plotH + padBottom;
  const xAxisLine = `<line x1="${plotX0}" y1="${axisLineY}" x2="${(plotX0 + plotW).toFixed(1)}" y2="${axisLineY}" stroke="var(--border)" stroke-width="1" />`;
  const tickIndices = pickTickIndices(history.length, tier.midCount);
  const xAxisTicks = tickIndices.map(i => {
    const x = xFor(i).toFixed(1);
    const anchor = i === 0 ? "start" : i === history.length - 1 ? "end" : "middle";
    return `
      <line x1="${x}" y1="${axisLineY}" x2="${x}" y2="${axisLineY + 4}" stroke="var(--border)" stroke-width="1" />
      <text x="${x}" y="${axisLineY + 13}" text-anchor="${anchor}" font-size="9" fill="var(--muted)">${escapeHtml(fmtAxisDate(history[i].date))}</text>
    `;
  }).join("");

  // Accessible name for the whole graphic (calendar dates and score values,
  // not the abbreviated axis labels), since a screen reader encountering the
  // <svg> itself needs its own name — it can't rely on the sibling <p> text.
  const axisTitle = `Health Score trend, ${fmtDate(history[0].date)} to ${fmtDate(history[history.length - 1].date)}: started at ${first}, ended at ${last}.`;

  return `
    <div class="score-trend">
      <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="score-sparkline" role="img">
        <title>${escapeHtml(axisTitle)}</title>
        ${gridlines}
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <circle cx="${firstX}" cy="${yFor(first).toFixed(1)}" r="2.5" fill="var(--muted)" />
        <text x="${firstX}" y="${(yFor(first) - 6).toFixed(1)}" text-anchor="start" font-size="9" fill="var(--muted)">${first}</text>
        <circle cx="${lastX}" cy="${yFor(last).toFixed(1)}" r="2.5" fill="${color}" />
        <text x="${lastX}" y="${(yFor(last) - 6).toFixed(1)}" text-anchor="end" font-size="9" font-weight="700" fill="${color}">${last}</text>
        ${xAxisLine}
        ${xAxisTicks}
      </svg>
      <div class="score-trend-info">
        <div class="score-trend-pct" style="color:${color};">${arrow} ${pctLabel}<span class="sub"> over ${weeks} weeks</span></div>
        <p class="sub">${escapeHtml(summary)}</p>
      </div>
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
    const retryBtn = document.createElement("button");
    retryBtn.className = "ai-load-btn";
    retryBtn.textContent = "Try Again";
    retryBtn.addEventListener("click", () => loadInsight(acc.accountId));
    body.appendChild(retryBtn);
  } else if (insight.status === "done") {
    const d = insight.data;
    const conf = d.confidence || { level: "high", reason: "" };
    const confRisk = conf.level === "low" ? "high" : conf.level === "medium" ? "medium" : "low";
    const confLabel = conf.level === "low" ? "Low evidence confidence" : conf.level === "medium" ? "Medium evidence confidence" : "High evidence confidence";
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

    const reloadBtn = document.createElement("button");
    reloadBtn.className = "reload-link";
    reloadBtn.textContent = "↻ Reload Insight";
    reloadBtn.addEventListener("click", () => loadInsight(acc.accountId));
    body.appendChild(reloadBtn);
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

// Sprint 02 — Human Review: the AI's nextBestAction is only ever a suggestion.
// A CSM must open this box, see/edit category+action+rationale, and explicitly
// confirm before anything reaches /api/approve-action. Draft edits live in
// state.approvals[accountId].draft (not local DOM state) so they survive any
// re-render (e.g. after a validation error) without reverting to the AI original.
function renderApprovalControl(container, accountId, nba) {
  const approval = state.approvals[accountId] || { status: "idle" };

  if (approval.status === "reviewing" || approval.status === "pending" || approval.status === "error") {
    renderReviewForm(container, accountId, nba, approval);
    return;
  }

  if (approval.status === "done") {
    container.innerHTML = approval.result.workflowConnected
      ? `<p class="approval-confirm">✓ Reviewed by CSM and sent to your n8n workflow.</p>`
      : `<p class="approval-confirm">✓ Reviewed by CSM and logged (no n8n workflow connected yet).</p>`;
    return;
  }

  // idle (default)
  container.innerHTML = `<p class="review-required">Human review required</p>`;
  const btn = document.createElement("button");
  btn.className = "ai-load-btn approve-btn";
  btn.textContent = "Review action";
  btn.addEventListener("click", () => {
    state.approvals[accountId] = {
      status: "reviewing",
      draft: { category: nba.category, action: nba.action, rationale: nba.rationale },
    };
    render();
  });
  container.appendChild(btn);
}

// Sprint 07 — Part A: category badge color is purely a status indicator
// (Risk Mitigation = red, Growth = teal/green, reusing the same status-pill
// risk-high/risk-low colors used everywhere else in the app) — it tracks the
// CSM's current draft.category, not just the AI's original suggestion, and
// updates live if they change the Category dropdown below.
function reviewCategoryMeta(category) {
  return category === "growth"
    ? { label: "Growth", riskClass: "risk-low" }
    : { label: "Risk Mitigation", riskClass: "risk-high" };
}

function renderReviewForm(container, accountId, nba, approval) {
  const draft = approval.draft;
  const disabled = approval.status === "pending";
  const badgeMeta = reviewCategoryMeta(draft.category);

  container.innerHTML = `
    <div class="review-form">
      <div class="review-head">
        <p class="ai-copilot-eyebrow">HUMAN REVIEW</p>
        <div class="review-head-row">
          <h4 class="review-title">Review &amp; approve action</h4>
          <span class="status-pill review-category-badge ${badgeMeta.riskClass}">${badgeMeta.label}</span>
        </div>
      </div>

      <p class="review-section-label">AI suggestion</p>
      <div class="review-origin">
        <p class="sub review-original">${escapeHtml(nba.action)}</p>
      </div>

      <p class="review-section-label">Final action to send <span class="review-hint-inline">— this is the version that will be sent</span></p>
      <label class="review-field">Category
        <select class="review-category" ${disabled ? "disabled" : ""}>
          <option value="risk_mitigation" ${draft.category === "risk_mitigation" ? "selected" : ""}>Risk mitigation</option>
          <option value="growth" ${draft.category === "growth" ? "selected" : ""}>Growth</option>
        </select>
      </label>
      <label class="review-field">Recommended action
        <textarea class="review-action" rows="3" maxlength="500" ${disabled ? "disabled" : ""}>${escapeHtml(draft.action)}</textarea>
        <span class="review-charcount">${draft.action.length}/500</span>
      </label>
      <label class="review-field">Rationale
        <textarea class="review-rationale" rows="2" maxlength="500" ${disabled ? "disabled" : ""}>${escapeHtml(draft.rationale)}</textarea>
        <span class="review-charcount">${draft.rationale.length}/500</span>
      </label>
      ${approval.validationError ? `<p class="review-error">${escapeHtml(approval.validationError)}</p>` : ""}
      ${approval.status === "error" ? `<p class="ai-unavailable">Could not send (${escapeHtml(approval.error)}). Your edits are kept — you can try again.</p>` : ""}
      ${approval.status === "pending" ? `<p class="sub">Sending…</p>` : ""}
      <div class="review-actions">
        <button class="review-cancel-btn" ${disabled ? "disabled" : ""}>Cancel</button>
        <button class="review-confirm-btn approve-btn" ${disabled ? "disabled" : ""}>Confirm & Send to Workflow</button>
      </div>
    </div>
  `;

  const categorySel = container.querySelector(".review-category");
  const actionTa = container.querySelector(".review-action");
  const rationaleTa = container.querySelector(".review-rationale");
  const [actionCount, rationaleCount] = container.querySelectorAll(".review-charcount");
  const badgeEl = container.querySelector(".review-category-badge");

  categorySel.addEventListener("change", () => {
    draft.category = categorySel.value;
    const meta = reviewCategoryMeta(draft.category);
    badgeEl.textContent = meta.label;
    badgeEl.classList.remove("risk-high", "risk-low");
    badgeEl.classList.add(meta.riskClass);
  });
  actionTa.addEventListener("input", () => {
    draft.action = actionTa.value;
    actionCount.textContent = `${draft.action.length}/500`;
    if (draft.action.trim() && draft.action.length <= 500) container.querySelector(".review-error")?.remove();
  });
  rationaleTa.addEventListener("input", () => {
    draft.rationale = rationaleTa.value;
    rationaleCount.textContent = `${draft.rationale.length}/500`;
    if (draft.rationale.length <= 500) container.querySelector(".review-error")?.remove();
  });

  if (!disabled) {
    container.querySelector(".review-cancel-btn").addEventListener("click", () => {
      state.approvals[accountId] = { status: "idle" };
      render();
    });
    container.querySelector(".review-confirm-btn").addEventListener("click", () => {
      const validationError = reviewValidationError(draft);
      if (validationError) {
        state.approvals[accountId] = { status: "reviewing", draft, validationError };
        render();
        return;
      }
      submitApproval(accountId, draft);
    });
  }
}

// Mirrors the server-side checks in api/approve-action.js (empty action,
// 500-char limits) so invalid input never leaves the client — the server
// re-validates independently and remains the source of truth.
function reviewValidationError(draft) {
  if (!draft.action.trim()) return "Action cannot be empty.";
  if (draft.action.length > 500) return "Action must be 500 characters or fewer.";
  if (draft.rationale.length > 500) return "Rationale must be 500 characters or fewer.";
  return null;
}

async function submitApproval(accountId, draft) {
  state.approvals[accountId] = { status: "pending", draft };
  render();
  try {
    const result = await approveAction(accountId, draft);
    state.approvals[accountId] = { status: "done", result };
  } catch (e) {
    state.approvals[accountId] = { status: "error", draft, error: e.message };
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
  wrap.appendChild(renderViewHeader("Matrix", "Health Score against value or renewal urgency — spot which accounts need attention first."));

  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sub";
    empty.textContent = "No accounts match the current filters.";
    wrap.appendChild(empty);
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

  // A dedicated content container (not wrap.innerHTML directly) — wrap
  // already holds the view header appended above, which a wrap.innerHTML
  // assignment would silently discard.
  const content = document.createElement("div");
  content.innerHTML = `
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
  wrap.appendChild(content);

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
  wrap.appendChild(renderViewHeader("Map", "Fictional HQ locations, colored by risk level — a geographic read on the same filtered portfolio."));

  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sub";
    empty.textContent = "No accounts with location data match the current filters.";
    wrap.appendChild(empty);
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

  // Dedicated content container — see the same note in renderMatrix() for why
  // this can't be a direct wrap.innerHTML assignment (would drop the header).
  const content = document.createElement("div");
  content.innerHTML = `
    <p class="sub">Plotted on real OpenStreetMap data. Dot color = risk level. Click a marker for details.</p>
    <div id="leaflet-map" class="leaflet-map"></div>
    ${detailPanel}
    <div class="summary-bar" style="margin-top:14px;">
      <div class="summary-chip risk-high">● High risk</div>
      <div class="summary-chip risk-medium">● Medium risk</div>
      <div class="summary-chip risk-low">● Low risk</div>
    </div>
  `;
  wrap.appendChild(content);

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
  wrap.appendChild(renderViewHeader("Feedback", "Which feature requests come up most, and from how much at-risk ARR — for the product team."));

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
    const empty = document.createElement("p");
    empty.className = "sub";
    empty.textContent = "No feature requests recorded for the currently filtered accounts.";
    wrap.appendChild(empty);
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
  const scrollWrap = document.createElement("div");
  scrollWrap.className = "table-scroll";
  scrollWrap.appendChild(table);
  wrap.appendChild(scrollWrap);
  const hint = document.createElement("p");
  hint.className = "table-scroll-hint";
  hint.textContent = "← Scroll horizontally to see all columns →";
  wrap.appendChild(hint);

  return wrap;
}

function renderFeedbackSortHeader(label, key) {
  const th = document.createElement("th");
  th.className = "sortable";
  th.tabIndex = 0;
  th.textContent = label + (state.feedbackSort.key === key ? (state.feedbackSort.dir === "asc" ? " ▲" : " ▼") : "");
  th.setAttribute("aria-sort", state.feedbackSort.key === key ? (state.feedbackSort.dir === "asc" ? "ascending" : "descending") : "none");
  const doSort = () => {
    if (state.feedbackSort.key === key) state.feedbackSort.dir = state.feedbackSort.dir === "asc" ? "desc" : "asc";
    else { state.feedbackSort.key = key; state.feedbackSort.dir = "desc"; }
    render();
  };
  th.addEventListener("click", doSort);
  th.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doSort(); } });
  return th;
}

// Co-PO review, round 1 — Point 3: a deterministic Attention Queue — the
// three most urgent accounts in the current filter, ranked purely by the
// existing computePriorityScore() (risk + ARR + renewal proximity +
// engagement recency, see src/scoring.js). No new formula, no AI, nothing
// beyond fields computePriorityScore already returns. Clicking an item opens
// the same Portfolio detail row the table rows / Matrix / Team links do.
function renderAttentionQueue(list) {
  const box = document.createElement("div");
  box.className = "attention-queue";

  const top = list
    .map(account => ({ account, priority: computePriorityScore(account) }))
    .sort((a, b) => b.priority.score - a.priority.score)
    .slice(0, 3);

  const items = top.map(({ account, priority }) => {
    const renewalText = priority.daysToRenewal <= 0
      ? "Renewal overdue"
      : `Renewal in ${priority.daysToRenewal}d`;
    return `
      <li class="attention-item" data-account-id="${account.accountId}" tabindex="0" role="button" aria-label="Open details for ${escapeHtml(account.accountName)}">
        <span class="status-pill risk-${priority.health.riskCategory}">${RISK_LABEL[priority.health.riskCategory]}</span>
        <span class="attention-item-body">
          <span class="attention-name">${escapeHtml(account.accountName)}</span>
          <span class="attention-meta">${escapeHtml(renewalText)} · Priority ${priority.score}/100</span>
        </span>
      </li>
    `;
  }).join("");

  box.innerHTML = `
    <h4>Attention Queue</h4>
    <p class="sub">Top ${top.length} by priority score — risk, ARR, renewal timing, and engagement, already combined.</p>
    ${top.length ? `<ol class="attention-list">${items}</ol>` : `<p class="sub">No accounts match the current filters.</p>`}
  `;

  box.querySelectorAll(".attention-item").forEach(item => {
    const openDetail = () => {
      const id = item.dataset.accountId;
      state.expanded = id;
      render();
      document.getElementById(`detail-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    item.addEventListener("click", openDetail);
    item.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(); } });
  });

  return box;
}

function renderPortfolioAsk(list) {
  const box = document.createElement("div");
  box.className = "team-priority-box ai-copilot-panel portfolio-ask-box";
  const pa = state.portfolioAsk;
  const scopeLabel = state.filters.csm !== "all" || state.filters.region !== "all" || state.filters.risk !== "all" || state.filters.expansion !== "all" || state.filters.trend !== "all"
    ? `across the ${list.length} account(s) matching your current filters`
    : `across all ${list.length} accounts`;
  box.innerHTML = `
    ${aiCopilotHeader("Ask about this Portfolio")}
    <p class="sub">Answers are scoped to what's currently on screen — ${escapeHtml(scopeLabel)}. Change the filters above to change the scope.</p>
    <div class="ai-ask">
      <input type="text" class="portfolio-ask-input" placeholder="e.g. list all champion contacts, or which accounts have a QBR this month…" value="${escapeHtml(pa.question)}" />
      <button class="ai-ask-btn portfolio-ask-btn">Ask</button>
    </div>
    <div class="portfolio-ask-answer"></div>
  `;

  const input = box.querySelector(".portfolio-ask-input");
  const btn = box.querySelector(".portfolio-ask-btn");
  const submit = () => submitPortfolioAsk(input.value, list.map(a => a.accountId));
  btn.addEventListener("click", submit);
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });

  const answerBox = box.querySelector(".portfolio-ask-answer");
  if (pa.status === "loading") {
    answerBox.innerHTML = `<p class="sub">Loading…</p>`;
  } else if (pa.status === "error") {
    answerBox.innerHTML = `<p class="ai-unavailable">Answer unavailable (${escapeHtml(pa.error)}).</p>`;
    const retryBtn = document.createElement("button");
    retryBtn.className = "ai-load-btn";
    retryBtn.textContent = "Try Again";
    retryBtn.addEventListener("click", submit);
    answerBox.appendChild(retryBtn);
  } else if (pa.status === "done") {
    answerBox.innerHTML = `<p class="ai-answer">${escapeHtml(pa.answer)}</p>`;
  }

  return box;
}

async function submitPortfolioAsk(question, accountIds) {
  const q = String(question || "").trim();
  if (!q) return;
  state.portfolioAsk = { status: "loading", question: q, answer: "", error: "" };
  render();
  try {
    const data = await askAboutPortfolio(accountIds, q);
    state.portfolioAsk = { status: "done", question: q, answer: data.answer, error: "" };
  } catch (e) {
    state.portfolioAsk = { status: "error", question: q, answer: "", error: e.message };
  }
  render();
}

function renderPriorityBox(scopeCsmId, title) {
  const box = document.createElement("div");
  box.className = "team-priority-box ai-copilot-panel";
  box.innerHTML = `${aiCopilotHeader(title)}<div class="team-priority-body"></div>`;
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
    const retryBtn = document.createElement("button");
    retryBtn.className = "ai-load-btn";
    retryBtn.textContent = scopeCsmId ? "Try Again" : "Try Again";
    retryBtn.addEventListener("click", () => loadTeamPriority(scopeCsmId));
    body.appendChild(retryBtn);
  } else if (tp.status === "done") {
    const priorities = tp.data.priorities || [];
    const patternAlert = tp.data.patternAlert
      ? `<p class="pattern-alert"><strong>Pattern across these accounts:</strong> ${escapeHtml(tp.data.patternAlert)}</p>`
      : "";
    body.innerHTML = `
      ${patternAlert}
      <ol class="priority-list">
        ${priorities.map(p => `
          <li class="priority-item">
            <div class="priority-item-head">
              <span class="status-pill risk-${p.riskCategory}">${RISK_LABEL[p.riskCategory] ?? p.riskCategory}</span>
              <button class="priority-account-link" data-account-id="${p.accountId}">${escapeHtml(p.accountName)}</button>
              <span class="sub">priority ${p.priorityScore}/100</span>
            </div>
            ${p.synthesis ? `<p class="sub">${escapeHtml(p.synthesis)}</p>` : ""}
            ${p.nextBestAction ? `
              <div class="nba-box">
                <p class="nba-label risk-text-${p.nextBestAction.category === "growth" ? "low" : "high"}">${p.nextBestAction.category === "growth" ? "Next Best Action — Growth" : "Next Best Action — Risk Mitigation"}</p>
                <p><strong>${escapeHtml(p.nextBestAction.action)}</strong></p>
                <p class="sub">${escapeHtml(p.nextBestAction.rationale)}</p>
                <div class="nba-approval" data-account-id="${p.accountId}"></div>
              </div>
            ` : ""}
          </li>
        `).join("")}
      </ol>
    `;

    body.querySelectorAll(".priority-account-link").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.accountId;
        const acc = state.accounts.find(a => a.accountId === id);
        if (acc) { state.filters.csm = acc.csmId; document.getElementById("filter-csm").value = acc.csmId; }
        state.view = "portfolio";
        state.expanded = id;
        render();
        document.getElementById(`detail-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    priorities.forEach(p => {
      if (!p.nextBestAction) return;
      const el = body.querySelector(`.nba-approval[data-account-id="${p.accountId}"]`);
      if (el) renderApprovalControl(el, p.accountId, p.nextBestAction);
    });

    const reloadBtn = document.createElement("button");
    reloadBtn.className = "reload-link";
    reloadBtn.textContent = "↻ Reload Prioritization";
    reloadBtn.addEventListener("click", () => loadTeamPriority(scopeCsmId));
    body.appendChild(reloadBtn);
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
  wrap.appendChild(renderViewHeader("Team", "Weekly priorities across the whole team, and per-CSM portfolio health at a glance."));
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
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View portfolio for ${csm.name}`);
    card.innerHTML = `
      <div class="csm-card-head">
        <span class="csm-avatar" aria-hidden="true">${escapeHtml(initialsOf(csm.name))}</span>
        <div>
          <h3>${escapeHtml(csm.name)}</h3>
          <p class="sub">${escapeHtml(csm.regionCoverage)} · ${accs.length} Accounts</p>
        </div>
      </div>
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
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToCsmPortfolio(csm.csmId); }
    });
    grid.appendChild(card);
  });
  return wrap;
}

// Sprint 04 — Trust & Governance UI: a purely local, static view (no new AI
// call, no new API endpoint). All text here is fixed copy, not account data,
// so it's written directly rather than through escapeHtml(). The reference
// date is read from src/scoring.js's REFERENCE_DATE_ISO — the same constant
// the scoring calculations themselves use — so this can never drift from it.
function renderTrust() {
  const wrap = document.createElement("div");
  wrap.className = "trust-view";
  wrap.innerHTML = `
    <section class="trust-hero">
      <p class="trust-eyebrow">Trust &amp; Governance</p>
      <h2>Human-led AI, explainable by design</h2>
      <p class="sub trust-hero-sub">How fragmented customer signals become transparent priorities and controlled actions in this demo.</p>
      <p class="trust-refdate">Reference date for this demo: <strong>${fmtDate(REFERENCE_DATE_ISO)}</strong> — a fixed snapshot, not a live feed or a production forecast.</p>
    </section>

    <section class="trust-section">
      <h3>How it works</h3>
      <ol class="trust-flow">
        <li class="trust-flow-step"><span class="trust-flow-num">1</span><span class="trust-flow-label">Customer signals</span></li>
        <li class="trust-flow-arrow" aria-hidden="true">→</li>
        <li class="trust-flow-step"><span class="trust-flow-num">2</span><span class="trust-flow-label">Rule-based scores</span></li>
        <li class="trust-flow-arrow" aria-hidden="true">→</li>
        <li class="trust-flow-step"><span class="trust-flow-num">3</span><span class="trust-flow-label">AI explanation</span></li>
        <li class="trust-flow-arrow" aria-hidden="true">→</li>
        <li class="trust-flow-step"><span class="trust-flow-num">4</span><span class="trust-flow-label">Human review</span></li>
        <li class="trust-flow-arrow" aria-hidden="true">→</li>
        <li class="trust-flow-step"><span class="trust-flow-num">5</span><span class="trust-flow-label">Logged action</span></li>
      </ol>
    </section>

    <section class="trust-section">
      <h3>Who does what</h3>
      <div class="trust-cards">
        <div class="trust-card trust-card-rules">
          <p class="trust-card-eyebrow">Calculated by rules</p>
          <ul>
            <li>Health Score — 8 weighted criteria</li>
            <li>Priority ranking</li>
            <li>Expansion Score</li>
            <li>Risk category (High / Medium / Low)</li>
          </ul>
        </div>
        <div class="trust-card trust-card-ai">
          <p class="trust-card-eyebrow">AI-assisted</p>
          <ul>
            <li>Plain-English narrative</li>
            <li>Next Best Action suggestion</li>
            <li>Answers to free-text questions</li>
            <li>Portfolio pattern alerts</li>
          </ul>
        </div>
        <div class="trust-card trust-card-human">
          <p class="trust-card-eyebrow">Human-controlled</p>
          <ul>
            <li>Review &amp; edit before sending</li>
            <li>Approve or cancel any action</li>
            <li>Nothing reaches a customer unreviewed</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="trust-section">
      <h3>Guardrails &amp; limits</h3>
      <div class="trust-guardrail-grid">
        <div class="trust-guardrail-item">
          <span class="status-pill risk-high">Hard rule</span>
          <p>High-risk accounts never receive a server-side Growth action — enforced after every AI call, not just prompted for.</p>
        </div>
        <div class="trust-guardrail-item">
          <span class="status-pill risk-medium">Evidence, not probability</span>
          <p><strong>Evidence Confidence</strong> reflects the coverage, recency, and diversity of the supporting evidence — not the probability that the AI is right.</p>
        </div>
        <div class="trust-guardrail-item">
          <span class="status-pill risk-low">Human in the loop</span>
          <p>Every customer-facing action is reviewed and can be edited by a CSM before it is sent — an AI draft is never sent unreviewed.</p>
        </div>
        <div class="trust-guardrail-item">
          <span class="status-pill neutral">Logged, not silent</span>
          <p>Approved actions are sent through an authenticated workflow and logged. A failed send is never retried automatically.</p>
        </div>
      </div>
      <p class="sub trust-footnote">All accounts and customer data shown anywhere in this demo are entirely fictional. This is a snapshot at a fixed reference date, not a live or predictive system.</p>
    </section>

    <section class="trust-section">
      <h3>EU AI Act readiness</h3>
      <p class="sub trust-readiness-intro">Vorläufige, interne Readiness-Einschätzung für einen möglichen Pilotbetrieb — keine Rechtsberatung, keine Compliance-Zertifizierung. Details: <a href="docs/12_eu_ai_act_readiness.md">docs/12_eu_ai_act_readiness.md</a>.</p>
      <div class="trust-readiness-grid">
        <div class="trust-readiness-item">
          <span class="status-pill risk-low">Umgesetzt</span>
          <p><strong>AI-Inhalte gekennzeichnet</strong> — KI-generierte Inhalte sind in der Oberfläche durchgängig als „AI-assisted" markiert, getrennt von regelbasierten Werten.</p>
        </div>
        <div class="trust-readiness-item">
          <span class="status-pill risk-low">Umgesetzt</span>
          <p><strong>Human Review vor Aktionen</strong> — jede kundengerichtete Aktion durchläuft ein Review-Formular; nichts wird ungeprüft versendet.</p>
        </div>
        <div class="trust-readiness-item">
          <span class="status-pill risk-low">Umgesetzt</span>
          <p><strong>Nachvollziehbare regelbasierte Scores</strong> — Health-, Priority- und Expansion-Score folgen festen Kriterien, nicht der KI.</p>
        </div>
        <div class="trust-readiness-item">
          <span class="status-pill risk-low">Umgesetzt</span>
          <p><strong>Guardrails und Validierung</strong> — High-Risk-Accounts erhalten serverseitig nie eine Growth-Aktion; Eingaben werden vor dem Absenden validiert.</p>
        </div>
        <div class="trust-readiness-item">
          <span class="status-pill risk-low">Umgesetzt</span>
          <p><strong>Fiktive Demo-Daten</strong> — alle Accounts und Vorgänge in dieser Demo sind frei erfunden.</p>
        </div>
        <div class="trust-readiness-item">
          <span class="status-pill risk-medium">Teilweise</span>
          <p><strong>Action Logging</strong> — freigegebene Aktionen werden protokolliert; ein durchsuchbares Audit-Log fehlt noch.</p>
        </div>
        <div class="trust-readiness-item">
          <span class="status-pill neutral">Pilot-Gate</span>
          <p><strong>AI-Literacy / Betreiberrollen</strong> — vor einem Pilotbetrieb zu dokumentieren.</p>
        </div>
        <div class="trust-readiness-item">
          <span class="status-pill neutral">Pilot-Gate</span>
          <p><strong>Monitoring, Incident- und Abschaltprozess</strong> — vor einem Pilotbetrieb zu ergänzen.</p>
        </div>
        <div class="trust-readiness-item">
          <span class="status-pill neutral">Pilot-Gate</span>
          <p><strong>DSGVO-/DPIA-Prüfung</strong> — bei Einsatz mit echten Kundendaten erforderlich.</p>
        </div>
      </div>
      <p class="sub trust-footnote">Vorläufige Einordnung: wahrscheinlich nicht-hochriskanter interner B2B-Entscheidungsassistent, vorbehaltlich einer Prüfung des Einsatzkontexts. Offizielle Quelle: <a href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj">EU AI Act, Verordnung (EU) 2024/1689</a> (Art. 4, 26, 50).</p>
    </section>

    <section class="trust-section">
      <h3>Roadmap</h3>
      <div class="trust-roadmap-grid">
        <div class="trust-roadmap-item">
          <span class="trust-roadmap-badge trust-roadmap-next">Next — not yet active</span>
          <p>EBR / QBR Prep</p>
        </div>
        <div class="trust-roadmap-item">
          <span class="trust-roadmap-badge trust-roadmap-later">Later — not yet active</span>
          <p>Additional data integrations &amp; read-only connectors</p>
        </div>
      </div>
    </section>
  `;
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
