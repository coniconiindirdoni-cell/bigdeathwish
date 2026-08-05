// commands/rpg/yumurta.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

const EGG_CHOICES = [
  { name: '🥚 Sıradan', value: 'siradan' }, { name: '🥈 Nadir', value: 'nadir' }, { name: '🥇 Altın', value: 'altin' },
  { name: '💎 Kristal', value: 'kristal' }, { name: '👑 Kraliyet', value: 'kraliyet' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yumurta')
    .setDescription('Yumurta yönetimi')
    .addSubcommand(s => { const sc = s.setName('ac').setDescription('Bir yumurta aç').addStringOption(o => { o.setName('tur').setDescription('Yumurta türü').setRequired(true); EGG_CHOICES.forEach(c => o.addChoices(c)); return o; }); return sc; })
    .addSubcommand(s => { const sc = s.setName('satinal').setDescription('Yumurta satın al').addStringOption(o => { o.setName('tur').setDescription('Yumurta türü').setRequired(true); EGG_CHOICES.forEach(c => o.addChoices(c)); return o; }); return sc; })
    .addSubcommand(s => s.setName('liste').setDescription('Yumurtalarını gör')),

  execute: safeExecute('rpg/yumurta', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'satinal') {
        const eggType = interaction.options.getString('tur');
        const result = await gameCore.post('/mmo-equipment/eggs/buy', { guildId: interaction.guildId, userId: interaction.user.id, eggType });
        return interaction.editReply({ content: `🥚 ${result.egg.name} satın alındı! Bakiye: ${result.balance.toLocaleString('tr-TR')}` });
      }
      if (sub === 'ac') {
        const eggType = interaction.options.getString('tur');
        const result = await gameCore.post('/mmo-equipment/eggs/hatch', { guildId: interaction.guildId, userId: interaction.user.id, eggType });
        return interaction.editReply({ content: `🥚 Yumurta çatladı! ${result.pet.emoji} **${result.pet.name}** doğdu! (Nadirlik: ${result.pet.rarity})` });
      }
      if (sub === 'liste') {
        const { catalog, owned } = await gameCore.get(`/mmo-equipment/eggs?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
        const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle('🥚 Yumurtaların')
          .setDescription(owned.length ? owned.map(e => `${e.emoji} ${e.name} x${e.quantity}`).join('\n') : 'Hiç yumurtan yok.')
          .addFields({ name: 'Satın Alınabilir', value: catalog.map(e => `${e.emoji} ${e.name} — ${e.price} coin`).join('\n') });
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
