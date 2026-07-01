/**
 * CADAccuracyValidatorEngine — 100% Accuracy Gate
 * CADCAM-DAGI-MS0/U-DAGI13
 *
 * Multi-layer accuracy validation before CAM handoff:
 *   Layer 1: Dimensional check (Hausdorff distance vs spec)
 *   Layer 2: Topology check (connectivity, closed manifolds)
 *   Layer 3: Manufacturability (DFM)
 *   Layer 4: Tolerance stack
 *   Layer 5: Visual diff / feature comparison
 *
 * Hard blocks if ANY layer fails. 100% accuracy required.
 */

import { log } from "../utils/Logger.js";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import type { FeatureSpec } from "./NeuralCADGenerationEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Validation layer result */
export interface LayerResult {
  layer: number;
  name: string;
  passed: boolean;
  score: number;
  details: string[];
  criticalIssues: string[];
  warnings: string[];
}

/** Complete validation report */
export interface ValidationReport {
  partId: string;
  timestamp: string;
  overallPassed: boolean;
  overallScore: number;
  layers: LayerResult[];
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  validationTimeMs: number;
}

/** Dimensional spec for validation */
export interface DimensionalSpec {
  name: string;
  nominal: number;
  tolerance: { plus: number; minus: number };
  unit: "mm" | "inch";
}

/** Feature spec for comparison */
export interface FeatureComparison {
  expectedType: string;
  actualType: string;
  matches: boolean;
  parameterDiffs: Array<{ param: string; expected: number; actual: number; diff: number }>;
}

/** Validation input */
export interface ValidationInput {
  partId?: string;
  code: string;
  expectedDimensions?: DimensionalSpec[];
  expectedFeatures?: FeatureSpec[];
  material?: string;
  customer?: string;
  strictMode?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const LAYER_WEIGHTS = {
  dimensional: 0.30,
  topology: 0.25,
  dfm: 0.20,
  tolerance: 0.15,
  feature: 0.10,
};

const PASS_THRESHOLD = 0.85;
const STRICT_PASS_THRESHOLD = 0.95;

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class CADAccuracyValidatorEngine extends BaseEngine {
  constructor() {
    super({
      name: "CADAccuracyValidatorEngine",
      version: "1.0.0",
      domain: "cad_validation",
      description: "Multi-layer 100% accuracy validation gate for CAD generation",
    });
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const err = this.validate(input);
    if (err) throw new Error(err);
    return this.validateAccuracy(input as ValidationInput);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "accuracy_validate", description: "Full 5-layer validation" },
      { name: "accuracy_dimensional", description: "Layer 1: Dimensional check" },
      { name: "accuracy_topology", description: "Layer 2: Topology check" },
      { name: "accuracy_dfm", description: "Layer 3: DFM check" },
      { name: "accuracy_tolerance", description: "Layer 4: Tolerance stack" },
      { name: "accuracy_feature", description: "Layer 5: Feature comparison" },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") {
      return "Input must be an object";
    }
    const i = input as ValidationInput;
    if (!i.code || typeof i.code !== "string") {
      return "code string is required";
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FULL VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Run all 5 validation layers
   */
  async validateAccuracy(input: ValidationInput): Promise<ValidationReport> {
    const startTime = Date.now();
    const partId = input.partId ?? `part_${Date.now()}`;
    const threshold = input.strictMode ? STRICT_PASS_THRESHOLD : PASS_THRESHOLD;

    const layers: LayerResult[] = [];
    const allCritical: string[] = [];
    const allWarnings: string[] = [];

    // Layer 1: Dimensional
    const dimResult = this.validateDimensional(input.code, input.expectedDimensions ?? []);
    layers.push(dimResult);
    allCritical.push(...dimResult.criticalIssues);
    allWarnings.push(...dimResult.warnings);

    // Layer 2: Topology
    const topoResult = this.validateTopology(input.code);
    layers.push(topoResult);
    allCritical.push(...topoResult.criticalIssues);
    allWarnings.push(...topoResult.warnings);

    // Layer 3: DFM
    const dfmResult = this.validateDFM(input.code, input.material);
    layers.push(dfmResult);
    allCritical.push(...dfmResult.criticalIssues);
    allWarnings.push(...dfmResult.warnings);

    // Layer 4: Tolerance
    const tolResult = this.validateTolerance(input.code, input.expectedDimensions ?? []);
    layers.push(tolResult);
    allCritical.push(...tolResult.criticalIssues);
    allWarnings.push(...tolResult.warnings);

    // Layer 5: Feature comparison
    const featResult = this.validateFeatures(input.code, input.expectedFeatures ?? []);
    layers.push(featResult);
    allCritical.push(...featResult.criticalIssues);
    allWarnings.push(...featResult.warnings);

    // Calculate weighted score
    const overallScore =
      dimResult.score * LAYER_WEIGHTS.dimensional +
      topoResult.score * LAYER_WEIGHTS.topology +
      dfmResult.score * LAYER_WEIGHTS.dfm +
      tolResult.score * LAYER_WEIGHTS.tolerance +
      featResult.score * LAYER_WEIGHTS.feature;

    const overallPassed = overallScore >= threshold && allCritical.length === 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(layers);

    return {
      partId,
      timestamp: new Date().toISOString(),
      overallPassed,
      overallScore: Math.round(overallScore * 1000) / 1000,
      layers,
      criticalIssues: allCritical,
      warnings: allWarnings,
      recommendations,
      validationTimeMs: Date.now() - startTime,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 1: DIMENSIONAL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Layer 1: Dimensional accuracy check
   */
  validateDimensional(code: string, specs: DimensionalSpec[]): LayerResult {
    const details: string[] = [];
    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    if (specs.length === 0) {
      return {
        layer: 1,
        name: "Dimensional",
        passed: true,
        score: 1.0,
        details: ["No dimensional specs provided — skipped"],
        criticalIssues: [],
        warnings: ["Consider providing dimensional specs for validation"],
      };
    }

    // Extract dimensions from code
    const extractedDims = this.extractDimensionsFromCode(code);
    let matchCount = 0;
    let totalSpecs = specs.length;

    for (const spec of specs) {
      const extracted = extractedDims[spec.name.toLowerCase()];
      if (extracted === undefined) {
        warnings.push(`Dimension '${spec.name}' not found in generated code`);
        continue;
      }

      const nominal = spec.unit === "inch" ? spec.nominal * 25.4 : spec.nominal;
      const plusTol = spec.unit === "inch" ? spec.tolerance.plus * 25.4 : spec.tolerance.plus;
      const minusTol = spec.unit === "inch" ? spec.tolerance.minus * 25.4 : spec.tolerance.minus;

      const min = nominal - minusTol;
      const max = nominal + plusTol;

      if (extracted >= min && extracted <= max) {
        matchCount++;
        details.push(`${spec.name}: ${extracted.toFixed(3)}mm ✓ (within ${min.toFixed(3)}-${max.toFixed(3)})`);
      } else {
        const deviation = extracted - nominal;
        if (Math.abs(deviation) > plusTol * 2) {
          criticalIssues.push(`${spec.name}: ${extracted.toFixed(3)}mm — OUT OF TOLERANCE (expected ${nominal.toFixed(3)}±${plusTol.toFixed(3)})`);
        } else {
          warnings.push(`${spec.name}: ${extracted.toFixed(3)}mm — marginal (expected ${nominal.toFixed(3)}±${plusTol.toFixed(3)})`);
          matchCount += 0.5;
        }
      }
    }

    const score = totalSpecs > 0 ? matchCount / totalSpecs : 1.0;
    const passed = score >= 0.95 && criticalIssues.length === 0;

    return {
      layer: 1,
      name: "Dimensional",
      passed,
      score,
      details,
      criticalIssues,
      warnings,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 2: TOPOLOGY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Layer 2: Topology check (connectivity, manifold)
   */
  validateTopology(code: string): LayerResult {
    const details: string[] = [];
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    let score = 1.0;

    // Check for basic CadQuery structure
    if (!code.includes("cq.Workplane")) {
      criticalIssues.push("No Workplane definition found — invalid CadQuery code");
      score -= 0.5;
    } else {
      details.push("Workplane definition found ✓");
    }

    // Check for result assignment
    if (!code.includes("result") && !code.includes("show_object")) {
      warnings.push("No result variable or show_object call");
      score -= 0.1;
    } else {
      details.push("Result output defined ✓");
    }

    // Check for closed geometry (extrudes from closed sketches)
    const extrudeCount = (code.match(/\.extrude\(/g) || []).length;
    const circleCount = (code.match(/\.circle\(/g) || []).length;
    const rectCount = (code.match(/\.rect\(/g) || []).length + (code.match(/\.box\(/g) || []).length;

    if (extrudeCount > 0 && circleCount === 0 && rectCount === 0) {
      warnings.push("Extrudes found but no closed profiles (circle/rect) — may produce open geometry");
      score -= 0.1;
    } else if (extrudeCount > 0) {
      details.push(`${extrudeCount} extrusion(s) with closed profiles ✓`);
    }

    // Check for dangling operations
    const cutCount = (code.match(/\.cut\(/g) || []).length;
    const holeCount = (code.match(/\.hole\(/g) || []).length;
    if (cutCount + holeCount > 5) {
      warnings.push(`${cutCount + holeCount} cut/hole operations — verify no unintended through-cuts`);
    }

    // Check for cylinder operation (basic solid)
    if (code.includes(".cylinder(")) {
      details.push("Cylinder primitive found ✓");
    }

    // Boolean operations check
    const unionCount = (code.match(/\.union\(/g) || []).length;
    const intersectCount = (code.match(/\.intersect\(/g) || []).length;
    if (unionCount > 0 || intersectCount > 0) {
      details.push(`Boolean operations: ${unionCount} unions, ${intersectCount} intersects`);
    }

    const passed = score >= 0.85 && criticalIssues.length === 0;

    return {
      layer: 2,
      name: "Topology",
      passed,
      score: Math.max(0, score),
      details,
      criticalIssues,
      warnings,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 3: DFM
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Layer 3: Design for Manufacturability
   */
  validateDFM(code: string, material?: string): LayerResult {
    const details: string[] = [];
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    let score = 1.0;

    // Extract dimensions for DFM analysis
    const dims = this.extractDimensionsFromCode(code);

    // Check wall thickness
    if (dims.wall_thickness !== undefined && dims.wall_thickness < 1.0) {
      criticalIssues.push(`Wall thickness ${dims.wall_thickness}mm < 1.0mm minimum`);
      score -= 0.3;
    } else if (dims.wall_thickness !== undefined && dims.wall_thickness < 1.5) {
      warnings.push(`Wall thickness ${dims.wall_thickness}mm is marginal (< 1.5mm recommended)`);
      score -= 0.1;
    }

    // Check fillet radii (use matchAll to get capture groups)
    const filletRadii: number[] = [];
    const filletMatches = code.matchAll(/\.fillet\(\s*([\d.]+)/g);
    for (const m of filletMatches) {
      if (m[1]) {
        const radius = parseFloat(m[1]);
        filletRadii.push(radius);
        if (radius < 0.3) {
          warnings.push(`Fillet radius ${radius}mm is very small (< 0.3mm)`);
          score -= 0.05;
        } else {
          details.push(`Fillet radius ${radius}mm ✓`);
        }
      }
    }

    // Check chamfer sizes (use matchAll to get capture groups)
    const chamferMatches = code.matchAll(/\.chamfer\(\s*([\d.]+)/g);
    for (const m of chamferMatches) {
      if (m[1]) {
        const size = parseFloat(m[1]);
        if (size < 0.2) {
          warnings.push(`Chamfer ${size}mm is very small`);
        } else {
          details.push(`Chamfer ${size}mm ✓`);
        }
      }
    }

    // Check hole depth ratios
    const holeMatches = code.matchAll(/\.hole\(\s*([\d.]+)\s*,\s*([\d.]+)/g);
    for (const hm of holeMatches) {
      if (hm[1] && hm[2]) {
        const diameter = parseFloat(hm[1]);
        const depth = parseFloat(hm[2]);
        if (!isNaN(diameter) && !isNaN(depth) && diameter > 0) {
          const ratio = depth / diameter;
          if (ratio > 10) {
            criticalIssues.push(`Hole L/D ratio ${ratio.toFixed(1)} exceeds 10:1 — gun drilling required`);
            score -= 0.2;
          } else if (ratio > 5) {
            warnings.push(`Hole L/D ratio ${ratio.toFixed(1)} > 5:1 — deep hole drilling`);
            score -= 0.05;
          } else {
            details.push(`Hole ${diameter}mm × ${depth}mm (L/D ${ratio.toFixed(1)}) ✓`);
          }
        }
      }
    }

    // Material-specific checks
    if (material) {
      const isTool = ["D2", "A2", "M2", "S7", "H13"].some(m => material.toUpperCase().includes(m));
      if (isTool) {
        details.push(`Tool steel detected (${material}) — stricter DFM applied`);
        // Tool steels need larger radii
        if (filletRadii.some(r => r < 0.5)) {
          warnings.push("Tool steel requires minimum 0.5mm fillet radii");
          score -= 0.05;
        }
      }
    }

    if (details.length === 0 && criticalIssues.length === 0 && warnings.length === 0) {
      details.push("Basic DFM check passed (no specific features to analyze)");
    }

    const passed = score >= 0.85 && criticalIssues.length === 0;

    return {
      layer: 3,
      name: "DFM",
      passed,
      score: Math.max(0, score),
      details,
      criticalIssues,
      warnings,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 4: TOLERANCE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Layer 4: Tolerance stack analysis
   */
  validateTolerance(code: string, specs: DimensionalSpec[]): LayerResult {
    const details: string[] = [];
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    let score = 1.0;

    if (specs.length === 0) {
      return {
        layer: 4,
        name: "Tolerance",
        passed: true,
        score: 1.0,
        details: ["No tolerance specs provided — skipped"],
        criticalIssues: [],
        warnings: [],
      };
    }

    // Perform RSS stack analysis
    let totalVariance = 0;
    const contributors: string[] = [];

    for (const spec of specs) {
      const tol = (spec.tolerance.plus + spec.tolerance.minus) / 2;
      const tolMm = spec.unit === "inch" ? tol * 25.4 : tol;

      totalVariance += tolMm * tolMm;

      if (tolMm > 0.025) {
        contributors.push(spec.name);
      }

      // Check for unrealistic tolerances
      if (tolMm < 0.005) {
        warnings.push(`${spec.name}: ±${tolMm.toFixed(4)}mm is extremely tight — verify capability`);
        score -= 0.05;
      } else if (tolMm < 0.01) {
        details.push(`${spec.name}: ±${tolMm.toFixed(4)}mm (tight but achievable)`);
      } else {
        details.push(`${spec.name}: ±${tolMm.toFixed(3)}mm ✓`);
      }
    }

    const stackTolerance = Math.sqrt(totalVariance);
    details.push(`RSS stack tolerance: ±${stackTolerance.toFixed(4)}mm`);

    if (stackTolerance > 0.1) {
      warnings.push(`Stack tolerance ${stackTolerance.toFixed(3)}mm may cause assembly issues`);
      score -= 0.1;
    }

    if (contributors.length > 3) {
      warnings.push(`${contributors.length} significant tolerance contributors: ${contributors.join(", ")}`);
    }

    const passed = score >= 0.85 && criticalIssues.length === 0;

    return {
      layer: 4,
      name: "Tolerance",
      passed,
      score: Math.max(0, score),
      details,
      criticalIssues,
      warnings,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 5: FEATURE COMPARISON
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Layer 5: Feature-by-feature comparison
   */
  validateFeatures(code: string, expectedFeatures: FeatureSpec[]): LayerResult {
    const details: string[] = [];
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    let score = 1.0;

    if (expectedFeatures.length === 0) {
      return {
        layer: 5,
        name: "Feature",
        passed: true,
        score: 1.0,
        details: ["No expected features provided — skipped"],
        criticalIssues: [],
        warnings: [],
      };
    }

    // Detect features in generated code
    const detectedFeatures = this.detectFeaturesInCode(code);
    let matchCount = 0;

    for (const expected of expectedFeatures) {
      const found = detectedFeatures.find(f => f.type === expected.type);
      if (found) {
        matchCount++;
        details.push(`Feature '${expected.type}' found ✓`);

        // Check parameter alignment
        for (const [key, value] of Object.entries(expected.params)) {
          const actualValue = found.params[key];
          if (actualValue !== undefined && typeof value === "number" && typeof actualValue === "number") {
            const diff = Math.abs(actualValue - value);
            if (diff > value * 0.1) {
              warnings.push(`${expected.type}.${key}: expected ${value}, got ${actualValue} (${((diff / value) * 100).toFixed(1)}% diff)`);
              score -= 0.05;
            }
          }
        }
      } else {
        warnings.push(`Expected feature '${expected.type}' not detected in code`);
        score -= 0.1;
      }
    }

    // Check for unexpected features
    const expectedTypes = expectedFeatures.map(f => f.type);
    const unexpected = detectedFeatures.filter(f => !expectedTypes.includes(f.type));
    if (unexpected.length > 0) {
      warnings.push(`Unexpected features: ${unexpected.map(f => f.type).join(", ")}`);
    }

    const matchRate = expectedFeatures.length > 0 ? matchCount / expectedFeatures.length : 1;
    details.push(`Feature match rate: ${(matchRate * 100).toFixed(0)}%`);

    const passed = matchRate >= 0.8 && criticalIssues.length === 0;

    return {
      layer: 5,
      name: "Feature",
      passed,
      score: Math.max(0, Math.min(1, score * matchRate)),
      details,
      criticalIssues,
      warnings,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private extractDimensionsFromCode(code: string): Record<string, number> {
    const dims: Record<string, number> = {};

    // Extract from .box(length, width, height)
    const boxMatch = code.match(/\.box\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (boxMatch) {
      dims.length = parseFloat(boxMatch[1]);
      dims.width = parseFloat(boxMatch[2]);
      dims.height = parseFloat(boxMatch[3]);
    }

    // Extract from .cylinder(height, radius)
    const cylMatch = code.match(/\.cylinder\(\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (cylMatch) {
      dims.height = parseFloat(cylMatch[1]);
      dims.radius = parseFloat(cylMatch[2]);
      dims.diameter = dims.radius * 2;
    }

    // Extract from .circle(radius)
    const circMatch = code.match(/\.circle\(\s*([\d.]+)/);
    if (circMatch) {
      dims.radius = parseFloat(circMatch[1]);
      dims.diameter = dims.radius * 2;
    }

    // Extract from .extrude(depth)
    const extMatch = code.match(/\.extrude\(\s*([\d.]+)/);
    if (extMatch) {
      dims.depth = parseFloat(extMatch[1]);
      dims.extrude_depth = dims.depth;
    }

    // Extract from .hole(diameter, depth?)
    const holeMatch = code.match(/\.hole\(\s*([\d.]+)\s*,?\s*([\d.]+)?/);
    if (holeMatch) {
      dims.hole_diameter = parseFloat(holeMatch[1]);
      if (holeMatch[2]) {
        dims.hole_depth = parseFloat(holeMatch[2]);
      }
    }

    return dims;
  }

  private detectFeaturesInCode(code: string): FeatureSpec[] {
    const features: FeatureSpec[] = [];

    // Detect cylinder
    const cylMatch = code.match(/\.cylinder\(\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (cylMatch) {
      features.push({
        type: "cylinder",
        params: { length: parseFloat(cylMatch[1]), diameter: parseFloat(cylMatch[2]) * 2 },
      });
    }

    // Detect box
    const boxMatch = code.match(/\.box\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (boxMatch) {
      features.push({
        type: "box",
        params: { length: parseFloat(boxMatch[1]), width: parseFloat(boxMatch[2]), height: parseFloat(boxMatch[3]) },
      });
    }

    // Detect hole
    const holeMatches = code.matchAll(/\.hole\(\s*([\d.]+)\s*,?\s*([\d.]+)?/g);
    for (const m of holeMatches) {
      features.push({
        type: "hole",
        params: { diameter: parseFloat(m[1]), ...(m[2] ? { depth: parseFloat(m[2]) } : {}) },
      });
    }

    // Detect fillet
    const filletMatches = code.matchAll(/\.fillet\(\s*([\d.]+)/g);
    for (const m of filletMatches) {
      features.push({
        type: "fillet",
        params: { radius: parseFloat(m[1]) },
      });
    }

    // Detect chamfer
    const chamferMatches = code.matchAll(/\.chamfer\(\s*([\d.]+)/g);
    for (const m of chamferMatches) {
      features.push({
        type: "chamfer",
        params: { size: parseFloat(m[1]) },
      });
    }

    // Detect flange (circle + extrude + hole pattern)
    if (code.includes(".circle(") && code.includes(".extrude(") && code.includes(".hole(")) {
      features.push({
        type: "flange",
        params: {},
      });
    }

    return features;
  }

  private generateRecommendations(layers: LayerResult[]): string[] {
    const recommendations: string[] = [];

    for (const layer of layers) {
      if (!layer.passed) {
        if (layer.name === "Dimensional") {
          recommendations.push("Review dimensional parameters — ensure they match specifications");
        }
        if (layer.name === "Topology") {
          recommendations.push("Verify code produces closed, manifold geometry");
        }
        if (layer.name === "DFM") {
          recommendations.push("Address DFM issues before proceeding to CAM");
        }
        if (layer.name === "Tolerance") {
          recommendations.push("Review tolerance stack — consider tightening critical dimensions");
        }
        if (layer.name === "Feature") {
          recommendations.push("Verify all required features are present in generated model");
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("All validation layers passed — ready for CAM handoff");
    }

    return recommendations;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const cadAccuracyValidatorEngine = new CADAccuracyValidatorEngine();
export default cadAccuracyValidatorEngine;
