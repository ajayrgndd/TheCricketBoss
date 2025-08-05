document.addEventListener("DOMContentLoaded", async () => {
  loadSharedUI();

  const players = await fetchUserPlayers();
  if (!players.length) return;

  const lineupData = await fetchSavedLineup();
  renderPlayers(players, lineupData);
  enableDragDrop();

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
    alert("Failed to load players.");
    return [];
  }

  return data;
}

async function fetchSavedLineup() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: teamData } = await supabase
    .from("teams")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: lineup } = await supabase
    .from("lineups")
    .select("*")
    .eq("team_id", teamData.id)
    .single();

  return lineup || null;
}

function renderPlayers(players, lineupData) {
  let playing11 = players.slice(0, 11);
  const bench = players.slice(11);

  if (lineupData?.batting_order?.length > 0) {
    const idToPlayer = Object.fromEntries(players.map(p => [p.id, p]));
    playing11 = lineupData.batting_order.map(id => idToPlayer[id]).filter(Boolean);
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
    document.getElementById("save-lineup-btn").disabled = true;
    document.getElementById("save-lineup-btn").innerText = "Lineup Locked";
  }
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

function enableDragDrop() {
  const playingContainer = document.getElementById("playing11-list");
  Sortable.create(playingContainer, {
    animation: 150,
    ghostClass: 'drag-ghost'
  });
}

function isAfter8PMIST() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + (istOffset * 60000));
  return istTime.getHours() >= 20;
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
    .eq("user_id", user.id)
    .single();

  const teamId = teamData.id;
  const isLocked = isAfter8PMIST();

  const { error } = await supabase
    .from("lineups")
    .upsert({
      team_id: teamId,
      playing_xi: playing11Ids,
      batting_order: playing11Ids,
      bowling_order: playing11Ids.slice(5),
      locked: isLocked
    }, { onConflict: ['team_id'] });

  if (error) {
    alert("Failed to save lineup.");
    console.error(error);
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

  alert(isLocked ? "✅ Lineup saved & locked!" : "✅ Lineup saved!");

  if (isLocked) {
    document.getElementById("save-lineup-btn").disabled = true;
    document.getElementById("save-lineup-btn").innerText = "Lineup Locked";
  }
}
