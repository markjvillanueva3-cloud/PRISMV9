# SIERRA-VIZ/U-VIZ-REGEN-LESSON-WIKI — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-REGEN-LESSON-WIKI (slot:sierra): wiki lesson for the 2 fleet-wide regen-pipeline bugs (bug-finding->wiki gate)

**Commit:** `25014e8fc1eb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:58:40-05:00
**Tags:** sierra-viz, u-viz-regen-lesson-wiki, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-REGEN-LESSON-WIKI (slot:sierra): wiki lesson for the 2 fleet-wide regen-pipeline bugs (bug-finding->wiki gate)

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-REGEN-LESSON-WIKI (slot:sierra): wiki lesson for the 2 fleet-wide regen-pipeline bugs (bug-finding->wiki gate)

Companion wiki entry (knowledge/wiki/lessons/) for the 2 fleet-wide fixes shipped this session,
per the bug-finding->wiki gate doctrine ([[feedback_always_update_wiki_on_bug_finding]]):
  1. U-VIZ-DRIFT-GATE-HEAP -- spawn a heavy child (detect-system-viz-drift) with the SAME heap bump
     the parent gives its other children; default heap OOMs on the 862MB graph -> breaks regen
     certification fleet-wide. Generalizable: grep every pipeline spawnSync for a missing heap flag.
  2. U-VIZ-FRESHNESS-INTENTIONAL-ALLOWLIST -- a staleness audit must allowlist intentional
     out-of-band producers (stale-manual) or it cries wolf and masks real orphans.
Plus the meta-lesson: a static both-or-neither dual-reg pass is not full verification -- run the
regen + check the .last-successful-regen.json stamp.
```

## Files touched (2)
- knowledge/wiki/lessons/regen-pipeline-heap-and-freshness-2026-06-22.md | 58 ++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 58 insertions(+)

## Lessons surfaced in commit body
- LESSON-WIKI (slot:sierra): wiki lesson for the 2 fleet-wide regen-pipeline bugs (bug-finding->wiki gate)
- lessons/) for the 2 fleet-wide fixes shipped this session,
- lesson: a static both-or-neither dual-reg pass is not full verification -- run the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 25014e8fc1eb`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._