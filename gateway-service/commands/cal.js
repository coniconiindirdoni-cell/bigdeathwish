// commands/economy/bakiye.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bakiye')
    .setDescription('Coin bakiyeni gösterir')
    .addUserOption(o => o.setName('kullanici').setDescription('Başka bir kullanıcının bakiyesini gör').setRequired(false)),

  execute: safeExecute('economy/bakiye', async (interaction) => {
    const target = interaction.options.getUser('kullanici') || interaction.user;
    await interaction.deferReply();
    try {
      const { balance, bank } = await economy.get(`/balance?guildId=${interaction.guildId}&userId=${target.id}`);
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`💰 ${target.username} — Bakiye`)
        .addFields(
          { name: 'Cüzdan', value: `${balance.toLocaleString('tr-TR')} coin`, inline: true },
          { name: 'Banka', value: `${bank.toLocaleString('tr-TR')} coin`, inline: true },
          { name: 'Toplam', value: `${(balance + bank).toLocaleString('tr-TR')} coin`, inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
