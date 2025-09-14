// public/league.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// IMPORTANT: set these before this script runs (Netlify build or an injected small _env script):
// window.PROJECT_URL and window.ANON_KEY
const SUPABASE_URL = window.PROJECT_URL || window._PROJECT_URL_ || "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON = window.ANON_KEY || window._ANON_KEY_ || eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error("Supabase PROJECT_URL or ANON_KEY missing. Set window.PROJECT_URL and window.ANON_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const $ = id => document.getElementById(id);
const esc = s => (s == null ? '' : String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])));

// state
let myTeamId = null;
let currentLeagueId = null;
let expandedTeam = null;

// small helpers
function compactStatsHtml({matches_played=0, wins=0, ties=0, losses=0, points=0, nrr=0}) {
  const P = points ?? (wins*2 + ties*1);
  const N = Number(nrr||0).toFixed(3);
  return `<div style="display:flex;gap:16px;flex-wrap:wrap">
    <div><strong>M:</strong> ${matches_played}</div>
    <div><strong>W:</strong> ${wins}</div>
    <div><strong>T:</strong> ${ties}</div>
    <div><strong>L:</strong> ${losses}</div>
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
  tb.innerHTML = '';
  if (!rows || rows.length === 0) {
    tb.innerHTML = `<tr><td colspan="5" style="padding:18px;text-align:center;color:#9aa5bf">No teams found</td></tr>`;
    return;
  }

  rows.forEach((r, idx) => {
    const teamId = r.team_id ?? r.id;
    const teamName = r.team_name ?? r.name ?? "Team";
    const logo = r.logo_url ?? r.logo ?? "assets/logo.png";
    const matches = r.matches_played ?? r.m ?? 0;
    const wins = r.wins ?? r.w ?? 0;
    const ties = r.ties ?? r.t ?? 0;
    const losses = r.losses ?? r.l ?? 0;
    const points = (r.points ?? r.p) ?? (wins*2 + ties*1);
    const nrr = r.nrr ?? 0;

    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.teamId = teamId;
    tr.innerHTML = `
      <td class="col-pos" style="padding:12px 8px;color:#9aa5bf">${idx+1}</td>
      <td class="col-logo" style="padding:8px 6px"><img src="${esc(logo)}" alt="logo" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.src='assets/logo.png'"/></td>
      <td class="col-team">
        <div class="team-cell">
          <div style="flex:1;min-width:0">
            <a class="team-link" href="public-profile.html?team_id=${encodeURIComponent(teamId)}">
              <span class="team-name">${esc(teamName)}</span>
            </a>
          </div>
        </div>
      </td>
      <td class="col-stat">${matches}</td>
      <td class="col-stat">${points}</td>
    `;

    // click on row toggles expanded detail; clicking anchor navigates to that team
    tr.addEventListener('click', (ev) => {
      // if anchor clicked, don't toggle
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
      td.innerHTML = compactStatsHtml({matches_played:matches, wins, ties, losses, points, nrr});
      detail.appendChild(td);
      tr.parentNode.insertBefore(detail, tr.nextSibling);
      expandedTeam = tid;
      if (window.innerWidth < 640) detail.scrollIntoView({behavior:'smooth', block:'nearest'});
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
      console.warn('RPC error -> falling back to teams', error);
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams||[]).map(t=>({team_id:t.id, team_name:t.team_name, logo_url:t.logo_url, matches_played:0, wins:0, ties:0, losses:0, points:0, nrr:0}));
      renderRows(rows);
      return;
    }
    if (!data || data.length === 0) {
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams||[]).map(t=>({team_id:t.id, team_name:t.team_name, logo_url:t.logo_url, matches_played:0, wins:0, ties:0, losses:0, points:0, nrr:0}));
      renderRows(rows);
      return;
    }
    const normalized = (data||[]).map(r=>({
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
    console.error('fetchStandings error', err);
    renderRows([]);
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
  const tabP = $('tabPoints'), tabS = $('tabStats');
  if (tabP) tabP.addEventListener('click', ()=> { $('pointsCard').style.display='block'; $('statsCard').style.display='none'; tabP.classList.add('active'); tabS.classList.remove('active'); });
  if (tabS) tabS.addEventListener('click', ()=> { $('pointsCard').style.display='none'; $('statsCard').style.display='block'; tabS.classList.add('active'); tabP.classList.remove('active'); });

  const searchBtn = $('searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', async ()=>{
    const q = ($('leagueSearch').value||'').trim();
    if (!q) return;
    try {
      const { data } = await supabase.from('leagues').select('id,name').ilike('name', `%${q}%`).limit(1);
      if (!data || data.length === 0) { alert('League not found'); return; }
      currentLeagueId = data[0].id;
      $('leagueName').innerText = data[0].name || 'League';
      await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId)]);
    } catch (err) { console.error(err); alert('Search failed'); }
  });

  const myBtn = $('myLeagueBtn');
  if (myBtn) myBtn.addEventListener('click', async ()=>{
    if (!myTeamId) { alert('No team found in your profile'); return; }
    try {
      const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
      if (data && data.league_id) {
        currentLeagueId = data.league_id;
        const L = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
        if (L.data && L.data.name) $('leagueName').innerText = L.data.name;
        await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId)]);
      } else alert('Your team is not assigned to a league yet.');
    } catch (err) { console.error(err); alert('Error fetching your league'); }
  });

  const searchInput = $('leagueSearch');
  if (searchInput) searchInput.addEventListener('keypress', (e)=> { if (e.key === 'Enter') { const b = $('searchBtn'); if (b) b.click(); }});
}

// attempt to use shared-ui load if present, otherwise fallback
async function tryLoadSharedUI(profile) {
  if (window.loadSharedUI && typeof window.loadSharedUI === 'function') {
    try {
      window.loadSharedUI({ supabase, manager_name: profile?.manager_name || 'Manager', xp: profile?.xp||0, coins: profile?.coins||0, cash: profile?.cash||0, user_id: profile?.user_id });
      return;
    } catch (e) { console.warn('shared-ui load failed', e); }
  }
  // fallback: minimal topbar already in DOM; update manager name
  try {
    const tb = $('topbar');
    if (tb && profile) {
      const mgr = tb.querySelector('.manager');
      if (mgr) mgr.textContent = profile.manager_name || 'Manager';
    }
  } catch(e){}
}

async function init() {
  wireUI();

  // get session/profile
  try {
    const s = await supabase.auth.getSession();
    const uid = s?.data?.session?.user?.id;
    if (uid) {
      const { data: profile } = await supabase.from('profiles').select('manager_name,team_id,xp,coins,cash,user_id').eq('user_id', uid).maybeSingle();
      if (profile) {
        myTeamId = profile.team_id || null;
        await tryLoadSharedUI(profile);
      }
    }
  } catch (err) { console.warn('session/profile error', err); }

  // league selection order:
  // 1) querystring ?league_id
  // 2) my team's league
  // 3) first league fallback
  const qs = new URLSearchParams(window.location.search);
  currentLeagueId = qs.get('league_id') || null;

  if (!currentLeagueId && myTeamId) {
    try {
      const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
      if (data && data.league_id) currentLeagueId = data.league_id;
    } catch (e) {}
  }

  if (!currentLeagueId) {
    try {
      const { data } = await supabase.from('leagues').select('id,name').limit(1).maybeSingle();
      if (data) { currentLeagueId = data.id; if (data.name) $('leagueName').innerText = data.name; }
    } catch(e){}
  } else {
    // try to fetch league name
    try {
      const { data } = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
      if (data && data.name) $('leagueName').innerText = data.name;
    } catch(e){}
  }

  if (currentLeagueId) {
    await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId)]);
  } else {
    renderRows([]);
  }
}

window.addEventListener('DOMContentLoaded', init);
