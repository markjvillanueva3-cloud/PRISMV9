---
name: feedback-oscar-sfc-physics-discipline
description: Standing SFC doctrine — never inline kc/Taylor/JC constants, every recommendation carries provenance, spindle power is a clamp not a target. The oscar-slot physics contract.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.438Z
aliases: feedback_oscar_sfc_physics_discipline
---


# SFC physics discipline (oscar standing doctrine)

Three non-negotiables for any speed-feed work:

1. **Constants are imported, never inlined.** kc1.1, mc, Taylor C/n, Johnson-Cook A/B/n/C/m live ONLY in `mcp-server/src/physics/constants.ts`. Canonical kc1.1: P=1800 M=2100 K=1100 N=700 S=2800 H=3200 ([[reference_oscar_sfc_canonical_kc_per_iso]]).
2. **Every Vc/feed/power recommendation carries provenance.** Cite the source DB (Sandvik/Kennametal/manufacturer table) or the physics model + calibration. `sfc-provenance-guard.mjs` (PostToolCall) blocks recommendations lacking it; `PRISM_SFC_PROVENANCE_HARD_BLOCK=1` for ITAR/AS9100.
3. **Spindle power/torque is a hard clamp, not a target.** Verify Vc·feed·MRR against the machine power curve; route the clamp through `prism_safety` / the 9-axis envelope, never re-roll the formula.

**Why:** SFC is a saleable product whose output runs real spindles. An inlined constant drifts silently; an unsourced number can't be audited; an un-clamped CSS move runs a spindle past its envelope. Each is a safety + trust failure, not a style nit.

**How to apply:** before any SFC edit, read `constants.ts` for the value; run recommendations through `prism_calc:sfc_nine_axis_run` (it clamps); attach provenance; dispatch `physics-reviewer` on any force/power/chatter/wear formula change. R12: if it can't be made safe in the envelope, report infeasible — don't soften a threshold.

Related: [[feedback_oscar_chip_thinning_mandatory]] · [[feedback_oscar_css_g50_cap_mandatory]] · [[reference_oscar_sfc_test_gauntlet_401]]
