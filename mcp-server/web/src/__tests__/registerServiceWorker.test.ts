/**
 * registerServiceWorker.test.ts — iter-1 deferred from
 * PRISM-ACADEMY-MOBILE-MS0/U-PAM-PWA-SHELL.
 *
 * Covers the three lifecycle outcomes of `registerServiceWorker()`:
 *  (a) prod+supported → registers `/sw.js` with `scope:"/"` and returns the registration.
 *  (b) `navigator.serviceWorker` missing → returns `reason: "no-sw-support"`, never throws.
 *  (c) `navigator.serviceWorker.register` rejects → returns `reason: "register-failed: <msg>"`.
 *
 * Vitest's jsdom env does NOT include `navigator.serviceWorker` by default, so case (b)
 * is the natural state; cases (a) and (c) inject a fake via `Object.defineProperty`.
 *
 * `?sw=force` is used to bypass the `isProdEnv()` guard so we don't have to mock
 * `import.meta.env` (vitest reports DEV=true by default).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerServiceWorker } from '../lib/registerServiceWorker';

describe('registerServiceWorker', () => {
  let originalDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Capture whatever (if anything) is already on navigator so we can put it back.
    originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    // Reset URL to a clean root each test — no ?sw flag carries between cases.
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', originalDescriptor);
    } else {
      // We added one; remove it.
      try {
        delete (navigator as unknown as Record<string, unknown>).serviceWorker;
      } catch {
        // Some hosts disallow delete on navigator — fall back to redefine-as-undefined.
        Object.defineProperty(navigator, 'serviceWorker', {
          configurable: true,
          value: undefined,
        });
      }
    }
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('returns reason "no-sw-support" when navigator.serviceWorker is missing', async () => {
    // Defensive — strip any leftover serviceWorker from a previous suite.
    if ('serviceWorker' in navigator) {
      try {
        delete (navigator as unknown as Record<string, unknown>).serviceWorker;
      } catch {
        Object.defineProperty(navigator, 'serviceWorker', {
          configurable: true,
          value: undefined,
        });
      }
    }
    // Pre-condition: feature actually absent.
    expect('serviceWorker' in navigator && navigator.serviceWorker != null).toBe(false);

    const result = await registerServiceWorker();

    expect(result).toEqual({ registered: false, reason: 'no-sw-support' });
    expect(result.registration).toBeUndefined();
  });

  it('registers "/sw.js" with scope "/" when serviceWorker is supported and prod is forced', async () => {
    // Force the prod path without mocking import.meta.env.
    window.history.replaceState(null, '', '/?sw=force');

    const fakeRegistration = {
      installing: null,
      addEventListener: vi.fn(),
    };
    const registerMock = vi.fn().mockResolvedValue(fakeRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: {
        register: registerMock,
        getRegistrations: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await registerServiceWorker();

    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(result.registered).toBe(true);
    expect(result.registration).toBe(fakeRegistration);
    expect(result.reason).toBeUndefined();
    // Registration must wire an updatefound listener so the app shell can pick up
    // new-version events; verify it was attached.
    expect(fakeRegistration.addEventListener).toHaveBeenCalledWith(
      'updatefound',
      expect.any(Function),
    );
  });

  it('returns reason "register-failed: <message>" when register() rejects', async () => {
    window.history.replaceState(null, '', '/?sw=force');

    const failureMessage = 'install denied by user';
    const registerMock = vi.fn().mockRejectedValue(new Error(failureMessage));
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: {
        register: registerMock,
        getRegistrations: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await registerServiceWorker();

    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(result.registered).toBe(false);
    expect(result.registration).toBeUndefined();
    // Reason must start with the canonical prefix AND surface the original message
    // so callers can log/observe the underlying failure.
    expect(result.reason).toMatch(/^register-failed: /);
    expect(result.reason).toContain(failureMessage);
  });
});
