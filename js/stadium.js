document.addEventListener('DOMContentLoaded', async () => {
  const usernameEl = document.getElementById("username");
  const xpEl = document.getElementById("xp");
  const coinsEl = document.getElementById("coins");
  const cashEl = document.getElementById("cash");

  const levelEl = document.getElementById("stadium-level");
  const capacityEl = document.getElementById("stadium-capacity");
  const rateEl = document.getElementById("stadium-ticket-rate");
  const earningsEl = document.getElementById("matchday-earnings");
  const upgradeCostEl = document.getElementById("upgrade-cost");
  const upgradeBtn = document.getElementById("upgrade-button");
  const upgradeMsg = document.getElementById("upgrade-message");

  const user = await getUser(); // Your Supabase auth function
  if (!user) return;

  const profile = await getUserProfile(user.id);
  const stadium = await getStadium(user.id);
  const stadiumLevelData = await getStadiumLevel(stadium.level);

  usernameEl.textContent = "👤 " + profile.manager_name;
  xpEl.textContent = "⭐ XP: " + profile.xp;
  coinsEl.textContent = "💰 Coins: " + profile.coins;
  cashEl.textContent = "🏟 Cash: " + profile.cash;

  levelEl.textContent = stadium.level_name;
  capacityEl.textContent = stadium.capacity;
  rateEl.textContent = stadium.ticket_rate;
  earningsEl.textContent = stadium.capacity * stadium.ticket_rate;
  upgradeCostEl.textContent = stadiumLevelData.upgrade_cost;

  upgradeBtn.onclick = async () => {
    const nextLevel = stadium.level + 1;
    const nextData = await getStadiumLevel(nextLevel);

    if (!nextData) {
      upgradeMsg.textContent = "⛔ Maximum stadium level reached.";
      return;
    }

    if (profile.cash < nextData.upgrade_cost) {
      upgradeMsg.textContent = "❌ Not enough cash to upgrade.";
      return;
    }

    const upgraded = await upgradeStadium(user.id, nextLevel, nextData);
    if (upgraded) {
      window.location.reload();
    } else {
      upgradeMsg.textContent = "⚠️ Upgrade failed. Try again.";
    }
  };
});

// Utility functions
async function getUserProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

async function getStadium(userId) {
  const { data } = await supabase.from("stadiums").select("*").eq("user_id", userId).single();
  return data;
}

async function getStadiumLevel(level) {
  const { data } = await supabase.from("stadium_levels").select("*").eq("level", level).single();
  return data;
}

async function upgradeStadium(userId, newLevel, levelData) {
  const { error: updateErr } = await supabase
    .from("stadiums")
    .update({
      level: newLevel,
      level_name: levelData.level_name,
      capacity: levelData.capacity,
      ticket_rate: levelData.ticket_rate,
    })
    .eq("user_id", userId);

  const { error: cashErr } = await supabase
    .from("profiles")
    .update({ cash: supabase.rpc('decrease_cash', { user_id: userId, amount: levelData.upgrade_cost }) })
    .eq("id", userId);

  return !updateErr && !cashErr;
}
