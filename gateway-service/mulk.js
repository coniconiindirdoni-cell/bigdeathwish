// commands/economy/ekonomi.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { economy, user } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ekonomi')
    .setDescription('Ekonomi işlemleri (yatır/çek/gönder/sıralama, admin: ver/al)')
    .addSubcommand(s => s.setName('yatir').setDescription('Bankaya coin yatır')
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('cek').setDescription('Bankadan coin çek')
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('gonder').setDescription('Başka birine coin gönder')
      .addUserOption(o => o.setName('hedef').setDescription('Hedef kullanıcı').setRequired(true))
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('siralama').setDescription('Coin sıralamasını gör'))
    .addSubcommand(s => s.setName('ver').setDescription('[Admin] Kullanıcıya coin ver')
      .addUserOption(o => o.setName('hedef').setDescription('Hedef').setRequired(true))
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('al').setDescription('[Admin] Kullanıcıdan coin al')
      .addUserOption(o => o.setName('hedef').setDescription('Hedef').setRequired(true))
      .addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1))),

  execute: safeExecute('economy/ekonomi', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();
    try {
      if (sub === 'yatir' || sub === 'cek') {
        const amount = interaction.options.getInteger('miktar');
        const result = await economy.post(sub === 'yatir' ? '/bank/deposit' : '/bank/withdraw', {
          guildId: interaction.guildId, userId: interaction.user.id, amount,
        });
        const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle(sub === 'yatir' ? '🏦 Yatırıldı' : '🏦 Çekildi')
          .addFields({ name: 'Cüzdan', value: `${result.balance.toLocaleString('tr-TR')}`, inline: true }, { name: 'Banka', value: `${result.bank.toLocaleString('tr-TR')}`, inline: true });
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'gonder') {
        const target = interaction.options.getUser('hedef');
        const amount = interaction.options.getInteger('miktar');
        if (target.id === interaction.user.id) return interaction.editReply({ content: '🚫 Kendine gönderemezsin.' });
        const result = await economy.post('/transfer', { guildId: interaction.guildId, fromUserId: interaction.user.id, toUserId: target.id, amount });
        return interaction.editReply({ content: `💸 ${amount.toLocaleString('tr-TR')} coin ${target} kullanıcısına gönderildi. Yeni bakiyen: ${result.fromBalance.toLocaleString('tr-TR')}` });
      }
      if (sub === 'siralama') {
        const { leaderboard } = await economy.get(`/leaderboard?guildId=${interaction.guildId}&limit=10`);
        const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle('🏆 Coin Sıralaması')
          .setDescription(leaderboard.length ? leaderboard.map((r, i) => `**${i + 1}.** <@${r.userId}> — ${r.total.toLocaleString('tr-TR')}`).join('\n') : 'Kimse yok.');
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'ver' || sub === 'al') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply({ content: '🚫 Bu alt komut yalnızca yöneticiler içindir.' });
        }
        const target = interaction.options.getUser('hedef');
        const amount = interaction.options.getInteger('miktar');
        const result = await economy.post('/add-coin', {
          guildId: interaction.guildId, userId: target.id, amount: sub === 'ver' ? amount : -amount, reason: 'admin_adjust', sourceService: 'gateway-service',
        });
        return interaction.editReply({ content: `✅ ${target} kullanıcısının bakiyesi ${sub === 'ver' ? '+' : '-'}${amount} olarak güncellendi. Yeni bakiye: ${result.balance.toLocaleString('tr-TR')}` });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
