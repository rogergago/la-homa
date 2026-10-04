/* Family Points v1.0 - deterministic domain logic, no dependencies. */
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
    return w;
  }
  function appendTemplate(w,t,members,minDate=null) {
    for(const mid of t.memberIds) {
      if (!members.some(m=>m.id===mid && m.active!==false)) continue;
      if (!w.members.some(m=>m.id===mid)) w.members.push(memberSnapshot(members.find(m=>m.id===mid)));
      for (const day of [...new Set(t.days)].sort()) {
        const d=addDays(w.start,day), id=`${w.id}_${t.id}_${mid}_${day}`;
        if ((minDate && d<minDate) || w.tasks.some(x=>x.id===id)) continue;
        w.tasks.push({id,templateId:t.id,memberId:mid,date:d,title:t.title,description:t.description||'',points:t.points,category:t.category||'Casa',icon:t.icon||'house',kind:'normal',status:'pending',changedAt:null});
      }
    }
  }
  function syncTemplate(state,t,minDate=iso()) {
    const w=state.weeks.find(w=>w.start===monday(minDate));
    if(!w||w.status!=='open') return;
    w.tasks=w.tasks.filter(x=>!(x.templateId===t.id && x.status==='pending' && x.date>=minDate));
    if(t.active!==false) appendTemplate(w,t,state.members,minDate);
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
    return changed;
  }
  function stats(w,mid) {
    const tasks=w.tasks.filter(t=>t.memberId===mid);
    const adjustments=w.adjustments.filter(a=>a.memberId===mid);
    const target=tasks.filter(t=>t.kind==='normal').reduce((n,t)=>n+t.points,0);
    const earned=tasks.filter(t=>t.status==='done').reduce((n,t)=>n+t.points,0)+adjustments.filter(a=>a.points>0).reduce((n,a)=>n+a.points,0);
    const lost=tasks.filter(t=>t.status==='missed').reduce((n,t)=>n+t.points,0)-adjustments.filter(a=>a.points<0).reduce((n,a)=>n+a.points,0);
    const points=earned-lost;
    return {points,target,earned,lost,remaining:Math.max(0,target-points),percent:target?Math.max(0,Math.min(100,Math.round(points/target*100))):0,done:tasks.filter(t=>t.status==='done').length,pending:tasks.filter(t=>t.status==='pending').length,missed:tasks.filter(t=>t.status==='missed').length,recovery:tasks.filter(t=>t.kind==='recovery'&&t.status==='done').length,total:tasks.length};
  }
  function rewardState(w,r) {
    const s=stats(w,r.memberId),need=r.mode==='fixed'?r.threshold:s.target;
    return {need,unlocked:r.active!==false && need>0 && s.points>=need,claimed:!!r.claimedAt,remaining:Math.max(0,need-s.points),points:s.points};
  }
  function setStatus(w,id,status,actor={role:'adult'}) {
    if(!['pending','done','missed'].includes(status)) throw new Error('Estado no válido.');
    const t=w.tasks.find(t=>t.id===id); if(!t) throw new Error('No se encuentra la tarea.');
    if(actor.role!=='adult' && (actor.memberId!==t.memberId || status==='missed')) throw new Error('Esta acción requiere un adulto.');
    if(w.status==='closed' && t.kind!=='recovery') throw new Error('La semana esta cerrada. Utiliza una tarea de recuperación.');
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
    function check(v,msg){if(!v)throw new Error('Copia no válida: '+msg);}
    check(s&&typeof s==='object'&&s.schemaVersion===1,'version no compatible.');
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
      for(const t of w.tasks) check(text(t.title,160)&&text(t.description||'',2000)&&positive(t.points)&&validDate(t.date)&&['normal','recovery'].includes(t.kind)&&['pending','done','missed'].includes(t.status)&&w.members.some(m=>m.id===t.memberId)&&(t.kind==='recovery'||(t.date>=w.start&&t.date<=w.end)),'asignacion.');
      for(const a of w.adjustments) check(Number.isInteger(a.points)&&Math.abs(a.points)<=10000&&text(a.reason,2000)&&w.members.some(m=>m.id===a.memberId),'ajuste.');
    }
    for(const r of s.recipes) check(text(r.name,160)&&text(r.emoji,20)&&Number.isFinite(r.minutes)&&r.minutes>0&&Number.isFinite(r.servings)&&r.servings>0&&Array.isArray(r.ingredients)&&r.ingredients.length<=100&&r.ingredients.every(i=>text(i.name,160)&&text(i.quantity,160)&&text(i.category||'',80))&&Array.isArray(r.steps)&&r.steps.every(x=>text(x,3000)),'receta.');
    for(const x of s.shopping) check(text(x.name,160)&&text(x.quantity,160)&&text(x.category,80)&&typeof x.checked==='boolean','compra.');
    for(const x of s.mealPlan) check(validDate(x.date)&&['lunch','dinner'].includes(x.slot)&&s.recipes.some(r=>r.id===x.recipeId)&&Number.isInteger(x.servings)&&x.servings>0&&x.servings<=30,'menu.');
    const time=x=>!x||/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
    for(const x of s.events) check(text(x.title,160)&&text(x.description||'',5000)&&validDate(x.date)&&(!x.endDate||validDate(x.endDate))&&(!x.endDate||x.endDate>=x.date)&&typeof x.time==='string'&&typeof x.endTime==='string'&&time(x.time)&&time(x.endTime)&&text(x.memberId||'',200)&&Number.isInteger(x.revision)&&x.revision>=0,'evento.');
    if(s.settings.pin) check(/^[a-f0-9]{32}$/.test(s.settings.pin.salt)&&/^[a-f0-9]{64}$/.test(s.settings.pin.hash),'PIN.');
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
    return s;
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
    if(withTasks) for(const w of s.weeks.filter(w=>!weekId||w.id===weekId)) for(const t of w.tasks){const name=w.members.find(m=>m.id===t.memberId)?.name||'';lines.push('BEGIN:VEVENT','UID:'+t.id+'@familypoints.local','DTSTAMP:'+stamp,'X-FAMILYPOINTS-TASK:TRUE','DTSTART;VALUE=DATE:'+compact(t.date),'DTEND;VALUE=DATE:'+compact(addDays(t.date,1)),'SUMMARY:'+icsEscape(name+': '+t.title),'DESCRIPTION:'+icsEscape(`${t.points} puntos. Estado: ${t.status==='done'?'Realizada':t.status==='missed'?'No realizada':'Pendiente'}. ${t.description||''}`),'END:VEVENT');}
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
  return Object.freeze({iso,date,validDate,addDays,monday,uid,copy,contribution,memberSnapshot,generateWeek,appendTemplate,syncTemplate,closeWeek,rollover,stats,rewardState,setStatus,addRecovery,claimReward,validateState,seed,scaleQuantity,mergeQuantity,addIngredients,exportICS,parseICS});
});
