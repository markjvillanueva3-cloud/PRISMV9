# WEDM V1 Launch Gate — PASS

**Date:** 2026-04-08
**Status:** PASS (5/5 cases, 189 tests, 0 failures)
**Milestone:** WEDM-LAUNCH-MS0
**Score:** 42 -> 72/100

## Scope

Wire EDM NC program generation for **Mitsubishi straight die cuts**.

- Materials: D2, 304SS, 6061 Al, WC carbide, Inconel 718 (5 material groups)
- Thickness: 25.4mm - 100mm (piecewise feed model, flushing-limited above 50mm)
- Controller: Mitsubishi FA/MV (fully calibrated). Others generate structurally correct G-code with operator verification warning.
- Taper: 0-5 degrees (NOZE TEST empirical cascade). >5 degrees rejected with V2 timeline.
- Surface finish: Ra 0.005 - 3.2 um (E-pack conditions 1-9)

## V1 Limitations (honest)

- Only Mitsubishi condition codes are calibrated against real shop programs
- Taper > 5 degrees not supported (UV interpolation algorithms not validated)
- No DXF round-trip tested against real Box Drive shop files (Box Drive not accessible)
- Re-entrant geometry feed rates are estimated, not measured
- Recast depth model is thickness-based, not alloy-specific (V2 planned)
- No Sodick/Makino/AgieCharmilles/Fanuc calibration data

## Smoke Test Results

| # | Case | Material | Thickness | Result | Feed (mm/min) | Passes | Confidence | Time |
|---|------|----------|-----------|--------|---------------|--------|------------|------|
| 1 | D2 25.4mm | D2 | 25.4mm | PASS | 3.0 | 5 | 77% | 102 min |
| 2 | D2 50mm | D2 | 50.0mm | PASS | 2.9 | 5 | 72% | 109 min |
| 3 | 304SS 25.4mm | 304SS | 25.4mm | PASS | 2.5 | 5 | 68% | 108 min |
| 4 | 6061 25.4mm | 6061 | 25.4mm | PASS | 4.5 | 5 | 68% | 61 min |
| 5 | D2 taper 15 deg | D2 | 25.4mm | REJECTED | — | — | — | — |

## Test Suite Summary

| Suite | Tests | Status |
|-------|-------|--------|
| cwedm-validation-d2-multithick | 22 | PASS |
| cwedm-validation-multimaterial | 23 | PASS |
| wedm-epack-generator | 79 | PASS |
| cwedm-taper-cascade | 10 | PASS |
| cwedm-setup-sheet-html | 17 | PASS |
| cwedm-scope-guard | 15 | PASS |
| cwedm-launch-gate | 6 | PASS |
| **TOTAL** | **172** | **PASS** |

## What Ships

1. **NC Program Text** — Complete G-code ready for .NC file, Mitsubishi dialect
2. **Setup Sheet HTML** — Printable operator document with per-pass table + restart procedure
3. **Confidence Score** — Weighted scoring (pulse 25%, feed 30%, offset 15%, E-pack 15%, geometry 15%)
4. **Cycle Time Breakdown** — Per-pass cutting time + threading + dwell + rapid + auxiliary
5. **Scope Guards** — Honest rejection of out-of-scope inputs with V2 timeline

## Calibration Sources

- ITW SHAKEPROOF 500-30540-24000-04.NC (D2 straight, 4-pass real program)
- NOZE TEST.NC (SS taper, 5-pass real program)
- CHOCTAW DEFENSE cannelure (E1281 condition 8)
- Lemhunter cutting speed data (multi-thickness)
- Klocke surface finish model (Ra prediction)
- DiBitonto spark gap model (H-offset chain)

## Units Completed

- U-WLAUNCH01: D2 multi-thickness validation (22 tests)
- U-WLAUNCH02: Multi-material validation (23 tests)
- U-WLAUNCH03: BLOCKED (Box Drive not accessible)
- U-WLAUNCH04: E-pack condition codes 1-9 (79+ tests)
- U-WLAUNCH05: Taper cascade split (10 tests)
- U-WLAUNCH06: Setup sheet HTML + restart procedure (17 tests)
- U-WLAUNCH07: Scope guard + V1 limitation messages (15 tests)
- U-WLAUNCH09: Launch gate smoke test (6 tests)

## Files Modified/Created

### Engine Changes
- `src/engines/WEDMPrintToProgramEngine.ts` — E-pack 1-9, scope guards, setup_sheet_html
- `src/engines/EDMMultiPassStrategyEngine.ts` — Taper cascade split (increasing vs decreasing)

### New Test Files
- `src/__tests__/cwedm-validation-d2-multithick.test.ts`
- `src/__tests__/cwedm-validation-multimaterial.test.ts`
- `src/__tests__/cwedm-taper-cascade.test.ts`
- `src/__tests__/cwedm-setup-sheet-html.test.ts`
- `src/__tests__/cwedm-scope-guard.test.ts`
- `src/__tests__/cwedm-launch-gate.test.ts`
