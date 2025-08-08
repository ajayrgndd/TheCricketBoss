// smooth-ui.js
export async function loadSmoothUI(topNavId, bottomNavId) {
  // Fetch HTML fragments for top nav and bottom nav
  const [topRes, bottomRes] = await Promise.all([
    fetch('components/top-nav.html'),
    fetch('components/bottom-nav.html')
  ]);

  const topHtml = await topRes.text();
  const bottomHtml = await bottomRes.text();

  // Smooth fade-in for top nav
  const topNav = document.getElementById(topNavId);
  topNav.style.opacity = '0';
  topNav.innerHTML = topHtml;
  requestAnimationFrame(() => {
    topNav.style.transition = 'opacity 0.3s ease';
    topNav.style.opacity = '1';
  });

  // Smooth fade-in for bottom nav
  const bottomNav = document.getElementById(bottomNavId);
  bottomNav.style.opacity = '0';
  bottomNav.innerHTML = bottomHtml;
  requestAnimationFrame(() => {
    bottomNav.style.transition = 'opacity 0.3s ease';
    bottomNav.style.opacity = '1';
  });
}
