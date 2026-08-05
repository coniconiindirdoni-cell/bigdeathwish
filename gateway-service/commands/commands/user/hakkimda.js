// commands/user/hakkimda.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { user, gameCore, economy } = require('../../lib/service-clients');
const { safeExecute } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hakkimda')
    .setDescription('Profilini gösterir (seviye, coin, RPG bilgileri)')
    .addUserOption(o => o.setName('kullanici').setDescription('Başka bir kullanıcı').setRequired(false)),

  execute: safeExecute('user/hakkimda', async (interaction) => {
    const target = interaction.options.getUser('kullanici') || interaction.user;
    await interaction.deferReply();

    const [profileResult, rpgResult, balanceResult] = await Promise.allSettled([
      user.get(`/profile?guildId=${interaction.guildId}&userId=${target.id}`),
      gameCore.get(`/rpg-core/profile?guildId=${interaction.guildId}&userId=${target.id}`),
      economy.get(`/balance?guildId=${interaction.guildId}&userId=${target.id}`),
    ]);

    const embed = new EmbedBuilder().setColor(0x3498DB).setTitle(`👤 ${target.username}`).setThumbnail(target.displayAvatarURL());

    if (profileResult.status === 'fulfilled') {
      const { level } = profileResult.value;
      embed.addFields({ name: '💬 Sohbet Seviyesi', value: `Lv.${level.level} (${level.xp}/${level.xpNeeded} XP)`, inline: true });
    }
    if (rpgResult.status === 'fulfilled') {
      const rpg = rpgResult.value;
      embed.addFields({
        name: '⚔️ RPG',
        value: `${rpg.class ? `${rpg.class.emoji} ${rpg.class.name}` : 'Sınıf seçilmedi'} — Lv.${rpg.level}`,
        inline: true,
      });
    }
    if (balanceResult.status === 'fulfilled') {
      const { balance, bank } = balanceResult.value;
      embed.addFields({ name: '💰 Coin', value: `${(balance + bank).toLocaleString('tr-TR')}`, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });
  }),
};
