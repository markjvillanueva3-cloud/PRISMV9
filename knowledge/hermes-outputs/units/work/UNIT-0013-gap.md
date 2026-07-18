# UNIT-0013 -- Per-Machine Capability Modeling -- GAP ANALYSIS
_Analyst: oscar (speed-feed; cross-domain per multi-domain policy -- natural build owner is foxtrot/mill + whiskey/lathe) - 2026-07-02 - Grep-verified vs calcDispatcher.ts + engine tree._

## Existing coverage
The physics primitives of "machine capability" are built + wired:
- **Spindle envelope**: `spindle_torque_check` / `spindle_power_check` / `spindle_safe_envelope` (`calcDispatcher.ts:640`); `spindle_torque_curve` / `spindle_torque_available` / `spindle_check_cut` / `spindle_max_mrr` (`:5352-5369` -> SpindleTorqueCurveEngine).
- **Machine-envelope feasibility**: a combined check returning `feasible` + `total_power_utilization_pct` + `total_torque_utilization_pct` + `thermal_growth_um` + `wear_force_increase_pct` + `limiting_operation` (`:518`).
- **Thermal growth / axis**: `thermal_growth` (`:68`), `thermal_deflection` (`:224`), `thermal_compensate` (`:226`); `AxisCompensationEngine.ts`, `BallScrewSelectionEngine.ts` (way/ballscrew condition primitives).
- **Machine profiles**: JM Die machines live in `src/data/jm-die-profile.ts` + `ShopConfigurationEngine.ts` (per-machine spindle/rpm/power already consumed by the SFC clamp).

## Real gaps
1. **No single per-machine CAPABILITY-ENVELOPE + HEALTH engine.** The primitives (spindle torque curve, thermal growth, ballscrew) exist but are not composed into a per-machine `MachineCapabilityEngine` that emits one capability envelope + health indicator per JM machine. Genuine composition gap.
2. **Health PREDICTORS (spindle-bearing / way-cover / ballscrew condition over time)** are not modeled -- `BallScrewSelectionEngine` is SELECTION, not condition-monitoring. Needs sensor/telemetry data that is not in-repo.
3. **"Real machine data validation on 10 JM machines"** is data-blocked: JM profiles carry static spindle/power specs, not sensor/health time-series. Declare the telemetry-capture dependency (R12).

## Verdict
**extend** (envelope primitives wired; the per-machine composition + health predictors are the real work, health is data-blocked)

## Recommended next action
Build a thin `MachineCapabilityEngine` (owned naturally by foxtrot/whiskey) that composes the existing spindle-torque-curve + thermal-growth + envelope-feasibility primitives into ONE per-machine capability envelope keyed on `jm-die-profile.ts`, with a health-INDICATOR stub that clearly reports "no telemetry" until sensor capture exists. Wire `machine_capability_*` to prism_calc. Do NOT fabricate health predictors without sensor data.

## ROI
**4/10** -- ~75% of the physics exists wired; the composition is modest, but the health-predictor half is blocked on shop telemetry PRISM does not yet have.
