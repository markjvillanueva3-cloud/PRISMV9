/**
 * IPhysicsConstantsService — Service contract for canonical physics constants.
 * Wraps src/physics/constants.ts so engines don't inline physics values.
 *
 * CRITICAL: All methods return {value, unit, source} tuples, not bare numbers.
 * This preserves dimensional consistency across the entire engine stack.
 */

/** A physics constant with unit metadata for dimensional consistency */
export interface PhysicsConstant {
  value: number;
  unit: string;
  source: string;
}

/** Kienzle specific cutting force data per ISO material group */
export interface KienzleData {
  kc1_1: PhysicsConstant;
  mc: PhysicsConstant;
}

export interface IPhysicsConstantsService {
  /** Get Kienzle kc1.1 and mc for an ISO material group (P, M, K, N, S, H) */
  getKienzleData(isoGroup: string): KienzleData | undefined;

  /** Get a named thermal constant (e.g., CHIP_HEAT_FRACTION, TOOL_HEAT_FRACTION) */
  getThermalConstant(name: string): PhysicsConstant | undefined;

  /** Get a named stability constant */
  getStabilityConstant(name: string): PhysicsConstant | undefined;

  /** Get material thermal expansion coefficient by material group */
  getThermalExpansion(materialGroup: string): PhysicsConstant | undefined;

  /** Get Taylor tool life exponent for a material/tool combination */
  getTaylorExponent(materialGroup: string): PhysicsConstant | undefined;

  /** List all available constant names in a category */
  listConstants(category: "kienzle" | "thermal" | "stability" | "taylor"): string[];
}
