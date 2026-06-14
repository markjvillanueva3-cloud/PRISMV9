---
name: reference_post_ship_token-context-forge-audit-ms0-u-memory-compact-null-holder-fix
description: Auto-distilled learnings from shipping TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-MEMORY-COMPACT-NULL-HOLDER-FIX (commit a023adf83). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.802Z
aliases: reference_post_ship_token-context-forge-audit-ms0-u-memory-compact-null-holder-fix
---


# TOKEN-CONTEXT-FORGE-AUDIT-MS0/U-MEMORY-COMPACT-NULL-HOLDER-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-CONTEXT-FORGE-AUDIT-MS0]/U-MEMORY-COMPACT-NULL-HOLDER-FIX (slot:alpha /goal iter1): regression-test + memory + wiki + gap-fill plan for the silent 0-byte stale-lock crash in scripts/memory-compact.mjs (code-fix absorbed into peer 87b36f5c5e). Pre-fix MEMORY.md 24378B (99.19% of 24576B truncation ceiling); auto-compact returned ok:false reason:threw on every Stop-hook fire; 3 fail-soft layers (try/catch + tryCompact return-null + 12h advisory throttle) erased every signal. Fix: !holder null-guard in acquireLock ageEffective (1 line). Post-fix: live MEMORY.md 12280B (49.97%), 33/33 tests PASS (3 new regression cases — 0-byte lockfile, corrupt-JSON holder, missing-ts holder all steal cleanly). 4-surface doc reflection: code+test (absorbed) + memory ([[reference_memory_compact_null_holder_fix_2026_05_26]]) + wiki ([[memory-compact-null-holder-regression-2026-05-26]]) + Obsidian (auto-feed next Stop). Plus PLAN-FILL-GAPS-RTK-EFFICIENCY-2026-05-26 (16-unit gap-fill + 4-unit RTK roadmap). PSN: leg #4 (Memories) restored, leg #6 (System Viz) forge-audit roost U-MEMORY-MD-AUTO-PRUNE re-classified critical→resolved.

**Shipped:** 2026-05-26T12:31:30-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[token-context-forge-audit-ms0-u-memory-compact-null-holder-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._