# TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-MEMORY-COMPACT-NULL-HOLDER-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-MEMORY-COMPACT-NULL-HOLDER-FIX (slot:alpha /goal iter1): regression-test + memory + wiki + gap-fill plan for the silent 0-byte stale-lock crash in scripts/memory-compact.mjs (code-fix absorbed into peer 87b36f5c5e). Pre-fix MEMORY.md 24378B (99.19% of 24576B truncation ceiling); auto-compact returned ok:false reason:threw on every Stop-hook fire; 3 fail-soft layers (try/catch + tryCompact return-null + 12h advisory throttle) erased every signal. Fix: !holder null-guard in acquireLock ageEffective (1 line). Post-fix: live MEMORY.md 12280B (49.97%), 33/33 tests PASS (3 new regression cases — 0-byte lockfile, corrupt-JSON holder, missing-ts holder all steal cleanly). 4-surface doc reflection: code+test (absorbed) + memory ([[reference_memory_compact_null_holder_fix_2026_05_26]]) + wiki ([[memory-compact-null-holder-regression-2026-05-26]]) + Obsidian (auto-feed next Stop). Plus PLAN-FILL-GAPS-RTK-EFFICIENCY-2026-05-26 (16-unit gap-fill + 4-unit RTK roadmap). PSN: leg #4 (Memories) restored, leg #6 (System Viz) forge-audit roost U-MEMORY-MD-AUTO-PRUNE re-classified critical→resolved.

**Commit:** `a023adf83e70` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T12:31:30-05:00
**Tags:** token-context-forge-audit-ms0, u-memory-compact-null-holder-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-MEMORY-COMPACT-NULL-HOLDER-FIX (slot:alpha /goal iter1): regression-test + memory + wiki + gap-fill plan for the silent 0-byte stale-lock crash in scripts/memory-compact.mjs (code-fix absorbed into peer 87b36f5c5e). Pre-fix MEMORY.md 24378B (99.19% of 24576B truncation ceiling); auto-compact returned ok:false reason:threw on every Stop-hook fire; 3 fail-soft layers (try/catch + tryCompact return-null + 12h advisory throttle) erased every signal. Fix: !holder null-guard in acquireLock ageEffective (1 line). Post-fix: live MEMORY.md 12280B (49.97%), 33/33 tests PASS (3 new regression cases — 0-byte lockfile, corrupt-JSON holder, missing-ts holder all steal cleanly). 4-surface doc reflection: code+test (absorbed) + memory ([[reference_memory_compact_null_holder_fix_2026_05_26]]) + wiki ([[memory-compact-null-holder-regression-2026-05-26]]) + Obsidian (auto-feed next Stop). Plus PLAN-FILL-GAPS-RTK-EFFICIENCY-2026-05-26 (16-unit gap-fill + 4-unit RTK roadmap). PSN: leg #4 (Memories) restored, leg #6 (System Viz) forge-audit roost U-MEMORY-MD-AUTO-PRUNE re-classified critical→resolved.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-MEMORY-COMPACT-NULL-HOLDER-FIX (slot:alpha /goal iter1): regression-test + memory + wiki + gap-fill plan for the silent 0-byte stale-lock crash in scripts/memory-compact.mjs (code-fix absorbed into peer 87b36f5c5e). Pre-fix MEMORY.md 24378B (99.19% of 24576B truncation ceiling); auto-compact returned ok:false reason:threw on every Stop-hook fire; 3 fail-soft layers (try/catch + tryCompact return-null + 12h advisory throttle) erased every signal. Fix: !holder null-guard in acquireLock ageEffective (1 line). Post-fix: live MEMORY.md 12280B (49.97%), 33/33 tests PASS (3 new regression cases — 0-byte lockfile, corrupt-JSON holder, missing-ts holder all steal cleanly). 4-surface doc reflection: code+test (absorbed) + memory ([[reference_memory_compact_null_holder_fix_2026_05_26]]) + wiki ([[memory-compact-null-holder-regression-2026-05-26]]) + Obsidian (auto-feed next Stop). Plus PLAN-FILL-GAPS-RTK-EFFICIENCY-2026-05-26 (16-unit gap-fill + 4-unit RTK roadmap). PSN: leg #4 (Memories) restored, leg #6 (System Viz) forge-audit roost U-MEMORY-MD-AUTO-PRUNE re-classified critical→resolved.
```

## Files touched (3)
- .../__tests__/monolithToolTypesDatabase.test.ts    | 211 +++++++++++++++++++++
- .../src/engines/MonolithToolTypesDatabaseEngine.ts | 206 ++++++++++++++++++++
- 2 files changed, 417 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a023adf83e70`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-CONTEXT-FORGE-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._