import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { generateSquad } from "./squad-generator.js";

// Supabase client
const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// Team logo options
const teamLogos = [
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo1.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo2.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo3.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo4.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo5.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo6.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo7.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo8.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo9.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo10.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo11.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo12.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo13.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo14.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo15.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo16.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo17.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo18.png"
];

document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const managerName = document.getElementById("managerName").value.trim();
  const teamName = document.getElementById("teamName").value.trim();
  const dob = document.getElementById("dob").value;
  const region = document.getElementById("region").value;

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert("User not found. Please login again.");
      window.location.href = "login.html";
      return;
    }

    // 1. Insert user profile
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
      if (profileError.message.includes("duplicate key value")) {
        alert("❌ Team name already exists. Please choose a different name.");
      } else {
        alert("❌ Profile setup failed: " + profileError.message);
      }
      return;
    }

    // 2. Find available bot team
    const { data: botTeams, error: botError } = await supabase
      .from("teams")
      .select("*")
      .eq("type", "bot")
      .is("owner_id", null)
      .limit(1);

    if (botError || !botTeams || botTeams.length === 0) {
      alert("⚠️ No available bot teams. Please try again later.");
      return;
    }

    const botTeam = botTeams[0];
    const logo_url = teamLogos[Math.floor(Math.random() * teamLogos.length)];

    // 3. Assign team to user
    const { error: teamUpdateError } = await supabase
      .from("teams")
      .update({
        owner_id: user.id,
        type: "user",
        team_name,
        manager_name,
        logo_url,
        region,
        last_active: new Date().toISOString()
      })
      .eq("id", botTeam.id);

    if (teamUpdateError) {
      alert("❌ Failed to assign team: " + teamUpdateError.message);
      return;
    }

    // 4. Delete old players of the bot team
    await supabase.from("players").delete().eq("team_id", botTeam.id);

    // 5. Generate new squad
    await generateSquad(botTeam.id);

    alert("✅ Profile setup complete. Your squad has been generated!");
    window.location.href = "squad.html";

  } catch (err) {
    console.error("❌ Error in profile setup:", err.message);
    alert("Unexpected error: " + err.message);
  }
});
