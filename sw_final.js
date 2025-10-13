const CACHE_NAME = 'recipes-final-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app_final.js',
  '/manifest.json'
];
const DATA_URL = 'https://gampil.github.io/resep/data.json';
const CAT_URL = 'https://gampil.github.io/resep/kategori.json';

self.addEventListener('install', ev=>{
  ev.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('fetch', ev=>{
  const req = ev.request;
  // network-first for data endpoints for freshness
  if(req.url === DATA_URL || req.url === CAT_URL){
    ev.respondWith(
      fetch(req).then(resp=>{ const c = resp.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(req, c)); return resp; }).catch(()=>caches.match(req))
    );
    return;
  }
  ev.respondWith(caches.match(req).then(resp=> resp || fetch(req)).catch(()=>{}));
});
