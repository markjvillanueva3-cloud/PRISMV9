---
name: feedback-oscar-chip-thinning-mandatory
description: Standing SFC doctrine — apply the Sandvik radial-engagement chip-thinning correction whenever ae/D < ~0.5 or lead angle ≠ 90°. Under-feeding a light-radial cut rub-burns the tool.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.438Z
aliases: feedback_oscar_chip_thinning_mandatory
---


# Chip-thinning is mandatory on light-radial / non-90° cuts (oscar doctrine)

When radial engagement ae/D < ~0.5 (HSM/trochoidal/peel) OR the lead angle ≠ 90°, the actual chip is THINNER than the programmed feed-per-tooth. You must apply the Sandvik effective-feed (chip-thinning) correction — multiply fz up by the radial chip-thinning factor — so the actual chip thickness lands in the tool's design window.

**Why:** below the minimum chip thickness the cutting edge plows/rubs instead of shearing → heat, work-hardening, premature flank wear, and a worse finish. Operators "play it safe" by reducing feed on a light cut, which is exactly backwards — it makes the rubbing worse and burns the tool faster.

**How to apply:** the 9-axis orchestrator applies it automatically (clamp step 3); if computing by hand, use `prism_calc` chip-thinning, never a raw fz. Flag it in the recommendation when it fired. Lead-angle correction is the turning analog (effective feed at a non-90° lead) — whiskey's lathe facade handles it; keep the convention consistent.

Related: [[feedback_oscar_sfc_physics_discipline]] · [[reference_oscar_sfc_nine_axis_contract]]
