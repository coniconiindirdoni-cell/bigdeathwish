// commands/rpg/yukselt.js — ekipman güçlendirme (+0..+10)
const { SlashCommandBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yukselt')
    .setDescription('Silah veya zırh güçlendir (+0 → +10)')
    .addStringOption(o => o.setName('tur').setDescription('Silah mı, zırh mı?').setRequired(true)
      .addChoices({ name: '⚔️ Silah', value: 'silah' }, { name: '🛡️ Zırh', value: 'zirh' }))
    .addIntegerOption(o => o.setName('id').setDescription('Eşya ID (/envanter\'den öğren)').setRequired(true).setMinValue(1)),

  execute: safeExecute('rpg/yukselt', async (interaction) => {
    const itemType = interaction.options.getString('tur') === 'silah' ? 'weapon' : 'armor';
    const itemId = interaction.options.getInteger('id');
    await interaction.deferReply();
    try {
      const result = await gameCore.post('/mmo-equipment/enhance', { guildId: interaction.guildId, userId: interaction.user.id, itemType, itemId });
      const msg = result.success
        ? `✅ Başarılı! Yeni geliştirme seviyesi: **+${result.newEnhancement}** (${result.coinCost} coin, %${result.successRate} şans)`
        : `❌ Başarısız oldu! Eşya +${result.newEnhancement}'de kaldı. (${result.coinCost} coin harcandı, %${result.successRate} şans)`;
      await interaction.editReply({ content: `🔨 ${msg}` });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
