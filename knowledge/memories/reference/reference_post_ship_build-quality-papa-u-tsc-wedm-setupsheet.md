---
name: reference_post_ship_build-quality-papa-u-tsc-wedm-setupsheet
description: Auto-distilled learnings from shipping BUILD-QUALITY-PAPA/U-TSC-WEDM-SETUPSHEET (commit 164085bbd). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.790Z
aliases: reference_post_ship_build-quality-papa-u-tsc-wedm-setupsheet
---


# BUILD-QUALITY-PAPA/U-TSC-WEDM-SETUPSHEET

[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-WEDM-SETUPSHEET (slot:papa): clean tsc 176->128 (48 cleared) -- WEDMSetupSheet consumer reconciled to REAL producer types. Guard the 4 optional subsystem outputs (sheet/passes/cycleTime/confidence) -> clears 32 TS18048. Reconcile: cutting=rough_cut_min+skim_passes_min (CycleTimeBreakdown has no cutting_time_min); num_passes=passes.length; num_profiles=result.profiles_cut; controller=result.controller (lives on result not sheet); confidence.summary derived from real ConfidenceScore fields. Genuinely-unemitted fields (wire_consumption_m [needs machine wire-feed rate], per-pass durations [PassDetail has no time], program_number [operator-assigned], submerged [not emitted]) use the file's own empty-sentinel convention (0/[]/false) with explicit comments -- NO fabricated physics/machine value, NO type weakening. WEDMSetupSheet 0 errors; zero regressions elsewhere.

**Shipped:** 2026-06-17T19:18:48-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[build-quality-papa-u-tsc-wedm-setupsheet]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._