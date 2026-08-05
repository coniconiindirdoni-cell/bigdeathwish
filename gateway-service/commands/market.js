// commands/economy/esim.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('esim').setDescription('Eşinin bilgilerini gösterir'),

  execute: safeExecute('economy/esim', async (interaction) => {
    await interaction.deferReply();
    try {
      const status = await economy.get(`/marriage/status?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
      if (!status.marriage) return interaction.editReply({ content: '💔 Evli değilsin.' });
      const spouse = await interaction.client.users.fetch(status.marriage.user2).catch(() => null);
      const embed = new EmbedBuilder().setColor(0xE91E63).setTitle('💍 Eşin')
        .setDescription(`${spouse ? spouse.username : status.marriage.user2}\nEvlilik tarihi: ${status.marriage.married_at}`);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
