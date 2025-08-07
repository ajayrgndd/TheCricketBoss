import { loadSharedUI } from './shared-ui-stadium.js';

const stadiumLevels = [
  { name: "Street Ground", capacity: 1000, revenue: 100, upgradeCost: 500, requiredManagerLevel: "Beginner" },
  { name: "Local Ground", capacity: 3000, revenue: 300, upgradeCost: 1500, requiredManagerLevel: "Expert" },
  { name: "State Stadium", capacity: 8000, revenue: 600, upgradeCost: 4000, requiredManagerLevel: "Professional" },
  { name: "National Stadium", capacity: 15000, revenue: 1200, upgradeCost: 10000, requiredManagerLevel: "Master" },
  { name: "International Arena", capacity: 30000, revenue: 2500, upgradeCost: 25000, requiredManagerLevel: "Supreme" }
];

const managerLevelsOrder = ["Beginner", "Expert", "Professional", "Master", "Supreme", "World Class", "Ultimate", "Titan", "The Boss"];

let userData = {
  username: "You",
  xp: 0,
  coins: 0,
  cash: 20000,
  manager_level: "Professional",
  stadium_level: 1 // index in stadiumLevels
};

function displayStadiumInfo() {
  const currentLevel = stadiumLevels[userData.stadium_level];
  const nextLevel = stadiumLevels[userData.stadium_level + 1];

  document.getElementById("stadium-level-name").textContent = currentLevel.name;
  document.getElementById("stadium-capacity").textContent = currentLevel.capacity;
  document.getElementById("stadium-revenue").textContent = currentLevel.revenue;

  if (nextLevel) {
    document.getElementById("stadium-upgrade-cost").textContent = nextLevel.upgradeCost;
    document.getElementById("required-manager-level").textContent = nextLevel.requiredManagerLevel;
    document.getElementById("upgrade-btn").disabled = false;
  } else {
    document.getElementById("stadium-upgrade-cost").textContent = "Max";
    document.getElementById("required-manager-level").textContent = "-";
    document.getElementById("upgrade-btn").disabled = true;
    document.getElementById("upgrade-msg").textContent = "🏟️ Stadium is already at max level.";
  }
}

function upgradeStadium() {
  const nextLevel = stadiumLevels[userData.stadium_level + 1];
  if (!nextLevel) return;

  const userLevelIndex = managerLevelsOrder.indexOf(userData.manager_level);
  const requiredLevelIndex = managerLevelsOrder.indexOf(nextLevel.requiredManagerLevel);

  if (userLevelIndex < requiredLevelIndex) {
    document.getElementById("upgrade-msg").textContent = `❌ Upgrade locked. Requires Manager Level: ${nextLevel.requiredManagerLevel}`;
    return;
  }

  if (userData.cash < nextLevel.upgradeCost) {
    document.getElementById("upgrade-msg").textContent = `❌ Not enough cash. Need ₹${nextLevel.upgradeCost}`;
    return;
  }

  userData.cash -= nextLevel.upgradeCost;
  userData.stadium_level++;
  document.getElementById("upgrade-msg").textContent = `✅ Stadium upgraded to ${nextLevel.name}!`;

  // Update top bar cash display
  document.getElementById("cash").textContent = `₹${userData.cash}`;

  displayStadiumInfo();
}

function init() {
  loadSharedUI(userData); // Inject header/footer and display topbar values
  displayStadiumInfo();
  document.getElementById("upgrade-btn").addEventListener("click", upgradeStadium);
}

init();
