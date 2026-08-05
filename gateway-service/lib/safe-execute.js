// lib/safe-execute.js
const { logError } = require('./logger-client');

function safeExecute(commandName, executeFn) {
  return async function wrapped(interaction) {
    try {
      await executeFn(interaction);
    } catch (err) {
      await logError(err, {
        fileName: `commands/${commandName}.js`,
        userId: interaction.user && interaction.user.id,
        serverId: interaction.guildId,
      });
      const payload = { content: '⛔ Bir hata oluştu, tekrar deneyin.', ephemeral: true };
      try {
        if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
        else await interaction.reply(payload);
      } catch (e) { /* interaction zaten süresi dolmuş olabilir */ }
    }
  };
}

function friendlyError(err) {
  const code = (err && err.data && err.data.error) || (err && err.message);
  const map = {
    insufficient_funds: '💸 Yetersiz bakiye.',
    insufficient_balance: '💸 Yetersiz bakiye.',
    insufficient_bank_balance: '🏦 Banka bakiyesi yetersiz.',
    insufficient_materials: '🧱 Yeterli malzemen yok.',
    insufficient_energy: '⚡ Yeterli enerjin yok.',
    insufficient_shards: '🔮 Yeterli pet parçan yok.',
    already_owned: '✅ Bu zaten sende var.',
    not_owned: '❌ Bu sende yok.',
    max_level: '🔝 Zaten maksimum seviyede.',
    cooldown: '⏳ Şu an bekleme süresindesin.',
    class_locked: '🔒 Bu sınıfın kullanamıyor.',
    already_married: '💍 Zaten evlisin.',
    already_has_ring: '💍 Zaten bir yüzüğün var.',
    no_ring: '💍 Önce bir yüzük satın almalısın.',
    not_married: '💔 Evli değilsin.',
    cannot_marry_self: '🚫 Kendinle evlenemezsin.',
    cannot_fight_self: '🚫 Kendinle dövüşemezsin.',
    unknown_pet: '❓ Böyle bir pet yok.',
    unknown_relic: '❓ Böyle bir relik yok.',
    empty_inventory: '📦 Envanterin boş.',
    level: '📈 Bunun için yeterli seviyeye sahip değilsin.',
  };
  return map[code] || `⛔ İşlem başarısız oldu (${code || 'bilinmeyen hata'}).`;
}

module.exports = { safeExecute, friendlyError };
