// public/league.js
// Shows compact table rows and expandable detail rows when clicking a row (except team name).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- hardcode your supabase project url + anon key here ---
const SUPABASE_URL = "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// state
let currentLeagueId = null;
let myTeamId = null;
let expandedTeamId = null;

const $ = id => document.getElementById(id);
const escapeHtml = s => (s==null? '': String(s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])));

// helpers
function makeDetailHtml(stats){
  // stats: object containing matches_played, wins, ties, losses, points, runs_scored, overs_faced, runs_conceded, overs_bowled, nrr, updated_at
  const parts = [
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
  // Render as small blocks
  return `<div class="detail-content">` + parts.map(p => `<div class="detail-item">${escapeHtml(p)}</div>`).join('') + `</div>`;
}

// rendering
function clearExpanded(){
  if (!expandedTeamId) return;
  const existing = document.querySelector('tr.detail-row[data-team-id="'+expandedTeamId+'"]');
  if (existing) existing.remove();
  expandedTeamId = null;
}

function renderRows(rows){
  const tbody = $('pointsBody');
  tbody.innerHTML = '';
  if (!rows || rows.length === 0){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" class="muted" style="padding:16px;text-align:center">No teams found in this league.</td>`;
    tbody.appendChild(tr);
    return;
  }
  rows.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.classList.add('clickable-row');
    // Save the raw stats on dataset for later use
    tr.dataset.teamId = r.team_id ?? r.id ?? '';
    tr.dataset.matchesPlayed = r.matches_played ?? r.m ?? 0;
    tr.dataset.wins = r.wins ?? r.w ?? 0;
    tr.dataset.ties = r.ties ?? r.t ?? 0;
    tr.dataset.losses = r.losses ?? r.l ?? 0;
    tr.dataset.points = r.points ?? r.p ?? 0;
    tr.dataset.runsScored = r.runs_scored ?? 0;
    tr.dataset.oversFaced = r.overs_faced ?? r.overs_faced ?? r.overs_faced ?? 0;
    tr.dataset.runsConceded = r.runs_conceded ?? 0;
    tr.dataset.oversBowled = r.overs_bowled ?? 0;
    tr.dataset.nrr = Number(r.nrr ?? 0).toFixed(3);
    tr.dataset.updatedAt = r.updated_at ?? r.updated_at ?? null;

    const logo = r.logo_url || r.logo || '/assets/logo.png';
    const teamName = r.team_name || r.team || r.name || 'Team';

    tr.innerHTML = `
      <td class="col-pos">${idx + 1}</td>
      <td class="col-logo center"><img class="team-logo" src="${escapeHtml(logo)}" onerror="this.src='/assets/logo.png'"/></td>
      <td class="col-team">
        <div class="team-cell">
          <a href="public-profile.html?team_id=${encodeURIComponent(tr.dataset.teamId)}" class="team-link" data-teamid="${encodeURIComponent(tr.dataset.teamId)}">
            <img class="team-logo" src="${escapeHtml(logo)}" onerror="this.src='/assets/logo.png'"/>
            <span class="team-name">${escapeHtml(teamName)}</span>
          </a>
        </div>
      </td>
      <td class="col-stat">${tr.dataset.matchesPlayed}</td>
      <td class="col-stat">${tr.dataset.wins}</td>
      <td class="col-stat">${tr.dataset.ties}</td>
      <td class="col-stat">${tr.dataset.losses}</td>
      <td class="col-stat">${tr.dataset.nrr}</td>
    `;
    // Row click toggles details (but not when clicking the team link)
    tr.addEventListener('click', function(ev){
      // if clicked inside team-link, skip
      const path = ev.composedPath ? ev.composedPath() : (ev.path || []);
      for (const el of path) {
        if (el && el.classList && el.classList.contains && el.classList.contains('team-link')) {
          return; // team name clicked -> navigation handled by anchor
        }
      }

      const teamId = this.dataset.teamId;
      // if this row is already expanded -> collapse
      if (expandedTeamId === teamId) {
        clearExpanded();
        return;
      }
      // collapse previous
      clearExpanded();
      // create detail tr just after this tr
      const detailTr = document.createElement('tr');
      detailTr.className = 'detail-row';
      detailTr.dataset.teamId = teamId;
      const td = document.createElement('td');
      td.colSpan = 8;
      // build stats object
      const stats = {
        matches_played: this.dataset.matchesPlayed,
        wins: this.dataset.wins,
        ties: this.dataset.ties,
        losses: this.dataset.losses,
        points: this.dataset.points,
        runs_scored: this.dataset.runsScored,
        overs_faced: this.dataset.oversFaced,
        runs_conceded: this.dataset.runsConceded,
        overs_bowled: this.dataset.oversBowled,
        nrr: this.dataset.nrr,
        updated_at: this.dataset.updatedAt
      };
      td.innerHTML = makeDetailHtml(stats);
      detailTr.appendChild(td);
      // insert after the tr in DOM
      if (this.nextSibling) this.parentNode.insertBefore(detailTr, this.nextSibling);
      else this.parentNode.appendChild(detailTr);
      expandedTeamId = teamId;
    });

    $('pointsBody').appendChild(tr);
  });
}

// Fetching
async function fetchStandings(leagueId){
  if (!leagueId) {
    renderRows([]);
    return;
  }
  try {
    const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
    if (error) {
      console.warn('RPC error', error);
      // fallback to teams list with zeros
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({
        team_id: t.id,
        team_name: t.team_name,
        logo_url: t.logo_url,
        matches_played: 0, wins:0, ties:0, losses:0, points:0, runs_scored:0, overs_faced:0, runs_conceded:0, overs_bowled:0, nrr:0, updated_at:null
      }));
      renderRows(rows);
      return;
    }
    if (!data || data.length === 0) {
      // fallback to teams
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      const rows = (teams || []).map(t => ({
        team_id: t.id,
        team_name: t.team_name,
        logo_url: t.logo_url,
        matches_played: 0, wins:0, ties:0, losses:0, points:0, runs_scored:0, overs_faced:0, runs_conceded:0, overs_bowled:0, nrr:0, updated_at:null
      }));
      renderRows(rows);
      return;
    }
    // data returned from RPC: expected fields (team_id, team_name, logo_url, m,w,t,l,p,nrr, runs_scored, overs_faced, runs_conceded, overs_bowled, updated_at)
    // Normalize as needed
    const normalized = (data || []).map(r => ({
      team_id: r.team_id || r.id,
      team_name: r.team_name || r.team || r.name,
      logo_url: r.logo_url || r.logo,
      matches_played: r.m ?? r.matches_played ?? 0,
      wins: r.w ?? r.wins ?? 0,
      ties: r.t ?? r.ties ?? 0,
      losses: r.l ?? r.losses ?? 0,
      points: r.p ?? r.points ?? 0,
      runs_scored: r.runs_scored ?? 0,
      overs_faced: r.overs_faced ?? r.overs_faced ?? 0,
      runs_conceded: r.runs_conceded ?? 0,
      overs_bowled: r.overs_bowled ?? 0,
      nrr: r.nrr ?? 0,
      updated_at: r.updated_at ?? null
    }));
    renderRows(normalized);
  } catch (err) {
    console.error('fetchStandings err', err);
    renderRows([]);
  }
}

async function fetchStats(leagueId){
  const batEl = $('topBatters'), bowlEl = $('topBowlers');
  batEl.innerHTML = 'Loading...'; bowlEl.innerHTML = 'Loading...';
  try {
    const { data, error } = await supabase.rpc('get_league_statistics', { p_league_id: leagueId });
    if (error || !data) { batEl.innerHTML='No data yet'; bowlEl.innerHTML='No data yet'; return; }
    // adapt flexible shapes
    const batters = Array.isArray(data) ? data.filter(x=>x.kind==='batter').slice(0,5) : (data.batters || data.bat || []).slice(0,5);
    const bowlers = Array.isArray(data) ? data.filter(x=>x.kind==='bowler').slice(0,5) : (data.bowlers || data.bowl || []).slice(0,5);
    batEl.innerHTML = batters.length ? batters.map(b=>`<div style="display:flex;justify-content:space-between;padding:4px 0"><div>${escapeHtml(b.player_name||b.name||b.player)}</div><div style="font-weight:700">${b.runs||0}</div></div>`).join('') : '<div class="muted">No data yet</div>';
    bowlEl.innerHTML = bowlers.length ? bowlers.map(b=>`<div style="display:flex;justify-content:space-between;padding:4px 0"><div>${escapeHtml(b.player_name||b.name||b.player)}</div><div style="font-weight:700">${b.wickets||0}</div></div>`).join('') : '<div class="muted">No data yet</div>';
  } catch (err){ console.error('fetchStats err', err); batEl.innerHTML='No data yet'; bowlEl.innerHTML='No data yet'; }
}

// load league name optionally
async function loadLeagueName(leagueId){
  try {
    const { data } = await supabase.from('leagues').select('name').eq('id', leagueId).maybeSingle();
    if (data && data.name) $('leagueName').innerText = data.name;
  } catch (err){ }
}

// ui wiring
function setupUI(){
  // tabs
  $('tabPoints').addEventListener('click', ()=>{ $('pointsCard').style.display='block'; $('statsCard').style.display='none'; $('tabPoints').classList.add('active'); $('tabStats').classList.remove('active'); });
  $('tabStats').addEventListener('click', ()=>{ $('pointsCard').style.display='none'; $('statsCard').style.display='block'; $('tabStats').classList.add('active'); $('tabPoints').classList.remove('active'); });

  // search
  $('searchBtn').addEventListener('click', async ()=>{
    const q = ($('leagueSearch').value||'').trim();
    if (!q) return;
    try {
      const { data } = await supabase.from('leagues').select('id,name').ilike('name', `%${q}%`).limit(1);
      if (!data || data.length===0) { alert('League not found'); return; }
      currentLeagueId = data[0].id;
      await loadLeagueName(currentLeagueId);
      await Promise.all([ fetchStandings(currentLeagueId), fetchStats(currentLeagueId) ]);
    } catch (err) { console.error(err); alert('Search error'); }
  });

  $('leagueSearch').addEventListener('keypress', (e)=>{ if (e.key==='Enter') $('searchBtn').click(); });

  $('myLeagueBtn').addEventListener('click', async ()=>{
    if (!myTeamId) { alert('You have no team in profile'); return; }
    try {
      const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
      if (data && data.league_id) {
        currentLeagueId = data.league_id;
        await loadLeagueName(currentLeagueId);
        await Promise.all([ fetchStandings(currentLeagueId), fetchStats(currentLeagueId) ]);
      } else alert('Your team not in a league');
    } catch (err) { console.error(err); alert('Error'); }
  });
}

// init
async function init(){
  setupUI();
  // get session & profile
  try {
    const s = await supabase.auth.getSession();
    const uid = s?.data?.session?.user?.id;
    if (uid) {
      const { data: profile } = await supabase.from('profiles').select('manager_name,team_id,xp,coins,cash').eq('user_id', uid).maybeSingle();
      if (profile) myTeamId = profile.team_id;
    }
  } catch (err) { console.warn('session fetch failed', err); }

  // league id from query or pick first
  const qs = new URLSearchParams(window.location.search);
  currentLeagueId = qs.get('league_id') || null;
  if (!currentLeagueId) {
    try {
      const { data } = await supabase.from('leagues').select('id,name').limit(1).maybeSingle();
      if (data) { currentLeagueId = data.id; if (data.name) $('leagueName').innerText = data.name; }
    } catch (e){}
  } else {
    await loadLeagueName(currentLeagueId);
  }

  // initial load
  if (currentLeagueId) {
    await Promise.all([ fetchStandings(currentLeagueId), fetchStats(currentLeagueId) ]);
  } else {
    renderRows([]);
    $('topBatters').innerText = 'No data yet';
    $('topBowlers').innerText = 'No data yet';
  }
}

window.addEventListener('DOMContentLoaded', init);
