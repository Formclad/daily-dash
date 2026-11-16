/*
 * Service worker: keeps the app files on the device so it opens offline.
 * Bump VERSION whenever you change any app file so phones pick up the update.
 * Supabase requests are cross-origin and are NOT touched here.
 */
const VERSION = 'dd-v14';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/config.js', 'js/defaults.js', 'js/util.js', 'js/store.js', 'js/sync.js', 'js/calendar.js', 'js/habits.js', 'js/strava.js', 'js/briefings.js', 'js/rhythms.js', 'js/coach.js', 'js/brief.js', 'js/matrix.js', 'js/day.js',
  'js/pages/today.js', 'js/pages/home.js', 'js/pages/brief.js', 'js/pages/household.js', 'js/pages/coach.js', 'js/pages/matrix.js', 'js/pages/goals.js', 'js/pages/meals.js', 'js/pages/health.js', 'js/pages/family.js', 'js/pages/briefings.js', 'js/pages/more.js', 'js/pages/settings.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Same-origin: ask the network first so new versions appear straight away; fall back to the saved copy offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
