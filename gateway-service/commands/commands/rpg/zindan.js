// commands/rpg/zindan.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zindan')
    .setDescription('Bir zindana girer')
    .addStringOption(o => o.setName('zindan').setDescription('Zindan anahtarı (goblin, iskelet, ejder, ...)').setRequired(true)),

  execute: safeExecute('rpg/zindan', async (interaction) => {
    const dungeonKey = interaction.options.getString('zindan');
    await interaction.deferReply();
    try {
      const result = await gameCore.post('/dungeon-fight/dungeons/enter', {
        guildId: interaction.guildId, userId: interaction.user.id, dungeonKey,
      });

      const embed = new EmbedBuilder()
        .setColor(result.success ? 0x2ECC71 : 0xE74C3C)
        .setTitle(`${result.dungeon.emoji} ${result.dungeon.name} — ${result.success ? '✅ Başarılı!' : '❌ Başarısız'}`)
        .addFields(
          { name: 'XP', value: `+${result.xp}`, inline: true },
          { name: 'Coin', value: `+${result.coin}`, inline: true },
          { name: 'Başarı Şansı', value: `%${result.successChance}`, inline: true },
        );
      if (result.isCrit) embed.addFields({ name: '💥 Kritik!', value: 'x1.5 ödül' });
      if (result.leveled) embed.addFields({ name: '📈 Seviye Atladın!', value: `Yeni seviye: ${result.newLevel}` });
      if (result.drops && result.drops.length) {
        embed.addFields({
          name: '🎁 Düşenler',
          value: result.drops.map(d => `${d.emoji || '🔹'} ${d.name}${d.qty ? ` x${d.qty}` : ''}`).join('\n'),
        });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
