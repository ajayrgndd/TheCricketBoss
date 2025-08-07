export function loadSharedUI(user) {
  // Top bar
  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.innerHTML = `
    <span id="username">${user.username}</span>
    <span id="xp">XP: ${user.xp}</span>
    <span id="coins">💰 ${user.coins}</span>
    <span id="cash">₹${user.cash}</span>
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
}
