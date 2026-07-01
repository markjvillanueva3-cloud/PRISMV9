/**
 * Kienzle Academy — Service Worker
 *
 * Goals:
 *  1. Installable on iOS/Android home screen (PWA criterion).
 *  2. Offline lesson reading when shop wifi drops — cache app shell + last-viewed course assets.
 *  3. Fresh data for /api/* calls when online (network-first); fall back to cache when offline.
 *  4. Self-update without leaving stale tabs on the prior bundle (skipWaiting + clients.claim).
 *
 * Cache strategy:
 *   - App shell (/, /manifest.webmanifest, icons):  cache-first, refreshed on activate.
 *   - /assets/* (Vite-fingerprinted bundles):       cache-first, immutable by URL hash.
 *   - /api/*:                                       network-first, fallback to last good response.
 *   - Everything else:                              network-first, cache as you go.
 *
 * Version bump: increment CACHE_VERSION on each PWA-shell release to invalidate clients.
 */

const CACHE_VERSION = "v1-2026-05-23";
const SHELL_CACHE = `prism-academy-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `prism-academy-assets-${CACHE_VERSION}`;
const API_CACHE = `prism-academy-api-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.svg",
  "/icon-512.svg",
  "/icon-maskable-512.svg",
  "/apple-touch-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // Non-fatal: a single missing shell asset must not block install.
        console.warn("[sw] shell precache partial:", err);
      })
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => (keep.has(n) ? null : caches.delete(n)))))
      .then(() => self.clients.claim())
  );
});

function isAssetRequest(url) {
  return url.pathname.startsWith("/assets/") || url.pathname.endsWith(".svg") ||
         url.pathname.endsWith(".png") || url.pathname.endsWith(".woff2");
}
function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/mcp/");
}
function isShellRequest(url) {
  return SHELL_ASSETS.includes(url.pathname) || url.pathname === "/index.html";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const resp = await fetch(request);
  if (resp.ok) cache.put(request, resp.clone()).catch(() => {});
  return resp;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(request);
    if (resp.ok) cache.put(request, resp.clone()).catch(() => {});
    return resp;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Same-origin only — never cache cross-origin requests.
  if (url.origin !== self.location.origin) return;

  if (isShellRequest(url) || isAssetRequest(url)) {
    event.respondWith(cacheFirst(req, isShellRequest(url) ? SHELL_CACHE : ASSET_CACHE));
    return;
  }
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(req, API_CACHE));
    return;
  }
  event.respondWith(
    networkFirst(req, SHELL_CACHE).catch(() =>
      caches.match("/index.html").then((r) => r || new Response("offline", { status: 503 }))
    )
  );
});

// Operator escape hatch — POST {"type":"sw-reset"} to a message channel to nuke caches.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "sw-reset") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
  if (event.data && event.data.type === "skip-waiting") {
    self.skipWaiting();
  }
});
