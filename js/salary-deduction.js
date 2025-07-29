import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1NzM4NCwiZXhwIjoyMDY5MDMzMzg0fQ.EtpYvjBs7yiTwreqsukK_I7BoK-UKZo3pF_odbzszmI" // Use service role only for backend cron tasks
);

const now = new Date();
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const nowIST = new Date(now.getTime() + IST_OFFSET);
const today = nowIST.toISOString().split("T")[0];

console.log("🧾 Starting Salary Deduction Job -", today);

// Step 1: Get all teams
const { data: teams } = await supabase.from("teams").select("id, cash");
if (!teams?.length) {
  console.log("❌ No teams found.");
  return;
}

for (const team of teams) {
  // Step 2: Get team’s players
  const { data: players } = await supabase
    .from("players")
    .select("salary")
    .eq("team_id", team.id);

  const totalSalary = players?.reduce((sum, p) => sum + (p.salary || 0), 0) || 0;

  if (totalSalary === 0) {
    console.log(`⏩ Team ${team.id} skipped — no players`);
    continue;
  }

  if (team.cash < totalSalary) {
    console.log(`⚠️ Team ${team.id} has insufficient cash.`);
    continue; // optionally you can penalize or log this
  }

  // Step 3: Deduct salary from cash
  const { error: updateError } = await supabase
    .from("teams")
    .update({ cash: team.cash - totalSalary })
    .eq("id", team.id);

  if (updateError) {
    console.error(`❌ Failed to update team ${team.id}`, updateError.message);
    continue;
  }

  // Step 4: Log the deduction
  await supabase.from("salary_logs").insert({
    team_id: team.id,
    amount: totalSalary,
    date: today,
    player_count: players.length
  });

  console.log(`✅ Team ${team.id} paid ₹${totalSalary} for ${players.length} players`);
}
