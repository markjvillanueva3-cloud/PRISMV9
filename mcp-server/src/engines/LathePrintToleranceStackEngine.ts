/**
 * LathePrintToleranceStackEngine — U-LTH35 (LATHE-MASTER P4)
 *
 * Propagates GD&T through feature→operation chain:
 * - Builds datum chains from GD&T relationships
 * - Propagates tolerances through machining sequence
 * - Assigns Cpk target per feature based on datum chain
 * - Surfaces stack-up warnings when chain exceeds tolerance budget
 *
 * Uses: ToleranceAwareGenerationEngine, TurningCpkSurrogateEngine patterns
 *
 * @milestone LATHE-MASTER U-LTH35
 * @version 1.0.0
 */

import { z } from "zod";
import type { RecognizedFeature, RecognitionResult } from "./LatheTurningFeatureRecognizerEngine.js";

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

/** Datum priority levels per ASME Y14.5 */
export const DATUM_PRIORITY = {
  PRIMARY: 1,   // A datum - full contact
  SECONDARY: 2, // B datum - 2 degrees of freedom
  TERTIARY: 3,  // C datum - 1 degree of freedom
} as const;

/** GD&T symbol to tolerance budget weight mapping */
const GDT_BUDGET_WEIGHTS: Record<string, number> = {
  position: 1.0,        // Full budget consumption
  concentricity: 0.8,
  runout_circular: 0.7,
  runout_total: 0.9,
  perpendicularity: 0.6,
  parallelism: 0.5,
  angularity: 0.5,
  cylindricity: 0.4,
  circularity: 0.3,
  straightness: 0.3,
  flatness: 0.3,
  profile_line: 0.6,
  profile_surface: 0.7,
  symmetry: 0.8,
};

/** Datum node in the chain */
export const DatumNodeSchema = z.object({
  id: z.string(),
  featureId: z.string(),
  label: z.string(),      // A, B, C, etc.
  priority: z.number(),
  featureType: z.string(),
  surfaceType: z.enum(["planar", "cylindrical", "conical", "spherical"]),
  diameter_mm: z.number().optional(),
  z_position_mm: z.number().optional(),
});
export type DatumNode = z.infer<typeof DatumNodeSchema>;

/** Datum chain representing dependency relationships */
export const DatumChainSchema = z.object({
  id: z.string(),
  datums: z.array(DatumNodeSchema),
  totalBudget_mm: z.number(),
  consumedBudget_mm: z.number(),
  remainingBudget_mm: z.number(),
  violationLevel: z.enum(["none", "warning", "critical"]),
});
export type DatumChain = z.infer<typeof DatumChainSchema>;

/** Feature with Cpk target assignment */
export const FeatureCpkTargetSchema = z.object({
  featureId: z.string(),
  featureType: z.string(),
  nominal_mm: z.number().optional(),
  tolerance_total_mm: z.number(),
  cpk_target: z.number(),
  cpk_minimum: z.number(),
  sigma_required: z.number(),
  datum_chain_id: z.string().optional(),
  tolerance_contribution_mm: z.number(),
  is_critical: z.boolean(),
  process_capability_class: z.enum(["standard", "precision", "ultra-precision"]),
});
export type FeatureCpkTarget = z.infer<typeof FeatureCpkTargetSchema>;

/** Stack analysis result */
export const StackAnalysisResultSchema = z.object({
  stackId: z.string(),
  features_in_stack: z.array(z.string()),
  nominal_mm: z.number(),
  worst_case_tolerance_mm: z.number(),
  rss_tolerance_mm: z.number(),
  mc_tolerance_mm: z.number().optional(),
  passes_budget: z.boolean(),
  budget_mm: z.number(),
  margin_mm: z.number(),
  critical_contributors: z.array(z.object({
    featureId: z.string(),
    contribution_mm: z.number(),
    contribution_percent: z.number(),
  })),
});
export type StackAnalysisResult = z.infer<typeof StackAnalysisResultSchema>;

/** Warning level */
export const StackWarningSchema = z.object({
  code: z.string(),
  level: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  featureIds: z.array(z.string()),
  recommendation: z.string(),
});
export type StackWarning = z.infer<typeof StackWarningSchema>;

/** Complete tolerance stack output */
export const ToleranceStackOutputSchema = z.object({
  recognition_id: z.string(),
  datum_chains: z.array(DatumChainSchema),
  feature_cpk_targets: z.array(FeatureCpkTargetSchema),
  stack_analyses: z.array(StackAnalysisResultSchema),
  warnings: z.array(StackWarningSchema),
  overall_process_capability: z.enum(["achievable", "challenging", "requires_review"]),
  timestamp: z.string(),
});
export type ToleranceStackOutput = z.infer<typeof ToleranceStackOutputSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Machine capability by process class (6σ achievable tolerance) */
const MACHINE_CAPABILITY: Record<string, { linear_mm: number; position_mm: number; runout_mm: number }> = {
  standard: { linear_mm: 0.05, position_mm: 0.08, runout_mm: 0.05 },      // General turning
  precision: { linear_mm: 0.025, position_mm: 0.04, runout_mm: 0.025 },   // Precision turning
  "ultra-precision": { linear_mm: 0.01, position_mm: 0.015, runout_mm: 0.01 }, // Swiss/grinding
};

/** Cpk thresholds per industry standard */
const CPK_THRESHOLDS = {
  minimum: 1.0,     // ISO 9001 minimum
  capable: 1.33,    // General manufacturing
  excellent: 1.67,  // Automotive/aerospace
  world_class: 2.0, // Six Sigma
};

/** Default tolerance budget per JM Die practice */
const DEFAULT_TOLERANCE_BUDGET_MM = 0.1;

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintToleranceStackEngine {
  /**
   * Main entry: propagate tolerances through recognized features
   */
  propagate(
    recognition: RecognitionResult,
    options: {
      tolerance_budget_mm?: number;
      target_cpk?: number;
      process_class?: "standard" | "precision" | "ultra-precision";
    } = {}
  ): ToleranceStackOutput {
    const {
      tolerance_budget_mm = DEFAULT_TOLERANCE_BUDGET_MM,
      target_cpk = CPK_THRESHOLDS.capable,
      process_class = "precision",
    } = options;

    const warnings: StackWarning[] = [];

    // Step 1: Extract datum structure from GD&T
    const datumChains = this.buildDatumChains(recognition.features, tolerance_budget_mm);

    // Step 2: Assign Cpk targets per feature
    const cpkTargets = this.assignCpkTargets(
      recognition.features,
      datumChains,
      target_cpk,
      process_class
    );

    // Step 3: Perform tolerance stack analyses
    const stackAnalyses = this.analyzeStacks(recognition.features, tolerance_budget_mm);

    // Step 4: Generate warnings
    this.generateWarnings(datumChains, cpkTargets, stackAnalyses, warnings);

    // Step 5: Determine overall capability
    const overallCapability = this.assessOverallCapability(cpkTargets, datumChains);

    return {
      recognition_id: `rec-${Date.now()}`,
      datum_chains: datumChains,
      feature_cpk_targets: cpkTargets,
      stack_analyses: stackAnalyses,
      warnings,
      overall_process_capability: overallCapability,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build datum chains from GD&T relationships
   */
  buildDatumChains(
    features: RecognizedFeature[],
    totalBudget: number
  ): DatumChain[] {
    const chains: DatumChain[] = [];
    const datumLabels = "ABCDEFGH".split("");
    let labelIndex = 0;

    // Group features by their datum references
    const datumGroups = new Map<string, RecognizedFeature[]>();

    for (const f of features) {
      if (f.gdt_requirements && f.gdt_requirements.length > 0) {
        for (const gdt of f.gdt_requirements) {
          if (gdt.datum_refs && gdt.datum_refs.length > 0) {
            const chainKey = gdt.datum_refs.sort().join("-");
            if (!datumGroups.has(chainKey)) {
              datumGroups.set(chainKey, []);
            }
            datumGroups.get(chainKey)!.push(f);
          }
        }
      }
    }

    // Create datum chain for each group
    for (const [chainKey, groupFeatures] of datumGroups) {
      const datumRefs = chainKey.split("-");
      const datumNodes: DatumNode[] = [];
      let consumedBudget = 0;

      for (let i = 0; i < datumRefs.length; i++) {
        const priority = i + 1;
        const datumLabel = datumRefs[i] || datumLabels[labelIndex++];

        // Find feature that serves as this datum
        const datumFeature = this.findDatumFeature(features, datumLabel, groupFeatures[0]);

        datumNodes.push({
          id: `datum-${chainKey}-${i}`,
          featureId: datumFeature?.id || `unknown-${i}`,
          label: datumLabel,
          priority,
          featureType: datumFeature?.type || "unknown",
          surfaceType: this.inferSurfaceType(datumFeature?.type),
          diameter_mm: datumFeature?.diameter_mm,
          z_position_mm: datumFeature?.start_z_mm,
        });

        // Calculate budget consumption
        if (datumFeature) {
          consumedBudget += this.calculateBudgetConsumption(datumFeature);
        }
      }

      const remaining = totalBudget - consumedBudget;
      chains.push({
        id: `chain-${chainKey}`,
        datums: datumNodes,
        totalBudget_mm: totalBudget,
        consumedBudget_mm: consumedBudget,
        remainingBudget_mm: Math.max(0, remaining),
        violationLevel: remaining < 0 ? "critical" : remaining < totalBudget * 0.2 ? "warning" : "none",
      });
    }

    // Create default chain if no GD&T references found
    if (chains.length === 0 && features.length > 0) {
      chains.push(this.createDefaultDatumChain(features, totalBudget));
    }

    return chains;
  }

  /**
   * Assign Cpk targets based on tolerance and process capability
   */
  assignCpkTargets(
    features: RecognizedFeature[],
    datumChains: DatumChain[],
    targetCpk: number,
    processClass: "standard" | "precision" | "ultra-precision"
  ): FeatureCpkTarget[] {
    const targets: FeatureCpkTarget[] = [];
    const machineCapability = MACHINE_CAPABILITY[processClass];

    for (const f of features) {
      // Calculate total tolerance
      const toleranceTotal = this.calculateTotalTolerance(f);

      // Find associated datum chain
      const datumChainId = this.findAssociatedChain(f, datumChains);

      // Calculate tolerance contribution to chain
      const contribution = this.calculateToleranceContribution(f, datumChains);

      // Determine if critical dimension
      const isCritical = this.isCriticalDimension(f);

      // Calculate required Cpk
      const cpkRequired = isCritical ? Math.max(targetCpk, CPK_THRESHOLDS.excellent) : targetCpk;

      // Calculate sigma required for this Cpk
      const sigmaRequired = cpkRequired * 3; // Cpk = (USL - LSL) / 6σ → σ = tolerance / (6 * Cpk)

      // Determine process capability class needed
      const requiredCapabilityClass = this.determineCapabilityClass(
        toleranceTotal,
        machineCapability.linear_mm,
        cpkRequired
      );

      targets.push({
        featureId: f.id,
        featureType: f.type,
        nominal_mm: f.diameter_mm || f.length_mm,
        tolerance_total_mm: toleranceTotal,
        cpk_target: cpkRequired,
        cpk_minimum: CPK_THRESHOLDS.minimum,
        sigma_required: sigmaRequired,
        datum_chain_id: datumChainId,
        tolerance_contribution_mm: contribution,
        is_critical: isCritical,
        process_capability_class: requiredCapabilityClass,
      });
    }

    return targets;
  }

  /**
   * Perform tolerance stack analyses
   */
  analyzeStacks(
    features: RecognizedFeature[],
    budgetMm: number
  ): StackAnalysisResult[] {
    const stacks: StackAnalysisResult[] = [];

    // Group features by axial position (Z-stack)
    const zGroups = this.groupByAxialPosition(features);

    for (const [zRange, groupFeatures] of zGroups) {
      if (groupFeatures.length < 2) continue;

      const contributions = groupFeatures.map(f => ({
        featureId: f.id,
        tolerance: this.calculateTotalTolerance(f),
        nominal: f.length_mm || f.diameter_mm || 0,
      }));

      // Worst-case (linear) stack
      const worstCase = contributions.reduce((sum, c) => sum + c.tolerance, 0);

      // RSS (statistical) stack
      const rss = Math.sqrt(contributions.reduce((sum, c) => sum + c.tolerance ** 2, 0));

      // Nominal stack
      const nominalStack = contributions.reduce((sum, c) => sum + c.nominal, 0);

      // Sort by contribution
      const sortedContribs = [...contributions]
        .sort((a, b) => b.tolerance - a.tolerance)
        .map(c => ({
          featureId: c.featureId,
          contribution_mm: c.tolerance,
          contribution_percent: (c.tolerance / worstCase) * 100,
        }));

      stacks.push({
        stackId: `stack-${zRange}`,
        features_in_stack: groupFeatures.map(f => f.id),
        nominal_mm: nominalStack,
        worst_case_tolerance_mm: worstCase,
        rss_tolerance_mm: rss,
        passes_budget: rss <= budgetMm,
        budget_mm: budgetMm,
        margin_mm: budgetMm - rss,
        critical_contributors: sortedContribs.slice(0, 3), // Top 3 contributors
      });
    }

    return stacks;
  }

  /**
   * Generate warnings for tolerance issues
   */
  private generateWarnings(
    chains: DatumChain[],
    cpkTargets: FeatureCpkTarget[],
    stacks: StackAnalysisResult[],
    warnings: StackWarning[]
  ): void {
    // Check datum chain violations
    for (const chain of chains) {
      if (chain.violationLevel === "critical") {
        warnings.push({
          code: "DATUM_BUDGET_EXCEEDED",
          level: "critical",
          message: `Datum chain ${chain.id} exceeds tolerance budget by ${Math.abs(chain.remainingBudget_mm).toFixed(3)}mm`,
          featureIds: chain.datums.map(d => d.featureId),
          recommendation: "Review datum structure or increase tolerance budget",
        });
      } else if (chain.violationLevel === "warning") {
        warnings.push({
          code: "DATUM_BUDGET_LOW",
          level: "warning",
          message: `Datum chain ${chain.id} has only ${chain.remainingBudget_mm.toFixed(3)}mm budget remaining`,
          featureIds: chain.datums.map(d => d.featureId),
          recommendation: "Consider relaxing non-critical tolerances",
        });
      }
    }

    // Check Cpk achievability
    for (const target of cpkTargets) {
      if (target.process_capability_class === "ultra-precision" && target.tolerance_total_mm < 0.02) {
        warnings.push({
          code: "CPK_REQUIRES_ULTRA_PRECISION",
          level: "warning",
          message: `Feature ${target.featureId} requires ultra-precision process (Cpk ${target.cpk_target})`,
          featureIds: [target.featureId],
          recommendation: "Verify machine capability or consider alternative process",
        });
      }
    }

    // Check stack-up violations
    for (const stack of stacks) {
      if (!stack.passes_budget) {
        warnings.push({
          code: "STACK_BUDGET_EXCEEDED",
          level: "critical",
          message: `Tolerance stack ${stack.stackId} exceeds budget: RSS=${stack.rss_tolerance_mm.toFixed(3)}mm > ${stack.budget_mm}mm`,
          featureIds: stack.features_in_stack,
          recommendation: `Reduce tolerance on critical contributors: ${stack.critical_contributors.map(c => c.featureId).join(", ")}`,
        });
      }
    }

    // Check for missing GD&T on critical features
    for (const target of cpkTargets) {
      if (target.is_critical && !target.datum_chain_id) {
        warnings.push({
          code: "CRITICAL_NO_GDT",
          level: "info",
          message: `Critical feature ${target.featureId} has no GD&T datum reference`,
          featureIds: [target.featureId],
          recommendation: "Consider adding position or runout callout with datum reference",
        });
      }
    }
  }

  /**
   * Assess overall process capability
   */
  private assessOverallCapability(
    cpkTargets: FeatureCpkTarget[],
    datumChains: DatumChain[]
  ): "achievable" | "challenging" | "requires_review" {
    const criticalViolations = datumChains.filter(c => c.violationLevel === "critical").length;
    const ultraPrecisionFeatures = cpkTargets.filter(t => t.process_capability_class === "ultra-precision").length;
    const criticalFeatures = cpkTargets.filter(t => t.is_critical).length;

    if (criticalViolations > 0) return "requires_review";
    if (ultraPrecisionFeatures > criticalFeatures * 0.5) return "challenging";
    if (ultraPrecisionFeatures > 0) return "challenging";
    return "achievable";
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private findDatumFeature(
    features: RecognizedFeature[],
    datumLabel: string,
    contextFeature: RecognizedFeature
  ): RecognizedFeature | undefined {
    // Look for explicit datum assignment in GD&T
    for (const f of features) {
      if (f.gdt_requirements) {
        for (const gdt of f.gdt_requirements) {
          if (gdt.datum_refs?.includes(datumLabel)) {
            // This feature references the datum, find the actual datum feature
            // Usually datum A is primary (face/OD), B is secondary, C is tertiary
          }
        }
      }
    }

    // Heuristic: datum A is usually a face or main OD
    if (datumLabel === "A") {
      return features.find(f => f.type === "face") || features.find(f => f.type === "od_turn");
    }
    if (datumLabel === "B") {
      return features.find(f => f.type === "od_turn" && f.diameter_mm && f.diameter_mm > 20);
    }
    if (datumLabel === "C") {
      return features.find(f => f.type === "id_bore");
    }

    return contextFeature;
  }

  private inferSurfaceType(featureType?: string): "planar" | "cylindrical" | "conical" | "spherical" {
    if (!featureType) return "planar";
    if (featureType.includes("face")) return "planar";
    if (featureType.includes("taper")) return "conical";
    if (featureType.includes("radius") && featureType.includes("sphere")) return "spherical";
    return "cylindrical";
  }

  private calculateBudgetConsumption(feature: RecognizedFeature): number {
    let consumption = 0;

    if (feature.gdt_requirements) {
      for (const gdt of feature.gdt_requirements) {
        const weight = GDT_BUDGET_WEIGHTS[gdt.symbol.toLowerCase()] || 0.5;
        consumption += gdt.tolerance_mm * weight;
      }
    }

    // Linear tolerance contribution
    const linearTol = Math.abs(feature.tolerance_plus_mm || 0) + Math.abs(feature.tolerance_minus_mm || 0);
    consumption += linearTol * 0.5; // Linear tolerances contribute 50% to budget

    return consumption;
  }

  private createDefaultDatumChain(features: RecognizedFeature[], totalBudget: number): DatumChain {
    const datumNodes: DatumNode[] = [];

    // Create default 3-2-1 datum structure
    const face = features.find(f => f.type === "face");
    const od = features.find(f => f.type === "od_turn");
    const id = features.find(f => f.type === "id_bore");

    if (face) {
      datumNodes.push({
        id: "datum-default-A",
        featureId: face.id,
        label: "A",
        priority: DATUM_PRIORITY.PRIMARY,
        featureType: face.type,
        surfaceType: "planar",
        z_position_mm: face.start_z_mm,
      });
    }

    if (od) {
      datumNodes.push({
        id: "datum-default-B",
        featureId: od.id,
        label: "B",
        priority: DATUM_PRIORITY.SECONDARY,
        featureType: od.type,
        surfaceType: "cylindrical",
        diameter_mm: od.diameter_mm,
      });
    }

    if (id) {
      datumNodes.push({
        id: "datum-default-C",
        featureId: id.id,
        label: "C",
        priority: DATUM_PRIORITY.TERTIARY,
        featureType: id.type,
        surfaceType: "cylindrical",
        diameter_mm: id.diameter_mm,
      });
    }

    const consumed = datumNodes.reduce((sum, d) => {
      const f = features.find(feat => feat.id === d.featureId);
      return sum + (f ? this.calculateBudgetConsumption(f) : 0);
    }, 0);

    return {
      id: "chain-default",
      datums: datumNodes,
      totalBudget_mm: totalBudget,
      consumedBudget_mm: consumed,
      remainingBudget_mm: Math.max(0, totalBudget - consumed),
      violationLevel: consumed > totalBudget ? "critical" : consumed > totalBudget * 0.8 ? "warning" : "none",
    };
  }

  private calculateTotalTolerance(feature: RecognizedFeature): number {
    let total = 0;

    // Linear tolerance
    total += Math.abs(feature.tolerance_plus_mm || 0) + Math.abs(feature.tolerance_minus_mm || 0);

    // GD&T tolerance (position, runout are additive to linear)
    if (feature.gdt_requirements) {
      for (const gdt of feature.gdt_requirements) {
        if (["position", "runout_circular", "runout_total", "concentricity"].includes(gdt.symbol.toLowerCase())) {
          total += gdt.tolerance_mm;
        }
      }
    }

    return total || 0.05; // Default 0.05mm if no tolerance specified
  }

  private findAssociatedChain(feature: RecognizedFeature, chains: DatumChain[]): string | undefined {
    if (feature.gdt_requirements) {
      for (const gdt of feature.gdt_requirements) {
        if (gdt.datum_refs && gdt.datum_refs.length > 0) {
          const chainKey = gdt.datum_refs.sort().join("-");
          const chain = chains.find(c => c.id.includes(chainKey));
          if (chain) return chain.id;
        }
      }
    }
    return chains[0]?.id; // Default to first chain
  }

  private calculateToleranceContribution(feature: RecognizedFeature, chains: DatumChain[]): number {
    const tolerance = this.calculateTotalTolerance(feature);
    const associatedChain = this.findAssociatedChain(feature, chains);

    if (associatedChain) {
      const chain = chains.find(c => c.id === associatedChain);
      if (chain && chain.totalBudget_mm > 0) {
        return (tolerance / chain.totalBudget_mm) * chain.consumedBudget_mm;
      }
    }

    return tolerance;
  }

  private isCriticalDimension(feature: RecognizedFeature): boolean {
    // Critical if explicitly marked
    if (feature.critical_dimension) return true;

    // Critical if tight tolerance (< 0.02mm total)
    const tol = this.calculateTotalTolerance(feature);
    if (tol < 0.02) return true;

    // Critical if has position or runout GD&T
    if (feature.gdt_requirements) {
      for (const gdt of feature.gdt_requirements) {
        if (["position", "runout_total", "concentricity"].includes(gdt.symbol.toLowerCase())) {
          return true;
        }
      }
    }

    // Critical feature types
    if (["thread_external", "thread_internal", "id_bore"].includes(feature.type)) {
      return true;
    }

    return false;
  }

  private determineCapabilityClass(
    tolerance: number,
    machineCapability: number,
    targetCpk: number
  ): "standard" | "precision" | "ultra-precision" {
    // Cpk = tolerance / (6 * sigma) → sigma = tolerance / (6 * Cpk)
    const requiredSigma = tolerance / (6 * targetCpk);

    // Machine capability is 6σ achievable
    const standardSigma = MACHINE_CAPABILITY.standard.linear_mm / 6;
    const precisionSigma = MACHINE_CAPABILITY.precision.linear_mm / 6;
    const ultraSigma = MACHINE_CAPABILITY["ultra-precision"].linear_mm / 6;

    if (requiredSigma >= standardSigma) return "standard";
    if (requiredSigma >= precisionSigma) return "precision";
    return "ultra-precision";
  }

  private groupByAxialPosition(features: RecognizedFeature[]): Map<string, RecognizedFeature[]> {
    const groups = new Map<string, RecognizedFeature[]>();
    const zPositions = new Set<number>();

    // Collect unique Z positions
    for (const f of features) {
      if (f.start_z_mm !== undefined) {
        zPositions.add(Math.round(f.start_z_mm * 10) / 10); // Round to 0.1mm
      }
    }

    // Group features at each Z position
    for (const z of zPositions) {
      const key = `Z${z.toFixed(1)}`;
      const groupFeatures = features.filter(f => {
        if (f.start_z_mm === undefined) return false;
        return Math.abs(f.start_z_mm - z) < 0.2; // Within 0.2mm
      });
      if (groupFeatures.length > 0) {
        groups.set(key, groupFeatures);
      }
    }

    // Also create radial groups (features at same Z but different diameters)
    const radialStack = features.filter(f =>
      f.type.includes("od") || f.type.includes("id") || f.type.includes("bore")
    );
    if (radialStack.length > 1) {
      groups.set("radial-stack", radialStack);
    }

    return groups;
  }

  // ============================================================================
  // BATCH & UTILITY METHODS
  // ============================================================================

  /**
   * Batch process multiple recognition results
   */
  batchPropagate(
    recognitions: RecognitionResult[],
    options: {
      tolerance_budget_mm?: number;
      target_cpk?: number;
      process_class?: "standard" | "precision" | "ultra-precision";
    } = {}
  ): ToleranceStackOutput[] {
    return recognitions.map(r => this.propagate(r, options));
  }

  /**
   * Get statistics about tolerance stack analysis
   */
  getStackStats(output: ToleranceStackOutput): {
    total_features: number;
    critical_features: number;
    warning_count: number;
    critical_count: number;
    avg_cpk_target: number;
    min_cpk_target: number;
    total_tolerance_budget_consumed: number;
  } {
    const warnings = output.warnings.filter(w => w.level === "warning").length;
    const criticals = output.warnings.filter(w => w.level === "critical").length;
    const cpkValues = output.feature_cpk_targets.map(t => t.cpk_target);

    return {
      total_features: output.feature_cpk_targets.length,
      critical_features: output.feature_cpk_targets.filter(t => t.is_critical).length,
      warning_count: warnings,
      critical_count: criticals,
      avg_cpk_target: cpkValues.length > 0 ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : 0,
      min_cpk_target: cpkValues.length > 0 ? Math.min(...cpkValues) : 0,
      total_tolerance_budget_consumed: output.datum_chains.reduce((sum, c) => sum + c.consumedBudget_mm, 0),
    };
  }

  /**
   * Validate tolerance stack output
   */
  validate(output: ToleranceStackOutput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const result = ToleranceStackOutputSchema.safeParse(output);

    if (!result.success) {
      errors.push(...result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`));
    }

    // Business rule validations
    for (const target of output.feature_cpk_targets) {
      if (target.cpk_target < CPK_THRESHOLDS.minimum) {
        errors.push(`Feature ${target.featureId} has Cpk target ${target.cpk_target} below minimum ${CPK_THRESHOLDS.minimum}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Singleton export
export const lathePrintToleranceStackEngine = new LathePrintToleranceStackEngine();
export { LathePrintToleranceStackEngine };
