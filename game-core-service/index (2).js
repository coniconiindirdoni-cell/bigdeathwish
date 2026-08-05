// modules/mmo-equipment/constants.js — orijinal botla BİREBİR aynı sayısal dengeler.
// KAPSAM: yumurta->pet, sandık, craft malzemesi, silah/zırh + geliştirme (+0..+10).
// KAPSAM DIŞI: RELIC_SETS (kuşanılan relic setleri + combat bonusları) —
// tamamen dövüşe bağlı olduğu için "dungeon-fight" modülünde taşınacak.

// ---- YUMURTA / MMORPG PET ----
const PET_EGG_TYPES = [
  { key: 'siradan',  name: 'Sıradan Yumurta',    emoji: '🥚', price: 450,  color: 0x95A5A6 },
  { key: 'nadir',    name: 'Nadir Yumurta',      emoji: '🥈', price: 1350, color: 0x3498DB },
  { key: 'altin',    name: 'Altın Yumurta',      emoji: '🥇', price: 2700, color: 0xF1C40F },
  { key: 'kristal',  name: 'Kristal Yumurta',    emoji: '💎', price: 4500, color: 0x1ABC9C },
  { key: 'kraliyet', name: 'Kraliyet Yumurtası', emoji: '👑', price: 8100, color: 0x9B59B6 },
];

const MMORPG_PETS = [
  { key: 'akrep',        name: 'Akrep',             emoji: '🦂', rarity: 0, bonusType: 'attack',   bonusBase: 3,  eggPools: ['siradan','nadir'] },
  { key: 'lav_kert',     name: 'Lav Kertenkelesi',  emoji: '🦎', rarity: 1, bonusType: 'defense',  bonusBase: 4,  eggPools: ['siradan','nadir','altin'] },
  { key: 'krist_kap',    name: 'Kristal Kaplumbağa',emoji: '🐢', rarity: 1, bonusType: 'defense',  bonusBase: 5,  eggPools: ['nadir','altin'] },
  { key: 'vamp_yar',     name: 'Vampir Yarasa',     emoji: '🦇', rarity: 1, bonusType: 'critical', bonusBase: 4,  eggPools: ['nadir','altin'] },
  { key: 'ruh_tilki',    name: 'Ruh Tilkisi',       emoji: '🦊', rarity: 2, bonusType: 'speed',    bonusBase: 6,  eggPools: ['nadir','altin','kristal'] },
  { key: 'anka',         name: 'Anka Kuşu',         emoji: '🦅', rarity: 2, bonusType: 'magic',    bonusBase: 7,  eggPools: ['altin','kristal'] },
  { key: 'hayalet',      name: 'Hayalet',           emoji: '👻', rarity: 2, bonusType: 'mana',     bonusBase: 7,  eggPools: ['altin','kristal'] },
  { key: 'iblis',        name: 'İblis',             emoji: '😈', rarity: 3, bonusType: 'attack',   bonusBase: 10, eggPools: ['kristal','kraliyet'] },
  { key: 'melek',        name: 'Melek',             emoji: '👼', rarity: 3, bonusType: 'hp',       bonusBase: 10, eggPools: ['kristal','kraliyet'] },
  { key: 'aslan',        name: 'Aslan',             emoji: '🦁', rarity: 2, bonusType: 'attack',   bonusBase: 8,  eggPools: ['altin','kristal'] },
  { key: 'dinozor',      name: 'Dinozor',           emoji: '🦖', rarity: 2, bonusType: 'hp',       bonusBase: 8,  eggPools: ['altin','kristal'] },
  { key: 'unicorn',      name: 'Unicorn',           emoji: '🦄', rarity: 3, bonusType: 'magic',    bonusBase: 12, eggPools: ['kristal','kraliyet'] },
  { key: 'golge_kurt',   name: 'Gölge Kurt',        emoji: '🐺', rarity: 3, bonusType: 'critical', bonusBase: 12, eggPools: ['kristal','kraliyet'] },
  { key: 'mini_ejder',   name: 'Mini Ejder',        emoji: '🐉', rarity: 4, bonusType: 'attack',   bonusBase: 20, eggPools: ['kraliyet'] },
  { key: 'seytan',       name: 'Şeytan',            emoji: '👿', rarity: 3, bonusType: 'attack',   bonusBase: 11, eggPools: ['kristal','kraliyet'] },
  { key: 'kaos_ejder',   name: 'Kaos Ejderi',       emoji: '🔥', rarity: 4, bonusType: 'magic',    bonusBase: 22, eggPools: ['kraliyet'] },
  { key: 'goblin_lord',  name: 'Goblin Lordu',      emoji: '👺', rarity: 1, bonusType: 'attack',   bonusBase: 4,  eggPools: ['siradan','nadir'] },
  { key: 'iskelet_lord', name: 'İskelet Lordu',     emoji: '💀', rarity: 2, bonusType: 'mana',     bonusBase: 6,  eggPools: ['nadir','altin'] },
  { key: 'buz_perisi',   name: 'Buz Perisi',        emoji: '🧚', rarity: 2, bonusType: 'magic',    bonusBase: 7,  eggPools: ['nadir','altin'] },
  { key: 'simsek_kus',   name: 'Şimşek Kuşu',       emoji: '⚡', rarity: 3, bonusType: 'critical', bonusBase: 11, eggPools: ['kristal','kraliyet'] },
  { key: 'deniz_canh',   name: 'Deniz Canavarı',    emoji: '🐙', rarity: 2, bonusType: 'defense',  bonusBase: 7,  eggPools: ['nadir','altin'] },
  { key: 'buzul_ayi',    name: 'Buzul Ayısı',       emoji: '🐻', rarity: 1, bonusType: 'defense',  bonusBase: 5,  eggPools: ['nadir','altin'] },
  { key: 'zehir_orumcek',name: 'Zehir Örümceği',    emoji: '🕷️', rarity: 1, bonusType: 'critical', bonusBase: 4,  eggPools: ['siradan','nadir'] },
  { key: 'firtina_sahin',name: 'Fırtına Şahini',    emoji: '🦅', rarity: 2, bonusType: 'speed',    bonusBase: 7,  eggPools: ['altin','kristal'] },
  { key: 'mercan_yilan',  name: 'Mercan Yılanı',    emoji: '🐍', rarity: 2, bonusType: 'attack',   bonusBase: 8,  eggPools: ['altin','kristal'] },
  { key: 'zumrut_kaplan', name: 'Zümrüt Kaplan',    emoji: '🐅', rarity: 3, bonusType: 'attack',   bonusBase: 11, eggPools: ['kristal','kraliyet'] },
  { key: 'gokyuzu_ejder', name: 'Gökyüzü Ejderi',   emoji: '🐲', rarity: 4, bonusType: 'magic',    bonusBase: 21, eggPools: ['kraliyet'] },
];
const MMO_PET_MAX_LEVEL    = 10;
const MMO_PET_BONUS_PER_LV = 5; // her seviyede +5%
const MMO_PET_MAX_ACTIVE   = 6;

const PET_SHARD_COSTS = { 5: 1, 6: 2, 7: 4, 8: 6, 9: 10 }; // Lv5->6 ... Lv9->10
function getPetShardCostForLevel(level) { return PET_SHARD_COSTS[level] || 0; }

function pickMmoPetFromEgg(eggType) {
  const eligible = MMORPG_PETS.filter(p => p.eggPools.includes(eggType));
  const weights = { 0: 40, 1: 30, 2: 20, 3: 8, 4: 2 };
  const pool = eligible.map(p => ({ ...p, weight: weights[p.rarity] || 1 }));
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) { if (r < p.weight) return p; r -= p.weight; }
  return pool[0];
}

// ---- SANDIK ----
const MMORPG_CHESTS = [
  { key: 'ahsap',    name: 'Ahşap Sandık',     emoji: '📦', price: 500,  color: 0x8B4513 },
  { key: 'demir',    name: 'Demir Sandık',     emoji: '⚙️',  price: 1000, color: 0x7F8C8D },
  { key: 'altin',    name: 'Altın Sandık',     emoji: '🥇', price: 1500, color: 0xF1C40F },
  { key: 'elmas',    name: 'Elmas Sandık',     emoji: '💎', price: 2000, color: 0x1ABC9C },
  { key: 'kraliyet', name: 'Kraliyet Sandığı', emoji: '👑', price: 3000, color: 0x9B59B6 },
];

const CRAFT_EGG_RECIPES = {
  siradan:  { demir_cevheri: 6, bakir_cevheri: 3 },
  nadir:    { altin_cevheri: 5, obsidyen: 1 },
  altin:    { saf_kristal: 2, altin_cevheri: 6, elmas_cevheri: 1 },
  kristal:  { saf_kristal: 4, ejder_pulu: 2, elmas_cevheri: 2 },
  kraliyet: { ejder_pulu: 6, ay_tasi: 3, gunes_parcasi: 3, karanlik_oz: 2 },
};
const CRAFT_SANDIK_RECIPES = {
  ahsap:    { demir_cevheri: 5 },
  demir:    { demir_cevheri: 9, obsidyen: 2 },
  altin:    { altin_cevheri: 6, saf_kristal: 2 },
  elmas:    { elmas_cevheri: 4, saf_kristal: 4, ejder_pulu: 1 },
  kraliyet: { ejder_pulu: 4, ay_tasi: 3, karanlik_oz: 3 },
};

// ---- CRAFT MALZEMELERİ ----
const CRAFT_MATERIALS = [
  { key: 'demir_cevheri',     name: 'Demir',             emoji: '⚙️',  tier: 1, sellValue: 20 },
  { key: 'bakir_cevheri',     name: 'Bakır',             emoji: '🟤', tier: 1, sellValue: 20 },
  { key: 'altin_cevheri',     name: 'Altın',             emoji: '🟡', tier: 2, sellValue: 25 },
  { key: 'elmas_cevheri',     name: 'Elmas',             emoji: '💎', tier: 3, sellValue: 35 },
  { key: 'obsidyen',          name: 'Obsidyen',          emoji: '🪨', tier: 2, sellValue: 25 },
  { key: 'saf_kristal',       name: 'Saf Kristal',       emoji: '🔮', tier: 3, sellValue: 30 },
  { key: 'ejder_pulu',        name: 'Ejder Pulu',        emoji: '🐉', tier: 4, sellValue: 45 },
  { key: 'lav_tasi',          name: 'Lav Taşı',          emoji: '🌋', tier: 3, sellValue: 30 },
  { key: 'ruh_tozu',          name: 'Ruh Tozu',          emoji: '👻', tier: 3, sellValue: 30 },
  { key: 'karanlik_oz',       name: 'Karanlık Öz',       emoji: '🌑', tier: 4, sellValue: 40 },
  { key: 'ay_tasi',           name: 'Ay Taşı',           emoji: '🌙', tier: 4, sellValue: 40 },
  { key: 'gunes_parcasi',     name: 'Güneş Parçası',     emoji: '☀️', tier: 4, sellValue: 40 },
  { key: 'yildirim_kristali', name: 'Yıldırım Kristali', emoji: '⚡', tier: 4, sellValue: 45 },
  { key: 'buz_cekirdegi',     name: 'Buz Çekirdeği',     emoji: '❄️', tier: 4, sellValue: 50 },
];
const ADVANCED_CRAFT_MATERIALS = [
  { key: 'kaos_ozu',       name: 'Kaos Özü',       emoji: '🌀', tier: 5, sellValue: 90, advanced: true,
    craft: { ejder_pulu: 30, karanlik_oz: 43, obsidyen: 24, saf_kristal: 24 } },
  { key: 'zaman_kumu',     name: 'Zaman Kumu',     emoji: '⏳', tier: 5, sellValue: 90, advanced: true,
    craft: { ay_tasi: 43, gunes_parcasi: 43, elmas_cevheri: 24, saf_kristal: 24 } },
  { key: 'yildiz_tozu',    name: 'Yıldız Tozu',    emoji: '🌠', tier: 5, sellValue: 90, advanced: true,
    craft: { yildirim_kristali: 43, buz_cekirdegi: 43, ejder_pulu: 24, altin_cevheri: 34 } },
  { key: 'kozmik_kristal', name: 'Kozmik Kristal', emoji: '💠', tier: 5, sellValue: 90, advanced: true,
    craft: { elmas_cevheri: 30, saf_kristal: 30, ruh_tozu: 34, lav_tasi: 34 } },
];
const ADVANCED_MAT_KEYS = ADVANCED_CRAFT_MATERIALS.map(m => m.key);

// ---- SİLAHLAR ----
const WEAPON_TYPES = [
  { key: 'kilic',  name: 'Kılıç',       emoji: '🗡️', stat: 'attack'   },
  { key: 'yay',    name: 'Yay',         emoji: '🏹', stat: 'critical' },
  { key: 'asa',    name: 'Asa',         emoji: '🪄', stat: 'magic'    },
  { key: 'hancer', name: 'Çift Hançer', emoji: '🗡️', stat: 'speed'    },
  { key: 'tirpan', name: 'Tırpan',      emoji: '🪃', stat: 'attack'   },
];
const WEAPON_SPEED_BASE = { yay: 2.0, hancer: 1.6, asa: 1.3, kilic: 1.0, tirpan: 0.8 };
const GEAR_GRADE_MULTIPLIER = { E: 1.0, C: 1.3, B: 1.7, A: 2.3, S: 3.2, SSS: 3.2 };
const TIER_SPEED_MULT = { deri: 1.0, demir: 1.1, altin: 1.2, kristal: 1.35, ejder: 1.5, godslayer: 1.65 };
const GEAR_ENHANCEMENT_BONUS_PER_LV = 0.10;

const WEAPON_TIERS = [
  { key: 'deri',      name: 'Deri',      grade: 'E',   emoji: '🥉', power: 5,  price: 1500, craft: { demir_cevheri: 5 }, canBuy: true },
  { key: 'demir',     name: 'Demir',     grade: 'C',   emoji: '⚙️',  power: 12, price: 3500, craft: { demir_cevheri: 10, bakir_cevheri: 5 }, canBuy: true },
  { key: 'altin',     name: 'Altın',     grade: 'B',   emoji: '🥇', power: 22, price: 0,    craft: { altin_cevheri: 24, demir_cevheri: 15, obsidyen: 6 }, canBuy: false },
  { key: 'kristal',   name: 'Kristal',   grade: 'A',   emoji: '💎', power: 35, price: 0,    craft: { saf_kristal: 28, altin_cevheri: 32, elmas_cevheri: 14 }, canBuy: false },
  { key: 'ejder',     name: 'Ejder',     grade: 'S',   emoji: '🐉', power: 55, price: 0,    craft: { ejder_pulu: 42, elmas_cevheri: 42, obsidyen: 21, saf_kristal: 21 }, canBuy: false },
  { key: 'godslayer', name: 'Godslayer', grade: 'SSS', emoji: '👑', power: 83, price: 0,    craft: { ejder_pulu: 420, elmas_cevheri: 420, obsidyen: 210, saf_kristal: 210, kaos_ozu: 2, zaman_kumu: 1 }, canBuy: false },
];

function parseWeaponKey(key) {
  const [typeKey, tierKey] = key.split('_');
  return { type: WEAPON_TYPES.find(t => t.key === typeKey), tier: WEAPON_TIERS.find(t => t.key === tierKey) };
}
function getWeaponName(key) {
  const { type, tier } = parseWeaponKey(key);
  if (!type || !tier) return key;
  return `[${tier.grade}] ${tier.emoji} ${tier.name} ${type.emoji} ${type.name}`;
}
function getWeaponPower(key) { const { tier } = parseWeaponKey(key); return tier ? tier.power : 0; }
function getWeaponBattlePower(weaponKey, enhancement = 0) {
  const { tier } = parseWeaponKey(weaponKey);
  if (!tier) return 0;
  const mult = GEAR_GRADE_MULTIPLIER[tier.grade] || 1;
  return Math.round(tier.power * mult * (1 + enhancement * GEAR_ENHANCEMENT_BONUS_PER_LV));
}

// ---- ZIRH ----
const ARMOR_SLOT_TIER_MULT = { B: 1.10, A: 1.25, S: 1.45, SSS: 1.75, cope: 1.0 };
const ARMOR_SLOTS = [
  { key: 'migfer',     name: 'Miğfer',        emoji: '⛑️',  stat: 'defense',  tier: 'B' },
  { key: 'gogusluk',   name: 'Göğüslük',      emoji: '🛡️', stat: 'hp',       tier: 'B' },
  { key: 'eldiven',    name: 'Eldiven',       emoji: '🧤', stat: 'attack',   tier: 'B' },
  { key: 'pantolon',   name: 'Pantolon',      emoji: '👖', stat: 'speed',    tier: 'A' },
  { key: 'bot',        name: 'Bot',           emoji: '👢', stat: 'speed',    tier: 'A' },
  { key: 'yuzuk',      name: 'Yüzük',         emoji: '💍', stat: 'critical', tier: 'S' },
  { key: 'kolye',      name: 'Kolye',         emoji: '📿', stat: 'mana',     tier: 'SSS' },
  { key: 'pelerin',    name: 'Pelerin',       emoji: '🧥', stat: 'defense',  tier: 'cope' },
  { key: 'kalkan',     name: 'Kalkan',        emoji: '🛡️', stat: 'attack',  tier: 'cope' },
  { key: 'kemer',      name: 'Kemer',         emoji: '🥋', stat: 'hp',       tier: 'cope' },
  { key: 'sadak',      name: 'Sadak',         emoji: '🏹', stat: 'speed',    tier: 'cope' },
  { key: 'pence',      name: 'Pençelik',      emoji: '🧤', stat: 'critical', tier: 'cope' },
  { key: 'gozluk',     name: 'Nişan Gözlüğü', emoji: '🥽', stat: 'speed',    tier: 'cope' },
  { key: 'asakini',    name: 'Asa Kını',      emoji: '🪄', stat: 'magic',    tier: 'cope' },
  { key: 'buyucubaget',name: 'Büyücü Çubuğu', emoji: '✨', stat: 'magic',    tier: 'cope' },
  { key: 'muskalik',   name: 'Muskalık',      emoji: '🧿', stat: 'mana',     tier: 'cope' },
  { key: 'buyukitap',  name: 'Büyü Kitabı',   emoji: '📖', stat: 'mana',     tier: 'cope' },
];
const ARMOR_TIERS = [
  { key: 'deri',      name: 'Deri',      grade: 'E',   emoji: '🥉', defense: 3,  price: 1200, craft: { demir_cevheri: 3 }, canBuy: true },
  { key: 'demir',     name: 'Demir',     grade: 'C',   emoji: '⚙️',  defense: 7,  price: 2800, craft: { demir_cevheri: 8 }, canBuy: true },
  { key: 'altin',     name: 'Altın',     grade: 'B',   emoji: '🥇', defense: 13, price: 0,    craft: { altin_cevheri: 18, demir_cevheri: 12 }, canBuy: false },
  { key: 'kristal',   name: 'Kristal',   grade: 'A',   emoji: '💎', defense: 22, price: 0,    craft: { saf_kristal: 22, altin_cevheri: 20 }, canBuy: false },
  { key: 'ejder',     name: 'Ejder',     grade: 'S',   emoji: '🐉', defense: 35, price: 0,    craft: { ejder_pulu: 34, elmas_cevheri: 34, saf_kristal: 17 }, canBuy: false },
  { key: 'godslayer', name: 'Godslayer', grade: 'SSS', emoji: '👑', defense: 53, price: 0,    craft: { ejder_pulu: 336, elmas_cevheri: 336, saf_kristal: 168, kozmik_kristal: 2, yildiz_tozu: 1 }, canBuy: false },
];

function getArmorName(slotKey, tierKey) {
  const slot = ARMOR_SLOTS.find(s => s.key === slotKey);
  const tier = ARMOR_TIERS.find(t => t.key === tierKey);
  if (!slot || !tier) return `${slotKey}_${tierKey}`;
  return `[${tier.grade}] ${tier.emoji} ${tier.name} ${slot.emoji} ${slot.name}`;
}
function getArmorBattlePower(tierKey, enhancement = 0, slotKey = null) {
  const tier = ARMOR_TIERS.find(t => t.key === tierKey);
  if (!tier) return 0;
  const mult = GEAR_GRADE_MULTIPLIER[tier.grade] || 1;
  const slot = slotKey ? ARMOR_SLOTS.find(s => s.key === slotKey) : null;
  const slotMult = slot ? (ARMOR_SLOT_TIER_MULT[slot.tier] || 1) : 1;
  return Math.round(tier.defense * mult * slotMult * (1 + enhancement * GEAR_ENHANCEMENT_BONUS_PER_LV));
}

// ---- EKİPMAN GELİŞTİRME (+0..+10) ----
const ENHANCEMENT_SUCCESS_RATES = [100, 95, 90, 85, 75, 65, 50, 35, 25, 15];
const ENHANCEMENT_COIN_COST     = [500, 800, 1200, 1800, 2500, 3500, 5000, 7000, 10000, 15000];
const ENHANCEMENT_MAT_COST      = { demir_cevheri: 3, altin_cevheri: 2, saf_kristal: 1 };
const ADVANCED_ENHANCEMENT_MAT_COST = { 5: 1, 6: 1, 7: 2, 8: 2, 9: 3 };

function getAdvancedEnhanceRequirement(enh) {
  if (enh < 5) return null;
  const qty = ADVANCED_ENHANCEMENT_MAT_COST[enh] || 3;
  const matKey = ADVANCED_MAT_KEYS[enh % ADVANCED_MAT_KEYS.length];
  return { [matKey]: qty };
}

module.exports = {
  PET_EGG_TYPES, MMORPG_PETS, MMO_PET_MAX_LEVEL, MMO_PET_BONUS_PER_LV, MMO_PET_MAX_ACTIVE,
  PET_SHARD_COSTS, getPetShardCostForLevel, pickMmoPetFromEgg,
  MMORPG_CHESTS, CRAFT_EGG_RECIPES, CRAFT_SANDIK_RECIPES,
  CRAFT_MATERIALS, ADVANCED_CRAFT_MATERIALS, ADVANCED_MAT_KEYS,
  WEAPON_TYPES, WEAPON_SPEED_BASE, GEAR_GRADE_MULTIPLIER, TIER_SPEED_MULT, GEAR_ENHANCEMENT_BONUS_PER_LV,
  WEAPON_TIERS, parseWeaponKey, getWeaponName, getWeaponPower, getWeaponBattlePower,
  ARMOR_SLOT_TIER_MULT, ARMOR_SLOTS, ARMOR_TIERS, getArmorName, getArmorBattlePower,
  ENHANCEMENT_SUCCESS_RATES, ENHANCEMENT_COIN_COST, ENHANCEMENT_MAT_COST,
  ADVANCED_ENHANCEMENT_MAT_COST, getAdvancedEnhanceRequirement,
};
