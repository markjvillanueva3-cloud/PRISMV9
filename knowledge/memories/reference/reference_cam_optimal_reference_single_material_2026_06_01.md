---
name: reference_cam_optimal_reference_single_material_2026_06_01
description: "The PRISM_UPGRADED .nc \"optimal reference\" corpus is single-material (ISO-H tool_steel uniform) — NOT per-part-optimal; SFM is material-dependent so resolve ISO group from the print, never default tool_steel"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.504Z
aliases: reference_cam_optimal_reference_single_material_2026_06_01
---


# PRISM_UPGRADED "optimal reference" is single-material (U-CAM-OPTIMAL-REFERENCE, slot:kilo, 2026-06-01)

The `PRISM_UPGRADED` .nc corpus (`H:/PRISM/JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/<machine>/*.nc`) carries physics-optimal headers from `UltimateSpeedFeedEngine` (iso/material/RPM/feed/DOC/SFM per JM machine LTH-02..07). Extracted via `scripts/cam-upgraded-reference-profile.mjs` (118 files / 376 blocks / 59 customers).

## Finding (R12)
**All 296 ISO-H/tool_steel blocks are IDENTICAL: SFM=180, DOC=1.5mm, optimize_for=balanced.** Only RPM (1905↔2095) varies, by machine spindle-clamp; rigidity medium/high by machine. The upgrade run **assumed every part is hardened tool steel (ISO-H)** and applied one speed/feed uniformly → it is NOT per-part-optimal. Learning "copy PRISM_UPGRADED" would teach 180 SFM / 1.5mm DOC for everything — correct for genuine hardened tool steel, WRONG for aluminum/brass/soft-steel parts JM also runs.

## Correction to my earlier optimization claim
Earlier (CAM-OP-TEMPLATE-MATRIX / corpus profile) I generically said "raise SFM toward 600-1000". That is the **soft ISO-P steel** envelope — **WRONG for ISO-H hardened tool steel**, where ~180 SFM is optimal and the observed JM ~250 is slightly aggressive. **SFM is material-dependent: resolve the ISO group from the PRINT first (kilo's print-to-program domain); never default to tool_steel.** This validates the resolver's physics-delegation (passes `material_iso_group` to the engine, inlines nothing) — and requires material resolution UPSTREAM of the physics call.

## Real optimization deltas (corrected, observed vs optimal)
DOC: observed 0.031-0.040 in vs optimal 1.5mm(0.059) → deeper, fewer passes. Eliminate air-cut passes (time). RPM not directly comparable (= f(SFM, diameter)).

## Follow-up
Re-run the JM upgrade with **per-part material** (from blueprint extraction) to produce a genuinely per-part-optimal reference corpus. Pairs with [[reference_cam_feed_regex_broken_2026_06_01]] (sibling corpus finding) + [[reference_cam_learn_loop_gap_fill_2026_05_31]]. Doc: `state/shared/cam-drive/CAM-OPTIMAL-REFERENCE-FINDINGS.md`.
