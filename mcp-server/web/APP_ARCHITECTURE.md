# PRISM App Architecture -- One Build, Three Form Factors

> **Read this before adding any PRISM feature, app, or page.** It is the contract
> that lets you build a feature *once* and have it work on the web, the Electron
> desktop app, and the iOS/Android mobile apps with no per-shell code. The rest
> of the PRISM apps layer onto this -- follow the convention below and your
> feature is automatically tri-platform.

## TL;DR -- the whole convention

To add a feature that works on **all three form factors**, you do exactly what
you would do for a plain web feature, plus one mechanical sync command:

1. **Add a page** -- `src/pages/MyFeaturePage.tsx`, lazy-route it in `App.tsx`.
2. **Add an API module** (if it calls the backend) -- `src/api/myFeature.ts`
   with `const BASE_URL = "/api/v1/my-feature"` and `fetch(`${BASE_URL}...`)`.
   **Use a relative `/api/...` path. Do nothing form-factor-specific.**
3. **`npm run cap:sync`** -- copies the rebuilt web bundle into the Electron and
   mobile shells.

That's it. The relative `/api/...` path is rewritten to the right backend by the
global fetch proxy (see below), so you never think about `file://` vs
`capacitor://` vs same-origin. **There is no second codebase, no per-platform
fork, no `if (isMobile)` in feature code.**

---

## Why one build produces three apps

```
                         src/  (React 19 + Vite 6 + TS)
                              |
                       vite build  (outDir: ../dist/web)
                              |
              +---------------+----------------+
              |               |                |
           WEB             ELECTRON          MOBILE
   served same-origin    electron-builder   cap sync ->
   by the PRISM server   wraps dist/web      android/ + ios/
   at /api/v1            (asar)              (Capacitor 6)
```

- **One Vite build** writes the SPA to `mcp-server/dist/web` (`vite.config.ts`
  `outDir: '../dist/web'`).
- **Web:** the PRISM server serves that bundle and the backend from the same
  origin. `/api/v1` is a same-origin relative path -- it just works.
- **Electron desktop:** `electron/main.cjs` loads the bundle over `file://`
  (packaged) or the Vite dev server (dev). `electron-builder` packs `dist/web`
  into the app. The relative `/api/v1` would resolve to `file:///api/v1` (no
  server) -- the fetch proxy fixes this.
- **Mobile:** Capacitor wraps the *same* `dist/web` (`capacitor.config.json`
  `webDir: '../dist/web'`). It loads over `capacitor://localhost` (Android) /
  `ionic://localhost` (iOS). Again no same-origin backend -- the fetch proxy
  fixes this.

The build outputs (`dist/web`, the Electron `dist_electron/`, the `android/` and
`ios/` scaffolds) are all **consumers of the same `src/`**. You never edit them
by hand; you edit `src/` and re-sync.

---

## The backend seam -- the one thing that is NOT same-origin

This is the single architectural subtlety, and it is **already solved** so you
do not have to think about it:

- The web app talks to `/api/v1` (relative).
- Packaged Electron loads over `file://` -> `/api/v1` would resolve to
  `file:///api/v1` = no server.
- Mobile loads over `capacitor://localhost` -> `/api/v1` would resolve to
  `capacitor://localhost/api/v1` = no server.

**Solution: a global `window.fetch` proxy** installed once at bootstrap
(`src/main.tsx` -> `installApiFetchProxy()` from `src/lib/apiBase.ts`). It
rewrites every relative `/api/...` request to the resolved backend origin when
the app is packaged, and is a **no-op on the web** (web behavior is byte-
identical). This covers all ~97 `src/api/*` modules AND every ad-hoc
`fetch("/api/...")` in components/pages -- current and future -- for free.

### Where the backend lives per shell (`src/lib/apiBase.ts` resolver)

Resolution order (first match wins):

| Priority | Condition | Backend base |
|----------|-----------|--------------|
| 1 | `VITE_API_BASE_URL` build-time env set | that URL (point any shell at a deployed cloud backend) |
| 2 | Mobile (Capacitor) with no env | **fails loud** + falls back to localhost (a phone has no localhost backend -- you MUST set `VITE_API_BASE_URL` for a real-device build) |
| 3 | Desktop (Electron) | `http://127.0.0.1:3100` (the local PRISM HTTP bridge) |
| 4 | Web (default) | `/api/v1` (relative, unchanged) |

**Configurable, nothing hardcoded to a deployment.** When the operator deploys a
cloud backend, they set `VITE_API_BASE_URL=https://api.example.com/api/v1` at
build time and every shell points there.

### What this means for you

When you write a new API module, **write the relative path and stop**:

```ts
// src/api/myFeature.ts  -- this is ALL you do; the proxy handles every shell
const BASE_URL = "/api/v1/my-feature";
async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, { method: "POST", /* ... */ });
  return res.json() as Promise<T>;
}
```

Do **not** import `getApiBase()`, do **not** branch on form factor, do **not**
prepend an origin. The proxy does it. (`getApiBase()` exists for the rare case
you need the origin outside a fetch -- e.g. a WebSocket URL -- but a normal
`fetch("/api/...")` should never call it.)

---

## Adding a feature -- the repeatable steps

### 1. Page (every feature is already a mobile page)

```tsx
// src/pages/MyFeaturePage.tsx
export default function MyFeaturePage() {
  // Mobile-first from line 1 (see web/CLAUDE.md "Mobile" section):
  //  - tap targets h-11 (44pt), <MobileSafeArea> for full-bleed pages
  //  - <input inputMode="decimal"> for numeric fields
  //  - reference DESIGN.md tokens; never inline hex/px
  return <div>...</div>;
}
```

Lazy-route it in `src/App.tsx` (the established pattern -- `lazy()` + the
`<Suspense>`-wrapped `<Routes>` block):

```tsx
const MyFeaturePage = lazy(() => import('./pages/MyFeaturePage'));
// ...inside <Routes>:
<Route path="my-feature" element={lazyElement(secure(<MyFeaturePage />))} />
```

`lazyElement` wraps in `<Suspense>`; `secure(...)` gates by clearance (drop it
for public pages). Routing works on all three shells because `main.tsx` picks
`HashRouter` inside Electron (`file://` deep-link safe) and `BrowserRouter` on
web + mobile (`selectRouter()` in `src/lib/desktopRouter.ts`).

### 2. API module (only if the feature calls the backend)

`src/api/myFeature.ts` with a relative `BASE_URL` as shown above. The proxy
makes it tri-platform automatically.

### 3. Sync to the shells

```bash
npm run cap:sync   # build + copy bundle into android/ + ios/
# desktop picks up dist/web automatically on the next electron build
```

Nothing else. No shell-specific file, no native code, no platform branch.

---

## Build + release commands

| Command | Produces | Notes |
|---------|----------|-------|
| `npm run dev` | Vite dev server (web) | hot reload |
| `npm run build` | `../dist/web` SPA | the one build all shells consume |
| `npm run electron:dev` | Electron + Vite dev | desktop hot reload |
| `npm run electron:dist` | `dist_electron/PRISM-<ver>-x64.zip` | **winCodeSign-free** desktop distributable (unzip + run `PRISM.exe`). Runs `scripts/electron-dist.mjs`: `--dir` then `--win zip --prepackaged`, tolerating the benign winCodeSign probe exit from `--dir` while failing loud if `win-unpacked` is genuinely missing. One command. |
| `npm run electron:dist:nsis` | NSIS installer `.exe` | needs Windows **Developer Mode** (winCodeSign extracts macOS `.dylib` symlinks -- requires `SeCreateSymbolicLinkPrivilege`). Use on a Dev-Mode host or CI. |
| `npm run cap:sync` | android/ + ios/ updated | run after any web change before a mobile build |
| `npm run mobile:add:android` / `:ios` | scaffold (one-time) | already done; re-run only if scaffolds are deleted |

### Mobile CI (`.github/workflows/mobile-build.yml`)

- **Android APK** on `ubuntu-latest` (JDK 17 + Android SDK + `gradlew
  assembleDebug`). Free Linux runner -- no local 10GB SDK install.
- **iOS app** on `macos-14` (`pod install` + `xcodebuild`, unsigned/build-only).
- Both run `npm run build`, then **scaffold the native project if absent**
  (`[ -d android ] || npx cap add android` -- the `android/` + `ios/` dirs are
  gitignored and regenerated, NOT committed), then `npx cap sync`, then the
  native build. `cap sync` only copies the bundle into an existing scaffold; it
  does not create one, so the `cap add` guard is required on a clean checkout.
- **Set the `VITE_API_BASE_URL` repo secret** to a device-reachable backend
  before a real-device build, or the bundle runs but cannot reach the backend.
- Signed release artifacts (`.aab` / signed `.ipa`) need the operator's
  keystore / Apple signing identity -- not committed; add as CI secrets when
  shipping to the stores.

---

## The seam files (do not duplicate these -- extend them)

| File | Role |
|------|------|
| `src/lib/apiBase.ts` | the per-shell backend resolver + the global fetch proxy. ONE source of truth for where `/api` calls go. |
| `src/main.tsx` | installs the fetch proxy before `createRoot()`; picks the router via `selectRouter()`. |
| `src/lib/desktopRouter.ts` | `HashRouter` in Electron, `BrowserRouter` elsewhere. |
| `vite.config.ts` | `outDir: '../dist/web'` -- load-bearing; every shell + the prod server reads this path. |
| `electron/main.cjs` | desktop shell (loads `dist/web`, secure defaults). |
| `capacitor.config.json` | mobile shell config (`webDir: '../dist/web'`). |
| `package.json` `build` block | electron-builder targets (zip default; nsis opt-in). |

If a new requirement needs a per-shell decision, it belongs in `apiBase.ts` or
`desktopRouter.ts` -- **not** scattered across feature code. That keeps the
"build once, runs everywhere" guarantee intact as PRISM grows.
