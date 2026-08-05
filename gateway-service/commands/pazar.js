// commands/admin/ses.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { voice } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ses')
    .setDescription('[Admin] Ses süresi sistemi yönetimi')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('sifirla').setDescription('Bu sunucunun ses verilerini sıfırlar (GERİ ALINAMAZ)')),

  execute: safeExecute('admin/ses', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });
    try {
      if (sub === 'sifirla') {
        // voice-service'te toplu sıfırlama endpoint'i şu an yok; en yakın güvenli
        // alternatif: leaderboard'u kontrol ettirip admin'e bilgi vermek.
        // Tam sıfırlama için voice-service'e /voice/reset-guild eklenmesi gerekir.
        return interaction.editReply({ content: '⚠️ Toplu sıfırlama endpoint\'i henüz eklenmedi — voice-service\'e `/voice/reset-guild` eklenmesi gerekiyor.' });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
