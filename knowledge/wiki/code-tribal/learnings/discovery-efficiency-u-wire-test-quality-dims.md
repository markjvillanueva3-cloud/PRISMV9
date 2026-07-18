# DISCOVERY-EFFICIENCY/U-WIRE-TEST-QUALITY-DIMS — [MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-WIRE-TEST-QUALITY-DIMS: wire scanQuality into the standing stub-sweep (close my own R15 dead-code gap) + doc

**Commit:** `edc0802597e8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T17:03:51-05:00
**Tags:** discovery-efficiency, u-wire-test-quality-dims, auto-distilled

## Subject
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-WIRE-TEST-QUALITY-DIMS: wire scanQuality into the standing stub-sweep (close my own R15 dead-code gap) + doc

## Body
```
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-WIRE-TEST-QUALITY-DIMS: wire scanQuality into the standing stub-sweep (close my own R15 dead-code gap) + doc

Workflow discovery sweep found U-TEST-QUALITY-AUDIT's scanQuality/skipped/focused/assertion-free had
ZERO production callers (on-demand --quality CLI only) = dead code = R15 violation I committed. Fix:
stub-sweep-full.mjs run() calls scanQuality(mcp-server/src) + additive testQuality section; reuses
scanQuality wholesale (anti-sprawl). realStubs/byPattern UNCHANGED (baseline 16, 24 tests green);
+2 fixture tests, 26/26. Live: sweep reports skipped=5. Wiki follow-up added.
```

## Files touched (4)
- knowledge/wiki/architecture/unwired-ranker-consumer-fanin.md |  12 +++++
- scripts/stub-sweep-full.mjs                                  | 301 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/stub-sweep-full.test.mjs                             |  28 +++++++++++
- 3 files changed, 341 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show edc0802597e8`
- Milestone envelope: `mcp-server/data/milestones/DISCOVERY-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._