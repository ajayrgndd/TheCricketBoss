// js/nav-loader.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Load top & bottom nav, fill user info from profiles (user_id), mark active link.
 * @param {string} topId id of top nav container (default 'top-nav')
 * @param {string} bottomId id of bottom nav container (default 'bottom-nav')
 * @returns {Promise<{topEl:HTMLElement,bottomEl:HTMLElement}>}
 */
export async function loadNav(topId = 'top-nav', bottomId = 'bottom-nav') {
  // Ensure DOM ready
  if (document.readyState === 'loading') {
    await new Promise((res) => document.addEventListener('DOMContentLoaded', res, { once: true }));
  }

  // Find or create containers (safe)
  let topEl = document.getElementById(topId);
  if (!topEl) {
    topEl = document.createElement('div');
    topEl.id = topId;
    document.body.prepend(topEl);
  }
  let bottomEl = document.getElementById(bottomId);
  if (!bottomEl) {
    bottomEl = document.createElement('div');
    bottomEl.id = bottomId;
    document.body.appendChild(bottomEl);
  }

  // Fetch components; fallback to inline HTML if not available
  let topHtml = null;
  let bottomHtml = null;

  try {
    const [tRes, bRes] = await Promise.all([
      fetch('/components/top-nav.html'),
      fetch('/components/bottom-nav.html')
    ]);

    topHtml = tRes.ok ? await tRes.text() : null;
    bottomHtml = bRes.ok ? await bRes.text() : null;
  } catch (err) {
    console.warn('component fetch failed', err);
  }

  if (!topHtml) topHtml = getDefaultTopHtml();
  if (!bottomHtml) bottomHtml = getDefaultBottomHtml();

  // Inject HTML
  topEl.innerHTML = topHtml;
  bottomEl.innerHTML = bottomHtml;

  // Auth & profile fetch
  try {
    const {
      data: { user },
      error: userErr
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      // Not logged in -> redirect to login.html (your project uses login.html)
      console.warn('No active user session — redirecting to login.html');
      window.location.href = 'login.html';
      return { topEl, bottomEl };
    }

    const userId = user.id;

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('manager_name, xp, coins, cash')
      .eq('user_id', userId)
      .single();

    if (profileErr) {
      console.warn('Profile fetch error:', profileErr.message || profileErr);
    }

    // Populate top bar elements (if present)
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
  } catch (err) {
    console.error('Auth/profile error:', err);
  }

  // Mark active bottom nav link
  try {
    const current = window.location.pathname.split('/').pop() || 'home.html';
    bottomEl.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (href === current || (href === 'index.html' && current === '')) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  } catch (err) {
    console.warn('Active link setup failed', err);
  }

  return { topEl, bottomEl };
}

/* ====== Fallback HTML (used only if /components/* files are missing) ====== */

function getDefaultTopHtml() {
  return `
<div id="top-nav" class="top-nav" style="position:fixed;top:0;left:0;right:0;height:48px;background:#1b1b1b;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:0 12px;z-index:1000;border-bottom:1px solid #333;">
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
  <a href="team.html">Team</a>
  <a href="scout.html">Scout</a>
  <a href="home.html">Home</a>
  <a href="auction.html">Auction</a>
  <a href="store.html">Store</a>
</div>
`;
}
