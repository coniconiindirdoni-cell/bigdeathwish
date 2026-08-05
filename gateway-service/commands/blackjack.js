// commands/economy/market.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market')
    .setDescription('Sunucu rol marketi')
    .addSubcommand(s => s.setName('liste').setDescription('Satılık rolleri listele'))
    .addSubcommand(s => s.setName('satinal').setDescription('Bir rol satın al')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true))),

  execute: safeExecute('economy/market', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'liste') {
        const { roles } = await economy.get(`/market/roles?guildId=${interaction.guildId}`);
        const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('🛒 Rol Marketi')
          .setDescription(roles.length ? roles.map(r => `<@&${r.role_id}> — **${r.price.toLocaleString('tr-TR')}** coin${r.is_premium ? ' 👑' : ''}`).join('\n') : 'Henüz satılık rol yok.');
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'satinal') {
        const role = interaction.options.getRole('rol');
        const result = await economy.post('/market/roles/buy', { guildId: interaction.guildId, userId: interaction.user.id, roleId: role.id });
        await interaction.member.roles.add(role).catch(() => {});
        return interaction.editReply({ content: `✅ ${role} satın alındı! Yeni bakiyen: ${result.balance.toLocaleString('tr-TR')}` });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
