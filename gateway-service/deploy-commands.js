// deploy-commands.js
//
// Slash komutlarını Discord'a kaydeder. Render'da otomatik ÇALIŞMAZ - deploy
// sonrası bir kez elle çalıştırılmalı: `node deploy-commands.js`
// (veya komutlar değiştiğinde tekrar).

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
const CLIENT_ID     = process.env.DISCORD_CLIENT_ID || '';
const GUILD_ID      = process.env.DISCORD_GUILD_ID || '';

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('⛔ DISCORD_TOKEN ve DISCORD_CLIENT_ID gerekli.');
  process.exit(1);
}

function loadCommandData(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { result.push(...loadCommandData(full)); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const command = require(full);
    if (command && command.data) result.push(command.data.toJSON());
  }
  return result;
}

const commands = loadCommandData(path.join(__dirname, 'commands'));
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 ${commands.length} komut kaydediliyor...`);
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body: commands });
    console.log(`✅ ${commands.length} komut kaydedildi${GUILD_ID ? ` (sunucu: ${GUILD_ID})` : ' (global - yayılması ~1 saat sürebilir)'}.`);
  } catch (err) {
    console.error('⛔ Komut kaydı başarısız:', err);
    process.exit(1);
  }
})();
