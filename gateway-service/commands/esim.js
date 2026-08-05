// commands/economy/evlilik.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

const RING_PRICE = 5000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evlilik')
    .setDescription('Evlilik işlemleri')
    .addSubcommand(s => s.setName('yuzuk-al').setDescription(`Evlilik yüzüğü satın al (${RING_PRICE} coin)`))
    .addSubcommand(s => s.setName('yuzugum').setDescription('Yüzük/evlilik durumunu gör'))
    .addSubcommand(s => s.setName('bosan').setDescription('Eşinden boşan'))
    .addSubcommand(s => s.setName('liste').setDescription('Sunucudaki tüm evlilikler')),

  execute: safeExecute('economy/evlilik', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'yuzuk-al') {
        const result = await economy.post('/marriage/buy-ring', { guildId: interaction.guildId, userId: interaction.user.id });
        return interaction.editReply({ content: `💍 Yüzük satın alındı! Yeni bakiyen: ${result.balance.toLocaleString('tr-TR')}` });
      }
      if (sub === 'yuzugum') {
        const status = await economy.get(`/marriage/status?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
        const embed = new EmbedBuilder().setColor(0xE91E63).setTitle('💍 Evlilik Durumun')
          .setDescription(status.marriage ? `Evlisin: <@${status.marriage.user2}>\nEvlilik tarihi: ${status.marriage.married_at}` : (status.hasRing ? '💍 Bir yüzüğün var, henüz evli değilsin.' : '💔 Yüzüğün yok, evli değilsin.'));
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'bosan') {
        const result = await economy.post('/marriage/divorce', { guildId: interaction.guildId, userId: interaction.user.id });
        return interaction.editReply({ content: `💔 <@${result.formerSpouseId}> ile boşandın.` });
      }
      if (sub === 'liste') {
        const { marriages } = await economy.get(`/marriage/all?guildId=${interaction.guildId}`);
        const embed = new EmbedBuilder().setColor(0xE91E63).setTitle('💍 Sunucu Evlilikleri')
          .setDescription(marriages.length ? marriages.map(m => `<@${m.user1}> ❤️ <@${m.user2}>`).join('\n') : 'Henüz kimse evli değil.');
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
