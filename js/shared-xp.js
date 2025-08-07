// js/shared-xp.js
export async function addManagerXP(supabase, userId, context = "") {
  const XP_REWARDS = {
    stadium_lvl2: 50,
    stadium_lvl3: 100,
    stadium_lvl4: 150,
    stadium_lvl5: 200,
  };

  const xpToAdd = XP_REWARDS[context] || 0;
  if (xpToAdd === 0) return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("xp")
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    console.error("❌ XP fetch error:", error?.message);
    return;
  }

  const newXP = profile.xp + xpToAdd;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ xp: newXP })
    .eq("user_id", userId);

  if (updateError) {
    console.error("❌ XP update error:", updateError.message);
  }
}
