/**
 * CrossCamRecommenderEngine — Evaluates and ranks CAM system strategies for a given geometry+material+machine combination.
 *
 * This is the NOVEL cross-CAM toolpath synthesis system:
 * Given a machining operation, it queries ALL available CAM strategy databases,
 * runs physics-based simulation for each candidate, and returns a ranked recommendation
 * with confidence scores and trade-off analysis.
 *
 * Supports: hyperMILL, Fusion 360, Mastercam, SolidCAM, Siemens NX, GibbsCAM, ESPRIT, SurfCAM
 */

// ── Types ──

export interface AtomicValue<T = unknown> {
  value: T;
  unit: string;
  confidence: number;
  source: string;
  timestamp: string;
}

export type CamSystem = "hypermill" | "fusion360" | "mastercam" | "solidcam" | "siemens_nx" | "gibbscam" | "esprit" | "surfcam";

export type GeometryType = "pocket_2d" | "pocket_3d" | "contour" | "surface_3d" | "drilling" | "boring" | "threading" | "slot" | "chamfer" | "freeform" | "undercut" | "thin_wall" | "deep_cavity" | "multi_pocket";

export type OperationGoal = "roughing" | "semi_finishing" | "finishing" | "hsm_roughing" | "rest_machining" | "pencil" | "scallop_removal" | "deburring";

export interface CrossCamInput {
  geometry: {
    type: GeometryType;
    dimensions_mm: { length: number; width: number; depth: number };
    corner_radius_mm?: number;
    wall_angle_deg?: number;
    island_count?: number;
    undercut_count?: number;
    thin_wall_min_mm?: number;
    surface_area_mm2?: number;
    pocket_count?: number;
  };
  material: {
    class: string; // e.g., "aluminum_6061", "steel_4140", "titanium_6al4v", "inconel_718"
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    hardness_hrc?: number;
    thermal_conductivity?: number;
  };
  machine: {
    id?: string;
    spindle_power_kw: number;
    max_rpm: number;
    axis_count: 3 | 4 | 5;
    rapid_accel_g?: number;
    table_size_mm?: { x: number; y: number };
    controller?: string;
  };
  tool: {
    diameter_mm: number;
    flute_count: number;
    material: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
    overhang_mm: number;
    helix_angle_deg?: number;
    corner_radius_mm?: number;
  };
  constraints: {
    max_cycle_time_min?: number;
    max_surface_roughness_um?: number;
    min_tool_life_parts?: number;
    max_spindle_utilization_pct?: number;
    tolerance_mm?: number;
    priority: "speed" | "quality" | "tool_life" | "balanced";
  };
  available_cam_systems?: CamSystem[];
}

export interface StrategyCandidate {
  cam_system: CamSystem;
  strategy_name: string;
  strategy_category: string;
  parameters: {
    stepover_pct: number; // % of tool diameter
    stepdown_mm: number;
    feed_rate_mmmin: number;
    spindle_rpm: number;
    engagement_angle_deg: number;
    approach_type: "helical" | "ramp" | "plunge" | "pre_drilled";
    toolpath_pattern: "zigzag" | "spiral" | "trochoidal" | "contour_parallel" | "adaptive" | "morphed" | "equidistant";
  };
  predicted_cycle_time_min: number;
  predicted_surface_finish_um: number;
  predicted_tool_life_parts: number;
  cutting_force_n: number;
  spindle_power_required_kw: number;
  mrr_cm3_min: number; // material removal rate
  confidence: number; // 0-1
  physics_validated: boolean;
  warnings: string[];
  advantages: string[];
  limitations: string[];
}

export interface CrossCamRecommendation {
  ranked_strategies: StrategyCandidate[];
  best_overall: StrategyCandidate;
  best_by_priority: {
    speed: StrategyCandidate;
    quality: StrategyCandidate;
    tool_life: StrategyCandidate;
    balanced: StrategyCandidate;
  };
  hybrid_recommendation?: {
    zones: Array<{
      zone_name: string;
      zone_geometry: string;
      recommended_cam: CamSystem;
      recommended_strategy: string;
      reason: string;
    }>;
    estimated_total_cycle_time_min: number;
    improvement_vs_single_cam_pct: number;
  };
  trade_off_analysis: {
    speed_vs_quality: string;
    tool_life_vs_speed: string;
    recommendation_confidence: number;
  };
  physics_summary: {
    max_cutting_force_n: number;
    max_spindle_power_kw: number;
    machine_utilization_pct: number;
    thermal_risk: "low" | "medium" | "high";
    chatter_risk: "low" | "medium" | "high";
  };
  /** Playbook strategy advice — toolpath rules and anti-patterns (if available) */
  playbook_strategy_advice?: string[];
}

// ── CAM Strategy Knowledge Base ──

interface CamStrategyProfile {
  cam: CamSystem;
  strategy: string;
  category: string;
  geometry_strengths: GeometryType[];
  material_strengths: string[]; // ISO groups
  operation_goals: OperationGoal[];
  toolpath_pattern: string;
  base_stepover_pct: number;
  base_stepdown_factor: number; // multiplier of tool diameter
  engagement_control: boolean;
  hsm_capable: boolean;
  five_axis_capable: boolean;
  surface_finish_rating: number; // 1-10, 10=best
  cycle_time_rating: number; // 1-10, 10=fastest
  tool_life_rating: number; // 1-10, 10=best
  chip_thinning_compensation: boolean;
  approach_strategies: string[];
  unique_advantages: string[];
}

const CAM_STRATEGY_DATABASE: CamStrategyProfile[] = [
  // ── hyperMILL Strategies ──
  {
    cam: "hypermill", strategy: "Optimized Roughing (HPC)", category: "roughing",
    geometry_strengths: ["pocket_2d", "pocket_3d", "deep_cavity", "multi_pocket"],
    material_strengths: ["P", "M", "K", "N", "S", "H"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "trochoidal", base_stepover_pct: 8, base_stepdown_factor: 2.0,
    engagement_control: true, hsm_capable: true, five_axis_capable: true,
    surface_finish_rating: 3, cycle_time_rating: 9, tool_life_rating: 9,
    chip_thinning_compensation: true, approach_strategies: ["helical", "ramp"],
    unique_advantages: ["Constant engagement angle", "Trochoidal with smooth transitions", "Automatic rest detection"]
  },
  {
    cam: "hypermill", strategy: "Adaptive Pocket", category: "roughing",
    geometry_strengths: ["pocket_2d", "pocket_3d", "slot"],
    material_strengths: ["P", "M", "N"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "adaptive", base_stepover_pct: 10, base_stepdown_factor: 1.5,
    engagement_control: true, hsm_capable: true, five_axis_capable: false,
    surface_finish_rating: 4, cycle_time_rating: 8, tool_life_rating: 8,
    chip_thinning_compensation: true, approach_strategies: ["helical", "ramp"],
    unique_advantages: ["Smooth spiral entry", "Adaptive stepover based on stock"]
  },
  {
    cam: "hypermill", strategy: "Equidistant Finishing", category: "finishing",
    geometry_strengths: ["surface_3d", "freeform", "pocket_3d"],
    material_strengths: ["P", "M", "K", "N", "S", "H"],
    operation_goals: ["finishing", "scallop_removal"],
    toolpath_pattern: "equidistant", base_stepover_pct: 5, base_stepdown_factor: 0.1,
    engagement_control: false, hsm_capable: true, five_axis_capable: true,
    surface_finish_rating: 10, cycle_time_rating: 5, tool_life_rating: 7,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Uniform scallop height", "Superior surface quality on freeforms", "5-axis TCPM support"]
  },
  {
    cam: "hypermill", strategy: "5-Axis Swarf Cutting", category: "finishing",
    geometry_strengths: ["thin_wall", "contour", "surface_3d"],
    material_strengths: ["P", "M", "N"],
    operation_goals: ["finishing", "semi_finishing"],
    toolpath_pattern: "contour_parallel", base_stepover_pct: 30, base_stepdown_factor: 1.0,
    engagement_control: false, hsm_capable: false, five_axis_capable: true,
    surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 6,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Full flute engagement on walls", "Eliminates multiple Z-level passes"]
  },
  {
    cam: "hypermill", strategy: "3D Pencil Milling", category: "finishing",
    geometry_strengths: ["pocket_3d", "freeform", "deep_cavity"],
    material_strengths: ["P", "M", "K", "N"],
    operation_goals: ["rest_machining", "pencil"],
    toolpath_pattern: "contour_parallel", base_stepover_pct: 50, base_stepdown_factor: 0.3,
    engagement_control: false, hsm_capable: false, five_axis_capable: true,
    surface_finish_rating: 7, cycle_time_rating: 4, tool_life_rating: 7,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Automatic corner detection", "Internal fillet cleanup", "Rest material targeting"]
  },

  // ── Fusion 360 Strategies ──
  {
    cam: "fusion360", strategy: "Adaptive Clearing", category: "roughing",
    geometry_strengths: ["pocket_2d", "pocket_3d", "deep_cavity", "multi_pocket"],
    material_strengths: ["P", "M", "K", "N", "S"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "adaptive", base_stepover_pct: 10, base_stepdown_factor: 2.0,
    engagement_control: true, hsm_capable: true, five_axis_capable: false,
    surface_finish_rating: 3, cycle_time_rating: 9, tool_life_rating: 9,
    chip_thinning_compensation: true, approach_strategies: ["helical", "ramp"],
    unique_advantages: ["Free/accessible CAM", "Excellent adaptive algorithm", "Cloud simulation"]
  },
  {
    cam: "fusion360", strategy: "Pocket Clearing", category: "roughing",
    geometry_strengths: ["pocket_2d", "slot", "contour"],
    material_strengths: ["P", "M", "N"],
    operation_goals: ["roughing"],
    toolpath_pattern: "zigzag", base_stepover_pct: 50, base_stepdown_factor: 1.0,
    engagement_control: false, hsm_capable: false, five_axis_capable: false,
    surface_finish_rating: 2, cycle_time_rating: 7, tool_life_rating: 5,
    chip_thinning_compensation: false, approach_strategies: ["helical", "plunge"],
    unique_advantages: ["Simple setup", "Reliable for basic pockets"]
  },
  {
    cam: "fusion360", strategy: "Steep and Shallow", category: "finishing",
    geometry_strengths: ["surface_3d", "freeform", "pocket_3d"],
    material_strengths: ["P", "M", "K", "N"],
    operation_goals: ["finishing"],
    toolpath_pattern: "morphed", base_stepover_pct: 8, base_stepdown_factor: 0.15,
    engagement_control: false, hsm_capable: true, five_axis_capable: true,
    surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Auto steep/shallow detection", "Smooth transitions between strategies"]
  },
  {
    cam: "fusion360", strategy: "Contour Finishing", category: "finishing",
    geometry_strengths: ["contour", "surface_3d", "thin_wall"],
    material_strengths: ["P", "M", "N"],
    operation_goals: ["finishing"],
    toolpath_pattern: "contour_parallel", base_stepover_pct: 15, base_stepdown_factor: 0.2,
    engagement_control: false, hsm_capable: false, five_axis_capable: true,
    surface_finish_rating: 7, cycle_time_rating: 6, tool_life_rating: 6,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Good wall quality", "Built-in lead/lag control for 5-axis"]
  },

  // ── Mastercam Strategies ──
  {
    cam: "mastercam", strategy: "OptiRough (Dynamic Milling)", category: "roughing",
    geometry_strengths: ["pocket_2d", "pocket_3d", "deep_cavity", "multi_pocket", "slot"],
    material_strengths: ["P", "M", "K", "N", "S", "H"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "adaptive", base_stepover_pct: 8, base_stepdown_factor: 2.5,
    engagement_control: true, hsm_capable: true, five_axis_capable: false,
    surface_finish_rating: 3, cycle_time_rating: 10, tool_life_rating: 9,
    chip_thinning_compensation: true, approach_strategies: ["helical", "ramp"],
    unique_advantages: ["Fastest roughing on deep pockets", "Superior chip thinning", "Proven 40% cycle time reduction vs conventional"]
  },
  {
    cam: "mastercam", strategy: "Area Roughing", category: "roughing",
    geometry_strengths: ["pocket_2d", "contour", "slot"],
    material_strengths: ["P", "M", "N"],
    operation_goals: ["roughing"],
    toolpath_pattern: "zigzag", base_stepover_pct: 50, base_stepdown_factor: 1.0,
    engagement_control: false, hsm_capable: false, five_axis_capable: false,
    surface_finish_rating: 2, cycle_time_rating: 6, tool_life_rating: 5,
    chip_thinning_compensation: false, approach_strategies: ["plunge", "helical"],
    unique_advantages: ["Simple and reliable", "Good for wide open pockets"]
  },
  {
    cam: "mastercam", strategy: "Hybrid Finishing", category: "finishing",
    geometry_strengths: ["surface_3d", "freeform"],
    material_strengths: ["P", "M", "K", "N"],
    operation_goals: ["finishing", "scallop_removal"],
    toolpath_pattern: "morphed", base_stepover_pct: 6, base_stepdown_factor: 0.1,
    engagement_control: false, hsm_capable: true, five_axis_capable: true,
    surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Auto steep/shallow morphing", "Excellent on complex surfaces"]
  },
  {
    cam: "mastercam", strategy: "Pencil Finishing", category: "finishing",
    geometry_strengths: ["pocket_3d", "freeform", "deep_cavity"],
    material_strengths: ["P", "M", "N"],
    operation_goals: ["pencil", "rest_machining"],
    toolpath_pattern: "contour_parallel", base_stepover_pct: 50, base_stepdown_factor: 0.3,
    engagement_control: false, hsm_capable: false, five_axis_capable: false,
    surface_finish_rating: 6, cycle_time_rating: 5, tool_life_rating: 7,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Automatic corner detection", "Good internal fillet quality"]
  },

  // ── SolidCAM Strategies ──
  {
    cam: "solidcam", strategy: "iMachining 2D", category: "roughing",
    geometry_strengths: ["pocket_2d", "slot", "contour"],
    material_strengths: ["P", "M", "K", "N", "S", "H"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "spiral", base_stepover_pct: 7, base_stepdown_factor: 3.0,
    engagement_control: true, hsm_capable: true, five_axis_capable: false,
    surface_finish_rating: 3, cycle_time_rating: 10, tool_life_rating: 10,
    chip_thinning_compensation: true, approach_strategies: ["helical"],
    unique_advantages: ["Patented morphing spiral", "Up to 70% cycle time reduction", "Best tool life in class", "Automatic feed optimization"]
  },
  {
    cam: "solidcam", strategy: "iMachining 3D", category: "roughing",
    geometry_strengths: ["pocket_3d", "deep_cavity", "freeform"],
    material_strengths: ["P", "M", "K", "N", "S"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "spiral", base_stepover_pct: 7, base_stepdown_factor: 2.5,
    engagement_control: true, hsm_capable: true, five_axis_capable: false,
    surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 10,
    chip_thinning_compensation: true, approach_strategies: ["helical"],
    unique_advantages: ["3D morphing spiral", "Excellent on hardened steel", "Automatic rest detection"]
  },

  // ── Siemens NX Strategies ──
  {
    cam: "siemens_nx", strategy: "Adaptive Milling", category: "roughing",
    geometry_strengths: ["pocket_2d", "pocket_3d", "deep_cavity"],
    material_strengths: ["P", "M", "K", "N", "S"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "adaptive", base_stepover_pct: 10, base_stepdown_factor: 2.0,
    engagement_control: true, hsm_capable: true, five_axis_capable: true,
    surface_finish_rating: 4, cycle_time_rating: 8, tool_life_rating: 8,
    chip_thinning_compensation: true, approach_strategies: ["helical", "ramp"],
    unique_advantages: ["Full Siemens integration", "Digital twin validation", "Excellent 5-axis support"]
  },
  {
    cam: "siemens_nx", strategy: "Streamline Finishing", category: "finishing",
    geometry_strengths: ["surface_3d", "freeform", "contour"],
    material_strengths: ["P", "M", "K", "N"],
    operation_goals: ["finishing"],
    toolpath_pattern: "morphed", base_stepover_pct: 5, base_stepdown_factor: 0.1,
    engagement_control: false, hsm_capable: true, five_axis_capable: true,
    surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Flow-line based paths", "Superior on aerodynamic surfaces", "Integrated simulation"]
  },

  // ── GibbsCAM Strategies ──
  {
    cam: "gibbscam", strategy: "VoluMill", category: "roughing",
    geometry_strengths: ["pocket_2d", "pocket_3d", "deep_cavity", "multi_pocket"],
    material_strengths: ["P", "M", "K", "N", "S", "H"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "trochoidal", base_stepover_pct: 8, base_stepdown_factor: 2.5,
    engagement_control: true, hsm_capable: true, five_axis_capable: false,
    surface_finish_rating: 3, cycle_time_rating: 9, tool_life_rating: 9,
    chip_thinning_compensation: true, approach_strategies: ["helical", "ramp"],
    unique_advantages: ["Proven VoluMill algorithm", "Excellent on hard materials", "Constant MRR control"]
  },

  // ── ESPRIT Strategies ──
  {
    cam: "esprit", strategy: "ProfitMilling", category: "roughing",
    geometry_strengths: ["pocket_2d", "pocket_3d", "slot"],
    material_strengths: ["P", "M", "K", "N"],
    operation_goals: ["roughing", "hsm_roughing"],
    toolpath_pattern: "trochoidal", base_stepover_pct: 9, base_stepdown_factor: 2.0,
    engagement_control: true, hsm_capable: true, five_axis_capable: false,
    surface_finish_rating: 3, cycle_time_rating: 8, tool_life_rating: 8,
    chip_thinning_compensation: true, approach_strategies: ["helical", "ramp"],
    unique_advantages: ["Built-in FEA optimization", "SolidMill integration"]
  },
  {
    cam: "esprit", strategy: "5-Axis Composite", category: "finishing",
    geometry_strengths: ["surface_3d", "freeform", "thin_wall"],
    material_strengths: ["P", "M", "N", "S"],
    operation_goals: ["finishing"],
    toolpath_pattern: "morphed", base_stepover_pct: 6, base_stepdown_factor: 0.15,
    engagement_control: false, hsm_capable: true, five_axis_capable: true,
    surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7,
    chip_thinning_compensation: false, approach_strategies: ["ramp"],
    unique_advantages: ["Composite material support", "Multi-blade machining"]
  },

  // ── SurfCAM Strategies ──
  {
    cam: "surfcam", strategy: "Traditional Roughing", category: "roughing",
    geometry_strengths: ["pocket_2d", "contour"],
    material_strengths: ["P", "M", "N"],
    operation_goals: ["roughing"],
    toolpath_pattern: "zigzag", base_stepover_pct: 50, base_stepdown_factor: 1.0,
    engagement_control: false, hsm_capable: false, five_axis_capable: false,
    surface_finish_rating: 2, cycle_time_rating: 5, tool_life_rating: 5,
    chip_thinning_compensation: false, approach_strategies: ["plunge", "helical"],
    unique_advantages: ["Simple and fast setup", "Good for basic parts"]
  },
];

// ── Material Properties for Physics ──

interface MaterialPhysicsProps {
  specific_cutting_force_n_mm2: number; // Kc1.1
  mc_exponent: number;
  thermal_conductivity_w_mk: number;
  max_recommended_vc_m_min: number;
  min_recommended_vc_m_min: number;
  chip_thinning_factor: number;
  tool_life_exponent: number; // Taylor n
  chatter_susceptibility: number; // 0-1
}

const MATERIAL_PHYSICS: Record<string, MaterialPhysicsProps> = {
  "P": { specific_cutting_force_n_mm2: 2100, mc_exponent: 0.25, thermal_conductivity_w_mk: 50, max_recommended_vc_m_min: 350, min_recommended_vc_m_min: 80, chip_thinning_factor: 1.0, tool_life_exponent: 0.25, chatter_susceptibility: 0.3 },
  "M": { specific_cutting_force_n_mm2: 2500, mc_exponent: 0.25, thermal_conductivity_w_mk: 15, max_recommended_vc_m_min: 200, min_recommended_vc_m_min: 40, chip_thinning_factor: 1.1, tool_life_exponent: 0.20, chatter_susceptibility: 0.5 },
  "K": { specific_cutting_force_n_mm2: 1500, mc_exponent: 0.25, thermal_conductivity_w_mk: 40, max_recommended_vc_m_min: 400, min_recommended_vc_m_min: 100, chip_thinning_factor: 0.9, tool_life_exponent: 0.30, chatter_susceptibility: 0.2 },
  "N": { specific_cutting_force_n_mm2: 800, mc_exponent: 0.25, thermal_conductivity_w_mk: 200, max_recommended_vc_m_min: 800, min_recommended_vc_m_min: 150, chip_thinning_factor: 0.8, tool_life_exponent: 0.35, chatter_susceptibility: 0.15 },
  "S": { specific_cutting_force_n_mm2: 3200, mc_exponent: 0.25, thermal_conductivity_w_mk: 8, max_recommended_vc_m_min: 80, min_recommended_vc_m_min: 15, chip_thinning_factor: 1.2, tool_life_exponent: 0.15, chatter_susceptibility: 0.7 },
  "H": { specific_cutting_force_n_mm2: 4000, mc_exponent: 0.30, thermal_conductivity_w_mk: 25, max_recommended_vc_m_min: 150, min_recommended_vc_m_min: 30, chip_thinning_factor: 1.3, tool_life_exponent: 0.12, chatter_susceptibility: 0.6 },
};

// ── Engine ──

export class CrossCamRecommenderEngine {
  private strategyDB = CAM_STRATEGY_DATABASE;

  /**
   * Main entry point: evaluate all CAM systems and return ranked recommendations.
   */
  compute(input: CrossCamInput): AtomicValue<CrossCamRecommendation> {
    const availableCams = input.available_cam_systems || (["hypermill", "fusion360", "mastercam", "solidcam", "siemens_nx", "gibbscam", "esprit", "surfcam"] as CamSystem[]);

    // Phase 1: Filter strategies by geometry + material + operation compatibility
    const candidates = this.findCompatibleStrategies(input, availableCams);

    // Phase 2: Physics-based simulation for each candidate
    const evaluated = candidates.map(c => this.evaluateCandidate(c, input));

    // Phase 3: Score and rank
    const scored = evaluated.map(e => ({
      ...e,
      score: this.computeScore(e, input.constraints),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Phase 4: Build recommendation
    const rankedStrategies = scored.map(s => this.buildCandidate(s));
    const bestOverall = rankedStrategies[0];
    const bestSpeed = [...rankedStrategies].sort((a, b) => a.predicted_cycle_time_min - b.predicted_cycle_time_min)[0];
    const bestQuality = [...rankedStrategies].sort((a, b) => a.predicted_surface_finish_um - b.predicted_surface_finish_um)[0];
    const bestToolLife = [...rankedStrategies].sort((a, b) => b.predicted_tool_life_parts - a.predicted_tool_life_parts)[0];

    // Phase 5: Hybrid recommendation (zone decomposition)
    const hybrid = this.generateHybridRecommendation(input, rankedStrategies);

    // Phase 6: Physics summary
    const physicsSummary = this.buildPhysicsSummary(rankedStrategies, input);

    // Phase 7: Playbook strategy advice (toolpath rules + anti-patterns)
    const playbookAdvice = this.getPlaybookStrategyAdvice(input);

    const recommendation: CrossCamRecommendation = {
      ranked_strategies: rankedStrategies.slice(0, 10),
      best_overall: bestOverall,
      best_by_priority: {
        speed: bestSpeed,
        quality: bestQuality,
        tool_life: bestToolLife,
        balanced: bestOverall,
      },
      hybrid_recommendation: hybrid,
      trade_off_analysis: {
        speed_vs_quality: this.analyzeTradeOff(bestSpeed, bestQuality, "speed", "quality"),
        tool_life_vs_speed: this.analyzeTradeOff(bestToolLife, bestSpeed, "tool_life", "speed"),
        recommendation_confidence: bestOverall.confidence,
      },
      physics_summary: physicsSummary,
      ...(playbookAdvice.length > 0 ? { playbook_strategy_advice: playbookAdvice } : {}),
    };

    return {
      value: recommendation,
      unit: "cross_cam_recommendation",
      confidence: bestOverall.confidence,
      source: "CrossCamRecommenderEngine",
      timestamp: new Date().toISOString(),
    };
  }

  private findCompatibleStrategies(input: CrossCamInput, availableCams: CamSystem[]): CamStrategyProfile[] {
    return this.strategyDB.filter(s => {
      if (!availableCams.includes(s.cam)) return false;
      // Geometry match
      if (!s.geometry_strengths.includes(input.geometry.type)) return false;
      // Material match
      if (!s.material_strengths.includes(input.material.iso_group)) return false;
      // 5-axis check
      if (input.machine.axis_count >= 5 && s.five_axis_capable) return true;
      if (input.machine.axis_count < 5 && s.five_axis_capable && !s.geometry_strengths.includes(input.geometry.type)) return false;
      return true;
    });
  }

  private evaluateCandidate(profile: CamStrategyProfile, input: CrossCamInput) {
    const matProps = MATERIAL_PHYSICS[input.material.iso_group] || MATERIAL_PHYSICS["P"];

    // Calculate cutting parameters
    const toolDia = input.tool.diameter_mm;
    const stepover = (profile.base_stepover_pct / 100) * toolDia;
    const stepdown = profile.base_stepdown_factor * toolDia;
    const vc = Math.min(matProps.max_recommended_vc_m_min * 0.8, input.machine.max_rpm * Math.PI * toolDia / 1000);
    const rpm = Math.min(input.machine.max_rpm, Math.round(vc * 1000 / (Math.PI * toolDia)));
    const fz = toolDia < 6 ? 0.04 : toolDia < 12 ? 0.08 : toolDia < 20 ? 0.12 : 0.15;
    const feedRate = rpm * fz * input.tool.flute_count;

    // Engagement angle (for adaptive/trochoidal strategies)
    const engagementAngle = profile.engagement_control
      ? Math.acos(1 - stepover / (toolDia / 2)) * (180 / Math.PI)
      : Math.acos(1 - stepover / (toolDia / 2)) * (180 / Math.PI);

    // Chip thinning compensation
    const chipThinFactor = profile.chip_thinning_compensation && engagementAngle < 90
      ? toolDia / (2 * stepover)
      : 1.0;
    const effectiveFeed = feedRate * Math.min(chipThinFactor, 2.5);

    // Cutting force (Kienzle model)
    const ap = stepdown;
    const ae = stepover;
    const hm = fz * Math.sqrt(ae / toolDia); // mean chip thickness
    const Fc = matProps.specific_cutting_force_n_mm2 * ap * hm * Math.pow(hm, -matProps.mc_exponent);

    // Spindle power
    const power_kw = (Fc * vc) / (60 * 1000);

    // MRR
    const mrr = (ap * ae * effectiveFeed) / 1000; // cm³/min

    // Estimate cycle time
    const volume = input.geometry.dimensions_mm.length * input.geometry.dimensions_mm.width * input.geometry.dimensions_mm.depth / 1000; // cm³
    const cuttingTime = mrr > 0 ? volume / mrr : 999;
    const nonCuttingOverhead = 1.15; // 15% for rapids, approaches, retracts
    const estimatedCycleTime = cuttingTime * nonCuttingOverhead;

    // Surface finish estimate (based on strategy rating and stepover)
    const scallop_h = stepover * stepover / (8 * (input.tool.corner_radius_mm || toolDia / 2));
    const baseRa = profile.category === "roughing" ? 6.3 : profile.category === "finishing" ? (scallop_h * 4 + 0.2) : 3.2;
    const finishMultiplier = (11 - profile.surface_finish_rating) / 10 + 0.5;
    const predictedRa = Math.max(0.2, baseRa * finishMultiplier);

    // Tool life estimate (Taylor model)
    const T = Math.pow(300 / vc, 1 / matProps.tool_life_exponent) * profile.tool_life_rating / 7;
    const partsPerTool = Math.max(1, Math.floor(T / estimatedCycleTime));

    // Chatter risk
    const toolStiffness = Math.pow(toolDia, 4) / Math.pow(input.tool.overhang_mm, 3);
    const chatterRisk = matProps.chatter_susceptibility * (1 / toolStiffness) * Fc / 1000;

    // Thermal risk
    const thermalRisk = matProps.thermal_conductivity_w_mk < 15 && vc > matProps.max_recommended_vc_m_min * 0.6 ? "high" : matProps.thermal_conductivity_w_mk < 30 ? "medium" : "low";

    // Physics validation
    const powerOk = power_kw <= input.machine.spindle_power_kw * (input.constraints.max_spindle_utilization_pct || 85) / 100;
    const rpmOk = rpm <= input.machine.max_rpm;

    // Confidence
    let confidence = 0.7;
    if (powerOk && rpmOk) confidence += 0.15;
    if (profile.geometry_strengths.includes(input.geometry.type)) confidence += 0.1;
    if (profile.hsm_capable && input.constraints.priority === "speed") confidence += 0.05;
    confidence = Math.min(0.98, confidence);

    return {
      profile,
      rpm,
      feedRate: effectiveFeed,
      stepover,
      stepdown,
      engagementAngle,
      cuttingForce: Fc,
      spindlePower: power_kw,
      mrr,
      cycleTime: estimatedCycleTime,
      surfaceFinish: predictedRa,
      toolLifeParts: partsPerTool,
      chatterRisk: chatterRisk > 0.5 ? "high" as const : chatterRisk > 0.2 ? "medium" as const : "low" as const,
      thermalRisk: thermalRisk as "low" | "medium" | "high",
      physicsValidated: powerOk && rpmOk,
      confidence,
      warnings: [
        ...(!powerOk ? [`Spindle power ${power_kw.toFixed(1)}kW exceeds ${input.machine.spindle_power_kw}kW limit`] : []),
        ...(!rpmOk ? [`Required RPM ${rpm} exceeds machine max ${input.machine.max_rpm}`] : []),
        ...(chatterRisk > 0.5 ? ["High chatter risk — consider reducing stepdown or using shorter tool"] : []),
        ...(thermalRisk === "high" ? ["High thermal risk — ensure adequate coolant delivery"] : []),
      ],
    };
  }

  private computeScore(evaluated: ReturnType<CrossCamRecommenderEngine["evaluateCandidate"]> & { score?: number }, constraints: CrossCamInput["constraints"]): number {
    const { cycleTime, surfaceFinish, toolLifeParts, physicsValidated, confidence, profile } = evaluated;

    let score = 0;

    // Base score from physics validation
    if (!physicsValidated) score -= 30;

    // Priority-weighted scoring
    switch (constraints.priority) {
      case "speed":
        score += Math.max(0, 50 - cycleTime) * 2; // Lower cycle time = higher score
        score += profile.cycle_time_rating * 5;
        break;
      case "quality":
        score += Math.max(0, 10 - surfaceFinish) * 10; // Lower Ra = higher score
        score += profile.surface_finish_rating * 5;
        break;
      case "tool_life":
        score += Math.min(toolLifeParts, 500) / 5; // More parts = higher score
        score += profile.tool_life_rating * 5;
        break;
      case "balanced":
      default:
        score += Math.max(0, 30 - cycleTime) * 1.5;
        score += Math.max(0, 8 - surfaceFinish) * 5;
        score += Math.min(toolLifeParts, 300) / 3;
        score += (profile.cycle_time_rating + profile.surface_finish_rating + profile.tool_life_rating) * 2;
        break;
    }

    // Constraint satisfaction bonuses
    if (constraints.max_cycle_time_min && cycleTime <= constraints.max_cycle_time_min) score += 20;
    if (constraints.max_surface_roughness_um && surfaceFinish <= constraints.max_surface_roughness_um) score += 20;
    if (constraints.min_tool_life_parts && toolLifeParts >= constraints.min_tool_life_parts) score += 20;

    // Confidence and capability bonuses
    score += confidence * 20;
    if (profile.engagement_control) score += 5;
    if (profile.chip_thinning_compensation) score += 3;
    if (profile.hsm_capable) score += 3;

    return score;
  }

  private buildCandidate(scored: ReturnType<CrossCamRecommenderEngine["evaluateCandidate"]> & { score: number }): StrategyCandidate {
    const { profile, rpm, feedRate, stepover, stepdown, engagementAngle, cuttingForce, spindlePower, mrr, cycleTime, surfaceFinish, toolLifeParts, chatterRisk, physicsValidated, confidence, warnings } = scored;

    return {
      cam_system: profile.cam,
      strategy_name: profile.strategy,
      strategy_category: profile.category,
      parameters: {
        stepover_pct: profile.base_stepover_pct,
        stepdown_mm: Math.round(stepdown * 100) / 100,
        feed_rate_mmmin: Math.round(feedRate),
        spindle_rpm: rpm,
        engagement_angle_deg: Math.round(engagementAngle * 10) / 10,
        approach_type: profile.approach_strategies[0] as any,
        toolpath_pattern: profile.toolpath_pattern as any,
      },
      predicted_cycle_time_min: Math.round(cycleTime * 100) / 100,
      predicted_surface_finish_um: Math.round(surfaceFinish * 100) / 100,
      predicted_tool_life_parts: toolLifeParts,
      cutting_force_n: Math.round(cuttingForce),
      spindle_power_required_kw: Math.round(spindlePower * 100) / 100,
      mrr_cm3_min: Math.round(mrr * 100) / 100,
      confidence,
      physics_validated: physicsValidated,
      warnings,
      advantages: profile.unique_advantages,
      limitations: [
        ...(profile.five_axis_capable ? [] : ["3-axis only"]),
        ...(!profile.engagement_control ? ["No adaptive engagement control"] : []),
        ...(!profile.hsm_capable ? ["Not HSM-optimized"] : []),
      ],
    };
  }

  private generateHybridRecommendation(input: CrossCamInput, strategies: StrategyCandidate[]): CrossCamRecommendation["hybrid_recommendation"] {
    if (strategies.length < 2) return undefined;

    // Zone decomposition based on geometry
    const zones: Array<{ zone_name: string; zone_geometry: string; recommended_cam: CamSystem; recommended_strategy: string; reason: string }> = [];

    // Roughing zone
    const bestRoughing = strategies.filter(s => s.strategy_category === "roughing").sort((a, b) => a.predicted_cycle_time_min - b.predicted_cycle_time_min)[0];
    if (bestRoughing) {
      zones.push({
        zone_name: "Main Volume Removal",
        zone_geometry: `${input.geometry.type} - bulk material`,
        recommended_cam: bestRoughing.cam_system,
        recommended_strategy: bestRoughing.strategy_name,
        reason: `Fastest roughing: ${bestRoughing.predicted_cycle_time_min.toFixed(1)}min, MRR ${bestRoughing.mrr_cm3_min}cm³/min`,
      });
    }

    // Corner/detail zone
    const bestPencil = strategies.filter(s => s.strategy_category === "finishing" && s.strategy_name.toLowerCase().includes("pencil")).sort((a, b) => b.confidence - a.confidence)[0];
    if (bestPencil && input.geometry.corner_radius_mm && input.geometry.corner_radius_mm < input.tool.diameter_mm) {
      zones.push({
        zone_name: "Corner Detail Cleanup",
        zone_geometry: `Internal corners R${input.geometry.corner_radius_mm}mm`,
        recommended_cam: bestPencil.cam_system,
        recommended_strategy: bestPencil.strategy_name,
        reason: `Best corner cleanup for R${input.geometry.corner_radius_mm}mm features`,
      });
    }

    // Finishing zone
    const bestFinishing = strategies.filter(s => s.strategy_category === "finishing" && !s.strategy_name.toLowerCase().includes("pencil")).sort((a, b) => a.predicted_surface_finish_um - b.predicted_surface_finish_um)[0];
    if (bestFinishing) {
      zones.push({
        zone_name: "Final Surface Finish",
        zone_geometry: `${input.geometry.type} - all surfaces`,
        recommended_cam: bestFinishing.cam_system,
        recommended_strategy: bestFinishing.strategy_name,
        reason: `Best surface finish: Ra ${bestFinishing.predicted_surface_finish_um.toFixed(2)}μm`,
      });
    }

    if (zones.length < 2) return undefined;

    // Estimate combined cycle time
    const roughTime = bestRoughing ? bestRoughing.predicted_cycle_time_min * 0.6 : 0; // 60% of single estimate for zoned approach
    const finishTime = bestFinishing ? bestFinishing.predicted_cycle_time_min * 0.8 : 0;
    const pencilTime = bestPencil ? bestPencil.predicted_cycle_time_min * 0.3 : 0;
    const totalHybrid = roughTime + finishTime + pencilTime;
    const singleBest = strategies[0].predicted_cycle_time_min;
    const improvement = singleBest > 0 ? ((singleBest - totalHybrid) / singleBest) * 100 : 0;

    return {
      zones,
      estimated_total_cycle_time_min: Math.round(totalHybrid * 100) / 100,
      improvement_vs_single_cam_pct: Math.round(Math.max(0, improvement) * 10) / 10,
    };
  }

  private analyzeTradeOff(stratA: StrategyCandidate, stratB: StrategyCandidate, labelA: string, labelB: string): string {
    if (stratA.cam_system === stratB.cam_system && stratA.strategy_name === stratB.strategy_name) {
      return `${stratA.cam_system} ${stratA.strategy_name} wins for both ${labelA} and ${labelB}`;
    }
    return `${labelA}: ${stratA.cam_system} ${stratA.strategy_name} (${labelA === "speed" ? stratA.predicted_cycle_time_min.toFixed(1) + "min" : labelA === "quality" ? "Ra " + stratA.predicted_surface_finish_um.toFixed(2) + "μm" : stratA.predicted_tool_life_parts + " parts"}) vs ${labelB}: ${stratB.cam_system} ${stratB.strategy_name} (${labelB === "speed" ? stratB.predicted_cycle_time_min.toFixed(1) + "min" : labelB === "quality" ? "Ra " + stratB.predicted_surface_finish_um.toFixed(2) + "μm" : stratB.predicted_tool_life_parts + " parts"})`;
  }

  private buildPhysicsSummary(strategies: StrategyCandidate[], input: CrossCamInput): CrossCamRecommendation["physics_summary"] {
    const maxForce = Math.max(...strategies.map(s => s.cutting_force_n));
    const maxPower = Math.max(...strategies.map(s => s.spindle_power_required_kw));
    const utilization = (maxPower / input.machine.spindle_power_kw) * 100;
    const matProps = MATERIAL_PHYSICS[input.material.iso_group];
    const thermalRisk = matProps && matProps.thermal_conductivity_w_mk < 15 ? "high" as const : matProps && matProps.thermal_conductivity_w_mk < 30 ? "medium" as const : "low" as const;
    const toolStiffness = Math.pow(input.tool.diameter_mm, 4) / Math.pow(input.tool.overhang_mm, 3);
    const chatterRisk = (matProps?.chatter_susceptibility || 0.3) * (1 / toolStiffness) * maxForce / 1000 > 0.5 ? "high" as const : "medium" as const;

    return {
      max_cutting_force_n: Math.round(maxForce),
      max_spindle_power_kw: Math.round(maxPower * 100) / 100,
      machine_utilization_pct: Math.round(Math.min(utilization, 100)),
      thermal_risk: thermalRisk,
      chatter_risk: chatterRisk,
    };
  }

  /**
   * Query MachiningPlaybookEngine for toolpath strategy rules and anti-patterns
   * relevant to the current geometry/material. Surfaces rules like STRAT-001
   * (adaptive preferred), STRAT-002 (steep/shallow), ANTI-005 (no full-slot).
   * Returns empty array if playbook is unavailable.
   */
  private getPlaybookStrategyAdvice(input: CrossCamInput): string[] {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine");

      // Build feature list from input geometry
      const features: string[] = [input.geometry.type];
      if (input.geometry.thin_wall_min_mm && input.geometry.thin_wall_min_mm < 2) {
        features.push("thin_wall");
      }
      if (input.geometry.dimensions_mm.depth > input.tool.diameter_mm * 4) {
        features.push("deep_feature");
      }
      if (input.geometry.type === "slot") {
        features.push("slot");
      }
      if (input.geometry.undercut_count && input.geometry.undercut_count > 0) {
        features.push("undercut");
      }
      if (input.geometry.pocket_count && input.geometry.pocket_count > 1) {
        features.push("multi_pocket");
      }

      const result = machiningPlaybookEngine.advise({
        features,
        material_iso: input.material.iso_group,
        categories: ["toolpath_strategy", "anti_pattern"],
        machine_axes: input.machine.axis_count,
        tolerance_mm: input.constraints.tolerance_mm,
        surface_finish_Ra: input.constraints.max_surface_roughness_um,
        operation_type: input.geometry.type,
        ...(input.material.hardness_hrc != null && { hardness_hrc: input.material.hardness_hrc }),
      });

      // Combine rule summaries and critical warnings
      const advice: string[] = [];
      for (const rule of result.rules) {
        const prefix = rule.severity === "critical" || rule.severity === "error"
          ? "WARNING" : "ADVICE";
        advice.push(`[${prefix}] ${rule.id}: ${rule.rule}`);
      }

      // Add critical warnings that aren't already covered
      for (const warning of result.critical_warnings) {
        if (!advice.some(a => a.includes(warning))) {
          advice.push(`[WARNING] ${warning}`);
        }
      }

      return advice;
    } catch {
      // MachiningPlaybookEngine not available — graceful degradation
      return [];
    }
  }

  /** Get supported CAM systems list */
  getSupportedCamSystems(): CamSystem[] {
    return [...new Set(this.strategyDB.map(s => s.cam))];
  }

  /** Get strategy count by CAM system */
  getStrategyCounts(): Record<CamSystem, number> {
    const counts: Record<string, number> = {};
    for (const s of this.strategyDB) {
      counts[s.cam] = (counts[s.cam] || 0) + 1;
    }
    return counts as Record<CamSystem, number>;
  }
}

export const crossCamRecommenderEngine = new CrossCamRecommenderEngine();
