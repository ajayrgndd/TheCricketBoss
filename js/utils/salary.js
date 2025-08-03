export function calculateWeeklySalary(player) {
  const base = 5000;

  const skill = Math.max(player.batting, player.bowling, player.keeping);

  let skillMultiplier = 1;
  if (skill >= 90) skillMultiplier = 10.0;
  else if (skill >= 80) skillMultiplier = 8.0;
  else if (skill >= 70) skillMultiplier = 6.0;
  else if (skill >= 60) skillMultiplier = 4.5;
  else if (skill >= 50) skillMultiplier = 3.0;
  else if (skill >= 40) skillMultiplier = 2.0;
  else if (skill >= 30) skillMultiplier = 1.5;
  else if (skill >= 20) skillMultiplier = 1.2;

  let expMultiplier = 1;
  if (player.experience >= 101) expMultiplier = 2.0;
  else if (player.experience >= 81) expMultiplier = 1.8;
  else if (player.experience >= 61) expMultiplier = 1.5;
  else if (player.experience >= 41) expMultiplier = 1.3;
  else if (player.experience >= 21) expMultiplier = 1.1;

  const formMultiplierMap = {
    "Poor": 0.9,
    "Average": 1.0,
    "Good": 1.1,
    "Excellent": 1.3
  };
  const formMultiplier = formMultiplierMap[player.form] || 1.0;

  const age = player.age_years;
  let ageFactor = 1;
  if (age <= 20) ageFactor = 1.2;
  else if (age <= 25) ageFactor = 1.0;
  else if (age <= 30) ageFactor = 0.8;
  else ageFactor = 0.6;

  return Math.round(base * skillMultiplier * expMultiplier * formMultiplier * ageFactor);
}

export function calculateMarketValue(player) {
  const baseValue = 10000;

  const skill = Math.max(player.batting, player.bowling, player.keeping);
  const total = skill + player.experience;

  return Math.round(baseValue * total);
}
