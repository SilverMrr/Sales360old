// Cache hors-ligne : réseau d'abord, cache en secours.
const C = 'muscu-v3';
const ASSETS = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'js/app.js', 'js/body.js', 'js/data.js', 'js/store.js', 'js/stats.js', 'js/charts.js', 'vendor/three.module.min.js', 'vendor/OrbitControls.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
