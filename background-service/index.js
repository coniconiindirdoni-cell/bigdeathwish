// modules/cleanup/service.js
const pool = require('../../db/pool');

async function markTaskRun(taskKey, status, error = null) {
  await pool.query(
    `INSERT INTO background_tasks (task_key, last_run_at, last_status, last_error) VALUES ($1, NOW(), $2, $3)
     ON CONFLICT (task_key) DO UPDATE SET last_run_at = NOW(), last_status = $2, last_error = $3`,
    [taskKey, status, error]
  );
}

async function cleanupExpiredTempBoosts() {
  const { rowCount } = await pool.query('DELETE FROM temp_xp_boosts WHERE expires_at < $1', [Date.now()]);
  return rowCount;
}

async function cleanupExpiredTheftShields() {
  const { rowCount } = await pool.query('DELETE FROM theft_shields WHERE expires_at < $1', [Date.now()]);
  return rowCount;
}

async function cleanupOldLogs() {
  const { rowCount } = await pool.query(
    "DELETE FROM logs WHERE level IN ('INFO','WARNING') AND created_at < NOW() - INTERVAL '30 days'"
  );
  return rowCount;
}

async function cleanupOldDailyRecords() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }).split('.').reverse().join('-');
  const r1 = await pool.query('DELETE FROM daily_claims WHERE claim_date < $1', [cutoff]);
  const r2 = await pool.query('DELETE FROM daily_counts WHERE claim_date < $1', [cutoff]);
  const r3 = await pool.query('DELETE FROM message_counts WHERE count_date < $1', [cutoff]);
  return { dailyClaims: r1.rowCount, dailyCounts: r2.rowCount, messageCounts: r3.rowCount };
}

async function cleanupOldHistory() {
  const r1 = await pool.query("DELETE FROM game_history WHERE played_at < NOW() - INTERVAL '60 days'");
  const r2 = await pool.query("DELETE FROM moderation_logs WHERE created_at < NOW() - INTERVAL '60 days'");
  return { gameHistory: r1.rowCount, moderationLogs: r2.rowCount };
}

async function runFullCleanup() {
  const results = {};
  try {
    results.expiredTempBoosts = await cleanupExpiredTempBoosts();
    results.expiredTheftShields = await cleanupExpiredTheftShields();
    results.oldLogs = await cleanupOldLogs();
    results.oldDailyRecords = await cleanupOldDailyRecords();
    results.oldHistory = await cleanupOldHistory();
    await markTaskRun('full_cleanup', 'success');
  } catch (err) {
    await markTaskRun('full_cleanup', 'failed', err.message);
    throw err;
  }
  return results;
}

async function getTaskStatus(taskKey) {
  const { rows } = await pool.query('SELECT * FROM background_tasks WHERE task_key=$1', [taskKey]);
  return rows[0] || null;
}
async function getAllTaskStatuses() {
  const { rows } = await pool.query('SELECT * FROM background_tasks ORDER BY task_key');
  return rows;
}

module.exports = {
  markTaskRun, cleanupExpiredTempBoosts, cleanupExpiredTheftShields,
  cleanupOldLogs, cleanupOldDailyRecords, cleanupOldHistory, runFullCleanup,
  getTaskStatus, getAllTaskStatuses,
};
