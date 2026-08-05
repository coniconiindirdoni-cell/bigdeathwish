// modules/messages/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const { logError } = require('./lib/logger-client');

router.post('/count', async (req, res) => {
  const { guildId, channelId, userId } = req.body || {};
  if (!guildId || !channelId || !userId) return res.status(400).json({ ok: false, error: 'guildId, channelId ve userId zorunludur.' });
  try {
    await svc.addMessageCount(guildId, channelId, userId);
    res.json({ ok: true });
  } catch (err) {
    logError(err, { fileName: 'messages/routes.js', userId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'Mesaj sayacı güncellenemedi.' });
  }
});

router.get('/top', async (req, res) => {
  const { guildId, channelId, limit, date } = req.query;
  if (!guildId || !channelId) return res.status(400).json({ ok: false, error: 'guildId ve channelId zorunludur.' });
  try {
    const top = await svc.getTopMessages(guildId, channelId, Math.min(parseInt(limit, 10) || 10, 25), date || undefined);
    res.json({ ok: true, top });
  } catch (err) {
    logError(err, { fileName: 'messages/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Liderlik tablosu alınamadı.' });
  }
});

router.post('/reset', async (req, res) => {
  const { guildId } = req.body || {};
  if (!guildId) return res.status(400).json({ ok: false, error: 'guildId zorunludur.' });
  try {
    await svc.resetChannelCounts(guildId);
    res.json({ ok: true });
  } catch (err) {
    logError(err, { fileName: 'messages/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Sıfırlama başarısız oldu.' });
  }
});

module.exports = router;
