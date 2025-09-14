// public/league.js (patched)
// Injects responsive CSS, robust DOM fallback, renders table rows correctly.
// Assumes shared-ui.js exists and is importable.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadSharedUI } from "./shared-ui.js";

/* ========== CONFIG ========== */
const SUPABASE_URL = (window._env_ && window._env_.SUPABASE_URL) || window.PROJECT_URL || "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY =
  (window._env_ && window._env_.SUPABASE_ANON_KEY) || window.ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========== UTILS ========== */
const $ = (id) => document.getElementById(id);
const ensureEl = (id, tag = "div", parentSelector = "#app", attrs = {}) => {
  let el = document.getElementById(id);
  if (el) return el;
  const parent = document.querySelector(parentSelector) || document.body;
  el = document.createElement(tag);
  el.id = id;
  Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
  parent.appendChild(el);
  return el;
};
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"'`]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c] || c)
  );
}
const safeNum = (v) => (v === null || v === undefined ? 0 : v);
const formatNRR = (n) => {
  if (n === null || n === undefined) return "0.000";
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(3) : "0.000";
};

/* ========== Inject CSS (automatic) ========== */
function injectLeagueStyles() {
  if (document.getElementById("league-inline-styles")) return;
  const s = document.createElement("style");
  s.id = "league-inline-styles";
  s.textContent = `
/* League point-table tuning (injected) */
#pointsTable { width:100%; border-collapse:collapse; table-layout:fixed; }
#pointsTable thead th { padding:8px 6px; font-size:13px; color:#9aa5bf; font-weight:600; }
#pointsTable tbody td { padding:8px 6px; font-size:13px; vertical-align:middle; color:#e6eef8; }
#pointsTable th:nth-child(1), #pointsTable td:nth-child(1) { width:42px; text-align:left; padding-left:10px; }
#pointsTable th:nth-child(2), #pointsTable td:nth-child(2) { width:34px; text-align:center; }
#pointsTable th:nth-child(4), #pointsTable td:nth-child(4),
#pointsTable th:nth-child(5), #pointsTable td:nth-child(5),
#pointsTable th:nth-child(6), #pointsTable td:nth-child(6),
#pointsTable th:nth-child(7), #pointsTable td:nth-child(7),
#pointsTable th:nth-child(8), #pointsTable td:nth-child(8),
#pointsTable th:nth-child(9), #pointsTable td:nth-child(9) {
  width:48px; text-align:center; padding:8px 6px;
}
#pointsTable th:nth-child(3), #pointsTable td:nth-child(3) {
  text-align:left; max-width:220px; overflow:hidden; text-overflow:ellipsis;
}
#pointsTable td img { width:22px; height:22px; border-radius:6px; object-fit:cover; display:block; margin:0 auto; }
.team-link { display:inline-block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:400; font-size:13px; color:inherit; text-decoration:none; }
@media (max-width:480px) {
  #pointsTable th:nth-child(3), #pointsTable td:nth-child(3) { max-width:140px; }
  #pointsTable th:nth-child(4), #pointsTable td:nth-child(4),
  #pointsTable th:nth-child(5), #pointsTable td:nth-child(5),
  #pointsTable th:nth-child(6), #pointsTable td:nth-child(6),
  #pointsTable th:nth-child(7), #pointsTable td:nth-child(7),
  #pointsTable th:nth-child(8), #pointsTable td:nth-child(8),
  #pointsTable th:nth-child(9), #pointsTable td:nth-child(9) {
    width:44px; font-size:12px; padding:6px 4px;
  }
  .team-link { font-size:12px; }
}
`;
  document.head.appendChild(s);
}
injectLeagueStyles();

/* ========== Ensure DOM structure (create safe fallbacks) ========== */
function ensureStructure() {
  ensureEl("app", "div", "body");

  // top area
  ensureEl("leagueName", "div", "#app");
  ensureEl("leagueSearch", "input", "#app", { placeholder: "Search league by name" });
  ensureEl("searchBtn", "button", "#app");
  ensureEl("myLeagueBtn", "button", "#app");

  // tabs
  ensureEl("tabPoints", "button", "#app");
  ensureEl("tabStats", "button", "#app");

  // panels
  const pointsCard = ensureEl("pointsCard", "div", "#app");
  const statsCard = ensureEl("statsCard", "div", "#app");
  statsCard.style.display = "none";

  // points table
  let table = $("pointsTable");
  if (!table) {
    table = document.createElement("table");
    table.id = "pointsTable";
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    pointsCard.appendChild(table);
  }
  if (!table.querySelector("tbody")) table.appendChild(document.createElement("tbody"));

  // fallbacks
  ensureEl("pointsList", "div", "#pointsCard");
  ensureEl("pointsEmpty", "div", "#pointsCard");
}
ensureStructure();

/* ========== State ========== */
let currentLeagueId = null;
let myTeamId = null;

/* ========== Header / Table ========== */
function ensurePointsHeader() {
  const table = $("pointsTable");
  if (!table) return;
  let thead = table.querySelector("thead");
  if (!thead) {
    thead = document.createElement("thead");
    table.insertBefore(thead, table.firstChild);
  }
  thead.innerHTML = `
    <tr>
      <th style="padding:8px 6px;text-align:left;">Pos</th>
      <th style="padding:8px 6px;text-align:center;">Logo</th>
      <th style="padding:8px 6px;text-align:left;min-width:140px;">Team</th>
      <th style="padding:8px 6px;text-align:center">M</th>
      <th style="padding:8px 6px;text-align:center">W</th>
      <th style="padding:8px 6px;text-align:center">T</th>
      <th style="padding:8px 6px;text-align:center">L</th>
      <th style="padding:8px 6px;text-align:center" class="stat-p">P</th>
      <th style="padding:8px 6px;text-align:center" class="stat-nrr">NRR</th>
    </tr>
  `;
}

/* ========== Render Points ========== */
function renderPointsRows(rows) {
  ensurePointsHeader();
  const table = $("pointsTable");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="padding:12px;color:#9aa5bf">No teams found in this league.</td></tr>`;
    return;
  }

  rows.forEach((r, idx) => {
    const pos = idx + 1;
    const teamId = r.team_id;
    const teamName = r.team_name || r.team || "Unknown";
    const logo = r.logo_url || "/assets/logo.png";
    const m = safeNum(r.m ?? r.matches_played);
    const w = safeNum(r.w ?? r.wins);
    const t = safeNum(r.t ?? r.ties);
    const l = safeNum(r.l ?? r.losses);
    const p = safeNum(r.p ?? r.points);
    const nrr = formatNRR(r.nrr);

    const tr = document.createElement("tr");
    tr.style.height = "56px";
    tr.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
    tr.innerHTML = `
      <td style="padding:8px 10px;white-space:nowrap">${pos}</td>
      <td style="padding:6px;text-align:center"><img src="${escapeHtml(logo)}" alt="logo" onerror="this.src='assets/logo.png'"></td>
      <td style="padding:8px 10px;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        <a class="team-link" href="public-profile.html?team_id=${encodeURIComponent(teamId)}">${escapeHtml(teamName)}</a>
      </td>
      <td style="text-align:center">${m}</td>
      <td style="text-align:center">${w}</td>
      <td style="text-align:center">${t}</td>
      <td style="text-align:center">${l}</td>
      <td style="text-align:center">${p}</td>
      <td style="text-align:center">${nrr}</td>
    `;
    tbody.appendChild(tr);
  });
}

  // if no table, fallback to list rendering (old approach)
  const list = document.getElementById("pointsList");
  if (!list) return;
  list.innerHTML = "";
  if (!rows || rows.length === 0) {
    document.getElementById("pointsEmpty").style.display = "block";
    return;
  } else {
    document.getElementById("pointsEmpty").style.display = "none";
  }
  rows.forEach((r, idx) => {
    const teamId = r.team_id;
    const teamName = r.team_name || r.team || "Unknown";
    const logo = r.logo_url || "/assets/logo.png";
    const m = Number(r.m ?? r.matches_played ?? 0);
    const w = Number(r.w ?? r.wins ?? 0);
    const t = Number(r.t ?? r.ties ?? 0);
    const l = Number(r.l ?? r.losses ?? 0);
    const p = Number(r.p ?? r.points ?? 0);
    const nrr = (r.nrr ?? 0);
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="col-pos">${idx+1}</div>
      <div class="col-logo"><img src="${escapeHtml(logo)}" class="team-logo" onerror="this.src='assets/logo.png'"/></div>
      <div class="col-name"><span class="team-name">${escapeHtml(teamName)}</span></div>
      <div class="col-stat">${m}</div>
      <div class="col-stat">${w}</div>
      <div class="col-stat">${t}</div>
      <div class="col-stat">${l}</div>
      <div class="col-stat stat-p">${p}</div>
      <div class="col-stat stat-nrr">${Number(nrr).toFixed(3)}</div>
    `;
    row.addEventListener("click", () => {
      const targetTeam = (typeof myTeamId === "string" && myTeamId) ? myTeamId : teamId;
      if (targetTeam) window.location.href = `public-profile.html?team_id=${encodeURIComponent(targetTeam)}`;
      else window.location.href = `public-profile.html?team_id=${encodeURIComponent(teamId)}`;
    });
    list.appendChild(row);
  });
}

/* ========== Fallback teams ========== */
async function fallbackRenderTeams(leagueId) {
  try {
    const { data: teams, error } = await supabase.from("teams").select("id,team_name,logo_url").eq("league_id", leagueId);
    if (error || !teams || teams.length === 0) {
      renderPointsRows([]);
      return;
    }
    const rows = teams.map((t) => ({
      team_id: t.id,
      team_name: t.team_name,
      logo_url: t.logo_url,
      m: 0, w: 0, t: 0, l: 0, p: 0, nrr: 0
    }));
    renderPointsRows(rows);
  } catch (err) {
    console.error("fallbackRenderTeams error", err);
    renderPointsRows([]);
  }
}

/* ========== Fetch & Render Standings ========== */
async function fetchAndRenderStandings(leagueId) {
  if (!leagueId) {
    renderPointsRows([]);
    return;
  }
  try {
    const { data, error } = await supabase.rpc("get_league_standings", { p_league_id: leagueId });
    if (error) {
      console.error("get_league_standings RPC error", error);
      await fallbackRenderTeams(leagueId);
      return;
    }
    if (!data || data.length === 0) {
      await fallbackRenderTeams(leagueId);
      return;
    }
    const normalized = data.map((r) => ({
      team_id: r.team_id,
      team_name: r.team_name || r.team,
      logo_url: r.logo_url,
      m: r.m ?? r.matches_played ?? 0,
      w: r.w ?? r.wins ?? 0,
      t: r.t ?? r.ties ?? 0,
      l: r.l ?? r.losses ?? 0,
      p: r.p ?? r.points ?? 0,
      nrr: r.nrr ?? 0
    }));
    renderPointsRows(normalized);
  } catch (err) {
    console.error("fetchAndRenderStandings exception", err);
    await fallbackRenderTeams(leagueId);
  }
}

/* ========== Statistics ========== */
function normalizePlayerRow(r) {
  return {
    player_id: r.player_id || r.id || null,
    player_name: r.player_name || r.name || r.player || "",
    team_id: r.team_id || r.team || null,
    team_name: r.team_name || r.team || "",
    runs: r.runs ?? r.runs_scored ?? 0,
    wickets: r.wickets ?? r.wicket_count ?? 0,
    image_url: r.image_url || r.image || r.avatar || ""
  };
}

function renderStatisticsIntoStatsCard(batters, bowlers) {
  const statsCard = $("statsCard") || ensureEl("statsCard", "div", "#app");
  statsCard.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.gap = "12px";
  wrap.style.flexWrap = "wrap";

  const makeSection = (title, items, isBatter) => {
    const s = document.createElement("div");
    s.style.minWidth = "220px";
    const h = document.createElement("h4");
    h.innerText = title;
    h.style.margin = "6px 0";
    s.appendChild(h);
    if (!items || items.length === 0) {
      const p = document.createElement("div");
      p.style.color = "#9aa5bf";
      p.innerText = "No data yet";
      s.appendChild(p);
      return s;
    }
    items.forEach((it) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.padding = "6px 0";
      row.innerHTML = `
        <img src="${escapeHtml(it.image_url || '/assets/logo.png')}" style="width:36px;height:36px;border-radius:6px;object-fit:cover"/>
        <div style="flex:1;min-width:0">
          <div style="font-weight:400;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.player_name)}</div>
          <div style="font-size:12px;color:#9aa5bf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.team_name)}</div>
        </div>
        <div style="font-weight:600">${isBatter ? safeNum(it.runs) : safeNum(it.wickets)}</div>
      `;
      row.addEventListener("click", () => {
        const gotoTeam = it.team_id || myTeamId;
        if (gotoTeam) window.location.href = `public-profile.html?team_id=${gotoTeam}&player_id=${it.player_id || ''}`;
      });
      s.appendChild(row);
    });
    return s;
  };

  wrap.appendChild(makeSection("Top 5 Batters", batters, true));
  wrap.appendChild(makeSection("Top 5 Bowlers", bowlers, false));
  statsCard.appendChild(wrap);
}

async function fetchAndRenderStatistics(leagueId) {
  const statsCard = $("statsCard") || ensureEl("statsCard", "div", "#app");
  statsCard.innerHTML = "";
  if (!leagueId) {
    renderStatisticsIntoStatsCard([], []);
    return;
  }
  try {
    const { data, error } = await supabase.rpc("get_league_statistics", { p_league_id: leagueId });
    if (error) {
      console.error("get_league_statistics RPC error", error);
      renderStatisticsIntoStatsCard([], []);
      return;
    }

    if (Array.isArray(data)) {
      const bat = data.filter((r) => r.kind === "batter").slice(0, 5).map(normalizePlayerRow);
      const bowl = data.filter((r) => r.kind === "bowler").slice(0, 5).map(normalizePlayerRow);
      renderStatisticsIntoStatsCard(bat, bowl);
    } else if (data && typeof data === "object") {
      const bat = (data.batters || data.bat || []).slice(0, 5).map(normalizePlayerRow);
      const bowl = (data.bowlers || data.bowl || []).slice(0, 5).map(normalizePlayerRow);
      renderStatisticsIntoStatsCard(bat, bowl);
    } else {
      renderStatisticsIntoStatsCard([], []);
    }
  } catch (err) {
    console.error("fetchAndRenderStatistics exception", err);
    renderStatisticsIntoStatsCard([], []);
  }
}

/* ========== UI: Search & Tabs ========== */
function setupLeagueSearch() {
  const searchInput = ensureEl("leagueSearch", "input", "#app", { placeholder: "Search league by name" });
  const searchBtn = ensureEl("searchBtn", "button", "#app");
  searchBtn.innerText = searchBtn.innerText || "Search";

  const doSearch = async () => {
    const q = (searchInput.value || "").trim();
    if (!q) return;
    const { data, error } = await supabase.from("leagues").select("id,name").ilike("name", `%${q}%`).limit(1);
    if (!error && data && data.length) {
      currentLeagueId = data[0].id;
      await refreshAll();
    } else {
      alert("League not found");
    }
  };

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") doSearch();
  });
  searchBtn.addEventListener("click", doSearch);

  const myLeagueBtn = ensureEl("myLeagueBtn", "button", "#app");
  myLeagueBtn.innerText = myLeagueBtn.innerText || "My League";
  myLeagueBtn.addEventListener("click", async () => {
    if (!myTeamId) {
      alert("No team found for your profile");
      return;
    }
    const { data } = await supabase.from("teams").select("league_id").eq("id", myTeamId).maybeSingle();
    if (data && data.league_id) {
      currentLeagueId = data.league_id;
      await refreshAll();
    } else {
      alert("Your team is not assigned to a league yet.");
    }
  });
}

function setupTabs() {
  const pointsTab = $("tabPoints") || ensureEl("tabPoints", "button", "#app");
  const statsTab = $("tabStats") || ensureEl("tabStats", "button", "#app");

  pointsTab.innerText = pointsTab.innerText || "POINT TABLE";
  statsTab.innerText = statsTab.innerText || "STATISTICS";

  const pointsPanel = $("pointsCard") || ensureEl("pointsCard", "div", "#app");
  const statsPanel = $("statsCard") || ensureEl("statsCard", "div", "#app");

  pointsPanel.style.display = "block";
  statsPanel.style.display = "none";

  pointsTab.addEventListener("click", () => {
    pointsPanel.style.display = "block";
    statsPanel.style.display = "none";
    pointsTab.classList.add("active");
    statsTab.classList.remove("active");
  });

  statsTab.addEventListener("click", () => {
    pointsPanel.style.display = "none";
    statsPanel.style.display = "block";
    statsTab.classList.add("active");
    pointsTab.classList.remove("active");
  });
}

/* ========== Load / Refresh ========== */
async function refreshAll() {
  if (!currentLeagueId) {
    try {
      const { data: one } = await supabase.from("leagues").select("id,name").limit(1).maybeSingle();
      currentLeagueId = one?.id || null;
      if (one?.name) ensureEl("leagueName", "div", "#app").innerText = one.name;
    } catch (err) {
      console.warn("couldn't fetch default league", err);
    }
  }

  if (!currentLeagueId) {
    renderPointsRows([]);
    renderStatisticsIntoStatsCard([], []);
    return;
  }

  try {
    const { data: L } = await supabase.from("leagues").select("name").eq("id", currentLeagueId).maybeSingle();
    if (L && L.name) ensureEl("leagueName", "div", "#app").innerText = L.name;
  } catch (err) {
    console.warn("load league name failed", err);
  }

  await Promise.all([fetchAndRenderStandings(currentLeagueId), fetchAndRenderStatistics(currentLeagueId)]);
}

/* ========== Init (session/profile and start) ========== */
async function initLeaguePage() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;

    if (!userId) {
      console.warn("No authenticated user; page will still show public league info (if allowed by RLS).");
    } else {
      try {
        const { data: profile } = await supabase.from("profiles").select("manager_name,xp,coins,cash,team_id").eq("user_id", userId).maybeSingle();
        if (profile) {
          myTeamId = profile.team_id;
          try {
            loadSharedUI({ supabase, manager_name: profile.manager_name, xp: profile.xp || 0, coins: profile.coins || 0, cash: profile.cash || 0, user_id: userId });
          } catch (e) {
            console.warn("loadSharedUI failed", e);
          }
        }
      } catch (err) {
        console.warn("profile fetch failed", err);
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentLeagueId = urlParams.get("league_id") || null;
    if (!currentLeagueId && myTeamId) {
      const { data: t } = await supabase.from("teams").select("league_id").eq("id", myTeamId).maybeSingle();
      currentLeagueId = t?.league_id || null;
    }

    setupTabs();
    setupLeagueSearch();
    await refreshAll();
  } catch (err) {
    console.error("initLeaguePage error", err);
  }
}

window.addEventListener("DOMContentLoaded", initLeaguePage);
