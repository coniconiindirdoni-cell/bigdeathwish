// events/voiceStateUpdate.js
const { voice } = require('../lib/service-clients');
const { logError } = require('../lib/logger-client');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    const guildId = (newState.guild || oldState.guild).id;
    const userId = member.id;

    const wasInVoice = !!oldState.channelId;
    const isInVoice = !!newState.channelId;

    try {
      if (!wasInVoice && isInVoice) {
        await voice.post('/voice/join', { guildId, userId });
      } else if (wasInVoice && !isInVoice) {
        await voice.post('/voice/leave', { guildId, userId });
      } else if (wasInVoice && isInVoice && oldState.channelId !== newState.channelId) {
        await voice.post('/voice/leave', { guildId, userId }).catch(() => {});
        await voice.post('/voice/join', { guildId, userId });
      }
    } catch (err) {
      logError(err, { fileName: 'events/voiceStateUpdate.js', userId, serverId: guildId });
    }
  },
};
