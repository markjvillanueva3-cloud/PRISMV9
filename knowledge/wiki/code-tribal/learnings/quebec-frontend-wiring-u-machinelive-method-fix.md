# QUEBEC-FRONTEND-WIRING/U-MACHINELIVE-METHOD-FIX — [MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-MACHINELIVE-METHOD-FIX (slot:quebec): fix machineLive client GET->POST method mismatch (2 dead wires)

**Commit:** `42f2ac7a5854` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T09:22:36-05:00
**Tags:** quebec-frontend-wiring, u-machinelive-method-fix, auto-distilled

## Subject
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-MACHINELIVE-METHOD-FIX (slot:quebec): fix machineLive client GET->POST method mismatch (2 dead wires)

## Body
```
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-MACHINELIVE-METHOD-FIX (slot:quebec): fix machineLive client GET->POST method mismatch (2 dead wires)

machineLiveApi.listMachines() + getMaintenanceAlerts() called /list + /maintenance as GET, but the backend routes are POST (createMachineLiveRouter -> machine_list / maint_status). A method mismatch (route exists, wrong verb -> 404), NOT a missing route. Reconciled the client to POST {} to match the live backend (pure frontend fix, transparent to consuming pages); removed the now-unused get() helper.

Verified by the wiring auditor: machineLive gaps 2 -> 0 (dead 164 -> 162); web tsc clean. A peer (DESKTOP--68368) held a WorkClaim on this file -- verified the working-tree diff was ONLY mine before committing.

FINDING: some "no-route" gaps are METHOD MISMATCHES (the route exists under a different verb) = frontend-fixable client bugs. An auditor enhancement to surface that bucket is the high-value follow-up (likely converts more no-route -> frontend-fixable).
```

## Files touched (2)
- mcp-server/web/src/api/machineLive.ts | 19 +++++--------------
- 1 file changed, 5 insertions(+), 14 deletions(-)

## Lessons surfaced in commit body
- wrong verb -> 404), NOT a missing route. Reconciled the client to POST {} to match the live backend (pure frontend fix, transparent to consuming pages); removed the now-unused get() helper.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 42f2ac7a5854`
- Milestone envelope: `mcp-server/data/milestones/QUEBEC-FRONTEND-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._