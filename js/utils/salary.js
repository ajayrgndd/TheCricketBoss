export function calculateWeeklySalary(player) {
  const marketValue = player.market_value || 100000; // fallback in case missing
  let salaryRate = 0.18; // base rate

  // Skill component (max of batting, bowling, keeping)
  const skill = Math.max(player.batting, player.bowling, player.keeping);
  if (skill >= 100) salaryRate += 0.10;
  else if (skill >= 90) salaryRate += 0.08;
  else if (skill >= 80) salaryRate += 0.06;
  else if (skill >= 70) salaryRate += 0.04;
  else if (skill >= 60) salaryRate += 0.03;
  else if (skill >= 50) salaryRate += 0.02;
  else if (skill >= 40) salaryRate += 0.01;

  // Experience component
  const exp = player.experience || 0;
  if (exp >= 100) salaryRate += 0.05;
  else if (exp >= 80) salaryRate += 0.04;
  else if (exp >= 60) salaryRate += 0.03;
  else if (exp >= 40) salaryRate += 0.02;
  else if (exp >= 20) salaryRate += 0.01;

  // Form adjustment
  const formMultiplierMap = {
    "Poor": 0.95,
    "Average": 1.0,
    "Good": 1.05,
    "Excellent": 1.1
  };
  const formMultiplier = formMultiplierMap[player.form] || 1.0;

  // Age adjustment (younger = slightly more expensive)
  const age = player.age_years || 25;
  let ageMultiplier = 1.0;
  if (age <= 20) ageMultiplier = 1.1;
  else if (age <= 25) ageMultiplier = 1.0;
  else if (age <= 30) ageMultiplier = 0.95;
  else ageMultiplier = 0.90;

  const weeklySalary = Math.round(
    marketValue * salaryRate * formMultiplier * ageMultiplier
  );

  return weeklySalary;
}
