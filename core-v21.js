/* Family Points v2.1 - deterministic domain logic, no dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FamilyCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  function iso(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function date(s) { if (!validDate(s)) throw new Error('Fecha no válida'); return new Date(s+'T12:00:00'); }
  function validDate(s) { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d=new Date(s+'T12:00:00'); return !isNaN(d) && iso(d)===s; }
  function addDays(s,n) { const d=date(s); d.setDate(d.getDate()+n); return iso(d); }
  function monday(s=iso()) { const d=date(s); return addDays(s, -((d.getDay()+6)%7)); }
  const uid = prefix => `${prefix||'id'}_${globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)}`;
  const copy = x => JSON.parse(JSON.stringify(x));
  const contribution = task => task.status === 'done' ? task.points : task.status === 'missed' ? -task.points : 0;
  const memberSnapshot = m => ({id:m.id,name:m.name,avatar:m.avatar,color:m.color,role:m.role,age:m.age??null});
  function generateWeek(state, start) {
    if (state.weeks.some(w=>w.start===start)) return state.weeks.find(w=>w.start===start);
    const members=state.members.filter(m=>m.active!==false);
    const w={id:start,start,end:addDays(start,6),status:'open',createdAt:new Date().toISOString(),closedAt:null,members:members.map(memberSnapshot),tasks:[],adjustments:[],rewards:[]};
    for (const t of state.templates.filter(t=>t.active!==false)) appendTemplate(w,t,members);
    w.rewards=state.rewards.filter(r=>r.active!==false && members.some(m=>m.id===r.memberId)).map(r=>({...copy(r),claimedAt:null,pointsAtClaim:null}));
    state.weeks.push(w);
    applyAbsences(state);
    return w;
  }
  function appendTemplate(w,t,members,minDate=null) {
    const eligible=t.memberIds.filter(id=>members.some(m=>m.id===id&&m.active!==false));
    const wi=Math.round((Date.parse(w.start+'T00:00:00Z')-Date.parse((t.rotationStart||'2026-01-05')+'T00:00:00Z'))/604800000);
    const assigned=t.rotation&&eligible.length?[eligible[((wi%eligible.length)+eligible.length)%eligible.length]]:t.memberIds;
    for(const mid of assigned) {
      if (!members.some(m=>m.id===mid && m.active!==false)) continue;
      if (!w.members.some(m=>m.id===mid)) w.members.push(memberSnapshot(members.find(m=>m.id===mid)));
      for (const day of [...new Set(t.days)].sort()) {
        const d=addDays(w.start,day), id=`${w.id}_${t.id}_${mid}_${day}`;
        if ((minDate && d<minDate) || w.tasks.some(x=>x.id===id)) continue;
        w.tasks.push({id,templateId:t.id,memberId:mid,date:d,title:t.title,description:t.description||'',points:t.points,category:t.category||'Casa',icon:t.icon||'house',kind:'normal',status:'pending',requiresReview:!!t.requiresReview,changedAt:null});
      }
    }
  }
  function syncTemplate(state,t,minDate=iso()) {
    const w=state.weeks.find(w=>w.start===monday(minDate));
    if(!w||w.status!=='open') return;
    w.tasks=w.tasks.filter(x=>!(x.templateId===t.id && x.status==='pending' && x.date>=minDate));
    if(t.active!==false) appendTemplate(w,t,state.members,minDate);
    applyAbsences(state);
  }
  function closeWeek(w, markMissed=true) {
    if(w.status==='closed') return false;
    if(markMissed) for(const t of w.tasks) if(t.kind==='normal'&&t.status==='pending') { t.status='missed'; t.changedAt=new Date().toISOString(); }
    w.status='closed'; w.closedAt=new Date().toISOString(); return true;
  }
  function rollover(state, today=iso()) {
    const current=monday(today);
    let changed=false;
    for(const w of state.weeks) if(w.start<current && w.status==='open') { closeWeek(w,state.settings.closePending!==false); changed=true; }
    // Do not invent activity for weeks in which the application was never used.
    if(!state.weeks.some(w=>w.start===current)) {generateWeek(state,current);changed=true;}
    if(syncV2(state,today))changed=true;
    return changed;
  }
  function stats(w,mid) {
    const tasks=w.tasks.filter(t=>t.memberId===mid);
    const adjustments=w.adjustments.filter(a=>a.memberId===mid);
    const target=tasks.filter(t=>t.kind==='normal'&&t.status!=='excused').reduce((n,t)=>n+t.points,0);
    const earned=tasks.filter(t=>t.status==='done').reduce((n,t)=>n+t.points,0)+adjustments.filter(a=>a.points>0).reduce((n,a)=>n+a.points,0);
    const lost=tasks.filter(t=>t.status==='missed').reduce((n,t)=>n+t.points,0)-adjustments.filter(a=>a.points<0).reduce((n,a)=>n+a.points,0);
    const points=earned-lost;
    return {points,target,earned,lost,remaining:Math.max(0,target-points),percent:target?Math.max(0,Math.min(100,Math.round(points/target*100))):0,done:tasks.filter(t=>t.status==='done').length,pending:tasks.filter(t=>['pending','review'].includes(t.status)).length,review:tasks.filter(t=>t.status==='review').length,excused:tasks.filter(t=>t.status==='excused').length,missed:tasks.filter(t=>t.status==='missed').length,recovery:tasks.filter(t=>t.kind==='recovery'&&t.status==='done').length,total:tasks.length};
  }
  function rewardState(w,r) {
    const s=stats(w,r.memberId),need=r.mode==='fixed'?r.threshold:s.target;
    return {need,unlocked:r.active!==false && need>0 && s.points>=need,claimed:!!r.claimedAt,remaining:Math.max(0,need-s.points),points:s.points};
  }
  function setStatus(w,id,status,actor={role:'adult'}) {
    if(!['pending','done','missed','review','excused'].includes(status)) throw new Error('Estado no válido.');
    const t=w.tasks.find(t=>t.id===id); if(!t) throw new Error('No se encuentra la tarea.');
    if(actor.role!=='adult' && (actor.memberId!==t.memberId || ['missed','excused','review'].includes(status)||t.status==='excused')) throw new Error('Esta acción requiere un adulto.');
    if(w.status==='closed' && t.kind!=='recovery' && !(actor.role==='adult'&&t.status==='review')) throw new Error('La semana esta cerrada. Utiliza una tarea de recuperación.');
    if(actor.role!=='adult'&&status==='done'&&t.requiresReview)status='review';
    const previous=contribution(t); t.status=status;t.changedAt=new Date().toISOString();
    return contribution(t)-previous;
  }
  function addRecovery(w, input) {
    if(!w.members.some(m=>m.id===input.memberId)) throw new Error('Miembro no disponible en esta semana.');
    if(!Number.isInteger(input.points)||input.points<=0||input.points>1000) throw new Error('Los puntos deben estar entre 1 y 1000.');
    const task={id:uid('recovery'),templateId:null,memberId:input.memberId,title:input.title,description:input.description||'',points:input.points,date:input.date||iso(),category:'Recuperación',icon:'sparkles',kind:'recovery',status:'pending',changedAt:null};
    w.tasks.push(task);return task;
  }
  function claimReward(w,id) {
    const r=w.rewards.find(r=>r.id===id);if(!r) throw new Error('Recompensa no encontrada.');
    const s=rewardState(w,r);
    if(r.claimedAt) return false;
    if(!s.unlocked) throw new Error('Aun faltan puntos para esta recompensa.');
    r.claimedAt=new Date().toISOString();r.pointsAtClaim=s.points;return true;
  }
  const text = (x,max=500) => typeof x==='string' && x.length<=max;
  function validateState(s) {
    if(s?.schemaVersion===1)upgradeState(s);
    function check(v,msg){if(!v)throw new Error('Copia no válida: '+msg);}
    check(s&&typeof s==='object'&&s.schemaVersion===2,'version no compatible.');
    for(const k of ['members','templates','rewards','weeks','shopping','recipes','mealPlan','events']) check(Array.isArray(s[k])&&s[k].length<=20000,k+'.');
    check(s.settings&&text(s.settings.familyName,80)&&text(s.settings.teamReward,160)&&Number.isInteger(s.settings.teamTarget)&&s.settings.teamTarget>=0&&s.settings.teamTarget<=100000,'configuración.');
    const ids=(arr,k)=>{check(new Set(arr.map(x=>x.id)).size===arr.length,'identificadores repetidos en '+k);for(const x of arr) check(text(x.id,200)&&/^[A-Za-z0-9_.:@-]+$/.test(x.id),'identificador.');};
    for(const k of ['members','templates','rewards','weeks','shopping','recipes','mealPlan','events']) ids(s[k],k);
    const member=m=>check(text(m.name,80)&&m.name.trim()&&text(m.avatar,20)&&/^#[0-9a-f]{6}$/i.test(m.color)&&['adult','member'].includes(m.role)&&(m.age==null||(Number.isInteger(m.age)&&m.age>=1&&m.age<=120)),'miembro.');
    s.members.forEach(member);
    check(s.members.some(m=>m.role==='adult'&&m.active!==false),'debe existir un adulto activo.');
    const positive=n=>Number.isInteger(n)&&n>0&&n<=1000;
    const reward=r=>check(text(r.title,160)&&text(r.description||'',2000)&&text(r.icon,20)&&text(r.memberId,200)&&['weekly','fixed'].includes(r.mode)&&(r.mode==='weekly'||positive(r.threshold)),'recompensa.');
    s.rewards.forEach(reward);
    for(const t of s.templates) check(text(t.title,160)&&text(t.description||'',2000)&&positive(t.points)&&Array.isArray(t.memberIds)&&t.memberIds.every(x=>s.members.some(m=>m.id===x))&&Array.isArray(t.days)&&t.days.length>0&&t.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)&&new Set(t.days).size===t.days.length,'tarea recurrente.');
    for(const w of s.weeks){
      check(validDate(w.start)&&monday(w.start)===w.start&&w.id===w.start&&w.end===addDays(w.start,6)&&['open','closed'].includes(w.status),'semana.');
      for(const k of ['tasks','members','adjustments','rewards']) check(Array.isArray(w[k])&&w[k].length<=50000,k+' semanal.');
      w.members.forEach(member);w.rewards.forEach(reward);ids(w.members,'miembros semanales');ids(w.rewards,'recompensas semanales');ids(w.tasks,'tareas');ids(w.adjustments,'ajustes');
      for(const t of w.tasks) check(text(t.title,160)&&text(t.description||'',2000)&&positive(t.points)&&validDate(t.date)&&['normal','recovery'].includes(t.kind)&&['pending','done','missed','review','excused'].includes(t.status)&&w.members.some(m=>m.id===t.memberId)&&(t.kind==='recovery'||(t.date>=w.start&&t.date<=w.end)),'asignacion.');
      for(const a of w.adjustments) check(Number.isInteger(a.points)&&Math.abs(a.points)<=10000&&text(a.reason,2000)&&w.members.some(m=>m.id===a.memberId),'ajuste.');
    }
    for(const r of s.recipes) check(text(r.name,160)&&text(r.emoji,20)&&Number.isFinite(r.minutes)&&r.minutes>0&&Number.isFinite(r.servings)&&r.servings>0&&Array.isArray(r.ingredients)&&r.ingredients.length<=100&&r.ingredients.every(i=>text(i.name,160)&&text(i.quantity,160)&&text(i.category||'',80))&&Array.isArray(r.steps)&&r.steps.every(x=>text(x,3000)),'receta.');
    for(const x of s.shopping) check(text(x.name,160)&&text(x.quantity,160)&&text(x.category,80)&&typeof x.checked==='boolean','compra.');
    for(const x of s.mealPlan) check(validDate(x.date)&&['lunch','dinner'].includes(x.slot)&&s.recipes.some(r=>r.id===x.recipeId)&&Number.isInteger(x.servings)&&x.servings>0&&x.servings<=30,'menu.');
    const time=x=>!x||/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
    for(const x of s.events) check(text(x.title,160)&&text(x.description||'',5000)&&validDate(x.date)&&(!x.endDate||validDate(x.endDate))&&(!x.endDate||x.endDate>=x.date)&&typeof x.time==='string'&&typeof x.endTime==='string'&&time(x.time)&&time(x.endTime)&&text(x.memberId||'',200)&&Number.isInteger(x.revision)&&x.revision>=0,'evento.');
    if(s.settings.pin) check(/^[a-f0-9]{32}$/.test(s.settings.pin.salt)&&/^[a-f0-9]{64}$/.test(s.settings.pin.hash),'PIN.');
    validateV2(s);
    return s;
  }
  function seed(today=iso()) {
    const s={schemaVersion:1,demo:true,createdAt:new Date().toISOString(),settings:{familyName:'Familia de ejemplo',teamTarget:180,teamReward:'Una tarde de juegos en familia',closePending:true,pin:null},members:[],templates:[],rewards:[],weeks:[],shopping:[],recipes:[],mealPlan:[],events:[]};
    s.members=[{id:'ana',name:'Ana',avatar:'\u{1F680}',color:'#8b6ce0',role:'member',age:10,active:true},{id:'leo',name:'Leo',avatar:'\u{1F981}',color:'#dc9860',role:'member',age:7,active:true},{id:'mama',name:'Mamá',avatar:'\u{1F33C}',color:'#5da896',role:'adult',age:null,active:true},{id:'papa',name:'Papá',avatar:'\u{1F43B}',color:'#6a9bcb',role:'adult',age:null,active:true}];
    const make=(id,title,p,m,days,icon,category)=>({id,title,points:p,memberIds:m,days,icon,category,frequency:days.length===7?'daily':days.length===1?'weekly':'custom',description:'',active:true});
    s.templates=[make('cama','Hacer la cama',2,['ana','leo'],[0,1,2,3,4,5,6],'bed','Habitación'),make('mesa','Poner la mesa',3,['ana'],[0,1,2,3,4,5,6],'utensils','Cocina'),make('juguetes','Recoger los juguetes',3,['leo'],[0,1,2,3,4,5,6],'blocks','Habitación'),make('plantas','Regar las plantas',5,['leo'],[2,5],'leaf','Casa'),make('habitacion','Ordenar la habitación',10,['ana'],[5],'sparkles','Habitación'),make('cena','Preparar la cena',8,['mama'],[0,2,4,5],'utensils','Cocina'),make('ropa','Poner una lavadora',6,['mama'],[1,3,6],'shirt','Ropa'),make('basura','Sacar la basura',5,['papa'],[0,2,4,5],'trash','Casa'),make('paseo','Pasear a Coco',4,['papa'],[0,1,2,3,4,5,6],'paw','Mascotas')];
    s.rewards=[{id:'reward_ana',memberId:'ana',title:'Elegir la película',description:'Tu eliges la peli de nuestra noche de cine.',icon:'\u{1F37F}',mode:'weekly',threshold:null,active:true},{id:'reward_leo',memberId:'leo',title:'Un postre especial',description:'Preparamos juntos tu postre favorito.',icon:'\u{1F368}',mode:'weekly',threshold:null,active:true},{id:'reward_mama',memberId:'mama',title:'Una hora para mi',description:'Un ratito para descansar, leer o desconectar.',icon:'\u{1F4D6}',mode:'weekly',threshold:null,active:true},{id:'reward_papa',memberId:'papa',title:'Elegir la excursión',description:'El próximo plan de fin de semana lo eliges tu.',icon:'\u{1F333}',mode:'weekly',threshold:null,active:true}];
    const w=generateWeek(s,monday(today));
    for(const t of w.tasks) if(t.date<today) t.status='done';
    const past=w.tasks.find(t=>t.memberId==='leo'&&t.date<today&&t.templateId==='juguetes');if(past)past.status='missed';
    const first=w.tasks.find(t=>t.date===today);if(first)first.status='done';
    const prev=generateWeek(s,addDays(w.start,-7));
    prev.tasks.forEach((t,i)=>t.status=(i%13===0?'missed':'done'));closeWeek(prev,false);
    for(const r of prev.rewards) if(rewardState(prev,r).unlocked){r.claimedAt=new Date(date(prev.end)).toISOString();r.pointsAtClaim=stats(prev,r.memberId).points;}
    s.shopping=[{id:'shop1',name:'Tomates cherry',quantity:'500 g',category:'Fruta y verdura',checked:false},{id:'shop2',name:'Leche',quantity:'2 l',category:'Lácteos y huevos',checked:false},{id:'shop3',name:'Pan integral',quantity:'1 ud',category:'Despensa',checked:false},{id:'shop4',name:'Manzanas',quantity:'6 ud',category:'Fruta y verdura',checked:true}];
    s.recipes=[
      {id:'pasta',name:'Pasta de la casa',emoji:'\u{1F35D}',minutes:25,servings:4,category:'En familia',favorite:true,ingredients:[{name:'Pasta',quantity:'400 g',category:'Despensa'},{name:'Tomates cherry',quantity:'500 g',category:'Fruta y verdura'},{name:'Queso rallado',quantity:'80 g',category:'Lácteos y huevos'},{name:'Aceite de oliva',quantity:'2 cucharadas',category:'Despensa'}],steps:['Cuece la pasta en agua con sal siguiendo el tiempo del envase.','Saltea los tomates cortados con el aceite hasta que estén tiernos.','Mezcla la pasta con los tomates y un poco del agua de cocción. Sirve con queso rallado.']},
      {id:'tacos',name:'Tacos de colores',emoji:'\u{1F32E}',minutes:30,servings:4,category:'En familia',favorite:false,ingredients:[{name:'Tortillas de trigo',quantity:'8 ud',category:'Despensa'},{name:'Alubias cocidas',quantity:'400 g',category:'Despensa'},{name:'Pimiento',quantity:'2 ud',category:'Fruta y verdura'},{name:'Aguacate',quantity:'1 ud',category:'Fruta y verdura'}],steps:['Corta el pimiento en tiras y saltealo con un poco de aceite.','Añade las alubias escurridas y calienta bien el conjunto.','Calienta las tortillas y sirve con el relleno y el aguacate en dados.']},
      {id:'crema',name:'Crema de calabaza',emoji:'\u{1F963}',minutes:35,servings:4,category:'De cuchara',favorite:false,ingredients:[{name:'Calabaza',quantity:'800 g',category:'Fruta y verdura'},{name:'Patatas',quantity:'200 g',category:'Fruta y verdura'},{name:'Cebolla',quantity:'1 ud',category:'Fruta y verdura'},{name:'Caldo vegetal',quantity:'700 ml',category:'Despensa'}],steps:['Pela y trocea las verduras. Rehoga la cebolla con aceite.','Añade la patata, la calabaza y el caldo; cuece hasta que todo este tierno.','Tritura con cuidado y ajusta la textura con un poco más de caldo.']},
      {id:'pizza',name:'Pizza en equipo',emoji:'\u{1F355}',minutes:30,servings:4,category:'En familia',favorite:true,ingredients:[{name:'Masa de pizza',quantity:'2 ud',category:'Despensa'},{name:'Tomate triturado',quantity:'200 g',category:'Despensa'},{name:'Mozzarella',quantity:'200 g',category:'Lácteos y huevos'},{name:'Champiñones',quantity:'150 g',category:'Fruta y verdura'}],steps:['Precalienta el horno siguiendo las instrucciones de la masa.','Extiende el tomate, reparte la mozzarella y los champiñones laminados.','Hornea según el envase, hasta que la base este cocida y el queso fundido.']},
      {id:'tortilla',name:'Tortilla del domingo',emoji:'\u{1F95A}',minutes:40,servings:4,category:'Clásicos',favorite:false,ingredients:[{name:'Huevos',quantity:'6 ud',category:'Lácteos y huevos'},{name:'Patatas',quantity:'600 g',category:'Fruta y verdura'},{name:'Cebolla',quantity:'1 ud',category:'Fruta y verdura'}],steps:['Pela y corta las patatas y la cebolla. Cocinalas lentamente en aceite.','Escurre y mezcla con los huevos batidos y una pizca de sal.','Cuaja la tortilla por ambos lados hasta que el huevo este bien cocinado.']},
      {id:'bowl',name:'Bowl de yogur y fruta',emoji:'\u{1F353}',minutes:10,servings:4,category:'Rápidas',favorite:false,ingredients:[{name:'Yogur natural',quantity:'500 g',category:'Lácteos y huevos'},{name:'Fresas',quantity:'300 g',category:'Fruta y verdura'},{name:'Copos de avena',quantity:'80 g',category:'Despensa'}],steps:['Lava y corta las fresas.','Reparte el yogur en cuatro cuencos y añade la fruta y la avena.']}
    ];
    s.mealPlan=[{id:'meal1',date:today,slot:'dinner',recipeId:'pizza',servings:4},{id:'meal2',date:addDays(today,1),slot:'lunch',recipeId:'tortilla',servings:4}];
    s.events=[{id:'event1',title:'Tarde de parque',date:today,endDate:today,time:'17:00',endTime:'18:30',allDay:false,memberId:'',category:'Familia',description:'Un rato de aire libre, todos juntos.',revision:0},{id:'event2',title:'Partido de Leo',date:addDays(today,1),endDate:addDays(today,1),time:'10:00',endTime:'11:00',allDay:false,memberId:'leo',category:'Actividad',description:'Preparar la mochila la noche anterior.',revision:0}];
    return seedV2(s,today);
  }
  function scaleQuantity(q,factor) {const m=q.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);if(!m)return q;return `${Math.round(Number(m[1].replace(',','.'))*factor*100)/100}${m[2]?' '+m[2]:''}`;}
  function mergeQuantity(a,b) {const re=/^(\d+(?:[.,]\d+)?)\s*(.*)$/;const x=a.trim().match(re),y=b.trim().match(re);if(x&&y&&x[2].toLowerCase()===y[2].toLowerCase())return `${Math.round((+x[1].replace(',','.')+ +y[1].replace(',','.'))*100)/100}${x[2]?' '+x[2]:''}`;return (a+' + '+b).slice(0,160);}
  function addIngredients(s,r,servings=r.servings){for(const i of r.ingredients){const q=scaleQuantity(i.quantity,servings/r.servings);const found=s.shopping.find(x=>!x.checked&&x.name.trim().toLocaleLowerCase()===i.name.trim().toLocaleLowerCase());if(found)found.quantity=mergeQuantity(found.quantity,q);else s.shopping.push({id:uid('shop'),name:i.name,quantity:q,category:i.category||'Despensa',checked:false});}return r.ingredients.length;}
  const icsEscape = v => String(v||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const icsUnescape = v => v.replace(/\\([nN,;\\])/g,(_,c)=>c.toLowerCase()==='n'?'\n':c);
  function foldLine(line){const result=[];let cur='',len=0;for(const ch of line){const n=new TextEncoder().encode(ch).length;if(len+n>74){result.push(cur);cur=' ';len=1;}cur+=ch;len+=n;}result.push(cur);return result.join('\r\n');}
  function exportICS(s,weekId=null,withTasks=true) {
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Family Points//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+icsEscape(s.settings.familyName)];
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const compact=d=>d.replace(/-/g,'');
    const stampLocal=(d,t)=>new Date(d+'T'+t+':00').toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    for(const e of s.events){lines.push('BEGIN:VEVENT','UID:'+icsEscape(e.icsUid||e.id+'@familypoints.local'),'DTSTAMP:'+stamp,'SEQUENCE:'+(e.revision||0),'SUMMARY:'+icsEscape(e.title),'DESCRIPTION:'+icsEscape(e.description||''));
      if(e.allDay||!e.time) lines.push('DTSTART;VALUE=DATE:'+compact(e.date),'DTEND;VALUE=DATE:'+compact(addDays(e.endDate||e.date,1)));
      else {lines.push('DTSTART:'+stampLocal(e.date,e.time));const endD=e.endDate||e.date; const endT=e.endTime||e.time;let end=new Date(endD+'T'+endT+':00');if(end<=new Date(e.date+'T'+e.time+':00'))end=new Date(new Date(e.date+'T'+e.time+':00').getTime()+3600000);lines.push('DTEND:'+end.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''));}
      lines.push('END:VEVENT');}
    if(withTasks) for(const w of s.weeks.filter(w=>!weekId||w.id===weekId)) for(const t of w.tasks){const name=w.members.find(m=>m.id===t.memberId)?.name||'';lines.push('BEGIN:VEVENT','UID:'+t.id+'@familypoints.local','DTSTAMP:'+stamp,'X-FAMILYPOINTS-TASK:TRUE','DTSTART;VALUE=DATE:'+compact(t.date),'DTEND;VALUE=DATE:'+compact(addDays(t.date,1)),'SUMMARY:'+icsEscape(name+': '+t.title),'DESCRIPTION:'+icsEscape(`${t.points} puntos. Estado: ${t.status==='done'?'Realizada':t.status==='missed'?'No realizada':t.status==='review'?'Por revisar':t.status==='excused'?'Justificada':'Pendiente'}. ${t.description||''}`),'END:VEVENT');}
    lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n';
  }
  function parseICS(raw){
    if(typeof raw!=='string'||raw.length>2000000||!raw.includes('BEGIN:VCALENDAR'))throw new Error('Selecciona un archivo ICS válido de menos de 2 MB.');
    const lines=raw.replace(/\r\n[ \t]|\n[ \t]/g,'').split(/\r?\n/),events=[];let props=null,depth=0,skipped=0;
    for(const line of lines){if(line==='BEGIN:VEVENT'){props={};depth=0;continue;}if(!props)continue;if(line==='END:VEVENT'){try{if(props.RRULE||props['RECURRENCE-ID']||props['X-FAMILYPOINTS-TASK']||props.STATUS?.value==='CANCELLED')throw new Error('unsupported');const start=parseICSDate(props.DTSTART);if(!start)throw new Error('date');const end=parseICSDate(props.DTEND);let endDate=end?.date||start.date;if(start.allDay&&end)endDate=addDays(endDate,-1);if(endDate<start.date)endDate=start.date;const title=icsUnescape(props.SUMMARY?.value||'Evento importado').slice(0,160);const desc=icsUnescape(props.DESCRIPTION?.value||'').slice(0,5000);events.push({id:uid('event'),icsUid:icsUnescape(props.UID?.value||uid('ics')).slice(0,200),title,description:desc,date:start.date,endDate,time:start.time,endTime:end?.time||'',allDay:start.allDay,memberId:'',category:'Importado',revision:Number(props.SEQUENCE?.value)||0});}catch(_){skipped++;}props=null;continue;}
      if(line.startsWith('BEGIN:')){depth++;continue;}if(line.startsWith('END:')){depth--;continue;}if(depth>0)continue;const pos=line.indexOf(':');if(pos<0)continue;const key=line.slice(0,pos);props[key.split(';')[0].toUpperCase()]={params:key,value:line.slice(pos+1)};
    }
    return {events,skipped};
  }
  function parseICSDate(p){if(!p)return null;const v=p.value;const match=v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);if(!match)throw new Error('date');const d=`${match[1]}-${match[2]}-${match[3]}`;if(!validDate(d))throw new Error('date');if(!match[4])return{date:d,time:'',allDay:true};const h=+match[4],m=+match[5];if(h>23||m>59)throw new Error('time');let dt=new Date(`${d}T${match[4]}:${match[5]}:${match[6]||'00'}${match[7]||''}`);const zone=p.params.match(/TZID="?([^;"\s]+)"?/i)?.[1];if(zone&&!match[7]){const wall=Date.UTC(+match[1],+match[2]-1,+match[3],h,m,+(match[6]||0));let ts=wall;for(let i=0;i<3;i++){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ts));const map=Object.fromEntries(parts.map(x=>[x.type,x.value]));const actual=Date.UTC(+map.year,+map.month-1,+map.day,+map.hour,+map.minute,+map.second);ts+=wall-actual;}dt=new Date(ts);}if(isNaN(dt))throw new Error('date');return{date:iso(dt),time:pad(dt.getHours())+':'+pad(dt.getMinutes()),allDay:false};}
  /* v2: integer-cent family ledger and local household modules. */
  const nowStamp=()=>new Date().toISOString();
  const requireAdult=a=>{if(a?.role!=='adult')throw new Error('Esta acci\u00f3n necesita un adulto.');};
  const ownOrAdult=(a,mid)=>{if(a?.role!=='adult'&&a?.memberId!==mid)throw new Error('Este espacio pertenece a otra persona.');};
  const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  // Legacy finance.labs records are kept inert for lossless schema-2 backup import.
  function resetV2(s){s.schemaVersion=2;s.finance={accounts:[],ledger:[],dues:[],requests:[],goals:[],labs:[]};s.routines=[];s.absences=[];s.swaps=[];s.preparations=[];s.pantry=[];s.vouchers=[];s.meetings=[];s.houseLog=[];return s;}
  function upgradeState(s){if(!s||s.schemaVersion!==1)return s;resetV2(s);syncVouchers(s,true);return s;}
  function logHouse(s,action){s.houseLog.unshift({id:uid('log'),at:nowStamp(),action:String(action).slice(0,500)});if(s.houseLog.length>500)s.houseLog.length=500;}
  function seedV2(s,today){upgradeState(s);for(const mid of ['ana','leo']){s.finance.accounts.push({memberId:mid,weeklyCents:300,payDay:6,savePercent:50,policy:'fixed',enabled:true,since:monday(today)});postMoney(s,mid,{available:mid==='ana'?850:400,savings:mid==='ana'?500:250},'opening','Saldo de ejemplo. No representa dinero real.','demo-'+mid,{role:'adult'});}
    s.finance.goals.push({id:'goal_skates',memberId:'ana',title:'Mis patines',icon:'\u{1F6FC}',targetCents:2500,createdAt:nowStamp(),completedAt:null});
    postMoney(s,'ana',{savings:-300,'goal:goal_skates':300},'transfer','Primer ahorro para los patines','demo-saving',{role:'adult'});
    s.routines=[{id:'routine_ana_am',memberId:'ana',title:'Buenos d\u00edas',icon:'\u2600\uFE0F',period:'morning',templateIds:['cama','mesa'],active:true},{id:'routine_leo_pm',memberId:'leo',title:'Al llegar a casa',icon:'\u{1F392}',period:'afternoon',templateIds:['juguetes','plantas'],active:true}];
    s.pantry=[{id:'pantry_pasta',name:'Pasta',quantity:500,unit:'g',category:'Despensa',expires:''},{id:'pantry_huevos',name:'Huevos',quantity:4,unit:'ud',category:'L\u00e1cteos y huevos',expires:addDays(today,4)},{id:'pantry_mozzarella',name:'Mozzarella',quantity:150,unit:'g',category:'L\u00e1cteos y huevos',expires:addDays(today,3)}];
    syncV2(s,today);return s;
  }
  function moneyCents(v){const str=String(v??'').trim().replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(str))throw new Error('Usa un importe positivo con un m\u00e1ximo de dos decimales.');const n=Math.round(Number(str)*100);if(!Number.isSafeInteger(n)||n<=0||n>100000000)throw new Error('Importe fuera de rango.');return n;}
  function balances(s,mid){const b={available:0,savings:0};for(const e of s.finance.ledger)if(e.memberId===mid)for(const [k,n] of Object.entries(e.delta))b[k]=(b[k]||0)+n;return {...b,total:Object.values(b).reduce((a,n)=>a+n,0),saved:Object.entries(b).filter(([k])=>k!=='available').reduce((a,[,n])=>a+n,0)};}
  function validPocket(s,mid,p){return ['available','savings'].includes(p)||(p.startsWith('goal:')&&s.finance.goals.some(g=>'goal:'+g.id===p&&g.memberId===mid));}
  function postMoney(s,mid,delta,type,note,ref,a){
    ownOrAdult(a,mid);if(type!=='transfer')requireAdult(a);
    if(!s.members.some(m=>m.id===mid))throw new Error('Monedero no encontrado.');
    if(ref&&s.finance.ledger.some(e=>e.ref===ref))return false;
    if(!String(note).trim()||String(note).length>300)throw new Error('Escribe un concepto de hasta 300 caracteres.');
    const b=balances(s,mid),values=Object.values(delta);
    if(!values.length||!values.some(n=>n!==0)||values.some(n=>!Number.isSafeInteger(n)||Math.abs(n)>100000000))throw new Error('Movimiento no v\u00e1lido.');
    if(type==='transfer'&&values.reduce((n,x)=>n+x,0)!==0)throw new Error('El reparto debe conservar el dinero.');
    for(const [k,n] of Object.entries(delta))if(!validPocket(s,mid,k)||(b[k]||0)+n<0)throw new Error('No hay saldo suficiente en ese bolsillo.');
    const e={id:uid('money'),memberId:mid,type,delta:copy(delta),note:String(note).trim(),ref:ref||uid('ref'),at:nowStamp(),actorRole:a.role};s.finance.ledger.push(e);return e;
  }
  function transferMoney(s,mid,from,to,amount,a,note='Repartir mi dinero'){
    ownOrAdult(a,mid);if(from===to||!Number.isSafeInteger(amount)||amount<=0)throw new Error('Revisa el importe y los bolsillos.');
    return postMoney(s,mid,{[from]:-amount,[to]:amount},'transfer',note,null,a);
  }
  function addGoal(s,input,a){ownOrAdult(a,input.memberId);if(!input.title?.trim()||input.title.length>100||!Number.isSafeInteger(input.targetCents)||input.targetCents<=0||input.targetCents>100000000)throw new Error('Revisa el nombre y el precio del objetivo.');const g={...input,id:uid('goal'),createdAt:nowStamp(),completedAt:null};s.finance.goals.push(g);return g;}
  function configureAllowance(s,input,a,today=iso()){
    requireAdult(a);if(!s.members.some(m=>m.id===input.memberId&&m.active!==false))throw new Error('Miembro no disponible.');
    if(!Number.isInteger(input.weeklyCents)||input.weeklyCents<0||input.weeklyCents>100000||!Number.isInteger(input.payDay)||input.payDay<0||input.payDay>6||!Number.isInteger(input.savePercent)||input.savePercent<0||input.savePercent>100||!['fixed','goal'].includes(input.policy))throw new Error('Revisa la configuraci\u00f3n de la paga.');
    const old=s.finance.accounts.find(x=>x.memberId===input.memberId);if(old?.enabled)syncAllowanceDues(s,today);const resuming=old&&!old.enabled&&input.enabled;const value={...input,since:resuming?monday(today):old?.since||monday(today)};if(resuming)delete old.lastScheduledWeek;
    if(old)Object.assign(old,value);else s.finance.accounts.push(value);syncAllowanceDues(s,today);
    logHouse(s,'Configuraci\u00f3n de paga actualizada. Los abonos ya previstos conservan su importe.');
  }
  function syncAllowanceDues(s,today=iso()){
    let changed=false;for(const a of s.finance.accounts){if(!a.enabled||!a.weeklyCents||!s.members.some(m=>m.id===a.memberId&&m.active!==false))continue;
      let start=a.lastScheduledWeek?addDays(a.lastScheduledWeek,7):a.since;
      for(let count=0;start<=monday(today)&&count<520;count++,start=addDays(start,7)){
        const day=addDays(start,a.payDay);if(day>today)break;const id=a.memberId+'@'+start;
        if(!s.finance.dues.some(d=>d.id===id)){s.finance.dues.push({id,memberId:a.memberId,week:start,date:day,cents:a.weeklyCents,savePercent:a.savePercent,policy:a.policy,status:'pending',createdAt:nowStamp()});changed=true;}
        a.lastScheduledWeek=start;
      }
    }return changed;
  }
  function payAllowance(s,id,a,today=iso()){
    requireAdult(a);const d=s.finance.dues.find(d=>d.id===id);if(!d)throw new Error('Paga no encontrada.');if(d.status==='paid')return false;if(d.status!=='pending'||d.date>today)throw new Error('Esta paga no est\u00e1 disponible.');
    if(d.policy==='goal'){const w=s.weeks.find(w=>w.start===d.week),st=w?stats(w,d.memberId):null;if(!st||!st.target||st.points<st.target)throw new Error('El objetivo de esa semana a\u00fan no se ha alcanzado. La paga sigue pendiente.');}
    const savings=Math.round(d.cents*d.savePercent/100),entry=postMoney(s,d.memberId,{available:d.cents-savings,savings},'allowance','Paga de la semana '+d.week,'pay:'+d.id,a);d.status='paid';d.paidAt=nowStamp();d.ledgerId=entry?.id||s.finance.ledger.find(e=>e.ref==='pay:'+d.id)?.id;return entry;
  }
  function requestSpend(s,input,a){ownOrAdult(a,input.memberId);const pocket=input.pocket||'available';if(!Number.isSafeInteger(input.cents)||input.cents<=0||!String(input.note).trim()||input.note.length>300||!validPocket(s,input.memberId,pocket))throw new Error('Revisa la solicitud.');if((balances(s,input.memberId)[pocket]||0)<input.cents)throw new Error('Ese bolsillo no tiene saldo suficiente.');const r={...input,pocket,id:uid('request'),status:'pending',createdAt:nowStamp()};s.finance.requests.push(r);return r;}
  function resolveSpend(s,id,approve,a){requireAdult(a);const r=s.finance.requests.find(r=>r.id===id);if(!r||r.status!=='pending')return false;if(approve){postMoney(s,r.memberId,{[r.pocket]:-r.cents},'spend',r.note,'spend:'+r.id,a);r.status='approved';if(r.pocket.startsWith('goal:')){const g=s.finance.goals.find(g=>'goal:'+g.id===r.pocket);if(g&&r.finishGoal){const left=balances(s,r.memberId)[r.pocket]||0;if(left)postMoney(s,r.memberId,{[r.pocket]:-left,savings:left},'transfer','Resto del objetivo a la hucha','goal-rest:'+r.id,a);g.completedAt=nowStamp();}}}else r.status='declined';r.resolvedAt=nowStamp();return true;}
  function reverseMoney(s,id,reason,a){requireAdult(a);const e=s.finance.ledger.find(e=>e.id===id);if(!e||e.type==='reversal')throw new Error('Movimiento no anulable.');if(s.finance.ledger.some(x=>x.ref==='reverse:'+id))return false;const delta=Object.fromEntries(Object.entries(e.delta).map(([k,v])=>[k,-v]));const result=postMoney(s,e.memberId,delta,'reversal','Correcci\u00f3n: '+String(reason).trim(),'reverse:'+id,a);const req=s.finance.requests.find(r=>e.ref==='spend:'+r.id&&r.finishGoal);if(req){const g=s.finance.goals.find(g=>'goal:'+g.id===req.pocket);if(g)g.completedAt=null;}return result;}
  function syncVouchers(s,legacy=false){let changed=false;for(const w of s.weeks)for(const r of w.rewards)if(r.claimedAt&&!s.vouchers.some(v=>v.source===w.id+'@'+r.id)){s.vouchers.push({id:uid('voucher'),source:w.id+'@'+r.id,memberId:r.memberId,title:r.title,icon:r.icon,week:w.id,status:legacy?'used':'earned',issuedAt:r.claimedAt,usedAt:legacy?r.claimedAt:null});changed=true;}return changed;}
  function requestVoucher(s,id,dateValue,a){const v=s.vouchers.find(v=>v.id===id);if(!v)throw new Error('Vale no encontrado.');ownOrAdult(a,v.memberId);if(!['earned','requested'].includes(v.status)||!validDate(dateValue)||dateValue<iso())throw new Error('Elige un d\u00eda de hoy en adelante para un vale pendiente.');v.requestedDate=dateValue;v.status='requested';}
  function approveVoucher(s,id,a){requireAdult(a);const v=s.vouchers.find(v=>v.id===id);if(!v||v.status!=='requested')return false;const eid='voucher-'+v.id;if(!s.events.some(e=>e.id===eid))s.events.push({id:eid,title:v.title,date:v.requestedDate,endDate:v.requestedDate,time:'',endTime:'',allDay:true,memberId:v.memberId,category:'Recompensa',description:'Vale de Family Points. Semana '+v.week,revision:0});v.eventId=eid;v.status='scheduled';return true;}
  function useVoucher(s,id,a){requireAdult(a);const v=s.vouchers.find(v=>v.id===id);if(!v||v.status==='used')return false;if(!['earned','requested','scheduled'].includes(v.status))throw new Error('Vale no disponible.');v.status='used';v.usedAt=nowStamp();return true;}
  function routineTasks(s,r,day=iso()){const w=s.weeks.find(w=>w.start===monday(day));if(!w)return [];return r.templateIds.flatMap(tid=>w.tasks.filter(t=>t.templateId===tid&&t.memberId===r.memberId&&t.date===day));}
  function addAbsence(s,input,a){requireAdult(a);if(!validDate(input.from)||!validDate(input.to)||input.to<input.from||input.from<monday()||!input.reason?.trim()||!s.members.some(m=>m.id===input.memberId))throw new Error('Revisa persona, fechas y motivo. No se cambia el historial cerrado.');const x={...input,id:uid('absence'),active:true,createdAt:nowStamp()};s.absences.push(x);applyAbsences(s);logHouse(s,'Ausencia justificada: '+input.reason);return x;}
  function applyAbsences(s){for(const x of s.absences||[]){if(!x.active)continue;for(const w of s.weeks.filter(w=>w.status==='open'))for(const t of w.tasks)if(t.memberId===x.memberId&&t.date>=x.from&&t.date<=x.to&&t.kind==='normal'&&['pending','review'].includes(t.status)){t.beforeExcuse=t.status;t.status='excused';t.absenceId=x.id;t.excuse=x.reason;}}}
  function cancelAbsence(s,id,a){requireAdult(a);const x=s.absences.find(x=>x.id===id);if(!x||!x.active)return false;x.active=false;for(const w of s.weeks.filter(w=>w.status==='open'))for(const t of w.tasks)if(t.absenceId===id&&t.status==='excused'){t.status=t.beforeExcuse||'pending';delete t.absenceId;delete t.excuse;}applyAbsences(s);return true;}
  function proposeSwap(s,week,taskA,taskB,a){const w=s.weeks.find(w=>w.id===week),ta=w?.tasks.find(t=>t.id===taskA),tb=w?.tasks.find(t=>t.id===taskB);if(!w||w.status!=='open'||!ta||!tb||ta.memberId===tb.memberId||[ta,tb].some(t=>t.status!=='pending'||t.kind!=='normal'))throw new Error('Escoge dos tareas normales pendientes de personas distintas.');ownOrAdult(a,ta.memberId);if(s.swaps.some(x=>x.week===week&&['pending','accepted'].includes(x.status)&&[x.taskA,x.taskB].some(id=>[taskA,taskB].includes(id))))throw new Error('Una de estas tareas ya tiene un cambio pendiente.');const x={id:uid('swap'),week,taskA,taskB,from:ta.memberId,to:tb.memberId,status:'pending',createdAt:nowStamp()};s.swaps.push(x);return x;}
  function resolveSwap(s,id,action,a){const x=s.swaps.find(x=>x.id===id);if(!x)throw new Error('Cambio no encontrado.');if(action==='accept'){if(a.role!=='adult'&&a.memberId!==x.to)throw new Error('La otra persona debe aceptar el cambio.');if(x.status!=='pending')return false;x.status='accepted';return true;}if(action==='decline'){if(a.role!=='adult'&&![x.from,x.to].includes(a.memberId))throw new Error('Cambio de otra persona.');if(!['pending','accepted'].includes(x.status))return false;x.status='declined';return true;}requireAdult(a);if(x.status!=='accepted')throw new Error('Primero debe aceptarlo la otra persona.');const w=s.weeks.find(w=>w.id===x.week),ta=w?.tasks.find(t=>t.id===x.taskA),tb=w?.tasks.find(t=>t.id===x.taskB);if(w?.status!=='open'||!ta||!tb||ta.memberId!==x.from||tb.memberId!==x.to||[ta,tb].some(t=>t.status!=='pending'))throw new Error('Las tareas han cambiado. Anula la propuesta y crea otra.');[ta.memberId,tb.memberId]=[tb.memberId,ta.memberId];x.status='approved';x.approvedAt=nowStamp();logHouse(s,'Intercambio de tareas confirmado por un adulto.');return true;}
  const PREP_SETS={excursion:['Preparar la mochila','Llenar la botella de agua','Revisar lo que debemos llevar'],piscina:['Bañador','Toalla','Mochila preparada'],deporte:['Ropa de deporte','Botella de agua','Zapatillas'],cumple:['Confirmar lugar y hora','Preparar el regalo','Organizar c\u00f3mo llegar']};
  function createPrep(s,eventId,mid,titles,a){requireAdult(a);if(!s.events.some(e=>e.id===eventId)||!s.members.some(m=>m.id===mid)||!titles.length||titles.length>30||titles.some(t=>!t.trim()||t.length>160))throw new Error('Revisa el plan y su lista.');let p=s.preparations.find(p=>p.eventId===eventId);if(p)throw new Error('Este plan ya tiene una preparaci\u00f3n.');p={id:uid('prep'),eventId,memberId:mid,items:titles.map(t=>({id:uid('check'),title:t.trim(),done:false}))};s.preparations.push(p);return p;}
  function togglePrep(s,id,itemId,a){const p=s.preparations.find(p=>p.id===id);if(!p)throw new Error('Lista no encontrada.');ownOrAdult(a,p.memberId);const item=p.items.find(i=>i.id===itemId);if(item)item.done=!item.done;}
  const UNIT_MAP={g:['g',1],kg:['g',1000],ml:['ml',1],l:['ml',1000],ud:['ud',1],uds:['ud',1],unidad:['ud',1],unidades:['ud',1]};
  function quantity(q){const m=String(q).trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)$/);if(!m)return null;const u=UNIT_MAP[norm(m[2])];return u?{n:Math.round(Number(m[1].replace(',','.'))*u[1]*1000)/1000,unit:u[0]}:null;}
  const qtyLabel=(n,u)=>`${Math.round(n*1000)/1000} ${u}`;
  function stock(s,name,unit,today=iso()){return s.pantry.filter(p=>norm(p.name)===norm(name)&&(!p.expires||p.expires>=today)).reduce((n,p)=>{const q=quantity(p.quantity+' '+p.unit);return n+(q?.unit===unit?q.n:0);},0);}
  function missingIngredients(s,plans,today=iso()){
    const grouped=new Map(),manual=[];
    for(const p of plans){const r=s.recipes.find(r=>r.id===p.recipeId);if(!r||p.pantryUsedAt)continue;for(const i of r.ingredients){const q=quantity(scaleQuantity(i.quantity,p.servings/r.servings));if(!q){manual.push({name:i.name,quantity:scaleQuantity(i.quantity,p.servings/r.servings),category:i.category||'Despensa'});continue;}const key=norm(i.name)+'@'+q.unit;const row=grouped.get(key)||{name:i.name,unit:q.unit,need:0,category:i.category||'Despensa'};row.need+=q.n;grouped.set(key,row);}}
    const rows=[...grouped.values()].map(row=>{const have=stock(s,row.name,row.unit,today),listed=s.shopping.filter(x=>!x.checked&&norm(x.name)===norm(row.name)).reduce((n,x)=>{const q=quantity(x.quantity);return n+(q?.unit===row.unit?q.n:0);},0);return {...row,have,listed,missing:Math.max(0,Math.round((row.need-have-listed)*1000)/1000)};});return {rows,manual};
  }
  function addMissing(s,plans){const preview=missingIngredients(s,plans);let n=0;for(const r of preview.rows){if(r.missing<=0)continue;const x=s.shopping.find(x=>!x.checked&&norm(x.name)===norm(r.name)&&quantity(x.quantity)?.unit===r.unit);if(x){const q=quantity(x.quantity);x.quantity=qtyLabel(q.n+r.missing,r.unit);}else s.shopping.push({id:uid('shop'),name:r.name,quantity:qtyLabel(r.missing,r.unit),category:r.category,checked:false});n++;}return {count:n,manual:preview.manual.length};}
  function receiveShopping(s,a){requireAdult(a);let moved=0,manual=0;for(const x of s.shopping.filter(x=>x.checked&&!x.receivedAt)){const q=quantity(x.quantity);if(!q){manual++;continue;}let p=s.pantry.find(p=>norm(p.name)===norm(x.name)&&p.unit===q.unit&&!p.expires);if(p)p.quantity=Math.round((p.quantity+q.n)*1000)/1000;else s.pantry.push({id:uid('pantry'),name:x.name,quantity:q.n,unit:q.unit,expires:'',category:x.category});x.receivedAt=nowStamp();moved++;}return {moved,manual};}
  function consumeMeal(s,planId,a){requireAdult(a);const p=s.mealPlan.find(p=>p.id===planId);if(!p||p.pantryUsedAt)return false;const needs=missingIngredients({...s,shopping:[]},[p]);for(const row of needs.rows){let left=row.need;const items=s.pantry.filter(x=>norm(x.name)===norm(row.name)&&(!x.expires||x.expires>=iso())).sort((a,b)=>(a.expires||'9999').localeCompare(b.expires||'9999'));for(const x of items){const q=quantity(x.quantity+' '+x.unit);if(!q||q.unit!==row.unit)continue;const take=Math.min(q.n,left);x.quantity=Math.round((q.n-take)/UNIT_MAP[x.unit][1]*1000)/1000;left=Math.round((left-take)*1000)/1000;if(left<=0)break;}}p.pantryUsedAt=nowStamp();return true;}
  function meeting(s,week=monday(),create=false){let m=s.meetings.find(x=>x.week===week);if(!m&&create){m={id:uid('meeting'),week,notes:[],proposals:[],closedAt:null};s.meetings.push(m);}return m||{week,notes:[],proposals:[],closedAt:null};}
  function addProposal(s,week,title,mid,a){ownOrAdult(a,mid);if(!title?.trim()||title.length>160)throw new Error('Escribe una propuesta de hasta 160 caracteres.');const m=meeting(s,week,true);if(m.closedAt)throw new Error('La reuni\u00f3n est\u00e1 cerrada.');m.proposals.push({id:uid('proposal'),title:title.trim(),memberId:mid,approved:a.role==='adult',votes:[]});}
  function voteProposal(s,week,id,mid,a){ownOrAdult(a,mid);const m=meeting(s,week,true),p=m.proposals.find(p=>p.id===id);if(m.closedAt||!p?.approved)throw new Error('La votaci\u00f3n no est\u00e1 disponible.');for(const other of m.proposals)other.votes=other.votes.filter(v=>v!==mid);p.votes.push(mid);}
  function syncV2(s,today=iso()){if(!s.finance)return false;const a=syncAllowanceDues(s,today),b=syncVouchers(s);applyAbsences(s);return a||b;}
  function validateV2(s){
    const check=(v,msg)=>{if(!v)throw new Error('Copia v2 no v\u00e1lida: '+msg);},str=(x,max=300)=>typeof x==='string'&&x.length<=max,mid=id=>s.members.some(m=>m.id===id),array=(x,max=50000)=>Array.isArray(x)&&x.length<=max;
    check(s.schemaVersion===2&&s.finance,'estructura.');
    for(const k of ['accounts','ledger','dues','requests','goals','labs'])check(array(s.finance[k]),'dinero / '+k);
    for(const k of ['routines','absences','swaps','preparations','pantry','vouchers','meetings','houseLog'])check(array(s[k]),k);
    const unique=(xs,key='id')=>check(new Set(xs.map(x=>x[key])).size===xs.length,'identificadores repetidos.');
    for(const k of ['ledger','dues','requests','goals']){unique(s.finance[k]);for(const x of s.finance[k])check(str(x.id,200)&&/^[\w.:@-]+$/.test(x.id),'identificador financiero.');}
    unique(s.finance.accounts,'memberId');unique(s.finance.labs,'memberId');unique(s.finance.ledger,'ref');
    for(const a of s.finance.accounts)check(mid(a.memberId)&&Number.isInteger(a.weeklyCents)&&a.weeklyCents>=0&&a.weeklyCents<=100000&&Number.isInteger(a.savePercent)&&a.savePercent>=0&&a.savePercent<=100&&Number.isInteger(a.payDay)&&a.payDay>=0&&a.payDay<=6&&['fixed','goal'].includes(a.policy)&&typeof a.enabled==='boolean'&&validDate(a.since)&&monday(a.since)===a.since&&(!a.lastScheduledWeek||validDate(a.lastScheduledWeek)),'configuraci\u00f3n de paga.');
    for(const g of s.finance.goals)check(mid(g.memberId)&&str(g.title,100)&&g.title.trim()&&str(g.icon,20)&&Number.isSafeInteger(g.targetCents)&&g.targetCents>0&&g.targetCents<=100000000,'objetivo de ahorro.');
    const running=Object.create(null);for(const e of s.finance.ledger){check(mid(e.memberId)&&str(e.ref,250)&&str(e.note,300)&&str(e.at,60)&&['opening','allowance','deposit','spend','transfer','reversal','bonus'].includes(e.type)&&e.delta&&typeof e.delta==='object'&&!Array.isArray(e.delta),'movimiento.');running[e.memberId]||={};check(Object.keys(e.delta).length>0&&Object.keys(e.delta).length<100,'bolsillos.');for(const [k,v]of Object.entries(e.delta)){check(validPocket(s,e.memberId,k)&&Number.isSafeInteger(v)&&Math.abs(v)<=100000000,'c\u00e9ntimos.');running[e.memberId][k]=(running[e.memberId][k]||0)+v;check(Number.isSafeInteger(running[e.memberId][k])&&running[e.memberId][k]>=0,'saldo negativo.');}if(e.type==='transfer')check(Object.values(e.delta).reduce((n,x)=>n+x,0)===0,'transferencia desequilibrada.');}
    for(const d of s.finance.dues)check(mid(d.memberId)&&validDate(d.week)&&validDate(d.date)&&monday(d.date)===d.week&&Number.isInteger(d.cents)&&d.cents>0&&d.cents<=100000&&Number.isInteger(d.savePercent)&&d.savePercent>=0&&d.savePercent<=100&&['fixed','goal'].includes(d.policy)&&['pending','paid','skipped'].includes(d.status)&&(d.status!=='paid'||s.finance.ledger.some(e=>e.ref==='pay:'+d.id)),'abono semanal.');
    for(const r of s.finance.requests)check(mid(r.memberId)&&validPocket(s,r.memberId,r.pocket)&&Number.isSafeInteger(r.cents)&&r.cents>0&&r.cents<=100000000&&str(r.note,300)&&['pending','approved','declined'].includes(r.status),'solicitud de gasto.');
    for(const l of s.finance.labs)check(mid(l.memberId)&&Number.isInteger(l.round)&&l.round>=0&&l.round<=4&&[l.reserve,l.a,l.b].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000)&&array(l.history,10),'datos heredados de la copia.');
    for(const k of ['routines','absences','swaps','preparations','pantry','vouchers','meetings','houseLog']){unique(s[k]);for(const x of s[k])check(str(x.id,200)&&/^[\w.:@-]+$/.test(x.id),'identificador '+k);}
    for(const r of s.routines)check(mid(r.memberId)&&str(r.title,100)&&str(r.icon,20)&&array(r.templateIds,100)&&r.templateIds.every(x=>str(x,200)),'rutina.');
    for(const x of s.absences)check(mid(x.memberId)&&validDate(x.from)&&validDate(x.to)&&x.to>=x.from&&str(x.reason,300)&&typeof x.active==='boolean','ausencia.');
    for(const x of s.swaps)check(validDate(x.week)&&mid(x.from)&&mid(x.to)&&str(x.taskA,200)&&str(x.taskB,200)&&['pending','accepted','approved','declined'].includes(x.status),'intercambio.');
    for(const p of s.preparations)check(mid(p.memberId)&&str(p.eventId,200)&&array(p.items,30)&&p.items.every(i=>str(i.id,200)&&str(i.title,160)&&typeof i.done==='boolean'),'preparaci\u00f3n.');
    for(const p of s.pantry)check(str(p.name,160)&&p.name.trim()&&Number.isFinite(p.quantity)&&p.quantity>=0&&p.quantity<=1000000&&Object.keys(UNIT_MAP).includes(p.unit)&&str(p.category,80)&&(!p.expires||validDate(p.expires)),'despensa.');
    unique(s.vouchers,'source');for(const v of s.vouchers)check(mid(v.memberId)&&str(v.title,160)&&str(v.icon,20)&&str(v.source,400)&&validDate(v.week)&&['earned','requested','scheduled','used'].includes(v.status)&&(!v.requestedDate||validDate(v.requestedDate)),'vale.');
    unique(s.meetings,'week');for(const m of s.meetings){check(validDate(m.week)&&array(m.notes,100)&&array(m.proposals,1000),'reuni\u00f3n.');for(const n of m.notes)check(mid(n.memberId)&&str(n.worked,1000)&&str(n.change,1000)&&str(n.thanks,1000),'notas.');for(const p of m.proposals)check(str(p.id,200)&&mid(p.memberId)&&str(p.title,160)&&array(p.votes,100)&&new Set(p.votes).size===p.votes.length&&p.votes.every(mid),'propuesta.');const votes=m.proposals.flatMap(p=>p.votes);check(new Set(votes).size===votes.length,'un solo voto por persona.');}
    for(const t of s.templates)check((t.requiresReview==null||typeof t.requiresReview==='boolean')&&(!t.rotationStart||validDate(t.rotationStart)),'opciones de tarea.');
    return s;
  }

  return Object.freeze({iso,date,validDate,addDays,monday,uid,copy,contribution,memberSnapshot,generateWeek,appendTemplate,syncTemplate,closeWeek,rollover,stats,rewardState,setStatus,addRecovery,claimReward,validateState,seed,scaleQuantity,mergeQuantity,addIngredients,exportICS,parseICS,resetV2,upgradeState,syncV2,validateV2,logHouse,norm,moneyCents,balances,postMoney,transferMoney,addGoal,configureAllowance,syncAllowanceDues,payAllowance,requestSpend,resolveSpend,reverseMoney,syncVouchers,requestVoucher,approveVoucher,useVoucher,routineTasks,addAbsence,applyAbsences,cancelAbsence,proposeSwap,resolveSwap,PREP_SETS,createPrep,togglePrep,quantity,qtyLabel,stock,missingIngredients,addMissing,receiveShopping,consumeMeal,meeting,addProposal,voteProposal});
});
