// js/profile-setup.js — patched with verbose error reporting
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { generateSquad } from "./squad-generator.js";

const SUPABASE_URL = "https://iukofcmatlfhfwcechdq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"; // <-- put anon key here

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const teamLogos = [
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo1.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo2.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo3.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo4.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo5.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo6.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo7.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo8.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo9.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo10.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo11.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo12.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo13.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo14.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo15.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo16.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo17.png",
  "https://raw.githubusercontent.com/ajayrgndd/TheCricketBoss/main/assets/team_logos/Logo18.png"
];

// small helper to show useful error info to console and as an alert
function showFatalError(context, err) {
  try {
    console.error(`[profile-setup] ERROR @ ${context}:`, err);
    // Supabase errors are objects with .message, .code, .details sometimes
    const errMsg = err?.message ?? (typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err)).slice(0, 1000));
    const code = err?.code ? (` code=${err.code}`) : '';
    // show a compact alert so you can copy-paste it here
    alert(`Error (${context}): ${errMsg}${code}\n\nCheck console for full object.`);
  } catch (e) {
    // fallback
    console.error('[profile-setup] showFatalError failed', e);
    alert('Fatal error — check console.');
  }
}

document.getElementById("setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const managerName = document.getElementById("managerName").value.trim();
  const teamName = document.getElementById("teamName").value.trim();
  const dob = document.getElementById("dob").value;
  const region = document.getElementById("region").value;

  console.log("🔍 Submitted data:", { managerName, teamName, dob, region });

  try {
    // get user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      showFatalError('getUser', userError || 'No authenticated user');
      window.location.href = 'login.html';
      return;
    }
    const user = userData.user;
    console.log('[profile-setup] user id', user.id);

    // avoid double-create: check existing profile
    const { data: existingProfile, error: existingProfileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingProfileErr) {
      console.warn('[profile-setup] profile read error', existingProfileErr);
    }
    if (existingProfile) {
      console.log('[profile-setup] profile exists — redirecting home');
      window.location.href = 'home.html';
      return;
    }

    // insert profile
    let profileInsertData;
    try {
      const res = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          manager_name: managerName,
          team_name: teamName,
          dob,
          region,
          xp: 10,
          coins: 10,
          cash: 1000,
          level: 'Beginner'
        })
        .select()
        .maybeSingle();

      profileInsertData = res.data;
      if (res.error) throw res.error;
      console.log('[profile-setup] Profile inserted', profileInsertData);
    } catch (err) {
      showFatalError('insert profile', err);
      return;
    }

    // find bot team
    let chosenTeam = null;
    try {
      const { data: botTeams, error: botErr } = await supabase
        .from('teams')
        .select('*')
        .or('type.eq.bot,is_bot.eq.true')
        .is('owner_id', null)
        .limit(1);

      if (botErr) {
        console.warn('[profile-setup] botTeams query returned error', botErr);
      } else if (botTeams && botTeams.length > 0) {
        chosenTeam = botTeams[0];
        console.log('[profile-setup] bot team found', chosenTeam.id);
      } else {
        console.log('[profile-setup] no bot teams available');
      }
    } catch (err) {
      console.warn('[profile-setup] bot team query threw', err);
    }

    // claim or create team
    let teamToUse = null;
    const logo_url = teamLogos[Math.floor(Math.random() * teamLogos.length)];
    if (chosenTeam) {
      try {
        const { data: updatedTeam, error: teamUpdateError } = await supabase
          .from('teams')
          .update({
            owner_id: user.id,
            type: 'user',
            is_bot: false,
            team_name,
            manager_name,
            logo_url,
            region,
            last_active: new Date().toISOString()
          })
          .eq('id', chosenTeam.id)
          .is('owner_id', null)
          .select()
          .maybeSingle();

        if (teamUpdateError) throw teamUpdateError;
        teamToUse = updatedTeam || chosenTeam;
        console.log('[profile-setup] team claimed', teamToUse.id);
      } catch (err) {
        console.warn('[profile-setup] claim failed, will create new team instead', err);
        // try create fallback
        try {
          const { data: newTeamData, error: newTeamErr } = await supabase
            .from('teams')
            .insert({
              team_name,
              owner_id: user.id,
              type: 'user',
              is_bot: false,
              manager_name,
              logo_url,
              region,
              last_active: new Date().toISOString()
            })
            .select()
            .maybeSingle();

          if (newTeamErr) throw newTeamErr;
          teamToUse = newTeamData;
          console.log('[profile-setup] fallback team created', teamToUse.id);
        } catch (createErr) {
          showFatalError('create fallback team', createErr);
          return;
        }
      }
    } else {
      // create a new team
      try {
        const { data: newTeamData, error: newTeamErr } = await supabase
          .from('teams')
          .insert({
            team_name,
            owner_id: user.id,
            type: 'user',
            is_bot: false,
            manager_name,
            logo_url,
            region,
            last_active: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        if (newTeamErr) throw newTeamErr;
        teamToUse = newTeamData;
        console.log('[profile-setup] new team created', teamToUse.id);
      } catch (err) {
        showFatalError('create team', err);
        return;
      }
    }

    if (!teamToUse || !teamToUse.id) {
      showFatalError('team check', 'teamToUse missing after claim/create');
      return;
    }

    // delete old players
    try {
      const sel = await supabase
        .from('players')
        .select('id', { count: 'exact' })
        .eq('team_id', teamToUse.id);

      if (sel.error) console.warn('[profile-setup] players select error', sel.error);
      else console.log('[profile-setup] players before delete count', sel.count);

      const del = await supabase
        .from('players')
        .delete()
        .eq('team_id', teamToUse.id)
        .select('id');

      if (del.error) console.warn('[profile-setup] players delete error', del.error);
      else console.log('[profile-setup] deleted players', (del.data || []).length);
    } catch (err) {
      console.warn('[profile-setup] delete players threw', err);
    }

    // update profile.team_id
    try {
      const { error: pUpdateErr } = await supabase
        .from('profiles')
        .update({ team_id: teamToUse.id })
        .eq('user_id', user.id);

      if (pUpdateErr) throw pUpdateErr;
      console.log('[profile-setup] profile updated with team_id');
    } catch (err) {
      showFatalError('update profile.team_id', err);
      return;
    }

    // stadium ops (delete & create)
    try {
      const { data: oldStadium, error: oldStadiumErr } = await supabase
        .from('stadiums')
        .select('id')
        .eq('team_id', teamToUse.id)
        .maybeSingle();
      if (oldStadiumErr) console.warn('[profile-setup] old stadium read error', oldStadiumErr);

      if (oldStadium?.id) {
        const { error: sDelErr } = await supabase
          .from('stadiums')
          .delete()
          .eq('id', oldStadium.id);

        if (sDelErr) console.warn('[profile-setup] stadium delete error', sDelErr);
        else console.log('[profile-setup] old stadium deleted');
      }

      const { data: newStadium, error: stadiumCreateError } = await supabase
        .from('stadiums')
        .insert({
          team_id: teamToUse.id,
          name: `${teamName} Arena`,
          capacity: 5000,
          level: 'Local',
          user_id: user.id
        })
        .select()
        .maybeSingle();

      if (stadiumCreateError) throw stadiumCreateError;
      console.log('[profile-setup] stadium created', newStadium?.id);
    } catch (err) {
      // non-fatal but report
      showFatalError('stadium ops', err);
      // continue — stadium errors shouldn't break squad generation unless RLS blocks players insertion
      // return; // <-- don't return here, continue and see if squad insertion works
    }

    // generate squad (final)
    try {
      const inserted = await generateSquad(teamToUse.id, supabase);
      console.log('[profile-setup] generateSquad returned', inserted?.length ?? 0);
    } catch (err) {
      showFatalError('generateSquad', err);
      return;
    }

    alert('✅ Welcome! Your squad has been created.');
    window.location.href = 'squad.html';
  } catch (err) {
    showFatalError('main submit handler', err);
  }
});
