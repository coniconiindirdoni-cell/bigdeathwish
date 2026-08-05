// modules/rpg-core/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const { RPG_CLASSES } = require('./constants');
const economy = require('../../lib/economy-client');
const { logError } = require('../../lib/logger-client');

function requireGuildUser(req, res) {
  const { guildId, userId } = { ...req.query, ...req.body };
  if (!guildId || !userId) {
    res.status(400).json({ ok: false, error: 'guildId ve userId zorunludur.' });
    return null;
  }
  return { guildId, userId };
}

function chargeFactory(guildId, userId, reason) {
  return async (amount) => {
    try {
      const result = await economy.adjustBalance(guildId, userId, -amount, reason);
      return { ok: true, balance: result.balance };
    } catch (err) {
      if (err.status === 400 && err.data && err.data.error === 'insufficient_funds') return { ok: false, error: 'insufficient_funds' };
      throw err;
    }
  };
}

// GET /rpg-core/profile?guildId=&userId=
router.get('/profile', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const [rpgData, stats, cls] = await Promise.all([
      svc.getRpgData(ids.guildId, ids.userId),
      svc.getRpgStats(ids.guildId, ids.userId),
      svc.getPlayerClass(ids.guildId, ids.userId),
    ]);
    const classDef = cls ? RPG_CLASSES.find(c => c.key === cls) : null;
    res.json({
      ok: true,
      class: classDef,
      level: rpgData.rpg_level,
      xp: Number(rpgData.rpg_xp),
      stats: {
        hp: stats.hp, attack: stats.attack, defense: stats.defense,
        critical: stats.critical, speed: stats.speed, mana: stats.mana, magic: stats.magic,
      },
    });
  } catch (err) {
    logError(err, { fileName: 'rpg-core/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'RPG profili alınamadı.' });
  }
});

// POST /rpg-core/xp/add  { guildId, userId, amount }  — diğer modüller (dungeon-fight vb.) çağırır
router.post('/xp/add', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ ok: false, error: 'invalid_amount' });
  try {
    const result = await svc.addRpgXp(ids.guildId, ids.userId, amount);
    res.json({ ok: true, ...result });
  } catch (err) {
    logError(err, { fileName: 'rpg-core/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'RPG XP eklenemedi.' });
  }
});

// POST /rpg-core/class/select  { guildId, userId, classKey }
router.post('/class/select', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { classKey } = req.body;
  const def = RPG_CLASSES.find(c => c.key === classKey);
  if (!def) return res.status(400).json({ ok: false, error: 'unknown_class' });
  try {
    const cur = await svc.getPlayerClass(ids.guildId, ids.userId);
    if (cur) return res.status(400).json({ ok: false, error: 'class_already_set', current: RPG_CLASSES.find(c => c.key === cur) });
    await svc.setPlayerClass(ids.guildId, ids.userId, classKey);
    res.json({ ok: true, class: def });
  } catch (err) {
    logError(err, { fileName: 'rpg-core/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Sınıf seçilemedi.' });
  }
});

// GET /rpg-core/stats?guildId=&userId=
router.get('/stats', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const stats = await svc.getRpgStats(ids.guildId, ids.userId);
    const cls = await svc.getPlayerClass(ids.guildId, ids.userId);
    res.json({ ok: true, stats, class: cls });
  } catch (err) {
    logError(err, { fileName: 'rpg-core/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Statlar alınamadı.' });
  }
});

// POST /rpg-core/stats/upgrade  { guildId, userId, stat }
router.post('/stats/upgrade', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { stat } = req.body;
  if (!stat) return res.status(400).json({ ok: false, error: 'stat zorunludur.' });
  try {
    const result = await svc.upgradeRpgStat(ids.guildId, ids.userId, stat, chargeFactory(ids.guildId, ids.userId, 'rpg_stat_upgrade'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'rpg-core/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Stat yükseltilemedi.' });
  }
});

// POST /rpg-core/stats/reset  { guildId, userId } — statları sıfırlar, coin iade eder, sınıfı kaldırır
router.post('/stats/reset', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const refund = await svc.calcStatRefundTotal(ids.guildId, ids.userId);
    await svc.resetRpgStats(ids.guildId, ids.userId);
    await svc.clearPlayerClass(ids.guildId, ids.userId);

    let balance = null;
    if (refund > 0) {
      try {
        const result = await economy.adjustBalance(ids.guildId, ids.userId, refund, 'rpg_stat_reset_refund');
        balance = result.balance;
      } catch (err) {
        // İade başarısız olsa bile stat sıfırlama geri alınmaz — kritik loglanır, ops manuel telafi eder.
        const { logCritical } = require('../../lib/logger-client');
        await logCritical(`Stat sıfırlama iadesi başarısız: ${refund} coin`, {
          fileName: 'rpg-core/routes.js', userId: ids.userId, serverId: ids.guildId,
        });
      }
    }
    res.json({ ok: true, refund, balance });
  } catch (err) {
    logError(err, { fileName: 'rpg-core/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Statlar sıfırlanamadı.' });
  }
});

module.exports = router;
