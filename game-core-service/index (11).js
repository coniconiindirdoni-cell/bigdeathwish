// modules/woodcutting/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const { getWoodMaxEnergy, getWoodXpNeeded, getWoodRank } = require('./constants');
const economy = require('../../lib/economy-client');
const { logError, logCritical } = require('../../lib/logger-client');

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
      if (err.status === 400 && err.data && err.data.error === 'insufficient_funds') {
        return { ok: false, error: 'insufficient_funds' };
      }
      throw err;
    }
  };
}

router.get('/status', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    let data = await svc.getWoodData(ids.guildId, ids.userId);
    data = svc.regenEnergy(data);
    await svc.saveWoodData(ids.guildId, ids.userId, data);
    const rank = getWoodRank(data.wood_level);
    res.json({
      ok: true,
      lumberjacks: data.lumberjacks,
      woodLevel: data.wood_level,
      woodXp: data.wood_xp,
      xpNeeded: getWoodXpNeeded(data.wood_level),
      energy: data.energy,
      maxEnergy: getWoodMaxEnergy(data),
      totalLogsCut: data.total_logs_cut,
      foodUsesLeft: (data.bread_uses || 0) + (data.soup_uses || 0) + (data.meat_uses || 0),
      rank,
    });
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Odunculuk durumu alınamadı.' });
  }
});

router.post('/chop', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const cd = svc.checkCooldown(ids.guildId, ids.userId);
  if (cd > 0) return res.status(429).json({ ok: false, error: 'cooldown', secondsLeft: cd });

  try {
    const result = await svc.performChop(ids.guildId, ids.userId, chargeFactory(ids.guildId, ids.userId, 'woodcutting_trip'));
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Odunculuk işlemi başarısız oldu.' });
  }
});

router.get('/inventory', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const inv = await svc.getWoodInventory(ids.guildId, ids.userId);
    res.json({ ok: true, inventory: inv.filter(r => Number(r.amount) > 0) });
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Envanter alınamadı.' });
  }
});

router.post('/sell', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const sale = await svc.claimInventoryForSale(ids.guildId, ids.userId);
    if (!sale.total) return res.status(400).json({ ok: false, error: 'empty_inventory' });

    try {
      const result = await economy.adjustBalance(ids.guildId, ids.userId, sale.total, 'woodcutting_sell');
      res.json({ ok: true, ...sale, newBalance: result.balance });
    } catch (err) {
      await logCritical(
        `Odunculuk satışı: envanter silindi ancak economy-service coin eklemedi. Tutar: ${sale.total}`,
        { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId, metadata: { sale } }
      );
      res.status(502).json({ ok: false, error: 'economy_service_unreachable', saleValue: sale.total });
    }
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Satış işlemi başarısız oldu.' });
  }
});

router.get('/leaderboard', async (req, res) => {
  const { guildId, limit } = req.query;
  if (!guildId) return res.status(400).json({ ok: false, error: 'guildId zorunludur.' });
  try {
    const rows = await svc.getWoodLeaderboard(guildId, Math.min(parseInt(limit, 10) || 10, 25));
    res.json({ ok: true, leaderboard: rows });
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Liderlik tablosu alınamadı.' });
  }
});

router.post('/buy-worker', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const result = await svc.buyWorkerTier(ids.guildId, ids.userId, chargeFactory(ids.guildId, ids.userId, 'woodcutting_buy_worker'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Oduncu satın alınamadı.' });
  }
});

router.post('/buy-energy-cap', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const result = await svc.buyEnergyCap(ids.guildId, ids.userId, chargeFactory(ids.guildId, ids.userId, 'woodcutting_buy_energy_cap'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Enerji kapasitesi satın alınamadı.' });
  }
});

router.post('/buy-food', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { foodKey } = req.body;
  if (!foodKey) return res.status(400).json({ ok: false, error: 'foodKey zorunludur.' });
  try {
    const result = await svc.buyFood(ids.guildId, ids.userId, foodKey, chargeFactory(ids.guildId, ids.userId, 'woodcutting_buy_food'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Yiyecek satın alınamadı.' });
  }
});

router.post('/buy-energy-fill', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const result = await svc.buyEnergyFill(ids.guildId, ids.userId, chargeFactory(ids.guildId, ids.userId, 'woodcutting_buy_energy'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'woodcutting/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Enerji doldurulamadı.' });
  }
});

module.exports = router;
