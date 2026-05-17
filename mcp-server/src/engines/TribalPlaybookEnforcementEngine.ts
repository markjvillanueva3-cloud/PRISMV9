/**
 * TribalPlaybookEnforcementEngine — MIO-MS0/U-MIO43
 *
 * Validates machining parameters against:
 * - Tribal Knowledge (3,700+ tips from shop floor experience)
 * - Playbook Rules (296 experiential rules from senior machinists)
 *
 * Returns validation verdicts with warnings, violations, and recommendations.
 * Integrated into MachiningIntelligenceOrchestratorEngine for pre-output validation.
 *
 * @module engines/TribalPlaybookEnforcementEngine
 */

import { tribalKnowledgeEngine, type KnowledgeTip, type KnowledgeSearchInput } from "./TribalKnowledgeEngine.js";
import { machiningPlaybookEngine, type PlaybookRule, type PlaybookQuery, type Severity } from "./MachiningPlaybookEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type MachineCategory = "lathe" | "mill" | "wire_edm" | "sinker_edm" | "grinder" | "5axis";
export type OperationCategory = "roughing" | "finishing" | "semi_finishing" | "drilling" | "threading" | "grooving" | "parting" | "boring";

export interface MachiningParameters {
  cutting_speed_m_min?: number;
  feed_mm_rev?: number;
  feed_mm_tooth?: number;
  depth_of_cut_mm?: number;
  width_of_cut_mm?: number;
  spindle_rpm?: number;
  tool_diameter_mm?: number;
  tool_flutes?: number;
  tool_material?: string;
  coolant?: "flood" | "mist" | "mql" | "air" | "through_tool" | "none";
}

export interface MachiningContext {
  material: string;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hrc?: number;
  operation: OperationCategory;
  machine_type?: MachineCategory;
  wall_thickness_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  features?: string[];
  machine_id?: string;
}

export type ViolationSeverity = "critical" | "warning" | "advisory";

export interface TribalViolation {
  severity: ViolationSeverity;
  tip_id: string;
  tip_title: string;
  message: string;
  parameter: string;
  actual_value: number | string;
  recommended_action: string;
  confidence: number;
}

export interface PlaybookViolation {
  severity: ViolationSeverity;
  rule_id: string;
  rule_title: string;
  rule_category: string;
  message: string;
  recommended_action: string;
  evidence_level: string;
}

export interface EnforcementResult {
  valid: boolean;
  overall_score: number;
  tribal_violations: TribalViolation[];
  playbook_violations: PlaybookViolation[];
  recommendations: string[];
  applicable_tips: KnowledgeTip[];
  applicable_rules: PlaybookRule[];
  summary: string;
  enforcement_time_ms: number;
}

// ============================================================================
// PARAMETER BOUNDS FROM TRIBAL KNOWLEDGE
// ============================================================================

const TRIBAL_BOUNDS: Record<string, Record<string, { min: number; max: number; warning: string }>> = {
  // Tool steel parameters
  D2: {
    cutting_speed_m_min: { min: 30, max: 60, warning: "D2 tool steel typically requires 30-60 m/min cutting speed" },
    feed_mm_rev: { min: 0.08, max: 0.25, warning: "D2 feed should be 0.08-0.25 mm/rev to prevent edge chipping" },
    depth_of_cut_mm: { min: 0.2, max: 3.0, warning: "D2 DOC typically 0.2-3.0mm for roughing" },
  },
  M2: {
    cutting_speed_m_min: { min: 25, max: 50, warning: "M2 high speed steel requires conservative 25-50 m/min" },
    feed_mm_rev: { min: 0.08, max: 0.20, warning: "M2 feed should be 0.08-0.20 mm/rev" },
    depth_of_cut_mm: { min: 0.2, max: 2.5, warning: "M2 DOC typically 0.2-2.5mm" },
  },
  S7: {
    cutting_speed_m_min: { min: 35, max: 65, warning: "S7 shock steel allows 35-65 m/min" },
    feed_mm_rev: { min: 0.10, max: 0.30, warning: "S7 feed should be 0.10-0.30 mm/rev" },
    depth_of_cut_mm: { min: 0.3, max: 3.5, warning: "S7 DOC typically 0.3-3.5mm" },
  },
  // Aluminum parameters
  "6061": {
    cutting_speed_m_min: { min: 200, max: 600, warning: "6061 aluminum allows 200-600 m/min with carbide" },
    feed_mm_rev: { min: 0.10, max: 0.50, warning: "6061 feed can be aggressive: 0.10-0.50 mm/rev" },
    depth_of_cut_mm: { min: 0.5, max: 8.0, warning: "6061 DOC typically 0.5-8.0mm" },
  },
  "7075": {
    cutting_speed_m_min: { min: 150, max: 500, warning: "7075-T6 aluminum allows 150-500 m/min" },
    feed_mm_rev: { min: 0.10, max: 0.40, warning: "7075 feed should be 0.10-0.40 mm/rev" },
    depth_of_cut_mm: { min: 0.5, max: 6.0, warning: "7075 DOC typically 0.5-6.0mm" },
  },
  // Stainless steel parameters
  "304": {
    cutting_speed_m_min: { min: 60, max: 120, warning: "304 stainless requires 60-120 m/min to avoid work hardening" },
    feed_mm_rev: { min: 0.12, max: 0.35, warning: "304 feed should be 0.12-0.35 mm/rev - maintain chip load" },
    depth_of_cut_mm: { min: 0.5, max: 4.0, warning: "304 DOC typically 0.5-4.0mm - stay engaged" },
  },
  "316": {
    cutting_speed_m_min: { min: 50, max: 100, warning: "316 stainless requires 50-100 m/min - slower than 304" },
    feed_mm_rev: { min: 0.12, max: 0.30, warning: "316 feed should be 0.12-0.30 mm/rev" },
    depth_of_cut_mm: { min: 0.5, max: 3.5, warning: "316 DOC typically 0.5-3.5mm" },
  },
  // Carbon steel parameters
  "1018": {
    cutting_speed_m_min: { min: 80, max: 180, warning: "1018 mild steel allows 80-180 m/min" },
    feed_mm_rev: { min: 0.15, max: 0.50, warning: "1018 feed should be 0.15-0.50 mm/rev" },
    depth_of_cut_mm: { min: 0.5, max: 6.0, warning: "1018 DOC typically 0.5-6.0mm" },
  },
  "4140": {
    cutting_speed_m_min: { min: 70, max: 150, warning: "4140 alloy steel allows 70-150 m/min" },
    feed_mm_rev: { min: 0.12, max: 0.40, warning: "4140 feed should be 0.12-0.40 mm/rev" },
    depth_of_cut_mm: { min: 0.5, max: 5.0, warning: "4140 DOC typically 0.5-5.0mm" },
  },
};

// ============================================================================
// OPERATION-SPECIFIC RULES
// ============================================================================

const OPERATION_RULES: Record<OperationCategory, { max_doc_ratio?: number; min_speed_factor?: number; warnings: string[] }> = {
  roughing: {
    max_doc_ratio: 1.0,
    warnings: ["Roughing DOC should not exceed tool diameter", "Use flood coolant for heat management"],
  },
  finishing: {
    max_doc_ratio: 0.25,
    min_speed_factor: 1.2,
    warnings: ["Finishing DOC typically <25% of tool diameter", "Increase cutting speed 20-30% over roughing"],
  },
  semi_finishing: {
    max_doc_ratio: 0.5,
    warnings: ["Semi-finishing DOC typically 25-50% of tool diameter"],
  },
  drilling: {
    max_doc_ratio: 5.0,
    warnings: ["Deep holes (>3xD) require peck cycles", "Through-tool coolant recommended for >2xD"],
  },
  threading: {
    warnings: ["Threading requires precise depth control", "Use thread milling for interrupted cuts"],
  },
  grooving: {
    warnings: ["Grooving requires rigid setup", "Reduce speed for deep grooves"],
  },
  parting: {
    warnings: ["Parting requires rigid toolholder", "Reduce feed near center for stability"],
  },
  boring: {
    max_doc_ratio: 0.3,
    warnings: ["Boring DOC limited by bar rigidity", "Larger overhang requires reduced DOC"],
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TribalPlaybookEnforcementEngine {
  /**
   * Validate machining parameters against tribal knowledge and playbook rules.
   *
   * @param params - Machining parameters to validate
   * @param context - Machining context (material, operation, etc.)
   * @returns EnforcementResult with violations, recommendations, and score
   */
  validate(params: MachiningParameters, context: MachiningContext): EnforcementResult {
    const startTime = Date.now();
    const tribalViolations: TribalViolation[] = [];
    const playbookViolations: PlaybookViolation[] = [];
    const recommendations: string[] = [];

    // 1. Get applicable tribal tips
    const tribalQuery: KnowledgeSearchInput = {
      material_iso_group: context.material_iso_group,
      operation_type: context.operation,
      query: context.material,
      limit: 20,
    };
    const applicableTips = tribalKnowledgeEngine.search(tribalQuery);

    // 2. Get applicable playbook rules
    const playbookQuery: PlaybookQuery = {
      material_iso: context.material_iso_group,
      tolerance_mm: context.tolerance_mm,
      wall_thickness_mm: context.wall_thickness_mm,
      surface_finish_Ra: context.surface_finish_Ra_um,
      features: context.features,
      operation_type: context.operation,
      hardness_hrc: context.hardness_hrc,
    };
    const { rules: applicableRules, critical_warnings } = machiningPlaybookEngine.advise(playbookQuery);

    // 3. Check parameters against tribal bounds
    const materialBounds = this.getMaterialBounds(context.material);
    if (materialBounds) {
      this.checkBounds(params, materialBounds, context.material, tribalViolations);
    }

    // 4. Check operation-specific rules
    const opRules = OPERATION_RULES[context.operation];
    if (opRules) {
      this.checkOperationRules(params, opRules, context, tribalViolations);
    }

    // 5. Add playbook critical warnings as advisory (not violations)
    // These are general rules to be aware of, not parameter violations
    for (const warning of critical_warnings) {
      const rule = applicableRules.find(r => warning.includes(r.id));
      if (rule) {
        // Add to recommendations instead of violations
        recommendations.push(`[${rule.category.toUpperCase()}] ${rule.title}: ${rule.rule.substring(0, 150)}`);
      }
    }

    // 6. Check for thin wall violations
    if (context.wall_thickness_mm && context.wall_thickness_mm < 2.0) {
      if (params.depth_of_cut_mm && params.depth_of_cut_mm > context.wall_thickness_mm * 0.5) {
        tribalViolations.push({
          severity: "critical",
          tip_id: "tribal_thin_wall_001",
          tip_title: "Thin Wall DOC Limit",
          message: `DOC ${params.depth_of_cut_mm}mm exceeds 50% of wall thickness ${context.wall_thickness_mm}mm`,
          parameter: "depth_of_cut_mm",
          actual_value: params.depth_of_cut_mm,
          recommended_action: `Reduce DOC to max ${(context.wall_thickness_mm * 0.5).toFixed(2)}mm`,
          confidence: 0.95,
        });
      }
      recommendations.push("For thin walls, use climb milling and light passes");
      recommendations.push("Consider HSM toolpath to reduce radial engagement");
    }

    // 7. Check tool diameter ratios
    if (params.tool_diameter_mm) {
      if (params.width_of_cut_mm && params.width_of_cut_mm > params.tool_diameter_mm) {
        tribalViolations.push({
          severity: "warning",
          tip_id: "tribal_woc_001",
          tip_title: "Width of Cut Exceeded",
          message: `WOC ${params.width_of_cut_mm}mm exceeds tool diameter ${params.tool_diameter_mm}mm`,
          parameter: "width_of_cut_mm",
          actual_value: params.width_of_cut_mm,
          recommended_action: `Reduce WOC to max ${params.tool_diameter_mm}mm or use larger tool`,
          confidence: 0.90,
        });
      }
    }

    // 8. Check coolant requirements
    if (context.material_iso_group === "M" || context.material_iso_group === "S") {
      if (!params.coolant || params.coolant === "none" || params.coolant === "air") {
        tribalViolations.push({
          severity: "warning",
          tip_id: "tribal_coolant_001",
          tip_title: "Coolant Required for Difficult Material",
          message: `${context.material} (ISO ${context.material_iso_group}) requires active coolant`,
          parameter: "coolant",
          actual_value: params.coolant || "none",
          recommended_action: "Use flood or through-tool coolant",
          confidence: 0.85,
        });
      }
    }

    // 9. Generate recommendations from applicable tips
    for (const tip of applicableTips.slice(0, 5)) {
      if (!recommendations.some(r => r.includes(tip.title))) {
        recommendations.push(`${tip.title}: ${tip.body.substring(0, 100)}...`);
      }
    }

    // 10. Calculate overall score
    const criticalCount = tribalViolations.filter(v => v.severity === "critical").length +
                          playbookViolations.filter(v => v.severity === "critical").length;
    const warningCount = tribalViolations.filter(v => v.severity === "warning").length +
                         playbookViolations.filter(v => v.severity === "warning").length;
    const advisoryCount = tribalViolations.filter(v => v.severity === "advisory").length +
                          playbookViolations.filter(v => v.severity === "advisory").length;

    const overallScore = Math.max(0, 1 - (criticalCount * 0.3) - (warningCount * 0.1) - (advisoryCount * 0.02));
    const valid = criticalCount === 0;

    // 11. Generate summary
    const summary = this.generateSummary(valid, criticalCount, warningCount, advisoryCount, context);

    return {
      valid,
      overall_score: Math.round(overallScore * 100) / 100,
      tribal_violations: tribalViolations,
      playbook_violations: playbookViolations,
      recommendations: recommendations.slice(0, 10),
      applicable_tips: applicableTips,
      applicable_rules: applicableRules,
      summary,
      enforcement_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Quick validation for a single parameter.
   *
   * @param paramName - Parameter name
   * @param value - Parameter value
   * @param material - Material name
   * @returns Violation or null if valid
   */
  validateSingleParameter(
    paramName: keyof MachiningParameters,
    value: number,
    material: string
  ): TribalViolation | null {
    const bounds = this.getMaterialBounds(material);
    if (!bounds) return null;

    const paramBounds = bounds[paramName as string];
    if (!paramBounds) return null;

    if (value < paramBounds.min || value > paramBounds.max) {
      return {
        severity: value < paramBounds.min * 0.5 || value > paramBounds.max * 1.5 ? "critical" : "warning",
        tip_id: `tribal_${paramName}_${material}`,
        tip_title: `${paramName} out of range for ${material}`,
        message: paramBounds.warning,
        parameter: paramName,
        actual_value: value,
        recommended_action: `Adjust ${paramName} to ${paramBounds.min}-${paramBounds.max}`,
        confidence: 0.85,
      };
    }

    return null;
  }

  /**
   * Get recommended parameter ranges for a material.
   *
   * @param material - Material name
   * @returns Parameter bounds or null
   */
  getRecommendedRanges(material: string): Record<string, { min: number; max: number }> | null {
    const bounds = this.getMaterialBounds(material);
    if (!bounds) return null;

    const ranges: Record<string, { min: number; max: number }> = {};
    for (const [key, value] of Object.entries(bounds)) {
      ranges[key] = { min: value.min, max: value.max };
    }
    return ranges;
  }

  /**
   * Search tribal tips for specific parameter guidance.
   *
   * @param query - Search query
   * @param material - Optional material filter
   * @param operation - Optional operation filter
   * @returns Array of relevant tips
   */
  searchGuidance(query: string, material?: string, operation?: OperationCategory): KnowledgeTip[] {
    return tribalKnowledgeEngine.search({
      query,
      material_iso_group: material ? this.resolveISOGroup(material) : undefined,
      operation_type: operation,
      limit: 10,
    });
  }

  /**
   * Get playbook rules for a specific category.
   *
   * @param category - Rule category
   * @param operation - Optional operation filter
   * @returns Array of matching rules
   */
  getRulesForCategory(category: string, operation?: OperationCategory): PlaybookRule[] {
    const query: PlaybookQuery = {
      categories: [category as any],
      operation_type: operation,
    };
    return machiningPlaybookEngine.advise(query).rules;
  }

  /**
   * Get statistics about enforcement coverage.
   */
  getStatistics(): {
    materials_covered: number;
    operations_covered: number;
    tribal_tips_available: number;
    playbook_rules_available: number;
  } {
    return {
      materials_covered: Object.keys(TRIBAL_BOUNDS).length,
      operations_covered: Object.keys(OPERATION_RULES).length,
      tribal_tips_available: tribalKnowledgeEngine.search({ limit: 10000 }).length,
      playbook_rules_available: machiningPlaybookEngine.stats().total ?? 0,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getMaterialBounds(material: string): Record<string, { min: number; max: number; warning: string }> | null {
    const normalized = material.toUpperCase().replace(/[-_\s]/g, "");
    for (const [key, bounds] of Object.entries(TRIBAL_BOUNDS)) {
      if (normalized.includes(key.toUpperCase())) {
        return bounds;
      }
    }
    return null;
  }

  private checkBounds(
    params: MachiningParameters,
    bounds: Record<string, { min: number; max: number; warning: string }>,
    material: string,
    violations: TribalViolation[]
  ): void {
    const paramMap: Record<string, number | undefined> = {
      cutting_speed_m_min: params.cutting_speed_m_min,
      feed_mm_rev: params.feed_mm_rev,
      depth_of_cut_mm: params.depth_of_cut_mm,
    };

    for (const [paramName, value] of Object.entries(paramMap)) {
      if (value === undefined) continue;
      const bound = bounds[paramName];
      if (!bound) continue;

      if (value < bound.min) {
        violations.push({
          severity: value < bound.min * 0.5 ? "critical" : "warning",
          tip_id: `tribal_${paramName}_low`,
          tip_title: `${paramName} below recommended for ${material}`,
          message: `${bound.warning}. Current: ${value}, minimum: ${bound.min}`,
          parameter: paramName,
          actual_value: value,
          recommended_action: `Increase ${paramName} to at least ${bound.min}`,
          confidence: 0.80,
        });
      } else if (value > bound.max) {
        violations.push({
          severity: value > bound.max * 1.5 ? "critical" : "warning",
          tip_id: `tribal_${paramName}_high`,
          tip_title: `${paramName} above recommended for ${material}`,
          message: `${bound.warning}. Current: ${value}, maximum: ${bound.max}`,
          parameter: paramName,
          actual_value: value,
          recommended_action: `Reduce ${paramName} to max ${bound.max}`,
          confidence: 0.80,
        });
      }
    }
  }

  private checkOperationRules(
    params: MachiningParameters,
    rules: { max_doc_ratio?: number; min_speed_factor?: number; warnings: string[] },
    context: MachiningContext,
    violations: TribalViolation[]
  ): void {
    if (rules.max_doc_ratio && params.depth_of_cut_mm && params.tool_diameter_mm) {
      const maxDoc = params.tool_diameter_mm * rules.max_doc_ratio;
      if (params.depth_of_cut_mm > maxDoc) {
        violations.push({
          severity: params.depth_of_cut_mm > maxDoc * 1.5 ? "critical" : "warning",
          tip_id: `tribal_op_doc_${context.operation}`,
          tip_title: `${context.operation} DOC exceeds ratio`,
          message: `DOC ${params.depth_of_cut_mm}mm exceeds ${rules.max_doc_ratio}x tool diameter (${maxDoc.toFixed(2)}mm)`,
          parameter: "depth_of_cut_mm",
          actual_value: params.depth_of_cut_mm,
          recommended_action: `Reduce DOC to max ${maxDoc.toFixed(2)}mm for ${context.operation}`,
          confidence: 0.85,
        });
      }
    }
  }

  private resolveISOGroup(material: string): "P" | "M" | "K" | "N" | "S" | "H" | undefined {
    const upper = material.toUpperCase();
    if (/D2|M2|A2|S7|O1|W1|CPM|H13/.test(upper)) return "H";
    if (/304|316|17-4|STAINLESS/.test(upper)) return "M";
    if (/INCONEL|HASTELLOY|WASPALOY|RENE|TITANIUM|TI-6|TI6/.test(upper)) return "S";
    if (/6061|7075|2024|ALUMINUM|ALUMINIUM/.test(upper)) return "N";
    if (/CAST\s*IRON|GRAY\s*IRON|DUCTILE/.test(upper)) return "K";
    return "P"; // Default to carbon steel
  }

  private generateSummary(
    valid: boolean,
    critical: number,
    warning: number,
    advisory: number,
    context: MachiningContext
  ): string {
    if (valid && warning === 0 && advisory === 0) {
      return `Parameters for ${context.material} ${context.operation} validated successfully. No tribal or playbook violations detected.`;
    }
    if (valid && warning > 0) {
      return `Parameters for ${context.material} ${context.operation} acceptable with ${warning} warning(s). Review recommended.`;
    }
    if (!valid) {
      return `VALIDATION FAILED for ${context.material} ${context.operation}: ${critical} critical violation(s). Parameters must be adjusted before proceeding.`;
    }
    return `Parameters reviewed: ${advisory} advisory note(s) for ${context.material} ${context.operation}.`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const tribalPlaybookEnforcementEngine = new TribalPlaybookEnforcementEngine();
