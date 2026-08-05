// lib/service-clients.js
//
// gateway-service Discord'a bağlanan TEK servis. Diğer servislerle HTTP
// üzerinden konuşur. Bu dosya her biri için ince bir istemci üretir -
// path + body, x-internal-api-key header'ı otomatik eklenir.

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

function makeClient(baseUrlEnvVar) {
  const baseUrl = process.env[baseUrlEnvVar] || '';

  async function call(method, path, body) {
    if (!baseUrl) throw new Error(`${baseUrlEnvVar} tanımlı değil.`);
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': INTERNAL_API_KEY },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `${baseUrlEnvVar} hata: ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    get: (path) => call('GET', path),
    post: (path, body) => call('POST', path, body),
  };
}

module.exports = {
  gameCore: makeClient('GAME_CORE_SERVICE_URL'),
  economy: makeClient('ECONOMY_SERVICE_URL'),
  user: makeClient('USER_SERVICE_URL'),
  voice: makeClient('VOICE_SERVICE_URL'),
  moderation: makeClient('MODERATION_SERVICE_URL'),
  background: makeClient('BACKGROUND_SERVICE_URL'),
};
