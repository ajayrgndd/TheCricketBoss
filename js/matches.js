// matches.js

// ✅ Your Supabase credentials
const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
    // ✅ Load smooth UI nav
    if (typeof loadSmoothUI === "function") {
        loadSmoothUI();
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
        console.error("❌ User not logged in", userError);
        window.location.href = "login.html";
        return;
    }

    // ✅ Get logged-in user's team
    const { data: myTeam, error: teamError } = await supabaseClient
        .from("teams")
        .select("id")
        .eq("owner_id", user.id)
        .single();

    if (teamError || !myTeam) {
        console.error("❌ Failed to fetch user's team", teamError);
        return;
    }

    const myTeamId = myTeam.id;

    // ✅ Fetch league fixtures
    const { data: leagueFixtures, error: leagueError } = await supabaseClient
        .from("fixtures")
        .select(`
            id, home_team_id, away_team_id, match_datetime, result, is_completed,
            home_team:home_team_id(name),
            away_team:away_team_id(name)
        `)
        .or(`home_team_id.eq.${myTeamId},away_team_id.eq.${myTeamId}`)
        .order("match_datetime", { ascending: true });

    if (leagueError) {
        console.error("❌ Failed to fetch league fixtures", leagueError);
    }

    // ✅ Fetch friendly fixtures
    const { data: friendlyFixtures, error: friendlyError } = await supabaseClient
        .from("friendly_fixtures")
        .select(`
            id, home_team_id, away_team_id, match_datetime, result, is_completed,
            home_team:home_team_id(name),
            away_team:away_team_id(name)
        `)
        .or(`home_team_id.eq.${myTeamId},away_team_id.eq.${myTeamId}`)
        .order("match_datetime", { ascending: true });

    if (friendlyError) {
        console.error("❌ Failed to fetch friendly fixtures", friendlyError);
    }

    // ✅ Merge both
    const allFixtures = [
        ...(leagueFixtures || []).map(m => ({ ...m, match_type: "LEAGUE MATCH" })),
        ...(friendlyFixtures || []).map(m => ({ ...m, match_type: "FRIENDLY" }))
    ];

    // ✅ Separate into groups
    const now = new Date();
    const liveMatches = [];
    const upcomingMatches = [];
    const completedMatches = [];

    allFixtures.forEach(match => {
        const matchTime = new Date(match.match_datetime);
        const oneHourAfterStart = new Date(matchTime.getTime() + 2 * 60 * 60 * 1000);

        if (!match.is_completed && now >= matchTime && now <= oneHourAfterStart) {
            liveMatches.push(match);
        } else if (!match.is_completed && now < matchTime) {
            upcomingMatches.push(match);
        } else {
            completedMatches.push(match);
        }
    });

    // ✅ Render matches
    const renderMatch = (match, live = false) => {
        const home = match.home_team?.name || "Unknown";
        const away = match.away_team?.name || "Unknown";
        const time = new Date(match.match_datetime).toLocaleString();
        let scoreHTML = "";

        if (live) {
            scoreHTML = `<span class="live-score">Live Score: Updating...</span>`;
        } else if (match.is_completed) {
            scoreHTML = `<span class="result-score">${match.result?.score || "N/A"}</span>`;
        }

        return `
            <div class="match-card" data-id="${match.id}" data-live="${live}">
                <div class="match-header">${match.match_type}</div>
                <div class="match-teams">${home} vs ${away}</div>
                <div class="match-time">${time}</div>
                ${scoreHTML}
            </div>
        `;
    };

    const sectionLive = document.getElementById("live-matches");
    const sectionUpcoming = document.getElementById("upcoming-matches");
    const sectionCompleted = document.getElementById("completed-matches");

    sectionLive.innerHTML = liveMatches.map(m => renderMatch(m, true)).join("");
    sectionUpcoming.innerHTML = upcomingMatches.map(m => renderMatch(m)).join("");
    sectionCompleted.innerHTML = completedMatches.map(m => renderMatch(m)).join("");

    // ✅ Click handler for live matches
    document.querySelectorAll(".match-card[data-live='true']").forEach(card => {
        card.addEventListener("click", () => {
            const matchId = card.dataset.id;
            window.location.href = `match-simulation.html?id=${matchId}`;
        });
    });
});
