// commands/economy/setup.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('[Admin] Botu bu sunucu için hazırlar')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  execute: safeExecute('economy/setup', async (interaction) => {
    await interaction.deferReply();
    // servers/server_settings kaydı ilk API çağrısında otomatik oluşur (ON CONFLICT DO NOTHING deseni).
    // Burada ekonomi hesabını da tetikleyerek "kurulum tamam" onayı veriyoruz.
    await economy.get(`/balance?guildId=${interaction.guildId}&userId=${interaction.user.id}`).catch(() => {});
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ Kurulum Tamamlandı')
      .setDescription('Deathwish Game Bot bu sunucu için hazır! `/yardim` ile komutları görebilirsin.');
    await interaction.editReply({ embeds: [embed] });
  }),
};
