// academy-finalizer.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1NzM4NCwiZXhwIjoyMDY5MDMzMzg0fQ.EtpYvjBs7yiTwreqsukK_I7BoK-UKZo3pF_odbzszmI" // Keep secret!
);

const now = new Date().toISOString();

// Fetch all academy trainings that ended and not completed
const { data: rows, error } = await supabase
  .from("academy")
  .select("*")
  .eq("completed", false)
  .lte("end_time", now);

if (error) {
  console.error("❌ Error fetching academy rows:", error.message);
  Deno.exit(1);
}

for (const row of rows) {
  const skillColumn = row.skill_slot; // skill1 or skill2

  // Step 1: Update the player with the new skill
  const { error: playerErr } = await supabase
    .from("players")
    .update({ [skillColumn]: row.skill })
    .eq("id", row.player_id);

  if (playerErr) {
    console.error(`❌ Failed to update player ${row.player_id}:`, playerErr.message);
    continue;
  }

  // Step 2: Mark academy row as completed
  const { error: updateError } = await supabase
    .from("academy")
    .update({ completed: true })
    .eq("id", row.id);

  if (updateError) {
    console.error(`❌ Failed to update academy row ${row.id}:`, updateError.message);
  }

  // Step 3: Fetch player name for the notification
  const { data: player } = await supabase
    .from("players")
    .select("name")
    .eq("id", row.player_id)
    .single();

  // Step 4: Create notification for user
  const notif = {
    user_id: row.user_id,
    title: "🎓 Skill Unlocked",
    message: `Skill "${row.skill}" activated for ${player?.name || "your player"}`,
    read: false,
    created_at: new Date().toISOString()
  };

  const { error: notifError } = await supabase.from("notifications").insert(notif);

  if (notifError) {
    console.error("❌ Failed to insert notification:", notifError.message);
  }

  console.log(`✅ ${player?.name || "Player"} learned ${row.skill} in ${skillColumn}`);
}
