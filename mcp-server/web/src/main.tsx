import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { registerServiceWorker } from './lib/registerServiceWorker';
import './index.css';
import './styles/ios-theme.css';

// iOS shell default-on (operator directive). FLEET-IOS-REDESIGN U2.5 (slot:hotel,
// 2026-06-10): the shell choice now uses its OWN key `prism-shell-mode`, decoupled from
// ThemeToggle's `prism-theme` (light/dark/system). Previously BOTH read/wrote
// `prism-theme`, so cycling the toggle to 'light' silently kept the iOS-dark shell
// on while removing the .dark class -- a latent collision. Opt out of the iOS shell
// via localStorage.setItem('prism-shell-mode', 'studio') + reload.
if (localStorage.getItem('prism-shell-mode') !== 'studio') {
  document.body.dataset.theme = 'ios';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// PRISM-ACADEMY-MOBILE-MS0/U-PAM-PWA-SHELL: install PWA service worker
// AFTER the React root mounts. Failure here must never block the app —
// registerServiceWorker resolves with a reason string instead of throwing.
void registerServiceWorker();
