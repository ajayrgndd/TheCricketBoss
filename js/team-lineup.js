import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/+esm";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

let currentLineup = [];
let currentBowlers = [];
let overAssignments = [];
let locked = false;
let userId, teamId;

document.addEventListener("DOMContentLoaded", async () => {
  loadUIBars();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return (location.href = "login.html");
  userId = user.id;

  const profile = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  const team = await supabase.from("teams").select("*").eq("owner_id", userId).single();
  teamId = team.data.id;

  const players = await supabase.from("players").select("*").eq("team_id", teamId).then(r => r.data || []);
  const lineup = await supabase.from("lineups").select("*").eq("team_id", teamId).maybeSingle().then(r => r.data || null);

  const now = new Date();
  const lockTime = new Date();
  lockTime.setHours(30, 0, 0, 0); // 8 PM IST
  locked = now >= lockTime;

  overAssignments = lineup?.bowling_order || new Array(20).fill(null);
  renderLineup(players, lineup);
  setupSave();
  setupCountdown(lockTime);
  setupDragAndDrop();
});

// Render players
function renderLineup(players, lineup) {
  const xi = lineup?.playing_xi || players.slice(0, 11).map(p => p.id);
  const idMap = Object.fromEntries(players.map(p => [p.id, p]));
  currentLineup = xi.map(id => idMap[id]).filter(Boolean);
  const bench = players.filter(p => !xi.includes(p.id));
  currentBowlers = currentLineup.filter(p => p.bowling >= 6).slice(0, 6);

  const xiList = document.getElementById("playing11-list");
  xiList.innerHTML = "";
  currentLineup.forEach(p => xiList.append(makePlayerCard(p)));

  const benchList = document.getElementById("bench-list");
  benchList.innerHTML = "";
  bench.forEach(p => benchList.append(makePlayerCard(p)));

  renderCaptainPicker();
  renderBowlingLineup();
}

function makePlayerCard(p) {
  const div = document.createElement("div");
  div.className = "player-card compact";
  div.dataset.playerId = p.id;
  div.dataset.name = p.name;
  div.dataset.role = p.role;

  const bowStyle = (p.bowling_style || "RH-Med").split(" ").map(s => s[0]).join("");

  div.innerHTML = `
    <div class="player-header">
      <strong>${p.name}</strong>
      <div>${p.role} (${bowStyle})</div>
      <div>🏏 ${p.batting} 🎯 ${p.bowling} 🧤 ${p.keeping}</div>
    </div>
    <div class="player-expanded">
      <div>Form: ${p.form || 0}</div>
      <div>Fitness: ${p.fitness || 0}</div>
      <div>XP: ${p.experience || 0}</div>
      <div>Skills: ${[p.skill1, p.skill2].filter(Boolean).join(", ")}</div>
    </div>
  `;
  div.addEventListener("click", () => {
    div.classList.toggle("compact");
    div.classList.toggle("expanded");
  });

  return div;
}

// Drag
function setupDragAndDrop() {
  new Sortable(document.getElementById("playing11-list"), {
    group: {
      name: "players",
      pull: true,
      put: (to) => to.el.children.length < 11,
    },
    animation: 150,
    onAdd: () => updateFromDOM()
  });

  new Sortable(document.getElementById("bench-list"), {
    group: "players",
    animation: 150,
    onAdd: () => updateFromDOM()
  });
}

function updateFromDOM() {
  const ids = [...document.querySelectorAll("#playing11-list .player-card")].map(card => card.dataset.playerId);
  const allPlayers = [...document.querySelectorAll(".player-card")].map(card => ({
    id: card.dataset.playerId,
    name: card.dataset.name,
    role: card.dataset.role
  }));

  currentLineup = ids.map(id => allPlayers.find(p => p.id === id)).filter(Boolean);
  currentBowlers = currentLineup.filter(p => parseInt(p.role) >= 6).slice(0, 6);
  renderCaptainPicker();
  renderBowlingLineup();
}

// Captain
function renderCaptainPicker() {
  const container = document.getElementById("captain-picker");
  container.innerHTML = `<h3>Pick Captain</h3>`;
  currentLineup.forEach(p => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="radio" name="captain" value="${p.id}"> ${p.name}`;
    container.appendChild(label);
  });
}

// Bowling
function renderBowlingLineup() {
  const container = document.getElementById("bowling-lineup");
  container.innerHTML = "";

  currentBowlers.forEach(p => {
    const row = document.createElement("div");
    row.className = "bowler-row";
    row.innerHTML = `<div class="bowler-name">${p.name}</div>`;
    for (let i = 0; i < 4; i++) {
      const box = document.createElement("div");
      box.className = "over-box";
      box.dataset.bowlerId = p.id;
      box.addEventListener("click", () => assignOrUnassignOver(p.id));
      row.appendChild(box);
    }
    container.appendChild(row);
  });

  updateOverBoxes();
}

function assignOrUnassignOver(bowlerId) {
  // if bowler already assigned max 4, deny
  const count = overAssignments.filter(id => id === bowlerId).length;
  if (count >= 4) return alert("Max 4 overs per bowler.");

  // find unassigned index
  const index = overAssignments.findIndex(v => v === null);
  if (index === -1) return alert("All 20 overs assigned.");
  if (index > 0 && overAssignments[index - 1] === bowlerId) return alert("No consecutive overs.");

  overAssignments[index] = bowlerId;
  updateOverBoxes();
}

function updateOverBoxes() {
  document.querySelectorAll(".over-box").forEach(box => {
    box.classList.remove("filled");
    box.innerText = "";
  });

  overAssignments.forEach((id, i) => {
    if (id) {
      const box = document.querySelector(`.over-box[data-bowler-id="${id}"]:not(.filled)`);
      if (box) {
        box.innerText = i + 1;
        box.classList.add("filled");
        box.onclick = () => {
          overAssignments[i] = null;
          updateOverBoxes();
        };
      }
    }
  });

  document.getElementById("overs-count").innerText = `${overAssignments.filter(v => v).length}/20 overs set`;
}

// Save
function setupSave() {
  document.getElementById("save-lineup-btn").onclick = async () => {
    if (locked) return alert("🔒 Lineup is locked.");
    if (overAssignments.filter(Boolean).length < 20) return alert("Assign all 20 overs.");
    const captainId = document.querySelector('input[name="captain"]:checked')?.value;
    if (!captainId) return alert("Pick a captain.");

    const xiIds = [...document.querySelectorAll("#playing11-list .player-card")].map(c => c.dataset.playerId);

    const { error } = await supabase.from("lineups").upsert({
      team_id: teamId,
      playing_xi: xiIds,
      batting_order: xiIds,
      bowling_order: overAssignments,
      captain: captainId,
      locked: false
    }, { onConflict: ['team_id'] });

    if (error) return alert("❌ Save failed.");
    alert("✅ Lineup saved.");
  };
}

// Countdown
function setupCountdown(lockTime) {
  const status = document.getElementById("lineup-status");
  const tick = () => {
    const now = new Date();
    if (now >= lockTime) {
      locked = true;
      status.innerText = "🔒 Lineup Locked";
      clearInterval(timer);
    } else {
      const mins = Math.floor((lockTime - now) / 60000) % 60;
      const hrs = Math.floor((lockTime - now) / 3600000);
      status.innerText = `🔓 Lineup locks in ${hrs}h ${mins}m`;
    }
  };
  const timer = setInterval(tick, 60000);
  tick();
}

// Header/Footer UI
function loadUIBars() {
  const topBar = document.getElementById("top-bar");
  const bottomBar = document.getElementById("bottom-nav");

  topBar.className = "fixed-top-bar";
  bottomBar.className = "fixed-bottom-nav";

  topBar.innerHTML = `
    <div><strong>🏏 Team Lineup</strong></div>
    <div style="font-size: 13px;">TheCricketBoss</div>
  `;

  bottomBar.innerHTML = `
    <a href="team.html">🏏</a>
    <a href="scout.html">🔍</a>
    <a href="home.html">🏠</a>
    <a href="auction.html">⚒️</a>
    <a href="store.html">🛒</a>
  `;
}
