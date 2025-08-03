import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./js/data/region-names.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// 📅 Check if today is Wednesday
const today = new Date().toISOString().split("T")[0];
const isWednesday = new Date().getDay() === 3;
if (!isWednesday) {
  alert("Scouting is only available on Wednesdays.");
  window.location.href = "home.html";
}

// 🔐 Auth
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  alert("Not logged in.");
  window.location.href = "index.html";
}

// 🔍 Fetch user region, team ID, last_scouted_at
const { data: profile, error: profileErr } = await supabase
  .from("profiles")
  .select("region, last_scouted_at")
  .eq("id", user.id)
  .single();

if (profileErr || !profile) {
  alert("Failed to fetch profile");
  return;
}

if (profile.last_scouted_at === today) {
  alert("You have already scouted a player today.");
  window.location.href = "home.html";
}

const { data: team, error: teamErr } = await supabase
  .from("teams")
  .select("id")
  .eq("owner_id", user.id)
  .single();

if (teamErr || !team) {
  alert("Team not found");
  return;
}

// 🎯 Age Distribution
const agePool = [
  ...Array(15).fill(16),
  ...Array(30).fill(17),
  ...Array(35).fill(18),
  ...Array(15).fill(19),
  ...Array(5).fill(20)
];
const age_years = agePool[Math.floor(Math.random() * agePool.length)];
const age_days = Math.floor(Math.random() * 63);

// 🏏 Assign Role and Role-Based Skills
const roles = ["Batsman", "Bowler", "Wicket Keeper", "All-Rounder"];
const role = roles[Math.floor(Math.random() * roles.length)];

let batting = 0, bowling = 0, keeping = 0;

switch (role) {
  case "Batsman":
    batting = Math.floor(Math.random() * 6) + 10;  // 10–15
    bowling = Math.floor(Math.random() * 6);       // 0–5
    break;
  case "Bowler":
    bowling = Math.floor(Math.random() * 6) + 10;  // 10–15
    batting = Math.floor(Math.random() * 6);       // 0–5
    break;
  case "Wicket Keeper":
    batting = Math.floor(Math.random() * 6) + 8;   // 8–13
    keeping = Math.floor(Math.random() * 6) + 10;  // 10–15
    break;
  case "All-Rounder":
    batting = Math.floor(Math.random() * 6) + 7;   // 7–12
    bowling = Math.floor(Math.random() * 6) + 7;   // 7–12
    break;
}

const fitness = Math.floor(Math.random() * 21) + 80; // 80–100
const experience = 0;

// 🎓 Determine skill level
function determineSkillLevel(bat, bowl, keep) {
  const avg = (bat + bowl + keep) / 3;
  if (avg < 10) return "Newbie";
  return "Trainee";
}

const skill_level = determineSkillLevel(batting, bowling, keeping);

// 🧠 Salary
function calculateSalary(player) {
  const baseSkill = player.batting + player.bowling + player.fitness;
  const ageFactor = 1 + ((player.age_years - 16) * 0.05);
  const experienceFactor = 1 + (player.experience || 0) / 100;
  const specialSkillBonus = (player.skills?.length || 0) * 0.1;
  return Math.floor(baseSkill * ageFactor * experienceFactor * (1 + specialSkillBonus) * 1000);
}

// 🛒 Market Price
function calculateMarketPrice(player) {
  const skillTotal = player.batting + player.bowling + player.keeping + (player.experience * 0.5);
  let price = skillTotal * 10000;

  const formMultiplier = {
    "Poor": 0.8, "Average": 1.0, "Good": 1.2, "Excellent": 1.5
  };
  price *= formMultiplier[player.form] || 1;

  const skillLevelBonus = {
    "Newbie": 1.0, "Trainee": 1.2, "Domestic": 1.5
  };
  price *= skillLevelBonus[player.skill_level] || 1;

  if (player.age_years <= 20) price *= 1.2;
  if (player.role === "All-Rounder") price *= 1.15;
  if (player.role === "Wicket Keeper") price *= 1.1;

  return Math.round(price);
}

// 🎨 Role Image
function getRoleImage(role) {
  const base = "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/players/";
  const map = {
    "Batsman": "batsman.png",
    "Bowler": "bowler.png",
    "Wicket Keeper": "wicketkeeper.png",
    "All-Rounder": "allrounder.png"
  };
  return base + (map[role] || "default.png");
}

// 👤 Name from Region
const regionNames = regionNameData[profile.region] || [];
const name = regionNames[Math.floor(Math.random() * regionNames.length)] || "Unnamed";

// 👨‍💻 New Player Object
const newPlayer = {
  team_id: team.id,
  name,
  region: profile.region,
  batting,
  bowling,
  keeping,
  fitness,
  age_years,
  age_days,
  role,
  experience,
  form: "Good",
  skill_level,
  skills: [],
  salary: 0,
  market_price: 0,
  image_url: getRoleImage(role)
};

newPlayer.salary = calculateSalary(newPlayer);
newPlayer.market_price = calculateMarketPrice(newPlayer);

// 💾 Insert into DB
const { error: insertErr } = await supabase.from("players").insert(newPlayer);
if (insertErr) {
  alert("❌ Failed to insert player: " + insertErr.message);
  return;
}

// ✅ Update profile to record scouting
await supabase
  .from("profiles")
  .update({ last_scouted_at: today })
  .eq("id", user.id);

alert("✅ New player scouted!");
window.location.href = "team.html";
