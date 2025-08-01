export function calculateMarketPrice(player) {
  const { batting, bowling, keeping = 0, experience = 0, form, skill_level = "Newbie", role, age_years } = player;

  // 1. Base from total skill
  const skillTotal = batting + bowling + keeping + (experience * 0.5);
  let price = skillTotal * 10000;

  // 2. Form multiplier
  const formMultiplier = {
    "Poor": 0.8,
    "Average": 1.0,
    "Good": 1.2,
    "Excellent": 1.5
  };
  price *= formMultiplier[form] || 1;

  // 3. Skill level boost
  const skillLevelBonus = {
    "Newbie": 1.0,
    "Trainee": 1.2,
    "Domestic": 1.5,
    "National": 2.0,
    "Professional": 3.0,
    "Master": 4.0,
    "Supreme": 5.0,
    "World Class": 6.5,
    "Ultimate": 8.0,
    "Titan": 10.0,
    "The Boss": 12.5
  };
  price *= skillLevelBonus[skill_level] || 1;

  // 4. Age discount (younger = higher price)
  if (age_years <= 20) price *= 1.2;
  else if (age_years <= 24) price *= 1.1;
  else if (age_years >= 30) price *= 0.8;
  else if (age_years >= 34) price *= 0.6;

  // 5. Role bonus (e.g., All-Rounders, Keepers slightly higher)
  if (role === "All-Rounder") price *= 1.15;
  if (role === "Wicket Keeper") price *= 1.1;

  // 6. Add ticket sales impact for higher skilled players
  if (price > 40000000) price += 10000000; // +10L
  if (price > 50000000) price += 15000000; // +15L
  if (price > 60000000) price += 25000000; // +25L

  return Math.round(price);
}
