const supabase = supabase.createClient(https://iukofcmatlfhfwcechdq.supabase.co, eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE);

async function loadMatches() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return window.location.href = 'login.html';

  const { data: myTeamData } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!myTeamData) return;

  const teamId = myTeamData.id;

  // Fetch league fixtures
  const { data: leagueMatches } = await supabase
    .from('fixtures')
    .select(`
      id, home_team_id, away_team_id, match_datetime, result, is_completed,
      home_team:home_team_id(team_name, logo_url),
      away_team:away_team_id(team_name, logo_url)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  // Fetch friendly matches
  const { data: friendlyMatches } = await supabase
    .from('matches')
    .select(`
      id, home_team_id, away_team_id, date, time, result, status, is_friendly,
      home_team:home_team_id(team_name, logo_url),
      away_team:away_team_id(team_name, logo_url)
    `)
    .eq('is_friendly', true)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

  // Normalize data
  const normalizedLeague = (leagueMatches || []).map(m => ({
    id: m.id,
    type: 'LEAGUE MATCH',
    start: new Date(m.match_datetime),
    home: m.home_team,
    away: m.away_team,
    result: m.result,
    is_completed: m.is_completed
  }));

  const normalizedFriendly = (friendlyMatches || []).map(m => ({
    id: m.id,
    type: 'FRIENDLY',
    start: new Date(`${m.date}T${m.time}`),
    home: m.home_team,
    away: m.away_team,
    result: m.result,
    is_completed: m.status === 'completed'
  }));

  const allMatches = [...normalizedLeague, ...normalizedFriendly]
    .sort((a, b) => a.start - b.start);

  renderMatches(allMatches);
}

function renderMatches(matches) {
  const now = new Date();
  const live = [], upcoming = [], completed = [];

  matches.forEach(m => {
    const start = m.start;
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hrs
    if (now >= start && now <= end) {
      live.push(m);
    } else if (now < start) {
      upcoming.push(m);
    } else {
      completed.push(m);
    }
  });

  renderSection('live-matches', live, true);
  renderSection('upcoming-matches', upcoming, false);
  renderSection('completed-matches', completed, false);
}

function renderSection(containerId, matches, isLive) {
  const container = document.getElementById(containerId);
  container.innerHTML = matches.map(m => `
    <div class="match-card" onclick="handleMatchClick('${m.id}', '${m.type}', ${isLive})">
      <div class="match-info">
        <img src="${m.home.logo_url}" class="team-logo">
        <span>${m.home.team_name}</span>
        <span>vs</span>
        <span>${m.away.team_name}</span>
        <img src="${m.away.logo_url}" class="team-logo">
      </div>
      <div>
        <div class="match-type">${m.type}</div>
        ${isLive 
          ? `<div class="score" style="visibility:${new Date() >= m.start ? 'visible' : 'hidden'}">Live Score</div>`
          : m.is_completed && m.result ? `<div class="score">${m.result.home} - ${m.result.away}</div>` : ''
        }
      </div>
    </div>
  `).join('');
}

function handleMatchClick(id, type, isLive) {
  if (isLive) {
    window.location.href = `match-simulation.html?id=${id}&type=${type}`;
  } else {
    window.location.href = `match-summary.html?id=${id}&type=${type}`;
  }
}

loadMatches();
