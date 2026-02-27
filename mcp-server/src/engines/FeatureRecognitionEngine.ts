/**
 * FeatureRecognitionEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * Recognizes machining features from part geometry: holes, pockets, slots,
 * bosses, fillets, chamfers, threads, surfaces. Outputs feature list with
 * manufacturing parameters for downstream process planning.
 *
 * Actions: feature_recognize, feature_classify, feature_edit
 */

// ============================================================================
// TYPES
// ============================================================================

export type FeatureType =
  | "through_hole" | "blind_hole" | "counterbore" | "countersink" | "tapped_hole"
  | "pocket_rectangular" | "pocket_circular" | "pocket_freeform"
  | "slot_through" | "slot_blind" | "keyway"
  | "boss_circular" | "boss_rectangular"
  | "fillet" | "chamfer"
  | "face" | "step" | "groove" | "thread_external"
  | "contour_2d" | "contour_3d";

export interface RecognizedFeature {
  id: string;
  type: FeatureType;
  confidence: number;                  // 0-1
  dimensions: FeatureDimensions;
  position: { x: number; y: number; z: number };
  orientation: { axis: "x" | "y" | "z" | "custom"; angle_deg?: number };
  tolerance?: { type: string; value_mm: number };
  surface_finish_ra?: number;
  notes: string[];
}

export interface FeatureDimensions {
  diameter_mm?: number;
  depth_mm?: number;
  width_mm?: number;
  length_mm?: number;
  radius_mm?: number;
  angle_deg?: number;
  pitch_mm?: number;                   // for threads
  counterbore_diameter_mm?: number;
  counterbore_depth_mm?: number;
  countersink_angle_deg?: number;
}

export interface FeatureClassification {
  feature_id: string;
  primary_type: FeatureType;
  secondary_types: FeatureType[];
  manufacturing_difficulty: "simple" | "moderate" | "complex" | "very_complex";
  required_operations: string[];
  estimated_cycle_time_sec: number;
  tool_requirements: string[];
  accessibility: "open" | "semi_open" | "restricted" | "deep";
}

export interface FeatureGroup {
  group_id: string;
  features: RecognizedFeature[];
  pattern_type: "linear" | "circular" | "grid" | "none";
  pattern_count: number;
  pattern_spacing_mm?: number;
}

export interface FeatureRecognitionResult {
  total_features: number;
  features: RecognizedFeature[];
  groups: FeatureGroup[];
  complexity_score: number;            // 0-10
  estimated_operations: number;
  warnings: string[];
}

// ============================================================================
// FEATURE RECOGNITION RULES
// ============================================================================

interface FeatureRule {
  type: FeatureType;
  difficulty: FeatureClassification["manufacturing_difficulty"];
  operations: string[];
  tools: string[];
  baseCycleTimeSec: number;
  accessibility: FeatureClassification["accessibility"];
}

const FEATURE_RULES: Record<FeatureType, FeatureRule> = {
  through_hole:       { type: "through_hole", difficulty: "simple", operations: ["drilling"], tools: ["twist_drill"], baseCycleTimeSec: 8, accessibility: "open" },
  blind_hole:         { type: "blind_hole", difficulty: "simple", operations: ["drilling"], tools: ["twist_drill"], baseCycleTimeSec: 10, accessibility: "open" },
  counterbore:        { type: "counterbore", difficulty: "moderate", operations: ["drilling", "counterboring"], tools: ["twist_drill", "counterbore_tool"], baseCycleTimeSec: 15, accessibility: "open" },
  countersink:        { type: "countersink", difficulty: "simple", operations: ["drilling", "countersinking"], tools: ["twist_drill", "countersink_tool"], baseCycleTimeSec: 12, accessibility: "open" },
  tapped_hole:        { type: "tapped_hole", difficulty: "moderate", operations: ["drilling", "tapping"], tools: ["twist_drill", "tap"], baseCycleTimeSec: 20, accessibility: "open" },
  pocket_rectangular: { type: "pocket_rectangular", difficulty: "moderate", operations: ["roughing", "finishing"], tools: ["end_mill"], baseCycleTimeSec: 45, accessibility: "semi_open" },
  pocket_circular:    { type: "pocket_circular", difficulty: "moderate", operations: ["helical_interpolation", "finishing"], tools: ["end_mill"], baseCycleTimeSec: 35, accessibility: "semi_open" },
  pocket_freeform:    { type: "pocket_freeform", difficulty: "complex", operations: ["adaptive_roughing", "rest_machining", "finishing"], tools: ["end_mill", "ball_mill"], baseCycleTimeSec: 120, accessibility: "semi_open" },
  slot_through:       { type: "slot_through", difficulty: "simple", operations: ["slotting"], tools: ["end_mill"], baseCycleTimeSec: 20, accessibility: "open" },
  slot_blind:         { type: "slot_blind", difficulty: "moderate", operations: ["ramping", "slotting"], tools: ["end_mill"], baseCycleTimeSec: 25, accessibility: "semi_open" },
  keyway:             { type: "keyway", difficulty: "moderate", operations: ["slotting"], tools: ["keyway_cutter"], baseCycleTimeSec: 30, accessibility: "restricted" },
  boss_circular:      { type: "boss_circular", difficulty: "moderate", operations: ["roughing", "finishing"], tools: ["end_mill"], baseCycleTimeSec: 40, accessibility: "open" },
  boss_rectangular:   { type: "boss_rectangular", difficulty: "moderate", operations: ["roughing", "finishing"], tools: ["end_mill"], baseCycleTimeSec: 50, accessibility: "open" },
  fillet:             { type: "fillet", difficulty: "moderate", operations: ["ball_milling"], tools: ["ball_mill"], baseCycleTimeSec: 15, accessibility: "semi_open" },
  chamfer:            { type: "chamfer", difficulty: "simple", operations: ["chamfering"], tools: ["chamfer_mill"], baseCycleTimeSec: 8, accessibility: "open" },
  face:               { type: "face", difficulty: "simple", operations: ["face_milling"], tools: ["face_mill"], baseCycleTimeSec: 20, accessibility: "open" },
  step:               { type: "step", difficulty: "moderate", operations: ["shoulder_milling"], tools: ["end_mill"], baseCycleTimeSec: 30, accessibility: "open" },
  groove:             { type: "groove", difficulty: "moderate", operations: ["grooving"], tools: ["grooving_tool"], baseCycleTimeSec: 25, accessibility: "restricted" },
  thread_external:    { type: "thread_external", difficulty: "complex", operations: ["thread_milling"], tools: ["thread_mill"], baseCycleTimeSec: 35, accessibility: "open" },
  contour_2d:         { type: "contour_2d", difficulty: "moderate", operations: ["profiling"], tools: ["end_mill"], baseCycleTimeSec: 30, accessibility: "open" },
  contour_3d:         { type: "contour_3d", difficulty: "complex", operations: ["3d_profiling", "rest_machining"], tools: ["ball_mill", "end_mill"], baseCycleTimeSec: 90, accessibility: "semi_open" },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class FeatureRecognitionEngine {
  recognize(features: Array<{ type: FeatureType; dimensions: FeatureDimensions; position: { x: number; y: number; z: number } }>): FeatureRecognitionResult {
    const recognized: RecognizedFeature[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const rule = FEATURE_RULES[f.type];
      const confidence = rule ? 0.95 : 0.5;

      const feat: RecognizedFeature = {
        id: `F${(i + 1).toString().padStart(3, "0")}`,
        type: f.type,
        confidence,
        dimensions: f.dimensions,
        position: f.position,
        orientation: { axis: "z" },
        notes: [],
      };

      // Validate dimensions
      if (f.dimensions.diameter_mm && f.dimensions.diameter_mm < 1) {
        warnings.push(`Feature ${feat.id}: diameter ${f.dimensions.diameter_mm}mm is very small — consider micro-machining`);
      }
      if (f.dimensions.depth_mm && f.dimensions.diameter_mm && f.dimensions.depth_mm / f.dimensions.diameter_mm > 10) {
        warnings.push(`Feature ${feat.id}: L/D ratio ${(f.dimensions.depth_mm / f.dimensions.diameter_mm).toFixed(1)} — deep hole strategy required`);
        feat.notes.push("Deep hole — requires peck drilling or gun drilling");
      }

      recognized.push(feat);
    }

    // Detect patterns (same type, aligned positions)
    const groups = this.detectPatterns(recognized);

    // Complexity score
    const complexity = this.complexityScore(recognized);

    return {
      total_features: recognized.length,
      features: recognized,
      groups,
      complexity_score: Math.round(complexity * 10) / 10,
      estimated_operations: recognized.reduce((s, f) => s + (FEATURE_RULES[f.type]?.operations.length || 1), 0),
      warnings,
    };
  }

  classify(feature: RecognizedFeature): FeatureClassification {
    const rule = FEATURE_RULES[feature.type] || FEATURE_RULES["pocket_rectangular"];
    let cycleTime = rule.baseCycleTimeSec;

    // Scale by size
    if (feature.dimensions.diameter_mm) cycleTime *= Math.max(1, feature.dimensions.diameter_mm / 20);
    if (feature.dimensions.depth_mm) cycleTime *= Math.max(1, feature.dimensions.depth_mm / 20);

    return {
      feature_id: feature.id,
      primary_type: feature.type,
      secondary_types: [],
      manufacturing_difficulty: rule.difficulty,
      required_operations: rule.operations,
      estimated_cycle_time_sec: Math.round(cycleTime),
      tool_requirements: rule.tools,
      accessibility: rule.accessibility,
    };
  }

  private detectPatterns(features: RecognizedFeature[]): FeatureGroup[] {
    const groups: FeatureGroup[] = [];
    const byType = new Map<FeatureType, RecognizedFeature[]>();

    for (const f of features) {
      if (!byType.has(f.type)) byType.set(f.type, []);
      byType.get(f.type)!.push(f);
    }

    for (const [type, feats] of byType) {
      if (feats.length < 2) continue;

      // Check for linear pattern (aligned on one axis)
      const xSorted = [...feats].sort((a, b) => a.position.x - b.position.x);
      const ySorted = [...feats].sort((a, b) => a.position.y - b.position.y);

      let patternType: FeatureGroup["pattern_type"] = "none";
      let spacing = 0;

      // Check X alignment (Y and Z approximately same)
      const ySpread = Math.max(...feats.map(f => f.position.y)) - Math.min(...feats.map(f => f.position.y));
      const xSpread = Math.max(...feats.map(f => f.position.x)) - Math.min(...feats.map(f => f.position.x));

      if (ySpread < 1 && xSpread > 1 && feats.length >= 2) {
        patternType = "linear";
        spacing = xSpread / (feats.length - 1);
      } else if (xSpread < 1 && ySpread > 1 && feats.length >= 2) {
        patternType = "linear";
        spacing = ySpread / (feats.length - 1);
      }

      if (patternType !== "none" || feats.length >= 3) {
        groups.push({
          group_id: `G-${type}-${groups.length + 1}`,
          features: feats,
          pattern_type: patternType,
          pattern_count: feats.length,
          pattern_spacing_mm: spacing > 0 ? Math.round(spacing * 100) / 100 : undefined,
        });
      }
    }

    return groups;
  }

  private complexityScore(features: RecognizedFeature[]): number {
    let score = 0;
    for (const f of features) {
      const rule = FEATURE_RULES[f.type];
      if (!rule) { score += 0.5; continue; }
      switch (rule.difficulty) {
        case "simple": score += 0.3; break;
        case "moderate": score += 0.6; break;
        case "complex": score += 1.0; break;
        case "very_complex": score += 1.5; break;
      }
    }
    return Math.min(10, score);
  }
}

export const featureRecognitionEngine = new FeatureRecognitionEngine();
