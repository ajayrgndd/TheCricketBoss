// public/league.js (patched with redirect-based fixture click)
// Compact league table (Pos | Logo | Team | M | Pts) with expandable single-line detail
// Includes MATCHES tab support.
// Place in public/ and ensure league.html loads it as module.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- CONFIG: Use your project's values here ---
const SUPABASE_URL = window.PROJECT_URL || "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = window.ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// helpers
const $ = id => document.getElementById(id);
const esc = s => (s == null ? '' : String(s).replace(/[&<>"'`]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'
}[c])));

let myTeamId = null;
let currentLeagueId = null;
let expandedTeam = null;

/* ---------------- STANDINGS (POINTS TABLE) ---------------- */

function compactDetailRow(stats) {
  const M = stats.matches_played ?? 0;
  const W = stats.wins ?? 0;
  const T = stats.ties ?? 0;
  const L = stats.losses ?? 0;
  const P = stats.points ?? (W*2 + T*1);
  const N = Number(stats.nrr ?? 0).toFixed(3);
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
    const logo = r.logo_url ?? '/assets/logo.png';
    const matches = r.matches_played ?? 0;
    const wins = r.wins ?? 0;
    const ties = r.ties ?? 0;
    const losses = r.losses ?? 0;
    const points = r.points ?? (wins*2 + ties);
    const nrr = r.nrr ?? 0;

    const tr = document.createElement('tr');
    tr.className = 'clickable-row';
    tr.dataset.teamId = teamId;
    tr.innerHTML = `
      <td class="col-pos">${idx+1}</td>
      <td class="col-logo"><img src="${esc(logo)}" alt="logo" style="width:30px;height:30px;border-radius:6px;object-fit:cover" onerror="this.src='/assets/logo.png'"/></td>
      <td class="col-team"><div class="team-cell"><a class="team-link" href="public-profile.html?team_id=${encodeURIComponent(teamId)}"><span class="team-name">${esc(teamName)}</span></a></div></td>
      <td class="col-stat">${matches}</td>
      <td class="col-stat">${points}</td>
    `;

    tr.addEventListener('click', (ev) => {
      if (ev.target.closest('a.team-link')) return; // ignore link clicks
      const tid = tr.dataset.teamId;
      if (expandedTeam === tid) { clearExpanded(); return; }
      clearExpanded();
      const detail = document.createElement('tr');
      detail.className = 'detail-row';
      detail.dataset.team = tid;
      const td = document.createElement('td');
      td.colSpan = 5;
      td.innerHTML = compactDetailRow({ matches_played: matches, wins, ties, losses, points, nrr });
      detail.appendChild(td);
      tr.parentNode.insertBefore(detail, tr.nextSibling);
      expandedTeam = tid;
      if (window.innerWidth < 640) detail.scrollIntoView({ behavior:'smooth', block:'center' });
    });

    tb.appendChild(tr);
  });
}

async function fetchStandings(leagueId) {
  try {
    const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
    if (error || !data || data.length === 0) {
      const { data: teams } = await supabase.from('teams').select('id,team_name,logo_url').eq('league_id', leagueId);
      renderRows((teams||[]).map(t => ({ team_id:t.id, team_name:t.team_name, logo_url:t.logo_url })));
      return;
    }
    renderRows(data.map(r => ({
      team_id:r.team_id, team_name:r.team_name, logo_url:r.logo_url,
      matches_played:r.matches_played, wins:r.wins, ties:r.ties,
      losses:r.losses, points:r.points, nrr:r.nrr
    })));
  } catch { renderRows([]); }
}

/* ---------------- STATISTICS ---------------- */

async function fetchStats(leagueId) {
  const b=$('topBatters'), bw=$('topBowlers');
  if (b) b.textContent='Loading...'; if (bw) bw.textContent='Loading...';
  try {
    const { data } = await supabase.rpc('get_league_statistics',{p_league_id:leagueId});
    if (!data) { if(b) b.textContent='No data yet'; if(bw) bw.textContent='No data yet'; return; }
    const batters=data.batters||[], bowlers=data.bowlers||[];
    if(b) b.innerHTML = batters.slice(0,5).map(x=>`<div>${esc(x.player_name)} <strong>${x.runs}</strong></div>`).join('')||'No data yet';
    if(bw) bw.innerHTML = bowlers.slice(0,5).map(x=>`<div>${esc(x.player_name)} <strong>${x.wickets}</strong></div>`).join('')||'No data yet';
  } catch { if(b) b.textContent='No data yet'; if(bw) bw.textContent='No data yet'; }
}

/* ---------------- MATCHES ---------------- */

function fmtDateTime(ts){ return ts? new Date(ts).toLocaleString() : ''; }

function matchStatusToTarget(status,id){
  const s=(status||'').toLowerCase();
  if(s==='scheduled') return `league-preview.html?fixture_id=${id}`;
  if(s==='running'||s==='live') return `league-match.html?fixture_id=${id}`;
  if(s==='finished'||s==='completed') return `league-replay.html?fixture_id=${id}`;
  return `league-preview.html?fixture_id=${id}`;
}

function renderMatches(fixtures,teamsById){
  const body=$('matchesBody'); if(!body) return; body.innerHTML='';
  if(!fixtures||fixtures.length===0){ body.innerHTML='<tr><td colspan="4">No matches scheduled</td></tr>'; return; }
  fixtures.forEach((f,i)=>{
    const home=teamsById[f.home_team_id]||{}, away=teamsById[f.away_team_id]||{};
    const tr=document.createElement('tr');
    tr.className='match-row clickable-row';
    tr.innerHTML=`
      <td>${i+1}</td>
      <td>
        <img src="${esc(home.logo_url||'/assets/logo.png')}" style="width:24px;height:24px"> ${esc(home.team_name||'')}
        <strong>vs</strong>
        <img src="${esc(away.logo_url||'/assets/logo.png')}" style="width:24px;height:24px"> ${esc(away.team_name||'')}
      </td>
      <td>${f.ovr||''}</td>
      <td>${f.result? esc(f.result_text||'') : fmtDateTime(f.scheduled_at)}</td>`;
    tr.addEventListener('click',()=> window.location.href=matchStatusToTarget(f.status,f.id));
    body.appendChild(tr);
  });
}

async function fetchMatches(leagueId){
  const body=$('matchesBody'); if(!body) return;
  try{
    const {data:fixtures}=await supabase.from('fixtures')
      .select('id,home_team_id,away_team_id,status,scheduled_at,result')
      .eq('league_id',leagueId).order('scheduled_at');
    const ids=[...new Set(fixtures.flatMap(f=>[f.home_team_id,f.away_team_id]))];
    const {data:teams}=await supabase.from('teams').select('id,team_name,logo_url').in('id',ids);
    const map={}; (teams||[]).forEach(t=>map[t.id]=t);
    renderMatches(fixtures,map);
  }catch(e){console.error(e);renderMatches([],{});}
}

/* ---------------- UI & INIT ---------------- */

function wireUI(){
  const P=$('tabPoints'),S=$('tabStats'),M=$('tabMatches');
  if(P)P.onclick=()=>{ $('pointsCard').style.display='block';$('statsCard').style.display='none';$('matchesCard').style.display='none';P.classList.add('active');S?.classList.remove('active');M?.classList.remove('active'); };
  if(S)S.onclick=()=>{ $('pointsCard').style.display='none';$('statsCard').style.display='block';$('matchesCard').style.display='none';S.classList.add('active');P?.classList.remove('active');M?.classList.remove('active'); };
  if(M)M.onclick=()=>{ $('pointsCard').style.display='none';$('statsCard').style.display='none';$('matchesCard').style.display='block';M.classList.add('active');P?.classList.remove('active');S?.classList.remove('active'); };
}

async function init(){
  wireUI();
  // session -> profile
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(session){ const {data:pf}=await supabase.from('profiles').select('team_id').eq('user_id',session.user.id).maybeSingle();
      myTeamId=pf?.team_id||null; }
  }catch{}
  // load league
  const qs=new URLSearchParams(location.search);
  currentLeagueId=qs.get('league_id')||currentLeagueId;
  if(currentLeagueId) await Promise.all([fetchStandings(currentLeagueId),fetchStats(currentLeagueId),fetchMatches(currentLeagueId)]);
}

window.addEventListener('DOMContentLoaded',init);
