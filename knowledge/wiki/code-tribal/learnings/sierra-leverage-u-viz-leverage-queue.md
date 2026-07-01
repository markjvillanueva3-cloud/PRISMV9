# SIERRA-LEVERAGE/U-VIZ-LEVERAGE-QUEUE — [MAIN] [SIERRA-LEVERAGE]/U-VIZ-LEVERAGE-QUEUE (slot:sierra): leverage-ranked unwired-engine-domain queue

**Commit:** `f522b67cd917` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T13:32:48-05:00
**Tags:** sierra-leverage, u-viz-leverage-queue, auto-distilled

## Subject
[MAIN] [SIERRA-LEVERAGE]/U-VIZ-LEVERAGE-QUEUE (slot:sierra): leverage-ranked unwired-engine-domain queue

## Body
```
[MAIN] [SIERRA-LEVERAGE]/U-VIZ-LEVERAGE-QUEUE (slot:sierra): leverage-ranked unwired-engine-domain queue

Ranks 118 unwired engines (13 domains) by graph-computed leverage from
architecture-graph.json (OOM-safe) so the fleet wires highest-impact-per-wire
FIRST instead of treating the backlog as flat. Pure core + 10 node:test + CLI
+ atomic-write LEVERAGE-WIRING-QUEUE.{json,md}; feeds /pick-unit + dispatcher-wirer.

Arm-B scrutiny FAIL fixed pre-commit: graph emits literal leverageScore:0 for
the 3 dispatchersGain:0 catchall domains (MiscDomains=69 = 58% of all debt) —
routed graph-0 to the derived fallback so the biggest bucket ranks #1 (138) +
flagged needsDispatcherInference, not buried last. Wired into GSD §5b + PATHS.md.
```

## Files touched (8)
- mcp-server/src/engines/system-viz/GSD.md           |   7 +++
- mcp-server/src/engines/system-viz/PATHS.md         |   2 +
- scripts/leverage-ranked-wiring-queue.mjs           |  75 ++++++++++++++++++++++++++++++
- scripts/lib/leverage-wiring-queue.mjs              |  81 +++++++++++++++++++++++++++++++++
- scripts/lib/leverage-wiring-queue.test.mjs         | 117 +++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/system-viz/LEVERAGE-WIRING-QUEUE.json | 196 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/system-viz/LEVERAGE-WIRING-QUEUE.md   |  21 +++++++++
- 7 files changed, 499 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f522b67cd917`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-LEVERAGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._