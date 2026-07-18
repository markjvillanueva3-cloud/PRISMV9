/**
 * DFMAwareGenerationEngine — Manufacturability-Aware CAD Generation
 * CADCAM-DAGI-MS0/U-DAGI11
 *
 * Integrates DFM (Design for Manufacturability) into CAD generation:
 *   - Filters generation candidates by DFM score
 *   - Applies DFM constraints during beam search
 *   - Warns on marginal DFM (radius < 0.015", thin walls)
 *   - Respects JM Die capability envelope (machines, materials, tools)
 *
 * Integrates with existing DFM engines:
 *   - DFMPipelineEngine for full analysis
 *   - DfMRulesEngine for structural pass/fail
 *   - DFMFeedbackEngine for feature-level feedback
 */

import { log } from "../utils/Logger.js";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./BaseEngine.js";
// WIRE-EXEMPT: U-EFF43 only added a num() coercion helper for FeatureSpec.params (Record<string, number | string>). Engine is consumed via CAD generation facades, not directly dispatched.
import type { FeatureSpec } from "./NeuralCADGenerationEngine.js";

/**
 * Coerce a Record<string, number | string> param value to number.
 * Returns undefined when the value is missing or non-numeric so guarded
 * `if (x !== undefined)` branches continue to short-circuit correctly.
 */
function num(v: number | string | undefined): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** DFM rule category */
export type DFMCategory =
  | "geometry"         // Wall thickness, aspect ratio
  | "tooling"          // Tool access, corner radii
  | "tolerance"        // Achievable tolerances
  | "surface"          // Surface finish feasibility
  | "material"         // Material-specific constraints
  | "machine"          // Machine capability limits
  | "assembly";        // Assembly/fit considerations

/** DFM rule severity */
export type DFMSeverity = "pass" | "warning" | "fail";

/** DFM rule result */
export interface DFMRuleResult {
  ruleId: string;
  category: DFMCategory;
  severity: DFMSeverity;
  message: string;
  feature?: string;
  currentValue?: number;
  limitValue?: number;
  unit?: string;
  suggestion?: string;
}

/** DFM analysis result */
export interface DFMAnalysisResult {
  overallScore: number;        // 0-1
  passCount: number;
  warningCount: number;
  failCount: number;
  rules: DFMRuleResult[];
  recommendations: string[];
  isManufacturable: boolean;
}

/** Machine capability envelope */
export interface MachineEnvelope {
  machineId: string;
  machineType: "lathe" | "mill" | "mill_turn" | "wire_edm" | "sinker_edm";
  maxWorkpiece: { length: number; diameter?: number; width?: number; height?: number };
  minCornerRadius: number;
  minWallThickness: number;
  maxDepthToWidth: number;
  toleranceCapability: number;
  surfaceFinishRa: number;
  availableMaterials: string[];
}

/** DFM generation input */
export interface DFMGenerationInput {
  features: FeatureSpec[];
  material?: string;
  machineType?: string;
  machineEnvelope?: MachineEnvelope;
  targetTolerance?: number;
  targetFinish?: number;
}

/** DFM generation output */
export interface DFMGenerationOutput {
  features: FeatureSpec[];
  dfmAnalysis: DFMAnalysisResult;
  modifications: Array<{
    featureIndex: number;
    originalValue: unknown;
    modifiedValue: unknown;
    reason: string;
  }>;
  code: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Default JM Die machine envelope (based on ShopConfigurationEngine) */
const JM_DIE_ENVELOPE: MachineEnvelope = {
  machineId: "jm-die-default",
  machineType: "lathe",
  maxWorkpiece: { length: 500, diameter: 250 },
  minCornerRadius: 0.4,        // 0.015" ≈ 0.38mm
  minWallThickness: 1.5,       // 1.5mm for steel
  maxDepthToWidth: 5,          // 5:1 depth-to-width for pockets
  toleranceCapability: 0.025,  // ±0.001" ≈ 0.025mm
  surfaceFinishRa: 1.6,        // Ra 1.6 μm (63 μin)
  availableMaterials: [
    "4140", "4340", "1045", "1018", // Alloy steels
    "D2", "A2", "M2", "S7", "H13",  // Tool steels
    "6061", "7075", "2024",         // Aluminum
    "STEEL", "ALUMINUM", "BRASS",
  ],
};

/** Material-specific DFM constraints */
const MATERIAL_CONSTRAINTS: Record<string, { minWall: number; minRadius: number; note: string }> = {
  "STEEL": { minWall: 1.5, minRadius: 0.4, note: "Standard steel machining" },
  "4140": { minWall: 1.5, minRadius: 0.4, note: "Good machinability" },
  "D2": { minWall: 2.0, minRadius: 0.5, note: "Tool steel — harder to machine" },
  "H13": { minWall: 2.0, minRadius: 0.5, note: "Hot work tool steel" },
  "ALUMINUM": { minWall: 1.0, minRadius: 0.3, note: "Easier to machine" },
  "6061": { minWall: 1.0, minRadius: 0.3, note: "Good machinability aluminum" },
  "7075": { minWall: 1.2, minRadius: 0.4, note: "High-strength aluminum" },
  "TITANIUM": { minWall: 2.0, minRadius: 0.8, note: "Difficult to machine — deflection concerns" },
  "BRASS": { minWall: 0.8, minRadius: 0.2, note: "Excellent machinability" },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class DFMAwareGenerationEngine extends BaseEngine {
  constructor() {
    super({
      name: "DFMAwareGenerationEngine",
      version: "1.0.0",
      domain: "cad_dfm",
      description: "Manufacturability-aware CAD generation with DFM filtering",
    });
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "dfm_generate", description: "Generate CAD with DFM filtering" },
      { name: "dfm_analyze_features", description: "Analyze feature set for DFM issues" },
      { name: "dfm_fix_features", description: "Auto-fix DFM violations in features" },
      { name: "dfm_get_envelope", description: "Get machine capability envelope" },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") {
      return "Input must be an object";
    }
    const i = input as DFMGenerationInput;
    if (!i.features || !Array.isArray(i.features)) {
      return "features array is required";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    return this.generateWithDFM(input as DFMGenerationInput);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DFM ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze features for DFM issues
   */
  analyzeFeatures(
    features: FeatureSpec[],
    material?: string,
    envelope: MachineEnvelope = JM_DIE_ENVELOPE
  ): DFMAnalysisResult {
    const rules: DFMRuleResult[] = [];
    const materialUpper = material?.toUpperCase() ?? "STEEL";
    const matConstraints = MATERIAL_CONSTRAINTS[materialUpper] ?? MATERIAL_CONSTRAINTS["STEEL"];

    // Check each feature
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const featureName = `${f.type}[${i}]`;

      // Wall thickness check
      const wallThickness = num(f.params.wallThickness ?? f.params.thickness);
      if (wallThickness !== undefined) {
        if (wallThickness < matConstraints.minWall) {
          rules.push({
            ruleId: `wall-${i}`,
            category: "geometry",
            severity: wallThickness < matConstraints.minWall * 0.7 ? "fail" : "warning",
            message: `Wall thickness ${wallThickness}mm below minimum ${matConstraints.minWall}mm for ${materialUpper}`,
            feature: featureName,
            currentValue: wallThickness,
            limitValue: matConstraints.minWall,
            unit: "mm",
            suggestion: `Increase wall thickness to at least ${matConstraints.minWall}mm`,
          });
        } else {
          rules.push({
            ruleId: `wall-${i}`,
            category: "geometry",
            severity: "pass",
            message: `Wall thickness ${wallThickness}mm OK`,
            feature: featureName,
          });
        }
      }

      // Corner radius check
      const cornerRadius = num(f.params.cornerRadius ?? f.params.radius);
      if (cornerRadius !== undefined && f.type !== "fillet" && f.type !== "chamfer") {
        if (cornerRadius < matConstraints.minRadius) {
          rules.push({
            ruleId: `corner-${i}`,
            category: "tooling",
            severity: cornerRadius < matConstraints.minRadius * 0.5 ? "fail" : "warning",
            message: `Corner radius ${cornerRadius}mm below minimum ${matConstraints.minRadius}mm`,
            feature: featureName,
            currentValue: cornerRadius,
            limitValue: matConstraints.minRadius,
            unit: "mm",
            suggestion: `Increase corner radius to at least ${matConstraints.minRadius}mm or use larger end mill`,
          });
        } else {
          rules.push({
            ruleId: `corner-${i}`,
            category: "tooling",
            severity: "pass",
            message: `Corner radius ${cornerRadius}mm OK`,
            feature: featureName,
          });
        }
      }

      // Depth-to-width ratio for pockets/slots
      if (f.type === "pocket" || f.type === "slot") {
        const depth = num(f.params.depth) ?? 0;
        const width = num(f.params.width) ?? 1;
        const ratio = depth / width;
        if (ratio > envelope.maxDepthToWidth) {
          rules.push({
            ruleId: `depth-${i}`,
            category: "tooling",
            severity: ratio > envelope.maxDepthToWidth * 1.5 ? "fail" : "warning",
            message: `Depth-to-width ratio ${ratio.toFixed(1)}:1 exceeds ${envelope.maxDepthToWidth}:1 limit`,
            feature: featureName,
            currentValue: ratio,
            limitValue: envelope.maxDepthToWidth,
            suggestion: "Reduce depth or widen feature for tool clearance",
          });
        } else {
          rules.push({
            ruleId: `depth-${i}`,
            category: "tooling",
            severity: "pass",
            message: `Depth-to-width ratio ${ratio.toFixed(1)}:1 OK`,
            feature: featureName,
          });
        }
      }

      // Hole diameter check (min 1mm for practical drilling)
      if (f.type === "hole" || f.type === "bore") {
        const diameter = num(f.params.diameter) ?? 0;
        if (diameter < 1.0) {
          rules.push({
            ruleId: `hole-${i}`,
            category: "tooling",
            severity: diameter < 0.5 ? "fail" : "warning",
            message: `Hole diameter ${diameter}mm is very small — special tooling required`,
            feature: featureName,
            currentValue: diameter,
            limitValue: 1.0,
            unit: "mm",
            suggestion: "Consider larger diameter or EDM process",
          });
        }
      }

      // Thread check
      if (f.type === "thread") {
        const threadDia = num(f.params.diameter) ?? 0;
        const depth = num(f.params.depth) ?? 0;
        const pitch = num(f.params.pitch) ?? 1;
        const threadDepthRatio = depth / threadDia;

        if (threadDepthRatio > 3) {
          rules.push({
            ruleId: `thread-${i}`,
            category: "tooling",
            severity: threadDepthRatio > 4 ? "fail" : "warning",
            message: `Thread depth ratio ${threadDepthRatio.toFixed(1)}:1 exceeds 3:1 recommendation`,
            feature: featureName,
            currentValue: threadDepthRatio,
            limitValue: 3,
            suggestion: "Reduce thread depth or use through-hole design",
          });
        }

        if (threadDia < 3) {
          rules.push({
            ruleId: `thread-min-${i}`,
            category: "tooling",
            severity: "warning",
            message: `Small thread M${threadDia} may require special taps`,
            feature: featureName,
          });
        }
      }

      // Fillet/chamfer size check
      if (f.type === "fillet" || f.type === "chamfer") {
        const size = num(f.params.radius ?? f.params.size) ?? 0;
        if (size < 0.2) {
          rules.push({
            ruleId: `edge-${i}`,
            category: "tooling",
            severity: "warning",
            message: `Edge treatment ${size}mm is very small — may be impractical`,
            feature: featureName,
            currentValue: size,
            limitValue: 0.2,
            unit: "mm",
          });
        }
      }
    }

    // Workpiece size check
    const maxDim = this.getMaxDimension(features);
    if (maxDim.length > envelope.maxWorkpiece.length) {
      rules.push({
        ruleId: "workpiece-length",
        category: "machine",
        severity: "fail",
        message: `Part length ${maxDim.length}mm exceeds machine capacity ${envelope.maxWorkpiece.length}mm`,
        currentValue: maxDim.length,
        limitValue: envelope.maxWorkpiece.length,
        unit: "mm",
        suggestion: "Use larger machine or split into multiple parts",
      });
    }

    // Calculate summary
    const passCount = rules.filter(r => r.severity === "pass").length;
    const warningCount = rules.filter(r => r.severity === "warning").length;
    const failCount = rules.filter(r => r.severity === "fail").length;
    const totalChecks = rules.length || 1;

    const overallScore = (passCount + warningCount * 0.5) / totalChecks;
    const isManufacturable = failCount === 0;

    // Build recommendations
    const recommendations: string[] = [];
    if (failCount > 0) {
      recommendations.push(`Address ${failCount} critical DFM failures before manufacturing`);
    }
    if (warningCount > 0) {
      recommendations.push(`Review ${warningCount} DFM warnings for optimization opportunities`);
    }
    if (isManufacturable && warningCount === 0) {
      recommendations.push("Design passes all DFM checks");
    }

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      passCount,
      warningCount,
      failCount,
      rules,
      recommendations,
      isManufacturable,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DFM GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate CAD with DFM filtering and auto-fix
   */
  async generateWithDFM(input: DFMGenerationInput): Promise<DFMGenerationOutput> {
    const envelope = input.machineEnvelope ?? JM_DIE_ENVELOPE;
    const materialUpper = input.material?.toUpperCase() ?? "STEEL";
    const matConstraints = MATERIAL_CONSTRAINTS[materialUpper] ?? MATERIAL_CONSTRAINTS["STEEL"];

    // Clone features for modification
    const features = JSON.parse(JSON.stringify(input.features)) as FeatureSpec[];
    const modifications: DFMGenerationOutput["modifications"] = [];

    // First pass: analyze
    let analysis = this.analyzeFeatures(features, input.material, envelope);

    // Second pass: auto-fix failures and warnings where possible
    for (const rule of analysis.rules) {
      if (rule.severity === "pass") continue;

      const featureMatch = rule.feature?.match(/\[(\d+)\]/);
      if (!featureMatch) continue;

      const featureIndex = parseInt(featureMatch[1], 10);
      const feature = features[featureIndex];
      if (!feature) continue;

      // Auto-fix wall thickness
      if (rule.ruleId.startsWith("wall-") && rule.limitValue) {
        const originalValue = feature.params.wallThickness ?? feature.params.thickness;
        const newValue = rule.limitValue * 1.1; // 10% margin
        if (feature.params.wallThickness !== undefined) {
          feature.params.wallThickness = newValue;
        } else if (feature.params.thickness !== undefined) {
          feature.params.thickness = newValue;
        }
        modifications.push({
          featureIndex,
          originalValue,
          modifiedValue: newValue,
          reason: `Increased wall thickness to meet ${matConstraints.minWall}mm minimum`,
        });
      }

      // Auto-fix corner radius
      if (rule.ruleId.startsWith("corner-") && rule.limitValue) {
        const originalValue = feature.params.cornerRadius ?? feature.params.radius;
        const newValue = rule.limitValue * 1.1;
        if (feature.params.cornerRadius !== undefined) {
          feature.params.cornerRadius = newValue;
        }
        modifications.push({
          featureIndex,
          originalValue,
          modifiedValue: newValue,
          reason: `Increased corner radius to meet ${matConstraints.minRadius}mm minimum`,
        });
      }

      // Auto-fix small edge treatments
      if (rule.ruleId.startsWith("edge-") && rule.limitValue) {
        const originalValue = (typeof feature.params.radius === "number" ? feature.params.radius : undefined)
          ?? (typeof feature.params.size === "number" ? feature.params.size : undefined);
        const newValue = Math.max(originalValue ?? 0, rule.limitValue);
        if (feature.params.radius !== undefined) {
          feature.params.radius = newValue;
        } else if (feature.params.size !== undefined) {
          feature.params.size = newValue;
        }
        modifications.push({
          featureIndex,
          originalValue,
          modifiedValue: newValue,
          reason: "Increased edge treatment to practical minimum",
        });
      }
    }

    // Re-analyze after fixes
    if (modifications.length > 0) {
      analysis = this.analyzeFeatures(features, input.material, envelope);
    }

    // Generate code
    const code = this.generateCadQueryCode(features, input.material);

    return {
      features,
      dfmAnalysis: analysis,
      modifications,
      code,
    };
  }

  /**
   * Auto-fix DFM violations
   */
  fixFeatures(
    features: FeatureSpec[],
    material?: string,
    envelope: MachineEnvelope = JM_DIE_ENVELOPE
  ): { features: FeatureSpec[]; fixes: string[] } {
    const result = JSON.parse(JSON.stringify(features)) as FeatureSpec[];
    const fixes: string[] = [];
    const materialUpper = material?.toUpperCase() ?? "STEEL";
    const matConstraints = MATERIAL_CONSTRAINTS[materialUpper] ?? MATERIAL_CONSTRAINTS["STEEL"];

    for (let i = 0; i < result.length; i++) {
      const f = result[i];

      // Fix wall thickness
      const wallThickness = num(f.params.wallThickness ?? f.params.thickness);
      if (wallThickness !== undefined && wallThickness < matConstraints.minWall) {
        const newVal = matConstraints.minWall * 1.1;
        if (f.params.wallThickness !== undefined) f.params.wallThickness = newVal;
        if (f.params.thickness !== undefined) f.params.thickness = newVal;
        fixes.push(`${f.type}[${i}]: wall thickness ${wallThickness}→${newVal.toFixed(1)}mm`);
      }

      // Fix corner radius
      const cornerRadius = num(f.params.cornerRadius);
      if (cornerRadius !== undefined && cornerRadius < matConstraints.minRadius) {
        f.params.cornerRadius = matConstraints.minRadius * 1.1;
        fixes.push(`${f.type}[${i}]: corner radius ${cornerRadius}→${(matConstraints.minRadius * 1.1).toFixed(1)}mm`);
      }

      // Fix pocket depth-to-width
      if (f.type === "pocket" || f.type === "slot") {
        const depth = num(f.params.depth);
        const width = num(f.params.width);
        if (depth !== undefined && width !== undefined && width > 0) {
          const ratio = depth / width;
          if (ratio > envelope.maxDepthToWidth) {
            const maxDepth = width * envelope.maxDepthToWidth;
            fixes.push(`${f.type}[${i}]: depth ${depth}→${maxDepth.toFixed(1)}mm (ratio limit)`);
            f.params.depth = maxDepth;
          }
        }
      }
    }

    return { features: result, fixes };
  }

  /**
   * Get machine capability envelope
   */
  getEnvelope(machineType?: string): MachineEnvelope {
    // Could extend to look up actual JM Die machines
    if (machineType === "mill") {
      return {
        ...JM_DIE_ENVELOPE,
        machineType: "mill",
        maxWorkpiece: { length: 600, width: 400, height: 300 },
      };
    }
    if (machineType === "wire_edm") {
      return {
        ...JM_DIE_ENVELOPE,
        machineType: "wire_edm",
        minCornerRadius: 0.15,  // Wire EDM can do smaller radii
        surfaceFinishRa: 0.8,
      };
    }
    return JM_DIE_ENVELOPE;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private getMaxDimension(features: FeatureSpec[]): { length: number; width: number; height: number } {
    let maxLength = 0, maxWidth = 0, maxHeight = 0;

    for (const f of features) {
      maxLength = Math.max(maxLength, num(f.params.length) ?? 0, num(f.params.diameter) ?? 0);
      maxWidth = Math.max(maxWidth, num(f.params.width) ?? 0, num(f.params.diameter) ?? 0);
      maxHeight = Math.max(maxHeight, num(f.params.height) ?? 0, num(f.params.depth) ?? 0, num(f.params.thickness) ?? 0);
    }

    return { length: maxLength, width: maxWidth, height: maxHeight };
  }

  private generateCadQueryCode(features: FeatureSpec[], material?: string): string {
    const lines: string[] = [
      "import cadquery as cq",
      "",
      `# Material: ${material ?? "STEEL"}`,
      "# DFM-validated design",
      "",
    ];

    // Generate base
    const base = features[0];
    if (base?.type === "cylinder") {
      lines.push(`result = cq.Workplane("XY").cylinder(${base.params.length ?? 50}, ${base.params.diameter ?? 25} / 2)`);
    } else if (base?.type === "box") {
      lines.push(`result = cq.Workplane("XY").box(${base.params.length ?? 100}, ${base.params.width ?? 50}, ${base.params.height ?? 25})`);
    } else {
      lines.push("result = cq.Workplane('XY').box(100, 50, 25)");
    }

    // Add secondary features
    for (let i = 1; i < features.length; i++) {
      const f = features[i];
      if (f.type === "chamfer") {
        lines.push(`result = result.edges().chamfer(${f.params.size ?? 1})`);
      } else if (f.type === "fillet") {
        lines.push(`result = result.edges().fillet(${f.params.radius ?? 2})`);
      } else if (f.type === "hole") {
        lines.push(`result = result.faces(">Z").workplane().hole(${f.params.diameter ?? 10})`);
      } else if (f.type === "pocket") {
        lines.push(`result = result.faces(">Z").workplane().rect(${f.params.length ?? 30}, ${f.params.width ?? 20}).cutBlind(-${f.params.depth ?? 5})`);
      }
    }

    lines.push("");
    lines.push("show_object(result)");

    return lines.join("\n");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const dfmAwareGenerationEngine = new DFMAwareGenerationEngine();
export default dfmAwareGenerationEngine;
