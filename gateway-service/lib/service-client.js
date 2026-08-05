"use strict";
const BASE_URL = (process.env.DATABASE_SERVICE_URL || '').replace(/\/$/, '');
const API_KEY = process.env.INTERNAL_API_KEY || '';
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';
const TIMEOUT_MS = Number(process.env.INTERNAL_HTTP_TIMEOUT_MS || 6000);
const RETRIES = Number(process.env.INTERNAL_HTTP_RETRIES || 2);
let lastDatabaseGeneration = null;
let ready = false;

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function request(path, options = {}) {
  if (!BASE_URL) throw new Error('DATABASE_SERVICE_URL tanımlı değil');
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-internal-api-key': API_KEY,
          'x-service-name': SERVICE_NAME,
          ...(options.headers || {}),
        },
      });
      const text = await res.text();
      let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      ready = true;
      return data;
    } catch (err) {
      lastError = err;
      ready = false;
      if (attempt < RETRIES) await sleep(300 * (2 ** attempt));
    } finally { clearTimeout(timer); }
  }
  throw lastError;
}
async function query(text, params = []) {
  const data = await request('/api/v1/query', { method: 'POST', body: JSON.stringify({ text, params }) });
  return { rows: data.rows || [], rowCount: data.rowCount || 0 };
}
async function log(level, message, opts = {}) {
  try { return await request('/api/v1/logs', { method:'POST', body:JSON.stringify({level,message,...opts}) }); }
  catch (err) { console.error(`[${level}] [${SERVICE_NAME}] ${message}`, err.message); return null; }
}
const logInfo=(m,o)=>log('INFO',m,o), logWarning=(m,o)=>log('WARNING',m,o), logCritical=(m,o)=>log('CRITICAL',m,o);
function logError(err, opts={}) { return log('ERROR', err?.message || String(err), {...opts, metadata:{...(opts.metadata||{}), stack:err?.stack||null}}); }
async function checkDatabaseStatus() {
  const data = await request('/api/v1/status');
  const changed = lastDatabaseGeneration !== null && data.generation !== lastDatabaseGeneration;
  lastDatabaseGeneration = data.generation;
  return {...data, changed};
}
function startThirtyMinuteSync(onGenerationChanged) {
  const run = async () => { try { const s=await checkDatabaseStatus(); if (s.changed && onGenerationChanged) await onGenerationChanged(s); } catch(e){ console.error(`[${SERVICE_NAME}] DB durum kontrolü başarısız:`,e.message); } };
  run(); const timer=setInterval(run, 30*60*1000); timer.unref?.(); return timer;
}
async function waitUntilReady(maxWaitMs=60000) {
  const start=Date.now(); while(Date.now()-start<maxWaitMs){ try{await checkDatabaseStatus(); return true;}catch{await sleep(1500);} } return false;
}
function isReady(){ return ready; }
module.exports={request,query,log,logInfo,logWarning,logError,logCritical,checkDatabaseStatus,startThirtyMinuteSync,waitUntilReady,isReady};
