import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./data/region-names.js";
import { calculateWeeklySalary, calculateMarketValue } from "./utils/salary.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// UI elements
const btn = document.getElementById("scout-btn");
const countdown = document.getElementById("countdown");
const card = document.getElementById("player-card");
const nameEl = document.getElementById("player-name");
const roleEl = document.getElementById("player-role");
const ageEl = document.getElementById("player-age");
const skillEl = document.getElementById("player-skill");
const img = document.getElementById("player-img");

const bar = {
  batting: document.getElementById("bar-batting"),
  bowling: document.getElementById("bar-bowling"),
  keeping: document.getElementById("bar-keeping"),
  fitness: document.getElementById("bar-fitness"),
};

// Get server date from Supabase
const { data: nowData } = await supabase.rpc("get_server_date");
const serverDate = new Date(nowData);
const serverDateStr = serverDate.toISOString().split("T")[0];
const serverDay = serverDate.getUTCDay(); // Sunday = 0

const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  alert("Please login.");
  location.href = "index.html";
}

const { data: profile } = await supabase
  .from("profiles")
  .select("region, last_scouted_date, team_id, team_name, manager_name")
  .eq("user_id", user.id)
  .single();

if (!profile?.team_id) {
  alert("Team ID missing. Please complete profile setup.");
  location.href = "profile-setup.html";
}


// ✅ Only allow scouting on Sunday (change to 3 for Wednesday if needed)
if (serverDay !== 3) {
  btn.disabled = true;
  btn.textContent = "Scouting locked until next Wednesday";
}

if (profile?.last_scouted_date) {
  const lastDate = new Date(profile.last_scouted_date);
  const daysSince = Math.floor((serverDate - lastDate) / (1000 * 60 * 60 * 24));
  if (daysSince < 7) {
    btn.disabled = true;
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 7);
    countdown.textContent = `Next scout available on ${next.toDateString()}`;
  }
}

btn.onclick = async () => {
  btn.disabled = true;

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

  let batting = 0, bowling = 0, keeping = 0;
  const fitness = 100; // ✅ Fixed fitness

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

  // ✅ Batting & Bowling Style Assignment
  const battingStyles = ["Right Hand Batter", "Left Hand Batter"];
  const bowlingStyles = [
    "Right Hand Seamer",
    "Left Hand Seamer",
    "Right Hand Spinner",
    "Left Hand Spinner"
  ];

  const batting_style = battingStyles[Math.floor(Math.random() * battingStyles.length)];
  const bowling_style = bowlingStyles[Math.floor(Math.random() * bowlingStyles.length)];

  const regionNames = regionNameData[profile.region] || ["Unknown"];
  const name = regionNames[Math.floor(Math.random() * regionNames.length)];

  const basePlayer = {
   team_id: profile.team_id,
team_name: profile.team_name,
manager_name: profile.manager_name,
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
    experience: 0,
    skill_level: "Newbie",
    skills: [],
    batting_style,
    bowling_style,
    image_url: `https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/players/${role.toLowerCase().replaceAll(" ", "").replaceAll("-", "")}.png`
  };

  // ✅ Salary and Market Value from utils
  const salary = calculateWeeklySalary(basePlayer);
  const market_price = calculateMarketValue(basePlayer);

  const player = {
    ...basePlayer,
    salary,
    market_price
  };

  const { error: insertErr } = await supabase.from("players").insert(player);
  if (!insertErr) {
    await supabase
      .from("profiles")
      .update({ last_scouted_date: serverDateStr })
      .eq("user_id", user.id);

    // Show UI card
    nameEl.textContent = player.name;
    roleEl.textContent = `Role: ${role}`;
    ageEl.textContent = `Age: ${age_years}y ${age_days}d`;
    skillEl.textContent = `Skill: ${player.skill_level}`;
    img.src = player.image_url;

    bar.batting.style.width = `${batting * 5}%`;
    bar.bowling.style.width = `${bowling * 5}%`;
    bar.keeping.style.width = `${keeping * 5}%`;
    bar.fitness.style.width = `100%`;

    card.classList.add("reveal");
  } else {
    alert("❌ Failed to scout.");
    console.error(insertErr);
  }
};



