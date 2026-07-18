# SIERRA-BACKEND/U-FE-SCHED-MACHINES-PARAM-FIX — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-SCHED-MACHINES-PARAM-FIX (slot:sierra): /machines -> machine_all_status (3-of-3 arm C catch)

**Commit:** `2520f8277f32` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T09:27:27-05:00
**Tags:** sierra-backend, u-fe-sched-machines-param-fix, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-SCHED-MACHINES-PARAM-FIX (slot:sierra): /machines -> machine_all_status (3-of-3 arm C catch)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-SCHED-MACHINES-PARAM-FIX (slot:sierra): /machines -> machine_all_status (3-of-3 arm C catch)

Follow-up to U-FE-SCHED-EXPORT-ACTION-FIX (93c3d40ddb). The 3-of-3 scrutiny arm-C analyst caught a
real P1 the existence-only checks (arms A/B) missed: I rerouted /schedule/machines to
prism_machine_live:`machine_live_status`, but that action's schema REQUIRES machine_id:min(1) -> calling
it with {} (the no-body overview endpoint) fails param validation -> dispatcherError -> HTTP 200+{error}
== the exact silent-failure class this campaign fixes. The recording-stub route test could not catch it
(it does not run the real Zod schema) -- an R9 lesson: a stub test verifies the action NAME, not its
PARAM contract.

Fix: reroute to `machine_all_status` -- the ALL-machines overview, schema { response_level? }.passthrough()
so {} validates (verified machineLiveActionSchemas.ts:79 + response_level:optional at :28). Correct
semantic for "machine status overview" anyway. Verified: schedule.ts 0 P0; test updated + 5/5 green; tsc
clean. Total P0 unchanged at 8 (admin 6 + cost 2).
```

## Files touched (3)
- mcp-server/src/__tests__/schedule-export-route-contract.test.ts |  7 +++++--
- mcp-server/src/routes/schedule.ts                               | 11 +++++++----
- 2 files changed, 12 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- lesson: a stub test verifies the action NAME, not its

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2520f8277f32`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._