import { loadSharedUI } from './shared-ui-stadium.js';
import { addManagerXP } from './shared-xp.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

loadSharedUI();

const supabase = createClient(
  'https://iukofcmatlfhfwcechdq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE'
);

const STADIUM_UPGRADE_DURATIONS = {
  1: 24 * 60 * 60 * 1000,
  2: 48 * 60 * 60 * 1000,
  3: 72 * 60 * 60 * 1000,
  4: 96 * 60 * 60 * 1000,
};

const STADIUM_LEVELS = [
  { level: 1, name: "Local", capacity: 5000, revenue: 500, cost: 100000, requiredManagerXP: 1 },
  { level: 2, name: "Professional", capacity: 10000, revenue: 1000, cost: 250000, requiredManagerXP: 750 },
  { level: 3, name: "Domestic", capacity: 15000, revenue: 2000, cost: 500000, requiredManagerXP: 3500 },
  { level: 4, name: "National", capacity: 20000, revenue: 4000, cost: 1000000, requiredManagerXP: 5500 },
  { level: 5, name: "World Class", capacity: 30000, revenue: 8000, cost: 2000000, requiredManagerXP: 8500 },
];

const MANAGER_LEVELS = [
  { xp: 0, label: "Beginner" },
  { xp: 250, label: "Expert" },
  { xp: 750, label: "Professional" },
  { xp: 1750, label: "Master" },
  { xp: 3500, label: "Supreme" },
  { xp: 5500, label: "World Class" },
  { xp: 8500, label: "Ultimate" },
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

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stadium_level, xp, cash, stadium_upgrade_end")
    .eq("user_id", user.id)
    .single();

  if (!profile) return;

  // Check if an upgrade was pending and time is over → Upgrade stadium
  if (profile.stadium_upgrade_end && new Date(profile.stadium_upgrade_end) <= new Date()) {
    await completeUpgrade(user.id, profile.stadium_level);
    profile.stadium_level += 1;
    profile.stadium_upgrade_end = null;
  }

  updateStadiumDisplay(profile.stadium_level, profile.xp);

  const upgradeBtn = document.getElementById('upgrade-btn');
  const upgradeMsg = document.getElementById('upgrade-msg');

  if (profile.stadium_upgrade_end && new Date(profile.stadium_upgrade_end) > new Date()) {
    disableUpgradeBtnWithCountdown(profile.stadium_upgrade_end);
    return;
  }

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
      disableUpgradeBtnWithCountdown(upgradeEndTime);
    }
  });
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

init();
