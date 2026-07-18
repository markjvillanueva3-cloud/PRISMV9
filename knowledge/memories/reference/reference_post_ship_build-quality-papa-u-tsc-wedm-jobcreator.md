---
name: reference_post_ship_build-quality-papa-u-tsc-wedm-jobcreator
description: Auto-distilled learnings from shipping BUILD-QUALITY-PAPA/U-TSC-WEDM-JOBCREATOR (commit 89179da41). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.789Z
aliases: reference_post_ship_build-quality-papa-u-tsc-wedm-jobcreator
---


# BUILD-QUALITY-PAPA/U-TSC-WEDM-JOBCREATOR

[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-WEDM-JOBCREATOR (slot:papa): clean tsc 128->115 (13 cleared) -- PassDetail field reconciliation: .type->.pass_type, .predicted_ra_um->.expected_ra_um, drop e_pack_code (not on PassDetail). WEDMGenerateResult optional fields (estimated_time_min/predicted_ra_um/controller/line_count/profiles_cut/passes_per_profile) ??-guarded in packetNotes + programMeta; wire_consumption_m not emitted -> 'n/a'/0 sentinel (commented). NO fabricated value, NO type weakening. 0 errors; zero regressions.

**Shipped:** 2026-06-17T19:23:12-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[build-quality-papa-u-tsc-wedm-jobcreator]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._