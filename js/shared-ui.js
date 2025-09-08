// shared-ui.js
// Patched full version — exports retained: getManagerLevel, addManagerXP, loadSharedUI
// Uses assets:
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
  const xpEl = document.getElementById("xp");
  const levelEl = document.getElementById("manager-level");
  if (xpEl) xpEl.innerText = xp;
  if (levelEl) levelEl.innerText = level;
}
function updateTopbarCoins(value) {
  const coinsEl = document.getElementById("coins");
  if (coinsEl) coinsEl.innerText = value;
}
function updateTopbarCash(value) {
  const cashEl = document.getElementById("cash");
  if (cashEl) cashEl.innerText = value;
}

// -------------------------------
// Navigation helper
// -------------------------------
function goTo(url) { window.location.href = url; }

// -------------------------------
// Main loader: injects top bar & bottom nav
// Only file changed in this patch.
// -------------------------------
export async function loadSharedUI({ supabase, manager_name, xp = 0, coins = 0, cash = 0, user_id }) {
  // remove duplicates if re-initialized
  const existingTop = document.querySelector(".tcb-topbar-container");
  if (existingTop) existingTop.remove();
  const existingBottom = document.querySelector(".tcb-bottomnav");
  if (existingBottom) existingBottom.remove();

  // compute manager level label (only level name shown)
  const levelText = getManagerLevel(Number(xp || 0));

  // create top bar wrapper with inline styles (keeps change localized to this file)
  const topBarWrap = document.createElement("div");
  topBarWrap.className = "tcb-topbar-container";
  topBarWrap.style.position = "fixed";
  topBarWrap.style.top = "0";
  topBarWrap.style.left = "0";
  topBarWrap.style.right = "0";
  topBarWrap.style.height = "64px";
  topBarWrap.style.background = "#2f5596";
  topBarWrap.style.color = "#fff";
  topBarWrap.style.display = "flex";
  topBarWrap.style.alignItems = "center";
  topBarWrap.style.zIndex = "9999";
  topBarWrap.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
  topBarWrap.style.padding = "6px 12px";
  topBarWrap.style.boxSizing = "border-box";

  // build inner HTML — no label texts (per request). Manager name reduced in size.
  topBarWrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;width:100%;max-width:1280px;margin:0 auto;">
      <div style="display:flex;align-items:center;gap:10px;flex:0 0 auto;">
        <img id="tcb-logo" src="assets/logo.png" alt="The Cricket Boss" style="height:56px;width:auto;border-radius:4px;" />
        <div id="managerName" style="font-size:16px;font-weight:700;">
          <a id="managerProfileLink" href="myprofile.html" style="color:inherit;text-decoration:none;">
            ${manager_name ? escapeHtml(manufacturerSafe(manager_name)) : "Name"} ▼
          </a>
        </div>
      </div>

      <div id="tcb-stats" style="display:flex;align-items:center;gap:14px;margin-left:auto;flex:0 0 auto;">
        <!-- XP Tile: show only level name -->
        <button class="tcb-stat" id="xpTile" title="Level" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;height:64px;border-radius:999px;background:rgba(255,255,255,0.06);border:none;cursor:pointer;padding:6px;">
          <img src="assets/resources/xp.png" alt="XP" style="width:36px;height:36px;object-fit:contain;" />
          <div id="manager-level" style="font-size:11px;margin-top:6px;">${escapeHtml(levelText)}</div>
          <div id="xp" style="display:none;"></div>
        </button>

        <!-- Coin Tile -->
        <button class="tcb-stat" id="coinTile" title="Coins" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;height:64px;border-radius:999px;background:rgba(255,255,255,0.06);border:none;cursor:pointer;padding:6px;">
          <img src="assets/resources/coin.png" alt="Coin" style="width:36px;height:36px;object-fit:contain;" />
          <div id="coins" style="font-size:11px;margin-top:6px;">${Number(coins || 0)}</div>
        </button>

        <!-- Cash Tile -->
        <button class="tcb-stat" id="cashTile" title="Virtual Cash" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;height:64px;border-radius:999px;background:rgba(255,255,255,0.06);border:none;cursor:pointer;padding:6px;">
          <img src="assets/resources/cash.png" alt="Cash" style="width:36px;height:36px;object-fit:contain;" />
          <div id="cash" style="font-size:11px;margin-top:6px;">${Number(cash || 0)}</div>
        </button>

        <!-- Inbox Tile (icon + dot only; numeric hidden unless you prefer) -->
        <button class="tcb-stat" id="inboxTile" title="Inbox" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;height:64px;border-radius:999px;background:rgba(255,255,255,0.06);border:none;cursor:pointer;padding:6px;position:relative;">
          <img src="assets/resources/inbox.png" alt="Inbox" style="width:36px;height:36px;object-fit:contain;" />
          <span id="unreadDot" style="position:absolute; top:8px; right:14px; display:none; width:10px; height:10px; border-radius:50%; background:#e53935; border:2px solid #2f5596;"></span>
        </button>
      </div>
    </div>
  `;

  // prepend to body
  document.body.prepend(topBarWrap);

  // Wire tile clicks (coin & cash -> store.html)
  document.getElementById("xpTile")?.addEventListener("click", () => goTo("profile.html"));
  document.getElementById("coinTile")?.addEventListener("click", () => goTo("store.html"));
  document.getElementById("cashTile")?.addEventListener("click", () => goTo("store.html"));
  document.getElementById("inboxTile")?.addEventListener("click", () => goTo("inbox.html"));

  // Bottom nav (kept minimal as before)
  const bottomBar = document.createElement("div");
  bottomBar.className = "tcb-bottomnav";
  bottomBar.style.position = "fixed";
  bottomBar.style.bottom = "0";
  bottomBar.style.left = "0";
  bottomBar.style.right = "0";
  bottomBar.style.height = "62px";
  bottomBar.style.background = "rgba(255,255,255,0.98)";
  bottomBar.style.display = "flex";
  bottomBar.style.alignItems = "center";
  bottomBar.style.justifyContent = "space-around";
  bottomBar.style.boxShadow = "0 -6px 18px rgba(0,0,0,0.08)";
  bottomBar.style.zIndex = "9998";
  bottomBar.innerHTML = `
    <a href="team.html" style="text-decoration:none;color:#333;font-weight:700;">🏏 Team</a>
    <a href="scout.html" style="text-decoration:none;color:#333;font-weight:700;">🔍 Scout</a>
    <a href="home.html" style="text-decoration:none;color:#333;font-weight:700;">🏠 Home</a>
    <a href="auction.html" style="text-decoration:none;color:#333;font-weight:700;">⚒️ Auction</a>
    <a href="store.html" style="text-decoration:none;color:#333;font-weight:700;">🛒 Store</a>
  `;
  document.body.appendChild(bottomBar);

  // Popup menu for manager (minimal)
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

  // toggle popup when clicking manager name (prevent default nav)
  const managerProfileLink = document.getElementById("managerProfileLink");
  managerProfileLink?.addEventListener("click", (e) => {
    e.preventDefault();
    popupMenu.style.display = popupMenu.style.display === "flex" ? "none" : "flex";
  });

  // close popup when clicking outside
  window.addEventListener("click", (e) => {
    if (!popupMenu) return;
    const target = e.target;
    if (managerProfileLink && (target === managerProfileLink || managerProfileLink.contains(target))) {
      return;
    }
    if (!popupMenu.contains(target)) {
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
        if (count > 0) {
          if (dot) dot.style.display = "block";
        } else {
          if (dot) dot.style.display = "none";
        }
      }
    } catch (err) {
      console.error("Inbox count fetch failed:", err);
    }
  }

  // ensure coins/cash elements are available for external updates
  const coinsEl = document.getElementById("coins");
  const cashEl = document.getElementById("cash");
  if (coinsEl) coinsEl.innerText = Number(coins || 0);
  if (cashEl) cashEl.innerText = Number(cash || 0);
  const levelEl = document.getElementById("manager-level");
  if (levelEl) levelEl.innerText = escapeHtml(levelText);

  // accessibility labels
  document.getElementById("xpTile")?.setAttribute("aria-label", `Level ${levelText}`);
  document.getElementById("coinTile")?.setAttribute("aria-label", `Coins ${coins || 0}`);
  document.getElementById("cashTile")?.setAttribute("aria-label", `Virtual cash ${cash || 0}`);
  document.getElementById("inboxTile")?.setAttribute("aria-label", `Inbox`);

  // ensure body content padding so content not hidden under fixed bars
  if (!document.querySelector("#tcb-shared-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "tcb-shared-style";
    styleEl.innerHTML = `
      body { padding-top: 80px; padding-bottom: 80px; }
      @media (max-width:640px) { body { padding-top: 94px; } }
    `;
    document.head.appendChild(styleEl);
  }
}

// -------------------------------
// Small helper to escape inserted manager name text
// -------------------------------
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

// defensive helper: if manager_name contains strange characters, trim
function manufacturerSafe(name) {
  try {
    return String(name).trim().slice(0, 64); // limit length
  } catch {
    return String(name || "");
  }
}
