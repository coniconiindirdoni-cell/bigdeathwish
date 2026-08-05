// commands/games/zar.js
const { SlashCommandBuilder } = require('discord.js');
const { economy } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

const lossStreak = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zar')
    .setDescription('Zar at, üst (4-6) ya da alt (1-3) tahmin et')
    .addSubcommand(s => s.setName('ust').setDescription('Üst (4-6) tahmin et'))
    .addSubcommand(s => s.setName('alt').setDescription('Alt (1-3) tahmin et')),

  execute: safeExecute('games/zar', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const secim = sub === 'ust' ? 'üst' : 'alt';
    const roll = Math.floor(Math.random() * 6) + 1;
    const sonuc = roll <= 3 ? 'alt' : 'üst';
    const kazandi = secim === sonuc;
    const key = `${interaction.guildId}:${interaction.user.id}`;

    let delta = kazandi ? 30 : -10;
    let extraMsg = '';
    if (!kazandi) {
      const streak = (lossStreak.get(key) || 0) + 1;
      lossStreak.set(key, streak);
      if (streak >= 2) {
        delta = -40;
        extraMsg = '\n🔥 **Cooked!** İki kez üst üste kaybettin, ek ceza uygulandı.';
        lossStreak.set(key, 0);
      }
    } else {
      lossStreak.set(key, 0);
    }

    await interaction.deferReply();
    try {
      const result = await economy.post('/add-coin', {
        guildId: interaction.guildId, userId: interaction.user.id, amount: delta, reason: 'zar_oyunu', sourceService: 'gateway-service',
      });
      await interaction.editReply({
        content: `🎲 Zar: **${roll}** → **${sonuc.toUpperCase()}** ${kazandi ? `Kazandın 🎉 (**+${delta}** coin)` : `Kaybettin 😿 (**${delta}** coin)`}\n💰 Bakiye: **${result.balance.toLocaleString('tr-TR')}**${extraMsg}`,
      });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
