// PRISM Electron preload -- minimal + secure (QX5 scaffold, slot:quebec).
//
// Exposes ONLY a read-only desktop marker so the SPA can detect it runs inside
// the desktop shell (e.g. to switch to HashRouter, show native menu affordances,
// or enable a "minimize to tray" control). It deliberately exposes NO node, fs,
// child_process, or ipc surface -- the SPA stays a pure HTTP consumer of the
// 3100 bridge, identical to the browser build. Widening this bridge requires a
// deliberate review (it is the only main<->renderer trust boundary).
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('prismDesktop', {
  isDesktop: true,
  platform: process.platform,
});
