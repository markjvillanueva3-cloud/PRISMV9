# FRONTEND-APP/U-Q-ELECTRON-SHELL — [MAIN-FORCE] [FRONTEND-APP]/U-Q-ELECTRON-SHELL (slot:quebec): QX5 Electron desktop shell scaffold (activation-gated)

**Commit:** `158a1ef15625` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T12:59:55-05:00
**Tags:** frontend-app, u-q-electron-shell, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-ELECTRON-SHELL (slot:quebec): QX5 Electron desktop shell scaffold (activation-gated)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-ELECTRON-SHELL (slot:quebec): QX5 Electron desktop shell scaffold (activation-gated)

Operator authorized push-through on the deferred shells. Pure-additive (web/electron/* new files only -- does NOT touch the web build, cannot break it). Wraps the SAME Vite dist; secure defaults (contextIsolation/sandbox on, nodeIntegration off, external links -> OS browser); consumer-only (no privileged IPC -- SPA still talks to the :3100 bridge). R12: UNVERIFIED scaffold -- README documents activation (npm i -D electron electron-builder + scripts) and the BrowserRouter-under-file:// gotcha (use HashRouter when window.prismDesktop, or an app:// protocol) that must be resolved before packaging. preload exposes only window.prismDesktop={isDesktop,platform}.
```

## Files touched (4)
- mcp-server/web/electron/README.md   | 54 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/electron/main.cjs    | 64 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/electron/preload.cjs | 14 ++++++++++++++
- 3 files changed, 132 insertions(+)

## Lessons surfaced in commit body
- till talks to the :3100 bridge). R12: UNVERIFIED scaffold -- README documents activation (npm i -D electron electron-builder + scripts) and the BrowserRouter-under-file:// gotcha (use HashRouter when window.prismDesktop, or an app:// protocol) that must be resolved before packaging. preload exposes only window.prismDesktop={isDesktop,platform}.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 158a1ef15625`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._