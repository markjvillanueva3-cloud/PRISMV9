# FRONTEND-APP/U-Q-STUDIO-ROUTES — [MAIN-FORCE] [FRONTEND-APP]/U-Q-STUDIO-ROUTES (slot:quebec): route the orphan LatheStudioPage + MillStudioPage (studio-surface parity with wire-edm-studio)

**Commit:** `0fb3eff7493a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:39:05-05:00
**Tags:** frontend-app, u-q-studio-routes, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-STUDIO-ROUTES (slot:quebec): route the orphan LatheStudioPage + MillStudioPage (studio-surface parity with wire-edm-studio)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-STUDIO-ROUTES (slot:quebec): route the orphan LatheStudioPage + MillStudioPage (studio-surface parity with wire-edm-studio)

LatheStudioPage + MillStudioPage are FUNCTIONAL context-driven studio wizards (LatheStudioProvider/
useLatheData + MillStudioProvider/useMillData/MILL_STEPS; ErrorBoundary; 520/672 LOC; each self-wraps
its provider) -- NOT hardcoded prototypes. They were orphaned: 'wire-edm-studio' is routed but the
lathe/mill equivalents were not (parity gap). VERIFIED NOT R7 dupes: LatheWizardPage + MillingWizardPage
do NOT use the Studio contexts (distinct surfaces).

Added (matching wire-edm-studio: plain lazy() default-export, open lazyElement route):
lathe-studio + mill-studio routes. Verified: web tsc GREEN; vite build GREEN (19.4s); MillStudioPage
14/14. 3 of 8 orphans now reachable (LatheERPDashboard + 2 studios).
```

## Files touched (2)
- mcp-server/web/src/App.tsx | 4 ++++
- 1 file changed, 4 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0fb3eff7493a`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._