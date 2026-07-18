#!/usr/bin/env node
/**
 * serve-web-static.mjs -- standalone static-serve + reverse-proxy for the PRISM web frontend.
 *
 * WHY (QUOTING-SYNERGY-MS0/U-QP-WEB-STANDALONE-SERVE, slot:charlie 2026-06-22): the built frontend
 * (mcp-server/dist/web) needs to be reachable in a browser against the LIVE backend (:3100) WITHOUT
 * (a) restarting the shared :3100 backend, or (b) the vite dev-proxy (which had a localhost->IPv6 +
 * POST-body issue on Windows). This serves dist/web (SPA fallback) and STREAMS /api + /ws to the
 * backend with correct method/body forwarding (req.pipe), giving one usable URL on a free port.
 *
 * Run:
 *   node mcp-server/scripts/serve-web-static.mjs                 # http://127.0.0.1:4000
 *   PRISM_WEB_SERVE_PORT=4001 PRISM_API_TARGET=http://127.0.0.1:3100 node mcp-server/scripts/serve-web-static.mjs
 *
 * Pure helpers (contentTypeFor / isProxyPath / safeStaticPath) are exported for hermetic tests.
 */
import http from "node:http";
import net from "node:net";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, join, normalize, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const DIST_DIR = resolve(HERE, "../dist/web"); // mcp-server/dist/web
const PORT = parseInt(process.env.PRISM_WEB_SERVE_PORT || "4000", 10);
const API_TARGET = process.env.PRISM_API_TARGET || "http://127.0.0.1:3100";
// Paths streamed to the backend (everything else is served as a static asset / SPA route).
const PROXY_PREFIXES = ["/api", "/ws", "/health", "/ready", "/metrics", "/mcp", "/.well-known"];

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
};

/** Pure: MIME content-type for a path (defaults to octet-stream). */
export function contentTypeFor(p) {
  return CONTENT_TYPES[extname(p).toLowerCase()] || "application/octet-stream";
}

/** Pure: is this (query-stripped) path proxied to the backend? Prefix-with-boundary match. */
export function isProxyPath(urlPath) {
  const p = urlPath.split("?")[0];
  return PROXY_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/"));
}

/**
 * Pure: resolve a URL path to a safe absolute file inside distDir.
 * Returns null on traversal/escape (defense against ../ path attacks).
 */
export function safeStaticPath(distDir, urlPath) {
  const root = resolve(distDir);
  let clean;
  try {
    clean = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null; // malformed percent-encoding
  }
  // Reject any parent-dir segment outright (defense-in-depth: normalize would otherwise
  // collapse `/../` against the leading slash and hide the intent).
  if (/(^|[/\\])\.\.([/\\]|$)/.test(clean)) return null;
  clean = normalize(clean).replace(/^([/\\])+/, ""); // strip leading slashes -> relative
  const resolved = resolve(root, clean);
  if (resolved !== root && !resolved.startsWith(root + sep)) return null; // backstop
  return resolved;
}

/** Stream an HTTP request to the backend, piping method + headers + body, and pipe the response back. */
function proxyHttp(req, res, target) {
  const t = new URL(target);
  const proxyReq = http.request(
    {
      protocol: t.protocol,
      hostname: t.hostname,
      port: t.port || (t.protocol === "https:" ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: t.host },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", (e) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "backend-unreachable", detail: e.message, target }));
  });
  req.pipe(proxyReq); // <- streams the POST body (the thing the vite proxy fumbled)
}

/** Serve a static asset from distDir, falling back to index.html for SPA client routes. */
function serveStatic(req, res, distDir) {
  const indexPath = join(distDir, "index.html");
  let filePath = safeStaticPath(distDir, req.url);
  const servable = filePath && existsSync(filePath) && statSync(filePath).isFile();
  if (!servable) filePath = indexPath; // SPA fallback (client-side routing)
  if (!existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": contentTypeFor(filePath) });
  createReadStream(filePath).pipe(res);
}

/** Build the http.Server (exported so a test could drive it; listen() is gated to main). */
export function createServer(distDir = DIST_DIR, apiTarget = API_TARGET) {
  const server = http.createServer((req, res) => {
    if (isProxyPath(req.url)) return proxyHttp(req, res, apiTarget);
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "text/plain" });
      res.end("static server is GET-only");
      return;
    }
    return serveStatic(req, res, distDir);
  });
  // WebSocket upgrade (e.g. live-chat /ws) -> raw socket pipe to the backend.
  server.on("upgrade", (req, socket, head) => {
    const t = new URL(apiTarget);
    const upstream = net.connect(Number(t.port) || 80, t.hostname, () => {
      const headerLines = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n");
      upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headerLines}\r\n\r\n`);
      if (head && head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  });
  return server;
}

// --- main (only when run directly, not when imported by tests) ---
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!existsSync(join(DIST_DIR, "index.html"))) {
    console.error(`[serve-web-static] FAIL-LOUD: no build at ${DIST_DIR}/index.html`);
    console.error(`  -> run: cd mcp-server/web && npm run build`);
    process.exit(1);
  }
  createServer().listen(PORT, "127.0.0.1", () => {
    console.log(`[serve-web-static] PRISM web served at http://127.0.0.1:${PORT}/`);
    console.log(`[serve-web-static]   static: ${DIST_DIR}`);
    console.log(`[serve-web-static]   proxy : /api,/ws,/health,... -> ${API_TARGET}`);
  });
}
