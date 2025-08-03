import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./js/data/region-names.js";

// 🔐 Supabase client
const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// 🧠 Market & Salary Functions
function calculateSalary(player) {
  const baseSkill = player.batting + player.bowling + player.fitness;
  const ageFactor = 1 + ((player.age_years - 16) * 0.05);
  const experienceFactor = 1 + (player.experience || 0) / 100;
  const specialSkillBonus = (player.skills?.length || 0) * 0.1;
  return Math.floor(baseSkill * ageFactor * experienceFactor * (1 + specialSkillBonus) * 1000);
}

function calculateMarketPrice(player) {
  const { batting, bowling, keeping = 0, experience = 0, form, skill_level = "Newbie", role, age_years } = player;
  const skillTotal = batting + bowling + keeping + (experience * 0.5);
  let price = skillTotal * 10000;

  const formMultiplier = {
    "Poor": 0.8, "Average": 1.0, "Good": 1.2, "Excellent": 1.5
  };
  price *= formMultiplier[form] || 1;

  const skillLevelBonus = {
    "Newbie": 1.0, "Trainee": 1.2, "Domestic": 1.5, "National": 2.0,
    "Professional": 3.0, "Master": 4.0, "Supreme": 5.0, "World Class": 6.5,
    "Ultimate": 8.0, "Titan": 10.0, "The Boss": 12.5
  };
  price *= skillLevelBonus[skill_level] || 1;

  if (age_years <= 20) price *= 1.2;
  else if (age_years <= 24) price *= 1.1;
  else if (age_years >= 30) price *= 0.8;
  else if (age_years >= 34) price *= 0.6;

  if (role === "All-Rounder") price *= 1.15;
  if (role === "Wicket Keeper") price *= 1.1;

  if (price > 40000000) price += 10000000;
  if (price > 50000000) price += 15000000;
  if (price > 60000000) price += 25000000;

  return Math.round(price);
}

function getRoleImage(role) {
  const base = "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/players/";
  const map = {
    "Batsman": "batsman.png",
    "Bowler": "bowler.png",
    "All-Rounder": "allrounder.png",
    "Wicket Keeper": "wicketkeeper.png"
  };
  return base + (map[role] || "default.png");
}

function determineSkillLevel(batting, bowling, keeping = 0) {
  const avg = (batting + bowling + keeping) / 3;
  if (avg < 10) return "Newbie";
  if (avg < 20) return "Trainee";
  return "Domestic";
}

// 🧠 Age Distribution
const agePool = [
  ...Array(15).fill(16),
  ...Array(30).fill(17),
  ...Array(35).fill(18),
  ...Array(15).fill(19),
  ...Array(5).fill(20)
];

// 🚀 Main Flow
(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Not logged in.");
    location.href = "index.html";
    return;
  }

  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];

  if (today.getDay() !== 0) {
    alert("Scouting only allowed on Wednesdays.");
    location.href = "home.html";
    return;
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("region, last_scouted")
    .eq("user_id", user.id)
    .single();

  if (profileErr || !profile) {
    alert("Profile fetch failed.");
    return;
  }

  if (profile.last_scouted === todayISO) {
    alert("You've already scouted a player today.");
    location.href = "home.html";
    return;
  }

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, team_name, manager_name")
    .eq("owner_id", user.id)
    .single();

  if (teamErr || !team) {
    alert("Team not found.");
    return;
  }

  const age_years = agePool[Math.floor(Math.random() * agePool.length)];
  const age_days = Math.floor(Math.random() * 63);

  // 🧠 Role assignment
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const role = roles[Math.floor(Math.random() * roles.length)];

  let batting = 0, bowling = 0, keeping = 0;
  switch (role) {
    case "Batsman":
      batting = Math.floor(Math.random() * 11) + 10;
      bowling = Math.floor(Math.random() * 6);
      break;
    case "Bowler":
      bowling = Math.floor(Math.random() * 11) + 10;
      batting = Math.floor(Math.random() * 6);
      break;
    case "All-Rounder":
      batting = Math.floor(Math.random() * 9) + 8;
      bowling = Math.floor(Math.random() * 9) + 8;
      break;
    case "Wicket Keeper":
      batting = Math.floor(Math.random() * 9) + 8;
      keeping = Math.floor(Math.random() * 9) + 10;
      break;
  }

  const fitness = Math.floor(Math.random() * 21) + 80;
  const experience = 0;
  const skill_level = determineSkillLevel(batting, bowling, keeping);

  const regionNames = regionNameData[profile.region] || ["Unnamed"];
  const name = regionNames[Math.floor(Math.random() * regionNames.length)];

  const player = {
    team_id: team.id,
    name,
    region: profile.region,
    batting,
    bowling,
    keeping,
    fitness,
    experience,
    form: "Good",
    role,
    skill_level,
    skills: [],
    image_url: getRoleImage(role),
    age_years,
    age_days,
    salary: 0,
    market_price: 0,
    team_name: team.team_name,
    manager_name: team.manager_name
  };

  player.salary = calculateSalary(player);
  player.market_price = calculateMarketPrice(player);

  const { error: insertErr } = await supabase.from("players").insert(player);
  if (insertErr) {
    alert("Scouting failed.");
    console.error(insertErr);
    return;
  }

  await supabase.from("profiles").update({ last_scouted: todayISO }).eq("id", user.id);

  // Populate to scout.html
  document.querySelector(".loader").style.display = "none";
  const card = document.getElementById("playerCard");
  card.style.display = "block";

  document.getElementById("playerImg").src = player.image_url;
  document.getElementById("playerName").textContent = player.name;
  document.getElementById("playerRole").textContent = `Role: ${role}`;
  document.getElementById("playerAge").textContent = `Age: ${age_years}y ${age_days}d`;
  document.getElementById("playerRegion").textContent = `Region: ${profile.region}`;
  document.getElementById("playerStats").textContent = `Bat: ${batting} | Bowl: ${bowling} | Fit: ${fitness}`;
  document.getElementById("playerSkill").textContent = `Skill Level: ${skill_level}`;
  document.getElementById("playerSalary").textContent = `Salary: ₹${player.salary.toLocaleString()}`;
  document.getElementById("playerPrice").textContent = `Market Price: ₹${player.market_price.toLocaleString()}`;
})();


