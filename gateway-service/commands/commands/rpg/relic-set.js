// commands/rpg/relic-set.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('relic-set')
    .setDescription('Relic setlerini ve bonuslarını gösterir')
    .addStringOption(o => o.setName('set').setDescription('Set anahtarı (boş=hepsi)').setRequired(false)),

  execute: safeExecute('rpg/relic-set', async (interaction) => {
    const setKey = interaction.options.getString('set');
    await interaction.deferReply();
    try {
      const { sets } = await gameCore.get(`/dungeon-fight/relic-sets?guildId=${interaction.guildId}&userId=${interaction.user.id}`);
      const filtered = setKey ? sets.filter(s => s.key === setKey) : sets;
      const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle('💎 Relic Setleri');
      for (const s of filtered.slice(0, 25)) {
        embed.addFields({
          name: `${s.emoji} ${s.name} (${s.count}/${s.total})${s.equipped ? ' ✅' : ''}`,
          value: `2 parça: ${s.bonus2}\n4 parça: ${s.bonus4}\nTam set: ${s.bonusFull}`,
        });
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
