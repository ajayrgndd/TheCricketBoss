// js/shared-ui.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// Supabase config
const supabaseUrl = "https://iukofcmatlfhfwcechdq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";
export const supabase = createClient(supabaseUrl, supabaseKey);

// Main loader for top & bottom nav
export async function loadSharedUI(topNavId, bottomNavId) {
  const topNavEl = document.getElementById(topNavId);
  const bottomNavEl = document.getElementById(bottomNavId);

  let username = "Guest";
  let xp = 0;
  let coins = 0;
  let cash = 0;

  // Get logged-in user
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const userId = user.id;

    // Fetch profile data
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("username, xp, coins, cash")
      .eq("id", userId)
      .single();

    if (!error && profileData) {
      username = profileData.username || username;
      xp = profileData.xp || 0;
      coins = profileData.coins || 0;
      cash = profileData.cash || 0;
    }
  }

  // Top Navigation
  if (topNavEl) {
    topNavEl.innerHTML = `
      <div class="top-bar">
        <span class="top-username">${username}</span>
        <span class="top-xp">XP: ${xp}</span>
        <span class="top-coins">💰 ${coins}</span>
        <span class="top-cash">🏦 ${cash}</span>
      </div>
    `;
  }

  // Bottom Navigation
  if (bottomNavEl) {
    bottomNavEl.innerHTML = `
      <div class="bottom-bar">
        <a href="team.html">🏏 Team</a>
        <a href="scout.html">🔍 Scout</a>
        <a href="home.html">🏠 Home</a>
        <a href="auction.html">📦 Auction</a>
        <a href="store.html">🛒 Store</a>
      </div>
    `;
  }
}
