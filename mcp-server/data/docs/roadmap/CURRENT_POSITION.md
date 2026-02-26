# CURRENT POSITION
## Updated: 2026-02-20T05:30:00Z

**Phase:** R2 Safety — MS0-T2 COMPLETE → MS0-T3 next
**Build:** 3.87MB clean
**Roadmap:** v17.0 (Claude Code Maximized)
**Last Commit:** R2-MS0-T2: Wire benchmarks to engine functions

## R2-MS0 Progress
- [x] T1: Create 50-calc test matrix (golden-benchmarks.json)
  - 50 benchmarks, 6 ISO groups (P/M/K/N/S/H), 20 calc types
  - Test runner skeleton: `node tests/r2/run-benchmarks.js`
- [x] T2: Wire each benchmark to engine functions
  - Wired runner: `npx tsx tests/r2/run-benchmarks.ts [--filter|--group|--calc|--verbose]`
  - 20 calc adapters (cutting_force, tool_life, mrr, surface_finish, thermal, etc.)
  - Direct engine imports via tsx (ManufacturingCalc, AdvancedCalc, ToolpathCalc, ThreadEngine)
  - Baseline: **7 PASS / 43 FAIL / 0 ERROR** (14% pass rate)
  - Passing: B012, B013, B023, B034, B038, B042, B047
- [ ] T3: Analyze pass/fail baseline, categorize failure modes (verifier, LIGHT)

## T2 Baseline Summary
| ISO Group | Total | Pass | Fail |
|-----------|-------|------|------|
| P (Steel) | 16 | 2 | 14 |
| M (Stainless) | 8 | 2 | 6 |
| K (Cast Iron) | 6 | 1 | 5 |
| N (Nonferrous) | 7 | 1 | 6 |
| S (Superalloy) | 8 | 0 | 8 |
| H (Hardened) | 5 | 1 | 4 |

## Model Routing (Active)
| Role | Model | Use For |
|------|-------|---------|
| safety-physics | Opus 4.6 | Physics validation, S(x) scoring |
| implementer | Sonnet 4.5 | Code changes, wiring, data processing |
| verifier | Haiku 4.5 | Test runs, regression checks, audits |

## Key Files This Phase
- tests/r2/golden-benchmarks.json (50 benchmarks)
- tests/r2/run-benchmarks.ts (wired test runner, T2)
- tests/r2/run-benchmarks.js (original skeleton, T1)
- tests/r2/benchmark-results.json (latest results, auto-generated)
- tests/r2/INDEX.md (coverage matrix + baseline)
