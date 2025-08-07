// js/stadium.js
import { loadSharedUI } from './shared-ui-stadium.js';
import { addManagerXP } from './shared-xp.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

loadSharedUI();

const supabase = createClient(
  'https://YOUR_PROJECT_ID.supabase.co',
  'YOUR_ANON_KEY'
);

const STADIUM_LEVELS = [
  { level: 1, name: "Local", capacity: 5000, revenue: 500, cost: 100000, requiredManagerXP: 1 },
  { level: 2, name: "Town", capacity: 10000, revenue: 1000, cost: 250000, requiredManagerXP: 200 },
  { level: 3, name: "City", capacity: 20000, revenue: 2000, cost: 500000, requiredManagerXP: 600 },
  { level: 4, name: "National", capacity: 40000, revenue: 4000, cost: 1000000, requiredManagerXP: 1000 },
  { level: 5, name: "World Class", capacity: 75000, revenue: 8000, cost: 2000000, requiredManagerXP: 1500 },
];

const MANAGER_LEVELS = [
  { xp: 0, label: "Beginner" },
  { xp: 100, label: "Expert" },
  { xp: 300, label: "Professional" },
  { xp: 600, label: "Master" },
  { xp: 1000, label: "Supreme" },
  { xp: 1500, label: "World Class" },
  { xp: 2000, label: "Ultimate" },
  { xp: 3000, label: "Titan" },
  { xp: 5000, label: "The Boss" },
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
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stadium_level, xp, cash")
    .eq("user_id", user.id)
    .single();

  if (!profile) return;

  updateStadiumDisplay(profile.stadium_level, profile.xp);

  document.getElementById('upgrade-btn')?.addEventListener('click', async () => {
    const currentLevel = profile.stadium_level;
    if (currentLevel >= 5) {
      document.getElementById('upgrade-msg').innerText = "Max level reached.";
      return;
    }

    const next = STADIUM_LEVELS[currentLevel]; // 0-indexed
    if (profile.xp < next.requiredManagerXP) {
      document.getElementById('upgrade-msg').innerText = "Not enough XP to upgrade.";
      return;
    }

    if (profile.cash < next.cost) {
      document.getElementById('upgrade-msg').innerText = "Not enough cash.";
      return;
    }

    const updates = await supabase
      .from("profiles")
      .update({
        stadium_level: currentLevel + 1,
        cash: profile.cash - next.cost
      })
      .eq("user_id", user.id);

    if (!updates.error) {
      const newLevel = currentLevel + 1;
      await addManagerXP(supabase, user.id, `stadium_lvl${newLevel}`);
      location.reload();
    }
  });
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
