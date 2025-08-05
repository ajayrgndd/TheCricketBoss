import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { loadSharedUI } from './js/shared-ui.js';

// ✅ Supabase setup
const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE" // 🔐 Replace with your real key
);

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Check auth
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    alert("Session expired. Please log in again.");
    window.location.href = "login.html";
    return;
  }

  // ✅ Load profile (includes team_id now)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash, team_id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile || !profile.team_id) {
    alert("Profile or team not found. Please complete setup.");
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

  const teamId = profile.team_id;

  const players = await fetchUserPlayers(teamId);
  const lineupData = await fetchSavedLineup(teamId);
  renderPlayers(players, lineupData);
  enableDragDrop();

  document.getElementById("save-lineup-btn").addEventListener("click", () => saveLineup(players, teamId));
});

async function fetchUserPlayers(teamId) {
  const { data: players, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId);

  if (playerError) {
    console.error("❌ Failed to fetch players:", playerError);
    return [];
  }

  return players;
}

async function fetchSavedLineup(teamId) {
  const { data: lineup, error } = await supabase
    .from("lineups")
    .select("*")
    .eq("team_id", teamId)
    .single();

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

  if (lineupData?.locked) {
    const btn = document.getElementById("save-lineup-btn");
    btn.disabled = true;
    btn.innerText = "Lineup Locked";
  }
}

function createPlayerCard(player, allowWK = true) {
  const card = document.createElement("div");
  card.className = "player-card";
  card.dataset.playerId = player.id;

  card.innerHTML = `
    <div class="player-info">
      <img src="${player.image_url || 'images/avatar.png'}" alt="Player" />
      <div>
        <div><strong>${player.name}</strong></div>
        <div class="role-short">
          ${player.batting_style || ""}${player.batting_style ? " " : ""}${player.bowling_style || ""}
          ${player.is_wk ? " | WK" : ""}
        </div>
        <div class="skills">
          🏏 ${player.batting} 🎯 ${player.bowling} 🧤 ${player.keeping}
        </div>
        <div class="player-stats">
          Form: ${player.form} | Fitness: ${player.fitness} | XP: ${player.experience}
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

function isAfter8PMIST() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + istOffset * 60000);
  return ist.getHours() >= 20;
}

async function saveLineup(allPlayers, teamId) {
  const selectedWK = document.querySelector('input[name="wicketKeeper"]:checked');
  if (!selectedWK) {
    alert("Select a Wicket Keeper.");
    return;
  }

  const wkId = selectedWK.value;

  const playingCards = document.querySelectorAll("#playing11-list .player-card");
  const playing11Ids = [...playingCards].map(card => card.dataset.playerId);

  const isLocked = isAfter8PMIST();

  const { error: upsertError } = await supabase
    .from("lineups")
    .upsert({
      team_id: teamId,
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

  // ✅ Set WK
  await supabase
    .from("players")
    .update({ is_wk: true })
    .eq("id", wkId);

  await supabase
    .from("players")
    .update({ is_wk: false })
    .in("id", playing11Ids.filter(id => id !== wkId));

  if (isLocked) {
    const btn = document.getElementById("save-lineup-btn");
    btn.disabled = true;
    btn.innerText = "Lineup Locked";
  }

  alert(isLocked ? "✅ Lineup saved and locked!" : "✅ Lineup saved!");
}
