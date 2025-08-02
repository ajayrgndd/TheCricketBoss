import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./data/region-names.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// 🧠 Skill Calculators
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
    "Newbie": 1.0, "Trainee": 1.2, "Domestic": 1.5, "National": 2.0, "Professional": 3.0,
    "Master": 4.0, "Supreme": 5.0, "World Class": 6.5, "Ultimate": 8.0, "Titan": 10.0, "The Boss": 12.5
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

  // 🔍 Get team info
  const { data: teamData, error: teamErr } = await supabase
    .from("teams")
    .select("team_name, owner_id")
    .eq("id", teamId)
    .single();
  if (teamErr || !teamData) {
    console.error("❌ Failed to fetch team:", teamErr?.message);
    return;
  }

  const { team_name, owner_id } = teamData;

  // 🔍 Get manager name
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("manager_name")
    .eq("id", owner_id)
    .single();
  if (profileErr || !profile) {
    console.error("❌ Failed to fetch manager:", profileErr?.message);
    return;
  }

  const manager_name = profile.manager_name;
  const usedNames = new Set();
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const roleCounts = { Batsman: 5, Bowler: 5, "All-Rounder": 1, "Wicket Keeper": 1 };
  const squad = [];

  const availableRegions = Object.keys(regionNameData);

  for (const role of roles) {
    for (let i = 0; i < roleCounts[role]; i++) {
      // 🎯 Role-Based Skill Assignment
      let batting = 0, bowling = 0, keeping = 0;
      switch (role) {
        case "Batsman":
          batting = Math.floor(Math.random() * 6) + 15;   // 15–20
          bowling = Math.floor(Math.random() * 6) + 5;    // 5–10
          break;
        case "Bowler":
          bowling = Math.floor(Math.random() * 6) + 15;   // 15–20
          batting = Math.floor(Math.random() * 6) + 5;    // 5–10
          break;
        case "All-Rounder":
          batting = Math.floor(Math.random() * 6) + 12;   // 12–17
          bowling = Math.floor(Math.random() * 6) + 12;   // 12–17
          break;
        case "Wicket Keeper":
          batting = Math.floor(Math.random() * 6) + 10;   // 10–15
          keeping = Math.floor(Math.random() * 6) + 12;   // 12–17
          bowling = Math.floor(Math.random() * 4);        // 0–3
          break;
      }

      const fitness = age_years > 30 ? 95 : 100;
      const age_years = Math.floor(Math.random() * 5) + 16;
      const age_days = Math.floor(Math.random() * 63);

      // 🧬 Unique name & region
      let name = "Unnamed", region = "Unknown";
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
        market_price: 0,
        team_name,
        manager_name
      };

      player.salary = calculateSalary(player);
      player.market_price = calculateMarketPrice(player);
      squad.push(player);
    }
  }

  // 💾 Save players
  const { error: insertErr } = await supabase.from("players").insert(squad);
  if (insertErr) {
    console.error("❌ Failed to insert squad:", insertErr.message);
  } else {
    console.log("✅ Squad inserted successfully");
  }

  // 🏟️ Stadium insert
  const { data: stadiumExists } = await supabase
    .from("stadiums")
    .select("id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (!stadiumExists) {
    const { error: stadiumErr } = await supabase.from("stadiums").insert({
      team_id: teamId,
      name: `${team_name} Arena`,
      capacity: 5000,
      level: "Local"
    });
    if (stadiumErr) console.error("❌ Stadium insert failed:", stadiumErr.message);
    else console.log("🏟️ Stadium created");
  }

  return squad;
}

