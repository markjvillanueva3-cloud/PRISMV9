/**
 * depreciation-tables.ts — canonical depreciation rate tables for the PRISM ERP (galaxy:business).
 *
 * Imported by FixedAssetDepreciationEngine — NEVER inline a MACRS percentage in engine code
 * (financial-invariant / anti-pattern #1: these are statutory IRS values, tax-basis-critical; a
 * stale/typo'd inlined rate = wrong tax basis = real exposure). Single source of truth.
 *
 * Source: IRS Publication 946, Table A-1 — GDS (General Depreciation System), 200% declining
 * balance switching to straight-line, HALF-YEAR convention. Stored as decimal fractions of the
 * depreciable basis per recovery year; each class's fractions sum to 1.0000 (full basis recovered).
 * ⚠ Mid-quarter convention (Table A-2..A-5) is NOT included — add per asset placed-in-service
 * timing if >40% of basis was placed in Q4 (the mid-quarter trigger). The engine THROWS on an
 * unknown class life rather than guess.
 */

export const DEPRECIATION_TABLES_SCHEMA_VERSION = "1.0.0";

/** MACRS GDS 200%DB half-year convention, by recovery period (years). Decimal fractions of basis. */
export const MACRS_GDS_HALF_YEAR: Readonly<Record<number, readonly number[]>> = Object.freeze({
  3: [0.3333, 0.4445, 0.1481, 0.0741],
  5: [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576],
  7: [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
  10: [0.1, 0.18, 0.144, 0.1152, 0.0922, 0.0737, 0.0655, 0.0655, 0.0656, 0.0655, 0.0328],
  15: [0.05, 0.095, 0.0855, 0.077, 0.0693, 0.0623, 0.059, 0.059, 0.0591, 0.059, 0.0591, 0.059, 0.0591, 0.059, 0.0591, 0.0295],
  20: [0.0375, 0.07219, 0.06677, 0.06177, 0.05713, 0.05285, 0.04888, 0.04522, 0.04462, 0.04461, 0.04462, 0.04461, 0.04462, 0.04461, 0.04462, 0.04461, 0.04462, 0.04461, 0.04462, 0.04461, 0.02231],
});

/** Common shop-asset MACRS class lives (IRS Pub 946 Appendix B asset classes). Advisory map. */
export const MACRS_ASSET_CLASS_HINTS: Readonly<Record<string, number>> = Object.freeze({
  computers: 5,
  office_equipment: 7,
  cnc_machine_tool: 7, // "metalworking machinery" asset class 34.0 → 7-yr GDS
  vehicles_light: 5,
  furniture_fixtures: 7,
  land_improvements: 15,
  building_nonresidential: 39, // straight-line / mid-month — NOT in the GDS DB table above; use straightLine
});

export function getMacrsSchedule(recoveryYears: number): readonly number[] {
  const t = MACRS_GDS_HALF_YEAR[recoveryYears];
  if (!t) {
    throw new Error(
      `[depreciation] no MACRS GDS half-year table for ${recoveryYears}-year property. ` +
        `Known: ${Object.keys(MACRS_GDS_HALF_YEAR).join(", ")}. (39-yr real property uses straight-line mid-month — use straightLine, not MACRS.)`
    );
  }
  return t;
}
