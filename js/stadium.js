// === IMPORTS & SETUP ===
import { loadSharedUI } from './shared-ui-stadium.js';
import { addManagerXP } from './shared-xp.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

loadSharedUI();

const supabase = createClient(
  'https://iukofcmatlfhfwcechdq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE'
);

// === STADIUM UPGRADE CONFIG ===
const STADIUM_UPGRADE_DURATIONS = {
  1: 24 * 60 * 60 * 1000,
  2: 48 * 60 * 60 * 1000,
  3: 72 * 60 * 60 * 1000,
  4: 96 * 60 * 60 * 1000,
};

const STADIUM_LEVELS = [
  { level: 1, name: "Local",        capacity: 5000,  revenue: 250000,  cost: 100000,  requiredManagerXP: 1 },
  { level: 2, name: "Professional", capacity: 10000, revenue: 500000, cost: 250000,  requiredManagerXP: 750 },
  { level: 3, name: "Domestic",     capacity: 15000, revenue: 750000, cost: 500000,  requiredManagerXP: 3500 },
  { level: 4, name: "National",     capacity: 20000, revenue: 1000000, cost: 1000000, requiredManagerXP: 5500 },
  { level: 5, name: "World Class",  capacity: 30000, revenue: 1500000, cost: 2000000, requiredManagerXP: 8500 },
];

const MANAGER_LEVELS = [
  { xp: 0,     label: "Beginner" },
  { xp: 250,   label: "Expert" },
  { xp: 750,   label: "Professional" },
  { xp: 1750,  label: "Master" },
  { xp: 3500,  label: "Supreme" },
  { xp: 5500,  label: "World Class" },
  { xp: 8500,  label: "Ultimate" },
  { xp: 13500, label: "The Boss" },
];

function getManagerLevelLabel(xp) {
  let label = "Beginner";
  for (let lvl of MANAGER_LEVELS) {
    if (xp >= lvl.xp) label = lvl.label;
    else break;
  }
  return label;
}

function levelTextToIndex(levelText){
  if (!levelText) return 1;
  const map = {
    "Local": 1,
    "Professional": 2,
    "Domestic": 3,
    "National": 4,
    "World Class": 5
  };
  return map[levelText] || 1;
}
function indexToLevelText(idx){
  const row = STADIUM_LEVELS[idx-1];
  return row ? row.name : STADIUM_LEVELS[0].name;
}

// === PAGE INIT ===
async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // fetch profile (for XP/cash/manager_name/coins) and team_id
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("stadium_level, xp, cash, stadium_upgrade_end, team_id, manager_name, coins, user_id")
    .eq("user_id", user.id)
    .single();

  if (pErr || !profile) {
    console.error("Failed loading profile:", pErr?.message);
    return;
  }

  // fetch or create stadium row for the team
  const teamId = profile.team_id;
  const stadium = await ensureStadiumForTeam(teamId, user.id);

  // If stadium exists, prefer stadium fields as source-of-truth
  let stadiumState = {
    id: stadium?.id || null,
    team_id: stadium?.team_id || teamId,
    level_text: stadium?.level || indexToLevelText(profile.stadium_level || 1),
    capacity: stadium?.capacity || (STADIUM_LEVELS[(profile.stadium_level||1)-1].capacity),
    is_upgrading: !!stadium?.is_upgrading,
    upgrade_start_time: stadium?.upgrade_start_time || null,
    pitch_type: stadium?.pitch_type || "balanced",
    pitch_last_changed: stadium?.pitch_last_changed || null
  };

  // Top bar
  const topU = document.getElementById("top-username");
  const topX = document.getElementById("top-xp");
  const topC = document.getElementById("top-coins");
  const top$ = document.getElementById("top-cash");
  if (topU) topU.textContent = `👤 ${profile.manager_name}`;
  if (topX) topX.textContent = `XP: ${profile.xp}`;
  if (topC) topC.textContent = `🪙 ${profile.coins}`;
  if (top$) top$.textContent = `₹ ${profile.cash}`;

  // If upgrade has completed according to profiles (old flow) or stadium says done, finalize
  // Prefer stadium.is_upgrading/upgradestart_time check first
  if (stadiumState.is_upgrading && stadiumState.upgrade_start_time) {
    // compute end from mapping (server should also supply upgrade_end ideally)
    // We won't auto-complete here; the countdown will call completion when it reaches 0
  } else if (profile.stadium_upgrade_end && new Date(profile.stadium_upgrade_end) <= new Date()) {
    // backwards-compat: complete using current profile level
    await completeUpgradeFlow(user.id, teamId, profile.stadium_level);
    profile.stadium_level += 1;
    profile.stadium_upgrade_end = null;
    // refresh stadiumState from DB
    const { data: s2 } = await supabase.from("stadiums").select("id,team_id,level,capacity,is_upgrading,upgrade_start_time").eq("team_id", teamId).maybeSingle();
    if (s2) {
      stadiumState.level_text = s2.level;
      stadiumState.capacity = s2.capacity;
      stadiumState.is_upgrading = !!s2.is_upgrading;
      stadiumState.upgrade_start_time = s2.upgrade_start_time;
    }
  }

  updateStadiumDisplayFromText(stadiumState.level_text, profile.xp, stadiumState.capacity);

  // Upgrade UI
  const upgradeBtn = document.getElementById('upgrade-btn');
  const upgradeMsg = document.getElementById('upgrade-msg');

  // Use stadium-level to determine next
  let currentLevelIndex = levelTextToIndex(stadiumState.level_text);

  // If stadium row indicates an upgrade in progress, show countdown based on stadium.upgrade_start_time + duration
  if (stadiumState.is_upgrading && stadiumState.upgrade_start_time) {
    const upgradeStart = new Date(stadiumState.upgrade_start_time);
    const durationMs = STADIUM_UPGRADE_DURATIONS[currentLevelIndex] || STADIUM_UPGRADE_DURATIONS[1];
    const upgradeEnd = new Date(upgradeStart.getTime() + durationMs);
    disableUpgradeBtnWithCountdown(upgradeEnd.toISOString(), async () => {
      // on completion: try to run server-side completion RPC; fallback to client complete
      await finalizeUpgradeAndRefresh(user.id, teamId, profile, stadiumState, top$);
    });
  } else {
    upgradeBtn?.addEventListener('click', async () => {
      // re-check stadium row before starting
      const { data: freshStadium } = await supabase
        .from("stadiums")
        .select("id,team_id,level,capacity,is_upgrading,upgrade_start_time")
        .eq("team_id", teamId)
        .maybeSingle();

      if (freshStadium?.is_upgrading) {
        upgradeMsg.innerText = "Upgrade already in progress.";
        return;
      }

      const curLevelIdx = levelTextToIndex(freshStadium?.level || stadiumState.level_text);
      if (curLevelIdx >= STADIUM_LEVELS.length) {
        upgradeMsg.innerText = "Max level reached.";
        return;
      }

      const next = STADIUM_LEVELS[curLevelIdx]; // next index (0-based)
      if (profile.xp < next.requiredManagerXP) {
        upgradeMsg.innerText = "Not enough XP to upgrade.";
        return;
      }

      if (profile.cash < next.cost) {
        upgradeMsg.innerText = "Not enough cash.";
        return;
      }

      upgradeMsg.innerText = "Starting upgrade…";

      // Preferred: call server-side RPC to atomically start upgrade (deduct cash, mark stadium.upgrading)
      try {
        const rpcResult = await supabase.rpc('stadium_start_upgrade', {
          p_team_id: teamId,
          p_actor: user.id
        });
        if (rpcResult.error) throw rpcResult.error;

        // rpcResult.data may vary by supabase lib; modern returns { data, error }
        const rpcData = rpcResult.data ?? rpcResult; // defensive
        // rpc should return stadium_id, upgrade_end, remaining_cash (see suggested SQL in notes)
        const returned = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        const upgradeEnd = returned?.upgrade_end || returned?.upgrade_end_ts || null;
        const remainingCash = returned?.remaining_cash ?? null;

        if (remainingCash !== null && top$) top$.textContent = `₹ ${remainingCash}`;

        // show countdown using the returned upgradeEnd (if available) otherwise compute from now + duration
        const upgradeEndIso = upgradeEnd || new Date(Date.now() + (STADIUM_UPGRADE_DURATIONS[curLevelIdx] || STADIUM_UPGRADE_DURATIONS[1])).toISOString();

        disableUpgradeBtnWithCountdown(upgradeEndIso, async () => {
          await finalizeUpgradeAndRefresh(user.id, teamId, profile, stadiumState, top$);
        });

        upgradeMsg.innerText = "Upgrade started.";
        return;
      } catch (rpcErr) {
        // RPC missing or errored — fallback to client-side update (less safe)
        console.warn("stadium_start_upgrade RPC failed, falling back to client update:", rpcErr?.message || rpcErr);
      }

      // FALLBACK: try to mark stadium as upgrading and deduct cash in two operations (race possible)
      try {
        // deduct cash in profile
        const { error: upErr } = await supabase
          .from("profiles")
          .update({ cash: profile.cash - next.cost, stadium_upgrade_end: null })
          .eq("user_id", user.id);
        if (upErr) throw upErr;

        // mark stadium as upgrading with timestamp
        const { data: uData, error: sErr } = await supabase
          .from("stadiums")
          .update({
            is_upgrading: true,
            upgrade_start_time: new Date().toISOString(),
            upgrade_cost: next.cost,
            updated_at: new Date().toISOString()
          })
          .eq("team_id", teamId)
          .select("id,upgrade_start_time")
          .maybeSingle();

        if (sErr) throw sErr;

        if (top$) {
          profile.cash -= next.cost;
          top$.textContent = `₹ ${profile.cash}`;
        }

        const upgradeEndIso = new Date(Date.now() + (STADIUM_UPGRADE_DURATIONS[curLevelIdx] || STADIUM_UPGRADE_DURATIONS[1])).toISOString();
        disableUpgradeBtnWithCountdown(upgradeEndIso, async () => {
          await finalizeUpgradeAndRefresh(user.id, teamId, profile, stadiumState, top$);
        });

        upgradeMsg.innerText = "Upgrade started (fallback mode).";
      } catch (fallbackErr) {
        console.error("Fallback upgrade failed:", fallbackErr);
        upgradeMsg.innerText = "Failed to start upgrade. Try again later.";
      }
    });
  }

  // Pitch module
  await initPitchModule({ userId: user.id, teamId: profile.team_id });
}

// Helper: complete upgrade for older flow (profile-based)
async function completeUpgradeFlow(userId, teamId, currentProfileLevel) {
  // This will try server-side completion RPCs or do best-effort update
  try {
    // prefer team-specific RPC
    const tryTeam = await supabase.rpc('stadium_complete_for_team', { p_team_id: teamId });
    if (!tryTeam.error) return;
  } catch (e) { /* ignore */ }

  try {
    const tryGlobal = await supabase.rpc('stadium_complete_upgrades');
    if (!tryGlobal.error) return;
  } catch (e) { /* ignore */ }

  // last resort: client-side compute and update
  const newLevelIdx = Math.min((currentProfileLevel || 1) + 1, STADIUM_LEVELS.length);
  const newLevelText = indexToLevelText(newLevelIdx);
  const newCapacity = STADIUM_LEVELS[newLevelIdx-1].capacity;

  await supabase
    .from("stadiums")
    .update({
      level: newLevelText,
      capacity: newCapacity,
      is_upgrading: false,
      upgrade_start_time: null,
      updated_at: new Date().toISOString()
    })
    .eq("team_id", teamId);
}

// finalizeUpgradeAndRefresh: called when countdown hits zero
async function finalizeUpgradeAndRefresh(userId, teamId, profile, stadiumState, topCashEl) {
  // Try RPC that completes upgrade for a single team first
  try {
    const { data, error } = await supabase.rpc('stadium_complete_for_team', { p_team_id: teamId });
    if (!error) {
      // refresh stadium and profile
      await refreshAfterCompletion(userId, teamId, profile, topCashEl);
      return;
    }
  } catch (e) {
    // ignore and fallback
    console.warn("stadium_complete_for_team RPC missing or failed:", e?.message || e);
  }

  // fallback: try global completion RPC
  try {
    const { data, error } = await supabase.rpc('stadium_complete_upgrades');
    if (!error) {
      await refreshAfterCompletion(userId, teamId, profile, topCashEl);
      return;
    }
  } catch (e) {
    console.warn("stadium_complete_upgrades RPC missing or failed:", e?.message || e);
  }

  // last resort: compute locally and update stadium row
  try {
    // fetch current stadium row to determine current level
    const { data: sRow } = await supabase.from("stadiums").select("id,level,capacity").eq("team_id", teamId).maybeSingle();
    const curIdx = levelTextToIndex(sRow?.level || indexToLevelText(profile.stadium_level || 1));
    const newIdx = Math.min(curIdx + 1, STADIUM_LEVELS.length);
    const newLevelText = indexToLevelText(newIdx);
    const newCapacity = STADIUM_LEVELS[newIdx-1].capacity;

    await supabase.from("stadiums").update({
      level: newLevelText,
      capacity: newCapacity,
      is_upgrading: false,
      upgrade_start_time: null,
      updated_at: new Date().toISOString()
    }).eq("team_id", teamId);

    // update profiles.stadium_level numeric cache, and award XP locally
    await supabase.from("profiles").update({
      stadium_level: newIdx,
      stadium_upgrade_end: null
    }).eq("user_id", userId);

    // award XP using client helper (fallback)
    await addManagerXP(supabase, userId, `stadium_lvl${newIdx}`);

    await refreshAfterCompletion(userId, teamId, profile, topCashEl);
  } catch (e) {
    console.error("Failed to finalize upgrade locally:", e);
  }
}

async function refreshAfterCompletion(userId, teamId, profile, topCashEl) {
  // refresh stadium and profile values to show updated UI
  const { data: s } = await supabase.from("stadiums")
    .select("id,team_id,level,capacity,is_upgrading,upgrade_start_time")
    .eq("team_id", teamId)
    .maybeSingle();

  const { data: p } = await supabase.from("profiles")
    .select("xp,cash,stadium_level,manager_name,coins")
    .eq("user_id", userId)
    .single();

  if (p && topCashEl) topCashEl.textContent = `₹ ${p.cash}`;

  const levelText = s?.level || indexToLevelText(p?.stadium_level || 1);
  const capacity = s?.capacity || (STADIUM_LEVELS[(p?.stadium_level||1)-1].capacity);
  updateStadiumDisplayFromText(levelText, p?.xp || 0, capacity);

  // reload page to ensure other modules see updated stadium (optional)
  // but to be gentle, only reload if necessary
  // location.reload();
}

function disableUpgradeBtnWithCountdown(endTime, onComplete) {
  const btn = document.getElementById('upgrade-btn');
  const msg = document.getElementById('upgrade-msg');
  if (!btn || !msg) return;
  btn.disabled = true;

  let timerId = null;

  function updateCountdown() {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) {
      msg.innerText = "Upgrade complete!";
      btn.disabled = false;
      if (typeof onComplete === 'function') onComplete().catch(e => console.error(e));
      return;
    }

    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    msg.innerText = `Upgrade in progress: ${hrs}h ${mins}m ${secs}s`;
    timerId = setTimeout(updateCountdown, 1000);
  }

  updateCountdown();
}

function updateStadiumDisplayFromText(levelText, xp, capacityOverride = null) {
  const el = (id) => document.getElementById(id);
  const idx = levelTextToIndex(levelText);
  const stadium = STADIUM_LEVELS[idx - 1] || STADIUM_LEVELS[0];
  if (el("stadium-level-name")) el("stadium-level-name").innerText = `Level ${stadium.level} (${stadium.name})`;
  if (el("stadium-capacity")) el("stadium-capacity").innerText = (capacityOverride ?? stadium.capacity).toLocaleString();
  if (el("stadium-revenue")) el("stadium-revenue").innerText = stadium.revenue.toLocaleString();
  if (el("stadium-upgrade-cost")) {
    const next = STADIUM_LEVELS[idx] || null;
    el("stadium-upgrade-cost").innerText = next ? next.cost.toLocaleString() : "—";
  }
  if (el("required-manager-level")) {
    const next = STADIUM_LEVELS[idx] || null;
    el("required-manager-level").innerText = next ? getManagerLevelLabel(next.requiredManagerXP) : "Max";
  }
}

/* =========================
   PITCH TYPE MODULE (UNCHANGED)
   ========================= */

const PITCH_COST = 1_000_000; // ₹10,00,000
const COOLDOWN_DAYS = 63;
const PITCH_TYPES = {
  balanced: { name: "Balanced (Default)", theme:"Balanced",         mods:{bat:+0.05, pace:+0.05, spin:+0.05} },
  flat:     { name: "Flat Track",         theme:"Batting Friendly", mods:{bat:+0.15, pace:+0.05, spin:+0.05} },
  green:    { name: "Green Pitch",        theme:"Seam Friendly",    mods:{bat:+0.05, pace:+0.15, spin:+0.05} },
  dusty:    { name: "Dusty Pitch",        theme:"Spin Friendly",    mods:{bat:+0.05, pace:+0.05, spin:+0.15} },
};

// Helpers
function nowIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset()*60000;
  return new Date(utc + 5.5*3600000);
}
function isFridayIST() { return nowIST().getDay() === 5; } // 0..6 (Fri=5)
function daysBetweenTs(tsMs) {
  if (!tsMs) return Infinity;
  return (Date.now() - tsMs) / 86400000;
}
function fmtDaysLeft(lastChangedIso) {
  if (!lastChangedIso) return "available now";
  const left = Math.max(0, COOLDOWN_DAYS - Math.floor(daysBetweenTs(Date.parse(lastChangedIso))));
  return left <= 0 ? "available now" : `${left} day(s)`;
}
function updatePitchLabel(key, lastChangedIso) {
  const labelEl = document.getElementById("stadium-pitch-label");
  if (!labelEl) return;

  const info = PITCH_TYPES[key] || PITCH_TYPES.balanced;
  let text = info.name;
  if (lastChangedIso) {
    const d = new Date(lastChangedIso);
    text += ` (changed ${d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})})`;
  }
  labelEl.textContent = text;
}
function effectLines(mods){
  const toPct = v => (v>=0?"+":"") + Math.round(v*100) + "%";
  return [
    `Batting: <strong>${toPct(mods.bat)}</strong>`,
    `Pace: <strong>${toPct(mods.pace)}</strong>`,
    `Spin: <strong>${toPct(mods.spin)}</strong>`,
  ];
}

async function ensureStadiumForTeam(teamId, userId) {
  let { data: sRow, error } = await supabase
    .from("stadiums")
    .select("id, team_id, user_id, name, pitch_type, pitch_last_changed, level, capacity, is_upgrading, upgrade_start_time")
    .eq("team_id", teamId)
    .maybeSingle();

  // If pitch columns missing, show admin message but keep page working
  if (error && /column.*pitch_/.test(error.message || "")) {
    const status = document.getElementById("pitch-status");
    if (status) status.textContent = "Admin: please add columns pitch_type (text) & pitch_last_changed (timestamptz) to stadiums.";
    const { data: sFallback } = await supabase
      .from("stadiums")
      .select("id, team_id, user_id, name, level, capacity")
      .eq("team_id", teamId)
      .maybeSingle();
    return sFallback || null;
  }

  if (!sRow) {
    // Create minimal row if none exists (now includes level & capacity)
    const defaultName = "Home Stadium";
    const { data: inserted, error: iErr } = await supabase
      .from("stadiums")
      .insert([{ team_id: teamId, user_id: userId, name: defaultName, level: indexToLevelText(1), capacity: STADIUM_LEVELS[0].capacity }])
      .select("id, team_id, user_id, name, pitch_type, pitch_last_changed, level, capacity")
      .single();
    if (iErr) {
      console.error("Failed to create stadium row:", iErr);
      return null;
    }
    sRow = inserted;
  }
  return sRow;
}

function renderPitchButtons(currentKey) {
  const c = document.getElementById("pitch-options");
  if (!c) return;
  c.innerHTML = "";
  Object.entries(PITCH_TYPES).forEach(([key, info]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.pitch = key;
    btn.className = "pitch-card-btn";
    btn.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
        <div>
          <div style="font-weight:600;">${info.name}</div>
          <div style="opacity:.8;font-size:.9rem;">${info.theme} · Bat ${Math.round(info.mods.bat*100)}% · Pace ${Math.round(info.mods.pace*100)}% · Spin ${Math.round(info.mods.spin*100)}%</div>
        </div>
        <div class="radio" style="width:16px;height:16px;border-radius:50%;border:2px solid #3e4657;${currentKey===key?"background:#2d7cff;border-color:#2d7cff;":""}"></div>
      </div>
    `;
    btn.addEventListener("click", () => {
      selectedPitch = key;
      renderPitchButtons(selectedPitch);
      updateEffectsPreview(selectedPitch);
      setStatus(""); // clear message
    });
    c.appendChild(btn);
  });
}

function updateEffectsPreview(selKey){
  const tag = document.getElementById("pitch-selected-tag");
  const list = document.getElementById("pitch-effects-list");
  const info = PITCH_TYPES[selKey] || PITCH_TYPES.balanced;
  if (tag) tag.textContent = info.name;
  if (list) list.innerHTML = effectLines(info.mods).map(li=>`<li>${li}</li>`).join("");
}
function showCooldownPill(lastChangedIso){
  const pill = document.getElementById("pitch-cooldown-pill");
  const txt  = document.getElementById("pitch-cooldown-text");
  if (!pill || !txt) return;
  const left = Math.max(0, COOLDOWN_DAYS - Math.floor(daysBetweenTs(Date.parse(lastChangedIso||0))));
  if (left > 0){ pill.style.display = "inline-flex"; txt.textContent = `${left} day(s)`; }
  else { pill.style.display = "none"; }
}
function setStatus(msg){
  const el = document.getElementById("pitch-status");
  if (el) el.textContent = msg || "";
}

let selectedPitch = "balanced";

async function initPitchModule({ userId, teamId }) {
  const saveBtn = document.getElementById("save-pitch-btn");
  const cancelBtn = document.getElementById("reset-pitch-btn");
  const topCash = document.getElementById("top-cash");
  if (!saveBtn || !cancelBtn) return; // HTML not present

  const stadium = await ensureStadiumForTeam(teamId, userId);
  if (!stadium) return;

  // Local state for current stadium pitch
  let currentPitch = stadium.pitch_type || "balanced";
  let lastChanged  = stadium.pitch_last_changed || null;

  selectedPitch = currentPitch;
  renderPitchButtons(currentPitch);
  updateEffectsPreview(currentPitch);
  showCooldownPill(lastChanged);
  updatePitchLabel(currentPitch, lastChanged);

  cancelBtn.addEventListener("click", () => {
    selectedPitch = currentPitch;
    renderPitchButtons(currentPitch);
    updateEffectsPreview(currentPitch);
    setStatus("Selection canceled.");
  });

  // === Atomic RPC click handler ===
  saveBtn.addEventListener("click", async () => {
    if (selectedPitch === currentPitch){ setStatus("Already using this pitch."); return; }
    if (!isFridayIST()){ setStatus("Pitch can be changed only on Fridays (IST)."); return; }

    const daysLeft = Math.max(0, COOLDOWN_DAYS - Math.floor(daysBetweenTs(Date.parse(lastChanged||0))));
    if (daysLeft > 0){ setStatus(`Cooldown active. Try again in ${fmtDaysLeft(lastChanged)}.`); return; }

    const { data: userWrap } = await supabase.auth.getUser();
    const actor = userWrap?.user?.id;
    if (!actor) { setStatus("Not authenticated."); return; }

    const { data, error } = await supabase.rpc('change_stadium_pitch', {
      p_team_id: teamId,
      p_new_type: selectedPitch,
      p_actor: actor
    });

    if (error) {
      setStatus(error.message || "Failed to change pitch.");
      return;
    }

    // Success
    const row = Array.isArray(data) ? data[0] : data;
    const newCash = row?.remaining_cash ?? null;
    if (newCash !== null && topCash) topCash.textContent = `₹ ${newCash}`;

    currentPitch = selectedPitch;
    lastChanged = row?.pitch_last_changed || new Date().toISOString();

    setStatus(`Changed to ${PITCH_TYPES[selectedPitch].name}. ₹10,00,000 deducted.`);
    showCooldownPill(lastChanged);
    renderPitchButtons(selectedPitch);
    updateEffectsPreview(selectedPitch);
    updatePitchLabel(currentPitch, lastChanged);
  });
}

// Expose for other modules (e.g., match engine)
window.TCB_Pitch = {
  async getForTeam(teamId){
    const { data } = await supabase
      .from("stadiums")
      .select("pitch_type")
      .eq("team_id", teamId)
      .maybeSingle();
    const key = data?.pitch_type || "balanced";
    return { key, ...PITCH_TYPES[key] };
  }
};

// Kick off
init();
