// commands/misc/verikaydet.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { background } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verikaydet')
    .setDescription('[Admin] Veritabanının manuel GitHub yedeğini alır')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  execute: safeExecute('misc/verikaydet', async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await background.post('/backup/run', { label: interaction.user.username });
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🗄️ Yedek Alındı')
        .addFields(
          { name: 'Dosya', value: result.fileName },
          { name: 'Boyut', value: `${(result.sizeBytes / 1024).toFixed(1)} KB` },
          { name: 'Branch', value: result.branch },
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
