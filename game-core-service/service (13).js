// modules/fishing/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const { LINE_SNAP_COST, ROD_BREAK_COST, FISH_BOOST_PRICE, FISH_BOOST_USES } = require('./constants');
const economy = require('../../lib/economy-client');
const { logError, logCritical, logWarning } = require('../../lib/logger-client');

function requireGuildUser(req, res) {
  const { guildId, userId } = { ...req.query, ...req.body };
  if (!guildId || !userId) {
    res.status(400).json({ ok: false, error: 'guildId ve userId zorunludur.' });
    return null;
  }
  return { guildId, userId };
}

/** Ceza tahsilatı - bakiye yetersiz olsa bile engellenmez (orijinal davranış), sadece loglanır. */
async function chargePenalty(guildId, userId, amount, reason) {
  try {
    const result = await economy.adjustBalance(guildId, userId, -amount, reason);
    return result.balance;
  } catch (err) {
    await logWarning(`Ceza tahsilatı başarısız (bakiye yetersiz olabilir): ${reason}`, {
      fileName: 'fishing/routes.js', userId, serverId: guildId,
    });
    return null;
  }
}

// POST /fishing/cast  { guildId, userId }
router.post('/cast', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const cd = svc.checkCooldown(ids.guildId, ids.userId);
  if (cd > 0) return res.status(429).json({ ok: false, error: 'cooldown', secondsLeft: cd });

  try {
    const boosted = await svc.consumeFishBoost(ids.guildId, ids.userId);
    const result = await svc.resolveFishCast(ids.guildId, ids.userId, boosted);

    if (result.type === 'rod_break') {
      const balance = await chargePenalty(ids.guildId, ids.userId, ROD_BREAK_COST, 'fishing_rod_break');
      return res.json({ ok: true, type: 'rod_break', cost: ROD_BREAK_COST, balance });
    }
    if (result.type === 'line_snap') {
      const balance = await chargePenalty(ids.guildId, ids.userId, LINE_SNAP_COST, 'fishing_line_snap');
      return res.json({ ok: true, type: 'line_snap', cost: LINE_SNAP_COST, balance });
    }
    if (result.type === 'empty') {
      return res.json({ ok: true, type: 'empty' });
    }

    const fish = result.fish;
    await svc.addFish(ids.guildId, ids.userId, fish.key, 1);
    res.json({ ok: true, type: 'catch', fish, marketValue: svc.getFishValue(fish.key), boosted });
  } catch (err) {
    logError(err, { fileName: 'fishing/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Balık tutma işlemi başarısız oldu.' });
  }
});

// GET /fishing/inventory?guildId=&userId=
router.get('/inventory', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const inv = await svc.getInventory(ids.guildId, ids.userId);
    res.json({ ok: true, inventory: inv.map(r => ({ fishKey: r.fish_key, count: Number(r.count), value: svc.getFishValue(r.fish_key) })) });
  } catch (err) {
    logError(err, { fileName: 'fishing/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Envanter alınamadı.' });
  }
});

// GET /fishing/market
router.get('/market', (_req, res) => {
  res.json({ ok: true, market: svc.getFishMarketSnapshot() });
});

// POST /fishing/sell  { guildId, userId }
router.post('/sell', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const sale = await svc.claimInventoryForSale(ids.guildId, ids.userId);
    if (!sale.total) return res.status(400).json({ ok: false, error: 'empty_inventory' });

    try {
      const result = await economy.adjustBalance(ids.guildId, ids.userId, sale.total, 'fishing_sell');
      res.json({ ok: true, ...sale, newBalance: result.balance });
    } catch (err) {
      await logCritical(
        `Balık satışı: envanter sıfırlandı ancak economy-service coin eklemedi. Tutar: ${sale.total}`,
        { fileName: 'fishing/routes.js', userId: ids.userId, serverId: ids.guildId, metadata: { sale } }
      );
      res.status(502).json({ ok: false, error: 'economy_service_unreachable', saleValue: sale.total });
    }
  } catch (err) {
    logError(err, { fileName: 'fishing/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Satış işlemi başarısız oldu.' });
  }
});

// POST /fishing/boost-buy  { guildId, userId }
router.post('/boost-buy', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const result = await economy.adjustBalance(ids.guildId, ids.userId, -FISH_BOOST_PRICE, 'fishing_boost_buy');
    await svc.addFishBoostUses(ids.guildId, ids.userId, FISH_BOOST_USES);
    const usesLeft = await svc.getFishBoostUses(ids.guildId, ids.userId);
    res.json({ ok: true, price: FISH_BOOST_PRICE, usesLeft, balance: result.balance });
  } catch (err) {
    if (err.status === 400 && err.data && err.data.error === 'insufficient_funds') {
      return res.status(400).json({ ok: false, error: 'insufficient_funds', price: FISH_BOOST_PRICE });
    }
    logError(err, { fileName: 'fishing/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Boost satın alınamadı.' });
  }
});

// GET /fishing/boost-status?guildId=&userId=
router.get('/boost-status', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const usesLeft = await svc.getFishBoostUses(ids.guildId, ids.userId);
    res.json({ ok: true, usesLeft });
  } catch (err) {
    logError(err, { fileName: 'fishing/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Boost durumu alınamadı.' });
  }
});

module.exports = router;
