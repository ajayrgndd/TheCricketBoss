/* Player Academy – FINAL (ES module, stable, no blinking) */
/* Requires: smooth-ui.js + nav-loader.js (both as ES modules) */

import { loadSmoothUI } from './smooth-ui.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ---------- Supabase (singleton) ---------- */
const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = window.__supabase ?? (window.__supabase = createClient(SUPABASE_URL, SUPABASE_KEY));

/* ---------- DOM ---------- */
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

/* ---------- Catalog ---------- */
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

/* ---------- State ---------- */
let profile = null;
let teamId = null;
let players = [];
let statusRows = [];

/* ---------- Helpers ---------- */
const fillOptions = (sel, arr) => {
  const prev = sel.value;
  sel.innerHTML = arr.map(k=>`<option value="${k}">${k}</option>`).join('');
  if (arr.includes(prev)) sel.value = prev;
};
const roleKindFor = (role) => {
  role = (role||'').toLowerCase();
  if (role.includes('bowler')) return 'bowling';
  if (role.includes('all')) return 'either';
  return 'batting'; // batsman / wicket keeper
};
const s1KeyIsBatting = (key) =>
  ['Top Order','Middle Order','Lower Order','Power Hitter','Game Builder','Big Hitter','Finisher'].includes(key);
const fmtLeft = (secs) => {
  if (!secs || secs <= 0) return '—';
  const d = Math.floor(secs/86400);
  const h = Math.floor((secs%86400)/3600);
  const m = Math.floor((secs%3600)/60);
  const s = secs%60;
  return (d?`${d}d `:'') + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
};

/* gates without re-rendering selects */
function gatesOk(slot, p, kind) {
  const need = slot==='skill1' ? 31 : 51;
  if ((p.experience||0) < need) return { ok:false, msg:`Requires Experience ≥ ${need}` };
  const rk = roleKindFor(p.role);
  if (rk==='bowling' && kind!=='bowling') return { ok:false, msg:'Bowler can take only Bowling skills' };
  if (rk==='batting' && kind!=='batting') return { ok:false, msg:'This role can take only Batting skills' };
  if (slot==='skill2') {
    if (!p.skill1) return { ok:false, msg:'Assign Skill 1 first' };
    if (rk==='either') {
      const s1Kind = s1KeyIsBatting(p.skill1) ? 'batting' : 'bowling';
      if (s1Kind !== kind) return { ok:false, msg:'Skill 2 must match Skill 1 type' };
    }
  }
  return { ok:true };
}

/* ---------- Data ---------- */
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

/* ---------- UI (no blinking) ---------- */
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

  // Skill 1 kind
  const s1Kinds = rk === 'either' ? ['batting','bowling'] : [rk];
  const prevS1Kind = el.s1Kind.value;
  el.s1Kind.innerHTML = s1Kinds.map(k=>`<option value="${k}">${k}</option>`).join('');
  if (s1Kinds.includes(prevS1Kind)) el.s1Kind.value = prevS1Kind;
  fillOptions(el.s1Key, CATALOG[el.s1Kind.value].skill1);

  // Skill 2 kind (match Skill1 for all-rounder)
  let s2Kinds = rk === 'either' ? ['batting','bowling'] : [rk];
  if (p.skill1 && rk === 'either') s2Kinds = [ s1KeyIsBatting(p.skill1) ? 'batting' : 'bowling' ];
  const prevS2Kind = el.s2Kind.value;
  el.s2Kind.innerHTML = s2Kinds.map(k=>`<option value="${k}">${k}</option>`).join('');
  if (s2Kinds.includes(prevS2Kind)) el.s2Kind.value = prevS2Kind;
  fillOptions(el.s2Key, CATALOG[el.s2Kind.value].skill2);
}
function applyButtonGates(p) {
  const hasPending = !!statusRows.find(r => r.activation_status === 'pending');
  const pendingPid = statusRows.find(r => r.activation_status === 'pending')?.player_id;
  const blockedByOther = hasPending && String(pendingPid) !== String(p.id);
  const s1Blocked = !!p.skill1;
  const s2Blocked = !!p.skill2;

  const s1Gate = gatesOk('skill1', p, el.s1Kind.value);
  const s2Gate = gatesOk('skill2', p, el.s2Kind.value);

  el.s1Assign.disabled  = blockedByOther || s1Blocked || !s1Gate.ok;
  el.s1Instant.disabled = blockedByOther || s1Blocked || !s1Gate.ok;
  el.s2Assign.disabled  = blockedByOther || s2Blocked || !s2Gate.ok;
  el.s2Instant.disabled = blockedByOther || s2Blocked || !s2Gate.ok;

  el.s1Assign.title  = s1Gate.ok ? '' : s1Gate.msg;
  el.s1Instant.title = el.s1Assign.title;
  el.s2Assign.title  = s2Gate.ok ? '' : s2Gate.msg;
  el.s2Instant.title = el.s2Assign.title;
}
function renderHeaderStatus() {
  const pending = statusRows.find(r => r.activation_status === 'pending');
  if (pending) {
    el.academyStatus.textContent = `Activating: ${pending.name}`;
    el.activePlayerVal.textContent = pending.name;
    el.timeLeftVal.textContent = fmtLeft(pending.seconds_left);
  } else {
    el.academyStatus.textContent = 'No active activation';
    el.activePlayerVal.textContent = '—';
    el.timeLeftVal.textContent = '—';
  }
}
function renderPlayerPanel(initial=false) {
  const p = selectedPlayer();
  if (!p) return;

  el.playerRole.textContent = p.role || '—';
  el.playerExp.textContent  = p.experience ?? 0;

  // Only rebuild dropdowns on initial render or when switching player
  if (initial) fillSkillDropdowns(p);

  el.s1State.textContent = p.skill1 ? `${p.skill1} (active)` : '—';
  el.s2State.textContent = p.skill2 ? `${p.skill2} (active)` : '—';

  applyButtonGates(p);
  renderHeaderStatus();
}

/* ---------- Nav numbers (no full reload) ---------- */
function updateNavCoins(val) {
  el.coinsVal.textContent = val;
  const coinsEl = document.getElementById('nav-coins');
  if (coinsEl) coinsEl.textContent = `Coins: ${val}`;
}

/* ---------- Actions ---------- */
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

  // Refresh minimal data
  await fetchProfileAndTeam();      // updates coins
  updateNavCoins(profile.coins);
  await Promise.all([fetchPlayers(), fetchStatus()]);

  // Keep selection and repaint states only (no dropdown reset)
  el.playerSelect.value = p.id;
  renderPlayerPanel(false);
}

/* ---------- Events ---------- */
el.s1Assign.addEventListener('click', () => startActivation('skill1', false));
el.s1Instant.addEventListener('click', () => startActivation('skill1', true));
el.s2Assign.addEventListener('click', () => startActivation('skill2', false));
el.s2Instant.addEventListener('click', () => startActivation('skill2', true));

el.playerSelect.addEventListener('change', () => {
  const p = selectedPlayer();
  if (!p) return;
  fillSkillDropdowns(p);         // re-evaluate kinds/keys for this player once
  renderPlayerPanel(false);      // repaint labels/buttons only
});

el.s1Kind.addEventListener('change', () => {
  fillOptions(el.s1Key, CATALOG[el.s1Kind.value].skill1);
  const p = selectedPlayer(); if (p) applyButtonGates(p);
});
el.s2Kind.addEventListener('change', () => {
  fillOptions(el.s2Key, CATALOG[el.s2Kind.value].skill2);
  const p = selectedPlayer(); if (p) applyButtonGates(p);
});

/* ---------- Boot ---------- */
(async () => {
  // Load nav once (no loop)
  await loadSmoothUI('top-nav', 'bottom-nav');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = 'login.html'; return; }

  await fetchProfileAndTeam();
  if (!teamId) { el.academyStatus.textContent = 'No team found for your profile'; return; }

  await fetchPlayers();
  await fetchStatus();

  if (players.length) {
    populatePlayerDropdown();
    if (!el.playerSelect.value) el.playerSelect.value = players[0].id;
  }
  renderPlayerPanel(true);

  // Countdown: update ONLY the label every second; fetch/paint panel only on state change
  setInterval(async () => {
    const oldPending = statusRows.find(r => r.activation_status === 'pending');
    if (oldPending && oldPending.seconds_left > 0) {
      oldPending.seconds_left -= 1;
      el.timeLeftVal.textContent = fmtLeft(oldPending.seconds_left);
      return;
    }
    const prevId = oldPending?.activation_id || null;
    await fetchStatus();
    const newPending = statusRows.find(r => r.activation_status === 'pending');

    if (!newPending) {
      // Probably settled: refresh players (skill1/skill2 changed) and repaint once
      await fetchPlayers();
      renderPlayerPanel(false);
      return;
    }
    if (newPending.activation_id !== prevId) {
      // New activation started elsewhere → refresh once
      await fetchPlayers();
      renderPlayerPanel(false);
    } else {
      // Same activation; just update label
      el.timeLeftVal.textContent = fmtLeft(newPending.seconds_left);
    }
  }, 1000);
})();
