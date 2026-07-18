# MCAT-MS0 — Machine Catalog Convergence (RGS Pipeline Output)

Generated: 2026-04-09 | Pipeline: RGS 10-stage + 10-agent scrutiny | Complexity: XL

## Brief
Unify 920 enriched machines into a canonical machine-package model powering calculator, Print to CNC, Program Release, and 20+ downstream consumers with user-owned shop profiles and PRISM mode auto-recommendations.

## 10-Agent Scrutiny Summary

| # | Agent | Finding | Severity |
|---|-------|---------|----------|
| 1 | Schema | Need CanonicalMachinePackage wrapper type | HIGH |
| 2 | Registry | MachinePackageGeneratorEngine ~2-3K LOC new; effort 2-3x underestimated | HIGH |
| 3 | Calculator | 15 tests break; need dual-path transition | HIGH |
| 4 | Consumers | 20+ engines consume machines (plan listed ~6) | HIGH |
| 5 | Tests | ~270 LOC missing across 6 test files | MEDIUM |
| 6 | Dependencies | P0-U04 skipped in execution order (critical bug); 40% parallelization available | CRITICAL |
| 7 | Data Quality | Only 0.5% complete (controller+spindle+coolant); 0/920 have confidence metadata | CRITICAL |
| 8 | PRISM Mode | 165 pts realistic; massive reusable infrastructure | OK |
| 9 | Frontend | 31 pages reference machines (not ~4) | HIGH |
| 10 | Safety | Missing 5 blocking hooks for bad machine data → G-code | HIGH |

## Session Map

| Session | Units | Phase | Parallel? | Key Deliverable |
|---------|-------|-------|-----------|-----------------|
| S1 | U-MCAT01, U-MCAT02 | P-1, P0 | Sequential | Data audit + CanonicalMachinePackage type |
| S2 | U-MCAT03, U-MCAT04 | P0 | Parallel | MachineLayerMerger + MachineTaxonomyNormalizer |
| S3 | U-MCAT05, U-MCAT06 | P-1 | Parallel | Controller backfill (→60%) + Spindle/coolant backfill (→50%) |
| S4 | U-MCAT07, U-MCAT08 | P1 | Sequential | MachineRegistry v2 + 5 safety hooks |
| S5 | U-MCAT09, U-MCAT10 | P1 | Sequential | MachinePackageGeneratorEngine (~2500 LOC) + 30+ tests |
| S6 | U-MCAT11, U-MCAT12 | P2 | Parallel | Calculator dual-path + machine-aware speed/feed |
| S7 | U-MCAT13, U-MCAT14 | P2 | Sequential | Cost integration + 3 new dispatcher actions |
| S8 | U-MCAT15, U-MCAT16 | P3 | Parallel | CAM strategy + post-processor machine-aware |
| S9 | U-MCAT17, U-MCAT18, U-MCAT19 | P3 | Parallel | Shop profiles + PRISM mode + frontend audit |
| S10 | U-MCAT20, U-MCAT21, U-MCAT22 | P4 | Sequential | E2E tests + perf benchmarks + docs |

## Critical Path
```
U-MCAT01 → U-MCAT02 → U-MCAT03 → U-MCAT07 → U-MCAT09 → U-MCAT11 → U-MCAT13 → U-MCAT20
```

## Forge-Triple Outputs

### 12 New Hooks
1. `pre-machine-spindle-limits` — SAFETY: blocks if RPM > spindle.max_rpm
2. `pre-machine-envelope-check` — SAFETY: blocks if part > machine envelope
3. `pre-machine-power-budget` — SAFETY: blocks if cutting power > spindle.power_continuous
4. `pre-machine-controller-compatibility` — SAFETY: warns if G-code unsupported by controller
5. `pre-machine-completeness-gate` — SAFETY: blocks calculator if data completeness < 50%
6. `pre-machine-package-physics-check` — validates power=torque*rpm/9549 relationship
7. `pre-machine-merge-no-data-loss` — ensures merged output >= input field count
8. `pre-taxonomy-coverage-gate` — blocks if >5% machines unclassified
9. `pre-spindle-value-range-check` — blocks physically impossible spindle values
10. `pre-machine-rate-sanity-check` — blocks if derived rate < $0.50 or > $15/min
11. `pre-shop-profile-machine-exists` — blocks binding to unknown machine ID
12. `pre-calculator-machine-resolution` — logs package vs heuristic path (telemetry)

### 6 New Dispatcher Actions
1. `prism_data:machine_package_get` — returns full CanonicalMachinePackage
2. `prism_data:machine_package_generate` — generates on-demand with overrides
3. `prism_data:machine_package_validate` — validates completeness + physics
4. `prism_business:shop_config_machines` — CRUD shop machine profiles
5. `prism_intelligence:machine_intelligence_recommend` — ranked machines for job
6. All `prism_calc` actions now accept optional `machine_id` parameter

## Enforcement Active During Execution
- PRE: knowledge-consult, context-retention
- POST: stub-detector, test-quality, constants-checker, physics-agent, wiring-agent
- COMPACT: review-gate, wiring-gate, forge-triple-gate, session-audit-agent
- POST-COMPACT: Feature Cascade → SESSION_ARTIFACTS.json

## Start Point
Session 1, Unit U-MCAT01: Data Quality Audit Script
