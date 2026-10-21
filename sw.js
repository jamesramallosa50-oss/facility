/* The Facility: network-first entry pages keep gameplay upgrades current. */
const CACHE='facility-courtyard-r2-20261021';
const FILES=['./assets/facility-world.js?v=courtyard-r2','./assets/facility-relay.js?v=courtyard-r2','./assets/facility-survival.js?v=courtyard-r2','./assets/facility-coop.js?v=courtyard-r2','./assets/facility-menu.js?v=courtyard-r2','./assets/facility-survival.css?v=courtyard-r2','./assets/facility-menu.css?v=courtyard-r2','./assets/vendor/peerjs-1.5.5.min.js','./','./index.html','./game.html','./game-core.html','./assets/horror/spider.js','./assets/horror/ghost.js','./assets/horror/signs.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&!x.startsWith('gloomspire-assets')).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(new URL(r.url).pathname.startsWith('/api/'))return;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  /* network first so new builds show up right away, cache as the offline fallback */
  if(new URL(r.url).pathname.includes('/assets/horror/')){e.respondWith(caches.open('gloomspire-assets-v1').then(c=>c.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res;}))));return;}
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));
});
