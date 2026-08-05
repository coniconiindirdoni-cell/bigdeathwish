// commands/rpg/rpg-pet.js — MMORPG pet yönetimi (klasik /pet'ten farklı sistem).
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rpg-pet')
    .setDescription('MMORPG pet yönetimi')
    .addSubcommand(s => s.setName('liste').setDescription('Tüm petlerini gör'))
    .addSubcommand(s => s.setName('kusan').setDescription('Pet slotuna kuşan')
      .addStringOption(o => o.setName('pet').setDescription('Pet anahtarı').setRequired(true))
      .addStringOption(o => o.setName('hatchedat').setDescription('Doğum zamanı (ISO — /rpg-pet liste\'den kopyala)').setRequired(true))
      .addIntegerOption(o => o.setName('slot').setDescription('Slot (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(s => s.setName('cikar').setDescription('Pet slotundan çıkar')
      .addIntegerOption(o => o.setName('slot').setDescription('Slot (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(s => s.setName('yukselt').setDescription('Pet seviye yükselt')
      .addStringOption(o => o.setName('pet').setDescription('Pet anahtarı').setRequired(true))
      .addStringOption(o => o.setName('hatchedat').setDescription('Doğum zamanı (ISO)').setRequired(true))),

  execute: safeExecute('rpg/rpg-pet', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId, userId = interaction.user.id;
    await interaction.deferReply();
    try {
      if (sub === 'liste') {
        const { owned, active } = await gameCore.get(`/mmo-equipment/pets?guildId=${guildId}&userId=${userId}`);
        const embed = new EmbedBuilder().setColor(0xF39C12).setTitle('🐉 MMO Petlerin')
          .setDescription(owned.length
            ? owned.map(p => `${p.emoji} **${p.name}** Lv.${p.level} — \`${p.hatchedAt}\`${active.some(a => a.hatchedAt === p.hatchedAt) ? ' ✅ *(aktif)*' : ''}`).join('\n')
            : 'Hiç petin yok.');
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'kusan') {
        const petKey = interaction.options.getString('pet');
        const hatchedAt = interaction.options.getString('hatchedat');
        const slot = interaction.options.getInteger('slot') - 1;
        await gameCore.post('/mmo-equipment/pets/set-active', { guildId, userId, slot, petKey, hatchedAt });
        return interaction.editReply({ content: `✅ Pet slot ${slot + 1}'e kuşandırıldı.` });
      }
      if (sub === 'cikar') {
        const slot = interaction.options.getInteger('slot') - 1;
        await gameCore.post('/mmo-equipment/pets/set-active', { guildId, userId, slot, petKey: null });
        return interaction.editReply({ content: `✅ Slot ${slot + 1} boşaltıldı.` });
      }
      if (sub === 'yukselt') {
        const petKey = interaction.options.getString('pet');
        const hatchedAt = interaction.options.getString('hatchedat');
        const result = await gameCore.post('/mmo-equipment/pets/upgrade', { guildId, userId, petKey, hatchedAt });
        return interaction.editReply({ content: `📈 Pet yükseltildi! Yeni seviye: ${result.newLevel}${result.shardCost ? ` (-${result.shardCost} shard)` : ''}` });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
