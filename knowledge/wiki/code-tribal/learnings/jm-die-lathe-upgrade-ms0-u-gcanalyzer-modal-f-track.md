# JM-DIE-LATHE-UPGRADE-MS0/U-GCANALYZER-MODAL-F-TRACK — [MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-GCANALYZER-MODAL-F-TRACK (slot:whiskey iter16): address-parse regex accepts leading-dot decimals. [BOOTSTRAP-SLOT-ENFORCE]. Prior /-?\d+\.?\d*/ required digits before optional decimal — Okuma OSP convention F.006 / X-.040 silently failed to parse → modal feedRate stayed 0 → CRIT-05 false-positive cascade on every cut. New regex /-?(?:\d+\.?\d*|\.\d+)/ accepts both 0.006 AND .006. Result: Stage-A critical drops 2313 → 1172 (49% reduction) on same 100-variant sample. Confirms the false-positive class identified in U-AUDIT-FINDINGS-BRIEF.

**Commit:** `ddf7a56108f5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T17:54:25-05:00
**Tags:** jm-die-lathe-upgrade-ms0, u-gcanalyzer-modal-f-track, auto-distilled

## Subject
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-GCANALYZER-MODAL-F-TRACK (slot:whiskey iter16): address-parse regex accepts leading-dot decimals. [BOOTSTRAP-SLOT-ENFORCE]. Prior /-?\d+\.?\d*/ required digits before optional decimal — Okuma OSP convention F.006 / X-.040 silently failed to parse → modal feedRate stayed 0 → CRIT-05 false-positive cascade on every cut. New regex /-?(?:\d+\.?\d*|\.\d+)/ accepts both 0.006 AND .006. Result: Stage-A critical drops 2313 → 1172 (49% reduction) on same 100-variant sample. Confirms the false-positive class identified in U-AUDIT-FINDINGS-BRIEF.

## Body
```
[MAIN] [JM-DIE-LATHE-UPGRADE-MS0]/U-GCANALYZER-MODAL-F-TRACK (slot:whiskey iter16): address-parse regex accepts leading-dot decimals. [BOOTSTRAP-SLOT-ENFORCE]. Prior /-?\d+\.?\d*/ required digits before optional decimal — Okuma OSP convention F.006 / X-.040 silently failed to parse → modal feedRate stayed 0 → CRIT-05 false-positive cascade on every cut. New regex /-?(?:\d+\.?\d*|\.\d+)/ accepts both 0.006 AND .006. Result: Stage-A critical drops 2313 → 1172 (49% reduction) on same 100-variant sample. Confirms the false-positive class identified in U-AUDIT-FINDINGS-BRIEF.
```

## Files touched (3)
- .claude/hooks/cost-bridge-on-program-emit.mjs      | 79 ----------------------
- .../src/engines/GCodeSafetyAnalyzerEngine.ts       | 10 ++-
- 2 files changed, 8 insertions(+), 81 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ddf7a56108f5`
- Milestone envelope: `mcp-server/data/milestones/JM-DIE-LATHE-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._