// public/league.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadSharedUI } from './shared-ui.js';

// Read runtime env provided by Netlify or other runtime (recommended)
const SUPABASE_URL = (window._env_ && window._env_.SUPABASE_URL) || window.PROJECT_URL || '';
const SUPABASE_ANON_KEY = (window._env_ && window._env_.SUPABASE_ANON_KEY) || window.ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL / ANON KEY not found on window._env_ or window.PROJECT_URL / ANON_KEY. Set them in your runtime.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// state
let currentLeagueId = null;
let myTeamId = null;
let currentUserId = null;

// helpers
const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => (s === null || s === undefined ? '' : String(s).replace(/[&<>"'`]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c])));
const formatNRR = (n) => {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x.toFixed(3) : '0.000';
};

// render table rows (always show Pos Logo Team M W T L NRR)
function renderStandingsRows(rows) {
  const tbody = $('pointsBody');
  tbody.innerHTML = '';

  if (!rows || rows.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" class="muted" style="padding:16px;text-align:center">No teams found in this league.</td>`;
    tbody.appendChild(tr);
    return;
  }

  rows.forEach((r, i) => {
    const tr = document.createElement('tr');

    const pos = i + 1;
    const logo = r.logo_url || r.logo || '/assets/logo.png';
    const teamName = r.team_name || r.team || r.name || 'Team';
    const teamId = r.team_id || r.id || null;
    const m = Number(r.m ?? r.matches_played ?? 0);
    const w = Number(r.w ?? r.wins ?? 0);
    const t = Number(r.t ?? r.ties ?? 0);
    const l = Number(r.l ?? r.losses ?? 0);
    const nrr = formatNRR(r.nrr ?? 0);

    tr.innerHTML = `
      <td class="col-pos">${pos}</td>
      <td class="col-logo center"><img class="team-logo" src="${escapeHtml(logo)}" alt="logo" onerror="this.src='/assets/logo.png'"/></td>
      <td class="col-team">
        <div class="team-cell">
          <a href="#" class="team-link" data-teamid="${escapeHtml(teamId || '')}">
            <img class="team-logo" src="${escapeHtml(logo)}" alt="logo" onerror="this.src='/assets/logo.png'"/>
            <span class="team-name">${escapeHtml(teamName)}</span>
          </a>
        </div>
      </td>
      <td class="col-stat">${m}</td>
      <td class="col-stat">${w}</td>
      <td class="col-stat">${t}</td>
      <td class="col-stat">${l}</td>
      <td class="col-stat">${nrr}</td>
    `;

    // click handler for the team link — redirect to logged-in user's public-profile if available
    const link = tr.querySelector('a.team-link');
    if (link) {
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        // If logged-in user has a team (myTeamId), redirect there; else go to clicked team
        const targetTeam = (myTeamId && typeof myTeamId === 'string') ? myTeamId : link.dataset.teamid;
        if (targetTeam) {
          window.location.href = `public-profile.html?team_id=${encodeURIComponent(targetTeam)}`;
        } else if (link.dataset.teamid) {
          window.location.href = `public-profile.html?team_id=${encodeURIComponent(link.dataset.teamid)}`;
        } else {
          // fallback: do nothing
          console.warn('No team id available for navigation');
        }
      });
    }

    tbody.appendChild(tr);
  });
}

// fetch standings via RPC and fallback to teams if empty
async function fetchStandingsForLeague(leagueId) {
  if (!leagueId) return renderStandingsRows([]);
  try {
    const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
    if (error) {
      console.warn('RPC get_league_standings error, falling back to teams list:', error);
      return fallbackTeams(leagueId);
    }
    if (!data || data.length === 0) {
      return fallbackTeams(leagueId);
    }
    // normalize: ensure team_id & team_name keys
    const normalized = data.map((r) => ({
      team_id: r.team_id || r.id,
      team_name: r.team_name || r.team || r.name,
      logo_url: r.logo_url || r.logo,
      m: r.m ?? r.matches_played ?? 0,
      w: r.w ?? r.wins ?? 0,
      t: r.t ?? r.ties ?? 0,
      l: r.l ?? r.losses ?? 0,
      nrr: r.nrr ?? 0
    }));
    renderStandingsRows(normalized);
  } catch (err) {
    console.error('fetchStandingsForLeague exception:', err);
    return fallbackTeams(leagueId);
  }
}

async function fallbackTeams(leagueId) {
  try {
    const { data: teams, error } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId).order('team_name');
    if (error || !teams) {
      renderStandingsRows([]);
      return;
    }
    const rows = teams.map((t) => ({
      team_id: t.id,
      team_name: t.team_name,
      logo_url: t.logo_url,
      m: 0, w: 0, t: 0, l: 0, nrr: 0
    }));
    renderStandingsRows(rows);
  } catch (err) {
    console.error('fallbackTeams err', err);
    renderStandingsRows([]);
  }
}

// fetch top statistics (batters & bowlers) — optional RPC get_league_statistics
async function fetchStatistics(leagueId) {
  const batEl = $('topBatters');
  const bowlEl = $('topBowlers');
  batEl.innerHTML = 'Loading...';
  bowlEl.innerHTML = 'Loading...';
  if (!leagueId) {
    batEl.innerHTML = 'No data';
    bowlEl.innerHTML = 'No data';
    return;
  }
  try {
    const { data, error } = await supabase.rpc('get_league_statistics', { p_league_id: leagueId });
    if (error || !data) {
      batEl.innerHTML = 'No data yet';
      bowlEl.innerHTML = 'No data yet';
      return;
    }
    // format: either array of objects with kind or { batters:[], bowlers:[] }
    if (Array.isArray(data)) {
      const bat = data.filter(x => x.kind === 'batter').slice(0,5);
      const bowl = data.filter(x => x.kind === 'bowler').slice(0,5);
      renderPlayersList(batEl, bat, 'runs');
      renderPlayersList(bowlEl, bowl, 'wickets');
    } else {
      renderPlayersList(batEl, (data.batters || data.bat || []).slice(0,5), 'runs');
      renderPlayersList(bowlEl, (data.bowlers || data.bowl || []).slice(0,5), 'wickets');
    }
  } catch (err) {
    console.error('fetchStatistics err', err);
    $('topBatters').innerHTML = 'No data yet';
    $('topBowlers').innerHTML = 'No data yet';
  }
}
function renderPlayersList(container, arr, metricKey) {
  container.innerHTML = '';
  if (!arr || arr.length === 0) {
    container.innerHTML = '<div class="muted">No data yet</div>';
    return;
  }
  arr.forEach(p => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.padding = '6px 0';
    div.innerHTML = `<div style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(p.player_name || p.name || p.player || p.player_name)}</div>
      <div style="font-weight:700">${escapeHtml(p[metricKey] ?? 0)}</div>`;
    container.appendChild(div);
  });
}

// search leagues
async function searchAndSetLeague(q) {
  if (!q || !q.trim()) return;
  try {
    const { data, error } = await supabase.from('leagues').select('id,name').ilike('name', `%${q}%`).limit(1);
    if (error || !data || data.length === 0) {
      alert('League not found');
      return;
    }
    currentLeagueId = data[0].id;
    $('leagueName').innerText = data[0].name || 'League';
    await refreshAll();
  } catch (err) {
    console.error('searchAndSetLeague err', err);
  }
}

// refresh both areas
async function refreshAll() {
  if (!currentLeagueId) {
    // pick first league available as fallback
    try {
      const { data: one } = await supabase.from('leagues').select('id,name').limit(1).maybeSingle();
      if (one) {
        currentLeagueId = one.id;
        $('leagueName').innerText = one.name || 'League';
      }
    } catch (err) { console.warn('no league fallback', err); }
  }
  if (currentLeagueId) {
    await Promise.all([ fetchStandingsForLeague(currentLeagueId), fetchStatistics(currentLeagueId) ]);
  } else {
    renderStandingsRows([]);
    $('topBatters').innerHTML = 'No data yet';
    $('topBowlers').innerHTML = 'No data yet';
  }
}

// UI wiring
function wireUI() {
  $('tabPoints').addEventListener('click', () => {
    $('pointsCard').style.display = 'block';
    $('statsCard').style.display = 'none';
    $('tabPoints').classList.add('active');
    $('tabStats').classList.remove('active');
  });
  $('tabStats').addEventListener('click', () => {
    $('pointsCard').style.display = 'none';
    $('statsCard').style.display = 'block';
    $('tabStats').classList.add('active');
    $('tabPoints').classList.remove('active');
  });

  $('searchBtn').addEventListener('click', () => {
    const q = $('leagueSearch').value || '';
    searchAndSetLeague(q);
  });
  $('leagueSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchAndSetLeague($('leagueSearch').value || '');
  });

  $('myLeagueBtn').addEventListener('click', async () => {
    if (!myTeamId) {
      alert('You have no team in your profile');
      return;
    }
    try {
      const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
      if (data && data.league_id) {
        currentLeagueId = data.league_id;
        const { data: L } = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
        if (L && L.name) $('leagueName').innerText = L.name;
        await refreshAll();
      } else {
        alert('Your team is not in a league yet');
      }
    } catch (err) { console.error('myLeagueBtn err', err); }
  });
}

// init: session/profile load then refresh
async function init() {
  wireUI();

  try {
    // try to get session & profile
    const s = await supabase.auth.getSession();
    currentUserId = s?.data?.session?.user?.id || null;
    if (currentUserId) {
      const { data: profile, error } = await supabase.from('profiles').select('manager_name,xp,coins,cash,team_id').eq('user_id', currentUserId).maybeSingle();
      if (!error && profile) {
        myTeamId = profile.team_id || null;
        // inject shared UI (top/bottom bars)
        try {
          loadSharedUI({
            supabase,
            manager_name: profile.manager_name || 'Manager',
            xp: profile.xp || 0,
            coins: profile.coins || 0,
            cash: profile.cash || 0,
            user_id: currentUserId
          });
        } catch (e) {
          console.warn('loadSharedUI failed', e);
        }
      }
    } else {
      // still inject shared UI without profile (it will show generic topbar)
      try { loadSharedUI({ supabase, manager_name: 'Manager', xp:0, coins:0, cash:0, user_id: null }); }
      catch (e) { /* ignore */ }
    }
  } catch (err) {
    console.warn('session/profile load failed', err);
  }

  // league from querystring?
  try {
    const params = new URLSearchParams(window.location.search);
    const lid = params.get('league_id');
    if (lid) {
      currentLeagueId = lid;
      // set league name if possible
      try { const { data: L } = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle(); if (L && L.name) $('leagueName').innerText = L.name; } catch(e){}
    }
  } catch (err){}

  await refreshAll();
}

window.addEventListener('DOMContentLoaded', init);
