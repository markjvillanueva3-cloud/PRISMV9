# REACTIVE-CHAINS/U-REOPT-COLLISION-FIX — [MAIN-FORCE] [REACTIVE-CHAINS]/U-REOPT-COLLISION-FIX (slot:bravo): break the reoptimize_schedule action-name collision (pre-activation bug)

**Commit:** `846003383f35` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T12:21:17-05:00
**Tags:** reactive-chains, u-reopt-collision-fix, auto-distilled

## Subject
[MAIN-FORCE] [REACTIVE-CHAINS]/U-REOPT-COLLISION-FIX (slot:bravo): break the reoptimize_schedule action-name collision (pre-activation bug)

## Body
```
[MAIN-FORCE] [REACTIVE-CHAINS]/U-REOPT-COLLISION-FIX (slot:bravo): break the reoptimize_schedule action-name collision (pre-activation bug)

reactiveChainBootstrap.ts:459 (Chain 11 capacity_to_scheduling) and cycleSchedulingBridge.ts:316 BOTH registered an action literally named 'reoptimize_schedule' on the SAME global EventBus singleton. EventBus.registerAction is this.actionRegistry.set(name,handler) (EventBus.ts:1230) -- silent last-writer-wins, no dup-check -- so whichever module loaded second clobbered the other's handler, and the loser chain's reoptimize step resolved to the WRONG handler/event (bootstrap emits SCHEDULE_OPTIMIZED, bridge emits schedule.updated). Subsystem gated default-OFF (PRISM_REACTIVE_CHAINS_ENABLE) so it never bit live, but it is a real pre-activation defect (orchestrator brief #3a). FIX: rename the bootstrap's action -> 'reoptimize_schedule_capacity' (handler :459 + chain-def step :617 + error log :489); the bridge keeps 'reoptimize_schedule' (its INTEG-MS3 test unchanged). Chose to rename the bootstrap (no name-assertion test) over the bridge (has one) -- minimal blast radius.

R9: +3 REAL behavioral tests (publishTyped -> executeChain -> assert WHICH handler ran / its computed payload, NOT presence): same-name->only-survivor-runs; distinct-names->both-run; LIVE CAPACITY_UPDATED@92% -> capacity_to_scheduling runs the RENAMED handler -> emits SCHEDULE_OPTIMIZED with requested:true/optimization_type:rebalance/machine:VMC-01. 3/3 pass; live debug log shows BOTH chains now run their OWN handlers independently. cycle-scheduling-bridge.test 18/18 (no regression). NOTE: blocker 2 (job_to_invoice consequential auto-fire) is a separate JUDGMENT call, still pending (task #28); 2-arm scrutiny deferred -- 5h session limit imminent, committing to preserve verified work (R12).
```

## Files touched (3)
- mcp-server/src/__tests__/reactive-chains-action-collision.test.ts | 96 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/reactiveChainBootstrap.ts                  | 11 ++++--
- 2 files changed, 104 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- WRONG handler/event (bootstrap emits SCHEDULE_OPTIMIZED, bridge emits schedule.updated). Subsystem gated default-OFF (PRISM_REACTIVE_CHAINS_ENABLE) so it never bit live, but it is a real pre-activation defect (orchestrator brief #3a). FIX: rename the bootstrap's action -> 'reoptimize_schedule_capacity' (handler :459 + chain-def step :617 + error log :489); the bridge keeps 'reoptimize_schedule' (its IN
- NOTE: blocker 2 (job_to_invoice consequential auto-fire) is a separate JUDGMENT call, still pending (task #28); 2-arm scrutiny deferred -- 5h session limit imminent, committing to preserve verified work (R12).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 846003383f35`
- Milestone envelope: `mcp-server/data/milestones/REACTIVE-CHAINS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._