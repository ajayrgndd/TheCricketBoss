import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./data/region-names.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// 📊 Weighted Age Generator
function getWeightedRandomAge() {
  const ageBuckets = [
    { min: 18, max: 19, weight: 2 },
    { min: 20, max: 22, weight: 4 },
    { min: 23, max: 26, weight: 3 },
    { min: 27, max: 29, weight: 1 },
    { min: 30, max: 32, weight: 1 },
    { min: 33, max: 35, weight: 1 }
  ];

  const expanded = [];
  for (const bucket of ageBuckets) {
    for (let i = 0; i < bucket.weight; i++) {
      expanded.push(bucket);
    }
  }

  const selected = expanded[Math.floor(Math.random() * expanded.length)];
  return Math.floor(Math.random() * (selected.max - selected.min + 1)) + selected.min;
}

// 🧠 Salary & Market Price Calculators
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
  const roleMap = {
    "Batsman": "batsman.png",
    "Bowler": "bowler.png",
    "Wicket Keeper": "wicketkeeper.png",
    "All-Rounder": "allrounder.png"
  };
  return base + (roleMap[role] || "default.png");
}

function determineSkillLevel(batting, bowling, keeping) {
  const avg = (batting + bowling + keeping) / 3;
  if (avg < 10) return "Newbie";
  if (avg < 20) return "Trainee";
  return "Domestic";
}

// 🏏 Squad Generator
export async function generateSquad(teamId) {
  const { data: existing } = await supabase.from("players").select("id").eq("team_id", teamId);
  if (existing?.length > 0) {
    console.warn("⚠️ Squad already exists. Skipping generation.");
    return existing;
  }

  const { data: teamData, error: teamErr } = await supabase
    .from("teams")
    .select("team_name, owner_id, manager_name, region")
    .eq("id", teamId)
    .single();
  if (teamErr || !teamData) {
    console.error("❌ Failed to fetch team:", teamErr?.message);
    return;
  }

  const { team_name, owner_id, manager_name, region } = teamData;
  const usedNames = new Set();
  const squad = [];
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const roleCounts = { Batsman: 5, Bowler: 5, "All-Rounder": 1, "Wicket Keeper": 1 };
  const availableRegions = Object.keys(regionNameData);

  for (const role of roles) {
    for (let i = 0; i < roleCounts[role]; i++) {
      let batting = 0, bowling = 0, keeping = 0;
      switch (role) {
        case "Batsman":
          batting = Math.floor(Math.random() * 6) + 15;
          bowling = Math.floor(Math.random() * 6) + 5;
          break;
        case "Bowler":
          bowling = Math.floor(Math.random() * 6) + 15;
          batting = Math.floor(Math.random() * 6) + 5;
          break;
        case "All-Rounder":
          batting = Math.floor(Math.random() * 6) + 12;
          bowling = Math.floor(Math.random() * 6) + 12;
          break;
        case "Wicket Keeper":
          batting = Math.floor(Math.random() * 6) + 10;
          keeping = Math.floor(Math.random() * 6) + 12;
          bowling = Math.floor(Math.random() * 4);
          break;
      }

      const age_years = getWeightedRandomAge();
      const age_days = Math.floor(Math.random() * 63);
      const fitness = age_years > 30 ? 95 : 100;

      // ✅ Region now correctly matches the region of the name
      let name = "Unnamed";
      let playerRegion = region; // fallback
      for (let t = 0; t < 10; t++) {
        const r = availableRegions[Math.floor(Math.random() * availableRegions.length)];
        const names = regionNameData[r];
        const candidate = names[Math.floor(Math.random() * names.length)];
        if (!usedNames.has(candidate)) {
          usedNames.add(candidate);
          name = candidate;
          playerRegion = r; // ✅ Assign actual origin region
          break;
        }
      }

      const skill_level = determineSkillLevel(batting, bowling, keeping);
      const player = {
        team_id: teamId,
        name,
        region: playerRegion,
        role,
        batting,
        bowling,
        keeping,
        fitness,
        age_years,
        age_days,
        form: "Average",
        experience: 0,
        skill_level,
        skills: [],
        image_url: getRoleImage(role),
        salary: 0,
        market_price: 0,
        team_name,
        manager_name
      };

      player.salary = calculateSalary(player);
      player.market_price = calculateMarketPrice(player);
      squad.push(player);
    }
  }

  const { error: insertErr } = await supabase.from("players").insert(squad);
  if (insertErr) console.error("❌ Failed to insert squad:", insertErr.message);
  else console.log("✅ Squad inserted successfully");

  // 🧹 Delete old stadium if exists
  const { data: stadium } = await supabase
    .from("stadiums")
    .select("id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (stadium?.id) {
    const { error: deleteErr } = await supabase.from("stadiums").delete().eq("id", stadium.id);
    if (deleteErr) console.warn("⚠️ Failed to delete old stadium:", deleteErr.message);
    else console.log("🧹 Old stadium deleted");
  }

  // 🏟️ Create new stadium
  const { error: stadiumErr } = await supabase.from("stadiums").insert({
    team_id: teamId,
    name: `${team_name} Arena`,
    capacity: 5000,
    level: "Local"
  });

  if (stadiumErr) console.error("❌ Stadium insert failed:", stadiumErr.message);
  else console.log("🏟️ New stadium created");

  return squad;
}
