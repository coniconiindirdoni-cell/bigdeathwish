module.exports=new Proxy({}, {get(){return async()=>{throw new Error('Eksik balance service kaynak kodu');};}});
