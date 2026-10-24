/* The Facility: network-first entry pages keep gameplay upgrades current. */
const CACHE='facility-chase-r5-20261024',ASSETS='gloomspire-assets-v1';
const modelPath=url=>/\/assets\/(?:world|horror)\//.test(new URL(url).pathname);
const FILES=['./assets/facility-navigation.js?v=chase-r5','./assets/facility-world.js?v=chase-r5','./assets/facility-relay.js?v=chase-r5','./assets/facility-survival.js?v=chase-r5','./assets/facility-coop.js?v=chase-r5','./assets/facility-menu.js?v=chase-r5','./assets/facility-survival.css?v=chase-r5','./assets/facility-menu.css?v=chase-r5','./assets/vendor/peerjs-1.5.5.min.js','./','./index.html','./game.html','./game-core.html','./assets/horror/spider.js','./assets/horror/ghost.js','./assets/horror/signs.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const keys=await caches.keys(),assets=await caches.open(ASSETS);
  // Keep already-downloaded native models across gameplay cache upgrades.
  for(const key of keys.filter(k=>k!==CACHE&&!k.startsWith('gloomspire-assets'))){
    const old=await caches.open(key);for(const request of await old.keys())if(modelPath(request.url)&&!await assets.match(request)){const response=await old.match(request);if(response?.ok)await assets.put(request,response);}
    await caches.delete(key);
  }
  await self.clients.claim();
})());});
self.addEventListener('fetch',e=>{
  const r=e.request;if(new URL(r.url).pathname.startsWith('/api/'))return;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  /* network first so new builds show up right away, cache as the offline fallback */
  if(modelPath(r.url)){e.respondWith(caches.open(ASSETS).then(c=>c.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res;}))));return;}
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));
});
