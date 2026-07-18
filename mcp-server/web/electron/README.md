# PRISM Desktop Shell (Electron) — QX5 scaffold

> **Status: ACTIVATED (slot:quebec, 2026-06-22).** `electron` + `electron-builder` are
> now installed (devDeps in `web/package.json`) and the `electron:start` / `electron:dev`
> / `electron:build` scripts are wired. The packaged-build router gotcha is handled
> (HashRouter-when-desktop, `src/lib/desktopRouter.ts`). The only step that cannot run
> headlessly here is the visual launch-test (needs a display) and a full `electron-builder`
> package run. Security posture + config are regression-guarded by
> `src/__tests__/appShell.test.ts`.

## What this is

`electron/main.cjs` + `electron/preload.cjs` wrap the **same** `web/dist` Vite build
that ships to the browser. The desktop app is a thin consumer shell — the SPA still
talks to the `:3100` HTTP bridge exactly as it does on the web. No backend logic and
no privileged IPC to engines live here (quebec stays a pure HTTP consumer).

Secure defaults: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`,
external links open in the OS browser via `setWindowOpenHandler`.

## Activation — DONE (deps + scripts installed 2026-06-22)

Deps (`electron@^31`, `electron-builder@^25`, plus `concurrently`/`wait-on`/`cross-env`
for the cross-platform dev script) are in `web/package.json` and the scripts are wired:

```json
"electron:start": "electron electron/main.cjs",
"electron:dev":   "concurrently -k \"npm run dev\" \"wait-on tcp:5173 && cross-env VITE_DEV_SERVER_URL=http://localhost:5173 electron electron/main.cjs\"",
"electron:build": "npm run build && electron-builder --dir"
```

Run it:

1. **Dev shell** (loads the live Vite server): `npm run electron:dev` → a 1440×900
   window loading the SPA. (Or run `npm run dev` and `npm run electron:start` in two terminals.)
2. **Packaged build**: `npm run electron:build` → `electron-builder --dir` produces an
   unpacked app in `dist_electron/`. The `file://` deep-link 404 is already handled by
   `selectRouter()` (HashRouter inside the shell).

The only steps that cannot run in a headless CI/agent context are the **visual launch-test**
(needs a display) and signing/notarization for distribution.

## KNOWN GOTCHA — production routing (must resolve before packaging)

The SPA uses **BrowserRouter**. Under `file://` (a packaged build via `loadFile`),
deep links and refreshes 404 because there is no server to rewrite paths. **Dev mode
(`loadURL` to the Vite server) works as-is.** Before shipping a packaged build, pick one:

- **HashRouter when desktop** — switch the app shell to `HashRouter` when
  `window.prismDesktop?.isDesktop` is true (the preload sets this marker). Lowest effort.
- **`app://` custom protocol** — register a custom protocol in `main.cjs` that serves
  `dist/` and falls back to `index.html` for unknown paths (SPA fallback). More robust.

`preload.cjs` already exposes `window.prismDesktop = { isDesktop, platform }` so the
SPA can branch on it without any other change.

## Next (QX6)

The Capacitor iOS/Android shell wraps the same `dist/` — see the QX6 unit. The router
gotcha there is handled by Capacitor's local server (no `file://`), so HashRouter is
not required for mobile, only for the Electron packaged build.
