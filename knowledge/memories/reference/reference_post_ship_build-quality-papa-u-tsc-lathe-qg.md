---
name: reference_post_ship_build-quality-papa-u-tsc-lathe-qg
description: Auto-distilled learnings from shipping BUILD-QUALITY-PAPA/U-TSC-LATHE-QG (commit 684df9a1c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.788Z
aliases: reference_post_ship_build-quality-papa-u-tsc-lathe-qg
---


# BUILD-QUALITY-PAPA/U-TSC-LATHE-QG

[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-LATHE-QG (slot:papa): clean tsc 110->103 (7 cleared) -- WireBreakAutoRethread operatorSkill use-before-assign (self-ref ?? was always 'intermediate'); LatheQualityGate findLastIndex->manual reverse-loop (es2023 lib + implicit-any), machine.max_power_kw->spindle_power_kw (real field), context.material->context.part.material (material lives on QualityGatePart). DEFER LatheQualityGate 712: passes a TURNING op (feed_mm_rev/part-diameter/no-teeth) into omega's MILLING-shaped OperationInput (fz_mm-per-tooth/tool_diameter/num_teeth) for an S(x) SAFETY score -- semantic/physics mismatch, NEVER fabricate the turning->milling mapping -> whiskey+safety-physics. NO fabricated value. zero regressions.

**Shipped:** 2026-06-17T19:40:56-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[build-quality-papa-u-tsc-lathe-qg]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._