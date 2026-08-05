"use strict";
function requireInternalAuth(req,res,next){
 const expected=process.env.INTERNAL_API_KEY||'';
 const got=req.headers['x-internal-api-key'];
 if(!expected || !got || got!==expected) return res.status(401).json({ok:false,error:'Yetkisiz istek.'});
 next();
}
module.exports={requireInternalAuth};
