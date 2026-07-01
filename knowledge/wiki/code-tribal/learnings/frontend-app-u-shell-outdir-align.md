# FRONTEND-APP/U-SHELL-OUTDIR-ALIGN — [MAIN-FORCE] [FRONTEND-APP]/U-SHELL-OUTDIR-ALIGN (slot:charlie): fix Electron+Capacitor shells packaging an EMPTY SPA -- align webDir/files to Vite's real outDir (../dist/web)

**Commit:** `3ba3a7f6ef01` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T07:59:08-05:00
**Tags:** frontend-app, u-shell-outdir-align, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-SHELL-OUTDIR-ALIGN (slot:charlie): fix Electron+Capacitor shells packaging an EMPTY SPA -- align webDir/files to Vite's real outDir (../dist/web)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-SHELL-OUTDIR-ALIGN (slot:charlie): fix Electron+Capacitor shells packaging an EMPTY SPA -- align webDir/files to Vite's real outDir (../dist/web)

ROOT CAUSE (silent, app-breaking): Vite writes the SPA to mcp-server/dist/web
(vite.config.ts `outDir: '../dist/web'`, which the prod web server at
src/index.ts:1415 + bundle-budget gate + Dockerfile/netlify/vercel all serve),
but the Codex-built Electron + Capacitor shells assumed the Vite DEFAULT
`web/dist`. Result: electron-builder's `files:["dist/**"]` glob matched nothing
-> the packaged app.asar shipped WITHOUT the SPA (verified: dist/index.html was
absent from the asar; the desktop app would launch to a blank file:// 404).
`cap sync` would copy an empty folder for the same reason.

FIX (align the shells to the load-bearing server outDir; do NOT move outDir --
that would break the server-serve path + bundle gate, R7):
- package.json: add `"main": "electron/main.cjs"` (electron-builder entry; under
  `type:module` a default index.js would be ESM and the CJS shell never loads).
  Replace electron-builder `files:["dist/**","electron/**"]` with
  `["electron/**", {from:"../dist/web", to:"dist"}]` -- the remap copies the real
  Vite output to dist/ INSIDE the asar, where electron/main.cjs's
  loadFile('../dist/index.html') resolves. Add axe-core + @axe-core/playwright
  devDeps (e2e/accessibility.spec.ts consumer was missing them -> e2e collection
  failed before this).
- capacitor.config.json: webDir "dist" -> "../dist/web".
- electron/main.cjs: correct the stale "web/dist" + "UNVERIFIED routing caveat"
  header (routing IS resolved via desktopRouter.ts HashRouter selection).
- .gitignore (NEW): ignore generated /android/ /ios/ /dist_electron/ +
  Playwright/scratch artifacts (dist_electron alone holds a ~180MB PRISM.exe +
  ~373MB asar -- must never be committed).

VERIFIED (R12, with proof, NOT "looks fine"):
- electron:build now packages dist/index.html + 8699 dist entries INTO the asar
  (was absent); PRISM.exe + app.asar produced. (winCodeSign symlink-privilege
  warning is a Windows code-SIGNING step, irrelevant to the --dir package.)
- cap add android + cap sync: native gradle project scaffolded + the HASHED
  production bundle (index-D5Rsmg-M.css, react-vendor-*.js) synced into
  android assets -- proves webDir fix end-to-end. (gradlew assembleDebug needs
  the Android SDK/JDK, absent on this Windows host -- project is build-ready.)
- cap add ios: Xcode project + Podfile scaffolded; pod install/xcodebuild
  cleanly skipped (macOS-only) -- Mac-buildable scaffold.
- tsc --noEmit exit 0; appShell.test.ts 19/19 + desktopRouter 3/3 pass.
- New R9 drift-guard tests: webDir==vite outDir, electron-builder remap
  from/to==vite outDir + matches main.cjs loadFile path (parsed live from
  vite.config.ts so a future outDir move fails the suite).
- Quoting stack audited end-to-end: 13 routes, 2459-LOC QuoteBuilder, real
  api/client -> Express /quote/* -> live prism_business actions (no shell pages).
- e2e suite now COLLECTS 157 specs (was 0 -- axe-core + a truncated decompiled
  benchmarkTruth.spec.ts artifact were the blockers); remaining failures are
  networkidle timeouts (app renders fine vs a backendless dev server) + test<->app
  DOM drift, NOT broken pages (proven via captured DOM snapshots).

3-of-3 scrutiny: arms A+B+C all PASS (A: 1 P2 doc-comment FIXED; B,C: no findings;
C traced all 6 ../dist/web consumers unaffected + git check-ignore 0 tracked files
un-tracked).
```

## Files touched (7)
- mcp-server/web/.gitignore                     |  31 +++++++
- mcp-server/web/capacitor.config.json          |   2 +-
- mcp-server/web/electron/main.cjs              |  25 +++---
- mcp-server/web/package-lock.json              | 119 ++++++++++++++------------
- mcp-server/web/package.json                   |  15 +++-
- mcp-server/web/src/__tests__/appShell.test.ts |  53 +++++++++++-
- 6 files changed, 173 insertions(+), 72 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3ba3a7f6ef01`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._