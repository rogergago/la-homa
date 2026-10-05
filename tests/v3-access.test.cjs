// Production account logic and native Node WebCrypto, with in-memory storage and
// a vault adapter. Does not claim to validate browser IndexedDB persistence/OAuth.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../core.js'),{webcrypto}=require('node:crypto'),HomaI18nExtra=require('../src/i18n-extra.js');
function env(){
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
 const sandbox={C,crypto:webcrypto,HomaI18nExtra,TextEncoder,TextDecoder,Uint8Array,console,setTimeout,queueMicrotask,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),Map,Promise,localStorage:storage(),sessionStorage:storage(),window:{HomaI18nExtra},document:{addEventListener(){},querySelector(){return null;}},location:{protocol:'file:',hostname:'',origin:'null'},actor:{role:'adult'},ui:{},state:C.seed(),KEY:'guest',BACKUP:'backup',storageIssue:'',corruptRaw:null,lastSavedJSON:null,render(){},refreshV3Chrome(){},toast(){},closeModal(){},save(){sandbox.state.updatedAt=new Date().toISOString();sandbox.localStorage.setItem(sandbox.KEY,JSON.stringify(sandbox.state));},activeMembers(){return sandbox.state.members;},isAdult(){return sandbox.actor.role==='adult';},vaultRecords:new Map()};sandbox.window.addEventListener=()=>{};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../access-v3.js'),'utf8'),sandbox);
 vm.runInContext(`vaultOp=async(mode,fn)=>fn({get:id=>vaultRecords.get(id),getAll:()=>[...vaultRecords.values()],put:r=>{vaultRecords.set(r.id,structuredClone(r));return r.id;}});`,Object.assign(sandbox,{structuredClone}));return sandbox;
}
const profile={birthday:'1990-05-15',phone:'+34600111222',country:'ES',province:'Madrid'};
const fd=o=>({get:k=>o[k]??null});
const signupFd=(extra={})=>({...profile,...extra});
test('local signup derives encryption key, stores no clear password and signs in',async()=>{const x=env();await x.localCredentials(fd(signupFd({email:'Adult@example.test',password:'StrongTest12',repeat:'StrongTest12',name:'Alex'})),true);await x.window.FPAccess.chain;assert.equal(x.window.FPAccess.blocked,false);assert.equal(x.window.FPAccess.user.email,'adult@example.test');const r=[...x.vaultRecords.values()][0];assert.ok(r.vault.data);assert.ok(!JSON.stringify(r).includes('StrongTest12'));assert.equal(x.state.finance.ledger.length,0);assert.equal(x.state.members[0].birthday,'1990-05-15');assert.equal(x.state.settings.country,'ES');assert.equal(x.state.settings.province,'Madrid');});
test('encryption authentication rejects wrong key without exposing family',async()=>{const x=env(),salt=x.toB64(new Uint8Array(16)),a=await x.passwordKey('abc12345678',salt),b=await x.passwordKey('different12',salt),v=await x.seal(C.seed(),a);await assert.rejects(()=>x.unseal(v,b));});
test('logout removes persistent session and plaintext working cache',async()=>{const x=env();await x.localCredentials(fd(signupFd({email:'a@a.test',password:'Password123',repeat:'Password123',name:'A'})),true);await x.window.FPAccess.chain;const key=x.KEY;await x.logOut();assert.equal(x.localStorage.getItem(key),null);assert.equal(x.localStorage.getItem('family-points-v3-session'),null);assert.equal(x.window.FPAccess.blocked,true);assert.equal(x.vaultRecords.size,1);});
test('local relogin recovers saved data from vault',async()=>{const x=env(),f=fd(signupFd({email:'a@a.test',password:'Password123',repeat:'Password123',name:'A'}));await x.localCredentials(f,true);x.state.settings.familyName='Persisted family';x.state.updatedAt=new Date(Date.now()+1000).toISOString();x.queueAccountSave(C.copy(x.state));await x.window.FPAccess.chain;await x.logOut();await x.localCredentials(f,false);assert.equal(x.state.settings.familyName,'Persisted family');});
test('wrong email/password is rejected; no account activated',async()=>{const x=env(),f=fd(signupFd({email:'a@a.test',password:'Password123',repeat:'Password123',name:'A'}));await x.localCredentials(f,true);await x.window.FPAccess.chain;await x.logOut();await assert.rejects(()=>x.localCredentials(fd({email:'a@a.test',password:'WrongPass12'}),false));assert.equal(x.window.FPAccess.blocked,true);});
test('duplicate local email is rejected case-insensitively',async()=>{const x=env(),f=fd(signupFd({email:'a@a.test',password:'Password123',repeat:'Password123',name:'A'}));await x.localCredentials(f,true);await assert.rejects(()=>x.localCredentials(fd(signupFd({email:'A@A.TEST',password:'Password123',repeat:'Password123',name:'A'})),true));});
test('account switch isolates family and finances',async()=>{const x=env();await x.localCredentials(fd(signupFd({email:'a@a.test',password:'Password123',repeat:'Password123',name:'First'})),true);await x.window.FPAccess.chain;await x.logOut();await x.localCredentials(fd(signupFd({email:'b@b.test',password:'Password123',repeat:'Password123',name:'Second'})),true);assert.equal(x.state.members.length,1);assert.equal(x.state.members[0].name,'Second');assert.equal(x.vaultRecords.size,2);});
test('mismatched or short registration password is rejected',async()=>{const x=env();await assert.rejects(()=>x.localCredentials(fd(signupFd({email:'a@a.test',password:'x',repeat:'x',name:'A'})),true));await assert.rejects(()=>x.localCredentials(fd(signupFd({email:'a@a.test',password:'Password123',repeat:'Password124',name:'A'})),true));assert.equal(x.vaultRecords.size,0);});
test('cloud client refuses a file URL and does not fake a provider login',async()=>{const x=env();x.localStorage.setItem('family-points-v3-cloud-config',JSON.stringify({url:'https://demo.supabase.co',anonKey:'public'}));await assert.rejects(()=>x.cloudClient(),/HTTPS|localhost/);assert.equal(x.window.FPAccess.cloud,null);});
test('adult profile gate requires birthday and phone after Google-style login without metadata',async()=>{
 const x=env();
 await x.localCredentials(fd(signupFd({email:'g@a.test',password:'Password123',repeat:'Password123',name:'Google User'})),true);
 await x.window.FPAccess.chain;
 x.state.members[0].birthday='';x.state.members[0].phone='';
 x.state.settings.country='';x.state.settings.province='';
 assert.equal(x.adultProfileIncomplete(),true);
 x.state.members[0].birthday='1990-05-15';x.state.members[0].phone='+34600111222';
 x.state.settings.country='ES';x.state.settings.province='Madrid';
 assert.equal(x.adultProfileIncomplete(),false);
});
test('invited adult profile gate does not require household location',()=>{
 const x=env();
 x.window.FPAccess.blocked=false;x.window.FPAccess.mode='cloud';
 x.window.FPAccess.user={id:'u1',email:'inv@a.test',name:'Inv'};
 x.window.FPAccess.membership={role:'adult',isOwner:false,linkedMemberId:x.state.members[0].id};
 x.state.members[0].role='adult';x.state.members[0].userId='u1';x.state.members[0].birthday='';x.state.members[0].phone='';
 x.state.settings.country='';x.state.settings.province='';
 assert.equal(x.adultNeedsLocation(),false);
 assert.equal(x.adultProfileIncomplete(),true);
 x.state.members[0].birthday='1991-01-01';x.state.members[0].phone='600111222';
 assert.equal(x.adultProfileIncomplete(),false);
});
