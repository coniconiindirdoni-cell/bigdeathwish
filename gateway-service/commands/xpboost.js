// commands/misc/yardim.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeExecute } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('yardim').setDescription('Komut listesini gösterir'),

  execute: safeExecute('misc/yardim', async (interaction) => {
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📖 Deathwish Game Bot — Komutlar')
      .addFields(
        { name: '💰 Ekonomi', value: '`/bakiye` `/banka` `/transfer` `/evlen` `/market`' },
        { name: '⛏️ Oyunlar', value: '`/madenci` `/oduncu` `/balik` `/pet` `/antika`' },
        { name: '⚔️ RPG', value: '`/sinif` `/stat` `/zindan` `/fight` `/rpg`' },
        { name: '👤 Profil', value: '`/hakkimda` `/siralama`' },
      )
      .setFooter({ text: 'Deathwish Game Bot • Mikroservis mimarisi' });
    await interaction.reply({ embeds: [embed] });
  }),
};
