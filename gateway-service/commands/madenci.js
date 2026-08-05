// commands/rpg/rpg.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rpg')
    .setDescription('RPG profilini ve statlarını gösterir')
    .addUserOption(o => o.setName('hedef').setDescription('Kullanıcı (boş=kendin)').setRequired(false)),

  execute: safeExecute('rpg/rpg', async (interaction) => {
    const target = interaction.options.getUser('hedef') || interaction.user;
    await interaction.deferReply();
    try {
      const profile = await gameCore.get(`/rpg-core/profile?guildId=${interaction.guildId}&userId=${target.id}`);
      const power = await gameCore.get(`/dungeon-fight/battle-power?guildId=${interaction.guildId}&userId=${target.id}`);
      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`⚔️ ${target.username} — RPG Profili`)
        .addFields(
          { name: 'Sınıf', value: profile.class ? `${profile.class.emoji} ${profile.class.name}` : 'Seçilmedi', inline: true },
          { name: 'Seviye', value: `${profile.level} (${profile.xp} XP)`, inline: true },
          { name: 'Toplam Güç', value: `${power.power.total}`, inline: true },
          { name: 'Can', value: `${profile.stats.hp}`, inline: true },
          { name: 'Güç', value: `${profile.stats.attack}`, inline: true },
          { name: 'Savunma', value: `${profile.stats.defense}`, inline: true },
          { name: 'Kritik', value: `${profile.stats.critical}`, inline: true },
          { name: 'Hız', value: `${profile.stats.speed}`, inline: true },
          { name: 'Mana/Büyü', value: `${profile.stats.mana}/${profile.stats.magic}`, inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
