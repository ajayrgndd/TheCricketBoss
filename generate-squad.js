import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient('https://ejcutfzguoqnkrparcox.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqY3V0ZnpndW9xbmtycGFyY294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNDQzMDAsImV4cCI6MjA2ODgyMDMwMH0.gzR9e8gxnisWs9jEooSLiYOSufdjoWjs2hSdOk9iBTw');

function createPlayer(role, skill, seed) {
  return {
    name: `Player_${Math.floor(Math.random() * 10000)}`,
    role,
    skill_level: skill,
    age: skill === 'National' ? 30 : 18 + Math.floor(Math.random() * 12),
    photo: `https://api.dicebear.com/7.x/miniavs/svg?seed=${seed}`
  };
}

async function generateSquad(userId) {
  const players = [
    createPlayer('Wicket Keeper', 'Newbie', 1),
    createPlayer('Batsman', 'Trainee', 2),
    createPlayer('Batsman', 'National', 3),
    createPlayer('Batsman', 'National', 4),
    createPlayer('Bowler', 'Professional', 5),
    createPlayer('Bowler', 'Professional', 6),
    ...Array.from({ length: 5 }).map((_, i) => createPlayer(i % 2 === 0 ? 'Bowler' : 'Batsman', 'Trainee', 10 + i))
  ];
  for (let p of players) await supabase.from('players').insert({ ...p, user_id: userId });
}

function showSquad(players) {
  const container = document.getElementById('squadContainer');
  container.innerHTML = "";
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <img src="${p.photo}" />
      <h4>${p.name}</h4>
      <p>Role: ${p.role}</p>
      <p>Skill: ${p.skill_level}</p>
      <p>Age: ${p.age}</p>
    `;
    container.appendChild(div);
  });
}

(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("User not found");

  let { data: squad } = await supabase.from('players').select('*').eq('user_id', user.id);
  if (!squad || squad.length === 0) {
    await generateSquad(user.id);
    ({ data: squad } = await supabase.from('players').select('*').eq('user_id', user.id));
  }

  showSquad(squad);
})();
