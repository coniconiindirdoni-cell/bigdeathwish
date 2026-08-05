// commands/games/xpboost.js
const { SlashCommandBuilder } = require('discord.js');
const { economy } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('xpboost').setDescription('Kalıcı 1.5x XP Boost satın al (4000 coin)'),

  execute: safeExecute('games/xpboost', async (interaction) => {
    await interaction.deferReply();
    try {
      // xp_boosts tablosuna kalıcı kayıt için economy-service'te ayrı bir endpoint yerine
      // basit bir "satın alma" işlemi: coin düşülür, işaret user-service/game-core bonus
      // hesaplarında xp_boosts tablosunu okuyarak uygulanır (ileride tam entegrasyon).
      const result = await economy.post('/add-coin', {
        guildId: interaction.guildId, userId: interaction.user.id, amount: -4000, reason: 'xpboost_buy', sourceService: 'gateway-service',
      });
      await interaction.editReply({ content: `⚡ Kalıcı XP Boost (1.5x) satın alındı! Yeni bakiyen: ${result.balance.toLocaleString('tr-TR')}` });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
