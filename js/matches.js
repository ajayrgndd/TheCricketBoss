// js/matches.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// ────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Where to send users when clicking a LIVE match card
const SIMULATION_PAGE = 'match-simulation.html' // change if your page is different

// If a logo is missing, use a neutral placeholder
const FALLBACK_LOGO = 'https://placehold.co/64x64?text=•'

// A match is considered LIVE for this many minutes after start
const LIVE_WINDOW_MIN = 210 // ~3.5 hours

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────
const toDate = (v) => (v ? new Date(v) : null)

function buildStartFromFixture(row) {
  if (row.match_datetime) return toDate(row.match_datetime)
  if (row.match_date) return toDate(row.match_date)

  if (row.match_date && row.match_time) {
    // Combine as UTC
    return new Date(`${row.match_date}T${row.match_time}Z`)
  }
  return null
}

function buildStartFromFriendly(row) {
  if (!row.date || !row.start_time) return null
  // DB stores UTC → add Z so JS interprets correctly
  return new Date(`${row.date}T${row.start_time}Z`)
}

function statusFromTime(start, isCompletedFlag) {
  if (!start) return 'scheduled'
  if (isCompletedFlag) return 'completed'

  const now = new Date()
  const end = new Date(start.getTime() + LIVE_WINDOW_MIN * 60 * 1000)

  if (now < start) return 'scheduled'
  if (now >= start && now <= end) return 'live'
  return 'completed'
}

function extractScore(result) {
  // Defensive parsing of result jsonb from either table
  if (!result || typeof result !== 'object') return null

  // common patterns
  if (Number.isFinite(result.home_score) && Number.isFinite(result.away_score)) {
    return `${result.home_score} - ${result.away_score}`
  }
  if (Number.isFinite(result.home) && Number.isFinite(result.away)) {
    return `${result.home} - ${result.away}`
  }
  if (typeof result.score === 'string' && result.score.includes('-')) {
    return result.score
  }
  return null
}

function ensureBadge(type) {
  return type === 'league'
    ? '<span class="badge badge-league">LEAGUE MATCH</span>'
    : '<span class="badge badge-friendly">FRIENDLY</span>'
}

function ensureStatusChip(status) {
  if (status === 'live') return '<span class="chip chip-live">LIVE</span>'
  if (status === 'completed') return '<span class="chip chip-done">Result</span>'
  return '<span class="chip chip-upcoming">Upcoming</span>'
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Must be logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = 'login.html'
    return
  }

  // Get user's team_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.team_id) {
    console.error('Profile fetch error:', profileError)
    return
  }
  const teamId = profile.team_id

  // ── Fetch league fixtures (fixtures table)
  const { data: leagueRows, error: leagueErr } = await supabase
    .from('fixtures')
    .select('id, league_id, round_number, home_team_id, away_team_id, match_date, match_time, match_datetime, result, completed, is_completed')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('match_date', { ascending: true })

  if (leagueErr) console.error('League fetch error:', leagueErr)

  // Normalize league
  const leagueMatches = (leagueRows || []).map(r => ({
    id: r.id,
    type: 'league',
    start: buildStartFromFixture(r),
    home_team_id: r.home_team_id,
    away_team_id: r.away_team_id,
    result: r.result || null,
    completedFlag: Boolean(r.completed ?? r.is_completed)
  }))

  // ── Fetch friendly matches (matches table)
  const { data: friendlyRows, error: friendlyErr } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, date, start_time, result, status, is_friendly')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('date', { ascending: true })

  if (friendlyErr) console.error('Friendly fetch error:', friendlyErr)

  // Normalize friendly
  const friendlyMatches = (friendlyRows || []).map(r => ({
    id: r.id,
    type: 'friendly',
    start: buildStartFromFriendly(r),
    home_team_id: r.home_team_id,
    away_team_id: r.away_team_id,
    result: r.result || null,
    completedFlag: (r.status || '').toLowerCase() === 'completed'
  }))

  // ── Fetch teams (one round-trip)
  const allTeamIds = Array.from(
    new Set([
      ...leagueMatches.flatMap(m => [m.home_team_id, m.away_team_id]),
      ...friendlyMatches.flatMap(m => [m.home_team_id, m.away_team_id])
    ]).values()
  )

  let teamMap = {}
  if (allTeamIds.length) {
    const { data: teams, error: teamsErr } = await supabase
      .from('teams')
      .select('id, team_name, logo_url')
      .in('id', allTeamIds)

    if (teamsErr) {
      console.error('Teams fetch error:', teamsErr)
    } else {
      teamMap = Object.fromEntries(
        (teams || []).map(t => [t.id, { name: t.team_name, logo: t.logo_url || FALLBACK_LOGO }])
      )
    }
  }

  // ── Merge + sort
  const all = [...leagueMatches, ...friendlyMatches].sort(
    (a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0)
  )

  // Separate by time-based status
  const upcoming = []
  const completed = []
  for (const m of all) {
    const status = statusFromTime(m.start, m.completedFlag)
    if (status === 'completed') completed.push(m)
    else upcoming.push(m)
  }

  renderMatches(upcoming, 'upcoming-matches', teamMap)
  renderMatches(completed, 'completed-matches', teamMap)
})

// ────────────────────────────────────────────────────────────
// RENDER
// ────────────────────────────────────────────────────────────
function renderMatches(list, containerId, teamMap) {
  const el = document.getElementById(containerId)
  el.innerHTML = ''

  if (!list.length) {
    el.innerHTML = `<div class="empty">No matches to show</div>`
    return
  }

  for (const m of list) {
    const home = teamMap[m.home_team_id] || { name: 'Unknown', logo: FALLBACK_LOGO }
    const away = teamMap[m.away_team_id] || { name: 'Unknown', logo: FALLBACK_LOGO }

    const status = statusFromTime(m.start, m.completedFlag)
    const badge = ensureBadge(m.type)
    const chip = ensureStatusChip(status)

    const startText = m.start
      ? `${m.start.toLocaleDateString()} ${m.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'TBD'

    let scoreHTML = ''
    const parsed = extractScore(m.result)

    if (status === 'completed') {
      scoreHTML = `<div class="score">${parsed ?? 'Result available'}</div>`
    } else if (status === 'live') {
      scoreHTML = `<div class="score">${parsed ?? '— —'}</div>`
    } else {
      // scheduled: hide scores
      scoreHTML = `<div class="score hidden-score">Score hidden until start</div>`
    }

    const clickableAttr = status === 'live'
      ? `data-href="${SIMULATION_PAGE}?type=${m.type}&id=${m.id}"`
      : ''

    const card = document.createElement('div')
    card.className = `match-card ${status}`
    if (clickableAttr) {
      card.setAttribute('data-href', `${SIMULATION_PAGE}?type=${m.type}&id=${m.id}`)
      card.style.cursor = 'pointer'
      card.addEventListener('click', () => {
        const to = card.getAttribute('data-href')
        if (to) window.location.href = to
      })
    }

    card.innerHTML = `
      <div class="match-head">
        ${badge}
        ${chip}
        <div class="start">${startText}</div>
      </div>

      <div class="match-body">
        <div class="team">
          <img src="${home.logo}" alt="${home.name}" onerror="this.src='${FALLBACK_LOGO}'" />
          <div class="name">${home.name}</div>
        </div>

        <div class="vs">vs</div>

        <div class="team">
          <img src="${away.logo}" alt="${away.name}" onerror="this.src='${FALLBACK_LOGO}'" />
          <div class="name">${away.name}</div>
        </div>
      </div>

      ${scoreHTML}
    `
    el.appendChild(card)
  }
}
