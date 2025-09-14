// public/league.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadSharedUI } from "./shared-ui.js";

const supabase = createClient(
  window._env_?.SUPABASE_URL,
  window._env_?.SUPABASE_ANON_KEY
);

let currentLeagueId = null;
let myTeamId = null;

// Load league info and UI
async function initLeaguePage() {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user || null;

  // load profile optionally (don't force redirect to login)
  if (user) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("manager_name, xp, coins, cash, team_id, team_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        myTeamId = profile.team_id;
        try {
          loadSharedUI({
            supabase,
            manager_name: profile.manager_name,
            xp: profile.xp,
            coins: profile.coins,
            cash: profile.cash,
            user_id: user.id
          });
        } catch (e) {
          console.warn("loadSharedUI failed", e);
        }
      }
    } catch (e) {
      console.warn("profile load failed", e);
    }
  }

  // Get league id from URL or user's team
  const urlParams = new URLSearchParams(window.location.search);
  currentLeagueId = urlParams.get("league_id");
  if (!currentLeagueId && myTeamId) {
    try {
      const { data: team } = await supabase
        .from("teams")
        .select("league_id")
        .eq("id", myTeamId)
        .maybeSingle();
      currentLeagueId = team?.league_id;
    } catch (e) {
      console.warn("team fetch error", e);
    }
  }

  if (!currentLeagueId) {
    try {
      const { data: first } = await supabase.from("leagues").select("id,name").limit(1).maybeSingle();
      currentLeagueId = first?.id || null;
      if (first?.name) document.getElementById("leagueName").innerText = first.name;
    } catch (e) {
      console.warn("fallback league fetch failed", e);
    }
  }

  if (currentLeagueId) {
    await loadLeagueName(currentLeagueId);
    await loadStandings(currentLeagueId);
    await loadStatistics(currentLeagueId);
  } else {
    renderEmptyStandings();
  }

  setupTabs();
  setupLeagueSearch();
}

// Load league name
async function loadLeagueName(leagueId) {
  try {
    const { data, error } = await supabase
      .from("leagues")
      .select("name")
      .eq("id", leagueId)
      .maybeSingle();
    if (!error && data) {
      document.getElementById("leagueName").innerText = data.name;
    }
  } catch (err) {
    console.warn("loadLeagueName error", err);
  }
}

function renderEmptyStandings() {
  const tbody = document.querySelector("#pointsTable tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9" style="padding:12px;color:#9aa5bf">No teams found in this league.</td></tr>`;
  } else {
    const container = document.getElementById("pointsList");
    if (container) container.innerHTML = `<div style="padding:12px;color:#9aa5bf">No teams found in this league.</div>`;
  }
}

// ensure header row exists and styled
function ensurePointsHeader() {
  const table = document.querySelector("#pointsTable");
  if (!table) return;
  let thead = table.querySelector("thead");
  if (!thead) {
    thead = document.createElement("thead");
    table.insertBefore(thead, table.firstChild);
  }
  thead.innerHTML = `
    <tr style="color:#9aa5bf;font-size:13px;">
      <th style="width:40px;text-align:left;padding:8px 10px;">Pos</th>
      <th style="width:36px;padding:8px 6px;">Logo</th>
      <th style="text-align:left;padding:8px 10px;min-width:140px;">Team</th>
      <th style="width:44px;text-align:center">M</th>
      <th style="width:44px;text-align:center">W</th>
      <th style="width:44px;text-align:center">T</th>
      <th style="width:44px;text-align:center">L</th>
      <th style="width:54px;text-align:center">P</th>
      <th style="width:60px;text-align:center">NRR</th>
    </tr>
  `;
}

// Load standings (point table)
async function loadStandings(leagueId) {
  try {
    ensurePointsHeader();
    const { data, error } = await supabase.rpc("get_league_standings", { p_league_id: leagueId });
    const tbody = document.querySelector("#pointsTable tbody");
    if (!tbody) {
      console.warn("#pointsTable tbody not found - ensure league.html has a table with that id and a tbody");
    } else {
      tbody.innerHTML = "";
    }

    if (error) {
      console.error("get_league_standings error", error);
      if (tbody) tbody.innerHTML = `<tr><td colspan="9">Error loading standings</td></tr>`;
      return;
    }

    if (!data || data.length === 0) {
      // fallback: fetch teams directly and show zeros
      const { data: teams, error: terr } = await supabase.from("teams").select("id,team_name,logo_url").eq("league_id", leagueId);
      if (terr || !teams || teams.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9">No teams found in this league.</td></tr>`;
        return;
      }
      // render fallback rows with zeros
      teams.forEach((t, idx) => {
        const tr = document.createElement("tr");
        const pos = idx + 1;
        const linkHref = myTeamId ? `public-profile.html?team_id=${myTeamId}` : `public-profile.html?team_id=${t.id}`;
        tr.innerHTML = `
          <td>${pos}</td>
          <td><img src="${t.logo_url || "assets/logo.png"}" alt="logo" style="width:24px;height:24px;border-radius:6px;object-fit:cover;"></td>
          <td class="team-name"><a href="${linkHref}" style="font-weight:400;color:inherit;text-decoration:none;display:inline-block;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.team_name)}</a></td>
          <td style="text-align:center">0</td>
          <td style="text-align:center">0</td>
          <td style="text-align:center">0</td>
          <td style="text-align:center">0</td>
          <td style="text-align:center">0</td>
          <td style="text-align:center">0.000</td>
        `;
        tbody.appendChild(tr);
      });
      return;
    }

    // Normal render using RPC results (order preserved by RPC)
    data.forEach((row, index) => {
      const tr = document.createElement("tr");
      const nrrText = Number(row.nrr || 0).toFixed(3);

      // If myTeamId exists, clicking any team name should redirect to own team's public-profile
      const teamLink = myTeamId ? `public-profile.html?team_id=${myTeamId}` : `public-profile.html?team_id=${row.team_id}`;

      tr.innerHTML = `
        <td style="padding:8px 10px;white-space:nowrap">${index + 1}</td>
        <td style="padding:6px;text-align:center"><img src="${row.logo_url || "assets/logo.png"}" alt="logo" style="width:24px;height:24px;border-radius:6px;object-fit:cover" onerror="this.src='assets/logo.png'"/></td>
        <td style="padding:8px 10px;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          <a href="${teamLink}" style="font-weight:400;color:inherit;text-decoration:none;display:inline-block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(row.team_name)}
          </a>
        </td>
        <td style="text-align:center">${row.m ?? row.matches_played ?? 0}</td>
        <td style="text-align:center">${row.w ?? row.wins ?? 0}</td>
        <td style="text-align:center">${row.t ?? row.ties ?? 0}</td>
        <td style="text-align:center">${row.l ?? row.losses ?? 0}</td>
        <td style="text-align:center">${row.p ?? row.points ?? 0}</td>
        <td style="text-align:center">${nrrText}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("loadStandings exception", err);
  }
}

// Load statistics (top 5 batters & bowlers)
async function loadStatistics(leagueId) {
  const container = document.getElementById("statistics");
  if (!container) return;
  container.innerHTML = "";
  try {
    const { data, error } = await supabase.rpc("get_league_statistics", { p_league_id: leagueId });
    if (error) {
      console.error("get_league_statistics error", error);
      container.innerHTML = `<p>Error loading statistics</p>`;
      return;
    }

    // Our RPC returns rows with kind == 'batter' or 'bowler'; group accordingly
    const batters = (data || []).filter((r) => r.kind === "batter").slice(0, 5);
    const bowlers = (data || []).filter((r) => r.kind === "bowler").slice(0, 5);

    // Build sections
    const batSection = document.createElement("div");
    batSection.innerHTML = `<h3 style="margin:6px 0;color:#e6eef8">Top 5 Batters</h3>`;
    if (batters.length === 0) {
      batSection.innerHTML += `<div style="color:#9aa5bf">No data yet</div>`;
    } else {
      batters.forEach((p) => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "8px";
        div.style.padding = "6px 0";
        div.innerHTML = `
          <img src="${p.image_url || "assets/logo.png"}" style="width:32px;height:32px;border-radius:6px;object-fit:cover" onerror="this.src='assets/logo.png'"/>
          <div style="flex:1;min-width:0">
            <div style="font-weight:400;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.player_name)}</div>
            <div style="font-size:12px;color:#9aa5bf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.team_name)}</div>
          </div>
          <div style="font-weight:600">${safeNum(p.runs)}</div>
        `;
        div.addEventListener("click", () => {
          // click -> own team profile if available else clicked player's team profile
          const gotoTeam = myTeamId || p.team_id;
          if (gotoTeam) window.location.href = `public-profile.html?team_id=${gotoTeam}&player_id=${p.player_id}`;
        });
        batSection.appendChild(div);
      });
    }

    const bowlSection = document.createElement("div");
    bowlSection.innerHTML = `<h3 style="margin:6px 0;color:#e6eef8">Top 5 Bowlers</h3>`;
    if (bowlers.length === 0) {
      bowlSection.innerHTML += `<div style="color:#9aa5bf">No data yet</div>`;
    } else {
      bowlers.forEach((p) => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "8px";
        div.style.padding = "6px 0";
        div.innerHTML = `
          <img src="${p.image_url || "assets/logo.png"}" style="width:32px;height:32px;border-radius:6px;object-fit:cover" onerror="this.src='assets/logo.png'"/>
          <div style="flex:1;min-width:0">
            <div style="font-weight:400;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.player_name)}</div>
            <div style="font-size:12px;color:#9aa5bf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.team_name)}</div>
          </div>
          <div style="font-weight:600">${safeNum(p.wickets)}</div>
        `;
        div.addEventListener("click", () => {
          const gotoTeam = myTeamId || p.team_id;
          if (gotoTeam) window.location.href = `public-profile.html?team_id=${gotoTeam}&player_id=${p.player_id}`;
        });
        bowlSection.appendChild(div);
      });
    }

    // Append sections side by side on wide screens, stacked on small screens
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.gap = "12px";
    wrapper.style.flexWrap = "wrap";
    wrapper.appendChild(batSection);
    wrapper.appendChild(bowlSection);
    container.appendChild(wrapper);
  } catch (err) {
    console.error("loadStatistics exception", err);
    container.innerHTML = `<div style="color:#9aa5bf">No data</div>`;
  }
}

// Tabs
function setupTabs() {
  const pointsTab = document.getElementById("tab-points");
  const statsTab = document.getElementById("tab-stats");
  pointsTab?.addEventListener("click", () => {
    document.getElementById("points").style.display = "block";
    document.getElementById("statistics").style.display = "none";
    pointsTab.classList.add("active");
    statsTab.classList.remove("active");
  });
  statsTab?.addEventListener("click", () => {
    document.getElementById("points").style.display = "none";
    document.getElementById("statistics").style.display = "block";
    statsTab.classList.add("active");
    pointsTab.classList.remove("active");
  });
}

// League search
function setupLeagueSearch() {
  const searchInput = document.getElementById("leagueSearch");
  if (!searchInput) return;
  searchInput.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      const q = searchInput.value.trim();
      if (!q) return;
      const { data, error } = await supabase
        .from("leagues")
        .select("id,name")
        .ilike("name", `%${q}%`)
        .limit(1);
      if (!error && data && data.length) {
        const league = data[0];
        currentLeagueId = league.id;
        loadLeagueName(currentLeagueId);
        loadStandings(currentLeagueId);
        loadStatistics(currentLeagueId);
      } else {
        alert("League not found");
      }
    }
  });
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"']+/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

window.addEventListener("DOMContentLoaded", initLeaguePage);
