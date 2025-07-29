import { regionNameData } from "./js/data/region-names.js";

// Salary Calculator 💰
function calculateSalary(player) {
  const baseSkill = player.batting + player.bowling + player.fitness;
  const ageFactor = 1 + ((player.age_years - 16) * 0.05);
  const experienceFactor = 1 + (player.experience || 0) / 100;
  const specialSkillBonus = (player.skills?.length || 0) * 0.1;

  return Math.floor(baseSkill * ageFactor * experienceFactor * (1 + specialSkillBonus) * 1000);
}

// Generate squad of 12 players based on region
export function generateSquad(region) {
  const names = regionNameData[region] || [];

  const squad = [];
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const roleCounts = { Batsman: 5, Bowler: 5, "All-Rounder": 1, "Wicket Keeper": 1 };

  for (const role of roles) {
    for (let i = 0; i < roleCounts[role]; i++) {
      const batting = Math.floor(Math.random() * 11) + 5;
      const bowling = Math.floor(Math.random() * 11) + 5;
      const fitness = Math.floor(Math.random() * 21) + 80;
      const age_years = Math.floor(Math.random() * 5) + 16;
      const age_days = Math.floor(Math.random() * 63);
      const name = names[Math.floor(Math.random() * names.length)];
      const experience = 0;

      const player = {
        name,
        role,
        batting,
        bowling,
        fitness,
        form: "Average",
        experience,
        skill_level: "Newbie",
        age_years,
        age_days,
        salary: 0
      };

      player.salary = calculateSalary(player);
      squad.push(player);
    }
  }

  return squad;
}
