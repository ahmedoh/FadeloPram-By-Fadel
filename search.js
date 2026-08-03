const fs=require('fs');
const lines=fs.readFileSync('config.js','utf8').split('\n');
lines.forEach((l,i)=>{
    if(
        l.includes('action === "login"') || 
        l.includes('action === "register"') || 
        l.includes('const verifySupabaseAdmin') || 
        l.includes('action === "adminLogin"') || 
        l.includes('action === "changePassword"') || 
        l.includes('action === "adminChangePassword"')
    ) {
        console.log(i+1, l);
    }
});
