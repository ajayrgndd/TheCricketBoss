/* Player Academy – ES module version
   Uses your smooth-ui/nav-loader for nav + profile fill
   Calls RPCs:
     • rpc_academy_start(p_team_id, p_player_id, p_slot, p_kind, p_skill_key, p_instant)
     • rpc_academy_status_for_me()
*/

import { loadSmoothUI } from './smooth-ui.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---- Supabase client (use the same project as nav-loader.js) ----
const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
let session = null;
let profile = null;     // {user_id, team_id, coins, ...}
let teamId = null;
let players = [];       // [{id,name,role,experience,skill1,skill2,in_academy}, ...]
let statusRows = [];    // v_academy_player_status rows
let ticker = null;

const fillOptions = (sel, arr) => sel.innerHTML = arr.map(k=>`<option value="${k}">${k}</option>`).join('');
const roleKindFor = (role) => {
  role = (role||'').toLowerCase();
  if (role.includes('bowler')) return 'bowling';
  if (role.includes('all')) return 'either';
  return 'batting'; // batsman or wicket keeper
};
const gatesOk = (slot, p, kind) => {
  const need = slot==='skill1' ? 31 : 51;
  if ((p.experience||0) < need) return { ok:false, msg:`Requires Experience ≥ ${need}` };
  const rk = roleKindFor(p.role);
  if (rk==='bowling' && kind!=='bowling') return { ok:false, msg:'Bowler can take only Bowling skills' };
  if (rk==='batting' && kind!=='batting') return { ok:false, msg:'This role can take only Batting skills' };
  if (slot==='skill2') {
    if (!p.skill1) return { ok:false, msg:'Assign Skill 1 first' };
    const s1 = p.skill1;
    const s1Kind = ['Top Order','Middle Order','Lower Order','Power Hitter','Game Builder','Big Hitter','Finisher'].includes(s1) ? 'batting' : 'bowling';
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

// ---- Data fetch ----
async function getSession() {
  const { data: { session: s } } = await supabase.auth.getSession();
  session = s;
  return s;
}
async function fetchProfileAndTeam() {
  const uid = session?.user?.id;
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, manager_name, team_name, coins, cash, xp, team_id')
    .eq('user_id', uid)
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
  // preselect via ?pid= query if present
  const pid = new URLSearchParams(location.search).get('pid');
  if (pid && players.some(p=>String(p.id)===pid)) el.playerSelect.value = pid;
}
function selectedPlayer() {
  const id = el.playerSelect.value;
  return players.find(p => String(p.id) === String(id));
}
function fillSkillDropdowns(p) {
  const rk = roleKindFor(p.role);
  // Skill 1 types
  const s1Kinds = rk === 'either' ? ['batting','bowling'] : [rk];
  el.s1Kind.innerHTML = s1Kinds.map(k=>`<option value="${k}">${k}</option>`).join('');
  fillOptions(el.s1Key, CATALOG[el.s1Kind.value].skill1);

  // Skill 2 types
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

  // Current active skills from players table
  el.s1State.textContent = p.skill1 ? `${p.skill1} (active)` : '—';
  el.s2State.textContent = p.skill2 ? `${p.skill2} (active)` : '—';

  // Pending activation (only one per team)
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

  // refresh everything + nav coins
  await Promise.all([fetchProfileAndTeam(), fetchPlayers(), fetchStatus()]);
  await loadSmoothUI('top-nav', 'bottom-nav');
  el.playerSelect.value = p.id;
  renderPlayerPanel();
}

// ---- Events ----
$('#s1Assign').addEventListener('click', () => startActivation('skill1', false));
$('#s1Instant').addEventListener('click', () => startActivation('skill1', true));
$('#s2Assign').addEventListener('click', () => startActivation('skill2', false));
$('#s2Instant').addEventListener('click', () => startActivation('skill2', true));

$('#playerSelect').addEventListener('change', renderPlayerPanel);
$('#s1Kind').addEventListener('change', () => { fillOptions(el.s1Key, CATALOG[el.s1Kind.value].skill1); renderPlayerPanel(); });
$('#s2Kind').addEventListener('change', () => { fillOptions(el.s2Key, CATALOG[el.s2Kind.value].skill2); renderPlayerPanel(); });

// ---- Boot ----
(async () => {
  // 1) Load nav (auth + profile fill + body padding)
  await loadSmoothUI('top-nav', 'bottom-nav');

  // 2) Require auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // nav-loader already redirects on non-public pages, but keep a guard
    location.href = 'login.html';
    return;
  }

  // 3) Load profile/team/players/status
  await (await supabase.auth.getSession()); // sync session
  await fetchProfileAndTeam();
  if (!teamId) { $('#academyStatus').textContent = 'No team found for your profile'; return; }
  await fetchPlayers();
  await fetchStatus();

  if (players.length) {
    populatePlayerDropdown();
    if (!el.playerSelect.value && players[0]) el.playerSelect.value = players[0].id;
  }
  renderPlayerPanel();

  // 4) Ticker: smooth countdown + periodic refresh
  setInterval(async () => {
    let pending = statusRows.find(r => r.activation_status === 'pending');
    if (pending && pending.seconds_left > 0) {
      pending.seconds_left -= 1;
    } else {
      await fetchStatus();
      await Promise.all([fetchPlayers(), fetchProfileAndTeam()]);
      await loadSmoothUI('top-nav', 'bottom-nav'); // keep coins fresh
    }
    renderPlayerPanel();
  }, 1000);
})();
