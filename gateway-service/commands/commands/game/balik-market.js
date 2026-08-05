// commands/game/balik-market.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('balik-market').setDescription('Balık fiyat listesi'),

  execute: safeExecute('game/balik-market', async (interaction) => {
    await interaction.deferReply();
    try {
      const { market } = await gameCore.get('/fishing/market');
      const embed = new EmbedBuilder().setColor(0x3498DB).setTitle('🐟 Balık Marketi (6 saatte bir güncellenir)')
        .setDescription(market.map(f => `${f.emoji} **${f.name}** — ${f.value} coin`).join('\n'));
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
