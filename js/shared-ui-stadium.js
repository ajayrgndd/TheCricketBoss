// js/shared-ui-stadium.js
export function loadSharedUI() {
  // Top bar
  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.innerHTML = `
    <span id="username">Loading...</span>
    <span id="xp">XP: ${profile.xp}</span>
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
}
