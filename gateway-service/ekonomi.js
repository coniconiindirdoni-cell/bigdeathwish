// commands/economy/market-yonet.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { economy } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market-yonet')
    .setDescription('[Admin] Rol marketini yönetir')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('ekle').setDescription('Markete rol ekle')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true))
      .addIntegerOption(o => o.setName('fiyat').setDescription('Fiyat').setRequired(true).setMinValue(0))
      .addBooleanOption(o => o.setName('premium').setDescription('Premium rol mü?').setRequired(false)))
    .addSubcommand(s => s.setName('kaldir').setDescription('Marketten rol kaldır')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true))),

  execute: safeExecute('economy/market-yonet', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const role = interaction.options.getRole('rol');
    await interaction.deferReply({ ephemeral: true });
    try {
      if (sub === 'ekle') {
        const price = interaction.options.getInteger('fiyat');
        const premium = interaction.options.getBoolean('premium') || false;
        await economy.post('/market/roles', { guildId: interaction.guildId, roleId: role.id, price, isPremium: premium });
        return interaction.editReply({ content: `✅ ${role} markete eklendi (${price} coin).` });
      }
      if (sub === 'kaldir') {
        await economy.post('/market/roles/remove', { guildId: interaction.guildId, roleId: role.id });
        return interaction.editReply({ content: `✅ ${role} marketten kaldırıldı.` });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
