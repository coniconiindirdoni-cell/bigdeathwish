// commands/rpg/sinif.js — orijinal komut adı /sinif
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sinif')
    .setDescription('Savaş yolunu (sınıfını) seç — Şövalye, Nişancı veya Büyücü')
    .addStringOption(o => o.setName('sinif').setDescription('Seçmek istediğin sınıf').setRequired(true)
      .addChoices(
        { name: '⚔️ Şövalye (Kılıç/Tırpan • Güç-Savunma-Can)', value: 'sovalye' },
        { name: '🏹 Nişancı (Yay/Hançer • Kritik-Hız)', value: 'nisanci' },
        { name: '🪄 Büyücü (Asa • Büyücülük-Mana)', value: 'buyucu' },
      )),

  execute: safeExecute('rpg/sinif', async (interaction) => {
    const classKey = interaction.options.getString('sinif');
    await interaction.deferReply();
    try {
      const result = await gameCore.post('/rpg-core/class/select', {
        guildId: interaction.guildId, userId: interaction.user.id, classKey,
      });
      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`${result.class.emoji} ${result.class.name} sınıfı seçildi!`)
        .setDescription('Artık bu sınıfa uygun statlar, silahlar ve relic setleri kullanabilirsin.');
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
