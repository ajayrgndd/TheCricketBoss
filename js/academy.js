import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { loadSharedUI } from "./shared-ui.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

const user = await supabase.auth.getUser().then(res => res.data.user);
if (!user) window.location.href = "index.html";

// Profile and UI
const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
loadSharedUI({ manager_name: profile.manager_name, xp: profile.xp, coins: profile.coins, cash: profile.cash });

// Team
const { data: team } = await supabase.from("teams").select("id").eq("owner_id", user.id).single();
const { data: players } = await supabase.from("players").select("*").eq("team_id", team.id);
const { data: academyRows } = await supabase.from("academy").select("*").eq("user_id", user.id).eq("completed", false);

const activePlayerIds = academyRows.map(r => r.player_id);
const academyList = document.getElementById("academyList");

const skillOptions = [
  "Big Hitter", "Finisher", "Anchor", "Powerplay Master",
  "Swing Specialist", "Yorker King", "Death Over Expert",
  "Sharp Reflexes", "Diving Stop", "Glove Master"
];

for (const player of players) {
  const skillsOwned = [player.skill1, player.skill2].filter(Boolean);
  const availableSlot = skillsOwned.length < 2;
  const slotName = skillsOwned.length === 0 ? "skill1" : "skill2";
  const cost = slotName === "skill1" ? 300 : 500;
  const duration = slotName === "skill1" ? 72 : 120;

  const alreadyLearning = academyRows.find(r => r.player_id === player.id);

  const card = document.createElement("div");
  card.className = "player-card";
  card.innerHTML = `
    <h3>${player.name}</h3>
    <p><strong>Role:</strong> ${player.role}</p>
    <p class="active-skill">Skills: ${skillsOwned.join(", ") || "None"}</p>
    ${alreadyLearning ? `
      <p class="status">⏳ In progress: ${alreadyLearning.skill} (ends ${new Date(alreadyLearning.end_time).toLocaleString()})</p>
    ` : !availableSlot ? `
      <p class="status">🎓 Already has 2 skills</p>
    ` : academyRows.length ? `
      <p class="status">⏳ Only 1 player can be trained at a time</p>
    ` : `
      <label>Select a Skill:</label>
      <select id="skill-${player.id}">
        ${skillOptions
          .filter(skill => !skillsOwned.includes(skill))
          .map(skill => `<option value="${skill}">${skill}</option>`).join("")}
      </select>
      <div class="coin-cost">⏳ ${duration}h OR ⚡ Quick Activate using ${cost} Coins</div>
      <button onclick="window.trainSkill('${player.id}', '${slotName}', ${cost}, ${duration})">Start Training</button>
      <button onclick="window.quickActivate('${player.id}', '${slotName}', ${cost})">⚡ Quick Activate</button>
    `}
  `;
  academyList.appendChild(card);
}

window.trainSkill = async (playerId, slotName, cost, durationHours) => {
  const skill = document.getElementById(`skill-${playerId}`).value;
  const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("academy").insert({
    user_id: user.id,
    player_id: playerId,
    skill_slot: slotName,
    skill,
    start_time: new Date().toISOString(),
    end_time: endTime,
    completed: false
  });

  if (error) return alert("Error: " + error.message);
  alert("🎯 Skill training started!");
  location.reload();
};

window.quickActivate = async (playerId, slotName, cost) => {
  const skill = document.getElementById(`skill-${playerId}`).value;
  if (profile.coins < cost) return alert("❌ Not enough coins");

  const confirmQuick = confirm(`⚡ Quick Activate "${skill}" using ${cost} coins?`);
  if (!confirmQuick) return;

  const updates = [];
  updates.push(supabase.from("profiles").update({ coins: profile.coins - cost }).eq("id", user.id));

  const updateObj = {};
  updateObj[slotName] = skill;
  updates.push(supabase.from("players").update(updateObj).eq("id", playerId));

  const { error } = await Promise.all(updates).then(() => ({})).catch(e => ({ error: e }));
  if (error) return alert("Error: " + error.message);

  alert(`✅ Skill "${skill}" activated instantly!`);
  location.reload();
};
