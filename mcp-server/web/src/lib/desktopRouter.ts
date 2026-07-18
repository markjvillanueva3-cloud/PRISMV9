/**
 * Router selection for the multi-shell SPA (QX5 follow-up).
 *
 * The Electron PACKAGED build loads the SPA over file://, where BrowserRouter's
 * HTML5 history + deep links 404 (no server to rewrite paths). HashRouter works
 * under file://. On the web -- and inside Capacitor, which serves a real local
 * origin (capacitor:// / https://localhost) -- BrowserRouter is correct and kept.
 *
 * The desktop shell is detected via window.prismDesktop, set ONLY by the Electron
 * preload (electron/preload.cjs). On web that global is undefined -> BrowserRouter,
 * i.e. zero behavior change for the browser build (deny-by-default to web).
 */
import { BrowserRouter, HashRouter } from 'react-router-dom';

/** True only inside the Kienzle Electron desktop shell (preload sets the marker). */
export function isDesktopShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.prismDesktop?.isDesktop);
}

/** HashRouter in the Electron shell (file:// safe); BrowserRouter everywhere else. */
export function selectRouter(): typeof BrowserRouter {
  return isDesktopShell() ? HashRouter : BrowserRouter;
}
