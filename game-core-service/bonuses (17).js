// modules/pets-relics-antiques/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const {
  PETS, PET_UPGRADE_COSTS, PET_MAX_LEVEL, PET_FOODS,
  RELICS, getRelicMaxLv, getRelicUpgCost,
  ANTIQUES, MINING_TOOLS, WOOD_TOOLS,
} = require('./constants');
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

async function charge(guildId, userId, amount, reason) {
  try {
    const result = await economy.adjustBalance(guildId, userId, -amount, reason);
    return { ok: true, balance: result.balance };
  } catch (err) {
    if (err.status === 400 && err.data && err.data.error === 'insufficient_funds') return { ok: false, error: 'insufficient_funds' };
    throw err;
  }
}

// ================ PETS ================
router.get('/pets', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const owned = await svc.getPetRows(ids.guildId, ids.userId);
    const active = await svc.getActivePet(ids.guildId, ids.userId);
    const ownedFull = owned.map(r => ({ ...PETS.find(p => p.key === r.pet_key), level: r.level }));
    res.json({ ok: true, catalog: PETS, owned: ownedFull, active });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Pet bilgisi alınamadı.' });
  }
});

router.post('/pets/buy', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { petKey } = req.body;
  const def = PETS.find(p => p.key === petKey);
  if (!def) return res.status(400).json({ ok: false, error: 'unknown_pet' });
  try {
    if (await svc.hasPet(ids.guildId, ids.userId, petKey)) return res.status(400).json({ ok: false, error: 'already_owned' });
    const result = await charge(ids.guildId, ids.userId, def.price, 'pet_buy');
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error, price: def.price });
    await svc.buyPet(ids.guildId, ids.userId, petKey);
    res.json({ ok: true, pet: def, balance: result.balance });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Pet satın alınamadı.' });
  }
});

router.post('/pets/upgrade', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { petKey } = req.body;
  const def = PETS.find(p => p.key === petKey);
  if (!def) return res.status(400).json({ ok: false, error: 'unknown_pet' });
  try {
    const lv = await svc.getPetLevel(ids.guildId, ids.userId, petKey);
    if (lv <= 0) return res.status(400).json({ ok: false, error: 'not_owned' });
    if (lv >= PET_MAX_LEVEL) return res.status(400).json({ ok: false, error: 'max_level' });
    const cost = PET_UPGRADE_COSTS[lv];
    const result = await charge(ids.guildId, ids.userId, cost, 'pet_upgrade');
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error, cost });
    await svc.upgradePet(ids.guildId, ids.userId, petKey);
    res.json({ ok: true, pet: def, newLevel: lv + 1, cost, balance: result.balance });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Pet yükseltilemedi.' });
  }
});

router.post('/pets/set-active', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { petKey } = req.body;
  try {
    if (petKey && !(await svc.hasPet(ids.guildId, ids.userId, petKey))) return res.status(400).json({ ok: false, error: 'not_owned' });
    if (petKey) await svc.setActivePet(ids.guildId, ids.userId, petKey);
    else await svc.clearActivePet(ids.guildId, ids.userId);
    res.json({ ok: true, active: petKey || null });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Aktif pet ayarlanamadı.' });
  }
});

router.post('/pets/feed', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { petKey } = req.body;
  const food = PET_FOODS.find(f => f.petKey === petKey);
  if (!food) return res.status(400).json({ ok: false, error: 'unknown_pet' });
  try {
    if (!(await svc.hasPet(ids.guildId, ids.userId, petKey))) return res.status(400).json({ ok: false, error: 'not_owned' });
    const result = await charge(ids.guildId, ids.userId, food.price, 'pet_feed');
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error, price: food.price });
    const today = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }).split('.').reverse().join('-');
    await svc.setPetFedDate(ids.guildId, ids.userId, petKey, today);
    res.json({ ok: true, food, balance: result.balance });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Pet beslenemedi.' });
  }
});

router.get('/pets/check-hunger', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const killed = await svc.checkAndKillHungryPets(ids.guildId, ids.userId);
    res.json({ ok: true, killed });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Açlık kontrolü yapılamadı.' });
  }
});

// ================ RELIKLER ================
router.get('/relics', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const owned = await svc.getRelics(ids.guildId, ids.userId);
    const details = [];
    for (const key of owned) {
      const def = RELICS.find(r => r.key === key);
      const level = await svc.getRelicLevel(ids.guildId, ids.userId, key);
      details.push({ ...def, level });
    }
    const ejderCompleted = await svc.hasAllEjderParts(ids.guildId, ids.userId);
    const ejderLevel = ejderCompleted ? await svc.getEjderLevel(ids.guildId, ids.userId) : 0;
    res.json({ ok: true, catalog: RELICS, owned: details, ejderCompleted, ejderLevel });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Relik bilgisi alınamadı.' });
  }
});

router.post('/relics/buy', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { relicKey } = req.body;
  const def = RELICS.find(r => r.key === relicKey);
  if (!def) return res.status(400).json({ ok: false, error: 'unknown_relic' });
  try {
    if (await svc.hasRelic(ids.guildId, ids.userId, relicKey)) return res.status(400).json({ ok: false, error: 'already_owned' });
    const result = await charge(ids.guildId, ids.userId, def.price, 'relic_buy');
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error, price: def.price });
    await svc.buyRelic(ids.guildId, ids.userId, relicKey);
    const ejderCompleted = def.group === 'ejder' && (await svc.hasAllEjderParts(ids.guildId, ids.userId));
    res.json({ ok: true, relic: def, ejderCompleted, balance: result.balance });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Relik satın alınamadı.' });
  }
});

router.post('/relics/upgrade', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { relicKey } = req.body;
  const def = RELICS.find(r => r.key === relicKey);
  if (!def) return res.status(400).json({ ok: false, error: 'unknown_relic' });
  try {
    const lv = await svc.getRelicLevel(ids.guildId, ids.userId, relicKey);
    if (lv <= 0) return res.status(400).json({ ok: false, error: 'not_owned' });
    const maxLv = getRelicMaxLv(def);
    if (lv >= maxLv) return res.status(400).json({ ok: false, error: 'max_level' });
    const cost = getRelicUpgCost(def);
    const result = await charge(ids.guildId, ids.userId, cost, 'relic_upgrade');
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error, cost });
    await svc.upgradeRelic(ids.guildId, ids.userId, relicKey);
    res.json({ ok: true, relic: def, newLevel: lv + 1, cost, balance: result.balance });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Relik yükseltilemedi.' });
  }
});

router.post('/relics/upgrade-ejder', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    if (!(await svc.hasAllEjderParts(ids.guildId, ids.userId))) return res.status(400).json({ ok: false, error: 'set_incomplete' });
    const lv = await svc.getEjderLevel(ids.guildId, ids.userId);
    const EJDER_MAX_LEVEL = 5, EJDER_UPGRADE_COST = 3000;
    if (lv >= EJDER_MAX_LEVEL) return res.status(400).json({ ok: false, error: 'max_level' });
    const result = await charge(ids.guildId, ids.userId, EJDER_UPGRADE_COST, 'relic_upgrade_ejder');
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error, cost: EJDER_UPGRADE_COST });
    await svc.upgradeEjderSet(ids.guildId, ids.userId);
    res.json({ ok: true, newLevel: lv + 1, cost: EJDER_UPGRADE_COST, balance: result.balance });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Ejder Seti yükseltilemedi.' });
  }
});

// ================ ANTIKALAR ================
router.get('/antiques/market', async (req, res) => {
  const { guildId } = req.query;
  if (!guildId) return res.status(400).json({ ok: false, error: 'guildId zorunludur.' });
  try {
    const market = await svc.getDailyAntiqueMarket(guildId);
    res.json({ ok: true, market });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Antika marketi alınamadı.' });
  }
});

router.get('/antiques/inventory', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const inv = await svc.getAntiqueInventory(ids.guildId, ids.userId);
    const active = await svc.getAntiqueWithUpgrade(ids.guildId, ids.userId);
    res.json({
      ok: true,
      inventory: inv.map(r => ({ ...ANTIQUES.find(a => a.key === r.antique_key), count: Number(r.count) })),
      active,
    });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Antika envanteri alınamadı.' });
  }
});

router.post('/antiques/buy', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { antiqueKey } = req.body;
  try {
    const market = await svc.getDailyAntiqueMarket(ids.guildId);
    const def = market.find(a => a.key === antiqueKey);
    if (!def) return res.status(400).json({ ok: false, error: 'not_in_todays_market' });
    const result = await charge(ids.guildId, ids.userId, def.price, 'antique_buy');
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error, price: def.price });
    await svc.addAntique(ids.guildId, ids.userId, antiqueKey);
    res.json({ ok: true, antique: def, balance: result.balance });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Antika satın alınamadı.' });
  }
});

router.post('/antiques/set-active', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { antiqueKey } = req.body;
  try {
    if (antiqueKey) {
      const inv = await svc.getAntiqueInventory(ids.guildId, ids.userId);
      if (!inv.some(r => r.antique_key === antiqueKey)) return res.status(400).json({ ok: false, error: 'not_owned' });
      await svc.setActiveAntique(ids.guildId, ids.userId, antiqueKey);
    } else {
      await svc.clearActiveAntique(ids.guildId, ids.userId);
    }
    res.json({ ok: true, active: antiqueKey || null });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Aktif antika ayarlanamadı.' });
  }
});

router.post('/antiques/upgrade', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const active = await svc.getActiveAntique(ids.guildId, ids.userId);
    if (!active) return res.status(400).json({ ok: false, error: 'no_active_antique' });
    const info = svc.getAntiqueUpgradeInfo(active);
    const curUpg = await svc.getAntiqueUpgradeLevel(ids.guildId, ids.userId, active.key);
    if (curUpg >= info.maxUpg) return res.status(400).json({ ok: false, error: 'max_level' });
    const result = await charge(ids.guildId, ids.userId, info.cost, 'antique_upgrade');
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error, cost: info.cost });
    await svc.setAntiqueUpgradeLevel(ids.guildId, ids.userId, active.key, curUpg + 1);
    res.json({ ok: true, antique: active, newUpgradeLevel: curUpg + 1, maxUpg: info.maxUpg, cost: info.cost, balance: result.balance });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Antika yükseltilemedi.' });
  }
});

// ================ ARAÇLAR (envanter görüntüleme) ================
router.get('/tools', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const tools = await svc.getPlayerTools(ids.guildId, ids.userId);
    const allDefs = [...MINING_TOOLS, ...WOOD_TOOLS];
    const withDefs = tools.map(t => ({ ...allDefs.find(d => d.key === t.tool_key), quantity: t.quantity }));
    res.json({ ok: true, tools: withDefs });
  } catch (err) {
    logError(err, { fileName: 'pets-relics-antiques/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Araç envanteri alınamadı.' });
  }
});

module.exports = router;
