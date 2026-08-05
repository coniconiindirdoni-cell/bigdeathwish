// modules/shared/bonuses.js
//
// Madencilik, odunculuk ve balıkçılık gibi birden fazla modül; relic,
// pet, antika ve alet bonuslarından etkileniyor (orijinal botta
// getPassiveXpBonusPct, getBestMiningToolBonus, getRelicSetMineBonus vb.
// fonksiyonlar). Bu dosya, o hesaplamalar için TEK ortak giriş noktasıdır.
//
// ⚠️ DURUM: relics / pets / antiques / player_tools tabloları schema.sql'de
// zaten var, ancak bu sistemleri okuyan modül ("pets-relics-antiques")
// henüz bu mesajda taşınmadı. Bu yüzden aşağıdaki fonksiyonlar şimdilik
// 0 (bonus yok) döndüren güvenli stub'lar — mining modülü bunlarsız da
// tam çalışır, sadece bonuslar henüz uygulanmıyor.
//
// pets-relics-antiques modülü tamamlandığında SADECE bu dosyanın içini
// gerçek sorgularla dolduracağız; mining/woodcutting/fishing modüllerinin
// kodunu DEĞİŞTİRMEMİZ gerekmeyecek.

const pool = require('../../db/pool');

/** Pasif XP bonus yüzdesi (antika + pet + relic toplamı). Örn: 0.15 = +%15 */
async function getPassiveXpBonusPct(_guildId, _userId) {
  // TODO(pets-relics-antiques modülü): getAntiqueXpBonus + getPetXpBonus + getRelicXpBonus
  return 0;
}

/** En iyi madencilik aletinin sağladığı satış bonus yüzdesi. Örn: 0.10 = +%10 */
async function getBestMiningToolBonus(_guildId, _userId) {
  // TODO(pets-relics-antiques modülü): player_tools tablosundan en iyi kazmayı bul
  return 0;
}

/** Gölge Seti (relic set) madencilik satış bonus yüzdesi. */
async function getRelicSetMineBonus(_guildId, _userId) {
  // TODO(pets-relics-antiques modülü): active_relic_sets + RELIC_SETS tablosu
  return 0;
}

/** En iyi odunculuk aletinin bonus yüzdesi. */
async function getBestWoodToolBonus(_guildId, _userId) {
  return 0;
}

/** Güneş Seti (relic set) odunculuk satış bonus yüzdesi. */
async function getRelicSetWoodBonus(_guildId, _userId) {
  return 0;
}

/** Deniz Reliği — nadir balık ağırlık çarpanı (1.0 = etkisiz). */
async function getRelicDenizFishMultiplier(_guildId, _userId) {
  // TODO(pets-relics-antiques modülü)
  return 1.0;
}

/** Tüccar Reliği — balık satış bonus yüzdesi (0-100 arası, örn 10 = +%10). */
async function getRelicFishBonusPct(_guildId, _userId) {
  return 0;
}

/** Güneş Seti — balıkçılık satış bonus yüzdesi. */
async function getRelicSetFishBonusPct(_guildId, _userId) {
  return 0;
}

module.exports = {
  getPassiveXpBonusPct,
  getBestMiningToolBonus,
  getRelicSetMineBonus,
  getBestWoodToolBonus,
  getRelicSetWoodBonus,
  getRelicDenizFishMultiplier,
  getRelicFishBonusPct,
  getRelicSetFishBonusPct,
};
