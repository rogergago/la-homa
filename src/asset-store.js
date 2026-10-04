/* Private per-account local blobs. No telemetry and no public URLs. */
(function(root){'use strict';
 const dbName='la-homa-assets-v1';
 function db(){return new Promise((ok,fail)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('assets',{keyPath:'key'});r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(new Error('El navegador no permite guardar archivos. Revisa sus permisos.'));});}
 async function op(mode,work){const d=await db();try{return await new Promise((ok,fail)=>{const tx=d.transaction('assets',mode);let result;const r=work(tx.objectStore('assets'));r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>ok(result);tx.onabort=tx.onerror=()=>fail(new Error('No se pudo guardar el archivo. Puede faltar espacio.'));});}finally{d.close();}}
 const key=(owner,id)=>owner+'::'+id;
 async function put(owner,id,blob){if(!(blob instanceof Blob)||blob.size>5*1024*1024)throw new Error('Archivo no v\u00e1lido o mayor de 5 MB.');return op('readwrite',s=>s.put({key:key(owner,id),blob,mime:blob.type,size:blob.size}));}
 async function get(owner,id){return (await op('readonly',s=>s.get(key(owner,id))))?.blob||null;}
 const remove=(owner,id)=>op('readwrite',s=>s.delete(key(owner,id)));
 async function exportBundle(owner,ids){const result=[];let size=0;for(const id of ids){const blob=await get(owner,id);if(!blob)throw new Error('Falta un adjunto. No se ha generado una copia incompleta. Restaura el archivo o elimina su referencia antes de exportar.');size+=blob.size;if(size>40*1024*1024)throw new Error('Los adjuntos superan 40 MB. Exporta los documentos por separado antes de crear la copia local.');let str='';const bytes=new Uint8Array(await blob.arrayBuffer());for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));result.push({id,mime:blob.type,base64:btoa(str)});}return result;}
 async function importBundle(owner,bundle){if(!Array.isArray(bundle)||bundle.length>200)throw new Error('Copia de adjuntos no v\u00e1lida.');for(const x of bundle){if(!/^[\w.-]+$/.test(x.id)||typeof x.base64!=='string'||x.base64.length>7100000||!['application/pdf','image/jpeg','image/png','image/webp','text/plain'].includes(x.mime))throw new Error('Adjunto no permitido.');const b=Uint8Array.from(atob(x.base64),c=>c.charCodeAt(0));await put(owner,x.id,new Blob([b],{type:x.mime}));}}
 root.HomaAssets={put,get,remove,exportBundle,importBundle};
})(globalThis);
