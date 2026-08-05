// ╔══════════════════════════════════════════════════════════════╗
// ║                    GAME-CORE-SERVICE                          ║
// ║  Deathwish Game Bot — Madencilik, Odunculuk, Balıkçılık, RPG   ║
// ║                                                                 ║
// ║  Bu dosya SADECE bootstrap yapar: Express app'i kurar, ortak   ║
// ║  middleware'i uygular ve her modülün kendi router'ını bağlar.  ║
// ║  Oyun mantığının HİÇBİRİ burada değil — her sistem kendi        ║
// ║  modules/<isim>/ klasöründe (constants.js + service.js +       ║
// ║  routes.js).                                                    ║
// ║                                                                 ║
// ║  Yeni bir modül eklerken tek yapman gereken:                   ║
// ║    1) modules/<isim>/ altında constants/service/routes oluştur ║
// ║    2) aşağıya  app.use('/<isim>', require('./modules/<isim>/routes'))  ║
// ╚══════════════════════════════════════════════════════════════╝

const express = require('express');
const { requireInternalAuth } = require('./middleware/auth');
const { logInfo, logCritical } = require('./lib/logger-client');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

// Health check (Render için) — auth GEREKMEZ.
app.get('/', (_req, res) => res.send('🎮 Deathwish Game Core Service aktif!'));

// Bu noktadan sonraki TÜM route'lar INTERNAL_API_KEY ister.
app.use(requireInternalAuth);

// ── Modül router'ları ────────────────────────────────────────
app.use('/mining', require('./modules/mining/routes'));
app.use('/woodcutting', require('./modules/woodcutting/routes'));
app.use('/fishing', require('./modules/fishing/routes'));
app.use('/pets-relics-antiques', require('./modules/pets-relics-antiques/routes'));
require('./modules/fishing/service').startFishMarketRefresh();

// Sıradaki modüller taşındıkça buraya eklenecek:
// app.use('/rpg-core',           require('./modules/rpg-core/routes'));
// app.use('/dungeon-fight',      require('./modules/dungeon-fight/routes'));
// app.use('/mmo-equipment',      require('./modules/mmo-equipment/routes'));

// 404 — tanımsız route
app.use((req, res) => res.status(404).json({ ok: false, error: 'Bilinmeyen endpoint.' }));

// Beklenmeyen hatalar için son çare handler
app.use((err, req, res, _next) => {
  console.error('⛔ Beklenmeyen hata:', err);
  logCritical(`Yakalanmamış hata: ${err?.message || err}`, {
    fileName: 'index.js',
    metadata: { stack: err?.stack || null, path: req.path },
  }).catch(() => {});
  res.status(500).json({ ok: false, error: 'Sunucu hatası.' });
});

app.listen(PORT, () => {
  console.log(`🌐 game-core-service ${PORT} portunda çalışıyor.`);
  logInfo(`game-core-service başlatıldı (port ${PORT})`, { fileName: 'index.js' }).catch(() => {});
});

process.on('unhandledRejection', (r) => {
  console.error('UnhandledRejection:', r);
  logCritical(`unhandledRejection: ${r?.message || r}`, { fileName: 'index.js' }).catch(() => {});
});
process.on('uncaughtException', (e) => {
  console.error('UncaughtException:', e);
  logCritical(`uncaughtException: ${e?.message || e}`, { fileName: 'index.js' }).catch(() => {});
});
