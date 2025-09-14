// public/league.js (patched)
// Compact league table (Pos | Logo | Team | M | Pts) with MATCHES tab & expandable single-line detail
// Place in public/ and ensure league.html loads it as module.
// Replace SUPABASE_URL / SUPABASE_ANON_KEY with your project values if needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CONFIG: allow window.PROJECT_URL / ANON_KEY or fallback to your known project values
const SUPABASE_URL = window.PROJECT_URL || "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = window.ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// helpers
const $ = id => document.getElementById(id);
const esc = s => (s == null ? '' : String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])));

let myTeamId = null;
let currentLeagueId = null;
let expandedTeam = null;

// detail row for point table
function compactDetailRow(stats) {
  const M = stats.matches_played ?? 0;
  const W = stats.wins ?? 0;
  const T = stats.ties ?? 0;
  const L = stats.losses ?? 0;
  const P = stats.points ?? (W*2 + T*1);
  const N = Number(stats.nrr ?? 0).toFixed(3);
  return `<div class="compact-detail" style="align-items:center">
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

// POINTS table rendering (unchanged)
function renderPointsRows(rows) {
  const tb = $('pointsBody');
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

    tr.addEventListener('click', (ev) => {
      let el = ev.target;
      while (el && el !== tr) {
        if (el.tagName === 'A' && el.classList.contains('team-link')) return;
        el = el.parentElement;
      }
      const tid = tr.dataset.teamId;
      if (expandedTeam === tid) { clearExpanded(); return; }
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

      // ensure visible above bottom nav
      try {
        const bottomNav = document.querySelector('.tcb-bottomnav') || document.querySelector('.bottom-nav') || null;
        const navHeight = bottomNav ? bottomNav.offsetHeight : 84;
        detail.scrollIntoView({ behavior: 'smooth', block: 'end' });
        window.setTimeout(() => { window.scrollBy({ top: -Math.round(navHeight + 16), left: 0, behavior: 'smooth' }); }, 220);
      } catch (e) {
        detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    tb.appendChild(tr);
  });
}

// MATCHES rendering
function renderMatches(matches, teamsById) {
  const tb = $('matchesBody');
  tb.innerHTML = '';
  if (!matches || matches.length === 0) {
    tb.innerHTML = `<tr><td colspan="4" style="padding:18px;text-align:center;color:#9aa5bf">No matches scheduled</td></tr>`;
    return;
  }

  matches.forEach((m, idx) => {
    // Try to map various common column names
    const id = m.id ?? m.match_id;
    const status = (m.status || m.match_status || '').toString().toLowerCase() || 'scheduled';
    const homeId = m.home_team_id ?? m.home_team ?? m.team_a;
    const awayId = m.away_team_id ?? m.away_team ?? m.team_b;
    const home = teamsById[homeId] || {};
    const away = teamsById[awayId] || {};
    // score display logic: support different naming
    const homeRuns = m.home_runs ?? m.home_score ?? m.home_total ?? m.home;
    const awayRuns = m.away_runs ?? m.away_score ?? m.away_total ?? m.away;
    const homeWickets = m.home_wickets ?? m.home_wkts ?? null;
    const awayWickets = m.away_wickets ?? m.away_wkts ?? null;
    const homeOvers = m.home_overs ?? m.home_ovr ?? m.home_overs_faced ?? m.home_overs_played;
    const awayOvers = m.away_overs ?? m.away_ovr ?? m.away_overs_faced ?? m.away_overs_played;

    // OVR: if match has overs (e.g., 20.0/20) show combined or scheduled overs else '-'
    let ovr = '-';
    if (homeOvers != null || awayOvers != null) {
      // prefer "homeOvers / awayOvers" if both present, else show whichever
      if (homeOvers != null && awayOvers != null) ovr = `${homeOvers} / ${awayOvers}`;
      else ovr = String(homeOvers ?? awayOvers);
    } else if (m.overs) {
      ovr = String(m.overs);
    }

    // Score display: for live/completed show "120/3" or "120 (20.0)"
    let scoreTxt = '-';
    if (status === 'live' || status === 'completed') {
      const hr = (homeRuns != null) ? `${homeRuns}${homeWickets != null ? '/' + homeWickets : ''}` : '-';
      const ar = (awayRuns != null) ? `${awayRuns}${awayWickets != null ? '/' + awayWickets : ''}` : '-';
      scoreTxt = `${hr} — ${ar}`;
      // if overs present, append small overs for each side in parentheses (prefer home)
      const ov = homeOvers ?? awayOvers;
      if (ov != null) scoreTxt += ` (${ov})`;
    } else {
      // scheduled: show local date/time if available
      const sched = m.scheduled_at ?? m.start_time ?? m.match_time;
      if (sched) {
        const d = new Date(sched);
        if (!isNaN(d)) scoreTxt = d.toLocaleString();
      }
    }

    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.matchId = id;
    tr.innerHTML = `
      <td style="padding:12px 8px;color:#9aa5bf">${idx+1}</td>
      <td>
        <div class="match-team">
          <div style="display:flex;align-items:center;gap:8px;min-width:0">
            <img src="${esc(home.logo_url || home.logo || '/assets/logo.png')}" alt="h" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.src='/assets/logo.png'"/>
            <div style="min-width:0">
              <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(home.team_name || home.name || '')}</div>
              <div class="match-status" style="font-size:12px">${status === 'live' ? 'LIVE' : (status === 'completed' ? 'Completed' : 'Scheduled')}</div>
            </div>
          </div>
          <div style="margin-left:8px;display:inline-block;color:var(--muted);font-weight:600">vs</div>
          <div style="display:flex;align-items:center;gap:8px;margin-left:8px;min-width:0">
            <img src="${esc(away.logo_url || away.logo || '/assets/logo.png')}" alt="a" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.src='/assets/logo.png'"/>
            <div style="min-width:0">
              <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(away.team_name || away.name || '')}</div>
            </div>
          </div>
        </div>
      </td>
      <td class="col-stat" style="text-align:center">${esc(ovr)}</td>
      <td class="col-stat match-score">${esc(scoreTxt)}</td>
    `;

    // row click -> redirect depending on status
    tr.addEventListener('click', () => {
      const st = status;
      const mid = encodeURIComponent(id);
      if (st === 'live') {
        window.location.href = `league-match.html?match_id=${mid}`;
      } else if (st === 'completed' || st === 'finished' || st === 'complete') {
        window.location.href = `league-replay.html?match_id=${mid}`;
      } else {
        // scheduled or default
        window.location.href = `league-preview.html?match_id=${mid}`;
      }
    });

    tb.appendChild(tr);
  });
}

// fetch matches and related teams
async function fetchMatches(leagueId) {
  if (!leagueId) {
    renderMatches([], {});
    return;
  }
  try {
    // fetch matches for league (common fields considered)
    const { data: fixtures, error: mErr } = await supabase
      .from('fixtures')
      .select('*')
      .eq('league_id', leagueId)
      .order('scheduled_at', { ascending: true });

    if (mErr) {
      console.warn('matches fetch error', mErr);
      renderMatches([], {});
      return;
    }
    const list = fixtures || [];

    // collect unique team ids used in matches
    const teamIds = new Set();
    list.forEach(m => {
      const home = m.home_team_id ?? m.home_team ?? m.team_a;
      const away = m.away_team_id ?? m.away_team ?? m.team_b;
      if (home != null) teamIds.add(home);
      if (away != null) teamIds.add(away);
    });

    let teamsById = {};
    if (teamIds.size > 0) {
      const ids = Array.from(teamIds);
      const { data: teams, error: tErr } = await supabase.from('teams').select('id,team_name,logo_url,name,logo').in('id', ids);
      if (tErr) {
        console.warn('teams fetch for matches failed', tErr);
      } else if (teams) {
        teamsById = teams.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
      }
    }

    renderMatches(list, teamsById);
  } catch (err) {
    console.error('fetchMatches exception', err);
    renderMatches([], {});
  }
}

// existing fetchStandings & fetchStats left intact (reuse earlier code)
async function fetchStandings(leagueId) {
  if (!leagueId) { renderPointsRows([]); return; }
  try {
    const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
    if (error) {
      console.warn('RPC error, falling back to teams list:', error);
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({ team_id: t.id, team_name: t.team_name, logo_url: t.logo_url, matches_played:0, wins:0, ties:0, losses:0, points:0, nrr:0 }));
      renderPointsRows(rows);
      return;
    }
    if (!data || data.length === 0) {
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({ team_id: t.id, team_name: t.team_name, logo_url: t.logo_url, matches_played:0, wins:0, ties:0, losses:0, points:0, nrr:0 }));
      renderPointsRows(rows);
      return;
    }
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
    renderPointsRows(normalized);
  } catch (err) {
    console.error('fetchStandings exception', err);
    renderPointsRows([]);
  }
}

async function fetchStats(leagueId) {
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

function wireUI() {
  const tabP = $('tabPoints'), tabM = $('tabMatches'), tabS = $('tabStats');
  if (tabP) tabP.addEventListener('click', () => { $('pointsCard').style.display='block'; $('matchesCard').style.display='none'; $('statsCard').style.display='none'; tabP.classList.add('active'); tabM.classList.remove('active'); tabS.classList.remove('active'); });
  if (tabM) tabM.addEventListener('click', () => { $('pointsCard').style.display='none'; $('matchesCard').style.display='block'; $('statsCard').style.display='none'; tabM.classList.add('active'); tabP.classList.remove('active'); tabS.classList.remove('active'); });
  if (tabS) tabS.addEventListener('click', () => { $('pointsCard').style.display='none'; $('matchesCard').style.display='none'; $('statsCard').style.display='block'; tabS.classList.add('active'); tabP.classList.remove('active'); tabM.classList.remove('active'); });

  const searchBtn = $('searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', async () => {
    const q = ($('leagueSearch').value || '').trim();
    if (!q) return;
    try {
      const { data } = await supabase.from('leagues').select('id,name').ilike('name', `%${q}%`).limit(1);
      if (!data || data.length === 0) { alert('League not found'); return; }
      currentLeagueId = data[0].id;
      $('leagueName').innerText = data[0].name || 'League';
      await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId), fetchMatches(currentLeagueId)]);
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

// shared-ui fallback & load (unchanged from previous)
function injectFallbackTopbar(managerName = 'Manager') {
  const container = document.getElementById('topbarContainer');
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
  container.style.height = '64px';
}

async function tryLoadSharedUI(profile) {
  const container = document.getElementById('topbarContainer');
  container.style.height = '64px';
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
    injectFallbackTopbar(profile?.manager_name || 'Manager');
  } catch (err) {
    console.warn('shared-ui.js import failed, using fallback topbar', err);
    injectFallbackTopbar(profile?.manager_name || 'Manager');
  }
}

async function init() {
  wireUI();

  // session/profile
  let profile = null;
  try {
    const s = await supabase.auth.getSession();
    const uid = s?.data?.session?.user?.id;
    if (uid) {
      const { data: pf } = await supabase.from('profiles').select('manager_name,team_id,xp,coins,cash,user_id').eq('user_id', uid).maybeSingle();
      if (pf) {
        profile = pf;
        myTeamId = pf.team_id;
        if (myTeamId) {
          try {
            const { data: team } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
            if (team && team.league_id) currentLeagueId = team.league_id;
          } catch (e) {}
        }
      }
    }
  } catch (err) { console.warn('session fetch failed', err); }

  await tryLoadSharedUI(profile);

  const qs = new URLSearchParams(window.location.search);
  if (!currentLeagueId) currentLeagueId = qs.get('league_id') || null;
  if (!currentLeagueId) {
    try {
      const { data } = await supabase.from('leagues').select('id,name').limit(1).maybeSingle();
      if (data) {
        currentLeagueId = data.id;
        if (data.name) $('leagueName').innerText = data.name;
      }
    } catch (err) {}
  } else {
    try {
      const { data } = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
      if (data && data.name) $('leagueName').innerText = data.name;
    } catch (e) {}
  }

  if (currentLeagueId) {
    await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId), fetchMatches(currentLeagueId)]);
  } else {
    renderPointsRows([]);
    renderMatches([], {});
  }
}

window.addEventListener('DOMContentLoaded', init);
