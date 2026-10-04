/* Transport-independent three-way merge. No network or storage dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HomaSync=api;})(globalThis,function(){'use strict';
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function keyFor(items){for(const k of ['id','memberId','start'])if(items.length&&items.every(x=>object(x)&&typeof x[k]==='string')&&new Set(items.map(x=>x[k])).size===items.length)return k;return null;}
function merge(base,local,remote){const conflicts=[];
 function walk(b,l,r,path){if(eq(l,r))return clone(l);if(eq(l,b))return clone(r);if(eq(r,b))return clone(l);if(path==='updatedAt')return [l,r].sort().at(-1);
  if(Array.isArray(b)&&Array.isArray(l)&&Array.isArray(r)){
   const key=keyFor(b)||keyFor(l)||keyFor(r);if(key&&[b,l,r].every(xs=>!xs.length||keyFor(xs)===key)){
    const bm=new Map(b.map(x=>[x[key],x])),lm=new Map(l.map(x=>[x[key],x])),rm=new Map(r.map(x=>[x[key],x]));
    const out=[];for(const id of new Set([...r,...l].map(x=>x[key]))){const v=walk(bm.get(id),lm.get(id),rm.get(id),path+'/'+id);if(v!==undefined)out.push(v);}return out;
   }
  }
  if(object(b)&&object(l)&&object(r)){const o={};for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){const v=walk(b[k],l[k],r[k],path?path+'/'+k:k);if(v!==undefined)o[k]=v;}return o;}
  conflicts.push(path||'/');return clone(r);
 }
 const value=walk(base,local,remote,'');return {value,conflicts,ok:conflicts.length===0};
}
function entities(state){const rows=[];const put=(kind,id,data)=>rows.push({kind,id:String(id),data:clone(data)});
 for(const [key,value] of Object.entries(state)){
  if(key==='weeks'){for(const week of value){const {tasks,...meta}=week;put('weeks',week.id,meta);for(const task of tasks)put('tasks',task.id,{...task,weekId:week.id});}}
  else if(key==='finance'){for(const [type,items] of Object.entries(value)){if(!Array.isArray(items))throw Error('Unsupported finance structure');for(const x of items){const id=x.id||x.memberId;if(!id)throw Error('Finance row needs id');put('finance.'+type,id,x);}}}
  else if(Array.isArray(value)){for(const x of value){const id=x.id||x.memberId;if(!id)throw Error('Row needs an id: '+key);put(key,id,x);}}
  else put('meta',key,value);
 }
 return rows;
}
function patch(before,after){const bm=new Map(entities(before).map(r=>[r.kind+'\u0000'+r.id,r])),am=new Map(entities(after).map(r=>[r.kind+'\u0000'+r.id,r])),changes=[];for(const k of new Set([...bm.keys(),...am.keys()])){const a=am.get(k),b=bm.get(k);if(!eq(a?.data,b?.data))changes.push({kind:(a||b).kind,id:(a||b).id,before:b?.data??null,after:a?.data??null});}return changes;}
return{merge,entities,patch};});
