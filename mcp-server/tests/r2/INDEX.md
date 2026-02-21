# R2 Safety Phase — Test Suite Index

## Current Status: R2 COMPLETE (Ω=0.77, tag: r2-complete)

## Test Suites
| File | Purpose | Count | Status |
|------|---------|-------|--------|
| golden-benchmarks.json | 150 golden benchmark calculations across 6 ISO groups, 25+ calc types | 150 | ✅ 150/150 |
| run-benchmarks.ts | Wired test runner — calls engine functions directly via tsx | — | ✅ Active |
| benchmark-results.json | Latest run results (JSON, auto-generated) | 150 | ✅ Auto |
| spot-check.ts | Quick smoke test — 1 benchmark per ISO group | 6 | ✅ 6/6 |
| edge-cases.json | 20 edge case definitions across 5 categories | 20 | ✅ Complete |
| run-edge-cases.ts | Edge case runner with per-calc-type dispatchers | — | ✅ Active |
| edge-case-results.json | Latest edge case results (JSON, auto-generated) | 20 | ✅ 20/20 |

## Golden Benchmark Coverage Matrix (150 benchmarks)
| ISO Group | Count | Calc Types Covered |
|-----------|-------|-------------------|
| P (Steel) | ~30 | cutting_force, mrr, tool_life, surface_finish, trochoidal, chip_thinning, scallop, multi_pass, cost_optimize, power, torque, deflection, cycle_time, master_process_model |
| M (Stainless) | ~20 | cutting_force, tool_life, surface_finish, thermal, deflection, speed_feed, flow_stress |
| K (Cast Iron) | ~15 | cutting_force, mrr, tool_life, torque, coolant_strategy, master_process_model |
| N (Nonferrous) | ~20 | cutting_force, mrr, surface_finish, hsm, chip_load, trochoidal, master_process_model |
| S (Superalloy) | ~20 | cutting_force, thermal, tool_life, coolant_strategy, flow_stress, stability, master_process_model |
| H (Hardened) | ~15 | cutting_force, tool_life, surface_finish, thermal, residual_stress, grinding_energy, master_process_model |
| Cross-group | ~30 | stability, deflection, master_process_model, multi_physics |

## Spot Check Benchmarks (6 — one per ISO group)
| ID | ISO | Calc Type | Material |
|----|-----|-----------|----------|
| B001 | P | cutting_force | AISI 4140 Steel |
| B009 | M | cutting_force | AISI 316L Stainless |
| B015 | K | cutting_force | GG25 Gray Cast Iron |
| B022 | N | mrr | 6061-T6 Aluminum |
| B025 | S | cutting_force | Inconel 718 |
| B031 | H | cutting_force | AISI D2 60HRC |

## Edge Case Categories (20 scenarios)
| Category | Count | Examples |
|----------|-------|---------|
| Exotic materials | 4 | Ti-6Al-4V, copper, hardened D2, magnesium |
| Extreme parameters | 4 | Min feed (0.001mm/t), max speed (2000m/min), max depth, micro-machining |
| Boundary conditions | 4 | Zero speed, negative feed, NaN input, ae>D |
| Material-machine mismatches | 4 | Slow aluminum, slender hardened mill, fast Inconel, full-slot CI |
| Multi-physics coupling | 4 | Force→deflection, speed→thermal→life, stability, power |

## Key Engine Files
| Engine | Functions | Dispatcher |
|--------|-----------|------------|
| ManufacturingCalculations.ts | Kienzle, Taylor, MRR, surface finish, power, torque, chip load | calcDispatcher (25 actions) |
| AdvancedCalculations.ts | Stability, deflection, thermal, cost optimization | calcDispatcher |
| ToolpathCalculations.ts | Trochoidal, HSM, scallop, chip thinning, multi-pass, coolant, G-code | calcDispatcher |

## Response Level Support
| Dispatcher | response_level | formatByLevel |
|------------|---------------|---------------|
| calcDispatcher | ✅ Yes | pointer / summary / full |
| safetyDispatcher | ✅ Yes | pointer / summary / full |
| Other 29 dispatchers | ❌ No | Planned for R4 |

## R2 Milestone Trail
| Milestone | Score | Key Deliverable |
|-----------|-------|----------------|
| MS0 | 7/50 → 150 benchmarks | Initial benchmark framework |
| MS1 | 150/150 | Build fix, response_level, spot-check (Claude Code) |
| MS1.5 | Ralph 0.72 | Rz, TSC, material normalization |
| MS2 | 150/150 | All 6 tiers physics calibrated |
| MS3 | 20/20 | Edge cases + stability Re[G] fix |
| MS4 | Ω=0.77 | Phase gate passed |

## How to Run
```bash
# Full benchmark suite (150)
npx tsx tests/r2/run-benchmarks.ts

# Quick spot check (6)
npx tsx tests/r2/spot-check.ts

# Edge cases (20)
npx tsx tests/r2/run-edge-cases.ts
```
