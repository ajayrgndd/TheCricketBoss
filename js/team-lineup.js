// team-lineup.js

document.addEventListener("DOMContentLoaded", async () => {
  loadSharedUI(); // Load header and footer

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
          <input type="radio" name="wicketKeeper" class="wk-radio" value="${player.id}" ${player.is_wk ? 'checked' : ''} />
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
    alert("Select a Wicket Keeper.");
    return;
  }

  const wkId = selectedWK.value;

  const playingCards = document.querySelectorAll("#playing11-list .player-card");
  const playing11Ids = [...playingCards].map(card => card.dataset.playerId);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    alert("Login expired.");
    return;
  }

  // Get user's team_id
  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (teamError || !teamData) {
    alert("Team not found.");
    return;
  }

  const teamId = teamData.id;

  // Save or update lineup
  const { error: lineupError } = await supabase
    .from("lineups")
    .upsert({
      team_id: teamId,
      playing_xi: playing11Ids,
      batting_order: playing11Ids,
      bowling_order: playing11Ids.slice(5), // last 6 as bowlers
      locked: false
    }, { onConflict: ['team_id'] });

  if (lineupError) {
    console.error("❌ Failed to save lineup:", lineupError);
    alert("Lineup save failed.");
    return;
  }

  // Update is_wk for selected player
  await supabase
    .from("players")
    .update({ is_wk: true })
    .eq("id", wkId);

  // Set is_wk = false for other 10 players
  await supabase
    .from("players")
    .update({ is_wk: false })
    .in("id", playing11Ids.filter(id => id !== wkId));

  alert("✅ Lineup saved successfully!");
}
