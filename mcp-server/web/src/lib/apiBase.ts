/**
 * Per-form-factor API base-URL resolver (the multi-shell backend seam).
 *
 * The PRISM SPA ships to THREE form factors from ONE Vite build:
 *   - web (browser)        -> served by the PRISM server itself, SAME ORIGIN.
 *   - desktop (Electron)   -> loads over file://; there is NO same-origin backend.
 *   - mobile (Capacitor)   -> loads over capacitor://localhost (Android) /
 *                             ionic://localhost (iOS); again NO same-origin backend.
 *
 * The web app talks to the backend at `/api/v1`. On the web that is a relative
 * path against the page origin and resolves correctly. But under file:// it
 * resolves to `file:///api/v1` and under capacitor:// to
 * `capacitor://localhost/api/v1` -- both with NO server behind them, so EVERY
 * backend call in a packaged app would fail. A packaged app that cannot reach
 * the backend is a hollow shell.
 *
 * This module is the single place that decides the backend base per shell, so
 * EVERY current and future feature (every api/client call) gets correct
 * behavior on all three form factors for free. Resolution order:
 *
 *   1. Build-time override `import.meta.env.VITE_API_BASE_URL` (highest priority).
 *      Set this to point any/all shells at a deployed cloud backend, e.g.
 *      `VITE_API_BASE_URL=https://api.prism.example.com/api/v1`. Nothing is
 *      hardcoded to a deployment -- the operator sets this when they deploy.
 *   2. Desktop (Electron, detected via window.prismDesktop, the same marker
 *      desktopRouter.ts uses) -> the local PRISM HTTP bridge on 127.0.0.1:3100.
 *   3. Mobile (Capacitor) -> the build-time override is REQUIRED; without it we
 *      fall back to the desktop localhost base and log a loud warning, because a
 *      phone has no localhost backend (R12 -- fail loud, do not silently ship a
 *      non-functional mobile app).
 *   4. Web (default) -> the relative `/api/v1` (unchanged; web keeps working).
 *
 * Keeping this as a pure, side-effect-free resolver makes it unit-testable
 * across all four branches without a DOM.
 */

/** The relative base used on the web (same-origin server). */
export const WEB_API_BASE = '/api/v1';

/** The Kienzle HTTP bridge the Electron shell connects to (see electron/main.cjs). */
export const DESKTOP_BACKEND_ORIGIN = 'http://127.0.0.1:3100';

/** Inputs the resolver needs -- injected so the function stays pure + testable. */
export interface ApiBaseEnv {
  /** import.meta.env.VITE_API_BASE_URL (build-time override), or undefined. */
  viteApiBaseUrl?: string | undefined;
  /** True inside the Electron desktop shell (window.prismDesktop?.isDesktop). */
  isDesktop: boolean;
  /** True inside a Capacitor native shell (Capacitor.isNativePlatform()). */
  isNativeMobile: boolean;
  /** Sink for the fail-loud mobile-misconfig warning (defaults to console.warn). */
  warn?: (msg: string) => void;
}

/**
 * Pure resolver: given the runtime environment, return the API base URL.
 * Web -> relative; Electron -> localhost bridge; mobile -> required override
 * (loud fallback if missing). A build-time override always wins.
 */
export function resolveApiBase(env: ApiBaseEnv): string {
  const override = env.viteApiBaseUrl?.trim();
  if (override) {
    // Strip a single trailing slash so callers can always do `${base}${path}`
    // with path starting "/...". Never double-slash.
    return override.replace(/\/+$/, '');
  }

  if (env.isNativeMobile) {
    // A phone has no localhost backend. Without a build-time URL the mobile app
    // cannot function -- say so loudly rather than ship a silent blank shell.
    (env.warn ?? ((m) => console.warn(m)))(
      '[apiBase] Capacitor native build has no VITE_API_BASE_URL set. The mobile ' +
        'app cannot reach the Kienzle backend over a relative path; set ' +
        'VITE_API_BASE_URL to your reachable backend (LAN or cloud) before ' +
        'building the mobile bundle. Falling back to the desktop localhost base, ' +
        'which will NOT work on a real device.',
    );
    return `${DESKTOP_BACKEND_ORIGIN}${WEB_API_BASE}`;
  }

  if (env.isDesktop) {
    return `${DESKTOP_BACKEND_ORIGIN}${WEB_API_BASE}`;
  }

  return WEB_API_BASE;
}

/** True only inside the Kienzle Electron desktop shell (preload sets the marker). */
function detectDesktop(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as { prismDesktop?: { isDesktop?: boolean } }).prismDesktop?.isDesktop)
  );
}

/**
 * True inside a Capacitor native shell. Capacitor injects a global with
 * `isNativePlatform()`; on web that global is absent -> false. Read defensively
 * so a missing/partial global never throws.
 */
function detectNativeMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/**
 * Resolve the API base for the CURRENT runtime, reading the real environment.
 * `import.meta.env` is inlined by Vite at build time. Memoized on first call --
 * the form factor cannot change within a running app.
 */
let cachedApiBase: string | null = null;
export function getApiBase(): string {
  if (cachedApiBase !== null) return cachedApiBase;
  cachedApiBase = resolveApiBase({
    viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
    isDesktop: detectDesktop(),
    isNativeMobile: detectNativeMobile(),
  });
  return cachedApiBase;
}

/** Test-only: clear the memoized base so a test can re-resolve under a new env. */
export function __resetApiBaseCacheForTests(): void {
  cachedApiBase = null;
}

// ---------------------------------------------------------------------------
// Global fetch proxy -- the single chokepoint that makes EVERY backend call
// work on all three form factors, no matter where it lives.
// ---------------------------------------------------------------------------
//
// The codebase has 217+ relative backend calls: ~84 `const BASE_URL = "/api/v1/..."`
// constants across src/api/*, PLUS ad-hoc `fetch("/api/mcp/...")` /
// `fetch("/api/dispatch/...")` / `fetch("/api/operator/...")` in components and
// pages. On the web every one resolves against the page origin and works. Under
// file:// (Electron) or capacitor://localhost (mobile) they all break -- and any
// FUTURE feature that calls `fetch("/api/...")` would break too.
//
// Rather than rewrite 217 sites (and require every future contributor to
// remember), we patch `window.fetch` ONCE at bootstrap. The patch rewrites a
// RELATIVE same-origin "/api/..." request to `<backend-origin>/api/...` when the
// app is packaged; on the web the backend origin is "" (relative) so the patch
// is a no-op and web behavior is byte-identical. Already-absolute URLs (http(s)/
// the backend origin itself) and non-/api paths (static assets, the SPA's own
// chunks) pass through untouched.

/**
 * The backend ORIGIN to prepend to relative /api paths, or "" on the web.
 * Web -> "" (relative, unchanged). Electron -> http://127.0.0.1:3100.
 * Mobile/override -> the override's origin (scheme://host[:port]).
 * Derived from the resolved api base so there is ONE source of truth.
 */
export function getBackendOrigin(): string {
  const apiBase = getApiBase();
  if (apiBase.startsWith('/')) return ''; // relative (web) -> no origin to prepend
  try {
    return new URL(apiBase).origin; // absolute -> scheme://host[:port]
  } catch {
    return '';
  }
}

/** A path the proxy should rewrite: a root-relative Kienzle API/MCP/dispatch path. */
function isRewritableApiPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname === '/api'
  );
}

/**
 * Rewrite a single request URL string for the given backend origin. Pure +
 * exported so the rewrite logic is unit-tested without patching global fetch.
 * - Relative "/api/..."  -> `${origin}/api/...`     (when origin is non-empty)
 * - Anything absolute, non-/api, or origin==="" -> returned unchanged.
 */
export function rewriteApiUrl(url: string, backendOrigin: string): string {
  if (!backendOrigin) return url; // web: no-op
  // Only rewrite ROOT-RELATIVE urls. An absolute url (http://, https://,
  // capacitor://, blob:, data:) already has an origin -- never touch it.
  if (!url.startsWith('/')) return url;
  if (url.startsWith('//')) return url; // protocol-relative -> already cross-origin
  // Split path from query/hash so isRewritableApiPath sees only the path.
  const pathEnd = url.search(/[?#]/);
  const pathname = pathEnd === -1 ? url : url.slice(0, pathEnd);
  if (!isRewritableApiPath(pathname)) return url; // static assets, SPA chunks, etc.
  return `${backendOrigin}${url}`;
}

let fetchProxyInstalled = false;

/**
 * Install the global fetch proxy ONCE at app bootstrap (call from main.tsx
 * BEFORE rendering). Idempotent. No-op on the web (backend origin is ""), so the
 * browser build is completely unaffected. In a packaged shell it transparently
 * routes every relative /api call to the resolved backend.
 *
 * Handles all three fetch input shapes: string, URL, and Request.
 */
export function installApiFetchProxy(): void {
  if (fetchProxyInstalled) return;
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const backendOrigin = getBackendOrigin();
  if (!backendOrigin) {
    // Web: nothing to rewrite. Mark installed so repeat calls stay cheap.
    fetchProxyInstalled = true;
    return;
  }
  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      if (typeof input === 'string') {
        return nativeFetch(rewriteApiUrl(input, backendOrigin), init);
      }
      if (input instanceof URL) {
        // A URL object is already absolute (resolved against the document base);
        // only rewrite if it points at our own origin + an /api path.
        const rewritten = rewriteApiUrl(input.pathname + input.search + input.hash, backendOrigin);
        return rewritten.startsWith(backendOrigin)
          ? nativeFetch(rewritten, init)
          : nativeFetch(input, init);
      }
      // Request object: rewrite its url, preserving every other property.
      const req = input as Request;
      const rewritten = rewriteApiUrl(req.url, backendOrigin);
      return rewritten === req.url ? nativeFetch(req, init) : nativeFetch(new Request(rewritten, req), init);
    } catch {
      // Never let the proxy break a request -- fall back to the native fetch.
      return nativeFetch(input as RequestInfo, init);
    }
  }) as typeof window.fetch;
  fetchProxyInstalled = true;
}

/** Test-only: reset the install latch so a test can re-install under a new env. */
export function __resetFetchProxyForTests(): void {
  fetchProxyInstalled = false;
}
