/**
 * Tests for the per-form-factor API base-URL resolver.
 *
 * The resolver is the foundation every PRISM feature inherits: it decides where
 * backend calls go on web vs Electron vs Capacitor mobile. A regression here
 * silently breaks EVERY backend call in a packaged app, so these tests pin the
 * exact resolution for all four branches + the build-time override + the
 * fail-loud mobile-misconfig path.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  resolveApiBase,
  rewriteApiUrl,
  WEB_API_BASE,
  DESKTOP_BACKEND_ORIGIN,
  type ApiBaseEnv,
} from '../lib/apiBase';

const base = (over: Partial<ApiBaseEnv> = {}): ApiBaseEnv => ({
  viteApiBaseUrl: undefined,
  isDesktop: false,
  isNativeMobile: false,
  warn: () => {},
  ...over,
});

describe('resolveApiBase -- form-factor resolution', () => {
  it('web (no shell, no override) resolves to the relative /api/v1 (web stays working)', () => {
    expect(resolveApiBase(base())).toBe('/api/v1');
    expect(resolveApiBase(base())).toBe(WEB_API_BASE);
  });

  it('Electron desktop resolves to absolute http://127.0.0.1:3100/api/v1 (the local bridge)', () => {
    expect(resolveApiBase(base({ isDesktop: true }))).toBe('http://127.0.0.1:3100/api/v1');
    expect(resolveApiBase(base({ isDesktop: true }))).toBe(`${DESKTOP_BACKEND_ORIGIN}${WEB_API_BASE}`);
  });

  it('build-time VITE_API_BASE_URL override wins over EVERY shell', () => {
    const cloud = 'https://api.kienzle.example.com/api/v1';
    expect(resolveApiBase(base({ viteApiBaseUrl: cloud }))).toBe(cloud);
    // override beats desktop detection
    expect(resolveApiBase(base({ viteApiBaseUrl: cloud, isDesktop: true }))).toBe(cloud);
    // override beats mobile detection
    expect(resolveApiBase(base({ viteApiBaseUrl: cloud, isNativeMobile: true }))).toBe(cloud);
  });

  it('override with a trailing slash is normalized (no double slash when path is appended)', () => {
    const r = resolveApiBase(base({ viteApiBaseUrl: 'https://api.example.com/api/v1/' }));
    expect(r).toBe('https://api.example.com/api/v1');
    // proves the `${base}${path}` contract holds with path = '/quote/estimate'
    expect(`${r}/quote/estimate`).toBe('https://api.example.com/api/v1/quote/estimate');
  });

  it('override with MULTIPLE trailing slashes is normalized to none', () => {
    expect(resolveApiBase(base({ viteApiBaseUrl: 'https://x.dev///' }))).toBe('https://x.dev');
  });
});

describe('resolveApiBase -- mobile fail-loud (R12)', () => {
  it('mobile WITHOUT an override warns LOUDLY and falls back (never silent)', () => {
    const warn = vi.fn();
    const r = resolveApiBase(base({ isNativeMobile: true, warn }));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/VITE_API_BASE_URL/);
    expect(warn.mock.calls[0][0]).toMatch(/will NOT work on a real device/i);
    // It returns the localhost base so DEV-on-emulator still has a target, but
    // the warning makes the misconfiguration impossible to miss.
    expect(r).toBe('http://127.0.0.1:3100/api/v1');
  });

  it('mobile WITH an override is correct + silent (no warning)', () => {
    const warn = vi.fn();
    const r = resolveApiBase(
      base({ isNativeMobile: true, viteApiBaseUrl: 'https://api.kienzle.app/api/v1', warn }),
    );
    expect(warn).not.toHaveBeenCalled();
    expect(r).toBe('https://api.kienzle.app/api/v1');
  });

  it('mobile precedence: native-mobile is checked before desktop (a device is never desktop)', () => {
    const warn = vi.fn();
    // both flags true is not a real runtime, but the resolver must be deterministic:
    // mobile branch is evaluated first.
    resolveApiBase(base({ isNativeMobile: true, isDesktop: true, warn }));
    expect(warn).toHaveBeenCalledTimes(1); // proves the mobile branch ran, not desktop
  });
});

describe('resolveApiBase -- adversarial / edge inputs', () => {
  it('empty-string override is treated as "no override" (falls through to web)', () => {
    expect(resolveApiBase(base({ viteApiBaseUrl: '' }))).toBe('/api/v1');
  });

  it('whitespace-only override is treated as "no override"', () => {
    expect(resolveApiBase(base({ viteApiBaseUrl: '   ' }))).toBe('/api/v1');
  });

  it('whitespace-only override on DESKTOP falls through to the desktop bridge (not web)', () => {
    expect(resolveApiBase(base({ viteApiBaseUrl: '  ', isDesktop: true }))).toBe(
      'http://127.0.0.1:3100/api/v1',
    );
  });

  it('override is trimmed of surrounding whitespace before use', () => {
    expect(resolveApiBase(base({ viteApiBaseUrl: '  https://api.x.dev/api/v1  ' }))).toBe(
      'https://api.x.dev/api/v1',
    );
  });

  it('default warn sink does not throw when omitted on the mobile path', () => {
    // warn omitted entirely -> resolver uses console.warn; must not throw.
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => resolveApiBase({ isDesktop: false, isNativeMobile: true })).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('rewriteApiUrl -- the global-fetch-proxy rewrite (the 217-site foundation)', () => {
  const ORIGIN = 'http://127.0.0.1:3100';

  it('web (empty origin) is a pure no-op for every url', () => {
    expect(rewriteApiUrl('/api/v1/quote/estimate', '')).toBe('/api/v1/quote/estimate');
    expect(rewriteApiUrl('/api/mcp/quoting', '')).toBe('/api/mcp/quoting');
    expect(rewriteApiUrl('https://x.dev/api/v1/x', '')).toBe('https://x.dev/api/v1/x');
  });

  it('rewrites a relative /api/v1 path to the backend origin (the src/api/* modules)', () => {
    expect(rewriteApiUrl('/api/v1/quote/estimate', ORIGIN)).toBe(
      'http://127.0.0.1:3100/api/v1/quote/estimate',
    );
  });

  it('rewrites the ad-hoc /api/mcp + /api/dispatch + /api/operator component fetches', () => {
    expect(rewriteApiUrl('/api/mcp/quoting', ORIGIN)).toBe('http://127.0.0.1:3100/api/mcp/quoting');
    expect(rewriteApiUrl('/api/dispatch/cam', ORIGIN)).toBe('http://127.0.0.1:3100/api/dispatch/cam');
    expect(rewriteApiUrl('/api/operator/feedback', ORIGIN)).toBe(
      'http://127.0.0.1:3100/api/operator/feedback',
    );
    expect(rewriteApiUrl('/api/shop/snapshot', ORIGIN)).toBe('http://127.0.0.1:3100/api/shop/snapshot');
  });

  it('preserves query string + hash when rewriting', () => {
    expect(rewriteApiUrl('/api/shop/jobs?status=open#x', ORIGIN)).toBe(
      'http://127.0.0.1:3100/api/shop/jobs?status=open#x',
    );
  });

  it('NEVER rewrites an already-absolute url (no double-prepend, no cross-origin hijack)', () => {
    expect(rewriteApiUrl('http://127.0.0.1:3100/api/v1/x', ORIGIN)).toBe(
      'http://127.0.0.1:3100/api/v1/x',
    );
    expect(rewriteApiUrl('https://api.cloud.dev/api/v1/x', ORIGIN)).toBe(
      'https://api.cloud.dev/api/v1/x',
    );
    expect(rewriteApiUrl('capacitor://localhost/api/v1/x', ORIGIN)).toBe(
      'capacitor://localhost/api/v1/x',
    );
  });

  it('NEVER rewrites non-/api relative urls (SPA chunks, static assets stay same-origin)', () => {
    expect(rewriteApiUrl('/assets/index-abc.js', ORIGIN)).toBe('/assets/index-abc.js');
    expect(rewriteApiUrl('/favicon.svg', ORIGIN)).toBe('/favicon.svg');
    expect(rewriteApiUrl('/dashboard', ORIGIN)).toBe('/dashboard'); // a route, not an api call
    // adversarial: a path that merely CONTAINS /api but is not rooted there
    expect(rewriteApiUrl('/static/api/docs.html', ORIGIN)).toBe('/static/api/docs.html');
  });

  it('does not rewrite protocol-relative (//host/...) urls', () => {
    expect(rewriteApiUrl('//cdn.example.com/api/x', ORIGIN)).toBe('//cdn.example.com/api/x');
  });

  it('rewrites the bare /api root and /api/ exactly', () => {
    expect(rewriteApiUrl('/api', ORIGIN)).toBe('http://127.0.0.1:3100/api');
    expect(rewriteApiUrl('/api/', ORIGIN)).toBe('http://127.0.0.1:3100/api/');
  });
});
