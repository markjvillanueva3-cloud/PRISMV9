# R2 Safety Phase — Test Suite Index

## Files
| File | Purpose | Status |
|------|---------|--------|
| golden-benchmarks.json | 50 golden benchmark calculations across 6 ISO groups, 20 calc types | ✅ Complete |
| run-benchmarks.js | Original test runner skeleton (T1, placeholder SKIP logic) | ✅ Superseded |
| run-benchmarks.ts | Wired test runner — calls engine functions directly via tsx (T2) | ✅ Complete |
| benchmark-results.json | Latest run results (JSON, auto-generated) | Auto |

## Coverage Matrix
| ISO Group | Benchmarks | Calc Types Covered |
|-----------|------------|-------------------|
| P (Steel) | B001-B008, B036, B038, B042-B043, B045-B046 | cutting_force, mrr, tool_life, surface_finish, trochoidal, chip_thinning, scallop, multi_pass, cost_optimize, power |
| M (Stainless) | B009-B014, B040, B049 | cutting_force, tool_life, surface_finish, thermal, deflection, speed_feed |
| K (Cast Iron) | B015-B019, B047 | cutting_force, mrr, tool_life, torque |
| N (Nonferrous) | B020-B024, B037, B048 | cutting_force, mrr, surface_finish, hsm, chip_load |
| S (Superalloy) | B025-B030, B044, B050 | cutting_force, thermal, tool_life, coolant_strategy, flow_stress |
| H (Hardened) | B031-B035 | cutting_force, tool_life, surface_finish, thermal |

## T2 Baseline Results (7 PASS / 43 FAIL / 0 ERROR)
| ISO Group | Total | Pass | Fail | Passing IDs |
|-----------|-------|------|------|-------------|
| P (Steel) | 16 | 2 | 14 | B038, B042 |
| M (Stainless) | 8 | 2 | 6 | B012, B013 |
| K (Cast Iron) | 6 | 1 | 5 | B047 |
| N (Nonferrous) | 7 | 1 | 6 | B023 |
| S (Superalloy) | 8 | 0 | 8 | — |
| H (Hardened) | 5 | 1 | 4 | B034 |

## Next Steps
- R2-MS0-T3: Analyze pass/fail baseline, categorize failure modes
- R2-MS1: Fix failures until ≥45/50 pass (90%)
