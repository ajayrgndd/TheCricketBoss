<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

  const supabaseUrl = 'https://ejcutfzguoqnkrparcox.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqY3V0ZnpndW9xbmtycGFyY294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNDQzMDAsImV4cCI6MjA2ODgyMDMwMH0.gzR9e8gxnisWs9jEooSLiYOSufdjoWjs2hSdOk9iBTw';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const roles = ['Wicket Keeper', 'Bowler', 'Batsman'];
  const skillLevels = ['Newbie', 'Trainee', 'Professional', 'National'];

  function getRandomAge(skill) {
    if (skill === 'Newbie') return 16;
    if (skill === 'Trainee') return 17 + Math.floor(Math.random() * 3);
    if (skill === 'National') return 30;
    return 18 + Math.floor(Math.random() * 12);
  }

  async function generateInitialSquad(userId) {
    const squad = [];

    squad.push(generatePlayer('Wicket Keeper', 'Newbie'));
    squad.push(generatePlayer('Batsman', 'Trainee'));
    squad.push(generatePlayer('Batsman', 'National'));
    squad.push(generatePlayer('Batsman', 'National'));
    squad.push(generatePlayer('Bowler', 'Professional'));
    squad.push(generatePlayer('Bowler', 'Professional'));

    for (let i = 0; i < 5; i++) {
      const role = i % 2 === 0 ? 'Bowler' : 'Batsman';
      squad.push(generatePlayer(role));
    }

    for (const player of squad) {
      await supabase.from('players').insert([{ ...player, user_id: userId }]);
    }

    alert("Squad Generated!");
  }

  function generatePlayer(role = 'Batsman', skill = null) {
    const selectedSkill = skill || skillLevels[Math.floor(Math.random() * skillLevels.length)];
    return {
      name: `Player_${Math.floor(Math.random() * 10000)}`,
      age: getRandomAge(selectedSkill),
      role: role,
      skill_level: selectedSkill
    };
  }

  // Call this only after user is logged in
  const user = await supabase.auth.getUser();
  const userId = user?.data?.user?.id;

  if (userId) {
    // Optional: Check if squad already exists
    const { data: existing } = await supabase.from('players').select('*').eq('user_id', userId);
    if (existing.length === 0) {
      await generateInitialSquad(userId);
    } else {
      console.log("Squad already exists");
    }
  } else {
    console.log("User not logged in");
  }
</script>
