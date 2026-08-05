// deploy-commands.js

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN bulunamadı.");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("❌ CLIENT_ID bulunamadı.");
    process.exit(1);
}

const commands = [];

function loadCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);

        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        if (!file.endsWith(".js")) continue;

        const command = require(filePath);

        if (command.data) {
            commands.push(command.data.toJSON());
        }
    }
}

loadCommands(path.join(__dirname, "commands"));

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log(`🚀 ${commands.length} komut yükleniyor...`);

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            {
                body: commands,
            }
        );

        console.log("✅ Komutlar başarıyla yüklendi.");
    } catch (err) {
        console.error(err);
    }
})();
