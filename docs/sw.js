// Offline cache for the web build. Bump CACHE on every release or the
// browser will happily serve yesterday's game forever.
const CACHE = 'tato-trash-v3';

const FILES = [
  '.',
  'index.html',
  'style.css',
  'icon.svg',
  'manifest.webmanifest',
  'js/format.js',
  'js/art.js',
  'js/cards.js',
  'js/data.js',
  'js/state.js',
  'js/engine.js',
  'js/ui.js',
  'js/main.js',
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                             .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Network first, cache as the fallback: a fresh build wins when there is
// a connection, and the game still opens on the metro.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      const copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
