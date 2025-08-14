// matches.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://iukofcmatlfhfwcechdq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('User not logged in');
            return;
        }

        // Get team_id from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('user_id', user.id)
            .single();
        if (!profile) {
            console.error('Profile not found');
            return;
        }
        const teamId = profile.team_id;

        const today = new Date().toISOString().split('T')[0];

        // Fetch fixtures (both home and away for this team)
        const { data: fixtures, error } = await supabase
            .from('fixtures')
            .select(`
                id,
                match_date,
                match_type,
                status,
                home_team_id,
                away_team_id,
                home_team:home_team_id ( id, team_name, logo_url ),
                away_team:away_team_id ( id, team_name, logo_url ),
                home_score,
                away_score
            `)
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .order('match_date', { ascending: true });

        if (error) {
            console.error('Error fetching fixtures:', error);
            return;
        }

        const upcomingContainer = document.getElementById('upcoming-matches');
        const completedContainer = document.getElementById('completed-matches');

        upcomingContainer.innerHTML = '';
        completedContainer.innerHTML = '';

        if (!fixtures || fixtures.length === 0) {
            upcomingContainer.innerHTML = '<div class="empty">No upcoming matches.</div>';
            completedContainer.innerHTML = '<div class="empty">No completed matches.</div>';
            return;
        }

        fixtures.forEach(match => {
            const isUpcoming = new Date(match.match_date) >= new Date();
            const homeName = match.home_team?.team_name || (match.home_team_id ? `Team ${match.home_team_id}` : 'Unknown');
            const awayName = match.away_team?.team_name || (match.away_team_id ? `Team ${match.away_team_id}` : 'Unknown');
            const homeLogo = match.home_team?.logo_url || 'default-team.png';
            const awayLogo = match.away_team?.logo_url || 'default-team.png';
            const dateStr = new Date(match.match_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

            const statusChip = isUpcoming
                ? '<span class="chip chip-upcoming">Upcoming</span>'
                : '<span class="chip chip-done">Completed</span>';

            const scoreDisplay = isUpcoming
                ? '<div class="hidden-score">Score hidden until start</div>'
                : `<div class="score">${match.home_score ?? '-'} / ${match.away_score ?? '-'}</div>`;

            const cardHTML = `
                <div class="match-card">
                    <div class="match-head">
                        <span class="badge badge-league">${match.match_type || 'LEAGUE MATCH'}</span>
                        ${statusChip}
                        <span class="start">${dateStr}</span>
                    </div>
                    <div class="match-body">
                        <div class="team">
                            <img src="${homeLogo}" alt="${homeName}">
                            <div class="name">${homeName}</div>
                        </div>
                        <div class="vs">vs</div>
                        <div class="team">
                            <img src="${awayLogo}" alt="${awayName}">
                            <div class="name">${awayName}</div>
                        </div>
                    </div>
                    ${scoreDisplay}
                </div>
            `;

            if (isUpcoming) {
                upcomingContainer.innerHTML += cardHTML;
            } else {
                completedContainer.innerHTML += cardHTML;
            }
        });

    } catch (err) {
        console.error('Unexpected error:', err);
    }
});
