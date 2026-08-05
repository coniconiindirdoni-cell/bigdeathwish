// commands/rpg/parcala.js
const { SlashCommandBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('parcala')
    .setDescription("Craftlanmış eşyayı boz — harcanan malzemenin %70'i geri iade edilir")
    .addSubcommand(s => s.setName('silah').setDescription('Bir silahı boz')
      .addIntegerOption(o => o.setName('id').setDescription('Silah ID (/envanter ile öğren)').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('zirh').setDescription('Bir zırhı boz')
      .addIntegerOption(o => o.setName('id').setDescription('Zırh ID (/envanter ile öğren)').setRequired(true).setMinValue(1))),

  execute: safeExecute('rpg/parcala', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const itemId = interaction.options.getInteger('id');
    const itemType = sub === 'silah' ? 'weapon' : 'armor';
    await interaction.deferReply();
    try {
      const result = await gameCore.post('/mmo-equipment/dismantle', { guildId: interaction.guildId, userId: interaction.user.id, itemType, itemId });
      const lines = Object.entries(result.refunded).map(([k, v]) => `${k}: +${v}`).join('\n');
      await interaction.editReply({ content: `🔧 Eşya parçalandı! İade edilen malzemeler:\n${lines || 'Hiçbir şey iade edilmedi.'}` });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
