// simulate-friendly.js

export async function simulateFriendlyMatch(supabase, homeTeamId, awayTeamId, options = {}) {
  const { skipSimulation = false } = options;

  // Step 1: Insert match row
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .insert({
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      type: "friendly",
      date: new Date().toISOString(),
      result: skipSimulation ? null : "pending"
    })
    .select()
    .single();

  if (matchErr || !match) {
    console.error("❌ Failed to create match:", matchErr?.message);
    return null;
  }

  if (skipSimulation) {
    // Postpone simulation until after lineup is set
    return match.id;
  }

  // Step 2: Fetch lineups
  const { data: homeLineup } = await supabase
    .from("lineups")
    .select("*")
    .eq("match_id", match.id)
    .eq("team_id", homeTeamId)
    .single();

  const { data: awayLineup } = await supabase
    .from("lineups")
    .select("*")
    .eq("match_id", match.id)
    .eq("team_id", awayTeamId)
    .single();

  if (!homeLineup || !awayLineup) {
    console.warn("⚠️ Lineups not found for both teams. Match left as pending.");
    return match.id;
  }

  // Step 3: Fetch players
  const [homePlayersRes, awayPlayersRes] = await Promise.all([
    supabase.from("players").select("*").in("id", homeLineup.playing_xi),
    supabase.from("players").select("*").in("id", awayLineup.playing_xi)
  ]);

  const homePlayers = homePlayersRes.data || [];
  const awayPlayers = awayPlayersRes.data || [];

  // Step 4: Simulate match (basic logic)
  function simulateScore(players, overs) {
    const battingAvg = players.reduce((sum, p) => sum + p.batting, 0) / players.length;
    const base = Math.round((battingAvg / 10) * overs * 6); // rough formula
    return base + Math.floor(Math.random() * 21) - 10; // ±10 random
  }

  const homeScore = simulateScore(homePlayers, 20);
  const awayScore = simulateScore(awayPlayers, 20);

  let result = "tie";
  if (homeScore > awayScore) result = "home_win";
  else if (awayScore > homeScore) result = "away_win";

  // Step 5: Update match result
  const { error: updateErr } = await supabase
    .from("matches")
    .update({
      result,
      home_score: homeScore,
      away_score: awayScore
    })
    .eq("id", match.id);

  if (updateErr) {
    console.error("❌ Failed to update match result:", updateErr.message);
  }

  return match.id;
}
