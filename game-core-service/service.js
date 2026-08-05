// modules/mmo-equipment/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const {
  PET_EGG_TYPES, MMORPG_CHESTS, CRAFT_MATERIALS, ADVANCED_CRAFT_MATERIALS,
  WEAPON_TYPES, WEAPON_TIERS, ARMOR_SLOTS, ARMOR_TIERS,
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

// ---------------- CRAFT MALZEMELERİ ----------------
router.get('/materials', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const rows = await svc.getCraftMats(ids.guildId, ids.userId);
    const allDefs = [...CRAFT_MATERIALS, ...ADVANCED_CRAFT_MATERIALS];
    res.json({ ok: true, materials: rows.map(r => ({ ...allDefs.find(d => d.key === r.mat_key), quantity: Number(r.quantity) })) });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Malzemeler alınamadı.' });
  }
});

router.post('/materials/sell', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { matKey, quantity } = req.body;
  const qty = Number(quantity) || 0;
  if (!matKey || qty <= 0) return res.status(400).json({ ok: false, error: 'matKey ve quantity zorunludur.' });
  try {
    const result = await svc.sellCraftMat(ids.guildId, ids.userId, matKey, qty);
    if (!result.ok) return res.status(400).json(result);
    const econ = await economy.adjustBalance(ids.guildId, ids.userId, result.earned, 'craft_mat_sell');
    res.json({ ok: true, earned: result.earned, balance: econ.balance });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Malzeme satılamadı.' });
  }
});

// ---------------- YUMURTA / PET ----------------
router.get('/eggs', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const eggs = await svc.getEggs(ids.guildId, ids.userId);
    res.json({ ok: true, catalog: PET_EGG_TYPES, owned: eggs.map(e => ({ ...PET_EGG_TYPES.find(t => t.key === e.egg_type), quantity: e.quantity })) });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Yumurtalar alınamadı.' });
  }
});

router.post('/eggs/buy', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { eggType } = req.body;
  const def = PET_EGG_TYPES.find(e => e.key === eggType);
  if (!def) return res.status(400).json({ ok: false, error: 'unknown_egg' });
  try {
    const econ = await economy.adjustBalance(ids.guildId, ids.userId, -def.price, 'mmo_egg_buy');
    await svc.addEgg(ids.guildId, ids.userId, eggType, 1);
    res.json({ ok: true, egg: def, balance: econ.balance });
  } catch (err) {
    if (err.status === 400 && err.data && err.data.error === 'insufficient_funds') return res.status(400).json({ ok: false, error: 'insufficient_funds', price: def.price });
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Yumurta satın alınamadı.' });
  }
});

router.post('/eggs/hatch', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { eggType } = req.body;
  try {
    const result = await svc.hatchEgg(ids.guildId, ids.userId, eggType);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Yumurta açılamadı.' });
  }
});

router.get('/pets', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const owned = await svc.getMmoPets(ids.guildId, ids.userId);
    const active = await svc.getActiveMmoPets(ids.guildId, ids.userId);
    res.json({ ok: true, owned, active });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Petler alınamadı.' });
  }
});

router.post('/pets/set-active', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { slot, petKey, hatchedAt } = req.body;
  try {
    let result;
    if (petKey) {
      result = await svc.setActiveMmoPet(ids.guildId, ids.userId, Number(slot), petKey, hatchedAt);
    } else {
      await svc.clearActiveMmoPetSlot(ids.guildId, ids.userId, Number(slot));
      result = { ok: true };
    }
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Aktif pet ayarlanamadı.' });
  }
});

router.post('/pets/upgrade', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { petKey, hatchedAt } = req.body;
  try {
    const result = await svc.upgradeMmoPet(ids.guildId, ids.userId, petKey, hatchedAt);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Pet yükseltilemedi.' });
  }
});

// GET /mmo-equipment/pets/stat-bonus?guildId=&userId=&stat=  -- dungeon-fight bunu kullanacak
router.get('/pets/stat-bonus', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { stat } = req.query;
  if (!stat) return res.status(400).json({ ok: false, error: 'stat zorunludur.' });
  try {
    const bonus = await svc.getActivePetStatBonus(ids.guildId, ids.userId, stat);
    res.json({ ok: true, stat, bonus });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Pet bonusu hesaplanamadı.' });
  }
});

// ---------------- SANDIK ----------------
router.get('/chests', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const chests = await svc.getChests(ids.guildId, ids.userId);
    res.json({ ok: true, catalog: MMORPG_CHESTS, owned: chests.map(c => ({ ...MMORPG_CHESTS.find(t => t.key === c.chest_type), quantity: c.quantity })) });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Sandıklar alınamadı.' });
  }
});

router.post('/chests/buy', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { chestType } = req.body;
  const def = MMORPG_CHESTS.find(c => c.key === chestType);
  if (!def) return res.status(400).json({ ok: false, error: 'unknown_chest' });
  try {
    const econ = await economy.adjustBalance(ids.guildId, ids.userId, -def.price, 'mmo_chest_buy');
    await svc.addChest(ids.guildId, ids.userId, chestType, 1);
    res.json({ ok: true, chest: def, balance: econ.balance });
  } catch (err) {
    if (err.status === 400 && err.data && err.data.error === 'insufficient_funds') return res.status(400).json({ ok: false, error: 'insufficient_funds', price: def.price });
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Sandık satın alınamadı.' });
  }
});

router.post('/chests/open', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { chestType } = req.body;
  try {
    const result = await svc.openChest(ids.guildId, ids.userId, chestType);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Sandık açılamadı.' });
  }
});

// ---------------- SİLAH ----------------
router.get('/weapons', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const weapons = await svc.getWeapons(ids.guildId, ids.userId);
    res.json({ ok: true, catalog: { types: WEAPON_TYPES, tiers: WEAPON_TIERS }, owned: weapons });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Silahlar alınamadı.' });
  }
});

router.post('/weapons/craft', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { weaponType, tierKey } = req.body;
  if (!WEAPON_TYPES.find(t => t.key === weaponType)) return res.status(400).json({ ok: false, error: 'unknown_weapon_type' });
  try {
    const result = await svc.craftWeapon(ids.guildId, ids.userId, weaponType, tierKey, chargeFactory(ids.guildId, ids.userId, 'mmo_weapon_craft'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Silah üretilemedi.' });
  }
});

// ---------------- ZIRH ----------------
router.get('/armors', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const armors = await svc.getArmors(ids.guildId, ids.userId);
    res.json({ ok: true, catalog: { slots: ARMOR_SLOTS, tiers: ARMOR_TIERS }, owned: armors });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Zırhlar alınamadı.' });
  }
});

router.post('/armors/craft', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { slotKey, tierKey } = req.body;
  if (!ARMOR_SLOTS.find(s => s.key === slotKey)) return res.status(400).json({ ok: false, error: 'unknown_slot' });
  try {
    const result = await svc.craftArmor(ids.guildId, ids.userId, tierKey, slotKey, chargeFactory(ids.guildId, ids.userId, 'mmo_armor_craft'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Zırh üretilemedi.' });
  }
});

// GET /mmo-equipment/gear/best?guildId=&userId=  -- dungeon-fight güç hesabı için tek çağrı
router.get('/gear/best', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  try {
    const bestWeapon = await svc.getBestWeapon(ids.guildId, ids.userId);
    const bestArmorBySlot = await svc.getBestArmorPerSlot(ids.guildId, ids.userId);
    res.json({ ok: true, bestWeapon, bestArmorBySlot });
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Ekipman gücü hesaplanamadı.' });
  }
});

// ---------------- GELİŞTİRME ----------------
router.post('/enhance', async (req, res) => {
  const ids = requireGuildUser(req, res); if (!ids) return;
  const { itemType, itemId } = req.body;
  if (itemType !== 'weapon' && itemType !== 'armor') return res.status(400).json({ ok: false, error: 'invalid_item_type' });
  try {
    const result = await svc.enhanceItem(ids.guildId, ids.userId, itemType, Number(itemId), chargeFactory(ids.guildId, ids.userId, 'mmo_enhance'));
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    logError(err, { fileName: 'mmo-equipment/routes.js', userId: ids.userId, serverId: ids.guildId });
    res.status(500).json({ ok: false, error: 'Geliştirme yapılamadı.' });
  }
});

module.exports = router;
