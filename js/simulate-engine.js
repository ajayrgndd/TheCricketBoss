import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient("https://iukofcmatlfhfwcechdq.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1NzM4NCwiZXhwIjoyMDY5MDMzMzg0fQ.EtpYvjBs7yiTwreqsukK_I7BoK-UKZo3pF_odbzszmI");

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const nowIST = new Date(Date.now() + IST_OFFSET);
const isMatchDay = [1, 4].includes(nowIST.getUTCDay()); // Mon & Thu

if (!isMatchDay) {
  console.log("No matches today.");
  return;
}

const today = nowIST.toISOString().split("T")[0];
const { data: matches } = await supabase
  .from("matches")
  .select("*")
  .eq("date", today)
  .eq("status", "scheduled");

if (!matches?.length) {
  console.log("No scheduled matches.");
  return;
}

for (const match of matches) {
  console.log(`Simulating match: ${match.id}`);

  const [homeTeam, awayTeam] = await Promise.all([
    supabase.from("teams").select("*").eq("id", match.home_team_id).single(),
    supabase.from("teams").select("*").eq("id", match.away_team_id).single()
  ]);

  const [homeLineup, awayLineup] = await Promise.all([
    supabase.from("lineups").select("*").eq("match_id", match.id).eq("team_id", homeTeam.data.id).single(),
    supabase.from("lineups").select("*").eq("match_id", match.id).eq("team_id", awayTeam.data.id).single()
  ]);

  if (!homeLineup?.data?.playing_xi || !awayLineup?.data?.playing_xi) {
    console.log(`Lineups not set for match ${match.id}`);
    continue;
  }

  const { data: homePlayers } = await supabase.from("players").select("*").in("id", homeLineup.data.playing_xi);
  const { data: awayPlayers } = await supabase.from("players").select("*").in("id", awayLineup.data.playing_xi);

  const matchEvents = [];
  const teamStats = {
    [homeTeam.data.id]: { runs: 0, wickets: 0, overs: 0 },
    [awayTeam.data.id]: { runs: 0, wickets: 0, overs: 0 }
  };

  const inning1 = await simulateInning({ battingTeam: homeTeam.data, bowlingTeam: awayTeam.data,
    lineup: homeLineup.data, opponentLineup: awayLineup.data,
    players: homePlayers, opponents: awayPlayers,
    match_id: match.id, inning: 1, matchEvents, teamStats });

  const inning2 = await simulateInning({ battingTeam: awayTeam.data, bowlingTeam: homeTeam.data,
    lineup: awayLineup.data, opponentLineup: homeLineup.data,
    players: awayPlayers, opponents: homePlayers,
    match_id: match.id, inning: 2, matchEvents, teamStats, target: inning1.runs + 1 });

  const winner = inning1.runs > inning2.runs
    ? homeTeam.data.id
    : inning2.runs > inning1.runs
    ? awayTeam.data.id
    : null;

  const resultText = winner
    ? `${winner === homeTeam.data.id ? homeTeam.data.team_name : awayTeam.data.team_name} won by ${Math.abs(inning1.runs - inning2.runs)} runs`
    : "Match tied";

  await supabase.from("matches").update({
    status: "completed",
    winner_team_id: winner,
    match_result: resultText
  }).eq("id", match.id);

  await supabase.from("match_events").insert(matchEvents);

  // 🧾 INSERT PLAYER STATS
  const allPlayers = [...homePlayers, ...awayPlayers];
  const playerStats = {};

  for (const event of matchEvents) {
    const batsman = allPlayers.find(p => p.name === event.batsman);
    const bowler = allPlayers.find(p => p.name === event.bowler);
    if (!batsman || !bowler) continue;

    if (!playerStats[batsman.id]) playerStats[batsman.id] = {
      runs_scored: 0, wickets_taken: 0, overs_bowled: 0, balls_bowled: 0,
      skills_used: [batsman.skill1, batsman.skill2].filter(Boolean),
      team_id: batsman.team_id
    };

    if (!playerStats[bowler.id]) playerStats[bowler.id] = {
      runs_scored: 0, wickets_taken: 0, overs_bowled: 0, balls_bowled: 0,
      skills_used: [bowler.skill1, bowler.skill2].filter(Boolean),
      team_id: bowler.team_id
    };

    if (!event.extra_type && !event.is_wicket) {
      playerStats[batsman.id].runs_scored += event.runs;
    }

    if (!event.extra_type) {
      playerStats[bowler.id].balls_bowled += 1;
      if (event.is_wicket) playerStats[bowler.id].wickets_taken += 1;
    }
  }

  for (const id in playerStats) {
    const p = playerStats[id];
    p.overs_bowled = (p.balls_bowled / 6).toFixed(1);
  }

  const inserts = Object.entries(playerStats).map(([player_id, stats]) => ({
    match_id: match.id,
    player_id,
    team_id: stats.team_id,
    runs_scored: stats.runs_scored,
    wickets_taken: stats.wickets_taken,
    overs_bowled: stats.overs_bowled,
    skills_used: stats.skills_used
  }));

  await supabase.from("player_stats").insert(inserts);
}

// 🔁 Support functions

function getNextBowler(order, over, usage) {
  const max = 4;
  for (const id of order) {
    const used = usage[id] || [];
    if (!used.includes(over - 1) && used.length < max) {
      usage[id] = [...used, over];
      return id;
    }
  }
  const fallback = order[0];
  usage[fallback] = [...(usage[fallback] || []), over];
  return fallback;
}

async function simulateInning({ battingTeam, bowlingTeam, lineup, opponentLineup, players, opponents,
  match_id, inning, matchEvents, teamStats, target = null }) {
  const battingOrder = lineup.batting_order;
  const bowlingOrder = opponentLineup.bowling_order;

  let strikerIdx = 0, nonStrikerIdx = 1, nextBatter = 2;
  let overs = 0, wickets = 0, runs = 0;
  const maxOvers = 20, bowlerUsage = {};

  while (overs < maxOvers && wickets < 10 && (!target || runs < target)) {
    const strikerId = battingOrder[strikerIdx];
    const nonStrikerId = battingOrder[nonStrikerIdx];
    const striker = players.find(p => p.id === strikerId);
    const bowlerId = getNextBowler(bowlingOrder, overs, bowlerUsage);
    const bowler = opponents.find(p => p.id === bowlerId);

    for (let ball = 1; ball <= 6; ball++) {
      const outcome = simulateBall(striker, bowler, { over: overs + 1, ball, inning });
      runs += outcome.runs;
      wickets += outcome.isWicket ? 1 : 0;

      matchEvents.push({
        match_id, inning, over: overs + 1, ball,
        batsman: striker.name,
        bowler: bowler.name,
        runs: outcome.runs,
        extra_type: outcome.extra_type,
        is_wicket: outcome.isWicket,
        commentary: outcome.commentary
      });

      if (outcome.isWicket) {
        if (nextBatter >= battingOrder.length) break;
        strikerIdx = nextBatter++;
      } else if ([1, 3, 5].includes(outcome.runs)) {
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
      }

      if (target && runs >= target) break;
    }

    overs++;
    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
  }

  teamStats[battingTeam.id] = { runs, wickets, overs };
  return { runs, wickets, overs };
}

function simulateBall(batsman, bowler, context) {
  const { over } = context;
  const isPowerplay = over <= 6;
  const powerplayBoost = isPowerplay ? 1.1 : 1;

  const battingSkill = batsman.batting;
  const bowlingSkill = bowler.bowling;
  const formBoost = getFormBoost(batsman.form);
  const fitnessPenalty = getFitnessPenalty(batsman);
  const experienceFactor = getExperienceFactor(bowler.experience);

  const effectiveBat = battingSkill * (1 + formBoost + fitnessPenalty) * powerplayBoost;
  const effectiveBowl = bowlingSkill * (1 + experienceFactor);

  const result = {
    runs: 0, isWicket: false, extra_type: null, commentary: ""
  };

  if (Math.random() < getExtraChance(bowler.experience)) {
    result.runs = 1;
    result.extra_type = Math.random() < 0.5 ? "wide" : "noball";
    result.commentary = result.extra_type === "wide"
      ? `${bowler.name} sprays it wide! Extra run.`
      : `${bowler.name} oversteps! It's a no-ball!`;
    return result;
  }

  const diff = effectiveBat - effectiveBowl + (Math.random() * 10 - 5);

  if (diff > 25) {
    result.runs = 6;
    result.commentary = `🚀 ${batsman.name} smashes it for SIX!`;
  } else if (diff > 15) {
    result.runs = 4;
    result.commentary = `🔥 ${batsman.name} cracks a FOUR!`;
  } else if (diff > 5) {
    result.runs = [1, 2, 3][Math.floor(Math.random() * 3)];
    result.commentary = `${batsman.name} takes ${result.runs} run(s).`;
  } else if (diff > -5) {
    result.runs = 0;
    result.commentary = `Dot ball by ${bowler.name}.`;
  } else {
    result.isWicket = true;
    result.commentary = `💥 WICKET! ${batsman.name} is gone!`;
  }

  return result;
}

function getFormBoost(form) {
  return form === "Excellent" ? 0.10 : form === "Good" ? 0.05 : form === "Poor" ? -0.05 : 0;
}

function getFitnessPenalty(p) {
  return p.fitness >= 100 ? 0 : -((100 - p.fitness) / 100);
}

function getExperienceFactor(e) {
  return e < 10 ? -0.15 : e < 20 ? -0.10 : e < 40 ? -0.05 : 0;
}

function getExtraChance(exp) {
  return exp < 10 ? 0.10 : exp < 20 ? 0.07 : exp < 40 ? 0.05 : 0.02;
}
