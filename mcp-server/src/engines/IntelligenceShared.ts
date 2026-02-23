/**
 * PRISM MCP Server - Intelligence Engine Shared Constants & Helpers
 *
 * Shared utilities used across all intelligence sub-engines.
 * Extracted to avoid circular dependencies between IntelligenceEngine.ts
 * (the dispatcher) and the sub-engine modules it imports from.
 *
 * Contents:
 *   INTELLIGENCE_SAFETY_LIMITS - Safety gate check constants
 *   DEFAULT_TOOL               - Default tool geometry
 *   mapIsoToKienzleGroup()     - ISO → Kienzle key mapping
 *   mapIsoToTaylorGroup()      - ISO → Taylor key mapping
 *   validateRequiredFields()   - Input validation helper
 */

// ============================================================================
// SAFETY LIMITS (mirrors ManufacturingCalculations but used for gate checks)
// ============================================================================

export const INTELLIGENCE_SAFETY_LIMITS = {
  MAX_CUTTING_SPEED: 2000,
  MAX_FEED_PER_TOOTH: 2.0,
  MAX_AXIAL_DEPTH: 100,
  MAX_POWER_KW: 500,
  MIN_TOOL_LIFE_WARN: 15,
  MIN_TOOL_LIFE_HARD: 5,
} as const;

// ============================================================================
// DEFAULT TOOL GEOMETRY (used when no tool_id is provided)
// ============================================================================

export const DEFAULT_TOOL = {
  diameter: 12,
  number_of_teeth: 4,
  nose_radius: 0.8,
  tool_material: "Carbide" as const,
  overhang_length: 40,
};

// ============================================================================
// ISO GROUP MAPPING HELPERS
// ============================================================================

/** Map ISO material group letter to Kienzle default lookup key. */
export function mapIsoToKienzleGroup(isoGroup: string): string {
  const map: Record<string, string> = {
    P: "steel_medium_carbon",
    M: "stainless_austenitic",
    K: "cast_iron_gray",
    N: "aluminum_wrought",
    S: "titanium",
    H: "steel_high_carbon",
    X: "steel_alloy",
  };
  return map[isoGroup] || "steel_medium_carbon";
}

/** Map ISO material group letter to Taylor default lookup key. */
export function mapIsoToTaylorGroup(isoGroup: string): string {
  const map: Record<string, string> = {
    P: "steel",
    M: "stainless",
    K: "cast_iron",
    N: "aluminum",
    S: "titanium",
    H: "steel",
    X: "steel",
  };
  return map[isoGroup] || "steel";
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that required fields exist on a params object. Throws with a
 * clear message identifying the action and the missing field.
 */
export function validateRequiredFields(
  actionName: string,
  params: Record<string, any>,
  fields: string[]
): void {
  for (const field of fields) {
    if (params[field] === undefined || params[field] === null) {
      throw new Error(
        `[IntelligenceEngine] ${actionName}: missing required field "${field}"`
      );
    }
  }
}
