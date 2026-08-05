// commands/games/cal.js — /çal (hırsızlık). Discord slash komut adları
// Unicode karakter destekler; dosya adı ASCII (cal.js) ama komut adı 'çal'.
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { economy } = require('../../lib/service-clients');
const { safeExecute, friendlyError } = require('../../lib/safe-execute');

// Aynı anda yalnızca 1 aktif hırsızlık girişimi (process-local).
const activeSteals = new Set();
const STEAL_WINDOW_MS = 30_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('çal')
    .setDescription('Birinin coinini çalmaya çalış')
    .addUserOption(o => o.setName('hedef').setDescription('Hedef kullanıcı').setRequired(true)),

  execute: safeExecute('games/cal', async (interaction) => {
    const victim = interaction.options.getUser('hedef');
    const thief = interaction.user;
    if (victim.bot) return interaction.reply({ content: '🚫 Botlardan çalamazsın.', ephemeral: true });
    if (victim.id === thief.id) return interaction.reply({ content: '🚫 Kendinden çalamazsın.', ephemeral: true });

    const key = `${interaction.guildId}:${thief.id}`;
    if (activeSteals.has(key)) return interaction.reply({ content: '⏳ Zaten aktif bir hırsızlık işlemin var.', ephemeral: true });

    try {
      const status = await economy.get(`/theft/status?guildId=${interaction.guildId}&userId=${victim.id}`);
      if (status.shielded) return interaction.reply({ content: `🛡️ ${victim.username} şu anda Hırsızlık Kalkanı ile korunuyor.`, ephemeral: true });
    } catch (err) {
      return interaction.reply({ content: friendlyError(err), ephemeral: true });
    }

    activeSteals.add(key);
    const cancelId = `cancel_steal:${interaction.guildId}:${thief.id}:${victim.id}`;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(cancelId).setLabel('İptal Et (30s)').setStyle(ButtonStyle.Danger).setEmoji('⛔'),
    );
    const msg = await interaction.reply({
      content: `${victim}, **${thief.username}** senden coin çalmaya çalışıyor! 30 saniye içinde butona basmazsan para gider 😈`,
      components: [row], fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button, time: STEAL_WINDOW_MS,
      filter: i => i.customId === cancelId && i.user.id === victim.id,
    });
    let prevented = false;
    collector.on('collect', async (i) => {
      prevented = true;
      activeSteals.delete(key);
      await i.update({ content: `🛡️ ${victim.username} çalmayı **iptal etti**!`, components: [] });
    });
    collector.on('end', async () => {
      if (prevented) return;
      activeSteals.delete(key);
      try {
        const result = await economy.post('/theft/attempt', { guildId: interaction.guildId, thiefId: thief.id, victimId: victim.id });
        const levelMsg = result.leveled ? ` 📈 Hırsızlık seviyen **${result.newLevel}** oldu!` : '';
        await msg.edit({ content: `💰 **${thief.username}**, **${victim.username}**'den **${result.stolen} coin** çaldı!${levelMsg}`, components: [] });
      } catch (err) {
        await msg.edit({ content: `⚠️ Hırsızlık başarısız: ${friendlyError(err)}`, components: [] });
      }
    });
  }),
};
