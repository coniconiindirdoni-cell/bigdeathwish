// commands/game/oduncu.js — madenci.js ile aynı kalıp, woodcutting endpoint'lerine bağlanır.
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

function buildPanel(status, guildId, userId) {
  const embed = new EmbedBuilder()
    .setColor(0x27AE60)
    .setTitle('🪓 Odunculuk Paneli')
    .addFields(
      { name: 'Seviye', value: `${status.woodLevel} (${status.woodXp}/${status.xpNeeded} XP)`, inline: true },
      { name: 'Enerji', value: `${status.energy}/${status.maxEnergy}`, inline: true },
      { name: 'İşçiler', value: `${status.lumberjacks}`, inline: true },
      { name: 'Toplam Kütük', value: `${status.totalLogsCut}`, inline: true },
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`wood_chop:${guildId}:${userId}`).setLabel('🪓 Ormana Gönder').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`wood_sell:${guildId}:${userId}`).setLabel('💰 Envanteri Sat').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`wood_inv:${guildId}:${userId}`).setLabel('🎒 Envanter').setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row] };
}

module.exports = {
  data: new SlashCommandBuilder().setName('oduncu').setDescription('Odunculuk panelini açar'),

  execute: safeExecute('game/oduncu', async (interaction) => {
    await interaction.deferReply();
    try {
      const status = await gameCore.get(`/woodcutting/status?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
      await interaction.editReply(buildPanel(status, interaction.guildId, interaction.user.id));
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),

  buildPanel,
};
