// modules/market/routes.js
const express = require('express');
const router = express.Router();

const svc = require('./service');
const balanceSvc = require('../balance/service');
const { logError, logCritical } = require('../../lib/logger-client');

// ---------------- SUNUCU ROL MARKETİ (admin) ----------------
router.get('/roles', async (req, res) => {
  const { guildId } = req.query;
  if (!guildId) return res.status(400).json({ ok: false, error: 'guildId zorunludur.' });
  try {
    const roles = await svc.getMarketRoles(guildId);
    res.json({ ok: true, roles });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Rol marketi alınamadı.' });
  }
});

router.post('/roles', async (req, res) => {
  const { guildId, roleId, price, isPremium } = req.body || {};
  if (!guildId || !roleId || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ ok: false, error: 'guildId, roleId ve geçerli price zorunludur.' });
  }
  try {
    await svc.addMarketRole(guildId, roleId, Math.round(price), isPremium);
    res.json({ ok: true });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Rol eklenemedi.' });
  }
});

router.post('/roles/remove', async (req, res) => {
  const { guildId, roleId } = req.body || {};
  if (!guildId || !roleId) return res.status(400).json({ ok: false, error: 'guildId ve roleId zorunludur.' });
  try {
    await svc.removeMarketRole(guildId, roleId);
    res.json({ ok: true });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Rol kaldırılamadı.' });
  }
});

router.post('/roles/buy', async (req, res) => {
  const { guildId, userId, roleId } = req.body || {};
  if (!guildId || !userId || !roleId) return res.status(400).json({ ok: false, error: 'guildId, userId ve roleId zorunludur.' });
  try {
    const price = await svc.getMarketRolePrice(guildId, roleId);
    if (price === null) return res.status(400).json({ ok: false, error: 'unknown_role' });
    const charge = await balanceSvc.adjustBalance(guildId, userId, -price, 'market_role_buy', 'economy-service');
    if (!charge.ok) return res.status(400).json(charge);
    res.json({ ok: true, roleId, price, balance: charge.balance });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', userId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'Rol satın alınamadı.' });
  }
});

// ---------------- RENK ROLLERİ ----------------
router.get('/color-roles', async (req, res) => {
  const { guildId } = req.query;
  if (!guildId) return res.status(400).json({ ok: false, error: 'guildId zorunludur.' });
  try {
    const roles = await svc.getColorRoles(guildId);
    res.json({ ok: true, roles });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Renk rolleri alınamadı.' });
  }
});

router.post('/color-roles', async (req, res) => {
  const { guildId, roleId, price } = req.body || {};
  if (!guildId || !roleId) return res.status(400).json({ ok: false, error: 'guildId ve roleId zorunludur.' });
  try {
    await svc.addColorRole(guildId, roleId, Number.isFinite(price) ? Math.round(price) : 4000);
    res.json({ ok: true });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Renk rolü eklenemedi.' });
  }
});

router.post('/color-roles/buy', async (req, res) => {
  const { guildId, userId, roleId } = req.body || {};
  if (!guildId || !userId || !roleId) return res.status(400).json({ ok: false, error: 'guildId, userId ve roleId zorunludur.' });
  try {
    const price = await svc.getColorRolePrice(guildId, roleId);
    if (price === null) return res.status(400).json({ ok: false, error: 'unknown_role' });
    const charge = await balanceSvc.adjustBalance(guildId, userId, -price, 'color_role_buy', 'economy-service');
    if (!charge.ok) return res.status(400).json(charge);
    res.json({ ok: true, roleId, price, balance: charge.balance });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', userId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'Renk rolü satın alınamadı.' });
  }
});

// ---------------- OYUNCU PAZARI ----------------
// NOT: Bu servis satılan eşyanın (balık/cevher/alet vb.) kendisini TUTMAZ -
// o game-core-service'in envanterinde. Akış: game-core-service önce eşyayı
// satıcıdan düşürür, sonra burada ilan açar. Satın alınca burada coin el
// değiştirir; eşyanın alıcı envanterine eklenmesi game-core-service/gateway
// tarafında ayrıca tamamlanmalı (bu servis oyun envanterine dokunmaz).
router.get('/player-market', async (req, res) => {
  const { guildId } = req.query;
  if (!guildId) return res.status(400).json({ ok: false, error: 'guildId zorunludur.' });
  try {
    const listings = await svc.getListings(guildId);
    res.json({ ok: true, listings });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', serverId: guildId });
    res.status(500).json({ ok: false, error: 'Pazar ilanları alınamadı.' });
  }
});

router.post('/player-market/list', async (req, res) => {
  const { guildId, sellerId, itemType, itemKey, quantity, price } = req.body || {};
  if (!guildId || !sellerId || !itemType || !itemKey || !Number.isFinite(quantity) || !Number.isFinite(price) || quantity <= 0 || price <= 0) {
    return res.status(400).json({ ok: false, error: 'guildId, sellerId, itemType, itemKey, quantity ve price zorunludur.' });
  }
  try {
    const id = await svc.createListing(guildId, sellerId, itemType, itemKey, Math.round(quantity), Math.round(price));
    res.json({ ok: true, listingId: id });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', userId: sellerId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'İlan oluşturulamadı.' });
  }
});

router.post('/player-market/cancel', async (req, res) => {
  const { guildId, sellerId, listingId } = req.body || {};
  if (!guildId || !sellerId || !listingId) return res.status(400).json({ ok: false, error: 'guildId, sellerId ve listingId zorunludur.' });
  try {
    const listing = await svc.getListing(listingId);
    if (!listing || listing.guild_id !== guildId) return res.status(400).json({ ok: false, error: 'listing_not_found' });
    if (listing.seller_id !== sellerId) return res.status(403).json({ ok: false, error: 'not_owner' });
    await svc.deleteListing(listingId);
    res.json({ ok: true, listing });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', userId: sellerId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'İlan iptal edilemedi.' });
  }
});

router.post('/player-market/buy', async (req, res) => {
  const { guildId, buyerId, listingId } = req.body || {};
  if (!guildId || !buyerId || !listingId) return res.status(400).json({ ok: false, error: 'guildId, buyerId ve listingId zorunludur.' });
  try {
    const listing = await svc.getListing(listingId);
    if (!listing || listing.guild_id !== guildId) return res.status(400).json({ ok: false, error: 'listing_not_found' });
    if (listing.seller_id === buyerId) return res.status(400).json({ ok: false, error: 'cannot_buy_own_listing' });

    await svc.deleteListing(listingId);

    const charge = await balanceSvc.adjustBalance(guildId, buyerId, -listing.price, 'player_market_buy', 'economy-service');
    if (!charge.ok) {
      await svc.createListing(guildId, listing.seller_id, listing.item_type, listing.item_key, listing.quantity, listing.price);
      return res.status(400).json(charge);
    }
    const payout = await balanceSvc.adjustBalance(guildId, listing.seller_id, listing.price, 'player_market_sell', 'economy-service');
    if (!payout.ok) {
      await logCritical(`Pazar satışı: alıcıdan coin alındı ama satıcıya ödenemedi. listingId=${listingId}`, {
        fileName: 'market/routes.js', userId: buyerId, serverId: guildId, metadata: { listing },
      });
    }
    res.json({
      ok: true, listing, buyerBalance: charge.balance, sellerBalance: payout.ok ? payout.balance : null,
      note: 'Eşyanın envantere eklenmesi game-core-service tarafında ayrıca yapılmalı.',
    });
  } catch (err) {
    logError(err, { fileName: 'market/routes.js', userId: buyerId, serverId: guildId });
    res.status(500).json({ ok: false, error: 'Satın alma işlemi başarısız oldu.' });
  }
});

module.exports = router;
