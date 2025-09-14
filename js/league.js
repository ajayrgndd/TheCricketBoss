// public/league.js
// Patched full version for TheCricketBoss
// - Works with RPC get_league_standings that returns all teams (m,w,t,l,p,nrr)
// - Falls back to fetching teams directly if RPC returns nothing
// - Renders POINT TABLE (default) and STATISTICS (top 5 batters/bowlers)
// - Uses shared-ui.js -> loadSharedUI(...) to inject top/bottom nav
//
// NOTE: configure PROJECT_URL and ANON_KEY via environment injection (recommended).
// For local testing only you may inline them (not recommended for production).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadSharedUI } from './shared-ui.js';

// Provide these via Netlify environment variables at build time, or expose via a small inline env script.
// Example build-time injection (Netlify): create a tiny script that writes window.PROJECT_URL/ANON_KEY
const PROJECT_URL = window.PROJECT_URL || (window.__env && window.__env.PROJECT_URL) || '';
const ANON_KEY = window.ANON_KEY || (window.__env && window.__env.ANON_KEY) || '';

if (!PROJECT_URL || !ANON_KEY) {
  console.warn('Supabase PROJECT_URL or ANON_KEY not set. Set window.PROJECT_URL and window.ANON_KEY in production.');
}

const supabase = createClient('https://iukofcmatlfhfwcechdq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE');

// -- helpers
const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};
const safeNum = (v) => (v === null || v === undefined ? 0 : v);
const formatNRR = (n) => {
  if (n === null || n === undefined) return '0.000';
  const x = Number(n);
  if (Number.isNaN(x)) return '0.000';
  return x.toFixed(3);
};

// -- state
let currentLeagueId = null;
let myTeamId = null;

// -- render point table rows (minimal columns: logo, name, M, W, T, L, P, NRR)
function renderPoints(rows) {
  const container = $('pointsList');
  container.innerHTML = '';

  if (!rows || rows.length === 0) {
    // still attempt a graceful fallback message (frontend will try to fetch teams if RPC fails)
    $('pointsEmpty').style.display = 'block';
    return;
  }
  $('pointsEmpty').style.display = 'none';

  for (const r of rows) {
    const teamId = r.team_id || r.team_id; // defensive
    // field names: team_name, logo_url, m, w, t, l, p, nrr (per RPC)
    const teamName = r.team_name || r.team_name || 'Unknown Team';
    const logo = r.logo_url || '/assets/logo.png';
    const m = safeNum(r.m ?? r.matches_played);
    const w = safeNum(r.w ?? r.wins);
    const t = safeNum(r.t ?? r.ties);
    const l = safeNum(r.l ?? r.losses);
    const p = safeNum(r.p ?? r.points);
    const nrr = formatNRR(r.nrr);

    const row = document.createElement('div');
    row.className = 'row clickable';
    row.innerHTML = `
      <div class="col-logo">
        <img src="${escapeHtml(logo)}" class="team-logo" alt="logo" onerror="this.src='/assets/logo.png'"/>
      </div>
      <div class="col-name">
        <div class="team-name" title="${escapeHtml(teamName)}">${escapeHtml(teamName)}</div>
      </div>
      <div class="col-stat">${m}</div>
      <div class="col-stat">${w}</div>
      <div class="col-stat">${t}</div>
      <div class="col-stat">${l}</div>
      <div class="col-stat">${p}</div>
      <div class="col-stat">${nrr}</div>
    `;
    row.addEventListener('click', () => {
      // navigate to public-profile with team id
      if (teamId) window.location.href = `public-profile.html?team_id=${teamId}`;
    });
    container.appendChild(row);
  }
}

// -- render statistics
function renderStats(rows) {
  const batters = (rows || []).filter((r) => r.kind === 'batter').slice(0, 5);
  const bowlers = (rows || []).filter((r) => r.kind === 'bowler').slice(0, 5);

  const bcont = $('topBatters');
  const bowcont = $('topBowlers');
  bcont.innerHTML = '';
  bowcont.innerHTML = '';

  if (!batters.length) {
    bcont.innerHTML = `<div class="muted">No batters yet</div>`;
  } else {
    for (const p of batters) {
      const el = document.createElement('div');
      el.className = 'player-row';
      el.innerHTML = `
        <img src="${escapeHtml(p.image_url || '/assets/logo.png')}" class="player-avatar" onerror="this.src='/assets/logo.png'"/>
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(p.player_name)}</div>
          <div class="muted" style="font-size:12px">${escapeHtml(p.team_name)}</div>
        </div>
        <div style="font-weight:800">${safeNum(p.runs)}</div>
      `;
      el.addEventListener('click', () => {
        if (p.team_id) window.location.href = `public-profile.html?team_id=${p.team_id}&player_id=${p.player_id}`;
      });
      bcont.appendChild(el);
    }
  }

  if (!bowlers.length) {
    bowcont.innerHTML = `<div class="muted">No bowlers yet</div>`;
  } else {
    for (const p of bowlers) {
      const el = document.createElement('div');
      el.className = 'player-row';
      el.innerHTML = `
        <img src="${escapeHtml(p.image_url || '/assets/logo.png')}" class="player-avatar" onerror="this.src='/assets/logo.png'"/>
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(p.player_name)}</div>
          <div class="muted" style="font-size:12px">${escapeHtml(p.team_name)}</div>
        </div>
        <div style="font-weight:800">${safeNum(p.wickets)}</div>
      `;
      el.addEventListener('click', () => {
        if (p.team_id) window.location.href = `public-profile.html?team_id=${p.team_id}&player_id=${p.player_id}`;
      });
      bowcont.appendChild(el);
    }
  }
}

// -- fetch standings via RPC; if RPC returns empty, fallback to listing teams with zero stats
async function fetchAndRenderStandings(leagueId) {
  if (!leagueId) return;
  try {
    // call RPC (new shape returns every team with zeros when no standings exist)
    const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
    if (error) {
      console.error('get_league_standings RPC error', error);
      // fallback: attempt direct teams fetch
      await fallbackRenderTeams(leagueId);
      return;
    }
    if (!data || data.length === 0) {
      // fallback to direct teams listing with zeros
      await fallbackRenderTeams(leagueId);
      return;
    }
    // RPC returned rows; render using expected field names (team_id, team_name, logo_url, m,w,t,l,p,nrr)
    // Normalize rows so renderPoints works
    const normalized = data.map((r) => ({
      team_id: r.team_id,
      team_name: r.team_name || r.team_name,
      logo_url: r.logo_url,
      m: r.m ?? r.matches_played ?? 0,
      w: r.w ?? r.wins ?? 0,
      t: r.t ?? r.ties ?? 0,
      l: r.l ?? r.losses ?? 0,
      p: r.p ?? r.points ?? 0,
      nrr: r.nrr ?? 0
    }));
    renderPoints(normalized);
  } catch (err) {
    console.error('fetchAndRenderStandings exception', err);
    await fallbackRenderTeams(leagueId);
  }
}

// -- fallback: fetch all teams in league and render zeros (used if RPC unexpectedly fails)
async function fallbackRenderTeams(leagueId) {
  try {
    const { data: teams, error } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
    if (error) {
      console.error('fallback teams fetch error', error);
      $('pointsEmpty').style.display = 'block';
      return;
    }
    if (!teams || teams.length === 0) {
      $('pointsEmpty').style.display = 'block';
      return;
    }
    const rows = teams.map((t) => ({
      team_id: t.id,
      team_name: t.team_name,
      logo_url: t.logo_url,
      m: 0,
      w: 0,
      t: 0,
      l: 0,
      p: 0,
      nrr: 0
    }));
    renderPoints(rows);
  } catch (err) {
    console.error('fallbackRenderTeams exception', err);
    $('pointsEmpty').style.display = 'block';
  }
}

// -- fetch statistics RPC and render
async function fetchAndRenderStatistics(leagueId) {
  if (!leagueId) return;
  try {
    const { data, error } = await supabase.rpc('get_league_statistics', { p_league_id: leagueId });
    if (error) {
      console.error('get_league_statistics RPC error', error);
      // show empty states
      renderStats([]);
      return;
    }
    renderStats(data || []);
  } catch (err) {
    console.error('fetchAndRenderStatistics exception', err);
    renderStats([]);
  }
}

// -- load initial state: try to find logged-in user's team and league; inject shared UI
async function loadInitialState() {
  try {
    const s = await supabase.auth.getSession();
    const userId = s?.data?.session?.user?.id || null;

    if (userId) {
      const { data: profile, error: pfErr } = await supabase
        .from('profiles')
        .select('team_id, manager_name, xp, coins, cash')
        .eq('user_id', userId)
        .maybeSingle();

      if (pfErr) console.warn('profile fetch error', pfErr);
      if (profile) {
        myTeamId = profile.team_id;
        // inject top/bottom bars (shared-ui)
        try {
          loadSharedUI({
            supabase,
            manager_name: profile.manager_name || 'Manager',
            xp: profile.xp || 0,
            coins: profile.coins || 0,
            cash: profile.cash || 0,
            user_id: userId
          });
        } catch (e) {
          console.warn('loadSharedUI failed', e);
        }

        if (myTeamId) {
          const { data: team, error: tErr } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
          if (tErr) console.warn('team fetch error', tErr);
          if (team && team.league_id) {
            currentLeagueId = team.league_id;
            await refreshAll();
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn('session/profile load failed', err);
  }

  // fallback: pick first available league
  try {
    const { data: one } = await supabase.from('leagues').select('id,name').limit(1).maybeSingle();
    if (one) {
      currentLeagueId = one.id;
      $('leagueName').innerText = one.name || 'League';
    }
  } catch (err) {
    console.warn('fallback league fetch failed', err);
  }

  // refresh UI even if currentLeagueId might be null
  await refreshAll();
}

// -- refresh both tabs
async function refreshAll() {
  if (!currentLeagueId) {
    $('leagueName').innerText = 'League';
    $('pointsList').innerHTML = '';
    $('topBatters').innerHTML = '<div class="muted">No data</div>';
    $('topBowlers').innerHTML = '<div class="muted">No data</div>';
    return;
  }

  // set league name (try fetch)
  try {
    const { data: L } = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
    if (L && L.name) $('leagueName').innerText = L.name;
  } catch (err) {
    console.warn('league name fetch', err);
  }

  await Promise.all([
    fetchAndRenderStandings(currentLeagueId),
    fetchAndRenderStatistics(currentLeagueId)
  ]);
}

// -- search leagues by name (simple ilike)
async function searchLeagues(q) {
  if (!q || !q.trim()) return [];
  try {
    const { data } = await supabase.from('leagues').select('id,name,tier').ilike('name', `%${q}%`).limit(10);
    return data || [];
  } catch (err) {
    console.error('searchLeagues error', err);
    return [];
  }
}

// -- UI event wiring
function wireUI() {
  // tabs
  $('tabPoints').addEventListener('click', () => {
    $('tabPoints').classList.add('active');
    $('tabStats').classList.remove('active');
    $('pointsCard').style.display = 'block';
    $('statsCard').style.display = 'none';
  });
  $('tabStats').addEventListener('click', () => {
    $('tabStats').classList.add('active');
    $('tabPoints').classList.remove('active');
    $('statsCard').style.display = 'block';
    $('pointsCard').style.display = 'none';
  });

  // search
  $('searchBtn').addEventListener('click', async () => {
    const q = $('leagueSearch').value || '';
    if (!q.trim()) return;
    const results = await searchLeagues(q);
    if (results.length === 0) {
      alert('No league found');
      return;
    }
    // pick first result (simple)
    currentLeagueId = results[0].id;
    $('leagueName').innerText = results[0].name || 'League';
    await refreshAll();
  });

  // my league
  $('myLeagueBtn').addEventListener('click', async () => {
    if (!myTeamId) {
      alert('No team found for your profile');
      return;
    }
    try {
      const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
      if (data && data.league_id) {
        currentLeagueId = data.league_id;
        await refreshAll();
      } else {
        alert('Your team is not assigned to a league yet.');
      }
    } catch (err) {
      console.error('myLeagueBtn error', err);
    }
  });
}

// -- kickoff
wireUI();
loadInitialState();
