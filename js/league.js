// public/league.js
// Compact league table with expandable details.
// - Compact row: Pos | Logo | Team | M | P
// - Click team name -> public-profile.html?team_id=...
// - Click row elsewhere -> toggle detail row showing W/T/L/NRR etc.
// - Safe call to shared-ui (if available)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- CONFIG: replace with your supabase project + anon if different ---
const SUPABASE_URL = "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// guard-load shared UI if available (prevents hard error if shared-ui.js missing)
async function tryLoadSharedUI(profileData, userId) {
  try {
    // dynamic import if file present, else skip
    if (typeof loadSharedUI === "function") {
      // global function already defined (shared-ui.js loaded)
      loadSharedUI({
        supabase,
        manager_name: profileData.manager_name,
        xp: profileData.xp,
        coins: profileData.coins,
        cash: profileData.cash,
        user_id: userId
      });
      return;
    }
    // if not global, attempt to import module (non-fatal if 404)
    try {
      const mod = await import('./shared-ui.js');
      if (mod && typeof mod.loadSharedUI === 'function') {
        mod.loadSharedUI({
          supabase,
          manager_name: profileData.manager_name,
          xp: profileData.xp,
          coins: profileData.coins,
          cash: profileData.cash,
          user_id: userId
        });
      }
    } catch (e) {
      // shared-ui not available — ignore silently
      console.info('shared-ui.js not available; skipping topbar injection.');
    }
  } catch (err) {
    console.warn('Failed to initialize shared UI:', err);
  }
}

// small helpers
const $ = id => document.getElementById(id);
const esc = s => (s == null ? '' : String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])));

// STATE
let myTeamId = null;
let currentLeagueId = null;
let expandedTeamId = null;

// builds detail HTML (shown when row expanded)
function detailHtml(stats) {
  const items = [
    `M: ${stats.matches_played ?? 0}`,
    `W: ${stats.wins ?? 0}`,
    `T: ${stats.ties ?? 0}`,
    `L: ${stats.losses ?? 0}`,
    `Pts: ${stats.points ?? 0}`,
    `Runs Scored: ${stats.runs_scored ?? 0}`,
    `Overs Faced: ${stats.overs_faced ?? 0}`,
    `Runs Conceded: ${stats.runs_conceded ?? 0}`,
    `Overs Bowled: ${stats.overs_bowled ?? 0}`,
    `NRR: ${Number(stats.nrr ?? 0).toFixed(3)}`,
    `Updated: ${stats.updated_at ? new Date(stats.updated_at).toLocaleString() : '-'}`,
  ];
  return `<div style="display:flex;flex-wrap:wrap;gap:18px;padding:8px 4px">${items.map(i=>`<div style="min-width:120px;color:#aebacb">${esc(i)}</div>`).join('')}</div>`;
}

// clear existing expanded detail
function clearExpanded() {
  if (!expandedTeamId) return;
  const ex = document.querySelector(`tr.detail-row[data-team="${expandedTeamId}"]`);
  if (ex) ex.remove();
  expandedTeamId = null;
}

// render rows (compact)
function renderRows(rows) {
  const tbody = $('pointsBody');
  tbody.innerHTML = '';
  if (!rows || rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="padding:18px;text-align:center;color:#9aa5bf">No teams found</td>`;
    tbody.appendChild(tr);
    return;
  }

  rows.forEach((r, idx) => {
    const teamId = r.team_id ?? r.id;
    const teamName = r.team_name ?? r.name ?? 'Team';
    const logo = r.logo_url ?? r.logo ?? '/assets/logo.png';
    const matches = r.matches_played ?? r.m ?? 0;
    const wins = r.wins ?? r.w ?? 0;
    const ties = r.ties ?? r.t ?? 0;
    const losses = r.losses ?? r.l ?? 0;
    const runs_scored = r.runs_scored ?? 0;
    const overs_faced = r.overs_faced ?? 0;
    const runs_conceded = r.runs_conceded ?? 0;
    const overs_bowled = r.overs_bowled ?? 0;
    const nrr = Number(r.nrr ?? 0).toFixed(3);
    // compute points if not provided (2 for win, 1 for tie)
    const points = (r.points ?? r.p ?? (wins * 2 + ties * 1));

    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.teamId = teamId;

    tr.innerHTML = `
      <td class="col-pos" style="padding:12px 8px;color:#9aa5bf">${idx + 1}</td>
      <td class="col-logo" style="padding:8px 6px;vertical-align:middle"><img src="${esc(logo)}" alt="logo" style="width:28px;height:28px;border-radius:6px;object-fit:cover" onerror="this.src='/assets/logo.png'"/></td>
      <td class="col-team" style="padding:12px 8px;max-width:260px">
        <a class="team-link" href="public-profile.html?team_id=${encodeURIComponent(teamId)}" style="color:inherit;text-decoration:none;display:inline-block;width:100%;font-weight:600">${esc(teamName)}</a>
      </td>
      <td class="col-stat" style="text-align:center;font-weight:700;padding:12px 8px">${matches}</td>
      <td class="col-stat" style="text-align:center;font-weight:700;padding:12px 8px">${points}</td>
    `;

    // click handler for the row: toggle detail row unless the team link was clicked
    tr.addEventListener('click', (ev) => {
      // if clicked inside anchor (team-link), let browser navigate
      let el = ev.target;
      while (el && el !== tr) {
        if (el.tagName === 'A' && el.classList.contains('team-link')) return;
        el = el.parentElement;
      }
      const tid = tr.dataset.teamId;
      // toggle
      if (expandedTeamId === tid) {
        clearExpanded();
        return;
      }
      // collapse previous
      clearExpanded();
      // insert detail row immediately after this row
      const detail = document.createElement('tr');
      detail.className = 'detail-row';
      detail.dataset.team = tid;
      const td = document.createElement('td');
      td.colSpan = 6;
      td.innerHTML = detailHtml({
        matches_played: matches,
        wins,
        ties,
        losses,
        points,
        runs_scored,
        overs_faced,
        runs_conceded,
        overs_bowled,
        nrr,
        updated_at: r.updated_at ?? r.updatedAt ?? null
      });
      detail.appendChild(td);
      if (tr.nextSibling) tr.parentNode.insertBefore(detail, tr.nextSibling);
      else tr.parentNode.appendChild(detail);
      expandedTeamId = tid;
      // scroll detail into view on small screens
      if (window.innerWidth < 640) {
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    $('pointsBody').appendChild(tr);
  });
}

// fetch standings RPC with graceful fallback
async function fetchStandings(leagueId) {
  if (!leagueId) {
    renderRows([]);
    return;
  }
  try {
    const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
    if (error) {
      console.warn('get_league_standings RPC error:', error);
      // fallback to teams list with zeros
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({
        team_id: t.id, team_name: t.team_name, logo_url: t.logo_url,
        matches_played: 0, wins:0, ties:0, losses:0, points:0, nrr:0
      }));
      renderRows(rows);
      return;
    }
    if (!data || data.length === 0) {
      // no standings, fallback to teams
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({
        team_id: t.id, team_name: t.team_name, logo_url: t.logo_url,
        matches_played: 0, wins:0, ties:0, losses:0, points:0, nrr:0
      }));
      renderRows(rows);
      return;
    }
    // normalize and render
    const normalized = (data || []).map(r => ({
      team_id: r.team_id ?? r.id,
      team_name: r.team_name ?? r.team ?? r.name,
      logo_url: r.logo_url ?? r.logo,
      matches_played: r.m ?? r.matches_played ?? 0,
      wins: r.w ?? r.wins ?? 0,
      ties: r.t ?? r.ties ?? 0,
      losses: r.l ?? r.losses ?? 0,
      points: r.p ?? r.points ?? null,
      runs_scored: r.runs_scored ?? 0,
      overs_faced: r.overs_faced ?? 0,
      runs_conceded: r.runs_conceded ?? 0,
      overs_bowled: r.overs_bowled ?? 0,
      nrr: r.nrr ?? 0,
      updated_at: r.updated_at ?? r.updatedAt ?? null
    }));
    renderRows(normalized);
  } catch (err) {
    console.error('fetchStandings exception', err);
    renderRows([]);
  }
}

// fetch statistics for RHS panels (optional)
async function fetchStats(leagueId) {
  const batEl = $('topBatters'), bowlEl = $('topBowlers');
  if (batEl) batEl.innerHTML = 'Loading...';
  if (bowlEl) bowlEl.innerHTML = 'Loading...';
  try {
    const { data, error } = await supabase.rpc('get_league_statistics', { p_league_id: leagueId });
    if (error || !data) {
      if (batEl) batEl.innerHTML = 'No data yet';
      if (bowlEl) bowlEl.innerHTML = 'No data yet';
      return;
    }
    // adapt shape
    const batters = data.batters || data.top_batters || (Array.isArray(data) ? data.filter(x=>x.kind==='batter') : []);
    const bowlers = data.bowlers || data.top_bowlers || (Array.isArray(data) ? data.filter(x=>x.kind==='bowler') : []);
    if (batEl) batEl.innerHTML = (batters.length ? batters.slice(0,5).map(b => `<div style="display:flex;justify-content:space-between;padding:4px 0"><div>${esc(b.player_name||b.name||b.player)}</div><div style="font-weight:700">${b.runs||0}</div></div>`).join('') : '<div class="muted">No data yet</div>');
    if (bowlEl) bowlEl.innerHTML = (bowlers.length ? bowlers.slice(0,5).map(b => `<div style="display:flex;justify-content:space-between;padding:4px 0"><div>${esc(b.player_name||b.name||b.player)}</div><div style="font-weight:700">${b.wickets||0}</div></div>`).join('') : '<div class="muted">No data yet</div>');
  } catch (err) {
    console.warn('fetchStats error', err);
    if (batEl) batEl.innerHTML = 'No data yet';
    if (bowlEl) bowlEl.innerHTML = 'No data yet';
  }
}

// load league name (optional)
async function loadLeagueName(leagueId){
  try {
    const { data } = await supabase.from('leagues').select('name').eq('id', leagueId).maybeSingle();
    if (data && data.name) {
      const el = $('leagueName');
      if (el) el.innerText = data.name;
    }
  } catch (err) { /*ignore*/ }
}

// UI wiring
function setupUI() {
  const tabP = $('tabPoints'), tabS = $('tabStats');
  if (tabP) tabP.addEventListener('click', ()=>{ $('pointsCard').style.display='block'; $('statsCard').style.display='none'; tabP.classList.add('active'); tabS.classList.remove('active'); });
  if (tabS) tabS.addEventListener('click', ()=>{ $('pointsCard').style.display='none'; $('statsCard').style.display='block'; tabS.classList.add('active'); tabP.classList.remove('active'); });

  const searchBtn = $('searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', async () => {
    const q = ($('leagueSearch').value || '').trim();
    if (!q) return;
    try {
      const { data } = await supabase.from('leagues').select('id,name').ilike('name', `%${q}%`).limit(1);
      if (!data || data.length === 0) { alert('League not found'); return; }
      currentLeagueId = data[0].id;
      await loadLeagueName(currentLeagueId);
      await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId)]);
    } catch (err) { console.error(err); alert('Search failed'); }
  });

  const myBtn = $('myLeagueBtn');
  if (myBtn) myBtn.addEventListener('click', async () => {
    if (!myTeamId) { alert('No team found in your profile'); return; }
    try {
      const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
      if (data && data.league_id) {
        currentLeagueId = data.league_id;
        await loadLeagueName(currentLeagueId);
        await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId)]);
      } else alert('Your team is not assigned to a league yet.');
    } catch (err) { console.error(err); alert('Error fetching your league'); }
  });

  const searchInput = $('leagueSearch');
  if (searchInput) searchInput.addEventListener('keypress', (e)=>{ if (e.key === 'Enter') { const btn = $('searchBtn'); if (btn) btn.click(); } });
}

// entry point
async function init() {
  setupUI();

  // attempt to get session/profile (non-fatal)
  try {
    const s = await supabase.auth.getSession();
    const uid = s?.data?.session?.user?.id;
    if (uid) {
      const { data: profile } = await supabase.from('profiles').select('manager_name,team_id,xp,coins,cash').eq('user_id', uid).maybeSingle();
      if (profile) {
        myTeamId = profile.team_id;
        // try to load shared UI (if present)
        tryLoadSharedUI(profile, uid);
      }
    } else {
      // try to still call shared-ui if it's present (it won't have user-specific values)
      tryLoadSharedUI({ manager_name: 'Manager', xp:0, coins:0, cash:0 }, null);
    }
  } catch (err) {
    console.warn('session/profile fetch failed', err);
    tryLoadSharedUI({ manager_name: 'Manager', xp:0, coins:0, cash:0 }, null);
  }

  // pick league_id from querystring or first league
  const qs = new URLSearchParams(window.location.search);
  currentLeagueId = qs.get('league_id') || null;
  if (!currentLeagueId) {
    try {
      const { data } = await supabase.from('leagues').select('id,name').limit(1).maybeSingle();
      if (data) {
        currentLeagueId = data.id;
        if (data.name) {
          const el = $('leagueName'); if (el) el.innerText = data.name;
        }
      }
    } catch (err) { /*ignore*/ }
  } else {
    await loadLeagueName(currentLeagueId);
  }

  if (currentLeagueId) {
    await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId)]);
  } else {
    renderRows([]);
  }
}

window.addEventListener('DOMContentLoaded', init);
