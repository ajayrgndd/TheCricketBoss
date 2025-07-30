import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { generateSquad } from "./squad-generator.js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

// Load region options
document.addEventListener("DOMContentLoaded", async () => {
  const regionSelect = document.getElementById("region");

  const indianStates = [...]; // same as before
  const unionTerritories = [...];
  const topCricketNations = [...];

  const allRegions = [...indianStates, ...unionTerritories, ...topCricketNations];
  regionSelect.innerHTML += allRegions.map(r => `<option value="${r}">${r}</option>`).join("");
});

// Handle form submission
document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const managerName = document.getElementById("managerName").value.trim();
  const teamName = document.getElementById("teamName").value.trim();
  const dob = document.getElementById("dob").value;
  const region = document.getElementById("region").value;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    alert("User not found. Please login again.");
    window.location.href = "login.html";
    return;
  }

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
    alert("Profile setup failed: " + profileError.message);
    return;
  }

  const { data: botTeam, error: botError } = await supabase
    .from("teams")
    .select("*")
    .eq("is_bot", true)
    .is("user_id", null)
    .limit(1)
    .single();

  if (botError || !botTeam) {
    alert("No available bot teams right now. Please try again later.");
    return;
  }

  const { error: teamUpdateError } = await supabase.from("teams").update({
    user_id: user.id,
    is_bot: false,
    region,
    team_name: teamName,
    manager_name: managerName,
    last_active: new Date().toISOString()
  }).eq("id", botTeam.id);

  if (teamUpdateError) {
    alert("Team assignment failed: " + teamUpdateError.message);
    return;
  }

  await supabase.from("players").delete().eq("team_id", botTeam.id);

  try {
    await generateSquad(botTeam.id, region);
  } catch (err) {
    console.error("Squad generation failed:", err.message);
    alert("Squad generation failed. Please try again.");
    return;
  }

  alert("✅ Welcome! Your squad has been created.");
  window.location.href = "squad.html";
});
