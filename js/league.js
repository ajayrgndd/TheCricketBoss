// public/league.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadSharedUI } from './shared-ui.js';

// Configure these via Netlify environment variables injected into the page,
// or replace for local testing (NOT recommended to commit secrets).
const PROJECT_URL = window.PROJECT_URL || (window.__env && window.__env.PROJECT_URL) || '';
const ANON_KEY = window.ANON_KEY || (window.__env && window.__env.ANON_KEY) || '';

const supabase = createClient(PROJECT_URL, ANON_KEY);

function q(id){ return document.getElementById(id); }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"}[c])); }
function formatNRR(n){ return (n === null || n === undefined) ? '0.000' : Number(n).toFixed(3); }

let currentLeagueId = null;
let myTeamId = null;

// Render functions
function renderPoints(rows){
  const container = q('pointsList');
  container.innerHTML = '';
  if (!rows || rows.length === 0){ q('pointsEmpty').style.display = 'block'; return; }
  q('pointsEmpty').style.display = 'none';
  for (const r of rows){
    const div = document.createElement('div');
    div.className = 'row clickable';
    div.innerHTML = `
      <div class="col-logo"><img src="${r.logo_url || '/assets/logo.png'}" class="team-logo" onerror="this.src='/assets/logo.png'"/></div>
      <div class="col-name"><div class="team-name" title="${escapeHtml(r.team_name)}">${escapeHtml(r.team_name)}</div></div>
      <div class="col-stat">${r.m}</div>
      <div class="col-stat">${r.w}</div>
      <div class="col-stat">${r.t}</div>
      <div class="col-stat">${r.l}</div>
      <div class="col-stat">${r.p}</div>
      <div class="col-stat">${formatNRR(r.nrr)}</div>
    `;
    div.addEventListener('click', ()=> { window.location.href = `public-profile.html?team_id=${r.team_id}`; });
    container.appendChild(div);
  }
}

function renderStats(rows){
  const bat = rows.filter(r=>r.kind==='batter').slice(0,5);
  const bowl = rows.filter(r=>r.kind==='bowler').slice(0,5);
  const bcont = q('topBatters'); bcont.innerHTML = '';
  const wcont = q('topBowlers'); wcont.innerHTML = '';
  if (bat.length === 0) bcont.innerHTML = `<div style="color:var(--muted)">No data</div>`;
  if (bowl.length === 0) wcont.innerHTML = `<div style="color:var(--muted)">No data</div>`;
  for (const p of bat){
    const el = document.createElement('div');
    el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.gap = '8px'; el.style.padding = '6px 0';
    el.innerHTML = `<img src="${p.image_url || '/assets/logo.png'}" style="width:40px;height:40px;border-radius:6px;object-fit:cover"/> 
      <div style="flex:1"><div style="font-weight:700">${escapeHtml(p.player_name)}</div><div style="color:var(--muted);font-size:13px">${escapeHtml(p.team_name)}</div></div>
      <div style="font-weight:800">${p.runs||0}</div>`;
    el.addEventListener('click', ()=> window.location.href = `public-profile.html?team_id=${p.team_id}&player_id=${p.player_id}`);
    bcont.appendChild(el);
  }
  for (const p of bowl){
    const el = document.createElement('div');
    el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.gap = '8px'; el.style.padding = '6px 0';
    el.innerHTML = `<img src="${p.image_url || '/assets/logo.png'}" style="width:40px;height:40px;border-radius:6px;object-fit:cover"/> 
      <div style="flex:1"><div style="font-weight:700">${escapeHtml(p.player_name)}</div><div style="color:var(--muted);font-size:13px">${escapeHtml(p.team_name)}</div></div>
      <div style="font-weight:800">${p.wickets||0}</div>`;
    el.addEventListener('click', ()=> window.location.href = `public-profile.html?team_id=${p.team_id}&player_id=${p.player_id}`);
    wcont.appendChild(el);
  }
}

// Load + helpers
async function loadInitial(){
  // load user session and profile (optional)
  try {
    const s = await supabase.auth.getSession();
    const userId = s?.data?.session?.user?.id || null;
    if (userId){
      const { data: profile } = await supabase.from('profiles').select('team_id, manager_name, xp, coins, cash').eq('user_id', userId).maybeSingle();
      if (profile){
        myTeamId = profile.team_id;
        // inject top/bottom bars
        loadSharedUI({ supabase, manager_name: profile.manager_name, xp: profile.xp || 0, coins: profile.coins || 0, cash: profile.cash || 0, user_id: userId });
        if (myTeamId){
          const { data: team } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
          if (team && team.league_id){
            currentLeagueId = team.league_id;
            await refreshAll();
            return;
          }
        }
      }
    }
  } catch (err){ console.warn('profile load', err); }

  // fallback: pick first league
  const { data: one } = await supabase.from('leagues').select('id,name').limit(1).maybeSingle();
  if (one){ currentLeagueId = one.id; document.getElementById('leagueName').innerText = one.name; }
  await refreshAll();
}

async function fetchStandings(leagueId){
  if (!leagueId) return [];
  const { data, error } = await supabase.rpc('get_league_standings', { p_league_id: leagueId });
  if (error){ console.error('RPC standings error', error); return []; }
  return data || [];
}

async function fetchStats(leagueId){
  if (!leagueId) return [];
  const { data, error } = await supabase.rpc('get_league_statistics', { p_league_id: leagueId });
  if (error){ console.error('RPC stats error', error); return []; }
  return data || [];
}

async function refreshAll(){
  if (!currentLeagueId) return;
  // set league name
  const { data: L } = await supabase.from('leagues').select('name').eq('id', currentLeagueId).maybeSingle();
  if (L?.name) document.getElementById('leagueName').innerText = L.name;
  const rows = await fetchStandings(currentLeagueId);
  renderPoints(rows);
  const stats = await fetchStats(currentLeagueId);
  renderStats(stats);
}

document.getElementById('tabPoints').addEventListener('click', ()=>{
  document.getElementById('tabPoints').classList.add('active');
  document.getElementById('tabStats').classList.remove('active');
  document.getElementById('pointsCard').style.display = 'block';
  document.getElementById('statsCard').style.display = 'none';
});
document.getElementById('tabStats').addEventListener('click', ()=>{
  document.getElementById('tabStats').classList.add('active');
  document.getElementById('tabPoints').classList.remove('active');
  document.getElementById('statsCard').style.display = 'block';
  document.getElementById('pointsCard').style.display = 'none';
});

// search + myleague
document.getElementById('searchBtn').addEventListener('click', async ()=>{
  const q = document.getElementById('leagueSearch').value || '';
  if (!q) return;
  const { data } = await supabase.from('leagues').select('id,name').ilike('name', `%${q}%`).limit(10);
  if (data && data.length>0){ currentLeagueId = data[0].id; await refreshAll(); } else { alert('No league found'); }
});
document.getElementById('myLeagueBtn').addEventListener('click', async ()=>{
  if (!myTeamId){ alert('No team found for your profile'); return; }
  const { data } = await supabase.from('teams').select('league_id').eq('id', myTeamId).maybeSingle();
  if (data && data.league_id){ currentLeagueId = data.league_id; await refreshAll(); }
});

// kick off
loadInitial();
