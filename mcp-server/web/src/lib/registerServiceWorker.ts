/**
 * registerServiceWorker — PWA bootstrap for PRISM Academy.
 *
 * Activation rules:
 *   - Only registers when navigator.serviceWorker exists (modern browsers).
 *   - Only registers in production builds (import.meta.env.PROD) so HMR isn't
 *     poisoned by a stale SW in dev. Override with ?sw=force in the URL.
 *   - Skips entirely when URL contains ?sw=off — diagnostic escape hatch.
 *
 * On update available, dispatches a "prism:sw-update" CustomEvent on window so
 * the App shell can surface a "new version — reload" pill without forcing a
 * refresh mid-lesson.
 */

export interface RegisterServiceWorkerResult {
  registered: boolean;
  reason?: string;
  registration?: ServiceWorkerRegistration;
}

function hasSwSupport(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function queryFlag(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function isProdEnv(): boolean {
  // Vite injects import.meta.env at build time. Guard with typeof for tests.
  const env = (import.meta as ImportMeta & { env?: { PROD?: boolean; DEV?: boolean } }).env;
  return Boolean(env?.PROD) && !env?.DEV;
}

export async function registerServiceWorker(): Promise<RegisterServiceWorkerResult> {
  if (!hasSwSupport()) {
    return { registered: false, reason: "no-sw-support" };
  }
  const swFlag = queryFlag("sw");
  if (swFlag === "off") {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      // best-effort cleanup; never throw from a diagnostic flag
    }
    return { registered: false, reason: "sw=off" };
  }
  if (!isProdEnv() && swFlag !== "force") {
    return { registered: false, reason: "dev-build" };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // Notify the app shell when a new SW version installs (so it can prompt
    // for refresh AFTER the current lesson finishes — non-disruptive update).
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          try {
            window.dispatchEvent(new CustomEvent("prism:sw-update", { detail: { registration } }));
          } catch {
            // older browsers without CustomEvent constructor — fall back silently
          }
        }
      });
    });

    return { registered: true, registration };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { registered: false, reason: `register-failed: ${message}` };
  }
}
