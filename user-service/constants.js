// modules/level/constants.js — orijinal botla BİREBİR aynı formüller.
const NORMAL_MAX_LEVEL = 100;
const MESSAGE_XP_BASE = 2;

function getXpNeeded(currentLevel) {
  return Math.round((currentLevel + 1) * 100 * 0.7809375);
}

function getLevelUpCoinReward(level) {
  if (level >= 40) return 700;
  if (level >= 30) return 500;
  if (level >= 20) return 300;
  if (level >= 10) return 200;
  return 100;
}

module.exports = { NORMAL_MAX_LEVEL, MESSAGE_XP_BASE, getXpNeeded, getLevelUpCoinReward };
