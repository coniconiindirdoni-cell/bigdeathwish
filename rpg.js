// commands/rpg/statsifirla.js
const { SlashCommandBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('statsifirla').setDescription('Tüm statlarını sıfırlar ve harcadığın coini iade eder (sınıfın da sıfırlanır)'),

  execute: safeExecute('rpg/statsifirla', async (interaction) => {
    await interaction.deferReply();
    try {
      const result = await gameCore.post('/rpg-core/stats/reset', { guildId: interaction.guildId, userId: interaction.user.id });
      await interaction.editReply({ content: `♻️ Statların sıfırlandı! İade edilen coin: **${result.refund.toLocaleString('tr-TR')}**${result.balance ? ` (yeni bakiye: ${result.balance.toLocaleString('tr-TR')})` : ''}` });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
