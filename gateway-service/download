// commands/game/madenci.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

function buildPanel(status, guildId, userId) {
  const embed = new EmbedBuilder()
    .setColor(status.rank.color)
    .setTitle(`⛏️ Madencilik Paneli — ${status.rank.emoji} ${status.rank.name}`)
    .addFields(
      { name: 'Seviye', value: `${status.miningLevel} (${status.miningXp}/${status.xpNeeded} XP)`, inline: true },
      { name: 'Enerji', value: `${status.energy}/${status.maxEnergy}`, inline: true },
      { name: 'İşçiler', value: `${status.miners}`, inline: true },
      { name: 'Toplam Cevher', value: `${status.totalOresMined}`, inline: true },
      { name: 'Yiyecek Hakkı', value: `${status.foodUsesLeft}`, inline: true },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mine_dig:${guildId}:${userId}`).setLabel('⛏️ Madene Gönder').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mine_sell:${guildId}:${userId}`).setLabel('💰 Envanteri Sat').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`mine_inv:${guildId}:${userId}`).setLabel('🎒 Envanter').setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row] };
}

module.exports = {
  data: new SlashCommandBuilder().setName('madenci').setDescription('Madencilik panelini açar'),

  execute: safeExecute('game/madenci', async (interaction) => {
    await interaction.deferReply();
    try {
      const status = await gameCore.get(`/mining/status?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
      await interaction.editReply(buildPanel(status, interaction.guildId, interaction.user.id));
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),

  buildPanel,
};
