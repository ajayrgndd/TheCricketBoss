// shared-ui.js
export async function loadSharedUI({ manager_name, xp, coins, cash }) {
  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.innerHTML = `
    <div>
      <strong>${manager_name}</strong>
      <span>XP: ${xp}</span>
      <span>🪙 ${coins}</span>
      <span>💰 ${(cash / 100000).toFixed(1)}M</span>
    </div>
    <div class="notifications">
      <button id="notifBtn">🔔<span id="notifCount" class="notif-count">0</span></button>
      <div id="notifDropdown" class="notif-dropdown"></div>
    </div>
  `;

  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-bar';
  bottomBar.innerHTML = `
    <a href="home.html">🏠</a>
    <a href="team.html">🧢</a>
    <a href="scout.html">🔍</a>
    <a href="auction.html">💹</a>
    <a href="store.html">🛒</a>
  `;

  document.body.appendChild(topBar);
  document.body.appendChild(bottomBar);

  // Notifications load
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  const supabase = createClient(
    "https://iukofcmatlfhfwcechdq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: notifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const notifCount = document.getElementById("notifCount");
  const notifDropdown = document.getElementById("notifDropdown");

  if (notifs?.length) {
    notifCount.textContent = notifs.length;
    notifs.forEach(n => {
      const div = document.createElement("div");
      div.className = "notif-item";
      div.innerHTML = `
        <strong>${n.title}</strong>
        <div style="font-size: 12px; color: #ccc;">${n.message}</div>
      `;
      notifDropdown.appendChild(div);
    });
  } else {
    notifCount.style.display = "none";
    notifDropdown.innerHTML = "<em>No new notifications</em>";
  }

  // Toggle and mark as read on click
  document.getElementById("notifBtn").addEventListener("click", async () => {
    notifDropdown.classList.toggle("show");

    if (notifDropdown.classList.contains("show") && notifs.length) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      notifCount.style.display = "none";
    }
  });

  // Close dropdown on outside click
  window.addEventListener("click", e => {
    if (!e.target.closest(".notifications")) {
      notifDropdown.classList.remove("show");
    }
  });
}
