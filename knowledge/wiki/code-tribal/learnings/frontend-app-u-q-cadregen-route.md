# FRONTEND-APP/U-Q-CADREGEN-ROUTE — [MAIN-FORCE] [FRONTEND-APP]/U-Q-CADREGEN-ROUTE (slot:quebec): route CADRegenerationDashboardPage with honest sample-data notice (real wire = delta follow-up)

**Commit:** `2a11f1c642d4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:46:08-05:00
**Tags:** frontend-app, u-q-cadregen-route, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-CADREGEN-ROUTE (slot:quebec): route CADRegenerationDashboardPage with honest sample-data notice (real wire = delta follow-up)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-CADREGEN-ROUTE (slot:quebec): route CADRegenerationDashboardPage with honest sample-data notice (real wire = delta follow-up)

CADRegenerationDashboardPage (CAD regen test-progress dashboard toward 100% pass rate) is design-system-
conformant (Tailwind dark theme) but renders getMockData() ('// Mock Data (replace with API call)').
A REAL backend exists -- CADRegenerationTestEngine + prism_cad actions cad_regen_test/batch/compare --
but the page needs an AGGREGATED dashboard shape (overall + by-complexity + by-part-type + failure-cats)
that no single action returns; the aggregation is delta's CAD domain to get right (R12 correctness).

Consistent with the MillTurn/Swiss treatment: added a design-system amber sample-data notice (R12 -- not
shown as live) + routed cad-regeneration. Reachable as a UI preview; real wire to cad_regen_batch
aggregation flagged as a delta follow-up. web tsc + vite build GREEN. 6 of 8 orphans now reachable.
```

## Files touched (3)
- mcp-server/web/src/App.tsx                                | 2 ++
- mcp-server/web/src/pages/CADRegenerationDashboardPage.tsx | 6 ++++++
- 2 files changed, 8 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2a11f1c642d4`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._