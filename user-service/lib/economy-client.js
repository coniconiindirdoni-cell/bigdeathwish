const {request}=require('./service-client'); module.exports={addCoin:(guildId,userId,amount,reason)=>request('/api/v1/query',{method:'POST',body:JSON.stringify({text:'SELECT 1',params:[]})})};
