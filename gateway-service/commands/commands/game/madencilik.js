// commands/game/madencilik.js — orijinal komut adı: panel gönderme + sıralama.
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');
const madenciCmd = require('./madenci');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('madencilik')
    .setDescription('Madencilik oyunu komutları')
    .addSubcommand(s => s.setName('panel').setDescription('Madencilik panelini kanala gönderir'))
    .addSubcommand(s => s.setName('siralama').setDescription('Madencilik sıralamasını gör')),

  execute: safeExecute('game/madencilik', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'panel') {
        const status = await gameCore.get(`/mining/status?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
        return interaction.editReply(madenciCmd.buildPanel(status, interaction.guildId, interaction.user.id));
      }
      if (sub === 'siralama') {
        const { leaderboard } = await gameCore.get(`/mining/leaderboard?guildId=${interaction.guildId}&limit=10`);
        const embed = new EmbedBuilder().setColor(0x95A5A6).setTitle('⛏️ Madencilik Sıralaması')
          .setDescription(leaderboard.length ? leaderboard.map((r, i) => `**${i + 1}.** <@${r.user_id}> — Lv.${r.mining_level} (${r.total_ores_mined} cevher)`).join('\n') : 'Kimse yok.');
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
