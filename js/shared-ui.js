// shared-ui.js
// Patched full version to:
//  - remove translucent shade / circle behind each icon
//  - normalize icon sizes so XP, Coin, Cash, Inbox images render equally
//  - darken top and bottom nav backgrounds
// Exports retained: getManagerLevel, addManagerXP, loadSharedUI
// Assets expected (unchanged):
//  - assets/logo.png
//  - assets/resources/xp.png
//  - assets/resources/coin.png
//  - assets/resources/cash.png
//  - assets/resources/inbox.png

// -------------------------------
// XP → Level mapping
// -------------------------------
export function getManagerLevel(xp) {
  if (xp >= 13500) return "The Boss";
  if (xp >= 8500) return "Ultimate";
  if (xp >= 5500) return "World Class";
  if (xp >= 3500) return "Supreme";
  if (xp >= 1750) return "Master";
  if (xp >= 750) return "Professional";
  if (xp >= 250) return "Expert";
  return "Beginner";
}

// -------------------------------
// Add XP to manager
// -------------------------------
export async function addManagerXP(supabase, userId, eventKey) {
  const XP_REWARDS = {
    daily_login: 10,
    scout_player: 10,
    league_win: 20,
    league_draw: 15,
    league_loss: 10,
    training_done: 20,
    auction_buy: 20,
    auction_sell: 20,
    skill1_unlock: 50,
    skill2_unlock: 100,
    stadium_lvl2: 50,
    stadium_lvl3: 75,
    stadium_lvl4: 100,
    lvl_up_trainee: 20,
    lvl_up_domestic: 30,
    lvl_up_professional: 40,
    lvl_up_national: 50,
    lvl_up_supreme: 60,
    lvl_up_worldclass: 70,
    lvl_up_titan: 80,
    lvl_up_boss: 90
  };

  const xpToAdd = XP_REWARDS[eventKey] || 0;
  if (xpToAdd === 0) return;

  try {
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("xp")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("❌ XP Fetch Error:", fetchError.message);
      return;
    }

    const newXP = (profile?.xp || 0) + xpToAdd;
    const newLevel = getManagerLevel(newXP);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ xp: newXP, level: newLevel })
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ XP Update Error:", updateError.message);
    } else {
      console.log(`✅ XP +${xpToAdd} → ${newXP} (${newLevel})`);
      updateTopbarXPLevel(newXP, newLevel);
    }
  } catch (err) {
    console.error("Exception in addManagerXP:", err);
  }
}

// -------------------------------
// UI Updaters
// -------------------------------
function updateTopbarXPLevel(xp, level) {
  const levelEl = document.getElementById("manager-level");
  const xpHiddenEl = document.getElementById("xp"); // xp is hidden in UI but kept for programmatic access
  if (xpHiddenEl) xpHiddenEl.innerText = xp;
  if (levelEl) levelEl.innerText = level;
}
function updateTopbarCoins(value) {
  const coinsEl = document.getElementById("coins");
  if (coinsEl) coinsEl.innerText = formatCompactNumber(value);
}
function updateTopbarCash(value) {
  const cashEl = document.getElementById("cash");
  if (cashEl) cashEl.innerText = formatCompactNumber(value);
}

// -------------------------------
// Navigation helper
// -------------------------------
function goTo(url) { window.location.href = url; }

// -------------------------------
// Helpers
// -------------------------------
function formatCompactNumber(n) {
  const num = Number(n || 0);
  if (isNaN(num)) return '0';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>"'`=\/]/g, function (s) {
    return ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;"
    })[s];
  });
}
function safeTrimName(name) {
  try {
    return String(name || "").trim().slice(0, 80);
  } catch {
    return String(name || "");
  }
}

// Split manager name: first word on first row, remaining on next row (if any)
function splitManagerName(displayName) {
  const safe = safeTrimName(displayName);
  if (!safe) return { first: "Name", rest: "" };
  const parts = safe.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], rest: "" };
  const first = parts[0];
  const rest = parts.slice(1).join(' ');
  return { first, rest };
}

// -------------------------------
// Main loader: injects top bar & bottom nav
// -------------------------------
export async function loadSharedUI({ supabase, manager_name, xp = 0, coins = 0, cash = 0, user_id }) {
  // remove duplicates if re-initialized
  const existingTop = document.querySelector(".tcb-topbar-container");
  if (existingTop) existingTop.remove();
  const existingBottom = document.querySelector(".tcb-bottomnav");
  if (existingBottom) existingBottom.remove();

  // compute manager level label (only level name shown)
  const levelText = getManagerLevel(Number(xp || 0));

  // prepare manager name split
  const { first: nameFirst, rest: nameRest } = splitManagerName(manager_name);

  // create top bar wrapper
  const topBarWrap = document.createElement("div");
  topBarWrap.className = "tcb-topbar-container";
  topBarWrap.setAttribute("role", "banner");

  // Inline css block (updates: removed translucent circle, fixed icon sizes, darker backgrounds)
  const inlineStyleId = "tcb-inline-shared-styles";
  if (!document.getElementById(inlineStyleId)) {
    const style = document.createElement("style");
    style.id = inlineStyleId;
    style.innerHTML = `
      .tcb-topbar-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 64px;
        /* darker blue */
        background: linear-gradient(90deg,#203e6f,#1c3562);
        color: #fff;
        display: flex;
        align-items: center;
        z-index: 9999;
        box-shadow: 0 6px 18px rgba(0,0,0,0.16);
        padding: 6px 12px;
        box-sizing: border-box;
      }
      .tcb-topbar-inner {
        display:flex;
        align-items:center;
        gap:12px;
        width:100%;
        max-width:1280px;
        margin:0 auto;
      }
      .tcb-left {
        display:flex;
        align-items:center;
        gap:10px;
        flex:0 0 auto;
      }
      .tcb-logo { height:56px; width:auto; border-radius:4px; display:block; }
      .tcb-manager {
        display:flex;
        flex-direction:column;
        line-height:1;
      }
      .tcb-manager .line1 { font-size:14px; font-weight:700; } /* reduced */
      .tcb-manager .line2 { font-size:13px; font-weight:700; margin-top:2px; opacity:0.95; }
      .tcb-stats {
        display:flex;
        align-items:center;
        gap:12px;
        margin-left:auto;
        flex:0 0 auto;
      }

      /* stat tile (no translucent shade) */
      .tcb-stat {
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        width:64px;
        height:56px;
        border-radius:10px;
        background: transparent; /* removed shade behind icon */
        border: none;
        cursor: pointer;
        padding:4px 6px;
        box-sizing: border-box;
        position: relative;
      }
      /* enforce equal icon size for all tiles */
      .tcb-stat img {
        width:28px;
        height:28px;
        object-fit:contain;
        display:block;
      }

      /* yellow bold texts under icons */
      .tcb-stat .tcb-stat-text { font-size:12px; margin-top:6px; color: #ffd54f; font-weight:800; text-align:center; }
      .tcb-stat .tcb-stat-sub { font-size:11px; margin-top:3px; color: #ffd54f; font-weight:800; display:block; text-align:center; }

      /* inbox dot */
      .tcb-unread-dot { position:absolute; top:8px; right:10px; display:none; width:10px; height:10px; border-radius:50%; background:#e53935; border:2px solid rgba(0,0,0,0.25); }

      /* bottom nav uses same darker combos as top */
      .tcb-bottomnav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 64px;
        background: linear-gradient(90deg,#203e6f,#1c3562);
        display:flex;
        align-items:center;
        justify-content:space-around;
        gap:6px;
        box-shadow: 0 -6px 22px rgba(0,0,0,0.18);
        z-index: 9998;
      }
      .tcb-bottomnav a {
        color: #fff;
        text-decoration:none;
        font-weight:700;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:4px;
        font-size:13px;
      }

      /* responsive: ensure all 4 tiles visible on small screens (shrink icons & tiles) */
      @media (max-width:720px) {
        .tcb-logo { height:48px; }
        .tcb-manager .line1 { font-size:13px; }
        .tcb-manager .line2 { font-size:12px; }
        .tcb-stat { width:56px; height:52px; }
        .tcb-stat img { width:24px; height:24px; }
        body { padding-top:84px; padding-bottom:84px; }
      }
      @media (max-width:420px) {
        .tcb-logo { height:44px; }
        .tcb-manager .line1 { font-size:12px; }
        .tcb-manager .line2 { font-size:11px; }
        .tcb-stat { width:52px; height:48px; }
        .tcb-stat img { width:22px; height:22px; }
        body { padding-top:94px; padding-bottom:94px; }
      }
      .tcb-stat:focus { outline: 2px solid rgba(255,213,79,0.18); outline-offset:2px; }
    `;
    document.head.appendChild(style);
  }

  // Build HTML (no translucent circles; icons are same size)
  topBarWrap.innerHTML = `
    <div class="tcb-topbar-inner" role="presentation">
      <div class="tcb-left">
        <img id="tcb-logo" class="tcb-logo" src="assets/logo.png" alt="The Cricket Boss" />
        <div class="tcb-manager" id="tcb-manager">
          <span class="line1">${escapeHtml(nameFirst)}</span>
          <span class="line2">${escapeHtml(nameRest)}</span>
        </div>
      </div>

      <div class="tcb-stats" id="tcb-stats">
        <!-- XP Tile: show only level name -->
        <button class="tcb-stat" id="xpTile" title="Level" aria-label="Manager level">
          <img src="assets/resources/xp.png" alt="XP" />
          <span id="manager-level" class="tcb-stat-text">${escapeHtml(levelText)}</span>
        </button>

        <!-- Coin Tile -->
        <button class="tcb-stat" id="coinTile" title="Coins" aria-label="Coins">
          <img src="assets/resources/coin.png" alt="Coins" />
          <span id="coins" class="tcb-stat-text">${escapeHtml(formatCompactNumber(coins))}</span>
        </button>

        <!-- Cash Tile -->
        <button class="tcb-stat" id="cashTile" title="Virtual Cash" aria-label="Virtual cash">
          <img src="assets/resources/cash.png" alt="Cash" />
          <span id="cash" class="tcb-stat-text">${escapeHtml(formatCompactNumber(cash))}</span>
        </button>

        <!-- Inbox Tile: icon + small text below -->
        <button class="tcb-stat" id="inboxTile" title="Inbox" aria-label="Inbox" style="position:relative;">
          <img src="assets/resources/inbox.png" alt="Inbox" />
          <span class="tcb-stat-sub" id="inboxText">Inbox</span>
          <span id="unreadDot" class="tcb-unread-dot"></span>
        </button>
      </div>
    </div>
  `;

  // prepend to body
  document.body.prepend(topBarWrap);

  // Bottom nav: same darker color combos (gradient) - uses inline links/icons/text
  const bottomBar = document.createElement("nav");
  bottomBar.className = "tcb-bottomnav";
  bottomBar.setAttribute("role", "navigation");
  bottomBar.setAttribute("aria-label", "Main Navigation");
  bottomBar.innerHTML = `
    <a href="team.html" aria-label="Team"><div style="font-size:20px">🏏</div><div>Team</div></a>
    <a href="scout.html" aria-label="Scout"><div style="font-size:20px">🔍</div><div>Scout</div></a>
    <a href="home.html" aria-label="Home"><div style="font-size:20px">🏠</div><div>Home</div></a>
    <a href="auction.html" aria-label="Auction"><div style="font-size:20px">⚒️</div><div>Auction</div></a>
    <a href="store.html" aria-label="Store"><div style="font-size:20px">🛒</div><div>Store</div></a>
  `;
  document.body.appendChild(bottomBar);

  // Wire tile clicks (coin & cash -> store.html)
  document.getElementById("xpTile")?.addEventListener("click", () => goTo("profile.html"));
  document.getElementById("coinTile")?.addEventListener("click", () => goTo("store.html"));
  document.getElementById("cashTile")?.addEventListener("click", () => goTo("store.html"));
  document.getElementById("inboxTile")?.addEventListener("click", () => goTo("inbox.html"));

  // Manager name dropdown popup (minimal)
  let popupMenu = document.getElementById("tcb-popup-menu");
  if (!popupMenu) {
    popupMenu = document.createElement("div");
    popupMenu.id = "tcb-popup-menu";
    popupMenu.style.position = "absolute";
    popupMenu.style.top = "72px";
    popupMenu.style.left = "12px";
    popupMenu.style.background = "#fff";
    popupMenu.style.color = "#222";
    popupMenu.style.padding = "8px";
    popupMenu.style.borderRadius = "8px";
    popupMenu.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
    popupMenu.style.display = "none";
    popupMenu.innerHTML = `<button id="logoutBtn" style="background:none;border:none;color:#222;font-weight:700;cursor:pointer;">Logout</button>`;
    document.body.appendChild(popupMenu);
  }

  // toggle popup when clicking manager name area
  const managerBlock = document.getElementById("tcb-manager");
  managerBlock?.addEventListener("click", (e) => {
    e.stopPropagation();
    popupMenu.style.display = popupMenu.style.display === "flex" ? "none" : "flex";
  });

  // close popup when clicking outside
  window.addEventListener("click", (e) => {
    if (!popupMenu) return;
    if (!popupMenu.contains(e.target) && !managerBlock.contains(e.target)) {
      popupMenu.style.display = "none";
    }
  });

  // logout handler
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (supabase && supabase.auth) {
        try { await supabase.auth.signOut(); } catch (err) { console.warn("Sign out error:", err); }
      }
      window.location.href = "login.html";
    });
  }

  // Fetch unread inbox count (supabase)
  if (supabase && user_id) {
    try {
      const { data, error } = await supabase
        .from("inbox")
        .select("id", { count: "exact" })
        .eq("receiver_id", user_id)
        .eq("read_status", false);

      if (!error && Array.isArray(data)) {
        const count = data.length;
        const dot = document.getElementById("unreadDot");
        const inboxText = document.getElementById("inboxText");
        if (count > 0) {
          if (dot) dot.style.display = "block";
          if (inboxText) {
            inboxText.innerText = `${count}`;
            inboxText.style.color = "#ffd54f";
            inboxText.style.fontWeight = "800";
          }
        } else {
          if (dot) dot.style.display = "none";
          if (inboxText) {
            inboxText.innerText = "Inbox";
            inboxText.style.color = "#ffd54f";
            inboxText.style.fontWeight = "800";
          }
        }
      }
    } catch (err) {
      console.error("Inbox count fetch failed:", err);
    }
  } else {
    // If no supabase, still set Inbox label styling
    const inboxText = document.getElementById("inboxText");
    if (inboxText) {
      inboxText.style.color = "#ffd54f";
      inboxText.style.fontWeight = "800";
    }
  }

  // Ensure coins/cash elements are available for external updates
  const coinsEl = document.getElementById("coins");
  const cashEl = document.getElementById("cash");
  if (coinsEl) coinsEl.innerText = formatCompactNumber(coins || 0);
  if (cashEl) cashEl.innerText = formatCompactNumber(cash || 0);

  // set level hidden xp element for programmatic updates (kept hidden)
  let xpHidden = document.getElementById("xp");
  if (!xpHidden) {
    xpHidden = document.createElement("div");
    xpHidden.id = "xp";
    xpHidden.style.display = "none";
    xpHidden.innerText = String(xp || 0);
    topBarWrap.appendChild(xpHidden);
  } else {
    xpHidden.innerText = String(xp || 0);
  }

  // Accessibility labels
  document.getElementById("xpTile")?.setAttribute("aria-label", `Level ${escapeHtml(levelText)}`);
  document.getElementById("coinTile")?.setAttribute("aria-label", `Coins ${formatCompactNumber(coins || 0)}`);
  document.getElementById("cashTile")?.setAttribute("aria-label", `Virtual cash ${formatCompactNumber(cash || 0)}`);
  document.getElementById("inboxTile")?.setAttribute("aria-label", `Inbox`);

  // Expose small API on window for runtime updates (optional convenience)
  if (!window.tcbSharedUI) window.tcbSharedUI = {};
  window.tcbSharedUI.updateCoins = updateTopbarCoins;
  window.tcbSharedUI.updateCash = updateTopbarCash;
  window.tcbSharedUI.updateLevel = updateTopbarXPLevel;
}
