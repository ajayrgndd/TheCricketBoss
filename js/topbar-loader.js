import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const userId = user.id;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash")
    .eq("user_id", userId)
    .single();

  if (error || !profile) return;

  document.getElementById("top-username").textContent = `👤 ${profile.manager_name}`;
  document.getElementById("top-xp").textContent = `XP: ${profile.xp}`;
  document.getElementById("top-coins").textContent = `🪙 ${profile.coins}`;
  document.getElementById("top-cash").textContent = `₹ ${profile.cash}`;
});
