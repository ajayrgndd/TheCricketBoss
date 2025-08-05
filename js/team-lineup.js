import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { loadSharedUI } from './shared-ui.js';

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return location.href = "login.html";

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
    cash: profile.cash
  });

  const teamId = await getTeamId(user.id);
  if (!teamId) return alert("Team not found.");

  const allPlayers = await getPlayers(teamId);
  const lineup = await getLineup(teamId);

  const locked = isLockedNow();
  showLockStatus(locked);

  renderPlayingXI(allPlayers, lineup);
  renderBench(allPlayers, lineup);
  renderBowlers(allPlayers, lineup);

  if (!locked) {
    setupDrag();
    setupOverSelection();
    setupExpandToggle();
    setupCaptainPicker();
  }

  document.getElementById("save-lineup-btn").addEventListener("click", () => {
    if (!locked) saveLineup(teamId, user.id);
  });
});

// --------------- HELPERS ---------------- //

function isMatchDay() {
  const day = new Date().getDay(); // Sunday=0
  return day === 1 || day === 4; // Monday or Thursday
}

function isLockedNow() {
  if (!isMatchDay()) return false;
  const now = new Date();
  const istOffset = 5.5 * 60 * 60000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.getHours() >= 20;
}

function getTeamId(userId) {
  return supabase
    .from("teams")
    .select("id")
    .eq("user_id", userId)
    .single()
    .then(res => res.data?.id);
}

function getPlayers(teamId) {
  return supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .then(res => res.data || []);
}

function getLineup(teamId) {
  return supabase
    .from("lineups")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle()
    .then(res => res.data);
}

function renderPlayingXI(players, lineup) {
  const container = document.getElementById("playing11-list");
  container.innerHTML = "";
  const playing = lineup?.playing_xi || players.slice(0, 11).map(p => p.id);
  const idMap = Object.fromEntries(players.map(p => [p.id, p]));

  playing.forEach(id => {
    const player = idMap[id];
    if (player) container.appendChild(createPlayerCard(player, true));
  });
}

function renderBench(players, lineup) {
  const container = document.getElementById("bench-list");
  container.innerHTML = "";

  const inXI = lineup?.playing_xi || players.slice(0, 11).map(p => p.id);
  players.filter(p => !inXI.includes(p.id)).forEach(player => {
    container.appendChild(createPlayerCard(player, false));
  });
}

function renderBowlers(players, lineup) {
  const container = document.getElementById("bowling-panel");
  container.innerHTML = "";

  const bowlingOrder = lineup?.bowling_order || [];
  const bowlers = players
    .filter(p => p.bowling >= 10)
    .sort((a, b) => b.bowling - a.bowling)
    .slice(0, 6);

  bowlers.forEach(bowler => {
    const card = document.createElement("div");
    card.className = "bowler-card expandable";
    card.dataset.playerId = bowler.id;

    const type = `${bowler.bowling_style || 'Unknown'}`;
    card.innerHTML = `
      <div class="compact-view">
        <strong>${bowler.name}</strong> <span>${type}</span>
        <div class="over-boxes">
          ${Array(4).fill().map((_, i) => `
            <div class="over-box" data-over="${i + 1}" data-id="${bowler.id}">${getOverBoxChar(bowler.id, i, bowlingOrder)}</div>
          `).join('')}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function getOverBoxChar(id, i, bowlingOrder) {
  const overNum = bowlingOrder.indexOf(id);
  return overNum === -1 ? "" : (overNum + 1);
}

function createPlayerCard(player, isPlayingXI) {
  const div = document.createElement("div");
  div.className = `player-card expandable ${isPlayingXI ? "playing" : "bench"}`;
  div.dataset.playerId = player.id;

  div.innerHTML = `
    <div class="compact-view">
      <div class="main">
        <strong>${player.name}</strong>
        <div>${player.role}</div>
        <div>${player.batting}/${player.bowling}/${player.keeping}</div>
      </div>
      <div class="captain-select" title="Tap to set as Captain">🏏</div>
    </div>
    <div class="expanded-view hidden">
      <div>Skill Level: ${player.skill_level}</div>
      <div>Fitness: ${player.fitness} | XP: ${player.experience}</div>
      <div>Form: ${player.form}</div>
    </div>
  `;
  return div;
}

// ------------ INTERACTIONS ------------- //

function setupDrag() {
  Sortable.create(document.getElementById("playing11-list"), {
    animation: 150,
    ghostClass: "drag-ghost"
  });
}

function setupExpandToggle() {
  document.querySelectorAll(".expandable").forEach(card => {
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("over-box")) {
        card.classList.toggle("expanded");
        card.querySelector(".expanded-view")?.classList.toggle("hidden");
      }
    });
  });
}

function setupCaptainPicker() {
  document.querySelectorAll(".captain-select").forEach(icon => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".captain-select").forEach(el => el.classList.remove("selected"));
      icon.classList.add("selected");
    });
  });
}

function setupOverSelection() {
  const boxes = document.querySelectorAll(".over-box");
  boxes.forEach(box => {
    box.addEventListener("click", () => {
      const selectedBowlerId = box.dataset.id;
      const allBoxes = [...document.querySelectorAll(`.over-box[data-id="${selectedBowlerId}"]`)];
      const filled = allBoxes.filter(b => b.textContent).length;
      if (filled >= 4) return;

      const allFilled = [...document.querySelectorAll(".over-box")].filter(b => b.textContent).length;
      if (allFilled >= 20) return;

      for (const b of allBoxes) {
        if (!b.textContent) {
          b.textContent = allFilled + 1;
          break;
        }
      }
    });
  });
}

function showLockStatus(isLocked) {
  const msg = document.getElementById("lock-status");
  const btn = document.getElementById("save-lineup-btn");

  if (isLocked) {
    msg.innerHTML = "🔒 Lineup is locked";
    btn.disabled = true;
  } else {
    const remaining = getTimeToLock();
    msg.innerHTML = `⏳ Lineup locks in ${remaining}`;
    btn.disabled = false;
  }
}

function getTimeToLock() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + istOffset * 60000);
  const lockTime = new Date(ist);
  lockTime.setHours(20, 0, 0, 0);

  const diff = lockTime - ist;
  if (diff <= 0) return "0h 0m";

  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

async function saveLineup(teamId, userId) {
  const playingIds = [...document.querySelectorAll("#playing11-list .player-card")].map(c => c.dataset.playerId);
  const selectedCap = document.querySelector(".captain-select.selected")?.closest(".player-card")?.dataset.playerId;

  const bowlingIds = [...document.querySelectorAll(".over-box")]
    .filter(b => b.textContent)
    .sort((a, b) => Number(a.textContent) - Number(b.textContent))
    .map(b => b.dataset.id);

  const { error } = await supabase.from("lineups").upsert({
    team_id: teamId,
    playing_xi: playingIds,
    batting_order: playingIds,
    bowling_order: bowlingIds,
    captain_id: selectedCap,
    locked: isLockedNow()
  }, { onConflict: ["team_id"] });

  if (error) {
    alert("❌ Failed to save.");
    console.error(error);
  } else {
    alert("✅ Lineup saved!");
  }
}
