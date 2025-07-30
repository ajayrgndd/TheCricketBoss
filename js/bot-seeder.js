import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./js/data/region-names.js";

// Supabase client setup
const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1NzM4NCwiZXhwIjoyMDY5MDMzMzg0fQ.EtpYvjBs7yiTwreqsukK_I7BoK-UKZo3pF_odbzszmI" // 🛡️ Use service_role key
);

// Utilities
const totalBots = 900;
const namePools = Object.values(regionNameData).flat();
const randomName = () => namePools[Math.floor(Math.random() * namePools.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomForm = () => {
  const pool = [
    ...Array(20).fill("Poor"),
    ...Array(40).fill("Average"),
    ...Array(30).fill("Good"),
    ...Array(10).fill("Excellent")
  ];
  return pool[Math.floor(Math.random() * pool.length)];
};

// Salary Calculation
function calculateSalary(player) {
  const baseSkill = player.batting + player.bowling + player.fitness;
  const ageFactor = 1 + ((player.age_years - 16) * 0.05);
  const experienceFactor = 1 + (player.experience || 0) / 100;
  const specialSkillBonus = (player.skills?.length || 0) * 0.1;

  return Math.floor(baseSkill * ageFactor * experienceFactor * (1 + specialSkillBonus) * 1000);
}

// Pick a random league
async function getRandomLeagueId() {
  const { data: leagues } = await supabase.from("leagues").select("id");
  if (!leagues || leagues.length === 0) throw new Error("No leagues found");
  const random = Math.floor(Math.random() * leagues.length);
  return leagues[random].id;
}

// Main Seeder
for (let i = 1; i <= totalBots; i++) {
  const teamName = `BotTeam${i}`;

  // Check if already exists
  const { data: exists } = await supabase
    .from("teams")
    .select("id")
    .eq("team_name", teamName)
    .maybeSingle();

  if (exists) {
    console.log(`⚠️ ${teamName} already exists. Skipping...`);
    continue;
  }

  // Assign league
  const league_id = await getRandomLeagueId();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert([{ team_name: teamName, type: "bot", owner_id: null, league_id }])
    .select()
    .single();

  if (teamError) {
    console.error(`❌ Team Error for ${teamName}:`, teamError.message);
    continue;
  }

  const players = [];

  const roles = [
    { role: "Wicket Keeper", count: 1 },
    { role: "All-Rounder", count: 1 },
    { role: "Bowler", count: 5 },
    { role: "Batsman", count: 5 }
  ];

  for (const { role, count } of roles) {
    for (let j = 0; j < count; j++) {
      const batting = randomInt(5, 20);
      const bowling = randomInt(5, 20);
      const keeping = role === "Wicket Keeper" ? randomInt(5, 20) : 0;
      const skillAvg = (batting + bowling + keeping) / 3;
      const skill_level =
        skillAvg <= 10 ? "Newbie" :
        skillAvg <= 20 ? "Trainee" : "Domestic";

      const age_years = randomInt(18, 34);
      const age_days = randomInt(0, 62);
      const fitness = age_years >= 30 ? randomInt(70, 95) : 100;
      const experience = randomInt(20, 80);
      const form = randomForm();
      const name = randomName();

      const player = {
        team_id: team.id,
        name,
        role,
        batting,
        bowling,
        keeping,
        skill_level,
        age_years,
        age_days,
        fitness,
        experience,
        form,
        skills: [], // Empty skills array
      };

      player.salary = calculateSalary(player);
      players.push(player);
    }
  }

  const { error: playerError } = await supabase.from("players").insert(players);
  if (playerError) {
    console.error(`❌ Player Insert Error for ${teamName}:`, playerError.message);
  } else {
    console.log(`✅ Seeded ${teamName} with 12 players`);
  }
}
