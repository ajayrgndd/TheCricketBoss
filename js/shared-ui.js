// shared-ui.js

// XP → Level mapping
export function getManagerLevel(xp) {
  if (xp >= 13500) return "The Boss";
  if (xp >= 8500) return "Ultimate";
  if (xp >= 5500) return "World Class";
  if (xp >= 3500) return "Supreme";
  if (xp >= 1750) return "Master";
  if (xp >= 750) return "Professional";
  if (xp >= 250) return "Expert";
  return "Beginner";
}

// Add XP to manager
export async function addManagerXP(supabase, userId, eventKey) {
  const XP_REWARDS = {
    daily_login: 10,
    scout_player: 10,
    league_win: 20,
    league_draw: 15,
    league_loss: 10,
    training_done: 20,
    auction_buy: 20,
    auction_sell: 20,
    skill1_unlock: 50,
    skill2_unlock: 100,
    stadium_lvl2: 50,
    stadium_lvl3: 75,
    stadium_lvl4: 100,
    lvl_up_trainee: 20,
    lvl_up_domestic: 30,
    lvl_up_professional: 40,
    lvl_up_national: 50,
    lvl_up_supreme: 60,
    lvl_up_worldclass: 70,
    lvl_up_titan: 80,
    lvl_up_boss: 90
  };

  const xpToAdd = XP_REWARDS[eventKey] || 0;
  if (xpToAdd === 0) return;

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("xp")
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.error("❌ XP Fetch Error:", fetchError.message);
    return;
  }

  const newXP = (profile?.xp || 0) + xpToAdd;
  const newLevel = getManagerLevel(newXP);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ xp: newXP, level: newLevel })
    .eq("user_id", userId);

  if (updateError) {
    console.error("❌ XP Update Error:", updateError.message);
  } else {
    console.log(`✅ XP +${xpToAdd} → ${newXP} (${newLevel})`);
    updateTopbarXPLevel(newXP, newLevel);
  }
}

// Optional: update UI top bar
function updateTopbarXPLevel(xp, level) {
  const xpSpan = document.getElementById("xp");
  const levelSpan = document.getElementById("manager-level");
  if (xpSpan) xpSpan.innerText = xp;
  if (levelSpan) levelSpan.innerText = `Level: ${level}`;
}

// Load top and bottom bars
export function loadSharedUI({ supabase, manager_name, xp, coins, cash }) {
  // Top bar
  const topBar = document.createElement("div");
  topBar.className = "top-bar";
  topBar.innerHTML = `
    <div class="top-left">
      <img src="assets/logo.png" alt="Logo" style="height:28px;" />
      <div class="manager-name" id="managerName">
        <span id="managerLabel"><a href="myprofile.html">${manager_name} ▼</a></span>
        <div class="popup-menu" id="popupMenu">
          <button id="logoutBtn">Logout</button>
        </div>
      </div>
    </div>
    <div>
      XP: <span id="xp">${xp}</span> |
      🪙 <span id="coins">${coins}</span> |
      💵 ₹<span id="cash">${cash}</span> |
      <span id="manager-level">${getManagerLevel(xp)}</span>
      <span class="top-notification">
  🔔 <span id="notification-count" style="color: yellow; font-weight: bold;">0</span>
  <div id="notification-dropdown" class="notification-dropdown" hidden>
    <ul id="notification-list"></ul>
  </div>
</span>
    </div>
  `;
  document.body.prepend(topBar);

  // Bottom bar
  const bottomBar = document.createElement("div");
  bottomBar.className = "bottom-nav";
  bottomBar.innerHTML = `
    <a href="team.html">🏏 Team</a>
    <a href="scout.html">🔍 Scout</a>
    <a href="home.html">🏠 Home</a>
    <a href="auction.html">⚒️ Auction</a>
    <a href="store.html">🛒 Store</a>
  `;
  document.body.appendChild(bottomBar);

  // Dropdown menu
  const dropdown = document.getElementById("managerName");
  const popup = document.getElementById("popupMenu");

  dropdown.addEventListener("click", () => {
    popup.style.display = popup.style.display === "flex" ? "none" : "flex";
  });

  window.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      popup.style.display = "none";
    }
  });

  // Logout handler
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    }
  });
}

