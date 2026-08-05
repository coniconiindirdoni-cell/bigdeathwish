// commands/rpg/stat.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

const STAT_CHOICES = [
  { name: '❤️ Can', value: 'hp' }, { name: '⚔️ Güç', value: 'attack' }, { name: '🛡️ Savunma', value: 'defense' },
  { name: '🎯 Kritik', value: 'critical' }, { name: '💨 Hız', value: 'speed' }, { name: '🔮 Mana', value: 'mana' }, { name: '✨ Büyücülük', value: 'magic' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stat')
    .setDescription('RPG statlarını gösterir veya yükseltir')
    .addSubcommand(s => s.setName('goster').setDescription('Statlarını gösterir'))
    .addSubcommand(s => s.setName('yukselt').setDescription('Bir statı yükseltir')
      .addStringOption(o => { o.setName('stat').setDescription('Stat').setRequired(true); STAT_CHOICES.forEach(c => o.addChoices(c)); return o; })),

  execute: safeExecute('rpg/stat', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'goster') {
        const { stats, class: cls } = await gameCore.get(`/rpg-core/stats?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
        const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('📊 RPG Statların')
          .setDescription(`Sınıf: ${cls || 'seçilmedi'}`)
          .addFields(STAT_CHOICES.map(c => ({ name: c.name, value: `${stats[c.value]}`, inline: true })));
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'yukselt') {
        const stat = interaction.options.getString('stat');
        const result = await gameCore.post('/rpg-core/stats/upgrade', { guildId: interaction.guildId, userId: interaction.user.id, stat });
        return interaction.editReply({ content: `📈 ${stat} statı yükseltildi! Yeni seviye: ${result.newLevel} (-${result.cost} coin, bakiye: ${result.balance.toLocaleString('tr-TR')})` });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
