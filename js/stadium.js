async function upgradeStadium() {
  const teamId = getTeamId(); // from session or DB
  const currentLevel = getCurrentStadiumLevel(); // '2'
  const nextLevel = (parseInt(currentLevel) + 1).toString();

  // 1. Fetch next level data
  const { data: nextData, error } = await supabase
    .from('stadium_levels')
    .select('*')
    .eq('level', nextLevel)
    .single();

  if (error) return alert("Error fetching upgrade info");

  // 2. Check if manager level and cash are sufficient
  const managerLevel = getUserManagerLevel(); // from profile
  const userCash = getUserCash(); // from DB

  if (!isManagerLevelSufficient(managerLevel, nextData.manager_level_required)) {
    return alert("Upgrade locked. Manager level too low.");
  }

  if (userCash < nextData.upgrade_cost) {
    return alert("Not enough cash for upgrade.");
  }

  // 3. Deduct cash
  await supabase
    .from('users')
    .update({ cash: userCash - nextData.upgrade_cost })
    .eq('id', userId);

  // 4. Call SQL function to update stadium
  await supabase.rpc('upgrade_stadium', {
    team_id_input: teamId,
    level_to_upgrade: nextLevel
  });

  alert("Stadium upgraded successfully!");
  window.location.reload();
}
