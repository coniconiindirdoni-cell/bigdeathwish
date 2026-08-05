// modules/pets-relics-antiques/service.js
const pool = require('../../db/pool');
const {
  PETS, PET_UPGRADE_COSTS, PET_MAX_LEVEL, PET_BONUS_PER_LEVEL, PET_FOODS,
  RELICS, RELIC_BONUS_PER_LEVEL,
  EJDER_BONUS_PER_LEVEL, EJDER_BASE_COIN_BONUS, EJDER_BASE_XP_BONUS, EJDER_SET_KEYS,
  getRelicMaxLv, getRelicUpgCost,
  ANTIQUES, pickDailyAntique,
  MINING_TOOLS, WOOD_TOOLS, pickWeighted,
  COIN_BONUS_NERF_MULT,
} = require('./constants');

function todayTR() {
  return new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }).split('.').reverse().join('-');
}

// ══════════════════════════════════════════════════════════════
//  PET SİSTEMİ
// ══════════════════════════════════════════════════════════════

async function getPetRows(guildId, userId) {
  const { rows } = await pool.query('SELECT pet_key, level FROM pets WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  return rows;
}
async function hasPet(guildId, userId, petKey) {
  const { rows } = await pool.query('SELECT 1 FROM pets WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3', [guildId, userId, petKey]);
  return rows.length > 0;
}
async function buyPet(guildId, userId, petKey) {
  await pool.query(
    'INSERT INTO pets (guild_id, user_id, pet_key, level) VALUES ($1,$2,$3,1) ON CONFLICT (guild_id, user_id, pet_key) DO NOTHING',
    [guildId, userId, petKey]
  );
}
async function getPetLevel(guildId, userId, petKey) {
  const { rows } = await pool.query('SELECT level FROM pets WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3', [guildId, userId, petKey]);
  return rows[0]?.level || 0;
}
async function upgradePet(guildId, userId, petKey) {
  await pool.query('UPDATE pets SET level = level + 1 WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3', [guildId, userId, petKey]);
}
async function getActivePet(guildId, userId) {
  const { rows } = await pool.query('SELECT pet_key FROM active_pet WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  if (!rows.length) return null;
  const def = PETS.find(p => p.key === rows[0].pet_key);
  if (!def) return null;
  const level = await getPetLevel(guildId, userId, rows[0].pet_key);
  return { ...def, level };
}
async function setActivePet(guildId, userId, petKey) {
  await pool.query(
    `INSERT INTO active_pet (guild_id, user_id, pet_key) VALUES ($1,$2,$3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET pet_key = $3`,
    [guildId, userId, petKey]
  );
}
async function clearActivePet(guildId, userId) {
  await pool.query('DELETE FROM active_pet WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
}

function getPetBonusByLevel(petDef, level) { return petDef.bonusBase + (level - 1) * PET_BONUS_PER_LEVEL; }

async function getPetXpBonus(guildId, userId) {
  const rows = await getPetRows(guildId, userId);
  const base = rows.reduce((sum, r) => {
    const def = PETS.find(p => p.key === r.pet_key);
    return (def && def.bonusType === 'xp') ? sum + getPetBonusByLevel(def, r.level) : sum;
  }, 0);
  // TODO(mmo-equipment modülü): Güneş Seti petXp set bonusu buraya eklenecek (+setBonusPct/100 çarpanı)
  return base;
}
async function getPetCoinBonus(guildId, userId) {
  const rows = await getPetRows(guildId, userId);
  return rows.reduce((sum, r) => {
    const def = PETS.find(p => p.key === r.pet_key);
    return (def && def.bonusType === 'coin') ? sum + getPetBonusByLevel(def, r.level) : sum;
  }, 0);
}
async function getPetDailyBonus(guildId, userId) {
  const rows = await getPetRows(guildId, userId);
  return rows.reduce((sum, r) => {
    const def = PETS.find(p => p.key === r.pet_key);
    return (def && def.bonusType === 'daily') ? sum + getPetBonusByLevel(def, r.level) : sum;
  }, 0);
}

// ── Hayvan Maması / Açlık ──────────────────────────────────
async function getPetFedDate(guildId, userId, petKey) {
  const { rows } = await pool.query(
    'SELECT last_fed_at FROM pet_food WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3', [guildId, userId, petKey]
  );
  return rows[0]?.last_fed_at || null;
}
async function setPetFedDate(guildId, userId, petKey, date) {
  await pool.query(
    `INSERT INTO pet_food (guild_id, user_id, pet_key, last_fed_at) VALUES ($1,$2,$3,$4)
     ON CONFLICT (guild_id, user_id, pet_key) DO UPDATE SET last_fed_at = $4`,
    [guildId, userId, petKey, date]
  );
}
async function isPetAlive(guildId, userId, petKey) {
  const fedDate = await getPetFedDate(guildId, userId, petKey);
  if (!fedDate) return true; // hiç mama kaydı yoksa ölmüş sayılmaz
  const today     = todayTR();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }).split('.').reverse().join('-');
  return fedDate >= yesterday || fedDate >= today;
}
async function killPet(guildId, userId, petKey) {
  await pool.query('DELETE FROM pets WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3', [guildId, userId, petKey]);
  await pool.query('DELETE FROM pet_food WHERE guild_id=$1 AND user_id=$2 AND pet_key=$3', [guildId, userId, petKey]);
  await pool.query('DELETE FROM active_pet WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
}
/** Açlıktan ölen petleri siler, ölen pet tanımlarının listesini döner. */
async function checkAndKillHungryPets(guildId, userId) {
  const rows = await getPetRows(guildId, userId);
  const killed = [];
  for (const r of rows) {
    const fedDate = await getPetFedDate(guildId, userId, r.pet_key);
    if (fedDate !== null && !(await isPetAlive(guildId, userId, r.pet_key))) {
      await killPet(guildId, userId, r.pet_key);
      const def = PETS.find(p => p.key === r.pet_key);
      if (def) killed.push(def);
    }
  }
  return killed;
}
/** Beslenmiş (canlı) petlerin basit zindan bonusu — her canlı pet +3 puan. */
async function getSimplePetDungeonBonus(guildId, userId) {
  const rows = await getPetRows(guildId, userId);
  let bonus = 0;
  for (const r of rows) if (await isPetAlive(guildId, userId, r.pet_key)) bonus += 3;
  return bonus;
}

// ══════════════════════════════════════════════════════════════
//  RELİK SİSTEMİ (klasik + Ejder Seti)
// ══════════════════════════════════════════════════════════════

async function getRelics(guildId, userId) {
  const { rows } = await pool.query('SELECT relic_key FROM relics WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  return rows.map(r => r.relic_key);
}
async function hasRelic(guildId, userId, key) {
  const { rows } = await pool.query('SELECT 1 FROM relics WHERE guild_id=$1 AND user_id=$2 AND relic_key=$3', [guildId, userId, key]);
  return rows.length > 0;
}
async function buyRelic(guildId, userId, key) {
  await pool.query(
    'INSERT INTO relics (guild_id, user_id, relic_key) VALUES ($1,$2,$3) ON CONFLICT (guild_id, user_id, relic_key) DO NOTHING',
    [guildId, userId, key]
  );
}
async function hasAllEjderParts(guildId, userId) {
  const owned = await getRelics(guildId, userId);
  return EJDER_SET_KEYS.every(k => owned.includes(k));
}
async function getRelicLevel(guildId, userId, key) {
  if (!(await hasRelic(guildId, userId, key))) return 0;
  const { rows } = await pool.query(
    'SELECT level FROM relic_upgrades WHERE guild_id=$1 AND user_id=$2 AND relic_key=$3', [guildId, userId, key]
  );
  return rows[0]?.level || 1;
}
async function upgradeRelic(guildId, userId, key) {
  await pool.query(
    'INSERT INTO relic_upgrades (guild_id, user_id, relic_key, level) VALUES ($1,$2,$3,1) ON CONFLICT (guild_id, user_id, relic_key) DO NOTHING',
    [guildId, userId, key]
  );
  await pool.query('UPDATE relic_upgrades SET level = level + 1 WHERE guild_id=$1 AND user_id=$2 AND relic_key=$3', [guildId, userId, key]);
}

async function getEjderLevel(guildId, userId) {
  if (!(await hasAllEjderParts(guildId, userId))) return 0;
  const { rows } = await pool.query(
    "SELECT level FROM relic_upgrades WHERE guild_id=$1 AND user_id=$2 AND relic_key='ejderset'", [guildId, userId]
  );
  return rows[0]?.level || 1;
}
async function upgradeEjderSet(guildId, userId) {
  await pool.query(
    "INSERT INTO relic_upgrades (guild_id, user_id, relic_key, level) VALUES ($1,$2,'ejderset',1) ON CONFLICT (guild_id, user_id, relic_key) DO NOTHING",
    [guildId, userId]
  );
  await pool.query("UPDATE relic_upgrades SET level = level + 1 WHERE guild_id=$1 AND user_id=$2 AND relic_key='ejderset'", [guildId, userId]);
}
async function getEjderCoinBonus(guildId, userId) {
  const lv = await getEjderLevel(guildId, userId);
  if (lv === 0) return 0;
  return EJDER_BASE_COIN_BONUS + (lv - 1) * EJDER_BONUS_PER_LEVEL;
}
async function getEjderXpBonus(guildId, userId) {
  const lv = await getEjderLevel(guildId, userId);
  if (lv === 0) return 0;
  return EJDER_BASE_XP_BONUS + (lv - 1) * EJDER_BONUS_PER_LEVEL;
}

// TODO(mmo-equipment modülü): RELIC_SETS (MMORPG relic setleri) portlandığında
// bu iki fonksiyon gerçek sorgularla değiştirilecek. Şimdilik 0 — mevcut
// bonus toplamlarını KIRMAZ, sadece o ek katkı henüz dahil değil.
async function getRelicSetXpBonus(_guildId, _userId)   { return 0; }
async function getRelicSetCoinBonus(_guildId, _userId) { return 0; }

async function getRelicXpBonus(guildId, userId) {
  let bonus = 0;
  if (await hasRelic(guildId, userId, 'bilgelik')) {
    const lv = await getRelicLevel(guildId, userId, 'bilgelik');
    bonus += 15 + (lv - 1) * RELIC_BONUS_PER_LEVEL;
  }
  bonus += await getEjderXpBonus(guildId, userId);
  bonus += await getRelicSetXpBonus(guildId, userId);
  return bonus;
}
async function getRelicCoinBonus(guildId, userId) {
  let bonus = 0;
  if (await hasRelic(guildId, userId, 'tuccar')) {
    const lv = await getRelicLevel(guildId, userId, 'tuccar');
    bonus += 10 + (lv - 1) * RELIC_BONUS_PER_LEVEL;
  }
  bonus += await getEjderCoinBonus(guildId, userId);
  return bonus;
}
async function getRelicMineBonus(guildId, userId) {
  if (!(await hasRelic(guildId, userId, 'madenci'))) return 0;
  const lv = await getRelicLevel(guildId, userId, 'madenci');
  return (20 + (lv - 1) * RELIC_BONUS_PER_LEVEL) * COIN_BONUS_NERF_MULT;
}
async function getRelicFishBonus(guildId, userId) {
  if (!(await hasRelic(guildId, userId, 'tuccar'))) return 0;
  const lv = await getRelicLevel(guildId, userId, 'tuccar');
  return 10 + (lv - 1) * RELIC_BONUS_PER_LEVEL;
}
async function getRelicDenizFishMultiplier(guildId, userId) {
  if (!(await hasRelic(guildId, userId, 'deniz'))) return 1.0;
  const lv = await getRelicLevel(guildId, userId, 'deniz');
  return 1.3 + (lv - 1) * 0.2;
}

// ══════════════════════════════════════════════════════════════
//  ANTİKA SİSTEMİ
// ══════════════════════════════════════════════════════════════

async function getDailyAntiqueMarket(guildId) {
  const date = todayTR();
  const { rows } = await pool.query(
    'SELECT antique1, antique2 FROM daily_antique_market WHERE guild_id=$1 AND market_date=$2', [guildId, date]
  );
  if (rows.length) {
    return [ANTIQUES.find(a => a.key === rows[0].antique1), ANTIQUES.find(a => a.key === rows[0].antique2)].filter(Boolean);
  }
  const a1 = pickDailyAntique();
  const a2 = pickDailyAntique([a1.key]);
  await pool.query(
    `INSERT INTO daily_antique_market (guild_id, market_date, antique1, antique2) VALUES ($1,$2,$3,$4)
     ON CONFLICT (guild_id, market_date) DO UPDATE SET antique1=$3, antique2=$4`,
    [guildId, date, a1.key, a2.key]
  );
  return [a1, a2];
}
async function getAntiqueInventory(guildId, userId) {
  const { rows } = await pool.query(
    'SELECT antique_key, count FROM antique_inventory WHERE guild_id=$1 AND user_id=$2 AND count>0', [guildId, userId]
  );
  return rows;
}
async function addAntique(guildId, userId, key) {
  await pool.query(
    `INSERT INTO antique_inventory (guild_id, user_id, antique_key, count) VALUES ($1,$2,$3,1)
     ON CONFLICT (guild_id, user_id, antique_key) DO UPDATE SET count = antique_inventory.count + 1`,
    [guildId, userId, key]
  );
}
async function getActiveAntique(guildId, userId) {
  const { rows } = await pool.query('SELECT antique_key FROM active_antique WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  if (!rows.length) return null;
  return ANTIQUES.find(a => a.key === rows[0].antique_key) || null;
}
async function setActiveAntique(guildId, userId, key) {
  await pool.query(
    `INSERT INTO active_antique (guild_id, user_id, antique_key) VALUES ($1,$2,$3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET antique_key = $3`,
    [guildId, userId, key]
  );
}
async function clearActiveAntique(guildId, userId) {
  await pool.query('DELETE FROM active_antique WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
}
async function getAntiqueUpgradeLevel(guildId, userId, key) {
  const { rows } = await pool.query(
    'SELECT upgrade_level FROM antique_upgrades WHERE guild_id=$1 AND user_id=$2 AND antique_key=$3', [guildId, userId, key]
  );
  return rows[0]?.upgrade_level || 0;
}
async function setAntiqueUpgradeLevel(guildId, userId, key, level) {
  await pool.query(
    `INSERT INTO antique_upgrades (guild_id, user_id, antique_key, upgrade_level) VALUES ($1,$2,$3,$4)
     ON CONFLICT (guild_id, user_id, antique_key) DO UPDATE SET upgrade_level = $4`,
    [guildId, userId, key, level]
  );
}
async function getAntiqueWithUpgrade(guildId, userId) {
  const a = await getActiveAntique(guildId, userId);
  if (!a) return null;
  const upg = await getAntiqueUpgradeLevel(guildId, userId, a.key);
  return { ...a, xpBonus: a.xpBonus + upg * 5, coinBonus: a.coinBonus + upg * 5, dailyBonus: a.dailyBonus + upg * 5, upgradeLevel: upg };
}
async function getAntiqueXpBonus(guildId, userId)    { const a = await getAntiqueWithUpgrade(guildId, userId); return a ? a.xpBonus : 0; }
async function getAntiqueCoinBonus(guildId, userId)  { const a = await getAntiqueWithUpgrade(guildId, userId); return a ? a.coinBonus : 0; }
async function getAntiqueDailyBonus(guildId, userId) { const a = await getAntiqueWithUpgrade(guildId, userId); return a ? a.dailyBonus : 0; }

/** normal antikalar yükseltilemez (max 0); uncommon max 1 (2000c); rare max 2 (3000c). */
function getAntiqueUpgradeInfo(antiqueDef) {
  const maxUpg = antiqueDef.rarity === 'uncommon' ? 1 : antiqueDef.rarity === 'rare' ? 2 : 0;
  const cost   = antiqueDef.rarity === 'uncommon' ? 2000 : 3000;
  return { maxUpg, cost };
}

// ══════════════════════════════════════════════════════════════
//  ARAÇLAR (madencilik/odunculuk aletleri — player_tools)
// ══════════════════════════════════════════════════════════════

async function getPlayerTools(guildId, userId) {
  const { rows } = await pool.query('SELECT tool_key, quantity FROM player_tools WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  return rows;
}
async function addPlayerTool(guildId, userId, key, qty = 1) {
  await pool.query(
    `INSERT INTO player_tools (guild_id, user_id, tool_key, quantity) VALUES ($1,$2,$3,$4)
     ON CONFLICT (guild_id, user_id, tool_key) DO UPDATE SET quantity = player_tools.quantity + $4`,
    [guildId, userId, key, qty]
  );
}
async function removePlayerTool(guildId, userId, key, qty = 1) {
  const { rows } = await pool.query(
    'SELECT quantity FROM player_tools WHERE guild_id=$1 AND user_id=$2 AND tool_key=$3', [guildId, userId, key]
  );
  if (!rows.length || rows[0].quantity < qty) return false;
  if (rows[0].quantity === qty) {
    await pool.query('DELETE FROM player_tools WHERE guild_id=$1 AND user_id=$2 AND tool_key=$3', [guildId, userId, key]);
  } else {
    await pool.query('UPDATE player_tools SET quantity = quantity - $1 WHERE guild_id=$2 AND user_id=$3 AND tool_key=$4', [qty, guildId, userId, key]);
  }
  return true;
}
async function getBestMiningToolBonus(guildId, userId) {
  const tools = await getPlayerTools(guildId, userId);
  let best = 0;
  for (const t of tools) {
    const def = MINING_TOOLS.find(x => x.key === t.tool_key);
    if (def && def.bonus > best) best = def.bonus;
  }
  return best * COIN_BONUS_NERF_MULT; // madencilik kazancına etki eden kaynak → %30 nerf
}
async function getBestWoodToolBonus(guildId, userId) {
  const tools = await getPlayerTools(guildId, userId);
  let best = 0;
  for (const t of tools) {
    const def = WOOD_TOOLS.find(x => x.key === t.tool_key);
    if (def && def.bonus > best) best = def.bonus;
  }
  return best;
}

// ══════════════════════════════════════════════════════════════
//  ŞANS ESERİ DROP (madencilik/odunculuk sonrası nadir düşüş)
//  KAPSAM: antika + eski relik + araç. RELIC_SETS/craft_mat havuzu
//  mmo-equipment modülü taşındığında buraya eklenecek.
// ══════════════════════════════════════════════════════════════
async function giveRareDrop(guildId, userId, toolPool) {
  const rarePool = [];
  for (const a of ANTIQUES) rarePool.push({ weight: 25, type: 'antique', data: a });
  for (const r of RELICS)   rarePool.push({ weight: r.group === 'ejder' ? 5 : 12, type: 'relic_old', data: r });
  for (const t of toolPool) rarePool.push({ weight: t.dropWeight || 15, type: 'tool', data: t });

  const total = rarePool.reduce((s, x) => s + x.weight, 0);
  let roll = Math.random() * total;
  let picked = rarePool[rarePool.length - 1];
  for (const item of rarePool) { if (roll < item.weight) { picked = item; break; } roll -= item.weight; }

  if (picked.type === 'antique') {
    await addAntique(guildId, userId, picked.data.key);
    return { type: 'antique', item: picked.data };
  }
  if (picked.type === 'relic_old') {
    const r = picked.data;
    if (!(await hasRelic(guildId, userId, r.key))) {
      await buyRelic(guildId, userId, r.key);
      const ejderCompleted = r.group === 'ejder' && (await hasAllEjderParts(guildId, userId));
      return { type: 'relic_old', item: r, ejderCompleted };
    }
    const tool = pickWeighted(toolPool);
    await addPlayerTool(guildId, userId, tool.key);
    return { type: 'tool', item: tool, reason: 'relic_already_owned' };
  }
  await addPlayerTool(guildId, userId, picked.data.key);
  return { type: 'tool', item: picked.data };
}

// ── Bonus özet fonksiyonları (mining/woodcutting/fishing bunları kullanır) ──
async function getPassiveXpBonusPct(guildId, userId) {
  const [antiqueXp, petXp, relicXp] = await Promise.all([
    getAntiqueXpBonus(guildId, userId), getPetXpBonus(guildId, userId), getRelicXpBonus(guildId, userId),
  ]);
  return (antiqueXp + petXp + relicXp) / 100;
}

module.exports = {
  // pet
  getPetRows, hasPet, buyPet, getPetLevel, upgradePet, getActivePet, setActivePet, clearActivePet,
  getPetXpBonus, getPetCoinBonus, getPetDailyBonus,
  getPetFedDate, setPetFedDate, isPetAlive, killPet, checkAndKillHungryPets, getSimplePetDungeonBonus,
  // relic
  getRelics, hasRelic, buyRelic, hasAllEjderParts, getRelicLevel, upgradeRelic,
  getEjderLevel, upgradeEjderSet, getEjderCoinBonus, getEjderXpBonus,
  getRelicXpBonus, getRelicCoinBonus, getRelicMineBonus, getRelicFishBonus, getRelicDenizFishMultiplier,
  getRelicSetXpBonus, getRelicSetCoinBonus,
  // antika
  getDailyAntiqueMarket, getAntiqueInventory, addAntique, getActiveAntique, setActiveAntique,
  clearActiveAntique, getAntiqueUpgradeLevel, setAntiqueUpgradeLevel, getAntiqueWithUpgrade,
  getAntiqueXpBonus, getAntiqueCoinBonus, getAntiqueDailyBonus, getAntiqueUpgradeInfo,
  // araçlar
  getPlayerTools, addPlayerTool, removePlayerTool, getBestMiningToolBonus, getBestWoodToolBonus,
  // drop
  giveRareDrop,
  // özet
  getPassiveXpBonusPct,
};
