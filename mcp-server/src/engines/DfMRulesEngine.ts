/**
 * DfMRulesEngine — Design for Manufacturability Rules Engine
 *
 * Consolidates CNC machining design rules from multiple industry sources:
 * - Wall thickness limits (metal/plastic)
 * - Cavity/pocket depth constraints
 * - Internal edge fillet sizing
 * - Hole depth/diameter guidelines
 * - Thread sizing recommendations
 * - Tolerance feasibility checks
 * - Undercut dimension limits
 * - Feature aspect ratio checks
 * - Face mill geometry selection (45° vs 90°)
 * - Deep hole drilling technique thresholds
 *
 * Sources: CNC Complete Engineering Guide, CNCCookbook Feeds & Speeds,
 *          Face Mill Guide, Thread Milling Guide, Deep Hole Drilling Guide
 *
 * @module DfMRulesEngine
 * @source document:cnc-batch1-guides
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DfMCheckInput {
  features?: DfMFeature[];
  material_type?: "metal" | "plastic";
  machine_type?: "3axis" | "5axis_indexed" | "5axis_continuous" | "lathe" | "mill_turn";
  tolerance_mm?: number;
}

/** Df M Feature configuration/data structure.
 */
export interface DfMFeature {
  type: "wall" | "cavity" | "hole" | "thread" | "undercut" | "tall_feature" | "small_feature" | "fillet";
  /** mm */
  thickness_mm?: number;
  /** mm */
  width_mm?: number;
  /** mm */
  depth_mm?: number;
  /** mm */
  diameter_mm?: number;
  /** mm */
  height_mm?: number;
  /** aspect ratio height/width */
  aspect_ratio?: number;
  /** e.g. "M6", "M2" */
  thread_size?: string;
  /** thread engagement length in mm */
  thread_length_mm?: number;
  /** nominal thread diameter mm */
  thread_nominal_mm?: number;
  /** for holes: is this a standard drill size? */
  standard_drill_size?: boolean;
}

/** Df M Violation configuration/data structure.
 */
export interface DfMViolation {
  feature_type: string;
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  recommendation: string;
}

/** Df M Check Result configuration/data structure.
 */
export interface DfMCheckResult {
  pass: boolean;
  violations: DfMViolation[];
  summary: {
    total_features: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  design_rules_applied: string[];
}

/** Face Mill Selection Input configuration/data structure.
 */
export interface FaceMillSelectionInput {
  workpiece_material?: string;
  wall_thickness_mm?: number;
  is_interrupted_cut?: boolean;
  priority?: "mrr" | "finish" | "versatility";
}

/** Face Mill Recommendation configuration/data structure.
 */
export interface FaceMillRecommendation {
  recommended_angle: 45 | 90 | "button";
  reasoning: string[];
  mrr_advantage_pct?: number;
  warnings: string[];
}

/** Deep Hole Input configuration/data structure.
 */
export interface DeepHoleInput {
  hole_diameter_mm: number;
  hole_depth_mm: number;
  material?: string;
  has_through_coolant?: boolean;
}

/** Deep Hole Technique configuration/data structure.
 */
export interface DeepHoleTechnique {
  ld_ratio: number;
  technique: string;
  peck_required: boolean;
  parabolic_flute: boolean;
  gun_drill: boolean;
  feed_reduction_pct: number;
  notes: string[];
}

// ============================================================================
// DESIGN RULES DATABASE
// ============================================================================

const WALL_LIMITS = {
  metal:   { recommended_mm: 0.8, feasible_mm: 0.5 },
  plastic: { recommended_mm: 1.5, feasible_mm: 1.0 },
} as const;

const CAVITY_RULES = {
  recommended_depth_multiplier: 4,   // 4× cavity width
  max_depth_tool_dia_multiplier: 10, // 10× tool diameter
  max_depth_mm: 250,                 // 250mm absolute max
} as const;

const FILLET_RULES = {
  internal_min_fraction: 1 / 3, // fillet > 1/3 × cavity depth
  floor_radius_mm: [0.1, 1.0], // floor edges: sharp or 0.1 or 1.0mm
} as const;

const TALL_FEATURE_RULES = {
  max_aspect_ratio: 4, // height/width < 4
} as const;

const HOLE_RULES = {
  recommended_depth_multiplier: 4,  // 4× nominal diameter
  max_depth_multiplier: 10,         // 10× nominal diameter
} as const;

const THREAD_RULES = {
  recommended_min_size_mm: 6,  // M6 minimum recommended
  feasible_min_size_mm: 2,     // M2 feasible minimum
  max_length_multiplier: 3,    // length ≤ 3× nominal diameter
} as const;

const SMALL_FEATURE_RULES = {
  recommended_min_mm: 2.5,  // 2.5mm minimum with standard tools
  feasible_min_mm: 0.1,     // 0.1mm is micro-machining territory
} as const;

const UNDERCUT_RULES = {
  min_clearance_multiplier: 4,  // clearance ≥ 4× depth
  width_range_mm: [3, 40],      // 3mm to 40mm width
  max_depth_multiplier: 2,      // depth ≤ 2× width
} as const;

const TOLERANCE_LIMITS = {
  standard_mm: 0.125,
  tight_mm: 0.050,
  feasible_mm: 0.025,
} as const;

// Deep hole drilling thresholds (L/D ratio)
interface DeepHoleThreshold {
  max_ld: number;
  technique: string;
  peck: boolean;
  parabolic: boolean;
  gun: boolean;
  feed_reduce: number;
}

const DEEP_HOLE_THRESHOLDS: DeepHoleThreshold[] = [
  { max_ld: 5,   technique: "standard_drill",           peck: false, parabolic: false, gun: false, feed_reduce: 0  },
  { max_ld: 7,   technique: "peck_drilling",            peck: true,  parabolic: false, gun: false, feed_reduce: 0  },
  { max_ld: 10,  technique: "parabolic_flute_peck",     peck: true,  parabolic: true,  gun: false, feed_reduce: 10 },
  { max_ld: 20,  technique: "parabolic_custom_cycle",   peck: true,  parabolic: true,  gun: false, feed_reduce: 20 },
  { max_ld: 400, technique: "gun_drill_bta",            peck: false, parabolic: false, gun: true,  feed_reduce: 0  },
];

// ============================================================================
// MAIN CHECK FUNCTION
// ============================================================================

/** Checks df m rules.
 * @param input - input input
 * @returns df m check result
 */
export function checkDfMRules(input: DfMCheckInput): DfMCheckResult {
  const violations: DfMViolation[] = [];
  const rulesApplied: string[] = [];
  const materialType = input.material_type ?? "metal";
  const features = input.features ?? [];

  // Check global tolerance
  if (input.tolerance_mm !== undefined) {
    rulesApplied.push("tolerance_feasibility");
    if (input.tolerance_mm < TOLERANCE_LIMITS.feasible_mm) {
      violations.push({
        feature_type: "tolerance",
        severity: "error",
        rule: "tolerance_below_feasible",
        message: `Tolerance ±${input.tolerance_mm}mm is below feasible limit of ±${TOLERANCE_LIMITS.feasible_mm}mm`,
        recommendation: `Relax tolerance to at least ±${TOLERANCE_LIMITS.feasible_mm}mm or use grinding/lapping post-process`,
      });
    } else if (input.tolerance_mm < TOLERANCE_LIMITS.tight_mm) {
      violations.push({
        feature_type: "tolerance",
        severity: "warning",
        rule: "tolerance_tight",
        message: `Tolerance ±${input.tolerance_mm}mm is tighter than standard (±${TOLERANCE_LIMITS.standard_mm}mm)`,
        recommendation: `This is feasible but increases cost. Standard tolerance is ±${TOLERANCE_LIMITS.standard_mm}mm`,
      });
    }
  }

  for (const feat of features) {
    switch (feat.type) {
      case "wall":
        rulesApplied.push("wall_thickness");
        checkWall(feat, materialType, violations);
        break;
      case "cavity":
        rulesApplied.push("cavity_depth");
        checkCavity(feat, violations);
        break;
      case "hole":
        rulesApplied.push("hole_depth");
        checkHole(feat, violations);
        break;
      case "thread":
        rulesApplied.push("thread_sizing");
        checkThread(feat, violations);
        break;
      case "undercut":
        rulesApplied.push("undercut_dimensions");
        checkUndercut(feat, violations);
        break;
      case "tall_feature":
        rulesApplied.push("tall_feature_aspect");
        checkTallFeature(feat, violations);
        break;
      case "small_feature":
        rulesApplied.push("small_feature_size");
        checkSmallFeature(feat, violations);
        break;
      case "fillet":
        rulesApplied.push("internal_fillet");
        checkFillet(feat, violations);
        break;
    }
  }

  const errors = violations.filter(v => v.severity === "error").length;
  const warnings = violations.filter(v => v.severity === "warning").length;
  const infos = violations.filter(v => v.severity === "info").length;

  return {
    pass: errors === 0,
    violations,
    summary: {
      total_features: features.length,
      errors,
      warnings,
      infos,
    },
    design_rules_applied: [...new Set(rulesApplied)],
  };
}

// ============================================================================
// INDIVIDUAL RULE CHECKS
// ============================================================================

function checkWall(feat: DfMFeature, materialType: "metal" | "plastic", violations: DfMViolation[]): void {
  const t = feat.thickness_mm;
  if (t === undefined) return;
  const limits = WALL_LIMITS[materialType];

  if (t < limits.feasible_mm) {
    violations.push({
      feature_type: "wall",
      severity: "error",
      rule: "wall_below_feasible",
      message: `Wall thickness ${t}mm is below feasible minimum ${limits.feasible_mm}mm for ${materialType}`,
      recommendation: `Increase wall thickness to at least ${limits.recommended_mm}mm (recommended) or ${limits.feasible_mm}mm (minimum)`,
    });
  } else if (t < limits.recommended_mm) {
    violations.push({
      feature_type: "wall",
      severity: "warning",
      rule: "wall_below_recommended",
      message: `Wall thickness ${t}mm is below recommended ${limits.recommended_mm}mm for ${materialType}`,
      recommendation: `Consider increasing to ${limits.recommended_mm}mm to reduce vibration and improve tolerances`,
    });
  }
}

function checkCavity(feat: DfMFeature, violations: DfMViolation[]): void {
  const depth = feat.depth_mm;
  const width = feat.width_mm;
  if (depth === undefined) return;

  if (depth > CAVITY_RULES.max_depth_mm) {
    violations.push({
      feature_type: "cavity",
      severity: "error",
      rule: "cavity_exceeds_max_depth",
      message: `Cavity depth ${depth}mm exceeds absolute maximum ${CAVITY_RULES.max_depth_mm}mm`,
      recommendation: "Split into multiple setups or consider alternative manufacturing process",
    });
  } else if (width !== undefined && depth > width * CAVITY_RULES.recommended_depth_multiplier) {
    violations.push({
      feature_type: "cavity",
      severity: "warning",
      rule: "cavity_depth_exceeds_4x_width",
      message: `Cavity depth ${depth}mm exceeds recommended ${CAVITY_RULES.recommended_depth_multiplier}× width (${width * CAVITY_RULES.recommended_depth_multiplier}mm)`,
      recommendation: "Use longer tools with larger diameter, which affects internal fillet radius",
    });
  }
}

function checkHole(feat: DfMFeature, violations: DfMViolation[]): void {
  const depth = feat.depth_mm;
  const dia = feat.diameter_mm;
  if (depth === undefined || dia === undefined) return;

  const ldRatio = depth / dia;
  if (ldRatio > HOLE_RULES.max_depth_multiplier) {
    violations.push({
      feature_type: "hole",
      severity: "error",
      rule: "hole_exceeds_10xD",
      message: `Hole depth/diameter ratio ${ldRatio.toFixed(1)} exceeds maximum ${HOLE_RULES.max_depth_multiplier}×D`,
      recommendation: "Use deep hole drilling technique (peck, parabolic flute, or gun drill)",
    });
  } else if (ldRatio > HOLE_RULES.recommended_depth_multiplier) {
    violations.push({
      feature_type: "hole",
      severity: "warning",
      rule: "hole_exceeds_4xD",
      message: `Hole depth/diameter ratio ${ldRatio.toFixed(1)} exceeds recommended ${HOLE_RULES.recommended_depth_multiplier}×D`,
      recommendation: "Consider peck drilling cycle for chip evacuation",
    });
  }

  if (feat.standard_drill_size === false) {
    violations.push({
      feature_type: "hole",
      severity: "info",
      rule: "non_standard_drill_size",
      message: `Hole diameter ${dia}mm is not a standard drill size`,
      recommendation: "Non-standard holes are machined with end mill (slower). Use standard drill sizes where possible",
    });
  }
}

function checkThread(feat: DfMFeature, violations: DfMViolation[]): void {
  const nominal = feat.thread_nominal_mm;
  const length = feat.thread_length_mm;

  if (nominal !== undefined) {
    if (nominal < THREAD_RULES.feasible_min_size_mm) {
      violations.push({
        feature_type: "thread",
        severity: "error",
        rule: "thread_below_M2",
        message: `Thread nominal ${nominal}mm is below feasible minimum M${THREAD_RULES.feasible_min_size_mm}`,
        recommendation: `Increase thread size to at least M${THREAD_RULES.feasible_min_size_mm}`,
      });
    } else if (nominal < THREAD_RULES.recommended_min_size_mm) {
      violations.push({
        feature_type: "thread",
        severity: "warning",
        rule: "thread_below_M6",
        message: `Thread nominal ${nominal}mm is below recommended M${THREAD_RULES.recommended_min_size_mm}`,
        recommendation: `Larger threads (M${THREAD_RULES.recommended_min_size_mm}+) are easier to machine and more reliable`,
      });
    }
  }

  if (nominal !== undefined && length !== undefined) {
    if (length > nominal * THREAD_RULES.max_length_multiplier) {
      violations.push({
        feature_type: "thread",
        severity: "warning",
        rule: "thread_engagement_too_long",
        message: `Thread length ${length}mm exceeds ${THREAD_RULES.max_length_multiplier}× nominal diameter (${nominal * THREAD_RULES.max_length_multiplier}mm)`,
        recommendation: "Threads longer than 3× nominal diameter provide diminishing returns on holding strength",
      });
    }
  }
}

function checkUndercut(feat: DfMFeature, violations: DfMViolation[]): void {
  const width = feat.width_mm;
  const depth = feat.depth_mm;

  if (width !== undefined) {
    if (width < UNDERCUT_RULES.width_range_mm[0]) {
      violations.push({
        feature_type: "undercut",
        severity: "error",
        rule: "undercut_too_narrow",
        message: `Undercut width ${width}mm is below minimum ${UNDERCUT_RULES.width_range_mm[0]}mm`,
        recommendation: `Increase to at least ${UNDERCUT_RULES.width_range_mm[0]}mm (1/8") or use standard inch fractions`,
      });
    } else if (width > UNDERCUT_RULES.width_range_mm[1]) {
      violations.push({
        feature_type: "undercut",
        severity: "warning",
        rule: "undercut_too_wide",
        message: `Undercut width ${width}mm exceeds standard tooling range (max ${UNDERCUT_RULES.width_range_mm[1]}mm)`,
        recommendation: "May require custom cutting tool",
      });
    }
  }

  if (width !== undefined && depth !== undefined) {
    if (depth > width * UNDERCUT_RULES.max_depth_multiplier) {
      violations.push({
        feature_type: "undercut",
        severity: "error",
        rule: "undercut_depth_exceeds_2x_width",
        message: `Undercut depth ${depth}mm exceeds ${UNDERCUT_RULES.max_depth_multiplier}× width (${width * UNDERCUT_RULES.max_depth_multiplier}mm)`,
        recommendation: "Standard T-slot cutters have max cutting depth of ~2× width",
      });
    }
  }
}

function checkTallFeature(feat: DfMFeature, violations: DfMViolation[]): void {
  const ratio = feat.aspect_ratio ?? (feat.height_mm && feat.width_mm ? feat.height_mm / feat.width_mm : undefined);
  if (ratio === undefined) return;

  if (ratio > TALL_FEATURE_RULES.max_aspect_ratio) {
    violations.push({
      feature_type: "tall_feature",
      severity: "warning",
      rule: "tall_feature_high_aspect",
      message: `Feature aspect ratio ${ratio.toFixed(1)} exceeds recommended maximum ${TALL_FEATURE_RULES.max_aspect_ratio}`,
      recommendation: "Tall thin features are prone to vibration. Consider rotating the part 90° during machining or adding support",
    });
  }
}

function checkSmallFeature(feat: DfMFeature, violations: DfMViolation[]): void {
  const size = feat.width_mm ?? feat.diameter_mm;
  if (size === undefined) return;

  if (size < SMALL_FEATURE_RULES.feasible_min_mm) {
    violations.push({
      feature_type: "small_feature",
      severity: "error",
      rule: "feature_below_micro_limit",
      message: `Feature size ${size}mm is below feasible minimum ${SMALL_FEATURE_RULES.feasible_min_mm}mm`,
      recommendation: "Consider EDM or laser machining for features below 0.1mm",
    });
  } else if (size < SMALL_FEATURE_RULES.recommended_min_mm) {
    violations.push({
      feature_type: "small_feature",
      severity: "warning",
      rule: "feature_micro_machining",
      message: `Feature size ${size}mm requires micro-machining (below ${SMALL_FEATURE_RULES.recommended_min_mm}mm)`,
      recommendation: "Micro-machining increases cost significantly. Use standard features (≥2.5mm) where possible",
    });
  }
}

function checkFillet(feat: DfMFeature, violations: DfMViolation[]): void {
  const radius = feat.width_mm; // fillet radius stored in width_mm
  const cavityDepth = feat.depth_mm;
  if (radius === undefined || cavityDepth === undefined) return;

  const minFillet = cavityDepth * FILLET_RULES.internal_min_fraction;
  if (radius < minFillet) {
    violations.push({
      feature_type: "fillet",
      severity: "warning",
      rule: "fillet_too_small_for_cavity",
      message: `Internal fillet radius ${radius}mm is less than recommended 1/3 × cavity depth (${minFillet.toFixed(1)}mm)`,
      recommendation: `Increase fillet to at least ${minFillet.toFixed(1)}mm or use a smaller tool (increases machining time)`,
    });
  }
}

// ============================================================================
// FACE MILL SELECTION
// ============================================================================

/** Selects face mill geometry.
 * @param input - input input
 * @returns face mill recommendation
 */
export function selectFaceMillGeometry(input: FaceMillSelectionInput): FaceMillRecommendation {
  const warnings: string[] = [];
  const reasoning: string[] = [];
  let angle: 45 | 90 | "button" = 45;

  // Default: 45° is generally preferred (Sandvik, Kennametal recommendation)
  reasoning.push("45° face mills are preferred for general-purpose face milling (Sandvik/Kennametal)");

  // Thin wall override
  if (input.wall_thickness_mm !== undefined && input.wall_thickness_mm < 5) {
    angle = 90;
    reasoning.length = 0;
    reasoning.push("90° selected: thin wall workpiece — 45° exerts ~2× axial force causing deflection");
    warnings.push(`Wall thickness ${input.wall_thickness_mm}mm is thin — 90° reduces axial force by ~50%`);
  }

  // Interrupted cut with tough material
  if (input.is_interrupted_cut && input.workpiece_material?.match(/inconel|titanium|hastelloy|waspaloy/i)) {
    angle = "button";
    reasoning.length = 0;
    reasoning.push("Button (round insert) cutter selected: strongest geometry for interrupted cuts in tough materials");
  }

  // Priority overrides
  if (input.priority === "finish" && angle !== 90) {
    reasoning.push("For best finish, consider a fly cutter (single insert face mill)");
  }

  if (angle === 45) {
    reasoning.push("45° advantages: balanced axial/radial forces, chip thinning effect → higher feed rates");
    reasoning.push("45° provides ~40% higher MRR than 90° equivalent");
  }

  if (input.is_interrupted_cut && angle !== "button") {
    warnings.push("Interrupted cut detected: reduce feed rate up to 50%");
  }

  return {
    recommended_angle: angle,
    reasoning,
    mrr_advantage_pct: angle === 45 ? 40 : 0,
    warnings,
  };
}

// ============================================================================
// DEEP HOLE TECHNIQUE SELECTION
// ============================================================================

/** Selects deep hole technique.
 * @param input - input input
 * @returns deep hole technique
 */
export function selectDeepHoleTechnique(input: DeepHoleInput): DeepHoleTechnique {
  const ldRatio = input.hole_depth_mm / input.hole_diameter_mm;
  const notes: string[] = [];

  let selected = DEEP_HOLE_THRESHOLDS[0];
  for (const threshold of DEEP_HOLE_THRESHOLDS) {
    if (ldRatio <= threshold.max_ld) {
      selected = threshold;
      break;
    }
  }
  // If beyond all thresholds, use gun drill
  if (ldRatio > 400) {
    notes.push("L/D ratio exceeds gun drill limit (~400×D) — consult deep hole drilling specialist");
  }

  if (selected.peck && !input.has_through_coolant) {
    notes.push("Through-spindle coolant strongly recommended for L/D > 5 — improves chip evacuation significantly");
  }

  if (ldRatio > 7 && ldRatio <= 20) {
    notes.push("Custom deep hole cycle recommended: progressive peck depth with feed/speed reduction as depth increases");
  }

  if (input.material?.match(/stainless|inconel|titanium/i) && ldRatio > 3) {
    notes.push("Work-hardening material: maintain recommended chip load to avoid rubbing — never reduce feed below 0.004\" per tooth");
  }

  return {
    ld_ratio: Math.round(ldRatio * 10) / 10,
    technique: selected.technique,
    peck_required: selected.peck,
    parabolic_flute: selected.parabolic,
    gun_drill: selected.gun,
    feed_reduction_pct: selected.feed_reduce,
    notes,
  };
}

// ============================================================================
// CNC MACHINE COST ESTIMATION
// ============================================================================

/** Machine Cost Estimate configuration/data structure.
 */
export interface MachineCostEstimate {
  machine_type: string;
  cost_per_hour_usd: number;
  relative_to_3axis: string;
}

const MACHINE_COSTS: Record<string, { usd: number; relative: string }> = {
  "3axis_mill":          { usd: 75,  relative: "baseline" },
  "lathe":               { usd: 65,  relative: "-15%" },
  "5axis_indexed":       { usd: 120, relative: "+60%" },
  "5axis_continuous":    { usd: 150, relative: "+100%" },
  "mill_turn":           { usd: 95,  relative: "+25%" },
};

/** Estimates machine cost.
 * @param machine_type - machine_type string
 * @returns machine cost estimate
 */
export function estimateMachineCost(machine_type: string): MachineCostEstimate {
  const entry = MACHINE_COSTS[machine_type] ?? MACHINE_COSTS["3axis_mill"];
  return {
    machine_type,
    cost_per_hour_usd: entry.usd,
    relative_to_3axis: entry.relative,
  };
}
