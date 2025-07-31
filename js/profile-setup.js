import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { generateSquad } from "./squad-generator.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const managerName = document.getElementById("managerName").value.trim();
  const teamName = document.getElementById("teamName").value.trim();
  const dob = document.getElementById("dob").value;
  const region = document.getElementById("region").value;

  console.log("🔍 Submitted data:", { managerName, teamName, dob, region });

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("❌ User fetch failed:", userError?.message);
      alert("User not found. Please login again.");
      window.location.href = "login.html";
      return;
    }

    console.log("✅ User found:", user.id);

    // 1️⃣ Insert Profile
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: user.id,
      manager_name: managerName,
      team_name: teamName,
      dob,
      region,
      xp: 10,
      coins: 10,
      cash: 1000,
      level: "Beginner"
    });

    if (profileError) {
      console.error("❌ Profile insert failed:", profileError.message);
      alert("Profile setup failed: " + profileError.message);
      return;
    }

    console.log("✅ Profile inserted successfully");

    // 2️⃣ Find a bot team
    const { data: botTeam, error: botError } = await supabase
      .from("teams")
      .select("*")
      .eq("is_bot", true)
      .is("owner_id", null)
      .limit(1)
      .maybeSingle(); // ✅ avoids error if 0 rows

    if (!botTeam) {
      console.warn("⚠️ No available bot teams. Query returned no results.");
      alert("No available bot teams right now. Please try again later.");
      return;
    }

    console.log("✅ Bot team found:", botTeam.id);

    // 3️⃣ Assign bot team to user
    const { error: teamUpdateError } = await supabase
      .from("teams")
      .update({
        owner_id: user.id,
        is_bot: false,
        region,
        team_name: teamName,
        manager_name: managerName,
        last_active: new Date().toISOString()
      })
      .eq("id", botTeam.id);

    if (teamUpdateError) {
      console.error("❌ Failed to assign team:", teamUpdateError.message);
      alert("Team assignment failed: " + teamUpdateError.message);
      return;
    }

    console.log("✅ Team assigned to user");

    // 4️⃣ Delete old bot players
    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("team_id", botTeam.id);

    if (deleteError) {
      console.warn("⚠️ Failed to delete old bot players:", deleteError.message);
    } else {
      console.log("🧹 Old bot players deleted");
    }

    // 5️⃣ Generate new squad
    try {
      await generateSquad(botTeam.id, region);
      console.log("✅ Squad generation complete");
    } catch (err) {
      console.error("❌ Squad generation failed:", err.message);
      alert("Squad generation failed. Please try again.");
      return;
    }

    alert("✅ Welcome! Your squad has been created.");
    window.location.href = "squad.html";
  } catch (e) {
    console.error("❌ Unexpected error in setup flow:", e);
    alert("Unexpected error: " + e.message);
  }
});
