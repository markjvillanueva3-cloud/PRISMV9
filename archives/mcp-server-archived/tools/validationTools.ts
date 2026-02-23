/**
 * PRISM MCP Server - Validation Tools
 * Session 6.1: MCP Tools for Input/Output Validation
 * 
 * Tools:
 * - validate_material: Full material validation (safety + completeness)
 * - validate_kienzle: Kienzle coefficient validation
 * - validate_taylor: Taylor coefficient validation
 * - validate_johnson_cook: Johnson-Cook parameter validation
 * - validate_safety: Compute S(x) safety score
 * - validate_completeness: Check parameter coverage
 * - validate_anti_regression: Check before file replacement
 * 
 * @version 1.0.0
 */

import { z } from "zod";
import {
  validateKienzle,
  validateTaylor,
  validateJohnsonCook,
  computeSafetyScore,
  checkMaterialCompleteness,
  checkAntiRegression,
  validateMaterial,
  ValidationResult,
  SafetyResult,
  RegressionCheckResult,
  KIENZLE_RANGES,
  TAYLOR_RANGES,
  SAFETY_THRESHOLD,
  COMPLETENESS_THRESHOLD,
  REGRESSION_THRESHOLD
} from "../utils/validators.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const;

const ValidateMaterialSchema = z.object({
  material: z.record(z.unknown()).describe("Material object with parameters to validate"),
  strict: z.boolean().optional().default(true).describe("Require all critical fields")
});

const ValidateKienzleSchema = z.object({
  kc1_1: z.number().describe("Specific cutting force kc1.1 [N/mm²]"),
  mc: z.number().describe("Kienzle exponent mc"),
  iso_group: z.enum(ISO_GROUPS).describe("ISO material group (P, M, K, N, S, H)")
});

const ValidateTaylorSchema = z.object({
  C: z.number().describe("Taylor constant C [m/min]"),
  n: z.number().describe("Taylor exponent n"),
  iso_group: z.enum(ISO_GROUPS).describe("ISO material group (P, M, K, N, S, H)")
});

const ValidateJohnsonCookSchema = z.object({
  A: z.number().describe("Initial yield stress [MPa]"),
  B: z.number().describe("Hardening modulus [MPa]"),
  n: z.number().describe("Strain hardening exponent"),
  C: z.number().describe("Strain rate coefficient"),
  m: z.number().describe("Thermal softening exponent"),
  yield_strength: z.number().optional().describe("Material yield strength for validation [MPa]"),
  tensile_strength: z.number().optional().describe("Material tensile strength for validation [MPa]")
});

const ValidateSafetySchema = z.object({
  material: z.record(z.unknown()).describe("Material object to compute S(x) for")
});

const ValidateCompletenessSchema = z.object({
  material: z.record(z.unknown()).describe("Material object to check completeness"),
  threshold: z.number().optional().default(COMPLETENESS_THRESHOLD)
    .describe("Minimum completeness threshold (default: 0.80)")
});

const ValidateAntiRegressionSchema = z.object({
  old_content: z.string().describe("Original file content"),
  new_content: z.string().describe("New file content to compare"),
  file_type: z.string().describe("File extension or type (json, md, ts, js)")
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const validationTools = {
  // ==========================================================================
  // validate_material
  // ==========================================================================
  validate_material: {
    name: "validate_material",
    description: `Comprehensive material validation combining safety score and completeness check.

Returns:
- valid: boolean (true if passes all checks)
- safety: S(x) score with component breakdown
- completeness: Parameter coverage percentage
- issues: List of validation issues

Safety threshold: S(x) ≥ ${SAFETY_THRESHOLD}
Completeness threshold: ≥ ${COMPLETENESS_THRESHOLD * 100}%

Use this before adding any material to the database.`,
    
    schema: ValidateMaterialSchema,
    
    handler: async (params: z.infer<typeof ValidateMaterialSchema>): Promise<{
      success: boolean;
      valid: boolean;
      safety: SafetyResult;
      completeness: {
        percentage: number;
        filled: number;
        total: number;
        missing: string[];
        level: string;
      };
      issues: Array<{ field: string; message: string; severity: string }>;
      summary: string;
    }> => {
      try {
        log.info(`validate_material: ${params.material.material_id || "unknown"}`);
        
        const result = validateMaterial(params.material);
        
        let summary = "";
        if (result.valid) {
          summary = `✅ Material VALID: S(x)=${result.safety.score.toFixed(3)}, Coverage=${(result.completeness.percentage * 100).toFixed(1)}%`;
        } else {
          const reasons: string[] = [];
          if (result.safety.status === "BLOCKED") reasons.push(`S(x)=${result.safety.score.toFixed(3)} BLOCKED`);
          if (result.completeness.percentage < COMPLETENESS_THRESHOLD) reasons.push(`Coverage ${(result.completeness.percentage * 100).toFixed(1)}% below ${COMPLETENESS_THRESHOLD * 100}%`);
          summary = `❌ Material INVALID: ${reasons.join(", ")}`;
        }

        return {
          success: true,
          valid: result.valid,
          safety: result.safety,
          completeness: result.completeness,
          issues: result.issues.map(i => ({ field: i.field, message: i.message, severity: i.severity })),
          summary
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`validate_material error: ${error}`);
        return {
          success: false,
          valid: false,
          safety: { score: 0, status: "BLOCKED", components: {} as any, issues: [error], threshold: SAFETY_THRESHOLD },
          completeness: { percentage: 0, filled: 0, total: 0, missing: [], level: "ERROR" },
          issues: [{ field: "error", message: error, severity: "error" }],
          summary: `Error: ${error}`
        };
      }
    }
  },

  // ==========================================================================
  // validate_kienzle
  // ==========================================================================
  validate_kienzle: {
    name: "validate_kienzle",
    description: `Validate Kienzle cutting force coefficients against expected ranges.

Kienzle equation: Fc = kc1.1 × h^mc × b

Expected ranges by ISO group:
- P (Steel): kc1.1 [1400-2500], mc [0.18-0.30]
- M (Stainless): kc1.1 [2000-3200], mc [0.22-0.32]
- K (Cast Iron): kc1.1 [800-1400], mc [0.20-0.30]
- N (Non-ferrous): kc1.1 [400-900], mc [0.20-0.35]
- S (Superalloy): kc1.1 [2400-4000], mc [0.22-0.30]
- H (Hardened): kc1.1 [2800-4500], mc [0.20-0.28]

Returns validity status and deviation from expected range.`,
    
    schema: ValidateKienzleSchema,
    
    handler: async (params: z.infer<typeof ValidateKienzleSchema>): Promise<{
      success: boolean;
      result: ValidationResult;
      expected_ranges: { kc1_1: [number, number]; mc: [number, number] };
      summary: string;
    }> => {
      try {
        log.info(`validate_kienzle: kc1.1=${params.kc1_1}, mc=${params.mc}, ISO=${params.iso_group}`);
        
        const result = validateKienzle(params.kc1_1, params.mc, params.iso_group);
        const ranges = KIENZLE_RANGES[params.iso_group] || KIENZLE_RANGES.P;

        let summary: string;
        if (result.valid && result.issues.length === 0) {
          summary = `✅ Kienzle VALID: kc1.1=${params.kc1_1} mc=${params.mc} within range for ISO ${params.iso_group}`;
        } else if (result.valid) {
          summary = `⚠️ Kienzle WARNING: ${result.issues.map(i => i.message).join("; ")}`;
        } else {
          summary = `❌ Kienzle INVALID: ${result.issues.map(i => i.message).join("; ")}`;
        }

        return {
          success: true,
          result,
          expected_ranges: ranges,
          summary
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`validate_kienzle error: ${error}`);
        return {
          success: false,
          result: { valid: false, status: "invalid", issues: [{ field: "error", message: error, severity: "error" }] },
          expected_ranges: KIENZLE_RANGES.P,
          summary: `Error: ${error}`
        };
      }
    }
  },

  // ==========================================================================
  // validate_taylor
  // ==========================================================================
  validate_taylor: {
    name: "validate_taylor",
    description: `Validate Taylor tool life coefficients against expected ranges.

Taylor equation: V × T^n = C

Expected ranges by ISO group:
- P (Steel): C [150-400], n [0.15-0.35]
- M (Stainless): C [80-250], n [0.12-0.28]
- K (Cast Iron): C [200-500], n [0.20-0.40]
- N (Non-ferrous): C [400-1200], n [0.25-0.50]
- S (Superalloy): C [30-120], n [0.10-0.25]
- H (Hardened): C [50-200], n [0.12-0.25]

Returns validity status and deviation from expected range.`,
    
    schema: ValidateTaylorSchema,
    
    handler: async (params: z.infer<typeof ValidateTaylorSchema>): Promise<{
      success: boolean;
      result: ValidationResult;
      expected_ranges: { C: [number, number]; n: [number, number] };
      summary: string;
    }> => {
      try {
        log.info(`validate_taylor: C=${params.C}, n=${params.n}, ISO=${params.iso_group}`);
        
        const result = validateTaylor(params.C, params.n, params.iso_group);
        const ranges = TAYLOR_RANGES[params.iso_group] || TAYLOR_RANGES.P;

        let summary: string;
        if (result.valid && result.issues.length === 0) {
          summary = `✅ Taylor VALID: C=${params.C} n=${params.n} within range for ISO ${params.iso_group}`;
        } else if (result.valid) {
          summary = `⚠️ Taylor WARNING: ${result.issues.map(i => i.message).join("; ")}`;
        } else {
          summary = `❌ Taylor INVALID: ${result.issues.map(i => i.message).join("; ")}`;
        }

        return {
          success: true,
          result,
          expected_ranges: ranges,
          summary
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`validate_taylor error: ${error}`);
        return {
          success: false,
          result: { valid: false, status: "invalid", issues: [{ field: "error", message: error, severity: "error" }] },
          expected_ranges: TAYLOR_RANGES.P,
          summary: `Error: ${error}`
        };
      }
    }
  },

  // ==========================================================================
  // validate_johnson_cook
  // ==========================================================================
  validate_johnson_cook: {
    name: "validate_johnson_cook",
    description: `Validate Johnson-Cook constitutive model parameters for physical consistency.

Johnson-Cook equation: σ = (A + B×ε^n)(1 + C×ln(ε̇*))(1 - T*^m)

Validation checks:
- A should approximate yield strength (±30%)
- A + B should approximate tensile strength (±30%)
- n should be 0 < n < 1 (strain hardening)
- C typically 0-0.2 (strain rate sensitivity)
- m typically 0.3-2.0 (thermal softening)

Provide yield/tensile strength for cross-validation.`,
    
    schema: ValidateJohnsonCookSchema,
    
    handler: async (params: z.infer<typeof ValidateJohnsonCookSchema>): Promise<{
      success: boolean;
      result: ValidationResult;
      cross_validation: {
        a_vs_yield?: { expected: number; actual: number; deviation: number };
        ab_vs_tensile?: { expected: number; actual: number; deviation: number };
      };
      summary: string;
    }> => {
      try {
        log.info(`validate_johnson_cook: A=${params.A}, B=${params.B}, n=${params.n}, C=${params.C}, m=${params.m}`);
        
        const result = validateJohnsonCook(
          params.A, params.B, params.n, params.C, params.m,
          params.yield_strength, params.tensile_strength
        );

        const crossValidation: any = {};
        if (params.yield_strength) {
          crossValidation.a_vs_yield = {
            expected: params.yield_strength,
            actual: params.A,
            deviation: Math.abs(params.A - params.yield_strength) / params.yield_strength
          };
        }
        if (params.tensile_strength) {
          crossValidation.ab_vs_tensile = {
            expected: params.tensile_strength,
            actual: params.A + params.B,
            deviation: Math.abs(params.A + params.B - params.tensile_strength) / params.tensile_strength
          };
        }

        let summary: string;
        if (result.valid && result.issues.length === 0) {
          summary = `✅ Johnson-Cook VALID: A=${params.A}, B=${params.B}, n=${params.n}, C=${params.C}, m=${params.m}`;
        } else if (result.valid) {
          summary = `⚠️ Johnson-Cook WARNING: ${result.issues.map(i => i.message).join("; ")}`;
        } else {
          summary = `❌ Johnson-Cook INVALID: ${result.issues.map(i => i.message).join("; ")}`;
        }

        return {
          success: true,
          result,
          cross_validation: crossValidation,
          summary
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`validate_johnson_cook error: ${error}`);
        return {
          success: false,
          result: { valid: false, status: "invalid", issues: [{ field: "error", message: error, severity: "error" }] },
          cross_validation: {},
          summary: `Error: ${error}`
        };
      }
    }
  },

  // ==========================================================================
  // validate_safety
  // ==========================================================================
  validate_safety: {
    name: "validate_safety",
    description: `Compute S(x) safety score for a material.

Safety score components (weighted):
- physical_limits (0.20): Density, melting point ranges
- force_safety (0.20): Kienzle coefficient validity
- thermal_safety (0.15): Thermal conductivity, specific heat
- tool_life (0.15): Taylor coefficient validity
- machine_capability (0.15): Speed recommendations
- edge_cases (0.15): Hardness ranges, conditions

Returns:
- score: 0-1 weighted safety score
- status: APPROVED (≥0.70), WARNING (0.60-0.69), BLOCKED (<0.60)
- components: Breakdown of each component score
- issues: List of safety concerns

THRESHOLD: S(x) ≥ ${SAFETY_THRESHOLD} required for approval.`,
    
    schema: ValidateSafetySchema,
    
    handler: async (params: z.infer<typeof ValidateSafetySchema>): Promise<{
      success: boolean;
      safety: SafetyResult;
      summary: string;
    }> => {
      try {
        const materialId = params.material.material_id || "unknown";
        log.info(`validate_safety: ${materialId}`);
        
        const safety = computeSafetyScore(params.material);

        let summary: string;
        if (safety.status === "APPROVED") {
          summary = `✅ Safety APPROVED: S(x)=${safety.score.toFixed(3)} (threshold: ${SAFETY_THRESHOLD})`;
        } else if (safety.status === "WARNING") {
          summary = `⚠️ Safety WARNING: S(x)=${safety.score.toFixed(3)} near threshold ${SAFETY_THRESHOLD}`;
        } else {
          summary = `🛑 Safety BLOCKED: S(x)=${safety.score.toFixed(3)} below threshold ${SAFETY_THRESHOLD}`;
        }

        return {
          success: true,
          safety,
          summary
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`validate_safety error: ${error}`);
        return {
          success: false,
          safety: { 
            score: 0, 
            status: "BLOCKED", 
            components: {} as any, 
            issues: [error], 
            threshold: SAFETY_THRESHOLD 
          },
          summary: `Error: ${error}`
        };
      }
    }
  },

  // ==========================================================================
  // validate_completeness
  // ==========================================================================
  validate_completeness: {
    name: "validate_completeness",
    description: `Check material parameter completeness against 127-parameter schema.

Parameter categories:
- Critical (11): material_id, name, iso_group, density, tensile_strength, yield_strength, hardness, kc1.1, mc
- Important (13): standard, uns_number, thermal properties, Taylor coefficients, finishing coefficients
- Optional (varies): Johnson-Cook, machinability ratings, recommendations

Returns:
- percentage: Overall coverage (0-1)
- filled: Number of parameters populated
- total: Total expected parameters
- missing: List of missing parameters
- level: COMPLETE (≥95%), ACCEPTABLE (≥80%), INCOMPLETE (<80%), INCOMPLETE_CRITICAL

THRESHOLD: ${COMPLETENESS_THRESHOLD * 100}% minimum required.`,
    
    schema: ValidateCompletenessSchema,
    
    handler: async (params: z.infer<typeof ValidateCompletenessSchema>): Promise<{
      success: boolean;
      completeness: {
        percentage: number;
        filled: number;
        total: number;
        missing: string[];
        level: string;
      };
      passes_threshold: boolean;
      summary: string;
    }> => {
      try {
        const materialId = params.material.material_id || "unknown";
        log.info(`validate_completeness: ${materialId}`);
        
        const completeness = checkMaterialCompleteness(params.material);
        const passesThreshold = completeness.percentage >= params.threshold;

        let summary: string;
        if (completeness.level === "COMPLETE") {
          summary = `✅ Completeness COMPLETE: ${(completeness.percentage * 100).toFixed(1)}% (${completeness.filled}/${completeness.total})`;
        } else if (completeness.level === "ACCEPTABLE") {
          summary = `✅ Completeness ACCEPTABLE: ${(completeness.percentage * 100).toFixed(1)}% (${completeness.filled}/${completeness.total})`;
        } else if (completeness.level === "INCOMPLETE_CRITICAL") {
          summary = `❌ INCOMPLETE_CRITICAL: Missing critical fields - ${completeness.missing.slice(0, 5).join(", ")}`;
        } else {
          summary = `⚠️ Completeness INCOMPLETE: ${(completeness.percentage * 100).toFixed(1)}% below threshold ${params.threshold * 100}%`;
        }

        return {
          success: true,
          completeness,
          passes_threshold: passesThreshold,
          summary
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`validate_completeness error: ${error}`);
        return {
          success: false,
          completeness: { percentage: 0, filled: 0, total: 0, missing: [], level: "ERROR" },
          passes_threshold: false,
          summary: `Error: ${error}`
        };
      }
    }
  },

  // ==========================================================================
  // validate_anti_regression
  // ==========================================================================
  validate_anti_regression: {
    name: "validate_anti_regression",
    description: `Check for data loss before file replacement.

Anti-regression rule: new_count >= old_count

Counts items based on file type:
- JSON: Array length or object keys (materials, machines, alarms, etc.)
- Markdown: Section count (## headers)
- TypeScript/JS: Export count

Returns:
- safe: boolean (true if no data loss)
- oldCount/newCount: Item counts
- difference: Change in count
- percentChange: Percentage change
- message: Human-readable result

BLOCKS if count decreases by more than ${REGRESSION_THRESHOLD * 100}%.

Use this BEFORE any file replacement operation.`,
    
    schema: ValidateAntiRegressionSchema,
    
    handler: async (params: z.infer<typeof ValidateAntiRegressionSchema>): Promise<{
      success: boolean;
      result: RegressionCheckResult;
      summary: string;
    }> => {
      try {
        log.info(`validate_anti_regression: file_type=${params.file_type}`);
        
        const result = checkAntiRegression(
          params.old_content,
          params.new_content,
          params.file_type
        );

        return {
          success: true,
          result,
          summary: result.message
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`validate_anti_regression error: ${error}`);
        return {
          success: false,
          result: {
            safe: false,
            oldCount: 0,
            newCount: 0,
            difference: 0,
            percentChange: 0,
            type: "error",
            message: `Error: ${error}`
          },
          summary: `Error: ${error}`
        };
      }
    }
  }
};

// ============================================================================
// TOOL REGISTRATION HELPER
// ============================================================================

export function getValidationTools(): Array<{
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (params: any) => Promise<any>;
}> {
  return [
    {
      name: validationTools.validate_material.name,
      description: validationTools.validate_material.description,
      inputSchema: ValidateMaterialSchema,
      handler: validationTools.validate_material.handler
    },
    {
      name: validationTools.validate_kienzle.name,
      description: validationTools.validate_kienzle.description,
      inputSchema: ValidateKienzleSchema,
      handler: validationTools.validate_kienzle.handler
    },
    {
      name: validationTools.validate_taylor.name,
      description: validationTools.validate_taylor.description,
      inputSchema: ValidateTaylorSchema,
      handler: validationTools.validate_taylor.handler
    },
    {
      name: validationTools.validate_johnson_cook.name,
      description: validationTools.validate_johnson_cook.description,
      inputSchema: ValidateJohnsonCookSchema,
      handler: validationTools.validate_johnson_cook.handler
    },
    {
      name: validationTools.validate_safety.name,
      description: validationTools.validate_safety.description,
      inputSchema: ValidateSafetySchema,
      handler: validationTools.validate_safety.handler
    },
    {
      name: validationTools.validate_completeness.name,
      description: validationTools.validate_completeness.description,
      inputSchema: ValidateCompletenessSchema,
      handler: validationTools.validate_completeness.handler
    },
    {
      name: validationTools.validate_anti_regression.name,
      description: validationTools.validate_anti_regression.description,
      inputSchema: ValidateAntiRegressionSchema,
      handler: validationTools.validate_anti_regression.handler
    }
  ];
}

// Export schemas
export {
  ValidateMaterialSchema,
  ValidateKienzleSchema,
  ValidateTaylorSchema,
  ValidateJohnsonCookSchema,
  ValidateSafetySchema,
  ValidateCompletenessSchema,
  ValidateAntiRegressionSchema
};

// ============================================================================
// SERVER REGISTRATION
// ============================================================================

/**
 * Register all validation tools with the MCP server
 */
export function registerValidationTools(server: any): void {
  const tools = getValidationTools();
  
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.shape,
      async (params: any) => {
        const result = await tool.handler(params);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
    );
  }
  
  log.info(`Registered ${tools.length} validation tools`);
}
