import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { selectRouter } from './lib/desktopRouter';
import { installApiFetchProxy } from './lib/apiBase';
import { App } from './App';
import { registerServiceWorker } from './lib/registerServiceWorker';
import './index.css';
import './styles/ios-theme.css';

// Route every relative /api call to the resolved backend origin BEFORE any
// component can fetch. No-op on the web (origin stays relative); in a packaged
// Electron/mobile shell it rewrites /api/... -> the local bridge / configured
// backend, so the app is functional rather than a hollow shell. See
// src/lib/apiBase.ts. Must run before createRoot() so render-time fetches are
// already wrapped.
installApiFetchProxy();

// iOS shell default-on (operator directive). FLEET-IOS-REDESIGN U2.5 (slot:hotel,
// 2026-06-10): the shell choice now uses its OWN key `prism-shell-mode`, decoupled from
// ThemeToggle's `prism-theme` (light/dark/system). Previously BOTH read/wrote
// `prism-theme`, so cycling the toggle to 'light' silently kept the iOS-dark shell
// on while removing the .dark class -- a latent collision. Opt out of the iOS shell
// via localStorage.setItem('prism-shell-mode', 'studio') + reload.
if (localStorage.getItem('prism-shell-mode') !== 'studio') {
  document.body.dataset.theme = 'ios';
}

// KIENZLE brand shell default-on (KIENZLE-MERGE U-KZ-THEME, 2026-06-28, slot:charlie).
// Operator directive: Kienzle is the master brand that retires PRISM. Mirrors the
// iOS shell pattern above (own key, decoupled): body[data-brand='kienzle'] activates
// the Kienzle token bridge in index.css (Archivo/Space-Grotesk fonts + the green
// accent), composing ON TOP of the iOS shell (both attributes coexist -- brand swaps
// fonts+accent, theme swaps radii). Opt out (revert to PRISM-cyan) via
// localStorage.setItem('kienzle-brand-mode', 'prism') + reload.
if (localStorage.getItem('kienzle-brand-mode') !== 'prism') {
  document.body.dataset.brand = 'kienzle';
}

// Electron packaged builds load over file:// where BrowserRouter deep-links 404;
// selectRouter() picks HashRouter inside the desktop shell and BrowserRouter on
// web + Capacitor (real local origin). Web behavior is unchanged. See electron/README.md.
const Router = selectRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);

// PRISM-ACADEMY-MOBILE-MS0/U-PAM-PWA-SHELL: install PWA service worker
// AFTER the React root mounts. Failure here must never block the app —
// registerServiceWorker resolves with a reason string instead of throwing.
void registerServiceWorker();
