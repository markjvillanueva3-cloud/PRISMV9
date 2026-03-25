// @ts-nocheck
/**
 * BatchCAMStrategyEngines2 — 4 Lightweight CAM Strategy Engines in One File
 *
 * Covers WorkNC, TopSolid, BobCAD-CAM, Cimatron.
 * Each engine: 12 strategies, recommend/getParameters/listStrategies interface.
 *
 * @engine BatchCAMStrategyEngines2
 * @shortcode E1110
 * @dispatcher camDispatcher
 * @actions worknc_strategy_recommend, worknc_strategy_list,
 *          topsolid_strategy_recommend, topsolid_strategy_list,
 *          bobcad_strategy_recommend, bobcad_strategy_list,
 *          cimatron_strategy_recommend, cimatron_strategy_list
 * @milestone CAMX-MS6/U02
 */

import type {
  CAMStrategy,
  StrategyCategory,
  FeatureType,
  MaterialGroup,
  Priority,
  StrategyRecommendation,
} from "./BatchCAMStrategyEngines.js";

// ─── Base Engine (re-exported pattern from E1109) ─────────────────────────────

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

      if (s.suitable_features.includes(feature.type)) score += 10;
      if (feature.axis_count === 5 && s.five_axis_capable) score += 12;
      if (feature.axis_count === 5 && !s.five_axis_capable) score -= 20;
      if (feature.has_previous_roughing && s.category === "finishing") score += 8;
      if (!feature.has_previous_roughing && s.category === "roughing") score += 5;
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
// 1. WORKNC STRATEGY ENGINE — Hexagon WorkNC
// Flagship: Auto 5-axis collision-free toolpaths, Wave Form roughing
// ═════════════════════════════════════════════════════════════════════════════

const WORKNC_STRATEGIES: CAMStrategy[] = [
  { name: "auto_5axis", category: "multi_axis", ae_pct: 15, ap_factor: 0.3, vc_multiplier: 1.3, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Automatic collision-free 5-axis", "No manual tool axis setup", "WorkNC patent: auto-tilt from stock"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "Auto 5-axis flagship: automatically computes collision-free 5-axis toolpaths without manual intervention" },
  { name: "waveform_roughing", category: "roughing", ae_pct: 10, ap_factor: 2.5, vc_multiplier: 1.5, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 9, unique_advantages: ["Constant engagement trochoidal", "WorkNC Waveform patent", "40-60% cycle time reduction"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "Wave Form roughing with constant engagement for maximum MRR and extended tool life" },
  { name: "global_finishing", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.3, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Global surface finishing in one pass", "Curvature-adaptive stepover", "Steep/shallow split automatic"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "Global finishing strategy covering entire part surface with adaptive stepover control" },
  { name: "remachining", category: "finishing", ae_pct: 20, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Automatic rest material detection", "Previous tool diameter awareness", "Corner and slot cleanup"], suitable_features: ["freeform_3d", "pocket", "contour", "groove"], description: "Re-machining with automatic detection of material remaining after larger tool passes" },
  { name: "z_level_finishing", category: "finishing", ae_pct: 15, ap_factor: 0.25, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Constant Z-level passes", "Optimal for steep walls", "Arc-smoothed cornering"], suitable_features: ["steep_wall", "contour", "freeform_3d"], description: "Z-level finishing with constant depth passes ideal for steep-walled geometry" },
  { name: "3d_hsm", category: "roughing", ae_pct: 12, ap_factor: 2.0, vc_multiplier: 1.4, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 9, tool_life_rating: 8, unique_advantages: ["3D HSM toolpath generation", "Stock-aware depth control", "Smooth transition moves"], suitable_features: ["pocket", "freeform_3d", "contour", "slot"], description: "3D high-speed machining with engagement control and smooth transition arcs" },
  { name: "drilling", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Full canned cycle mapping", "5-axis drill positioning", "Automatic spot/drill/tap sequencing"], suitable_features: ["hole", "bore", "thread"], description: "Drilling with full cycle support and 5-axis positioning capability" },
  { name: "pencil_finishing", category: "finishing", ae_pct: 8, ap_factor: 0.1, vc_multiplier: 1.3, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 4, tool_life_rating: 6, unique_advantages: ["Corner and concavity cleanup", "Ball-end pencil tracing", "Automatic concave detection"], suitable_features: ["freeform_3d", "groove", "contour"], description: "Pencil tracing for corner cleanup in concave regions inaccessible by larger tools" },
  { name: "five_axis_swarf", category: "multi_axis", ae_pct: 100, ap_factor: 0.8, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Flank milling of ruled surfaces", "Side of cutter engagement", "One-pass wall finishing"], suitable_features: ["ruled_surface", "steep_wall", "impeller"], description: "5-axis swarf milling engaging the cutter flank against ruled and near-ruled surfaces" },
  { name: "rest_roughing", category: "roughing", ae_pct: 40, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["IPW-based rest detection", "Smaller tool follow-up", "Automatic depth limiting"], suitable_features: ["pocket", "freeform_3d", "contour"], description: "Rest roughing targeting material left by previous larger tool operations" },
  { name: "flat_area_finishing", category: "finishing", ae_pct: 25, ap_factor: 0.2, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Automatic flat area detection", "Face-mill style finishing", "Optimized pass distribution"], suitable_features: ["flat_area", "face", "freeform_3d"], description: "Flat area finishing with automatic detection and face-mill-style pass distribution" },
  { name: "five_axis_positional", category: "multi_axis", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["3+2 indexed machining", "Auto work coordinate generation", "Collision-checked tilt angles"], suitable_features: ["pocket", "contour", "face", "hole"], description: "3+2 positional machining with collision-checked tilt angle selection" },
];

export class WorkNCStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("WorkNC", WORKNC_STRATEGIES); }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. TOPSOLID STRATEGY ENGINE — Missler Software TopSolid
// Flagship: Integrated CAD+CAM with auto feature recognition
// ═════════════════════════════════════════════════════════════════════════════

const TOPSOLID_STRATEGIES: CAMStrategy[] = [
  { name: "integrated_cadcam", category: "specialty", ae_pct: 30, ap_factor: 0.8, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Full associative CAD+CAM", "Design change auto-updates toolpaths", "Single-environment workflow"], suitable_features: ["pocket", "contour", "freeform_3d", "face", "slot"], description: "Integrated CAD+CAM flagship: design-to-toolpath in one associative environment with auto-update on design changes" },
  { name: "auto_feature_recognition", category: "specialty", ae_pct: 40, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 8, tool_life_rating: 6, unique_advantages: ["Automatic pocket/hole/boss detection", "One-click toolpath from solid", "Feature knowledge base"], suitable_features: ["pocket", "hole", "bore", "contour", "slot", "face"], description: "Auto feature recognition generating toolpaths from solid model features without manual selection" },
  { name: "roughing_pocket", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Associative stock tracking", "Offset and zigzag patterns", "Island-aware clearing"], suitable_features: ["pocket", "face", "slot"], description: "Pocket roughing with associative stock tracking and automatic island avoidance" },
  { name: "hsm_roughing", category: "roughing", ae_pct: 10, ap_factor: 2.5, vc_multiplier: 1.5, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 9, unique_advantages: ["Constant engagement trochoidal", "Smooth curvature arcs", "Deep axial light radial"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "HSM roughing with constant engagement and smooth arc transitions for maximum MRR" },
  { name: "three_d_finishing", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Curvature-adaptive stepover", "Automatic steep/shallow split", "Rest material detection"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "3D finishing with curvature-adaptive stepover and automatic steep/shallow region handling" },
  { name: "five_axis_finishing", category: "finishing", ae_pct: 10, ap_factor: 0.2, vc_multiplier: 1.3, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["Continuous 5-axis finishing", "Gouge-free toolpath", "Associative axis control"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "5-axis continuous finishing with gouge detection and smooth tool axis interpolation" },
  { name: "turning_roughing", category: "turning", ae_pct: 60, ap_factor: 1.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Integrated TopSolid Turn module", "Auto stock profile tracking", "Multi-pass stock removal"], suitable_features: ["turning_external", "turning_internal"], description: "Turning roughing within TopSolid Turn with associative stock profile and multi-pass removal" },
  { name: "turning_finishing", category: "turning", ae_pct: 40, ap_factor: 0.4, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Nose radius compensation", "Contour turning with undercuts", "Thread and groove cycles"], suitable_features: ["turning_external", "turning_internal", "groove", "thread"], description: "Finish turning with nose radius compensation and contour definition from 3D model" },
  { name: "mold_die_workflow", category: "specialty", ae_pct: 20, ap_factor: 0.4, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Mold/die specialized workflow", "Parting surface aware", "Electrode design integration"], suitable_features: ["freeform_3d", "steep_wall", "pocket", "flat_area"], description: "Mold and die machining workflow with parting surface awareness and electrode design support" },
  { name: "drilling_tapping", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Auto drill/tap cycle selection", "BOM-linked tool assignment", "Pattern recognition for hole arrays"], suitable_features: ["hole", "bore", "thread"], description: "Drilling and tapping with automatic cycle selection and BOM-linked tool assignment" },
  { name: "rest_machining", category: "finishing", ae_pct: 20, ap_factor: 0.3, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["IPW-based rest area detection", "Corner cleanup sequences", "Small tool follow-up"], suitable_features: ["freeform_3d", "pocket", "contour", "groove"], description: "Rest machining removing material in corners and radii inaccessible by previous tools" },
  { name: "five_axis_positional", category: "multi_axis", ae_pct: 30, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["3+2 indexed from CAD model", "Fixture collision avoidance", "Auto work offset generation"], suitable_features: ["pocket", "contour", "face", "hole"], description: "3+2 positional machining with automatic work offset generation and fixture collision avoidance" },
];

export class TopSolidStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("TopSolid", TOPSOLID_STRATEGIES); }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. BOBCAD STRATEGY ENGINE — BobCAD-CAM
// Flagship: Dynamic Machining (adaptive clearing) — affordable mid-market
// ═════════════════════════════════════════════════════════════════════════════

const BOBCAD_STRATEGIES: CAMStrategy[] = [
  { name: "dynamic_machining", category: "roughing", ae_pct: 10, ap_factor: 2.5, vc_multiplier: 1.5, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 9, tool_life_rating: 9, unique_advantages: ["BobCAD Dynamic Machining adaptive clearing", "Constant chip load trochoidal", "Mid-market HSM flagship"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "Dynamic Machining flagship: adaptive clearing with constant chip load for HSM roughing at mid-market price" },
  { name: "advanced_roughing", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Stock-aware offset roughing", "Helical entry support", "Island avoidance"], suitable_features: ["pocket", "face", "slot", "contour"], description: "Advanced roughing with stock awareness, helical entry and automatic island avoidance" },
  { name: "morph_between_curves", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Morph between two guide curves", "Smooth blend surface finishing", "Flow-line toolpaths"], suitable_features: ["freeform_3d", "ruled_surface", "steep_wall", "flat_area"], description: "Morph Between Curves finishing generating flow-line toolpaths between two guide curves" },
  { name: "contour_profiling", category: "finishing", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Multi-pass contour profiling", "Auto lead-in/out arcs", "Depth-of-cut control"], suitable_features: ["contour", "pocket", "slot"], description: "Contour profiling with automatic arc lead-in/out and multi-pass depth control" },
  { name: "two_five_d_pocketing", category: "roughing", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 5, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Standard 2.5D pocketing", "Ramp and helical entry", "Accessible mid-market toolpath"], suitable_features: ["pocket", "face", "slot"], description: "2.5D pocketing with ramp/helical entry — accessible and efficient for prismatic parts" },
  { name: "three_d_surfacing", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["3D surface finishing", "Curvature-adaptive passes", "Rest area detection"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "3D surface finishing with curvature-adaptive stepover and rest material detection" },
  { name: "four_axis_rotary", category: "multi_axis", ae_pct: 30, ap_factor: 0.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["4-axis rotary wrapping", "Cylindrical part machining", "A/B axis indexing support"], suitable_features: ["freeform_3d", "contour", "groove"], description: "4-axis rotary machining with wrapping and cylindrical part support" },
  { name: "five_axis_positional", category: "multi_axis", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["3+2 indexed 5-axis", "Undercut access", "Auto WCS generation"], suitable_features: ["pocket", "contour", "face", "hole"], description: "3+2 five-axis positional machining enabling undercut access with auto work coordinate setup" },
  { name: "mill_turn", category: "turning", ae_pct: 50, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Integrated mill-turn module", "Turning + milling in one setup", "C-axis and Y-axis support"], suitable_features: ["turning_external", "turning_internal", "groove", "thread", "hole"], description: "Mill-turn integration combining turning operations with milling in a single setup" },
  { name: "drilling_cycles", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Standard canned cycle mapping", "Drill pattern recognition", "Tapping and boring support"], suitable_features: ["hole", "bore", "thread"], description: "Drilling cycles with canned cycle mapping, pattern recognition, and tapping support" },
  { name: "engraving", category: "specialty", ae_pct: 100, ap_factor: 0.5, vc_multiplier: 0.8, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["V-bit engraving", "Text and logo machining", "Depth-variable engraving"], suitable_features: ["contour", "face", "flat_area"], description: "V-bit engraving for text, logos, and decorative features with depth-variable cutting" },
  { name: "five_axis_continuous", category: "multi_axis", ae_pct: 12, ap_factor: 0.3, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Simultaneous 5-axis finishing", "Gouge and collision avoidance", "Tool axis smoothing"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "Simultaneous 5-axis continuous finishing with automatic gouge avoidance and smooth axis motion" },
];

export class BobCADStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("BobCAD-CAM", BOBCAD_STRATEGIES); }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. CIMATRON STRATEGY ENGINE — 3D Systems Cimatron
// Flagship: VoluMill integration, mold/die focus, electrode extraction
// ═════════════════════════════════════════════════════════════════════════════

const CIMATRON_STRATEGIES: CAMStrategy[] = [
  { name: "volumill_roughing", category: "roughing", ae_pct: 10, ap_factor: 3.0, vc_multiplier: 1.6, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 10, tool_life_rating: 10, unique_advantages: ["VoluMill embedded trochoidal engine", "Industry-leading MRR", "Constant chip load with deep axial"], suitable_features: ["pocket", "contour", "slot", "freeform_3d"], description: "VoluMill-powered roughing flagship: best-in-class MRR with constant chip load trochoidal clearing" },
  { name: "micro_milling", category: "specialty", ae_pct: 5, ap_factor: 0.1, vc_multiplier: 1.2, engagement_control: true, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 10, cycle_time_rating: 4, tool_life_rating: 7, unique_advantages: ["Sub-0.1mm tolerance finishing", "Micro tool compensation", "High-RPM spindle optimization"], suitable_features: ["freeform_3d", "groove", "contour", "flat_area"], description: "Micro milling for precision mold features with sub-0.1mm tolerance and micro tool support" },
  { name: "rest_roughing", category: "roughing", ae_pct: 40, ap_factor: 1.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 4, cycle_time_rating: 7, tool_life_rating: 6, unique_advantages: ["Automatic IPW rest detection", "Mold cavity cleanup", "Small tool follow-up sequences"], suitable_features: ["pocket", "freeform_3d", "contour", "groove"], description: "Rest roughing targeting material remaining in mold cavities after primary tool passes" },
  { name: "z_level_finishing", category: "finishing", ae_pct: 15, ap_factor: 0.25, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Constant-Z mold wall finishing", "Steep surface optimization", "Draft angle awareness"], suitable_features: ["steep_wall", "contour", "freeform_3d"], description: "Z-level finishing optimized for steep mold walls with draft angle awareness" },
  { name: "three_d_finishing", category: "finishing", ae_pct: 12, ap_factor: 0.2, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 6, tool_life_rating: 7, unique_advantages: ["Curvature-adaptive finishing", "Parting line awareness", "Mold surface quality optimization"], suitable_features: ["freeform_3d", "steep_wall", "flat_area"], description: "3D curvature-adaptive finishing with parting line awareness for mold surface quality" },
  { name: "five_axis_finishing", category: "finishing", ae_pct: 10, ap_factor: 0.2, vc_multiplier: 1.3, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 5, tool_life_rating: 7, unique_advantages: ["5-axis mold finishing", "Undercut cavity access", "Collision-free tilt control"], suitable_features: ["freeform_3d", "impeller", "ruled_surface", "steep_wall"], description: "5-axis finishing for complex mold geometry including undercuts with collision-free tilt" },
  { name: "die_mold_workflow", category: "specialty", ae_pct: 20, ap_factor: 0.4, vc_multiplier: 1.2, engagement_control: false, hsm_capable: true, five_axis_capable: true, surface_finish_rating: 9, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Integrated mold design to CAM", "Parting surface automation", "Die casting workflow templates"], suitable_features: ["freeform_3d", "pocket", "steep_wall", "flat_area"], description: "Die and mold specialized workflow from design to machining with parting automation" },
  { name: "electrode_extraction", category: "specialty", ae_pct: 30, ap_factor: 0.5, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["Automatic EDM electrode extraction", "Electrode holder design", "EDM burn sequence generation"], suitable_features: ["freeform_3d", "pocket", "contour", "groove"], description: "Electrode extraction unique to Cimatron: automatic EDM electrode geometry from cavity model" },
  { name: "drilling_edm_prep", category: "drilling", ae_pct: 100, ap_factor: 3.0, vc_multiplier: 1.0, engagement_control: false, hsm_capable: false, five_axis_capable: false, surface_finish_rating: 6, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["EDM start-hole drilling", "Cooling channel drilling", "Ejector pin hole sequencing"], suitable_features: ["hole", "bore", "thread"], description: "Drilling optimized for mold work: EDM start holes, cooling channels, and ejector pin holes" },
  { name: "pencil_finishing", category: "finishing", ae_pct: 8, ap_factor: 0.1, vc_multiplier: 1.3, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 9, cycle_time_rating: 4, tool_life_rating: 6, unique_advantages: ["Corner cleanup in mold cavities", "Parting edge tracing", "Concave region targeting"], suitable_features: ["freeform_3d", "groove", "contour", "pocket"], description: "Pencil tracing for corner and parting edge cleanup in mold cavities" },
  { name: "flat_land_finishing", category: "finishing", ae_pct: 25, ap_factor: 0.2, vc_multiplier: 1.1, engagement_control: false, hsm_capable: true, five_axis_capable: false, surface_finish_rating: 8, cycle_time_rating: 8, tool_life_rating: 7, unique_advantages: ["Parting plane finishing", "Flat land identification", "Efficient face-mill passes"], suitable_features: ["flat_area", "face", "freeform_3d"], description: "Flat land finishing with automatic detection of parting planes and flat mold surfaces" },
  { name: "five_axis_positional", category: "multi_axis", ae_pct: 25, ap_factor: 0.5, vc_multiplier: 1.1, engagement_control: false, hsm_capable: false, five_axis_capable: true, surface_finish_rating: 7, cycle_time_rating: 7, tool_life_rating: 7, unique_advantages: ["3+2 mold feature access", "Side core machining", "Collision-checked positioning"], suitable_features: ["pocket", "contour", "face", "hole"], description: "3+2 positional machining for side cores and undercut mold features with collision checking" },
];

export class CimatronStrategyEngine extends BaseCAMStrategyEngine {
  constructor() { super("Cimatron", CIMATRON_STRATEGIES); }
}

// ─── Singleton Exports ────────────────────────────────────────────────────────

export const workNCStrategyEngine = new WorkNCStrategyEngine();
export const topSolidStrategyEngine = new TopSolidStrategyEngine();
export const bobCADStrategyEngine = new BobCADStrategyEngine();
export const cimatronStrategyEngine = new CimatronStrategyEngine();
