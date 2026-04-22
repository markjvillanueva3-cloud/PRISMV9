# MCAT-MS0 Exact Coverage Generators

Date: 2026-04-02  
Parent milestone: `MCAT-MS0`  
Lane: `MCAT-MS0 / P1-U01 support`  
Roadmap unit: `U-MVAR07`

Derived from:

- [MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_CANONICAL_LEGALITY_EXTRACT_2026-04-02.json)
- [MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_UNWIRED_SOURCE_RECOVERY_2026-04-02.json)
- [MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json](H:/PRISM/state/shared/MCAT_MS0_COVERAGE_METRIC_CONTRACT_2026-04-02.json)

## Intent

Turn the exact-denominator portion of MCAT coverage into machine-readable generators. This unit does not claim exhaustive proof by itself; it publishes the exact value domains, pair domains, and bundle classes that later sessions will score against.

## Summary

- Exact value domains generated: `15`
- Exact pair generators ready: `7`
- Deferred pair generators called out honestly: `5`
- Exact bundle generators ready: `6`

## Value Domains

- `machine_packages`: `920` values (exact_current)
- `machine_partitions`: `9` values (exact_current)
- `axis_topologies`: `15` values (exact_current)
- `controller_packages`: `41` values (exact_current)
- `spindle_interfaces`: `45` values (exact_current)
- `turret_interfaces`: `13` values (exact_current)
- `coolant_ids`: `7` values (exact_current)
- `machine_capability_ids`: `27` values (exact_current)
- `holder_signatures`: `51` values (exact_current)
- `holder_styles`: `6` values (exact_current)
- `programming_environments`: `66` values (exact_current)
- `toolpath_ids`: `337` values (exact_current)
- `calculator_tool_bundles`: `19` values (exact_current_with_known_gap)
- `calculator_material_states`: `40` values (exact_current_with_known_gap)
- `calculator_workholding_bundles`: `5` values (exact_current_with_known_gap)

## Ready Pair Generators

- `machine_x_configuration_bundle`: `920` legal pairs
- `machine_x_tooling_layout_topology`: `920` legal pairs
- `machine_x_holder_bundle`: `878` legal pairs
- `machine_x_coolant_set`: `920` legal pairs
- `controller_package_x_feature_set`: `112` legal pairs
- `spindle_package_x_holder_bundle`: `85` legal pairs
- `cam_environment_x_toolpath`: `337` legal pairs

## Deferred Pair Generators

- `holder_bundle_x_tool_bundle`: Tool corpus gap remains 13,967 active unique ids vs 95,608 intended, and there is not yet a canonical holder-to-tool compatibility matrix.
- `material_state_x_tool_bundle`: Material-to-tool legality is still limited by the reduced calculator tool bundle surface and unrecovered live tool corpus.
- `material_state_x_coolant_set`: Material coolant posture exists as recommendation data, but not yet as canonical legality edges over the full material master.
- `workholding_bundle_x_machine_partition`: Workholding remains fallback-first and has not yet been promoted into explicit legality edges by machine partition.
- `overlay_x_canonical_machine_package`: Persistence contract exists, but exact overlay corpus enumeration is deferred until more saved profiles are intentionally generated for coverage purposes.

## Bundle Generators

- `coolant_subsets`: `9` bundle classes (exact_current)
- `machine_feature_subsets`: `32` bundle classes (exact_current)
- `controller_feature_subsets`: `32` bundle classes (exact_current)
- `holder_style_subsets`: `7` bundle classes (exact_current)
- `software_binding_subsets`: `66` bundle classes (exact_current)
- `workholding_subsets`: `5` bundle classes (exact_current_with_known_gap)

## Current Blockers

- Material-to-tool legality and material-to-coolant legality remain blocked by reduced live tool coverage.
- Overlay coverage is contract-ready but not yet population-ready for exact denominator claims.
- Tool corpus gap remains 13,967 active unique ids vs 95,608 intended.
- Workholding legality is still fallback-first rather than canonical machine-partition truth.

## Output Posture

- exact generators are now reproducible through [mcat-exact-coverage-generators.mjs](H:/PRISM/scripts/mcat-exact-coverage-generators.mjs)
- later MCAT units can consume these exact denominators instead of rebuilding them ad hoc
- pair domains that still depend on unrecovered tool/workholding/material legality stay explicitly blocked instead of being guessed

## Next

- advance to `U-MVAR08`
- build weighted legality-aware `t=3/4/5` generators on top of these exact denominator sets
- keep promotion work focused on the blocked pair domains: tool corpus, workholding legality, and material-tool compatibility
