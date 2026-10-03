// Minimal service worker — no caching, network pass-through only.
//
// This file's only job is to EXIST and be registered, so the browser treats
// ChemBase BUK as a fully installable PWA (a real WebAPK on Android) instead
// of a plain bookmark shortcut. A plain shortcut is fragile: handing control
// to a native system picker (the file chooser, for example) can make Android
// discard its tab and reload from scratch on return, which is the "it kicks
// me back to the start of the app" behaviour being fixed.
//
// It deliberately does NOT cache anything. We're actively shipping fixes to
// this app multiple times a day — a caching service worker would risk
// serving stale JS/CSS after every deploy, which is worse than the problem
// we're solving here.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear anything an earlier version of this worker saved for offline use.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', () => {
  // No-op: let the browser handle every request exactly as it normally would.
});
