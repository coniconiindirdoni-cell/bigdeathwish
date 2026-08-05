// commands/user/sohbet.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { user } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sohbet')
    .setDescription('Sohbet mesaj sayacı komutları')
    .addSubcommand(s => s.setName('siralama').setDescription('Bugünkü mesaj liderliği'))
    .addSubcommand(s => s.setName('durum').setDescription('Pasif coin kazanımı hakkında bilgi'))
    .addSubcommand(s => s.setName('sifirla').setDescription('[Admin] Sohbet sayaçlarını sıfırlar')),

  execute: safeExecute('user/sohbet', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'siralama') {
        const { top } = await user.get(`/messages/top?guildId=${interaction.guildId}&channelId=${interaction.channel.id}&limit=10`);
        const embed = new EmbedBuilder().setColor(0x3498DB).setTitle('💬 Bugünkü Sohbet Liderliği')
          .setDescription(top.length ? top.map((r, i) => `**${i + 1}.** <@${r.userId}> — ${r.count} mesaj`).join('\n') : 'Bugün henüz kimse yazmadı.');
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'durum') {
        return interaction.editReply({ content: 'ℹ️ Her mesaj gönderdiğinde otomatik olarak XP kazanırsın (bkz. `/hakkimda`).' });
      }
      if (sub === 'sifirla') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply({ content: '🚫 Bu alt komut yalnızca yöneticiler içindir.' });
        }
        await user.post('/messages/reset', { guildId: interaction.guildId });
        return interaction.editReply({ content: '✅ Sohbet sayaçları sıfırlandı.' });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
