/**
 * LatheFeatureRecognitionEngine — Turning Feature Recognition
 *
 * U-LTH34: Recognizes turning-specific machinable features from blueprint intake.
 * Takes consolidated dimensions and GDT from LathePrintIngestPipelineEngine and
 * extracts structured turning features ready for toolpath planning.
 *
 * Features recognized:
 *   - External profiles (OD steps, tapers, contours)
 *   - Internal profiles (ID bores, counterbores)
 *   - Faces (front, back, shoulders)
 *   - Grooves (external, internal, face)
 *   - Threads (external, internal, tapered)
 *   - Chamfers and radii
 *   - Undercuts (threading, bearing)
 *
 * @module LatheFeatureRecognitionEngine
 */

import type {
  BlueprintIntake,
  ConsolidatedDimension,
  ConsolidatedGDT,
  TurningFeatureHint,
} from "./LathePrintIngestPipelineEngine.js";
import type { ThreadCallout, SurfaceFinish } from "./PDFBlueprintDimensionExtractorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Feature type classification */
export type TurningFeatureType =
  | "external_diameter"
  | "internal_diameter"
  | "face"
  | "groove_external"
  | "groove_internal"
  | "groove_face"
  | "thread_external"
  | "thread_internal"
  | "thread_tapered"
  | "chamfer"
  | "radius"
  | "taper"
  | "contour"
  | "undercut_thread"
  | "undercut_bearing"
  | "center_drill"
  | "drill"
  | "bore"
  | "ream"
  | "part_off";

/** Operation type for feature */
export type TurningOperation =
  | "rough_turn"
  | "finish_turn"
  | "rough_bore"
  | "finish_bore"
  | "face"
  | "groove"
  | "thread"
  | "drill"
  | "ream"
  | "part_off"
  | "chamfer"
  | "radius";

/** Recognized turning feature */
export interface RecognizedTurningFeature {
  id: string;
  type: TurningFeatureType;
  name: string;

  // Geometry
  start_z: number;
  end_z: number;
  start_diameter: number;
  end_diameter: number;

  // Tolerances
  diameter_tolerance?: { plus: number; minus: number };
  length_tolerance?: { plus: number; minus: number };

  // Surface requirements
  surface_finish_ra?: number;
  gdt_requirements: string[];

  // Threading specific
  thread_spec?: string;
  thread_pitch?: number;
  thread_depth?: number;

  // Groove specific
  groove_width?: number;
  groove_depth?: number;

  // Operation hints
  suggested_operations: TurningOperation[];
  stock_allowance_mm: number;

  // Relationships
  parent_feature_id?: string;
  child_feature_ids: string[];
  datum_references: string[];

  // Source tracking
  source_dimensions: string[];
  source_gdt: string[];
  confidence: number;
}

/** Feature tree structure */
export interface FeatureTree {
  stock: {
    diameter: number;
    length: number;
    material?: string;
  };
  features: RecognizedTurningFeature[];
  operation_sequence: TurningOperation[];
  estimated_operations: number;
  complexity_score: number;
}

/** Recognition result */
export interface FeatureRecognitionResult {
  recognition_id: string;
  intake_id: string;
  processing_time_ms: number;

  feature_tree: FeatureTree;

  summary: {
    total_features: number;
    feature_types: Record<TurningFeatureType, number>;
    has_threading: boolean;
    has_grooving: boolean;
    has_boring: boolean;
    has_live_tooling_hints: boolean;
    max_depth_of_cut_mm: number;
    tight_tolerance_count: number;
  };

  warnings: string[];
  errors: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheFeatureRecognitionEngine {
  private recognitionCounter = 0;

  /**
   * Recognize turning features from blueprint intake
   */
  recognize(intake: BlueprintIntake): FeatureRecognitionResult {
    const startTime = Date.now();
    const recognitionId = `recog_${++this.recognitionCounter}_${Date.now()}`;

    const warnings: string[] = [];
    const errors: string[] = [];
    const features: RecognizedTurningFeature[] = [];
    let featureId = 0;

    // Infer stock dimensions
    const stock = this.inferStockDimensions(intake);

    // Step 1: Extract external diameter features
    const externalFeatures = this.extractExternalFeatures(
      intake,
      stock,
      () => `feat_${++featureId}`
    );
    features.push(...externalFeatures);

    // Step 2: Extract internal diameter features
    const internalFeatures = this.extractInternalFeatures(
      intake,
      () => `feat_${++featureId}`
    );
    features.push(...internalFeatures);

    // Step 3: Extract face features
    const faceFeatures = this.extractFaceFeatures(
      intake,
      () => `feat_${++featureId}`
    );
    features.push(...faceFeatures);

    // Step 4: Extract thread features
    const threadFeatures = this.extractThreadFeatures(
      intake,
      () => `feat_${++featureId}`
    );
    features.push(...threadFeatures);

    // Step 5: Extract groove features
    const grooveFeatures = this.extractGrooveFeatures(
      intake,
      () => `feat_${++featureId}`
    );
    features.push(...grooveFeatures);

    // Step 6: Extract chamfer/radius features
    const edgeFeatures = this.extractEdgeFeatures(
      intake,
      () => `feat_${++featureId}`
    );
    features.push(...edgeFeatures);

    // Step 7: Build operation sequence
    const operationSequence = this.buildOperationSequence(features);

    // Step 8: Calculate complexity
    const complexityScore = this.calculateComplexity(features);

    // Step 9: Build summary
    const featureTypes: Record<TurningFeatureType, number> = {} as Record<TurningFeatureType, number>;
    for (const feat of features) {
      featureTypes[feat.type] = (featureTypes[feat.type] || 0) + 1;
    }

    const hasThreading = features.some(f => f.type.startsWith("thread"));
    const hasGrooving = features.some(f => f.type.startsWith("groove"));
    const hasBoring = features.some(f => f.type === "internal_diameter" || f.type === "bore");

    let maxDepth = 0;
    for (const feat of features) {
      if (feat.type === "external_diameter" && stock.diameter > 0) {
        const depth = (stock.diameter - feat.end_diameter) / 2;
        if (depth > maxDepth) maxDepth = depth;
      }
    }

    const tightTolerances = features.filter(f => {
      const tol = f.diameter_tolerance;
      return tol && (tol.plus + Math.abs(tol.minus)) < 0.05;
    });

    // Validation warnings
    if (features.length === 0) {
      warnings.push("No machinable features recognized from intake");
    }
    if (stock.diameter === 0) {
      warnings.push("Could not determine stock diameter");
    }

    return {
      recognition_id: recognitionId,
      intake_id: intake.intake_id,
      processing_time_ms: Date.now() - startTime,

      feature_tree: {
        stock,
        features,
        operation_sequence: operationSequence,
        estimated_operations: operationSequence.length,
        complexity_score: complexityScore
      },

      summary: {
        total_features: features.length,
        feature_types: featureTypes,
        has_threading: hasThreading,
        has_grooving: hasGrooving,
        has_boring: hasBoring,
        has_live_tooling_hints: false,
        max_depth_of_cut_mm: Math.round(maxDepth * 100) / 100,
        tight_tolerance_count: tightTolerances.length
      },

      warnings,
      errors
    };
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    total_recognitions: number;
    supported_feature_types: TurningFeatureType[];
    supported_operations: TurningOperation[];
  } {
    return {
      total_recognitions: this.recognitionCounter,
      supported_feature_types: [
        "external_diameter", "internal_diameter", "face",
        "groove_external", "groove_internal", "groove_face",
        "thread_external", "thread_internal", "thread_tapered",
        "chamfer", "radius", "taper", "contour",
        "undercut_thread", "undercut_bearing",
        "center_drill", "drill", "bore", "ream", "part_off"
      ],
      supported_operations: [
        "rough_turn", "finish_turn", "rough_bore", "finish_bore",
        "face", "groove", "thread", "drill", "ream", "part_off",
        "chamfer", "radius"
      ]
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private inferStockDimensions(intake: BlueprintIntake): FeatureTree["stock"] {
    // Find largest OD from turning features or dimensions
    let maxDiameter = 0;
    let maxLength = 0;

    for (const hint of intake.turning_features) {
      if (hint.type === "od" && hint.diameter && hint.diameter > maxDiameter) {
        maxDiameter = hint.diameter;
      }
      if (hint.type === "face" && hint.length && hint.length > maxLength) {
        maxLength = hint.length;
      }
    }

    // Fall back to dimensions
    if (maxDiameter === 0) {
      for (const dim of intake.dimensions) {
        if (dim.type === "diameter" && dim.nominal > maxDiameter) {
          maxDiameter = dim.nominal;
        }
      }
    }

    if (maxLength === 0) {
      for (const dim of intake.dimensions) {
        if (dim.type === "linear" && dim.nominal > maxLength) {
          maxLength = dim.nominal;
        }
      }
    }

    // Add stock allowance (2mm per side for OD, 5mm for length)
    const stockDiameter = maxDiameter > 0 ? Math.ceil((maxDiameter + 4) / 5) * 5 : 0;
    const stockLength = maxLength > 0 ? Math.ceil((maxLength + 10) / 5) * 5 : 0;

    return {
      diameter: stockDiameter,
      length: stockLength,
      material: intake.part_info.material
    };
  }

  private extractExternalFeatures(
    intake: BlueprintIntake,
    stock: FeatureTree["stock"],
    idGen: () => string
  ): RecognizedTurningFeature[] {
    const features: RecognizedTurningFeature[] = [];

    // Get OD dimensions sorted by diameter (largest first)
    const odDimensions = intake.dimensions
      .filter(d => d.type === "diameter" && d.nominal > 0)
      .sort((a, b) => b.nominal - a.nominal);

    let currentZ = 0;
    for (const dim of odDimensions) {
      // Skip if likely an ID (less than 50% of largest OD)
      if (odDimensions[0] && dim.nominal < odDimensions[0].nominal * 0.5) {
        continue;
      }

      const operations: TurningOperation[] = ["rough_turn", "finish_turn"];
      if (dim.tolerance_plus < 0.025) {
        operations.push("finish_turn");
      }

      const relatedGDT = intake.gdt_callouts.filter(g =>
        g.symbol === "cylindricity" ||
        g.symbol === "circular_runout" ||
        g.symbol === "position"
      );

      features.push({
        id: idGen(),
        type: "external_diameter",
        name: `OD ${dim.nominal}`,
        start_z: currentZ,
        end_z: currentZ + 20, // Estimated segment length
        start_diameter: stock.diameter,
        end_diameter: dim.nominal,
        diameter_tolerance: {
          plus: dim.tolerance_plus,
          minus: dim.tolerance_minus
        },
        gdt_requirements: relatedGDT.map(g => g.id),
        suggested_operations: operations,
        stock_allowance_mm: (stock.diameter - dim.nominal) / 2,
        child_feature_ids: [],
        datum_references: relatedGDT.flatMap(g => g.datums),
        source_dimensions: [dim.id],
        source_gdt: relatedGDT.map(g => g.id),
        confidence: dim.confidence
      });

      currentZ += 25;
    }

    return features;
  }

  private extractInternalFeatures(
    intake: BlueprintIntake,
    idGen: () => string
  ): RecognizedTurningFeature[] {
    const features: RecognizedTurningFeature[] = [];

    // Look for small diameters (likely ID bores)
    const idCandidates = intake.dimensions
      .filter(d => d.type === "diameter")
      .filter(d => {
        const maxOD = Math.max(...intake.dimensions.filter(x => x.type === "diameter").map(x => x.nominal), 0);
        return d.nominal < maxOD * 0.5;
      });

    for (const dim of idCandidates) {
      const relatedGDT = intake.gdt_callouts.filter(g =>
        g.symbol === "cylindricity" ||
        g.symbol === "position" ||
        g.symbol === "concentricity"
      );

      features.push({
        id: idGen(),
        type: "internal_diameter",
        name: `ID Bore ${dim.nominal}`,
        start_z: 0,
        end_z: 30, // Estimated depth
        start_diameter: 0,
        end_diameter: dim.nominal,
        diameter_tolerance: {
          plus: dim.tolerance_plus,
          minus: dim.tolerance_minus
        },
        gdt_requirements: relatedGDT.map(g => g.id),
        suggested_operations: ["drill", "rough_bore", "finish_bore"],
        stock_allowance_mm: dim.nominal / 2,
        child_feature_ids: [],
        datum_references: relatedGDT.flatMap(g => g.datums),
        source_dimensions: [dim.id],
        source_gdt: relatedGDT.map(g => g.id),
        confidence: dim.confidence
      });
    }

    return features;
  }

  private extractFaceFeatures(
    intake: BlueprintIntake,
    idGen: () => string
  ): RecognizedTurningFeature[] {
    const features: RecognizedTurningFeature[] = [];

    // Find face hints
    const faceHints = intake.turning_features.filter(f => f.type === "face");

    for (const hint of faceHints) {
      const maxOD = Math.max(...intake.dimensions.filter(d => d.type === "diameter").map(d => d.nominal), 50);

      const relatedGDT = intake.gdt_callouts.filter(g =>
        g.symbol === "flatness" ||
        g.symbol === "perpendicularity"
      );

      features.push({
        id: idGen(),
        type: "face",
        name: "Front Face",
        start_z: 0,
        end_z: 0,
        start_diameter: maxOD,
        end_diameter: 0,
        gdt_requirements: relatedGDT.map(g => g.id),
        suggested_operations: ["face"],
        stock_allowance_mm: 2,
        child_feature_ids: [],
        datum_references: relatedGDT.flatMap(g => g.datums),
        source_dimensions: hint.associated_dimensions,
        source_gdt: relatedGDT.map(g => g.id),
        confidence: 0.9
      });
    }

    // Always add at least one face if we have dimensions
    if (features.length === 0 && intake.dimensions.length > 0) {
      const maxOD = Math.max(...intake.dimensions.filter(d => d.type === "diameter").map(d => d.nominal), 50);

      features.push({
        id: idGen(),
        type: "face",
        name: "Front Face",
        start_z: 0,
        end_z: 0,
        start_diameter: maxOD,
        end_diameter: 0,
        gdt_requirements: [],
        suggested_operations: ["face"],
        stock_allowance_mm: 2,
        child_feature_ids: [],
        datum_references: [],
        source_dimensions: [],
        source_gdt: [],
        confidence: 0.8
      });
    }

    return features;
  }

  private extractThreadFeatures(
    intake: BlueprintIntake,
    idGen: () => string
  ): RecognizedTurningFeature[] {
    const features: RecognizedTurningFeature[] = [];

    for (const thread of intake.threads) {
      const isExternal = !thread.location?.toLowerCase().includes("internal");
      const threadType: TurningFeatureType = isExternal ? "thread_external" : "thread_internal";

      // Estimate thread length (3x pitch minimum)
      const threadLength = thread.pitch ? thread.pitch * 10 : 15;

      features.push({
        id: idGen(),
        type: threadType,
        name: `Thread ${thread.spec}`,
        start_z: 0,
        end_z: threadLength,
        start_diameter: thread.major_diameter || 20,
        end_diameter: thread.major_diameter || 20,
        thread_spec: thread.spec,
        thread_pitch: thread.pitch,
        thread_depth: thread.pitch ? thread.pitch * 0.65 : undefined,
        gdt_requirements: [],
        suggested_operations: ["thread"],
        stock_allowance_mm: 0,
        child_feature_ids: [],
        datum_references: [],
        source_dimensions: [],
        source_gdt: [],
        confidence: 0.95
      });
    }

    return features;
  }

  private extractGrooveFeatures(
    intake: BlueprintIntake,
    idGen: () => string
  ): RecognizedTurningFeature[] {
    const features: RecognizedTurningFeature[] = [];

    // Look for groove hints
    const grooveHints = intake.turning_features.filter(f => f.type === "groove");

    for (const hint of grooveHints) {
      features.push({
        id: idGen(),
        type: "groove_external",
        name: "External Groove",
        start_z: hint.location_z || 50,
        end_z: (hint.location_z || 50) + 3,
        start_diameter: hint.diameter || 40,
        end_diameter: (hint.diameter || 40) - 6,
        groove_width: 3,
        groove_depth: 3,
        gdt_requirements: [],
        suggested_operations: ["groove"],
        stock_allowance_mm: 0,
        child_feature_ids: [],
        datum_references: [],
        source_dimensions: hint.associated_dimensions,
        source_gdt: [],
        confidence: 0.85
      });
    }

    return features;
  }

  private extractEdgeFeatures(
    intake: BlueprintIntake,
    idGen: () => string
  ): RecognizedTurningFeature[] {
    const features: RecognizedTurningFeature[] = [];

    // Chamfers
    const chamferHints = intake.turning_features.filter(f => f.type === "chamfer");
    for (const hint of chamferHints) {
      const chamferDim = intake.dimensions.find(d => hint.associated_dimensions.includes(d.id));

      features.push({
        id: idGen(),
        type: "chamfer",
        name: chamferDim ? `Chamfer ${chamferDim.nominal}x45°` : "Chamfer",
        start_z: 0,
        end_z: chamferDim?.nominal || 1,
        start_diameter: 50,
        end_diameter: 50 - (chamferDim?.nominal || 1) * 2,
        gdt_requirements: [],
        suggested_operations: ["chamfer"],
        stock_allowance_mm: 0,
        child_feature_ids: [],
        datum_references: [],
        source_dimensions: hint.associated_dimensions,
        source_gdt: [],
        confidence: 0.9
      });
    }

    // Radii
    const radiusHints = intake.turning_features.filter(f => f.type === "radius");
    for (const hint of radiusHints) {
      const radiusDim = intake.dimensions.find(d => hint.associated_dimensions.includes(d.id));

      features.push({
        id: idGen(),
        type: "radius",
        name: radiusDim ? `R${radiusDim.nominal}` : "Radius",
        start_z: 0,
        end_z: radiusDim?.nominal || 3,
        start_diameter: 50,
        end_diameter: 50,
        gdt_requirements: [],
        suggested_operations: ["radius"],
        stock_allowance_mm: 0,
        child_feature_ids: [],
        datum_references: [],
        source_dimensions: hint.associated_dimensions,
        source_gdt: [],
        confidence: 0.9
      });
    }

    return features;
  }

  private buildOperationSequence(features: RecognizedTurningFeature[]): TurningOperation[] {
    const sequence: TurningOperation[] = [];

    // Always start with face
    if (features.some(f => f.type === "face")) {
      sequence.push("face");
    }

    // Rough external
    if (features.some(f => f.type === "external_diameter")) {
      sequence.push("rough_turn");
    }

    // Drilling for internal features
    if (features.some(f => f.type === "internal_diameter" || f.type === "bore")) {
      sequence.push("drill");
    }

    // Rough boring
    if (features.some(f => f.type === "internal_diameter")) {
      sequence.push("rough_bore");
    }

    // Finish external
    if (features.some(f => f.type === "external_diameter")) {
      sequence.push("finish_turn");
    }

    // Finish boring
    if (features.some(f => f.type === "internal_diameter")) {
      sequence.push("finish_bore");
    }

    // Grooving
    if (features.some(f => f.type.startsWith("groove"))) {
      sequence.push("groove");
    }

    // Threading
    if (features.some(f => f.type.startsWith("thread"))) {
      sequence.push("thread");
    }

    // Part off (usually last)
    if (features.some(f => f.type === "part_off")) {
      sequence.push("part_off");
    }

    return sequence;
  }

  private calculateComplexity(features: RecognizedTurningFeature[]): number {
    let complexity = 0;

    // Base complexity from feature count
    complexity += features.length * 5;

    // Threading adds complexity
    complexity += features.filter(f => f.type.startsWith("thread")).length * 15;

    // Grooving adds complexity
    complexity += features.filter(f => f.type.startsWith("groove")).length * 10;

    // Boring adds complexity
    complexity += features.filter(f => f.type === "internal_diameter" || f.type === "bore").length * 10;

    // Tight tolerances add complexity
    const tightTols = features.filter(f => {
      const tol = f.diameter_tolerance;
      return tol && (tol.plus + Math.abs(tol.minus)) < 0.05;
    });
    complexity += tightTols.length * 10;

    // GDT requirements add complexity
    const withGDT = features.filter(f => f.gdt_requirements.length > 0);
    complexity += withGDT.length * 5;

    // Normalize to 0-100
    return Math.min(100, Math.max(0, complexity));
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheFeatureRecognitionEngine = new LatheFeatureRecognitionEngine();
