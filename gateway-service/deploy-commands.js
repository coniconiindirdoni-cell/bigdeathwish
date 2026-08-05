// deploy-commands.js
//
// Slash komutlarını Discord'a global olarak kaydeder.
// Deploy sonrası bir kez çalıştır:
// node deploy-commands.js

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('⛔ DISCORD_TOKEN ve CLIENT_ID gerekli.');
  process.exit(1);
}

function loadCommandData(dir) {
  const result = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...loadCommandData(full));
      continue;
    }

    if (!entry.name.endsWith('.js')) continue;

    const command = require(full);

    if (command?.data) {
      result.push(command.data.toJSON());
    }
  }

  return result;
}

const commands = loadCommandData(path.join(__dirname, 'commands'));
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 ${commands.length} komut global olarak kaydediliyor...`);

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ ${commands.length} komut başarıyla global olarak kaydedildi.`);
    console.log('ℹ️ Discord\'un komutları tüm sunuculara yayması birkaç dakika ile 1 saat arasında sürebilir.');
  } catch (err) {
    console.error('⛔ Komut kaydı başarısız:', err);
    process.exit(1);
  }
})();
})();
