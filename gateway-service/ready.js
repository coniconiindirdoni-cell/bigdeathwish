// events/ready.js
const { logInfo } = require('../lib/logger-client');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı. ${client.guilds.cache.size} sunucuda aktif.`);
    await logInfo(`Bot başlatıldı: ${client.user.tag} (${client.guilds.cache.size} sunucu)`, { fileName: 'events/ready.js' });
    client.user.setActivity('/yardim | Deathwish', { type: 3 });
  },
};
