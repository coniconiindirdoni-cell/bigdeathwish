// commands/admin/sifirla.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { safeExecute } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sifirla')
    .setDescription('[Admin] Bir kullanıcının belirli verilerini sıfırlar')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('hedef').setDescription('Hedef kullanıcı').setRequired(true)),

  execute: safeExecute('admin/sifirla', async (interaction) => {
    // Kapsamlı "her şeyi sıfırla" işlemi tüm servislere dağılmış onlarca tabloyu
    // etkiler; güvenlik için tek tek onaylı alt komutlar (ör. /statsifirla,
    // /sohbet sifirla) üzerinden yapılması önerilir. Bu komut yönlendirme yapar.
    await interaction.reply({
      content: '⚠️ Toplu sıfırlama riskli olduğu için ayrı komutlara bölündü:\n' +
        '`/statsifirla` — RPG statları\n`/sohbet sifirla` — sohbet sayaçları\n`/ses sifirla` — ses verileri (henüz eklenmedi)',
      ephemeral: true,
    });
  }),
};
