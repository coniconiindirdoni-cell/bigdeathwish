// commands/admin/veriyukle.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { safeExecute } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('veriyukle')
    .setDescription('[Admin] Bir GitHub yedeğinden veri geri yükler')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('commit-sha').setDescription('Geri yüklenecek yedek commit SHA (/backuplist ile bul)').setRequired(true)),

  execute: safeExecute('admin/veriyukle', async (interaction) => {
    // ⚠️ background-service'in /backup/restore endpoint'i HENÜZ EKLENMEDİ.
    // Geri yükleme (TRUNCATE + toplu INSERT, 64 tablo) veri kaybı riski taşıyan
    // kritik bir işlem olduğu için ayrı bir onay akışıyla dikkatlice eklenmeli.
    // Bu komut şimdilik durumu şeffafça bildiriyor, sahte bir başarı mesajı GÖSTERMİYOR.
    await interaction.reply({
      content: '⚠️ Geri yükleme (restore) özelliği backend\'de henüz uygulanmadı. ' +
        '`background-service`\'e `/backup/restore` endpoint\'i eklenmeden bu komut çalışmayacak — ' +
        'veri kaybı riski nedeniyle bu bilinçli olarak sahte bir sonuç döndürmüyor.',
      ephemeral: true,
    });
  }),
};
