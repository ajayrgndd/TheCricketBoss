// stadium.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { addManagerXP } from "./shared-xp.js";
import { loadSharedUI } from "./shared-ui-stadium.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

let userId;

const STADIUM_LEVELS = {
  1: { name: "Local", capacity: 5000, revenue: 500, upgradeCost: 2000 },
  2: { name: "Domestic", capacity: 10000, revenue: 800, upgradeCost: 4000 },
  3: { name: "Regional", capacity: 15000, revenue: 1200, upgradeCost: 8000 },
  4: { name: "National", capacity: 20000, revenue: 1600, upgradeCost: 12000 },
  5: { name: "Mega", capacity: 35000, revenue: 2000, upgradeCost: null }, // Max
};

async function init() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.user) {
    window.location.href = "login.html";
    return;
  }

  userId = session.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash, stadium_level")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    console.error("❌ Profile fetch error:", profileError?.message);
    return;
  }

  // Inject top/bottom bars
  loadSharedUI({
    supabase,
    manager_name: profile.manager_name,
    xp: profile.xp,
    coins: profile.coins,
    cash: profile.cash,
  });

  updateStadiumDisplay(profile.stadium_level || 1);
  document
    .getElementById("upgrade-btn")
    .addEventListener("click", () => upgradeStadium(profile));
}

function updateStadiumDisplay(level) {
  const data = STADIUM_LEVELS[level];
  document.getElementById("stadium-level").innerText = `Level ${level} (${data.name})`;
  document.getElementById("stadium-capacity").innerText = data.capacity.toLocaleString();
  document.getElementById("stadium-revenue").innerText = data.revenue.toLocaleString();
}

async function upgradeStadium(profile) {
  let level = profile.stadium_level || 1;
  if (level >= 5) {
    document.getElementById("upgrade-msg").innerText = "🏟️ Stadium is already at max level.";
    return;
  }

  const next = STADIUM_LEVELS[level + 1];
  if (profile.cash < next.upgradeCost) {
    document.getElementById("upgrade-msg").innerText = `❌ Not enough cash. ₹${next.upgradeCost} needed.`;
    return;
  }

  // Deduct and update in Supabase
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      cash: profile.cash - next.upgradeCost,
      stadium_level: level + 1,
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("❌ Upgrade error:", updateError.message);
    document.getElementById("upgrade-msg").innerText = "⚠️ Upgrade failed. Try again.";
    return;
  }

  // XP Reward
  await addManagerXP(supabase, userId, `stadium_lvl${level + 1}`);

  // UI updates
  profile.stadium_level += 1;
  profile.cash -= next.upgradeCost;
  updateStadiumDisplay(profile.stadium_level);
  const levelInfo = STADIUM_LEVELS[profile.stadium_level];
  document.getElementById("upgrade-msg").innerText = `✅ Upgraded to Level ${profile.stadium_level} (${levelInfo.name})`;
}

init();
