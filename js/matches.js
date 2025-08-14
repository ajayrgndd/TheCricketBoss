document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = "index.html"
    return
  }

  const FALLBACK_LOGO = "images/default_team_logo.png"

  try {
    // 1. Fetch upcoming matches for logged-in user's league group
    const { data: myProfile, error: myProfileErr } = await supabase
      .from("profiles")
      .select("team_id, league_group_id")
      .eq("id", user.id)
      .single()

    if (myProfileErr) throw myProfileErr
    if (!myProfile) throw new Error("Profile not found")

    const { data: matches, error: matchesErr } = await supabase
      .from("matches")
      .select("*")
      .eq("league_group_id", myProfile.league_group_id)
      .order("match_date", { ascending: true })

    if (matchesErr) throw matchesErr

    // 2. Gather all team IDs from matches
    const allTeamIds = [...new Set(matches.flatMap(m => [m.home_team_id, m.away_team_id]))]

    // 3. Fetch team names/logos from teams table
    let teamMap = {}
    if (allTeamIds.length) {
      const { data: teams, error: teamsErr } = await supabase
        .from("teams")
        .select("id, team_name, logo_url")
        .in("id", allTeamIds)

      if (teamsErr) {
        console.error("Teams fetch error:", teamsErr)
      } else {
        teamMap = Object.fromEntries(
          (teams || []).map(t => [
            t.id,
            { name: t.team_name, logo: t.logo_url || FALLBACK_LOGO }
          ])
        )
      }

      // 4. Check for missing IDs and fetch from profiles table
      const missingIds = allTeamIds.filter(id => !teamMap[id])
      if (missingIds.length) {
        const { data: userTeams, error: userTeamsErr } = await supabase
          .from("profiles")
          .select("team_id, team_name, team_logo_url")
          .in("team_id", missingIds)

        if (userTeamsErr) {
          console.error("User teams fetch error:", userTeamsErr)
        } else {
          for (const ut of userTeams || []) {
            teamMap[ut.team_id] = {
              name: ut.team_name,
              logo: ut.team_logo_url || FALLBACK_LOGO
            }
          }
        }
      }
    }

    // 5. Render matches
    const matchesContainer = document.getElementById("matches-list")
    matchesContainer.innerHTML = ""

    for (const match of matches) {
      const homeTeam = teamMap[match.home_team_id] || { name: "Unknown", logo: FALLBACK_LOGO }
      const awayTeam = teamMap[match.away_team_id] || { name: "Unknown", logo: FALLBACK_LOGO }

      const matchCard = document.createElement("div")
      matchCard.className = "match-card"

      matchCard.innerHTML = `
        <div class="team">
          <img src="${homeTeam.logo}" alt="${homeTeam.name}" />
          <span>${homeTeam.name}</span>
        </div>
        <div class="vs">vs</div>
        <div class="team">
          <img src="${awayTeam.logo}" alt="${awayTeam.name}" />
          <span>${awayTeam.name}</span>
        </div>
        <div class="match-date">${new Date(match.match_date).toLocaleDateString()}</div>
      `

      matchesContainer.appendChild(matchCard)
    }
  } catch (err) {
    console.error("Error loading matches:", err)
  }
})
