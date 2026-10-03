// ChemBase BUK service worker.
//
// Goal: the app opens and the Toolbox works with no internet, WITHOUT ever
// serving stale code after a deploy. So every request goes to the network
// first; the saved copy is used only when the network fails or is very slow.
// Only this site's own files and the KaTeX/PDF scripts from jsdelivr are
// saved. The AI (/api), Supabase and everything else are never touched.

const CACHE = 'chembase-v1';
const SHELL = ['/', '/manifest.json', '/chembase-icon.png', '/nsche-logo.jpg'];
const SLOW_MS = 6000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function allowed(url) {
  if (url.origin === self.location.origin) return !url.pathname.startsWith('/api/');
  return url.hostname === 'cdn.jsdelivr.net';
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const isPage = req.mode === 'navigate';
  const cached = await cache.match(req, { ignoreSearch: false }) || (isPage ? await cache.match('/') : undefined);

  const network = fetch(req).then((res) => {
    if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
    return res;
  });

  if (!cached) return network;
  // Saved copy exists: use the network if it answers in time, otherwise the saved copy.
  const slow = new Promise((resolve) => setTimeout(() => resolve(cached), SLOW_MS));
  try {
    return await Promise.race([network, slow]);
  } catch (e) {
    return cached;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!allowed(url)) return;
  event.respondWith(networkFirst(req).catch(() => Response.error()));
});
