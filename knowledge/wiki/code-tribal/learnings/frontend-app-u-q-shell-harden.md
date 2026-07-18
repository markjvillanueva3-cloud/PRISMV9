# FRONTEND-APP/U-Q-SHELL-HARDEN — [MAIN-FORCE] [FRONTEND-APP]/U-Q-SHELL-HARDEN (slot:quebec): close 3-of-3 P2s -- electron-builder build block + navigation hardening

**Commit:** `a0d3146f8991` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:08:52-05:00
**Tags:** frontend-app, u-q-shell-harden, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SHELL-HARDEN (slot:quebec): close 3-of-3 P2s -- electron-builder build block + navigation hardening

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SHELL-HARDEN (slot:quebec): close 3-of-3 P2s -- electron-builder build block + navigation hardening

Implements the P2 fixes the 3-of-3 scrutiny prescribed for U-Q-SHELL-ACTIVATE (13ba7f2e1a):
- electron-builder build block (appId tools.prism.app, directories.output dist_electron, files dist+electron): electron:build no longer defaults output to dist/ and collides with the Vite build (arm A P2). README claim now accurate.
- main.cjs setWindowOpenHandler opens external links ONLY for an exact https/http/mailto allowlist via new URL(url).protocol (no file:// or custom scheme to the OS shell) + a will-navigate guard pins main-frame nav to the app origin, routing safe external dests to the OS browser (arm C P2, the standard Electron hardening pair).
- appShell.test.ts +3 tests guard the exact allowlist, will-navigate, and the build-output config. 19/19 with desktopRouter; tsc clean.
```

## Files touched (4)
- mcp-server/web/electron/main.cjs              | 27 +++++++++++++++++++++++++--
- mcp-server/web/package.json                   |  6 ++++++
- mcp-server/web/src/__tests__/appShell.test.ts | 19 +++++++++++++++++++
- 3 files changed, 50 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a0d3146f8991`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._