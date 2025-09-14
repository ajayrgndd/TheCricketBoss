// public/league.js
// League Standings + Statistics (mobile-friendly)
// Always shows: Pos | Logo | Team | M | W | T | L | NRR

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadSharedUI } from "./shared-ui.js";

// -- Use your actual Supabase Project URL + anon key here
const supabaseUrl = "https://iukofcmatlfhfwcechdq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

let currentLeagueId = null;
let myTeamId = null;

// Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Load page
async function initLeaguePage() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load profile for topbar
  const { data: profile } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash, team_id")
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
      user_id: user.id
    });
  }

  // League ID
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
    await loadLeagueName(currentLeagueId);
    await loadStandings(currentLeagueId);
    await loadStatistics(currentLeagueId);
  }

  setupTabs();
  setupLeagueSearch();
}

// Load league name
async function loadLeagueName(leagueId) {
  const { data } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", leagueId)
    .maybeSingle();
  if (data) document.getElementById("leagueName").innerText = data.name;
}

// Load standings
async function loadStandings(leagueId) {
  const tbody = document.querySelector("#pointsTable tbody");
  tbody.innerHTML = "";
  try {
    const { data, error } = await supabase.rpc("get_league_standings", { p_league_id: leagueId });
    if (error) {
      console.error("RPC error", error);
      tbody.innerHTML = `<tr><td colspan="9">Error loading standings</td></tr>`;
      return;
    }
    if (!data?.length) {
      tbody.innerHTML = `<tr><td colspan="9">No teams yet</td></tr>`;
      return;
    }

    data.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><img src="${row.logo_url || "assets/logo.png"}" style="width:24px;height:24px;border-radius:4px;object-fit:cover"></td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          <a href="public-profile.html?team_id=${row.team_id}" style="color:inherit;text-decoration:none;">${escapeHtml(row.team_name)}</a>
        </td>
        <td>${row.m ?? 0}</td>
        <td>${row.w ?? 0}</td>
        <td>${row.t ?? 0}</td>
        <td>${row.l ?? 0}</td>
        <td>${Number(row.nrr || 0).toFixed(3)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Standings error", err);
    tbody.innerHTML = `<tr><td colspan="9">Error loading standings</td></tr>`;
  }
}

// Load statistics
async function loadStatistics(leagueId) {
  const container = document.getElementById("statistics");
  container.innerHTML = "";
  try {
    const { data, error } = await supabase.rpc("get_league_statistics", { p_league_id: leagueId });
    if (error) {
      console.error("Stats RPC error", error);
      container.innerHTML = `<p>Error loading stats</p>`;
      return;
    }

    const batters = data?.batters || [];
    const bowlers = data?.bowlers || [];

    const batHtml = `
      <div><h3>Top 5 Batters</h3>
      <ul>${batters.length ? batters.map(p => `<li>${escapeHtml(p.name)} (${escapeHtml(p.team_name)}): ${p.runs} runs</li>`).join("") : "<li>No data yet</li>"}</ul></div>`;
    const bowlHtml = `
      <div><h3>Top 5 Bowlers</h3>
      <ul>${bowlers.length ? bowlers.map(p => `<li>${escapeHtml(p.name)} (${escapeHtml(p.team_name)}): ${p.wickets} wkts</li>`).join("") : "<li>No data yet</li>"}</ul></div>`;
    container.innerHTML = batHtml + bowlHtml;
  } catch (err) {
    console.error("Stats error", err);
    container.innerHTML = `<p>Error loading stats</p>`;
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
  const searchBtn = document.getElementById("searchBtn");
  searchBtn.addEventListener("click", async () => {
    const q = searchInput.value.trim();
    if (!q) return;
    const { data } = await supabase
      .from("leagues")
      .select("id,name")
      .ilike("name", `%${q}%`)
      .limit(1);
    if (data?.length) {
      currentLeagueId = data[0].id;
      await loadLeagueName(currentLeagueId);
      await loadStandings(currentLeagueId);
      await loadStatistics(currentLeagueId);
    } else {
      alert("League not found");
    }
  });
}

window.addEventListener("DOMContentLoaded", initLeaguePage);
