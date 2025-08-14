// matches.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase init
const supabaseUrl = 'https://iukofcmatlfhfwcechdq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get current logged-in user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('User not logged in');
            return;
        }

        // Fetch profile to get team_id
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Profile not found:', profileError);
            return;
        }

        const teamId = profile.team_id;

        // Fetch upcoming fixtures for the user's team
        const today = new Date().toISOString().split('T')[0];

        const { data: fixtures, error: fixturesError } = await supabase
            .from('fixtures')
            .select(`
                id,
                match_date,
                home_team:home_team_id ( id, team_name ),
                away_team:away_team_id ( id, team_name )
            `)
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .gte('match_date', today)
            .order('match_date', { ascending: true });

        if (fixturesError) {
            console.error('Error fetching fixtures:', fixturesError);
            return;
        }

        const matchesList = document.getElementById('matches-list');
        matchesList.innerHTML = '';

        if (!fixtures.length) {
            matchesList.innerHTML = '<p>No upcoming matches.</p>';
            return;
        }

        fixtures.forEach(match => {
            const home = match.home_team?.team_name || 'Unknown';
            const away = match.away_team?.team_name || 'Unknown';
            const date = new Date(match.match_date).toLocaleDateString();

            const li = document.createElement('li');
            li.textContent = `${date} — ${home} vs ${away}`;
            matchesList.appendChild(li);
        });

    } catch (err) {
        console.error('Unexpected error:', err);
    }
});
