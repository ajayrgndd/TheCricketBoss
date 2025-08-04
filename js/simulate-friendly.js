// simulate-friendly.js
export async function simulateFriendlyMatch(supabase, matchId, homeTeamId, awayTeamId) {
  // Load players
  const [homePlayersRes, awayPlayersRes] = await Promise.all([
    supabase.from('players').select('*').eq('team_id', homeTeamId),
    supabase.from('players').select('*').eq('team_id', awayTeamId)
  ]);

  const homePlayers = homePlayersRes.data || [];
  const awayPlayers = awayPlayersRes.data || [];
  if (homePlayers.length < 11 || awayPlayers.length < 11) return null;

  // Pick 11 for each (default lineup or top 11 for now)
  const homeXI = homePlayers.slice(0, 11);
  const awayXI = awayPlayers.slice(0, 11);

  // Helper to calculate batting power
  const getBattingPower = (p) =>
    p.batting + p.form + p.fitness + p.experience + (p.skill1 ? 5 : 0) + (p.skill2 ? 5 : 0);

  // Helper to calculate bowling power
  const getBowlingPower = (p) =>
    p.bowling + p.form + p.fitness + p.experience + (p.skill1 ? 5 : 0) + (p.skill2 ? 5 : 0);

  // Simulate innings
  const simulateInnings = async (battingTeam, bowlingTeam, battingId, bowlingId, matchId, inningsNum) => {
    let score = 0;
    let wickets = 0;
    let overs = 5; // Short match
    let balls = 0;
    let strikerIndex = 0;
    let nonStrikerIndex = 1;
    let bowlerIndex = 10;
    let events = [];

    for (let over = 0; over < overs; over++) {
      let bowler = bowlingTeam[bowlerIndex % bowlingTeam.length];
      for (let ballInOver = 1; ballInOver <= 6; ballInOver++) {
        if (wickets >= 10) break;

        const striker = battingTeam[strikerIndex % battingTeam.length];
        const battingPower = getBattingPower(striker);
        const bowlingPower = getBowlingPower(bowler);

        const result = Math.max(0, Math.round((Math.random() * (battingPower - bowlingPower + 30)) / 10));
        const isWicket = Math.random() < (bowlingPower > battingPower ? 0.2 : 0.1);

        const commentary = isWicket
          ? `${striker.name} is OUT!`
          : `${striker.name} scores ${result} run${result !== 1 ? 's' : ''}.`;

        events.push({
          match_id: matchId,
          ball_number: balls + 1,
          over: over + 1,
          ball_in_over: ballInOver,
          batting_team_id: battingId,
          bowling_team_id: bowlingId,
          striker: striker.name,
          non_striker: battingTeam[nonStrikerIndex % battingTeam.length].name,
          bowler: bowler.name,
          runs_scored: isWicket ? 0 : result,
          extras: 0,
          wicket: isWicket,
          commentary
        });

        if (isWicket) {
          wickets++;
          strikerIndex = Math.max(strikerIndex, nonStrikerIndex) + 1;
        } else {
          score += result;
          if (result % 2 === 1) {
            [strikerIndex, nonStrikerIndex] = [nonStrikerIndex, strikerIndex];
          }
        }

        balls++;
        if (wickets >= 10) break;
      }
      [strikerIndex, nonStrikerIndex] = [nonStrikerIndex, strikerIndex];
      bowlerIndex--;
    }

    return { score, wickets, balls, events };
  };

  // 1st Innings
  const firstInnings = await simulateInnings(homeXI, awayXI, homeTeamId, awayTeamId, matchId, 1);
  // 2nd Innings
  const secondInnings = await simulateInnings(awayXI, homeXI, awayTeamId, homeTeamId, matchId, 2);

  // Match result
  let winner = null;
  let match_result = "";
  if (firstInnings.score > secondInnings.score) {
    winner = homeTeamId;
    match_result = "Home Team Won";
  } else if (secondInnings.score > firstInnings.score) {
    winner = awayTeamId;
    match_result = "Away Team Won";
  } else {
    match_result = "Match Tied";
  }

  // Save events
  await supabase.from("match_events").insert([...firstInnings.events, ...secondInnings.events]);

  // Update match result
  await supabase
    .from("matches")
    .update({
      status: "completed",
      match_result,
      winner_team_id: winner,
      result: `${firstInnings.score}/${firstInnings.wickets} vs ${secondInnings.score}/${secondInnings.wickets}`
    })
    .eq("id", matchId);

  return matchId;
}
