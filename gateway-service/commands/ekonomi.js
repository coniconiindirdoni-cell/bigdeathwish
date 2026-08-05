// commands/economy/pazar.js — oyuncu pazarı (coin tarafı economy-service'te).
// NOT: Satılan eşyanın alıcı envanterine eklenmesi game-core-service tarafında
// tamamlanmalıdır (economy-service'in player-market yanıtı bunu 'note' alanıyla
// belirtiyor) — bu komut coin transferini eksiksiz yapar, eşya teslimatı manuel/
// takip gerektirir. Bkz. mimari notları.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pazar')
    .setDescription('Oyuncu pazarı — eşya al/sat')
    .addSubcommand(s => s.setName('listele').setDescription('Aktif ilanları gör'))
    .addSubcommand(s => s.setName('sat').setDescription('İlan aç')
      .addStringOption(o => o.setName('tur').setDescription('Eşya türü').setRequired(true))
      .addStringOption(o => o.setName('anahtar').setDescription('Eşya anahtarı/ID').setRequired(true))
      .addIntegerOption(o => o.setName('fiyat').setDescription('Satış fiyatı').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar (varsayılan 1)').setMinValue(1)))
    .addSubcommand(s => s.setName('al').setDescription('İlandan satın al')
      .addIntegerOption(o => o.setName('id').setDescription('İlan ID').setRequired(true)))
    .addSubcommand(s => s.setName('iptal').setDescription('Kendi ilanını iptal et')
      .addIntegerOption(o => o.setName('id').setDescription('İlan ID').setRequired(true))),

  execute: safeExecute('economy/pazar', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'listele') {
        const { listings } = await economy.get(`/market/player-market?guildId=${interaction.guildId}`);
        const embed = new EmbedBuilder().setColor(0x16A085).setTitle('🛒 Oyuncu Pazarı')
          .setDescription(listings.length ? listings.map(l => `**#${l.id}** ${l.item_type}/${l.item_key} x${l.quantity} — ${l.price.toLocaleString('tr-TR')} coin (satıcı: <@${l.seller_id}>)`).join('\n').slice(0, 4000) : 'Aktif ilan yok.');
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'sat') {
        const itemType = interaction.options.getString('tur');
        const itemKey = interaction.options.getString('anahtar');
        const price = interaction.options.getInteger('fiyat');
        const quantity = interaction.options.getInteger('miktar') || 1;
        const result = await economy.post('/market/player-market/list', { guildId: interaction.guildId, sellerId: interaction.user.id, itemType, itemKey, quantity, price });
        return interaction.editReply({ content: `✅ İlan açıldı! İlan ID: **${result.listingId}**` });
      }
      if (sub === 'al') {
        const listingId = interaction.options.getInteger('id');
        const result = await economy.post('/market/player-market/buy', { guildId: interaction.guildId, buyerId: interaction.user.id, listingId });
        return interaction.editReply({ content: `✅ Satın alındı! Yeni bakiyen: ${result.buyerBalance.toLocaleString('tr-TR')}` });
      }
      if (sub === 'iptal') {
        const listingId = interaction.options.getInteger('id');
        await economy.post('/market/player-market/cancel', { guildId: interaction.guildId, sellerId: interaction.user.id, listingId });
        return interaction.editReply({ content: '✅ İlan iptal edildi.' });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
