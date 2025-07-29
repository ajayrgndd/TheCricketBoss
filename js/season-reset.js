import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://iukofcmatlfhfwcechdq.supabase.co',
  'SERVICE_ROLE_KEY' // replace with actual service role key if scheduling
);

const leagueTiers = ["The Boss", "Titan", "World Class", "National", "Professional", "Domestic"];
const today = new Date();
const seasonEndDate = today.toISOString();

for (const tier of leagueTiers) {
  const { data: teams } = await supabase
    .from("teams")
    .select("id, points, net_run_rate")
    .eq("league_tier", tier);

  if (!teams?.length) continue;

  const ranked = teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.net_run_rate - a.net_run_rate;
  });

  for (let i = 0; i < ranked.length; i++) {
    const teamId = ranked[i].id;

    // ✅ Set season_rank
    await supabase
      .from("teams")
      .update({ season_rank: i + 1 })
      .eq("id", teamId);
  }
}

// Reset match tables, points table, etc. if needed...

// ✅ Update all user profiles with season end flag
await supabase
  .from("profiles")
  .update({
    season_end_date: seasonEndDate,
    reward_claimed: false
  })
  .neq("id", null); // update all

console.log("✅ Season end reset complete.");
