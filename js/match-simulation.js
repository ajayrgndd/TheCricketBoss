// /js/match-simulation.js
// Usage: match-simulation.html?type=league&id=<fixture_id>
//     or match-simulation.html?type=friendly&id=<match_id>

const sb = window.supabase;

const FALLBACK_LOGO = 'https://placehold.co/64x64?text=•';
let events = [];
let idx = 0;
let timer = null;
let speed = 1500;
let running = true;
let state = { runs: 0, wkts: 0, balls: 0 };

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const params = new URLSearchParams(location.search);
  const type = params.get('type'); // 'league' | 'friendly'
  const id = params.get('id');

  if (!type || !id) {
    alert('Missing type or id in query string');
    return;
  }

  // load teams + summary + events
  const meta = await loadMeta(type, id);
  if (!meta) {
    appendCommentary("⚠ Could not load match metadata.");
    disableControls();
    return;
  }

  await loadTeams(meta);
  events = await loadEvents(type, id);

  if (!events.length && type === 'friendly') {
    // simulate fresh friendly (client fallback)
    const sim = await simulateFriendlyClient(meta.homeTeamId, meta.awayTeamId, id);
    events = sim.events;
  }

  if (!events.length) {
    appendCommentary("No commentary available yet. This match hasn't been simulated.");
    disableControls();
    return;
  }

  // players pane
  await renderXI(meta);

  // header
  document.getElementById('homeName').textContent = meta.homeName;
  document.getElementById('awayName').textContent = meta.awayName;
  document.getElementById('homeLogo').src = meta.homeLogo || FALLBACK_LOGO;
  document.getElementById('awayLogo').src = meta.awayLogo || FALLBACK_LOGO;
  document.getElementById('homeLogo').onerror = (e)=> e.target.src = FALLBACK_LOGO;
  document.getElementById('awayLogo').onerror = (e)=> e.target.src = FALLBACK_LOGO;

  // wire controls
  document.getElementById('playPause').addEventListener('click', togglePlay);
  document.getElementById('speed').addEventListener('change', (e) => {
    speed = Number(e.target.value);
    if (running) { clearInterval(timer); timer = setInterval(tick, speed); }
  });
  document.getElementById('skip').addEventListener('click', skipToEnd);

  // start playback
  timer = setInterval(tick, speed);
}

function disableControls() {
  document.getElementById('playPause').disabled = true;
  document.getElementById('speed').disabled = true;
  document.getElementById('skip').disabled = true;
}

function togglePlay() {
  running = !running;
  const btn = document.getElementById('playPause');
  btn.textContent = running ? 'Pause' : 'Play';
  if (running) timer = setInterval(tick, speed);
  else clearInterval(timer);
}

function skipToEnd() {
  clearInterval(timer);
  while (idx < events.length) tick(true);
}

function tick(isFast = false) {
  if (idx >= events.length) {
    clearInterval(timer);
    return;
  }
  const e = events[idx++];
  renderBall(e);
  if (!isFast && idx >= events.length) {
    finalizeHeader();
  }
}

function renderBall(e) {
  // Update score state
  state.balls += 1;
  if (e.wicket) state.wkts += 1;
  else state.runs += (e.runs_scored || 0);

  // live score
  const overStr = `${Math.floor(state.balls / 6)}.${state.balls % 6}`;
  document.getElementById('liveScore').textContent = `${state.runs}/${state.wkts}`;
  document.getElementById('liveOver').textContent = overStr;

  // timeline pill
  const pill = document.createElement('div');
  const isW = e.wicket;
  const txt = isW ? 'W' : String(e.runs_scored ?? 0);
  pill.className = `ball ${isW ? 'w' : (txt === '4' || txt === '6') ? 'b' : ''}`;
  pill.textContent = txt;
  document.getElementById('timeline').appendChild(pill);

  // commentary line
  appendCommentary(`Ov ${e.over}.${e.ball_in_over} – ${e.commentary || ''}`);
}

function appendCommentary(line) {
  const box = document.getElementById('commentary');
  const div = document.createElement('div');
  div.className = 'com-line';
  div.textContent = line;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function finalizeHeader() {
  appendCommentary('— End of match —');
}

// ────────────────────────────────────────────────────────────
// Data loaders
// ────────────────────────────────────────────────────────────
async function loadMeta(type, id) {
  if (type === 'league') {
    const { data: f } = await sb.from('fixtures')
      .select('id, home_team_id, away_team_id')
      .eq('id', id).maybeSingle();
    if (!f) return null;
    return {
      homeTeamId: f.home_team_id,
      awayTeamId: f.away_team_id,
      ...(await resolveTeamNamesAndLogos(f.home_team_id, f.away_team_id)),
    };
  } else {
    const { data: m } = await sb.from('matches')
      .select('id, home_team_id, away_team_id')
      .eq('id', id).maybeSingle();
    if (!m) return null;
    return {
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      ...(await resolveTeamNamesAndLogos(m.home_team_id, m.away_team_id)),
    };
  }
}

async function resolveTeamNamesAndLogos(homeId, awayId) {
  const { data: teams } = await sb.from('teams')
    .select('id, team_name, logo_url')
    .in('id', [homeId, awayId]);

  const get = (tid) => teams?.find(t => t.id === tid) || { team_name: 'Unknown', logo_url: FALLBACK_LOGO };
  const h = get(homeId), a = get(awayId);
  return {
    homeName: h.team_name, homeLogo: h.logo_url || FALLBACK_LOGO,
    awayName: a.team_name, awayLogo: a.logo_url || FALLBACK_LOGO,
  };
}

async function loadEvents(type, id) {
  if (type === 'league') {
    const { data: evts } = await sb.from('fixture_events')
      .select('*').eq('fixture_id', id).order('ball_number', { ascending: true });
    return evts || [];
  } else {
    const { data: evts } = await sb.from('match_events')
      .select('*').eq('match_id', id).order('ball_number', { ascending: true });
    return evts || [];
  }
}

async function renderXI(meta) {
  const [homeXI, awayXI] = await Promise.all([pickXI(meta.homeTeamId), pickXI(meta.awayTeamId)]);
  const pane = document.getElementById('playersPane');
  pane.innerHTML = '';
  const renderBlock = (title, list) => {
    const head = document.createElement('div');
    head.className = 'sub';
    head.style.margin = '8px 0';
    head.textContent = title;
    pane.appendChild(head);
    list.forEach(p => {
      const row = document.createElement('div'); row.className = 'p';
      row.innerHTML = `<div class="n">${p.name}</div><div class="m">Bat ${p.batting ?? '-'} | Bowl ${p.bowling ?? '-'}</div>`;
      pane.appendChild(row);
    });
  };
  renderBlock(meta.homeName, homeXI);
  renderBlock(meta.awayName, awayXI);
}

async function pickXI(team_id) {
  const { data: dl } = await sb.from('default_lineups').select('player_ids').eq('team_id', team_id).maybeSingle();
  if (dl?.player_ids?.length >= 11) {
    const { data: players } = await sb.from('players').select('*').in('id', dl.player_ids.slice(0, 11));
    return players ?? [];
  }
  const { data: players } = await sb.from('players').select('*').eq('team_id', team_id).order('batting', { ascending: false }).limit(11);
  return players ?? [];
}

// ────────────────────────────────────────────────────────────
// Client fallback sim for FRIENDLY only
// ────────────────────────────────────────────────────────────
async function simulateFriendlyClient(homeTeamId, awayTeamId, matchId) {
  const [homeXI, awayXI] = await Promise.all([pickXI(homeTeamId), pickXI(awayTeamId)]);
  if (homeXI.length < 11 || awayXI.length < 11) return { events: [] };

  function simInnings(batters, bowlers, battingTeamId, bowlingTeamId, target) {
    const MAX_OVERS = 20, BPO = 6;
    let total = 0, wkts = 0, balls = 0;
    let s = 0, ns = 1, bIdx = 10;
    const evts = [];
    for (let over = 1; over <= MAX_OVERS; over++) {
      const bowler = bowlers[(bIdx + bowlers.length) % bowlers.length]; bIdx--;
      for (let b = 1; b <= BPO; b++) {
        if (wkts >= 10) break;
        const striker = batters[s % batters.length];
        const non = batters[ns % batters.length];
        const bat = Number(striker.batting ?? 50);
        const bowl = Number(bowler.bowling ?? 50) + Number(bowler.experience ?? 0) * 0.2;
        const wicketProb = Math.max(0.05, (bowl - bat) / 200 + 0.07);
        const rand = Math.random();
        let runs = 0, wicket = false, commentary = "";
        if (rand < wicketProb) { wicket = true; commentary = `WICKET! ${striker.name} out.`; }
        else {
          const r = Math.random();
          if (r < 0.02) { runs = 6; commentary = `${striker.name} SIX!`; }
          else if (r < 0.10) { runs = 4; commentary = `${striker.name} FOUR!`; }
          else if (r < 0.14) { runs = 3; commentary = `${striker.name} three.`; }
          else if (r < 0.28) { runs = 2; commentary = `${striker.name} two.`; }
          else if (r < 0.68) { runs = 1; commentary = `${striker.name} single.`; }
          else { commentary = `Dot.`; }
        }
        evts.push({
          ball_number: ++balls, over, ball_in_over: b,
          batting_team_id: battingTeamId, bowling_team_id: bowlingTeamId,
          striker: striker.name, non_striker: non.name, bowler: bowler.name,
          runs_scored: runs, extras: 0, wicket, commentary
        });
        if (wicket) { wkts++; s = Math.max(s, ns) + 1; if (s >= batters.length) break; }
        else { total += runs; if (runs % 2 === 1) [s, ns] = [ns, s]; }
        if (target && total >= target) break;
      }
      if (wkts >= 10 || (target && total >= target)) break;
      [s, ns] = [ns, s];
    }
    return { total, wkts, balls, events: evts };
  }

  const inn1 = simInnings(homeXI, awayXI, homeTeamId, awayTeamId, undefined);
  const inn2 = simInnings(awayXI, homeXI, awayTeamId, homeTeamId, inn1.total + 1);
  const evts = [...inn1.events, ...inn2.events];

  // persist to DB
  await sb.from('match_events').insert(evts.map((e, i) => ({ match_id: matchId, ...e, ball_number: i + 1 })));

  const summary = {
    home: { runs: inn1.total, wkts: inn1.wkts, balls: inn1.balls },
    away: { runs: inn2.total, wkts: inn2.wkts, balls: inn2.balls },
    winner_team_id: inn1.total > inn2.total ? homeTeamId : (inn2.total > inn1.total ? awayTeamId : null),
    result_text: inn1.total === inn2.total ? 'Match tied' : (inn1.total > inn2.total ? 'Home team won' : 'Away team won')
  };

  await sb.from('matches').update({ result: summary, status: 'completed', sim_seeded: true }).eq('id', matchId);

  return { events: evts };
}
