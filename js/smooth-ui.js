// js/smooth-ui.js
import { loadNav } from './nav-loader.js';

/**
 * Loads navs then fades them in and sets body padding so content does not hide under fixed bars.
 * @param {string} topId element ID for top nav container (default 'top-nav')
 * @param {string} bottomId element ID for bottom nav container (default 'bottom-nav')
 */
export async function loadSmoothUI(topId = 'top-nav', bottomId = 'bottom-nav') {
  try {
    const result = await loadNav(topId, bottomId);
    const topEl = result?.topEl ?? document.getElementById(topId);
    const bottomEl = result?.bottomEl ?? document.getElementById(bottomId);

    // Fade in
    [topEl, bottomEl].forEach((el) => {
      if (!el) return;
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.28s ease';
      // ensure next frame then set to 1
      requestAnimationFrame(() => (el.style.opacity = '1'));
    });

    // Ensure content not hidden under fixed navs
    // Give it a tick to ensure offsetHeight is calculated correctly.
    await new Promise((r) => setTimeout(r, 40));
    const topH = topEl?.offsetHeight || 56;
    const bottomH = bottomEl?.offsetHeight || 56;
    // Only set padding if not already set (so we don't override page-specific layout)
    if (!document.body.style.paddingTop || document.body.style.paddingTop === '0px') {
      document.body.style.paddingTop = `${topH}px`;
    }
    if (!document.body.style.paddingBottom || document.body.style.paddingBottom === '0px') {
      document.body.style.paddingBottom = `${bottomH}px`;
    }
  } catch (err) {
    console.error('smooth-ui load failed:', err);
  }
}
