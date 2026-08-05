// commands/game/balik.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balik')
    .setDescription('Balıkçılık komutları')
    .addSubcommand(s => s.setName('tut').setDescription('Balık tutmayı dene'))
    .addSubcommand(s => s.setName('envanter').setDescription('Balık envanterini gör'))
    .addSubcommand(s => s.setName('boost-al').setDescription('Balıkçılık Şansı Boost satın al (2000 coin, 100 kullanım)'))
    .addSubcommand(s => s.setName('durum').setDescription('Boost durumunu gör')),

  execute: safeExecute('game/balik', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId, userId = interaction.user.id;
    await interaction.deferReply();
    try {
      if (sub === 'tut') {
        const result = await gameCore.post('/fishing/cast', { guildId, userId });
        if (result.type === 'empty') return interaction.editReply({ content: '🎣 Olta boş geldi, tekrar dene.' });
        if (result.type === 'line_snap') return interaction.editReply({ content: `🎣 Misina koptu! (-${result.cost} coin)` });
        if (result.type === 'rod_break') return interaction.editReply({ content: `🎣 Olta kırıldı! (-${result.cost} coin)` });
        const boostTxt = result.boosted ? ' ⚡ *(boost aktif)*' : '';
        return interaction.editReply({ content: `🎣 **${result.fish.name}** ${result.fish.emoji} yakaladın! (piyasa değeri: ${result.marketValue})${boostTxt}` });
      }
      if (sub === 'envanter') {
        const { inventory } = await gameCore.get(`/fishing/inventory?guildId=${guildId}&userId=${userId}`);
        const embed = new EmbedBuilder().setColor(0x3498DB).setTitle('🎣 Balık Envanterin')
          .setDescription(inventory.length ? inventory.map(i => `**${i.fishKey}** x${i.count} (${i.value}/adet)`).join('\n') : 'Envanterin boş.');
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'boost-al') {
        const result = await gameCore.post('/fishing/boost-buy', { guildId, userId });
        return interaction.editReply({ content: `⚡ Boost satın alındı! Kalan kullanım: ${result.usesLeft}. Bakiye: ${result.balance.toLocaleString('tr-TR')}` });
      }
      if (sub === 'durum') {
        const { usesLeft } = await gameCore.get(`/fishing/boost-status?guildId=${guildId}&userId=${userId}`);
        return interaction.editReply({ content: `⚡ Kalan boost kullanımı: **${usesLeft}**` });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
