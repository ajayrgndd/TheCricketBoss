// public/league.js (patched)
// Compact league table (Pos | Logo | Team | M | Pts) with expandable single-line detail
// Also includes MATCHES support (if your league.html has a Matches tab/container).
// Place in public/ and ensure league.html loads it as module.
// Replace SUPABASE_URL / SUPABASE_ANON_KEY with your project values if needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- CONFIG: Use your project's values here (or keep as environment shim) ---
const SUPABASE_URL = window.PROJECT_URL || window.PROJECT_URL || "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = window.ANON_KEY || window.ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// helpers
const $ = id => document.getElementById(id);
const esc = s => (s == null ? '' : String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])));

let myTeamId = null;
let currentLeagueId = null;
let expandedTeam = null;

// Compact single-line detail row HTML (M W T L Pts NRR)
function compactDetailRow(stats) {
  const M = stats.matches_played ?? 0;
  const W = stats.wins ?? 0;
  const T = stats.ties ?? 0;
  const L = stats.losses ?? 0;
  const P = stats.points ?? (W*2 + T*1);
  const N = Number(stats.nrr ?? 0).toFixed(3);
  // Use flexible wrap on tiny screens; caller's CSS controls wrapping behavior
  return `<div class="compact-detail" style="align-items:center;display:flex;flex-wrap:wrap;gap:12px">
    <div><strong>M:</strong> ${M}</div>
    <div><strong>W:</strong> ${W}</div>
    <div><strong>T:</strong> ${T}</div>
    <div><strong>L:</strong> ${L}</div>
    <div><strong>Pts:</strong> ${P}</div>
    <div><strong>NRR:</strong> ${N}</div>
  </div>`;
}

function clearExpanded() {
  if (!expandedTeam) return;
  const ex = document.querySelector(`tr.detail-row[data-team="${expandedTeam}"]`);
  if (ex) ex.remove();
  expandedTeam = null;
}

function renderRows(rows) {
  const tb = $('pointsBody');
  if (!tb) return;
  tb.innerHTML = '';
  if (!rows || rows.length === 0) {
    tb.innerHTML = `<tr><td colspan="5" style="padding:18px;text-align:center;color:#9aa5bf">No teams found</td></tr>`;
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
    const points = r.points ?? r.p ?? (wins*2 + ties*1);
    const nrr = r.nrr ?? 0;

    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.teamId = teamId;
    tr.innerHTML = `
      <td class="col-pos" style="padding:12px 8px;color:#9aa5bf">${idx+1}</td>
      <td class="col-logo" style="padding:8px 6px"><img src="${esc(logo)}" alt="logo" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.src='/assets/logo.png'"/></td>
      <td class="col-team">
        <div class="team-cell">
          <div style="flex:1;min-width:0">
            <a class="team-link" href="public-profile.html?team_id=${encodeURIComponent(teamId)}" style="display:inline-block;color:inherit;text-decoration:none;width:100%"><span class="team-name">${esc(teamName)}</span></a>
          </div>
        </div>
      </td>
      <td class="col-stat">${matches}</td>
      <td class="col-stat">${points}</td>
    `;

    // clicking the row (not the anchor) toggles detail
    tr.addEventListener('click', (ev) => {
      // ignore clicks that originated on the team link
      let el = ev.target;
      while (el && el !== tr) {
        if (el.tagName === 'A' && el.classList.contains('team-link')) return;
        el = el.parentElement;
      }
      const tid = tr.dataset.teamId;
      if (expandedTeam === tid) {
        clearExpanded();
        return;
      }
      clearExpanded();
      const detail = document.createElement('tr');
      detail.className = 'detail-row';
      detail.dataset.team = tid;
      const td = document.createElement('td');
      td.colSpan = 5;
      td.innerHTML = compactDetailRow({
        matches_played: matches,
        wins, ties, losses,
        points, nrr
      });
      detail.appendChild(td);
      tr.parentNode.insertBefore(detail, tr.nextSibling);
      expandedTeam = tid;
      if (window.innerWidth < 640) {
        // try center to avoid bottom nav overlap
        detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    tb.appendChild(tr);
  });
}

async function fetchStandings(leagueId) {
  if (!leagueId) {
    renderRows([]);
    return;
  }
  try {
    const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
    if (error) {
      console.warn('RPC error, falling back to teams list:', error);
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({ team_id: t.id, team_name: t.team_name, logo_url: t.logo_url, matches_played:0, wins:0, ties:0, losses:0, points:0, nrr:0 }));
      renderRows(rows);
      return;
    }
    if (!data || data.length === 0) {
      // no standings data - show teams w/ zeros
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({ team_id: t.id, team_name: t.team_name, logo_url: t.logo_url, matches_played:0, wins:0, ties:0, losses:0, points:0, nrr:0 }));
      renderRows(rows);
      return;
    }
    // normalize
    const normalized = (data || []).map(r => ({
      team_id: r.team_id ?? r.id,
      team_name: r.team_name ?? r.team ?? r.name,
      logo_url: r.logo_url ?? r.logo,
      matches_played: r.m ?? r.matches_played ?? 0,
      wins: r.w ?? r.wins ?? 0,
      ties: r.t ?? r.ties ?? 0,
      losses: r.l ?? r.losses ?? 0,
      points: r.p ?? r.points ?? null,
      nrr: r.nrr ?? 0
    }));
    renderRows(normalized);
  } catch (err) {
    console.error('fetchStandings exception', err);
    renderRows([]);
  }
}

async function fetchStats(leagueId) {
  // Render top players only in the STATISTICS tab; POINT TABLE no longer contains these nodes.
  const b = $('topBatters'), bw = $('topBowlers');
  if (b) b.innerHTML = 'Loading...';
  if (bw) bw.innerHTML = 'Loading...';
  try {
    const { data } = await supabase.rpc('get_league_statistics', { p_league_id: leagueId });
    if (!data) {
      if (b) b.innerHTML = 'No data yet';
      if (bw) bw.innerHTML = 'No data yet';
      return;
    }
    const batters = data.batters || data.top_batters || [];
    const bowlers = data.bowlers || data.top_bowlers || [];
    if (b) b.innerHTML = (batters.length ? batters.slice(0,5).map(x=>`<div style="display:flex;justify-content:space-between;padding:6px 0"><div>${esc(x.player_name||x.name)}</div><div style="font-weight:700">${x.runs||0}</div></div>`).join('') : 'No data yet');
    if (bw) bw.innerHTML = (bowlers.length ? bowlers.slice(0,5).map(x=>`<div style="display:flex;justify-content:space-between;padding:6px 0"><div>${esc(x.player_name||x.name)}</div><div style="font-weight:700">${x.wickets||0}</div></div>`).join('') : 'No data yet');
  } catch (err) {
    if (b) b.innerHTML = 'No data yet';
    if (bw) bw.innerHTML = 'No data yet';
  }
}

/* ------------------- MATCHES: fetch + render -------------------
   This routine fetches fixtures for the league and the teams used in them.
   It expects a table in your HTML (if present) with IDs:
     - tabMatches      (tab button to switch view)
     - matchesCard     (container/card for matches)
     - matchesBody     (tbody for matches rows)
   If those elements aren't present, this section is a no-op.
-----------------------------------------------------------------*/

// Lightweight helper to format date/time nicely (local)
function fmtDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  // example: 9/15/2025, 9:00:00 PM
  return d.toLocaleString();
}

function matchStatusToTarget(status, fixtureId) {
  // map fixture.status to page
  if (!status) return `league-preview.html?fixture_id=${encodeURIComponent(fixtureId)}`;
  const s = status.toLowerCase();
  if (s === 'scheduled') return `league-preview.html?fixture_id=${encodeURIComponent(fixtureId)}`;
  if (s === 'running' || s === 'live') return `league-match.html?fixture_id=${encodeURIComponent(fixtureId)}`;
  if (s === 'finished' || s === 'completed') return `league-replay.html?fixture_id=${encodeURIComponent(fixtureId)}`;
  return `league-preview.html?fixture_id=${encodeURIComponent(fixtureId)}`;
}

function renderMatches(fixtures, teamsById) {
  const matchesBody = $('matchesBody');
  if (!matchesBody) return;
  matchesBody.innerHTML = '';

  if (!fixtures || fixtures.length === 0) {
    matchesBody.innerHTML = `<tr><td colspan="5" style="padding:18px;text-align:center;color:#9aa5bf">No matches scheduled</td></tr>`;
    return;
  }

  fixtures.forEach((f, idx) => {
    const home = teamsById[f.home_team_id] || {};
    const away = teamsById[f.away_team_id] || {};
    const homeName = home.team_name || '';
    const awayName = away.team_name || '';
    const homeLogo = home.logo_url || '/assets/logo.png';
    const awayLogo = away.logo_url || '/assets/logo.png';
    const status = f.status || 'scheduled';
    const ovr = f.ovr ?? (f.sim_over ? 1 : 1); // placeholder - replace with actual OVR calc or field
    const score = (f.result && (f.result.home_runs != null || f.result.away_runs != null))
      ? `${f.result.home_runs || 0}/${f.result.home_wickets || 0} - ${f.result.away_runs || 0}/${f.result.away_wickets || 0}`
      : (f.score_display || '');

    const tr = document.createElement('tr');
    tr.className = 'match-row clickable-row';
    tr.innerHTML = `
      <td style="padding:12px 8px;color:#9aa5bf">${idx+1}</td>
      <td style="padding:8px 6px;width:120px">
        <div style="display:flex;align-items:center;gap:8px">
          <img src="${esc(homeLogo)}" alt="home" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.src='/assets/logo.png'"/>
          <div style="font-size:13px">${esc(homeName)}</div>
          <div style="margin:0 6px;color:#9aa5bf;font-weight:700">vs</div>
          <img src="${esc(awayLogo)}" alt="away" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.src='/assets/logo.png'"/>
          <div style="font-size:13px">${esc(awayName)}</div>
        </div>
      </td>
      <td style="text-align:center;font-weight:700">${esc(String(ovr))}</td>
      <td style="text-align:right;font-weight:700">${esc(score || fmtDateTime(f.scheduled_at || f.kickoff_at || f.scheduled_at))}</td>
    `;

    // click behavior -> route based on status
    tr.addEventListener('click', () => {
      const target = matchStatusToTarget(status, f.id);
      window.location.href = target;
    });

    matchesBody.appendChild(tr);
  });
}

// Fetch fixtures for the league (all fixtures for that league)
async function fetchMatches(leagueId) {
  // bail early if matches area not present
  if (!$('matchesBody')) return;
  if (!leagueId) {
    renderMatches([], {});
    return;
  }

  try {
    // fetch fixtures for this league (order by scheduled_at/top)
    const { data: fixtures, error: fxErr } = await supabase
      .from('fixtures')
      .select('id,league_id,home_team_id,away_team_id,status,scheduled_at,kickoff_at,result,started_at,finished_at')
      .eq('league_id', leagueId)
      .order('scheduled_at', { ascending: true });

    if (fxErr) {
      console.warn('fixtures fetch failed', fxErr);
      renderMatches([], {});
      return;
    }
    if (!fixtures || fixtures.length === 0) {
      renderMatches([], {});
      return;
    }

    // collect all team ids referenced
    const ids = [];
    fixtures.forEach(f => {
      if (f.home_team_id) ids.push(f.home_team_id);
      if (f.away_team_id) ids.push(f.away_team_id);
    });

    // dedupe
    const uniqIds = [...new Set(ids)];

    // fetch teams info - NOTE: select only columns that exist (no `name` column)
    const { data: teams, error: tErr } = await supabase
      .from('teams')
      .select('id,team_name,logo_url')
      .in('id', uniqIds);

    if (tErr) {
      console.warn('teams fetch for fixtures failed', tErr);
      // build some basic map by ids with empty names
      const teamsByIdFallback = {};
      uniqIds.forEach(id => teamsByIdFallback[id] = { team_name: 'Team', logo_url: '/assets/logo.png' });
      renderMatches(fixtures, teamsByIdFallback);
      return;
    }

    const teamsById = {};
    (teams || []).forEach(t => {
      teamsById[t.id] = t;
    });

    renderMatches(fixtures, teamsById);
  } catch (err) {
    console.error('fetchMatches exception', err);
    renderMatches([], {});
  }
}

/* ------------------- UI wiring ------------------- */

function wireUI() {
  const tabP = $('tabPoints'), tabS = $('tabStats'), tabM = $('tabMatches');
  if (tabP) tabP.addEventListener('click', () => {
    if ($('pointsCard')) $('pointsCard').style.display='block';
    if ($('statsCard')) $('statsCard').style.display='none';
    if ($('matchesCard')) $('matchesCard').style.display='none';
    tabP.classList.add('active'); tabS && tabS.classList.remove('active'); tabM && tabM.classList.remove('active');
  });
  if (tabS) tabS.addEventListener('click', () => {
    if ($('pointsCard')) $('pointsCard').style.display='none';
    if ($('statsCard')) $('statsCard').style.display='block';
    if ($('matchesCard')) $('matchesCard').style.display='none';
    tabS.classList.add('active'); tabP && tabP.classList.remove('active'); tabM && tabM.classList.remove('active');
  });
  if (tabM) tabM.addEventListener('click', () => {
    if ($('pointsCard')) $('pointsCard').style.display='none';
    if ($('statsCard')) $('statsCard').style.display='none';
    if ($('matchesCard')) $('matchesCard').style.display='block';
    tabM.classList.add('active'); tabP && tabP.classList.remove('active'); tabS && tabS.classList.remove('active');
  });

  const searchBtn = $('searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', async () => {
    const q = ($('leagueSearch').value || '').trim();
    if (!q) return;
    try {
      const { data } = await supabase.from('leagues').select('id,name').ilike('name', `%${q}%`).limit(1);
      if (!data || data.length === 0) { alert('League not found'); return; }
      currentLeagueId = data[0].id;
      $('leagueName').innerText = data[0].name || 'League';
      await Promise.all([
        fetchStandings(currentLeagueId),
        fetchStats(currentLeagueId),
        fetchMatches(currentLeagueId)  // update matches too
      ]);
    } catch (err) { console.error(err); alert('Search failed'); }
  });

  const myBtn = $('myLeagueBtn');
  if (myBtn) myBtn.addEventListener('click', async () => {
    if (!myTeamId) { alert('No team found in your profile'); return; }
    try {
      const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
      if (data && data.league_id) {
        currentLeagueId = data.league_id;
        await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId), fetchMatches(currentLeagueId)]);
        const L = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
        if (L.data && L.data.name) $('leagueName').innerText = L.data.name;
      } else alert('Your team is not assigned to a league yet.');
    } catch (err) { console.error(err); alert('Error fetching your league'); }
  });

  const searchInput = $('leagueSearch');
  if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const btn = $('searchBtn'); if (btn) btn.click(); } });
}

/* ------------------- shared UI fallback loader ------------------- */

// fallback topbar injection (used if shared-ui.js not loaded)
function injectFallbackTopbar(managerName = 'Manager') {
  const container = document.getElementById('topbarContainer');
  if (!container) return;
  container.innerHTML = '';
  const bar = document.createElement('div');
  bar.className = 'fallback-topbar';
  bar.innerHTML = `
    <div class="left">
      <img class="logo" src="/assets/logo.png" alt="logo" />
      <div class="manager">${esc(managerName)}</div>
    </div>
    <div class="right">
      <div class="stat">XP</div>
      <div class="stat">CB</div>
      <div class="stat">Cash</div>
      <div class="stat">Inbox</div>
    </div>
  `;
  container.appendChild(bar);
  // reduce placeholder height now that we injected topbar
  container.style.height = '64px';
}

// attempt to import shared-ui and call loadSharedUI; if fails inject fallback
async function tryLoadSharedUI(profile) {
  const container = document.getElementById('topbarContainer');
  if (container) container.style.height = '64px';
  try {
    const sharedModule = await import('./shared-ui.js');
    if (sharedModule && typeof sharedModule.loadSharedUI === 'function') {
      try {
        sharedModule.loadSharedUI({
          supabase,
          manager_name: profile?.manager_name || 'Manager',
          xp: profile?.xp || 0,
          coins: profile?.coins || 0,
          cash: profile?.cash || 0,
          user_id: profile?.user_id || null
        });
        return;
      } catch (e) {
        console.warn('shared-ui.loadSharedUI failed', e);
      }
    }
    // fallback
    injectFallbackTopbar(profile?.manager_name || 'Manager');
  } catch (err) {
    // module not found or network error: inject fallback topbar
    console.warn('shared-ui.js import failed, using fallback topbar', err);
    injectFallbackTopbar(profile?.manager_name || 'Manager');
  }
}

/* ------------------- INIT ------------------- */

async function init() {
  wireUI();

  // try get session/profile
  let profile = null;
  try {
    const s = await supabase.auth.getSession();
    const uid = s?.data?.session?.user?.id;
    if (uid) {
      const { data: pf } = await supabase.from('profiles').select('manager_name,team_id,xp,coins,cash,user_id').eq('user_id', uid).maybeSingle();
      if (pf) {
        profile = pf;
        myTeamId = pf.team_id;
        // prefer user's team league
        if (myTeamId) {
          try {
            const { data: team } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
            if (team && team.league_id) currentLeagueId = team.league_id;
          } catch (e) { /* ignore */ }
        }
      }
    }
  } catch (err) {
    console.warn('session fetch failed', err);
  }

  // load shared UI (or fallback)
  await tryLoadSharedUI(profile);

  // if still no league chosen: look for league_id in querystring, else first league fallback
  const qs = new URLSearchParams(window.location.search);
  if (!currentLeagueId) currentLeagueId = qs.get('league_id') || null;
  if (!currentLeagueId) {
    try {
      const { data } = await supabase.from('leagues').select('id,name').limit(1).maybeSingle();
      if (data) {
        currentLeagueId = data.id;
        if (data.name) $('leagueName').innerText = data.name;
      }
    } catch (err) { /* ignore */ }
  } else {
    // load name too
    try {
      const { data } = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
      if (data && data.name) $('leagueName').innerText = data.name;
    } catch (e) {}
  }

  // fetch and render
  if (currentLeagueId) {
    await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId), fetchMatches(currentLeagueId)]);
  } else {
    renderRows([]);
  }
}

window.addEventListener('DOMContentLoaded', init);
