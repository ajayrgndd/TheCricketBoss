import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://iukofcmatlfhfwcechdq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Query params: ?type=league|friendly&id=uuid
const url = new URL(location.href);
const type = url.searchParams.get('type') || 'friendly';
const id = url.searchParams.get('id');

const titleEl = document.getElementById('title');
const scoreEl = document.getElementById('scoreline');
const metaEl = document.getElementById('meta');
const feedEl = document.getElementById('feed');

let events = [];
let i = 0;
let paused = false;
let timer = null;

// Fetch events + basic meta
async function loadData() {
  if (type === 'league') {
    titleEl.textContent = 'League Match Replay';
    const { data: fx, error: e1 } = await sb.from('fixtures').select('home_team_id,away_team_id,result,match_datetime').eq('id', id).single();
    if (e1) console.error(e1);
    const { data: evts, error: e2 } = await sb.from('fixture_events').select('*').eq('fixture_id', id).order('ball_number', { ascending: true });
    if (e2) console.error(e2);
    events = evts || [];
    metaEl.textContent = fx?.result ? `${fx.result.home.runs}/${fx.result.home.wkts} vs ${fx.result.away.runs}/${fx.result.away.wkts}` : '';
  } else {
    titleEl.textContent = 'Friendly Match Replay';
    const { data: m, error: e1 } = await sb.from('matches').select('result,date,time').eq('id', id).single();
    if (e1) console.error(e1);
    const { data: evts, error: e2 } = await sb.from('match_events').select('*').eq('match_id', id).order('ball_number', { ascending: true });
    if (e2) console.error(e2);
    events = evts || [];
    metaEl.textContent = m?.result ? `${m.result.home.runs}/${m.result.home.wkts} vs ${m.result.away.runs}/${m.result.away.wkts}` : '';
  }
}

function fmtOver(balls) {
  const o = Math.floor(balls / 6), b = balls % 6;
  return `${o}.${b}`;
}

async function startReplay() {
  await loadData();

  if (!events.length) {
    feedEl.innerHTML = `<div class="row">Replay not ready yet. Please come back at match time.</div>`;
    return;
  }

  // Auto scale speed to finish in ~30 minutes
  const totalBalls = events.length;
  const totalMs = 30 * 60 * 1000;
  const perBall = Math.max(300, Math.floor(totalMs / totalBalls)); // clamp to >=300ms

  let runs = 0, wkts = 0, balls = 0;

  const tick = () => {
    if (paused) return;
    if (i >= events.length) { clearInterval(timer); return; }

    const e = events[i++];
    balls++;
    runs += (e.runs_scored || 0);
    if (e.wicket) wkts++;

    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `<strong>Over ${e.over}.${e.ball_in_over}:</strong> ${e.commentary || ''}`;
    feedEl.appendChild(div);
    feedEl.scrollTop = feedEl.scrollHeight;

    scoreEl.textContent = `${runs}/${wkts} (${fmtOver(balls)})`;
  };

  timer = setInterval(tick, perBall);
}

document.getElementById('pauseBtn').onclick = () => { paused = true; };
document.getElementById('resumeBtn').onclick = () => { if (paused){ paused=false; } };

startReplay();
