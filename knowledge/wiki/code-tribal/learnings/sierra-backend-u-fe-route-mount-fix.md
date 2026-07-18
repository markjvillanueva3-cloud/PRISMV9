# SIERRA-BACKEND/U-FE-ROUTE-MOUNT-FIX — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-MOUNT-FIX (slot:sierra): defer specialty router (calls non-existent dispatcher actions)

**Commit:** `d9b533d27b49` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T11:03:10-05:00
**Tags:** sierra-backend, u-fe-route-mount-fix, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-MOUNT-FIX (slot:sierra): defer specialty router (calls non-existent dispatcher actions)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-MOUNT-FIX (slot:sierra): defer specialty router (calls non-existent dispatcher actions)

Follow-up to e195a2b425. R16/R12 self-catch: endpoint-level verification found specialty.ts is a
NEVER-TESTED router -- 6 of its 7 routes call dispatcher action names that DO NOT EXIST
(grinding_calculate, sheet_metal_calculate, casting_calculate, molding_calculate, joint_design,
weld_inspect; only welding_calculate is valid). Mounting it (e195a2b425) turned a clean 404 into a
200+{error} body the SPA if(!res.ok) cannot detect -- a silent-failure footgun + R13 lapse (verified
the dispatcher REGISTERED, not that its ACTIONS resolve).

Reverted specialty mount + import + test assertions. The 8 verified routers (cnc-ops, diagnosis,
mechanical, milling, thermal, vibration, settings, print) stay mounted. 13-test guard green, tsc clean.
specialty deferred to U-FE-SPECIALTY-CONTRACT (SPA<->action reconciliation; spec in the sierra-backend handoff).
```

## Files touched (3)
- mcp-server/src/__tests__/fe-route-mount.test.ts | 19 +++++++++----------
- mcp-server/src/routes/index.ts                  | 33 +++++++++++++++++++--------------
- 2 files changed, 28 insertions(+), 24 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d9b533d27b49`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._