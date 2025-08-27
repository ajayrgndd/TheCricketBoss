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
  { level: 1, name: "Local",        capacity: 5000,  revenue: 500,  cost: 100000,  requiredManagerXP: 1 },
  { level: 2, name: "Professional", capacity: 10000, revenue: 1000, cost: 250000,  requiredManagerXP: 750 },
  { level: 3, name: "Domestic",     capacity: 15000, revenue: 2000, cost: 500000,  requiredManagerXP: 3500 },
  { level: 4, name: "National",     capacity: 20000, revenue: 4000, cost: 1000000, requiredManagerXP: 5500 },
  { level: 5, name: "World Class",  capacity: 30000, revenue: 8000, cost: 2000000, requiredManagerXP: 8500 },
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

// === PAGE INIT ===
async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stadium_level, xp, cash, stadium_upgrade_end, team_id, manager_name, coins")
    .eq("user_id", user.id)
    .single();

  if (!profile) return;

  // Top bar
  const topU = document.getElementById("top-username");
  const topX = document.getElementById("top-xp");
  const topC = document.getElementById("top-coins");
  const top$ = document.getElementById("top-cash");
  if (topU) topU.textContent = `👤 ${profile.manager_name}`;
  if (topX) topX.textContent = `XP: ${profile.xp}`;
  if (topC) topC.textContent = `🪙 ${profile.coins}`;
  if (top$) top$.textContent = `₹ ${profile.cash}`;

  // Finalize upgrade if timer elapsed
  if (profile.stadium_upgrade_end && new Date(profile.stadium_upgrade_end) <= new Date()) {
    await completeUpgrade(user.id, profile.stadium_level);
    profile.stadium_level += 1;
    profile.stadium_upgrade_end = null;
  }

  updateStadiumDisplay(profile.stadium_level, profile.xp);

  // Upgrade UI
  const upgradeBtn = document.getElementById('upgrade-btn');
  const upgradeMsg = document.getElementById('upgrade-msg');

  if (profile.stadium_upgrade_end && new Date(profile.stadium_upgrade_end) > new Date()) {
    disableUpgradeBtnWithCountdown(profile.stadium_upgrade_end);
  } else {
    upgradeBtn?.addEventListener('click', async () => {
      const currentLevel = profile.stadium_level;
      if (currentLevel >= 5) {
        upgradeMsg.innerText = "Max level reached.";
        return;
      }

      const next = STADIUM_LEVELS[currentLevel]; // 0-indexed
      if (profile.xp < next.requiredManagerXP) {
        upgradeMsg.innerText = "Not enough XP to upgrade.";
        return;
      }

      if (profile.cash < next.cost) {
        upgradeMsg.innerText = "Not enough cash.";
        return;
      }

      const now = new Date();
      const duration = STADIUM_UPGRADE_DURATIONS[currentLevel];
      const upgradeEndTime = new Date(now.getTime() + duration).toISOString();

      const { error } = await supabase
        .from("profiles")
        .update({
          stadium_upgrade_end: upgradeEndTime,
          cash: profile.cash - next.cost
        })
        .eq("user_id", user.id);

      if (!error) {
        profile.cash -= next.cost;
        if (top$) top$.textContent = `₹ ${profile.cash}`;
        disableUpgradeBtnWithCountdown(upgradeEndTime);
      }
    });
  }

  // Pitch module
  await initPitchModule({ userId: user.id, teamId: profile.team_id });
}

async function completeUpgrade(userId, currentLevel) {
  const newLevel = currentLevel + 1;
  if (newLevel > 5) return;

  await supabase
    .from("profiles")
    .update({
      stadium_level: newLevel,
      stadium_upgrade_end: null
    })
    .eq("user_id", userId);

  await addManagerXP(supabase, userId, `stadium_lvl${newLevel}`);
}

function disableUpgradeBtnWithCountdown(endTime) {
  const btn = document.getElementById('upgrade-btn');
  const msg = document.getElementById('upgrade-msg');
  if (!btn || !msg) return;
  btn.disabled = true;

  function updateCountdown() {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) {
      msg.innerText = "Upgrade complete!";
      btn.disabled = false;
      location.reload();
      return;
    }

    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    msg.innerText = `Upgrade in progress: ${hrs}h ${mins}m ${secs}s`;
    setTimeout(updateCountdown, 1000);
  }

  updateCountdown();
}

function updateStadiumDisplay(level, xp) {
  const el = (id) => document.getElementById(id);
  if (!el("stadium-level-name")) return;

  const stadium = STADIUM_LEVELS[level - 1];
  const next = STADIUM_LEVELS[level] || null;

  el("stadium-level-name").innerText = `Level ${stadium.level} (${stadium.name})`;
  el("stadium-capacity").innerText = stadium.capacity.toLocaleString();
  el("stadium-revenue").innerText = stadium.revenue.toLocaleString();
  el("stadium-upgrade-cost").innerText = next ? next.cost.toLocaleString() : "—";
  el("required-manager-level").innerText = next
    ? getManagerLevelLabel(next.requiredManagerXP)
    : "Max";
}

// Kick off
init();

/* =========================
   PITCH TYPE MODULE (NEW)
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
    .select("id, team_id, user_id, name, pitch_type, pitch_last_changed")
    .eq("team_id", teamId)
    .maybeSingle();

  // If pitch columns missing, show admin message but keep page working
  if (error && /column.*pitch_/.test(error.message || "")) {
    const status = document.getElementById("pitch-status");
    if (status) status.textContent = "Admin: please add columns pitch_type (text) & pitch_last_changed (timestamptz) to stadiums.";
    const { data: sFallback } = await supabase
      .from("stadiums")
      .select("id, team_id, user_id, name")
      .eq("team_id", teamId)
      .maybeSingle();
    return sFallback || null;
  }

  if (!sRow) {
    // Create minimal row if none exists
    const defaultName = "Home Stadium";
    const { data: inserted } = await supabase
      .from("stadiums")
      .insert([{ team_id: teamId, user_id: userId, name: defaultName }])
      .select("id, team_id, user_id, name, pitch_type, pitch_last_changed")
      .single();
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
