# POST-PROCESSOR/U-PP-LATHE-ROUTER-WIRE — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-WIRE (slot:echo): R15-complete -- master_post_by_machine routes the 5 JM GENOS/Crown/LNC lathes to their own identity

**Commit:** `80137164af03` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T11:33:30-05:00
**Tags:** post-processor, u-pp-lathe-router-wire, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-WIRE (slot:echo): R15-complete -- master_post_by_machine routes the 5 JM GENOS/Crown/LNC lathes to their own identity

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-WIRE (slot:echo): R15-complete -- master_post_by_machine routes the 5 JM GENOS/Crown/LNC lathes to their own identity

Completes the WIRE leg of U-PP-LATHE-JM-FLEET-IDENTITY (bdfdb0a910 built the engine-core
identities). The router's master_post_by_machine entered the Okuma-lathe branch via
model.includes("OKUMA") but resolved latheMachineId to only LB250II-M/LB3000/MULTUS -- so a
GENOS/Crown/LNC model fell to the LB250II-M DEFAULT, re-creating the mislabel at the router
layer. Fixed:
- match condition + resolution now map GENOS L300-M/L200E-M/L400II-E, LNC8, Crown L1060 to
  their jm-fleet-sim-map identities (widened the inline literal to the full 8-member union,
  ordered after LB3000/MULTUS; GENOS L-series by L-number).
- reject error message lists the newly-supported machines.
TEST: MasterPostByMachineExpanded integration +6 (5 routing-decision mirrors + 1 REAL engine
round-trip proving each resolved machineId emits the correct (MACHINE: ...) header, no
LB250II-M mislabel, no Unknown-machine_id warning). 50/50 green. Targeted tsc on my region
(camDispatcher 7060-7115) clean (the 7019 Mitsubishi TS2352 is pre-existing, untouched).
```

## Files touched (3)
- .../__tests__/integration/MasterPostByMachineExpanded.integration.test.ts | 61 ++++++++++++++++++++++++++++++++---
- mcp-server/src/tools/dispatchers/camDispatcher.ts                         | 19 +++++++++--
- 2 files changed, 73 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 80137164af03`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._