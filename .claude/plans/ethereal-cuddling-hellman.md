# Plan — PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring

## Context

**Why now.** The post-processor chat (`claude-b913f3b9`) crashed last night after shipping `4ca5d71cc [MAIN] PPG-WIRE-MS5/U-PPGW-AdvancedWiring`, which wired `autoSpeedFeedEngine` into both Hurco V11 and Okuma OSP-P*M master post engines via a new opt-in `generateProgramAdvanced()` async method. The commit message of `4ca5d71cc` explicitly enumerates the next three units in roadmap order:

```
Roadmap: U-PPGW-RapidReposition-Wiring (sequence/aircut/retract/magazine)
         U-PPGW-AdvancedPost-Wiring     (HSM/NURBS/RTCP/in-process measure)
         U-PPGW-PrismPaths-Adaptive     (block-by-block engagement-aware feed)
```

This plan picks up the **first** of the three. The pattern is now well established — `4ca5d71cc` is the canonical reference for how to plumb an existing PRISM optimizer into the master posts without breaking the byte-identical sync `generateProgram()` contract.

**Outcome.** Wire `rapidRepositionOptEngine.optimizeRapids()` + `.optimizeRetracts()` + `.detectAirCuts()` into the `generateProgramAdvanced()` pipeline of both master posts. The advanced pass will report rapid-strategy savings (diagonal vs sequential), retract-height savings, and air-cut detections in `advanced_summary`. Sync `generateProgram` semantics remain byte-identical; everything is gated by `cfg.use_advanced_features = true` exactly like the AutoSpeedFeed pass.

## Scope decisions

| Decision | Choice | Rationale |
|---|---|---|
| Input shape | Use structured `MillOperation.coordinates[]` (already typed `"rapid"\|"linear"\|"arc_cw"\|"arc_ccw"`) | Avoids re-parsing G-code; data already has rapid moves tagged. |
| Optimizer subset (v1) | `optimizeRapids` + `optimizeRetracts` + `detectAirCuts` | These three operate directly on rapid moves the post already emits. `sequenceFeatures`/`optimizeToolChanges`/`optimizeRotaryMoves`/`optimizeMagazine` need extra input the post engine doesn't carry today — those land in the named follow-on units (`U-PPGW-AdvancedPost-Wiring`, `U-PPGW-PrismPaths-Adaptive`). Keep this commit focused like `4ca5d71cc` was. |
| Axis kinematics source | Map `MachineProfile.rapid_traverse_mm_min` → all linear axes, `acceleration_g` → `accel_g`, `work_envelope_mm` → `travel_mm`. Fall through to engine's `defaultAxes()` when machine_id absent. | `MachineProfile` doesn't carry per-axis kinematics. Single-value mapping matches what `MachineStrategyConstraintEngine` exposes today and is honest about granularity. Per-axis enrichment is a separate fleet-data unit. |
| Order in pipeline | AutoSpeedFeed first (existing) → RapidReposition second. | RapidReposition operates on geometry, not on cutting feeds. The two are commutative for our purposes; running RapidReposition second keeps the AutoSpeedFeed code path identical to `4ca5d71cc`. |
| Output shape | Extend `HurcoAdvancedSummary` and Okuma's `AdvancedPipelineSummary` with a new `rapid_reposition` field. Keep `auto_speed_feed` and `machine_used` exactly as in `4ca5d71cc`. | Backward compatible — caller code that only reads `auto_speed_feed` is unaffected. |
| Tests | Mirror `HurcoV11MillMasterPostEngine.AdvancedPipeline.test.ts` pattern, ~15 cases per engine | Established pattern; reviewer will recognize the shape. |
| Milestone JSON | NOT updated in this commit | `PPG-WIRE-MS5.json` is already stale (`status:"complete"` since 2026-05-02 03:20Z but 3 commits past it). A separate milestone-resync unit is appropriate; not in scope here. |

## Files to modify

| File | Change |
|---|---|
| `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` | Add `import { rapidRepositionOptEngine, type RapidMove, type AxisKinematics } from "./RapidRepositionOptEngine.js"`. Extend `HurcoAdvancedSummary` with `rapid_reposition: { rapid_savings_sec; retract_savings_sec; air_cut_wasted_sec; total_saved_sec; optimizations_count } \| null`. Inside `generateProgramAdvanced` after the existing AutoSpeedFeed block: build `RapidMove[]` from `operations[].coordinates` (group consecutive `type:"rapid"` segments into `from→to` pairs, line-numbered against `baseOutput.gcode`), build `AxisKinematics[]` from `machine` if present, call the three optimizers, push `"rapid_reposition_optimization"` to `enhancements`, populate the new summary field. |
| `mcp-server/src/engines/OkumaOSPMillMasterPostEngine.ts` | Same shape of changes against `AdvancedPipelineSummary`. |

## Files to create

| File | Cases |
|---|---|
| `mcp-server/src/__tests__/HurcoV11MillMasterPostEngine.RapidPipeline.test.ts` | (a) advanced unset → `rapid_reposition` is null; (b) advanced+`jmdie_hurco_v11` → `rapid_reposition_optimization` in `advanced_features_applied`; (c) machine_id missing → axes default to engine fallback, optimizer still runs; (d) machine_id unknown → same as (c); (e) zero-rapid program (single `linear` segment only) → `optimizations_count` = 0, no throw; (f) multi-op (3 ops) with rapid moves between ops → `optimizations_count` ≥ 2; (g) Z-first rapid + diagonal rapid both detected; (h) high-aggressiveness vs low-aggressiveness leaves rapid output deterministic (rapid optimizer is independent of aggressiveness — assert pass-through); (i) sync `generateProgram` byte-identical (regression block: compare `gcode.join("\n")` of `generateProgram` vs `generateProgramAdvanced` with `use_advanced_features: false`); (j) co-existence with AutoSpeedFeed — both `auto_speed_feed_optimization` and `rapid_reposition_optimization` present in same call; (k) negative travel coords (work below Z=0); (l) duplicate adjacent rapids collapsed to no-op; (m) NaN-safety on coords throws structured error rather than silently returning; (n) `advanced_summary.rapid_reposition.total_saved_sec ≥ 0`; (o) `physics_checks` array unchanged when rapid pass runs (no false-positive injection). |
| `mcp-server/src/__tests__/OkumaOSPMillMasterPostEngine.RapidPipeline.test.ts` | Mirror image with `jmdie_okuma_genos_m460v_5ax`, additional case for P500 5-axis rotary-axis presence still passes the linear-only optimizer subset cleanly. |

## Reusable assets (do not rewrite)

| Asset | Path | Use |
|---|---|---|
| `rapidRepositionOptEngine` (singleton) | `src/engines/RapidRepositionOptEngine.ts:1276` | `optimizeRapids({moves, axes, controller_diagonal_mode})`, `optimizeRetracts({moves, axes, retract_clearance_mm, obstacle_heights_mm})`, `detectAirCuts({air_cut_data})` — public API at lines 369, 477, 541. |
| `machineStrategyConstraintEngine.getMachineById` | `src/engines/MachineStrategyConstraintEngine.ts` | Already imported by both post engines. Returns `MachineProfile \| null` with `rapid_traverse_mm_min`, `acceleration_g`, `work_envelope_mm`, `axis_count`. |
| Pattern reference | commit `4ca5d71cc` + `HurcoV11MillMasterPostEngine.AdvancedPipeline.test.ts:1-150` | Test scaffold + sync-byte-identical regression assertion shape. |

## Verification

```bash
cd H:/prism/mcp-server

# Unit + integration regression — must stay green
"H:/Tools/nodejs/npx.cmd" vitest run \
  src/__tests__/HurcoV11MillMasterPostEngine.test.ts \
  src/__tests__/HurcoV11MillMasterPostEngine.AdvancedPipeline.test.ts \
  src/__tests__/HurcoV11MillMasterPostEngine.RapidPipeline.test.ts \
  src/__tests__/OkumaOSPMillMasterPostEngine.test.ts \
  src/__tests__/OkumaOSPMillMasterPostEngine.AdvancedPipeline.test.ts \
  src/__tests__/OkumaOSPMillMasterPostEngine.RapidPipeline.test.ts \
  src/__tests__/OkumaOSPMillMasterPostEngine.SidecarIntegration.test.ts \
  src/__tests__/OkumaOSPMillMasterPostEngine.JMDiePreset.test.ts \
  src/__tests__/MachineStrategyConstraintEngine.JMDieFleet.test.ts \
  src/__tests__/integration/MasterPostByMachineExpanded.integration.test.ts

# Type check window
"H:/Tools/nodejs/npx.cmd" tsc --noEmit 2>&1 | grep -E "Hurco|OkumaOSP|RapidReposition"

# Affected build
"H:/Tools/nodejs/npm.cmd" run build:fast
```

Pass criteria: 100% green on the listed suites (expected ≈ 180-200 cases) and zero new tsc errors in the named files. Sync-byte-identical regression test must pass — the rapid pass must NEVER change `output.gcode`, only augment `advanced_summary`.

After commit, pin hash into `state/shared/RESUME_POSTS.md` in a separate `-followup` commit (mirrors how `efab22a7d` followed `4ca5d71cc`).

## Out of scope (explicit)

- Updating `mcp-server/data/milestones/PPG-WIRE-MS5.json` (stale; separate resync unit).
- Per-axis kinematics enrichment of fleet profiles (separate fleet-data unit).
- `optimizeMagazine` / `optimizeToolChanges` / `optimizeRotaryMoves` / `sequenceFeatures` (named for `U-PPGW-AdvancedPost-Wiring` and `U-PPGW-PrismPaths-Adaptive`).
- Wiring rapid optimization into the AutoSpeedFeed call itself (orthogonal feature).
- WEDM block_annotation schema extension (PPG-WIRE-MS6 / U-PPGM16, separate sprint).
