# POST-PROCESSOR/U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN (slot:echo): fix arc classifier miscounting G20/G21/G28/G30 as arcs

**Commit:** `39e8324c38a3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T18:25:02-05:00
**Tags:** post-processor, u-pp-gcode-opt-classifier-tighten, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN (slot:echo): fix arc classifier miscounting G20/G21/G28/G30 as arcs

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN (slot:echo): fix arc classifier miscounting G20/G21/G28/G30 as arcs

GCodeOptimizationEngine.analyze() arc matcher /G0?[23]/ false-matched the bare 2/3
in G20/G21 (unit codes), G28/G29 (return-to-ref), and G30-G39 (home/coordinate),
miscounting them as arc moves AND inflating total_feed_distance by the x1.5 arc
heuristic -> a too-high cycle-time estimate on essentially every real program (which
carries G20/G21 in the header and G28 home moves).

Fix: add a negative lookahead -> /G0?[23](?![0-9])/. Strictly removes false-positives;
real arcs G2/G02/G3/G03 (spaced, compact G2X10, and decimal G02.1) still match. G28/G30
now fall through to unclassified (no move type / no distance) -- conservative + correct
vs the old x1.5 feed inflation. A G28 home is not a feed arc.

Both 2-arm scrutiny PASS (reviewer + code-analyzer), 0 P0/P1: traced the full G20-G39 +
3-digit reject table + the G2/G02/G3/G03/G02.1 accept set; proved no coordinate word
(X2/Y3/T3/M3/S2300) can false-match (literal G anchor); ran 98/98 relevant tests green.
Quantified: a G21/G28/G02 program's estimated time 26s -> 16s (38% overestimate removed).

Blast radius clean: calcDispatcher gcode_analyze/optimize/compare forward-only; no consumer
test asserts arc_moves/feed_distance on a G2x program; route-contract test 16/16 green.

Tests flipped from bug-lock to fix-assert (G28/G30/G20/G21 -> arc 0) + real-arc regression
guards (G02/G2/G3 -> arc 1). 16/16 green. Companion-test unit shipped 426ace969f.

Files: mcp-server/src/engines/GCodeOptimizationEngine.ts (+ its test)
```

## Files touched (4)
- mcp-server/src/__tests__/GCodeOptimizationEngine.test.ts | 17 +++++++++++------
- mcp-server/src/engines/GCodeOptimizationEngine.ts        |  6 +++++-
- state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md             | 12 +++++++-----
- 3 files changed, 23 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- till match. G28/G30

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 39e8324c38a3`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._