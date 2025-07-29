import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { regionNameData } from "./js/data/region-names.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "YOUR_PUBLIC_ANON_KEY"
);

// Salary function 💰
function calculateSalary(player) {
  const baseSkill = player.batting + player.bowling + player.fitness;
  const ageFactor = 1 + ((player.age_years - 16) * 0.05);
  const experienceFactor = 1 + (player.experience || 0) / 100;
  const specialSkillBonus = (player.skills?.length || 0) * 0.1;

  return Math.floor(baseSkill * ageFactor * experienceFactor * (1 + specialSkillBonus) * 1000);
}

// Get user
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  alert("Not logged in");
  location.href = "index.html";
}

const { data: profile } = await supabase
  .from("profiles")
  .select("region")
  .eq("id", user.id)
  .single();

const { data: team } = await supabase
  .from("teams")
  .select("id")
  .eq("owner_id", user.id)
  .single();

const today = new Date().toISOString().split("T")[0];
const scoutDay = new Date().getDay() === 3; // Wednesday = 3
if (!scoutDay) {
  alert("Scouting only available on Wednesdays");
  location.href = "home.html";
}

// Age Distribution 🎯
const agePool = [
  ...Array(15).fill(16),
  ...Array(30).fill(17),
  ...Array(35).fill(18),
  ...Array(15).fill(19),
  ...Array(5).fill(20)
];
const age_years = agePool[Math.floor(Math.random() * agePool.length)];
const age_days = Math.floor(Math.random() * 63);

// Skill level: Newbie to Trainee only
const batting = Math.floor(Math.random() * 11) + 5;
const bowling = Math.floor(Math.random() * 11) + 5;
const fitness = Math.floor(Math.random() * 21) + 80;
const experience = 0;

const regionNames = regionNameData[profile.region] || [];
const name = regionNames[Math.floor(Math.random() * regionNames.length)];

const newPlayer = {
  team_id: team.id,
  name,
  batting,
  bowling,
  fitness,
  role: "Batsman", // You can adjust logic here
  age_years,
  age_days,
  form: "Good",
  experience,
  skill_level: "Newbie",
  salary: 0 // placeholder, set below
};

newPlayer.salary = calculateSalary(newPlayer);

const { error } = await supabase.from("players").insert(newPlayer);
if (error) {
  alert("Failed to scout player");
} else {
  alert("New player scouted!");
  location.href = "team.html";
}
