/* ═══════════════════════════════════════════════════
   SERVICE WORKER — offline support for Hidden Studio
   Strategy: network-first with cache fallback.
   On each successful fetch we update the cache so the
   newest version is always available offline next visit.
═══════════════════════════════════════════════════ */

const CACHE = 'hidden-studio-shell-v9';

// Core app shell — pre-cached on SW install so the app
// works even on the very first offline visit after install.
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './styles-panels.css',
  './js/panels/panels-api.js',
  './js/panels/panel-system.jsx',
  './js/panels/mount.jsx',
  './js/app.js',
  './js/editor.js',
  './js/game.js',
  './js/menu.js',
  './js/shortcuts.js',
  './js/projects.js',
  './js/draw.js',
  './js/sprites.js',
  './js/animations.js',
  './js/audio.js',
  './js/transforms.js',
  './js/easter-eggs.js',
  './js/data/presets.js',
  './js/data/scene.svg.js',
  './js/data/easter-eggs.js',
  './js/data/changelog.js',
  './assets/scene.jpg',
];

// ── Install: pre-cache the app shell ──────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting(); // activate immediately
});

// ── Activate: clean up old caches ─────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first, cache as fallback ────────────
self.addEventListener('fetch', (e) => {
  // Only handle GET requests for our own origin
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // skip CDN (Google Fonts etc.)

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache a copy of every successful response
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request)) // offline fallback
  );
});
