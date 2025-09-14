// public/league.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CONFIG - keep these values or override via window.PROJECT_URL / window.ANON_KEY
const SUPABASE_URL = window.PROJECT_URL || "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = window.ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// helpers
const $ = id => document.getElementById(id);
const esc = s => (s == null ? '' : String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])));

let myTeamId = null;
let currentLeagueId = null;
let expandedTeam = null;

/* responsive detail row HTML; uses .detail-inner and .detail-item classes so it wraps
   properly and NRR stays visible on small screens */
function responsiveDetailRowHtml(stats) {
  const M = stats.matches_played ?? 0;
  const W = stats.wins ?? 0;
  const T = stats.ties ?? 0;
  const L = stats.losses ?? 0;
  const P = stats.points ?? (W*2 + T*1);
  const N = Number(stats.nrr ?? 0).toFixed(3);

  return `
    <div class="detail-inner">
      <div class="detail-item"><strong>M:</strong> ${M}</div>
      <div class="detail-item"><strong>W:</strong> ${W}</div>
      <div class="detail-item"><strong>T:</strong> ${T}</div>
      <div class="detail-item"><strong>L:</strong> ${L}</div>
      <div class="detail-item"><strong>Pts:</strong> ${P}</div>
      <div class="detail-item"><strong>NRR:</strong> ${N}</div>
    </div>
  `;
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
      <td class="col-logo" style="padding:8px 6px">
        <img src="${esc(logo)}" alt="logo" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.src='/assets/logo.png'"/>
      </td>
      <td class="col-team">
        <div class="team-cell">
          <div style="flex:1;min-width:0">
            <a class="team-link" href="public-profile.html?team_id=${encodeURIComponent(teamId)}" style="display:inline-block;color:inherit;text-decoration:none;width:100%">
              <span class="team-name">${esc(teamName)}</span>
            </a>
          </div>
        </div>
      </td>
      <td class="col-stat">${matches}</td>
      <td class="col-stat">${points}</td>
    `;

    // clicking row toggles expanded detail (but not when clicking the team link)
    tr.addEventListener('click', (ev) => {
      let el = ev.target;
      while (el && el !== tr) {
        if (el.tagName === 'A' && el.classList.contains('team-link')) return; // don't toggle if team link clicked
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
      td.style.padding = '12px 16px';
      td.innerHTML = responsiveDetailRowHtml({
        matches_played: matches,
        wins, ties, losses,
        points, nrr
      });
      detail.appendChild(td);
      tr.parentNode.insertBefore(detail, tr.nextSibling);
      expandedTeam = tid;
      if (window.innerWidth < 640) detail.scrollIntoView({behavior:'smooth', block:'nearest'});
    });

    tb.appendChild(tr);
  });
}

async function fetchStandings(leagueId) {
  if (!leagueId) { renderRows([]); return; }
  try {
    const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
    if (error) {
      console.warn('RPC error (get_league_standings), falling back to teams list:', error);
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({ team_id: t.id, team_name: t.team_name, logo_url: t.logo_url, matches_played:0, wins:0, ties:0, losses:0, points:0, nrr:0 }));
      renderRows(rows);
      return;
    }
    if (!data || data.length === 0) {
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({ team_id: t.id, team_name: t.team_name, logo_url: t.logo_url, matches_played:0, wins:0, ties:0, losses:0, points:0, nrr:0 }));
      renderRows(rows);
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
    renderRows(normalized);
  } catch (err) {
    console.error('fetchStandings exception', err);
    renderRows([]);
  }
}

async function fetchStats(leagueId) {
  const b = $('topBatters'), bw = $('topBowlers');
  if (b) b.innerHTML = 'Loading...';
  if (bw) bw.innerHTML = 'Loading...';
  try {
    const { data } = await supabase.rpc('get_league_statistics', { p_league_id: leagueId });
    if (!data) { if (b) b.innerHTML = 'No data yet'; if (bw) bw.innerHTML = 'No data yet'; return; }
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
  if (tabP) tabP.addEventListener('click', () => { $('pointsCard').style.display='block'; $('statsCard').style.display='none'; tabP.classList.add('active'); tabS.classList.remove('active'); });
  if (tabS) tabS.addEventListener('click', () => { $('pointsCard').style.display='none'; $('statsCard').style.display='block'; tabS.classList.add('active'); tabP.classList.remove('active'); });

  const searchBtn = $('searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', async () => {
    const q = ($('leagueSearch').value || '').trim();
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
  if (myBtn) myBtn.addEventListener('click', async () => {
    if (!myTeamId) { alert('No team found in your profile'); return; }
    try {
      const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
      if (data && data.league_id) {
        currentLeagueId = data.league_id;
        await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId)]);
        const L = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
        if (L.data && L.data.name) $('leagueName').innerText = L.data.name;
      } else alert('Your team is not assigned to a league yet.');
    } catch (err) { console.error(err); alert('Error fetching your league'); }
  });

  const searchInput = $('leagueSearch');
  if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const btn = $('searchBtn'); if (btn) btn.click(); } });
}

/* fallback topbar if shared-ui can't be imported or fails */
function injectFallbackTopbar(managerName = 'Manager') {
  const container = document.getElementById('topbarContainer');
  container.innerHTML = '';
  const bar = document.createElement('div');
  bar.style.height = '64px';
  bar.style.display = 'flex';
  bar.style.alignItems = 'center';
  bar.style.padding = '8px 12px';
  bar.style.background = 'linear-gradient(90deg,#182b4d,#111d3a)';
  bar.innerHTML = `<div style="display:flex;align-items:center;gap:10px;color:#fff"><img src="/assets/logo.png" style="height:40px"/><div style="font-weight:700">${esc(managerName)}</div></div><div style="margin-left:auto;color:#fff;opacity:0.95;padding-right:12px">XP &nbsp; CB &nbsp; Cash &nbsp; Inbox</div>`;
  container.appendChild(bar);
}

/* try to import shared-ui.js (your path). If import fails, fallback */
async function tryLoadSharedUI(profile) {
  try {
    const shared = await import('./js/shared-ui.js');
    if (shared && typeof shared.loadSharedUI === 'function') {
      try {
        shared.loadSharedUI({
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
    console.warn('shared-ui import failed, using fallback topbar', err);
    injectFallbackTopbar(profile?.manager_name || 'Manager');
  }
}

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
        if (myTeamId) {
          try {
            const { data: team } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
            if (team && team.league_id) currentLeagueId = team.league_id;
          } catch (e) { /* ignore */ }
        }
      }
    }
  } catch (err) { console.warn('session fetch failed', err); }

  // load shared UI (or fallback)
  await tryLoadSharedUI(profile);

  // determine league id (querystring / fallback)
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
    try {
      const { data } = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
      if (data && data.name) $('leagueName').innerText = data.name;
    } catch (e) {}
  }

  // fetch and render
  if (currentLeagueId) {
    await Promise.all([fetchStandings(currentLeagueId), fetchStats(currentLeagueId)]);
  } else {
    renderRows([]);
  }
}

window.addEventListener('DOMContentLoaded', init);
