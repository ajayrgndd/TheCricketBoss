// simulate-friendly.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://iukofcmatlfhfwcechdq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE'
);

export async function simulateFriendlyMatch(user_id, opponent_team_id) {
  // Get user's team
  const { data: userTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user_id)
    .single();

  const home_team_id = userTeam.id;
  const away_team_id = opponent_team_id;

  // Get players for both teams
  const { data: homePlayers } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", home_team_id)
    .limit(11);

  const { data: awayPlayers } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", away_team_id)
    .limit(11);

  // Create match record
  const { data: matchInsert, error: matchError } = await supabase
    .from("matches")
    .insert({
      home_team_id,
      away_team_id,
      status: "completed",
      date: new Date().toISOString().split("T")[0],
      type: "friendly"
    })
    .select()
    .single();

  if (matchError) {
    console.error("❌ Failed to create match:", matchError.message);
    return null;
  }

  const match_id = matchInsert.id;

  // Simulate match logic (2 innings: 10 overs each)
  const events = [];
  let ballId = 1;

  function simulateInning(battingTeam, bowlingTeam, inningNum) {
    let runs = 0;
    let wickets = 0;
    let over = 0;

    for (let o = 1; o <= 10 && wickets < 10; o++) {
      for (let b = 1; b <= 6 && wickets < 10; b++) {
        const batter = battingTeam[wickets % battingTeam.length];
        const bowler = bowlingTeam[(o + b) % bowlingTeam.length];

        const battingSkill = batter.batting + Math.random() * 10;
        const bowlingSkill = bowler.bowling + Math.random() * 10;
        const outcome = battingSkill - bowlingSkill;

        let commentary = "";
        let runsThisBall = 0;
        let out = false;

        if (outcome < -5) {
          out = true;
          commentary = `${batter.name} is OUT! Bowled by ${bowler.name}`;
          wickets++;
        } else if (outcome < 0) {
          runsThisBall = 0;
          commentary = `${batter.name} defended the ball. Dot.`;
        } else if (outcome < 5) {
          runsThisBall = 1;
          commentary = `${batter.name} takes a quick single.`;
        } else if (outcome < 10) {
          runsThisBall = 2;
          commentary = `${batter.name} drives it! Two runs.`;
        } else if (outcome < 15) {
          runsThisBall = 4;
          commentary = `${batter.name} smashes a FOUR!`;
        } else {
          runsThisBall = 6;
          commentary = `${batter.name} hits a SIX! What a shot!`;
        }

        runs += runsThisBall;

        events.push({
          id: ballId++,
          match_id,
          inning: inningNum,
          over: o,
          ball: b,
          commentary
        });
      }
    }

    return { runs, wickets };
  }

  const homeInnings = simulateInning(homePlayers, awayPlayers, 1);
  const awayInnings = simulateInning(awayPlayers, homePlayers, 2);

  // Insert match events
  const { error: eventError } = await supabase
    .from("match_events")
    .insert(events);

  if (eventError) {
    console.error("❌ Error inserting match events:", eventError.message);
    return null;
  }

  // Done
  console.log("✅ Friendly match simulated.");
  return match_id;
}
