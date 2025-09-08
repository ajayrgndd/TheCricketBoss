// shared-ui.js
// Assets used:
// - assets/logo.png
// - assets/resources/xp.png
// - assets/resources/coin.png
// - assets/resources/cash.png
// - assets/resources/inbox.png

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
  const xpHiddenEl = document.getElementById("xp");
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
  return str.replace(/[&<>"'`=\/]/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    "/": "&#x2F;", "`": "&#x60;", "=": "&#x3D;"
  })[s]);
}
function safeTrimName(name) {
  try { return String(name || "").trim().slice(0, 80); }
  catch { return String(name || ""); }
}
function splitManagerName(displayName) {
  const safe = safeTrimName(displayName);
  if (!safe) return { first: "Name", rest: "" };
  const parts = safe.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], rest: "" };
  return { first: parts[0], rest: parts.slice(1).join(" ") };
}

// -------------------------------
// Main loader
// -------------------------------
export async function loadSharedUI({ supabase, manager_name, xp = 0, coins = 0, cash = 0, user_id }) {
  document.querySelector(".tcb-topbar-container")?.remove();
  document.querySelector(".tcb-bottomnav")?.remove();

  const levelText = getManagerLevel(Number(xp || 0));
  const { first: nameFirst, rest: nameRest } = splitManagerName(manager_name);

  // Inject CSS once
  if (!document.getElementById("tcb-inline-shared-styles")) {
    const style = document.createElement("style");
    style.id = "tcb-inline-shared-styles";
    style.innerHTML = `
      .tcb-topbar-container {
        position:fixed;top:0;left:0;right:0;height:64px;
        background:linear-gradient(90deg,#182b4d,#111d3a);
        color:#fff;display:flex;align-items:center;z-index:9999;
        padding:6px 12px;box-sizing:border-box;
        box-shadow:0 4px 14px rgba(0,0,0,0.25);
      }
      .tcb-topbar-inner {
        display:flex;align-items:center;gap:10px;width:100%;max-width:1280px;margin:0 auto;
      }
      .tcb-left {display:flex;align-items:center;gap:8px;}
      .tcb-logo {height:52px;width:auto;}
      .tcb-manager {display:flex;flex-direction:column;line-height:1;}
      .tcb-manager .line1, .tcb-manager .line2 {
        font-size:14px;font-weight:700;cursor:pointer;color:#fff;
      }
      .tcb-stats {display:flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto;}
      .tcb-stat {
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        min-width:54px;padding:2px 4px;border:none;background:transparent;cursor:pointer;
      }
      .tcb-stat img {width:24px;height:24px;object-fit:contain;}
      .tcb-stat .tcb-stat-text,.tcb-stat .tcb-stat-sub {
        font-size:13px;font-weight:700;color:#ffd54f;text-align:center;margin-top:4px;
      }
      .tcb-unread-dot {position:absolute;top:6px;right:8px;width:9px;height:9px;border-radius:50%;
        background:#e53935;display:none;}
      .tcb-bottomnav {
        position:fixed;bottom:0;left:0;right:0;height:64px;
        background:linear-gradient(90deg,#182b4d,#111d3a);
        display:flex;align-items:center;justify-content:space-around;
        box-shadow:0 -4px 14px rgba(0,0,0,0.25);z-index:9998;
      }
      .tcb-bottomnav a {
        color:#fff;text-decoration:none;font-weight:700;display:flex;flex-direction:column;
        align-items:center;font-size:13px;gap:4px;
      }
      @media(max-width:480px){
        .tcb-logo{height:44px;}
        .tcb-stat img{width:22px;height:22px;}
        .tcb-stat .tcb-stat-text,.tcb-stat .tcb-stat-sub{font-size:12px;}
      }
      body{padding-top:74px;padding-bottom:74px;}
    `;
    document.head.appendChild(style);
  }

  // Top Bar
  const topBarWrap = document.createElement("div");
  topBarWrap.className = "tcb-topbar-container";
  topBarWrap.innerHTML = `
    <div class="tcb-topbar-inner">
      <div class="tcb-left">
        <img src="assets/logo.png" alt="The Cricket Boss" class="tcb-logo" />
        <div class="tcb-manager" id="managerName">
          <span class="line1">${escapeHtml(nameFirst)}</span>
          <span class="line2">${escapeHtml(nameRest)}</span>
        </div>
      </div>
      <div class="tcb-stats">
        <button class="tcb-stat" id="xpTile">
          <img src="assets/resources/xp.png" alt="XP" />
          <span id="manager-level" class="tcb-stat-text">${escapeHtml(levelText)}</span>
          <div id="xp" style="display:none">${xp}</div>
        </button>
        <button class="tcb-stat" id="coinTile">
          <img src="assets/resources/coin.png" alt="Coins" />
          <span id="coins" class="tcb-stat-text">${escapeHtml(formatCompactNumber(coins))}</span>
        </button>
        <button class="tcb-stat" id="cashTile">
          <img src="assets/resources/cash.png" alt="Cash" />
          <span id="cash" class="tcb-stat-text">${escapeHtml(formatCompactNumber(cash))}</span>
        </button>
        <button class="tcb-stat" id="inboxTile" style="position:relative;">
          <img src="assets/resources/inbox.png" alt="Inbox" />
          <span id="inboxText" class="tcb-stat-text">Inbox</span>
          <span id="unreadDot" class="tcb-unread-dot"></span>
        </button>
      </div>
    </div>
  `;
  document.body.prepend(topBarWrap);

  // Manager name click → profile page
  document.getElementById("managerName")?.addEventListener("click", () => goTo("myprofile.html"));

  // Wire tile clicks
  document.getElementById("xpTile")?.addEventListener("click", () => goTo("profile.html"));
  document.getElementById("coinTile")?.addEventListener("click", () => goTo("store.html"));
  document.getElementById("cashTile")?.addEventListener("click", () => goTo("store.html"));
  document.getElementById("inboxTile")?.addEventListener("click", () => goTo("inbox.html"));

  // Bottom Nav
  const bottomBar = document.createElement("nav");
  bottomBar.className = "tcb-bottomnav";
  bottomBar.innerHTML = `
    <a href="team.html"><div>🏏</div><div>Team</div></a>
    <a href="scout.html"><div>🔍</div><div>Scout</div></a>
    <a href="home.html"><div>🏠</div><div>Home</div></a>
    <a href="auction.html"><div>⚒️</div><div>Auction</div></a>
    <a href="store.html"><div>🛒</div><div>Store</div></a>
  `;
  document.body.appendChild(bottomBar);

  // Inbox unread fetch
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
          dot.style.display = "block";
          inboxText.innerText = `${count}`;
        } else {
          dot.style.display = "none";
          inboxText.innerText = "Inbox";
        }
      }
    } catch (err) {
      console.error("Inbox count fetch failed:", err);
    }
  }
}
