// modules/level/service.js
const pool = require('./db/pool');
const { NORMAL_MAX_LEVEL, getXpNeeded, getLevelUpCoinReward } = require('./constants');
const { awardCoin } = require('./lib/economy-client');

async function getLevel(guildId, userId) {
  const { rows } = await pool.query('SELECT xp, level FROM user_levels WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  if (!rows.length) return { xp: 0, level: 0 };
  return { xp: Number(rows[0].xp), level: rows[0].level };
}

async function addXp(guildId, userId, amount) {
  await pool.query(
    'INSERT INTO user_levels (guild_id, user_id, xp, level) VALUES ($1,$2,0,0) ON CONFLICT (guild_id, user_id) DO NOTHING',
    [guildId, userId]
  );
  let { xp, level } = await getLevel(guildId, userId);
  if (level >= NORMAL_MAX_LEVEL) return { leveled: false, xpGained: 0, coinReward: 0, level, xp };

  xp += amount;
  let leveled = false;
  let totalCoinReward = 0;
  let newLevel = level;

  while (xp >= getXpNeeded(newLevel) && newLevel < NORMAL_MAX_LEVEL) {
    xp -= getXpNeeded(newLevel);
    newLevel++;
    leveled = true;
    totalCoinReward += getLevelUpCoinReward(newLevel);
  }
  if (newLevel >= NORMAL_MAX_LEVEL) xp = 0;

  await pool.query('UPDATE user_levels SET xp=$1, level=$2 WHERE guild_id=$3 AND user_id=$4', [xp, newLevel, guildId, userId]);

  let balance = null;
  if (leveled && totalCoinReward > 0) {
    balance = await awardCoin(guildId, userId, totalCoinReward, 'level_up_reward');
  }

  return { leveled, newLevel, xpGained: amount, coinReward: totalCoinReward, balance, xp };
}

async function getLeaderboard(guildId, limit = 10) {
  const { rows } = await pool.query(
    'SELECT user_id, level, xp FROM user_levels WHERE guild_id=$1 ORDER BY level DESC, xp DESC LIMIT $2',
    [guildId, limit]
  );
  return rows.map(r => ({ userId: r.user_id, level: r.level, xp: Number(r.xp) }));
}

module.exports = { getLevel, addXp, getLeaderboard };
