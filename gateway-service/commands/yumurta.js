// commands/rpg/envanter.js — birden fazla mmo-equipment endpoint'ini birleştirir.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder().setName('envanter').setDescription('Tüm MMO eşyalarını gösterir (silah/zırh/malzeme)'),

  execute: safeExecute('rpg/envanter', async (interaction) => {
    await interaction.deferReply();
    const qs = `?guildId=${interaction.guildId}&userId=${interaction.user.id}`;
    try {
      const [weapons, armors, materials] = await Promise.all([
        gameCore.get(`/mmo-equipment/weapons${qs}`),
        gameCore.get(`/mmo-equipment/armors${qs}`),
        gameCore.get(`/mmo-equipment/materials${qs}`),
      ]);

      const embed = new EmbedBuilder().setColor(0x95A5A6).setTitle('🎒 Envanterin');
      embed.addFields({
        name: `⚔️ Silahlar (${weapons.owned.length})`,
        value: weapons.owned.length ? weapons.owned.map(w => `ID:${w.id} — ${w.weapon_key} (+${w.enhancement})`).join('\n').slice(0, 1024) : 'Yok',
      });
      embed.addFields({
        name: `🛡️ Zırhlar (${armors.owned.length})`,
        value: armors.owned.length ? armors.owned.map(a => `ID:${a.id} — ${a.slot}/${a.armor_key} (+${a.enhancement})`).join('\n').slice(0, 1024) : 'Yok',
      });
      embed.addFields({
        name: `🧱 Malzemeler (${materials.materials.length})`,
        value: materials.materials.length ? materials.materials.map(m => `${m.emoji || ''} ${m.name || m.key}: ${m.quantity}`).join('\n').slice(0, 1024) : 'Yok',
      });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
