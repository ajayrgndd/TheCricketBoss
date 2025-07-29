import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1NzM4NCwiZXhwIjoyMDY5MDMzMzg0fQ.EtpYvjBs7yiTwreqsukK_I7BoK-UKZo3pF_odbzszmI" // Use only in secure environments
);

const now = new Date().toISOString();

const { data: expiredAuctions } = await supabase
  .from("auction")
  .select("*, players(*), seller:players(team_id)")
  .lt("ends_at", now);

for (const auction of expiredAuctions || []) {
  const { data: bids } = await supabase
    .from("auction_bids")
    .select("*")
    .eq("auction_id", auction.id)
    .order("amount", { ascending: false });

  const playerId = auction.player_id;
  const player = auction.players;
  const marketPrice = player.market_price;
  const sellerId = player.team_id;

  if (bids.length === 0) {
    // Unsold: return to seller
    await supabase.from("players").update({ team_id: sellerId }).eq("id", playerId);
    await supabase.from("auction").delete().eq("id", auction.id);
    console.log(`Returned unsold player: ${player.name}`);
    continue;
  }

  const topBid = bids[0];
  const buyerId = topBid.bidder_id;
  const bidAmount = topBid.amount;
  const maxPayout = Math.floor(marketPrice * 1.5);

  // Transfer player
  await supabase.from("players").update({ team_id: buyerId }).eq("id", playerId);

  // Deduct from buyer's cash
  await supabase.rpc("deduct_cash", {
    user_id: buyerId,
    amount: bidAmount
  });

  // Credit seller (up to max 1.5× market price)
  await supabase.rpc("add_cash", {
    user_id: sellerId,
    amount: Math.min(bidAmount, maxPayout)
  });

  // Delete auction and bids
  await supabase.from("auction_bids").delete().eq("auction_id", auction.id);
  await supabase.from("auction").delete().eq("id", auction.id);

  // Notifications (optional)
  await supabase.from("notifications").insert([
    {
      user_id: sellerId,
      message: `${player.name} sold for ₹${bidAmount.toLocaleString()}`
    },
    {
      user_id: buyerId,
      message: `You won the bid for ${player.name}`
    }
  ]);

  console.log(`✅ Finalized: ${player.name} → ${buyerId}`);
}
