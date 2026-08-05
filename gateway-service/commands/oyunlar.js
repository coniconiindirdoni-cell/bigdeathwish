// commands/games/atyarisi.js — 4 atlı basit yarış, oranlar eşit (%25 kazanma şansı, x3.5 ödeme).
const { SlashCommandBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

const HORSES = ['🐎 Yıldırım', '🐎 Kasırga', '🐎 Gölge', '🐎 Şimşek'];
const PAYOUT_MULTIPLIER = 3.5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('atyarisi')
    .setDescription('At yarışına bahis yap')
    .addIntegerOption(o => { o.setName('at').setDescription('At numarası (1-4)').setRequired(true).setMinValue(1).setMaxValue(4); return o; })
    .addIntegerOption(o => o.setName('bahis').setDescription('Bahis miktarı').setRequired(true).setMinValue(50).setMaxValue(5000)),

  execute: safeExecute('games/atyarisi', async (interaction) => {
    const chosen = interaction.options.getInteger('at') - 1;
    const bet = interaction.options.getInteger('bahis');
    await interaction.deferReply();
    try {
      const charge = await economy.post('/add-coin', {
        guildId: interaction.guildId, userId: interaction.user.id, amount: -bet, reason: 'atyarisi_bet', sourceService: 'gateway-service',
      });
      const winnerIdx = Math.floor(Math.random() * HORSES.length);
      const won = winnerIdx === chosen;
      const final = won
        ? await economy.post('/add-coin', { guildId: interaction.guildId, userId: interaction.user.id, amount: Math.round(bet * PAYOUT_MULTIPLIER), reason: 'atyarisi_win', sourceService: 'gateway-service' })
        : { balance: charge.balance };

      await interaction.editReply({
        content: `🏇 Yarış bitti! Kazanan: **${HORSES[winnerIdx]}**\nSenin atın: ${HORSES[chosen]}\n${won ? `🎉 Kazandın! (+${Math.round(bet * PAYOUT_MULTIPLIER) - bet} coin)` : '😿 Kaybettin.'}\n💰 Bakiye: ${final.balance.toLocaleString('tr-TR')}`,
      });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
