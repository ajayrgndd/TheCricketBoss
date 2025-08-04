// ✅ shared-ui.js
export function loadSharedUI({ manager_name, xp, coins, cash }) {
  const supabase = window.supabase;

  // === XP SYSTEM ===
  const XP_REWARDS = {
    daily_login: 10,
    scout_player: 10,
    // More will be added later
  };

  function getManagerLevel(xp) {
    if (xp >= 13500) return "The Boss";
    if (xp >= 8500) return "Ultimate";
    if (xp >= 5500) return "World Class";
    if (xp >= 3500) return "Supreme";
    if (xp >= 1750) return "Master";
    if (xp >= 750) return "Professional";
    if (xp >= 250) return "Expert";
    return "Beginner";
  }

  async function addManagerXP(userId, eventKey) {
  const xpToAdd = XP_REWARDS[eventKey] || 0;
  if (xpToAdd === 0) return;

  // Get current XP
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("xp")
    .eq("user_id", userId)   // ✅ Corrected
    .single();

  if (fetchError) {
    console.error("❌ XP Fetch Error:", fetchError.message);
    return;
  }

  const newXP = (profile?.xp || 0) + xpToAdd;
  const newLevel = getManagerLevel(newXP);

  // Update XP and level
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ xp: newXP, level: newLevel })
    .eq("user_id", userId);   // ✅ Corrected

  if (updateError) {
    console.error("❌ XP Update Error:", updateError.message);
  } else {
    console.log(`✅ XP +${xpToAdd} → ${newXP} (${newLevel})`);
    updateTopbarXPLevel(newXP, newLevel);
  }
}

  function updateTopbarXPLevel(xp, level) {
    const xpSpan = document.getElementById("xp-count");
    const lvlSpan = document.getElementById("manager-level");
    if (xpSpan) xpSpan.innerText = `XP: ${xp}`;
    if (lvlSpan) lvlSpan.innerText = `Level: ${level}`;
  }

  // === TOP BAR ===
  const topBar = document.createElement("div");
  topBar.className = "top-bar";
  topBar.innerHTML = `
    <div class="top-left">
      <img src="assets/logo.png" alt="Logo" style="height:28px;" />
      <div class="manager-name" id="managerName">
        <span id="managerLabel">
          <a href="myprofile.html">${manager_name} ▼</a>
        </span>
        <div class="popup-menu" id="popupMenu">
          <button id="logoutBtn">Logout</button>
        </div>
      </div>
    </div>
    <div>
      XP: <span id="xp-count">${xp}</span> |
      🪙 <span id="coins">${coins}</span> |
      💵 ₹<span id="cash">${cash}</span> |
      <span id="manager-level">Level: ${getManagerLevel(xp)}</span>
    </div>
  `;
  document.body.prepend(topBar);

  // === BOTTOM NAV ===
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

  // === MENU TOGGLE ===
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

  // === LOGOUT ===
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    }
  });

  // === Expose globally for other modules ===
  window.addManagerXP = addManagerXP;
  window.getManagerLevel = getManagerLevel;
  window.updateTopbarXPLevel = updateTopbarXPLevel;
}



