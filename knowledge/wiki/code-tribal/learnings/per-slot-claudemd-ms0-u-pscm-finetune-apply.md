# PER-SLOT-CLAUDEMD-MS0/U-PSCM-FINETUNE-APPLY — [MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-FINETUNE-APPLY (slot:alpha): guarded apply tool for Phase-C galaxy CLAUDE.md draft staging

**Commit:** `54764ade24d8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T16:47:42-05:00
**Tags:** per-slot-claudemd-ms0, u-pscm-finetune-apply, auto-distilled

## Subject
[MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-FINETUNE-APPLY (slot:alpha): guarded apply tool for Phase-C galaxy CLAUDE.md draft staging

## Body
```
[MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-FINETUNE-APPLY (slot:alpha): guarded apply tool for Phase-C galaxy CLAUDE.md draft staging

Phase C apply mechanism. The draft+verify Workflow stages each galaxy's rewritten
CLAUDE.md to state/shared/slot-claude-md-drafts/<g>.md; this tool applies the
verified drafts onto the live mcp-server/src/engines/<g>/CLAUDE.md.

 - SAFETY GATES (gateDraft, tested 6/6) before overwriting a live doctrine file:
   >=600B (not a truncated/error dump), carries the §0 universal-core pointer to
   H:/prism/CLAUDE.md (refuse a draft that dropped the safety section), has a '## '
   heading. A failing draft is SKIPPED + reported, never silently applied.
 - DRY-RUN by default; --apply writes; --galaxies a,b,c limits the subset. git tracks
   the live files so every apply is revertible (no separate backup).
 - Windows-safe entry guard (endsWith).
```

## Files touched (3)
- scripts/apply-galaxy-claudemd-drafts.mjs      | 103 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/apply-galaxy-claudemd-drafts.test.mjs |  50 ++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 153 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 54764ade24d8`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-CLAUDEMD-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._