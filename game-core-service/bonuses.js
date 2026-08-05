// modules/mining/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const { getMiningMaxEnergy, getMiningXpNeeded, getMiningRank } = require('./constants');
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

// Ekonomiye tek satırlık charge callback'i üretir (dig/market fonksiyonları bunu kullanıyor)
function chargeFactory(guildId, userId, reason) {
  return async (amount) => {
    try {
      const result = await economy.adjustBalance(guildId, userId, -amount, reason);
      return { ok: true, balance: result.balance };
    } catch (err) {
      if (err.status === 400 && err.data && err.data.error === 'insufficient_funds') {
        return { ok: false, error: 'insufficient_funds' };
      }
      throw err; // beklenmeyen hata -> 500'e düşsün, loglansın
    }
  };
}

// GET /mining/status?guildId=&userId=
router.get('/status', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    let data = await svc.getMiningData(ids.guildId, ids.userId);
    data = svc.regenEnergy(data);
    await svc.saveMiningData(ids.guildId, ids.userId, data); // regen'i kalıcı hale getir
    const rank = getMiningRank(data.mining_level);
    res.json({
      ok: true,
      miners: data.miners,
      miningLevel: data.mining_level,
      miningXp: data.mining_xp,
      xpNeeded: getMiningXpNeeded(data.mining_level),
      energy: data.energy,
      maxEnergy: getMiningMaxEnergy(data),
      totalOresMined: data.total_ores_mined,
      foodUsesLeft: (data.bread_uses || 0) + (data.soup_uses || 0) + (data.meat_uses || 0),
      rank,
    });
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Madencilik durumu alınamadı.' });
  }
});

// POST /mining/dig  { guildId, userId }
router.post('/dig', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const cd = svc.checkCooldown(ids.guildId, ids.userId);
  if (cd > 0) return res.status(429).json({ ok: false, error: 'cooldown', secondsLeft: cd });

  try {
    const result = await svc.performDig(ids.guildId, ids.userId, chargeFactory(ids.guildId, ids.userId, 'mining_trip'));
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Madencilik işlemi başarısız oldu.' });
  }
});

// GET /mining/inventory?guildId=&userId=
router.get('/inventory', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const inv = await svc.getMiningInventory(ids.guildId, ids.userId);
    res.json({ ok: true, inventory: inv.filter(r => Number(r.amount) > 0) });
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Envanter alınamadı.' });
  }
});

// POST /mining/sell  { guildId, userId }
router.post('/sell', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    // Envanter ÖNCE atomik olarak sahiplenilir (bkz. service.js açıklaması),
    // bu yüzden ağ hatası nedeniyle isteğin 2 kez gelmesi çift ödeme yaratmaz.
    const sale = await svc.claimInventoryForSale(ids.guildId, ids.userId);
    if (!sale.total) return res.status(400).json({ ok: false, error: 'empty_inventory' });

    try {
      const result = await economy.adjustBalance(ids.guildId, ids.userId, sale.total, 'mining_sell');
      res.json({ ok: true, ...sale, newBalance: result.balance });
    } catch (err) {
      // Envanter zaten silindi ama coin eklenemedi — manuel müdahale gerekir.
      await logCritical(
        `Madencilik satışı: envanter silindi ancak economy-service coin eklemedi. Tutar: ${sale.total}`,
        { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId, metadata: { sale } }
      );
      res.status(502).json({ ok: false, error: 'economy_service_unreachable', saleValue: sale.total });
    }
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Satış işlemi başarısız oldu.' });
  }
});

// GET /mining/leaderboard?guildId=&limit=
router.get('/leaderboard', async (req, res) => {
  const { guildId, limit } = req.query;
  if (!guildId) return res.status(400).json({ ok: false, error: 'guildId zorunludur.' });
  try {
    const rows = await svc.getMiningLeaderboard(guildId, Math.min(parseInt(limit, 10) || 10, 25));
    res.json({ ok: true, leaderboard: rows });
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Liderlik tablosu alınamadı.' });
  }
});

// POST /mining/buy-worker  { guildId, userId }
router.post('/buy-worker', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const result = await svc.buyWorkerTier(ids.guildId, ids.userId, chargeFactory(ids.guildId, ids.userId, 'mining_buy_worker'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'İşçi satın alınamadı.' });
  }
});

// POST /mining/buy-energy-cap  { guildId, userId }
router.post('/buy-energy-cap', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const result = await svc.buyEnergyCap(ids.guildId, ids.userId, chargeFactory(ids.guildId, ids.userId, 'mining_buy_energy_cap'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Enerji kapasitesi satın alınamadı.' });
  }
});

// POST /mining/buy-food  { guildId, userId, foodKey }
router.post('/buy-food', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { foodKey } = req.body;
  if (!foodKey) return res.status(400).json({ ok: false, error: 'foodKey zorunludur.' });
  try {
    const result = await svc.buyFood(ids.guildId, ids.userId, foodKey, chargeFactory(ids.guildId, ids.userId, 'mining_buy_food'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Yiyecek satın alınamadı.' });
  }
});

// POST /mining/buy-energy-fill  { guildId, userId }
router.post('/buy-energy-fill', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const result = await svc.buyEnergyFill(ids.guildId, ids.userId, chargeFactory(ids.guildId, ids.userId, 'mining_buy_energy'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mining/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Enerji doldurulamadı.' });
  }
});

module.exports = router;
