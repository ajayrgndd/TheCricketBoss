// ✅ shared-ui.js

export function loadSharedUI({ manager_name, xp, coins, cash }) {
  // Create top bar
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
      💵 ₹<span id="cash">${cash}</span>
    </div>
  `;
  document.body.prepend(topBar);

  // Create bottom bar
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

  // Handle popup menu toggle
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

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    const supabase = window.supabase || null;
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    }
  });
}
