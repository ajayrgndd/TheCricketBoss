import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./data/region-names.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE" // 🔒 Use anon/public key here
);

// UI Elements
const card = document.getElementById("player-card");
const img = document.getElementById("player-img");
const nameEl = document.getElementById("player-name");
const roleEl = document.getElementById("player-role");
const ageEl = document.getElementById("player-age");
const skillEl = document.getElementById("player-skill");

// ✅ Auth check
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  alert("Please login first.");
  location.href = "index.html";
}

// ✅ Profile check
const { data: profile, error: profileErr } = await supabase
  .from("profiles")
  .select("region, last_scouted_date")
  .eq("user_id", user.id)
  .single();

if (profileErr || !profile) {
  alert("Profile not found.");
  location.href = "index.html";
}

const today = new Date().toISOString().split("T")[0];
const todayDay = new Date().getDay(); // Sunday = 0

if (todayDay !== 0) {
  alert("Scouting only available on SUNDAY for testing.");
  location.href = "home.html";
}

if (profile.last_scouted_date === today) {
  alert("You've already scouted this week.");
  location.href = "team.html";
}

// ✅ Team fetch
const { data: team, error: teamErr } = await supabase
  .from("teams")
  .select("id, team_name, manager_name")
  .eq("owner_id", user.id)
  .single();

if (teamErr || !team) {
  alert("Team not found.");
  location.href = "index.html";
}

// ✅ Scout function
async function scoutPlayer() {
  // 🎯 Age & Role
  const agePool = [
    ...Array(15).fill(16),
    ...Array(30).fill(17),
    ...Array(35).fill(18),
    ...Array(15).fill(19),
    ...Array(5).fill(20)
  ];
  const age_years = agePool[Math.floor(Math.random() * agePool.length)];
  const age_days = Math.floor(Math.random() * 63);

  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const role = roles[Math.floor(Math.random() * roles.length)];

  // Skills by Role
  let batting = 0, bowling = 0, keeping = 0;
  const fitness = Math.floor(Math.random() * 21) + 80;

  switch (role) {
    case "Batsman":
      batting = Math.floor(Math.random() * 11) + 12;
      bowling = Math.floor(Math.random() * 6);
      break;
    case "Bowler":
      bowling = Math.floor(Math.random() * 11) + 12;
      batting = Math.floor(Math.random() * 6);
      break;
    case "All-Rounder":
      batting = Math.floor(Math.random() * 8) + 8;
      bowling = Math.floor(Math.random() * 8) + 8;
      break;
    case "Wicket Keeper":
      keeping = Math.floor(Math.random() * 11) + 10;
      batting = Math.floor(Math.random() * 6) + 6;
      break;
  }

  const experience = 0;
  const skill_level = "Newbie";

  const regionNames = regionNameData[profile.region] || [];
  const name = regionNames[Math.floor(Math.random() * regionNames.length)];

  // Salary & Market Price
  function calculateSalary(p) {
    const base = p.batting + p.bowling + p.fitness;
    return Math.floor(base * 1000);
  }

  function calculateMarketPrice(p) {
    const total = p.batting + p.bowling + p.keeping;
    return total * 10000;
  }

  // 🖼 Role image fix (lowercase, no spaces or hyphens)
  const image_url = `https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/players/${role.toLowerCase().replaceAll(" ", "").replaceAll("-", "")}.png`;

  const player = {
    team_id: team.id,
    team_name: team.team_name,
    manager_name: team.manager_name,
    name,
    role,
    region: profile.region,
    batting,
    bowling,
    keeping,
    fitness,
    age_years,
    age_days,
    form: "Good",
    experience,
    skill_level,
    skills: [],
    salary: 0,
    market_price: 0,
    image_url
  };

  player.salary = calculateSalary(player);
  player.market_price = calculateMarketPrice(player);

  // ➕ Insert player
  const { error: insertErr } = await supabase.from("players").insert(player);
  if (insertErr) {
    alert("❌ Failed to insert player.");
    console.log(insertErr);
    return;
  }

  // ✅ Update profile
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ last_scouted_date: today })
    .eq("user_id", user.id);

  if (updateErr) {
    alert("❌ Failed to update profile.");
    console.log(updateErr);
    return;
  }

  // 🎉 Show result
  img.src = image_url;
  nameEl.textContent = player.name;
  roleEl.textContent = `Role: ${role}`;
  ageEl.textContent = `Age: ${age_years}y ${age_days}d`;
  skillEl.textContent = `Skill: ${skill_level}`;
  card.style.display = "block";
}

// Call only ONCE after validations
await scoutPlayer();
