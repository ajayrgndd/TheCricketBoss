import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./data/region-names.js";

// Supabase client
const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// Salary Calculator 💰
function calculateSalary(player) {
  const baseSkill = player.batting + player.bowling + player.fitness;
  const ageFactor = 1 + ((player.age_years - 16) * 0.05);
  const experienceFactor = 1 + (player.experience || 0) / 100;
  const specialSkillBonus = (player.skills?.length || 0) * 0.1;

  return Math.floor(baseSkill * ageFactor * experienceFactor * (1 + specialSkillBonus) * 1000);
}

// Market Price Calculator 💸
function calculateMarketPrice(player) {
  const { batting, bowling, keeping = 0, experience = 0, form, skill_level = "Newbie", role, age_years } = player;

  const skillTotal = batting + bowling + keeping + (experience * 0.5);
  let price = skillTotal * 10000;

  const formMultiplier = {
    "Poor": 0.8,
    "Average": 1.0,
    "Good": 1.2,
    "Excellent": 1.5
  };
  price *= formMultiplier[form] || 1;

  const skillLevelBonus = {
    "Newbie": 1.0,
    "Trainee": 1.2,
    "Domestic": 1.5,
    "National": 2.0,
    "Professional": 3.0,
    "Master": 4.0,
    "Supreme": 5.0,
    "World Class": 6.5,
    "Ultimate": 8.0,
    "Titan": 10.0,
    "The Boss": 12.5
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

// Role-based image
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

// Skill level assignment
function determineSkillLevel(batting, bowling, keeping) {
  const avg = (batting + bowling + keeping) / 3;
  if (avg < 10) return "Newbie";
  if (avg < 20) return "Trainee";
  return "Domestic";
}

// ✅ Squad Generator (checks first, inserts only once)
export async function generateSquad(teamId) {
  // 🧠 Check if players already exist for this team
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("team_id", teamId);

  if (existing.length > 0) {
    console.warn("⚠️ Squad already exists. Skipping generation.");
    return existing;
  }

  const squad = [];
  const usedNames = new Set();
  const availableRegions = Object.keys(regionNameData);
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const roleCounts = { Batsman: 5, Bowler: 5, "All-Rounder": 1, "Wicket Keeper": 1 };

  for (const role of roles) {
    for (let i = 0; i < roleCounts[role]; i++) {
      // Attributes
      const batting = Math.floor(Math.random() * 11) + 5;
      const bowling = Math.floor(Math.random() * 11) + 5;
      const fitness = Math.floor(Math.random() * 21) + 80;
      const age_years = Math.floor(Math.random() * 5) + 16;
      const age_days = Math.floor(Math.random() * 63);
      const keeping = (role === "Wicket Keeper") ? Math.floor(Math.random() * 11) + 5 : 0;

      // Unique name & region
      let name = "Unnamed";
      let region = "Unknown";
      let found = false;

      for (let t = 0; t < 10; t++) {
        const r = availableRegions[Math.floor(Math.random() * availableRegions.length)];
        const names = regionNameData[r];
        const candidate = names[Math.floor(Math.random() * names.length)];
        if (!usedNames.has(candidate)) {
          usedNames.add(candidate);
          name = candidate;
          region = r;
          found = true;
          break;
        }
      }
      if (!found) {
        const fallbackRegion = availableRegions[Math.floor(Math.random() * availableRegions.length)];
        const fallbackNames = regionNameData[fallbackRegion];
        name = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
        region = fallbackRegion;
      }

      // Skill level
      const skill_level = determineSkillLevel(batting, bowling, keeping);

      const player = {
        team_id: teamId,
        name,
        region,
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
        market_price: 0
      };

      player.salary = calculateSalary(player);
      player.market_price = calculateMarketPrice(player);

      squad.push(player);
    }
  }

  const { error } = await supabase.from("players").insert(squad);
  if (error) {
    console.error("❌ Failed to insert squad:", error.message);
  } else {
    console.log("✅ Squad generated and inserted.");
  }

  return squad;
}
