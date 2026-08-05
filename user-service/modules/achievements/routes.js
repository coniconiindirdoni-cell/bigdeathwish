// modules/achievements/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const { logError } = require('../../lib/logger-client');

router.get('/', async (req, res) => {
  const { guildId, userId } = req.query;
  if (!guildId || !userId) return res.status(400).json({ ok: false, error: 'guildId ve userId zorunludur.' });
  try {
    const achievements = await svc.getAll(guildId, userId);
    res.json({ ok: true, achievements });
  } catch (err) {
    logError(err, { fileName: 'achievements/routes.js', userId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'Başarımlar alınamadı.' });
  }
});

router.post('/unlock', async (req, res) => {
  const { guildId, userId, achievementKey } = req.body || {};
  if (!guildId || !userId || !achievementKey) return res.status(400).json({ ok: false, error: 'guildId, userId ve achievementKey zorunludur.' });
  try {
    const result = await svc.unlock(guildId, userId, achievementKey);
    res.json({ ok: true, ...result });
  } catch (err) {
    logError(err, { fileName: 'achievements/routes.js', userId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'Başarım açılamadı.' });
  }
});

module.exports = router;
