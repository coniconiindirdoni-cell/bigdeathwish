// commands/games/yazitura.js
const { SlashCommandBuilder } = require('discord.js');
const { economy } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yazitura')
    .setDescription('Yazı ya da tura tahmin et')
    .addStringOption(o => o.setName('secim').setDescription('Tahminin').setRequired(true)
      .addChoices({ name: 'Yazı', value: 'yazı' }, { name: 'Tura', value: 'tura' })),

  execute: safeExecute('games/yazitura', async (interaction) => {
    const secim = interaction.options.getString('secim');
    const sonuc = Math.random() < 0.5 ? 'yazı' : 'tura';
    const kazandi = secim === sonuc;
    const delta = kazandi ? 20 : -10;

    await interaction.deferReply();
    try {
      const result = await economy.post('/add-coin', {
        guildId: interaction.guildId, userId: interaction.user.id, amount: delta, reason: 'yazitura_oyunu', sourceService: 'gateway-service',
      });
      await interaction.editReply({
        content: `🪙 **${sonuc.toUpperCase()}** geldi! ${kazandi ? `Kazandın 🎉 (**+${delta}** coin)` : `Kaybettin 😿 (**${delta}** coin)`}\n💰 Bakiye: **${result.balance.toLocaleString('tr-TR')}**`,
      });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
