---
title: SFC speed_feed material-aware delegation + the stranded-slot-branch trap
tags: [sfc, speed-feed, oscar, dispatcher, delegation, slot-branch, merge, regression-pattern]
slot: oscar
date: 2026-06-22
commits: [986b36a2b1, e697a82840]
related: [reference_sfc_speed_feed_bugs_2026_05_31, reference_oscar_speedfeed_material_aware_fixed_2026_06_22]
---

# SFC speed_feed material-aware delegation + the stranded-slot-branch trap

## The bug (Bug 1 of the SFC speed-feed bug list)
`prism_calc:speed_feed` was **material-blind**: it called `calculateSpeedFeed`
(`ManufacturingCalculations.ts:788`), which keys cutting speed off the **tool**
material + hardness only and never reads the **workpiece** — so it returned the
SAME Vc for steel, aluminum, and titanium. Safety-relevant: aluminum (ISO N)
should run ~2.6x the cutting speed of steel (ISO P), titanium (ISO S) ~0.33x.
An aluminum speed on titanium burns the tool.

## The fix (pattern: re-route the dispatcher ACTION to the richer engine)
The dispatcher `speed_feed` case (`calcDispatcher.ts:~1690`) now delegates to
`ultimateSpeedFeedEngine.calculate()` — the material-aware Kienzle/Taylor
authority with a workpiece alias→ISO/hardness table — and remaps its
`OptimizedValue` result back to the `{cutting_speed, spindle_speed,
feed_per_tooth, feed_rate, axial_depth, radial_depth}` contract the compact
map reads. Notes that made it correct:
- **Engine field rename:** the engine returns `spindle_rpm`; the contract key is
  `spindle_speed`. Remap it explicitly.
- **Normalize legacy→canonical params IN THE DISPATCHER** (per the dispatchers
  CLAUDE.md): `tool_diameter→tool_diameter_mm`, `number_of_teeth→flutes`,
  `hardness_HRC→hardness_hrc`, `operation(roughing/finishing)→cut_type`. UNITS-FIRST:
  `tool_diameter→tool_diameter_mm` is mm→mm (no scaling) — the engine field is
  literally `_mm` and the legacy RPM formula `1000*Vc/(π*D)` is only dimensionally
  correct for D in mm.
- **Fail LOUD, never silent (R12):** finite-guard the whole Vc/rpm/fz/vf quartet;
  on any engine error fall back to the legacy util WITH a "material-BLIND estimate"
  warning string. The constant-Vc stub is the documented WORSE path.
- **Leave the util untouched:** `calculateSpeedFeed` has 12 callers incl.
  `route-contract-sfc-speedfeed.test.ts` which tests it directly. A second ISO-Vc
  table is physics fragmentation. The contract test stays green because it tests
  the util, not the action.

## The SILENT test gap (why material tests aren't enough)
Vc (surface speed) is **diameter-independent**. So a wrong-diameter bug
(`tool_diameter` not reaching the engine → `inferToolDiameter()`'s constant 12 mm)
**hides behind passing material tests**. Always add a diameter-passthrough guard:
*halving the diameter ~doubles RPM while Vc stays ~equal*. (Also: more flutes →
higher feed_rate; finishing fz < roughing fz for the op→cut_type map.)

## The bigger trap: STRANDED SLOT-BRANCH FIXES
Bug 1 (+ follow-ups #53 param-passthrough `d5edd5eada`, #56 op→cut_type) had
**already been fixed on the `slot/oscar` branch on 2026-06-02** — under the SAME
unit name. But `git merge-base --is-ancestor d5edd5eada cad-fusion-live-ms0` =
**FALSE**: that slot-branch work **never merged** to the live branch the fleet
actually builds on. The live tree was still material-blind (verified by reading
the live code). A "shipped" memory whose commit lives on an unmerged slot branch
is NOT shipped to production.

**Rule:** a fix is only real on the branch the operator/fleet builds on. Before
trusting a "shipped"/"done" memory, verify delivery with
`git merge-base --is-ancestor <sha> <working-branch>`. This is the recurring
PRISM pattern (sibling: the SFC-inference-gate wiring that was slot/india-only).

## Companion: broad test sweeps are polluted by peer untracked WIP
A broad `vitest` sweep on the shared tree showed 79 "failures" — but the bulk
were **peer WIP** (e.g. `sfcProvenanceWire.ranker.test.ts` is *untracked* `??`
and its engine `SFCMultiHypothesisRankerEngine` does not exist) + lathe-domain
tests. **Filter by git-tracked status before treating a sweep failure as a
regression in your domain** (`git status --short <file>`; `??` = peer WIP, skip).
