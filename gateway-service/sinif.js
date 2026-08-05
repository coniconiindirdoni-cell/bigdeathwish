// commands/games/blackjack.js — basitleştirilmiş tek-round blackjack (kart çizimi otomatik, 17'de durur).
const { SlashCommandBuilder } = require('discord.js');
const { economy } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

const BJ_MAX_DAILY = 8;

function drawCard() { return Math.floor(Math.random() * 10) + 1; } // basit: 1-10 arası kart değeri (J/Q/K=10 dahil edilmiş sayılır)
function playHand() {
  let total = drawCard() + drawCard();
  while (total < 17) total += drawCard();
  return Math.min(total, 31); // üstten sınırlama (aşırı yüksek toplamları frenler)
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription(`Blackjack oyna (günlük max ${BJ_MAX_DAILY} kez)`)
    .addIntegerOption(o => o.setName('bahis').setDescription('Bahis miktarı').setRequired(true).setMinValue(50).setMaxValue(5000)),

  execute: safeExecute('games/blackjack', async (interaction) => {
    const bet = interaction.options.getInteger('bahis');
    await interaction.deferReply();
    try {
      const limitCheck = await economy.post('/claims/increment', {
        guildId: interaction.guildId, userId: interaction.user.id, claimType: 'blackjack', max: BJ_MAX_DAILY,
      });
      if (!limitCheck.ok) return interaction.editReply({ content: `⏳ Günlük blackjack hakkın doldu (${limitCheck.max}/gün).` });

      const charge = await economy.post('/add-coin', {
        guildId: interaction.guildId, userId: interaction.user.id, amount: -bet, reason: 'blackjack_bet', sourceService: 'gateway-service',
      });

      const player = playHand();
      const dealer = playHand();
      const playerBust = player > 21;
      const dealerBust = dealer > 21;
      let win = false, push = false;
      if (!playerBust && (dealerBust || player > dealer)) win = true;
      else if (!playerBust && !dealerBust && player === dealer) push = true;

      let delta = 0;
      if (win) delta = bet * 2;
      else if (push) delta = bet;
      const final = delta > 0
        ? await economy.post('/add-coin', { guildId: interaction.guildId, userId: interaction.user.id, amount: delta, reason: 'blackjack_win', sourceService: 'gateway-service' })
        : { balance: charge.balance };

      const resultTxt = win ? `🎉 Kazandın! (+${delta - bet})` : push ? '🤝 Berabere, bahsin iade edildi.' : '😿 Kaybettin.';
      await interaction.editReply({
        content: `🃏 Sen: **${player}**${playerBust ? ' (BATTI)' : ''}  |  Krupiye: **${dealer}**${dealerBust ? ' (BATTI)' : ''}\n${resultTxt}\n💰 Bakiye: ${final.balance.toLocaleString('tr-TR')}`,
      });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
