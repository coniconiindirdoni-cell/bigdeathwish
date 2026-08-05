// events/messageCreate.js
const { user, moderation } = require('../lib/service-clients');
const { logError } = require('../lib/logger-client');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    const guildId = message.guild.id;
    const userId = message.author.id;

    try {
      const [spamResult, filterResult] = await Promise.all([
        moderation.post('/spam/check', { guildId, userId, content: message.content }),
        moderation.post('/filter/check', { guildId, userId, content: message.content }),
      ]);

      if (spamResult.isSpam || filterResult.flagged) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send({
          content: `⚠️ ${message.author}, mesajın ${spamResult.isSpam ? 'spam' : 'yasaklı içerik'} nedeniyle silindi.`,
        }).catch(() => null);
        setTimeout(() => { if (warnMsg) warnMsg.delete().catch(() => {}); }, 5000);
        return;
      }
    } catch (err) {
      logError(err, { fileName: 'events/messageCreate.js', userId, serverId: guildId });
    }

    try {
      const result = await user.post('/level/message-xp', { guildId, userId });
      if (result.leveled) {
        message.channel.send({
          content: `🎉 ${message.author} **Seviye ${result.newLevel}**'e ulaştı!${result.coinReward ? ` (+${result.coinReward} coin)` : ''}`,
        }).catch(() => {});
      }
    } catch (err) {
      logError(err, { fileName: 'events/messageCreate.js', userId, serverId: guildId });
    }

    user.post('/messages/count', { guildId, channelId: message.channel.id, userId }).catch(() => {});
  },
};
