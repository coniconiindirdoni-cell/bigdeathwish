// commands/economy/mulk-siralama.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('mulk-siralama').setDescription('Kimin kaç kraliyet unvanı var'),

  execute: safeExecute('economy/mulk-siralama', async (interaction) => {
    await interaction.deferReply();
    try {
      const { items } = await economy.get(`/royal/items?guildId=${interaction.guildId}`);
      const counts = {};
      for (const i of items) if (i.ownerId) counts[i.ownerId] = (counts[i.ownerId] || 0) + 1;
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('👑 Kraliyet Unvanı Sıralaması')
        .setDescription(sorted.length ? sorted.map(([uid, count], i) => `**${i + 1}.** <@${uid}> — ${count} unvan`).join('\n') : 'Henüz kimsenin unvanı yok.');
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
