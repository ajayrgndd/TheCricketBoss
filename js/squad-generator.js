import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./data/region-names.js";
import { calculateWeeklySalary, calculateMarketValue } from "./utils/salary.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// 🎲 Random style generators
function getRandomBattingStyle() {
  return Math.random() < 0.5 ? "Right Hand Batter" : "Left Hand Batter";
}
function getRandomBowlingStyle() {
  const styles = ["Right Hand Seamer", "Left Hand Seamer", "Right Hand Spinner", "Left Hand Spinner"];
  return styles[Math.floor(Math.random() * styles.length)];
}

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

function determineSkillLevel(batting, bowling, keeping) {
  const avg = (batting + bowling + keeping) / 3;
  if (avg < 10) return "Newbie";
  if (avg < 20) return "Trainee";
  return "Domestic";
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

// 🏏 Squad Generator
export async function generateSquad(teamId) {
  const { data: existing } = await supabase.from("players").select("id").eq("team_id", teamId);
  if (existing?.length > 0) return existing;

  const { data: teamData } = await supabase
    .from("teams")
    .select("team_name, owner_id, manager_name, region")
    .eq("id", teamId)
    .single();

  const { team_name, manager_name, region } = teamData;
  const usedNames = new Set();
  const squad = [];
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const roleCounts = { Batsman: 5, Bowler: 5, "All-Rounder": 1, "Wicket Keeper": 1 };
  const availableRegions = Object.keys(regionNameData);

  for (const role of roles) {
    for (let i = 0; i < roleCounts[role]; i++) {
      let batting = 0, bowling = 0, keeping = 0;

      const age_years = getWeightedRandomAge();
      const age_days = Math.floor(Math.random() * 63);
      const fitness = age_years > 30 ? 95 : 100;

      const isOld = age_years >= 27;
      const highSkill = Math.floor(Math.random() * 20) + 31; // 31–50
      const lowSkill = Math.floor(Math.random() * 10) + 10; // 10–19

      switch (role) {
        case "Batsman":
          batting = isOld ? highSkill : Math.floor(Math.random() * 6) + 15;
          bowling = isOld ? lowSkill : Math.floor(Math.random() * 6) + 5;
          break;
        case "Bowler":
          bowling = isOld ? highSkill : Math.floor(Math.random() * 6) + 15;
          batting = isOld ? lowSkill : Math.floor(Math.random() * 6) + 5;
          break;
        case "All-Rounder":
          if (isOld) {
            if (Math.random() < 0.5) {
              batting = highSkill;
              bowling = Math.floor(Math.random() * 10) + 15;
            } else {
              bowling = highSkill;
              batting = Math.floor(Math.random() * 10) + 15;
            }
          } else {
            batting = Math.floor(Math.random() * 6) + 12;
            bowling = Math.floor(Math.random() * 6) + 12;
          }
          break;
        case "Wicket Keeper":
          keeping = isOld ? highSkill : Math.floor(Math.random() * 6) + 12;
          batting = isOld ? lowSkill : Math.floor(Math.random() * 6) + 10;
          bowling = isOld ? 0 : Math.floor(Math.random() * 4);
          break;
      }

      // 🧠 Unique name selection
      let name = "Unnamed";
      let playerRegion = region;
      for (let t = 0; t < 10; t++) {
        const r = availableRegions[Math.floor(Math.random() * availableRegions.length)];
        const names = regionNameData[r];
        const candidate = names[Math.floor(Math.random() * names.length)];
        if (!usedNames.has(candidate)) {
          usedNames.add(candidate);
          name = candidate;
          playerRegion = r;
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
        batting_style: getRandomBattingStyle(),
        bowling_style: getRandomBowlingStyle(),
        image_url: getRoleImage(role),
        salary: 0,
        market_price: 0,
        team_name,
        manager_name
      };

      player.salary = calculateWeeklySalary(player);
      player.market_price = calculateMarketValue(player);
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
    await supabase.from("stadiums").delete().eq("id", stadium.id);
  }

  await supabase.from("stadiums").insert({
    team_id: teamId,
    name: `${team_name} Arena`,
    capacity: 5000,
    level: "Local"
  });

  return squad;
}
