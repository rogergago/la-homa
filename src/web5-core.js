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
