// matches.js

// -------------------- Supabase Connection --------------------
const supabaseUrl = 'https://iukofcmatlfhfwcechdq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// -------------------- DOM Elements --------------------
const liveMatchesContainer = document.getElementById("live-matches");
const upcomingMatchesContainer = document.getElementById("upcoming-matches");
const completedMatchesContainer = document.getElementById("completed-matches");

// -------------------- Utility Functions --------------------
function formatDateTime(dateStr, timeStr) {
    const date = new Date(`${dateStr}T${timeStr}`);
    return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function getMatchStatus(matchDateTime) {
    const now = new Date();
    const start = new Date(matchDateTime);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // Assume match lasts 3 hours

    if (now >= start && now <= end) return "live";
    if (now < start) return "upcoming";
    return "completed";
}

function createMatchCard(match, type) {
    let title = "";
    if (type === "league") title = "LEAGUE MATCH";
    if (type === "friendly") title = "FRIENDLY MATCH";

    let scoreInfo = "";
    const status = getMatchStatus(match.datetime);

    if (status === "live") {
        scoreInfo = `<span class="live-label">LIVE</span>`;
    } else if (status === "completed") {
        if (match.result && match.result.score) {
            scoreInfo = `<span class="score">${match.result.score}</span>`;
        } else {
            scoreInfo = `<span class="score">Result unavailable</span>`;
        }
    } else {
        scoreInfo = `<span class="upcoming-time">${formatDateTime(match.date, match.time)}</span>`;
    }

    return `
        <div class="match-card" onclick="${status === 'live' ? `window.location.href='match-simulation.html?id=${match.id}&type=${type}'` : ''}">
            <div class="match-title">${title}</div>
            <div class="teams">${match.home_team_name} vs ${match.away_team_name}</div>
            <div class="match-info">${scoreInfo}</div>
        </div>
    `;
}

// -------------------- Fetch Functions --------------------
async function fetchMatches() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: myTeam, error: teamError } = await supabase
        .from("teams")
        .select("id, team_name")
        .eq("user_id", user.id)
        .single();

    if (teamError || !myTeam) {
        console.error("Error fetching team:", teamError);
        return;
    }

    const teamId = myTeam.id;

    // Fetch League fixtures (fixtures table)
    const { data: leagueFixtures, error: leagueError } = await supabase
        .from("fixtures")
        .select(`
            id, home_team_id, away_team_id, match_date, match_time, result,
            home_team:home_team_id (team_name),
            away_team:away_team_id (team_name)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order("match_date", { ascending: true });

    if (leagueError) {
        console.error("Error fetching league fixtures:", leagueError);
    }

    // Fetch Friendly matches (matches table)
    const { data: friendlyMatches, error: friendlyError } = await supabase
        .from("matches")
        .select(`
            id, home_team_id, away_team_id, date, time, result, is_friendly,
            home_team:home_team_id (team_name),
            away_team:away_team_id (team_name)
        `)
        .eq("is_friendly", true)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order("date", { ascending: true });

    if (friendlyError) {
        console.error("Error fetching friendly matches:", friendlyError);
    }

    const allMatches = [];

    if (leagueFixtures) {
        leagueFixtures.forEach(fix => {
            allMatches.push({
                id: fix.id,
                type: "league",
                home_team_name: fix.home_team.team_name,
                away_team_name: fix.away_team.team_name,
                date: fix.match_date,
                time: fix.match_time,
                datetime: `${fix.match_date}T${fix.match_time}`,
                result: fix.result
            });
        });
    }

    if (friendlyMatches) {
        friendlyMatches.forEach(mat => {
            allMatches.push({
                id: mat.id,
                type: "friendly",
                home_team_name: mat.home_team.team_name,
                away_team_name: mat.away_team.team_name,
                date: mat.date,
                time: mat.time,
                datetime: `${mat.date}T${mat.time}`,
                result: mat.result
            });
        });
    }

    // Separate matches into Live, Upcoming, Completed
    const liveMatches = [];
    const upcomingMatches = [];
    const completedMatches = [];

    allMatches.forEach(match => {
        const status = getMatchStatus(match.datetime);
        if (status === "live") liveMatches.push(match);
        if (status === "upcoming") upcomingMatches.push(match);
        if (status === "completed") completedMatches.push(match);
    });

    // Render
    liveMatchesContainer.innerHTML = liveMatches.map(m => createMatchCard(m, m.type)).join("");
    upcomingMatchesContainer.innerHTML = upcomingMatches.map(m => createMatchCard(m, m.type)).join("");
    completedMatchesContainer.innerHTML = completedMatches.map(m => createMatchCard(m, m.type)).join("");
}

// -------------------- Init --------------------
document.addEventListener("DOMContentLoaded", async () => {
    await fetchMatches();
    if (typeof initSmoothUI === "function") {
        initSmoothUI(); // from smooth-ui.js
    }
});
