# POST-PROCESSOR/U-PP-LATHE-ROUTER-ERRSTR-PARITY — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-ERRSTR-PARITY (slot:echo): wiring-review P2 -- sync test-helper reject string + assertion with the dispatcher's GENOS/Crown/LNC supported-list

**Commit:** `f5c65b9ea381` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T11:40:16-05:00
**Tags:** post-processor, u-pp-lathe-router-errstr-parity, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-ERRSTR-PARITY (slot:echo): wiring-review P2 -- sync test-helper reject string + assertion with the dispatcher's GENOS/Crown/LNC supported-list

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-ERRSTR-PARITY (slot:echo): wiring-review P2 -- sync test-helper reject string + assertion with the dispatcher's GENOS/Crown/LNC supported-list

The routeByMachine helper's reject error string lagged the dispatcher's (didn't advertise
GENOS/LNC/Crown); the supported-list assertion checked a contiguous substring my dispatcher
edit had split. Synced the helper string + rebaselined the assertion to verify the new JM
fleet machines are advertised (not weakened -- adds a GENOS/LNC/Crown presence check). 51/51.
```

## Files touched (2)
- mcp-server/src/__tests__/integration/MasterPostByMachineExpanded.integration.test.ts | 7 +++++--
- 1 file changed, 5 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f5c65b9ea381`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._