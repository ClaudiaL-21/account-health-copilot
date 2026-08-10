import { computeHealthScore, computeExpansionScore, daysSince, daysFromToday } from "./scoring.js";
import { fetchAccountInsight, askAboutAccount, fetchTeamPriority } from "./ai.js";

const RISK_LABEL = { high: "Hoch", medium: "Mittel", low: "Niedrig" };
const fmtUSD = n => "$" + n.toLocaleString("en-US");
const fmtDate = iso => new Date(iso).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "2-digit" });

let state = {
  accounts: [], csms: [], view: "portfolio",
  filters: { csm: "all", region: "all", risk: "all" },
  sort: { key: "score", dir: "asc" }, expanded: null, // asc = lowest Health Score (most concerning) first
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
    return { ...acc, health, expansion };
  });
  bindControls();
  render();
}

function bindControls() {
  document.getElementById("tab-portfolio").addEventListener("click", () => { state.view = "portfolio"; render(); });
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
}

function getFilteredAccounts() {
  return state.accounts.filter(a =>
    (state.filters.csm === "all" || a.csmId === state.filters.csm) &&
    (state.filters.region === "all" || a.region === state.filters.region) &&
    (state.filters.risk === "all" || a.health.riskCategory === state.filters.risk)
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
  document.getElementById("tab-team").classList.toggle("active", state.view === "team");
  document.getElementById("filters").style.display = state.view === "portfolio" ? "flex" : "none";

  const root = document.getElementById("app");
  root.innerHTML = "";
  if (state.view === "portfolio") root.appendChild(renderPortfolio());
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
    <div class="summary-chip risk-high">${counts.high} Hoch</div>
    <div class="summary-chip risk-medium">${counts.medium} Mittel</div>
    <div class="summary-chip risk-low">${counts.low} Niedrig</div>
    <div class="summary-chip neutral">${list.length} Accounts gesamt</div>
  `;
  wrap.appendChild(summary);

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
  const th2 = document.createElement("th"); th2.textContent = "Risiko"; headRow.appendChild(th2);
  headRow.appendChild(renderSortHeader("Expansion", "expansion"));
  ["Letzte Interaktion", "Nächstes QBR"].forEach(h => { const th = document.createElement("th"); th.textContent = h; headRow.appendChild(th); });
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
      <td><span class="score-num">${acc.health.score}</span></td>
      <td><span class="status-pill risk-${acc.health.riskCategory}">${RISK_LABEL[acc.health.riskCategory]}</span></td>
      <td>${acc.expansion.score}</td>
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

  const modules = acc.licensedModules.map(m => `<li>${escapeHtml(m.name)} — ${m.tier} (${m.licensedUsers} User)</li>`).join("");
  const whitespace = acc.expansion.whitespaceModules.length
    ? `<p class="sub">Ungenutzte Module (Expansion-Whitespace): ${acc.expansion.whitespaceModules.join(", ")}</p>`
    : `<p class="sub">Alle Module lizenziert.</p>`;

  const artifacts = acc.freeTextArtifacts.map(a => `
    <div class="artifact">
      <span class="artifact-type">${a.type}</span> · <span class="sub">${fmtDate(a.date)}</span>
      <p>"${escapeHtml(a.text)}"</p>
    </div>
  `).join("");

  div.innerHTML = `
    <div class="detail-grid">
      <div>
        <h4>Score-Aufschlüsselung</h4>
        <p class="sub">Risikopunkte pro Kriterium — Summe wird vom Health Score (100) abgezogen. Health Score ${acc.health.score} = 100 − ${Math.round(acc.health.criteria.reduce((s, c) => s + c.points, 0))} Risikopunkte.</p>
        <table class="breakdown-table"><tbody>${criteriaRows}</tbody></table>
      </div>
      <div>
        <h4>Vertrag & Lizenzierung</h4>
        <p>${acc.contract.type === "multi-year" ? `Mehrjahresvertrag (${acc.contract.termYears} Jahre)` : "Einzeljahresvertrag"}, seit ${fmtDate(acc.contract.startDate)}</p>
        <ul>${modules}</ul>
        ${whitespace}
        <h4>Beziehung</h4>
        <p>Champion: ${escapeHtml(acc.relationship.championName)} (${acc.relationship.championStatus})<br/>
        Exec-Sponsor: ${acc.relationship.execSponsorEngaged ? "engagiert" : "nicht engagiert"}<br/>
        Letztes QBR: ${fmtDate(acc.relationship.lastQBRDate)}</p>
        <h4>Notizen (Support/Kommunikation)</h4>
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
    <h4>KI-Insights <span class="ai-disclaimer">— KI-generiert, kann ungenau sein, vor Handeln prüfen</span></h4>
    <div class="ai-insight-body"></div>
    <div class="ai-ask">
      <input type="text" class="ai-ask-input" placeholder="Frage zu diesem Account stellen…" value="${escapeHtml(ask.question || "")}" />
      <button class="ai-ask-btn">Fragen</button>
    </div>
    <div class="ai-ask-answer"></div>
  `;

  const body = container.querySelector(".ai-insight-body");
  if (insight.status === "idle") {
    const btn = document.createElement("button");
    btn.className = "ai-load-btn";
    btn.textContent = "KI-Insights laden";
    btn.addEventListener("click", () => loadInsight(acc.accountId));
    body.appendChild(btn);
  } else if (insight.status === "loading") {
    body.innerHTML = `<p class="sub">Lädt…</p>`;
  } else if (insight.status === "error") {
    body.innerHTML = `<p class="ai-unavailable">KI-Insights nicht verfügbar (${escapeHtml(insight.error)}). Berechneter Score bleibt unverändert gültig.</p>`;
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
  if (ask.status === "loading") answerBox.innerHTML = `<p class="sub">Lädt…</p>`;
  else if (ask.status === "error") answerBox.innerHTML = `<p class="ai-unavailable">Antwort nicht verfügbar (${escapeHtml(ask.error)}).</p>`;
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

function renderTeam() {
  const wrap = document.createElement("div");

  const priorityBox = document.createElement("div");
  priorityBox.className = "team-priority-box";
  priorityBox.innerHTML = `<h4>KI-Wochenpriorisierung <span class="ai-disclaimer">— KI-generiert, kann ungenau sein, vor Handeln prüfen</span></h4><div class="team-priority-body"></div>`;
  const body = priorityBox.querySelector(".team-priority-body");

  if (state.teamPriority.status === "idle") {
    const btn = document.createElement("button");
    btn.className = "ai-load-btn";
    btn.textContent = "KI-Priorisierung für das gesamte Team laden";
    btn.addEventListener("click", loadTeamPriority);
    body.appendChild(btn);
  } else if (state.teamPriority.status === "loading") {
    body.innerHTML = `<p class="sub">Lädt…</p>`;
  } else if (state.teamPriority.status === "error") {
    body.innerHTML = `<p class="ai-unavailable">Nicht verfügbar (${escapeHtml(state.teamPriority.error)}).</p>`;
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
        <div class="summary-chip risk-high">${counts.high} Hoch</div>
        <div class="summary-chip risk-medium">${counts.medium} Mittel</div>
        <div class="summary-chip risk-low">${counts.low} Niedrig</div>
      </div>
      <div class="csm-stats">
        <div><span class="stat-num">${fmtUSD(arrAtRisk)}</span><span class="stat-label">ARR bei Hochrisiko-Accounts</span></div>
        <div><span class="stat-num">${upcomingRenewals}</span><span class="stat-label">Renewals in 90 Tagen</span></div>
        <div><span class="stat-num">${overdueQBRs}</span><span class="stat-label">QBR überfällig</span></div>
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
