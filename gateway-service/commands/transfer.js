// commands/admin/backuplist.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { background } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backuplist')
    .setDescription('[Admin] Son GitHub yedeklerini listeler')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  execute: safeExecute('admin/backuplist', async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    try {
      const { backups } = await background.get('/backup/list?limit=15');
      const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle('🗄️ Son Yedekler')
        .setDescription(backups.length ? backups.map(b => `\`${b.sha.slice(0, 7)}\` — ${b.message} (${new Date(b.date).toLocaleString('tr-TR')})`).join('\n') : 'Henüz yedek yok.');
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
