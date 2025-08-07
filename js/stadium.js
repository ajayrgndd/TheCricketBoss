// ✅ Connect Supabase (no modules)
const supabaseUrl = 'https://iukofcmatlfhfwcechdq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const stadiumLevels = [
  {
    level: "Local",
    capacity: 5000,
    cost: 0,
    manager_level: "Beginner",
    ticket_rate: 50,
    maintenance: 1000
  },
  {
    level: "Domestic",
    capacity: 10000,
    cost: 100000,
    manager_level: "Beginner",
    ticket_rate: 60,
    maintenance: 2500
  },
  {
    level: "Professional",
    capacity: 15000,
    cost: 250000,
    manager_level: "Professional",
    ticket_rate: 70,
    maintenance: 4000
  },
  {
    level: "National",
    capacity: 20000,
    cost: 500000,
    manager_level: "Supreme",
    ticket_rate: 80,
    maintenance: 6000
  },
  {
    level: "World Class",
    capacity: 35000,
    cost: 1000000,
    manager_level: "Ultimate",
    ticket_rate: 100,
    maintenance: 9000
  }
];

let userId, teamId, currentStadium, currentManagerLevel;

// ✅ Init
document.addEventListener('DOMContentLoaded', async () => {
  const user = await supabase.auth.getUser();
  if (!user.data?.user) return alert("Not logged in!");

  userId = user.data.user.id;

  // Get team
  const { data: team } = await supabase.from('teams').select('*').eq('user_id', userId).single();
  if (!team) return alert("Team not found!");

  teamId = team.id;

  // Get profile (for manager level)
  const { data: profile } = await supabase.from('profiles').select('manager_level').eq('id', userId).single();
  currentManagerLevel = profile?.manager_level || 'Beginner';

  // Get stadium info
  const { data: stadium } = await supabase.from('stadiums').select('*').eq('team_id', teamId).single();
  currentStadium = stadium;

  renderCurrentStadium();
  renderUpgradeOptions();
});

function renderCurrentStadium() {
  const stadiumDiv = document.getElementById('current-stadium');
  const ticketRate = stadiumLevels.find(l => l.level === currentStadium.level)?.ticket_rate || 50;
  const estimate = Math.floor(currentStadium.capacity * ticketRate * 0.8);

  stadiumDiv.innerHTML = `
    <strong>${currentStadium.name}</strong><br/>
    Level: ${currentStadium.level}<br/>
    Capacity: ${currentStadium.capacity}<br/>
    Ticket Rate: ₹${ticketRate}<br/>
    Est. Matchday Earnings: ₹${estimate}
  `;
}

function renderUpgradeOptions() {
  const container = document.getElementById('upgrade-list');
  const currentLevelIndex = stadiumLevels.findIndex(l => l.level === currentStadium.level);

  stadiumLevels.forEach((level, index) => {
    const disabled = index <= currentLevelIndex;
    const eligible = compareLevels(currentManagerLevel, level.manager_level) >= 0;

    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <strong>${level.level}</strong><br/>
      Capacity: ${level.capacity}<br/>
      Upgrade Cost: ₹${level.cost}<br/>
      Ticket Rate: ₹${level.ticket_rate}<br/>
      Maintenance/Week: ₹${level.maintenance}<br/>
      Required Manager Level: ${level.manager_level}<br/>
      <button ${disabled || !eligible ? "disabled" : ""} onclick="upgradeStadium('${level.level}')">
        ${disabled ? "Current" : !eligible ? "Not Eligible" : "Upgrade"}
      </button>
    `;
    container.appendChild(card);
  });
}

function compareLevels(userLevel, requiredLevel) {
  const levels = [
    "Beginner", "Expert", "Professional", "Master", "Supreme",
    "World Class", "Ultimate", "Titan", "The Boss"
  ];
  return levels.indexOf(userLevel) - levels.indexOf(requiredLevel);
}

async function upgradeStadium(newLevel) {
  const levelData = stadiumLevels.find(l => l.level === newLevel);
  if (!levelData) return alert("Invalid upgrade.");

  const { error } = await supabase.from('stadiums').update({
    level: newLevel,
    capacity: levelData.capacity,
    updated_at: new Date().toISOString()
  }).eq('id', currentStadium.id);

  if (error) {
    alert("Upgrade failed");
  } else {
    alert(`Upgraded to ${newLevel} Stadium!`);
    location.reload();
  }
}
