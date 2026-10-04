'use strict';const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const web=path.resolve(__dirname,'../web'),list=fs.readdirSync(web);for(const n of list)assert.ok(!/\.env|schema|backup|test|operations|migration/.test(n),'Private file in web: '+n);
const html=fs.readFileSync(path.join(web,'index.html'),'utf8');assert.ok(!html.includes('<!--ASSETS-->'));assert.ok(!html.includes('<!--SCRIPTS-->'));
for(const name of ['config.js','core.js','app.js','styles.css','entity-sync.js','asset-store.js','recipe-import.js','sw.js','manifest.webmanifest'])assert.ok(fs.existsSync(path.join(web,name)),name);
const config=fs.readFileSync(path.join(web,'config.js'),'utf8');
assert.ok(!/sb_secret_|BEGIN (RSA |EC )?PRIVATE KEY|service_role\s*[:=]\s*["'][^"']+/i.test(config),'A server secret must never be included in public config');
for(const token of config.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){try{const payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());assert.notEqual(payload.role,'service_role','Service-role token leaked into public config');}catch(e){if(e.code==='ERR_ASSERTION')throw e;}}
// This is a narrow packaging check, not a complete secret scanner.
console.log('Web package checked. No secrets or private source folders in deploy output.');
