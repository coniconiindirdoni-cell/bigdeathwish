// commands/rpg/sandik.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sandik')
    .setDescription('Sandık yönetimi')
    .addSubcommand(s => s.setName('ac').setDescription('Bir sandık aç')
      .addStringOption(o => o.setName('tur').setDescription('Sandık türü').setRequired(true)
        .addChoices(
          { name: '📦 Ahşap', value: 'ahsap' }, { name: '⚙️ Demir', value: 'demir' }, { name: '🥇 Altın', value: 'altin' },
          { name: '💎 Elmas', value: 'elmas' }, { name: '👑 Kraliyet', value: 'kraliyet' },
        )))
    .addSubcommand(s => s.setName('satinal').setDescription('Sandık satın al')
      .addStringOption(o => o.setName('tur').setDescription('Sandık türü').setRequired(true)
        .addChoices(
          { name: '📦 Ahşap', value: 'ahsap' }, { name: '⚙️ Demir', value: 'demir' }, { name: '🥇 Altın', value: 'altin' },
          { name: '💎 Elmas', value: 'elmas' }, { name: '👑 Kraliyet', value: 'kraliyet' },
        )))
    .addSubcommand(s => s.setName('liste').setDescription('Sandıklarını gör')),

  execute: safeExecute('rpg/sandik', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'satinal') {
        const chestType = interaction.options.getString('tur');
        const result = await gameCore.post('/mmo-equipment/chests/buy', { guildId: interaction.guildId, userId: interaction.user.id, chestType });
        return interaction.editReply({ content: `📦 ${result.chest.name} satın alındı! Bakiye: ${result.balance.toLocaleString('tr-TR')}` });
      }
      if (sub === 'ac') {
        const chestType = interaction.options.getString('tur');
        const result = await gameCore.post('/mmo-equipment/chests/open', { guildId: interaction.guildId, userId: interaction.user.id, chestType });
        let desc;
        if (result.type === 'craft_mat') desc = `🧱 ${result.item.name} x${result.qty}${result.rare ? ' ✨ (nadir!)' : ''}`;
        else if (result.type === 'egg') desc = `🥚 Bir ${result.eggType} yumurtası çıktı!`;
        return interaction.editReply({ content: `📦 Sandık açıldı!\n${desc}` });
      }
      if (sub === 'liste') {
        const { catalog, owned } = await gameCore.get(`/mmo-equipment/chests?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
        const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('📦 Sandıkların')
          .setDescription(owned.length ? owned.map(c => `${c.emoji} ${c.name} x${c.quantity}`).join('\n') : 'Hiç sandığın yok.')
          .addFields({ name: 'Satın Alınabilir', value: catalog.map(c => `${c.emoji} ${c.name} — ${c.price} coin`).join('\n') });
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
