# SIERRA-BACKEND/U-FE-ROUTE-MOUNT — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-MOUNT (slot:sierra): mount 9 orphaned frontend-facing routers (+romeo shopLive folded)

**Commit:** `e195a2b42548` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T10:45:53-05:00
**Tags:** sierra-backend, u-fe-route-mount, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-MOUNT (slot:sierra): mount 9 orphaned frontend-facing routers (+romeo shopLive folded)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-MOUNT (slot:sierra): mount 9 orphaned frontend-facing routers (+romeo shopLive folded)

9 route files (cncOps, diagnosis, mechanical, milling, thermal, vibration,
settings, print, specialty) had real handlers + registered dispatchers but were
NEVER mounted in routes/index.ts -> the web SPA 404'd on /api/v1/{cnc-ops,
diagnosis,mechanical,milling,thermal,vibration,settings,print,grinding,forming,
welding}. Mounted all 9 (specialty BARE at /api/v1 -> /grinding + /forming/* +
/welding/*, matching the SPA bases). Every downstream dispatcher verified
registered in src/index.ts (prism_cnc_ops/diagnosis/mechanical/fluid_thermal/
vibration_physics/forming/grinding/welding + prism_calc/cam/knowledge +
machineTypeClassifierEngine) -- no phantom routes.

VALIDATE: romeo's audit-frontend-backend-contract.mjs now reports all 8 v1 bases
COVERED (all were gaps at HEAD); tsc exit 0; new 14-test runtime+wiring guard
(fe-route-mount.test.ts) green; 2-arm scrutiny PASS 0 P0/P1.

Complementary split with romeo: romeo owns the route-contract AUDIT (static
prefix-gap detection); sierra fixes the mounts + ships the runtime regression
guard. Both serve the operator backend->frontend goal.

Co-attribution: this index.ts also carries slot:romeo's shopLive mount
(/api/shop/* -- fixes the SPA getShopFloorSnapshot/getShopJobs 404), which was
uncommitted in the shared working tree; folded in here to avoid a split commit.
romeo: your shopLive change is committed -- no need to re-commit index.ts.
```

## Files touched (3)
- mcp-server/src/__tests__/fe-route-mount.test.ts | 177 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/index.ts                  |  40 ++++++++++++++-
- 2 files changed, 216 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e195a2b42548`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._