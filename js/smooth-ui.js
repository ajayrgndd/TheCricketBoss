// smooth-ui.js
export async function loadSmoothUI(topNavId, bottomNavId) {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', async () => {
    const topNav = document.getElementById(topNavId);
    const bottomNav = document.getElementById(bottomNavId);

    if (!topNav || !bottomNav) {
      console.error("Top or Bottom nav container not found.");
      return;
    }

    // Fetch HTML fragments for top nav and bottom nav
    const [topRes, bottomRes] = await Promise.all([
      fetch('components/top-nav.html'),
      fetch('components/bottom-nav.html')
    ]);

    const topHtml = await topRes.text();
    const bottomHtml = await bottomRes.text();

    // Smooth fade-in for top nav
    topNav.style.opacity = '0';
    topNav.innerHTML = topHtml;
    requestAnimationFrame(() => {
      topNav.style.transition = 'opacity 0.3s ease';
      topNav.style.opacity = '1';
    });

    // Smooth fade-in for bottom nav
    bottomNav.style.opacity = '0';
    bottomNav.innerHTML = bottomHtml;
    requestAnimationFrame(() => {
      bottomNav.style.transition = 'opacity 0.3s ease';
      bottomNav.style.opacity = '1';
    });

    // Add padding to content so it doesn't hide under fixed navs
    const topNavHeight = topNav.offsetHeight || 60; // fallback height
    const bottomNavHeight = bottomNav.offsetHeight || 60;
    document.body.style.paddingTop = `${topNavHeight}px`;
    document.body.style.paddingBottom = `${bottomNavHeight}px`;
  });
}
