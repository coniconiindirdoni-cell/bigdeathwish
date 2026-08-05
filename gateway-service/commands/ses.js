// commands/admin/xp.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { user } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('[Admin] XP komutları')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('ver').setDescription('Kullanıcıya XP ver')
      .addUserOption(o => o.setName('hedef').setDescription('Hedef').setRequired(true))
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1))),

  execute: safeExecute('admin/xp', async (interaction) => {
    const target = interaction.options.getUser('hedef');
    const amount = interaction.options.getInteger('miktar');
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await user.post('/level/xp/add', { guildId: interaction.guildId, userId: target.id, amount });
      await interaction.editReply({ content: `✅ ${target} kullanıcısına ${amount} XP verildi.${result.leveled ? ` 📈 Yeni seviye: ${result.newLevel}` : ''}` });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
