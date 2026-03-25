// @ts-nocheck
/**
 * BatchCAMStrategyEngines — 6 Lightweight CAM Strategy Engines in One File
 *
 * Covers Tebis, Edgecam, ESPRIT, GibbsCAM, CAMWorks, SprutCAM.
 * Each engine: 15 strategies, recommend/getParameters/listStrategies interface.
 *
 * @engine BatchCAMStrategyEngines
 * @shortcode E1109
 * @dispatcher camDispatcher
 * @actions tebis_strategy_recommend, tebis_strategy_list,
 *          edgecam_strategy_recommend, edgecam_strategy_list,
 *          esprit_strategy_recommend, esprit_strategy_list,
 *          gibbscam_strategy_recommend, gibbscam_strategy_list,
 *          camworks_strategy_recommend, camworks_strategy_list,
 *          sprutcam_strategy_recommend, sprutcam_strategy_list
 * @milestone CAMX-MS6/U01
 */

// ─── Shared Types ────────────────────────────────────────────────────────────

export type StrategyCategory =
  | "roughing" | "finishing" | "drilling" | "turning" | "multi_axis" | "specialty";

export type FeatureType =
  | "pocket" | "contour" | "slot" | "face" | "bore" | "freeform_3d"
  | "steep_wall" | "flat_area" | "groove" | "thread" | "hole"
  | "turning_external" | "turning_internal" | "impeller" | "ruled_surface";

export type MaterialGroup = "P" | "M" | "K" | "N" | "S" | "H";

export type Priority = "cycle_time" | "tool_life" | "surface_finish" | "balanced";

export interface CAMStrategy {
  name: string;
  category: StrategyCategory;
  ae_pct: number;
  ap_factor: number;
  vc_multiplier: number;
  engagement_control: boolean;
  hsm_capable: boolean;
  five_axis_capable: boolean;
  surface_finish_rating: number;
  cycle_time_rating: number;
  tool_life_rating: number;
  unique_advantages: string[];
  suitable_features: FeatureType[];
  description: string;
}

export interface StrategyRecommendation {
  rank: number;
  strategy: CAMStrategy;
  score: number;
  reasoning: string;
}

// ─── Base Engine ─────────────────────────────────────────────────────────────

class BaseCAMStrategyEngine {
  readonly camSystem: string;
  protected readonly strategies: CAMStrategy[];

  constructor(camSystem: string, strategies: CAMStrategy[]) {
    this.camSystem = camSystem;
    this.strategies = strategies;
  }

  recommend(
    feature: { type: FeatureType; depth_mm?: number; wall_angle_deg?: number; has_previous_roughing?: boolean; axis_count?: number },
    material?: { iso_group?: MaterialGroup; hardness_hrc?: number },
    priority: Priority = "balanced",
  ): { recommendations: StrategyRecommendation[]; cam_system: string; feature_type: string } {
    const candidates = this.strategies.filter((s) =>
      s.suitable_features.includes(feature.type) ||
      s.suitable_features.length === 0
    );

    const scored = candidates.map((s) => {
      let score = 50;

      // Priority scoring
      switch (priority) {
        case "cycle_time":
          score += s.cycle_time_rating * 4;
          score += s.hsm_capable ? 8 : 0;
          break;
        case "tool_life":
          score += s.tool_life_rating * 4;
          score += s.engagement_control ? 8 : 0;
          break;
        case "surface_finish":
          score += s.surface_finish_rating * 4;
          break;
        case "balanced":
          score += (s.cycle_time_rating + s.tool_life_rating + s.surface_finish_rating) * 1.5;
          break;
      }

      // Feature match bonus
      if (s.suitable_features.includes(feature.type)) score += 10;

      // 5-axis bonus when needed
      if (feature.axis_count === 5 && s.five_axis_capable) score += 12;
      if (feature.axis_count === 5 && !s.five_axis_capable) score -= 20;

      // Roughing/finishing alignment
      if (feature.has_previous_roughing && s.category === "finishing") score += 8;
      if (!feature.has_previous_roughing && s.category === "roughing") score += 5;

      // Hardened material check
      if (material?.iso_group === "H" && s.hsm_capable) score += 6;
      if (material?.iso_group === "S" && s.engagement_control) score += 6;

      return { strategy: s, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
      recommendations: scored.slice(0, 5).map((item, idx) => ({
        rank: idx + 1,
        strategy: item.strategy,
        score: Math.min(100, Math.round(item.score)),
        reasoning: `${item.strategy.name}: ${item.strategy.description}`,
      })),
      cam_system: this.camSystem,
      feature_type: feature.type,
    };
  }

  getParameters(name: string): CAMStrategy | { error: string } {
    const s = this.strategies.find((st) => st.name === name);
    if (!s) return { error: `Strategy "${name}" not found in ${this.camSystem}. Use list action to see available strategies.` };
    return s;
  }

  listStrategies(category?: StrategyCategory): {
    strategies: Array<{ name: string; category: StrategyCategory; description: string }>;
    total: number;
    cam_system: string;
  } {
    const filtered = category
      ? this.strategies.filter((s) => s.category === category)
      : this.strategies;

    return {
      strategies: filtered.map((s) => ({
        name: s.name,
        category: s.category,
        description: s.description,
      })),
      total: filtered.length,
      cam_system: this.camSystem,
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. TEBIS STRATEGY ENGINE — Tebis AG
// ═════════════════════════════════════════════════════════════════════════════

const TEBIS_STRATEGIES: CAMStrategy[] = [
  { name: "nc_set_roughing", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Template-based NC Set management", "Standardized roughing across part families"], suitable_features: ["pocket", "freeform_3d", "face", "contour"], description: "NC Set roughing with template-based programming for standardized part families" },
  { name: "automill_rough", category: "roughing", ae_pct: 45, ap_factor: 1.2, vc_multiplier: 1.0, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 3, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Automatic toolpath generation from templates", "Feature-aware stock removal"], suitable_features: ["pocket", "contour", "slot", "face"], description: "AutoMill automatic roughing with intelligent stock-aware material removal" },
  { name: "hsm_roughing", category: "roughing", ae_pct: 12, ap_factor: 2.5, vc_multiplier: 1.4, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 9, tool_life_rating: 8, unique_advantages: ["Trochoidal milling with constant engagement", "Deep axial cuts with light radial"], suitable_features: ["pocket", "slot", "contour"], description: "High-speed roughing with constant engagement angle and deep axial passes" },
  { name: "two_five_d_finishing", category: "finishing", ae_pct: 30, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 7, cycle_time_rating: 6, tool_life_rating: 6, unique_advantages: ["Precise 2.5D contour finishing", "Floor and wall finishing modes"], suitable_features: ["pocket", "contour", "face", "slot"], description: "2.5D finishing for prismatic features with floor and wall modes" },
  { name: "three_d_finishing", category: "finishing", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Curvature-adaptive stepover", "Rest material detection"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "3D surface finishing with curvature-adaptive stepover for freeform geometry" },
  { name: "five_axis_finishing", category: "finishing", ae_pct: 10, ap_factor: 0.2, vc_multiplier: 1.3, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Collision-free 5-axis finishing", "Tool axis optimization"], suitable_features: ["freeform_3d", "steep_wall", "impeller", "ruled_surface"], description: "Collision-free 5-axis finishing with automatic tool axis optimization" },
  { name: "collision_free_multiaxis", category: "multi_axis", ae_pct: 15, ap_factor: 0.4, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Virtual machine collision avoidance", "Automatic tilt angle correction"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "Collision-free multi-axis machining with virtual machine simulation" },
  { name: "virtual_machine_sim", category: "multi_axis", ae_pct: 20, ap_factor: 0.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 8, unique_advantages: ["Full machine simulation before cutting", "Kinematic limit avoidance"], suitable_features: ["freeform_3d", "impeller", "ruled_surface"], description: "Virtual machine simulation-verified toolpaths with kinematic limit checking" },
  { name: "rest_roughing", category: "roughing", ae_pct: 40, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Automatic rest material detection", "Small tool follow-up"], suitable_features: ["pocket", "freeform_3d", "contour"], description: "Rest roughing for material remaining after initial roughing with larger tools" },
  { name: "template_drilling", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Template-based drill cycle selection", "Automatic cycle type assignment"], suitable_features: ["hole", "bore", "thread"], description: "Template-based drilling with automatic cycle assignment from NC Sets" },
  { name: "pencil_finishing", category: "finishing", ae_pct: 8, ap_factor: 0.1, vc_multiplier: 1.3, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 4, tool_life_rating: 6, unique_advantages: ["Corner cleanup with small tools", "Concavity-targeted passes"], suitable_features: ["freeform_3d", "groove", "contour"], description: "Pencil tracing for corner cleanup and fillet finishing in concave regions" },
  { name: "planar_finishing", category: "finishing", ae_pct: 20, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Flat area detection", "Optimized Z-level segregation"], suitable_features: ["flat_area", "face", "freeform_3d"], description: "Planar finishing for flat and near-flat regions with optimized pass spacing" },
  { name: "turning_external", category: "turning", ae_pct: 60, ap_factor: 1.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Tebis mill-turn integration", "Seamless milling-turning workflow"], suitable_features: ["turning_external"], description: "External turning operations integrated with Tebis mill-turn workflow" },
  { name: "turning_internal", category: "turning", ae_pct: 50, ap_factor: 1.2, vc_multiplier: 0.9, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 6, tool_life_rating: 6, unique_advantages: ["Internal turning with bore bar management"], suitable_features: ["turning_internal", "bore"], description: "Internal turning and boring with tool deflection awareness" },
  { name: "nc_set_management", category: "specialty", ae_pct: 30, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Full NC Set template library", "Part family standardization", "One-click programming from template"], suitable_features: ["pocket", "contour", "freeform_3d", "face", "slot"], description: "NC Set management for template-based programming across part families" },
];

export class TebisStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("Tebis", TEBIS_STRATEGIES); }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. EDGECAM STRATEGY ENGINE — Hexagon
// ═════════════════════════════════════════════════════════════════════════════

const EDGECAM_STRATEGIES: CAMStrategy[] = [
  { name: "waveform_roughing", category: "roughing", ae_pct: 10, ap_factor: 2.5, vc_multiplier: 1.5, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 9, unique_advantages: ["Constant engagement trochoidal", "Waveform Technology patent", "40-60% cycle time reduction"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "Waveform roughing with constant tool engagement for maximum MRR and tool life" },
  { name: "strategy_manager", category: "roughing", ae_pct: 40, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Visual workflow programming", "Drag-and-drop strategy building"], suitable_features: ["pocket", "contour", "face", "slot"], description: "Strategy Manager visual workflow for automated machining sequence creation" },
  { name: "solid_machinist", category: "roughing", ae_pct: 45, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 8, tool_life_rating: 6, unique_advantages: ["Automatic feature recognition from solid model", "One-click programming for prismatic parts"], suitable_features: ["pocket", "contour", "slot", "face", "hole", "bore"], description: "Solid Machinist automatic feature recognition for instant toolpath generation" },
  { name: "profiling", category: "finishing", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Multi-pass profiling with stock allowance", "Automatic lead-in/lead-out"], suitable_features: ["contour", "pocket", "slot"], description: "Multi-pass profiling with automatic lead-in/out and stock allowance control" },
  { name: "pocketing", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Offset and zigzag pocket patterns", "Island avoidance"], suitable_features: ["pocket", "face"], description: "Standard pocketing with offset/zigzag patterns and island detection" },
  { name: "facing", category: "roughing", ae_pct: 65, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 6, unique_advantages: ["Full face surfacing", "Auto stock-to-leave"], suitable_features: ["face"], description: "Face milling with automatic stock-to-leave and efficient pass distribution" },
  { name: "drilling_cycles", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Full canned cycle support", "Peck, chip-break, tapping"], suitable_features: ["hole", "bore", "thread"], description: "Complete drilling cycle support with peck, chip-break, and tapping" },
  { name: "turning_rough", category: "turning", ae_pct: 60, ap_factor: 1.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Integrated turning in same environment", "Chuck/bar stock support"], suitable_features: ["turning_external", "turning_internal"], description: "Turning roughing with integrated lathe support and stock awareness" },
  { name: "turning_finish", category: "turning", ae_pct: 40, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Finish turning with nose radius compensation"], suitable_features: ["turning_external", "turning_internal"], description: "Finish turning with insert nose radius compensation and surface quality control" },
  { name: "turning_grooving", category: "turning", ae_pct: 100, ap_factor: 1.0, vc_multiplier: 0.9, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Multiple groove types", "Plunge and radial grooving"], suitable_features: ["groove"], description: "Grooving operations with plunge, radial, and face groove support" },
  { name: "five_axis_simultaneous", category: "multi_axis", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Simultaneous 5-axis contouring", "Automatic collision avoidance"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "Simultaneous 5-axis finishing with automatic collision avoidance" },
  { name: "five_axis_positional", category: "multi_axis", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["3+2 indexed positioning", "Multiple setup consolidation"], suitable_features: ["pocket", "contour", "face", "hole"], description: "3+2 positional machining for multi-face part access in single setup" },
  { name: "workflow_programming", category: "specialty", ae_pct: 30, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Visual workflow with decision logic", "Reusable strategy sequences", "Code-free process planning"], suitable_features: ["pocket", "contour", "freeform_3d", "face", "slot"], description: "Workflow Programming visual process builder for reusable machining sequences" },
  { name: "three_d_finishing", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Steep/shallow boundary detection", "Automatic strategy switching"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "3D finishing with automatic steep/shallow boundary detection" },
  { name: "rest_roughing", category: "roughing", ae_pct: 35, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["IPW-aware rest material detection", "Smaller tool follow-up"], suitable_features: ["pocket", "freeform_3d", "contour"], description: "Rest roughing with IPW-based remaining stock detection" },
];

export class EdgecamStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("Edgecam", EDGECAM_STRATEGIES); }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. ESPRIT STRATEGY ENGINE — Hexagon
// ═════════════════════════════════════════════════════════════════════════════

const ESPRIT_STRATEGIES: CAMStrategy[] = [
  { name: "profit_milling", category: "roughing", ae_pct: 8, ap_factor: 2.5, vc_multiplier: 1.5, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 9, unique_advantages: ["ProfitMilling trochoidal", "Constant chip load control", "Up to 70% cycle time reduction"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "ProfitMilling trochoidal roughing with constant engagement and maximum tool life" },
  { name: "profit_turning", category: "turning", ae_pct: 60, ap_factor: 1.5, vc_multiplier: 1.2, engagement_control: true, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 9, unique_advantages: ["ProfitTurning constant engagement", "Insert life extension 200-400%", "Smooth chip formation"], suitable_features: ["turning_external", "turning_internal"], description: "ProfitTurning with constant engagement angle for extended insert life" },
  { name: "freeform_3d", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["FreeForm 3D surface finishing", "Curvature-adaptive passes"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "FreeForm 3D finishing with curvature-adaptive stepover for optimal surface quality" },
  { name: "five_axis_simultaneous", category: "multi_axis", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Full 5-axis simultaneous", "Auto gouge protection", "Swarf machining"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "5-axis simultaneous machining with automatic gouge protection and swarf cutting" },
  { name: "swiss_type", category: "turning", ae_pct: 40, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 7, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Swiss-type lathe support", "Sliding headstock programming", "Sub-spindle synchronization"], suitable_features: ["turning_external", "turning_internal", "groove", "thread"], description: "Swiss-type lathe programming with sliding headstock and sub-spindle sync" },
  { name: "ai_feature_recognition", category: "roughing", ae_pct: 45, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 8, tool_life_rating: 6, unique_advantages: ["AI-based feature recognition", "Automatic strategy assignment", "Learning from past programs"], suitable_features: ["pocket", "contour", "slot", "face", "hole", "bore"], description: "AI-powered automatic feature recognition with intelligent strategy assignment" },
  { name: "digital_twin_verify", category: "specialty", ae_pct: 30, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 8, unique_advantages: ["Full digital twin simulation", "Machine kinematic verification", "Cycle time prediction"], suitable_features: ["pocket", "contour", "freeform_3d", "impeller"], description: "Digital twin machine simulation for toolpath verification before cutting" },
  { name: "pocket_milling", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Standard pocket clearing", "Island avoidance", "Helical entry"], suitable_features: ["pocket", "face"], description: "Standard pocket milling with helical entry and island detection" },
  { name: "contour_milling", category: "finishing", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Multi-pass contour finishing", "Automatic cutter compensation"], suitable_features: ["contour", "pocket", "slot"], description: "Multi-pass contour finishing with automatic cutter radius compensation" },
  { name: "drilling_cycles", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Complete drilling cycle library", "Custom cycle macro support"], suitable_features: ["hole", "bore", "thread"], description: "Full drilling cycle support with peck, chip-break, bore, and tapping" },
  { name: "turning_rough", category: "turning", ae_pct: 60, ap_factor: 1.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Longitudinal and face roughing", "Stock-aware cutting"], suitable_features: ["turning_external", "turning_internal"], description: "Turning roughing with longitudinal and face cutting stock awareness" },
  { name: "turning_finish", category: "turning", ae_pct: 40, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Finish turning with TNRC", "Surface quality optimization"], suitable_features: ["turning_external", "turning_internal"], description: "Finish turning with tool nose radius compensation for surface quality" },
  { name: "mill_turn", category: "multi_axis", ae_pct: 30, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Combined mill-turn programming", "C/Y axis milling on lathe"], suitable_features: ["pocket", "contour", "hole", "turning_external"], description: "Mill-turn combined operations with C-axis and Y-axis milling" },
  { name: "three_d_rest", category: "finishing", ae_pct: 20, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["3D rest finishing", "Previous tool stock detection"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "3D rest finishing targeting material left by previous larger tools" },
  { name: "wire_edm", category: "specialty", ae_pct: 100, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 4, tool_life_rating: 8, unique_advantages: ["2/4-axis wire EDM", "Taper cutting support", "No-core and skim passes"], suitable_features: ["contour", "slot"], description: "Wire EDM programming with 2/4-axis taper cutting and skim pass support" },
];

export class ESPRITStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("ESPRIT", ESPRIT_STRATEGIES); }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. GIBBSCAM STRATEGY ENGINE — 3D Systems
// ═════════════════════════════════════════════════════════════════════════════

const GIBBSCAM_STRATEGIES: CAMStrategy[] = [
  { name: "volumill", category: "roughing", ae_pct: 10, ap_factor: 2.5, vc_multiplier: 1.5, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 9, unique_advantages: ["VoluMill integration", "Constant chip thickness", "Ultra-high MRR roughing"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "VoluMill integrated roughing with constant chip thickness and engagement control" },
  { name: "tms_tombstone", category: "specialty", ae_pct: 40, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 9, tool_life_rating: 6, unique_advantages: ["Tombstone multi-part machining", "TMS tile management", "Part duplication on fixture"], suitable_features: ["pocket", "contour", "face", "hole"], description: "TMS tombstone machining for multi-part fixture programming with tile management" },
  { name: "mtm_multiaxis", category: "multi_axis", ae_pct: 20, ap_factor: 0.6, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Multi-Task Machining", "Simultaneous multi-channel", "Sync and wait management"], suitable_features: ["freeform_3d", "turning_external", "turning_internal", "contour"], description: "Multi-Task Machining for mill-turn centers with channel synchronization" },
  { name: "two_axis_milling", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Drag-and-drop 2D milling", "Visual geometry selection"], suitable_features: ["pocket", "contour", "face", "slot"], description: "2-axis milling with GibbsCAM drag-and-drop visual programming interface" },
  { name: "three_axis_milling", category: "roughing", ae_pct: 45, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["3D roughing and finishing", "Stock model tracking"], suitable_features: ["freeform_3d", "pocket", "contour"], description: "3-axis milling with stock model tracking for efficient material removal" },
  { name: "five_axis_milling", category: "multi_axis", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Simultaneous 5-axis", "Swarf and flow cutting", "Automatic tilt optimization"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "5-axis simultaneous milling with swarf cutting and automatic tilt control" },
  { name: "turning_rough", category: "turning", ae_pct: 60, ap_factor: 1.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Visual turning programming", "Stock-aware rough turning"], suitable_features: ["turning_external", "turning_internal"], description: "Turning roughing with GibbsCAM visual programming and stock awareness" },
  { name: "turning_finish", category: "turning", ae_pct: 40, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Finish turning with TNRC", "Profile and face finishing"], suitable_features: ["turning_external", "turning_internal"], description: "Finish turning with tool nose radius compensation and profile control" },
  { name: "mill_turn", category: "multi_axis", ae_pct: 30, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Mill-turn combined programming", "Live tooling support", "Sub-spindle transfer"], suitable_features: ["pocket", "contour", "turning_external", "hole"], description: "Mill-turn programming with live tooling and sub-spindle part transfer" },
  { name: "swiss_type", category: "turning", ae_pct: 35, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 7, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Swiss-type lathe support", "Guide bushing programming", "Multi-channel synchronization"], suitable_features: ["turning_external", "turning_internal", "groove", "thread"], description: "Swiss-type lathe with guide bushing, multi-spindle, and back-working" },
  { name: "profiling", category: "finishing", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Profile finishing with stock offset", "Multi-pass wall finishing"], suitable_features: ["contour", "pocket", "slot"], description: "Profile finishing with controlled stock offset and multi-pass wall cleanup" },
  { name: "drilling", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Full canned cycle support", "Pattern recognition for holes"], suitable_features: ["hole", "bore", "thread"], description: "Complete drilling with hole pattern recognition and canned cycle support" },
  { name: "three_d_finishing", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Waterline and raster finishing", "Steep/shallow segregation"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "3D finishing with waterline, raster, and steep/shallow boundary detection" },
  { name: "drag_drop_programming", category: "specialty", ae_pct: 40, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 6, unique_advantages: ["Drag-and-drop interface", "Visual geometry-to-toolpath", "No command line needed"], suitable_features: ["pocket", "contour", "face", "slot", "hole"], description: "GibbsCAM signature drag-and-drop visual programming interface" },
  { name: "rest_roughing", category: "roughing", ae_pct: 35, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["IPW-based rest detection", "Progressive tool reduction"], suitable_features: ["pocket", "freeform_3d", "contour"], description: "Rest roughing using in-process workpiece for remaining stock detection" },
];

export class GibbsCAMStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("GibbsCAM", GIBBSCAM_STRATEGIES); }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. CAMWORKS STRATEGY ENGINE — HCL Technologies
// ═════════════════════════════════════════════════════════════════════════════

const CAMWORKS_STRATEGIES: CAMStrategy[] = [
  { name: "techdb_roughing", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["TechDB knowledge-based automation", "Feature-to-strategy mapping database", "Learning from past programs"], suitable_features: ["pocket", "contour", "slot", "face"], description: "TechDB-driven roughing with knowledge-based automatic strategy selection" },
  { name: "afr_machining", category: "roughing", ae_pct: 45, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 8, tool_life_rating: 6, unique_advantages: ["Automatic Feature Recognition", "SolidWorks-native feature detection", "One-click toolpath generation"], suitable_features: ["pocket", "contour", "slot", "face", "hole", "bore"], description: "Automatic Feature Recognition for instant SolidWorks-integrated machining" },
  { name: "tbm_tolerance", category: "finishing", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Tolerance Based Machining", "GD&T-driven toolpath generation", "Automatic tolerance interpretation"], suitable_features: ["contour", "pocket", "bore", "face", "slot"], description: "Tolerance Based Machining (TBM) driven by GD&T for precision finishing" },
  { name: "volumill_roughing", category: "roughing", ae_pct: 10, ap_factor: 2.5, vc_multiplier: 1.5, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 9, unique_advantages: ["VoluMill constant engagement", "Integrated in CAMWorks", "Ultra-high MRR"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "VoluMill integration for constant-engagement high-speed roughing" },
  { name: "two_five_d_pocket", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["2.5D pocket with island support", "Auto step-down management"], suitable_features: ["pocket", "face"], description: "2.5D pocket roughing with automatic island detection and step-down" },
  { name: "two_five_d_contour", category: "finishing", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Multi-pass contour finishing", "Wall and floor modes"], suitable_features: ["contour", "pocket", "slot"], description: "2.5D contour finishing with multi-pass wall and floor finishing modes" },
  { name: "three_d_rough", category: "roughing", ae_pct: 45, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["3D rough with IPW tracking", "Offset and plunge roughing"], suitable_features: ["freeform_3d", "pocket", "contour"], description: "3D roughing with in-process workpiece tracking for stock management" },
  { name: "three_d_finish", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Waterline, raster, spiral patterns", "Curvature-adaptive stepover"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "3D finishing with waterline, raster, and curvature-adaptive stepover" },
  { name: "five_axis_simultaneous", category: "multi_axis", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Simultaneous 5-axis contouring", "Swarf and flow line machining"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "5-axis simultaneous machining with swarf cutting and flow-line support" },
  { name: "five_axis_positional", category: "multi_axis", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["3+2 indexed machining", "Multi-face access in one setup"], suitable_features: ["pocket", "contour", "face", "hole"], description: "3+2 positional machining for multi-face features in a single setup" },
  { name: "turning_rough", category: "turning", ae_pct: 60, ap_factor: 1.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["SolidWorks-integrated turning", "AFR for turning features"], suitable_features: ["turning_external", "turning_internal"], description: "Turning roughing with SolidWorks-integrated feature recognition" },
  { name: "turning_finish", category: "turning", ae_pct: 40, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Finish turning with TNRC", "Profile and facing finish"], suitable_features: ["turning_external", "turning_internal"], description: "Finish turning with nose radius compensation and surface quality control" },
  { name: "drilling_cycles", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["TechDB-driven cycle selection", "Auto cycle type from feature geometry"], suitable_features: ["hole", "bore", "thread"], description: "TechDB-driven drilling with automatic cycle selection from feature geometry" },
  { name: "solidworks_integration", category: "specialty", ae_pct: 30, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Native SolidWorks Gold Partner", "Associative model updates", "Design change auto-update toolpaths"], suitable_features: ["pocket", "contour", "freeform_3d", "face", "slot"], description: "SolidWorks-native integration with associative model-to-toolpath updates" },
  { name: "knowledge_automation", category: "specialty", ae_pct: 35, ap_factor: 0.9, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 7, cycle_time_rating: 9, tool_life_rating: 7, unique_advantages: ["TechDB learning system", "Best practice capture", "Repeatable manufacturing intelligence"], suitable_features: ["pocket", "contour", "face", "slot", "hole"], description: "Knowledge-based automation capturing and reusing proven manufacturing practices" },
];

export class CAMWorksStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("CAMWorks", CAMWORKS_STRATEGIES); }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. SPRUTCAM STRATEGY ENGINE — SprutCAM Tech
// ═════════════════════════════════════════════════════════════════════════════

const SPRUTCAM_STRATEGIES: CAMStrategy[] = [
  { name: "waterline_roughing", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Z-level waterline roughing", "Automatic stock tracking"], suitable_features: ["pocket", "freeform_3d", "contour"], description: "Waterline Z-level roughing with automatic in-process stock tracking" },
  { name: "constant_step_finishing", category: "finishing", ae_pct: 15, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Constant scallop height", "Curvature-adaptive stepover"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "Constant-step finishing maintaining uniform scallop height across curvature changes" },
  { name: "spiral_finishing", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Continuous spiral passes", "No retract/reposition moves", "Smooth surface finish"], suitable_features: ["freeform_3d", "flat_area"], description: "Spiral finishing with continuous passes eliminating retract marks" },
  { name: "five_axis_simultaneous", category: "multi_axis", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Simultaneous 5-axis contouring", "Gouge-free toolpath", "Tool axis smoothing"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "5-axis simultaneous finishing with automatic gouge protection and axis smoothing" },
  { name: "robot_machining", category: "specialty", ae_pct: 30, ap_factor: 0.8, vc_multiplier: 0.8, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 6, cycle_time_rating: 6, tool_life_rating: 6, unique_advantages: ["6+ axis robot programming", "Singularity avoidance", "Large workspace utilization"], suitable_features: ["freeform_3d", "contour", "face"], description: "Industrial robot machining with singularity avoidance and large workspace support" },
  { name: "hybrid_additive", category: "specialty", ae_pct: 20, ap_factor: 0.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 4, tool_life_rating: 7, unique_advantages: ["Additive + subtractive hybrid", "DED laser deposition + milling", "Near-net-shape then finish"], suitable_features: ["freeform_3d", "contour", "face"], description: "Hybrid additive-subtractive manufacturing combining DED deposition with milling" },
  { name: "wire_edm", category: "specialty", ae_pct: 100, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 4, tool_life_rating: 8, unique_advantages: ["2/4-axis wire EDM", "Taper cutting", "No-core cutting support"], suitable_features: ["contour", "slot"], description: "Wire EDM with 2/4-axis taper cutting and optimized flush parameters" },
  { name: "turning_rough", category: "turning", ae_pct: 60, ap_factor: 1.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Multi-pass turning roughing", "C-axis milling support"], suitable_features: ["turning_external", "turning_internal"], description: "Turning roughing with stock-aware multi-pass and C-axis milling integration" },
  { name: "turning_finish", category: "turning", ae_pct: 40, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Finish turning with TNRC", "Threading support"], suitable_features: ["turning_external", "turning_internal", "thread"], description: "Finish turning with nose radius compensation and single/multi-start threading" },
  { name: "adaptive_roughing", category: "roughing", ae_pct: 10, ap_factor: 2.5, vc_multiplier: 1.4, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 9, unique_advantages: ["Constant engagement roughing", "Trochoidal-style material removal"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "Adaptive roughing with constant engagement angle for HSM roughing" },
  { name: "pocket_milling", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Standard pocket clearing", "Helical and ramp entry"], suitable_features: ["pocket", "face"], description: "Standard pocket milling with helical/ramp entry and island avoidance" },
  { name: "drilling_cycles", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Full canned cycle support", "Multi-axis drilling"], suitable_features: ["hole", "bore", "thread"], description: "Drilling with full canned cycle support including 5-axis positioned holes" },
  { name: "rest_machining", category: "finishing", ae_pct: 20, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["IPW-based rest detection", "Corner cleanup with small tools"], suitable_features: ["freeform_3d", "pocket", "contour"], description: "Rest machining targeting material remaining from previous operations" },
  { name: "five_axis_positional", category: "multi_axis", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["3+2 indexed positioning", "Auto work coordinate setup"], suitable_features: ["pocket", "contour", "face", "hole"], description: "3+2 positional machining with automatic work coordinate setup" },
  { name: "robot_trimming", category: "specialty", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 0.8, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 6, cycle_time_rating: 5, tool_life_rating: 6, unique_advantages: ["Robot-based trimming and deburring", "Composite trimming", "Force-controlled finishing"], suitable_features: ["contour", "face", "ruled_surface"], description: "Robot trimming and deburring for composites and large-format parts" },
];

export class SprutCAMStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("SprutCAM", SPRUTCAM_STRATEGIES); }
}

// ─── Singleton Exports ───────────────────────────────────────────────────────

export const tebisStrategyEngine = new TebisStrategyEngine();
export const edgecamStrategyEngine = new EdgecamStrategyEngine();
export const espritStrategyEngine = new ESPRITStrategyEngine();
export const gibbsCAMStrategyEngine = new GibbsCAMStrategyEngine();
export const camWorksStrategyEngine = new CAMWorksStrategyEngine();
export const sprutCAMStrategyEngine = new SprutCAMStrategyEngine();
