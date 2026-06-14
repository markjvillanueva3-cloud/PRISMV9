/**
 * sw.ts — Service worker — QUOTING-PIPELINE-MS0 / U-QP11
 *
 * Offline cache for the mobile-capture-quote page shell.
 * Caches the page HTML + critical JS bundle on install.
 * Network-first with cache fallback on /api/* — the MCP backend.
 * Cache-first for /icons/* and /assets/* — static immutable artifacts.
 *
 * Per R12: explicit cache version + delete-on-upgrade — no silent stale-cache poisoning.
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP11-PWA-SERVICE-WORKER
 * @author slot:charlie /goal-13 iter6, 2026-05-24
 */

/// <reference lib="webworker" />

const CACHE_VERSION = "prism-quote-v1-2026-05-24";
const SHELL_PATHS = [
  "/mobile-capture-quote",
  "/assets/main.js",
  "/manifest.webmanifest",
];

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_PATHS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("prism-quote-") && k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const req = event.request;
  const url = new URL(req.url);

  // Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req).then((resp) => {
        const clone = resp.clone();
        if (resp.ok) caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
        return resp;
      }).catch(() => caches.match(req).then((cached) => cached ?? new Response(JSON.stringify({ error: "offline-no-cache" }), { headers: { "content-type": "application/json" }, status: 503 })))
    );
    return;
  }

  // Cache-first for static assets
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then((cached) => cached ?? fetch(req).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
        }
        return resp;
      }))
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((cached) => cached ?? new Response("offline", { status: 503 })))
  );
});

export {};
