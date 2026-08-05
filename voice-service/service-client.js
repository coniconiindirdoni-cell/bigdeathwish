// VOICE-SERVICE
// Ses kanalı süresi takibi ve ödül hesaplama.
// Discord'a bağlanmaz - gateway-service voice state eventlerini yakalayıp
// buraya HTTP ile bildirir.

const express = require('express');
const { query, log, waitUntilReady, startThirtyMinuteSync } = require('./lib/service-client');

const PORT                = process.env.PORT || 3000;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const ECONOMY_SERVICE_URL = process.env.ECONOMY_SERVICE_URL || '';

// Aktif ses oturumları (kanalda ne zamandan beri olduğu) - process-local.
// NOT: Bu servis tek instance çalışmalı; horizontal scale gerekirse Redis'e taşınmalı.
const activeSessions = new Map(); // `${guildId}:${userId}` -> joinedAtMs

const VOICE_REWARD_INTERVAL_MS = 60 * 60 * 1000; // 1 saat
const VOICE_REWARD_COIN = 50;

function requireInternalAuth(req, res, next) {
  const key = req.headers['x-internal-api-key'];
  if (!key || key !== INTERNAL_API_KEY) return res.status(401).json({ ok: false, error: 'Yetkisiz istek.' });
  next();
}

async function ensureSchema() {
  // NOT: Ana şema database/schema.sql içinde merkezi olarak tanımlı ve deploy
  // öncesi bir kez uygulanır. Burada IF NOT EXISTS ile tekrar denemek zararsız
  // bir güvenlik ağı ama DB henüz erişilemezse servisin AYAKTA KALMASINI
  // engellemiyoruz (economy-service/game-core-service ile tutarlı davranış).
  await query(`
    CREATE TABLE IF NOT EXISTS voice_activity (
      guild_id      TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      total_seconds BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_voice_activity_guild ON voice_activity (guild_id);
  `);
}

async function addVoiceSeconds(guildId, userId, seconds) {
  const { rows } = await query(
    `INSERT INTO voice_activity (guild_id, user_id, total_seconds) VALUES ($1,$2,$3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET total_seconds = voice_activity.total_seconds + $3
     RETURNING total_seconds`,
    [guildId, userId, seconds]
  );
  return Number(rows[0].total_seconds);
}

async function awardVoiceCoin(guildId, userId, amount) {
  if (!ECONOMY_SERVICE_URL) {
    await log('WARNING', 'ECONOMY_SERVICE_URL tanımlı değil, coin ödülü verilemedi.', { userId, serverId: guildId });
    return null;
  }
  try {
    const res = await fetch(`${ECONOMY_SERVICE_URL}/add-coin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': INTERNAL_API_KEY },
      body: JSON.stringify({ guildId, userId, amount, reason: 'voice_reward', sourceService: 'voice-service' }),
    });
    const data = await res.json();
    return data.ok ? data.balance : null;
  } catch (e) {
    await log('ERROR', `economy-service'e ulaşılamadı: ${e.message}`, { userId, serverId: guildId });
    return null;
  }
}

const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.send('🎙️ Deathwish Voice Service aktif!'));
app.use(requireInternalAuth);

// POST /voice/join  { guildId, userId }
app.post('/voice/join', (req, res) => {
  const { guildId, userId } = req.body || {};
  if (!guildId || !userId) return res.status(400).json({ ok: false, error: 'guildId ve userId zorunludur.' });
  activeSessions.set(`${guildId}:${userId}`, Date.now());
  res.json({ ok: true });
});

// POST /voice/leave  { guildId, userId }
app.post('/voice/leave', async (req, res) => {
  const { guildId, userId } = req.body || {};
  if (!guildId || !userId) return res.status(400).json({ ok: false, error: 'guildId ve userId zorunludur.' });

  const key = `${guildId}:${userId}`;
  const joinedAt = activeSessions.get(key);
  if (!joinedAt) return res.status(400).json({ ok: false, error: 'no_active_session' });
  activeSessions.delete(key);

  const seconds = Math.floor((Date.now() - joinedAt) / 1000);
  try {
    const totalSeconds = await addVoiceSeconds(guildId, userId, seconds);
    const rewardUnits = Math.floor(seconds / (VOICE_REWARD_INTERVAL_MS / 1000));
    let balance = null;
    if (rewardUnits > 0) balance = await awardVoiceCoin(guildId, userId, rewardUnits * VOICE_REWARD_COIN);
    res.json({ ok: true, sessionSeconds: seconds, totalSeconds, coinAwarded: rewardUnits * VOICE_REWARD_COIN, balance });
  } catch (err) {
    await log('ERROR', err.message, { fileName: 'index.js', userId, serverId: guildId, metadata: { stack: err.stack } });
    res.status(500).json({ ok: false, error: 'Ses süresi kaydedilemedi.' });
  }
});

// GET /voice/stats?guildId=&userId=
app.get('/voice/stats', async (req, res) => {
  const { guildId, userId } = req.query;
  if (!guildId || !userId) return res.status(400).json({ ok: false, error: 'guildId ve userId zorunludur.' });
  try {
    const { rows } = await query('SELECT total_seconds FROM voice_activity WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
    const totalSeconds = rows.length ? Number(rows[0].total_seconds) : 0;
    const activeSince = activeSessions.get(`${guildId}:${userId}`) || null;
    res.json({ ok: true, totalSeconds, currentlyInVoice: !!activeSince, activeSince });
  } catch (err) {
    await log('ERROR', err.message, { fileName: 'index.js', userId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'İstatistikler alınamadı.' });
  }
});

// GET /voice/leaderboard?guildId=&limit=
app.get('/voice/leaderboard', async (req, res) => {
  const { guildId, limit } = req.query;
  if (!guildId) return res.status(400).json({ ok: false, error: 'guildId zorunludur.' });
  try {
    const { rows } = await query(
      'SELECT user_id, total_seconds FROM voice_activity WHERE guild_id=$1 ORDER BY total_seconds DESC LIMIT $2',
      [guildId, Math.min(parseInt(limit, 10) || 10, 25)]
    );
    res.json({ ok: true, leaderboard: rows.map(r => ({ userId: r.user_id, totalSeconds: Number(r.total_seconds) })) });
  } catch (err) {
    await log('ERROR', err.message, { fileName: 'index.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Liderlik tablosu alınamadı.' });
  }
});

app.use((req, res) => res.status(404).json({ ok: false, error: 'Bilinmeyen endpoint.' }));
app.use((err, req, res, _next) => {
  console.error('⛔ Beklenmeyen hata:', err);
  log('CRITICAL', `Yakalanmamış hata: ${err.message}`, { fileName: 'index.js', metadata: { stack: err.stack } }).catch(() => {});
  res.status(500).json({ ok: false, error: 'Sunucu hatası.' });
});

app.listen(PORT, () => {
  console.log(`🌐 voice-service ${PORT} portunda çalışıyor.`);
  log('INFO', `voice-service başlatıldı (port ${PORT})`).catch(() => {});
});

waitUntilReady().then(()=>ensureSchema()).catch((err) => {
  console.error('⚠️ Şema doğrulaması başarısız (DB henüz erişilemiyor olabilir):', err.message);
  log('WARNING', `Şema doğrulaması başarısız: ${err.message}`, { fileName: 'index.js' }).catch(() => {});
});

process.on('unhandledRejection', (r) => log('CRITICAL', `unhandledRejection: ${r}`).catch(() => {}));
process.on('uncaughtException', (e) => log('CRITICAL', `uncaughtException: ${e.message}`).catch(() => {}));

startThirtyMinuteSync(()=>console.log('Database generation değişti; voice verileri sorgularda yeniden alınacak.'));
