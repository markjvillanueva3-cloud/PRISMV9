# HERMES-CAPABILITY-EXPANSION/U-ZULU-CAP-C2-HERMETIC — [MAIN-FORCE] [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C2-HERMETIC (slot:zulu): fix scrutiny arm-B P1 -- C2 round-trip test was non-hermetic (wrote orphan U-RT records to the LIVE zulu-task-continuity.json store, accreting unbounded)

**Commit:** `295d8ffde446` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T11:05:47-05:00
**Tags:** hermes-capability-expansion, u-zulu-cap-c2-hermetic, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C2-HERMETIC (slot:zulu): fix scrutiny arm-B P1 -- C2 round-trip test was non-hermetic (wrote orphan U-RT records to the LIVE zulu-task-continuity.json store, accreting unbounded)

## Body
```
[MAIN-FORCE] [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C2-HERMETIC (slot:zulu): fix scrutiny arm-B P1 -- C2 round-trip test was non-hermetic (wrote orphan U-RT records to the LIVE zulu-task-continuity.json store, accreting unbounded)

Root: the dispatcher round-trip routes through the zuluTaskContinuityEngine SINGLETON, which binds to DEFAULT_STORE_PATH (not the unit tests' __forTests temp). Fix: afterEach clears the written unit via the singleton (Arm-B-endorsed); renamed the stale [WIRING-PENDING] describe + corrected the 'EXPECTED TO FAIL' comment (now wired). Cleaned the 4 pre-existing orphan records. VERIFIED hermetic: store stays 0 records across a full run; 93/93 still pass.
```

## Files touched (2)
- mcp-server/src/__tests__/ZuluTaskContinuityEngine.test.ts | 19 ++++++++++++++-----
- 1 file changed, 14 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till pass.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 295d8ffde446`
- Milestone envelope: `mcp-server/data/milestones/HERMES-CAPABILITY-EXPANSION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._