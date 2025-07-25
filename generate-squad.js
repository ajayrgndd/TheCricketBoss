<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

  const supabase = createClient(
    'https://ejcutfzguoqnkrparcox.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqY3V0ZnpndW9xbmtycGFyY294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNDQzMDAsImV4cCI6MjA2ODgyMDMwMH0.gzR9e8gxnisWs9jEooSLiYOSufdjoWjs2hSdOk9iBTw'
  );

  const roles = ['Wicket Keeper', 'Bowler', 'Batsman'];
  const skillLevels = ['Newbie', 'Trainee', 'Professional', 'National'];

  function getRandomAge(skill) {
    if (skill === 'Newbie') return 16;
    if (skill === 'Trainee') return 17 + Math.floor(Math.random() * 3);
    if (skill === 'National') return 30;
    return 18 + Math.floor(Math.random() * 12);
  }

  function generatePlayer(role = 'Batsman', skill = null) {
    const selectedSkill = skill || skillLevels[Math.floor(Math.random() * skillLevels.length)];
    return {
      name: `Player_${Math.floor(Math.random() * 10000)}`,
      age: getRandomAge(selectedSkill),
      role: role,
      skill_level: selectedSkill,
      photo: `https://api.dicebear.com/7.x/miniavs/svg?seed=${Math.floor(Math.random() * 10000)}`
    };
  }

  async function generateInitialSquad(userId) {
    const squad = [];

    // Ensure basic team composition
    squad.push(generatePlayer('Wicket Keeper', 'Newbie'));
    squad.push(generatePlayer('Batsman', 'Trainee'));
    squad.push(generatePlayer('Batsman', 'National'));
    squad.push(generatePlayer('Batsman', 'National'));
    squad.push(generatePlayer('Bowler', 'Professional'));
    squad.push(generatePlayer('Bowler', 'Professional'));

    // Add remaining 5 random players
    for (let i = 0; i < 5; i++) {
      const role = i % 2 === 0 ? 'Bowler' : 'Batsman';
      squad.push(generatePlayer(role));
    }

    for (const player of squad) {
      await supabase.from('players').insert([{ ...player, user_id: userId }]);
    }

    console.log("Squad Generated!");
  }

  function displaySquad(players) {
    const container = document.getElementById('squadContainer');
    container.innerHTML = '';

    players.forEach(player => {
      const card = document.createElement('div');
      card.style.width = '160px';
      card.style.padding = '15px';
      card.style.margin = '10px';
      card.style.border = '1px solid #ccc';
      card.style.borderRadius = '10px';
      card.style.backgroundColor = '#222';
      card.style.color = 'white';
      card.style.textAlign = 'center';
      card.style.display = 'inline-block';

      card.innerHTML = `
        <img src="${player.photo || 'https://placehold.co/100x100'}" style="border-radius: 50%; width: 80px; height: 80px;" />
        <h4>${player.name}</h4>
        <p>Age: ${player.age}</p>
        <p>Role: ${player.role}</p>
        <p>Skill Level: ${player.skill_level}</p>
      `;

      container.appendChild(card);
    });
  }

  async function loadSquad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("Not logged in");
      return;
    }

    const userId = user.id;

    const { data: existing, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching squad:', fetchError.message);
      return;
    }

    if (!existing || existing.length === 0) {
      await generateInitialSquad(userId);

      // Fetch again after generating
      const { data: newSquad, error: refetchError } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', userId);

      if (refetchError) {
        console.error('Error after generating squad:', refetchError.message);
        return;
      }

      displaySquad(newSquad);
    } else {
      displaySquad(existing);
    }
  }

  window.addEventListener('DOMContentLoaded', loadSquad);
</script>
