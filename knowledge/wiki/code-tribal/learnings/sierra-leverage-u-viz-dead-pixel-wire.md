# SIERRA-LEVERAGE/U-VIZ-DEAD-PIXEL-WIRE — [MAIN] [SIERRA-LEVERAGE]/U-VIZ-DEAD-PIXEL-WIRE (slot:sierra): wire dead-edge integrity sweep into regen + surface 15.7K-dead-edge finding

**Commit:** `9560b33374dd` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T20:43:39-05:00
**Tags:** sierra-leverage, u-viz-dead-pixel-wire, auto-distilled

## Subject
[MAIN] [SIERRA-LEVERAGE]/U-VIZ-DEAD-PIXEL-WIRE (slot:sierra): wire dead-edge integrity sweep into regen + surface 15.7K-dead-edge finding

## Body
```
[MAIN] [SIERRA-LEVERAGE]/U-VIZ-DEAD-PIXEL-WIRE (slot:sierra): wire dead-edge integrity sweep into regen + surface 15.7K-dead-edge finding

The dead-pixel sweep (scripts/system-viz-dead-pixel-sweep.mjs, OOM-safe via
readGraphStreaming) existed but was an unwired manual CLI nobody ran → the graph's
integrity regression was invisible. Wired it as an advisory post-merge regen stage
(non-fatal, matches the executive-briefing/wiki-debt pattern) so it refreshes
state/shared/system-viz-dead-pixels-<date>.{md,json} every regen.

VERIFIED FINDING (ran the sweep on the live 546MB graph): 15,671 dead edges
(1.47%) → 50 orphan targets. Root cause = id-scheme mismatch in a few producers:
10,291 edges target engine.<PascalName> (e.g. engine.AIResourceLearningEngine
x2302 from pdf-extract/college-course) and 2,944 target dispatcher.<name> (e.g.
dispatcher.prism_calc x984 from ghost.unwired) — but canonical node ids are
eng.<domain>.<name> and disp.* (per reference_sierra_dispatcher_id_ssot). The
per-producer target-id fix is the follow-up the now-visible report enables.
Sweep verified standalone; advisory spawnSync exercised on next regen.
```

## Files touched (3)
- scripts/regen-viz.mjs                             |  11 ++++++++++
- state/shared/system-viz-dead-pixels-2026-05-31.md | 149 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 160 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9560b33374dd`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-LEVERAGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._