// commands/game/antika.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gameCore } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antika')
    .setDescription('Antika koleksiyon komutları')
    .addSubcommand(s => s.setName('envanter').setDescription('Antika envanterini gör'))
    .addSubcommand(s => s.setName('market').setDescription('Günün antika marketini gör'))
    .addSubcommand(s => s.setName('satinal').setDescription('Bugünün marketinden antika satın al')
      .addStringOption(o => o.setName('anahtar').setDescription('Antika anahtarı').setRequired(true)))
    .addSubcommand(s => s.setName('aktif-et').setDescription('Aktif antika ayarla')
      .addStringOption(o => o.setName('anahtar').setDescription('Antika anahtarı (envanterinden)').setRequired(true)))
    .addSubcommand(s => s.setName('kaldir').setDescription('Aktif antikayı kaldır')),

  execute: safeExecute('game/antika', async (interaction) => {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId, userId = interaction.user.id;
    await interaction.deferReply();
    try {
      if (sub === 'envanter') {
        const { inventory, active } = await gameCore.get(`/pets-relics-antiques/antiques/inventory?guildId=${guildId}&userId=${userId}`);
        const embed = new EmbedBuilder().setColor(0x8E44AD).setTitle('🏺 Antika Envanterin')
          .setDescription(inventory.length ? inventory.map(a => `${a.emoji} ${a.name} x${a.count}${active && active.key === a.key ? ' ✅ *(aktif)*' : ''}`).join('\n') : 'Envanterin boş.');
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'market') {
        const { market } = await gameCore.get(`/pets-relics-antiques/antiques/market?guildId=${guildId}`);
        const embed = new EmbedBuilder().setColor(0x8E44AD).setTitle("🏺 Günün Antika Marketi")
          .setDescription(market.map(a => `${a.emoji} **${a.name}** — ${a.price.toLocaleString('tr-TR')} coin (+%${a.xpBonus} XP, +%${a.coinBonus} Coin)`).join('\n'));
        return interaction.editReply({ embeds: [embed] });
      }
      if (sub === 'satinal') {
        const antiqueKey = interaction.options.getString('anahtar');
        const result = await gameCore.post('/pets-relics-antiques/antiques/buy', { guildId, userId, antiqueKey });
        return interaction.editReply({ content: `🏺 ${result.antique.name} satın alındı! Bakiye: ${result.balance.toLocaleString('tr-TR')}` });
      }
      if (sub === 'aktif-et') {
        const antiqueKey = interaction.options.getString('anahtar');
        await gameCore.post('/pets-relics-antiques/antiques/set-active', { guildId, userId, antiqueKey });
        return interaction.editReply({ content: '✅ Aktif antika güncellendi.' });
      }
      if (sub === 'kaldir') {
        await gameCore.post('/pets-relics-antiques/antiques/set-active', { guildId, userId, antiqueKey: null });
        return interaction.editReply({ content: '✅ Aktif antika kaldırıldı.' });
      }
    } catch (err) {
      await interaction.editReply({ content: friendlyError(err) });
    }
  }),
};
