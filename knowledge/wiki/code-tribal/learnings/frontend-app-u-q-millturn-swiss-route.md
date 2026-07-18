# FRONTEND-APP/U-Q-MILLTURN-SWISS-ROUTE — [MAIN-FORCE] [FRONTEND-APP]/U-Q-MILLTURN-SWISS-ROUTE (slot:quebec): route MillTurnPage + SwissPage with an HONEST sample-data notice (no fake telemetry shown as live)

**Commit:** `e46e56fab747` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:42:45-05:00
**Tags:** frontend-app, u-q-millturn-swiss-route, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-MILLTURN-SWISS-ROUTE (slot:quebec): route MillTurnPage + SwissPage with an HONEST sample-data notice (no fake telemetry shown as live)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-MILLTURN-SWISS-ROUTE (slot:quebec): route MillTurnPage + SwissPage with an HONEST sample-data notice (no fake telemetry shown as live)

MillTurnPage + SwissPage are old hardcoded-data prototypes (fake literal channel/bar/guide-bushing
state via useState, setters never called, old light inline styling, no backend). The operator wants
them routed for shop-floor UX testing, but routing them as-is would show FABRICATED machine telemetry
as if live -- the exact R12 fake-data anti-pattern removed earlier this session.

R12-honest middle path (mirrors api/dashboard.ts DEMO posture): added a clear 'Sample data -- not yet
connected to live machine telemetry' notice to each, then routed them (mill-turn, swiss). They become
reachable as UI PREVIEWS (operators can validate layout/UX) without misrepresenting sample data as real.
Wiring real Swiss/mill-turn telemetry is a separate cross-domain backend project (whiskey/foxtrot machine-
live + specialized channel/guide-bushing/bar-feeder signals). Old light styling -> Claude Design restyle.

Verified: web tsc GREEN; vite build GREEN; no existing tests broken (none for these pages). 5 of 8
orphans now reachable (LatheERP + 2 studios + mill-turn + swiss).
```

## Files touched (4)
- mcp-server/web/src/App.tsx                | 4 ++++
- mcp-server/web/src/pages/MillTurnPage.tsx | 4 ++++
- mcp-server/web/src/pages/SwissPage.tsx    | 4 ++++
- 3 files changed, 12 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e46e56fab747`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._