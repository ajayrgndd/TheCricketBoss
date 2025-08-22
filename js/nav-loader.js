// /js/nav-loader.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Load top & bottom nav, fill user info from profiles (user_id), mark active link.
 * It expects containers with ids: #top-nav and #bottom-nav (creates them if missing).
 */
export async function loadNav(topId = 'top-nav', bottomId = 'bottom-nav') {
  if (document.readyState === 'loading') {
    await new Promise((res) => document.addEventListener('DOMContentLoaded', res, { once: true }));
  }

  // Ensure containers exist
  let topEl = document.getElementById(topId);
  if (!topEl) { topEl = document.createElement('div'); topEl.id = topId; document.body.prepend(topEl); }
  let bottomEl = document.getElementById(bottomId);
  if (!bottomEl) { bottomEl = document.createElement('div'); bottomEl.id = bottomId; document.body.appendChild(bottomEl); }

  // Fetch components (use relative paths so it works under subfolders too)
  let topHtml, bottomHtml;
  try {
    const [tRes, bRes] = await Promise.all([
      fetch('components/top-nav.html'),
      fetch('components/bottom-nav.html')
    ]);
    topHtml = tRes.ok ? await tRes.text() : null;
    bottomHtml = bRes.ok ? await bRes.text() : null;
  } catch { /* ignored */ }

  if (!topHtml) topHtml = getDefaultTopHtml();
  if (!bottomHtml) bottomHtml = getDefaultBottomHtml();

  // Inject (no nested duplicate IDs — component no longer has id="top-nav")
  topEl.innerHTML = topHtml;
  bottomEl.innerHTML = bottomHtml;

  // Auth / profile fill (skip redirect on public pages if needed)
  const publicPages = new Set(['login.html', 'signup.html', 'index.html']);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const current = (location.pathname.split('/').pop() || 'home.html').toLowerCase();

    if (!user && !publicPages.has(current)) {
      location.href = 'login.html';
      return { topEl, bottomEl };
    }

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('manager_name, xp, coins, cash')
        .eq('user_id', user.id)
        .maybeSingle();

      document.getElementById('nav-username')?.append(document.createTextNode(''));
      if (profile) {
        const nameEl = document.getElementById('nav-username');
        const xpEl = document.getElementById('nav-xp');
        const coinsEl = document.getElementById('nav-coins');
        const cashEl = document.getElementById('nav-cash');

        if (nameEl) nameEl.textContent = profile.manager_name ?? 'Manager';
        if (xpEl) xpEl.textContent = `XP: ${profile.xp ?? 0}`;
        if (coinsEl) coinsEl.textContent = `Coins: ${profile.coins ?? 0}`;
        if (cashEl) cashEl.textContent = `Cash: ${profile.cash ?? 0}`;
      }
    }
  } catch (e) {
    console.warn('Auth/profile fetch failed', e);
  }

  // Mark active bottom link (ignore query/hash, handle subpaths)
  try {
    const current = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
    bottomEl.querySelectorAll('a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('?')[0].split('#')[0].toLowerCase();
      if (href === current || (href === 'index.html' && current === '')) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  } catch {}

  // Add body padding so content doesn’t hide under fixed bars
  await new Promise((r) => setTimeout(r, 20));
  const topH = topEl?.offsetHeight || 48;
  const bottomH = bottomEl?.offsetHeight || 52;
  if (!document.body.style.paddingTop) document.body.style.paddingTop = `${topH}px`;
  if (!document.body.style.paddingBottom) document.body.style.paddingBottom = `${bottomH}px`;

  return { topEl, bottomEl };
}

/* ===== Fallbacks (if component files aren’t found) ===== */

function getDefaultTopHtml() {
  return `
  <div class="top-nav" style="position:fixed;top:0;left:0;right:0;height:48px;background:#1b1b1b;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:0 12px;z-index:1000;border-bottom:1px solid #333;">
    <div class="top-left"><span id="nav-username">Manager</span></div>
    <div class="top-right" style="display:flex;gap:12px;">
      <span id="nav-xp">XP: 0</span>
      <span id="nav-coins">Coins: 0</span>
      <span id="nav-cash">Cash: 0</span>
    </div>
  </div>
  `;
}

function getDefaultBottomHtml() {
  return `
  <div class="bottom-nav" style="position:fixed;bottom:0;left:0;right:0;height:52px;background:#1b1b1b;display:flex;justify-content:space-around;align-items:center;padding:6px 0;z-index:1000;border-top:1px solid #333;">
    <a href="team.html">🏏 Team</a>
    <a href="scout.html">🔍 Scout</a>
    <a href="home.html">🏠 Home</a>
    <a href="auction.html">📦 Auction</a>
    <a href="store.html">🛒 Store</a>
  </div>
  `;
}
