# FRONTEND-APP/U-Q-DESKTOP-ROUTER — [MAIN-FORCE] [FRONTEND-APP]/U-Q-DESKTOP-ROUTER (slot:quebec): HashRouter in the Electron shell, BrowserRouter on web/Capacitor (closes QX5 packaged-build routing gotcha)

**Commit:** `1792213097b0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T13:05:00-05:00
**Tags:** frontend-app, u-q-desktop-router, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-DESKTOP-ROUTER (slot:quebec): HashRouter in the Electron shell, BrowserRouter on web/Capacitor (closes QX5 packaged-build routing gotcha)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-DESKTOP-ROUTER (slot:quebec): HashRouter in the Electron shell, BrowserRouter on web/Capacitor (closes QX5 packaged-build routing gotcha)

R16 gap-close on QX5: the Electron packaged build loads file:// where BrowserRouter deep-links 404. selectRouter() (src/lib/desktopRouter.ts) returns HashRouter when window.prismDesktop?.isDesktop (set ONLY by electron/preload.cjs), else BrowserRouter -- so web + Capacitor are byte-unchanged (deny-by-default to web; the marker is undefined in a browser). main.tsx wires it; src/types/desktop.d.ts types the window marker. desktopRouter.test.ts 3/3 (web->Browser, desktop->Hash, falsy-marker->Browser). web tsc exit 0.
```

## Files touched (5)
- mcp-server/web/src/__tests__/desktopRouter.test.ts | 33 +++++++++++++++++++++++++++++++++
- mcp-server/web/src/lib/desktopRouter.ts            | 23 +++++++++++++++++++++++
- mcp-server/web/src/main.tsx                        | 11 ++++++++---
- mcp-server/web/src/types/desktop.d.ts              | 12 ++++++++++++
- 4 files changed, 76 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- gotcha)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1792213097b0`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._