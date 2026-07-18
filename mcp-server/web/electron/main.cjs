// PRISM desktop shell (Electron) -- QX5 scaffold (slot:quebec).
//
// Consumer-only by design: this wraps the SAME Vite build that ships to the
// browser. Vite writes that build to mcp-server/dist/web (vite.config.ts
// `outDir: '../dist/web'`); electron-builder's `files` remap (package.json
// "build") copies it to `dist/` INSIDE the asar, so the packaged loadFile below
// resolves to that SPA. The SPA continues to talk to the 3100 HTTP bridge
// exactly as it does on the web -- Electron adds NO backend logic and NO
// privileged IPC to engines (quebec's "pure HTTP consumer" discipline is kept).
//
// Secure defaults: contextIsolation ON, nodeIntegration OFF, sandbox ON, and
// external links open in the OS browser (never a new Electron window).
//
// CommonJS (.cjs) so it loads regardless of the web package.json "type" field.
//
// PROD ROUTING: the packaged build runs under file://, where BrowserRouter deep
// links would 404. This is RESOLVED -- src/lib/desktopRouter.ts selects
// HashRouter when window.prismDesktop is present (set by preload.cjs), so deep
// links keep the same file:// origin. In DEV (loadURL to the Vite server)
// BrowserRouter works as-is. The will-navigate guard below pins the main frame
// to the app origin (file:// when packaged), which HashRouter (#/route) honors.
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#0f1014', // PRISM dark canvas (matches index.css --bg)
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (!app.isPackaged) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Open external links (target=_blank / window.open) in the OS browser -- but
  // ONLY for safe web/mail schemes. A compromised renderer must never hand
  // file:// or a custom scheme to the OS shell. Every popup is denied an
  // in-app Electron window regardless.
  const EXTERNAL_SCHEMES = new Set(['https:', 'http:', 'mailto:']);
  const openExternalSafe = (url) => {
    try {
      if (EXTERNAL_SCHEMES.has(new URL(url).protocol)) shell.openExternal(url);
    } catch {
      /* malformed URL -> deny silently */
    }
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });

  // Pin in-window navigation to the app origin (the dev server, or file:// when
  // packaged). Any attempt to navigate the main frame off it -- e.g. an injected
  // link -- is blocked; a safe external destination still routes to the OS browser.
  // HashRouter (#/route) keeps the same file:// origin, so legit routing is unaffected.
  win.webContents.on('will-navigate', (event, url) => {
    const appOrigin = app.isPackaged ? 'file://' : DEV_URL;
    if (!url.startsWith(appOrigin)) {
      event.preventDefault();
      openExternalSafe(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  // macOS: re-create a window when the dock icon is clicked and none are open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS (standard platform behavior).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
