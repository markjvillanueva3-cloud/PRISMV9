# FORK-STORM-CONSOLIDATION/U-READ-BUNDLE-ABSORB — [MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-READ-BUNDLE-ABSORB (slot:tango): fold 5 loose Read advisories into read-bundle

**Commit:** `db6fc46a3211` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T21:30:59-05:00
**Tags:** fork-storm-consolidation, u-read-bundle-absorb, auto-distilled

## Subject
[MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-READ-BUNDLE-ABSORB (slot:tango): fold 5 loose Read advisories into read-bundle

## Body
```
[MAIN-FORCE] [FORK-STORM-CONSOLIDATION]/U-READ-BUNDLE-ABSORB (slot:tango): fold 5 loose Read advisories into read-bundle

Read fired read-bundle PLUS a separate 5-hook Read advisory block (5 extra
bash.exe spawns/Read). Folded into read-bundle.mjs (in-process pool): Read-specific
spawns ~7 -> 1. big-data-read-enforce can deny; runBundle aggregates continue:false/
decision:deny (hook-runner.mjs:183-231, same as the bundled file-read-cache hard-
deny), so its gate is preserved. Verified node --check + Read payload continue:true
+ both settings.json valid/block-removed (idempotent --dry/--revert patcher).
Completes #10 with U-GREP-GLOB-BUNDLE + india bash-bundle: ~5/Read+4/Grep+4/Glob+
6/Bash fewer spawns fleet-wide, draining the fork-storm.
```

## Files touched (3)
- .claude/hooks/bundles/read-bundle.mjs                 | 11 +++++++++++
- scripts/wire-read-advisories-into-bundle-settings.mjs | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 71 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show db6fc46a3211`
- Milestone envelope: `mcp-server/data/milestones/FORK-STORM-CONSOLIDATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._