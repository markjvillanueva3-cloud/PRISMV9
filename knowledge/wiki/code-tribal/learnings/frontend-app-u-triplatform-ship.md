# FRONTEND-APP/U-TRIPLATFORM-SHIP — [MAIN-FORCE] [FRONTEND-APP]/U-TRIPLATFORM-SHIP (slot:echo): build Electron + iOS/Android shells from one Vite bundle; winCodeSign-free dist driver + mobile CI + extensibility doc

**Commit:** `579f45f71ae2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T09:25:11-05:00
**Tags:** frontend-app, u-triplatform-ship, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-TRIPLATFORM-SHIP (slot:echo): build Electron + iOS/Android shells from one Vite bundle; winCodeSign-free dist driver + mobile CI + extensibility doc

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-TRIPLATFORM-SHIP (slot:echo): build Electron + iOS/Android shells from one Vite bundle; winCodeSign-free dist driver + mobile CI + extensibility doc

The PRISM web app (mcp-server/web) now ships to THREE form factors from one
build, and is architected so future PRISM features layer on with no per-shell
code (operator: 'the rest of the prism apps will be added on, plan accordingly').

- main.tsx: install the global apiBase fetch proxy before createRoot() so every
  relative /api call routes to the resolved backend in packaged Electron/mobile
  shells (no-op on web). Covers all 97 src/api/* modules + ad-hoc fetches at once.
- package.json: electron:dist -> scripts/electron-dist.mjs (a driver that runs
  --dir then zips the prepackaged win-unpacked, TOLERATING the benign winCodeSign
  probe exit on a non-Developer-Mode Windows host, FAILING LOUD if win-unpacked
  is missing OR STALE via an mtime>=buildStartMs freshness gate). win.target=zip
  (winCodeSign-free); electron:dist:nsis stays opt-in for Dev-Mode hosts.
  Empirically produces PRISM-0.1.0-x64.zip (171MB) in one command, exit 0.
- .github/workflows/mobile-build.yml: Android APK (ubuntu) + iOS app (macos-14)
  CI; scaffolds the gitignored native projects with 'cap add' before 'cap sync'.
- APP_ARCHITECTURE.md: the one-build-three-form-factors contract + the repeatable
  feature-add steps (lazy route + relative-path api module + cap sync).
- appShell.test.ts: pin the winCodeSign-free + freshness-gate driver contract.

3-of-3 scrutiny PASS (arm C found+closed the stale-win-unpacked false-pass).
```

## Files touched (8)
- .github/workflows/mobile-build.yml            | 156 ++++++++++++++++++++
- mcp-server/web/APP_ARCHITECTURE.md            | 204 ++++++++++++++++++++++++++
- mcp-server/web/package.json                   |  27 +++-
- mcp-server/web/scripts/electron-dist.mjs      | 115 +++++++++++++++
- mcp-server/web/src/__tests__/appShell.test.ts |  35 ++++-
- mcp-server/web/src/api/client.ts              |   6 +
- mcp-server/web/src/main.tsx                   |   9 ++
- 7 files changed, 549 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 579f45f71ae2`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._