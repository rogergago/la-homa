const CACHE='lahoma-81796e85113f',SHELL=["./","./index.html","./core.js","./app.js","./styles.css","./entity-sync.js","./asset-store.js","./recipe-import.js","./cloud-transport.js","./i18n.js","./supabase.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('lahoma-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.endsWith('config.js')||u.pathname.includes('/api/'))return;
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));return;}
  const critical=/\.(?:js|css)$/.test(u.pathname)||/\/(?:app|core|i18n|cloud-transport|entity-sync|asset-store|recipe-import|supabase)\.js$/.test(u.pathname);
  if(critical){
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r;}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
self.addEventListener('push',e=>{let d={};try{d=e.data.json();}catch{}e.waitUntil(self.registration.showNotification('La Homa',{body:d.body||'Tienes un aviso familiar.',icon:'./icons/icon-192.png',tag:d.tag||'homa',data:{url:d.url&&d.url.startsWith('./')?d.url:'./#/notifications'}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.openWindow(e.notification.data?.url||'./#/notifications'));});
