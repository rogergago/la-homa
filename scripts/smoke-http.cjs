'use strict';
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=41937;
const server=spawn(process.execPath,['scripts/serve.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
(async()=>{
 let ready=false;for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:'+port+'/');ready=true;break;}catch(_){await new Promise(r=>setTimeout(r,60));}}
 if(!ready)throw Error('Development server did not start');
 const checks=[];
 for(const [route,status,method] of [['/',200,'GET'],['/app.js',200,'GET'],['/manifest.webmanifest',200,'GET'],['/README.md',404,'GET'],['/supabase/migrations/0001_households_review.sql',404,'GET'],['/.env',404,'GET'],['/',405,'POST']]){
  const res=await fetch('http://127.0.0.1:'+port+route,{method});
  if(res.status!==status)throw Error(route+' returned '+res.status+' not '+status);
  checks.push({route,status,method});
 }
 fs.mkdirSync(root+'/test-output',{recursive:true});
 fs.writeFileSync(root+'/test-output/http-static-results.json',JSON.stringify({passed:checks.length,checks,note:'Static development server only. Not a cloud API test.'},null,2));
 console.log('7 static HTTP checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
