// commands/economy/banka.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { economy } = require('../lib/service-clients');
const { safeExecute, friendlyError } = require('../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banka')
    .setDescription('Banka işlemleri')
    .addSubcommand(sc => sc.setName('yatir').setDescription('Cüzdandan bankaya para yatır')
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1)))
    .addSubcommand(sc => sc.setName('cek').setDescription('Bankadan cüzdana para çek')
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1))),

  execute: safeExecute('economy/banka', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger('miktar');
    await interaction.deferReply();
    try {
      const path = sub === 'yatir' ? '/bank/deposit' : '/bank/withdraw';
      const result = await economy.post(path, { guildId: interaction.guildId, userId: interaction.user.id, amount });
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(sub === 'yatir' ? '🏦 Para Yatırıldı' : '🏦 Para Çekildi')
        .addFields(
          { name: 'Cüzdan', value: `${result.balance.toLocaleString('tr-TR')} coin`, inline: true },
          { name: 'Banka', value: `${result.bank.toLocaleString('tr-TR')} coin`, inline: true },
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
