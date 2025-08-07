// Replace with your actual Supabase project credentials
const supabaseUrl = 'https://iukofcmatlfhfwcechdq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Utility: Get current user and team info
let currentUser = null;
let currentTeam = null;
let stadiumData = null;
let stadiumLevels = {};

document.addEventListener('DOMContentLoaded', async () => {
  await loadSharedUI();
  await fetchUserAndTeam();
  await fetchStadiumLevels();
  await fetchStadium();
  renderStadiumInfo();
  setupUpgradeListener();
});

// 🔁 Load shared UI components (top and bottom nav)
async function loadSharedUI() {
  const script = document.createElement('script');
  script.src = '/js/shared-ui.js';
  document.body.appendChild(script);
}

// 🔐 Get current user and their team
async function fetchUserAndTeam() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Not logged in");

  currentUser = user;

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !team) return alert("Team not found.");
  currentTeam = team;
}

// 📊 Fetch all stadium level configurations
async function fetchStadiumLevels() {
  const { data, error } = await supabase
    .from('stadium_levels')
    .select('*');

  if (error) {
    console.error("Failed to fetch stadium levels", error);
    return;
  }

  data.forEach(level => {
    stadiumLevels[level.level] = level;
  });
}

// 🏟️ Fetch stadium info for current team
async function fetchStadium() {
  const { data, error } = await supabase
    .from('stadiums')
    .select('*')
    .eq('team_id', currentTeam.id)
    .single();

  if (error || !data) {
    console.error("No stadium found.", error);
    return;
  }

  stadiumData = data;
  syncStadiumFieldsFromLevel();
}

// 🔄 Sync stadium fields from stadium_levels table
function syncStadiumFieldsFromLevel() {
  const levelInfo = stadiumLevels[stadiumData.level];
  if (!levelInfo) return;

  stadiumData.capacity = levelInfo.capacity;
  stadiumData.ticket_price = levelInfo.ticket_price;
  stadiumData.maintenance_cost = levelInfo.maintenance_cost;
}

// 🎨 Render stadium info to UI
function renderStadiumInfo() {
  if (!stadiumData) return;

  document.getElementById('stadium-name').textContent = stadiumData.name;
  document.getElementById('stadium-level').textContent = stadiumData.level;
  document.getElementById('stadium-capacity').textContent = stadiumData.capacity.toLocaleString();
  document.getElementById('ticket-price').textContent = `₹${stadiumData.ticket_price}`;
  document.getElementById('weekly-maintenance').textContent = `₹${stadiumData.maintenance_cost.toLocaleString()}`;

  // 💰 Estimate weekly earnings (2 matchdays/week)
  const estimatedEarnings = stadiumData.ticket_price * stadiumData.capacity * 2;
  document.getElementById('estimated-earnings').textContent = `₹${estimatedEarnings.toLocaleString()}`;

  populateUpgradeOptions();
}

// ⏫ Populate available upgrade options
function populateUpgradeOptions() {
  const upgradeSelect = document.getElementById('upgrade-select');
  upgradeSelect.innerHTML = '';

  let canUpgrade = false;

  Object.values(stadiumLevels).forEach(level => {
    if (level.capacity > stadiumData.capacity) {
      canUpgrade = true;
      const option = document.createElement('option');
      option.value = level.level;
      option.textContent = `${level.level} – ₹${level.upgrade_cost.toLocaleString()}`;
      upgradeSelect.appendChild(option);
    }
  });

  document.getElementById('upgrade-section').style.display = canUpgrade ? 'block' : 'none';
}

// 🎯 Setup upgrade button logic
function setupUpgradeListener() {
  document.getElementById('upgrade-btn').addEventListener('click', async () => {
    const newLevel = document.getElementById('upgrade-select').value;
    const levelInfo = stadiumLevels[newLevel];

    if (!levelInfo) return alert("Invalid level selected");

    // TODO: Check manager level + team cash validation (if required)

    const { error } = await supabase
      .from('stadiums')
      .update({ level: newLevel, updated_at: new Date().toISOString() })
      .eq('id', stadiumData.id);

    if (error) {
      console.error("Upgrade failed", error);
      return alert("Upgrade failed");
    }

    alert("Stadium upgraded successfully!");
    await fetchStadium();
    renderStadiumInfo();
  });
}
