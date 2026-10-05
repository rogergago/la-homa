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
  function ageFromBirthday(b, today = iso()) {
    if (!validDate(b) || !validDate(today) || b > today) return null;
    const bd = date(b), td = date(today);
    let age = td.getFullYear() - bd.getFullYear();
    const md = td.getMonth() - bd.getMonth();
    if (md < 0 || (md === 0 && td.getDate() < bd.getDate())) age -= 1;
    return age < 0 || age > 120 ? null : age;
  }
  function syncMemberAges(s) {
    if (!s?.members) return s;
    for (const m of s.members) {
      if (m.role === 'pet') { m.birthday = m.birthday || ''; continue; }
      if (m.birthday && validDate(m.birthday) && m.birthday <= iso()) {
        const a = ageFromBirthday(m.birthday);
        if (a != null) m.age = a;
      } else if (m.birthday === undefined) m.birthday = '';
    }
    return s;
  }
  const memberSnapshot = m => {const o={id:m.id,name:m.name,avatar:m.avatar,photo:m.photo||'',color:m.color,role:m.role,age:m.age??null,birthday:m.birthday||'',phone:m.phone||''};if(m.role==='pet')o.species=String(m.species||'otro').slice(0,40);return o;};
  function generateWeek(state, start) {
    if (state.weeks.some(w=>w.start===start)) return state.weeks.find(w=>w.start===start);
    const members=state.members.filter(m=>m.active!==false);
    const w={id:start,start,end:addDays(start,6),status:'open',createdAt:new Date().toISOString(),closedAt:null,members:members.map(memberSnapshot),tasks:[],adjustments:[],rewards:[]};
    for (const t of state.templates.filter(t=>t.active!==false)) appendTemplate(w,t,members,null,state);
    w.rewards=state.rewards.filter(r=>r.active!==false && members.some(m=>m.id===r.memberId)).map(r=>({...copy(r),claimedAt:null,pointsAtClaim:null}));
    state.weeks.push(w);
    applyAbsences(state);
    return w;
  }
  function appendTemplate(w,t,members,minDate=null,state=null) {
    if(['flexible','monthly'].includes(t.frequency)){flexAppend(w,t,members,minDate,state);return;}
    const eligible=t.memberIds.filter(id=>members.some(m=>m.id===id&&m.active!==false&&m.role!=='pet'));
    const wi=Math.round((Date.parse(w.start+'T00:00:00Z')-Date.parse((t.rotationStart||'2026-01-05')+'T00:00:00Z'))/604800000);
    const assigned=t.rotation&&eligible.length?[eligible[((wi%eligible.length)+eligible.length)%eligible.length]]:t.memberIds;
    for(const mid of assigned) {
      if (!members.some(m=>m.id===mid && m.active!==false && m.role!=='pet')) continue;
      if (!w.members.some(m=>m.id===mid)) w.members.push(memberSnapshot(members.find(m=>m.id===mid)));
      for (const day of [...new Set(t.days)].sort()) {
        const d=addDays(w.start,day), id=`${w.id}_${t.id}_${mid}_${day}`;
        if ((minDate && d<minDate) || w.tasks.some(x=>x.id===id)) continue;
        w.tasks.push({id,templateId:t.id,memberId:mid,date:d,title:t.title,description:t.description||'',points:t.points,category:t.category||'Casa',icon:t.icon||'house',kind:'normal',status:'pending',requiresReview:!!t.requiresReview,allowEarly:!!t.allowEarly,changedAt:null});
      }
    }
  }
  function syncTemplate(state,t,minDate=iso()) {
    const w=state.weeks.find(w=>w.start===monday(minDate));
    if(!w||w.status!=='open') return;
    w.tasks=w.tasks.filter(x=>!(x.templateId===t.id && x.status==='pending' && x.date>=minDate));
    if(t.active!==false) appendTemplate(w,t,state.members,minDate,state);
    applyAbsences(state);
  }
  function closeWeek(w, markMissed=true) {
    if(w.status==='closed') return false;
    if(markMissed) for(const t of w.tasks) if(t.kind==='normal'&&t.status==='pending') { t.status='missed'; t.changedAt=new Date().toISOString(); }
    w.status='closed'; w.closedAt=new Date().toISOString(); return true;
  }
  function rollover(state, today=iso()) {
    applyAbsences(state);
    const current=monday(today);
    let changed=false;
    for(const w of state.weeks) if(w.start<current && w.status==='open') { closeWeek(w,state.settings.closePending!==false); changed=true; }
    // Do not invent activity for weeks in which the application was never used.
    if(!state.weeks.some(w=>w.start===current)) {generateWeek(state,current);changed=true;}
    if(syncV2(state,today))changed=true;
    return changed;
  }
  function legacyHomaStats(w,mid) {
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
  function legacyHomaSetStatus(w,id,status,actor={role:'adult'}) {
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
    if(w.members.find(m=>m.id===input.memberId)?.role==='pet') throw new Error('Las mascotas no suman puntos.');
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
    if([1,2].includes(s?.schemaVersion))upgradeState(s);ensureV3(s);
    function check(v,msg){if(!v)throw new Error('Copia no válida: '+msg);}
    check(s&&typeof s==='object'&&s.schemaVersion===3,'version no compatible.');
    for(const k of ['members','templates','rewards','weeks','shopping','recipes','mealPlan','events']) check(Array.isArray(s[k])&&s[k].length<=20000,k+'.');
    check(s.settings&&text(s.settings.familyName,80)&&text(s.settings.teamReward,160)&&Number.isInteger(s.settings.teamTarget)&&s.settings.teamTarget>=0&&s.settings.teamTarget<=100000,'configuración.');
    const ids=(arr,k)=>{check(new Set(arr.map(x=>x.id)).size===arr.length,'identificadores repetidos en '+k);for(const x of arr) check(text(x.id,200)&&/^[A-Za-z0-9_.:@-]+$/.test(x.id),'identificador.');};
    for(const k of ['members','templates','rewards','weeks','shopping','recipes','mealPlan','events']) ids(s[k],k);
    const member=m=>check(text(m.name,80)&&m.name.trim()&&text(m.avatar,20)&&/^#[0-9a-f]{6}$/i.test(m.color)&&['adult','member','pet'].includes(m.role)&&(m.age==null||(Number.isInteger(m.age)&&m.age>=0&&m.age<=120))&&(m.birthday==null||m.birthday===''||(validDate(m.birthday)&&m.birthday<=iso()))&&(m.phone==null||(typeof m.phone==='string'&&m.phone.length<=40))&&(m.species==null||(typeof m.species==='string'&&m.species.length<=40)),'miembro.');
    s.members.forEach(member);
    syncMemberAges(s);
    check(s.settings.country==null||(typeof s.settings.country==='string'&&s.settings.country.length<=80),'país.');
    check(s.settings.province==null||(typeof s.settings.province==='string'&&s.settings.province.length<=80),'provincia.');
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
    validateV2(s);validateV3(s);validateEvents31(s);validateHoma(s);validateWeb5(s);
    // Identifiers end up inside HTML attributes; data synced by another adult must not be able to break out of them.
    const safeId=v=>v==null||v===''||Number.isFinite(v)||(typeof v==='string'&&v.length<=200&&/^[A-Za-z0-9_.:@-]+$/.test(v));
    const walk=(v,depth)=>{if(!v||typeof v!=='object')return;check(depth<=16,'estructura demasiado profunda.');if(Array.isArray(v)){for(const x of v)walk(x,depth+1);return;}for(const [k,x] of Object.entries(v)){if(k==='id'||/[a-z]Id$/.test(k))check(safeId(x),'identificador '+k+'.');else if(/[a-z]Ids$/.test(k)&&Array.isArray(x))check(x.every(safeId),'identificadores '+k+'.');else walk(x,depth+1);}};
    walk(s,0);
    return s;
  }
  function seed(today=iso()) {
    const s={schemaVersion:1,demo:true,createdAt:new Date().toISOString(),settings:{familyName:'Familia de ejemplo',teamTarget:180,teamReward:'Una tarde de juegos en familia',closePending:true,pin:null},members:[],templates:[],rewards:[],weeks:[],shopping:[],recipes:[],mealPlan:[],events:[]};
    const by=y=>{const d=date(today);d.setFullYear(d.getFullYear()-y);return iso(d);};
    s.members=[{id:'ana',name:'Ana',avatar:'\u{1F680}',color:'#8b6ce0',role:'member',age:10,birthday:by(10),active:true},{id:'leo',name:'Leo',avatar:'\u{1F981}',color:'#dc9860',role:'member',age:7,birthday:by(7),active:true},{id:'mama',name:'Mamá',avatar:'\u{1F33C}',color:'#5da896',role:'adult',age:null,birthday:'',active:true},{id:'papa',name:'Papá',avatar:'\u{1F43B}',color:'#6a9bcb',role:'adult',age:null,birthday:'',active:true}];
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
    for(const e of s.events){lines.push('BEGIN:VEVENT','UID:'+icsEscape(e.icsUid||e.id+'@familypoints.local'),'DTSTAMP:'+stamp,'SEQUENCE:'+(e.revision||0),'SUMMARY:'+icsEscape(e.title),'DESCRIPTION:'+icsEscape(e.description||''),'LOCATION:'+icsEscape(e.location||''));
      if(e.allDay||!e.time) lines.push('DTSTART;VALUE=DATE:'+compact(e.date),'DTEND;VALUE=DATE:'+compact(addDays(e.endDate||e.date,1)));
      else {lines.push('DTSTART:'+stampLocal(e.date,e.time));const endD=e.endDate||e.date; const endT=e.endTime||e.time;let end=new Date(endD+'T'+endT+':00');if(end<=new Date(e.date+'T'+e.time+':00'))end=new Date(new Date(e.date+'T'+e.time+':00').getTime()+3600000);lines.push('DTEND:'+end.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''));}
      lines.push('END:VEVENT');}
    if(withTasks) for(const w of s.weeks.filter(w=>!weekId||w.id===weekId)) for(const t of w.tasks){const name=w.members.find(m=>m.id===t.memberId)?.name||'';lines.push('BEGIN:VEVENT','UID:'+t.id+'@familypoints.local','DTSTAMP:'+stamp,'X-FAMILYPOINTS-TASK:TRUE','DTSTART;VALUE=DATE:'+compact(t.date),'DTEND;VALUE=DATE:'+compact(addDays(t.date,1)),'SUMMARY:'+icsEscape(name+': '+t.title),'DESCRIPTION:'+icsEscape(`${t.points} puntos. Estado: ${t.status==='done'?'Realizada':t.status==='missed'?'No realizada':t.status==='review'?'Por revisar':t.status==='excused'?'Justificada':'Pendiente'}. ${t.description||''}`),'END:VEVENT');}
    lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n';
  }
  function parseICS(raw){
    if(typeof raw!=='string'||raw.length>2000000||!raw.includes('BEGIN:VCALENDAR'))throw new Error('Selecciona un archivo ICS válido de menos de 2 MB.');
    const lines=raw.replace(/\r\n[ \t]|\n[ \t]/g,'').split(/\r?\n/),events=[];let props=null,depth=0,skipped=0;
    for(const line of lines){if(line==='BEGIN:VEVENT'){props={};depth=0;continue;}if(!props)continue;if(line==='END:VEVENT'){try{if(props.RRULE||props['RECURRENCE-ID']||props['X-FAMILYPOINTS-TASK']||props.STATUS?.value==='CANCELLED')throw new Error('unsupported');const start=parseICSDate(props.DTSTART);if(!start)throw new Error('date');const end=parseICSDate(props.DTEND);let endDate=end?.date||start.date;if(start.allDay&&end)endDate=addDays(endDate,-1);if(endDate<start.date)endDate=start.date;const title=icsUnescape(props.SUMMARY?.value||'Evento importado').slice(0,160);const desc=icsUnescape(props.DESCRIPTION?.value||'').slice(0,5000);events.push({id:uid('event'),icsUid:icsUnescape(props.UID?.value||uid('ics')).slice(0,200),title,description:desc,location:icsUnescape(props.LOCATION?.value||'').slice(0,300),date:start.date,endDate,time:start.time,endTime:end?.time||'',allDay:start.allDay,memberId:'',category:'Importado',revision:Number(props.SEQUENCE?.value)||0});}catch(_){skipped++;}props=null;continue;}
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
  function resetV2(s){s.schemaVersion=3;s.finance={accounts:[],ledger:[],dues:[],requests:[],goals:[],labs:[]};s.routines=[];s.absences=[];s.swaps=[];s.preparations=[];s.pantry=[];s.vouchers=[];s.meetings=[];s.houseLog=[];s.presencePlans=[];s.presenceOverrides=[];s.foods=[];return ensureV3(s);}
  function upgradeState(s){if(!s)return s;if(s.schemaVersion===1){resetV2(s);syncVouchers(s,true);}if([2,3].includes(s.schemaVersion))ensureV3(s);return s;}
  function logHouse(s,action){s.houseLog.unshift({id:uid('log'),at:nowStamp(),action:String(action).slice(0,500)});if(s.houseLog.length>500)s.houseLog.length=500;}
  function seedV2(s,today){upgradeState(s);for(const mid of ['ana','leo']){s.finance.accounts.push({memberId:mid,weeklyCents:300,payDay:6,savePercent:50,policy:'fixed',enabled:true,since:monday(today)});postMoney(s,mid,{available:mid==='ana'?850:400,savings:mid==='ana'?500:250},'opening','Saldo de ejemplo. No representa dinero real.','demo-'+mid,{role:'adult'});}
    s.finance.goals.push({id:'goal_skates',memberId:'ana',title:'Mis patines',icon:'\u{1F6FC}',targetCents:2500,createdAt:nowStamp(),completedAt:null});
    postMoney(s,'ana',{savings:-300,'goal:goal_skates':300},'transfer','Primer ahorro para los patines','demo-saving',{role:'adult'});
    s.routines=[{id:'routine_ana_am',memberId:'ana',title:'Buenos d\u00edas',icon:'\u2600\uFE0F',period:'morning',templateIds:['cama','mesa'],active:true},{id:'routine_leo_pm',memberId:'leo',title:'Al llegar a casa',icon:'\u{1F392}',period:'afternoon',templateIds:['juguetes','plantas'],active:true}];
    s.pantry=[{id:'pantry_pasta',name:'Pasta',quantity:500,unit:'g',category:'Despensa',expires:''},{id:'pantry_huevos',name:'Huevos',quantity:4,unit:'ud',category:'L\u00e1cteos y huevos',expires:addDays(today,4)},{id:'pantry_mozzarella',name:'Mozzarella',quantity:150,unit:'g',category:'L\u00e1cteos y huevos',expires:addDays(today,3)}];
    syncV2(s,today);return seedV3(s,today);
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
  function legacyConfigureAllowance(s,input,a,today=iso()){
    requireAdult(a);if(!s.members.some(m=>m.id===input.memberId&&m.active!==false))throw new Error('Miembro no disponible.');
    if(!Number.isInteger(input.weeklyCents)||input.weeklyCents<0||input.weeklyCents>100000||!Number.isInteger(input.payDay)||input.payDay<0||input.payDay>6||!Number.isInteger(input.savePercent)||input.savePercent<0||input.savePercent>100||!['fixed','goal','tiers'].includes(input.policy))throw new Error('Revisa la configuraci\u00f3n de la paga.');
    const old=s.finance.accounts.find(x=>x.memberId===input.memberId);if(old?.enabled)syncAllowanceDues(s,today);const resuming=old&&!old.enabled&&input.enabled;const value={...input,since:resuming?monday(today):old?.since||monday(today)};if(resuming)delete old.lastScheduledWeek;
    if(old)Object.assign(old,value);else s.finance.accounts.push(value);syncAllowanceDues(s,today);
    logHouse(s,'Configuraci\u00f3n de paga actualizada. Los abonos ya previstos conservan su importe.');
  }
  function legacySyncAllowanceDues(s,today=iso()){
    let changed=false;for(const a of s.finance.accounts){if(!a.enabled||!a.weeklyCents||!s.members.some(m=>m.id===a.memberId&&m.active!==false))continue;
      let start=a.lastScheduledWeek?addDays(a.lastScheduledWeek,7):a.since;
      for(let count=0;start<=monday(today)&&count<520;count++,start=addDays(start,7)){
        const day=addDays(start,a.payDay);if(day>today)break;const id=a.memberId+'@'+start;
        if(!s.finance.dues.some(d=>d.id===id)){s.finance.dues.push({id,memberId:a.memberId,week:start,date:day,cents:a.weeklyCents,savePercent:a.savePercent,policy:a.policy,status:'pending',createdAt:nowStamp()});changed=true;}
        a.lastScheduledWeek=start;
      }
    }return changed;
  }
  function legacyPayAllowance(s,id,a,today=iso()){
    requireAdult(a);const d=s.finance.dues.find(d=>d.id===id);if(!d)throw new Error('Paga no encontrada.');if(d.status==='paid')return false;if(d.status!=='pending'||d.date>today)throw new Error('Esta paga no est\u00e1 disponible.');
    if(d.policy==='goal'){const w=s.weeks.find(w=>w.start===d.week),st=w?stats(w,d.memberId):null;if(!st||!st.target||st.points<st.target)throw new Error('El objetivo de esa semana a\u00fan no se ha alcanzado. La paga sigue pendiente.');}
    const savings=Math.round(d.cents*d.savePercent/100),entry=postMoney(s,d.memberId,{available:d.cents-savings,savings},'allowance','Paga de la semana '+d.week,'pay:'+d.id,a);d.status='paid';d.paidAt=nowStamp();d.ledgerId=entry?.id||s.finance.ledger.find(e=>e.ref==='pay:'+d.id)?.id;return entry;
  }
  function requestSpend(s,input,a){ownOrAdult(a,input.memberId);const pocket=input.pocket||'available';if(!Number.isSafeInteger(input.cents)||input.cents<=0||!String(input.note).trim()||input.note.length>300||!validPocket(s,input.memberId,pocket))throw new Error('Revisa la solicitud.');if((balances(s,input.memberId)[pocket]||0)<input.cents)throw new Error('Ese bolsillo no tiene saldo suficiente.');const r={...input,pocket,id:uid('request'),status:'pending',createdAt:nowStamp()};s.finance.requests.push(r);return r;}
  function resolveSpend(s,id,approve,a){requireAdult(a);const r=s.finance.requests.find(r=>r.id===id);if(!r||r.status!=='pending')return false;if(approve){postMoney(s,r.memberId,{[r.pocket]:-r.cents},'spend',r.note,'spend:'+r.id,a);r.status='approved';if(r.pocket.startsWith('goal:')){const g=s.finance.goals.find(g=>'goal:'+g.id===r.pocket);if(g&&r.finishGoal){const left=balances(s,r.memberId)[r.pocket]||0;if(left)postMoney(s,r.memberId,{[r.pocket]:-left,savings:left},'transfer','Resto del objetivo a la hucha','goal-rest:'+r.id,a);g.completedAt=nowStamp();}}}else r.status='declined';r.resolvedAt=nowStamp();return true;}
  function reverseMoney(s,id,reason,a){requireAdult(a);const e=s.finance.ledger.find(e=>e.id===id);if(!e||['reversal','interest'].includes(e.type))throw new Error('Movimiento no anulable.');if(s.finance.ledger.some(x=>x.ref==='reverse:'+id))return false;const delta=Object.fromEntries(Object.entries(e.delta).map(([k,v])=>[k,-v]));const result=postMoney(s,e.memberId,delta,'reversal','Correcci\u00f3n: '+String(reason).trim(),'reverse:'+id,a);const req=s.finance.requests.find(r=>e.ref==='spend:'+r.id&&r.finishGoal);if(req){const g=s.finance.goals.find(g=>'goal:'+g.id===req.pocket);if(g)g.completedAt=null;}return result;}
  function syncVouchers(s,legacy=false){let changed=false;for(const w of s.weeks)for(const r of w.rewards)if(r.claimedAt&&!s.vouchers.some(v=>v.source===w.id+'@'+r.id)){s.vouchers.push({id:uid('voucher'),source:w.id+'@'+r.id,memberId:r.memberId,title:r.title,icon:r.icon,week:w.id,status:legacy?'used':'earned',issuedAt:r.claimedAt,usedAt:legacy?r.claimedAt:null});changed=true;}return changed;}
  function requestVoucher(s,id,dateValue,a){const v=s.vouchers.find(v=>v.id===id);if(!v)throw new Error('Vale no encontrado.');ownOrAdult(a,v.memberId);if(!['earned','requested'].includes(v.status)||!validDate(dateValue)||dateValue<iso())throw new Error('Elige un d\u00eda de hoy en adelante para un vale pendiente.');v.requestedDate=dateValue;v.status='requested';}
  function approveVoucher(s,id,a){requireAdult(a);const v=s.vouchers.find(v=>v.id===id);if(!v||v.status!=='requested')return false;const eid='voucher-'+v.id;if(!s.events.some(e=>e.id===eid))s.events.push({id:eid,title:v.title,date:v.requestedDate,endDate:v.requestedDate,time:'',endTime:'',allDay:true,memberId:v.memberId,category:'Recompensa',description:'Vale de Family Points. Semana '+v.week,revision:0});v.eventId=eid;v.status='scheduled';return true;}
  function useVoucher(s,id,a){requireAdult(a);const v=s.vouchers.find(v=>v.id===id);if(!v||v.status==='used')return false;if(!['earned','requested','scheduled'].includes(v.status))throw new Error('Vale no disponible.');v.status='used';v.usedAt=nowStamp();return true;}
  function routineTasks(s,r,day=iso()){const w=s.weeks.find(w=>w.start===monday(day));if(!w)return [];return r.templateIds.flatMap(tid=>w.tasks.filter(t=>t.templateId===tid&&t.memberId===r.memberId&&taskOnDay(t,day)&&!(s.settings.homaRules&&t.autoPresence&&t.status==='excused')));}
  function addAbsence(s,input,a){requireAdult(a);if(!validDate(input.from)||!validDate(input.to)||input.to<input.from||input.from<monday()||!input.reason?.trim()||!s.members.some(m=>m.id===input.memberId))throw new Error('Revisa persona, fechas y motivo. No se cambia el historial cerrado.');const x={...input,id:uid('absence'),active:true,createdAt:nowStamp()};s.absences.push(x);applyAbsences(s);logHouse(s,'Ausencia justificada: '+input.reason);return x;}
  function legacyApplyAbsences(s){for(const x of s.absences||[]){if(!x.active)continue;for(const w of s.weeks.filter(w=>w.status==='open'))for(const t of w.tasks)if(t.memberId===x.memberId&&t.date>=x.from&&t.date<=x.to&&t.kind==='normal'&&['pending','review'].includes(t.status)){t.beforeExcuse=t.status;t.status='excused';t.absenceId=x.id;t.excuse=x.reason;}}}
  function legacyCancelAbsence(s,id,a){requireAdult(a);const x=s.absences.find(x=>x.id===id);if(!x||!x.active)return false;x.active=false;for(const w of s.weeks.filter(w=>w.status==='open'))for(const t of w.tasks)if(t.absenceId===id&&t.status==='excused'){t.status=t.beforeExcuse||'pending';delete t.absenceId;delete t.excuse;}applyAbsences(s);return true;}
  function proposeSwap(s,week,taskA,taskB,a){const w=s.weeks.find(w=>w.id===week),ta=w?.tasks.find(t=>t.id===taskA),tb=w?.tasks.find(t=>t.id===taskB);if(!w||w.status!=='open'||!ta||!tb||ta.memberId===tb.memberId||[ta,tb].some(t=>t.status!=='pending'||t.kind!=='normal'))throw new Error('Escoge dos tareas normales pendientes de personas distintas.');ownOrAdult(a,ta.memberId);if(s.swaps.some(x=>x.week===week&&['pending','accepted'].includes(x.status)&&[x.taskA,x.taskB].some(id=>[taskA,taskB].includes(id))))throw new Error('Una de estas tareas ya tiene un cambio pendiente.');const x={id:uid('swap'),week,taskA,taskB,from:ta.memberId,to:tb.memberId,status:'pending',createdAt:nowStamp()};s.swaps.push(x);return x;}
  function resolveSwap(s,id,action,a){const x=s.swaps.find(x=>x.id===id);if(!x)throw new Error('Cambio no encontrado.');if(action==='accept'){if(a.role!=='adult'&&a.memberId!==x.to)throw new Error('La otra persona debe aceptar el cambio.');if(x.status!=='pending')return false;x.status='accepted';return true;}if(action==='decline'){if(a.role!=='adult'&&![x.from,x.to].includes(a.memberId))throw new Error('Cambio de otra persona.');if(!['pending','accepted'].includes(x.status))return false;x.status='declined';return true;}requireAdult(a);if(x.status!=='accepted')throw new Error('Primero debe aceptarlo la otra persona.');const w=s.weeks.find(w=>w.id===x.week),ta=w?.tasks.find(t=>t.id===x.taskA),tb=w?.tasks.find(t=>t.id===x.taskB);if(w?.status!=='open'||!ta||!tb||ta.memberId!==x.from||tb.memberId!==x.to||[ta,tb].some(t=>t.status!=='pending'))throw new Error('Las tareas han cambiado. Anula la propuesta y crea otra.');[ta.memberId,tb.memberId]=[tb.memberId,ta.memberId];x.status='approved';x.approvedAt=nowStamp();logHouse(s,'Intercambio de tareas confirmado por un adulto.');return true;}
  const PREP_SETS={excursion:['Preparar la mochila','Llenar la botella de agua','Revisar lo que debemos llevar'],piscina:['Bañador','Toalla','Mochila preparada'],deporte:['Ropa de deporte','Botella de agua','Zapatillas'],cumple:['Confirmar lugar y hora','Preparar el regalo','Organizar c\u00f3mo llegar']};
  function createPrep(s,eventId,mid,titles,a){requireAdult(a);if(!s.events.some(e=>e.id===eventId)||!s.members.some(m=>m.id===mid)||!titles.length||titles.length>30||titles.some(t=>!t.trim()||t.length>160))throw new Error('Revisa el plan y su lista.');let p=s.preparations.find(p=>p.eventId===eventId);if(p)throw new Error('Este plan ya tiene una preparaci\u00f3n.');p={id:uid('prep'),eventId,memberId:mid,items:titles.map(t=>({id:uid('check'),title:t.trim(),done:false}))};s.preparations.push(p);return p;}
  function legacyTogglePrep31(s,id,itemId,a){const p=s.preparations.find(p=>p.id===id);if(!p)throw new Error('Lista no encontrada.');ownOrAdult(a,p.memberId);const item=p.items.find(i=>i.id===itemId);if(item)item.done=!item.done;}
  const UNIT_MAP={g:['g',1],kg:['g',1000],ml:['ml',1],l:['ml',1000],ud:['ud',1],uds:['ud',1],unidad:['ud',1],unidades:['ud',1],lata:['lata',1],latas:['lata',1],bote:['bote',1],botes:['bote',1],paquete:['paquete',1],paquetes:['paquete',1],cucharada:['cucharada',1],cucharadas:['cucharada',1],cucharadita:['cucharadita',1],cucharaditas:['cucharadita',1],diente:['diente',1],dientes:['diente',1],pizca:['pizca',1],rebanada:['rebanada',1],rebanadas:['rebanada',1]};
  function quantity(q){const m=String(q).trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)$/);if(!m)return null;const u=UNIT_MAP[norm(m[2])];return u?{n:Math.round(Number(m[1].replace(',','.'))*u[1]*1000)/1000,unit:u[0]}:null;}
  const qtyLabel=(n,u)=>`${Math.round(n*1000)/1000} ${u}`;
  function legacyStock(s,name,unit,today=iso()){return s.pantry.filter(p=>norm(p.name)===norm(name)&&(!p.expires||p.expires>=today)).reduce((n,p)=>{const q=quantity(p.quantity+' '+p.unit);return n+(q?.unit===unit?q.n:0);},0);}
  function legacyMissingIngredients(s,plans,today=iso()){
    const grouped=new Map(),manual=[];
    for(const p of plans){const r=s.recipes.find(r=>r.id===p.recipeId);if(!r||p.pantryUsedAt)continue;for(const i of r.ingredients){const q=quantity(scaleQuantity(i.quantity,p.servings/r.servings));if(!q){manual.push({name:i.name,quantity:scaleQuantity(i.quantity,p.servings/r.servings),category:i.category||'Despensa'});continue;}const key=norm(i.name)+'@'+q.unit;const row=grouped.get(key)||{name:i.name,unit:q.unit,need:0,category:i.category||'Despensa'};row.need+=q.n;grouped.set(key,row);}}
    const rows=[...grouped.values()].map(row=>{const have=stock(s,row.name,row.unit,today),listed=s.shopping.filter(x=>!x.checked&&foodKey(x.name)===foodKey(row.name)).reduce((n,x)=>{const q=quantity(x.quantity);return n+(q?.unit===row.unit?q.n:0);},0);return {...row,have,listed,missing:Math.max(0,Math.round((row.need-have-listed)*1000)/1000)};});return {rows,manual};
  }
  function legacyAddMissing(s,plans){const preview=missingIngredients(s,plans);let n=0;for(const r of preview.rows){if(r.missing<=0)continue;const x=s.shopping.find(x=>!x.checked&&foodKey(x.name)===foodKey(r.name)&&quantity(x.quantity)?.unit===r.unit);if(x){const q=quantity(x.quantity);x.quantity=qtyLabel(q.n+r.missing,r.unit);}else s.shopping.push({id:uid('shop'),name:r.name,quantity:qtyLabel(r.missing,r.unit),category:r.category,checked:false});n++;}return {count:n,manual:preview.manual.length};}
  function receiveShopping(s,a){requireAdult(a);let moved=0,manual=0;for(const x of s.shopping.filter(x=>x.checked&&(x.listId||'groceries')==='groceries'&&!x.receivedAt)){const q=quantity(x.quantity);if(!q){manual++;continue;}let p=s.pantry.find(p=>foodKey(p.name)===foodKey(x.name)&&p.unit===q.unit&&!p.expires);if(p)p.quantity=Math.round((p.quantity+q.n)*1000)/1000;else s.pantry.push({id:uid('pantry'),name:x.name,quantity:q.n,unit:q.unit,expires:'',category:x.category});x.receivedAt=nowStamp();moved++;}return {moved,manual};}
  function consumeMeal(s,planId,a){requireAdult(a);const p=s.mealPlan.find(p=>p.id===planId);if(!p||p.pantryUsedAt)return false;const needs=missingIngredients({...s,shopping:[]},[p]);for(const row of needs.rows){let left=row.need;const items=s.pantry.filter(x=>foodKey(x.name)===foodKey(row.name)&&(!x.expires||x.expires>=iso())).sort((a,b)=>(a.expires||'9999').localeCompare(b.expires||'9999'));for(const x of items){const q=quantity(x.quantity+' '+x.unit);if(!q||q.unit!==row.unit)continue;const take=Math.min(q.n,left);x.quantity=Math.round((q.n-take)/UNIT_MAP[x.unit][1]*1000)/1000;left=Math.round((left-take)*1000)/1000;if(left<=0)break;}}p.pantryUsedAt=nowStamp();return true;}
  function meeting(s,week=monday(),create=false){let m=s.meetings.find(x=>x.week===week);if(!m&&create){m={id:uid('meeting'),week,notes:[],proposals:[],closedAt:null};s.meetings.push(m);}return m||{week,notes:[],proposals:[],closedAt:null};}
  function addProposal(s,week,title,mid,a){ownOrAdult(a,mid);if(!title?.trim()||title.length>160)throw new Error('Escribe una propuesta de hasta 160 caracteres.');const m=meeting(s,week,true);if(m.closedAt)throw new Error('La reuni\u00f3n est\u00e1 cerrada.');m.proposals.push({id:uid('proposal'),title:title.trim(),memberId:mid,approved:a.role==='adult',votes:[]});}
  function voteProposal(s,week,id,mid,a){ownOrAdult(a,mid);const m=meeting(s,week,true),p=m.proposals.find(p=>p.id===id);if(m.closedAt||!p?.approved)throw new Error('La votaci\u00f3n no est\u00e1 disponible.');for(const other of m.proposals)other.votes=other.votes.filter(v=>v!==mid);p.votes.push(mid);}
  function syncV2(s,today=iso()){if(!s.finance)return false;ensureV3(s);const c=applyAbsences(s),a=syncAllowanceDues(s,today),b=syncVouchers(s),d=accrueInterest(s,today);return a||b||c||d;}
  function validateV2(s){
    const check=(v,msg)=>{if(!v)throw new Error('Copia v2 no v\u00e1lida: '+msg);},str=(x,max=300)=>typeof x==='string'&&x.length<=max,mid=id=>s.members.some(m=>m.id===id),array=(x,max=50000)=>Array.isArray(x)&&x.length<=max;
    check(s.schemaVersion===3&&s.finance,'estructura.');
    for(const k of ['accounts','ledger','dues','requests','goals','labs'])check(array(s.finance[k]),'dinero / '+k);
    for(const k of ['routines','absences','swaps','preparations','pantry','vouchers','meetings','houseLog'])check(array(s[k]),k);
    const unique=(xs,key='id')=>check(new Set(xs.map(x=>x[key])).size===xs.length,'identificadores repetidos.');
    for(const k of ['ledger','dues','requests','goals']){unique(s.finance[k]);for(const x of s.finance[k])check(str(x.id,200)&&/^[\w.:@-]+$/.test(x.id),'identificador financiero.');}
    unique(s.finance.accounts,'memberId');unique(s.finance.labs,'memberId');unique(s.finance.ledger,'ref');
    for(const a of s.finance.accounts)check(mid(a.memberId)&&Number.isInteger(a.weeklyCents)&&a.weeklyCents>=0&&a.weeklyCents<=100000&&Number.isInteger(a.savePercent)&&a.savePercent>=0&&a.savePercent<=100&&Number.isInteger(a.payDay)&&a.payDay>=0&&a.payDay<=6&&['fixed','goal','tiers'].includes(a.policy)&&typeof a.enabled==='boolean'&&validDate(a.since)&&monday(a.since)===a.since&&(!a.lastScheduledWeek||validDate(a.lastScheduledWeek)),'configuraci\u00f3n de paga.');
    for(const g of s.finance.goals)check(mid(g.memberId)&&str(g.title,100)&&g.title.trim()&&str(g.icon,20)&&Number.isSafeInteger(g.targetCents)&&g.targetCents>0&&g.targetCents<=100000000,'objetivo de ahorro.');
    const running=Object.create(null);for(const e of s.finance.ledger){check(mid(e.memberId)&&str(e.ref,250)&&str(e.note,300)&&str(e.at,60)&&['opening','allowance','deposit','spend','transfer','reversal','bonus','interest'].includes(e.type)&&e.delta&&typeof e.delta==='object'&&!Array.isArray(e.delta),'movimiento.');running[e.memberId]||={};check(Object.keys(e.delta).length>0&&Object.keys(e.delta).length<100,'bolsillos.');for(const [k,v]of Object.entries(e.delta)){check(validPocket(s,e.memberId,k)&&Number.isSafeInteger(v)&&Math.abs(v)<=100000000,'c\u00e9ntimos.');running[e.memberId][k]=(running[e.memberId][k]||0)+v;check(Number.isSafeInteger(running[e.memberId][k])&&running[e.memberId][k]>=0,'saldo negativo.');}if(e.type==='transfer')check(Object.values(e.delta).reduce((n,x)=>n+x,0)===0,'transferencia desequilibrada.');}
    for(const d of s.finance.dues)check(mid(d.memberId)&&validDate(d.week)&&validDate(d.date)&&monday(d.date)===(d.policy==='tiers'?addDays(d.week,7):d.week)&&Number.isInteger(d.cents)&&d.cents>=0&&d.cents<=100000&&Number.isInteger(d.savePercent)&&d.savePercent>=0&&d.savePercent<=100&&['fixed','goal','tiers'].includes(d.policy)&&['pending','paid','skipped'].includes(d.status)&&(d.status!=='paid'||s.finance.ledger.some(e=>e.ref==='pay:'+d.id)),'abono semanal.');
    for(const r of s.finance.requests)check(mid(r.memberId)&&validPocket(s,r.memberId,r.pocket)&&Number.isSafeInteger(r.cents)&&r.cents>0&&r.cents<=100000000&&str(r.note,300)&&['pending','approved','declined'].includes(r.status),'solicitud de gasto.');
    for(const l of s.finance.labs)check(mid(l.memberId)&&Number.isInteger(l.round)&&l.round>=0&&l.round<=4&&[l.reserve,l.a,l.b].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000)&&array(l.history,10),'datos heredados de la copia.');
    for(const k of ['routines','absences','swaps','preparations','pantry','vouchers','meetings','houseLog']){unique(s[k]);for(const x of s[k])check(str(x.id,200)&&/^[\w.:@-]+$/.test(x.id),'identificador '+k);}
    for(const r of s.routines)check(mid(r.memberId)&&str(r.title,100)&&str(r.icon,20)&&array(r.templateIds,100)&&r.templateIds.every(x=>str(x,200)),'rutina.');
    for(const x of s.absences)check(mid(x.memberId)&&validDate(x.from)&&validDate(x.to)&&x.to>=x.from&&str(x.reason,300)&&typeof x.active==='boolean','ausencia.');
    for(const x of s.swaps)check(validDate(x.week)&&mid(x.from)&&mid(x.to)&&str(x.taskA,200)&&str(x.taskB,200)&&['pending','accepted','approved','declined'].includes(x.status),'intercambio.');
    for(const p of s.preparations)check((!p.memberId||mid(p.memberId))&&str(p.eventId,200)&&array(p.items,100)&&p.items.every(i=>str(i.id,200)&&str(i.title,160)&&typeof i.done==='boolean'),'preparaci\u00f3n.');
    for(const p of s.pantry)check(str(p.name,160)&&p.name.trim()&&Number.isFinite(p.quantity)&&p.quantity>=0&&p.quantity<=1000000&&Object.keys(UNIT_MAP).includes(p.unit)&&str(p.category,80)&&(!p.expires||validDate(p.expires)),'despensa.');
    unique(s.vouchers,'source');for(const v of s.vouchers)check(mid(v.memberId)&&str(v.title,160)&&str(v.icon,20)&&str(v.source,400)&&validDate(v.week)&&['earned','requested','scheduled','used'].includes(v.status)&&(!v.requestedDate||validDate(v.requestedDate)),'vale.');
    unique(s.meetings,'week');for(const m of s.meetings){check(validDate(m.week)&&array(m.notes,100)&&array(m.proposals,1000),'reuni\u00f3n.');for(const n of m.notes)check(mid(n.memberId)&&str(n.worked,1000)&&str(n.change,1000)&&str(n.thanks,1000),'notas.');for(const p of m.proposals)check(str(p.id,200)&&mid(p.memberId)&&str(p.title,160)&&array(p.votes,100)&&new Set(p.votes).size===p.votes.length&&p.votes.every(mid),'propuesta.');const votes=m.proposals.flatMap(p=>p.votes);check(new Set(votes).size===votes.length,'un solo voto por persona.');}
    for(const t of s.templates)check((t.requiresReview==null||typeof t.requiresReview==='boolean')&&(!t.rotationStart||validDate(t.rotationStart)),'opciones de tarea.');
    return s;
  }

  // Original sample recipes, not retailer catalog data. Availability must be checked in store.
  const RECIPE_LIBRARY=[
  {
    "id": "v3_arroz_pollo",
    "name": "Arroz con pollo y verduras",
    "emoji": "\ud83c\udf5a",
    "minutes": 40,
    "servings": 4,
    "category": "En familia",
    "ingredients": [
      {
        "name": "Arroz",
        "quantity": "320 g",
        "category": "Despensa"
      },
      {
        "name": "Pollo deshuesado",
        "quantity": "500 g",
        "category": "Carne y pescado"
      },
      {
        "name": "Pimiento",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Zanahorias",
        "quantity": "2 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Guisantes congelados",
        "quantity": "150 g",
        "category": "Congelados"
      },
      {
        "name": "Caldo de pollo",
        "quantity": "900 ml",
        "category": "Despensa"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "25 ml",
        "category": "Despensa"
      },
      {
        "name": "Sal",
        "quantity": "2 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Corta el pollo y las verduras con utensilios separados. Dora el pollo con el aceite.",
      "A\u00f1ade el pimiento y la zanahoria, y rehoga 6 minutos.",
      "Incorpora el arroz, los guisantes, la sal y el caldo caliente. Cuece el tiempo indicado en el envase del arroz.",
      "Comprueba que el pollo est\u00e9 completamente cocinado y el arroz tierno; deja reposar antes de servir."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_lentejas",
    "name": "Lentejas r\u00e1pidas con verduras",
    "emoji": "\ud83e\uded8",
    "minutes": 25,
    "servings": 4,
    "category": "De cuchara",
    "ingredients": [
      {
        "name": "Lentejas cocidas escurridas",
        "quantity": "800 g",
        "category": "Despensa"
      },
      {
        "name": "Zanahorias",
        "quantity": "2 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Cebolla",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Patatas",
        "quantity": "300 g",
        "category": "Fruta y verdura"
      },
      {
        "name": "Tomate triturado",
        "quantity": "200 g",
        "category": "Despensa"
      },
      {
        "name": "Caldo vegetal",
        "quantity": "600 ml",
        "category": "Despensa"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "20 ml",
        "category": "Despensa"
      },
      {
        "name": "Piment\u00f3n dulce",
        "quantity": "3 g",
        "category": "Despensa"
      },
      {
        "name": "Sal",
        "quantity": "2 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Lava y corta las verduras. Rehoga la cebolla y la zanahoria con el aceite.",
      "A\u00f1ade el tomate y el piment\u00f3n; remueve sin que se queme.",
      "Incorpora las patatas en dados, el caldo y la sal. Cuece hasta que la patata est\u00e9 tierna.",
      "Agrega las lentejas escurridas, calienta 5 minutos y sirve."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_garbanzos",
    "name": "Garbanzos con espinacas",
    "emoji": "\ud83e\udd6c",
    "minutes": 20,
    "servings": 4,
    "category": "R\u00e1pidas",
    "ingredients": [
      {
        "name": "Garbanzos cocidos escurridos",
        "quantity": "800 g",
        "category": "Despensa"
      },
      {
        "name": "Espinacas congeladas",
        "quantity": "400 g",
        "category": "Congelados"
      },
      {
        "name": "Tomate triturado",
        "quantity": "300 g",
        "category": "Despensa"
      },
      {
        "name": "Ajo",
        "quantity": "2 dientes",
        "category": "Fruta y verdura"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "25 ml",
        "category": "Despensa"
      },
      {
        "name": "Comino",
        "quantity": "2 g",
        "category": "Despensa"
      },
      {
        "name": "Sal",
        "quantity": "2 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Cocina las espinacas siguiendo el envase. Escurre.",
      "Dora el ajo picado en el aceite y agrega el tomate y el comino. Cocina 7 minutos.",
      "A\u00f1ade los garbanzos escurridos, las espinacas y la sal. Calienta todo 5 minutos."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_merluza",
    "name": "Merluza al horno con patatas",
    "emoji": "\ud83d\udc1f",
    "minutes": 45,
    "servings": 4,
    "category": "En familia",
    "ingredients": [
      {
        "name": "Filetes de merluza",
        "quantity": "600 g",
        "category": "Carne y pescado"
      },
      {
        "name": "Patatas",
        "quantity": "700 g",
        "category": "Fruta y verdura"
      },
      {
        "name": "Cebolla",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Lim\u00f3n",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "30 ml",
        "category": "Despensa"
      },
      {
        "name": "Agua",
        "quantity": "100 ml",
        "category": "Despensa"
      },
      {
        "name": "Sal",
        "quantity": "2 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Si usas pescado congelado, descong\u00e9lalo en la nevera siguiendo el envase. Precalienta el horno a 200 grados.",
      "Corta las patatas finas y la cebolla. Ponlas en una fuente con agua, aceite y sal. Hornea 25 minutos o hasta que est\u00e9n casi tiernas.",
      "Coloca la merluza encima, a\u00f1ade zumo de lim\u00f3n y hornea hasta que el pescado est\u00e9 completamente hecho. Revisa que no haya espinas al servir."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_pasta_atun",
    "name": "Pasta con tomate y at\u00fan",
    "emoji": "\ud83c\udf5d",
    "minutes": 20,
    "servings": 4,
    "category": "R\u00e1pidas",
    "ingredients": [
      {
        "name": "Pasta",
        "quantity": "360 g",
        "category": "Despensa"
      },
      {
        "name": "At\u00fan en conserva escurrido",
        "quantity": "180 g",
        "category": "Despensa"
      },
      {
        "name": "Tomate triturado",
        "quantity": "500 g",
        "category": "Despensa"
      },
      {
        "name": "Cebolla",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "20 ml",
        "category": "Despensa"
      },
      {
        "name": "Queso rallado",
        "quantity": "60 g",
        "category": "L\u00e1cteos y huevos"
      },
      {
        "name": "Sal",
        "quantity": "2 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Cuece la pasta siguiendo el envase.",
      "Rehoga la cebolla picada en aceite, a\u00f1ade el tomate y la sal y cocina 10 minutos.",
      "Incorpora el at\u00fan escurrido, mezcla con la pasta y sirve con queso rallado."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_crema_calabacin",
    "name": "Crema de calabac\u00edn y quesito",
    "emoji": "\ud83e\udd63",
    "minutes": 30,
    "servings": 4,
    "category": "De cuchara",
    "ingredients": [
      {
        "name": "Calabac\u00edn",
        "quantity": "800 g",
        "category": "Fruta y verdura"
      },
      {
        "name": "Patatas",
        "quantity": "250 g",
        "category": "Fruta y verdura"
      },
      {
        "name": "Cebolla",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Caldo vegetal",
        "quantity": "600 ml",
        "category": "Despensa"
      },
      {
        "name": "Queso en porciones",
        "quantity": "60 g",
        "category": "L\u00e1cteos y huevos"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "20 ml",
        "category": "Despensa"
      },
      {
        "name": "Sal",
        "quantity": "2 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Lava y corta las verduras. Rehoga la cebolla con aceite.",
      "A\u00f1ade el calabac\u00edn, la patata, la sal y el caldo. Cuece unos 20 minutos, hasta que est\u00e9n tiernos.",
      "Retira del fuego, a\u00f1ade el queso y tritura con cuidado."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_quesadillas",
    "name": "Quesadillas de pollo y queso",
    "emoji": "\ud83e\uded3",
    "minutes": 25,
    "servings": 4,
    "category": "En familia",
    "ingredients": [
      {
        "name": "Tortillas de trigo",
        "quantity": "8 ud",
        "category": "Despensa"
      },
      {
        "name": "Pollo deshuesado",
        "quantity": "400 g",
        "category": "Carne y pescado"
      },
      {
        "name": "Queso rallado",
        "quantity": "160 g",
        "category": "L\u00e1cteos y huevos"
      },
      {
        "name": "Pimiento",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Cebolla",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "20 ml",
        "category": "Despensa"
      },
      {
        "name": "Sal",
        "quantity": "2 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Corta y saltea el pollo y las verduras con aceite y sal hasta que el pollo est\u00e9 completamente cocinado.",
      "Reparte el relleno y el queso entre las tortillas y d\u00f3blalas.",
      "Dora por ambos lados en una sart\u00e9n hasta que el queso se funda."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_ensalada_arroz",
    "name": "Ensalada de arroz, ma\u00edz y huevo",
    "emoji": "\ud83e\udd57",
    "minutes": 25,
    "servings": 4,
    "category": "R\u00e1pidas",
    "ingredients": [
      {
        "name": "Arroz",
        "quantity": "280 g",
        "category": "Despensa"
      },
      {
        "name": "Huevos",
        "quantity": "4 ud",
        "category": "L\u00e1cteos y huevos"
      },
      {
        "name": "Ma\u00edz en conserva escurrido",
        "quantity": "150 g",
        "category": "Despensa"
      },
      {
        "name": "Tomates",
        "quantity": "300 g",
        "category": "Fruta y verdura"
      },
      {
        "name": "Pepino",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "25 ml",
        "category": "Despensa"
      },
      {
        "name": "Vinagre",
        "quantity": "10 ml",
        "category": "Despensa"
      },
      {
        "name": "Sal",
        "quantity": "2 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Cuece el arroz siguiendo el envase y los huevos hasta que est\u00e9n bien cocidos. Enfr\u00eda el arroz r\u00e1pidamente y refrig\u00e9ralo si no se sirve al momento.",
      "Lava y corta el tomate y el pepino. Pela y trocea los huevos.",
      "Mezcla con el arroz, el ma\u00edz escurrido, el aceite, el vinagre y la sal."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_albondigas",
    "name": "Alb\u00f3ndigas con tomate",
    "emoji": "\ud83c\udf72",
    "minutes": 40,
    "servings": 4,
    "category": "Cl\u00e1sicos",
    "ingredients": [
      {
        "name": "Carne picada",
        "quantity": "600 g",
        "category": "Carne y pescado"
      },
      {
        "name": "Huevos",
        "quantity": "1 ud",
        "category": "L\u00e1cteos y huevos"
      },
      {
        "name": "Pan rallado",
        "quantity": "50 g",
        "category": "Despensa"
      },
      {
        "name": "Tomate triturado",
        "quantity": "600 g",
        "category": "Despensa"
      },
      {
        "name": "Cebolla",
        "quantity": "1 ud",
        "category": "Fruta y verdura"
      },
      {
        "name": "Ajo",
        "quantity": "1 dientes",
        "category": "Fruta y verdura"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "30 ml",
        "category": "Despensa"
      },
      {
        "name": "Sal",
        "quantity": "3 g",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Mezcla la carne con el huevo, el pan rallado y parte de la sal. Forma las alb\u00f3ndigas.",
      "D\u00f3ralas con el aceite y ret\u00edralas. Rehoga la cebolla y el ajo en la misma sart\u00e9n.",
      "A\u00f1ade el tomate y la sal restante. Devuelve las alb\u00f3ndigas a la salsa y cocina hasta que est\u00e9n completamente hechas por dentro."
    ],
    "favorite": false,
    "library": true
  },
  {
    "id": "v3_tostadas",
    "name": "Tostadas de queso y tomate",
    "emoji": "\ud83c\udf5e",
    "minutes": 10,
    "servings": 4,
    "category": "Desayunos",
    "ingredients": [
      {
        "name": "Pan integral",
        "quantity": "8 rebanadas",
        "category": "Despensa"
      },
      {
        "name": "Queso fresco",
        "quantity": "250 g",
        "category": "L\u00e1cteos y huevos"
      },
      {
        "name": "Tomates",
        "quantity": "300 g",
        "category": "Fruta y verdura"
      },
      {
        "name": "Aceite de oliva",
        "quantity": "15 ml",
        "category": "Despensa"
      }
    ],
    "steps": [
      "Tuesta el pan.",
      "Lava y corta el tomate. Reparte el queso fresco, el tomate y el aceite sobre las tostadas."
    ],
    "favorite": false,
    "library": true
  }
];

  /* v3: savings yield, point bands, recurring residence, and reusable food records. */
  const RATE_DAYS={week:7,month:30,year:365};
  const dayDiff=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
  function ensureV3(s){
    if(!s||![1,2,3].includes(s.schemaVersion)||!s.finance)return s;
    s.schemaVersion=3;s.finance.savingsPlans??=[];s.presencePlans??=[];s.presenceOverrides??=[];s.foods??=[];
    ensureWeb5(s);return s;
  }
  function safePhoto(p){return !p||(typeof p==='string'&&p.length<=250000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p));}
  function photoGuard(p){if(!safePhoto(p))throw new Error('La foto no es compatible o es demasiado grande.');return p||'';}
  function validateTiers(tiers){
    if(!Array.isArray(tiers)||!tiers.length||tiers.length>20)throw new Error('Define entre 1 y 20 tramos.');
    const sorted=copy(tiers).sort((a,b)=>a.min-b.min);
    for(let i=0;i<sorted.length;i++){
      const t=sorted[i];
      if(!Number.isInteger(t.min)||t.min<0||t.min>100000||!(t.max===null||(Number.isInteger(t.max)&&t.max>=t.min&&t.max<=100000))||!Number.isSafeInteger(t.cents)||t.cents<0||t.cents>100000)throw new Error('Revisa los puntos y los importes de cada tramo.');
      if(i&&((sorted[i-1].max??Infinity)>=t.min))throw new Error('Los tramos se solapan. Cada puntuaci\u00f3n debe pertenecer a un solo tramo.');
    }return sorted;
  }
  function tierFor(tiers,points){return (tiers||[]).find(t=>points>=t.min&&(t.max===null||points<=t.max))||null;}
  function allowanceQuote(s,d){
    if(d.status==='paid'||d.status==='skipped')return {cents:d.cents,points:d.pointsAtPay??null,tier:d.tierAtPay??null};
    if(d.policy!=='tiers')return {cents:d.cents,points:null,tier:null};
    const w=s.weeks.find(w=>w.start===d.week),points=w?stats(w,d.memberId).points:0,tier=tierFor(d.tiers,points);
    return {cents:tier?.cents||0,points,tier,missingWeek:!w};
  }
  function configureAllowance(s,input,a,today=iso()){
    requireAdult(a);
    if(!s.members.some(m=>m.id===input.memberId&&m.active!==false)||!validDate(today))throw new Error('Miembro o fecha no disponible.');
    if(!Number.isInteger(input.weeklyCents)||input.weeklyCents<0||input.weeklyCents>100000||!Number.isInteger(input.payDay)||input.payDay<0||input.payDay>6||!Number.isInteger(input.savePercent)||input.savePercent<0||input.savePercent>100||!['fixed','goal','tiers'].includes(input.policy))throw new Error('Revisa la configuraci\u00f3n de la paga.');
    const tiers=input.policy==='tiers'?validateTiers(input.tiers):[];
    const old=s.finance.accounts.find(x=>x.memberId===input.memberId);
    if(old?.enabled)syncAllowanceDues(s,today);
    const restart=old&&(!old.enabled&&input.enabled||old.policy!==input.policy);
    const value={...input,tiers,since:restart?monday(today):old?.since||monday(today)};
    if(restart)delete old.lastScheduledWeek;
    if(old)Object.assign(old,value);else s.finance.accounts.push(value);
    syncAllowanceDues(s,today);logHouse(s,'Paga actualizada. Los abonos ya previstos conservan sus reglas.');
  }
  function legacyHomaSyncAllowanceDues(s,today=iso()){
    let changed=false;
    for(const a of s.finance.accounts){
      if(!a.enabled||a.policy!=='tiers'&&!a.weeklyCents||!s.members.some(m=>m.id===a.memberId&&m.active!==false))continue;
      let start=a.lastScheduledWeek?addDays(a.lastScheduledWeek,7):a.since;
      for(let count=0;start<=monday(today)&&count<520;count++,start=addDays(start,7)){
        const day=addDays(start,a.payDay+(a.policy==='tiers'?7:0));if(day>today)break;
        const id=a.memberId+'@'+start;
        if(!s.finance.dues.some(d=>d.id===id)){
          const d={id,memberId:a.memberId,week:start,date:day,cents:a.policy==='tiers'?0:a.weeklyCents,savePercent:a.savePercent,policy:a.policy,tiers:copy(a.tiers||[]),status:'pending',createdAt:nowStamp()};
          d.cents=allowanceQuote(s,d).cents;s.finance.dues.push(d);changed=true;
        }a.lastScheduledWeek=start;
      }
    }return changed;
  }
  function legacyHomaPayAllowance(s,id,a,today=iso()){
    requireAdult(a);const d=s.finance.dues.find(d=>d.id===id);
    if(!d)throw new Error('Paga no encontrada.');if(d.status==='paid'||d.status==='skipped')return false;
    if(d.status!=='pending'||d.date>today)throw new Error('Esta paga no est\u00e1 disponible.');
    const q=allowanceQuote(s,d);
    if(d.policy==='tiers'){
      if(today<=addDays(d.week,6))throw new Error('La semana de puntos todav\u00eda no ha terminado.');
      if(q.missingWeek)throw new Error('No hay una semana registrada para calcular esta paga. No se inventan puntos.');
      d.cents=q.cents;d.pointsAtPay=q.points;d.tierAtPay=q.tier?copy(q.tier):null;
    }
    if(d.policy==='goal'){
      const w=s.weeks.find(w=>w.start===d.week),st=w?stats(w,d.memberId):null;
      if(!st||!st.target||st.points<st.target)throw new Error('El objetivo de esa semana a\u00fan no se ha alcanzado.');
    }
    if(!d.cents){d.status='skipped';d.paidAt=nowStamp();logHouse(s,'Paga cerrada sin abono: '+q.points+' puntos.');return true;}
    const savings=Math.round(d.cents*d.savePercent/100),entry=postMoney(s,d.memberId,{available:d.cents-savings,savings},'allowance','Paga de la semana '+d.week+(d.policy==='tiers'?' ('+q.points+' puntos)':''),'pay:'+d.id,a);
    d.status='paid';d.paidAt=nowStamp();d.ledgerId=entry?.id||s.finance.ledger.find(e=>e.ref==='pay:'+d.id)?.id;return entry;
  }
  function ledgerDay(e){if(e.effectiveDate&&validDate(e.effectiveDate))return e.effectiveDate;const d=new Date(e.at);return isNaN(d)?'9999-12-31':iso(d);}
  const savedDelta=e=>Object.entries(e.delta).reduce((n,[k,v])=>n+(k==='available'?0:v),0);
  function dailySavingsBase(s,mid,day){
    let opening=0;const intraday=[];
    for(const e of s.finance.ledger){if(e.memberId!==mid)continue;const d=ledgerDay(e);if(d<day||d===day&&e.type==='interest')opening+=savedDelta(e);else if(d===day)intraday.push(e);}
    let minimum=opening,run=opening;
    for(const e of intraday){run+=savedDelta(e);minimum=Math.min(minimum,run);}
    return Math.max(0,minimum);
  }
  function configureSavings(s,input,a,today=iso()){
    requireAdult(a);ensureV3(s);
    if(!s.members.some(m=>m.id===input.memberId)||!Number.isFinite(input.rate)||input.rate<0||input.rate>100||!Object.hasOwn(RATE_DAYS,input.period)||typeof input.enabled!=='boolean'||!validDate(today))throw new Error('Revisa el inter\u00e9s (0 a 100 %), el periodo y la persona.');
    accrueInterest(s,today);
    let p=s.finance.savingsPlans.find(p=>p.memberId===input.memberId);
    if(p&&p.nextDay<today)throw new Error('Hay intereses antiguos por actualizar. Actualiza antes de cambiar el tipo.');
    if(!p){p={memberId:input.memberId,since:today,nextDay:today,carryMicro:0,history:[]};s.finance.savingsPlans.push(p);}
    p.history.push({at:nowStamp(),from:today,rate:input.rate,period:input.period,enabled:input.enabled});
    Object.assign(p,{enabled:input.enabled,rate:input.rate,period:input.period,nextDay:today});
    logHouse(s,'Inter\u00e9s del ahorro actualizado: '+input.rate+' % / '+input.period+'.');return p;
  }
  function accrueInterest(s,today=iso()){
    if(!s.finance?.savingsPlans||!validDate(today))return false;let changed=false;
    for(const p of s.finance.savingsPlans){
      if(!p.enabled){if(p.nextDay<today){p.nextDay=today;changed=true;}continue;}
      if(!Number.isFinite(p.rate)||p.rate<0||p.rate>100||!RATE_DAYS[p.period])throw new Error('Configuraci\u00f3n de inter\u00e9s no v\u00e1lida.');
      const factor=Math.pow(1+p.rate/100,1/RATE_DAYS[p.period])-1;
      let count=0;
      while(p.nextDay<today&&count++<3660){
        const day=p.nextDay,ref='interest:'+p.memberId+':'+day;
        if(!s.finance.ledger.some(e=>e.ref===ref)){
          const base=dailySavingsBase(s,p.memberId,day),micro=Math.round(base*factor*1000000)+(p.carryMicro||0),cents=Math.floor(micro/1000000);
          if(cents>100000000)throw new Error('Los intereses superan el l\u00edmite del registro. Revisa el porcentaje.');
          p.carryMicro=micro-cents*1000000;
          if(cents>0){
            const e=postMoney(s,p.memberId,{savings:cents},'interest','Inter\u00e9s del ahorro \u00b7 '+day,ref,{role:'adult'});
            e.effectiveDate=addDays(day,1);e.interestDay=day;e.baseCents=base;e.rate=p.rate;e.period=p.period;
          }
        }p.nextDay=addDays(day,1);changed=true;
      }
    }return changed;
  }
  function savingsProjection(cents,rate,period,days){
    if(!Number.isSafeInteger(cents)||cents<0||!RATE_DAYS[period]||!Number.isFinite(rate)||rate<0||rate>100||!Number.isInteger(days)||days<0||days>3660)throw new Error('Proyecci\u00f3n no v\u00e1lida.');
    const v=Math.round(cents*Math.pow(1+rate/100,days/RATE_DAYS[period]));return Number.isSafeInteger(v)?v:null;
  }
  function presencePattern(type,startsHere=true,custom=[]){
    let a=type==='alternate'?[...Array(7).fill(true),...Array(7).fill(false)]:type==='223'?[true,true,false,false,true,true,true,false,false,true,true,false,false,false]:type==='weekly'?[true,true,true,true,true,false,false]:custom;
    if(!Array.isArray(a)||!a.length||a.length>56||a.some(x=>typeof x!=='boolean'))throw new Error('El ciclo debe tener entre 1 y 56 d\u00edas.');
    return a.map(x=>startsHere?x:!x);
  }
  function configurePresence(s,input,a,today=iso()) {
 requireAdult(a);ensureV3(s);
 if(!s.members.some(m=>m.id===input.memberId)||!validDate(input.anchor)||!validDate(input.from)||input.until&&!validDate(input.until)||input.until&&input.until<input.from)throw new Error('Revisa la persona y las fechas del calendario.');
 if(input.from<monday(today))throw new Error('Los cambios empiezan como pronto el lunes actual.');
 const cycle=presencePattern('custom',true,input.cycle);
 for(const old of s.presencePlans.filter(p=>p.active&&p.memberId===input.memberId&&p.from===input.from))old.active=false;
 const p={id:uid('presence'),memberId:input.memberId,type:input.type||'custom',anchor:input.anchor,from:input.from,until:input.until||'',naturalUntil:input.until||'',cycle,title:String(input.title||'Calendario de convivencia').slice(0,160),active:true};
 s.presencePlans.push(p);presenceVersions(s,input.memberId);applyAbsences(s);logHouse(s,'Calendario de convivencia programado desde '+input.from+'.');return p;
}
  function setPresenceOverride(s,input,a,today=iso()){
    requireAdult(a);ensureV3(s);
    if(!s.members.some(m=>m.id===input.memberId)||!validDate(input.from)||!validDate(input.to)||input.to<input.from||input.from<monday(today)||typeof input.present!=='boolean'||!input.reason?.trim()||input.reason.length>160)throw new Error('Revisa persona, fechas y motivo de la excepci\u00f3n.');
    if(s.presenceOverrides.some(x=>x.active&&x.id!==input.id&&x.memberId===input.memberId&&x.from<=input.to&&x.to>=input.from))throw new Error('Estas fechas ya tienen una excepci\u00f3n. Edita o retira la anterior para no solaparlas.');
    let x=s.presenceOverrides.find(x=>x.id===input.id);const val={...input,active:true,id:x?.id||uid('stay')};
    if(x)Object.assign(x,val);else{s.presenceOverrides.push(val);x=val;}
    applyAbsences(s);return x;
  }
  function presenceOn(s,mid,day){
    const exception=(s.presenceOverrides||[]).find(x=>x.active&&x.memberId===mid&&day>=x.from&&day<=x.to);
    if(exception)return {present:exception.present,reason:exception.reason,source:exception.id,exception:true};
    const absent=(s.absences||[]).find(x=>x.active&&x.memberId===mid&&day>=x.from&&day<=x.to);
    if(absent)return {present:false,reason:absent.reason,source:absent.id};
    const p=(s.presencePlans||[]).find(p=>p.active&&p.memberId===mid&&day>=p.from&&(!p.until||day<=p.until));
    if(!p)return {present:true,reason:'Sin ausencia prevista',source:null};
    const i=((dayDiff(day,p.anchor)%p.cycle.length)+p.cycle.length)%p.cycle.length;
    return {present:p.cycle[i],reason:p.cycle[i]?'En casa':p.title,source:p.id,index:i};
  }
  function legacyHomaApplyAbsences(s){
    let changed=false;
    for(const w of (s.weeks||[]).filter(w=>w.status==='open'))for(const t of w.tasks){
      if(t.kind!=='normal')continue;const p=t.flexible&&t.windowDates?.length?{present:true}:presenceOn(s,t.memberId,t.date);
      if(!p.present&&['pending','review','missed'].includes(t.status)){
        t.beforeExcuse=t.status;t.status='excused';t.absenceId=p.source;t.excuse=p.reason;t.autoPresence=true;changed=true;
      }else if(t.status==='excused'&&(t.autoPresence||t.absenceId)){
        if(p.present){t.status=t.beforeExcuse||'pending';delete t.beforeExcuse;delete t.absenceId;delete t.excuse;delete t.autoPresence;changed=true;}
        else if(t.absenceId!==p.source||t.excuse!==p.reason){t.absenceId=p.source;t.excuse=p.reason;changed=true;}
      }
    }return changed;
  }
  function cancelPresence(s,id,a){requireAdult(a);const p=s.presencePlans.find(x=>x.id===id)||s.presenceOverrides.find(x=>x.id===id);if(p){p.active=false;presenceVersions(s,p.memberId);}applyAbsences(s);}
  function cancelAbsence(s,id,a){requireAdult(a);const x=s.absences.find(x=>x.id===id);if(!x||!x.active)return false;x.active=false;applyAbsences(s);return true;}
  const SHOPS=['Mercadona','Lidl','Aldi','Alcampo','Carrefour','Otra tienda'];
  const FOOD_ICONS=[[/tomat/,'\u{1F345}'],[/patat/,'\u{1F954}'],[/zanahoria/,'\u{1F955}'],[/cebolla/,'\u{1F9C5}'],[/ajo/,'\u{1F9C4}'],[/pimiento/,'\u{1FAD1}'],[/calabaz/,'\u{1F383}'],[/brocoli/,'\u{1F966}'],[/pepino|calabacin/,'\u{1F952}'],[/aguacate/,'\u{1F951}'],[/lechuga|espinaca|verdura/,'\u{1F96C}'],[/champinon|seta/,'\u{1F344}'],[/huevo|tortilla/,'\u{1F95A}'],[/leche|yogur|nata/,'\u{1F95B}'],[/queso|mozzarella/,'\u{1F9C0}'],[/pollo|pavo/,'\u{1F357}'],[/carne|ternera|cerdo|jamon/,'\u{1F969}'],[/pescado|merluza|salmon|atun/,'\u{1F41F}'],[/garbanzo|lenteja|alubia/,'\u{1FAD8}'],[/arroz/,'\u{1F35A}'],[/pasta|espagueti|macarron/,'\u{1F35D}'],[/pan|tostad/,'\u{1F35E}'],[/avena|harina|cereal/,'\u{1F33E}'],[/aceite/,'\u{1FAD2}'],[/sal|pimienta/,'\u{1F9C2}'],[/manzana/,'\u{1F34E}'],[/platano/,'\u{1F34C}'],[/fresa/,'\u{1F353}'],[/limon/,'\u{1F34B}'],[/naranja/,'\u{1F34A}'],[/maiz/,'\u{1F33D}'],[/agua/,'\u{1F4A7}'],[/caldo|sopa|crema/,'\u{1F963}'],[/pizza/,'\u{1F355}']];
  function foodIcon(name){const n=norm(name);return FOOD_ICONS.find(([re])=>re.test(n))?.[1]||'\u{1F34F}';}
  const FOOD_ALIASES={tomate:'tomates',patata:'patatas',huevo:'huevos',zanahoria:'zanahorias',garbanzo:'garbanzos',cebollas:'cebolla',pimientos:'pimiento',champi\u00f1on:'champi\u00f1ones'};
  function foodKey(name){const k=norm(name);return norm(FOOD_ALIASES[k]||k);}
  function foodRecord(s,name){return (s.foods||[]).find(f=>foodKey(f.name)===foodKey(name)||f.aliases?.some(a=>foodKey(a)===foodKey(name)));}
  function upsertFood(s,input){
    ensureV3(s);const name=String(input.name||'').trim();if(!name||name.length>160)throw new Error('El ingrediente necesita un nombre.');photoGuard(input.photo);
    const old=foodRecord(s,name),v={id:old?.id||uid('food'),name,icon:String(input.icon||old?.icon||foodIcon(name)).slice(0,20),photo:input.photo??old?.photo??'',category:input.category||old?.category||'Despensa',store:input.store??old?.store??'',product:input.product??old?.product??''};
    if(v.product.length>200||v.store.length>80)throw new Error('La referencia de producto es demasiado larga.');
    if(old)Object.assign(old,v);else s.foods.push(v);return old||v;
  }
  function stock(s,name,unit,today=iso()){return s.pantry.filter(p=>foodKey(p.name)===foodKey(name)&&(!p.expires||p.expires>=today)).reduce((n,p)=>{const q=quantity(p.quantity+' '+p.unit);return n+(q?.unit===unit?q.n:0);},0);}
  function missingIngredients(s,plans,today=iso(),listId='groceries'){
    const grouped=new Map(),manual=[];
    for(const p of plans){const r=s.recipes.find(r=>r.id===p.recipeId);if(!r||p.pantryUsedAt)continue;
      for(const i of r.ingredients){const scaled=scaleQuantity(i.quantity,p.servings/r.servings),q=quantity(scaled),f=foodRecord(s,i.name);
        const meta={name:f?.name||i.name,icon:f?.icon||i.icon||foodIcon(i.name),photo:f?f.photo:i.photo||'',store:f?.store||i.store||s.settings.preferredShop||'',product:f?.product||i.product||'',category:i.category||f?.category||'Despensa'};
        if(!q){manual.push({...meta,quantity:scaled,key:foodKey(i.name)+'@'+norm(scaled)});continue;}
        const key=foodKey(i.name)+'@'+q.unit,row=grouped.get(key)||{...meta,unit:q.unit,need:0};row.need+=q.n;grouped.set(key,row);
      }
    }
    const rows=[...grouped.values()].map(row=>{const have=stock(s,row.name,row.unit,today),listed=s.shopping.filter(x=>!x.checked&&(x.listId||'groceries')===listId&&foodKey(x.name)===foodKey(row.name)).reduce((n,x)=>{const q=quantity(x.quantity);return n+(q?.unit===row.unit?q.n:0);},0);return {...row,have,listed,missing:Math.max(0,Math.round((row.need-have-listed)*1000)/1000)};});
    return {rows,manual};
  }
  function addMissing(s,plans,listId='groceries'){
    const preview=missingIngredients(s,plans,iso(),listId);let n=0;
    for(const r of preview.rows){if(r.missing<=0)continue;const x=s.shopping.find(x=>!x.checked&&(x.listId||'groceries')===listId&&foodKey(x.name)===foodKey(r.name)&&quantity(x.quantity)?.unit===r.unit);
      if(x){x.quantity=qtyLabel(quantity(x.quantity).n+r.missing,r.unit);}else s.shopping.push({id:uid('shop'),listId,name:r.name,quantity:qtyLabel(r.missing,r.unit),category:r.category,icon:r.icon,photo:r.photo,store:r.store,product:r.product,checked:false});n++;
    }
    for(const r of preview.manual){if(s.shopping.some(x=>!x.checked&&(x.listId||'groceries')===listId&&x.manualKey===r.key))continue;s.shopping.push({id:uid('shop'),...r,checked:false,manualKey:r.key,needsReview:true});n++;}
    return {count:n,manual:preview.manual.length};
  }
  function seedV3(s,today){
    ensureV3(s);const av={ana:'\u{1F467}',leo:'\u{1F466}',mama:'\u{1F469}',papa:'\u{1F468}'};
    for(const m of s.members){m.avatar=av[m.id]||m.avatar;for(const w of s.weeks){const snap=w.members.find(x=>x.id===m.id);if(snap)snap.avatar=m.avatar;}}
    for(const r of s.recipes)for(const i of r.ingredients)upsertFood(s,{...i,icon:foodIcon(i.name)});
    addRecipeLibrary(s);return seedEvents31(s,today);
  }
  function addRecipeLibrary(s){let n=0;for(const r of RECIPE_LIBRARY){if(s.recipes.some(x=>x.id===r.id))continue;const v=copy(r);s.recipes.push(v);for(const i of v.ingredients)if(!foodRecord(s,i.name))upsertFood(s,i);n++;}return n;}
  function validateV3(s){
    const ok=(v,m)=>{if(!v)throw new Error('Copia v3 no v\u00e1lida: '+m);};
    for(const name of ['presencePlans','presenceOverrides','foods'])ok(Array.isArray(s[name])&&s[name].length<=10000,name);
    ok(Array.isArray(s.finance.savingsPlans)&&s.finance.savingsPlans.length<=100,'ahorros');
    ok(new Set(s.finance.savingsPlans.map(p=>p.memberId)).size===s.finance.savingsPlans.length,'planes de ahorro duplicados');
    for(const p of s.finance.savingsPlans)ok(s.members.some(m=>m.id===p.memberId)&&Number.isFinite(p.rate)&&p.rate>=0&&p.rate<=100&&RATE_DAYS[p.period]&&typeof p.enabled==='boolean'&&validDate(p.since)&&validDate(p.nextDay)&&p.nextDay>=p.since&&Number.isInteger(p.carryMicro)&&p.carryMicro>=0&&p.carryMicro<1000000&&Array.isArray(p.history),'intereses');
    for(const a of s.finance.accounts)if(a.policy==='tiers')validateTiers(a.tiers);
    for(const d of s.finance.dues)if(d.policy==='tiers')validateTiers(d.tiers);
    const mids=new Set(s.members.map(m=>m.id));
    for(const p of s.presencePlans){ok(mids.has(p.memberId)&&typeof p.id==='string'&&/^[\w.-]+$/.test(p.id)&&validDate(p.anchor)&&validDate(p.from)&&(!p.until||validDate(p.until)&&p.until>=p.from)&&typeof p.active==='boolean'&&typeof p.title==='string'&&p.title.length<=160,'convivencia');presencePattern('custom',true,p.cycle);}
    for(const p of s.presencePlans.filter(p=>p.active))ok(!s.presencePlans.some(q=>q!==p&&q.active&&q.memberId===p.memberId&&q.from<=(p.until||'9999-12-31')&&p.from<=(q.until||'9999-12-31')),'vigencias de convivencia solapadas');
    for(const x of s.presenceOverrides)ok(mids.has(x.memberId)&&typeof x.id==='string'&&/^[\w.-]+$/.test(x.id)&&validDate(x.from)&&validDate(x.to)&&x.to>=x.from&&typeof x.present==='boolean'&&typeof x.active==='boolean'&&typeof x.reason==='string'&&x.reason.length<=160,'excepci\u00f3n');
    for(const x of s.presenceOverrides.filter(x=>x.active))ok(!s.presenceOverrides.some(y=>y!==x&&y.active&&y.memberId===x.memberId&&y.from<=x.to&&y.to>=x.from),'excepciones solapadas');
    for(const f of s.foods)ok(typeof f.name==='string'&&f.name.trim()&&f.name.length<=160&&typeof f.id==='string'&&typeof f.icon==='string'&&f.icon.length<=20&&safePhoto(f.photo),'ingrediente');
    for(const m of s.members)ok(safePhoto(m.photo),'foto de perfil');
    for(const w of s.weeks)for(const m of w.members)ok(safePhoto(m.photo),'foto del historial');
    for(const r of s.recipes){ok(safePhoto(r.photo),'foto de receta');for(const i of r.ingredients)ok(safePhoto(i.photo),'foto de ingrediente');}
    for(const x of [...s.shopping,...s.pantry])ok(safePhoto(x.photo),'foto de producto');
    for(const e of s.finance.ledger)if(e.type==='interest')ok(validDate(e.effectiveDate)&&validDate(e.interestDay)&&e.effectiveDate===addDays(e.interestDay,1)&&Number.isSafeInteger(e.baseCents)&&e.baseCents>=0&&Number.isFinite(e.rate)&&e.rate>=0&&e.rate<=100&&RATE_DAYS[e.period]&&Object.keys(e.delta).length===1&&e.delta.savings>0,'asiento de intereses');
    return s;
  }

/* Special events: inclusive date ranges and independent preparation checklists. */
const EVENT_TYPES=Object.freeze({
 family:{label:'Plan familiar',emoji:'\u{1F4C5}',tone:'purple',items:[]},
 vacaciones:{label:'Vacaciones',emoji:'\u{1F3D6}\uFE0F',tone:'sand',items:['Confirmar alojamiento y transporte','Revisar la documentaci\u00f3n','Preparar ropa y calzado','Preparar el neceser','Cargadores y objetos personales','Revisar la casa antes de salir']},
 cole:{label:'Vuelta al cole',emoji:'\u{1F392}',tone:'lilac',items:['Revisar la lista de material del colegio','Preparar la mochila y el estuche','Etiquetar ropa y material','Revisar ropa y calzado','Confirmar horarios y transporte','Preparar botella y almuerzo']},
 colonias:{label:'Colonias',emoji:'\u{1F3D5}\uFE0F',tone:'sage',items:['Revisar las indicaciones de la organizaci\u00f3n','Entregar autorizaciones y documentaci\u00f3n','Etiquetar ropa y objetos personales','Preparar mudas y pijama','Preparar neceser y toalla','Preparar calzado y ropa de abrigo','Llevar botella de agua','Confirmar punto de salida y recogida']},
 excursion:{label:'Excursi\u00f3n',emoji:'\u{1F333}',tone:'sage',items:['Revisar la autorizaci\u00f3n','Preparar mochila','Preparar botella de agua','Preparar almuerzo','Revisar calzado y ropa','Confirmar punto de encuentro y horarios']},
 cumple:{label:'Cumplea\u00f1os',emoji:'\u{1F382}',tone:'rose',items:['Confirmar asistencia','Preparar el regalo','Confirmar lugar y horario']},
 otro:{label:'Otro evento',emoji:'\u{1F4CC}',tone:'purple',items:[]}
});
function eventType(e){return Object.hasOwn(EVENT_TYPES,e?.eventType)?e.eventType:'family';}
function eventParticipants(e){return Array.isArray(e.memberIds)?e.memberIds:(e.memberId?[e.memberId]:[]);}
function eventForPerson(e,mid){const ids=eventParticipants(e);return !mid||mid==='all'||!ids.length||ids.includes(mid);}
function eventOnDate(e,d){return validDate(d)&&e.date<=d&&(e.endDate||e.date)>=d;}
function eventProgress(s,eventId){const p=s.preparations.find(p=>p.eventId===eventId),total=p?.items.length||0,done=p?.items.filter(i=>i.done).length||0;return {total,done,remaining:total-done,percent:total?Math.round(done*100/total):0};}
function canCheckEventItem(s,p,item,a){
 if(a?.role==='adult')return true;
 if(a?.role!=='member'||!s.members.some(m=>m.id===a.memberId&&m.active!==false))return false;
 const assigned=item.memberId||p.memberId;
 if(assigned)return assigned===a.memberId;
 const e=s.events.find(e=>e.id===p.eventId);return !!e&&eventForPerson(e,a.memberId);
}
function setPrepItemState(s,id,itemId,done,a){
 const p=s.preparations.find(p=>p.id===id),i=p?.items.find(i=>i.id===itemId);
 if(!p||!i)throw new Error('No se encuentra este elemento de la lista.');
 if(typeof done!=='boolean'||!canCheckEventItem(s,p,i,a))throw new Error('Solo puedes marcar tus preparativos o los compartidos de tus eventos.');
 if(i.done===done)return false;
 i.done=done;i.doneAt=done?new Date().toISOString():null;i.doneBy=done?(a.memberId||'adult'):null;return true;
}
function togglePrep(s,id,itemId,a){const p=s.preparations.find(p=>p.id===id),i=p?.items.find(i=>i.id===itemId);if(!i)throw new Error('Lista no encontrada.');return setPrepItemState(s,id,itemId,!i.done,a);}
function checkedEventInput(s,input){
 const text=(v,max,label)=>{if(typeof v!=='string'||v.length>max)throw new Error('Revisa '+label+'.');return v.trim();};
 const title=text(input.title,160,'el nombre');if(!title)throw new Error('Escribe el nombre del evento.');
 const date=input.date,endDate=input.endDate||date,allDay=input.allDay!==false;
 if(!validDate(date)||!validDate(endDate)||endDate<date)throw new Error('La fecha final debe ser igual o posterior al inicio.');
 const time=allDay?'':input.time,endTime=allDay?'':input.endTime,clock=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!allDay&&(!clock.test(time)||!clock.test(endTime)||endDate+'T'+endTime<=date+'T'+time))throw new Error('Revisa las horas: el final debe ser posterior al inicio.');
 const type=input.eventType||'family';if(!Object.hasOwn(EVENT_TYPES,type))throw new Error('Selecciona un tipo de evento.');
 const ids=input.memberIds||[];
 if(!Array.isArray(ids)||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>!s.members.some(m=>m.id===id)))throw new Error('Revisa los participantes.');
 return {title,date,endDate,time,endTime,allDay,eventType:type,location:text(input.location||'',300,'la ubicaci\u00f3n'),description:text(input.description||'',5000,'las notas'),memberIds:[...ids],memberId:ids.length===1?ids[0]:'',category:EVENT_TYPES[type].label};
}
function checkedChecklist(s,rows,previous=null){
 if(!Array.isArray(rows)||rows.length>100)throw new Error('La lista admite hasta 100 elementos.');
 const seen=new Set();
 return rows.map(row=>{
  if(typeof row.title!=='string'||!row.title.trim()||row.title.length>160)throw new Error('Cada elemento necesita un nombre de hasta 160 caracteres.');
  const mid=row.memberId||'',due=row.dueDate||'';
  if(mid&&!s.members.some(m=>m.id===mid))throw new Error('Revisa el responsable de la lista.');
  if(due&&!validDate(due))throw new Error('Revisa la fecha de preparaci\u00f3n.');
  const old=previous?.items.find(i=>i.id===row.id),id=old?.id||uid('check');
  if(seen.has(id))throw new Error('Hay elementos repetidos en la lista.');seen.add(id);
  return {id,title:row.title.trim(),memberId:mid,dueDate:due,done:old?.done===true,doneAt:old?.doneAt||null,doneBy:old?.doneBy||null};
 });
}
function saveFamilyEvent(s,input,rows,a){
 requireAdult(a);
 const old=input.id?s.events.find(e=>e.id===input.id):null;
 if(input.id&&!old)throw new Error('El evento ya no existe.');
 const val=checkedEventInput(s,input),p=old?s.preparations.find(p=>p.eventId===old.id):null,items=checkedChecklist(s,rows,p);
 const e={...(old||{}),...val,id:old?.id||uid('event'),revision:(old?.revision||0)+1};
 if(old)Object.assign(old,e);else s.events.push(e);
 if(items.length){
  if(p){p.items=items;p.memberId='';}
  else s.preparations.push({id:uid('prep'),eventId:e.id,memberId:'',items});
 }else if(p)s.preparations=s.preparations.filter(x=>x!==p);
 return old||e;
}
function deleteFamilyEvent(s,id,a){requireAdult(a);const n=s.events.length;s.events=s.events.filter(e=>e.id!==id);s.preparations=s.preparations.filter(p=>p.eventId!==id);return s.events.length!==n;}
function validateEvents31(s){
 const ok=(v)=>{if(!v)throw new Error('Copia no v\u00e1lida: datos de eventos o checklist.');};
 for(const e of s.events){
  ok(e.location==null||typeof e.location==='string'&&e.location.length<=300);
  ok(e.eventType==null||Object.hasOwn(EVENT_TYPES,e.eventType));
  if(e.memberIds!=null)ok(Array.isArray(e.memberIds)&&e.memberIds.length<=100&&new Set(e.memberIds).size===e.memberIds.length&&e.memberIds.every(id=>s.members.some(m=>m.id===id)));
 }
 const active=s.preparations.filter(p=>s.events.some(e=>e.id===p.eventId));
 ok(new Set(active.map(p=>p.eventId)).size===active.length);
 for(const p of s.preparations){
  ok(new Set(p.items.map(i=>i.id)).size===p.items.length);
  for(const i of p.items){ok(/^[\w.:@-]+$/.test(i.id)&&!!i.title.trim());ok(!i.memberId||s.members.some(m=>m.id===i.memberId));ok(!i.dueDate||validDate(i.dueDate));}
 }
 return s;
}
function seedEvents31(s,today){
 const a={role:'adult'},defs=[
  ['vacaciones','Escapada de oto\u00f1o',9,12,'Alojamiento familiar',['ana','leo','mama','papa']],
  ['cole','Preparar la vuelta al cole',2,2,'Colegio',['ana','leo']],
  ['colonias','Colonias de Ana',18,20,'Casa de colonias',['ana']],
  ['excursion','Excursi\u00f3n en familia',5,5,'Punto de encuentro por confirmar',[]]
 ];
 for(const [type,title,start,end,location,ids]of defs){
  const e=saveFamilyEvent(s,{title,date:addDays(today,start),endDate:addDays(today,end),allDay:true,eventType:type,location,memberIds:ids,description:'Evento de ejemplo. Sustituye fechas, lugar y lista por los de tu familia.'},EVENT_TYPES[type].items.map(title=>({title})),a);
  if(type==='vacaciones'){const p=s.preparations.find(p=>p.eventId===e.id);p.items.slice(0,2).forEach(i=>i.done=true);}
 }
 return s;
}

  /* La Homa 4: presence-normalised weekly scores, no allowance for whole weeks away.
     Historic closed weeks and actual ledger entries are deliberately immutable.
     Base task weights remain unchanged; display/score use deterministic integers. */
  function homaNominalTarget(s, mid) {
    return s.templates.filter(t=>t.active!==false&&t.memberIds.includes(mid))
      .reduce((sum,t)=>sum+t.points*(t.frequency==='flexible'?(t.quota||1):t.frequency==='monthly'?1:new Set(t.days).size),0);
  }
  function enableHomaRules(s,today=iso()) {
    if(!s.settings.homaRules) s.settings.homaRules={version:1,fromWeek:monday(today),targets:{}};
    applyAbsences(s);
    syncAllowanceDues(s,today);
    return s;
  }
  function configureHomaTarget(s,mid,target,a,today=iso()) {
    requireAdult(a);
    if(!s.members.some(m=>m.id===mid)||!Number.isInteger(target)||target<1||target>100000)
      throw new Error('El objetivo semanal debe ser un entero entre 1 y 100.000 puntos.');
    enableHomaRules(s,today);s.settings.homaRules.targets[mid]=target;
    syncHomaWeeks(s);logHouse(s,'Objetivo semanal estable actualizado. El historial cerrado no cambia.');
  }
  function homaDates(s,mid,start) {
    return Array.from({length:7},(_,i)=>addDays(start,i)).filter(d=>presenceOn(s,mid,d).present);
  }
  function syncHomaWeeks(s) {
    const rules=s.settings.homaRules;if(!rules)return false;let changed=false;
    for(const w of s.weeks.filter(w=>w.status==='open'&&w.start>=rules.fromWeek)) {
      const old=JSON.stringify(w.homa||null),previous=w.homa?.members||{};
      w.homa={version:1,members:{}};
      for(const m of w.members) {
        const presentDates=homaDates(s,m.id,w.start);
        const hasPattern=s.presencePlans?.some(p=>p.memberId===m.id&&p.active)||
          s.presenceOverrides?.some(p=>p.memberId===m.id&&p.active)||
          s.absences?.some(p=>p.memberId===m.id&&p.active);
        if(hasPattern&&!Object.hasOwn(rules.targets,m.id)) {
          const nominal=homaNominalTarget(s,m.id)||w.tasks.filter(t=>t.memberId===m.id&&t.kind==='normal').reduce((n,t)=>n+t.points,0);
          if(nominal>0)rules.targets[m.id]=nominal;
        }
        // All profiles retain a presence snapshot, but only configured ones normalise.
        const fixed=rules.targets[m.id]||null;
        w.homa.members[m.id]={presentDates,target:fixed,paused:presentDates.length===0};
      }
      if(old!==JSON.stringify(w.homa))changed=true;
    }
    return changed;
  }
  function applyAbsences(s){ensureWeb5(s);syncFlexibleWindows(s);const changed=legacyHomaApplyAbsences(s);return syncHomaWeeks(s)||changed;}
  function homaWeightMap(w,mid) {
    const cfg=w.homa?.members?.[mid];if(!cfg?.target)return null;
    const tasks=w.tasks.filter(t=>t.memberId===mid&&t.kind==='normal'&&t.status!=='excused');
    if(cfg.paused||!tasks.length)return new Map(tasks.map(t=>[t.id,0]));
    const sum=tasks.reduce((n,t)=>n+t.points,0);
    const values=tasks.map(t=>{const exact=t.points*cfg.target/sum;return {id:t.id,value:Math.floor(exact),remainder:exact-Math.floor(exact)};});
    let remainder=cfg.target-values.reduce((n,x)=>n+x.value,0);
    values.sort((a,b)=>b.remainder-a.remainder||a.id.localeCompare(b.id));
    for(let i=0;i<remainder;i++)values[i].value++;
    return new Map(values.map(x=>[x.id,x.value]));
  }
  function taskPoints(w,t) {
    if(t.status==='excused')return 0;
    if(t.kind==='recovery')return t.points;
    const cfg=w.homa?.members?.[t.memberId];
    if(cfg?.paused)return 0;
    return homaWeightMap(w,t.memberId)?.get(t.id)??t.points;
  }
  function stats(w,mid) {
    if(w.members?.find(m=>m.id===mid)?.role==='pet')return {points:0,target:0,earned:0,lost:0,remaining:0,percent:0,done:0,pending:0,review:0,excused:0,missed:0,recovery:0,total:0,paused:false};
    const result=legacyHomaStats(w,mid),cfg=w.homa?.members?.[mid];
    if(!cfg)return result;
    if(cfg.paused)return {...result,points:0,target:0,earned:0,lost:0,remaining:0,percent:0,paused:true,weeklyTarget:cfg.target,presentDays:0};
    if(!cfg.target)return {...result,paused:false,presentDays:cfg.presentDates.length};
    const weights=homaWeightMap(w,mid),tasks=w.tasks.filter(t=>t.memberId===mid);
    const value=t=>t.kind==='recovery'?t.points:t.status==='excused'?0:weights?.get(t.id)||0;
    const a=w.adjustments.filter(x=>x.memberId===mid);
    const earned=tasks.filter(t=>t.status==='done').reduce((n,t)=>n+value(t),0)+a.filter(x=>x.points>0).reduce((n,x)=>n+x.points,0);
    const lost=tasks.filter(t=>t.status==='missed').reduce((n,t)=>n+value(t),0)-a.filter(x=>x.points<0).reduce((n,x)=>n+x.points,0);
    const points=earned-lost,target=cfg.target;
    return {...result,points,target,earned,lost,remaining:Math.max(0,target-points),percent:Math.max(0,Math.min(100,Math.round(points/target*100))),paused:false,weeklyTarget:target,presentDays:cfg.presentDates.length,normalised:true};
  }
  function setStatus(w,id,status,a={role:'adult'},today=iso()) {
 const t=w.tasks.find(t=>t.id===id),permission=taskPermission(w,t,a,today);if(!permission.allowed)throw new Error(permission.reason);
 const before=stats(w,t.memberId).points;legacyHomaSetStatus(w,id,status,a);
 if(['done','review'].includes(t.status))t.completedOn=today;else delete t.completedOn;
 t.changedBy=a.memberId||a.userId||'adult';return stats(w,t.memberId).points-before;
}
  function homaAllowanceEligibility(s,d) {
    if(!s.settings.homaRules||d.week<s.settings.homaRules.fromWeek)return {eligible:true};
    const w=s.weeks.find(w=>w.start===d.week),snap=w?.homa?.members?.[d.memberId];
    const dates=w?.status==='closed'&&snap?snap.presentDates:homaDates(s,d.memberId,d.week);
    return {eligible:dates.length>0,presentDays:dates.length,reason:'Semana completa fuera de casa: no genera paga.'};
  }
  function syncAllowanceDues(s,today=iso()) {
    let changed=legacyHomaSyncAllowanceDues(s,today);
    if(!s.settings.homaRules)return changed;
    for(const d of s.finance.dues) {
      if(d.status==='paid'||d.status==='skipped'&&!d.homaAbsenceSkip)continue;
      const e=homaAllowanceEligibility(s,d);
      if(!e.eligible&&d.status==='pending') {
        d.previousCents=d.cents;d.cents=0;d.status='skipped';d.homaAbsenceSkip=true;d.skipReason=e.reason;changed=true;
      } else if(e.eligible&&d.homaAbsenceSkip) {
        // Correcting an open week's dates can restore a pending entitlement.
        // Closed-week absence snapshots cannot be changed this way.
        d.status='pending';d.cents=d.previousCents||0;delete d.previousCents;delete d.homaAbsenceSkip;delete d.skipReason;changed=true;
      }
    }
    return changed;
  }
  function payAllowance(s,id,a,today=iso()) {
    requireAdult(a);syncAllowanceDues(s,today);
    const d=s.finance.dues.find(x=>x.id===id);
    if(d&&d.status!=='paid'&&!homaAllowanceEligibility(s,d).eligible)throw new Error('Esta semana no genera paga: todos los dias estan fuera de casa.');
    return legacyHomaPayAllowance(s,id,a,today);
  }
  function validateHoma(s) {
    const r=s.settings.homaRules;if(!r)return;
    const fail=()=>{throw new Error('Configuracion de convivencia de La Homa no valida.');};
    if(r.version!==1||!validDate(r.fromWeek)||monday(r.fromWeek)!==r.fromWeek||!r.targets||Array.isArray(r.targets))fail();
    for(const [mid,t] of Object.entries(r.targets))if(!s.members.some(m=>m.id===mid)||!Number.isInteger(t)||t<1||t>100000)fail();
    for(const w of s.weeks)if(w.homa){
      if(w.homa.version!==1||!w.homa.members)fail();
      for(const [mid,c] of Object.entries(w.homa.members)){
        if(!w.members.some(m=>m.id===mid)||!Array.isArray(c.presentDates)||c.presentDates.length>7||new Set(c.presentDates).size!==c.presentDates.length||c.presentDates.some(d=>!validDate(d)||d<w.start||d>w.end)||c.target!==null&&(!Number.isInteger(c.target)||c.target<1||c.target>100000)||c.paused!==(c.presentDates.length===0))fail();
      }
    }
  }

  /* La Homa web 5. Domain extensions, shared by browser and server.
   All dates passed by the server are household-local ISO days. */
function ensureWeb5(s) {
  if (!s?.settings) return s;
  s.settings.timeZone ||= 'Europe/Madrid';
  s.shoppingLists ||= [{id:'groceries',name:'Supermercado',icon:'\u{1F6D2}',archived:false}];
  s.taskReviewRequests ||= []; s.savedMenus ||= []; s.eventFiles ||= []; s.notifications ||= [];
  s.settings.notifications ||= {enabled:true,events:true,checklists:true,approvals:true,allowance:true,leadMinutes:60,quietStart:'21:00',quietEnd:'08:00'};
  for (const x of s.shopping||[]) x.listId ||= 'groceries';
  s.settings.onboardingDismissed ??= false; s.settings.tutorialDismissed ??= !!s.settings.familyReady; s.settings.locale ||= (globalThis.HomaI18n?.getLocale?.() || 'es'); s.settings.allowAdultsSwitchProfiles ??= false; s.usualProducts ||= [];
  s.settings.country ??= ''; s.settings.province ??= '';
  for (const m of s.members || []) {
    if (m.email != null) m.email = String(m.email).trim().toLowerCase().slice(0, 254);
    if (m.userId != null) m.userId = String(m.userId).slice(0, 80);
    if (m.inviteStatus != null && !['none', 'pending', 'joined'].includes(m.inviteStatus)) m.inviteStatus = 'none';
    if (m.phone == null) m.phone = '';
    if (m.birthday == null) m.birthday = '';
  }
  if(typeof s.settings.familyReady!=='boolean'){const people=(s.members||[]).filter(m=>m.active!==false);s.settings.familyReady=!!(s.demo||people.length>1||(s.templates||[]).some(t=>t.active!==false));}
  if(globalThis.HomaI18n&&s.settings.locale)globalThis.HomaI18n.setLocale(s.settings.locale,false);
  for(const x of s.shopping||[])if(x.checked&&!s.usualProducts.some(y=>foodKey(y.name)===foodKey(x.name)))s.usualProducts.push({...copy(x),id:uid('usual')});
  return s;
}
function householdDay(s, now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:s.settings.timeZone||'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const m=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${m.year}-${m.month}-${m.day}`;
}
function taskPermission(w,t,a,today=iso()) {
  if(!t)return {allowed:false,reason:'La tarea ya no existe.'};
  if(a?.role==='adult')return {allowed:true};
  if(a?.memberId!==t.memberId)return {allowed:false,reason:'Esta tarea pertenece a otra persona.'};
  if(['missed','excused','review'].includes(t.status))return {allowed:false,reason:t.status==='missed'?'Pide a un adulto que revise esta tarea.':'Esta tarea necesita la revisi\u00f3n de un adulto.'};
  if(w.status==='closed'&&t.kind!=='recovery')return {allowed:false,reason:'La semana ya est\u00e1 cerrada.'};
  if(t.flexible){
    if(!t.windowDates?.includes(today))return {allowed:false,reason:'Esta tarea se hace en uno de tus d\u00edas en casa, dentro de esta semana.'};
    if(t.status!=='done'&&w.tasks.some(x=>x.id!==t.id&&x.templateId===t.templateId&&x.memberId===t.memberId&&['done','review'].includes(x.status)&&x.completedOn===today))return {allowed:false,reason:'Ya has hecho esta tarea hoy. Contin\u00faa otro d\u00eda.'};
  } else if(t.date>today&&!t.allowEarly)return {allowed:false,reason:'Todav\u00eda no toca. Estar\u00e1 disponible en su fecha.'};
  return {allowed:true};
}
function requestTaskReview(s,week,id,a,note='') {
  ensureWeb5(s);const w=s.weeks.find(w=>w.id===week),t=w?.tasks.find(t=>t.id===id);
  if(!t||a?.memberId!==t.memberId||a.role==='adult'||t.status!=='missed')throw new Error('Solo puedes pedir revisi\u00f3n de una tarea tuya no realizada.');
  if(s.taskReviewRequests.some(x=>x.week===week&&x.taskId===id&&x.status==='pending'))return false;
  s.taskReviewRequests.push({id:uid('review'),week,taskId:id,memberId:t.memberId,note:String(note).trim().slice(0,500),status:'pending',createdAt:nowStamp()});return true;
}
function resolveTaskReview(s,id,approve,a,today=iso()) {
  requireAdult(a);const x=s.taskReviewRequests.find(x=>x.id===id);if(!x||x.status!=='pending')return false;
  const w=s.weeks.find(w=>w.id===x.week),t=w?.tasks.find(t=>t.id===x.taskId);if(!t)throw new Error('La tarea ya no existe.');
  if(approve){if(w.status==='closed')throw new Error('La semana est\u00e1 cerrada. Asigna una recuperaci\u00f3n; el historial no se reabre.');setStatus(w,t.id,'done',a,today);}
  x.status=approve?'approved':'rejected';x.resolvedAt=nowStamp();logHouse(s,approve?'Solicitud de revisi\u00f3n aprobada.':'Solicitud de revisi\u00f3n rechazada.');return true;
}
function setTaskEarlyPermission(s,week,id,allow,a){requireAdult(a);const t=s.weeks.find(w=>w.id===week)?.tasks.find(t=>t.id===id);if(!t)throw new Error('Tarea no encontrada.');t.allowEarly=!!allow;}
function presenceVersions(s,mid){
  const plans=s.presencePlans.filter(p=>p.active&&p.memberId===mid).sort((a,b)=>a.from.localeCompare(b.from));
  for(let i=0;i<plans.length;i++){const p=plans[i];if(!Object.hasOwn(p,'naturalUntil'))p.naturalUntil=p.until||'';const next=plans[i+1];p.until=next&&(!p.naturalUntil||p.naturalUntil>=next.from)?addDays(next.from,-1):p.naturalUntil;}
}
function flexAppend(w,t,members,minDate,s) {
  if(!s)return;
  const ids=t.memberIds.filter(id=>members.some(m=>m.id===id&&m.active!==false));
  const wi=Math.round((Date.parse(w.start+'T00:00:00Z')-Date.parse((t.rotationStart||'2026-01-05')+'T00:00:00Z'))/604800000);
  const assigned=t.rotation&&ids.length?[ids[((wi%ids.length)+ids.length)%ids.length]]:ids;
  for(const mid of assigned){
    if(!w.members.some(m=>m.id===mid))w.members.push(memberSnapshot(members.find(m=>m.id===mid)));
    let dates=Array.from({length:7},(_,i)=>addDays(w.start,i)).filter(d=>(!minDate||d>=minDate)&&(!t.effectiveFrom||d>=t.effectiveFrom)&&presenceOn(s,mid,d).present);
    if(t.frequency==='flexible')dates=dates.filter(d=>t.days.includes((date(d).getDay()+6)%7));
    if(t.frequency==='monthly'){
      // A monthly responsibility moves to the next day in this home, never to a day away.
      dates=dates.filter(d=>{
        const first=d.slice(0,7)+'-'+pad(Math.min(28,t.monthDay||1));
        if(d<first)return false;let chosen=first;for(let i=0;i<31&&chosen.slice(0,7)===first.slice(0,7);i++,chosen=addDays(chosen,1)){if(presenceOn(s,mid,chosen).present)return d===chosen;}return false;
      });
    }
    const count=t.frequency==='monthly'?Math.min(1,dates.length):Math.min(t.quota||1,dates.length);
    for(let i=0;i<count;i++){
      const id=`${w.id}_${t.id}_${mid}_q${i}`;if(w.tasks.some(x=>x.id===id))continue;
      w.tasks.push({id,templateId:t.id,memberId:mid,title:t.title,description:t.description||'',points:t.points,category:t.category||'Casa',icon:t.icon||'house',kind:'normal',status:'pending',requiresReview:!!t.requiresReview,allowEarly:!!t.allowEarly,changedAt:null,date:t.frequency==='monthly'?dates[0]:dates.at(-1),flexible:t.frequency==='flexible',windowDates:dates,quotaIndex:i});
    }
  }
}
function taskOnDay(t,day){return t.flexible?(t.completedOn&&['done','review'].includes(t.status)?t.completedOn===day:(t.windowDates||[]).includes(day)):t.date===day;}
function syncFlexibleWindows(s){
  for(const w of s.weeks.filter(w=>w.status==='open'))for(const t of s.templates.filter(t=>t.active!==false&&['flexible','monthly'].includes(t.frequency))){
    // Preserve completed and reviewed records; only pending slots may be rebuilt.
    const old=w.tasks.filter(x=>x.templateId===t.id&&x.kind==='normal'&&['pending','excused'].includes(x.status));
    w.tasks=w.tasks.filter(x=>!old.includes(x));flexAppend(w,t,s.members,null,s);
  }
}
function recurringDates(event,spec) {
  if(!spec||spec.frequency==='none')return [event.date];
  if(!['daily','weekly','monthly'].includes(spec.frequency)||!Number.isInteger(spec.interval)||spec.interval<1||spec.interval>12||!validDate(spec.until)||spec.until<event.date||spec.until>addDays(event.date,730))throw new Error('Revisa la repetici\u00f3n: intervalo 1-12 y fecha final de hasta dos a\u00f1os.');
  const start=event.date,days=[...new Set(spec.days||[(date(start).getDay()+6)%7])];
  if(days.some(d=>!Number.isInteger(d)||d<0||d>6)||!days.length)throw new Error('Selecciona d\u00edas v\u00e1lidos de repetici\u00f3n.');
  const result=[];const startDate=date(start);let cursor=start;
  for(let i=0;i<=730&&cursor<=spec.until;i++,cursor=addDays(cursor,1)){
    let matches=false;
    if(spec.frequency==='daily')matches=i%spec.interval===0;
    if(spec.frequency==='weekly'){const week=Math.round((Date.parse(monday(cursor))-Date.parse(monday(start)))/604800000);matches=week%spec.interval===0&&days.includes((date(cursor).getDay()+6)%7);}
    if(spec.frequency==='monthly'){const dt=date(cursor),months=(dt.getFullYear()-startDate.getFullYear())*12+dt.getMonth()-startDate.getMonth();matches=months%spec.interval===0&&dt.getDate()===startDate.getDate();}
    if(matches)result.push(cursor);if(result.length>366)throw new Error('Una serie admite hasta 366 fechas. Reduce su duraci\u00f3n.');
  }
  if(!result.includes(start))throw new Error('La fecha inicial debe coincidir con los d\u00edas de la serie.');return result;
}
function saveEventSeries(s,input,rows,a,recurrence=null,scope='single',today=iso()) {
  requireAdult(a);const old=s.events.find(e=>e.id===input.id),seriesId=old?.seriesId;
  const root=seriesId?s.events.find(e=>e.id===seriesId):null;
  if(seriesId&&scope==='single'){
    const e=saveFamilyEvent(s,input,rows,a);e.seriesOverride=true;e.reminderMinutes=input.reminderMinutes??e.reminderMinutes??60;return e;
  }
  // Validate the whole series before mutating any event.
  const dates=recurringDates(input,recurrence),duration=Math.round((Date.parse(input.endDate||input.date)-Date.parse(input.date))/86400000);
  if(recurrence&&recurrence.frequency!=='none'&&dates.length>1&&duration>=Math.min(...dates.slice(1).map((d,i)=>(Date.parse(d)-Date.parse(dates[i]))/86400000)))throw new Error('La duraci\u00f3n se solapa con la siguiente repetici\u00f3n.');
  if(s.events.length+dates.length>20000)throw new Error('Demasiados eventos. Reduce la serie.');
  const master=saveFamilyEvent(s,{...input,id:root?.id||input.id},rows,a);
  master.reminderMinutes=input.reminderMinutes??60;
  if(!recurrence||recurrence.frequency==='none'){
    if(scope==='series'&&seriesId){const remove=new Set(s.events.filter(e=>e.seriesId===seriesId&&e.id!==master.id&&!e.seriesOverride&&e.date>=today).map(e=>e.id));s.events=s.events.filter(e=>!remove.has(e.id));s.preparations=s.preparations.filter(p=>!remove.has(p.eventId));s.eventFiles=s.eventFiles.filter(f=>!remove.has(f.eventId));}
    delete master.recurrence;delete master.seriesId;return master;
  }
  master.recurrence=copy(recurrence);master.seriesId=master.id;master.occurrenceDate=master.date;
  const desired=new Set(dates.map(d=>d===master.date?master.id:`${master.id}.on.${d}`));
  const remove=new Set(s.events.filter(e=>e.seriesId===master.id&&e.id!==master.id&&!e.seriesOverride&&e.date>=today&&!desired.has(e.id)).map(e=>e.id));
  s.events=s.events.filter(e=>!remove.has(e.id));s.preparations=s.preparations.filter(p=>!remove.has(p.eventId));
  for(const day of dates.slice(1)){
    const id=`${master.id}.on.${day}`,existing=s.events.find(e=>e.id===id);if(existing&&(existing.seriesOverride||existing.date<today))continue;
    const shifted=rows.map(r=>({...r,id:existing?s.preparations.find(p=>p.eventId===id)?.items.find(i=>i.title===r.title)?.id:undefined,dueDate:r.dueDate?addDays(r.dueDate,Math.round((Date.parse(day)-Date.parse(master.date))/86400000)):''}));
    const e=saveFamilyEvent(s,{...input,id:existing?.id||null,date:day,endDate:addDays(day,duration)},shifted,a);
    if(!existing){const randomId=e.id;e.id=id;for(const p of s.preparations)if(p.eventId===randomId)p.eventId=id;}
    e.seriesId=master.id;e.occurrenceDate=day;e.reminderMinutes=master.reminderMinutes;delete e.recurrence;
  }
  logHouse(s,'Serie de eventos guardada: '+dates.length+' fechas.');return master;
}
function deleteEventSeries(s,id,scope,a,today=iso()){
  requireAdult(a);const e=s.events.find(e=>e.id===id);if(!e)return false;
  if(scope==='series'&&e.seriesId){const ids=new Set(s.events.filter(x=>x.seriesId===e.seriesId&&x.date>=today).map(x=>x.id));s.events=s.events.filter(x=>!ids.has(x.id));s.preparations=s.preparations.filter(p=>!ids.has(p.eventId));s.eventFiles=s.eventFiles.filter(f=>!ids.has(f.eventId));}
  else {deleteFamilyEvent(s,id,a);s.eventFiles=s.eventFiles.filter(f=>f.eventId!==id);}
  return true;
}
function addShoppingList(s,name,a,icon='\u{1F6D2}'){
  requireAdult(a);ensureWeb5(s);name=String(name).trim();if(!name||name.length>60)throw new Error('Nombre de lista de 1 a 60 caracteres.');if(s.shoppingLists.filter(l=>!l.archived).length>=30)throw new Error('M\u00e1ximo 30 listas activas.');const list={id:uid('list'),name,icon:String(icon).slice(0,20)||'\u{1F6D2}',archived:false};s.shoppingLists.push(list);return list;
}
function archiveShoppingList(s,id,a){requireAdult(a);if(id==='groceries')throw new Error('La lista principal se conserva.');const l=s.shoppingLists.find(l=>l.id===id);if(!l)return;if(s.shopping.some(x=>x.listId===id&&!x.checked))throw new Error('Completa o mueve los productos pendientes antes de archivar.');l.archived=true;}
function setShoppingState(s,id,done){const x=s.shopping.find(x=>x.id===id);if(!x)throw new Error('Producto no encontrado.');x.checked=!!done;return x;}
function menuServings(s,day){return s.members.filter(m=>m.active!==false&&m.role!=='pet'&&presenceOn(s,m.id,day).present).length;}
function copyMenu(s,fromWeek,toWeek,a,adjust=true){
  requireAdult(a);if(!validDate(fromWeek)||!validDate(toWeek)||fromWeek===toWeek)throw new Error('Elige una semana distinta.');
  const source=s.mealPlan.filter(p=>p.date>=fromWeek&&p.date<=addDays(fromWeek,6));let copied=0,skipped=0;
  for(const p of source){const offset=Math.round((Date.parse(p.date)-Date.parse(fromWeek))/86400000),day=addDays(toWeek,offset),n=adjust?menuServings(s,day):p.servings;if(n===0||s.mealPlan.some(x=>x.date===day&&x.slot===p.slot)){skipped++;continue;}s.mealPlan.push({id:uid('meal'),date:day,slot:p.slot,recipeId:p.recipeId,servings:Math.min(30,n)});copied++;}return {copied,skipped};
}
function saveMenu(s,week,name,a){requireAdult(a);ensureWeb5(s);const plans=s.mealPlan.filter(p=>p.date>=week&&p.date<=addDays(week,6));if(!plans.length)throw new Error('Este men\u00fa est\u00e1 vac\u00edo.');if(!String(name).trim())throw new Error('Pon nombre al men\u00fa.');const record={id:uid('menu'),name:String(name).slice(0,80),plans:plans.map(p=>({offset:Math.round((Date.parse(p.date)-Date.parse(week))/86400000),slot:p.slot,recipeId:p.recipeId,servings:p.servings}))};s.savedMenus.push(record);return record;}
function applySavedMenu(s,id,week,a){requireAdult(a);const menu=s.savedMenus.find(x=>x.id===id);if(!menu)throw new Error('Men\u00fa no disponible.');let count=0;for(const p of menu.plans){const d=addDays(week,p.offset),servings=menuServings(s,d);if(!servings||s.mealPlan.some(x=>x.date===d&&x.slot===p.slot)||!s.recipes.some(r=>r.id===p.recipeId))continue;s.mealPlan.push({id:uid('meal'),date:d,slot:p.slot,recipeId:p.recipeId,servings:Math.min(30,servings)});count++;}return count;}
function reminderItems(s,now=new Date()){
  ensureWeb5(s);const cfg=s.settings.notifications;if(!cfg.enabled)return [];const today=householdDay(s,now),items=[];
  if(cfg.events)for(const e of s.events.filter(e=>e.date>=today&&e.date<=addDays(today,1)))items.push({id:'event:'+e.id,title:e.title,detail:e.date+(e.time?' '+e.time:'')+(e.location?' \u00b7 '+e.location:''),view:'events',eventId:e.id,memberIds:eventParticipants(e),kind:'event'});
  if(cfg.checklists)for(const p of s.preparations)for(const i of p.items.filter(i=>!i.done&&i.dueDate&&i.dueDate<=today)){const e=s.events.find(e=>e.id===p.eventId);if(e&&(e.endDate||e.date)>=today)items.push({id:'prep:'+i.id,title:i.title,detail:e.title+' \u00b7 preparar '+i.dueDate,view:'events',eventId:p.eventId,memberIds:i.memberId?[i.memberId]:eventParticipants(e),kind:'checklist'});}
  if(cfg.allowance)for(const d of s.finance.dues.filter(d=>d.status==='pending'&&(d.payDate||d.dueDate)<=today))items.push({id:'allowance:'+d.id,title:'Paga pendiente de confirmar',detail:s.members.find(m=>m.id===d.memberId)?.name||'',view:'money',kind:'adult'});
  return items;
}
function approvalItems(s){ensureWeb5(s);return [
  ...s.weeks.flatMap(w=>w.tasks.filter(t=>t.status==='review').map(t=>({id:t.id,week:w.id,type:'task',title:t.title,memberId:t.memberId}))),
  ...s.taskReviewRequests.filter(x=>x.status==='pending').map(x=>({...x,type:'correction',title:s.weeks.find(w=>w.id===x.week)?.tasks.find(t=>t.id===x.taskId)?.title||'Tarea archivada'})),
  ...s.finance.requests.filter(x=>x.status==='pending').map(x=>({...x,type:'spend',title:x.note||x.title||'Solicitud de gasto'})),
  ...s.vouchers.filter(x=>x.status==='requested').map(x=>({...x,type:'voucher',title:x.title||'Planear una recompensa'}))
];}
function validateWeb5(s){
  ensureWeb5(s);const fail=m=>{throw new Error('Datos de La Homa no v\u00e1lidos: '+m);};
  try{new Intl.DateTimeFormat('es',{timeZone:s.settings.timeZone});}catch(_){fail('zona horaria');}
  for(const key of ['usualProducts','shoppingLists','taskReviewRequests','savedMenus','eventFiles','notifications'])if(!Array.isArray(s[key])||s[key].length>20000)fail(key);
  if(new Set(s.shoppingLists.map(x=>x.id)).size!==s.shoppingLists.length)fail('listas duplicadas');
  for(const l of s.shoppingLists)if(!/^[\w.-]+$/.test(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name.length>60)fail('lista');
  for(const t of s.templates){if(t.frequency==='flexible'&&(!Number.isInteger(t.quota)||t.quota<1||t.quota>7))fail('cuota semanal');if(t.frequency==='monthly'&&(!Number.isInteger(t.monthDay)||t.monthDay<1||t.monthDay>28))fail('d\u00eda mensual');}
  for(const r of s.taskReviewRequests)if(!['pending','approved','rejected'].includes(r.status)||!s.members.some(m=>m.id===r.memberId))fail('revisi\u00f3n');
  for(const f of s.eventFiles)if(!/^[\w.-]+$/.test(f.id)||!Number.isInteger(f.size)||f.size<1||f.expires&&!validDate(f.expires)||!s.events.some(e=>e.id===f.eventId)||!['application/pdf','image/jpeg','image/png','image/webp','text/plain'].includes(f.mime)||f.size>5*1024*1024||!f.name||f.name.length>200)fail('adjunto');
  return s;
}

  return Object.freeze({ensureWeb5,householdDay,taskOnDay,taskPermission,requestTaskReview,resolveTaskReview,setTaskEarlyPermission,recurringDates,saveEventSeries,deleteEventSeries,addShoppingList,archiveShoppingList,setShoppingState,menuServings,copyMenu,saveMenu,applySavedMenu,reminderItems,approvalItems,validateWeb5,iso,date,validDate,addDays,monday,uid,copy,contribution,memberSnapshot,ageFromBirthday,syncMemberAges,generateWeek,appendTemplate,syncTemplate,closeWeek,rollover,stats,rewardState,setStatus,addRecovery,claimReward,validateState,seed,scaleQuantity,mergeQuantity,addIngredients,exportICS,parseICS,resetV2,upgradeState,syncV2,validateV2,logHouse,norm,moneyCents,balances,postMoney,transferMoney,addGoal,configureAllowance,syncAllowanceDues,payAllowance,requestSpend,resolveSpend,reverseMoney,syncVouchers,requestVoucher,approveVoucher,useVoucher,routineTasks,addAbsence,applyAbsences,cancelAbsence,proposeSwap,resolveSwap,PREP_SETS,createPrep,togglePrep,quantity,qtyLabel,stock,missingIngredients,addMissing,receiveShopping,consumeMeal,meeting,addProposal,voteProposal,ensureV3,safePhoto,photoGuard,validateTiers,tierFor,allowanceQuote,RATE_DAYS,configureSavings,accrueInterest,savingsProjection,dailySavingsBase,presencePattern,configurePresence,setPresenceOverride,presenceOn,cancelPresence,foodIcon,foodKey,foodRecord,upsertFood,SHOPS,RECIPE_LIBRARY,addRecipeLibrary,validateV3,enableHomaRules,configureHomaTarget,homaNominalTarget,taskPoints,homaAllowanceEligibility,EVENT_TYPES,eventType,eventParticipants,eventForPerson,eventOnDate,eventProgress,canCheckEventItem,setPrepItemState,saveFamilyEvent,deleteFamilyEvent,validateEvents31});
});
