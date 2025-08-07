import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5'

// Supabase client
const supabase = createClient(
  'https://iukofcmatlfhfwcechdq.supabase.co', // ✅ Replace with your Supabase URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE' // ✅ Replace with your anon key (safe for client-side)
)

// Load UI once DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = '/login.html'
    return
  }

  const userId = user.id

  // Load profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('manager_name, xp, coins, cash')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    console.error('Failed to load profile')
    return
  }

  // Top Bar
  document.getElementById('top-bar').innerHTML = `
    <div style="background:#151515;padding:10px;display:flex;justify-content:space-between;align-items:center;font-size:14px;">
      <span>👤 ${profile.manager_name}</span>
      <span>XP: ${profile.xp}</span>
      <span>🪙 ${profile.coins}</span>
      <span>₹${profile.cash}</span>
    </div>
  `

  // Bottom Navigation
  document.getElementById('bottom-nav').innerHTML = `
    <div style="position:fixed;bottom:0;left:0;width:100%;background:#151515;display:flex;justify-content:space-around;padding:10px 0;">
      <a href="team.html">Team</a>
      <a href="scout.html">Scout</a>
      <a href="home.html">Home</a>
      <a href="auction.html">Auction</a>
      <a href="store.html">Store</a>
    </div>
  `
})

export { supabase }
