// js/shared-ui-stadium.js
export function loadSharedUI() {
  // Top Bar
  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.innerHTML = `
    <div class="top-bar-content">
      <span id="username">Manager</span>
      <span id="xp">XP: 0</span>
      <span id="coins">Coins: 0</span>
      <span id="cash">Cash: ₹0</span>
    </div>
  `;
  document.body.prepend(topBar);

  // Bottom Nav Bar
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
}
