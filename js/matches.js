import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load matches when page loads
document.addEventListener("DOMContentLoaded", loadMatches);

async function loadMatches() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Find the logged-in user's team
  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (teamError || !teamData) {
    console.error("Team not found", teamError);
    return;
  }

  const teamId = teamData.id;

  // Fetch league matches from fixtures
  const { data: leagueMatches, error: leagueError } = await supabase
    .from("fixtures")
    .select(`
      id, home_team_id, away_team_id, match_date, match_time, is_completed, result,
      home_team:home_team_id(team_name),
      away_team:away_team_id(team_name)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("match_date", { ascending: true });

  if (leagueError) {
    console.error("Error fetching league matches:", leagueError);
    return;
  }

  // Fetch friendly matches
  const { data: friendlyMatches, error: friendlyError } = await supabase
    .from("matches")
    .select(`
      id, date, time, status, result, is_friendly,
      home_team:home_team_id(team_name),
      away_team:away_team_id(team_name)
    `)
    .eq("is_friendly", true)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("date", { ascending: true });

  if (friendlyError) {
    console.error("Error fetching friendly matches:", friendlyError);
    return;
  }

  // Combine both lists with a "type" tag
  const allMatches = [
    ...leagueMatches.map(m => ({
      type: "League",
      date: m.match_date,
      time: m.match_time,
      home_team: m.home_team.team_name,
      away_team: m.away_team.team_name,
      is_completed: m.is_completed,
      result: m.result
    })),
    ...friendlyMatches.map(m => ({
      type: "Friendly",
      date: m.date,
      time: m.time,
      home_team: m.home_team.team_name,
      away_team: m.away_team.team_name,
      is_completed: m.status === "completed",
      result: m.result
    }))
  ];

  // Split into upcoming & completed
  const upcomingContainer = document.getElementById("upcoming-matches");
  const completedContainer = document.getElementById("completed-matches");

  upcomingContainer.innerHTML = "";
  completedContainer.innerHTML = "";

  allMatches.forEach(match => {
    const card = document.createElement("div");
    card.className = "match-card";

    card.innerHTML = `
      <div class="match-top">
        <div class="match-label">${match.type}</div>
      </div>
      <div class="teams">${match.home_team} vs ${match.away_team}</div>
      <div class="match-time">${new Date(match.date).toDateString()} ${match.time}</div>
      <div class="score">${
        match.is_completed ? formatResult(match.result) : "Starts soon..."
      }</div>
    `;

    if (match.is_completed) {
      completedContainer.appendChild(card);
    } else {
      upcomingContainer.appendChild(card);
    }
  });
}

function formatResult(result) {
  if (!result) return "No result";
  if (result.score) return `${result.score}`;
  return JSON.stringify(result);
}
