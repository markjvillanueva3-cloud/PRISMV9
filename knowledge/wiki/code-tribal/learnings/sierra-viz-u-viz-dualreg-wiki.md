# SIERRA-VIZ/U-VIZ-DUALREG-WIKI — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-DUALREG-WIKI (slot:sierra): wiki lesson for the FAST[]+merge-splice silent-discard bug class + the auditor

**Commit:** `f2eedf657179` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:39:38-05:00
**Tags:** sierra-viz, u-viz-dualreg-wiki, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-DUALREG-WIKI (slot:sierra): wiki lesson for the FAST[]+merge-splice silent-discard bug class + the auditor

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-DUALREG-WIKI (slot:sierra): wiki lesson for the FAST[]+merge-splice silent-discard bug class + the auditor

Closes the bug-finding->wiki learning loop (CLAUDE.md s4) for U-VIZ-DUALREG-AUDIT + U-VIZ-ORPHAN-WIRE.
knowledge/wiki/architecture/viz-dual-registration-audit.md documents the 3 failure modes (silent
discard P1, regen crash P0, stale-fold P2 orphan), the auditor's report shape, and the
corruption-proof fix pattern (class-name->node-id resolver, never blind-splice). Query before
re-deriving. Cross-refs regen-viz-merge-guard + the 2026-06-22 build memory.
```

## Files touched (2)
- knowledge/wiki/architecture/viz-dual-registration-audit.md | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 71 insertions(+)

## Lessons surfaced in commit body
- lesson for the FAST[]+merge-splice silent-discard bug class + the auditor

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f2eedf657179`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._