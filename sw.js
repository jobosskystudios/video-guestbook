// Offline support: the app keeps working at venues with no Wi-Fi.
// Bump CACHE when you deploy changes so iPads pick up the new version.
const CACHE = 'vg-v1.0.4';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'db.js', 'vendor/qrcode.js',
  'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/studio-logo.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Stale-while-revalidate: instant load from cache, refresh in the background when online.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r.status === 200) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
