// commands/game/pet.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('pet').setDescription('Petlerini gösterir ve aktif peti seçmeni sağlar'),

  execute: safeExecute('game/pet', async (interaction) => {
    await interaction.deferReply();
    try {
      const { owned, active } = await gameCore.get(
        `/pets-relics-antiques/pets?guildId=${interaction.guildId}&userId=${interaction.user.id}`
      );

      const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('🐾 Petlerin')
        .setDescription(
          owned.length
            ? owned.map(p => `${p.emoji} **${p.name}** — Lv.${p.level}${active && active.key === p.key ? ' ✅ *(aktif)*' : ''}`).join('\n')
            : 'Henüz bir petin yok. Marketten satın alabilirsin!'
        );

      const components = [];
      if (owned.length) {
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`pet_select:${interaction.guildId}:${interaction.user.id}`)
          .setPlaceholder('Aktif pet seç')
          .addOptions(owned.map(p => ({ label: p.name, value: p.key, emoji: p.emoji })));
        components.push(new ActionRowBuilder().addComponents(menu));
      }

      await interaction.editReply({ embeds: [embed], components });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),

  async handleSelect(interaction, guildId) {
    const petKey = interaction.values[0];
    await interaction.deferUpdate();
    try {
      await gameCore.post('/pets-relics-antiques/pets/set-active', { guildId, userId: interaction.user.id, petKey });
      await interaction.followUp({ content: '✅ Aktif pet güncellendi!', ephemeral: true });
    } catch (err) {
      await interaction.followUp({ content: friendlyError(err), ephemeral: true });
    }
  },
};
