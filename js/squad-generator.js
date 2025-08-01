import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./data/region-names.js";

// Supabase client
const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE" // Replace with real anon key
);

// Salary Calculator 💰
function calculateSalary(player) {
  const baseSkill = player.batting + player.bowling + player.fitness;
  const ageFactor = 1 + ((player.age_years - 16) * 0.05);
  const experienceFactor = 1 + (player.experience || 0) / 100;
  const specialSkillBonus = (player.skills?.length || 0) * 0.1;

  return Math.floor(baseSkill * ageFactor * experienceFactor * (1 + specialSkillBonus) * 1000);
}

// 🎯 Squad generator that directly inserts into Supabase
export async function generateSquad(teamId, region) {
  const names = regionNameData[region] || [];
if (names.length === 0) {
  console.warn("⚠️ No names found for region:", region);
  return;
}

  const squad = [];
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const roleCounts = { Batsman: 5, Bowler: 5, "All-Rounder": 1, "Wicket Keeper": 1 };

  for (const role of roles) {
    for (let i = 0; i < roleCounts[role]; i++) {
      const batting = Math.floor(Math.random() * 11) + 5;       // 5–15
      const bowling = Math.floor(Math.random() * 11) + 5;
      const fitness = Math.floor(Math.random() * 21) + 80;       // 80–100
      const age_years = Math.floor(Math.random() * 5) + 16;      // 16–20
      const age_days = Math.floor(Math.random() * 63);           // 0–62
      const name = names[Math.floor(Math.random() * names.length)];
      const experience = 0;

      const player = {
        team_id: teamId,
        name,
        role,
        batting,
        bowling,
        fitness,
        age_years,
        age_days,
        form: "Average",
        experience,
        skill_level: "Newbie",
        skills: [],
        salary: 0
      };

      player.salary = calculateSalary(player);
      squad.push(player);
    }
  }

  // 🧾 Insert all 12 players to Supabase
  const { error } = await supabase.from("players").insert(squad);
  if (error) {
    console.error("❌ Failed to insert squad:", error.message);
  } else {
    console.log("✅ Squad generated and saved.");
  }
}
