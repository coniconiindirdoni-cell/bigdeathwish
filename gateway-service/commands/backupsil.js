// commands/user/siralama.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { user, economy, voice } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('siralama')
    .setDescription('Liderlik tablosunu gösterir')
    .addStringOption(o => o.setName('tur').setDescription('Sıralama türü').setRequired(true)
      .addChoices(
        { name: '💰 Coin', value: 'coin' },
        { name: '💬 Seviye', value: 'level' },
        { name: '🎙️ Ses Süresi', value: 'voice' },
      )),

  execute: safeExecute('user/siralama', async (interaction) => {
    const tur = interaction.options.getString('tur');
    await interaction.deferReply();
    try {
      let rows, formatLine;
      if (tur === 'coin') {
        ({ leaderboard: rows } = await economy.get(`/leaderboard?guildId=${interaction.guildId}&limit=10`));
        formatLine = (r, i) => `**${i + 1}.** <@${r.userId}> — ${r.total.toLocaleString('tr-TR')} coin`;
      } else if (tur === 'level') {
        ({ leaderboard: rows } = await user.get(`/level/leaderboard?guildId=${interaction.guildId}&limit=10`));
        formatLine = (r, i) => `**${i + 1}.** <@${r.userId}> — Lv.${r.level}`;
      } else {
        ({ leaderboard: rows } = await voice.get(`/voice/leaderboard?guildId=${interaction.guildId}&limit=10`));
        formatLine = (r, i) => `**${i + 1}.** <@${r.userId}> — ${Math.floor(r.totalSeconds / 3600)} saat`;
      }

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`🏆 Liderlik Tablosu — ${tur === 'coin' ? 'Coin' : tur === 'level' ? 'Seviye' : 'Ses Süresi'}`)
        .setDescription(rows.length ? rows.map(formatLine).join('\n') : 'Henüz kimse yok.');
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
