// commands/game/balik-sat.js
const { SlashCommandBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('balik-sat').setDescription('Envanterindeki tüm balıkları markete sat'),

  execute: safeExecute('game/balik-sat', async (interaction) => {
    await interaction.deferReply();
    try {
      const result = await gameCore.post('/fishing/sell', { guildId: interaction.guildId, userId: interaction.user.id });
      await interaction.editReply({ content: `💰 Tüm balıklar satıldı: **${result.total.toLocaleString('tr-TR')} coin**! Yeni bakiye: ${result.newBalance.toLocaleString('tr-TR')}` });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
