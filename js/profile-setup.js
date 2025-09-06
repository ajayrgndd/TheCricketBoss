// profile-setup.js (REPLACE existing)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { generateSquad } from "./squad-generator.js";

// --- IMPORTANT ---
// Replace the ANON key below with your project's ANON (public) key.
// Do NOT use your service_role key here.
const SUPABASE_URL = "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Team logos array (kept from your original file)
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

  console.log("🔍 Submitted data:", { managerName, teamName, dob, region });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("❌ User fetch failed:", userError);
      alert("User not found. Please login again.");
      window.location.href = "login.html";
      return;
    }
    const user = userData.user;
    console.log("✅ User found:", user.id);

    // If profile already exists, don't recreate — redirect
    const { data: existingProfile, error: existingProfileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfileErr) {
      console.warn("[profile-setup] profile read error:", existingProfileErr);
    }
    if (existingProfile) {
      console.log("[profile-setup] profile already exists, redirecting to home");
      window.location.href = "home.html";
      return;
    }

    // 1) Insert profile (safe)
    const { data: profileInsertData, error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        manager_name: managerName,
        team_name: teamName,
        dob,
        region,
        xp: 10,
        coins: 10,
        cash: 1000,
        level: "Beginner"
      })
      .select()
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile insert failed:", profileError);
      if ((profileError?.message || "").toLowerCase().includes("duplicate key")) {
        alert("❌ Team name already exists. Please choose a different name.");
      } else {
        alert("❌ Profile setup failed: " + (profileError.message || String(profileError)));
      }
      return;
    }
    console.log("✅ Profile inserted:", profileInsertData);

    // 2) Find a bot team (support both 'type' = 'bot' and is_bot = true)
    // Query: (type = 'bot' OR is_bot = true) AND owner_id IS NULL
    const { data: botTeams, error: botError } = await supabase
      .from("teams")
      .select("*")
      .or("type.eq.bot,is_bot.eq.true")
      .is("owner_id", null)
      .limit(1);

    if (botError) {
      console.error("❌ Bot team fetch failed:", botError);
      alert("Something went wrong while fetching a bot team.");
      return;
    }
    if (!botTeams || botTeams.length === 0) {
      console.warn("⚠️ No available bot teams.");
      alert("No available bot teams right now. Please try again later.");
      return;
    }
    const botTeam = botTeams[0];
    console.log("✅ Bot team selected:", botTeam.id);

    // Pick logo
    const logo_url = teamLogos[Math.floor(Math.random() * teamLogos.length)];

    // 3) Claim/assign the bot team to the real user
    // We require: only update if owner_id IS NULL (so two clients can't race and claim the same team)
    const { data: updatedTeam, error: teamUpdateError } = await supabase
      .from("teams")
      .update({
        owner_id: user.id,
        type: "user",
        is_bot: false,
        team_name,
        manager_name,
        logo_url,
        region,
        last_active: new Date().toISOString()
      })
      .eq("id", botTeam.id)
      .is("owner_id", null)   // extra safety: only apply if still unclaimed
      .select()
      .maybeSingle();

    if (teamUpdateError) {
      console.error("❌ Failed to assign team:", teamUpdateError);
      alert("Team assignment failed: " + (teamUpdateError.message || teamUpdateError));
      return;
    }
    if (!updatedTeam) {
      // probably lost a race — tell user to retry
      console.warn("⚠️ Team was claimed by someone else; retrying. Please try again.");
      alert("This team was claimed by another user — please try signing up again.");
      return;
    }
    console.log("✅ Team assigned to user:", updatedTeam.id);

    // 4) Delete old bot players assigned to that team (if any)
    // First, check how many players exist
    const { data: playersBefore, error: playersBeforeErr, count: beforeCount } = await supabase
      .from("players")
      .select("id", { count: "exact" })
      .eq("team_id", updatedTeam.id);

    if (playersBeforeErr) {
      console.warn("[profile-setup] players select error:", playersBeforeErr);
    } else {
      console.log(`[profile-setup] players found before delete: ${beforeCount}`);
    }

    const { data: deletedPlayers, error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("team_id", updatedTeam.id)
      .select("id");

    if (deleteError) {
      console.warn("⚠️ Failed to delete old players:", deleteError);
    } else {
      console.log(`🧹 Deleted old players count: ${deletedPlayers?.length ?? 0}`, deletedPlayers);
    }

    // 4b) Update profile with assigned team_id
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ team_id: updatedTeam.id })
      .eq("user_id", user.id);

    if (profileUpdateError) {
      console.error("❌ Failed to update profile with team_id:", profileUpdateError);
      alert("Failed to link profile with team.");
      return;
    }
    console.log("✅ Profile updated with team_id");

    // 5) Delete old stadium for that team (if any) then create new stadium
    const { data: oldStadium, error: oldStadiumErr } = await supabase
      .from("stadiums")
      .select("id")
      .eq("team_id", updatedTeam.id)
      .maybeSingle();

    if (oldStadiumErr) {
      console.warn("[profile-setup] old stadium read error:", oldStadiumErr);
    }

    if (oldStadium?.id) {
      const { error: stadiumDelErr } = await supabase
        .from("stadiums")
        .delete()
        .eq("id", oldStadium.id);

      if (stadiumDelErr) {
        console.warn("⚠️ Failed to delete old stadium:", stadiumDelErr);
      } else {
        console.log("🧹 Old stadium deleted");
      }
    }

    const { data: newStadium, error: stadiumCreateError } = await supabase
      .from("stadiums")
      .insert({
        team_id: updatedTeam.id,
        name: `${teamName} Arena`,
        capacity: 5000,
        level: "Local",
        user_id: user.id
      })
      .select()
      .maybeSingle();

    if (stadiumCreateError) {
      console.error("❌ Failed to create stadium:", stadiumCreateError);
    } else {
      console.log("🏟️ New stadium created:", newStadium?.id);
    }

    // 6) Generate new squad (pass the same supabase instance)
    try {
      const squad = await generateSquad(updatedTeam.id, supabase);
      console.log("✅ Squad generation complete, players count:", squad?.length ?? 0);
    } catch (err) {
      console.error("❌ Squad generation failed:", err);
      alert("Squad generation failed. Please try again.");
      return;
    }

    alert("✅ Welcome! Your squad has been created.");
    window.location.href = "squad.html";
  } catch (e) {
    console.error("❌ Unexpected error in setup flow:", e);
    alert("Unexpected error: " + (e?.message || String(e)));
  }
});
