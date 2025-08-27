/* Player Academy – Stable (no nav reload loop) */

import { loadSmoothUI } from './smooth-ui.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---- Supabase client (singleton across app) ----
const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = window.__supabase ?? (window.__supabase = createClient(SUPABASE_URL, SUPABASE_KEY));

// ---- DOM helpers ----
const $ = (s) => document.querySelector(s);
const el = {
  playerSelect: $('#playerSelect'),
  playerRole:   $('#playerRole'),
  playerExp:    $('#playerExp'),
  s1Kind: $('#s1Kind'), s1Key: $('#s1Key'),
  s2Kind: $('#s2Kind'), s2Key: $('#s2Key'),
  s1Assign: $('#s1Assign'), s1Instant: $('#s1Instant'),
  s2Assign: $('#s2Assign'), s2Instant: $('#s2Instant'),
  s1State: $('#s1State'), s2State: $('#s2State'),
  coinsVal: $('#coinsVal'),
  academyStatus: $('#academyStatus'),
  activePlayerVal: $('#activePlayerVal'),
  timeLeftVal: $('#timeLeftVal'),
  noPlayers: $('#noPlayers'),
};

// ---- Catalog ----
const CATALOG = {
  batting: {
    skill1: ['Top Order','Middle Order','Lower Order'],
    skill2: ['Power Hitter','Game Builder','Big Hitter','Finisher'],
  },
  bowling: {
    skill1: ['Top Hunter','Middle Hunter','Death Hunter'],
    skill2: ['The Miser','The Boom','Big Shot','Deadly'],
  }
};

// ---- State ----
let profile = null;
let teamId = null;
let players = [];
let statusRows = [];

// ---- Helpers ----
const fillOptions = (sel, arr) => sel.innerHTML = arr.map(k=>`<option value="${k}">${k}</option>`).join('');
const roleKindFor = (role) => {
  role = (role||'').toLowerCase();
  if (role.includes('bowler')) return 'bowling';
  if (role.includes('all')) return 'either';
  return 'batting';
};
const gatesOk = (slot, p, kind) => {
  const need = slot==='skill1' ? 31 : 51;
  if ((p.experience||0) < need) return { ok:false, msg:`Requires Experience ≥ ${need}` };
  const rk = roleKindFor(p.role);
  if (rk==='bowling' && kind!=='bowling') return { ok:false, msg:'Bowler can take only Bowling skills' };
  if (rk==='batting' && kind!=='batting') return { ok:false, msg:'This role can take only Batting skills' };
  if (slot==='skill2') {
    if (!p.skill1) return { ok:false, msg:'Assign Skill 1 first' };
    const s1Kind = ['Top Order','Middle Order','Lower Order','Power Hitter','Game Builder','Big Hitter','Finisher'].includes(p.skill1) ? 'batting' : 'bowling';
    if (rk==='either' && s1Kind !== kind) return { ok:false, msg:'Skill 2 must match Skill 1 type' };
  }
  return { ok:true };
};
const fmtLeft = (secs) => {
  if (!secs || secs <= 0) return '—';
  const d = Math.floor(secs/86400);
  const h = Math.floor((secs%86400)/3600);
  const m = Math.floor((secs%3600)/60);
  const s = secs%60;
  return (d?`${d}d `:'') + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
};

// ---- Data ----
async function fetchProfileAndTeam() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = 'login.html'; throw new Error('Not logged in'); }
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, manager_name, team_name, coins, cash, xp, team_id')
    .eq('user_id', user.id)
    .single();
  if (error) throw error;
  profile = data;
  teamId = data.team_id;
  el.coinsVal.textContent = data.coins ?? 0;
}
async function fetchPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('id,name,role,experience,skill1,skill2,in_academy')
    .eq('team_id', teamId)
    .order('name', { ascending: true });
  if (error) throw error;
  players = data || [];
  el.noPlayers.style.display = players.length ? 'none' : '';
}
async function fetchStatus() {
  const { data, error } = await supabase.rpc('rpc_academy_status_for_me');
  if (error) throw error;
  statusRows = data || [];
}

// ---- UI render ----
function populatePlayerDropdown() {
  el.playerSelect.innerHTML = players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const pid = new URLSearchParams(location.search).get('pid');
  if (pid && players.some(p=>String(p.id)===pid)) el.playerSelect.value = pid;
}
function selectedPlayer() {
  const id = el.playerSelect.value;
  return players.find(p => String(p.id) === String(id));
}
function fillSkillDropdowns(p) {
  const rk = roleKindFor(p.role);
  const s1Kinds = rk === 'either' ? ['batting','bowling'] : [rk];
  el.s1Kind.innerHTML = s1Kinds.map(k=>`<option value="${k}">${k}</option>`).join('');
  fillOptions(el.s1Key, CATALOG[el.s1Kind.value].skill1);

  let s2Kinds = rk === 'either' ? ['batting','bowling'] : [rk];
  if (p.skill1 && rk === 'either') {
    const s1Kind = ['Top Order','Middle Order','Lower Order','Power Hitter','Game Builder','Big Hitter','Finisher'].includes(p.skill1) ? 'batting' : 'bowling';
    s2Kinds = [s1Kind];
  }
  el.s2Kind.innerHTML = s2Kinds.map(k=>`<option value="${k}">${k}</option>`).join('');
  fillOptions(el.s2Key, CATALOG[el.s2Kind.value].skill2);
}
function renderPlayerPanel() {
  const p = selectedPlayer();
  if (!p) return;

  el.playerRole.textContent = p.role || '—';
  el.playerExp.textContent  = p.experience ?? 0;

  fillSkillDropdowns(p);
  el.s1State.textContent = p.skill1 ? `${p.skill1} (active)` : '—';
  el.s2State.textContent = p.skill2 ? `${p.skill2} (active)` : '—';

  const pending = statusRows.find(r => r.activation_status === 'pending');
  const hasPending = !!pending;
  const pendingPid = pending?.player_id;

  const s1Gate = gatesOk('skill1', p, el.s1Kind.value);
  const s2Gate = gatesOk('skill2', p, el.s2Kind.value);

  const blockedByOther = hasPending && String(pendingPid) !== String(p.id);
  const s1Blocked = !!p.skill1;
  const s2Blocked = !!p.skill2;

  el.s1Assign.disabled  = blockedByOther || s1Blocked || !s1Gate.ok;
  el.s1Instant.disabled = blockedByOther || s1Blocked || !s1Gate.ok;
  el.s2Assign.disabled  = blockedByOther || s2Blocked || !s2Gate.ok;
  el.s2Instant.disabled = blockedByOther || s2Blocked || !s2Gate.ok;

  el.s1Assign.title  = s1Gate.ok ? '' : s1Gate.msg;
  el.s1Instant.title = el.s1Assign.title;
  el.s2Assign.title  = s2Gate.ok ? '' : s2Gate.msg;
  el.s2Instant.title = el.s2Assign.title;

  if (hasPending) {
    el.academyStatus.textContent = `Activating: ${pending.name}`;
    el.activePlayerVal.textContent = pending.name;
    el.timeLeftVal.textContent = fmtLeft(pending.seconds_left);
  } else {
    el.academyStatus.textContent = 'No active activation';
    el.activePlayerVal.textContent = '—';
    el.timeLeftVal.textContent = '—';
  }
}

// ---- Lightweight nav number updater (no full reload) ----
function updateNavCoins(val) {
  el.coinsVal.textContent = val;
  const coinsEl = document.getElementById('nav-coins');
  if (coinsEl) coinsEl.textContent = `Coins: ${val}`;
}

// ---- Actions ----
async function startActivation(slot, instant) {
  const p = selectedPlayer();
  if (!p) return;
  const kind = (slot === 'skill1' ? el.s1Kind.value : el.s2Kind.value);
  const key  = (slot === 'skill1' ? el.s1Key.value  : el.s2Key.value);

  const g = gatesOk(slot, p, kind);
  if (!g.ok) { alert(g.msg); return; }

  const { error } = await supabase.rpc('rpc_academy_start', {
    p_team_id: teamId,
    p_player_id: p.id,
    p_slot: slot,
    p_kind: kind,
    p_skill_key: key,
    p_instant: !!instant
  });
  if (error) { alert(error.message); return; }

  // Refresh profile (for coins) and local data
  await fetchProfileAndTeam();         // updates el.coinsVal
  updateNavCoins(profile.coins);       // update nav text without reloading UI
  await Promise.all([fetchPlayers(), fetchStatus()]);
  el.playerSelect.value = p.id;
  renderPlayerPanel();
}

// ---- Events ----
el.s1Assign.addEventListener('click', () => startActivation('skill1', false));
el.s1Instant.addEventListener('click', () => startActivation('skill1', true));
el.s2Assign.addEventListener('click', () => startActivation('skill2', false));
el.s2Instant.addEventListener('click', () => startActivation('skill2', true));
el.playerSelect.addEventListener('change', renderPlayerPanel);
el.s1Kind.addEventListener('change', () => { fillOptions(el.s1Key, CATALOG[el.s1Kind.value].skill1); renderPlayerPanel(); });
el.s2Kind.addEventListener('change', () => { fillOptions(el.s2Key, CATALOG[el.s2Kind.value].skill2); renderPlayerPanel(); });

// ---- Boot ----
(async () => {
  // Load nav once (no repeated fades/requests)
  await loadSmoothUI('top-nav', 'bottom-nav');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = 'login.html'; return; }

  await fetchProfileAndTeam();
  if (!teamId) { el.academyStatus.textContent = 'No team found for your profile'; return; }

  await fetchPlayers();
  await fetchStatus();

  if (players.length) {
    populatePlayerDropdown();
    if (!el.playerSelect.value && players[0]) el.playerSelect.value = players[0].id;
  }
  renderPlayerPanel();

  // Countdown: only fetch from server when we expect a transition
  setInterval(async () => {
    const pending = statusRows.find(r => r.activation_status === 'pending');
    if (pending && pending.seconds_left > 0) {
      pending.seconds_left -= 1;           // smooth local countdown
      el.timeLeftVal.textContent = fmtLeft(pending.seconds_left);
    } else {
      // Re-check status only when countdown finishes
      await fetchStatus();
      await fetchPlayers();
      renderPlayerPanel();
    }
  }, 1000);
})();
