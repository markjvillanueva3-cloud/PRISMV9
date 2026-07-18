/**
 * Sustainability & Energy Economics — canonical constants
 * =========================================================
 * Housed in a dedicated file (not `constants.ts`) to keep the critical-file
 * guard around CANONICAL_KIENZLE / CANONICAL_TAYLOR un-relaxed: those rail
 * coefficients live in `constants.ts` behind the "machining safety critical"
 * gate; sustainability factors are economic / regulatory and don't share
 * that risk surface, so they get their own canonical home.
 *
 * Per CLAUDE.md hard safety rail "NEVER inline physics constants" — these
 * are the canonical truth for `MachiningEnergyModelEngine`'s CO2 + cost
 * computations and the `calcActionSchemas.machining_energy_model` bounds.
 *
 * U-WIRE-ENERGY P2/P3 deferrals closed 2026-05-17 kilo (this file).
 */

/**
 * US national-grid average emission factor [kg CO2 / kWh].
 *
 * Source: EPA eGRID 2022 national average for delivered electricity
 *   = 0.42 kg CO2-equivalent per kWh (combined fossil + renewable mix).
 *
 * Used by `MachiningEnergyModelEngine` for the `co2_kg` output line; was
 * previously inlined as a magic `0.42` at MachiningEnergyModelEngine.ts:101.
 *
 * Shops outside the US grid or with on-site renewable generation should
 * override at the call site — the engine's `co2_kg` field is a US-grid
 * baseline; pass a job-specific factor through future input plumbing.
 */
export const GRID_CO2_KG_PER_KWH = 0.42;

/**
 * Default US industrial electricity rate [USD / kWh].
 *
 * Source: US EIA "Average Price of Electricity to Ultimate Customers by
 * End-Use Sector" — industrial-tier 12-mo trailing avg ≈ 0.085-0.12 USD/kWh
 * depending on region. 0.12 is the upper-mid sanity default used when the
 * caller omits `electricity_cost_per_kwh`. Previously inlined as a magic
 * `0.12` at MachiningEnergyModelEngine.ts:102.
 */
export const DEFAULT_ELECTRICITY_COST_USD_PER_KWH = 0.12;

/**
 * Hard upper bound on per-kWh electricity cost [USD / kWh].
 *
 * Sanity ceiling for schema validation — 2.5× the highest US residential
 * rate (HI/CA ~ $0.40/kWh) catches caller fat-fingers like passing MWh
 * price or millicents while leaving headroom for international/peak-demand
 * edge cases. Anything beyond $1.00/kWh is almost certainly a
 * unit-of-measure error.
 *
 * Used by calcActionSchemas `machining_energy_model.electricity_cost_per_kwh`
 * upper-bound.
 */
export const MAX_ELECTRICITY_COST_USD_PER_KWH = 1.0;

/**
 * Hard upper bound on `tool_changes` per part [count].
 *
 * Sanity ceiling — even the most tool-intensive mass-production jobs cap
 * around 1,000 tool changes per part (multi-axis mill-turn cells with
 * deep magazines). 10,000 catches a misconfigured loop, a units error
 * (passing total-changes-over-batch instead of per-part), or a typo while
 * leaving 10× headroom over realistic industrial use.
 *
 * Used by calcActionSchemas `machining_energy_model.machine.tool_changes`
 * upper-bound.
 */
export const MAX_TOOL_CHANGES_PER_PART = 10000;
