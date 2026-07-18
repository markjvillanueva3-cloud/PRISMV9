/**
 * ToleranceAwareGenerationEngine — GD&T-Aware CAD Generation
 * CADCAM-DAGI-MS0/U-DAGI12
 *
 * Tolerance-aware CAD generation with GD&T reasoning:
 *   - Automatic GD&T application to generated features
 *   - Tolerance stack analysis integration
 *   - Stack-up violation warnings
 *   - Customer tolerance standards (ITW, ALCOA, etc.)
 *   - ISO 286 fit recommendations
 *
 * Integrates with:
 *   - ToleranceStackEngine for stack analysis
 *   - ToleranceStackUpEngine for statistical analysis
 *   - CADDrawingKnowledgeEngine for GD&T correctness
 */

import { log } from "../utils/Logger.js";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./BaseEngine.js";
import type { FeatureSpec } from "./NeuralCADGenerationEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** GD&T symbol types (per ASME Y14.5 / ISO 1101) */
export type GDTSymbol =
  | "flatness"
  | "straightness"
  | "circularity"
  | "cylindricity"
  | "profile_line"
  | "profile_surface"
  | "perpendicularity"
  | "angularity"
  | "parallelism"
  | "position"
  | "concentricity"
  | "symmetry"
  | "runout_circular"
  | "runout_total";

/** Material condition modifier */
export type MaterialCondition = "MMC" | "LMC" | "RFS";

/** GD&T Feature Control Frame */
export interface FeatureControlFrame {
  symbol: GDTSymbol;
  tolerance: number;
  unit: "mm" | "inch";
  datumRefs?: string[];
  materialCondition?: MaterialCondition;
  projectedZone?: boolean;
  diameter?: boolean;  // Ⓓ cylindrical tolerance zone
}

/** Tolerance specification for a feature */
export interface FeatureTolerance {
  featureId: string;
  featureType: string;
  linearTolerance?: {
    plus: number;
    minus: number;
    unit: "mm" | "inch";
  };
  gdtCallouts: FeatureControlFrame[];
  surfaceFinish?: {
    Ra: number;
    unit: "μm" | "μin";
  };
  fitType?: "clearance" | "transition" | "interference";
  isoFit?: string;  // e.g., "H7/h6"
}

/** Customer tolerance standard */
export interface CustomerStandard {
  customerId: string;
  name: string;
  defaultLinearTolerance: { plus: number; minus: number };
  defaultAngularTolerance: number;
  criticalFeatureSymbols: GDTSymbol[];
  preferredFits: Record<string, string>;
  notes: string[];
}

/** Stack analysis result */
export interface StackAnalysis {
  dimension: string;
  nominal: number;
  stackTolerance: number;
  minGap: number;
  maxGap: number;
  passesRequirement: boolean;
  criticalContributors: string[];
  recommendation?: string;
}

/** Tolerance generation input */
export interface ToleranceGenerationInput {
  features: FeatureSpec[];
  customer?: string;
  assemblyContext?: {
    matingParts: string[];
    criticalDimensions: string[];
    maxStackTolerance?: number;
  };
  machineCapability?: {
    linearCapability: number;
    positionCapability: number;
    runoutCapability: number;
  };
}

/** Tolerance generation output */
export interface ToleranceGenerationOutput {
  features: FeatureSpec[];
  tolerances: FeatureTolerance[];
  stackAnalyses: StackAnalysis[];
  datumStructure: string[];
  warnings: string[];
  gdtAccuracy: number;
  code: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Default machine capability (JM Die typical) */
const DEFAULT_MACHINE_CAPABILITY = {
  linearCapability: 0.025,    // ±0.001" = 0.025mm
  positionCapability: 0.05,   // ±0.002" position
  runoutCapability: 0.03,     // 0.001" TIR
};

/** Customer tolerance standards */
const CUSTOMER_STANDARDS: Record<string, CustomerStandard> = {
  "ITW": {
    customerId: "itw",
    name: "Illinois Tool Works",
    defaultLinearTolerance: { plus: 0.025, minus: 0.025 },
    defaultAngularTolerance: 0.5,
    criticalFeatureSymbols: ["position", "perpendicularity", "runout_total"],
    preferredFits: { bore: "H7/h6", shaft: "h6" },
    notes: ["Die tooling requires tight position tolerance", "Header die cavities critical"],
  },
  "ALCOA": {
    customerId: "alcoa",
    name: "Alcoa Fastening Systems",
    defaultLinearTolerance: { plus: 0.038, minus: 0.038 },
    defaultAngularTolerance: 0.5,
    criticalFeatureSymbols: ["position", "concentricity", "profile_surface"],
    preferredFits: { bore: "H7/g6", shaft: "f7" },
    notes: ["Aerospace-grade tolerancing", "Concentricity critical for fasteners"],
  },
  "SFS": {
    customerId: "sfs",
    name: "SFS Group",
    defaultLinearTolerance: { plus: 0.05, minus: 0.05 },
    defaultAngularTolerance: 1.0,
    criticalFeatureSymbols: ["position", "parallelism"],
    preferredFits: { bore: "H8/h7", shaft: "h7" },
    notes: ["Standard fastener tolerancing"],
  },
  "DEFAULT": {
    customerId: "default",
    name: "Standard JM Die",
    defaultLinearTolerance: { plus: 0.025, minus: 0.025 },
    defaultAngularTolerance: 0.5,
    criticalFeatureSymbols: ["position", "perpendicularity"],
    preferredFits: { bore: "H7/h6", shaft: "h6" },
    notes: ["JM Die standard practice"],
  },
};

/** Feature-to-GD&T mapping rules */
const FEATURE_GDT_RULES: Record<string, { symbols: GDTSymbol[]; note: string }> = {
  cylinder: { symbols: ["cylindricity", "runout_circular"], note: "Rotational features need cylindricity" },
  hole: { symbols: ["position", "perpendicularity"], note: "Holes need position to datum" },
  bore: { symbols: ["position", "cylindricity", "concentricity"], note: "Bores critical for fit" },
  flange: { symbols: ["perpendicularity", "flatness", "position"], note: "Flange faces need flatness" },
  pocket: { symbols: ["position", "perpendicularity"], note: "Pocket position from datums" },
  slot: { symbols: ["position", "parallelism"], note: "Slot parallel to reference" },
  boss: { symbols: ["position", "perpendicularity"], note: "Boss position critical" },
  thread: { symbols: ["position", "perpendicularity", "concentricity"], note: "Thread axis alignment" },
  chamfer: { symbols: [], note: "Edge breaks typically untoleranced" },
  fillet: { symbols: [], note: "Fillets typically untoleranced" },
  box: { symbols: ["flatness", "perpendicularity", "parallelism"], note: "Prismatic base features" },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class ToleranceAwareGenerationEngine extends BaseEngine {
  constructor() {
    super({
      name: "ToleranceAwareGenerationEngine",
      version: "1.0.0",
      domain: "cad_tolerance",
      description: "GD&T-aware CAD generation with tolerance stack analysis",
    });
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    return this.generateWithTolerance(input as ToleranceGenerationInput);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "tolerance_generate", description: "Generate CAD with automatic GD&T" },
      { name: "tolerance_apply", description: "Apply GD&T to feature set" },
      { name: "tolerance_stack_check", description: "Perform tolerance stack analysis" },
      { name: "tolerance_get_standard", description: "Get customer tolerance standard" },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") {
      return "Input must be an object";
    }
    const i = input as ToleranceGenerationInput;
    if (!i.features || !Array.isArray(i.features)) {
      return "features array is required";
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOLERANCE APPLICATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Apply GD&T to features based on type and context
   */
  applyTolerances(
    features: FeatureSpec[],
    customer?: string,
    machineCapability = DEFAULT_MACHINE_CAPABILITY
  ): FeatureTolerance[] {
    const standard = CUSTOMER_STANDARDS[customer?.toUpperCase() ?? "DEFAULT"] ?? CUSTOMER_STANDARDS["DEFAULT"];
    const tolerances: FeatureTolerance[] = [];
    const datums = this.determineDatumStructure(features);

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const featureId = `F${i + 1}`;
      const rules = FEATURE_GDT_RULES[f.type] ?? { symbols: [], note: "" };

      const gdtCallouts: FeatureControlFrame[] = [];

      // Apply GD&T based on feature type
      for (const symbol of rules.symbols) {
        const tolerance = this.calculateToleranceValue(symbol, f, machineCapability);
        const needsDatum = this.symbolNeedsDatum(symbol);

        gdtCallouts.push({
          symbol,
          tolerance,
          unit: "mm",
          datumRefs: needsDatum ? this.selectDatums(symbol, datums, i) : undefined,
          materialCondition: this.selectMaterialCondition(f.type, symbol),
          diameter: symbol === "position" && (f.type === "hole" || f.type === "bore"),
        });
      }

      // Determine fit type for holes/bores
      let fitType: FeatureTolerance["fitType"] | undefined;
      let isoFit: string | undefined;

      if (f.type === "hole" || f.type === "bore") {
        fitType = "clearance";
        isoFit = standard.preferredFits.bore;
      } else if (f.type === "cylinder" && f.params.isShaft) {
        fitType = "clearance";
        isoFit = standard.preferredFits.shaft;
      }

      tolerances.push({
        featureId,
        featureType: f.type,
        linearTolerance: {
          plus: standard.defaultLinearTolerance.plus,
          minus: standard.defaultLinearTolerance.minus,
          unit: "mm",
        },
        gdtCallouts,
        surfaceFinish: this.getSurfaceFinish(f.type),
        fitType,
        isoFit,
      });
    }

    return tolerances;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOLERANCE GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate CAD with automatic GD&T application
   */
  async generateWithTolerance(input: ToleranceGenerationInput): Promise<ToleranceGenerationOutput> {
    const capability = input.machineCapability ?? DEFAULT_MACHINE_CAPABILITY;
    const features = JSON.parse(JSON.stringify(input.features)) as FeatureSpec[];

    // Apply tolerances
    const tolerances = this.applyTolerances(features, input.customer, capability);

    // Determine datum structure
    const datumStructure = this.determineDatumStructure(features);

    // Stack analyses for assembly context
    const stackAnalyses: StackAnalysis[] = [];
    const warnings: string[] = [];

    if (input.assemblyContext) {
      for (const critDim of input.assemblyContext.criticalDimensions ?? []) {
        const analysis = this.analyzeStack(
          features,
          tolerances,
          critDim,
          input.assemblyContext.maxStackTolerance
        );
        stackAnalyses.push(analysis);

        if (!analysis.passesRequirement) {
          warnings.push(`Stack-up violation: ${critDim} exceeds ${input.assemblyContext.maxStackTolerance}mm`);
        }
      }
    }

    // Check for capability violations
    for (const tol of tolerances) {
      for (const gdt of tol.gdtCallouts) {
        if (gdt.symbol === "position" && gdt.tolerance < capability.positionCapability) {
          warnings.push(`Feature ${tol.featureId}: position tolerance ${gdt.tolerance}mm may be difficult to achieve`);
        }
        if ((gdt.symbol === "runout_circular" || gdt.symbol === "runout_total") && gdt.tolerance < capability.runoutCapability) {
          warnings.push(`Feature ${tol.featureId}: runout ${gdt.tolerance}mm is tight for this machine`);
        }
      }
    }

    // Calculate GD&T accuracy (% of features with appropriate GD&T)
    const featuresWithGDT = tolerances.filter(t => t.gdtCallouts.length > 0).length;
    const gdtAccuracy = features.length > 0 ? featuresWithGDT / features.length : 1;

    // Generate code with GD&T comments
    const code = this.generateCadQueryCode(features, tolerances, datumStructure);

    return {
      features,
      tolerances,
      stackAnalyses,
      datumStructure,
      warnings,
      gdtAccuracy,
      code,
    };
  }

  /**
   * Perform tolerance stack analysis
   */
  stackCheck(
    features: FeatureSpec[],
    tolerances: FeatureTolerance[],
    targetDimension: string,
    maxTolerance?: number
  ): StackAnalysis {
    return this.analyzeStack(features, tolerances, targetDimension, maxTolerance);
  }

  /**
   * Get customer tolerance standard
   */
  getStandard(customer?: string): CustomerStandard {
    return CUSTOMER_STANDARDS[customer?.toUpperCase() ?? "DEFAULT"] ?? CUSTOMER_STANDARDS["DEFAULT"];
  }

  /**
   * List available customer standards
   */
  listStandards(): string[] {
    return Object.keys(CUSTOMER_STANDARDS);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private determineDatumStructure(features: FeatureSpec[]): string[] {
    const datums: string[] = [];

    // Primary datum: largest flat surface or axis
    const base = features.find(f => f.type === "box" || f.type === "flange");
    if (base) {
      datums.push("A"); // Primary
    }

    // Secondary: perpendicular feature
    const secondaryCandidate = features.find(f =>
      f.type === "cylinder" || f.type === "bore" || f.type === "hole"
    );
    if (secondaryCandidate && datums.length > 0) {
      datums.push("B");
    }

    // Tertiary: orientation feature
    if (features.length > 2 && datums.length >= 2) {
      datums.push("C");
    }

    return datums.length > 0 ? datums : ["A"];
  }

  private calculateToleranceValue(
    symbol: GDTSymbol,
    feature: FeatureSpec,
    capability: typeof DEFAULT_MACHINE_CAPABILITY
  ): number {
    // Base tolerance from machine capability
    let baseTolerance: number;

    switch (symbol) {
      case "position":
        baseTolerance = capability.positionCapability;
        break;
      case "runout_circular":
      case "runout_total":
        baseTolerance = capability.runoutCapability;
        break;
      case "flatness":
      case "straightness":
        baseTolerance = capability.linearCapability * 0.8;
        break;
      case "cylindricity":
        baseTolerance = capability.linearCapability * 1.5;
        break;
      case "perpendicularity":
      case "parallelism":
        baseTolerance = capability.linearCapability * 2;
        break;
      case "concentricity":
        baseTolerance = capability.positionCapability * 1.2;
        break;
      default:
        baseTolerance = capability.linearCapability;
    }

    // Adjust based on feature size (larger features can have looser tolerance)
    const featureSize = Number(feature.params.diameter ?? feature.params.length ?? 25);
    const sizeFactor = Math.max(1, Math.min(2, featureSize / 50));

    return Math.round(baseTolerance * sizeFactor * 1000) / 1000;
  }

  private symbolNeedsDatum(symbol: GDTSymbol): boolean {
    const datumRequired: GDTSymbol[] = [
      "perpendicularity", "angularity", "parallelism",
      "position", "concentricity", "symmetry",
      "runout_circular", "runout_total"
    ];
    return datumRequired.includes(symbol);
  }

  private selectDatums(symbol: GDTSymbol, datums: string[], featureIndex: number): string[] {
    if (datums.length === 0) return ["A"];

    // Position typically references primary and secondary
    if (symbol === "position") {
      return datums.slice(0, Math.min(2, datums.length));
    }

    // Orientation features reference primary
    if (["perpendicularity", "parallelism", "angularity"].includes(symbol)) {
      return [datums[0]];
    }

    // Runout references axis
    if (symbol.includes("runout") || symbol === "concentricity") {
      return datums.slice(0, 1);
    }

    return [datums[0]];
  }

  private selectMaterialCondition(featureType: string, symbol: GDTSymbol): MaterialCondition | undefined {
    // Position on holes/bores typically MMC
    if (symbol === "position" && (featureType === "hole" || featureType === "bore")) {
      return "MMC";
    }
    // Most other callouts are RFS (default, no modifier shown)
    return undefined;
  }

  private getSurfaceFinish(featureType: string): FeatureTolerance["surfaceFinish"] | undefined {
    const finishMap: Record<string, number> = {
      bore: 1.6,
      hole: 3.2,
      cylinder: 1.6,
      flange: 3.2,
      pocket: 3.2,
      box: 6.3,
    };

    const Ra = finishMap[featureType];
    return Ra ? { Ra, unit: "μm" } : undefined;
  }

  private analyzeStack(
    features: FeatureSpec[],
    tolerances: FeatureTolerance[],
    targetDimension: string,
    maxTolerance?: number
  ): StackAnalysis {
    // Simple RSS stack-up
    let totalVariance = 0;
    const contributors: string[] = [];

    for (const tol of tolerances) {
      if (tol.linearTolerance) {
        const tolRange = (tol.linearTolerance.plus + tol.linearTolerance.minus) / 2;
        totalVariance += tolRange * tolRange;
        if (tolRange > 0.02) {
          contributors.push(tol.featureId);
        }
      }
    }

    const stackTolerance = Math.sqrt(totalVariance);
    const maxAllowed = maxTolerance ?? 0.1;
    const passes = stackTolerance <= maxAllowed;

    return {
      dimension: targetDimension,
      nominal: 0,
      stackTolerance: Math.round(stackTolerance * 1000) / 1000,
      minGap: -stackTolerance,
      maxGap: stackTolerance,
      passesRequirement: passes,
      criticalContributors: contributors,
      recommendation: passes ? undefined : `Tighten tolerances on ${contributors.join(", ")} to meet ${maxAllowed}mm requirement`,
    };
  }

  private generateCadQueryCode(
    features: FeatureSpec[],
    tolerances: FeatureTolerance[],
    datums: string[]
  ): string {
    const lines: string[] = [
      "import cadquery as cq",
      "",
      "# GD&T-aware design generated by ToleranceAwareGenerationEngine",
      `# Datum structure: ${datums.join("-")}`,
      "",
    ];

    // Add tolerance notes as comments
    for (const tol of tolerances) {
      if (tol.gdtCallouts.length > 0) {
        const gdtStr = tol.gdtCallouts.map(g => {
          let s = `${g.symbol} ${g.tolerance}${g.unit}`;
          if (g.datumRefs?.length) s += ` |${g.datumRefs.join("|")}|`;
          if (g.materialCondition) s += ` ${g.materialCondition}`;
          return s;
        }).join("; ");
        lines.push(`# ${tol.featureId} (${tol.featureType}): ${gdtStr}`);
      }
    }
    lines.push("");

    // Generate base geometry
    const base = features[0];
    if (base?.type === "cylinder") {
      lines.push(`result = cq.Workplane("XY").cylinder(${base.params.length ?? 50}, ${base.params.diameter ?? 25} / 2)`);
    } else if (base?.type === "box") {
      lines.push(`result = cq.Workplane("XY").box(${base.params.length ?? 100}, ${base.params.width ?? 50}, ${base.params.height ?? 25})`);
    } else if (base?.type === "flange") {
      lines.push(`result = cq.Workplane("XY").circle(${base.params.od ?? 60} / 2).extrude(${base.params.thickness ?? 10})`);
      if (base.params.id) {
        lines.push(`result = result.faces(">Z").workplane().hole(${base.params.id})`);
      }
    } else {
      lines.push("result = cq.Workplane('XY').box(100, 50, 25)");
    }

    // Add secondary features
    for (let i = 1; i < features.length; i++) {
      const f = features[i];
      if (f.type === "hole") {
        lines.push(`result = result.faces(">Z").workplane().hole(${f.params.diameter ?? 10})`);
      } else if (f.type === "chamfer") {
        lines.push(`result = result.edges().chamfer(${f.params.size ?? 1})`);
      } else if (f.type === "fillet") {
        lines.push(`result = result.edges().fillet(${f.params.radius ?? 2})`);
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

export const toleranceAwareGenerationEngine = new ToleranceAwareGenerationEngine();
export default toleranceAwareGenerationEngine;
