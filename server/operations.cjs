'use strict';
/* Pure command reducer. The HTTP adapter must supply a verified principal.
   Never construct that principal from the JSON body supplied by a browser. */
const C=require('../core.js'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x));
function allowed(principal,householdId){if(!principal||principal.householdId!==householdId||principal.revoked)throw Error('FORBIDDEN');if(!['owner','adult','child'].includes(principal.role))throw Error('FORBIDDEN');}
function apply(state,command,principal,now=new Date()){
 allowed(principal,command.householdId);
 if(!/^[A-Za-z0-9_-]{8,120}$/.test(command.id||'')||!command.type||!command.payload||Array.isArray(command.payload)||typeof command.payload!=='object')throw Error('INVALID_COMMAND');
 const s=copy(state),today=C.householdDay(s,now),a=principal.role==='child'?{role:'member',memberId:principal.memberId}:{role:'adult'},p=command.payload;
 if(a.role==='member'&&!s.members.some(m=>m.id===a.memberId&&m.active!==false&&m.role==='member'))throw Error('FORBIDDEN');
 const adult=()=>{if(a.role!=='adult')throw Error('FORBIDDEN');};
 switch(command.type){
 case 'task.status':{const w=s.weeks.find(w=>w.id===p.weekId);if(!w)throw Error('NOT_FOUND');C.setStatus(w,p.taskId,p.status,a,today);break;}
 case 'task.review.request':C.requestTaskReview(s,p.weekId,p.taskId,a,p.note||'');break;
 case 'task.review.resolve':C.resolveTaskReview(s,p.id,!!p.approve,a,today);break;
 case 'task.allowEarly':C.setTaskEarlyPermission(s,p.weekId,p.taskId,!!p.allow,a);break;
 case 'presence.configure':C.configurePresence(s,p,a,today);break;
 case 'presence.cancel':C.cancelPresence(s,p.id,a);break;
 case 'points.target':C.configureHomaTarget(s,p.memberId,p.target,a,today);break;
 case 'allowance.configure':C.configureAllowance(s,p,a,today);break;
 case 'allowance.pay':adult();C.payAllowance(s,p.id,a,today);break;
 case 'savings.configure':C.configureSavings(s,p,a,today);break;
 case 'money.transfer':C.transferMoney(s,p.memberId,p.from,p.to,p.cents,a,p.note||'Repartir dinero');break;
 case 'money.deposit':adult();if(!Number.isSafeInteger(p.cents)||p.cents<1||p.cents>1000000)throw Error('INVALID_AMOUNT');C.postMoney(s,p.memberId,{available:p.cents},'deposit',p.note,command.id,a);break;
 case 'money.reverse':C.reverseMoney(s,p.id,p.note,a);break;
 case 'spend.request':C.requestSpend(s,p,a);break;
 case 'spend.resolve':C.resolveSpend(s,p.id,!!p.approve,a);break;
 case 'shopping.state':{if(a.role!=='adult'&&!s.settings.childShoppingEnabled)throw Error('FORBIDDEN');C.setShoppingState(s,p.id,!!p.checked);break;}
 case 'shopping.list.create':C.addShoppingList(s,p.name,a,p.icon);break;
 case 'shopping.list.archive':C.archiveShoppingList(s,p.id,a);break;
 case 'event.save':C.saveEventSeries(s,p.event,p.items||[],a,p.recurrence||null,p.scope||'single',today);break;
 case 'event.delete':C.deleteEventSeries(s,p.id,p.scope||'single',a,today);break;
 case 'event.check':C.setPrepItemState(s,p.preparationId,p.itemId,!!p.checked,a);break;
 case 'menu.copy':C.copyMenu(s,p.from,p.to,a,p.adjust!==false);break;
 case 'menu.save':C.saveMenu(s,p.week,p.name,a);break;
 case 'menu.apply':C.applySavedMenu(s,p.id,p.week,a);break;
 case 'system.reconcile':if(!principal.system)throw Error('FORBIDDEN');C.rollover(s,today);C.syncV2(s,today);break;
 default:throw Error('UNSUPPORTED_COMMAND');
 }
 C.validateState(s);s.updatedAt=now.toISOString();s.houseLog.unshift({id:C.uid('audit'),at:now.toISOString(),action:command.type,actorId:principal.userId||principal.deviceId||'system'});s.houseLog=s.houseLog.slice(0,500);return s;
}
/* Repository transaction must atomically read, check receipts, apply and commit.
   Client expected revisions are optional for idempotent status-setting operations,
   required for edits where the user reviewed an older record. */
async function execute(repository,command,principal,now=new Date()){
 allowed(principal,command.householdId);
 return repository.transaction(command.householdId,async tx=>{
  const actorKey=[principal.role,principal.userId||principal.deviceId||'',principal.memberId||''].join(':');
  if(!principal.userId&&!principal.deviceId)throw Error('FORBIDDEN');
  function canonical(x){if(Array.isArray(x))return x.map(canonical);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));return x;}
  const fingerprint=createHash('sha256').update(JSON.stringify(canonical({type:command.type,payload:command.payload,householdId:command.householdId}))).digest('hex');
  const existing=await tx.receipt(command.id);if(existing){if(existing.actorKey!==actorKey)throw Error('FORBIDDEN');if(existing.fingerprint!==fingerprint)throw Error('IDEMPOTENCY_CONFLICT');return {...existing,replayed:true};}
  const row=await tx.read();if(command.expectedRevision!=null&&command.expectedRevision!==row.revision)throw Error('VERSION_CONFLICT');
  const next=apply(row.state,command,principal,now),result={operationId:command.id,revision:row.revision+1,state:next,replayed:false,actorKey,fingerprint};
  await tx.commit(next,result.revision,command.id,result);return result;
 });
}
module.exports={apply,execute};
