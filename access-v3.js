/* Account access. Local encrypted vaults and an optional real Supabase backend.
 * The persistent local session key is a convenience, not a bank-grade lock.
 * No data leaves this browser unless cloud configuration and login are provided.
 */
const ACCESS_SESSION='family-points-v3-session',ACCESS_CONFIG='family-points-v3-cloud-config';
const access={blocked:true,mode:'guest',user:null,key:null,rawKey:null,record:null,tab:'login',target:(window.FAMILY_CLOUD&&window.FAMILY_CLOUD.url?'cloud':'local'),busy:false,message:'',error:false,pending:0,saveError:'',chain:Promise.resolve(),cloud:null,revision:0,suppress:false,cloudPending:null,pendingInvite:''};
window.FPAccess=access;
function accessStatus(){if(access.saveError)return 'Guardado pendiente: revisa tu cuenta';if(access.pending)return 'Guardando cambios...';return access.mode==='cloud'?'Guardado en tu cuenta':access.mode==='local'?'Guardado en tu cuenta local':'Guardado en este navegador';}
function toB64(bytes){let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s);}
function fromB64(str){return Uint8Array.from(atob(str),c=>c.charCodeAt(0));}
function openVault(){return new Promise((resolve,reject)=>{const r=indexedDB.open('family-points-accounts-v3',1);r.onupgradeneeded=()=>r.result.createObjectStore('accounts',{keyPath:'id'}).createIndex('email','email',{unique:true});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('No se pudo abrir el guardado de cuentas. Permite el almacenamiento del navegador.'));});}
async function vaultOp(mode,fn){const db=await openVault();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('accounts',mode),r=fn(tx.objectStore('accounts'));let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||new Error('No se pudo guardar la cuenta.'));tx.onabort=()=>reject(tx.error||new Error('Guardado interrumpido.'));});}finally{db.close();}}
const vaultGet=id=>vaultOp('readonly',s=>s.get(id));
const vaultAll=()=>vaultOp('readonly',s=>s.getAll());
const vaultPut=record=>vaultOp('readwrite',s=>s.put(record));
async function passwordKey(password,salt){
 if(!crypto?.subtle)throw new Error('Este navegador requiere HTTPS o localhost para crear cuentas. Usa el servidor incluido.');
 const input=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:fromB64(salt),iterations:600000,hash:'SHA-256'},input,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
}
async function seal(data,key){const iv=crypto.getRandomValues(new Uint8Array(12));return {iv:toB64(iv),data:toB64(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data))))};}
async function unseal(vault,key){return C.validateState(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(vault.iv)},key,fromB64(vault.data)))));}
function freshFamily(name){
 const s=C.seed();s.demo=false;s.settings.familyName='Familia de '+name;s.settings.pin=null;s.settings.teamReward='Un plan en familia';
 const m={id:C.uid('member'),name,avatar:'\u{1F9D1}',color:'#8b6ce0',role:'adult',age:null,active:true};s.members=[m];
 for(const n of ['templates','rewards','weeks','events','shopping','mealPlan','routines','absences','swaps','preparations','pantry','vouchers','meetings','houseLog','presencePlans','presenceOverrides','taskReviewRequests','savedMenus','eventFiles','notifications','usualProducts'])s[n]=[];
 s.finance={accounts:[],ledger:[],dues:[],requests:[],goals:[],labs:[],savingsPlans:[]};C.generateWeek(s,C.monday());s.updatedAt=new Date().toISOString();C.validateState(s);return s;
}
function applyAccountState(next,key){
 access.suppress=true;state=C.validateState(C.copy(next));KEY=key;BACKUP=key+'-previous';storageIssue='';corruptRaw=null;lastSavedJSON=localStorage.getItem(KEY);C.rollover(state);
 actor=state.settings.pin?{role:'member',memberId:state.members.find(m=>m.role==='member'&&m.active!==false)?.id||state.members.find(m=>m.active!==false)?.id}:{role:'adult',memberId:null};
 try{const a=JSON.parse(sessionStorage.getItem(KEY+'-profile'));if(a?.role==='member'&&state.members.some(m=>m.id===a.memberId&&m.active!==false))actor=a;}catch(_){}
 ui.view='home';ui.kitchenActive=false;ui.kitchenMember=null;ui.memberId=null;ui.moneyMember=null;ui.presenceMember=null;ui.selectedWeek=C.monday();ui.profileWeek=null;ui.historyWeek=null;
 try{save();}finally{access.suppress=false;}access.blocked=false;render();
}
window.HomaApplyCloudState=function(next){
 if(access.mode!=='cloud'||access.pending||access.suppress)return false;
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
   const old=await vaultGet(captured.user.id);if(!old)throw new Error('No se encuentra esta cuenta local. Exporta una copia.');
   if(old.updatedAt>snapshot.updatedAt)return;
   const vault=await seal(snapshot,captured.key);await vaultPut({...old,vault,updatedAt:snapshot.updatedAt});
  }else{access.cloudPending=snapshot;await saveCloudSnapshot(snapshot);access.cloudPending=null;}
 }).catch(e=>{access.saveError=e.message||'No se pudo guardar. Exporta una copia.';toast(access.saveError,true);}).finally(()=>{access.pending--;refreshV3Chrome();});
}
access.queueSave=queueAccountSave;
function cloudConfig(){try{return JSON.parse(localStorage.getItem(ACCESS_CONFIG)||'null')||window.FAMILY_CLOUD||{};}catch(_){return window.FAMILY_CLOUD||{};}}
function cloudConfigured(){const c=cloudConfig();return !!(c.url&&c.anonKey&&window.HomaCloudTransport?.version===5);}
function cloudOriginReady(){return location.protocol==='https:'||(['localhost','127.0.0.1'].includes(location.hostname)&&location.protocol==='http:');}
function renderAuth(){
 const signup=access.tab==='register',cloud=access.target==='cloud',configured=cloudConfigured()&&cloudOriginReady(),cfg=cloudConfig();
 return `<div class="auth-layout"><section class="auth-story"><div class="brand"><div class="brand-mark">${icon('house')}</div><span>La <span style="color:var(--purple)">Homa</span><small>Organizaci&oacute;n familiar</small></span></div><span class="auth-eyebrow">VUESTRO ESPACIO FAMILIAR</span><h1>Cada peque&ntilde;o gesto<br>cuenta.</h1><p>Responsabilidades, paga, ahorro y organizaci&oacute;n. Un lugar para todo lo que constru&iacute;s juntos.</p><div class="auth-features"><div>${icon('wallet')} Paga y ahorro que crece</div><div>${icon('calendar')} Semanas a vuestra medida</div><div>${icon('chef')} De la receta a la compra</div></div><div class="auth-note">Los perfiles de los ni&ntilde;os viven dentro de la cuenta familiar. No necesitan correo electr&oacute;nico.</div></section><section class="auth-panel"><div class="auth-card"><span class="pill ${cloud?'green':'gray'}">${cloud?'Cuenta en la nube':'Cuenta local'}</span><h2>${signup?'Empezamos en familia.':'Qu&eacute; bien veros.'}</h2><p class="auth-sub">${cloud?'Accede a los datos de tu cuenta entre dispositivos.':'Una cuenta para este navegador. No sincroniza otros dispositivos.'}</p><div class="auth-target"><button type="button" data-action="access-target" data-mode="local" class="${!cloud?'active':''}">En este dispositivo</button><button type="button" data-action="access-target" data-mode="cloud" class="${cloud?'active':''}">En la nube</button></div>${access.message?`<div class="note ${access.error?'warning':'success'} mb" role="status">${esc(access.message)}</div>`:''}${cloud&&!configured?`<div class="note warning mb">La nube a&uacute;n no est&aacute; activada.${location.protocol==='file:'?' Este archivo se abre localmente. La nube necesita una direcci&oacute;n HTTPS o localhost.':''} Configura el proyecto de acceso y los proveedores antes de usar Google o Apple.</div>`:''}<form id="access-form"><input type="hidden" name="target" value="${access.target}">${signup?field('Tu nombre (adulto)','name','','text','required maxlength="60" autocomplete="given-name"'):''}${field('Correo electr&oacute;nico','email','','email','required maxlength="254" autocomplete="username"')}${field('Contrase&ntilde;a','password','','password',`required minlength="${signup?10:1}" maxlength="200" autocomplete="${signup?'new-password':'current-password'}"`)}${signup?`${field('Repite la contrase&ntilde;a','repeat','','password','required minlength="10" maxlength="200" autocomplete="new-password"')}${cloud?field('C&oacute;digo de invitaci&oacute;n, si te han invitado','invite','','text','maxlength="32" autocomplete="off" placeholder="Opcional"'):''}${!cloud&&!state.demo?'<label class="check-label"><input type="checkbox" name="keep">Conservar en esta cuenta los datos abiertos en este dispositivo.</label>':''}`:''}<button type="submit" class="btn primary wide" ${access.busy||(cloud&&!configured)?'disabled':''}>${access.busy?'Comprobando...':signup?'Crear cuenta':'Iniciar sesi&oacute;n'}</button></form><div class="auth-switch">${signup?'Ya tengo cuenta.':'Todav&iacute;a no tengo cuenta.'} <button type="button" class="text-btn" data-action="access-tab" data-tab="${signup?'login':'register'}">${signup?'Iniciar sesi&oacute;n':'Crear cuenta'}</button></div><div class="auth-divider"><span>O con tu cuenta de</span></div><div class="social-buttons"><button type="button" class="btn secondary" data-action="access-oauth" data-provider="google" ${!configured||!cfg.googleEnabled?'disabled':''}><b>G</b> Google</button><button type="button" class="btn secondary" data-action="access-oauth" data-provider="apple" ${!configured||!cfg.appleEnabled?'disabled':''}>${icon('lock')} Apple</button></div><p class="tiny muted center mt">${configured?'Los proveedores deben estar activados en el proyecto.':'Google y Apple: pendientes de configurar la conexi&oacute;n.'}</p><div class="auth-bottom">${btn('Probar sin cuenta','access-guest','','ghost','arrow')}${btn('Configurar nube','access-config','','ghost small','settings')}</div><p class="tiny muted">La sesi&oacute;n se mantiene hasta que cierres sesi&oacute;n, borres los datos del navegador o el proveedor la revoque. Hazlo solo en dispositivos de confianza.</p></div></section></div>`;
}
function accountCard(){return `<div class="settings-group account-card"><div class="flex between wrap"><div><span class="eyebrow">CUENTA Y GUARDADO</span><h3>${esc(access.user?.email||'Sin cuenta')}</h3><p>${access.mode==='cloud'?'Cuenta en la nube':access.mode==='local'?'Cuenta local, solo en este navegador':'Los datos se guardan en este navegador'}</p></div><span class="pill ${access.saveError?'coral':'green'}">${esc(accessStatus())}</span></div>${access.saveError?`<div class="note warning mt">${esc(access.saveError)}. No cierres sin conservar una copia.</div>`:''}<div class="flex wrap mt">${access.user?btn('Cerrar sesi&oacute;n','access-logout','','secondary','logout'):btn('Crear cuenta / acceder','access-open','','primary','users')}${access.mode==='cloud'?btn('Recargar desde la nube','access-reload','','secondary','refresh')+btn('Reintentar guardado','access-retry','','secondary','upload')+btn('Invitar a otro adulto','access-invite','','secondary','users'):btn('Conectar la nube','access-config','','secondary','cloud')}${btn('Exportar copia','backup-export','','secondary','download')}</div><p class="tiny muted mt">${access.mode==='local'?'El correo identifica esta cuenta local, no est&aacute; verificado. La clave de sesi&oacute;n se conserva en el dispositivo mientras sigas conectado. No es un servicio remoto ni una garant&iacute;a contra quien acceda a tu navegador.':'La cuenta identifica al adulto. Los perfiles infantiles no son cuentas independientes.'}</p></div>`;}
async function activateLocal(record,key,remember=true){
 access.mode='local';access.user={id:record.id,email:record.email,name:record.name};access.key=key;access.record=record;
 const raw=toB64(await crypto.subtle.exportKey('raw',key));access.rawKey=raw;
 let next=await unseal(record.vault,key);const cache=localStorage.getItem('family-points-v3-user-'+record.id);if(cache){try{const old=C.validateState(JSON.parse(cache));if(old.updatedAt>=next.updatedAt)next=old;}catch(_){}}
 if(remember)localStorage.setItem(ACCESS_SESSION,JSON.stringify({mode:'local',id:record.id,key:raw}));
 access.message='';access.saveError='';applyAccountState(next,'family-points-v3-user-'+record.id);queueAccountSave(C.copy(state));
}
async function localCredentials(fd,signup){
 const email=String(fd.get('email')).trim().toLowerCase(),password=String(fd.get('password')),users=await vaultAll();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Revisa el correo.');
 if(signup){
  if(password.length<10||password!==fd.get('repeat'))throw new Error('Las claves deben coincidir y tener al menos 10 caracteres.');
  if(users.some(u=>u.email===email))throw new Error('Ya existe una cuenta local con este correo. Inicia sesi\u00f3n.');
  const name=String(fd.get('name')).trim();if(!name)throw new Error('Escribe tu nombre.');
  const salt=toB64(crypto.getRandomValues(new Uint8Array(16))),key=await passwordKey(password,salt),next=fd.get('keep')?C.copy(state):freshFamily(name);next.demo=false;
  const record={id:C.uid('account'),email,name,salt,vault:await seal(next,key),updatedAt:new Date().toISOString()};await vaultPut(record);await activateLocal(record,key);return;
 }
 const record=users.find(u=>u.email===email);if(!record)throw new Error('Correo o contrase\u00f1a incorrectos en este navegador.');
 let key;try{key=await passwordKey(password,record.salt);await unseal(record.vault,key);}catch(_){throw new Error('Correo o contrase\u00f1a incorrectos en este navegador.');}await activateLocal(record,key);
}
async function logOut(){
 access.busy=true;await access.chain;if(access.saveError){access.busy=false;throw new Error('Hay cambios pendientes. Reintenta el guardado o exporta una copia antes de salir.');}
 const oldKey=KEY;if(access.mode==='cloud'){const {error}=await access.cloud.auth.signOut({scope:'local'});if(error){access.busy=false;throw error;}}
 localStorage.removeItem(ACCESS_SESSION);localStorage.removeItem(oldKey);localStorage.removeItem(oldKey+'-previous');sessionStorage.removeItem(oldKey+'-profile');
 access.blocked=true;access.mode='guest';access.user=null;access.key=null;access.rawKey=null;access.record=null;access.busy=false;access.message='Sesi\u00f3n cerrada. Tus datos permanecen guardados en tu cuenta.';access.error=false;access.tab='login';
 KEY='family-points-v3-guest';BACKUP=KEY+'-previous';state=C.seed();lastSavedJSON=localStorage.getItem(KEY);actor={role:'member',memberId:null};closeModal();render();
}
async function guestAccess(){
 access.mode='guest';access.user=null;access.key=null;access.saveError='';localStorage.removeItem(ACCESS_SESSION);let next;try{const raw=localStorage.getItem('family-points-v3-guest');next=raw?C.validateState(JSON.parse(raw)):C.seed();}catch(_){next=C.seed();}
 applyAccountState(next,'family-points-v3-guest');closeModal();
}
function cloudConfigForm(){
 const cfg=cloudConfig();
 openModal('Conectar una cuenta en la nube',`<p class="dialog-description">Necesitas un proyecto Supabase con la tabla y las reglas incluidas en el ZIP, y alojar la app en HTTPS (o localhost durante el desarrollo). Esto no crea el servidor ni configura los proveedores por s&iacute; solo.</p>${field('URL del proyecto Supabase','url',cfg.url||'','url','placeholder="https://tu-proyecto.supabase.co" required')}${field('Clave p&uacute;blica (publishable o anon)','anonKey',cfg.anonKey||'','text','required autocomplete="off"')}<div class="note warning">Nunca uses una clave secret o service_role en el navegador.</div><label class="check-label mt"><input type="checkbox" name="google" ${cfg.googleEnabled?'checked':''}>He configurado Google en el proyecto y su consola.</label><label class="check-label"><input type="checkbox" name="apple" ${cfg.appleEnabled?'checked':''}>He configurado Apple y su Services ID.</label><p class="small muted mt">La conexi&oacute;n de la cuenta no sube tus datos locales autom&aacute;ticamente. Podr&aacute;s exportarlos y restaurarlos en tu cuenta tras acceder.</p>${footer('Guardar conexi&oacute;n')}`,fd=>{
  const url=String(fd.get('url')).trim().replace(/\/$/,''),key=String(fd.get('anonKey')).trim();let parsed;try{parsed=new URL(url);}catch(_){throw new Error('URL no v\u00e1lida.');}
  if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.username||parsed.password||parsed.pathname!=='/')throw new Error('Usa la URL HTTPS original de tu proyecto supabase.co.');
  if(key.startsWith('sb_secret_'))throw new Error('Esta clave es privada. No la guardes en el navegador.');
  if(!key.startsWith('sb_publishable_')){try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon')throw Error();}catch(_){throw new Error('Usa una clave publishable o anon; nunca service_role.');}}
  if(access.mode==='cloud')throw new Error('Cierra la sesi\u00f3n actual antes de cambiar de proyecto.');
  localStorage.setItem(ACCESS_CONFIG,JSON.stringify({url,anonKey:key,googleEnabled:!!fd.get('google'),appleEnabled:!!fd.get('apple')}));access.cloud=null;access.target='cloud';access.message='Conexión guardada en este navegador. Ya puedes crear la cuenta en la nube.';access.error=false;render();return true;
 });
}
async function cloudClient(){
 if(access.cloud)return access.cloud;
 if(!cloudOriginReady())throw new Error('Abre la app desde HTTPS o localhost. Un archivo file:// no admite este acceso.');
 if(!cloudConfigured())throw new Error('El adaptador de hogares v5 sigue pendiente de conectar.');
 if(!window.supabase)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/dist/umd/supabase.js';script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el servicio de acceso. Revisa la conexi\u00f3n.'));document.head.appendChild(script);});
 const cfg=cloudConfig();access.cloud=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
 access.cloud.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'&&access.mode==='cloud'){setTimeout(()=>{access.blocked=true;access.message='Sesi\u00f3n cerrada o revocada. Inicia sesi\u00f3n de nuevo.';access.user=null;closeModal();render();},0);}});
 return access.cloud;
}
async function activateCloud(session,name=''){
 if(!window.HomaCloudTransport||window.HomaCloudTransport.version!==5)throw new Error('El adaptador de hogares v5 aún no está conectado.');
 if(!session?.user)throw new Error('No se ha recibido una sesión válida.');
 const invite=access.pendingInvite||'';access.pendingInvite='';
 const result=await window.HomaCloudTransport.activate(session,name,invite);
 const user=session.user;access.mode='cloud';access.target='cloud';access.user={id:user.id,email:user.email||'',name:name||user.user_metadata?.name||'Mi familia',householdId:result.householdId};
 access.revision=result.revision||0;access.saveError='';access.cloudPending=null;
 let next=C.validateState(result.state);const cacheKey='family-points-v3-cloud-'+result.householdId,cache=localStorage.getItem(cacheKey);
 if(cache){try{const local=C.validateState(JSON.parse(cache));if((local.updatedAt||'')>(next.updatedAt||''))next=local;}catch(_){}}
 localStorage.setItem(ACCESS_SESSION,JSON.stringify({mode:'cloud',id:user.id,householdId:result.householdId}));
 applyAccountState(next,cacheKey);
}
async function saveCloudSnapshot(snapshot){
 if(!window.HomaCloudTransport||window.HomaCloudTransport.version!==5)throw new Error('El guardado multidispositivo est\u00e1 pendiente de conectar.');
 return window.HomaCloudTransport.save(snapshot);
 /* Legacy implementation, intentionally unreachable. */
 if(!access.cloud||!access.user)throw new Error('No hay sesi\u00f3n en la nube.');
 const marker=KEY+'-pending';localStorage.setItem(marker,JSON.stringify({revision:access.revision}));const expected=access.revision;
 const {data,error}=await access.cloud.rpc('save_family_state',{expected_revision:expected,p_data:snapshot});
 if(error)throw new Error(error.message.includes('VERSION_CONFLICT')?'Otro dispositivo ha cambiado la familia. Exporta tus cambios antes de recargar desde la nube.':'Guardado local; pendiente de nube: '+error.message);
 access.revision=Number(data);localStorage.removeItem(marker);
}
async function cloudCredentials(fd,signup){
 access.pendingInvite=signup?String(fd.get('invite')||'').trim():'';
 const client=await cloudClient(),email=String(fd.get('email')).trim(),password=String(fd.get('password')),redirect=location.origin+location.pathname;
 if(signup){if(password.length<10||password!==fd.get('repeat'))throw new Error('Las claves deben coincidir y tener al menos 10 caracteres.');const name=String(fd.get('name')).trim();const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect,data:{name}}});if(error)throw error;if(!data.session){access.message='Revisa tu correo y confirma la cuenta. Despu\u00e9s podr\u00e1s iniciar sesi\u00f3n.';access.error=false;access.tab='login';render();return;}await activateCloud(data.session,name);}
 else{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw new Error('No se pudo acceder. Revisa correo, contrase\u00f1a y confirmaci\u00f3n del correo.');await activateCloud(data.session);}
}
async function accessAction(a,d){
 switch(a){
 case 'v3-account':if(!isAdult()){adultLogin();return true;}nav('settings');return true;
 case 'access-open':if(!needAdult())return true;access.blocked=true;access.message='';access.tab='login';render();return true;
 case 'access-target':access.target=d.mode;access.message='';render();return true;
 case 'access-tab':access.tab=d.tab;access.message='';render();return true;
 case 'access-guest':await guestAccess();return true;
 case 'access-config':if(access.blocked||needAdult())cloudConfigForm();return true;
 case 'access-invite':{if(!needAdult()||access.mode!=='cloud')return true;const code=await window.HomaCloudTransport.invite();openModal('Invitar a otro adulto',`<p class="dialog-description">La otra persona crea su propia cuenta en la nube y escribe este c&oacute;digo. Entra en el mismo hogar, sin compartir tu contrase&ntilde;a. El c&oacute;digo caduca en 7 d&iacute;as y solo puede usarse una vez.</p><p style="font-size:1.5rem;letter-spacing:.14em;font-weight:700">${esc(code)}</p>${footer('Entendido')}`,()=>true);return true;}
 case 'access-logout':if(!needAdult())return true;confirmDialog('Cerrar sesi&oacute;n','Se ocultar&aacute;n los datos familiares. Podr&aacute;s recuperarlos al iniciar sesi&oacute;n con la misma cuenta.',async()=>{await logOut();return true;},'Cerrar sesi&oacute;n');return true;
 case 'access-oauth':{const cfg=cloudConfig();if(!['google','apple'].includes(d.provider)||!cfg[d.provider+'Enabled'])throw new Error('Proveedor no activado.');const c=await cloudClient();const {error}=await c.auth.signInWithOAuth({provider:d.provider,options:{redirectTo:location.origin+location.pathname}});if(error)throw error;return true;}
 case 'access-retry':if(needAdult()){access.saveError='';queueAccountSave(C.copy(state));await access.chain;render();}return true;
 case 'access-reload':if(needAdult())confirmDialog('Cargar la versi&oacute;n de la nube','Se descargar&aacute; una copia local antes de sustituir los datos por la versi&oacute;n del servidor.',async()=>{await access.chain;downloadFile('la-homa-antes-de-sincronizar.json',JSON.stringify(state,null,2),'application/json');localStorage.removeItem(KEY+'-pending');const {data,error}=await access.cloud.auth.getSession();if(error)throw error;await activateCloud(data.session);return true;});return true;
 default:return false;
 }
}
document.addEventListener('submit',async e=>{
 if(e.target.id!=='access-form')return;e.preventDefault();if(access.busy)return;const form=e.target,fd=new FormData(form),signup=access.tab==='register';access.busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;access.message='';
 try{if(access.target==='cloud')await cloudCredentials(fd,signup);else await localCredentials(fd,signup);}catch(err){access.message=err.message||'No se pudo acceder.';access.error=true;access.blocked=true;}finally{access.busy=false;render();}
});
window.addEventListener('storage',e=>{if(e.key===ACCESS_SESSION&&!e.newValue&&access.user){access.blocked=true;access.key=null;access.rawKey=null;access.user=null;access.message='Sesi\u00f3n cerrada en otra pesta\u00f1a.';closeModal();render();}});
async function bootAccess(){
 render();try{
  const session=JSON.parse(localStorage.getItem(ACCESS_SESSION)||'null');
  if(session?.mode==='local'){
   const record=await vaultGet(session.id);if(!record)throw new Error('No se encuentra la cuenta en este navegador.');const key=await crypto.subtle.importKey('raw',fromB64(session.key),{name:'AES-GCM'},true,['encrypt','decrypt']);await activateLocal(record,key,false);return;
  }
  if(cloudConfigured()&&cloudOriginReady()){
   const client=await cloudClient(),{data,error}=await client.auth.getSession();if(error)throw error;if(data.session){await activateCloud(data.session);return;}
  }
  access.message='';render();
 }catch(e){access.blocked=true;access.message=e.message||'Vuelve a iniciar sesi\u00f3n.';access.error=true;render();}
}

