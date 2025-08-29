// js/utils/salary.js
// Smooth, per-point growth using piecewise-linear interpolation.
// Keeps your old anchors but removes cliffs, so +1 skill always increases value.

function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * Piecewise-linear interpolation.
 * pts: [{x: number, y: number}, ...] sorted by x ascending.
 */
function interp(x, pts) {
  if (!pts || pts.length === 0) return 1;
  const n = pts.length;
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[n - 1].x) return pts[n - 1].y;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return lerp(a.y, b.y, t);
    }
  }
  return pts[n - 1].y;
}

/**
 * Converts unknown/NaN to safe numbers.
 */
function toNum(v, def = 0) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : def;
}

/**
 * Weekly salary with smooth per-point growth.
 * Base stays at 5000, multipliers are per-point and calibrated to your old tiers.
 */
export function calculateWeeklySalary(player) {
  const base = 5000;

  const bat = toNum(player?.batting, 0);
  const bow = toNum(player?.bowling, 0);
  const kep = toNum(player?.keeping, 0);
  const skill = Math.max(bat, bow, kep);

  // Smooth skill multiplier through your anchors
  const skillMult = interp(skill, [
    { x: 0,   y: 1.00 },
    { x: 20,  y: 1.20 },
    { x: 30,  y: 1.50 },
    { x: 40,  y: 2.00 },
    { x: 50,  y: 3.00 },
    { x: 60,  y: 4.50 },
    { x: 70,  y: 6.00 },
    { x: 80,  y: 8.00 },
    { x: 90,  y: 10.00 },
    { x: 101, y: 11.00 } // small headroom above 90
  ]);

  const exp = clamp(toNum(player?.experience, 0), 0, 999);
  const expMult = interp(exp, [
    { x: 0,   y: 1.00 },
    { x: 21,  y: 1.10 },
    { x: 41,  y: 1.30 },
    { x: 61,  y: 1.50 },
    { x: 81,  y: 1.80 },
    { x: 101, y: 2.00 }
  ]);

  const formMultiplierMap = {
    "Poor": 0.9, "Average": 1.0, "Good": 1.1, "Excellent": 1.3
  };
  const formMult = formMultiplierMap[player?.form] || 1.0;

  const age = clamp(toNum(player?.age_years, 0), 15, 45);
  // Smoothly match your <=20 (1.2), <=25 (1.0), <=30 (0.8), >30 (0.6)
  const ageMult = interp(age, [
    { x: 16, y: 1.20 },
    { x: 20, y: 1.20 },
    { x: 25, y: 1.00 },
    { x: 30, y: 0.80 },
    { x: 35, y: 0.60 }
  ]);

  const salary = base * skillMult * expMult * formMult * ageMult;
  return Math.round(salary);
}

/**
 * Market value: scales per-point with skill & experience, moderated by form/age.
 * Stays compatible with your old magnitudes but now smooth.
 */
export function calculateMarketValue(player) {
  const baseValue = 10000;

  const bat = toNum(player?.batting, 0);
  const bow = toNum(player?.bowling, 0);
  const kep = toNum(player?.keeping, 0);
  const skill = Math.max(bat, bow, kep);

  const exp = clamp(toNum(player?.experience, 0), 0, 999);
  const formMultiplierMap = {
    "Poor": 0.95, "Average": 1.00, "Good": 1.05, "Excellent": 1.15
  };
  const formMult = formMultiplierMap[player?.form] || 1.0;

  const age = clamp(toNum(player?.age_years, 0), 15, 45);
  const ageMult = interp(age, [
    { x: 16, y: 1.00 },
    { x: 25, y: 1.00 },
    { x: 30, y: 0.95 },
    { x: 35, y: 0.85 }
  ]);

  // Per-point growth similar to your old (skill + exp) model,
  // with small form/age adjustments.
  const total = skill + exp;
  const value = baseValue * total * formMult * ageMult;
  return Math.round(value);
}
