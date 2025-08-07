// js/shared-ui-stadium.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://iukofcmatlfhfwcechdq.supabase.co'; // ✅ Replace with your actual Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';           // ✅ Replace with your anon/public key
const supabase = createClient(supabaseUrl, supabaseKey);

export async function loadSharedUI() {
  // Top bar
  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.innerHTML = `
    <span id="manager_name">Loading...</span>
    <span id="xp">XP: 0</span>
    <span id="coins">💰 0</span>
    <span id="cash">₹0</span>
  `;
  document.body.prepend(topBar);

  // Bottom nav bar
  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-nav';
  bottomBar.innerHTML = `
    <a href="team.html">🏏 Team</a>
    <a href="scout.html">🔍 Scout</a>
    <a href="home.html">🏠 Home</a>
    <a href="auction.html">⚒️ Auction</a>
    <a href="store.html">🛒 Store</a>
  `;
  document.body.appendChild(bottomBar);

  // Load data into top bar
  await loadTopBarData();
}

async function loadTopBarData() {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("❌ Auth failed:", authError?.message);
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    console.error("❌ Profile fetch error:", error?.message);
    return;
  }

  document.getElementById('manager_name').textContent = profile.manager_name;
  document.getElementById('xp').textContent = `XP: ${profile.xp || 0}`;
  document.getElementById('coins').textContent = `💰 ${profile.coins || 0}`;
  document.getElementById('cash').textContent = `₹${profile.cash || 0}`;
}
