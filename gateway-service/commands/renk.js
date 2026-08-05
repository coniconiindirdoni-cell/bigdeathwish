// commands/economy/transfer.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('Başka bir kullanıcıya coin gönder')
    .addUserOption(o => o.setName('kullanici').setDescription('Alıcı').setRequired(true))
    .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1)),

  execute: safeExecute('economy/transfer', async (interaction) => {
    const target = interaction.options.getUser('kullanici');
    const amount = interaction.options.getInteger('miktar');
    if (target.id === interaction.user.id) return interaction.reply({ content: '🚫 Kendine transfer yapamazsın.', ephemeral: true });
    if (target.bot) return interaction.reply({ content: '🚫 Bir bota transfer yapamazsın.', ephemeral: true });

    await interaction.deferReply();
    try {
      const result = await economy.post('/transfer', {
        guildId: interaction.guildId, fromUserId: interaction.user.id, toUserId: target.id, amount,
      });
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('💸 Transfer Tamamlandı')
        .setDescription(`${interaction.user} → ${target}\n**${amount.toLocaleString('tr-TR')} coin**`)
        .addFields({ name: 'Yeni Bakiyen', value: `${result.fromBalance.toLocaleString('tr-TR')} coin` });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
