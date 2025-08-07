// js/shared-ui-stadium.js
export async function loadSharedUI(supabase) {
  const user = supabase.auth.getUser
    ? (await supabase.auth.getUser()).data.user
    : null;

  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("manager_name, xp, coins, cash")
    .eq("user_id", user.id)
    .single();

  const headerHTML = `
    <header class="top-bar">
      <div class="top-left">
        <span id="username">${profile?.manager_name || "Manager"}</span>
      </div>
      <div class="top-right">
        <span id="xp">XP: ${profile?.xp || 0}</span>
        <span id="coins">💰 ${profile?.coins || 0}</span>
        <span id="cash">💵 ${profile?.cash || 0}</span>
      </div>
    </header>
  `;

  const footerHTML = `
    <nav class="bottom-nav">
      <a href="team.html">🏏 Team</a>
      <a href="scout.html">🧭 Scout</a>
      <a href="home.html">🏠 Home</a>
      <a href="auction.html">🛒 Auction</a>
      <a href="store.html">🏬 Store</a>
    </nav>
  `;

  document.body.insertAdjacentHTML("afterbegin", headerHTML);
  document.body.insertAdjacentHTML("beforeend", footerHTML);
}
