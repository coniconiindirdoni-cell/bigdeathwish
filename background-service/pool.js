const {request}=require('../../lib/service-client'); exports.backupToGithub=()=>request('/api/v1/backup',{method:'POST'});
