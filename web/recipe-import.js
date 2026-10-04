(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HomaRecipeImport=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
 function recipeNode(value,depth=0){if(depth>15||!value||typeof value!=='object')return null;const type=value['@type'];if((Array.isArray(type)?type:[type]).some(x=>String(x).split('/').at(-1)==='Recipe'))return value;for(const x of Array.isArray(value)?value:Object.values(value)){const r=recipeNode(x,depth+1);if(r)return r;}return null;}
 function ingredient(line){const original=clean(line).slice(0,160);const m=original.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramos?|ml|l|litros?|ud|unidades?)\b\s*(?:de\s+)?(.+)$/i);if(m){let unit=m[2].toLowerCase();if(/^gr|^gram/.test(unit))unit='g';if(/^litro/.test(unit))unit='l';if(/^unida/.test(unit))unit='ud';return {name:m[3],quantity:m[1].replace(',','.')+' '+unit,category:'Despensa'};}return {name:original,quantity:'Revisar cantidad en la receta original',category:'Despensa'};}
 function steps(value){if(typeof value==='string')return value.split(/\r?\n/).map(clean).filter(Boolean);if(Array.isArray(value))return value.flatMap(steps);if(value&&typeof value==='object')return value.itemListElement?steps(value.itemListElement):[clean(value.text||value.name)].filter(Boolean);return [];}
 function parse(raw,sourceUrl=''){
  if(typeof raw!=='string'||raw.length>1000000)throw new Error('La receta supera el l\u00edmite de 1 MB.');
  let node=null;try{node=recipeNode(JSON.parse(raw));}catch(_){}
  if(!node){const re=/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;let m;while((m=re.exec(raw))&&!node){try{node=recipeNode(JSON.parse(m[1]));}catch(_){}}}
  if(!node)throw new Error('No se encontraron datos Recipe. Puedes crear la receta manualmente.');
  if(sourceUrl){let u;try{u=new URL(sourceUrl);}catch(_){throw new Error('El enlace no es v\u00e1lido.');}if(u.protocol!=='https:')throw new Error('El origen debe usar HTTPS.');sourceUrl=u.href;}
  const duration=String(node.totalTime||node.cookTime||'').match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i),yieldMatch=String(Array.isArray(node.recipeYield)?node.recipeYield[0]:node.recipeYield||'').match(/\d+/);
  const result={name:clean(node.name).slice(0,160),emoji:'\u{1F37D}\uFE0F',minutes:duration?Math.max(1,(+duration[1]||0)*60+(+duration[2]||0)):30,servings:Math.min(30,Math.max(1,+(yieldMatch?.[0]||4))),ingredients:(node.recipeIngredient||[]).slice(0,100).map(ingredient),steps:steps(node.recipeInstructions).map(s=>s.slice(0,3000)).slice(0,100),sourceUrl,tags:[]};
  if(!result.name||!result.ingredients.length||!result.steps.length)throw new Error('Faltan nombre, ingredientes o pasos. Completa esta receta manualmente.');return result;
 }
 return {parse,ingredient,steps};});
