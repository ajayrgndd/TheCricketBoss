// team-lineup.js

document.addEventListener("DOMContentLoaded", async () => {
  loadSharedUI(); // Load top/bottom bars

  const players = await fetchUserPlayers();
  if (!players.length) return;

  renderPlayers(players);

  document.getElementById("save-lineup-btn").addEventListener("click", () => saveLineup(players));
});

async function fetchUserPlayers() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    alert("Please log in first.");
    window.location.href = "login.html";
    return [];
  }

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ Error fetching players:", error);
    alert("Failed to load your players.");
    return [];
  }

  if (data.length < 11) {
    alert("You need at least 11 players to set your lineup.");
    return [];
  }

  return data;
}

function renderPlayers(allPlayers) {
  const playing11 = allPlayers.slice(0, 11);
  const bench = allPlayers.slice(11);

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
        <div class="role-short">${player.role_short}</div>
        <div class="skills">
          <span title="Batting">🏏 ${player.batting}</span>
          <span title="Bowling">🎯 ${player.bowling}</span>
          <span title="WK">🧤 ${player.wk}</span>
        </div>
        <div class="player-stats">
          <span>Form: ${player.form}</span>
          <span>Fitness: ${player.fitness}</span>
          <span>XP: ${player.experience}</span>
        </div>
        <div class="skills-extra">
          <span class="skill-tag">${player.skill1}</span>
          <span class="skill-tag">${player.skill2}</span>
        </div>
      </div>
    </div>

    ${allowWK ? `
      <div class="player-role">
        <label>
          <input type="radio" name="wicketKeeper" class="wk-radio" value="${player.id}" />
          WK
        </label>
      </div>
    ` : ''}
  `;

  return card;
}

async function saveLineup(allPlayers) {
  const selectedWK = document.querySelector('input[name="wicketKeeper"]:checked');
  if (!selectedWK) {
    alert("Please select a Wicket Keeper.");
    return;
  }

  const wkId = selectedWK.value;

  const playingCards = document.querySelectorAll("#playing11-list .player-card");
  const playing11Ids = [...playingCards].map(card => card.dataset.playerId);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    alert("Login expired. Please login again.");
    return;
  }

  const { error } = await supabase
    .from("lineups")
    .upsert({
      user_id: user.id,
      playing_11: playing11Ids,
      wk_id: wkId,
      updated_at: new Date().toISOString()
    }, { onConflict: ['user_id'] });

  if (error) {
    console.error("❌ Lineup save failed:", error);
    alert("Failed to save lineup.");
  } else {
    alert("✅ Lineup saved successfully!");
  }
}
