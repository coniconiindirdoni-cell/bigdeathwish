// commands/game/odunculuk.js — orijinal komut adı: panel gönderme + sıralama.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');
const oduncuCmd = require('./oduncu');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('odunculuk')
    .setDescription('Odunculuk oyunu komutları')
    .addSubcommand(s => s.setName('panel').setDescription('Odunculuk panelini gönderir'))
    .addSubcommand(s => s.setName('siralama').setDescription('Odunculuk sıralamasını gör')),

  execute: safeExecute('game/odunculuk', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'panel') {
        const status = await gameCore.get(`/woodcutting/status?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
        return interaction.editReply(oduncuCmd.buildPanel(status, interaction.guildId, interaction.user.id));
      }
      if (sub === 'siralama') {
        const { leaderboard } = await gameCore.get(`/woodcutting/leaderboard?guildId=${interaction.guildId}&limit=10`);
        const embed = new EmbedBuilder().setColor(0x27AE60).setTitle('🪓 Odunculuk Sıralaması')
          .setDescription(leaderboard.length ? leaderboard.map((r, i) => `**${i + 1}.** <@${r.user_id}> — Lv.${r.wood_level} (${r.total_logs_cut} kütük)`).join('\n') : 'Kimse yok.');
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
