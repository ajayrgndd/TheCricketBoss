// /simulation/simulate-friendly.js
import { simulateMatch } from './simulate-core.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// Entry Point
export async function simulateFriendlyMatch(userTeamId, opponentTeamId) {
  const today = new Date().toISOString().split("T")[0];

  // 1. Create a match record
  const { data: matchInsert, error: insertError } = await supabase.from("matches").insert([{
    date: today,
    status: "ongoing",
    home_team_id: userTeamId,
    away_team_id: opponentTeamId,
    type: "friendly"
  }]).select().single();

  if (insertError) {
    console.error("❌ Friendly match creation failed:", insertError.message);
    return;
  }

  const match = matchInsert;

  // 2. Fetch team info
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .in("id", [userTeamId, opponentTeamId]);

  const homeTeam = teams.find(t => t.id === userTeamId);
  const awayTeam = teams.find(t => t.id === opponentTeamId);

  // 3. Fetch lineups
  const { data: lineups } = await supabase
    .from("lineups")
    .select("*")
    .eq("match_id", match.id);

  const homeLineup = lineups.find(l => l.team_id === userTeamId);
  const awayLineup = lineups.find(l => l.team_id === opponentTeamId);

  if (!homeLineup || !awayLineup) {
    console.error("❌ Lineups missing for friendly match.");
    return;
  }

  // 4. Fetch player data
  const { data: homePlayers } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", userTeamId);

  const { data: awayPlayers } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", opponentTeamId);

  // 5. Run simulation via shared engine
  await simulateMatch(match, homeTeam, awayTeam, homeLineup, awayLineup, homePlayers, awayPlayers, supabase);

  console.log("✅ Friendly match simulation complete");
}
