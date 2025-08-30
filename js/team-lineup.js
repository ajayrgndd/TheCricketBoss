import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/+esm";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

let currentLineup = [];
let currentBowlers = [];
let overAssignments = new Array(20).fill(null);
let locked = false;
let userId, teamId;
let savedLineup = null;

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return (location.href = "login.html");
  userId = user.id;

  const profile = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  const profileData = profile.data;
  document.getElementById("top-username").innerText = `👤 ${profileData.manager_name}`;
  document.getElementById("top-xp").innerText = `⭐ ${profileData.xp || 0} XP`;
  document.getElementById("top-coins").innerText = `🪙 ${profileData.coins || 0}`;
  document.getElementById("top-cash").innerText = `💵 ${profileData.cash || 0}`;

  const team = await supabase.from("teams").select("*").eq("owner_id", userId).single();
  teamId = team.data.id;

  // ✅ Disable lineup if match running
  if (await checkRunningMatch(teamId)) {
    locked = true;
    document.getElementById("lineup-status").innerText = "🔒 Match running – lineup locked";
  }

  const players = await supabase.from("players").select("*").eq("team_id", teamId).then(r => r.data || []);
  savedLineup = await supabase.from("lineups").select("*").eq("team_id", teamId).maybeSingle().then(r => r.data || null);

  const now = new Date();
  const lockTime = new Date();
  lockTime.setHours(20, 0, 0, 0); // 8 PM IST
  if (now >= lockTime) locked = true;

  renderLineup(players, savedLineup);
  setupSave();
  setupReset(players);
  setupCountdown(lockTime);
  setupDragAndDrop();
});

// ✅ Check running matches
async function checkRunningMatch(teamId) {
  // Check friendly matches
  const { data: running1, error: err1 } = await supabase.from("matches")
    .select("id")
    .or(`and(status.eq.running,home_team_id.eq.${teamId}),and(status.eq.running,away_team_id.eq.${teamId})`)
    .limit(1);

  if (err1) {
    console.error("Error checking matches:", err1.message);
  }

  // Check league fixtures
  const { data: running2, error: err2 } = await supabase.from("fixtures")
    .select("id")
    .or(`and(status.eq.running,home_team_id.eq.${teamId}),and(status.eq.running,away_team_id.eq.${teamId})`)
    .limit(1);

  if (err2) {
    console.error("Error checking fixtures:", err2.message);
  }

  return (running1 && running1.length > 0) || (running2 && running2.length > 0);
}

// 🧠 Lineup Rendering
function renderLineup(players, lineup) {
  const xi = lineup?.playing_xi || players.slice(0, 11).map(p => p.id);
  const idMap = Object.fromEntries(players.map(p => [p.id, p]));
  currentLineup = xi.map(id => idMap[id]).filter(Boolean);
  const bench = players.filter(p => !xi.includes(p.id));
  currentBowlers = currentLineup.filter(p => p.bowling >= 6);

  const xiList = document.getElementById("playing11-list");
  xiList.innerHTML = "";
  currentLineup.forEach(p => xiList.append(makePlayerCard(p)));

  const benchList = document.getElementById("bench-list");
  benchList.innerHTML = "";
  bench.forEach(p => benchList.append(makePlayerCard(p)));

  overAssignments = lineup?.bowling_order || new Array(20).fill(null);

  renderCaptainPicker(lineup?.captain);
  renderKeeperPicker(lineup?.keeper);
  renderTossPicker(lineup?.toss_decision);
  renderBowlingLineup();
}

// 📛 Player Card with Skill Icons
function makePlayerCard(p) {
  const div = document.createElement("div");
  div.className = "player-card compact";
  div.dataset.playerId = p.id;
  div.dataset.name = p.name;
  div.dataset.role = p.role;
  div.dataset.bowling = p.bowling;

  const bowStyle = (p.bowling_style || "RH-Med").split(" ").map(s => s[0]).join("");

  div.innerHTML = `
    <div class="player-header">
      <strong>${p.name}</strong>
      <div>${p.role} (${bowStyle})</div>
      <div>
        <img src="assets/rating/bat.png" height="14"> ${p.batting}
        <img src="assets/rating/ball.png" height="14"> ${p.bowling}
        <img src="assets/rating/wk.png" height="14"> ${p.keeping}
      </div>
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

// 🔁 Drag & Drop
function setupDragAndDrop() {
  const xi = document.getElementById("playing11-list");
  const bench = document.getElementById("bench-list");

  new Sortable(xi, {
    group: "players",
    animation: 150,
    onAdd: (evt) => {
      if (xi.children.length > 11) {
        evt.from.appendChild(evt.item);
        alert("Only 11 players allowed in Playing XI.");
      } else {
        updateFromDOM();
      }
    },
    onSort: updateFromDOM,
    touchStartThreshold: 5
  });

  new Sortable(bench, {
    group: "players",
    animation: 150,
    onAdd: updateFromDOM,
    touchStartThreshold: 5
  });
}

function updateFromDOM() {
  const ids = [...document.querySelectorAll("#playing11-list .player-card")].map(card => card.dataset.playerId);
  const allCards = [...document.querySelectorAll(".player-card")];
  const idMap = {};
  allCards.forEach(card => {
    idMap[card.dataset.playerId] = {
      id: card.dataset.playerId,
      name: card.dataset.name,
      role: card.dataset.role,
      bowling: parseInt(card.dataset.bowling) || 0,
    };
  });

  currentLineup = ids.map(id => idMap[id]).filter(Boolean);
  currentBowlers = currentLineup.filter(p => p.bowling >= 6);
  renderCaptainPicker();
  renderKeeperPicker();
  renderTossPicker();
  renderBowlingLineup();
}

// 👑 Captain Picker
function renderCaptainPicker(savedId) {
  const container = document.getElementById("captain-picker");
  container.innerHTML = `<h3>Pick Captain</h3>`;
  currentLineup.forEach(p => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="radio" name="captain" value="${p.id}" ${savedId === p.id ? "checked" : ""}> ${p.name}`;
    container.appendChild(label);
  });
}

// 🧤 Wicket Keeper Picker
function renderKeeperPicker(savedId) {
  const container = document.getElementById("keeper-picker");
  container.innerHTML = `<h3>Pick Wicket Keeper</h3>`;
  currentLineup.forEach(p => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="radio" name="keeper" value="${p.id}" ${savedId === p.id ? "checked" : ""}> ${p.name}`;
    container.appendChild(label);
  });
}

// 🎲 Toss Picker
function renderTossPicker(saved) {
  const container = document.getElementById("toss-picker");
  container.innerHTML = `<h3>If Toss Wins</h3>
    <label><input type="radio" name="toss" value="bat" ${saved === "bat" ? "checked" : ""}> Bat First</label>
    <label><input type="radio" name="toss" value="bowl" ${saved === "bowl" ? "checked" : ""}> Bowl First</label>`;
}

// 🎯 Bowling Lineup
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

      let lastTap = 0;
      box.addEventListener("click", () => {
        const now = Date.now();
        if (now - lastTap < 300) {
          unassignOver(p.id);
        } else {
          assignOver(p.id);
        }
        lastTap = now;
      });

      row.appendChild(box);
    }
    container.appendChild(row);
  });

  updateOverBoxes();
}

function assignOver(bowlerId) {
  const count = overAssignments.filter(id => id === bowlerId).length;
  if (count >= 4) return alert("Max 4 overs per bowler.");
  const index = overAssignments.findIndex(v => v === null);
  if (index === -1) return alert("All 20 overs assigned.");
  if (index > 0 && overAssignments[index - 1] === bowlerId) return alert("No consecutive overs.");
  overAssignments[index] = bowlerId;
  updateOverBoxes();
}

function unassignOver(bowlerId) {
  const index = [...overAssignments]
    .map((id, i) => ({ id, i }))
    .reverse()
    .find(entry => entry.id === bowlerId)?.i;

  if (index !== undefined) {
    overAssignments[index] = null;
    updateOverBoxes();
  }
}

function updateOverBoxes() {
  document.querySelectorAll(".over-box").forEach(box => {
    box.classList.remove("filled");
    box.innerText = "";
  });

  const bowlerUsage = {};
  overAssignments.forEach((id, i) => {
    if (!id) return;
    if (!bowlerUsage[id]) bowlerUsage[id] = 0;
    const boxes = document.querySelectorAll(`.over-box[data-bowler-id="${id}"]`);
    const box = boxes[bowlerUsage[id]];
    if (box) {
      box.innerText = i + 1;
      box.classList.add("filled");
    }
    bowlerUsage[id]++;
  });

  document.getElementById("overs-count").innerText = `${overAssignments.filter(Boolean).length}/20 overs set`;
}

// 💾 Save
function setupSave() {
  document.getElementById("save-lineup-btn").onclick = async () => {
    if (locked) return alert("🔒 Lineup is locked.");
    if (overAssignments.filter(Boolean).length < 20) return alert("Assign all 20 overs.");
    const captainId = document.querySelector('input[name="captain"]:checked')?.value;
    const keeperId = document.querySelector('input[name="keeper"]:checked')?.value;
    const tossDecision = document.querySelector('input[name="toss"]:checked')?.value;
    if (!captainId) return alert("Pick a captain.");
    if (!keeperId) return alert("Pick a wicket keeper.");
    if (!tossDecision) return alert("Pick a toss decision.");

    const xiIds = [...document.querySelectorAll("#playing11-list .player-card")].map(c => c.dataset.playerId);

    const { error } = await supabase.from("lineups").upsert({
      team_id: teamId,
      playing_xi: xiIds,
      batting_order: xiIds,
      bowling_order: overAssignments,
      captain: captainId,
      keeper: keeperId,
      toss_decision: tossDecision,
      locked: false
    }, { onConflict: ['team_id'] });

    if (error) return alert("❌ Save failed: " + error.message);
    alert("✅ Lineup saved.");
  };
}

// ♻️ Reset
function setupReset(players) {
  document.getElementById("reset-lineup-btn").onclick = () => {
    if (locked) return alert("🔒 Lineup is locked.");
    overAssignments = new Array(20).fill(null);
    renderLineup(players, null);
  };
}

// 🔒 Countdown
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
