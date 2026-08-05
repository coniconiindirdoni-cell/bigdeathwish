// user-service — Profil, Mesaj XP/Seviye, Başarımlar, Sohbet İstatistikleri
const express = require('express');
const { waitUntilReady, isReady, startThirtyMinuteSync } = require('./lib/service-client');
const { requireInternalAuth } = require('./middleware/auth');
const { logInfo, logCritical } = require('./lib/logger-client');
const levelSvc = require('./modules/level/service');
const { getXpNeeded } = require('./modules/level/constants');
const achievementsSvc = require('./modules/achievements/service');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) => res.send('👤 Deathwish User Service aktif!'));

app.get('/health', (_req,res)=>res.json({ok:true,service:'user-service'}));
app.get('/ready', (_req,res)=>res.status(isReady()?200:503).json({ok:isReady()}));
startThirtyMinuteSync(()=>console.log('Database restore/generation değişikliği algılandı.'));
waitUntilReady().then(ok=>console.log('Database readiness:',ok));

app.use(requireInternalAuth);

app.use('/level', require('./modules/level/routes'));
app.use('/messages', require('./modules/messages/routes'));
app.use('/achievements', require('./modules/achievements/routes'));

// GET /profile?guildId=&userId=  - bu servisin sahip olduğu her şeyin özeti
// (RPG profili game-core-service/rpg-core'da ayrı - gateway ikisini birleştirebilir)
app.get('/profile', async (req, res) => {
  const { guildId, userId } = req.query;
  if (!guildId || !userId) return res.status(400).json({ ok: false, error: 'guildId ve userId zorunludur.' });
  try {
    const level = await levelSvc.getLevel(guildId, userId);
    const achievements = await achievementsSvc.getAll(guildId, userId);
    res.json({ ok: true, level: { ...level, xpNeeded: getXpNeeded(level.level) }, achievements });
  } catch (err) {
    logCritical(`Profil alınamadı: ${err.message}`, { fileName: 'index.js', userId, serverId: guildId }).catch(() => {});
    res.status(500).json({ ok: false, error: 'Profil alınamadı.' });
  }
});

app.use((req, res) => res.status(404).json({ ok: false, error: 'Bilinmeyen endpoint.' }));

app.use((err, req, res, _next) => {
  console.error('⛔ Beklenmeyen hata:', err);
  logCritical(`Yakalanmamış hata: ${err.message}`, {
    fileName: 'index.js', metadata: { stack: err.stack, path: req.path },
  }).catch(() => {});
  res.status(500).json({ ok: false, error: 'Sunucu hatası.' });
});

app.listen(PORT, () => {
  console.log(`🌐 user-service ${PORT} portunda çalışıyor.`);
  logInfo(`user-service başlatıldı (port ${PORT})`, { fileName: 'index.js' }).catch(() => {});
});

process.on('unhandledRejection', (r) => logCritical(`unhandledRejection: ${r}`, { fileName: 'index.js' }).catch(() => {}));
process.on('uncaughtException', (e) => logCritical(`uncaughtException: ${e.message}`, { fileName: 'index.js' }).catch(() => {}));
