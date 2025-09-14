// public/league.js (patched full version with fallback for env vars)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadSharedUI } from "./shared-ui.js";

// ---- ENV CONFIG ----
// Preferred: Netlify injects window._env_ via a small script.
// Fallback: Hardcode keys here for local testing only.
const SUPABASE_URL =
  (window._env_ && window._env_.SUPABASE_URL) ||
  "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY =
  (window._env_ && window._env_.SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Supabase URL or ANON KEY missing. Check Netlify env injection or hardcode for local test.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentLeagueId = null;
let myTeamId = null;

// Load league info and UI
async function initLeaguePage() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load profile for topbar
  const { data: profile } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash, team_id, team_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) {
    myTeamId = profile.team_id;
    loadSharedUI({
      supabase,
      manager_name: profile.manager_name,
      xp: profile.xp,
      coins: profile.coins,
      cash: profile.cash,
      user_id: user.id,
    });
  }

  // Get league id from URL or user profile
  const urlParams = new URLSearchParams(window.location.search);
  currentLeagueId = urlParams.get("league_id");
  if (!currentLeagueId && profile?.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("league_id")
      .eq("id", profile.team_id)
      .maybeSingle();
    currentLeagueId = team?.league_id;
  }

  if (currentLeagueId) {
    loadLeagueName(currentLeagueId);
    loadStandings(currentLeagueId);
    loadStatistics(currentLeagueId);
  }

  setupTabs();
  setupLeagueSearch();
}

// Load league name
async function loadLeagueName(leagueId) {
  const { data, error } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", leagueId)
    .maybeSingle();
  if (!error && data) {
    document.getElementById("leagueName").innerText = data.name;
  }
}

// Load standings (point table)
async function loadStandings(leagueId) {
  try {
    const { data, error } = await supabase.rpc("get_league_standings", {
      p_league_id: leagueId,
    });
    const tbody = document.querySelector("#pointsTable tbody");
    tbody.innerHTML = "";
    if (error) {
      console.error("get_league_standings error", error);
      tbody.innerHTML = `<tr><td colspan="9">Error loading standings</td></tr>`;
      return;
    }
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9">No teams found in this league.</td></tr>`;
      return;
    }

    data.forEach((row, index) => {
      const tr = document.createElement("tr");
      const nrrText = Number(row.nrr || 0).toFixed(3);
      const teamId = row.team_id;
      const linkHref = `public-profile.html?team_id=${teamId}`;
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><img src="${row.logo_url || "assets/logo.png"}" alt="logo" style="width:22px;height:22px;object-fit:cover;border-radius:4px;"></td>
        <td class="team-name" style="font-size:13px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          <a href="${linkHref}" style="color:inherit;text-decoration:none;">${escapeHtml(row.team_name)}</a>
        </td>
        <td>${row.m ?? row.matches_played ?? 0}</td>
        <td>${row.w ?? row.wins ?? 0}</td>
        <td>${row.t ?? row.ties ?? 0}</td>
        <td>${row.l ?? row.losses ?? 0}</td>
        <td>${row.p ?? row.points ?? 0}</td>
        <td>${nrrText}</td>
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
  container.innerHTML = "";
  try {
    const { data, error } = await supabase.rpc("get_league_statistics", {
      p_league_id: leagueId,
    });
    if (error) {
      console.error("get_league_statistics error", error);
      container.innerHTML = `<p>Error loading statistics</p>`;
      return;
    }

    const batters = data?.batters || [];
    const bowlers = data?.bowlers || [];

    const batSection = document.createElement("div");
    batSection.innerHTML = `<h3>Top 5 Batters</h3>`;
    const batList = document.createElement("ul");
    batters.forEach((p) => {
      const li = document.createElement("li");
      li.innerHTML = `${escapeHtml(p.name)} (${escapeHtml(
        p.team_name
      )}): ${p.runs} runs`;
      batList.appendChild(li);
    });
    if (batters.length === 0) batList.innerHTML = "<li>No data yet</li>";
    batSection.appendChild(batList);

    const bowlSection = document.createElement("div");
    bowlSection.innerHTML = `<h3>Top 5 Bowlers</h3>`;
    const bowlList = document.createElement("ul");
    bowlers.forEach((p) => {
      const li = document.createElement("li");
      li.innerHTML = `${escapeHtml(p.name)} (${escapeHtml(
        p.team_name
      )}): ${p.wickets} wickets`;
      bowlList.appendChild(li);
    });
    if (bowlers.length === 0) bowlList.innerHTML = "<li>No data yet</li>";
    bowlSection.appendChild(bowlList);

    container.appendChild(batSection);
    container.appendChild(bowlSection);
  } catch (err) {
    console.error("loadStatistics exception", err);
  }
}

// Tabs
function setupTabs() {
  const pointsTab = document.getElementById("tab-points");
  const statsTab = document.getElementById("tab-stats");
  pointsTab.addEventListener("click", () => {
    document.getElementById("points").style.display = "block";
    document.getElementById("statistics").style.display = "none";
    pointsTab.classList.add("active");
    statsTab.classList.remove("active");
  });
  statsTab.addEventListener("click", () => {
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

// Escape HTML
function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"]/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

window.addEventListener("DOMContentLoaded", initLeaguePage);
