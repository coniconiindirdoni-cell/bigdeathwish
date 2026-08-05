// commands/games/oyunlar.js — Şans kutusu (80 coin, günlük 5 hak).
const { SlashCommandBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

const BOX_PRICE = 80;
const BOX_DAILY_LIMIT = 5;
// Basit ödül dağılımı: %55 küçük kazanç, %30 kayıp, %12 orta kazanç, %3 büyük kazanç.
function rollBox() {
  const r = Math.random() * 100;
  if (r < 55) return { amount: Math.floor(Math.random() * 80) + 20, label: 'Küçük ödül' };
  if (r < 85) return { amount: -BOX_PRICE, label: 'Boş çıktı' };
  if (r < 97) return { amount: Math.floor(Math.random() * 300) + 150, label: 'Orta ödül' };
  return { amount: Math.floor(Math.random() * 1000) + 500, label: '🌟 Büyük ödül!' };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('oyunlar')
    .setDescription('Eğlence / oyun komutları')
    .addSubcommand(s => s.setName('sanskutusu').setDescription(`Şans kutusu aç (${BOX_PRICE} coin, günlük ${BOX_DAILY_LIMIT} hak)`)),

  execute: safeExecute('games/oyunlar', async (interaction) => {
    await interaction.deferReply();
    try {
      const limitCheck = await economy.post('/claims/increment', {
        guildId: interaction.guildId, userId: interaction.user.id, claimType: 'sanskutusu', max: BOX_DAILY_LIMIT,
      });
      if (!limitCheck.ok) return interaction.editReply({ content: `⏳ Günlük şans kutusu hakkın doldu (${limitCheck.max}/gün).` });

      const charge = await economy.post('/add-coin', {
        guildId: interaction.guildId, userId: interaction.user.id, amount: -BOX_PRICE, reason: 'sanskutusu_buy', sourceService: 'gateway-service',
      });
      const prize = rollBox();
      const final = prize.amount !== -BOX_PRICE
        ? await economy.post('/add-coin', { guildId: interaction.guildId, userId: interaction.user.id, amount: prize.amount, reason: 'sanskutusu_win', sourceService: 'gateway-service' })
        : { balance: charge.balance };

      await interaction.editReply({
        content: `🎁 Şans Kutusu: **${prize.label}**${prize.amount > 0 ? ` (+${prize.amount} coin)` : ''}\n💰 Bakiye: ${final.balance.toLocaleString('tr-TR')} — Kalan hak: ${BOX_DAILY_LIMIT - limitCheck.current}`,
      });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
