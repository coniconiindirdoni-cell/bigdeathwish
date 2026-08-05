"use strict";
const express=require('express');
const {Pool}=require('pg');
const crypto=require('crypto');
const PORT=process.env.PORT||3000;
const DATABASE_URL=process.env.DATABASE_URL||'';
const INTERNAL_API_KEY=process.env.INTERNAL_API_KEY||'';
if(!DATABASE_URL||!INTERNAL_API_KEY){console.error('DATABASE_URL ve INTERNAL_API_KEY zorunlu');process.exit(1);}
const pool=new Pool({connectionString:DATABASE_URL,ssl:DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false},max:Number(process.env.PG_POOL_MAX||10)});
let generation=Date.now().toString(); let restoring=false; let lastBackup=null; let lastRestore=null;
const app=express(); app.use(express.json({limit:'20mb'}));
function auth(req,res,next){if(req.headers['x-internal-api-key']!==INTERNAL_API_KEY)return res.status(401).json({ok:false,error:'Yetkisiz'});next();}
async function schemaEmpty(){const {rows}=await pool.query("SELECT COUNT(*)::int count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");return rows[0].count===0;}
async function snapshot(){
 const {rows:tables}=await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
 const data={format:1,createdAt:new Date().toISOString(),generation,tables:{}};
 for(const {table_name} of tables){const safe='"'+table_name.replace(/"/g,'""')+'"';data.tables[table_name]=(await pool.query(`SELECT * FROM ${safe}`)).rows;}
 return data;
}
async function githubPut(obj){
 const token=process.env.GITHUB_TOKEN, owner=process.env.GITHUB_OWNER, repo=process.env.GITHUB_REPO, branch=process.env.GITHUB_BRANCH||'main', path=process.env.GITHUB_BACKUP_PATH||'backups/latest.json';
 if(!token||!owner||!repo) throw new Error('GitHub backup env eksik');
 const url=`https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
 let sha; const current=await fetch(url+`?ref=${branch}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'}}); if(current.ok) sha=(await current.json()).sha;
 const body={message:`backup ${obj.createdAt}`,content:Buffer.from(JSON.stringify(obj)).toString('base64'),branch,...(sha?{sha}:{})};
 const res=await fetch(url,{method:'PUT',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!res.ok) throw new Error(`GitHub upload ${res.status}: ${await res.text()}`); return await res.json();
}
async function githubGet(){
 const {GITHUB_TOKEN:token,GITHUB_OWNER:owner,GITHUB_REPO:repo}=process.env, branch=process.env.GITHUB_BRANCH||'main', path=process.env.GITHUB_BACKUP_PATH||'backups/latest.json';
 if(!token||!owner||!repo) return null;
 const res=await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'}}); if(res.status===404)return null; if(!res.ok)throw new Error(`GitHub download ${res.status}`);
 const x=await res.json(); return JSON.parse(Buffer.from(x.content.replace(/\n/g,''),'base64').toString('utf8'));
}
async function backup(){const data=await snapshot();await githubPut(data);lastBackup={at:new Date().toISOString(),tables:Object.keys(data.tables).length};return lastBackup;}
async function restoreIfEmpty(force=false){
 if(restoring) return {skipped:'already_restoring'}; if(!force && !(await schemaEmpty())) return {skipped:'database_not_empty'};
 const data=await githubGet(); if(!data) return {skipped:'backup_not_found'}; restoring=true;
 try{for(const [table,rows] of Object.entries(data.tables||{})){if(!rows.length)continue; const cols=Object.keys(rows[0]); const tq='"'+table.replace(/"/g,'""')+'"'; for(const row of rows){const cq=cols.map(c=>'"'+c.replace(/"/g,'""')+'"').join(',');const vals=cols.map((_,i)=>`$${i+1}`).join(',');await pool.query(`INSERT INTO ${tq} (${cq}) VALUES (${vals}) ON CONFLICT DO NOTHING`,cols.map(c=>row[c]));}}
 generation=crypto.randomUUID();lastRestore={at:new Date().toISOString(),source:data.createdAt};return {ok:true,...lastRestore};
 }finally{restoring=false;}
}
app.get('/',(_q,r)=>r.send('Deathwish Database Service aktif'));
app.get('/health',async(_q,r)=>{try{await pool.query('SELECT 1');r.json({ok:true});}catch(e){r.status(503).json({ok:false,error:e.message});}});
app.use('/api/v1',auth);
app.get('/api/v1/status',async(_q,r)=>{try{await pool.query('SELECT 1');r.json({ok:true,ready:!restoring,generation,restoring,lastBackup,lastRestore});}catch(e){r.status(503).json({ok:false,ready:false,error:e.message,generation});}});
app.post('/api/v1/query',async(req,res)=>{try{const{text,params=[]}=req.body||{};if(typeof text!=='string'||!text.trim())return res.status(400).json({ok:false,error:'text zorunlu'});const out=await pool.query(text,params);res.json({ok:true,rows:out.rows,rowCount:out.rowCount});}catch(e){res.status(500).json({ok:false,error:e.message});}});
app.post('/api/v1/logs',async(req,res)=>{tryconsole.log("📥 LOG GELDİ");console.log(req.headers);console.log(req.body);{const service=req.headers['x-service-name']||'unknown';const{level='INFO',message,fileName=null,userId=null,serverId=null,metadata=null}=req.body||{};await pool.query(`CREATE TABLE IF NOT EXISTS logs(id BIGSERIAL PRIMARY KEY,service_name TEXT NOT NULL,level TEXT NOT NULL,message TEXT NOT NULL,file_name TEXT,user_id TEXT,server_id TEXT,metadata JSONB,created_at TIMESTAMPTZ DEFAULT NOW())`);await pool.query('INSERT INTO logs(service_name,level,message,file_name,user_id,server_id,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)',[service,level,message,fileName,userId,serverId,metadata]);res.json({ok:true});}catch(e){res.status(500).json({ok:false,error:e.message});}});             
app.post('/api/v1/backup',async(_q,r)=>{try{r.json({ok:true,...await backup()});}catch(e){r.status(500).json({ok:false,error:e.message});}});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
app.post('/api/v1/restore',async(req,r)=>{try{r.json(await restoreIfEmpty(req.body?.force===true));}catch(e){r.status(500).json({ok:false,error:e.message});}});
(async()=>{await pool.query('SELECT 1');await restoreIfEmpty(false);app.listen(PORT,()=>console.log(`database-service ${PORT}`));const t=setInterval(()=>backup().catch(e=>console.error('Saatlik backup:',e.message)),60*60*1000);t.unref?.();})();
