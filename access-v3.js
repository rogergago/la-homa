if(typeof t!=='function'){var t=(k,v)=>{const i18n=typeof window!=='undefined'?window.HomaI18n:null;if(i18n&&typeof i18n.t==='function'){const out=i18n.t(k,v);if(out!=null&&out!==k)return out;}const dict=(typeof window!=='undefined'&&window.HomaI18nExtra&&window.HomaI18nExtra.es)||{};let s=dict[k]!=null?dict[k]:k;if(v&&typeof s==='string')for(const[a,b]of Object.entries(v))s=s.split('{'+a+'}').join(String(b));return s;};}
/* Account access. Local encrypted vaults and an optional real Supabase backend.
 * The persistent local session key is a convenience, not a bank-grade lock.
 * No data leaves this browser unless cloud configuration and login are provided.
 */
function parseTypedDate(raw){
 const s=String(raw||'').trim();
 if(!s)return '';
 if(C.validDate(s))return s;
 let m=s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
 if(m){const iso=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return C.validDate(iso)?iso:'';}
 m=s.match(/^(\d{2})(\d{2})(\d{4})$/);
 if(m){const iso=`${m[3]}-${m[2]}-${m[1]}`;return C.validDate(iso)?iso:'';}
 return '';
}
function formatTypedDate(iso){
 if(!iso||!C.validDate(iso))return String(iso||'').trim();
 const [y,mo,d]=iso.split('-');
 return `${d}/${mo}/${y}`;
}
const normalizePhone=v=>String(v||'').trim().replace(/[^\d+]/g,'').slice(0,40);
const validPhone=v=>{const d=String(v||'').replace(/\D/g,'');return d.length>=9&&d.length<=15;};
const readProfileFields=fd=>{
 const birthday=parseTypedDate(fd.get('birthday'));
 const phone=normalizePhone(fd.get('phone'));
 const country=String(fd.get('country')||'').trim().slice(0,80);
 const province=String(fd.get('province')||'').trim().slice(0,80);
 return {birthday,phone,country,province};
};
const requireAdultProfile=(p,{needLocation=false}={})=>{
 if(!p.birthday||!C.validDate(p.birthday)||p.birthday>C.iso())throw new Error(t('birthdayInvalid'));
 if(!validPhone(p.phone))throw new Error(t('phoneInvalid'));
 if(needLocation){if(!p.country)throw new Error(t('countryRequired'));if(!p.province)throw new Error(t('provinceRequired'));}
 const age=C.ageFromBirthday(p.birthday);
 return {...p,age};
};
function dedupeMasterMembers(s,preferId=''){
 if(!s?.members?.length)return false;
 const linked=preferId||access.membership?.linkedMemberId||'';
 const uid=access.user?.id||'';
 const email=String(access.user?.email||'').toLowerCase();
 let keep=linked?s.members.find(m=>m.id===linked&&m.active!==false):null;
 if(!keep&&uid)keep=s.members.find(m=>m.userId===uid&&m.active!==false);
 if(!keep&&email)keep=s.members.find(m=>m.email&&m.email.toLowerCase()===email&&m.active!==false);
 if(!keep)keep=s.members.find(m=>m.role==='adult'&&m.active!==false);
 if(!keep)return false;
 const keepName=String(keep.name||'').trim().toLowerCase();
 let changed=false;
 for(const m of s.members){
  if(m.id===keep.id||m.active===false||m.role==='pet')continue;
  const sameUser=uid&&m.userId===uid;
  const sameEmail=email&&m.email&&m.email.toLowerCase()===email;
  const sameOrphan=m.role==='adult'&&!m.userId&&!m.email&&keepName&&String(m.name||'').trim().toLowerCase()===keepName;
  if(!(sameUser||sameEmail||sameOrphan))continue;
  if(!keep.relation&&m.relation)keep.relation=m.relation;
  if(!keep.birthday&&m.birthday){keep.birthday=m.birthday;keep.age=m.age??keep.age;}
  if(!keep.phone&&m.phone)keep.phone=m.phone;
  if(relationAvatar(keep.relation)&&(!keep.avatar||keep.avatar==='\u{1F9D1}'))keep.avatar=relationAvatar(keep.relation);
  m.active=false;changed=true;
 }
 if(access.membership&&keep.id)access.membership.linkedMemberId=keep.id;
 return changed;
}
function linkedAdultMember(){
 if(access.blocked||access.mode==='guest'||access.membership?.role==='child')return null;
 const mid=access.membership?.linkedMemberId;
 if(mid){const m=state.members.find(x=>x.id===mid&&x.active!==false);if(m&&m.role!=='pet')return m;}
 if(access.user?.id){const byId=state.members.find(m=>m.userId===access.user.id&&m.active!==false);if(byId&&byId.role!=='pet')return byId;}
 if(access.user?.email){const email=String(access.user.email).toLowerCase();const byEmail=state.members.find(m=>m.email&&m.email.toLowerCase()===email&&m.active!==false);if(byEmail&&byEmail.role!=='pet')return byEmail;}
 return state.members.find(m=>m.role==='adult'&&m.active!==false)||null;
}
function adultNeedsLocation(){
 const m=access.membership||{};
 if(m.role==='adult'&&!m.isOwner)return false;
 return true;
}
function adultProfileIncomplete(){
 if(access.blocked||access.mode==='guest'||!isAdult()||access.membership?.role==='child')return false;
 const person=linkedAdultMember();
 try{
  requireAdultProfile({
   birthday:person?.birthday||'',
   phone:normalizePhone(person?.phone||''),
   country:state.settings.country||'',
   province:state.settings.province||''
  },{needLocation:adultNeedsLocation()});
  return false;
 }catch{return true;}
}
function syncAdultProfileAuth(profile,name=''){
 if(access.mode!=='cloud'||!access.cloud)return;
 const data={birthday:profile.birthday,phone:profile.phone};
 if(name)data.name=String(name).slice(0,80);
 if(profile.country)data.country=profile.country;
 if(profile.province)data.province=profile.province;
 if(profile.relation)data.relation=normalizeRelation(profile.relation);
 access.cloud.auth.updateUser({data}).catch(()=>{});
}
function completeAdultProfile(fd){
 const person=linkedAdultMember();
 const name=String(fd.get('name')||'').trim()||person?.name||'';
 const needLoc=adultNeedsLocation();
 const profile=requireAdultProfile(readProfileFields(fd),{needLocation:needLoc});
 let targetRelation='';
 const ok=transact(s=>{
  let target=null;
  const mid=access.membership?.linkedMemberId;
  if(mid)target=s.members.find(x=>x.id===mid&&x.active!==false);
  if(!target&&access.user?.id)target=s.members.find(m=>m.userId===access.user.id&&m.active!==false);
  if(!target&&access.user?.email){const email=String(access.user.email).toLowerCase();target=s.members.find(m=>m.email&&m.email.toLowerCase()===email&&m.active!==false);}
  if(!target)target=s.members.find(m=>m.role==='adult'&&m.active!==false);
  if(!target)throw new Error(t('adultProfileNeed'));
  if(name)target.name=name.slice(0,80);
  target.birthday=profile.birthday;target.age=profile.age;target.phone=profile.phone;
  targetRelation=target.relation||'';
  if(access.user?.id)target.userId=access.user.id;
  if(access.user?.email)target.email=target.email||access.user.email;
  if(needLoc){s.settings.country=profile.country;s.settings.province=profile.province;}
  const w=s.weeks.find(w=>w.status==='open')||s.weeks.at(-1);
  if(w){const shot=C.memberSnapshot(target),snap=w.members.find(x=>x.id===target.id);if(snap)Object.assign(snap,shot);else w.members.push(shot);}
 },t('adultProfileSaved'));
 if(!ok)return false;
 access._meta={birthday:profile.birthday,phone:profile.phone,country:profile.country||state.settings.country||'',province:profile.province||state.settings.province||'',relation:targetRelation||''};
 syncAdultProfileAuth(profile,name);
 return true;
}
window.FPAdultProfile={incomplete:()=>adultProfileIncomplete(),needsLocation:()=>adultNeedsLocation()};

const ACCESS_SESSION='family-points-v3-session',ACCESS_CONFIG='family-points-v3-cloud-config';
const access={blocked:true,mode:'guest',user:null,key:null,rawKey:null,record:null,tab:'login',target:'cloud',busy:false,message:'',error:false,pending:0,saveError:'',chain:Promise.resolve(),cloud:null,revision:0,suppress:false,cloudPending:null,pendingInvite:'',membership:null};
window.FPAccess=access;
function accessStatus(){if(access.saveError)return t('statusSavePending');if(access.pending)return t('statusSaving');return access.mode==='cloud'?t('statusCloud'):access.mode==='local'?t('statusLocal'):t('statusBrowser');}
function toB64(bytes){let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s);}
function fromB64(str){return Uint8Array.from(atob(str),c=>c.charCodeAt(0));}
function openVault(){return new Promise((resolve,reject)=>{const r=indexedDB.open('family-points-accounts-v3',1);r.onupgradeneeded=()=>r.result.createObjectStore('accounts',{keyPath:'id'}).createIndex('email','email',{unique:true});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error(t('vaultOpenFail')));});}
async function vaultOp(mode,fn){const db=await openVault();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('accounts',mode),r=fn(tx.objectStore('accounts'));let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error(t('vaultSaveFail')));tx.onabort=()=>reject(tx.error||new Error(t('vaultSaveAborted')));});}finally{db.close();}}
const vaultGet=id=>vaultOp('readonly',s=>s.get(id));
const vaultAll=()=>vaultOp('readonly',s=>s.getAll());
const vaultPut=record=>vaultOp('readwrite',s=>s.put(record));
async function passwordKey(password,salt){
 if(!crypto?.subtle)throw new Error(t('httpsAccountsNeed'));
 const input=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:fromB64(salt),iterations:600000,hash:'SHA-256'},input,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
}
async function seal(data,key){const iv=crypto.getRandomValues(new Uint8Array(12));return {iv:toB64(iv),data:toB64(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data))))};}
async function unseal(vault,key){return C.validateState(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(vault.iv)},key,fromB64(vault.data)))));}
function freshFamily(name,profile={}){
 const s=C.seed();s.demo=false;s.settings.familyName=t('familyOfName',{name});s.settings.pin=null;s.settings.teamReward=t('familyPlanDefault');
 s.settings.country=profile.country||'';s.settings.province=profile.province||'';s.settings.familyReady=false;
 const age=profile.birthday?C.ageFromBirthday(profile.birthday):null;
 const m={id:C.uid('member'),name,avatar:'\u{1F9D1}',color:'#8b6ce0',role:'adult',age,birthday:profile.birthday||'',phone:profile.phone||'',active:true};
 s.members=[m];
 for(const n of ['templates','rewards','weeks','events','shopping','mealPlan','routines','absences','swaps','preparations','pantry','vouchers','meetings','houseLog','presencePlans','presenceOverrides','taskReviewRequests','savedMenus','eventFiles','notifications','usualProducts'])s[n]=[];
 s.finance={accounts:[],ledger:[],dues:[],requests:[],goals:[],labs:[],savingsPlans:[]};C.generateWeek(s,C.monday());s.updatedAt=new Date().toISOString();C.validateState(s);return s;
}
function applyAccountState(next,key){
 access.suppress=true;state=C.validateState(C.copy(next));KEY=key;BACKUP=key+'-previous';storageIssue='';corruptRaw=null;lastSavedJSON=localStorage.getItem(KEY);C.rollover(state);
 if(dedupeMasterMembers(state)&&!access.blocked){try{const json=JSON.stringify(state);localStorage.setItem(KEY,json);lastSavedJSON=json;}catch(_){}}
 actor=state.settings.pin?{role:'member',memberId:state.members.find(m=>m.role==='member'&&m.active!==false)?.id||state.members.find(m=>m.active!==false)?.id}:{role:'adult',memberId:null};
 try{const a=JSON.parse(sessionStorage.getItem(KEY+'-profile'));if(a?.role==='member'&&state.members.some(m=>m.id===a.memberId&&m.active!==false))actor=a;}catch(_){}
 ui.view='home';ui.kitchenActive=false;ui.kitchenMember=null;ui.memberId=null;ui.moneyMember=null;ui.presenceMember=null;ui.selectedWeek=C.monday();ui.profileWeek=null;ui.historyWeek=null;
 try{save();}finally{access.suppress=false;}access.blocked=false;render();
}
window.HomaApplyCloudState=function(next){
 if(access.mode!=='cloud'||access.pending||access.suppress)return false;
 // Don't wipe local onboarding with an empty/partial cloud pull.
 if(state?.settings?.familyReady===false)return false;
 let incoming;try{incoming=C.validateState(C.copy(next));}catch(_){return false;}
 if(JSON.stringify(incoming)===JSON.stringify(state))return true;
 access.suppress=true;
 try{state=incoming;C.rollover(state);const json=JSON.stringify(state);localStorage.setItem(KEY,json);lastSavedJSON=json;}
 finally{access.suppress=false;}
 render();return true;
};
function queueAccountSave(snapshot){
 if(access.suppress||access.blocked||access.mode==='guest')return;
 access.pending++;access.saveError='';refreshV3Chrome();
 const captured={mode:access.mode,user:access.user,key:access.key};
 access.chain=access.chain.catch(()=>{}).then(async()=>{
  if(captured.mode==='local'){
   const old=await vaultGet(captured.user.id);if(!old)throw new Error(t('localAccountMissing'));
   if(old.updatedAt>snapshot.updatedAt)return;
   const vault=await seal(snapshot,captured.key);await vaultPut({...old,vault,updatedAt:snapshot.updatedAt});
  }else{access.cloudPending=snapshot;await saveCloudSnapshot(snapshot);access.cloudPending=null;}
 }).catch(e=>{access.saveError=e.message||t('saveFailedShort');toast(access.saveError,true);}).finally(()=>{access.pending--;refreshV3Chrome();});
}
access.queueSave=queueAccountSave;
function cloudConfig(){const bundled=window.FAMILY_CLOUD&&window.FAMILY_CLOUD.url&&window.FAMILY_CLOUD.anonKey?window.FAMILY_CLOUD:null;if(bundled){try{localStorage.removeItem(ACCESS_CONFIG);}catch(_){}return bundled;}try{const stored=JSON.parse(localStorage.getItem(ACCESS_CONFIG)||'null');if(stored&&stored.url&&stored.anonKey)return stored;if(stored)localStorage.removeItem(ACCESS_CONFIG);}catch(_){}return {};}
function cloudConfigured(){const c=cloudConfig();return !!(c.url&&c.anonKey&&window.HomaCloudTransport?.version===5);}
function cloudOriginReady(){return location.protocol==='https:'||(['localhost','127.0.0.1'].includes(location.hostname)&&location.protocol==='http:');}
function renderAuth(){
 const signup=access.tab==='register',cloud=access.target==='cloud',configured=cloudConfigured()&&cloudOriginReady(),cfg=cloudConfig();
 const lang=window.HomaI18n?window.HomaI18n.getLocale():'es';
 const title=signup?t('authTitleRegister'):t('authTitleLogin');
 return `<div class="auth-layout"><section class="auth-story"><div class="brand"><div class="brand-mark">${icon('house')}</div><span>La <span style="color:var(--purple)">Homa</span><small>${esc(t('brandSub'))}</small></span></div><span class="auth-eyebrow">${esc(t('authEyebrow'))}</span><h1>${esc(title)}</h1><p>${esc(t('authSub'))}</p></section><section class="auth-panel"><div class="auth-card"><label class="field"><span>${esc(t('chooseLang'))}</span><select name="locale" data-change="app-locale" aria-label="${esc(t('chooseLang'))}">${window.HomaI18n?window.HomaI18n.langOptions(lang):'<option value="es">Español</option>'}</select></label><h2>${esc(title)}</h2><p class="auth-sub">${esc(t('authSub'))}</p>${access.message?`<div class="note ${access.error?'warning':'success'} mb" role="status">${esc(access.message)}</div>`:''}${cloud&&!configured?`<div class="note warning mb">${esc(t('cloudNotReady'))}${location.protocol==='file:'?esc(t('openAppUrl')):esc(t('reloadPage'))}</div>`:''}<form id="access-form"><input type="hidden" name="target" value="${access.target}">${signup?`${field(t('name'),'name','','text','required maxlength="60" autocomplete="given-name"')}${adultContactFieldsHtml({withLocation:true})}`:''}${field(t('email'),'email','','email','required maxlength="254" autocomplete="username"')}${field(t('password'),'password','','password',`required minlength="${signup?10:1}" maxlength="200" autocomplete="${signup?'new-password':'current-password'}"`)}${signup?`${field(t('repeat'),'repeat','','password','required minlength="10" maxlength="200" autocomplete="new-password"')}${cloud?field(t('invite'),'invite','','text','maxlength="32" autocomplete="off"'):''}`:''}<button type="submit" class="btn primary wide" ${access.busy||(cloud&&!configured)?'disabled':''}>${access.busy?esc(t('checking')):signup?esc(t('register')):esc(t('login'))}</button></form><div class="auth-switch">${signup?esc(t('haveAccount')):esc(t('noAccount'))} <button type="button" class="text-btn" data-action="access-tab" data-tab="${signup?'login':'register'}">${signup?esc(t('login')):esc(t('register'))}</button></div><div class="auth-divider"><span>${esc(t('orContinue'))}</span></div><div class="social-buttons"><button type="button" class="btn secondary" data-action="access-oauth" data-provider="google" ${!configured?'disabled':''}><b>G</b> ${esc(t('googleBtn'))}</button></div></div></section></div>`;
}
function accountCard(){return `<div class="settings-group account-card"><div class="flex between wrap"><div><span class="eyebrow">${esc(t('accountEyebrow'))}</span><h3>${esc(access.user?.email||t('noAccountLabel'))}</h3><p>${esc(access.mode==='cloud'?t('accountCloud'):access.mode==='local'?t('accountLocal'):t('accountBrowser'))}</p></div><span class="pill ${access.saveError?'coral':'green'}">${esc(accessStatus())}</span></div>${access.saveError?`<div class="note warning mt">${esc(access.saveError)}. ${esc(t('keepCopyNote'))}</div>`:''}<div class="flex wrap mt">${access.user?btn(esc(t('signOut')),'access-logout','','secondary','logout'):btn(esc(t('createOrAccess')),'access-open','','primary','users')}${access.mode==='cloud'?btn(esc(t('reloadCloud')),'access-reload','','secondary','refresh')+btn(esc(t('retrySave')),'access-retry','','secondary','upload')+btn(esc(t('inviteFamily')),'access-invite','','secondary','users'):window.FAMILY_CLOUD?.url?'':btn(esc(t('connectCloud')),'access-config','','secondary','cloud')}${btn(esc(t('exportCopy')),'backup-export','','secondary','download')}</div><p class="tiny muted mt">${esc(access.mode==='local'?t('accountLocalNote'):t('accountCloudNote'))}</p></div>`;}
async function activateLocal(record,key,remember=true){
 access.mode='local';access.user={id:record.id,email:record.email,name:record.name};access.key=key;access.record=record;
 const raw=toB64(await crypto.subtle.exportKey('raw',key));access.rawKey=raw;
 let next=await unseal(record.vault,key);const cache=localStorage.getItem('family-points-v3-user-'+record.id);if(cache){try{const old=C.validateState(JSON.parse(cache));if(old.updatedAt>=next.updatedAt)next=old;}catch(_){}}
 if(remember)localStorage.setItem(ACCESS_SESSION,JSON.stringify({mode:'local',id:record.id,key:raw}));
 access.message='';access.saveError='';applyAccountState(next,'family-points-v3-user-'+record.id);queueAccountSave(C.copy(state));
}
async function localCredentials(fd,signup){
 const email=String(fd.get('email')).trim().toLowerCase(),password=String(fd.get('password')),users=await vaultAll();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error(t('checkEmail'));
 if(signup){
  if(password.length<10||password!==fd.get('repeat'))throw new Error(t('passwordsMatchLen'));
  if(users.some(u=>u.email===email))throw new Error(t('localAccountExists'));
  const name=String(fd.get('name')).trim();if(!name)throw new Error(t('writeYourName'));
  const profile=requireAdultProfile(readProfileFields(fd),{needLocation:true});
  const salt=toB64(crypto.getRandomValues(new Uint8Array(16))),key=await passwordKey(password,salt),next=fd.get('keep')?C.copy(state):freshFamily(name,profile);next.demo=false;
  const record={id:C.uid('account'),email,name,salt,vault:await seal(next,key),updatedAt:new Date().toISOString()};await vaultPut(record);await activateLocal(record,key);return;
 }
 const record=users.find(u=>u.email===email);if(!record)throw new Error(t('badLocalCreds'));
 let key;try{key=await passwordKey(password,record.salt);await unseal(record.vault,key);}catch(_){throw new Error(t('badLocalCreds'));}await activateLocal(record,key);
}
async function logOut(){
 access.busy=true;await access.chain;if(access.saveError){access.busy=false;throw new Error(t('pendingChangesLogout'));}
 const oldKey=KEY;if(access.mode==='cloud'){const {error}=await access.cloud.auth.signOut({scope:'local'});if(error){access.busy=false;throw error;}}
 localStorage.removeItem(ACCESS_SESSION);localStorage.removeItem(oldKey);localStorage.removeItem(oldKey+'-previous');sessionStorage.removeItem(oldKey+'-profile');
 access.blocked=true;access.mode='guest';access.user=null;access.key=null;access.rawKey=null;access.record=null;access.busy=false;access.message=t('sessionClosedMsg');access.error=false;access.tab='login';
 KEY='family-points-v3-guest';BACKUP=KEY+'-previous';state=C.seed();lastSavedJSON=localStorage.getItem(KEY);actor={role:'member',memberId:null};closeModal();render();
}
async function guestAccess(){
 access.blocked=true;access.mode='guest';access.user=null;access.message=t('lahomaAccountOnly');access.error=true;render();
}
function cloudConfigForm(){
 if(window.FAMILY_CLOUD?.url&&window.FAMILY_CLOUD?.anonKey)return;
 const cfg=cloudConfig();
 openModal(t('connectCloud'),`<p class="dialog-description">${esc(t('cloudConnectBody'))}</p>${field(t('supabaseProjectUrl'),'url',cfg.url||'','url','placeholder="https://your-project.supabase.co" required')}${field(t('publicAnonKey'),'anonKey',cfg.anonKey||'','text','required autocomplete="off"')}<div class="note warning">${esc(t('neverSecretKey'))}</div><label class="check-label mt"><input type="checkbox" name="google" ${cfg.googleEnabled?'checked':''}>${esc(t('googleConfiguredCheck'))}</label><p class="small muted mt">${esc(t('cloudConnectNote'))}</p>${footer(esc(t('saveConnection')))}`,fd=>{
  const url=String(fd.get('url')).trim().replace(/\/$/,''),key=String(fd.get('anonKey')).trim();let parsed;try{parsed=new URL(url);}catch(_){throw new Error(t('invalidUrl'));}
  if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.username||parsed.password||parsed.pathname!=='/')throw new Error(t('useSupabaseUrl'));
  if(key.startsWith('sb_secret_'))throw new Error(t('privateKeyBrowser'));
  if(!key.startsWith('sb_publishable_')){try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon')throw Error();}catch(_){throw new Error(t('usePublishableKey'));}}
  if(access.mode==='cloud')throw new Error(t('closeSessionFirst'));
  localStorage.setItem(ACCESS_CONFIG,JSON.stringify({url,anonKey:key,googleEnabled:!!fd.get('google')}));access.cloud=null;access.target='cloud';access.message=t('connectionSaved');access.error=false;render();return true;
 });
}
async function cloudClient(){
 if(access.cloud)return access.cloud;
 if(!cloudOriginReady())throw new Error(t('openHttpsLocalhost'));
 if(!cloudConfigured())throw new Error(t('v5PendingConnect'));
 if(!window.supabase)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./supabase.js';script.onload=resolve;script.onerror=()=>reject(new Error(t('accessServiceLoadFail')));document.head.appendChild(script);});
 const cfg=cloudConfig();access.cloud=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
 access.cloud.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'&&access.mode==='cloud'){setTimeout(()=>{if(!access.pending&&!access.saveError){localStorage.removeItem(KEY);localStorage.removeItem(KEY+'-previous');sessionStorage.removeItem(KEY+'-profile');localStorage.removeItem(ACCESS_SESSION);}access.blocked=true;access.message=t('sessionRevoked');access.user=null;closeModal();render();},0);}});
 return access.cloud;
}
function withTimeout(promise,ms,message){
 return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);
}
async function activateCloud(session,name='',profile={}){
 if(!window.HomaCloudTransport||window.HomaCloudTransport.version!==5)throw new Error(t('v5AdapterMissing'));
 if(!session?.user)throw new Error(t('noValidSession'));
 const invite=access.pendingInvite||'';access.pendingInvite='';
 // Ensure a single auth client exists before transport RPCs (avoids PKCE race).
 if(!access.cloud)await cloudClient();
 access.busy=true;access.message=t('creatingHome');access.error=false;render();
 let result;
 try{
  result=await withTimeout(window.HomaCloudTransport.activate(session,name,invite),45000,t('creatingHomeTimeout'));
 }finally{access.busy=false;}
 const user=session.user;access.mode='cloud';access.target='cloud';access.user={id:user.id,email:user.email||'',name:name||user.user_metadata?.name||t('myFamilyDefault'),householdId:result.householdId};
 access.membership=result.membership||{role:null,linkedMemberId:null,isOwner:false};
 access.revision=result.revision||0;access.saveError='';access.cloudPending=null;access.message='';
 let next=C.validateState(result.state);const cacheKey='family-points-v3-cloud-'+result.householdId,cache=localStorage.getItem(cacheKey);
 const cloudFresh=next.settings?.familyReady===false&&!(next.members||[]).some(m=>m.birthday||m.phone);
 if(cache&&!cloudFresh){try{const local=C.validateState(JSON.parse(cache));if((local.updatedAt||'')>(next.updatedAt||''))next=local;}catch(_){}}
 const link=access.membership;const inviteMeta=result.invite;
 let mid=link?.linkedMemberId||inviteMeta?.memberId||null;
 let person=mid?next.members.find(m=>m.id===mid):null;
 if(!person&&user.email){person=next.members.find(m=>m.email&&m.email.toLowerCase()===String(user.email).toLowerCase());if(person){mid=person.id;if(link)link.linkedMemberId=mid;}}
 const metaBirthday=profile.birthday||user.user_metadata?.birthday||'';
 const metaPhone=profile.phone||user.user_metadata?.phone||'';
 const metaCountry=profile.country||user.user_metadata?.country||'';
 const metaProvince=profile.province||user.user_metadata?.province||'';
 access._meta={birthday:metaBirthday,phone:metaPhone,country:metaCountry,province:metaProvince,relation:profile.relation||user.user_metadata?.relation||''};
 // Reuse the bootstrap adult placeholder instead of creating a second master card.
 if(!person&&!invite){
  const orphan=next.members.find(m=>m.active!==false&&m.role==='adult'&&!m.userId&&!(m.email&&user.email&&m.email.toLowerCase()===String(user.email).toLowerCase()));
  if(orphan&&(link?.isOwner||link?.role==='owner'||link?.role==='adult'||!link?.role)){
   person=orphan;mid=orphan.id;if(link)link.linkedMemberId=mid;
  }
 }
 if(person){
  const nm=name||user.user_metadata?.name||person.name||(user.email||t('adultFallbackName')).split('@')[0];
  person.name=String(nm).slice(0,80);
  person.userId=user.id;person.email=person.email||user.email||'';person.inviteStatus='joined';
  if(metaBirthday){person.birthday=metaBirthday;person.age=C.ageFromBirthday(metaBirthday);}
  if(metaPhone)person.phone=metaPhone;
  if(link)link.linkedMemberId=person.id;
 }else if(mid||link?.role==='adult'||inviteMeta?.role==='adult'||link?.isOwner||!invite){
  const nm=name||user.user_metadata?.name||(user.email||t('adultFallbackName')).split('@')[0];
  const created={id:mid||C.uid('member'),name:nm,avatar:'\u{1F9D1}',color:colors[next.members.length%colors.length],role:link?.role==='child'?'member':'adult',age:metaBirthday?C.ageFromBirthday(metaBirthday):null,birthday:metaBirthday,phone:metaPhone,active:true,email:user.email||'',userId:user.id,inviteStatus:'joined'};
  next.members.push(created);if(link)link.linkedMemberId=created.id;
 }
 // Collapse accidental duplicate master cards left by older clients.
 dedupeMasterMembers(next,person?.id||link?.linkedMemberId||'');
 if((link?.isOwner||link?.role==='owner'||!invite)&&metaCountry){next.settings.country=metaCountry;next.settings.province=metaProvince||next.settings.province||'';}
 if(link?.isOwner||link?.role==='owner')next.settings.allowAdultsSwitchProfiles??=false;
 localStorage.setItem(ACCESS_SESSION,JSON.stringify({mode:'cloud',id:user.id,householdId:result.householdId,membership:access.membership}));
 applyAccountState(next,cacheKey);
 if(link?.role==='child'){const mid=link.linkedMemberId||next.members.find(m=>m.userId===user.id)?.id;if(mid){actor={role:'member',memberId:mid};try{sessionStorage.setItem(KEY+'-profile',JSON.stringify(actor));}catch(_){}ui.view='member';ui.memberId=mid;}}
 else if(link?.role==='adult'||link?.isOwner){actor={role:'adult',memberId:null};try{sessionStorage.setItem(KEY+'-profile',JSON.stringify(actor));}catch(_){}}
}
async function saveCloudSnapshot(snapshot){
 if(!window.HomaCloudTransport||window.HomaCloudTransport.version!==5)throw new Error(t('multiDevicePending'));
 return window.HomaCloudTransport.save(snapshot);
 /* Legacy implementation, intentionally unreachable. */
 if(!access.cloud||!access.user)throw new Error(t('noCloudSession'));
 const marker=KEY+'-pending';localStorage.setItem(marker,JSON.stringify({revision:access.revision}));const expected=access.revision;
 const {data,error}=await access.cloud.rpc('save_family_state',{expected_revision:expected,p_data:snapshot});
 if(error)throw new Error(error.message.includes('VERSION_CONFLICT')?t('versionConflictExport'):t('localSaveCloudPending',{msg:error.message}));
 access.revision=Number(data);localStorage.removeItem(marker);
}
async function cloudCredentials(fd,signup){
 access.pendingInvite=signup?String(fd.get('invite')||'').trim():'';
 const client=await cloudClient(),email=String(fd.get('email')).trim(),password=String(fd.get('password')),redirect=location.origin+location.pathname;
 if(signup){
  if(password.length<10||password!==fd.get('repeat'))throw new Error(t('passwordsMatchLen'));
  const name=String(fd.get('name')).trim();if(!name)throw new Error(t('writeYourName'));
  const joining=!!access.pendingInvite;
  const profile=requireAdultProfile(readProfileFields(fd),{needLocation:!joining});
  const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect,data:{name,birthday:profile.birthday,phone:profile.phone,country:profile.country,province:profile.province}}});
  if(error)throw error;if(!data.session){access.message=t('confirmEmailThenLogin');access.error=false;access.tab='login';render();return;}
  await activateCloud(data.session,name,profile);
 }
 else{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw new Error(t('cloudLoginFail'));await activateCloud(data.session);}
}
async function accessAction(a,d){
 switch(a){
 case 'v3-account':if(!isAdult()){adultLogin();return true;}nav('settings');return true;
 case 'access-open':if(!needAdult())return true;access.blocked=true;access.message='';access.tab='login';render();return true;
 case 'access-target':access.target='cloud';access.message='';render();return true;
 case 'access-tab':access.tab=d.tab;access.message='';render();return true;
 case 'access-guest':await guestAccess();return true;
 case 'access-config':if(access.blocked||needAdult())cloudConfigForm();return true;
 case 'access-invite':{if(!needAdult()||access.mode!=='cloud'||!canManageInvites())return true;openModal(t('inviteFamily'),`<p class="dialog-description">${esc(t('inviteFamilyNote'))}</p><label class="field"><span>${esc(t('email'))}</span><input name="email" type="email" required maxlength="254" placeholder="${esc(t('emailPh'))}"></label><label class="field"><span>${esc(t('fieldName'))}</span><input name="name" type="text" required maxlength="80" placeholder="${esc(t('homeNamePh'))}"></label><label class="field"><span>${esc(t('whoIs'))}</span><select name="role" data-change="invite-role"><option value="adult">${esc(t('adult'))}</option><option value="member">${esc(t('roleChildLabel'))}</option></select></label><div id="invite-adult-fields">${adultContactFieldsHtml()}</div><div class="note">${esc(t('inviteCodeNote'))}</div>${footer(esc(t('createInvite')))}`,async fd=>{const email=String(fd.get('email')).trim().toLowerCase(),name=String(fd.get('name')).trim(),role=fd.get('role')==='adult'?'adult':'member';if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error(t('needNameEmail'));let birthday='',phone='',age=null;if(role==='adult'){const p=requireAdultProfile(readProfileFields(fd));birthday=p.birthday;phone=p.phone;age=p.age;}else{birthday=parseTypedDate(fd.get('birthday'));if(String(fd.get('birthday')||'').trim()&&(!birthday||birthday>C.iso()))throw new Error(t('birthdayInvalid'));age=birthday?C.ageFromBirthday(birthday):null;phone=normalizePhone(fd.get('phone'));}let memberId=null;const ok=transact(s=>{const existing=s.members.find(m=>m.email===email&&m.active!==false);if(existing){memberId=existing.id;existing.inviteStatus='pending';if(birthday){existing.birthday=birthday;existing.age=age;}if(phone)existing.phone=phone;}else{memberId=C.uid('member');s.members.push({id:memberId,name,role,avatar:role==='adult'?'\u{1F9D1}':'\u{1F9D2}',color:colors[s.members.length%colors.length],age,birthday,phone,active:true,email,inviteStatus:'pending'});const w=s.weeks.find(w=>w.status==='open')||s.weeks.at(-1);if(w){const shot=C.memberSnapshot(s.members.find(m=>m.id===memberId));const snap=w.members.find(x=>x.id===memberId);if(snap)Object.assign(snap,shot);else w.members.push(shot);}}},null);if(!ok)return false;const inv=await window.HomaCloudTransport.invite(email,memberId,role==='adult'?'adult':'child');closeModal(true);showInviteResult(inv,name);return false;});return true;}
 case 'access-logout':if(!needAdult())return true;confirmDialog(t('signOut'),t('signOutBody'),async()=>{await logOut();return true;},t('signOut'));return true;
 case 'access-oauth':{if(d.provider!=='google')throw new Error(t('accessNotExist'));if(!cloudConfigured()||!cloudOriginReady())throw new Error(t('cloudNotReady'));const c=await cloudClient();const options={redirectTo:location.origin+'/',queryParams:{prompt:'select_account'}};const {error}=await c.auth.signInWithOAuth({provider:'google',options});if(error)throw new Error(/provider is not enabled|unsupported provider/i.test(error.message)?t('googleNotConnected'):t('googleOpenFail'));return true;}
 case 'access-retry':if(needAdult()){access.saveError='';queueAccountSave(C.copy(state));await access.chain;render();}return true;
 case 'access-reload':if(needAdult())confirmDialog(t('loadCloudVersion'),t('loadCloudBody'),async()=>{await access.chain;downloadFile('la-homa-antes-de-sincronizar.json',JSON.stringify(state,null,2),'application/json');localStorage.removeItem(KEY+'-pending');const {data,error}=await access.cloud.auth.getSession();if(error)throw error;await activateCloud(data.session);return true;});return true;
 default:return false;
 }
}
document.addEventListener('submit',async e=>{
 if(e.target.id!=='access-form')return;e.preventDefault();if(access.busy)return;const form=e.target,fd=new FormData(form),signup=access.tab==='register';access.busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;access.message='';
 try{access.target='cloud';await cloudCredentials(fd,signup);}catch(err){access.message=err.message||t('couldNotAccess');access.error=true;access.blocked=true;}finally{access.busy=false;render();}
});
window.addEventListener('storage',e=>{if(e.key===ACCESS_SESSION&&!e.newValue&&access.user){access.blocked=true;access.key=null;access.rawKey=null;access.user=null;access.message=t('sessionClosedOtherTab');closeModal();render();}});
function sessionName(session){const m=session?.user?.user_metadata||{};return String(m.full_name||m.name||m.given_name||'').trim();}
function oauthReturnError(){
 const q=new URLSearchParams(location.search),h=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
 const raw=q.get('error_description')||h.get('error_description')||q.get('error')||h.get('error')||'';
 if(!raw)return '';
 try{history.replaceState({},'',location.pathname);}catch(_){}
 const text=decodeURIComponent(raw.replace(/\+/g,' '));
 if(/provider is not enabled|unsupported provider/i.test(text))return t('accessNotEnabledProject');
 return t('accessIncomplete');
}
async function bootAccess(){
 render();try{
  const oauthError=oauthReturnError();
  const session=JSON.parse(localStorage.getItem(ACCESS_SESSION)||'null');
  if(session?.membership)access.membership=session.membership;
  if(session?.mode==='local')localStorage.removeItem(ACCESS_SESSION);
  if(cloudConfigured()&&cloudOriginReady()){
   const client=await cloudClient(),{data,error}=await client.auth.getSession();if(error)throw error;if(data.session){await activateCloud(data.session,sessionName(data.session));return;}
  }
  access.message=oauthError;access.error=!!oauthError;render();
 }catch(e){access.blocked=true;access.message=e.message||t('signInAgain');access.error=true;render();}
}

