# TSC-FIX/U-TSC-MATDB-COUNT — [MAIN] [TSC-FIX]/U-TSC-MATDB-COUNT: bump CANONICAL_MATERIAL_DB count test 13->15 (scrutiny arm-C blocker)

**Commit:** `f24d9a3c0ba9` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T12:28:49-05:00
**Tags:** tsc-fix, u-tsc-matdb-count, auto-distilled

## Subject
[MAIN] [TSC-FIX]/U-TSC-MATDB-COUNT: bump CANONICAL_MATERIAL_DB count test 13->15 (scrutiny arm-C blocker)

## Body
```
[MAIN] [TSC-FIX]/U-TSC-MATDB-COUNT: bump CANONICAL_MATERIAL_DB count test 13->15 (scrutiny arm-C blocker)

3-of-3 on 71756da741: arm A PASS, arm B PASS, arm C FAIL.
Arm C blocker (correct, reproducible): the +2 additive C11000/C26000
entries flipped u-arch3-material-resolution.test.ts:406
'expect(Object.keys(CANONICAL_MATERIAL_DB).length).toBe(13)'
PASS->FAIL (now 15 entries). Verified by arm C against parent
(8 fail) vs committed (9 fail) — a count-coupled assertion that
must move with the data per Karpathy R12.

Fix: bump toBe(13)->toBe(15) + label '13'->'15' + comment citing
the U-TSC-WIRE-EDM-COPPER provenance so the count's meaning is
self-documenting. Verified: the 'has 15 material entries' case now
PASSES. The other 8 pre-existing u-arch3 failures are stale-schema
drift (test references CANONICAL_MATERIAL_DB.steel.kc1_1 — kc1_1
lives on CANONICAL_KIENZLE, not this DB) — NOT caused by this diff,
flagged by arm C for separate orphaned-test triage.
```

## Files touched (2)
- mcp-server/src/__tests__/u-arch3-material-resolution.test.ts | 7 +++++--
- 1 file changed, 5 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f24d9a3c0ba9`
- Milestone envelope: `mcp-server/data/milestones/TSC-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._