const LOG_SERVICE_URL=process.env.LOG_SERVICE_URL||'';
const INTERNAL_API_KEY=process.env.INTERNAL_API_KEY||'';
const SERVICE_NAME=process.env.SERVICE_NAME||'unknown-service';
async function sendLog(level,message,opts={}){if(!LOG_SERVICE_URL){console.log(`[${level}] [${SERVICE_NAME}] ${message}`);return;}try{await fetch(`${LOG_SERVICE_URL}/logs`,{method:'POST',headers:{'Content-Type':'application/json','x-internal-api-key':INTERNAL_API_KEY},body:JSON.stringify({service:SERVICE_NAME,level,message,fileName:opts.fileName||null,userId:opts.userId||null,serverId:opts.serverId||null,metadata:opts.metadata||null})});}catch(err){console.error(`⚠️ log-service'e ulaşılamadı: ${err?.message||err}`);console.log(`[${level}] [${SERVICE_NAME}] ${message}`);}}
const logInfo=(m,o)=>sendLog('INFO',m,o);const logWarning=(m,o)=>sendLog('WARNING',m,o);const logCritical=(m,o)=>sendLog('CRITICAL',m,o);
function logError(err,opts={}){const message=err?.message||String(err);const metadata={...(opts.metadata||{}),stack:err?.stack||null};return sendLog('ERROR',message,{...opts,metadata});}
module.exports={logInfo,logWarning,logError,logCritical};
