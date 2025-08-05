
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

let currentLineup = [];
let currentBowlers = [];
let overAssignments = new Array(20).fill(null);
let locked = false;

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return location.href = "login.html";

  const { data: profile } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash")
    .eq("user_id", user.id)
    .single();

  renderTopBar(profile);
  renderBottomNav();

  const players = await fetchPlayers(user.id);
  const teamId = await fetchTeamId(user.id);
  const lineup = await fetchLineup(teamId);

  const now = new Date();
  const lockTime = new Date();
  lockTime.setHours(30, 0, 0, 0); // 8 PM IST
  locked = now >= lockTime;

  renderLineup(players, lineup);
  setupSaveHandler(user.id, teamId);
  setupCountdown(lockTime);
});

function renderTopBar(profile) {
  const topBar = document.getElementById("top-bar");
  topBar.className = "fixed-top-bar";
  topBar.innerHTML = `
    <div>
      👤 <strong>${profile.manager_name}</strong> | XP: ${profile.xp} |
      🪙 ${profile.coins} | 💵 ₹${profile.cash}
    </div>
    <button onclick="location.href='login.html'">Logout</button>
  `;
}

function renderBottomNav() {
  const bottomNav = document.getElementById("bottom-nav");
  bottomNav.className = "fixed-bottom-nav";
  bottomNav.innerHTML = `
    <a href="team.html">🏏 Team</a>
    <a href="scout.html">🔍 Scout</a>
    <a href="home.html">🏠 Home</a>
    <a href="auction.html">⚒️ Auction</a>
    <a href="store.html">🛒 Store</a>
  `;
}

async function fetchTeamId(userId) {
  const { data } = await supabase.from("teams").select("id").eq("owner_id", userId).single();
  return data?.id;
}

async function fetchPlayers(userId) {
  const { data: team } = await supabase.from("teams").select("id").eq("owner_id", userId).single();
  const { data } = await supabase.from("players").select("*").eq("team_id", team.id);
  return data || [];
}

async function fetchLineup(teamId) {
  const { data } = await supabase.from("lineups").select("*").eq("team_id", teamId).maybeSingle();
  return data || null;
}

function renderLineup(players, lineup) {
  const xi = lineup?.playing_xi || players.slice(0, 11).map(p => p.id);
  const idMap = Object.fromEntries(players.map(p => [p.id, p]));

  currentLineup = xi.map(id => idMap[id]).filter(Boolean);
  const bench = players.filter(p => !xi.includes(p.id));
  currentBowlers = currentLineup.filter(p => p.bowling > 5).slice(0, 6);

  document.getElementById("playing11-list").innerHTML = "";
  currentLineup.forEach(p => {
    document.getElementById("playing11-list").appendChild(makePlayerCard(p));
  });

  document.getElementById("bench-list").innerHTML = "";
  bench.forEach(p => {
    document.getElementById("bench-list").appendChild(makePlayerCard(p));
  });

  renderCaptainPicker();
  renderBowlingSection();
}

function makePlayerCard(p) {
  const card = document.createElement("div");
  card.className = "player-card compact";
  card.dataset.playerId = p.id;

  const bowStyle = `${p.bowling_style?.split(" ").map(s => s[0]).join("") || "-"}`;
  const expandedHTML = `
    <div class="player-expanded">
      <div>Form: ${p.form}</div>
      <div>Fitness: ${p.fitness}</div>
      <div>XP: ${p.experience}</div>
      <div>Skills: ${[p.skill1, p.skill2].filter(Boolean).join(", ")}</div>
    </div>`;

  card.innerHTML = `
    <div class="player-header">
      <div><strong>${p.name}</strong></div>
      <div>${p.role} (${bowStyle})</div>
      <div>🏏 ${p.batting} 🎯 ${p.bowling} 🧤 ${p.keeping}</div>
    </div>
    ${expandedHTML}
  `;

  card.addEventListener("click", () => {
    card.classList.toggle("compact");
    card.classList.toggle("expanded");
  });

  return card;
}

function renderCaptainPicker() {
  const container = document.getElementById("captain-picker");
  container.innerHTML = `<h3>Pick Captain</h3>`;
  currentLineup.forEach(player => {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="radio" name="captain" value="${player.id}">
      ${player.name}
    `;
    container.appendChild(label);
  });
}

function renderBowlingSection() {
  const container = document.getElementById("bowling-lineup");
  container.innerHTML = "<h3>Assign Bowling Overs</h3>";

  currentBowlers.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className = "bowler-row";
    div.innerHTML = `<div class="bowler-name">${p.name}</div>`;
    for (let i = 0; i < 4; i++) {
      const box = document.createElement("div");
      box.className = "over-box";
      box.dataset.bowlerId = p.id;
      box.dataset.index = idx;
      box.onclick = () => assignOver(p.id);
      div.appendChild(box);
    }
    container.appendChild(div);
  });

  updateOverBoxes();
}

function assignOver(bowlerId) {
  const index = overAssignments.findIndex(v => v === null);
  if (index === -1) {
    alert("All 20 overs assigned.");
    return;
  }

  if (overAssignments[index - 1] === bowlerId) {
    alert("No consecutive overs for same bowler.");
    return;
  }

  overAssignments[index] = bowlerId;
  updateOverBoxes();
}

function updateOverBoxes() {
  const boxes = document.querySelectorAll(".over-box");
  boxes.forEach(box => {
    box.classList.remove("filled");
    box.textContent = "";
  });

  overAssignments.forEach((bowlerId, i) => {
    if (bowlerId) {
      const box = document.querySelector(`.over-box[data-bowler-id="${bowlerId}"]:not(.filled)`);
      if (box) {
        box.textContent = i + 1;
        box.classList.add("filled");
      }
    }
  });

  document.getElementById("overs-count").textContent = `${overAssignments.filter(v => v).length}/20 overs set`;
}

function setupCountdown(lockTime) {
  const status = document.getElementById("lineup-status");
  const interval = setInterval(() => {
    const now = new Date();
    if (now >= lockTime) {
      locked = true;
      status.textContent = "🔒 Lineup Locked";
      clearInterval(interval);
    } else {
      const diffMs = lockTime - now;
      const mins = Math.floor((diffMs / 1000 / 60) % 60);
      const hrs = Math.floor((diffMs / 1000 / 60 / 60));
      status.textContent = `🔓 Lineup locks in ${hrs}h ${mins}m`;
    }
  }, 60000);

  if (new Date() >= lockTime) {
    locked = true;
    status.textContent = "🔒 Lineup Locked";
  }
}

function setupSaveHandler(userId, teamId) {
  document.getElementById("save-lineup-btn").onclick = async () => {
    if (locked) {
      alert("Lineup is locked.");
      return;
    }

    if (overAssignments.filter(Boolean).length < 20) {
      alert("Please assign all 20 overs.");
      return;
    }

    const xiIds = currentLineup.map(p => p.id);
    const captainId = document.querySelector('input[name="captain"]:checked')?.value;
    if (!captainId) {
      alert("Select a captain.");
      return;
    }

    const { error } = await supabase.from("lineups").upsert({
      team_id: teamId,
      playing_xi: xiIds,
      batting_order: xiIds,
      bowling_order: overAssignments,
      captain: captainId,
      locked: false
    }, { onConflict: ['team_id'] });

    if (!error) alert("✅ Lineup saved.");
    else alert("❌ Failed to save.");
  };
}
