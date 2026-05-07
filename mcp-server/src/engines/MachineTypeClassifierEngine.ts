/**
 * MachineTypeClassifierEngine — Print/CAD to Machine Type Inference
 *
 * Classifies the required machine type for a part based on:
 * 1. Title block metadata (material, finish, tolerances)
 * 2. CAD feature recognition (turned features, holes, pockets, threads)
 * 3. GD&T requirements (runout, concentricity → lathe; position → mill)
 * 4. Dimension analysis (L/D ratios, feature complexity)
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR06
 * @module engines/MachineTypeClassifierEngine
 */

import type { TitleBlockData, ExtractedDimension, ExtractedGDT } from "./BlueprintOCREngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type MachineTypeClass =
  | "lathe"
  | "mill_3axis"
  | "mill_5axis"
  | "mill_turn"
  | "wire_edm"
  | "sinker_edm"
  | "swiss"
  | "grinder"
  | "multi_machine";

export interface CADFeatureSignature {
  turningFeatures: number;
  millingFeatures: number;
  drillingFeatures: number;
  threadFeatures: number;
  edmFeatures: number;
  grindingFeatures: number;
  primaryAxisOfSymmetry: "z_axis" | "multi_axis" | "none";
  maxAspectRatio: number;
  hasInternalFeatures: boolean;
  hasBackworkFeatures: boolean;
  hasLiveToolFeatures: boolean;
}

export interface ClassificationInput {
  titleBlock?: TitleBlockData;
  dimensions?: ExtractedDimension[];
  gdtFeatures?: ExtractedGDT[];
  cadFeatures?: CADFeatureSignature;
  partDescription?: string;
  materialHardness_hrc?: number;
}

export interface ClassificationResult {
  primaryMachineType: MachineTypeClass;
  confidence: number;
  alternativeTypes: Array<{ type: MachineTypeClass; confidence: number }>;
  reasoning: string[];
  recommendedOperations: string[];
  warnings: string[];
}

// ============================================================================
// CLASSIFICATION RULES
// ============================================================================

const TURNING_GDT_SYMBOLS = new Set([
  "circularity", "cylindricity", "concentricity",
  "circular_runout", "total_runout"
]);

const MILLING_GDT_SYMBOLS = new Set([
  "flatness", "perpendicularity", "parallelism",
  "position", "profile_surface"
]);

const EDM_KEYWORDS = [
  "edm", "wire cut", "wire-cut", "spark erosion",
  "electrical discharge", "erode", "burn"
];

const GRINDING_KEYWORDS = [
  "grind", "hone", "lap", "polish",
  "surface finish", "mirror finish", "ra 0.1", "ra 0.2"
];

const SWISS_INDICATORS = {
  maxDiameter_mm: 32,
  minAspectRatio: 4,
  precisionClass: ["precision", "ultra_precision"]
};

// ============================================================================
// ENGINE
// ============================================================================

export class MachineTypeClassifierEngine {
  /**
   * Classify the required machine type for a part
   */
  classify(input: ClassificationInput): ClassificationResult {
    const scores: Record<MachineTypeClass, number> = {
      lathe: 0,
      mill_3axis: 0,
      mill_5axis: 0,
      mill_turn: 0,
      wire_edm: 0,
      sinker_edm: 0,
      swiss: 0,
      grinder: 0,
      multi_machine: 0,
    };

    const reasoning: string[] = [];
    const warnings: string[] = [];

    // 1. Analyze title block
    if (input.titleBlock) {
      this.scoreTitleBlock(input.titleBlock, scores, reasoning);
    }

    // 2. Analyze dimensions
    if (input.dimensions?.length) {
      this.scoreDimensions(input.dimensions, scores, reasoning);
    }

    // 3. Analyze GD&T
    if (input.gdtFeatures?.length) {
      this.scoreGDT(input.gdtFeatures, scores, reasoning);
    }

    // 4. Analyze CAD features
    if (input.cadFeatures) {
      this.scoreCADFeatures(input.cadFeatures, scores, reasoning, warnings);
    }

    // 5. Check material hardness
    if (input.materialHardness_hrc !== undefined) {
      this.scoreHardness(input.materialHardness_hrc, scores, reasoning);
    }

    // 6. Check part description for keywords
    if (input.partDescription) {
      this.scoreDescription(input.partDescription, scores, reasoning);
    }

    // Determine primary and alternatives
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    if (sorted.length === 0) {
      return {
        primaryMachineType: "mill_3axis",
        confidence: 0.3,
        alternativeTypes: [],
        reasoning: ["Insufficient data for classification; defaulting to 3-axis mill"],
        recommendedOperations: [],
        warnings: ["Low confidence classification due to missing input data"],
      };
    }

    const [primaryType, primaryScore] = sorted[0] as [MachineTypeClass, number];
    const maxScore = Math.max(...Object.values(scores));
    const confidence = Math.min(0.95, primaryScore / (maxScore + 10));

    const alternativeTypes = sorted.slice(1, 4).map(([type, score]) => ({
      type: type as MachineTypeClass,
      confidence: Math.min(0.9, score / (maxScore + 10)),
    }));

    // Check for mill-turn scenario
    if (scores.lathe > 5 && scores.mill_3axis > 5) {
      scores.mill_turn = (scores.lathe + scores.mill_3axis) * 0.8;
      if (scores.mill_turn > primaryScore) {
        reasoning.push("Part requires both turning and milling operations → mill-turn recommended");
      }
    }

    return {
      primaryMachineType: primaryType,
      confidence,
      alternativeTypes,
      reasoning,
      recommendedOperations: this.getRecommendedOperations(primaryType),
      warnings,
    };
  }

  private scoreTitleBlock(
    tb: TitleBlockData,
    scores: Record<MachineTypeClass, number>,
    reasoning: string[]
  ): void {
    const title = (tb.title || "").toLowerCase();
    const material = (tb.material || "").toLowerCase();

    // Check for EDM keywords
    if (EDM_KEYWORDS.some(k => title.includes(k))) {
      scores.wire_edm += 15;
      reasoning.push("Title contains EDM keywords");
    }

    // Check for hardened materials (EDM or hard turning)
    if (material.includes("hardened") || material.includes("hrc")) {
      scores.wire_edm += 5;
      scores.grinder += 5;
      reasoning.push("Material is hardened — may require EDM or grinding");
    }

    // Check for grinding keywords
    if (GRINDING_KEYWORDS.some(k => title.includes(k) || (tb.finish || "").toLowerCase().includes(k))) {
      scores.grinder += 10;
      reasoning.push("Finish requirements suggest grinding");
    }

    // Check for rotational part names — strong indicator for turning
    const rotationalKeywords = ["shaft", "bushing", "sleeve", "pin", "spindle", "arbor", "mandrel", "axle", "rod", "cylinder"];
    if (rotationalKeywords.some(k => title.includes(k))) {
      scores.lathe += 15;
      reasoning.push("Part name suggests rotational geometry (turning)");
    }

    // Check for prismatic part names
    const prismaticKeywords = ["plate", "block", "bracket", "housing", "frame", "fixture"];
    if (prismaticKeywords.some(k => title.includes(k))) {
      scores.mill_3axis += 10;
      reasoning.push("Part name suggests prismatic geometry (milling)");
    }
  }

  private scoreDimensions(
    dims: ExtractedDimension[],
    scores: Record<MachineTypeClass, number>,
    reasoning: string[]
  ): void {
    const diameterDims = dims.filter(d => d.type === "diameter");
    const linearDims = dims.filter(d => d.type === "linear");
    const threadDims = dims.filter(d => d.type === "thread");

    if (diameterDims.length > linearDims.length * 0.5) {
      scores.lathe += 8;
      reasoning.push("High ratio of diameter dimensions → likely turning");
    }

    if (threadDims.length > 0) {
      scores.lathe += 3 * threadDims.length;
      reasoning.push(`${threadDims.length} thread dimension(s) found`);
    }

    // Check for tight tolerances
    const tightTols = dims.filter(d =>
      d.tolerance && Math.abs(d.tolerance.upper - d.tolerance.lower) < 0.02
    );
    if (tightTols.length > 3) {
      scores.grinder += 5;
      reasoning.push("Multiple tight tolerances may require grinding");
    }
  }

  private scoreGDT(
    gdt: ExtractedGDT[],
    scores: Record<MachineTypeClass, number>,
    reasoning: string[]
  ): void {
    const turningGDT = gdt.filter(g => TURNING_GDT_SYMBOLS.has(g.symbol));
    const millingGDT = gdt.filter(g => MILLING_GDT_SYMBOLS.has(g.symbol));

    if (turningGDT.length > millingGDT.length) {
      scores.lathe += 5 + turningGDT.length * 2;
      reasoning.push(`GD&T symbols favor turning: ${turningGDT.map(g => g.symbol).join(", ")}`);
    } else if (millingGDT.length > turningGDT.length) {
      scores.mill_3axis += 5 + millingGDT.length * 2;
      reasoning.push(`GD&T symbols favor milling: ${millingGDT.map(g => g.symbol).join(", ")}`);
    }

    // 5-axis indicators — complex GD&T with multiple datums strongly suggests 5-axis
    const complexGDT = gdt.filter(g =>
      g.datum_references.length >= 3 ||
      (g.symbol === "profile_surface" && g.tolerance_value < 0.1)
    );
    if (complexGDT.length > 0) {
      const boost = complexGDT.length * 8;
      scores.mill_5axis += boost;
      scores.mill_3axis -= boost / 2; // Reduce 3-axis when 5-axis is indicated
      reasoning.push("Complex GD&T with multiple datums suggests 5-axis");
    }
  }

  private scoreCADFeatures(
    cad: CADFeatureSignature,
    scores: Record<MachineTypeClass, number>,
    reasoning: string[],
    warnings: string[]
  ): void {
    // Primary axis of symmetry
    if (cad.primaryAxisOfSymmetry === "z_axis") {
      scores.lathe += 15;
      reasoning.push("Part has primary axis of symmetry (rotational)");
    } else if (cad.primaryAxisOfSymmetry === "multi_axis") {
      scores.mill_5axis += 10;
      reasoning.push("Part has multi-axis complexity");
    }

    // Feature counts
    if (cad.turningFeatures > cad.millingFeatures * 2) {
      scores.lathe += 10;
      reasoning.push("Turning features dominate");
    } else if (cad.millingFeatures > cad.turningFeatures * 2) {
      scores.mill_3axis += 10;
      reasoning.push("Milling features dominate");
    } else if (cad.turningFeatures > 0 && cad.millingFeatures > 0) {
      scores.mill_turn += 12;
      reasoning.push("Mix of turning and milling features → mill-turn");
    }

    // Swiss indicators — high L/D with backwork is a strong Swiss signal
    if (cad.maxAspectRatio >= SWISS_INDICATORS.minAspectRatio && cad.hasBackworkFeatures) {
      scores.swiss += 25;
      scores.lathe -= 10; // Reduce lathe score when Swiss is indicated
      reasoning.push(`High L/D ratio (${cad.maxAspectRatio.toFixed(1)}) with backwork → Swiss-type`);
    } else if (cad.maxAspectRatio >= SWISS_INDICATORS.minAspectRatio) {
      scores.swiss += 8;
      reasoning.push(`High L/D ratio (${cad.maxAspectRatio.toFixed(1)}) may benefit from Swiss`);
    }

    // Live tooling
    if (cad.hasLiveToolFeatures) {
      scores.lathe += 3;
      scores.mill_turn += 5;
      reasoning.push("Live tooling features detected");
    }

    // EDM features
    if (cad.edmFeatures > 0) {
      scores.wire_edm += cad.edmFeatures * 5;
      reasoning.push(`${cad.edmFeatures} EDM-typical feature(s) detected`);
    }

    // Internal features warning
    if (cad.hasInternalFeatures && cad.primaryAxisOfSymmetry !== "z_axis") {
      warnings.push("Internal features on non-rotational part may require special fixturing");
    }
  }

  private scoreHardness(
    hrc: number,
    scores: Record<MachineTypeClass, number>,
    reasoning: string[]
  ): void {
    if (hrc >= 60) {
      scores.wire_edm += 15;
      scores.grinder += 10;
      reasoning.push(`Material hardness ${hrc} HRC → EDM or grinding required`);
    } else if (hrc >= 50) {
      scores.wire_edm += 8;
      scores.grinder += 5;
      reasoning.push(`Material hardness ${hrc} HRC → hard machining or EDM`);
    } else if (hrc >= 40) {
      scores.lathe += 3; // CBN hard turning viable
      reasoning.push(`Material hardness ${hrc} HRC → hard turning possible with CBN`);
    }
  }

  private scoreDescription(
    desc: string,
    scores: Record<MachineTypeClass, number>,
    reasoning: string[]
  ): void {
    const lower = desc.toLowerCase();

    // EDM keywords
    if (EDM_KEYWORDS.some(k => lower.includes(k))) {
      scores.wire_edm += 10;
      reasoning.push("Description mentions EDM process");
    }

    // Grinding keywords
    if (GRINDING_KEYWORDS.some(k => lower.includes(k))) {
      scores.grinder += 8;
      reasoning.push("Description mentions grinding/finishing");
    }

    // Swiss keywords
    if (lower.includes("swiss") || lower.includes("screw machine")) {
      scores.swiss += 12;
      reasoning.push("Description mentions Swiss-type machining");
    }

    // Multi-operation keywords
    if (lower.includes("mill-turn") || lower.includes("turn-mill") || lower.includes("complete in one setup")) {
      scores.mill_turn += 10;
      reasoning.push("Description suggests mill-turn operation");
    }

    // Rotational part keywords (must check last to add to lathe if no other strong signal)
    const rotationalKeywords = ["shaft", "bushing", "sleeve", "pin", "spindle", "arbor", "mandrel", "axle", "rod", "cylinder"];
    if (rotationalKeywords.some(k => lower.includes(k))) {
      scores.lathe += 12;
      reasoning.push("Description suggests rotational part (turning)");
    }

    // Prismatic part keywords
    const prismaticKeywords = ["plate", "block", "bracket", "housing", "frame", "fixture"];
    if (prismaticKeywords.some(k => lower.includes(k))) {
      scores.mill_3axis += 10;
      reasoning.push("Description suggests prismatic part (milling)");
    }
  }

  private getRecommendedOperations(type: MachineTypeClass): string[] {
    const ops: Record<MachineTypeClass, string[]> = {
      lathe: ["facing", "od_turning", "boring", "threading", "grooving", "parting"],
      mill_3axis: ["face_milling", "pocket_milling", "contour", "drilling", "tapping"],
      mill_5axis: ["3+2_positioning", "simultaneous_5axis", "swarf_cutting", "impeller"],
      mill_turn: ["od_turning", "facing", "milling_flats", "cross_drilling", "threading"],
      wire_edm: ["roughing", "skim_cuts", "taper_cutting"],
      sinker_edm: ["cavity_sinking", "electrode_burning", "orbiting"],
      swiss: ["od_turning", "cross_drilling", "threading", "parting", "backwork"],
      grinder: ["od_grinding", "id_grinding", "surface_grinding", "centerless"],
      multi_machine: ["turning", "milling", "drilling", "grinding"],
    };
    return ops[type] || [];
  }

  /**
   * Quick classification from part description only
   */
  quickClassify(description: string): MachineTypeClass {
    const result = this.classify({ partDescription: description });
    return result.primaryMachineType;
  }

  /**
   * Check if part requires multi-machine processing
   */
  requiresMultiMachine(input: ClassificationInput): boolean {
    const result = this.classify(input);
    return (
      result.primaryMachineType === "multi_machine" ||
      result.alternativeTypes.filter(a => a.confidence > 0.4).length >= 2
    );
  }
}

export const machineTypeClassifierEngine = new MachineTypeClassifierEngine();
