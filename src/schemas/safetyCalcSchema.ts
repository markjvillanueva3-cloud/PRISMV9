/**
 * PRISM MCP Server - Safety Calculation Schema
 * Physically-bounded JSON schema for structured output enforcement.
 * 
 * All upper bounds are based on manufacturing reality:
 *   Vc <= 2000: Fastest aluminum HSM. Above = unit error or overflow.
 *   fz <= 10:   Covers roughing inserts. Above = physically impossible.
 *   ap <= 100:  Covers deep slotting. Above = no standard tool exists.
 *   Fc <= 100000: Covers heavy roughing. Above = machine structural limit.
 *   n_rpm <= 100000: Covers micro-tools at high speed.
 *   tool_life <= 10000: ~167 hours. Above = unrealistic for any insert.
 * 
 * All cutting params are REQUIRED — prevents safety-approved empty recommendations.
 * exclusiveMinimum:0 rejects physically meaningless values (stopped spindle, stalled tool).
 * 
 * @module schemas/safetyCalcSchema
 * @safety CRITICAL — Schema-guaranteed response structure for safety calcs.
 */

/**
 * JSON Schema for safety-critical calculation responses.
 * Used with Anthropic API output_config.format for structured outputs.
 */
export const SAFETY_CALC_SCHEMA = {
  type: 'object' as const,
  properties: {
    Vc: { type: 'number' as const, exclusiveMinimum: 0, maximum: 2000 },
    fz: { type: 'number' as const, exclusiveMinimum: 0, maximum: 10 },
    ap: { type: 'number' as const, exclusiveMinimum: 0, maximum: 100 },
    Fc: { type: 'number' as const, exclusiveMinimum: 0, maximum: 100000 },
    n_rpm: { type: 'number' as const, exclusiveMinimum: 0, maximum: 100000 },
    tool_life_min: { type: 'number' as const, exclusiveMinimum: 0, maximum: 10000 },
    safety_score: { type: 'number' as const, minimum: 0, maximum: 1.0 },
    warnings: { type: 'array' as const, items: { type: 'string' as const } },
    material: { type: 'string' as const, minLength: 1 },
    operation: { type: 'string' as const, minLength: 1 },
    meta: {
      type: 'object' as const,
      properties: {
        model: { type: 'string' as const, minLength: 1 },
        formula_version: { type: 'string' as const, minLength: 1 },
        data_version: { type: 'string' as const, minLength: 1 },
        timestamp: { type: 'string' as const, minLength: 1 },
      },
      required: ['model', 'formula_version', 'data_version', 'timestamp'],
      additionalProperties: false,
    },
  },
  required: ['Vc', 'fz', 'ap', 'safety_score', 'material', 'operation', 'meta'],
  additionalProperties: false,
} as const;

/** TypeScript type derived from the schema for compile-time checking */
export interface SafetyCalcResult {
  Vc: number;
  fz: number;
  ap: number;
  Fc?: number;
  n_rpm?: number;
  tool_life_min?: number;
  safety_score: number;
  warnings?: string[];
  material: string;
  operation: string;
  meta: {
    model: string;
    formula_version: string;
    data_version: string;
    timestamp: string;
  };
}
