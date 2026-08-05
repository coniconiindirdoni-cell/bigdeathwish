// commands/games/yazioyunu.js — Yazı yazma yarışı: bot bir cümle gösterir, ilk
// doğru yazan kazanır. awaitMessages kullanır, messageCreate.js'e dokunmaz.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

const SENTENCES = [
  'Deathwish Game Bot mikroservis mimarisiyle çalışır',
  'Madencilik ve odunculuk enerji harcar',
  'Ejder Setinin üç parçası vardır',
  'Zindanlar seviyene göre kilitlenir',
  'Relic setleri iki parçada aktifleşmeye başlar',
  'Sabır ve emek her başarının temelidir',
];
const RACE_REWARD = 150;
const RACE_TIMEOUT_MS = 30_000;

// Aynı kanalda aynı anda tek yarış (process-local).
const activeRaces = new Set();

module.exports = {
  data: new SlashCommandBuilder().setName('yazioyunu').setDescription('Bir yazı yazma yarışı başlatır'),

  execute: safeExecute('games/yazioyunu', async (interaction) => {
    const channelKey = interaction.channel.id;
    if (activeRaces.has(channelKey)) return interaction.reply({ content: '⏳ Bu kanalda zaten aktif bir yarış var.', ephemeral: true });
    activeRaces.add(channelKey);

    const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('⌨️ Yazı Yazma Yarışı!')
      .setDescription(`Aşağıdaki cümleyi **birebir aynı şekilde** ilk yazan **${RACE_REWARD} coin** kazanır!\n\n\`\`\`${sentence}\`\`\``)
      .setFooter({ text: `${RACE_TIMEOUT_MS / 1000} saniyen var!` });
    await interaction.reply({ embeds: [embed] });

    try {
      const collected = await interaction.channel.awaitMessages({
        filter: m => !m.author.bot && m.content.trim() === sentence,
        max: 1, time: RACE_TIMEOUT_MS, errors: ['time'],
      });
      const winnerMsg = collected.first();
      const result = await economy.post('/add-coin', {
        guildId: interaction.guildId, userId: winnerMsg.author.id, amount: RACE_REWARD, reason: 'yazioyunu_win', sourceService: 'gateway-service',
      });
      await interaction.channel.send({ content: `🏆 **${winnerMsg.author.username}** kazandı! (+${RACE_REWARD} coin, bakiye: ${result.balance.toLocaleString('tr-TR')})` });
    } catch (e) {
      await interaction.channel.send({ content: '⏰ Süre doldu, kimse doğru yazamadı.' });
    } finally {
      activeRaces.delete(channelKey);
    }
  }),
};
