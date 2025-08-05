import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { loadSharedUI } from './shared-ui.js';

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    alert("Session expired. Please log in again.");
    location.href = "login.html";
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash")
    .eq("user_id", user.id)
    .single();

  loadSharedUI({
    supabase,
    manager_name: profile.manager_name,
    xp: profile.xp,
    coins: profile.coins,
    cash: profile.cash,
  });

  const players = await fetchUserPlayers(user.id);
  const lineupData = await fetchSavedLineup(user.id);

  const isLocked = isLineupLocked();
  updateLockStatus(isLocked);
  renderPlayers(players, lineupData, isLocked);
  enableDragDrop();

  document.getElementById("save-lineup-btn").addEventListener("click", () => {
    saveLineup(players);
  });
});

function isLineupLocked() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return ist.getHours() >= 20;
}

function updateLockStatus(isLocked) {
  const lockStatus = document.getElementById("lock-status");
  if (isLocked) {
    lockStatus.innerHTML = `🔒 Lineup Locked`;
    document.getElementById("save-lineup-btn").disabled = true;
  } else {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const lockTime = new Date(ist);
    lockTime.setHours(20, 0, 0, 0);
    const diffMs = lockTime - ist;
    const minutes = Math.floor(diffMs / 60000);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    lockStatus.innerHTML = `🔓 Lineup locks in ${hrs}h ${mins}m`;
  }
}

async function fetchUserPlayers(userId) {
  const { data: teamData } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (!teamData) return [];

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamData.id);

  return players;
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

function renderPlayers(players, lineupData, isLocked) {
  const idMap = Object.fromEntries(players.map(p => [p.id, p]));
  let playing11 = players.slice(0, 11);
  const bench = players.slice(11);
  let captainId = null;

  if (lineupData?.batting_order?.length > 0) {
    playing11 = lineupData.batting_order.map(id => idMap[id]).filter(Boolean);
    captainId = lineupData.captain_id;
  }

  const playingContainer = document.getElementById("playing11-list");
  const benchContainer = document.getElementById("bench-list");
  playingContainer.innerHTML = "";
  benchContainer.innerHTML = "";

  playing11.forEach(player => {
    const card = createPlayerCard(player, true, isLocked, captainId === player.id);
    playingContainer.appendChild(card);
  });

  bench.forEach(player => {
    const card = createPlayerCard(player, false, isLocked, false);
    benchContainer.appendChild(card);
  });
}

function createPlayerCard(player, isPlayingXI, isLocked, isCaptain) {
  const card = document.createElement("div");
  card.className = "player-card";
  card.dataset.playerId = player.id;

  const roleShort = player.role;
  const skillText = `🏏 ${player.batting} 🎯 ${player.bowling} 🧤 ${player.keeping}`;

  card.innerHTML = `
    <div class="player-header">
      <div>
        <div class="player-name">${player.name}</div>
        <div>${roleShort} | ${skillText}</div>
      </div>
      ${isPlayingXI && !isLocked ? `
        <div class="captain-radio">
          <label>
            <input type="radio" name="captain" value="${player.id}" ${isCaptain ? "checked" : ""}/> C
          </label>
        </div>` : ""
      }
    </div>
    <div class="player-details">
      <div>Form: ${player.form} | Fitness: ${player.fitness}</div>
      <div>XP: ${player.experience} | Age: ${player.age_years}y ${player.age_days}d</div>
      <div>
        <span class="skill-tag">${player.skill1 || ""}</span>
        <span class="skill-tag">${player.skill2 || ""}</span>
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    card.classList.toggle("expanded");
  });

  return card;
}

function enableDragDrop() {
  Sortable.create(document.getElementById("playing11-list"), {
    animation: 150,
    ghostClass: "drag-ghost"
  });
}

async function saveLineup(players) {
  const selectedCaptain = document.querySelector('input[name="captain"]:checked');
  if (!selectedCaptain) {
    alert("Please select a captain.");
    return;
  }

  const playingCards = document.querySelectorAll("#playing11-list .player-card");
  const playing11Ids = [...playingCards].map(card => card.dataset.playerId);
  const captainId = selectedCaptain.value;

  const { data: { user } } = await supabase.auth.getUser();
  const { data: teamData } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!teamData) {
    alert("Team not found.");
    return;
  }

  const { error } = await supabase
    .from("lineups")
    .upsert({
      team_id: teamData.id,
      playing_xi: playing11Ids,
      batting_order: playing11Ids,
      bowling_order: playing11Ids.slice(5),
      captain_id: captainId,
      locked: isLineupLocked()
    }, { onConflict: ['team_id'] });

  if (error) {
    console.error("Failed to save lineup", error);
    alert("Failed to save lineup.");
    return;
  }

  alert("✅ Lineup saved!");
}
