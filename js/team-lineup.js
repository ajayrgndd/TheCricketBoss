import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { loadSharedUI } from "./shared-ui.js";

// ✅ Supabase setup
const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert("Session expired. Please log in again.");
    window.location.href = "login.html";
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    alert("Profile not found. Please complete setup.");
    window.location.href = "profile-setup.html";
    return;
  }

  loadSharedUI({
    supabase,
    manager_name: profile.manager_name,
    xp: profile.xp,
    coins: profile.coins,
    cash: profile.cash,
  });

  updateLockCountdown(); // 🔄 Update countdown and lock status

  const players = await fetchUserPlayers(user.id);
  const lineupData = await fetchSavedLineup(user.id);
  renderPlayers(players, lineupData);
  enableDragDrop();

  document.getElementById("save-lineup-btn").addEventListener("click", () => saveLineup(players));
});

// 🧠 Helper: Check if today is matchday (Mon or Thu)
function isMatchDay() {
  const day = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" });
  return ["Mon", "Thu"].includes(day);
}

// ⏱️ Update lock countdown + icon
function updateLockCountdown() {
  const info = document.createElement("div");
  info.style.textAlign = "center";
  info.style.margin = "10px 0";
  info.style.fontWeight = "bold";
  const icon = document.createElement("span");

  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + istOffset * 60000);

  const lockHour = 20; // 8PM IST

  if (isMatchDay()) {
    if (ist.getHours() < lockHour) {
      const hoursLeft = lockHour - ist.getHours() - 1;
      const minutesLeft = 60 - ist.getMinutes();
      icon.textContent = "🔓";
      info.innerHTML = `${icon.outerHTML} Lineup locks in ${hoursLeft}h ${minutesLeft}m`;
    } else {
      icon.textContent = "🔒";
      info.innerHTML = `${icon.outerHTML} Lineup is now locked`;
      document.getElementById("save-lineup-btn").disabled = true;
      document.getElementById("save-lineup-btn").innerText = "Lineup Locked";
    }
  } else {
    icon.textContent = "🔓";
    info.innerHTML = `${icon.outerHTML} Lineup is unlocked`;
    document.getElementById("save-lineup-btn").disabled = false;
    document.getElementById("save-lineup-btn").innerText = "Save Lineup";
  }

  document.querySelector(".lineup-container").prepend(info);
}

async function fetchUserPlayers(userId) {
  const { data: teamData } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (!teamData) {
    console.warn("⚠️ Team not found.");
    return [];
  }

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamData.id);

  return players || [];
}

async function fetchSavedLineup(userId) {
  const { data: teamData } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (!teamData) return null;

  const { data: lineup } = await supabase
    .from("lineups")
    .select("*")
    .eq("team_id", teamData.id)
    .maybeSingle();

  return lineup || null;
}

function renderPlayers(players, lineupData) {
  let playing11 = players.slice(0, 11);
  const bench = players.slice(11);

  if (lineupData?.batting_order?.length > 0) {
    const idMap = Object.fromEntries(players.map(p => [p.id, p]));
    playing11 = lineupData.batting_order.map(id => idMap[id]).filter(Boolean);
  }

  const playingContainer = document.getElementById("playing11-list");
  const benchContainer = document.getElementById("bench-list");

  playingContainer.innerHTML = "";
  benchContainer.innerHTML = "";

  playing11.forEach(player => {
    const card = createPlayerCard(player, true);
    playingContainer.appendChild(card);
  });

  bench.forEach(player => {
    const card = createPlayerCard(player, false);
    benchContainer.appendChild(card);
  });
}

function createPlayerCard(player, allowWK = true) {
  const card = document.createElement("div");
  card.className = "player-card";
  card.dataset.playerId = player.id;

  card.innerHTML = `
    <div class="player-info">
      <img src="images/avatar.png" alt="Player" />
      <div>
        <div><strong>${player.name}</strong></div>
        <div>${player.role}</div>
        <div class="skills">
          🏏 ${player.batting} 🎯 ${player.bowling} 🧤 ${player.keeping}
        </div>
        <div class="player-stats">
          Form: ${player.form} | Fitness: ${player.fitness}
        </div>
        <div class="skills-extra">
          <span class="skill-tag">${player.skill1 || ""}</span>
          <span class="skill-tag">${player.skill2 || ""}</span>
        </div>
      </div>
    </div>
    ${allowWK ? `
      <div class="player-role">
        <label>
          <input type="radio" name="wicketKeeper" class="wk-radio" value="${player.id}" ${player.is_wk ? 'checked' : ''}/>
          WK
        </label>
      </div>
    ` : ''}
  `;

  return card;
}

function enableDragDrop() {
  const container = document.getElementById("playing11-list");
  Sortable.create(container, {
    animation: 150,
    ghostClass: "drag-ghost"
  });
}

async function saveLineup(allPlayers) {
  const selectedWK = document.querySelector('input[name="wicketKeeper"]:checked');
  if (!selectedWK) {
    alert("Select a Wicket Keeper.");
    return;
  }

  const wkId = selectedWK.value;
  const playingCards = document.querySelectorAll("#playing11-list .player-card");
  const playing11Ids = [...playingCards].map(card => card.dataset.playerId);

  const { data: { user } } = await supabase.auth.getUser();

  const { data: teamData } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const isLocked = isMatchDay() && new Date().getHours() >= 20;

  const { error: upsertError } = await supabase
    .from("lineups")
    .upsert({
      team_id: teamData.id,
      playing_xi: playing11Ids,
      batting_order: playing11Ids,
      bowling_order: playing11Ids.slice(5),
      locked: isLocked
    }, { onConflict: ['team_id'] });

  if (upsertError) {
    console.error("❌ Failed to save lineup", upsertError);
    alert("Failed to save lineup.");
    return;
  }

  await supabase
    .from("players")
    .update({ is_wk: true })
    .eq("id", wkId);

  await supabase
    .from("players")
    .update({ is_wk: false })
    .in("id", playing11Ids.filter(id => id !== wkId));

  alert(isLocked ? "✅ Lineup saved and locked!" : "✅ Lineup saved!");
}
