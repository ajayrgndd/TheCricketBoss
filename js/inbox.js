// inbox.js
export async function loadInboxMessages(supabase, userId) {
  const container = document.getElementById("inboxContainer");

  // Sample data (replace with Supabase query)
  const messages = [
    { id: 1, title: "Welcome to TheCricketBoss!", body: "Get ready to lead your team to glory. Start by setting your lineup.", date: "2025-08-08", read: false },
    { id: 2, title: "Match Result", body: "Your team won by 25 runs! 🎉", date: "2025-08-07", read: true }
  ];

  // If connecting to Supabase later:
  /*
  const { data, error } = await supabase
    .from("inbox")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Inbox fetch error:", error.message);
    return;
  }
  const messages = data || [];
  */

  container.innerHTML = "";

  if (messages.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#aaa;">No messages yet.</p>`;
    return;
  }

  messages.forEach(msg => {
    const card = document.createElement("div");
    card.className = `message-card ${msg.read ? "" : "unread"}`;
    card.innerHTML = `
      <div class="message-header">
        <div class="message-title">${msg.title}</div>
        <div class="message-date">${msg.date}</div>
      </div>
      <div class="message-body">${msg.body}</div>
      <span class="delete-btn">🗑</span>
    `;

    // Click handler for marking unread as read
    if (!msg.read) {
      card.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-btn")) return; // ignore if trash clicked
        card.classList.remove("unread");
        /*
        await supabase
          .from("inbox")
          .update({ read: true })
          .eq("id", msg.id)
          .eq("user_id", userId);
        */
      });
    }

    // Desktop delete (trash icon)
    card.querySelector(".delete-btn").addEventListener("click", async () => {
      card.remove();
      /*
      await supabase
        .from("inbox")
        .delete()
        .eq("id", msg.id)
        .eq("user_id", userId);
      */
    });

    // Mobile swipe delete
    let touchStartX = 0;
    card.addEventListener("touchstart", e => {
      touchStartX = e.touches[0].clientX;
    });
    card.addEventListener("touchend", e => {
      const touchEndX = e.changedTouches[0].clientX;
      if (touchStartX - touchEndX > 80) { // swiped left
        card.classList.add("swipe-delete");
        setTimeout(() => {
          card.remove();
          /*
          supabase
            .from("inbox")
            .delete()
            .eq("id", msg.id)
            .eq("user_id", userId);
          */
        }, 200);
      }
    });

    container.appendChild(card);
  });
}
