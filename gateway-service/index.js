// gateway-service — Discord Bağlantısı, Komut/Buton/Event Sistemi
//
// Mimarideki 7 servisten Discord'a bağlanan TEK servistir. Ağır iş yapmaz -
// her isteği ilgili backend servise (game-core, economy, user, voice,
// moderation, background) yönlendirir.

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { logInfo, logCritical } = require('../lib/logger-client');
const { waitUntilReady, isReady, startThirtyMinuteSync } = require('./lib/service-client');
const express = require('express');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
if (!DISCORD_TOKEN) { console.error('⛔ DISCORD_TOKEN bulunamadı!'); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
function loadCommandsFrom(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { loadCommandsFrom(full); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const command = require(full);
    if (command && command.data && command.data.name && typeof command.execute === 'function') {
      client.commands.set(command.data.name, command);
    }
  }
}
loadCommandsFrom(path.join(__dirname, 'commands'));
console.log(`📜 ${client.commands.size} komut yüklendi.`);

const eventsDir = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsDir, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}
console.log('🔌 Event handler\'ları yüklendi.');

client.login(DISCORD_TOKEN).catch((err) => {
  console.error('⛔ Discord girişi başarısız:', err);
  logCritical(`Discord girişi başarısız: ${err.message}`, { fileName: 'index.js' }).catch(() => {});
  process.exit(1);
});

process.on('unhandledRejection', (r) => {
  console.error('UnhandledRejection:', r);
  logCritical(`unhandledRejection: ${r}`, { fileName: 'index.js' }).catch(() => {});
});
process.on('uncaughtException', (e) => {
  console.error('UncaughtException:', e);
  logCritical(`uncaughtException: ${e.message}`, { fileName: 'index.js' }).catch(() => {});
});

const healthApp=express(); healthApp.get('/health',(_q,r)=>r.json({ok:true,discordReady:client.isReady()})); healthApp.get('/ready',(_q,r)=>r.status(client.isReady()&&isReady()?200:503).json({ok:client.isReady()&&isReady()})); healthApp.listen(process.env.PORT||3000); waitUntilReady(); startThirtyMinuteSync(()=>console.log('Database generation değişti.'));
