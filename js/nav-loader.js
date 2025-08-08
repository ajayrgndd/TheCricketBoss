// nav-loader.js
// Smooth loader for Top & Bottom Nav — for logged-in pages only

const { createClient } = supabase;
const SUPABASE_URL = "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- LOAD TOP NAV ----
export async function loadTopNav(topNavId) {
  const topNavEl = document.getElementById(topNavId);
  if (!topNavEl) return;

  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session?.user) throw new Error("No active session");

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("username, xp, coins, cash")
      .eq("id", session.user.id)
      .single();

    if (profileError) throw profileError;

    topNavEl.innerHTML = `
      <div class="top-bar fade-in">
        <span class="top-username">${profile.username}</span>
        <span class="top-xp">XP: ${profile.xp}</span>
        <span class="top-coins">💰 ${profile.coins}</span>
        <span class="top-cash">🏦 ${profile.cash}</span>
      </div>
    `;
  } catch (err) {
    console.error("Top nav load failed:", err);
  }
}

// ---- LOAD BOTTOM NAV ----
export function loadBottomNav(bottomNavId) {
  const bottomNavEl = document.getElementById(bottomNavId);
  if (!bottomNavEl) return;

  const currentPage = window.location.pathname.split("/").pop();

  bottomNavEl.innerHTML = `
    <div class="bottom-bar fade-in">
      <a href="team.html" ${currentPage === "team.html" ? 'class="active"' : ''}>🏏 Team</a>
      <a href="scout.html" ${currentPage === "scout.html" ? 'class="active"' : ''}>🔍 Scout</a>
      <a href="home.html" ${currentPage === "home.html" ? 'class="active"' : ''}>🏠 Home</a>
      <a href="auction.html" ${currentPage === "auction.html" ? 'class="active"' : ''}>📦 Auction</a>
      <a href="store.html" ${currentPage === "store.html" ? 'class="active"' : ''}>🛒 Store</a>
    </div>
  `;
}

// ---- STYLES ----
document.head.insertAdjacentHTML("beforeend", `
  <style>
    .fade-in { opacity: 0; animation: fadeIn 0.3s ease-in forwards; }
    @keyframes fadeIn { to { opacity: 1; } }
    .top-bar, .bottom-bar { display: flex; justify-content: space-around; padding: 8px; }
    .bottom-bar a { text-decoration: none; color: inherit; padding: 6px 8px; border-radius: 4px; }
    .bottom-bar a.active { background-color: rgba(255,255,255,0.15); }
  </style>
`);
