import { generateRandomName } from './data/region-names.js';

function generatePlayer(role, region, skillLabel) {
  const name = generateRandomName(region);

  let age_years;
  switch (skillLabel) {
    case "Newbie": age_years = 16; break;
    case "Trainee": age_years = 17; break;
    case "National": age_years = 30; break;
    default: age_years = 18 + Math.floor(Math.random() * 12); break;
  }

  return {
    name,
    role,
    skillLabel,
    age_years,
    age_days: 0,
    batting: Math.floor(Math.random() * 21) + 10,
    bowling: Math.floor(Math.random() * 21) + 10,
    fitness: 100, // Stays at 100 until age > 30y 0d
    experience: 0, // Initial EXP
    form: "Average" // Default, updated on Sunday
  };
}

export function generateSquad(region) {
  const squad = [];

  squad.push(generatePlayer("Wicket Keeper", region, "Newbie"));
  squad.push(generatePlayer("All-Rounder", region, "Trainee"));
  squad.push(generatePlayer("Batsman", region, "National"));
  squad.push(generatePlayer("Bowler", region, "National"));

  const roles = ["Batsman", "Batsman", "Bowler", "Bowler", "Batsman", "Bowler", "Batsman", "Bowler"];
  for (const role of roles) {
    squad.push(generatePlayer(role, region, "Trainee or National"));
  }

  return squad;
}
