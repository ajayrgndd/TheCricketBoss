// shared-ui.js
export function renderHeaderFooter({ xp = 0, coins = 0, cash = 0, manager = "Manager" } = {}) {
  const topHTML = `
    <div class="top-bar">
      <div class="top-left">
        <img src="assets/logo.png" alt="Logo" />
        <div class="manager-name" id="managerName">
          <span id="managerLabel"><a href="myprofile.html">${manager} ▼</a></span>
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
    </div>`;

  const bottomHTML = `
    <div class="bottom-nav">
      <a href="team.html">🏏 Team</a>
      <a href="scout.html">🔍 Scout</a>
      <a href="home.html"><strong>🏠 Home</strong></a>
      <a href="auction.html">⚒️ Auction</a>
      <a href="store.html">🛒 Store</a>
    </div>`;

  document.body.insertAdjacentHTML("afterbegin", topHTML);
  document.body.insertAdjacentHTML("beforeend", bottomHTML);

  const dropdown = document.getElementById("managerName");
  const popup = document.getElementById("popupMenu");
  dropdown.addEventListener("click", () => {
    popup.style.display = popup.style.display === "flex" ? "none" : "flex";
  });

  window.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) popup.style.display = "none";
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    const supabase = window.supabaseClient;
    if (supabase) {
      await supabase.auth.signOut();
      location.href = "login.html";
    }
  });
}
