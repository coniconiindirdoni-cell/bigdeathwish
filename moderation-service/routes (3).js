// modules/filter/service.js
//
// Yasaklı kelime listesi sunucu bazlı ve yapılandırılabilir - sabit bir
// küfür listesi GÖMÜLMEDİ (yanlış pozitiflere ve dil/kültür farklarına çok
// açık olurdu). Admin server_settings üzerinden ('banned_words' key, JSON
// dizi olarak) kendi listesini yönetir.

const pool = require('../../db/pool');

async function getBannedWords(guildId) {
  const { rows } = await pool.query(
    "SELECT value FROM server_settings WHERE guild_id=$1 AND key='banned_words'", [guildId]
  );
  if (!rows.length) return [];
  try { return JSON.parse(rows[0].value) || []; } catch (e) { return []; }
}

async function setBannedWords(guildId, words) {
  await pool.query('INSERT INTO servers (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING', [guildId]);
  await pool.query(
    `INSERT INTO server_settings (guild_id, key, value) VALUES ($1,'banned_words',$2)
     ON CONFLICT (guild_id, key) DO UPDATE SET value=$2`,
    [guildId, JSON.stringify(words)]
  );
}

async function addBannedWord(guildId, word) {
  const words = await getBannedWords(guildId);
  const normalized = word.trim().toLowerCase();
  if (!normalized || words.includes(normalized)) return words;
  words.push(normalized);
  await setBannedWords(guildId, words);
  return words;
}

async function removeBannedWord(guildId, word) {
  const words = (await getBannedWords(guildId)).filter(w => w !== word.trim().toLowerCase());
  await setBannedWords(guildId, words);
  return words;
}

function containsBannedWord(content, bannedWords) {
  if (!content || !bannedWords.length) return null;
  const normalized = content.toLowerCase();
  for (const word of bannedWords) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-zçğıöşü0-9])${escaped}([^a-zçğıöşü0-9]|$)`, 'i');
    if (re.test(normalized)) return word;
  }
  return null;
}

async function checkMessage(guildId, content) {
  const bannedWords = await getBannedWords(guildId);
  const matched = containsBannedWord(content, bannedWords);
  return { flagged: !!matched, matchedWord: matched };
}

module.exports = { getBannedWords, setBannedWords, addBannedWord, removeBannedWord, checkMessage };
