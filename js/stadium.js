// js/stadium.js
import { loadSharedUI } from './shared-ui-stadium.js';

// Mock manager and stadium data for demo/testing
const manager = {
  level: "Professional", // could be: Beginner, Expert, Professional, etc.
  xp: 4200,
  coins: 30,
  cash: 5000,
  name: "Ajay"
};

const stadiumLevels = [
  { name: "Basic", capacity: 1000, revenue: 100, cost: 1000, requiredLevel: "Beginner" },
  { name: "Standard", capacity: 2500, revenue: 250, cost: 2500, requiredLevel: "Expert" },
  { name: "Deluxe", capacity: 5000, revenue: 500, cost: 5000, requiredLevel: "Professional" },
  { name: "Elite", capacity: 10000, revenue: 1000, cost: 10000, requiredLevel: "Master" },
  { name: "Mega", capacity: 20000, revenue: 2000, cost: 20000, requiredLevel: "Supreme" }
];

let currentStadiumLevelIndex = 0;

function getManagerLevelRank(level) {
  const ranks = ["Beginner", "Expert", "Professional", "Master", "Supreme", "World Class", "Ultimate", "Titan", "The Boss"];
  return ranks.indexOf(level);
}

function updateUI() {
  const stadium = stadiumLevels[currentStadiumLevelIndex];
  document.getElementById('stadium-level-name').textContent = stadium.name;
  document.getElementById('stadium-capacity').textContent = stadium.capacity;
  document.getElementById('stadium-revenue').textContent = stadium.revenue;
  document.getElementById('stadium-upgrade-cost').textContent = stadium.cost;
  document.getElementById('required-manager-level').textContent = stadium.requiredLevel;

  // Top bar info
  document.getElementById('username').textContent = manager.name;
  document.getElementById('xp').textContent = `XP: ${manager.xp}`;
  document.getElementById('coins').textContent = `Coins: ${manager.coins}`;
  document.getElementById('cash').textContent = `Cash: ₹${manager.cash}`;
}

function init() {
  loadSharedUI();
  updateUI();

  document.getElementById('upgrade-btn').addEventListener('click', () => {
    const nextLevelIndex = currentStadiumLevelIndex + 1;

    if (nextLevelIndex >= stadiumLevels.length) {
      document.getElementById('upgrade-msg').textContent = "🏟️ Stadium is at max level.";
      return;
    }

    const nextLevel = stadiumLevels[nextLevelIndex];

    if (getManagerLevelRank(manager.level) < getManagerLevelRank(nextLevel.requiredLevel)) {
      document.getElementById('upgrade-msg').textContent = `⛔ Requires manager level: ${nextLevel.requiredLevel}`;
      return;
    }

    if (manager.cash < nextLevel.cost) {
      document.getElementById('upgrade-msg').textContent = `💸 Not enough cash to upgrade.`;
      return;
    }

    // Upgrade success
    manager.cash -= nextLevel.cost;
    currentStadiumLevelIndex = nextLevelIndex;
    document.getElementById('upgrade-msg').textContent = "✅ Stadium upgraded!";
    updateUI();
  });
}

init();
