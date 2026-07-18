# PRISM Mobile Shell (Capacitor iOS/Android) — QX6 scaffold

> **Status: UNVERIFIED activation-gated scaffold (slot:quebec).** `capacitor.config.json`
> is pure-additive (JSON, not in tsc) and cannot break the web build. It is NOT a
> working mobile app until the activation steps below run and a device/simulator
> build is tested. Same install-gated pattern as the Electron shell (`electron/README.md`).

## What this is

Capacitor wraps the **same** `web/dist` Vite build (`"webDir": "dist"`) into native
iOS + Android apps. The phone app is the SAME React SPA — no second mobile codebase —
talking to the `:3100` HTTP bridge. This is the operator-stated model
("the phone app ships as a Capacitor wrapper around this exact React+Vite bundle").

## Config notes (`capacitor.config.json`)

- `appId: "tools.prism.app"` — **PLACEHOLDER reverse-DNS** (derived from the prism.tools
  domain). Confirm/replace with the real bundle id before any store submission; it is
  hard to change after first publish.
- `webDir: "dist"` — the Vite output, identical to what the browser + Electron load.
- `androidScheme: "https"` — recommended (avoids mixed-content + insecure-origin APIs).
- `allowMixedContent: false` — the SPA must reach `:3100` over a proper origin (see below).

## Activation

1. Install:
   ```
   cd mcp-server/web
   npm i @capacitor/core && npm i -D @capacitor/cli
   npm i @capacitor/ios @capacitor/android
   ```
2. Build the web bundle, then add the native platforms:
   ```
   npm run build
   npx cap add ios
   npx cap add android
   npx cap sync
   ```
3. Open + run:
   ```
   npx cap open ios       # Xcode (macOS only)
   npx cap open android   # Android Studio
   ```

## Routing — NOT a problem on mobile

Unlike the Electron packaged build (which loads `file://` and needs HashRouter), Capacitor
serves the bundle via a local origin (`capacitor://` / `https://localhost`), so the SPA's
**BrowserRouter works as-is**. No router change is required for mobile.

## Mobile UX already scaffolded / still TODO

- Already present: `src/hooks/useHaptics.ts` (haptics bridge stub). The web `CLAUDE.md`
  mandates 44pt tap targets, `<MobileSafeArea>` insets, `inputMode` keyboards, thumb-zone
  CTAs, and native back-gesture wiring on every page.
- Networking: on a real device the app cannot reach a dev-host `localhost:3100`. Configure
  the API base (`lib/api.ts`) to the deployed bridge URL for device builds; for local
  device testing use `npx cap run` with a LAN host or a tunnel.
- Plugins to add per the web `CLAUDE.md` mobile section: `@capacitor/status-bar`,
  `@capacitor/app` (back button), pull-to-refresh, `@capacitor/dialog` (native modals).
