/**
 * STEPFeatureExtractorEngine — HM-KC-MS10-S1/U-HKC52
 *
 * Reads STEP files via CadQuery/OpenCascade integration, runs feature
 * recognition, classifies the part, and infers a manufacturing sequence
 * from geometric analysis. Outputs FeatureSequenceRecord with source='step_inferred'.
 *
 * Manufacturing sequence inference follows machining rules:
 * - External before internal
 * - Large features before small
 * - Roughing cascade by tool diameter
 * - Holes after pockets
 * - Finishing after all roughing
 *
 * @milestone HM-KC-MS10/U-HKC52
 */

import type { RecognizedFeature, FeatureType, FeatureDimensions } from "../FeatureRecognitionEngine.js";
import type {
  FeatureSequenceRecord,
  SequenceOperation,
  SequenceTool,
  StockDefinition,
  WCSDefinition,
} from "./HMCProjectParserEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Part classification from STEP geometry analysis */
export type PartClassification = "prismatic" | "cylindrical" | "freeform" | "thin_wall";

/** STEP analysis result */
export interface STEPAnalysis {
  /** Detected features */
  features: RecognizedFeature[];
  /** Part classification */
  partClass: PartClassification;
  /** Overall bounding box in mm */
  boundingBox: { x: number; y: number; z: number };
  /** Estimated volume in mm^3 */
  estimatedVolumeMm3: number;
  /** Feature count by type */
  featureBreakdown: Record<string, number>;
  /** Complexity score (0-10) */
  complexityScore: number;
  /** Warnings from analysis */
  warnings: string[];
}

/** STEP extraction result */
export interface STEPExtractionResult {
  /** Extracted feature sequence record */
  record: FeatureSequenceRecord;
  /** Analysis details */
  analysis: STEPAnalysis;
  /** Extraction statistics */
  stats: {
    featureCount: number;
    inferredOperations: number;
    inferredTools: number;
    extractionTimeMs: number;
  };
  /** Extraction confidence (0-1) */
  confidence: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUFACTURING SEQUENCE RULES
// ══════════════════════════════════════════════════════════════════════════════

/** Priority ordering for feature types in manufacturing sequence */
const FEATURE_SEQUENCE_PRIORITY: Record<FeatureType, number> = {
  // External operations first (facing, profiling)
  face: 10,
  step: 15,
  // Large material removal (roughing)
  pocket_rectangular: 20,
  pocket_circular: 22,
  pocket_freeform: 25,
  // Contour operations
  contour_2d: 30,
  contour_3d: 35,
  slot_through: 40,
  slot_blind: 42,
  keyway: 44,
  groove: 46,
  // Boss features
  boss_circular: 50,
  boss_rectangular: 52,
  // Hole making (after pockets, before finish)
  through_hole: 60,
  blind_hole: 62,
  counterbore: 64,
  countersink: 66,
  tapped_hole: 68,
  // Secondary features
  chamfer: 70,
  fillet: 72,
  // Thread (after hole)
  thread_external: 80,
  thread_internal: 82,
  // Complex pockets (after simple pockets, need more setup)
  pocket_complex: 27,
  // Specialty slots (after standard slots)
  slot_dovetail: 43,
  slot_t_shaped: 45,
};

/** Default tool selection by feature type */
const FEATURE_TOOL_MAP: Record<FeatureType, { type: SequenceTool["type"]; diamFactor: number }> = {
  face: { type: "face_mill", diamFactor: 2.0 },
  step: { type: "endmill_flat", diamFactor: 0.8 },
  pocket_rectangular: { type: "endmill_flat", diamFactor: 0.6 },
  pocket_circular: { type: "endmill_flat", diamFactor: 0.6 },
  pocket_freeform: { type: "endmill_ball", diamFactor: 0.4 },
  contour_2d: { type: "endmill_flat", diamFactor: 0.7 },
  contour_3d: { type: "endmill_ball", diamFactor: 0.4 },
  slot_through: { type: "endmill_flat", diamFactor: 0.9 },
  slot_blind: { type: "endmill_flat", diamFactor: 0.9 },
  keyway: { type: "endmill_flat", diamFactor: 0.95 },
  groove: { type: "endmill_flat", diamFactor: 0.8 },
  boss_circular: { type: "endmill_flat", diamFactor: 0.5 },
  boss_rectangular: { type: "endmill_flat", diamFactor: 0.5 },
  through_hole: { type: "drill", diamFactor: 1.0 },
  blind_hole: { type: "drill", diamFactor: 1.0 },
  counterbore: { type: "drill", diamFactor: 1.0 },
  countersink: { type: "drill", diamFactor: 1.0 },
  tapped_hole: { type: "tap", diamFactor: 1.0 },
  chamfer: { type: "chamfer_mill", diamFactor: 1.5 },
  fillet: { type: "endmill_ball", diamFactor: 1.0 },
  thread_external: { type: "thread_mill", diamFactor: 0.8 },
  thread_internal: { type: "tap", diamFactor: 1.0 },
  pocket_complex:  { type: "endmill_ball", diamFactor: 0.4 },
  slot_dovetail:   { type: "endmill_flat", diamFactor: 0.9 },
  slot_t_shaped:   { type: "endmill_flat", diamFactor: 0.9 },
};

/** Map feature type to cycle code */
const FEATURE_CYCLE_MAP: Record<FeatureType, string> = {
  face: "FACE_MILLING",
  step: "CONTOUR_2D",
  pocket_rectangular: "POCKET_2D",
  pocket_circular: "POCKET_2D",
  pocket_freeform: "SURFACE_FINISHING",
  contour_2d: "CONTOUR_2D",
  contour_3d: "SURFACE_FINISHING",
  slot_through: "SLOT_MILLING",
  slot_blind: "SLOT_MILLING",
  keyway: "SLOT_MILLING",
  groove: "GROOVING",
  boss_circular: "CONTOUR_2D",
  boss_rectangular: "CONTOUR_2D",
  through_hole: "DRILLING",
  blind_hole: "PECK_DRILLING",
  counterbore: "BORING",
  countersink: "CENTER_DRILLING",
  tapped_hole: "TAPPING",
  chamfer: "CONTOUR_2D",
  fillet: "PENCIL_FINISHING",
  thread_external: "THREAD_MILLING",
  thread_internal: "TAPPING",
  pocket_complex:  "SURFACE_FINISHING",
  slot_dovetail:   "SLOT_MILLING",
  slot_t_shaped:   "SLOT_MILLING",
};

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class STEPFeatureExtractorEngine {
  /**
   * Extract features from a STEP file description and infer manufacturing sequence.
   *
   * Since STEP file binary parsing requires OpenCascade (Python side), this engine
   * works with a pre-extracted geometry description (from cad-engine/) or directly
   * with feature descriptions. In production, the cad-engine would call this after
   * parsing the STEP file.
   *
   * @param input - STEP file analysis input
   * @returns STEPExtractionResult with inferred sequence
   */
  extract(input: {
    /** Part name */
    partName: string;
    /** Material designation */
    material: string;
    /** Overall bounding box dimensions in mm */
    boundingBox: { x: number; y: number; z: number };
    /** Features recognized from STEP geometry */
    features: RecognizedFeature[];
    /** Optional: pre-computed volume in mm^3 */
    volumeMm3?: number;
  }): STEPExtractionResult {
    const startTime = performance.now();
    const warnings: string[] = [];

    // Step 1: Classify part type
    const partClass = this.classifyPart(input.features, input.boundingBox);

    // Step 2: Compute stock from bounding box + allowance
    const stock = this.computeStock(input.boundingBox, input.material);

    // Step 3: Sort features into manufacturing sequence
    const sortedFeatures = this.sortByManufacturingOrder(input.features);

    // Step 4: Infer operations from features
    const operations = this.inferOperations(sortedFeatures, stock, warnings);

    // Step 5: Feature breakdown for analysis
    const featureBreakdown: Record<string, number> = {};
    for (const f of input.features) {
      featureBreakdown[f.type] = (featureBreakdown[f.type] ?? 0) + 1;
    }

    // Step 6: Compute complexity
    const complexityScore = this.computeComplexity(input.features, operations);

    // Step 7: Estimate volume if not provided
    const volumeMm3 = input.volumeMm3 ??
      input.boundingBox.x * input.boundingBox.y * input.boundingBox.z * 0.6;

    const analysis: STEPAnalysis = {
      features: input.features,
      partClass,
      boundingBox: input.boundingBox,
      estimatedVolumeMm3: volumeMm3,
      featureBreakdown,
      complexityScore,
      warnings,
    };

    // Step 8: Build feature sequence record
    const totalCycleTimeSec = operations.reduce(
      (sum, op) => sum + (op.estimatedCycleTimeSec ?? 0), 0
    );
    const uniqueTools = new Set(operations.map((o) => o.tool.toolNumber));
    let toolChanges = 0;
    for (let i = 1; i < operations.length; i++) {
      if (operations[i].tool.toolNumber !== operations[i - 1].tool.toolNumber) toolChanges++;
    }

    const record: FeatureSequenceRecord = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: "step_inferred",
      partType: partClass === "thin_wall" ? "thin_wall" : partClass === "freeform" ? "freeform" : partClass,
      partName: input.partName,
      stock,
      wcsList: [{ wcsNumber: 1, name: "G54", origin: { x: 0, y: 0, z: 0 } }],
      features: input.features,
      operations,
      totalCycleTimeSec,
      toolChangeCount: toolChanges,
      uniqueToolCount: uniqueTools.size,
      createdAt: new Date().toISOString(),
      complexityScore,
      warnings,
    };

    const extractionTimeMs = performance.now() - startTime;

    return {
      record,
      analysis,
      stats: {
        featureCount: input.features.length,
        inferredOperations: operations.length,
        inferredTools: uniqueTools.size,
        extractionTimeMs,
      },
      confidence: this.computeConfidence(input.features, partClass, warnings),
    };
  }

  // ── Part classification ──────────────────────────────────────────────────

  /**
   * Classify part based on feature types and geometry.
   * Categories: prismatic, cylindrical, freeform, thin_wall
   */
  classifyPart(features: RecognizedFeature[], bbox: { x: number; y: number; z: number }): PartClassification {
    const types = new Set(features.map((f) => f.type));

    // Check for cylindrical: dominated by holes, threads, or cylindrical geometry
    const cylindricalFeatures = features.filter((f) =>
      ["through_hole", "blind_hole", "tapped_hole", "counterbore", "countersink", "thread_external", "groove"].includes(f.type)
    );
    const isMainlyCylindrical = cylindricalFeatures.length > features.length * 0.6;

    // Check for freeform: has 3D contours or freeform pockets
    const hasFreeform = types.has("contour_3d") || types.has("pocket_freeform");

    // Check for thin wall: aspect ratio suggests thin walls
    const dims = [bbox.x, bbox.y, bbox.z].sort((a, b) => a - b);
    const isThinWall = dims[0] > 0 && dims[2] / dims[0] > 10;

    if (isThinWall) return "thin_wall";
    if (hasFreeform) return "freeform";
    if (isMainlyCylindrical) return "cylindrical";
    return "prismatic";
  }

  // ── Stock computation ────────────────────────────────────────────────────

  private computeStock(bbox: { x: number; y: number; z: number }, material: string): StockDefinition {
    // Add 5mm allowance per side
    const allowance = 5;
    return {
      type: "rectangular",
      dimensions: {
        x: bbox.x + allowance * 2,
        y: bbox.y + allowance * 2,
        z: bbox.z + allowance,
      },
      material,
      isoGroup: this.inferIsoGroup(material),
    };
  }

  // ── Manufacturing sequence ordering ──────────────────────────────────────

  /**
   * Sort features into manufacturing order following CNC machining rules:
   * 1. Facing / external surfaces first
   * 2. Large material removal (pockets, roughing)
   * 3. Contour operations
   * 4. Holes (after pockets to avoid drill walking on angled surfaces)
   * 5. Secondary features (chamfers, fillets)
   * 6. Threads (after holes)
   */
  sortByManufacturingOrder(features: RecognizedFeature[]): RecognizedFeature[] {
    return [...features].sort((a, b) => {
      const prioA = FEATURE_SEQUENCE_PRIORITY[a.type] ?? 50;
      const prioB = FEATURE_SEQUENCE_PRIORITY[b.type] ?? 50;
      if (prioA !== prioB) return prioA - prioB;

      // Same priority: larger features first (by volume proxy)
      const volA = this.featureVolumeProxy(a);
      const volB = this.featureVolumeProxy(b);
      return volB - volA;
    });
  }

  // ── Operation inference ──────────────────────────────────────────────────

  /**
   * Infer manufacturing operations from sorted features.
   * Each feature generates 1-3 operations (roughing → semi-finishing → finishing).
   */
  /**
   * Material-sensitive default S/F lookup by ISO group.
   * Conservative values — ALWAYS safe to run, may be slower than optimal.
   * RPM and feed are for ø10mm carbide tool; scale proportionally for other diameters.
   * H-group: low speed/feed to prevent thermal shock and premature wear
   * S-group: low speed, moderate feed — superalloy heat generation is extreme
   * N-group: high speed/feed — aluminum/copper are soft and conductive
   */
  private readonly SF_BY_ISO: Record<string, { roughRPM: number; roughFeed: number; finishRPM: number; finishFeed: number }> = {
    P: { roughRPM: 5000, roughFeed: 800,  finishRPM: 8000,  finishFeed: 1200 },
    M: { roughRPM: 3500, roughFeed: 500,  finishRPM: 5000,  finishFeed: 800  },
    K: { roughRPM: 4000, roughFeed: 700,  finishRPM: 6000,  finishFeed: 1000 },
    N: { roughRPM: 10000, roughFeed: 2000, finishRPM: 15000, finishFeed: 3000 },
    S: { roughRPM: 2000, roughFeed: 300,  finishRPM: 3000,  finishFeed: 500  },
    H: { roughRPM: 1500, roughFeed: 200,  finishRPM: 2500,  finishFeed: 400  },
  };

  private inferOperations(
    sortedFeatures: RecognizedFeature[],
    stock: StockDefinition,
    warnings: string[]
  ): SequenceOperation[] {
    const operations: SequenceOperation[] = [];
    let toolNumber = 1;
    const toolMap = new Map<string, number>(); // toolKey → toolNumber
    const isoGroup = stock.isoGroup ?? "P";
    const sfDefaults = this.SF_BY_ISO[isoGroup] ?? this.SF_BY_ISO.P;

    // Phase 1: Roughing cascade (face → pockets → contours)
    // Phase 2: Hole making
    // Phase 3: Finishing pass (if 3D features exist)

    for (const feature of sortedFeatures) {
      const toolConfig = FEATURE_TOOL_MAP[feature.type];
      if (!toolConfig) continue;

      // Determine tool diameter based on feature dimensions
      const refDim = feature.dimensions.diameter_mm ?? feature.dimensions.width_mm ?? 10;
      const toolDiam = Math.max(3, Math.round(refDim * toolConfig.diamFactor * 10) / 10);

      // Deduplicate tools by type+diameter combo
      const toolKey = `${toolConfig.type}_${toolDiam}`;
      if (!toolMap.has(toolKey)) {
        toolMap.set(toolKey, toolNumber++);
      }
      const currentToolNum = toolMap.get(toolKey)!;

      const tool: SequenceTool = {
        toolNumber: currentToolNum,
        name: `T${currentToolNum} ${toolConfig.type.replace(/_/g, " ")} D${toolDiam}`,
        type: toolConfig.type,
        diameterMm: toolDiam,
      };

      const cycleCode = FEATURE_CYCLE_MAP[feature.type] ?? "CONTOUR_2D";
      const isHoleMaking = ["through_hole", "blind_hole", "counterbore", "countersink", "tapped_hole"].includes(feature.type);
      const needs3DFinishing = ["contour_3d", "pocket_freeform"].includes(feature.type);

      // Generate roughing operation (for non-hole features with significant depth)
      const depth = feature.dimensions.depth_mm ?? 10;
      if (!isHoleMaking && depth > 3) {
        const roughOp: SequenceOperation = {
          index: operations.length,
          name: `Rough ${feature.type.replace(/_/g, " ")} (${feature.id})`,
          cycleCode: feature.type.includes("pocket") ? "POCKET_2D" : cycleCode,
          operationType: "roughing",
          tool,
          parameters: {
            stepdown_mm: Math.min(toolDiam * 0.5, depth / 2),
            stepover_mm: toolDiam * 0.65,
            feed_mm_min: sfDefaults.roughFeed,
            spindle_rpm: sfDefaults.roughRPM,
            depth_mm: depth,
            allowance_mm: 0.3,
          },
          targetFeatures: [feature.type],
          dependsOn: [],
          estimatedCycleTimeSec: this.estimateCycleTime(feature, "roughing", toolDiam),
        };
        operations.push(roughOp);
      }

      // Generate finish/drill operation
      const finishOp: SequenceOperation = {
        index: operations.length,
        name: `${isHoleMaking ? "" : "Finish "}${feature.type.replace(/_/g, " ")} (${feature.id})`,
        cycleCode,
        operationType: isHoleMaking ? "drilling" : (needs3DFinishing ? "finishing" : "finishing"),
        tool: isHoleMaking ? { ...tool, type: this.holeToolType(feature.type), diameterMm: feature.dimensions.diameter_mm ?? toolDiam } : tool,
        parameters: this.generateFinishParameters(feature, toolDiam, isHoleMaking, sfDefaults),
        targetFeatures: [feature.type],
        dependsOn: operations.length > 0 && !isHoleMaking ? [operations.length - 1] : [],
        estimatedCycleTimeSec: this.estimateCycleTime(feature, isHoleMaking ? "drilling" : "finishing", toolDiam),
      };
      operations.push(finishOp);

      // Thread tapping after drilling
      if (feature.type === "tapped_hole" && feature.dimensions.pitch_mm) {
        const tapOp: SequenceOperation = {
          index: operations.length,
          name: `Tap thread (${feature.id})`,
          cycleCode: "TAPPING",
          operationType: "threading",
          tool: {
            toolNumber: toolNumber++,
            name: `Tap M${feature.dimensions.diameter_mm ?? 10}x${feature.dimensions.pitch_mm}`,
            type: "tap",
            diameterMm: feature.dimensions.diameter_mm ?? 10,
          },
          parameters: {
            thread_pitch_mm: feature.dimensions.pitch_mm,
            spindle_rpm: 500,
            depth_mm: feature.dimensions.depth_mm ?? 20,
          },
          targetFeatures: ["tapped_hole"],
          dependsOn: [operations.length - 1], // Depends on drill
          estimatedCycleTimeSec: 15,
        };
        operations.push(tapOp);
      }
    }

    if (operations.length === 0) {
      warnings.push("No operations inferred — STEP features may not map to standard machining operations");
    }

    return operations;
  }

  // ── Helper methods ───────────────────────────────────────────────────────

  private featureVolumeProxy(f: RecognizedFeature): number {
    const d = f.dimensions;
    if (d.diameter_mm && d.depth_mm) return Math.PI * (d.diameter_mm / 2) ** 2 * d.depth_mm;
    if (d.width_mm && d.length_mm && d.depth_mm) return d.width_mm * d.length_mm * d.depth_mm;
    if (d.diameter_mm) return d.diameter_mm ** 3;
    return 0;
  }

  private holeToolType(featureType: FeatureType): SequenceTool["type"] {
    if (featureType === "tapped_hole") return "drill"; // Drill first, tap later
    if (featureType === "counterbore") return "boring_bar"; // Flat-bottom counterbore tool
    if (featureType === "countersink") return "chamfer_mill"; // Countersink uses chamfer/center drill
    return "drill";
  }

  private generateFinishParameters(
    feature: RecognizedFeature,
    toolDiam: number,
    isHoleMaking: boolean,
    sf: { roughRPM: number; roughFeed: number; finishRPM: number; finishFeed: number }
  ): Record<string, number | string | boolean> {
    if (isHoleMaking) {
      // Drilling: use ~40% of roughing S/F as conservative drilling defaults
      return {
        spindle_rpm: Math.round(sf.roughRPM * 0.4),
        feed_mm_min: Math.round(sf.roughFeed * 0.25),
        depth_mm: feature.dimensions.depth_mm ?? 20,
        peck_depth_mm: (feature.dimensions.depth_mm ?? 20) > toolDiam * 3 ? toolDiam * 2 : 0,
      };
    }

    return {
      stepdown_mm: Math.min(toolDiam * 0.3, 2),
      stepover_mm: toolDiam * 0.1,
      feed_mm_min: sf.finishFeed,
      spindle_rpm: sf.finishRPM,
      scallop_height: 0.01,
      tolerance_mm: 0.02,
    };
  }

  private estimateCycleTime(
    feature: RecognizedFeature,
    phase: "roughing" | "finishing" | "drilling",
    toolDiam: number
  ): number {
    const vol = this.featureVolumeProxy(feature);
    if (phase === "roughing") return Math.max(10, vol / (toolDiam * 100));
    if (phase === "drilling") return Math.max(5, (feature.dimensions.depth_mm ?? 20) / 5);
    return Math.max(15, vol / (toolDiam * 50)); // Finishing is slower
  }

  private computeComplexity(features: RecognizedFeature[], operations: SequenceOperation[]): number {
    const featureTypes = new Set(features.map((f) => f.type));
    const opTypes = new Set(operations.map((o) => o.operationType));
    const toolCount = new Set(operations.map((o) => o.tool.toolNumber)).size;

    let score = 0;
    score += Math.min(featureTypes.size * 0.6, 3);
    score += Math.min(opTypes.size * 0.8, 2.5);
    score += Math.min(toolCount * 0.3, 2);
    score += Math.min(features.length * 0.15, 2.5);
    return Math.min(Math.round(score * 10) / 10, 10);
  }

  private computeConfidence(
    features: RecognizedFeature[],
    partClass: PartClassification,
    warnings: string[]
  ): number {
    let conf = 0.85; // Base confidence for STEP-inferred sequences
    if (features.length === 0) conf -= 0.3;
    if (features.length > 20) conf -= 0.05; // Complex parts harder to sequence
    if (partClass === "freeform") conf -= 0.1; // Freeform harder to infer
    conf -= warnings.length * 0.05;
    return Math.max(0.1, Math.min(1.0, conf));
  }

  /**
   * Infer ISO 513 material group from material name string.
   * Mirrors HMCProjectParserEngine.inferIsoGroup — same logic to avoid
   * classification drift between the two parsers.
   */
  private inferIsoGroup(material: string): StockDefinition["isoGroup"] | undefined {
    const m = material.toLowerCase();

    // H — Hardened steel (>45 HRC)
    if (m.includes("hardened") || m.includes("hrc") || /(^|\s)tool steel\b/.test(m)) return "H";
    if (/\b(h13|d2|m2|m42|a2|s7|o1|dc53)\b/.test(m)) return "H";

    // S — Superalloys (Ti, Ni-base, Co-base) — check BEFORE M to catch Inconel/Hastelloy
    if (m.includes("inconel") || m.includes("hastelloy") || m.includes("waspaloy") || m.includes("nimonic")) return "S";
    if (m.includes("titanium") || m.includes("ti-6al") || m.includes("ti6al") || /\bti-/.test(m) || m.includes("monel")) return "S";
    if (/\b(2\.\d{4})\b/.test(m)) {
      const wn = m.match(/\b(2\.(\d{4}))\b/);
      if (wn) {
        const num = parseInt(wn[2]);
        if (num >= 4000 && num <= 4999) return "S";
        if (num >= 7000 && num <= 7999) return "S";
      }
    }

    // N — Non-ferrous (aluminum, copper, brass, magnesium)
    if (m.includes("aluminum") || m.includes("aluminium") || m.includes("alu ")) return "N";
    if (/\b(7075|6061|6082|2024|5083|a356)\b/.test(m)) return "N";
    if (m.includes("copper") || m.includes("brass") || m.includes("bronze")) return "N";
    if (m.includes("magnesium") || m.includes("zinc") || m.includes("mg-")) return "N";

    // K — Cast iron (require "iron" or specific grade)
    if (m.includes("cast iron") || m.includes("grey iron") || m.includes("gray iron") || m.includes("ductile iron")) return "K";
    if (/\b(ggg|gg-|en-gj|astm a48|astm a536|fc[0-9])\b/.test(m)) return "K";
    if (m.includes("graphite iron") || m.includes("spheroidal")) return "K";

    // M — Stainless steel, austenitic/duplex/PH
    if (m.includes("stainless") || m.includes("duplex") || m.includes("precipitation hardening")) return "M";
    if (/\b(316|304|303|321|347|2205|17-4|15-5|ph13)\b/.test(m)) return "M";
    if (/\b1\.4\d{3}\b/.test(m)) return "M";

    // P — Carbon/alloy steel
    if (m.includes("steel") || m.includes("stahl")) return "P";
    if (/\b(1045|4140|4340|8620|p20|1018|1020|s355|c45|42crmo|16mncr)\b/.test(m)) return "P";
    if (/\b1\.[0-3]\d{3}\b/.test(m)) return "P";

    // Tungsten carbide — treat as H
    if (m.includes("carbide") || m.includes("cermet")) return "H";

    return "P";
  }
}

/** Singleton export */
export const stepFeatureExtractorEngine = new STEPFeatureExtractorEngine();
