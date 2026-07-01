---
name: feedback-oscar-sf-round-at-display-not-calc
description: Standing SFC doctrine (R12 bug class) — round speed/feed values at DISPLAY, never inside the calc. Math.round/floor mid-pipeline truncated a real small feed to 0 (AutoSpeedFeed bug 1b87f98f2).
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.438Z
aliases: feedback_oscar_sf_round_at_display_not_calc
---


# Round at display, never in the calc (oscar R12 doctrine)

A `Math.round()` / `Math.floor()` applied mid-pipeline to a speed/feed value truncated a real small feed-per-tooth to **0** — the AutoSpeedFeed R12 bug (kilo fix, commit `1b87f98f2`, in the CLAUDE.md regressions list). A 0 feed downstream is a stall / dwell-burn, or a divide-by-zero in MRR.

**Why:** small chiploads (micro-tools, finishing, hard materials) are legitimately sub-1.0 in their unit; an integer round zeroes them. Rounding is a presentation concern — the physics pipeline must keep full float precision so chip-thinning, MRR, power, and tool-life all compute correctly.

**How to apply:** keep full float through every SFC calc stage; apply rounding/precision ONLY at the final display/format boundary (e.g. the G-code emit or the UI cell), and choose precision per unit (more decimals for mm/tooth than for RPM). When reviewing an SFC engine, grep `Math.round|Math.floor` and verify none sit upstream of a feed/chipload that could be <1.

Related: [[feedback_oscar_sfc_physics_discipline]] · [[reference_oscar_sfc_test_gauntlet_401]] (a gauntlet assertion guards small-feed precision).
