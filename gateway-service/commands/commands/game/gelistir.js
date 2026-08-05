// commands/game/gelistir.js — Pet ve Antika yükseltmelerini tek panelden yönetir.
// NOT: Orijinal botta Ev/Araba yükseltmesi de bu panelde vardı; properties
// sistemi henüz backend'e taşınmadığı için (bkz. mimari notları) o kısım
// şimdilik kapsam dışı — Pet ve Antika tam çalışıyor.
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('gelistir').setDescription('Pet veya Antika yükselt'),

  execute: safeExecute('game/gelistir', async (interaction) => {
    await interaction.deferReply();
    const embed = new EmbedBuilder().setColor(0xF39C12).setTitle('⬆️ Geliştirme Paneli')
      .setDescription('Aşağıdaki butonlardan birini seç.');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`gelistir_pet:${interaction.guildId}:${interaction.user.id}`).setLabel('🐾 Pet Yükselt').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`gelistir_antika:${interaction.guildId}:${interaction.user.id}`).setLabel('🏺 Antika Yükselt').setStyle(ButtonStyle.Secondary),
    );
    await interaction.editReply({ embeds: [embed], components: [row] });
  }),

  async handlePetUpgrade(interaction, guildId, userId) {
    await interaction.deferUpdate();
    try {
      const { owned, active } = await gameCore.get(`/pets-relics-antiques/pets?guildId=${guildId}&userId=${userId}`);
      if (!active) return interaction.followUp({ content: 'Önce /pet ile bir aktif pet seç.', ephemeral: true });
      const result = await gameCore.post('/pets-relics-antiques/pets/upgrade', { guildId, userId, petKey: active.key });
      await interaction.followUp({ content: `📈 ${active.name} yükseltildi! Yeni seviye: ${result.newLevel} (-${result.cost} coin)`, ephemeral: true });
    } catch (err) {
      await interaction.followUp({ content: friendlyError(err), ephemeral: true });
    }
  },
  async handleAntikaUpgrade(interaction, guildId, userId) {
    await interaction.deferUpdate();
    try {
      const result = await gameCore.post('/pets-relics-antiques/antiques/upgrade', { guildId, userId });
      await interaction.followUp({ content: `📈 Antika yükseltildi! Yeni seviye: ${result.newUpgradeLevel}/${result.maxUpg} (-${result.cost} coin)`, ephemeral: true });
    } catch (err) {
      await interaction.followUp({ content: friendlyError(err), ephemeral: true });
    }
  },
};
