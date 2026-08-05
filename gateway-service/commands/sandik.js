// commands/rpg/craft.js — silah ve zırh craft (yumurta/sandik zaten ayrı komutlarda; malzeme/set kapsam dışı, bkz. not).
const { SlashCommandBuilder } = require('discord.js');
const { gameCore } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Silah veya zırh üretir')
    .addStringOption(o => o.setName('kategori').setDescription('Kategori').setRequired(true)
      .addChoices({ name: '⚔️ Silah', value: 'silah' }, { name: '🛡️ Zırh', value: 'zirh' }))
    .addStringOption(o => o.setName('tur').setDescription('Tier (deri/demir/altin/kristal/ejder/godslayer)').setRequired(true))
    .addStringOption(o => o.setName('alttur').setDescription('Silah tipi (kilic/yay/asa/hancer/tirpan) veya zırh slotu').setRequired(true)),

  execute: safeExecute('rpg/craft', async (interaction) => {
    const kategori = interaction.options.getString('kategori');
    const tur = interaction.options.getString('tur');
    const altTur = interaction.options.getString('alttur');
    await interaction.deferReply();
    try {
      if (kategori === 'silah') {
        const result = await gameCore.post('/mmo-equipment/weapons/craft', { guildId: interaction.guildId, userId: interaction.user.id, weaponType: altTur, tierKey: tur });
        return interaction.editReply({ content: `⚔️ Silah üretildi! ID: ${result.id} — ${result.weaponKey}` });
      }
      const result = await gameCore.post('/mmo-equipment/armors/craft', { guildId: interaction.guildId, userId: interaction.user.id, tierKey: tur, slotKey: altTur });
      await interaction.editReply({ content: `🛡️ Zırh üretildi! ID: ${result.id} — ${result.slotKey}/${result.tierKey}` });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
