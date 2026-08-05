// events/interactionCreate.js
const { gameCore } = require('../lib/service-clients');
const { logError } = require('../lib/logger-client');
const madenciCmd = require('../commands/madenci');
const oduncuCmd = require('../commands/oduncu');
const evlenCmd = require('../commands/evlen');
const petCmd = require('../commands/pet');
const gelistirCmd = require('../commands/gelistir');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      return command.execute(interaction);
    }

    if (interaction.isButton()) {
      const [action, guildId, ownerId, extra] = interaction.customId.split(':');

      if (action.startsWith('mine_')) {
        if (interaction.user.id !== ownerId) return interaction.reply({ content: '🚫 Bu panel sana ait değil.', ephemeral: true });
        return handleMiningButton(interaction, action, guildId, ownerId);
      }
      if (action.startsWith('wood_')) {
        if (interaction.user.id !== ownerId) return interaction.reply({ content: '🚫 Bu panel sana ait değil.', ephemeral: true });
        return handleWoodButton(interaction, action, guildId, ownerId);
      }

      if (action === 'marry_accept') return evlenCmd.handleAccept(interaction, guildId, ownerId, extra);
      if (action === 'marry_reject') return evlenCmd.handleReject(interaction, ownerId, extra);
      if (action === 'gelistir_pet') {
        if (interaction.user.id !== ownerId) return interaction.reply({ content: '🚫 Bu panel sana ait değil.', ephemeral: true });
        return gelistirCmd.handlePetUpgrade(interaction, guildId, ownerId);
      }
      if (action === 'gelistir_antika') {
        if (interaction.user.id !== ownerId) return interaction.reply({ content: '🚫 Bu panel sana ait değil.', ephemeral: true });
        return gelistirCmd.handleAntikaUpgrade(interaction, guildId, ownerId);
      }

      return;
    }

    if (interaction.isStringSelectMenu()) {
      const [action, guildId, ownerId] = interaction.customId.split(':');
      if (interaction.user.id !== ownerId) return interaction.reply({ content: '🚫 Bu menü sana ait değil.', ephemeral: true });
      if (action === 'pet_select') return petCmd.handleSelect(interaction, guildId);
    }
  },
};

async function handleWoodButton(interaction, action, guildId, userId) {
  await interaction.deferUpdate();
  try {
    if (action === 'wood_chop') {
      const result = await gameCore.post('/woodcutting/chop', { guildId, userId });
      const status = await gameCore.get(`/woodcutting/status?guildId=${guildId}&userId=${userId}`);
      await interaction.editReply(oduncuCmd.buildPanel(status, guildId, userId));
      const woodLines = result.logs ? result.logs.map(l => `${l.emoji} ${l.name}`).join(', ') : '';
      await interaction.followUp({ content: `🪓 Kesilenler: ${woodLines}${result.leveledUp ? '\n📈 Seviye atladın!' : ''}`, ephemeral: true });
    } else if (action === 'wood_sell') {
      const result = await gameCore.post('/woodcutting/sell', { guildId, userId });
      await interaction.followUp({ content: `💰 ${result.total.toLocaleString('tr-TR')} coin karşılığında satıldı!`, ephemeral: true });
      const status = await gameCore.get(`/woodcutting/status?guildId=${guildId}&userId=${userId}`);
      await interaction.editReply(oduncuCmd.buildPanel(status, guildId, userId));
    } else if (action === 'wood_inv') {
      const { inventory } = await gameCore.get(`/woodcutting/inventory?guildId=${guildId}&userId=${userId}`);
      const lines = inventory.length ? inventory.map(i => `${i.wood}: ${i.amount}`).join('\n') : 'Envanter boş.';
      await interaction.followUp({ content: `🎒 Envanter:\n${lines}`, ephemeral: true });
    }
  } catch (err) {
    logError(err, { fileName: 'events/interactionCreate.js', userId, serverId: guildId });
    await interaction.followUp({ content: '⛔ İşlem başarısız oldu.', ephemeral: true }).catch(() => {});
  }
}

async function handleMiningButton(interaction, action, guildId, userId) {
  await interaction.deferUpdate();
  try {
    if (action === 'mine_dig') {
      const result = await gameCore.post('/mining/dig', { guildId, userId });
      const status = await gameCore.get(`/mining/status?guildId=${guildId}&userId=${userId}`);
      const panel = madenciCmd.buildPanel(status, guildId, userId);
      const oreLines = result.ores.map(o => `${o.emoji} ${o.name}`).join(', ');
      await interaction.editReply(panel);
      await interaction.followUp({ content: `⛏️ Kazılanlar: ${oreLines}${result.leveledUp ? '\n📈 Seviye atladın!' : ''}`, ephemeral: true });
    } else if (action === 'mine_sell') {
      const result = await gameCore.post('/mining/sell', { guildId, userId });
      await interaction.followUp({ content: `💰 ${result.total.toLocaleString('tr-TR')} coin karşılığında satıldı!`, ephemeral: true });
      const status = await gameCore.get(`/mining/status?guildId=${guildId}&userId=${userId}`);
      await interaction.editReply(madenciCmd.buildPanel(status, guildId, userId));
    } else if (action === 'mine_inv') {
      const { inventory } = await gameCore.get(`/mining/inventory?guildId=${guildId}&userId=${userId}`);
      const lines = inventory.length ? inventory.map(i => `${i.ore}: ${i.amount}`).join('\n') : 'Envanter boş.';
      await interaction.followUp({ content: `🎒 Envanter:\n${lines}`, ephemeral: true });
    }
  } catch (err) {
    logError(err, { fileName: 'events/interactionCreate.js', userId, serverId: guildId });
    await interaction.followUp({ content: '⛔ İşlem başarısız oldu.', ephemeral: true }).catch(() => {});
  }
}
