import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://ejcutfzguoqnkrparcox.supabase.co',
  'your-anon-key-here'
);

const roles = ['Wicket Keeper', 'Bowler', 'Batsman'];
const skills = ['Newbie', 'Trainee', 'Professional', 'National'];

function getRandomAge(skill) {
  if (skill === 'Newbie') return 16;
  if (skill === 'Trainee') return 18;
  if (skill === 'National') return 30;
  return 22;
}

function generatePlayer(role = 'Batsman', skill = null) {
  const selectedSkill = skill || skills[Math.floor(Math.random() * skills.length)];
  return {
    name: `Player_${Math.floor(Math.random() * 10000)}`,
    age: getRandomAge(selectedSkill),
    role: role,
    skill_level: selectedSkill,
    photo: `https://api.dicebear.com/7.x/miniavs/svg?seed=${Math.floor(Math.random() * 10000)}`
  };
}

async function generateSquad(userId) {
  const players = [];

  players.push(generatePlayer('Wicket Keeper', 'Newbie'));
  players.push(generatePlayer('Batsman', 'Trainee'));
  players.push(generatePlayer('Batsman', 'National'));
  players.push(generatePlayer('Bowler', 'Professional'));
  players.push(generatePlayer('Bowler', 'Professional'));

  for (let i = 0; i < 6; i++) {
    const role = i % 2 === 0 ? 'Batsman' : 'Bowler';
    players.push(generatePlayer(role));
  }

  for (const player of players) {
    await supabase.from('players').insert({ ...player, user_id: userId });
  }
}

function renderSquad(players) {
  const container = document.getElementById('squadContainer');
  container.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.innerHTML = `
      <img src="${p.photo}" style="width:80px;height:80px;border-radius:50%" />
      <h4>${p.name}</h4>
      <p>${p.role} | ${p.skill_level}</p>
      <p>Age: ${p.age}</p>
    `;
    div.style.margin = '10px';
    div.style.display = 'inline-block';
    div.style.padding = '10px';
    div.style.background = '#1f2937';
    div.style.borderRadius = '10px';
    container.appendChild(div);
  });
}

async function loadSquad() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: squad } = await supabase.from('players').select('*').eq('user_id', user.id);

  if (!squad || squad.length === 0) {
    await generateSquad(user.id);
    const { data: newSquad } = await supabase.from('players').select('*').eq('user_id', user.id);
    renderSquad(newSquad);
  } else {
    renderSquad(squad);
  }
}

window.addEventListener('DOMContentLoaded', loadSquad);
