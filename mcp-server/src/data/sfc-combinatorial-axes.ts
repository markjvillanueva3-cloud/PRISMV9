/**
 * SFC combinatorial input axes — single canonical source of truth.
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-01-AXES-EXTRACT (slot:oscar, 2026-06-04).
 *
 * These are the variability axes the SFC accepts, extracted verbatim from
 * `__tests__/UltimateSpeedFeedEngine.variability.test.ts` so that the 103-case
 * variability matrix, the 401-assert gauntlet, AND the runtime combinatorial
 * harness (CombinatorialCellSampler) all enumerate the SAME axes instead of
 * three drifting copies. This module is PURE DATA — it imports only TYPES, never
 * `vitest` — so an engine can import it at runtime (the vitest assertion oracles
 * live in `__tests__/sfc/combinatorial-oracles.ts`, which is test-only).
 *
 * Sources: src/physics/constants.ts (ISO taxonomy + kc1.1) + Sandvik General
 * Turning catalogue (2024) for the Vc reference bands.
 */
import type {
  Operation,
  CutType,
  ToolMaterial,
  CoolantType,
} from "../engines/UltimateSpeedFeedEngine.js";
import type { ISOGroup } from "../physics/constants.js";

// Re-export the consumed types so a consumer can import axes + their types from one module.
export type { Operation, CutType, ToolMaterial, CoolantType, ISOGroup };

/** Toolpath strategy axis (mirrors the engine's accepted `strategy` union). */
export type Strategy =
  | "conventional"
  | "adaptive"
  | "trochoidal"
  | "hsm"
  | "hpc"
  | "plunge"
  | "slot";

/**
 * ISO group × representative material × expected Vc reference band on a 12 mm
 * carbide end-mill. Bands from the Sandvik General Turning catalogue (2024),
 * widened ±50% to accommodate the engine's strategy/cut-type modifiers. The
 * inline comments record the catalogue-typical (un-widened) range. Band =
 * [Vc_min, Vc_max] in m/min.
 */
export const ISO_BANDS: Array<{ iso: ISOGroup; representative: string; vcBand: [number, number] }> = [
  { iso: "P", representative: "steel",          vcBand: [ 50, 500] }, // 80-350 typical
  { iso: "M", representative: "stainless",      vcBand: [ 30, 350] }, // 60-200 typical
  { iso: "K", representative: "cast iron",      vcBand: [ 50, 500] }, // 100-350 typical
  { iso: "N", representative: "aluminum",       vcBand: [200,1500] }, // 400-1200 typical
  { iso: "S", representative: "titanium",       vcBand: [ 15, 250] }, // 30-80 typical
  { iso: "H", representative: "hardened steel", vcBand: [ 20, 300] }, // 50-150 typical
];

/** Tool material axis (6) — full carbide→PCD span the engine resolves. */
export const TOOL_MATERIALS: ToolMaterial[] = ["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"];

/** Operation axis (7) — full machining-operation taxonomy. */
export const OPERATIONS: Operation[] = [
  "milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling",
];

/** Cut-type axis (3). */
export const CUT_TYPES: CutType[] = ["roughing", "semi_finishing", "finishing"];

/** Toolpath strategy axis (7). */
export const STRATEGIES: Strategy[] = [
  "conventional", "adaptive", "trochoidal", "hsm", "hpc", "plunge", "slot",
];

/** Coolant axis (7). */
export const COOLANTS: CoolantType[] = [
  "flood", "mist", "mql", "air_blast", "dry", "through_tool", "cryogenic",
];

/** Tool-diameter sweep (mm), 1 → 80 — spans micro to face-mill scale. */
export const DIAMETER_SWEEP_MM = [1, 3, 6, 10, 12, 16, 20, 25, 50, 80];

/** Flute-count sweep, 2 → 8. */
export const FLUTE_SWEEP = [2, 3, 4, 5, 6, 7, 8];

/** Machine spindle-power tier sweep (kW), 3 → 30 — benchtop to production VMC. */
export const MACHINE_POWER_KW = [3, 7.5, 11, 15, 22, 30];

/** Hardness sweep (HB) within an ISO group, 150 → 420. */
export const HARDNESS_HB_SWEEP = [150, 180, 220, 280, 350, 420];
