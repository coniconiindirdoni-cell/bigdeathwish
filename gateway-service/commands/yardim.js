// commands/economy/evlen.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { economy } = require('../../lib/service-clients');
const { friendlyError, safeExecute } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evlen')
    .setDescription('Bir kullanıcıya evlilik teklif eder (önce /market üzerinden yüzük almalısın)')
    .addUserOption(o => o.setName('kullanici').setDescription('Teklif edilecek kişi').setRequired(true)),

  execute: safeExecute('economy/evlen', async (interaction) => {
    const target = interaction.options.getUser('kullanici');
    if (target.id === interaction.user.id) return interaction.reply({ content: '🚫 Kendinle evlenemezsin.', ephemeral: true });
    if (target.bot) return interaction.reply({ content: '🚫 Bir botla evlenemezsin.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0xE91E63)
      .setTitle('💍 Evlilik Teklifi')
      .setDescription(`${interaction.user} sana evlilik teklif ediyor, ${target}!\n60 saniye içinde yanıtla.`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`marry_accept:${interaction.guildId}:${interaction.user.id}:${target.id}`).setLabel('💍 Kabul Et').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`marry_reject:${interaction.guildId}:${interaction.user.id}:${target.id}`).setLabel('💔 Reddet').setStyle(ButtonStyle.Danger),
    );

    const msg = await interaction.reply({ content: `${target}`, embeds: [embed], components: [row], fetchReply: true });

    setTimeout(async () => {
      try {
        const current = await msg.fetch();
        if (current.components.length > 0) {
          await current.edit({ components: [], embeds: [embed.setDescription(embed.data.description + '\n\n⏰ *Süre doldu.*')] });
        }
      } catch (e) { /* mesaj silinmiş olabilir */ }
    }, 60_000);
  }),

  async handleAccept(interaction, guildId, proposerId, targetId) {
    if (interaction.user.id !== targetId) return interaction.reply({ content: '🚫 Bu teklif sana ait değil.', ephemeral: true });
    await interaction.deferUpdate();
    try {
      await economy.post('/marriage/marry', { guildId, userId: proposerId, targetId });
      const embed = new EmbedBuilder().setColor(0xE91E63).setTitle('💍 Evlendiniz! 🎉')
        .setDescription(`<@${proposerId}> ve <@${targetId}> artık evli!`);
      await interaction.editReply({ embeds: [embed], components: [] });
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err), embeds: [], components: [] });
    }
  },
  async handleReject(interaction, proposerId, targetId) {
    if (interaction.user.id !== targetId) return interaction.reply({ content: '🚫 Bu teklif sana ait değil.', ephemeral: true });
    await interaction.update({ content: `💔 <@${targetId}> teklifi reddetti.`, embeds: [], components: [] });
  },
};
