// js/stadium.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { addManagerXP } from "./shared-xp.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

let userId = null;

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    document.getElementById("status-msg").textContent = "Please log in.";
    return;
  }

  userId = user.id;
  await loadStadiumInfo();

  document.getElementById("upgrade-btn").addEventListener("click", upgradeStadium);
});

async function loadStadiumInfo() {
  const { data, error } = await supabase
    .from("stadiums")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    document.getElementById("stadium-info").textContent = "Failed to load stadium data.";
    return;
  }

  document.getElementById("stadium-info").innerHTML = `
    <p><strong>Level:</strong> ${data.level}</p>
    <p><strong>Capacity:</strong> ${data.capacity}</p>
    <p><strong>Next Upgrade Cost:</strong> ₹${data.upgrade_cost}</p>
  `;
}

async function upgradeStadium() {
  const { data: stadium, error } = await supabase
    .from("stadiums")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !stadium) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("cash")
    .eq("user_id", userId)
    .single();

  if (profile.cash < stadium.upgrade_cost) {
    document.getElementById("status-msg").textContent = "Not enough cash to upgrade!";
    return;
  }

  const newLevel = stadium.level + 1;
  const newCapacity = stadium.capacity + 1000;
  const newCost = stadium.upgrade_cost * 2;
  const newCash = profile.cash - stadium.upgrade_cost;

  const { error: updateErr } = await supabase
    .from("stadiums")
    .update({
      level: newLevel,
      capacity: newCapacity,
      upgrade_cost: newCost
    })
    .eq("user_id", userId);

  await supabase
    .from("profiles")
    .update({ cash: newCash })
    .eq("user_id", userId);

  if (!updateErr) {
    await addManagerXP(supabase, userId, `stadium_lvl${newLevel}`);
    document.getElementById("status-msg").textContent = `✅ Stadium upgraded to Level ${newLevel}!`;
    loadStadiumInfo();
  } else {
    document.getElementById("status-msg").textContent = "❌ Upgrade failed.";
  }
}
