// commands/rpg/fight.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fight')
    .setDescription('Başka bir oyuncuyla düello yapar')
    .addUserOption(o => o.setName('rakip').setDescription('Rakip').setRequired(true)),

  execute: safeExecute('rpg/fight', async (interaction) => {
    const opponent = interaction.options.getUser('rakip');
    if (opponent.id === interaction.user.id) return interaction.reply({ content: '🚫 Kendinle dövüşemezsin.', ephemeral: true });
    if (opponent.bot) return interaction.reply({ content: '🚫 Bir botla dövüşemezsin.', ephemeral: true });

    await interaction.deferReply();
    try {
      const result = await gameCore.post('/dungeon-fight/fight', {
        guildId: interaction.guildId, challengerId: interaction.user.id, opponentId: opponent.id,
      });
      const winner = result.winnerId === interaction.user.id ? interaction.user : opponent;

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('⚔️ Düello Sonucu')
        .setDescription(`${interaction.user} vs ${opponent}\n\n🏆 Kazanan: **${winner.username}**`)
        .addFields(
          { name: 'Kazanma Şansı', value: `%${result.challengerChance} (meydan okuyan)`, inline: true },
          { name: 'Çalınan Coin', value: `${result.stolen.toLocaleString('tr-TR')}`, inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
