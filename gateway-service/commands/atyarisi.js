// commands/economy/mulk.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mulk')
    .setDescription('Kraliyet unvanları (satın alınca eski sahipten alınır, fiyat +1000 artar)')
    .addSubcommand(s => s.setName('liste').setDescription('Tüm kraliyet unvanlarını ve sahiplerini gör'))
    .addSubcommand(s => s.setName('satinal').setDescription('Bir kraliyet unvanı satın al')
      .addStringOption(o => o.setName('esya').setDescription('Eşya anahtarı').setRequired(true)
        .addChoices(
          { name: '👑 Kral Tacı', value: 'kral_taci' },
          { name: '👑 Kraliçe Tacı', value: 'kralice_taci' },
          { name: '🧥 Kraliyet Pelerini', value: 'pelerin' },
          { name: '💎 Kraliyet Mücevheri', value: 'mucevher' },
        ))),

  execute: safeExecute('economy/mulk', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'liste') {
        const { items } = await economy.get(`/royal/items?guildId=${interaction.guildId}`);
        const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('👑 Kraliyet Unvanları')
          .setDescription(items.map(i => `${i.emoji} **${i.name}** — ${i.ownerId ? `<@${i.ownerId}>` : 'Sahipsiz'} (${i.price.toLocaleString('tr-TR')} coin)`).join('\n'));
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'satinal') {
        const itemKey = interaction.options.getString('esya');
        const result = await economy.post('/royal/buy', { guildId: interaction.guildId, userId: interaction.user.id, itemKey });
        return interaction.editReply({
          content: `👑 **${result.item.name}** satın alındı! (${result.pricePaid.toLocaleString('tr-TR')} coin)${result.prevOwner ? ` Önceki sahip <@${result.prevOwner}> paranın iadesini aldı.` : ''}\nYeni fiyat: ${result.newPrice.toLocaleString('tr-TR')} coin.`,
        });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
