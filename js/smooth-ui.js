// smooth-ui.js
export async function loadSmoothUI(topNavId, bottomNavId) {
  try {
    // Fetch top and bottom nav HTML files
    const [topRes, bottomRes] = await Promise.all([
      fetch('components/top-nav.html'),
      fetch('components/bottom-nav.html')
    ]);

    if (!topRes.ok || !bottomRes.ok) {
      throw new Error('Failed to fetch navigation HTML files');
    }

    const topHtml = await topRes.text();
    const bottomHtml = await bottomRes.text();

    // Inject and fade-in Top Nav
    const topNav = document.getElementById(topNavId);
    if (topNav) {
      topNav.style.opacity = '0';
      topNav.innerHTML = topHtml;
      requestAnimationFrame(() => {
        topNav.style.transition = 'opacity 0.3s ease';
        topNav.style.opacity = '1';
      });
    }

    // Inject and fade-in Bottom Nav
    const bottomNav = document.getElementById(bottomNavId);
    if (bottomNav) {
      bottomNav.style.opacity = '0';
      bottomNav.innerHTML = bottomHtml;
      requestAnimationFrame(() => {
        bottomNav.style.transition = 'opacity 0.3s ease';
        bottomNav.style.opacity = '1';
      });
    }
 // Add padding to content so it doesn't hide under fixed navs
    const topNavHeight = topNav.offsetHeight || 60; // fallback height
    const bottomNavHeight = bottomNav.offsetHeight || 60;
    document.body.style.paddingTop = `${topNavHeight}px`;
    document.body.style.paddingBottom = `${bottomNavHeight}px`;

    console.log('✅ Smooth UI loaded successfully');
  } catch (error) {
    console.error('❌ Error loading Smooth UI:', error);
  }
}
