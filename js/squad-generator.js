// squad-generator.js — fixed, defensive version
import { regionNameData } from "./data/region-names.js";
import { calculateWeeklySalary, calculateMarketValue } from "./utils/salary.js";

function getRandomBattingStyle() {
  return Math.random() < 0.5 ? "Right Hand Batter" : "Left Hand Batter";
}
function getRandomBowlingStyle() {
  const styles = ["Right Hand Seamer", "Left Hand Seamer", "Right Hand Spinner", "Left Hand Spinner"];
  return styles[Math.floor(Math.random() * styles.length)];
}
function getWeightedRandomAge() {
  const ageBuckets = [
    { min: 18, max: 19, weight: 2 },
    { min: 20, max: 22, weight: 4 },
    { min: 23, max: 26, weight: 3 },
    { min: 27, max: 29, weight: 1 },
    { min: 30, max: 32, weight: 1 },
    { min: 33, max: 35, weight: 1 }
  ];
  const expanded = [];
  for (const bucket of ageBuckets) for (let i = 0; i < bucket.weight; i++) expanded.push(bucket);
  const selected = expanded[Math.floor(Math.random() * expanded.length)];
  return Math.floor(Math.random() * (selected.max - selected.min + 1)) + selected.min;
}
function determineSkillLevel(batting, bowling, keeping) {
  const avg = (batting + bowling + keeping) / 3;
  if (avg < 10) return "Newbie";
  if (avg < 20) return "Trainee";
  return "Domestic";
}
function getRoleImage(role) {
  const base = "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/players/";
  const roleMap = {
    "Batsman": "batsman.png",
    "Bowler": "bowler.png",
    "Wicket Keeper": "wicketkeeper.png",
    "All-Rounder": "allrounder.png"
  };
  return base + (roleMap[role] || "default.png");
}

/**
 * generateSquad(teamId, supabase)
 * - teamId: UUID of the team to populate
 * - supabase: an already-created Supabase client instance (important)
 *
 * Returns an array of inserted player rows (id,name,role,...)
 */
export async function generateSquad(teamId, supabase) {
  if (!teamId) throw new Error("generateSquad: teamId is required");
  if (!supabase) throw new Error("generateSquad: supabase client instance is required");

  // 1) Check if players already exist for this team
  try {
    const { data: existingPlayers, error: existingErr, count } = await supabase
      .from("players")
      .select("id", { count: "exact" })
      .eq("team_id", teamId)
      .limit(1);

    if (existingErr) {
      console.warn("[generateSquad] players select error:", existingErr);
    } else if (existingPlayers && existingPlayers.length > 0) {
      console.log("[generateSquad] players already exist for team – skipping generation");
      return existingPlayers;
    }
  } catch (e) {
    console.warn("[generateSquad] warning while checking existing players:", e);
  }

  // 2) Read the team row (must exist and have a name)
  const { data: teamData, error: teamErr } = await supabase
    .from("teams")
    .select("team_name, manager_name, region")
    .eq("id", teamId)
    .maybeSingle();

  if (teamErr) {
    console.error("[generateSquad] team read error:", teamErr);
    throw new Error("Team read error: " + (teamErr?.message || String(teamErr)));
  }
  if (!teamData) {
    throw new Error("Team not found for id: " + teamId);
  }

  // Use a safe team label variable (avoid referencing undeclared names)
  const teamLabel = teamData.team_name ?? "Unnamed Team";
  const managerName = teamData.manager_name ?? "";
  const teamRegion = teamData.region ?? null;

  // 3) Build the squad
  const usedNames = new Set();
  const squad = [];
  const roles = ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"];
  const roleCounts = { Batsman: 5, Bowler: 5, "All-Rounder": 1, "Wicket Keeper": 1 };
  const availableRegions = Object.keys(regionNameData);

  for (const role of roles) {
    for (let i = 0; i < roleCounts[role]; i++) {
      let batting = 0, bowling = 0, keeping = 0;

      const age_years = getWeightedRandomAge();
      const age_days = Math.floor(Math.random() * 63);
      const fitness = age_years > 30 ? 95 : 100;

      const isOld = age_years >= 27;
      const highSkill = Math.floor(Math.random() * 20) + 31; // 31–50
      const lowSkill = Math.floor(Math.random() * 10) + 10; // 10–19

      switch (role) {
        case "Batsman":
          batting = isOld ? highSkill : Math.floor(Math.random() * 6) + 15;
          bowling = isOld ? lowSkill : Math.floor(Math.random() * 6) + 5;
          break;
        case "Bowler":
          bowling = isOld ? highSkill : Math.floor(Math.random() * 6) + 15;
          batting = isOld ? lowSkill : Math.floor(Math.random() * 6) + 5;
          break;
        case "All-Rounder":
          if (isOld) {
            if (Math.random() < 0.5) {
              batting = highSkill;
              bowling = Math.floor(Math.random() * 10) + 15;
            } else {
              bowling = highSkill;
              batting = Math.floor(Math.random() * 10) + 15;
            }
          } else {
            batting = Math.floor(Math.random() * 6) + 12;
            bowling = Math.floor(Math.random() * 6) + 12;
          }
          break;
        case "Wicket Keeper":
          keeping = isOld ? highSkill : Math.floor(Math.random() * 6) + 12;
          batting = isOld ? lowSkill : Math.floor(Math.random() * 6) + 10;
          bowling = isOld ? 0 : Math.floor(Math.random() * 4);
          break;
      }

      // Unique name selection (fallbacks robust)
      let name = "Unnamed Player";
      let playerRegion = teamRegion ?? availableRegions[Math.floor(Math.random() * availableRegions.length)];
      for (let t = 0; t < 10; t++) {
        const r = availableRegions[Math.floor(Math.random() * availableRegions.length)];
        const names = regionNameData[r] || ["Player " + Math.floor(Math.random()*10000)];
        const candidate = names[Math.floor(Math.random() * names.length)];
        if (!usedNames.has(candidate)) {
          usedNames.add(candidate);
          name = candidate;
          playerRegion = r;
          break;
        }
      }

      const skill_level = determineSkillLevel(batting, bowling, keeping);

      const player = {
        team_id: teamId,
        name,
        region: playerRegion,
        role,
        batting,
        bowling,
        keeping,
        fitness,
        age_years,
        age_days,
        form: "Average",
        experience: 0,
        skill_level,
        skills: [],
        batting_style: getRandomBattingStyle(),
        bowling_style: getRandomBowlingStyle(),
        image_url: getRoleImage(role),
        salary: 0,
        market_price: 0,
        team_name: teamLabel,
        manager_name: managerName,
        is_wk: role === "Wicket Keeper"
      };

      player.salary = calculateWeeklySalary(player);
      player.market_price = calculateMarketValue(player);
      squad.push(player);
    }
  }

  // 4) Insert players (batch)
  const { data: inserted, error: insertErr } = await supabase
    .from("players")
    .insert(squad)
    .select("id, name, role, batting, bowling, keeping");

  if (insertErr) {
    console.error("[generateSquad] Failed to insert squad:", insertErr);
    throw insertErr;
  }
  console.log("[generateSquad] Squad inserted successfully - players:", (inserted?.length || 0));

  // 5) Replace stadium safely (use the safe teamLabel variable)
  try {
    const { data: currentStadium } = await supabase
      .from("stadiums")
      .select("id")
      .eq("team_id", teamId)
      .maybeSingle();

    if (currentStadium?.id) {
      await supabase.from("stadiums").delete().eq("id", currentStadium.id);
    }

    await supabase.from("stadiums").insert({
      team_id: teamId,
      name: `${teamLabel} Arena`,
      capacity: 5000,
      level: "Local"
    });
  } catch (e) {
    console.warn("[generateSquad] stadium replacement warning:", e);
  }

  return inserted;
}
