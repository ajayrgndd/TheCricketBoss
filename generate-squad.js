import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://ejcutfzguoqnkrparcox.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqY3V0ZnpndW9xbmtycGFyY294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNDQzMDAsImV4cCI6MjA2ODgyMDMwMH0.gzR9e8gxnisWs9jEooSLiYOSufdjoWjs2hSdOk9iBTw'
);

const roles = ['Wicket Keeper', 'Bowler', 'Batsman'];
const skillLevels = ['Newbie', 'Trainee', 'Professional', 'National'];

function getRandomAge(skill) {
  if (skill === 'Newbie') return 16;
  if (skill === 'Trainee') return 18 + Math.floor(Math.random() * 3);
  if (skill === 'National') return 30;
  return 20 + Math.floor(Math.random() * 10);
}

function generatePlayer(role = 'Batsman', skill = null) {
  const selectedSkill = skill || skillLevels[Math.floor(Math.random() * skillLevels.length)];
  return {
    name: `Player_${Math.floor(Math.random() * 10000)}`,
    age: getRandomAge(selectedSkill),
    role,
    skill_level: selectedSkill,
    photo: `https://api.dicebear.com/7.x/miniavs/svg?seed=${Math.floor(Math.random() * 10000)}`
  };
}

async function generateInitialSquad(userId) {
  const squad = [
    generatePlayer('Wicket Keeper', 'Newbie'),
    generatePlayer('Batsman', 'Trainee'),
    generatePlayer('Batsman', 'National'),
    generatePlayer('Batsman', 'National'),
    generatePlayer('Bowler', 'Professional'),
    generatePlayer('Bowler', 'Professional'),
  ];

  for (let i = 0; i < 5; i++) {
    squad.push(generatePlayer(i % 2 === 0 ? 'Bowler' : 'Batsman'));
  }

  for (const player of squad) {
    await supabase.from('players').insert([{ ...player, user_id: userId }]);
  }
}

function displaySquad(players) {
  const container = document.getElementById('squadContainer');
  const status = document.getElementById('status');
  container.innerHTML = '';
  status.innerText = '🎉 Your Initial Squad:';

  players.forEach(player => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${player.photo}" alt="Player Avatar" />
      <p><strong>${player.name}</strong></p>
      <p>Role: ${player.role}</p>
      <p>Skill: ${player.skill_level}</p>
      <p>Age: ${player.age}</p>
    `;
    container.appendChild(card);
  });
}

async function loadSquad() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    document.getElementById('status').innerText = '❌ Not logged in.';
    return;
  }

  const { data: existingSquad, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id);

  if (fetchError) {
    document.getElementById('status').innerText = '❌ Error fetching squad.';
    console.error(fetchError);
    return;
  }

  if (!existingSquad || existingSquad.length === 0) {
    document.getElementById('status').innerText = '⚙️ Generating your squad...';
    await generateInitialSquad(user.id);

    const { data: newSquad, error: reFetchError } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id);

    if (reFetchError || !newSquad) {
      document.getElementById('status').innerText = '❌ Failed to generate squad.';
      return;
    }

    displaySquad(newSquad);
  } else {
    displaySquad(existingSquad);
  }
}

window.addEventListener('DOMContentLoaded', loadSquad);
