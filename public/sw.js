const CACHE='gurukulam-ai-v7';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon.svg','./sw-register.js','./nextgen.css','./legal-links.js','./privacy.html','./terms.html'];

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
  if(event.request.headers.has('authorization') || url.pathname.includes('/api/')) return;
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response.ok && response.type==='basic'){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
      }
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>{
      if(cached) return cached;
      if(event.request.mode==='navigate') return caches.match('./index.html');
      return Response.error();
    }))
  );
});
