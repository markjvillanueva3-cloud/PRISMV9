# PSN-SYNERGY-COLLECT-MS3/U-OUTEDGE-HONESTY-FIX2 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-OUTEDGE-HONESTY-FIX2 (slot:alpha): drop graph-membership footer + self-class-name from out-edge tally (3-of-3 re-review follow-ups)

**Commit:** `f3de8173937f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T07:39:49-05:00
**Tags:** psn-synergy-collect-ms3, u-outedge-honesty-fix2, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-OUTEDGE-HONESTY-FIX2 (slot:alpha): drop graph-membership footer + self-class-name from out-edge tally (3-of-3 re-review follow-ups)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-OUTEDGE-HONESTY-FIX2 (slot:alpha): drop graph-membership footer + self-class-name from out-edge tally (3-of-3 re-review follow-ups)

Implements the two follow-ups arms A+B flagged on d71daf0ab8 (PASSED, deferred to fast-follow).
Both are purely SUBTRACTIVE honesty tightening — can only reduce counts toward truth, never fabricate.

1. dropGeneratorPointers: strips `Live graph: …system-graph.json` footer lines stamped into every
   auto-gen formula/algorithm stub — an INBOUND membership marker (system-viz indexes the formula),
   not an outbound reference. It saturated formulas→system_viz at file-count (uniform-template
   artifact, the same R12 class that FAILed commit 1). Now formulas→system_viz drops out (honest:
   formula docs don't conceptually reference system-viz — an honest gap > a vanity edge).
2. dropSelfName: removes each file's own basename token before matching, so nn_gnn (*Engine.ts)
   doesn't count its own class declaration as an engines edge. nn_gnn→engines 82→67.

Both opts default OFF → MS2 obsidian/wiki callers byte-unchanged (corrects arm-B's wording catch).
Deltas: formulas→system_viz 5000→0, nn_gnn→engines 82→67, algorithms→engines 21→18. Snapshot
regenerated; ranker E2E green (p0_critical 10). Tests 21/21 (+2 honest-edge locks). R7+R12.
```

## Files touched (5)
- scripts/psn-synergy-collect.mjs        | 28 +++++++++++++++++++++++++---
- scripts/psn-synergy-collect.test.mjs   | 27 +++++++++++++++++++++++++++
- state/shared/psn-synergy-snapshot.json | 36 ++++++++++++++++++------------------
- state/shared/psn-synergy-snapshot.md   | 18 +++++++++---------
- 4 files changed, 79 insertions(+), 30 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f3de8173937f`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGY-COLLECT-MS3.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._