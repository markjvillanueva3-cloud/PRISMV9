---
name: reference_oscar_sfc_all_axis_sweep_2026_06_09
description: "SFC all-axis calc sweep (U-OSC-ALL-AXIS-SWEEP) runs every named goal axis through the live NineAxisOrchestrator (OAT x2 regimes + factorial); finding = 16/25 axes LIVE, 9 inert-at-baseline needing triage"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.695Z
aliases: reference_oscar_sfc_all_axis_sweep_2026_06_09
---


# SFC all-axis calculation sweep (U-OSC-ALL-AXIS-SWEEP, slot:oscar, 2026-06-09)

The standing /goal clause 1: "Run calculations for EVERY possible combination of machines,
spindles, controller, materials, work-holding/fixture, tool-holder connection type + holding
mechanism (balance/max-speeds/rigidity/dampening/accuracy), tooling+insert, coolant, tool-path
type, cutting parameters, desired finish quality -- with MAX VARIABILITY." The Stop hook
correctly caught that the prior comparison sweep (`sfc-full-sweep-compare.mjs`) varied only
material/tool/parameter axes and held the MACHINE-SIDE axes at orchestrator defaults.

## What shipped
`mcp-server/scripts/sfc-all-axis-sweep.mjs` enumerates EVERY named axis (25 total) through the
live `SpeedFeedNineAxisOrchestratorEngine`, two phases:
- **OAT x 2 regimes**: each axis swept over ALL its levels on BOTH a rigid-roughing baseline
  (force-side axes bind) AND a light/high-RPM/finishing baseline (speed-cap + finish axes bind).
  An axis is LIVE if it moves output (rpm/feed/mrr spread > 0.1%) in EITHER regime -- this dual
  baseline is load-bearing: holder_balance reads INERT (36.8%) at the rigid baseline but LIVE
  (144.4%) once the high-RPM regime exercises the ISO-1940 cap. Single-baseline would cry-wolf.
- **Factorial**: bounded full-factorial over the categorical machine-side axes (way x workholding
  x holder x coolant x material x tool_material x cut_type x diameter x mode), streamed one row
  per combination to an NVMe ledger. core=3,888 combos; `--mode full` = full-enum (Blackwell scale).
Test: `src/__tests__/sfcAllAxisSweep.test.ts` (8 methodology tests, green) -- material-MRR-spread
guard doubles as a regression sentinel vs the known material-blindness bug class.

## The finding (R12 fail-loud -- surfaced, not hidden)
**16 of 25 axes LIVE** (strong spreads: material 733% MRR, cut_type 381%, mode 243% feed,
operation 196%, tool_diameter 177%, holder_balance 144%, tool_material 101%, coolant 127%,
toolpath_strategy 170%, tool_flutes 114%, machine_rigidity 40%, workholding 35%, spindle_hp 48%,
machine_way 26%, machine_build 25%, machine_weight 5%).

**9 axes INERT in both regimes** -- NOT automatically bugs; taxonomy for U-OSC-DEAD-AXIS-TRIAGE:
- BY-DESIGN inert on speed/feed: `controller_brand` (-> post-processor dialect only),
  `machine_accuracy` (-> tolerance/finish prediction only), likely `spindle_thru`.
- OPTIMIZER-INTERNALIZED in prism_optimized mode (the optimizer picks DOC, so operator ap/ae are
  advisory): `radial_pct` (ae/D), `axial_depth` (ap). Re-test under cost_batch/aggressive_rush.
- CONDITIONALLY-BINDING caps not exercised even at hi-RPM: `holder_runout`, `tool_holder_type`,
  `target_ra` (finish Ra cap -- the cap I added earlier DOES fire in its own 12 tests; PRISM's
  finish fz just sits below the cap for Ra 0.4-3.2 even at Ø3 finishing). Raise the regime to bind.
- CANDIDATE WIRING GAP (highest-suspicion): `controller_features` -- the orchestrator computes a
  `controller_smoothing_factor` from HSM/AICC/smoothing/EPC (SpeedFeedNineAxisOrchestratorEngine.ts
  ~695-702) but it does NOT move the headline rpm/feed/mrr. Read the recommendation-assembly to
  confirm whether the factor is applied or computed-then-dropped.

## Status vs goal
Clause 1 now has a REAL all-axis calculation sweep with max-variability evidence + an honest
live/inert verdict (was: only a 2-base liveness probe). Clause 2 (vs gwizard/hsmadvisor) =
explicit per-vendor published deltas (U-OSC-COMPARE-PER-VENDOR) + operator-gated live-calc note.

## Next units (queued)
1. **U-OSC-DEAD-AXIS-TRIAGE**: classify each of the 9 inert axes (read recommendation assembly);
   fix any genuine wiring gap (controller_features first). The sweep is the regression harness.
2. **U-OSC-FZ-FORCE-VALIDATE**: physics-reviewer force-envelope proof of the +67-91% fz finding
   ([[reference_oscar_sfc_per_vendor_compare_2026_06_09]]).

Related: [[reference_oscar_sfc_axis_liveness_map_2026_06_09]] (the prior 2-base probe this supersedes) ·
[[reference_oscar_sfc_per_vendor_compare_2026_06_09]] · [[reference_oscar_speedfeed_material_blind_diagnosis_2026_06_01]].
