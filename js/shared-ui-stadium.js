// js/shared-ui-stadium.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// 🔐 Replace with your actual Supabase project values
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function loadSharedUI() {
  // Top bar
  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.innerHTML = `
    <span id="username">Loading...</span>
    <span id="xp">XP: 0</span>
    <span id="coins">💰 0</span>
    <span id="cash">₹0</span>
  `;
  document.body.prepend(topBar);

  // Bottom nav bar
  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-nav';
  bottomBar.innerHTML = `
    <a href="team.html">Team</a>
    <a href="scout.html">Scout</a>
    <a href="home.html">Home</a>
    <a href="auction.html">Auction</a>
    <a href="store.html">Store</a>
  `;
  document.body.appendChild(bottomBar);

  // Fetch user data and update top bar
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('User not logged in or error fetching user:', userError);
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, xp, coins, cash')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Failed to load profile:', profileError.message);
    return;
  }

  document.getElementById('username').textContent = profile.username || 'User';
  document.getElementById('xp').textContent = `XP: ${profile.xp || 0}`;
  document.getElementById('coins').textContent = `💰 ${profile.coins || 0}`;
  document.getElementById('cash').textContent = `₹${profile.cash || 0}`;
}
