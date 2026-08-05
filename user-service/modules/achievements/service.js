module.exports=new Proxy({}, {get(){return async()=>{throw new Error('Bu servis modülü gönderilen kaynak ZIP içinde eksikti.');};}});
