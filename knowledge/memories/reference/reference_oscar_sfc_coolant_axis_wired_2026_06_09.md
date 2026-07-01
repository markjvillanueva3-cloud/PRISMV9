---
name: reference_oscar_sfc_coolant_axis_wired_2026_06_09
description: "SFC coolant axis (2nd inert axis) fixed by WIRING the existing CoolantVcModifier into the engine — the inert axes are wiring gaps, not missing models; dedup-first."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.699Z
aliases: reference_oscar_sfc_coolant_axis_wired_2026_06_09
---


# SFC coolant axis wired (OSCAR-SFC-9AXIS-MS0/U-OSC-COOLANT-VC, slot:oscar, 2026-06-09)

Commit `585584e3ae` on `cad-fusion-live-ms0`. Second of the operator's inert SFC axes fixed (tool material was first — `658c8280fe`, see [[reference_oscar_sfc_axis_impact_gap_2026_06_08]]).

## What the operator found
The SFC accepted a `coolant` type but it never changed Vc — flood ≡ dry → identical cutting speed. One of the "every combination is meaningless until each axis moves the answer" gaps.

## Root cause: a WIRING gap, not a missing model
`mcp-server/src/algorithms/CoolantVcModifier.ts` (speed-feed algorithm **8.5**) ALREADY models coolant→Vc + Taylor-C: a 6 ISO × 5 coolant `[vc_mult, taylor_C_mult]` table, cited (Sandvik/Iscar/ISO/Cryomec), tested (`CoolantVcModifier.test.ts`), and dispatcher-wired (`calcDispatcher.ts:10524` via `getMultipliers`). `HPCVcBoostCalculator.ts` (8.7) models the through-tool/high-pressure boost. **Neither was ever consumed by `UltimateSpeedFeedEngine.calculate()`** — so coolant was inert in the headline SFC output despite the models existing.

## The dedup pivot (R7/R8 — the important lesson)
I started building a NEW `CANONICAL_COOLANT_SPEED_FACTOR` table in `physics/constants.ts`. A memory-recall hook surfaced `[[reference_post_ship_speed-feed-ms0-u-sfm-84-85-87-corrections]]` → I found 8.5 already existed → **reverted the parallel table** (`git checkout HEAD -- constants.ts`) and wired the EXISTING algorithm instead. No second source of truth.
- **Why the dedup guard didn't fire:** I was adding a *function to `constants.ts`*, not creating an "engine/algorithm/formula/action/hook" — `duplicationGuardEngine.checkBeforeCreating` is asset-type-keyed and a physics-helper slipped past it. **Gap worth a guard extension** (constants.ts helper that duplicates an algorithm).

## How it's wired
`UltimateSpeedFeedEngine.ts:2114`: `Vc = baseVc × hFactor × stratMod.vc_factor × toolMatFactor × coolantFactor`. `coolantFactor = getCoolantVcMultipliers({iso_group: effectiveIso, coolant: algoCoolant}).vc_multiplier.value`.
- **EXPLICIT-only safety gate** (mirrors tool material): factor applies ONLY when `input.coolant` truthy; inferred/unspecified → 1.0 (base Vc already assumes the regime's recommended coolant → no double-count).
- **7→5 coolant-kind map:** flood/mist/mql→MQL/dry/cryogenic direct; `air_blast→dry` (minimal cooling, conservative); `through_tool→flood` (HPC speed boost needs algo 8.7 pressure/flow inputs — NOT claimed without them).
- **Canonical model is flood=1.0 universal reference** (tango's table), NOT a sign-inversion. Dry derates every wet group, magnitude material-dependent: dry-S 0.55 ≪ dry-P 0.78 < dry-K 0.92; cryo lifts S (1.60). A global scalar can't span 0.55→0.92.

## Bycatch fix (pre-existing, unrelated)
`variability.test.ts` `assertCanonicalUnits` expected `spindle_rpm.unit === "RPM"` (25 failures) but the engine canonically emits `"rev/min"` (`:2734`) and the main gauntlet pins `"rev/min"` (`UltimateSpeedFeedEngine.test.ts:41`). Corrected the stale expectation to the canonical/tested unit (NOT weakening). Also promoted 2 `it.todo` tool-material stubs to real tests (now satisfied).

## Verified
coolant 8 + toolmat 10 + gauntlet 52 + variability 105(+1 todo) green; tsc clean for all touched files (12 pre-existing errors live in unrelated `shopDispatcher.ts`). 2-of-2 per-file scrutiny PASS.

## Follow-ups
- **P3:** coolant's `taylor_C_multiplier` (tool-life coupling) returned by 8.5 is NOT yet wired — only Vc. Same class as the tool-material Taylor P3.
- **Next axis (prioritized):** holder/machine/spindle rigidity. **DEDUP-CHECK the existing stability/SLD engines (ChatterStabilityLobe, DeflectionEngine, etc.) FIRST** — by this unit's lesson, the rigidity axis is likely another wiring gap, not a missing model.

## Standing lesson (applies to all remaining SFC axes)
**An inert axis is usually a WIRING gap, not a missing model.** Before building a new factor for machine/spindle/holder/insert/controller/workholding/finish, grep `src/algorithms/` + `ENGINE_DIGEST.md` for an existing model and check whether it's wired into `UltimateSpeedFeedEngine.calculate()`. Reuse + wire beats fork. See [[feedback_wire_test_validate_all_galaxies]] (R15 WIRE step) + [[reference_oscar_sfc_axis_impact_gap_2026_06_08]].
