export function getExperienceLevel(exp) {
  if (exp <= 10) return "Newbie";
  if (exp <= 20) return "Trainee";
  if (exp <= 30) return "Domestic";
  if (exp <= 40) return "Professional";
  if (exp <= 50) return "National";
  if (exp <= 60) return "Supreme";
  if (exp <= 80) return "World Class";
  if (exp <= 100) return "Titan";
  return "The Boss";
}
