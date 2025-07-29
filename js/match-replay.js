import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { loadSharedUI } from './shared-ui.js';

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE" // Your anon/public key
);

// Load user and profile
const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location.href = "index.html";

const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
loadSharedUI({
  manager_name: profile.manager_name,
  xp: profile.xp,
  coins: 15,
  cash: 300000
});

const container = document.getElementById("replayContainer");
const matchStatus = document.getElementById("matchStatus");
const replayBtn = document.getElementById("replayBtn");

// Load today’s match for user team
const today = new Date().toISOString().split("T")[0];
const { data: team } = await supabase.from("teams").select("id").eq("owner_id", user.id).single();
const { data: match } = await supabase
  .from("matches")
  .select("*")
  .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
  .eq("date", today)
  .single();

if (!match) {
  matchStatus.textContent = "No match found for today.";
  container.innerHTML = "<p>Check Fixtures for upcoming games.</p>";
  return;
}

matchStatus.textContent = match.status === "completed" ? "Match Completed" :
                          match.status === "ongoing" ? "Match In Progress..." :
                          "Match Scheduled at 9 PM IST";

if (match.status === "scheduled") {
  container.innerHTML = "<p>Match hasn't started yet.</p>";
  return;
}

// Fetch all events
let { data: events } = await supabase
  .from("match_events")
  .select("*")
  .eq("match_id", match.id)
  .order("inning, over, ball", { ascending: true });

if (!events?.length) {
  container.innerHTML = "<p>No events found.</p>";
  return;
}

let currentIndex = 0;

const renderNextBall = () => {
  if (currentIndex < events.length) {
    const e = events[currentIndex];
    const line = `[Inning ${e.inning}] Over ${e.over}.${e.ball}: ${e.commentary}`;
    const p = document.createElement("p");
    p.textContent = line;
    container.appendChild(p);
    container.scrollTop = container.scrollHeight;
    currentIndex++;
  } else {
    clearInterval(replayInterval);
    matchStatus.textContent = "🏁 Match Completed";
  }
};

// Handle live replay
let replayInterval;

if (match.status === "ongoing") {
  // Estimate current point using IST time
  const istNow = new Date(Date.now() + (5.5 * 3600 * 1000));
  const matchStart = new Date(today + "T15:30:00.000Z"); // 9 PM IST
  const elapsedMinutes = Math.floor((istNow - matchStart) / 60000);
  const approxBalls = Math.floor((elapsedMinutes / 30) * events.length);
  currentIndex = Math.min(approxBalls, events.length - 1);
  replayInterval = setInterval(renderNextBall, 2000); // 2 sec per ball
} else {
  // Completed: Show all + option to replay
  for (const e of events) {
    const p = document.createElement("p");
    p.textContent = `[Inning ${e.inning}] Over ${e.over}.${e.ball}: ${e.commentary}`;
    container.appendChild(p);
  }

  replayBtn.style.display = "block";
  replayBtn.onclick = () => {
    container.innerHTML = "";
    currentIndex = 0;
    replayInterval = setInterval(renderNextBall, 2000);
    replayBtn.style.display = "none";
    matchStatus.textContent = "🔁 Replaying Match...";
  };
}
