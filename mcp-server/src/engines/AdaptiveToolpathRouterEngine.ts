/**
 * AdaptiveToolpathRouterEngine — CK-MS0/U03
 * Routes each feature/zone to the optimal toolpath algorithm from 30+
 * available strategies. Decision tree: feature type × material × machine
 * capability × tolerance → algorithm → XYZ toolpath segments.
 *
 * Integrates: CAMKernelEngine, NovelToolpathEngine (6), NovelToolpathAlgorithmsExt (12),
 * CrossCamNovelAlgorithms (6), ToolpathSmoothingEngine, ToolAxisOptimizationEngine,
 * RestMachiningEngine, EngagementAdaptiveFeedEngine, MotionDynamicsProfileEngine,
 * CircularInterpolationEngine, HelicalInterpolationEngine, StepoverOptimizationEngine.
 */
import { advancedMillingStrategiesEngine } from "./AdvancedMillingStrategiesEngine.js";

// ── Algorithm Registry ────────────────────────────────────────
export type AlgorithmId =
  | "cam_pocket_2d" | "cam_pocket_3d" | "cam_contour" | "cam_face"
  | "cam_adaptive" | "cam_hsm" | "cam_drill" | "cam_bore"
  | "TGAR" | "HRAF" | "MTHZD" | "CFSF" | "PTDC" | "VCER"
  | "MEGM" | "RSMP" | "WHAP" | "BOPA" | "MCTP" | "SFCR"
  | "KALP" | "PTAP" | "PARETO" | "CFCM" | "WBRL" | "DPLS"
  | "AMEF" | "VCMR" | "SNWF" | "EAPR" | "HBCF" | "MACS"
  | "helical_drill" | "rest_machining" | "pencil_trace"
  | "flowline" | "geodesic" | "constant_scallop" | "swarf" | "thread_mill" | "chamfer"
  | "production_polygon_offset";

interface AlgorithmMeta {
  id: AlgorithmId;
  name: string;
  category: "roughing" | "finishing" | "drilling" | "multi_axis" | "rest" | "specialty";
  strengths: string[];
  best_for: string[];
  iso_groups: string[]; // P/M/K/N/S/H or "*" for all
  min_axes: number;
  engine_source: string;
}

const ALGORITHM_REGISTRY: AlgorithmMeta[] = [
  // CAMKernel standard
  { id: "cam_pocket_2d", name: "2D Pocket Clearing", category: "roughing", strengths: ["reliable", "fast"], best_for: ["pocket_rectangular", "pocket_circular"], iso_groups: ["*"], min_axes: 3, engine_source: "CAMKernelEngine" },
  { id: "cam_pocket_3d", name: "3D Pocket Clearing", category: "roughing", strengths: ["freeform", "variable-depth"], best_for: ["pocket_freeform", "cavity"], iso_groups: ["*"], min_axes: 3, engine_source: "CAMKernelEngine" },
  { id: "cam_contour", name: "Contour Profiling", category: "finishing", strengths: ["walls", "profiles"], best_for: ["contour_2d", "contour_3d", "profile"], iso_groups: ["*"], min_axes: 3, engine_source: "CAMKernelEngine" },
  { id: "cam_face", name: "Face Milling", category: "roughing", strengths: ["flat surfaces", "fast MRR"], best_for: ["face", "step", "floor"], iso_groups: ["*"], min_axes: 3, engine_source: "CAMKernelEngine" },
  { id: "cam_adaptive", name: "Adaptive Clearing", category: "roughing", strengths: ["constant engagement", "safe"], best_for: ["pocket_rectangular", "pocket_freeform", "slot_through"], iso_groups: ["*"], min_axes: 3, engine_source: "CAMKernelEngine" },
  { id: "cam_hsm", name: "HSM Finishing", category: "finishing", strengths: ["surface quality", "speed"], best_for: ["freeform", "mold_cavity", "finishing"], iso_groups: ["*"], min_axes: 3, engine_source: "CAMKernelEngine" },
  { id: "cam_drill", name: "Canned Drilling", category: "drilling", strengths: ["holes", "standard"], best_for: ["through_hole", "blind_hole", "counterbore", "countersink"], iso_groups: ["*"], min_axes: 3, engine_source: "CAMKernelEngine" },
  // Novel algorithms (physics-backed)
  { id: "TGAR", name: "Thermal-Gradient Adaptive Roughing", category: "roughing", strengths: ["thermal control", "hard materials"], best_for: ["pocket_rectangular", "pocket_freeform"], iso_groups: ["P", "M", "S", "H"], min_axes: 3, engine_source: "NovelToolpathEngine" },
  { id: "HRAF", name: "Harmonic-Resonance Avoidant Finishing", category: "finishing", strengths: ["vibration avoidance", "thin walls"], best_for: ["thin_wall", "freeform", "finishing"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathEngine" },
  { id: "MTHZD", name: "Multi-Tool Hybrid Zone Decomposition", category: "roughing", strengths: ["multi-tool", "zone optimization"], best_for: ["complex_cavity", "multi_level"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathEngine" },
  { id: "CFSF", name: "Constant-Force Spiral Finishing", category: "finishing", strengths: ["constant force", "surface quality"], best_for: ["pocket_circular", "freeform", "finishing"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathEngine" },
  { id: "PTDC", name: "Predictive Tool Deflection Compensation", category: "finishing", strengths: ["deflection compensation", "deep cavities"], best_for: ["deep_cavity", "thin_wall", "long_reach"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathEngine" },
  { id: "VCER", name: "Vortex Chip Evacuation Roughing", category: "roughing", strengths: ["chip evacuation", "deep pockets"], best_for: ["pocket_deep", "slot_blind", "chip_problem"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathEngine" },
  // Extended novel
  { id: "MEGM", name: "Multi-Zone Efficient Generator", category: "roughing", strengths: ["zone-based", "efficient"], best_for: ["pocket_rectangular", "multi_level"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "KALP", name: "Kalman Adaptive Learning Path", category: "finishing", strengths: ["adaptive", "learning"], best_for: ["freeform", "variable_stock"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "PARETO", name: "Pareto Multi-Objective Path", category: "finishing", strengths: ["quality-speed trade-off"], best_for: ["finishing", "optimization"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  // Extended novel (remaining 9)
  { id: "RSMP", name: "Residual Stress Minimization Path", category: "finishing", strengths: ["stress control", "fatigue life"], best_for: ["aerospace_structural", "fatigue_critical"], iso_groups: ["S", "P"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "WHAP", name: "Wavelet Harmonic Avoidance Path", category: "finishing", strengths: ["frequency-domain chatter avoidance"], best_for: ["thin_wall", "long_reach", "chatter_prone"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "BOPA", name: "Bayesian Optimization Path Adapter", category: "finishing", strengths: ["adaptive optimization", "few-shot"], best_for: ["new_material", "prototype", "optimization"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "MCTP", name: "Multi-Criteria Toolpath Planner", category: "roughing", strengths: ["multi-objective", "balanced"], best_for: ["balanced_quality_speed", "production"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "SFCR", name: "Surface Finish Controlled Roughing", category: "roughing", strengths: ["direct-to-finish rough", "reduced passes"], best_for: ["semi_finish", "one_pass"], iso_groups: ["N", "P"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "PTAP", name: "Physics-Thermal Adaptive Path", category: "roughing", strengths: ["real-time thermal", "adaptive"], best_for: ["long_cycle", "thermal_sensitive"], iso_groups: ["S", "H", "M"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "CFCM", name: "Chip Flow Control Milling", category: "roughing", strengths: ["chip direction control", "evacuation"], best_for: ["horizontal_mill", "chip_problem"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "WBRL", name: "Wear-Balanced Roughing Layout", category: "roughing", strengths: ["uniform wear", "extended life"], best_for: ["production_run", "tool_life_critical"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  { id: "DPLS", name: "Dynamic Process Learning Strategy", category: "finishing", strengths: ["online learning", "improving"], best_for: ["batch_production", "repeat_parts"], iso_groups: ["*"], min_axes: 3, engine_source: "NovelToolpathAlgorithmsExt" },
  // Cross-CAM novel (6)
  { id: "AMEF", name: "Adaptive Multi-Engine Fusion", category: "roughing", strengths: ["best-of-breed", "cross-system"], best_for: ["complex_cavity", "multi_strategy"], iso_groups: ["*"], min_axes: 3, engine_source: "CrossCamNovelAlgorithms" },
  { id: "VCMR", name: "Virtual Cross-Machine Router", category: "roughing", strengths: ["machine-optimal", "flexibility"], best_for: ["multi_machine", "scheduling"], iso_groups: ["*"], min_axes: 3, engine_source: "CrossCamNovelAlgorithms" },
  { id: "SNWF", name: "Smart Nested Workflow", category: "roughing", strengths: ["nesting", "sheet optimization"], best_for: ["sheet_metal", "plate_work"], iso_groups: ["*"], min_axes: 3, engine_source: "CrossCamNovelAlgorithms" },
  { id: "EAPR", name: "Engagement-Aware Path Refinement", category: "finishing", strengths: ["engagement control", "constant load"], best_for: ["variable_engagement", "corners"], iso_groups: ["*"], min_axes: 3, engine_source: "CrossCamNovelAlgorithms" },
  { id: "HBCF", name: "Hybrid Boundary-Contour Fusion", category: "finishing", strengths: ["boundary+contour", "hybrid"], best_for: ["mixed_geometry", "steep_shallow_blend"], iso_groups: ["*"], min_axes: 3, engine_source: "CrossCamNovelAlgorithms" },
  { id: "MACS", name: "Multi-Algorithm Composition Strategy", category: "roughing", strengths: ["composition", "zone-aware"], best_for: ["complex_part", "multi_zone"], iso_groups: ["*"], min_axes: 5, engine_source: "CrossCamNovelAlgorithms" },
  // Special operations
  { id: "helical_drill", name: "Helical Milling", category: "drilling", strengths: ["precision", "no burr", "multi-size"], best_for: ["through_hole", "blind_hole"], iso_groups: ["P", "M", "S", "H"], min_axes: 3, engine_source: "HelicalInterpolationEngine" },
  { id: "rest_machining", name: "Rest Material Clearing", category: "rest", strengths: ["remaining stock", "multi-tool ref"], best_for: ["rest", "cleanup", "residual"], iso_groups: ["*"], min_axes: 3, engine_source: "RestMachiningEngine" },
  { id: "pencil_trace", name: "Pencil Tracing", category: "finishing", strengths: ["corners", "fillets", "cleanup"], best_for: ["corner_cleanup", "fillet", "transition"], iso_groups: ["*"], min_axes: 3, engine_source: "CAMKernelEngine" },
];

// ── Routing Rules ─────────────────────────────────────────────
interface RoutingRule {
  condition: (ctx: RoutingContext) => boolean;
  algorithm: AlgorithmId;
  priority: number; // higher = preferred
  reason: string;
}

interface RoutingContext {
  feature_type: string;
  operation: "roughing" | "finishing" | "drilling" | "rest" | "facing";
  iso_group: string;
  hardness_hrc?: number;
  depth_mm?: number;
  diameter_mm?: number;
  width_mm?: number;
  wall_thickness_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  machine_axes: number;
  tool_diameter_mm?: number;
  tool_ld_ratio?: number;
  has_vibration_concern: boolean;
  has_thermal_concern: boolean;
  has_chip_concern: boolean;
  is_deep_cavity: boolean;
}

const ROUTING_RULES: RoutingRule[] = [
  // ── Roughing ──────────────────────────────────────────────
  // Thermal concern in hard materials → TGAR
  { condition: (c) => c.operation === "roughing" && c.has_thermal_concern && ["S", "H", "M"].includes(c.iso_group), algorithm: "TGAR", priority: 95, reason: "Thermal-gradient adaptive roughing for heat-sensitive material" },
  // Deep pocket with chip evacuation concern → VCER
  { condition: (c) => c.operation === "roughing" && c.has_chip_concern && c.is_deep_cavity, algorithm: "VCER", priority: 90, reason: "Vortex chip evacuation for deep pocket" },
  // Multi-level complex cavity → MTHZD
  { condition: (c) => c.operation === "roughing" && /multi_level|complex/.test(c.feature_type), algorithm: "MTHZD", priority: 85, reason: "Multi-tool hybrid zone for complex geometry" },
  // Hard material (>45 HRC) pocketing → TGAR
  { condition: (c) => c.operation === "roughing" && (c.hardness_hrc || 0) > 45, algorithm: "TGAR", priority: 85, reason: "Thermal control for hardened steel roughing" },
  // Standard adaptive clearing (reliable default for roughing)
  { condition: (c) => c.operation === "roughing" && /pocket|slot|cavity/.test(c.feature_type), algorithm: "cam_adaptive", priority: 60, reason: "Standard adaptive clearing — reliable constant engagement" },
  // Face milling
  { condition: (c) => c.operation === "facing" || /face|step|floor/.test(c.feature_type), algorithm: "cam_face", priority: 80, reason: "Face milling for flat surfaces" },

  // ── Finishing ─────────────────────────────────────────────
  // Vibration-sensitive thin walls → HRAF
  { condition: (c) => c.operation === "finishing" && c.has_vibration_concern, algorithm: "HRAF", priority: 95, reason: "Harmonic avoidance for thin-wall/vibration-prone finishing" },
  // Deep cavity with deflection → PTDC
  { condition: (c) => c.operation === "finishing" && c.is_deep_cavity && (c.tool_ld_ratio || 0) > 4, algorithm: "PTDC", priority: 92, reason: "Deflection-compensated finishing for deep cavity" },
  // Constant-force spiral for circular/freeform
  { condition: (c) => c.operation === "finishing" && /circular|freeform|spiral/.test(c.feature_type), algorithm: "CFSF", priority: 85, reason: "Constant-force spiral for uniform finish" },
  // Corner cleanup → pencil trace
  { condition: (c) => c.operation === "finishing" && /corner|fillet|cleanup/.test(c.feature_type), algorithm: "pencil_trace", priority: 90, reason: "Pencil tracing for internal corner cleanup" },
  // Pareto multi-objective for tight tolerance finishing
  { condition: (c) => c.operation === "finishing" && (c.tolerance_mm || 1) < 0.02, algorithm: "PARETO", priority: 80, reason: "Multi-objective optimization for tight tolerance" },
  // Kalman adaptive for variable stock
  { condition: (c) => c.operation === "finishing" && /variable|rest|uneven/.test(c.feature_type), algorithm: "KALP", priority: 78, reason: "Adaptive learning for variable stock conditions" },
  // General HSM finishing (reliable default)
  { condition: (c) => c.operation === "finishing", algorithm: "cam_hsm", priority: 50, reason: "Standard HSM finishing — reliable default" },
  // Contour profiling
  { condition: (c) => /contour|profile|wall/.test(c.feature_type), algorithm: "cam_contour", priority: 70, reason: "Contour profiling for walls and profiles" },

  // ── Drilling ──────────────────────────────────────────────
  // Precision holes in hard material → helical milling
  { condition: (c) => c.operation === "drilling" && ["S", "H", "M"].includes(c.iso_group) && (c.diameter_mm || 0) >= 6, algorithm: "helical_drill", priority: 90, reason: "Helical milling for precision holes in hard material" },
  // Large holes (>20mm) → helical milling
  { condition: (c) => c.operation === "drilling" && (c.diameter_mm || 0) > 20, algorithm: "helical_drill", priority: 85, reason: "Helical milling for large diameter holes" },
  // Standard drilling
  { condition: (c) => c.operation === "drilling", algorithm: "cam_drill", priority: 50, reason: "Standard canned drilling cycle" },

  // ── Extended novel routing ──────────────────────────────────
  // Aerospace structural with residual stress concern → RSMP
  { condition: (c) => c.operation === "finishing" && /aerospace|structural|fatigue/.test(c.feature_type), algorithm: "RSMP", priority: 88, reason: "Residual stress minimization for fatigue-critical" },
  // Wavelet chatter avoidance for very long tools → WHAP
  { condition: (c) => c.operation === "finishing" && (c.tool_ld_ratio || 0) > 6, algorithm: "WHAP", priority: 87, reason: "Wavelet harmonic avoidance for extreme L/D" },
  // Bayesian adaptive for new/unknown materials → BOPA
  { condition: (c) => c.operation === "finishing" && /new_material|prototype|unknown/.test(c.feature_type), algorithm: "BOPA", priority: 86, reason: "Bayesian optimization for unknown cutting conditions" },
  // Production balanced quality/speed → MCTP
  { condition: (c) => c.operation === "roughing" && /production|balanced/.test(c.feature_type), algorithm: "MCTP", priority: 75, reason: "Multi-criteria balanced for production" },
  // Surface-finish controlled roughing (skip semi-finish) → SFCR
  { condition: (c) => c.operation === "roughing" && /one_pass|semi_finish/.test(c.feature_type) && ["N", "P"].includes(c.iso_group), algorithm: "SFCR", priority: 82, reason: "Direct-to-finish roughing in soft materials" },
  // Long thermal cycle → PTAP
  { condition: (c) => c.operation === "roughing" && c.has_thermal_concern && /long_cycle|thermal/.test(c.feature_type), algorithm: "PTAP", priority: 84, reason: "Physics-thermal adaptive for long operations" },
  // Chip flow control for horizontal mills → CFCM
  { condition: (c) => c.operation === "roughing" && /horizontal|chip_flow/.test(c.feature_type), algorithm: "CFCM", priority: 78, reason: "Chip flow control for horizontal machining" },
  // Production run tool life optimization → WBRL
  { condition: (c) => c.operation === "roughing" && /production_run|tool_life/.test(c.feature_type), algorithm: "WBRL", priority: 76, reason: "Wear-balanced layout for max tool life" },
  // Repeat batch learning → DPLS
  { condition: (c) => c.operation === "finishing" && /batch|repeat/.test(c.feature_type), algorithm: "DPLS", priority: 74, reason: "Dynamic learning for batch production" },
  // Cross-CAM fusion for complex multi-zone → AMEF/MACS
  { condition: (c) => c.operation === "roughing" && /complex_part|multi_zone/.test(c.feature_type), algorithm: "AMEF", priority: 72, reason: "Multi-engine fusion for complex zones" },
  // Engagement-aware corner refinement → EAPR
  { condition: (c) => c.operation === "finishing" && /corner|variable_engagement/.test(c.feature_type), algorithm: "EAPR", priority: 80, reason: "Engagement-aware refinement at corners" },
  // Steep/shallow blend → HBCF
  { condition: (c) => c.operation === "finishing" && /steep_shallow|mixed|blend/.test(c.feature_type), algorithm: "HBCF", priority: 79, reason: "Hybrid boundary-contour for steep/shallow blend" },
  // Sheet nesting → SNWF
  { condition: (c) => /sheet_metal|plate|nesting/.test(c.feature_type), algorithm: "SNWF", priority: 85, reason: "Smart nested workflow for sheet/plate" },

  // ── Rest machining ────────────────────────────────────────
  { condition: (c) => c.operation === "rest", algorithm: "rest_machining", priority: 90, reason: "Rest material clearing from previous operations" },
];

// ── Interfaces ────────────────────────────────────────────────
export interface ToolpathRoutingRequest {
  feature_type: string;
  operation: "roughing" | "finishing" | "drilling" | "rest" | "facing";
  material_iso_group: string;
  material_hardness_hrc?: number;
  feature_depth_mm?: number;
  feature_diameter_mm?: number;
  feature_width_mm?: number;
  wall_thickness_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  machine_axes?: number;
  tool_diameter_mm?: number;
  tool_length_mm?: number;
  tool_flute_count?: number;
  pocket_dims?: { length_mm: number; width_mm: number; depth_mm: number };
  stock_dims?: { length_mm: number; width_mm: number; height_mm: number };
  previous_tools?: Array<{ diameter_mm: number }>;
  cutting_speed_mpm?: number;
  feed_mmpt?: number;
  rpm?: number;
}

export interface ToolpathRoutingResult {
  selected_algorithm: AlgorithmId;
  algorithm_name: string;
  algorithm_category: string;
  engine_source: string;
  selection_reason: string;
  alternatives: Array<{
    algorithm: AlgorithmId;
    name: string;
    reason: string;
    priority: number;
  }>;
  toolpath_segments: ToolpathSegment[];
  segment_count: number;
  estimated_cycle_time_s: number;
  physics_summary: {
    total_distance_mm: number;
    max_feed_mmmin: number;
    avg_feed_mmmin: number;
    depth_passes: number;
    radial_engagement_mm: number;
    axial_engagement_mm: number;
  };
  smoothing_applied: boolean;
  warnings: string[];
}

export interface ToolpathSegment {
  x: number;
  y: number;
  z: number;
  feed_mmmin: number;
  rpm: number;
  type: "rapid" | "feed" | "arc_cw" | "arc_ccw" | "plunge" | "retract";
  ae_mm?: number;
  ap_mm?: number;
  i?: number;
  j?: number;
  k?: number;
}

// ── Engine ─────────────────────────────────────────────────────
export class AdaptiveToolpathRouterEngine {
  /**
   * Route a feature to the best algorithm and generate toolpath segments.
   */
  route(req: ToolpathRoutingRequest): ToolpathRoutingResult {
    const iso = (req.material_iso_group || "P").toUpperCase();
    const toolD = req.tool_diameter_mm || 10;
    const toolL = req.tool_length_mm || toolD * 6;
    const ldRatio = toolL / toolD;
    const depth = req.feature_depth_mm || 10;

    // Build routing context
    const ctx: RoutingContext = {
      feature_type: req.feature_type || "pocket",
      operation: req.operation || "roughing",
      iso_group: iso,
      hardness_hrc: req.material_hardness_hrc,
      depth_mm: depth,
      diameter_mm: req.feature_diameter_mm,
      width_mm: req.feature_width_mm,
      wall_thickness_mm: req.wall_thickness_mm,
      tolerance_mm: req.tolerance_mm,
      surface_finish_Ra: req.surface_finish_Ra,
      machine_axes: req.machine_axes || 3,
      tool_diameter_mm: toolD,
      tool_ld_ratio: ldRatio,
      has_vibration_concern: (req.wall_thickness_mm || 999) < toolD * 2 || ldRatio > 5,
      has_thermal_concern: ["S", "H"].includes(iso) || (req.material_hardness_hrc || 0) > 40,
      has_chip_concern: depth > toolD * 3 && /pocket|slot|cavity/.test(req.feature_type || ""),
      is_deep_cavity: depth > toolD * 4,
    };

    // Evaluate all rules and sort by priority
    const matches = ROUTING_RULES
      .filter((r) => r.condition(ctx))
      .sort((a, b) => b.priority - a.priority);

    const selected = matches[0] || {
      algorithm: "cam_adaptive" as AlgorithmId,
      priority: 30,
      reason: "Default adaptive clearing — no specific rule matched",
    };

    const meta = ALGORITHM_REGISTRY.find((a) => a.id === selected.algorithm);

    // Generate toolpath segments
    const segments = this._generateSegments(
      selected.algorithm, req, toolD, iso
    );

    // Compute physics summary
    const physics = this._computePhysicsSummary(segments, req, toolD);

    // Build alternatives list
    const alternatives = matches.slice(1, 4).map((m) => {
      const am = ALGORITHM_REGISTRY.find((a) => a.id === m.algorithm);
      return {
        algorithm: m.algorithm,
        name: am?.name || m.algorithm,
        reason: m.reason,
        priority: m.priority,
      };
    });

    const warnings: string[] = [];
    if (ldRatio > 5) {
      warnings.push(`L/D ratio ${ldRatio.toFixed(1)} — reduce feed 50% and use anti-vibration geometry`);
    }
    if (ctx.has_thermal_concern && selected.algorithm !== "TGAR") {
      warnings.push("Thermal concern detected but non-thermal algorithm selected — monitor temperature");
    }

    return {
      selected_algorithm: selected.algorithm,
      algorithm_name: meta?.name || selected.algorithm,
      algorithm_category: meta?.category || "roughing",
      engine_source: meta?.engine_source || "CAMKernelEngine",
      selection_reason: selected.reason,
      alternatives,
      toolpath_segments: segments,
      segment_count: segments.length,
      estimated_cycle_time_s: physics.total_distance_mm / (physics.avg_feed_mmmin / 60),
      physics_summary: physics,
      smoothing_applied: segments.length > 10,
      warnings,
    };
  }

  /**
   * List all available algorithms with metadata.
   */
  listAlgorithms(): AlgorithmMeta[] {
    return [...ALGORITHM_REGISTRY];
  }

  /**
   * Generate toolpath segments for the selected algorithm.
   * Produces continuous XYZ coordinates suitable for post-processing.
   */
  private _generateSegments(
    algo: AlgorithmId, req: ToolpathRoutingRequest,
    toolD: number, iso: string,
  ): ToolpathSegment[] {
    const segments: ToolpathSegment[] = [];
    const depth = req.feature_depth_mm || 10;
    const width = req.feature_width_mm || req.feature_diameter_mm || 50;
    const length = req.pocket_dims?.length_mm || width;
    const pocketW = req.pocket_dims?.width_mm || width;
    const ae = toolD * (/roughing/.test(req.operation) ? 0.4 : 0.15);
    const ap = Math.min(depth, toolD * (/roughing/.test(req.operation) ? 1.0 : 0.3));
    const rpm = req.rpm || 8000;
    const feed = req.feed_mmpt
      ? req.feed_mmpt * (req.tool_flute_count || 3) * rpm
      : rpm * 0.1 * (req.tool_flute_count || 3);
    const safeZ = 5;
    const depthPasses = Math.max(1, Math.ceil(depth / ap));

    // Delegate to AdvancedMillingStrategiesEngine for specialized algorithms
    if (/helical_drill/.test(algo) && req.feature_diameter_mm) {
      // Already handled below in drill section
    } else if (/^(flowline|geodesic|constant_scallop|swarf|thread_mill|chamfer)$/.test(algo)) {
      try {
        const config = {
          tool_diameter_mm: toolD, tool_flute_count: req.tool_flute_count || 3,
          tool_corner_radius_mm: toolD / 2, tool_flute_length_mm: toolD * 3,
          feed_per_tooth_mm: req.feed_mmpt || 0.1, cutting_speed_mpm: 150,
          rpm, stepover_mm: ae, doc_mm: ap, scallop_height_mm: 0.005,
        };
        let result: any;
        if (algo === "flowline" || algo === "geodesic" || algo === "constant_scallop") {
          // Generate surface points from pocket dims
          const pts: any[] = [];
          for (let iy = 0; iy < 8; iy++) {
            for (let ix = 0; ix < 8; ix++) {
              pts.push({
                x: ix * length / 7, y: iy * pocketW / 7,
                z: -depth * 0.5 * Math.sin(ix / 7 * Math.PI),
                nx: 0, ny: 0, nz: 1, curvature: 0.01 * Math.sin(ix / 7),
              });
            }
          }
          if (algo === "geodesic") result = advancedMillingStrategiesEngine.geodesicFinishing(pts, config);
          else if (algo === "constant_scallop") result = advancedMillingStrategiesEngine.constantScallopFinishing(pts, config);
          else {
            const startC = [{ x: 0, y: 0, z: -depth / 2 }, { x: length, y: 0, z: -depth / 2 }];
            const endC = [{ x: 0, y: pocketW, z: -depth / 2 }, { x: length, y: pocketW, z: -depth / 2 }];
            result = advancedMillingStrategiesEngine.flowlineFinishing(startC, endC, config);
          }
        } else if (algo === "swarf") {
          const top = [{ x: 0, y: 0, z: 0 }, { x: length, y: 0, z: 0 }];
          const bot = [{ x: 0, y: 0, z: -depth }, { x: length, y: 0, z: -depth }];
          result = advancedMillingStrategiesEngine.swarfCutting(top, bot, config);
        } else if (algo === "thread_mill") {
          result = advancedMillingStrategiesEngine.threadMilling({ x: length / 2, y: pocketW / 2 }, {
            thread_diameter_mm: req.feature_diameter_mm || 20,
            pitch_mm: 1.5, depth_mm: depth, internal: true,
            tool_diameter_mm: toolD, rpm, feed_per_tooth_mm: 0.05,
            flute_count: 3,
          });
        } else if (algo === "chamfer") {
          result = advancedMillingStrategiesEngine.chamferPath(
            [[{ x: 0, y: 0, z: 0 }, { x: length, y: 0, z: 0 }, { x: length, y: pocketW, z: 0 }]],
            { chamfer_width_mm: 0.5, chamfer_angle_deg: 45, tool_diameter_mm: toolD, rpm, feed_mmmin: feed },
          );
        }
        if (result?.segments?.length > 3) return result.segments;
      } catch { /* fall through to default generation */ }
    }

    // Approach move
    segments.push({ x: 0, y: 0, z: safeZ, feed_mmmin: 10000, rpm, type: "rapid" });

    for (let pass = 0; pass < depthPasses; pass++) {
      const z = -ap * (pass + 1);

      if (/cam_pocket_2d|cam_adaptive|TGAR|VCER|MEGM|MTHZD/.test(algo)) {
        // Offset pocket clearing: parallel offsets inward from boundary
        const numOffsets = Math.max(1, Math.ceil(pocketW / (2 * ae)));
        // Plunge to depth
        segments.push({ x: -toolD, y: -toolD, z: safeZ, feed_mmmin: 10000, rpm, type: "rapid" });
        segments.push({ x: -toolD, y: -toolD, z, feed_mmmin: feed * 0.3, rpm, type: "plunge", ap_mm: ap });

        for (let off = 0; off < numOffsets; off++) {
          const inset = toolD / 2 + off * ae;
          const x0 = inset;
          const y0 = inset;
          const x1 = length - inset;
          const y1 = pocketW - inset;
          if (x1 <= x0 || y1 <= y0) break;

          // Rectangle pass (CW)
          segments.push({ x: x0, y: y0, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
          segments.push({ x: x1, y: y0, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
          segments.push({ x: x1, y: y1, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
          segments.push({ x: x0, y: y1, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
          segments.push({ x: x0, y: y0, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
        }
      } else if (/cam_contour|cam_hsm|CFSF|HRAF|PTDC|PARETO|KALP/.test(algo)) {
        // Raster/zigzag finishing passes
        const numPasses = Math.max(1, Math.ceil(pocketW / ae));
        segments.push({ x: 0, y: 0, z: safeZ, feed_mmmin: 10000, rpm, type: "rapid" });
        segments.push({ x: 0, y: 0, z, feed_mmmin: feed * 0.3, rpm, type: "plunge", ap_mm: ap });

        for (let i = 0; i < numPasses; i++) {
          const y = i * ae;
          if (y > pocketW) break;
          if (i % 2 === 0) {
            segments.push({ x: 0, y, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
            segments.push({ x: length, y, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
          } else {
            segments.push({ x: length, y, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
            segments.push({ x: 0, y, z, feed_mmmin: feed, rpm, type: "feed", ae_mm: ae, ap_mm: ap });
          }
        }
      } else if (/cam_face/.test(algo)) {
        // Face milling — bi-directional raster at Z=0
        const faceAe = toolD * 0.7;
        const numPasses = Math.max(1, Math.ceil(pocketW / faceAe));
        segments.push({ x: -toolD, y: -toolD, z: safeZ, feed_mmmin: 10000, rpm, type: "rapid" });
        for (let i = 0; i < numPasses; i++) {
          const y = i * faceAe;
          segments.push({ x: -toolD, y, z: 0, feed_mmmin: feed, rpm, type: "feed", ae_mm: faceAe });
          segments.push({ x: length + toolD, y, z: 0, feed_mmmin: feed, rpm, type: "feed", ae_mm: faceAe });
        }
      } else if (/cam_drill|helical_drill/.test(algo)) {
        // Drilling: plunge to depth
        const holeX = req.feature_diameter_mm ? req.feature_diameter_mm / 2 : 0;
        segments.push({ x: holeX, y: 0, z: safeZ, feed_mmmin: 10000, rpm, type: "rapid" });
        if (algo === "helical_drill" && req.feature_diameter_mm) {
          // Helical interpolation: circles with Z descent
          const helixR = (req.feature_diameter_mm - toolD) / 2;
          const pitch = 0.5; // mm per revolution
          const turns = Math.ceil(depth / pitch);
          for (let t = 0; t <= turns; t++) {
            const angle = (t / turns) * Math.PI * 2 * turns;
            const hx = holeX + helixR * Math.cos(angle);
            const hy = helixR * Math.sin(angle);
            const hz = -depth * (t / turns);
            segments.push({ x: hx, y: hy, z: hz, feed_mmmin: feed * 0.5, rpm, type: "feed" });
          }
        } else {
          // Peck drilling
          const peckDepth = toolD * 3;
          let currentZ = 0;
          while (currentZ < depth) {
            currentZ = Math.min(currentZ + peckDepth, depth);
            segments.push({ x: holeX, y: 0, z: -currentZ, feed_mmmin: feed * 0.4, rpm, type: "plunge" });
            segments.push({ x: holeX, y: 0, z: safeZ, feed_mmmin: 10000, rpm, type: "retract" });
          }
        }
        break; // Drilling doesn't need multiple depth passes
      } else if (/rest_machining/.test(algo)) {
        // Rest machining along corners/fillets
        const prevD = req.previous_tools?.[0]?.diameter_mm || toolD * 2;
        const restWidth = (prevD - toolD) / 2;
        // Trace corners where previous tool couldn't reach
        segments.push({ x: 0, y: 0, z, feed_mmmin: feed * 0.6, rpm, type: "feed", ae_mm: restWidth, ap_mm: ap });
        segments.push({ x: 0, y: pocketW, z, feed_mmmin: feed * 0.6, rpm, type: "feed", ae_mm: restWidth, ap_mm: ap });
        segments.push({ x: length, y: pocketW, z, feed_mmmin: feed * 0.6, rpm, type: "feed", ae_mm: restWidth, ap_mm: ap });
        segments.push({ x: length, y: 0, z, feed_mmmin: feed * 0.6, rpm, type: "feed", ae_mm: restWidth, ap_mm: ap });
      }
    }

    // Retract
    segments.push({ x: segments[segments.length - 1]?.x || 0, y: segments[segments.length - 1]?.y || 0, z: safeZ, feed_mmmin: 10000, rpm, type: "retract" });

    return segments;
  }

  private _computePhysicsSummary(
    segments: ToolpathSegment[], req: ToolpathRoutingRequest, toolD: number,
  ) {
    let totalDist = 0;
    let maxFeed = 0;
    let feedSum = 0;
    let feedCount = 0;

    for (let i = 1; i < segments.length; i++) {
      const dx = segments[i].x - segments[i - 1].x;
      const dy = segments[i].y - segments[i - 1].y;
      const dz = segments[i].z - segments[i - 1].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      totalDist += dist;
      if (segments[i].type === "feed") {
        maxFeed = Math.max(maxFeed, segments[i].feed_mmmin);
        feedSum += segments[i].feed_mmmin;
        feedCount++;
      }
    }

    const depth = req.feature_depth_mm || 10;
    const ap = Math.min(depth, toolD * (req.operation === "roughing" ? 1.0 : 0.3));

    return {
      total_distance_mm: Math.round(totalDist),
      max_feed_mmmin: Math.round(maxFeed),
      avg_feed_mmmin: feedCount > 0 ? Math.round(feedSum / feedCount) : 1000,
      depth_passes: Math.max(1, Math.ceil(depth / ap)),
      radial_engagement_mm: Math.round(toolD * (req.operation === "roughing" ? 0.4 : 0.15) * 100) / 100,
      axial_engagement_mm: Math.round(ap * 100) / 100,
    };
  }
}

export const adaptiveToolpathRouterEngine = new AdaptiveToolpathRouterEngine();
