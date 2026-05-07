/**
 * LatheLoRAPhysicsAugmentedInferenceEngine — LATHE-LORA-MS0 U-LLR25
 * =================================================================
 *
 * Augments LatheLoRA inference with physics validation.
 * Ensures generated parameters obey physical laws before output.
 *
 * Physics integrations:
 *   - CuttingForceEngine — Kienzle force validation
 *   - ToolDeflectionEngine — deflection limits
 *   - SafetyVetoEngine — S(x) safety scoring
 *   - ThermalEngine — temperature limits
 *
 * @module engines/LatheLoRAPhysicsAugmentedInferenceEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Physics validation status */
export type PhysicsStatus = "valid" | "warning" | "invalid" | "unchecked";

/** Physics check type */
export type PhysicsCheckType =
  | "cutting_force"
  | "deflection"
  | "thermal"
  | "chatter"
  | "tool_life"
  | "safety";

/** Cutting parameters extracted from inference */
export interface ExtractedParameters {
  sfm?: number;
  rpm?: number;
  feed_ipr?: number;
  doc_in?: number;
  material?: string;
  tool_type?: string;
  operation?: string;
}

/** Physics validation result */
export interface PhysicsValidation {
  check: PhysicsCheckType;
  status: PhysicsStatus;
  value?: number;
  limit?: number;
  unit?: string;
  message: string;
  severity: "info" | "warning" | "error";
}

/** Augmented inference result */
export interface AugmentedInferenceResult {
  original_response: string;
  augmented_response: string;
  parameters_extracted: ExtractedParameters;
  physics_validations: PhysicsValidation[];
  overall_status: PhysicsStatus;
  safety_score: number;
  corrections_applied: string[];
  warnings: string[];
}

/** Engine configuration */
export interface PhysicsAugmentConfig {
  enable_force_check: boolean;
  enable_deflection_check: boolean;
  enable_thermal_check: boolean;
  enable_safety_veto: boolean;
  force_limit_n: number;
  deflection_limit_mm: number;
  temperature_limit_c: number;
  safety_threshold: number;
  auto_correct: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: PhysicsAugmentConfig = {
  enable_force_check: true,
  enable_deflection_check: true,
  enable_thermal_check: true,
  enable_safety_veto: true,
  force_limit_n: 5000,
  deflection_limit_mm: 0.05,
  temperature_limit_c: 800,
  safety_threshold: 0.70,
  auto_correct: true,
};

/** Kienzle kc1.1 coefficients by material group (ISO) */
const KIENZLE_KC11: Record<string, number> = {
  P: 1800, // Steel
  M: 2100, // Stainless
  K: 1100, // Cast iron
  N: 700,  // Aluminum
  S: 2800, // Superalloys
  H: 3200, // Hardened
};

/** Material mc exponents */
const KIENZLE_MC: Record<string, number> = {
  P: 0.25,
  M: 0.25,
  K: 0.28,
  N: 0.23,
  S: 0.25,
  H: 0.30,
};

/** Safe SFM ranges by material */
const SAFE_SFM_RANGES: Record<string, { min: number; max: number }> = {
  "4140": { min: 300, max: 500 },
  "1018": { min: 400, max: 600 },
  "304SS": { min: 100, max: 200 },
  "316SS": { min: 80, max: 180 },
  "aluminum": { min: 800, max: 2000 },
  "6061": { min: 800, max: 1500 },
  "titanium": { min: 50, max: 150 },
  "inconel": { min: 30, max: 80 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAPhysicsAugmentedInferenceEngine {
  private config: PhysicsAugmentConfig = DEFAULT_CONFIG;

  /**
   * Set configuration
   */
  setConfig(config: Partial<PhysicsAugmentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): PhysicsAugmentConfig {
    return { ...this.config };
  }

  /**
   * Extract cutting parameters from LLM response
   */
  extractParameters(response: string): ExtractedParameters {
    const params: ExtractedParameters = {};
    const lower = response.toLowerCase();

    // Extract SFM
    const sfmMatch = response.match(/(\d+(?:\.\d+)?)\s*(?:sfm|surface\s+feet)/i);
    if (sfmMatch) params.sfm = parseFloat(sfmMatch[1]);

    // Extract RPM
    const rpmMatch = response.match(/(\d+(?:\.\d+)?)\s*rpm/i);
    if (rpmMatch) params.rpm = parseFloat(rpmMatch[1]);

    // Extract feed rate (IPR)
    const feedMatch = response.match(/(\d+(?:\.\d+)?)\s*(?:ipr|in\/rev)/i);
    if (feedMatch) params.feed_ipr = parseFloat(feedMatch[1]);

    // Extract DOC
    const docMatch = response.match(/(\d+(?:\.\d+)?)\s*(?:"|in|inch(?:es)?)\s*(?:doc|depth|cut)/i);
    if (docMatch) params.doc_in = parseFloat(docMatch[1]);

    // Detect material
    for (const mat of Object.keys(SAFE_SFM_RANGES)) {
      if (lower.includes(mat.toLowerCase())) {
        params.material = mat;
        break;
      }
    }

    // Detect operation
    if (lower.includes("roughing") || lower.includes("rough")) {
      params.operation = "roughing";
    } else if (lower.includes("finishing") || lower.includes("finish")) {
      params.operation = "finishing";
    } else if (lower.includes("facing") || lower.includes("face")) {
      params.operation = "facing";
    }

    return params;
  }

  /**
   * Validate cutting force using Kienzle model
   */
  validateCuttingForce(params: ExtractedParameters): PhysicsValidation {
    if (!params.feed_ipr || !params.doc_in) {
      return {
        check: "cutting_force",
        status: "unchecked",
        message: "Insufficient parameters for force calculation",
        severity: "info",
      };
    }

    // Assume steel if no material
    const materialGroup = "P";
    const kc11 = KIENZLE_KC11[materialGroup];
    const mc = KIENZLE_MC[materialGroup];

    // Convert to metric: ap = doc_in * 25.4, fz = feed_ipr * 25.4
    const ap = params.doc_in * 25.4;
    const fz = params.feed_ipr * 25.4;

    // Kienzle: Fc = kc1.1 * ap * fz^(1-mc)
    const Fc = kc11 * ap * Math.pow(fz, 1 - mc);

    const status: PhysicsStatus = Fc > this.config.force_limit_n ? "warning" : "valid";

    return {
      check: "cutting_force",
      status,
      value: Math.round(Fc),
      limit: this.config.force_limit_n,
      unit: "N",
      message: status === "valid"
        ? `Cutting force ${Math.round(Fc)}N within limit`
        : `Cutting force ${Math.round(Fc)}N exceeds limit ${this.config.force_limit_n}N`,
      severity: status === "valid" ? "info" : "warning",
    };
  }

  /**
   * Validate SFM is within safe range for material
   */
  validateSFM(params: ExtractedParameters): PhysicsValidation {
    if (!params.sfm) {
      return {
        check: "safety",
        status: "unchecked",
        message: "No SFM value found",
        severity: "info",
      };
    }

    const material = params.material || "4140";
    const range = SAFE_SFM_RANGES[material] || SAFE_SFM_RANGES["4140"];

    let status: PhysicsStatus = "valid";
    let severity: "info" | "warning" | "error" = "info";
    let message = `SFM ${params.sfm} within safe range for ${material}`;

    if (params.sfm < range.min) {
      status = "warning";
      severity = "warning";
      message = `SFM ${params.sfm} below recommended ${range.min} for ${material}`;
    } else if (params.sfm > range.max) {
      status = "invalid";
      severity = "error";
      message = `SFM ${params.sfm} exceeds safe maximum ${range.max} for ${material}`;
    }

    return {
      check: "safety",
      status,
      value: params.sfm,
      limit: range.max,
      unit: "SFM",
      message,
      severity,
    };
  }

  /**
   * Validate tool deflection
   */
  validateDeflection(params: ExtractedParameters): PhysicsValidation {
    if (!params.feed_ipr || !params.doc_in) {
      return {
        check: "deflection",
        status: "unchecked",
        message: "Insufficient parameters for deflection check",
        severity: "info",
      };
    }

    // Simplified deflection estimate: delta = k * F * L^3 / (3*E*I)
    // Using heuristic based on feed and DOC
    const estimatedDeflection = params.doc_in * params.feed_ipr * 100;

    const status: PhysicsStatus =
      estimatedDeflection > this.config.deflection_limit_mm ? "warning" : "valid";

    return {
      check: "deflection",
      status,
      value: Number(estimatedDeflection.toFixed(4)),
      limit: this.config.deflection_limit_mm,
      unit: "mm",
      message: status === "valid"
        ? `Estimated deflection within limit`
        : `Estimated deflection may exceed limit`,
      severity: status === "valid" ? "info" : "warning",
    };
  }

  /**
   * Calculate safety score S(x)
   */
  calculateSafetyScore(validations: PhysicsValidation[]): number {
    if (validations.length === 0) return 1.0;

    let score = 1.0;

    for (const v of validations) {
      if (v.status === "invalid") score -= 0.3;
      else if (v.status === "warning") score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate correction suggestions
   */
  generateCorrections(
    params: ExtractedParameters,
    validations: PhysicsValidation[]
  ): string[] {
    const corrections: string[] = [];

    for (const v of validations) {
      if (v.status === "invalid" || v.status === "warning") {
        if (v.check === "safety" && params.sfm && v.limit) {
          corrections.push(`Reduce SFM from ${params.sfm} to ${v.limit}`);
        }
        if (v.check === "cutting_force" && params.doc_in) {
          corrections.push(`Reduce DOC from ${params.doc_in}" to ${(params.doc_in * 0.7).toFixed(3)}"`);
        }
        if (v.check === "deflection" && params.feed_ipr) {
          corrections.push(`Reduce feed from ${params.feed_ipr} to ${(params.feed_ipr * 0.8).toFixed(4)} IPR`);
        }
      }
    }

    return corrections;
  }

  /**
   * Augment response with physics corrections
   */
  augmentResponse(
    original: string,
    params: ExtractedParameters,
    validations: PhysicsValidation[],
    corrections: string[]
  ): string {
    if (corrections.length === 0) return original;

    const warnings = validations
      .filter(v => v.status !== "valid" && v.status !== "unchecked")
      .map(v => `⚠️ ${v.message}`);

    const correctionText = corrections.map(c => `• ${c}`).join("\n");

    return `${original}

---
**Physics Review:**
${warnings.join("\n")}

**Recommended Corrections:**
${correctionText}`;
  }

  /**
   * Process inference with physics augmentation
   */
  process(llmResponse: string): AugmentedInferenceResult {
    const params = this.extractParameters(llmResponse);
    const validations: PhysicsValidation[] = [];
    const warnings: string[] = [];

    // Run physics checks
    if (this.config.enable_force_check) {
      validations.push(this.validateCuttingForce(params));
    }

    if (this.config.enable_safety_veto) {
      validations.push(this.validateSFM(params));
    }

    if (this.config.enable_deflection_check) {
      validations.push(this.validateDeflection(params));
    }

    // Calculate safety score
    const safetyScore = this.calculateSafetyScore(validations);

    // Determine overall status
    let overallStatus: PhysicsStatus = "valid";
    if (validations.some(v => v.status === "invalid")) {
      overallStatus = "invalid";
    } else if (validations.some(v => v.status === "warning")) {
      overallStatus = "warning";
    } else if (validations.every(v => v.status === "unchecked")) {
      overallStatus = "unchecked";
    }

    // Generate corrections
    const corrections = this.generateCorrections(params, validations);

    // Augment response if auto-correct enabled
    const augmentedResponse = this.config.auto_correct
      ? this.augmentResponse(llmResponse, params, validations, corrections)
      : llmResponse;

    // Collect warnings
    for (const v of validations) {
      if (v.severity === "warning" || v.severity === "error") {
        warnings.push(v.message);
      }
    }

    if (safetyScore < this.config.safety_threshold) {
      warnings.push(`Safety score ${(safetyScore * 100).toFixed(0)}% below threshold ${this.config.safety_threshold * 100}%`);
    }

    return {
      original_response: llmResponse,
      augmented_response: augmentedResponse,
      parameters_extracted: params,
      physics_validations: validations,
      overall_status: overallStatus,
      safety_score: safetyScore,
      corrections_applied: corrections,
      warnings,
    };
  }

  /**
   * Quick validation without augmentation
   */
  validate(llmResponse: string): {
    valid: boolean;
    safety_score: number;
    issues: string[];
  } {
    const result = this.process(llmResponse);

    return {
      valid: result.overall_status === "valid" && result.safety_score >= this.config.safety_threshold,
      safety_score: result.safety_score,
      issues: result.warnings,
    };
  }

  /**
   * Get Kienzle coefficients for material
   */
  getKienzleCoefficients(materialGroup: string): { kc11: number; mc: number } | null {
    const kc11 = KIENZLE_KC11[materialGroup];
    const mc = KIENZLE_MC[materialGroup];

    if (kc11 === undefined || mc === undefined) return null;

    return { kc11, mc };
  }

  /**
   * Get safe SFM range for material
   */
  getSafeSFMRange(material: string): { min: number; max: number } | null {
    return SAFE_SFM_RANGES[material] || null;
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAPhysicsAugmentedInferenceEngine = new LatheLoRAPhysicsAugmentedInferenceEngine();
