---
name: reference_oscar_sfc_surface_finish_pertooth_2026_06_23
description: "SFC page surface-finish Ra was ~16x inflated (slot:oscar 2026-06-23, commit 76154a3ea6, found via live :3100 round-trip). ProductEngine.sfcCalculate (+ compare/optimize) passed calculateSurfaceFinish(fz*numTeeth) for MILLING, but the Brammertz Ra=f^2/(32r) (canonical predictedRa(fz,r) constants.ts:983) takes the per-TOOTH feed fz -> fz*numTeeth over-reports by numTeeth^2 (16x for 4FL) -> live API returned Ra=103.68um 'N10+' for a normal cut. Every other caller already passed fz; ProductEngine was the lone outlier (and its own surface_finish PANEL showed the correct ~3um -> internal inconsistency). Fixed all 3 sites to fz; +R9 lock. ALSO: the DEPLOY GAP -- :3100 serves the stale dist (committed != live until server restart)."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.712Z
aliases: reference_oscar_sfc_surface_finish_pertooth_2026_06_23
---


**SFC page surface-finish Ra ~16x inflated -- FIXED (slot:oscar, 2026-06-23, commit `76154a3ea6`). Found via LIVE :3100 round-trip (R15 -- the kind of bug only end-to-end validation surfaces).**

## The bug
`ProductEngine.sfcCalculate` (+ `sfcCompare`/`sfcOptimize`, 3 sites) called `calculateSurfaceFinish(fz * numTeeth, ...)` with `is_milling=true`. The Brammertz feed-direction formula `Ra = f^2/(32*r)` (`ManufacturingCalculations.ts:672`; canonical `predictedRa(fz, r)` at `constants.ts:983` NAMES the arg `fz`) takes the per-TOOTH feed -- each cutting edge leaves its own nose-radius cusp at the per-tooth advance. Passing the per-REV feed `fz*numTeeth` over-reports `Ra` by `numTeeth^2` (16x for a 4-flute). Live `:3100 /api/v1/sfc/calculate` for a normal 12mm 4FL steel cut returned `surface_roughness_Ra_um=103.68` / `"N10+ (very rough)"` (1.152^2/(32*0.8)*1000*2 = 103.7). Physically absurd (~bandsaw territory).

EVERY OTHER caller already passed `fz` (IntelligenceEngine:1643/2324, the `prism_calc:surface_finish` dispatcher panel:1678, the test oracles) -- ProductEngine was the LONE outlier. Worse: the page's own standalone surface-finish PANEL (dispatcher path, correct `fz`) showed ~3um while the MAIN result card (ProductEngine) showed ~100um -- an internal inconsistency on the same page.

## Fix (`76154a3ea6`)
All 3 ProductEngine sites pass `fz` (per-tooth), not `fz*numTeeth`. After this + the material-aware fz ([[reference_oscar_sfc_page_material_aware_fix_2026_06_23]]), 1045 Ra = 0.15^2/(32*0.8)*1000*2 = ~1.76um (clean N7). Added an R9 reference-value lock (Ra == fz^2/(32*0.8)*1000*2, independent oracle from fz, + Ra<12.5) that fails on a 16x revert. 24/24 page tests, tsc clean; 2-arm scrutiny PASS (physics-reviewer canonical-confirmed per-tooth vs Boothroyd/Brammertz/MDH).

## DEPLOY GAP (the bigger lesson -- generating != delivering, R15 ultimate-destination)
The live `:3100` MCP bridge runs `node dist/index.js` and had 5.4h uptime -- it loaded a dist built BEFORE these fixes, so the customer-facing API served OLD material-blind + Ra-inflated values DESPITE the source being fixed+tested+committed. `dist` is now rebuilt (`npm run build:fast`) but the running server won't pick it up until RESTARTED -- a FLEET-SHARED action (26 chats use :3100), so it must be coordinated (operator/golf), not done unilaterally mid-fleet-work. Task #7. **Lesson: a vitest-green + committed fix is NOT live on the API until the :3100 server restarts; always round-trip the LIVE bridge (with nested machine.spindle.{max_rpm,power} to pass the pre-machine-completeness-gate) to confirm delivery.**

## Session arc (codex SFC page accuracy, 4 commits)
1. `05e08b4702` material-aware Vc + chip load + rpm clamp ([[reference_oscar_sfc_page_material_aware_fix_2026_06_23]]).
2. `fa6a037974` panel validation (3 panels correct) + engagement bug find.
3. `247c5856f2` engagement-arc doubling fix ([[reference_oscar_engagement_arc_doubled_bug_2026_06_23]]).
4. `76154a3ea6` this -- surface-finish per-tooth Ra.
Remaining (gated): orchestrator over-derate (operator product decision); deploy/restart :3100 (fleet-shared); frontend render (quebec + live stack).
