// commands/admin/backupsil.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { safeExecute } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backupsil')
    .setDescription('[Admin] Bir GitHub yedeğini siler')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('commit-sha').setDescription('Silinecek yedek commit SHA').setRequired(true)),

  execute: safeExecute('admin/backupsil', async (interaction) => {
    // ⚠️ background-service'te commit/dosya silme endpoint'i henüz yok.
    await interaction.reply({
      content: '⚠️ Yedek silme özelliği backend\'de henüz uygulanmadı. GitHub üzerinden ilgili commit/dosya elle silinebilir.',
      ephemeral: true,
    });
  }),
};
