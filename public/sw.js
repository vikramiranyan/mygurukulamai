const CACHE='gurukulam-ai-v5';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon.svg','./sw-register.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gurukulam-ai-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  // Never cache authenticated/private requests. This prevents accidental persistence
  // of future API responses or user-specific data in the browser cache.
  if(event.request.headers.has('authorization') || url.pathname.includes('/api/')) return;
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response.ok && response.type==='basic'){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
      }
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
  );
});
