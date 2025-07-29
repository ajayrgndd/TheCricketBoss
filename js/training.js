import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

const user = (await supabase.auth.getUser()).data.user;
if (!user) window.location.href = 'index.html';

const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
const { data: team } = await supabase.from('teams').select('*').eq('owner_id', user.id).single();
const { data: players } = await supabase.from('players').select('*').eq('team_id', team.id);

const today = new Date();
const nextMatchDay = getNextMatchDay(today);
const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
const trainingDeadline = new Date(nextMatchDay);
trainingDeadline.setHours(20, 0, 0, 0);

// Block training after 8PM IST before match day
if (nowIST >= trainingDeadline) {
  document.getElementById('submitTraining').disabled = true;
  document.getElementById('submitTraining').textContent = "Training Locked – Match Approaching";
}

const list = document.getElementById('playersList');
const selected = new Set();

players.forEach(player => {
  // Check if already trained this week
  const lastTrained = player.last_trained ? new Date(player.last_trained) : null;
  if (isSameWeek(lastTrained, today)) return;

  const div = document.createElement('div');
  div.className = 'player-card';
  div.innerHTML = `
    <strong>${player.name}</strong><br/>
    Age: ${player.age_years}.${player.age_days} <br/>
    Batting: ${player.batting} | Bowling: ${player.bowling} | Keeping: ${player.keeping}<br/>
    <label><input type="radio" name="skill-${player.id}" value="batting"/>Bat</label>
    <label><input type="radio" name="skill-${player.id}" value="bowling"/>Bowl</label>
    <label><input type="radio" name="skill-${player.id}" value="keeping"/>Keep</label>
  `;
  div.onclick = () => {
    if (selected.has(player.id)) {
      selected.delete(player.id);
      div.style.border = 'none';
    } else if (selected.size < 3) {
      selected.add(player.id);
      div.style.border = '2px solid #00e676';
    }
  };
  list.appendChild(div);
});

document.getElementById('submitTraining').addEventListener('click', async () => {
  for (let id of selected) {
    const player = players.find(p => p.id === id);
    const skill = document.querySelector(`input[name="skill-${id}"]:checked`)?.value;
    if (!skill) continue;

    const age = player.age_years;
    const growth = getSkillGrowth(age);
    const updatedStat = Math.min(player[skill] + growth, 100);

    await supabase.from('players').update({
      [skill]: updatedStat,
      last_trained: new Date().toISOString()
    }).eq('id', id);
  }

  alert('Training applied!');
  location.reload();
});

function getSkillGrowth(age) {
  if (age >= 31) return 0;
  if (age <= 20) return rand(2, 5);
  if (age <= 25) return rand(1, 3);
  if (age <= 30) return rand(0, 2);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isSameWeek(d1, d2) {
  if (!d1 || !d2) return false;
  const oneJan = new Date(d2.getFullYear(), 0, 1);
  const dayOfYear1 = Math.floor((d1 - oneJan) / 86400000);
  const dayOfYear2 = Math.floor((d2 - oneJan) / 86400000);
  return Math.floor(dayOfYear1 / 7) === Math.floor(dayOfYear2 / 7);
}

function getNextMatchDay(today) {
  const day = today.getDay();
  const next = new Date(today);
  if (day < 1) next.setDate(today.getDate() + (1 - day));
  else if (day < 4) next.setDate(today.getDate() + (4 - day));
  else next.setDate(today.getDate() + (8 - day)); // to next Monday
  return next;
}
