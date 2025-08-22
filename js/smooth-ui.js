// /js/smooth-ui.js
import { loadNav } from './nav-loader.js';

/** Loads navs, fades them in, and sets body padding so content isn’t hidden */
export async function loadSmoothUI(topId = 'top-nav', bottomId = 'bottom-nav') {
  const { topEl, bottomEl } = await loadNav(topId, bottomId);
  [topEl, bottomEl].forEach((el) => {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s ease';
    requestAnimationFrame(() => (el.style.opacity = '1'));
  });
}
