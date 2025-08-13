import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = 'login.html'
    return
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError)
    return
  }

  const teamId = profile.team_id

  // Fetch league matches
  const { data: leagueMatches, error: leagueError } = await supabase
    .from('fixtures')
    .select('*')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('match_date', { ascending: true })

  if (leagueError) console.error('League matches fetch error:', leagueError)

  // Fetch friendly matches
  const { data: friendlyMatches, error: friendlyError } = await supabase
    .from('matches')
    .select('*')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('match_date', { ascending: true })

  if (friendlyError) console.error('Friendly matches fetch error:', friendlyError)

  // Get all unique team IDs from both match lists
  const allTeamIds = Array.from(
    new Set([
      ...(leagueMatches || []).flatMap(m => [m.home_team_id, m.away_team_id]),
      ...(friendlyMatches || []).flatMap(m => [m.home_team_id, m.away_team_id])
    ])
  )

  // Fetch team info separately
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, logo_url')
    .in('id', allTeamIds)

  if (teamsError) console.error('Teams fetch error:', teamsError)

  // Map teams by ID for quick lookup
  const teamMap = {}
  teams?.forEach(t => {
    teamMap[t.id] = t
  })

  // Merge both types of matches
  const allMatches = [...(leagueMatches || []), ...(friendlyMatches || [])]
  allMatches.sort((a, b) => new Date(`${a.match_date}T${a.match_time}`) - new Date(`${b.match_date}T${b.match_time}`))

  const now = new Date()
  const upcoming = []
  const completed = []

  allMatches.forEach(match => {
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`)
    if (matchDateTime > now) {
      upcoming.push(match)
    } else {
      completed.push(match)
    }
  })

  renderMatches(upcoming, 'upcoming-matches', false, teamMap)
  renderMatches(completed, 'completed-matches', true, teamMap)
})

function renderMatches(matches, containerId, isCompleted, teamMap) {
  const container = document.getElementById(containerId)
  container.innerHTML = ''

  matches.forEach(match => {
    const homeTeam = teamMap[match.home_team_id] || { name: 'Unknown', logo_url: 'images/default-logo.png' }
    const awayTeam = teamMap[match.away_team_id] || { name: 'Unknown', logo_url: 'images/default-logo.png' }

    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`)
    const now = new Date()

    let scoreDisplay = ''
    if (isCompleted || now >= matchDateTime) {
      scoreDisplay = `<span>${match.home_score ?? '-'} - ${match.away_score ?? '-'}</span>`
    } else {
      scoreDisplay = `<span class="hidden-score">Score Hidden</span>`
    }

    const matchEl = document.createElement('div')
    matchEl.classList.add('match-card')
    matchEl.innerHTML = `
      <div class="team">
        <img src="${homeTeam.logo_url}" alt="${homeTeam.name}">
        <p>${homeTeam.name}</p>
      </div>
      <div class="vs">
        <p>vs</p>
        <p class="match-time">${match.match_date} ${match.match_time}</p>
        ${scoreDisplay}
      </div>
      <div class="team">
        <img src="${awayTeam.logo_url}" alt="${awayTeam.name}">
        <p>${awayTeam.name}</p>
      </div>
    `
    container.appendChild(matchEl)
  })
}
