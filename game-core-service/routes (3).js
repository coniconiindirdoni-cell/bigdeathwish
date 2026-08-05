// modules/mmo-equipment/service.js
const pool = require('../../db/pool');
const {
  MMORPG_PETS, MMO_PET_MAX_LEVEL, MMO_PET_BONUS_PER_LV, MMO_PET_MAX_ACTIVE,
  getPetShardCostForLevel, pickMmoPetFromEgg,
  CRAFT_MATERIALS, ADVANCED_CRAFT_MATERIALS,
  WEAPON_TIERS, getWeaponBattlePower,
  ARMOR_TIERS, getArmorBattlePower,
  ENHANCEMENT_SUCCESS_RATES, ENHANCEMENT_COIN_COST, ENHANCEMENT_MAT_COST,
  getAdvancedEnhanceRequirement,
} = require('./constants');

// ---- CRAFT MALZEMELERİ ----
async function getCraftMats(guildId, userId) {
  const { rows } = await pool.query('SELECT mat_key, quantity FROM mmo_craft_mats WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  return rows;
}
async function getCraftMatQty(guildId, userId, key) {
  const { rows } = await pool.query('SELECT quantity FROM mmo_craft_mats WHERE guild_id=$1 AND user_id=$2 AND mat_key=$3', [guildId, userId, key]);
  return rows[0]?.quantity || 0;
}
async function addCraftMat(guildId, userId, key, qty) {
  await pool.query(
    `INSERT INTO mmo_craft_mats (guild_id, user_id, mat_key, quantity) VALUES ($1,$2,$3,$4)
     ON CONFLICT (guild_id, user_id, mat_key) DO UPDATE SET quantity = mmo_craft_mats.quantity + $4`,
    [guildId, userId, key, qty]
  );
}
async function hasCraftMats(guildId, userId, recipe) {
  for (const [key, qty] of Object.entries(recipe)) {
    if ((await getCraftMatQty(guildId, userId, key)) < qty) return false;
  }
  return true;
}
async function spendCraftMats(guildId, userId, recipe) {
  if (!(await hasCraftMats(guildId, userId, recipe))) return false;
  for (const [key, qty] of Object.entries(recipe)) await addCraftMat(guildId, userId, key, -qty);
  return true;
}
async function sellCraftMat(guildId, userId, key, qty) {
  const owned = await getCraftMatQty(guildId, userId, key);
  if (owned < qty) return { ok: false, reason: 'insufficient_quantity' };
  const def = [...CRAFT_MATERIALS, ...ADVANCED_CRAFT_MATERIALS].find(m => m.key === key);
  if (!def) return { ok: false, reason: 'unknown_material' };
  await addCraftMat(guildId, userId, key, -qty);
  return { ok: true, earned: def.sellValue * qty };
}

// ---- YUMURTA -> PET ----
async function getEggs(guildId, userId) {
  const { rows } = await pool.query('SELECT egg_type, quantity FROM mmo_eggs WHERE guild_id=$1 AND user_id=$2 AND quantity>0', [guildId, userId]);
  return rows;
}
async function addEgg(guildId, userId, eggType, qty = 1) {
  await pool.query(
    `INSERT INTO mmo_eggs (guild_id, user_id, egg_type, quantity) VALUES ($1,$2,$3,$4)
     ON CONFLICT (guild_id, user_id, egg_type) DO UPDATE SET quantity = mmo_eggs.quantity + $4`,
    [guildId, userId, eggType, qty]
  );
}
async function consumeEgg(guildId, userId, eggType) {
  const { rows } = await pool.query(
    `UPDATE mmo_eggs SET quantity = quantity - 1 WHERE guild_id=$1 AND user_id=$2 AND egg_type=$3 AND quantity > 0 RETURNING quantity`,
    [guildId, userId, eggType]
  );
  return rows.length > 0;
}

async function getMmoPets(guildId, userId) {
  const { rows } = await pool.query('SELECT pet_key, level, hatched_at FROM mmo_pets WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  return rows.map(r => ({ ...MMORPG_PETS.find(p => p.key === r.pet_key), level: r.level, hatchedAt: r.hatched_at }));
}
async function hatchEgg(guildId, userId, eggType) {
  if (!(await consumeEgg(guildId, userId, eggType))) return { ok: false, reason: 'no_egg' };
  const petDef = pickMmoPetFromEgg(eggType);
  const hatchedAt = new Date().toISOString();
  await pool.query(
    'INSERT INTO mmo_pets (guild_id, user_id, pet_key, level, hatched_at) VALUES ($1,$2,$3,1,$4)',
    [guildId, userId, petDef.key, hatchedAt]
  );
  return { ok: true, pet: petDef, hatchedAt };
}

async function getActiveMmoPets(guildId, userId) {
  const { rows } = await pool.query(
    'SELECT slot, pet_key, pet_hatched_at FROM mmo_active_pets WHERE guild_id=$1 AND user_id=$2 ORDER BY slot',
    [guildId, userId]
  );
  return rows.filter(r => r.pet_key).map(r => ({
    slot: r.slot, ...MMORPG_PETS.find(p => p.key === r.pet_key), hatchedAt: r.pet_hatched_at,
  }));
}
async function setActiveMmoPet(guildId, userId, slot, petKey, hatchedAt) {
  if (slot < 0 || slot >= MMO_PET_MAX_ACTIVE) return { ok: false, reason: 'invalid_slot' };
  await pool.query(
    `INSERT INTO mmo_active_pets (guild_id, user_id, slot, pet_key, pet_hatched_at) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (guild_id, user_id, slot) DO UPDATE SET pet_key=$4, pet_hatched_at=$5`,
    [guildId, userId, slot, petKey, hatchedAt]
  );
  return { ok: true };
}
async function clearActiveMmoPetSlot(guildId, userId, slot) {
  await pool.query('DELETE FROM mmo_active_pets WHERE guild_id=$1 AND user_id=$2 AND slot=$3', [guildId, userId, slot]);
}

async function getPetShards(guildId, userId, petKey) {
  const { rows } = await pool.query('SELECT quantity FROM mmo_pet_shards WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3', [guildId, userId, petKey]);
  return rows[0]?.quantity || 0;
}
async function addPetShards(guildId, userId, petKey, qty) {
  await pool.query(
    `INSERT INTO mmo_pet_shards (guild_id, user_id, pet_key, quantity) VALUES ($1,$2,$3,$4)
     ON CONFLICT (guild_id, user_id, pet_key) DO UPDATE SET quantity = mmo_pet_shards.quantity + $4`,
    [guildId, userId, petKey, qty]
  );
}
async function upgradeMmoPet(guildId, userId, petKey, hatchedAt) {
  const { rows } = await pool.query(
    'SELECT level FROM mmo_pets WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3 AND hatched_at=$4',
    [guildId, userId, petKey, hatchedAt]
  );
  if (!rows.length) return { ok: false, reason: 'not_owned' };
  const lvl = rows[0].level;
  if (lvl >= MMO_PET_MAX_LEVEL) return { ok: false, reason: 'max_level' };

  const shardCost = getPetShardCostForLevel(lvl);
  if (shardCost > 0) {
    const owned = await getPetShards(guildId, userId, petKey);
    if (owned < shardCost) return { ok: false, reason: 'insufficient_shards', required: shardCost, owned };
    await addPetShards(guildId, userId, petKey, -shardCost);
  }
  await pool.query(
    'UPDATE mmo_pets SET level = level + 1 WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3 AND hatched_at=$4',
    [guildId, userId, petKey, hatchedAt]
  );
  return { ok: true, newLevel: lvl + 1, shardCost };
}

async function getActivePetStatBonus(guildId, userId, statKey) {
  const active = await getActiveMmoPets(guildId, userId);
  return active.reduce((sum, p) => {
    if (p.bonusType !== statKey) return sum;
    return sum + p.bonusBase * (1 + ((p.level || 1) - 1) * (MMO_PET_BONUS_PER_LV / 100));
  }, 0);
}

// ---- SANDIK ----
async function getChests(guildId, userId) {
  const { rows } = await pool.query('SELECT chest_type, quantity FROM mmo_chests WHERE guild_id=$1 AND user_id=$2 AND quantity>0', [guildId, userId]);
  return rows;
}
async function addChest(guildId, userId, chestType, qty = 1) {
  await pool.query(
    `INSERT INTO mmo_chests (guild_id, user_id, chest_type, quantity) VALUES ($1,$2,$3,$4)
     ON CONFLICT (guild_id, user_id, chest_type) DO UPDATE SET quantity = mmo_chests.quantity + $4`,
    [guildId, userId, chestType, qty]
  );
}
async function consumeChest(guildId, userId, chestType) {
  const { rows } = await pool.query(
    'UPDATE mmo_chests SET quantity = quantity - 1 WHERE guild_id=$1 AND user_id=$2 AND chest_type=$3 AND quantity > 0 RETURNING quantity',
    [guildId, userId, chestType]
  );
  return rows.length > 0;
}
async function openChest(guildId, userId, chestType) {
  if (!(await consumeChest(guildId, userId, chestType))) return { ok: false, reason: 'no_chest' };

  const roll = Math.random();
  if (roll < 0.55) {
    const pool_ = CRAFT_MATERIALS;
    const mat = pool_[Math.floor(Math.random() * pool_.length)];
    const qty = 3 + Math.floor(Math.random() * 8);
    await addCraftMat(guildId, userId, mat.key, qty);
    return { ok: true, type: 'craft_mat', item: mat, qty };
  }
  if (roll < 0.85) {
    const eggPoolByChest = { ahsap: 'siradan', demir: 'nadir', altin: 'altin', elmas: 'kristal', kraliyet: 'kraliyet' };
    const eggType = eggPoolByChest[chestType] || 'siradan';
    await addEgg(guildId, userId, eggType, 1);
    return { ok: true, type: 'egg', eggType };
  }
  const adv = ADVANCED_CRAFT_MATERIALS[Math.floor(Math.random() * ADVANCED_CRAFT_MATERIALS.length)];
  await addCraftMat(guildId, userId, adv.key, 1);
  return { ok: true, type: 'craft_mat', item: adv, qty: 1, rare: true };
}

// ---- SİLAH ----
async function getWeapons(guildId, userId) {
  const { rows } = await pool.query('SELECT id, weapon_key, enhancement FROM mmo_weapons WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  return rows;
}
async function addWeapon(guildId, userId, weaponKey) {
  const { rows } = await pool.query(
    'INSERT INTO mmo_weapons (guild_id, user_id, weapon_key, enhancement) VALUES ($1,$2,$3,0) RETURNING id',
    [guildId, userId, weaponKey]
  );
  return rows[0].id;
}
async function getBestWeapon(guildId, userId) {
  const weapons = await getWeapons(guildId, userId);
  if (!weapons.length) return null;
  let best = null, bestPower = -1;
  for (const w of weapons) {
    const power = getWeaponBattlePower(w.weapon_key, w.enhancement);
    if (power > bestPower) { bestPower = power; best = w; }
  }
  return { ...best, power: bestPower };
}
async function craftWeapon(guildId, userId, weaponTypeKey, tierKey, chargeCallback) {
  const tier = WEAPON_TIERS.find(t => t.key === tierKey);
  if (!tier) return { ok: false, reason: 'unknown_tier' };
  const weaponKey = `${weaponTypeKey}_${tierKey}`;

  if (tier.canBuy && tier.price > 0) {
    const charge = await chargeCallback(tier.price);
    if (!charge.ok) return { ok: false, reason: 'insufficient_balance', price: tier.price };
  } else {
    if (!(await hasCraftMats(guildId, userId, tier.craft))) return { ok: false, reason: 'insufficient_materials', required: tier.craft };
    await spendCraftMats(guildId, userId, tier.craft);
  }
  const id = await addWeapon(guildId, userId, weaponKey);
  return { ok: true, id, weaponKey };
}

// ---- ZIRH ----
async function getArmors(guildId, userId) {
  const { rows } = await pool.query('SELECT id, armor_key, slot, enhancement FROM mmo_armors WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  return rows;
}
async function addArmor(guildId, userId, tierKey, slotKey) {
  const { rows } = await pool.query(
    'INSERT INTO mmo_armors (guild_id, user_id, armor_key, slot, enhancement) VALUES ($1,$2,$3,$4,0) RETURNING id',
    [guildId, userId, tierKey, slotKey]
  );
  return rows[0].id;
}
async function getBestArmorPerSlot(guildId, userId) {
  const armors = await getArmors(guildId, userId);
  const bySlot = {};
  for (const a of armors) {
    const power = getArmorBattlePower(a.armor_key, a.enhancement, a.slot);
    if (!bySlot[a.slot] || power > bySlot[a.slot].power) bySlot[a.slot] = { ...a, power };
  }
  return bySlot;
}
async function craftArmor(guildId, userId, tierKey, slotKey, chargeCallback) {
  const tier = ARMOR_TIERS.find(t => t.key === tierKey);
  if (!tier) return { ok: false, reason: 'unknown_tier' };

  if (tier.canBuy && tier.price > 0) {
    const charge = await chargeCallback(tier.price);
    if (!charge.ok) return { ok: false, reason: 'insufficient_balance', price: tier.price };
  } else {
    if (!(await hasCraftMats(guildId, userId, tier.craft))) return { ok: false, reason: 'insufficient_materials', required: tier.craft };
    await spendCraftMats(guildId, userId, tier.craft);
  }
  const id = await addArmor(guildId, userId, tierKey, slotKey);
  return { ok: true, id, tierKey, slotKey };
}

// ---- GELİŞTİRME (+0..+10) ----
async function enhanceItem(guildId, userId, itemType, itemId, chargeCallback) {
  const table = itemType === 'weapon' ? 'mmo_weapons' : 'mmo_armors';
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id=$1 AND guild_id=$2 AND user_id=$3`, [itemId, guildId, userId]);
  if (!rows.length) return { ok: false, reason: 'not_found' };
  const item = rows[0];
  const enh = item.enhancement;
  if (enh >= 10) return { ok: false, reason: 'max_enhancement' };

  const coinCost = ENHANCEMENT_COIN_COST[enh];
  const advReq = getAdvancedEnhanceRequirement(enh);
  const matReq = advReq || ENHANCEMENT_MAT_COST;

  if (!(await hasCraftMats(guildId, userId, matReq))) return { ok: false, reason: 'insufficient_materials', required: matReq };
  const charge = await chargeCallback(coinCost);
  if (!charge.ok) return { ok: false, reason: 'insufficient_balance', cost: coinCost };
  await spendCraftMats(guildId, userId, matReq);

  const successRate = ENHANCEMENT_SUCCESS_RATES[enh];
  const success = Math.random() * 100 < successRate;
  if (success) {
    await pool.query(`UPDATE ${table} SET enhancement = enhancement + 1 WHERE id=$1`, [itemId]);
  }
  return { ok: true, success, newEnhancement: success ? enh + 1 : enh, coinCost, matReq, successRate, balance: charge.balance };
}

module.exports = {
  getCraftMats, getCraftMatQty, addCraftMat, hasCraftMats, spendCraftMats, sellCraftMat,
  getEggs, addEgg, consumeEgg, getMmoPets, hatchEgg,
  getActiveMmoPets, setActiveMmoPet, clearActiveMmoPetSlot,
  getPetShards, addPetShards, upgradeMmoPet, getActivePetStatBonus,
  getChests, addChest, consumeChest, openChest,
  getWeapons, addWeapon, getBestWeapon, craftWeapon,
  getArmors, addArmor, getBestArmorPerSlot, craftArmor,
  enhanceItem,
};
