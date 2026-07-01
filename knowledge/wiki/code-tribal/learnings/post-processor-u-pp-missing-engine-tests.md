# POST-PROCESSOR/U-PP-MISSING-ENGINE-TESTS — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-MISSING-ENGINE-TESTS (slot:echo): companion test for GCodeOptimizationEngine (2 of ~38)

**Commit:** `426ace969ffe` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T18:12:19-05:00
**Tags:** post-processor, u-pp-missing-engine-tests, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-MISSING-ENGINE-TESTS (slot:echo): companion test for GCodeOptimizationEngine (2 of ~38)

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-MISSING-ENGINE-TESTS (slot:echo): companion test for GCodeOptimizationEngine (2 of ~38)

GCodeOptimizationEngine (pure G-code analyze/optimize/compare) had no companion test.
Add 16 reference-value / algebraic-invariant tests, hand-computed from source + run-reconciled.

Coverage: analyze (exact 2-move parse->classify->distance 50/10->time 4; arc+toolchange+
sorted unique_tools; comment/blank split; empty-input zeroed/finite) + rapid-Z-descent SAFETY
warning boundary (>50mm warns, =50mm does not) + optimize (stationary removal, blank-collapse,
honest 10%-flat-estimate characterization, never-negative time) + compare (faster detect +
recommendation) + feed-500 fallback + 2 KNOWN-LIMITATION characterization locks.

Per-file 2-arm scrutiny: code-analyzer PASS (independently recomputed every value); test-review-
agent FAIL on first pass was 2 VERIFIED-FALSE findings -- it misread "A\n\n\nB".split=2 blanks
(claimed 3) and miscounted 16 tests as 9 -- refuted with evidence + green run, then re-verified
PASS. 16/16 green.

Scrutiny surfaced a real P2 classifier bug (arc /G0?[23]/ false-positives G28/G30 home moves ->
miscounts arcs + inflates feed distance x1.5; rapid /G0[0 ]/ misses compact G0X10) -- locked via
2 labeled characterization tests + logged follow-up U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN (needs
engine-change scrutiny), NOT inlined.

File: mcp-server/src/__tests__/GCodeOptimizationEngine.test.ts
```

## Files touched (3)
- mcp-server/src/__tests__/GCodeOptimizationEngine.test.ts | 179 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md             |  16 ++++++++---
- 2 files changed, 192 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 426ace969ffe`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._