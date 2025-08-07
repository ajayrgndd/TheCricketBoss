import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { loadSharedUI } from "./shared-ui-stadium.js";
import { addManagerXP } from "./shared-xp.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

const stadiumNames = [
  "Level 1 (Local)",
  "Level 2 (Domestic)",
  "Level 3 (State)",
  "Level 4 (National)",
  "Level 5 (International)",
];

const managerLevelOrder = [
  "Beginner",
  "Expert",
  "Professional",
  "Master",
  "Supreme",
  "World Class",
  "Ultimate",
  "Titan",
  "The Boss",
];

// Stadium level requirements
const stadiumDetails = {
  1: { capacity: 5000, revenue: 500, cost: 100000, requiredManager: "Professional" },
  2: { capacity: 10000, revenue: 1000, cost: 250000, requiredManager: "Master" },
  3: { capacity: 20000, revenue: 2500, cost: 500000, requiredManager: "Supreme" },
  4: { capacity: 40000, revenue: 4000, cost: 1000000, requiredManager: "World Class" },
};

let currentUser = null;

async function init() {
  await loadSharedUI();

  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
  if (!user) return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stadium_level, cash, xp, manager_level")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    console.error("❌ Profile fetch error:", error?.message);
    return;
  }

  updateStadiumDisplay(profile);
  setupUpgradeButton(profile);
}

function updateStadiumDisplay(profile) {
  const level = profile.stadium_level || 1;
  const details = stadiumDetails[level] || stadiumDetails[1];

  document.getElementById("stadium-level-name").innerText = stadiumNames[level - 1] || "Level " + level;
  document.getElementById("stadium-capacity").innerText = details.capacity.toLocaleString();
  document.getElementById("stadium-revenue").innerText = details.revenue.toLocaleString();
  document.getElementById("stadium-upgrade-cost").innerText = details.cost.toLocaleString();
  document.getElementById("required-manager-level").innerText = details.requiredManager;
}

function setupUpgradeButton(profile) {
  const upgradeBtn = document.getElementById("upgrade-btn");
  const upgradeMsg = document.getElementById("upgrade-msg");

  upgradeBtn.addEventListener("click", async () => {
    const currentLevel = profile.stadium_level || 1;
    const nextLevel = currentLevel + 1;
    const details = stadiumDetails[nextLevel];

    if (!details) {
      upgradeMsg.innerText = "✅ Max level reached.";
      return;
    }

    // Check cash
    if (profile.cash < details.cost) {
      upgradeMsg.innerText = "❌ Not enough cash to upgrade.";
      return;
    }

    // Check manager level requirement
    const currentManagerIndex = managerLevelOrder.indexOf(profile.manager_level);
    const requiredIndex = managerLevelOrder.indexOf(details.requiredManager);

    if (currentManagerIndex < requiredIndex) {
      upgradeMsg.innerText = `❌ Requires manager level: ${details.requiredManager}`;
      return;
    }

    // Upgrade
    const { error: upgradeError } = await supabase
      .from("profiles")
      .update({
        stadium_level: nextLevel,
        cash: profile.cash - details.cost,
      })
      .eq("user_id", currentUser.id);

    if (upgradeError) {
      upgradeMsg.innerText = "❌ Upgrade failed.";
      return;
    }

    // Add XP
    await addManagerXP(supabase, currentUser.id, `stadium_lvl${nextLevel}`);

    // Refresh page
    location.reload();
  });
}

init();
