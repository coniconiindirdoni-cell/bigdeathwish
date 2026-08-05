// commands/rpg/slot.js
const { SlashCommandBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slot')
    .setDescription('Slot makinesi oyna (günlük max 10 kez)')
    .addIntegerOption(o => o.setName('bahis').setDescription('Bahis miktarı (min 50, max 5000)').setRequired(true).setMinValue(50).setMaxValue(5000)),

  execute: safeExecute('rpg/slot', async (interaction) => {
    const bet = interaction.options.getInteger('bahis');
    await interaction.deferReply();
    try {
      const result = await gameCore.post('/gambling/slot', { guildId: interaction.guildId, userId: interaction.user.id, bet });
      const outcome = result.multiplier > 0 ? `🎉 Kazandın! **+${result.winAmount}** coin (x${result.multiplier})` : '😿 Kaybettin.';
      await interaction.editReply({
        content: `🎰 [ ${result.reels.join(' | ')} ]\n${outcome}\n💰 Bakiye: ${result.balance.toLocaleString('tr-TR')} — Kalan oynanış: ${result.playsLeft}`,
      });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
