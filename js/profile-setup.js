import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE" // 🔐 Replace with your actual anon key
);

document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    alert("User not logged in");
    return;
  }

  const manager_name = document.getElementById("manager_name").value.trim();
  const team_name = document.getElementById("team_name").value.trim();
  const dob = document.getElementById("dob").value;
  const region = document.getElementById("region").value;
  const now = new Date().toISOString();

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existingProfile) {
    alert("Profile already exists. Redirecting to home...");
    window.location.href = "home.html";
    return;
  }

  // Create new profile with Welcome Rewards
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    manager_name,
    team_name,
    dob,
    region,
    xp: 10,        // ✅ Welcome XP
    coins: 10,     // ✅ Welcome Coins
    cash: 1000,    // ✅ Welcome Stadium Cash
    manager_level: "Beginner",
    created_at: now
  });

  if (error) {
    console.error("Error saving profile:", error.message);
    alert("Error saving profile");
    return;
  }

  alert("🎉 Profile created! You earned 10 XP, 10 Coins, ₹1000 Cash.");
  window.location.href = "squad.html?new=true"; // Use this for first-time welcome animation if needed
});
