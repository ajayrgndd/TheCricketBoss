export function getAdjustedSkill(player, isPowerplay = false) {
  const base = (player.batting + player.bowling) / 2;

  const formBoost = {
    "Poor": -0.05,
    "Average": 0,
    "Good": 0.05,
    "Excellent": 0.10
  }[player.form] || 0;

  let fitnessPenalty = 0;
  if (player.age_years >= 30) {
    const loss = 100 - player.fitness;
    fitnessPenalty = loss * 0.01; // Each 1 point = 1%
  }

  let powerplayBoost = isPowerplay ? 0.10 : 0;

  const finalSkill = base * (1 + formBoost + powerplayBoost - fitnessPenalty);
  return Math.max(0, Math.round(finalSkill));
}
