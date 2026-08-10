// @ts-nocheck

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET" && new URL(event.request.url).origin === self.location.origin) {
    // Keep the PWA installable without caching or offline fallback.
    event.respondWith(fetch(event.request));
  }
});

