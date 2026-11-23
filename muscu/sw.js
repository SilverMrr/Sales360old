// Cache hors-ligne : réseau d'abord, cache en secours.
const C = 'muscu-v8';
const ASSETS = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'js/app.js', 'js/body.js', 'js/data.js', 'js/generator.js', 'js/anim.js', 'js/exercises.js', 'models/body.glb', 'vendor/GLTFLoader.js', 'vendor/utils/BufferGeometryUtils.js', 'vendor/libs/meshopt_decoder.module.js', 'vendor/three.module.min.js', 'vendor/OrbitControls.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
