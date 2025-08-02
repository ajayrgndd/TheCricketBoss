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
  // Prevent duplicate generation
  const { data: existing } = await supabase.from("players").select("id").eq("team_id", teamId);
  if (existing?.length > 0) {
    console.warn("⚠️ Squad already exists. Skipping generation.");
    return existing;
  }

  // Get team info
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
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const roleCounts = { Batsman: 5, Bowler: 5, "All-Rounder": 1, "Wicket Keeper": 1 };
  const squad = [];

  const availableRegions = Object.keys(regionNameData);

  for (const role of roles) {
    for (let i = 0; i < roleCounts[role]; i++) {
      // Role-Based Skills
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

      const age_years = Math.floor(Math.random() * 5) + 16;
      const age_days = Math.floor(Math.random() * 63);
      const fitness = age_years > 30 ? 95 : 100;

      // Unique Name
      let name = "Unnamed", playerRegion = region || "Unknown";
      for (let t = 0; t < 10; t++) {
        const r = availableRegions[Math.floor(Math.random() * availableRegions.length)];
        const names = regionNameData[r];
        const candidate = names[Math.floor(Math.random() * names.length)];
        if (!usedNames.has(candidate)) {
          usedNames.add(candidate);
          name = candidate;
          if (!region) playerRegion = r;
          break;
        }
      }

      const form = "Average";
      const experience = 0;
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
        form,
        experience,
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

  // Save Players
  const { error: insertErr } = await supabase.from("players").insert(squad);
  if (insertErr) {
    console.error("❌ Failed to insert squad:", insertErr.message);
  } else {
    console.log("✅ Squad inserted successfully");
  }

  // Create Stadium if not exists
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

// 👤 Assign bot team to a real user and regenerate squad
export async function assignBotTeamToUser(userId) {
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("manager_name, region")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    console.error("❌ Failed to fetch profile:", profileErr?.message);
    return;
  }

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id")
    .eq("type", "bot")
    .is("owner_id", null)
    .limit(1)
    .single();

  if (teamErr || !team) {
    console.error("❌ No free bot teams:", teamErr?.message);
    return;
  }

  const teamId = team.id;

  // Delete existing bot players
  await supabase.from("players").delete().eq("team_id", teamId);

  // Assign team to user
  const { error: updateErr } = await supabase
    .from("teams")
    .update({
      type: "user",
      owner_id: userId,
      manager_name: profile.manager_name,
      region: profile.region
    })
    .eq("id", teamId);

  if (updateErr) {
    console.error("❌ Failed to assign team:", updateErr.message);
    return;
  }

  // Generate squad
  await generateSquad(teamId);

  console.log("✅ Bot team assigned and new squad generated for user:", userId);
}
