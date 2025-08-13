import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// Supabase client
const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = 'login.html'
    return
  }

  // Fetch logged-in user's team_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError)
    return
  }

  const teamId = profile.team_id

  // Fetch matches from fixtures (league matches)
  const { data: leagueMatches, error: leagueError } = await supabase
    .from('fixtures')
    .select(`
      id, match_date, match_time, home_team_id, away_team_id, home_score, away_score,
      teams_home:home_team_id ( name, logo_url ),
      teams_away:away_team_id ( name, logo_url )
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('match_date', { ascending: true })

  if (leagueError) console.error('League matches fetch error:', leagueError)

  // Fetch matches from matches (friendly matches)
  const { data: friendlyMatches, error: friendlyError } = await supabase
    .from('matches')
    .select(`
      id, match_date, match_time, home_team_id, away_team_id, home_score, away_score,
      teams_home:home_team_id ( name, logo_url ),
      teams_away:away_team_id ( name, logo_url )
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('match_date', { ascending: true })

  if (friendlyError) console.error('Friendly matches fetch error:', friendlyError)

  // Merge both
  const allMatches = [...(leagueMatches || []), ...(friendlyMatches || [])]
  allMatches.sort((a, b) => new Date(`${a.match_date}T${a.match_time}`) - new Date(`${b.match_date}T${b.match_time}`))

  // Separate into upcoming and completed
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

  renderMatches(upcoming, 'upcoming-matches', false)
  renderMatches(completed, 'completed-matches', true)
})

function renderMatches(matches, containerId, isCompleted) {
  const container = document.getElementById(containerId)
  container.innerHTML = ''

  matches.forEach(match => {
    const matchDateTime = new Date(`${match.match_date}T${match.match_time}`)
    const now = new Date()

    let scoreDisplay = ''
    if (isCompleted) {
      scoreDisplay = `<span>${match.home_score} - ${match.away_score}</span>`
    } else {
      // Hide scores until start time
      if (now >= matchDateTime) {
        scoreDisplay = `<span>${match.home_score} - ${match.away_score}</span>`
      } else {
        scoreDisplay = `<span class="hidden-score">Score Hidden</span>`
      }
    }

    const matchEl = document.createElement('div')
    matchEl.classList.add('match-card')
    matchEl.innerHTML = `
      <div class="team">
        <img src="${match.teams_home?.logo_url || 'images/default-logo.png'}" alt="${match.teams_home?.name}">
        <p>${match.teams_home?.name}</p>
      </div>
      <div class="vs">
        <p>vs</p>
        <p class="match-time">${match.match_date} ${match.match_time}</p>
        ${scoreDisplay}
      </div>
      <div class="team">
        <img src="${match.teams_away?.logo_url || 'images/default-logo.png'}" alt="${match.teams_away?.name}">
        <p>${match.teams_away?.name}</p>
      </div>
    `
    container.appendChild(matchEl)
  })
}
