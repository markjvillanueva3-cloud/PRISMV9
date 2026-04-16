/**
 * LatheMachineIntelligenceEngine — Machine-Specific Intelligence for All Lathe Types
 * ====================================================================================
 * Comprehensive knowledge base for every lathe architecture and configuration:
 *
 *   Machine Types:
 *   1. 2-Axis CNC Turning Center — Standard turning
 *   2. Live Tooling / Mill-Turn — Driven tools, C-axis
 *   3. Swiss-Type (Sliding Headstock) — Small precision parts
 *   4. Vertical Turning Lathe (VTL) — Large diameter work
 *   5. Multi-Spindle Automatic — High-volume production
 *   6. Sub-Spindle Machine — Back-working, part transfer
 *   7. Y-Axis Machine — Off-center milling
 *   8. B-Axis Machine — Angular tool positioning
 *   9. Twin-Turret Machine — Simultaneous operations
 *   10. CNC Chucker — Short parts, no bar feed
 *   11. Manual Engine Lathe — Reference for manual operations
 *
 *   Capabilities:
 *   - Machine selection for part requirements
 *   - Capability matching and gap analysis
 *   - Configuration optimization
 *   - Workholding strategy per machine type
 *   - Tooling configuration recommendations
 *   - Cycle time estimation by machine type
 *
 * @module engines/LatheMachineIntelligenceEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-12
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Machine architecture types */
export type LatheMachineType =
  | "2_axis_cnc"
  | "live_tooling"
  | "swiss_type"
  | "vtl"
  | "multi_spindle"
  | "sub_spindle"
  | "y_axis"
  | "b_axis"
  | "twin_turret"
  | "cnc_chucker"
  | "manual_engine";

/** Axis configuration */
export interface AxisConfiguration {
  x_axis: boolean;
  z_axis: boolean;
  c_axis: boolean;       // Spindle positioning/interpolation
  y_axis: boolean;       // Off-center capability
  b_axis: boolean;       // Tool angle positioning
  w_axis: boolean;       // Sub-spindle Z
  sub_spindle: boolean;
  live_tooling: boolean;
  turrets: number;       // 1, 2, or more
  spindles: number;      // 1, 2, or multi
}

/** Machine capability profile */
export interface MachineCapabilityProfile {
  machine_type: LatheMachineType;
  description: string;
  axis_config: AxisConfiguration;

  // Size/capacity
  max_turning_diameter_mm: number;
  max_turning_length_mm: number;
  max_bar_capacity_mm: number;
  spindle_power_kw: number;
  max_rpm: number;

  // Precision
  positioning_accuracy_mm: number;
  repeatability_mm: number;
  surface_finish_achievable_ra: number;

  // Speed characteristics
  rapid_traverse_m_min: number;
  tool_change_time_sec: number;
  spindle_acceleration_time_sec: number;

  // Capabilities
  capable_operations: string[];
  best_suited_for: string[];
  limitations: string[];
  typical_applications: string[];

  // Cost/productivity
  relative_cost: "low" | "medium" | "high" | "very_high";
  typical_cycle_time_factor: number;  // 1.0 = baseline, <1 = faster
  setup_complexity: "simple" | "moderate" | "complex" | "very_complex";
}

/** Part requirements for machine selection */
export interface PartRequirements {
  max_diameter_mm: number;
  length_mm: number;
  material: string;
  hardness_hrc?: number;

  // Features
  has_od_features: boolean;
  has_id_features: boolean;
  has_threads: boolean;
  has_grooves: boolean;
  has_cross_holes: boolean;
  has_flats: boolean;
  has_polygons: boolean;
  has_off_center_features: boolean;
  has_angular_features: boolean;
  needs_back_working: boolean;

  // Precision
  tightest_tolerance_mm: number;
  best_surface_finish_ra: number;
  concentricity_requirement_mm?: number;

  // Production
  annual_volume: number;
  batch_size: number;
}

/** Machine selection result */
export interface MachineSelectionResult {
  recommended_machines: MachineRecommendation[];
  capability_matrix: CapabilityMatch[];
  selection_reasoning: string[];
  warnings: string[];
}

export interface MachineRecommendation {
  machine_type: LatheMachineType;
  suitability_score: number;  // 0-100
  strengths: string[];
  limitations_for_part: string[];
  estimated_cycle_time_factor: number;
  setup_considerations: string[];
  cost_effectiveness: "excellent" | "good" | "acceptable" | "poor";
}

export interface CapabilityMatch {
  requirement: string;
  machine_type: LatheMachineType;
  capable: boolean;
  notes: string;
}

/** Workholding strategy */
export interface WorkholdingStrategy {
  machine_type: LatheMachineType;
  primary_method: string;
  secondary_support: string[];
  jaw_type: string;
  special_fixtures: string[];
  considerations: string[];
  grip_length_recommendation_mm: number;
  maximum_rpm_with_workholding: number;
}

/** Tooling configuration */
export interface ToolingConfiguration {
  machine_type: LatheMachineType;
  turret_positions: number;
  live_tool_positions: number;
  recommended_tool_layout: ToolPosition[];
  tool_change_strategy: string;
  considerations: string[];
}

export interface ToolPosition {
  position: number;
  tool_type: string;
  purpose: string;
  is_live: boolean;
}

/** Machine comparison */
export interface MachineComparison {
  machines: LatheMachineType[];
  comparison_criteria: ComparisonCriterion[];
  recommendation: string;
  trade_offs: string[];
}

export interface ComparisonCriterion {
  criterion: string;
  scores: Record<LatheMachineType, number>;
  winner: LatheMachineType;
  notes: string;
}

// ============================================================================
// MACHINE DATABASE
// ============================================================================

const MACHINE_PROFILES: Record<LatheMachineType, Omit<MachineCapabilityProfile, "machine_type">> = {
  "2_axis_cnc": {
    description: "Standard 2-axis CNC turning center with X and Z axes",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: false, y_axis: false,
      b_axis: false, w_axis: false, sub_spindle: false,
      live_tooling: false, turrets: 1, spindles: 1,
    },
    max_turning_diameter_mm: 400,
    max_turning_length_mm: 600,
    max_bar_capacity_mm: 65,
    spindle_power_kw: 15,
    max_rpm: 4500,
    positioning_accuracy_mm: 0.005,
    repeatability_mm: 0.003,
    surface_finish_achievable_ra: 0.8,
    rapid_traverse_m_min: 30,
    tool_change_time_sec: 0.5,
    spindle_acceleration_time_sec: 2,
    capable_operations: [
      "OD turning", "ID boring", "facing", "grooving", "threading",
      "parting", "drilling (center)", "tapping (center)",
    ],
    best_suited_for: [
      "Round parts with OD/ID features",
      "Shafts, bushings, spacers",
      "Medium complexity parts",
      "Prototype to medium volume",
    ],
    limitations: [
      "No off-center features (no Y-axis)",
      "No milled features (no live tooling)",
      "Single setup - no back working",
      "Limited to rotational features",
    ],
    typical_applications: [
      "Automotive shafts", "Hydraulic fittings", "Bushings",
      "Spacers", "Adapters", "Couplings",
    ],
    relative_cost: "low",
    typical_cycle_time_factor: 1.0,
    setup_complexity: "simple",
  },

  live_tooling: {
    description: "Turning center with C-axis and driven (live) tools for milling operations",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: true, y_axis: false,
      b_axis: false, w_axis: false, sub_spindle: false,
      live_tooling: true, turrets: 1, spindles: 1,
    },
    max_turning_diameter_mm: 350,
    max_turning_length_mm: 500,
    max_bar_capacity_mm: 65,
    spindle_power_kw: 18,
    max_rpm: 5000,
    positioning_accuracy_mm: 0.005,
    repeatability_mm: 0.003,
    surface_finish_achievable_ra: 0.8,
    rapid_traverse_m_min: 30,
    tool_change_time_sec: 0.8,
    spindle_acceleration_time_sec: 2,
    capable_operations: [
      "OD turning", "ID boring", "facing", "grooving", "threading",
      "parting", "drilling", "tapping", "cross-drilling", "cross-milling",
      "hexagon milling", "keyway milling", "engraving", "C-axis contouring",
    ],
    best_suited_for: [
      "Parts needing turning AND milling",
      "Cross-holes, flats, hexagons",
      "Keyways, slots on OD",
      "One-setup complete machining",
    ],
    limitations: [
      "Limited milling power vs. machining center",
      "Y-axis features still on centerline only",
      "Live tool RPM typically lower than spindle RPM",
      "More complex programming",
    ],
    typical_applications: [
      "Hydraulic manifolds", "Valve bodies", "Fittings with flats",
      "Shafts with keyways", "Hex head parts",
    ],
    relative_cost: "medium",
    typical_cycle_time_factor: 0.7,  // Saves secondary ops
    setup_complexity: "moderate",
  },

  swiss_type: {
    description: "Swiss-type sliding headstock lathe for small precision parts",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: true, y_axis: true,
      b_axis: false, w_axis: true, sub_spindle: true,
      live_tooling: true, turrets: 2, spindles: 2,
    },
    max_turning_diameter_mm: 32,
    max_turning_length_mm: 200,
    max_bar_capacity_mm: 32,
    spindle_power_kw: 5,
    max_rpm: 12000,
    positioning_accuracy_mm: 0.002,
    repeatability_mm: 0.001,
    surface_finish_achievable_ra: 0.2,
    rapid_traverse_m_min: 40,
    tool_change_time_sec: 0.1,  // Gang tooling
    spindle_acceleration_time_sec: 0.5,
    capable_operations: [
      "Precision OD turning", "Precision ID boring", "facing", "grooving",
      "threading", "micro-drilling", "cross-drilling", "back-turning",
      "polygon turning", "deburring", "engraving",
    ],
    best_suited_for: [
      "Small diameter parts (< 32mm)",
      "Long slender parts (L/D > 4)",
      "High precision requirements",
      "High volume production",
      "Medical, watch, connector parts",
    ],
    limitations: [
      "Limited to small diameters",
      "Bar stock only (no chucking)",
      "Complex setup and programming",
      "Higher tooling costs",
    ],
    typical_applications: [
      "Medical bone screws", "Watch components", "Electrical connectors",
      "Aerospace fasteners", "Dental implants", "Precision pins",
    ],
    relative_cost: "high",
    typical_cycle_time_factor: 0.4,  // Very fast for suited parts
    setup_complexity: "very_complex",
  },

  vtl: {
    description: "Vertical Turning Lathe for large diameter, heavy parts",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: true, y_axis: false,
      b_axis: false, w_axis: false, sub_spindle: false,
      live_tooling: true, turrets: 1, spindles: 1,
    },
    max_turning_diameter_mm: 3000,
    max_turning_length_mm: 2000,
    max_bar_capacity_mm: 0,  // No bar feed
    spindle_power_kw: 75,
    max_rpm: 500,
    positioning_accuracy_mm: 0.01,
    repeatability_mm: 0.005,
    surface_finish_achievable_ra: 1.6,
    rapid_traverse_m_min: 20,
    tool_change_time_sec: 5,
    spindle_acceleration_time_sec: 10,
    capable_operations: [
      "Large diameter OD turning", "Large ID boring", "facing",
      "grooving", "threading (large pitch)", "drilling",
    ],
    best_suited_for: [
      "Large diameter parts (> 500mm)",
      "Heavy parts (gravity helps workholding)",
      "Rings, gears, flanges",
      "Parts that would flex horizontally",
    ],
    limitations: [
      "Large footprint",
      "Slow spindle speeds",
      "Limited to large parts",
      "Higher machine cost",
    ],
    typical_applications: [
      "Bearing races", "Large gears", "Turbine components",
      "Pressure vessel heads", "Large flanges", "Tire molds",
    ],
    relative_cost: "very_high",
    typical_cycle_time_factor: 1.5,  // Slower but handles big parts
    setup_complexity: "complex",
  },

  multi_spindle: {
    description: "Multi-spindle automatic for high-volume production",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: false, y_axis: false,
      b_axis: false, w_axis: false, sub_spindle: false,
      live_tooling: false, turrets: 6, spindles: 6,
    },
    max_turning_diameter_mm: 45,
    max_turning_length_mm: 100,
    max_bar_capacity_mm: 45,
    spindle_power_kw: 30,
    max_rpm: 6000,
    positioning_accuracy_mm: 0.01,
    repeatability_mm: 0.005,
    surface_finish_achievable_ra: 1.6,
    rapid_traverse_m_min: 30,
    tool_change_time_sec: 0,  // All tools engaged
    spindle_acceleration_time_sec: 1,
    capable_operations: [
      "OD turning", "ID boring", "drilling", "threading",
      "grooving", "parting", "form turning",
    ],
    best_suited_for: [
      "Very high volume (100K+ annually)",
      "Simple to medium complexity",
      "Small diameter parts",
      "Automotive, fastener industries",
    ],
    limitations: [
      "Long setup times (hours)",
      "Limited flexibility",
      "Requires dedicated tooling",
      "Not for low volumes",
    ],
    typical_applications: [
      "Automotive bolts/studs", "Plumbing fittings", "Fasteners",
      "Valve stems", "High-volume bushings",
    ],
    relative_cost: "very_high",
    typical_cycle_time_factor: 0.15,  // Extremely fast per part
    setup_complexity: "very_complex",
  },

  sub_spindle: {
    description: "Turning center with sub-spindle for complete back-working",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: true, y_axis: false,
      b_axis: false, w_axis: true, sub_spindle: true,
      live_tooling: true, turrets: 1, spindles: 2,
    },
    max_turning_diameter_mm: 300,
    max_turning_length_mm: 400,
    max_bar_capacity_mm: 65,
    spindle_power_kw: 22,
    max_rpm: 6000,
    positioning_accuracy_mm: 0.005,
    repeatability_mm: 0.002,
    surface_finish_achievable_ra: 0.4,
    rapid_traverse_m_min: 40,
    tool_change_time_sec: 0.5,
    spindle_acceleration_time_sec: 2,
    capable_operations: [
      "OD turning", "ID boring", "facing", "back-facing",
      "back-boring", "back-drilling", "back-threading",
      "part transfer", "simultaneous main/sub machining",
    ],
    best_suited_for: [
      "Parts requiring work on both ends",
      "Eliminating secondary operations",
      "High concentricity between features",
      "Complete parts in one setup",
    ],
    limitations: [
      "Higher machine cost",
      "More complex programming",
      "Sub-spindle smaller than main",
      "Part transfer adds cycle time",
    ],
    typical_applications: [
      "Fittings machined both ends", "Couplings", "Shafts with features on both ends",
      "Connectors", "Parts with ID threads on back",
    ],
    relative_cost: "high",
    typical_cycle_time_factor: 0.6,  // Saves secondary op
    setup_complexity: "complex",
  },

  y_axis: {
    description: "Turning center with Y-axis for off-center milling",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: true, y_axis: true,
      b_axis: false, w_axis: false, sub_spindle: false,
      live_tooling: true, turrets: 1, spindles: 1,
    },
    max_turning_diameter_mm: 350,
    max_turning_length_mm: 500,
    max_bar_capacity_mm: 65,
    spindle_power_kw: 22,
    max_rpm: 5000,
    positioning_accuracy_mm: 0.005,
    repeatability_mm: 0.003,
    surface_finish_achievable_ra: 0.8,
    rapid_traverse_m_min: 30,
    tool_change_time_sec: 0.8,
    spindle_acceleration_time_sec: 2,
    capable_operations: [
      "OD turning", "ID boring", "facing", "grooving", "threading",
      "off-center drilling", "off-center milling", "pocket milling",
      "true helical interpolation", "eccentric features",
    ],
    best_suited_for: [
      "Parts with off-center features",
      "Eccentric holes, pockets",
      "Complex mill-turn parts",
      "Eliminating secondary milling ops",
    ],
    limitations: [
      "Y-axis travel typically limited (50-100mm)",
      "Less rigid than dedicated mill for heavy milling",
      "Higher machine cost than basic live tooling",
    ],
    typical_applications: [
      "Pump bodies", "Valve bodies with ports", "Manifolds",
      "Parts with eccentric holes", "Complex fittings",
    ],
    relative_cost: "high",
    typical_cycle_time_factor: 0.6,
    setup_complexity: "complex",
  },

  b_axis: {
    description: "Turning center with B-axis for angular tool positioning",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: true, y_axis: true,
      b_axis: true, w_axis: false, sub_spindle: false,
      live_tooling: true, turrets: 1, spindles: 1,
    },
    max_turning_diameter_mm: 300,
    max_turning_length_mm: 400,
    max_bar_capacity_mm: 65,
    spindle_power_kw: 25,
    max_rpm: 5000,
    positioning_accuracy_mm: 0.003,
    repeatability_mm: 0.002,
    surface_finish_achievable_ra: 0.4,
    rapid_traverse_m_min: 30,
    tool_change_time_sec: 1.0,
    spindle_acceleration_time_sec: 2,
    capable_operations: [
      "OD turning", "ID boring", "angular drilling", "angular milling",
      "5-axis contouring", "complex surface machining", "undercut features",
      "angled ports", "true 5-axis mill-turn",
    ],
    best_suited_for: [
      "Complex aerospace parts",
      "Angular features and ports",
      "5-axis contour machining",
      "Parts that would need 5-axis mill + lathe",
    ],
    limitations: [
      "Highest machine cost",
      "Very complex programming",
      "Requires advanced CAM",
      "Limited tool selection for B-axis",
    ],
    typical_applications: [
      "Aerospace turbine components", "Complex valve bodies",
      "Medical implants", "Multi-angle port blocks",
    ],
    relative_cost: "very_high",
    typical_cycle_time_factor: 0.5,  // Eliminates multiple setups
    setup_complexity: "very_complex",
  },

  twin_turret: {
    description: "Turning center with two turrets for simultaneous operations",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: true, y_axis: false,
      b_axis: false, w_axis: false, sub_spindle: false,
      live_tooling: true, turrets: 2, spindles: 1,
    },
    max_turning_diameter_mm: 400,
    max_turning_length_mm: 600,
    max_bar_capacity_mm: 75,
    spindle_power_kw: 30,
    max_rpm: 4500,
    positioning_accuracy_mm: 0.005,
    repeatability_mm: 0.003,
    surface_finish_achievable_ra: 0.8,
    rapid_traverse_m_min: 35,
    tool_change_time_sec: 0.3,  // Two turrets = less indexing
    spindle_acceleration_time_sec: 2,
    capable_operations: [
      "Simultaneous OD/ID turning", "balanced cutting",
      "independent turret operations", "overlapped operations",
      "high-volume complex turning",
    ],
    best_suited_for: [
      "Complex parts with many operations",
      "Parts benefiting from balanced cutting",
      "High-volume production",
      "Cycle time critical applications",
    ],
    limitations: [
      "Higher cost",
      "More complex collision checking",
      "Requires synchronized programming",
      "Not all operations can be simultaneous",
    ],
    typical_applications: [
      "Complex automotive parts", "High-volume shafts",
      "Parts with many tools needed", "Production runs",
    ],
    relative_cost: "high",
    typical_cycle_time_factor: 0.5,  // Simultaneous ops
    setup_complexity: "complex",
  },

  cnc_chucker: {
    description: "CNC chucker lathe for short parts without bar feed",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: false, y_axis: false,
      b_axis: false, w_axis: false, sub_spindle: false,
      live_tooling: false, turrets: 1, spindles: 1,
    },
    max_turning_diameter_mm: 400,
    max_turning_length_mm: 200,
    max_bar_capacity_mm: 0,  // No bar feed
    spindle_power_kw: 18,
    max_rpm: 4000,
    positioning_accuracy_mm: 0.008,
    repeatability_mm: 0.004,
    surface_finish_achievable_ra: 1.6,
    rapid_traverse_m_min: 25,
    tool_change_time_sec: 0.5,
    spindle_acceleration_time_sec: 2,
    capable_operations: [
      "OD turning", "ID boring", "facing", "grooving",
      "threading", "drilling", "tapping",
    ],
    best_suited_for: [
      "Second-op work from castings/forgings",
      "Short parts from blanks",
      "Parts too large for bar feed",
      "Lower volume production",
    ],
    limitations: [
      "Manual or robot load required",
      "Longer load/unload time",
      "Can't do full-length bar work",
      "Lower automation potential",
    ],
    typical_applications: [
      "Forging/casting second ops", "Brake rotors", "Pulleys",
      "Flanges", "Short blanks",
    ],
    relative_cost: "low",
    typical_cycle_time_factor: 1.2,  // Load time adds
    setup_complexity: "simple",
  },

  manual_engine: {
    description: "Manual engine lathe for toolroom and prototype work",
    axis_config: {
      x_axis: true, z_axis: true, c_axis: false, y_axis: false,
      b_axis: false, w_axis: false, sub_spindle: false,
      live_tooling: false, turrets: 0, spindles: 1,
    },
    max_turning_diameter_mm: 500,
    max_turning_length_mm: 2000,
    max_bar_capacity_mm: 50,
    spindle_power_kw: 10,
    max_rpm: 2000,
    positioning_accuracy_mm: 0.025,
    repeatability_mm: 0.025,
    surface_finish_achievable_ra: 3.2,
    rapid_traverse_m_min: 5,
    tool_change_time_sec: 30,  // Manual change
    spindle_acceleration_time_sec: 3,
    capable_operations: [
      "OD turning", "ID boring", "facing", "threading (manual)",
      "knurling", "taper turning", "drilling",
    ],
    best_suited_for: [
      "One-off parts",
      "Prototype work",
      "Toolroom repairs",
      "Teaching and training",
    ],
    limitations: [
      "Operator skill dependent",
      "Not for production",
      "Lower precision than CNC",
      "Slower cycle times",
    ],
    typical_applications: [
      "Prototype parts", "Repair work", "Custom one-offs",
      "Training", "Toolroom fixtures",
    ],
    relative_cost: "low",
    typical_cycle_time_factor: 5.0,  // Much slower
    setup_complexity: "simple",
  },
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LatheMachineIntelligenceEngine {

  /**
   * Get capability profile for a specific machine type.
   */
  getMachineProfile(machineType: LatheMachineType): MachineCapabilityProfile {
    log.info(`[LatheMachineIntel] Getting profile for: ${machineType}`);

    const profile = MACHINE_PROFILES[machineType];
    if (!profile) {
      throw new Error(`Unknown machine type: ${machineType}`);
    }

    return {
      machine_type: machineType,
      ...profile,
    };
  }

  /**
   * Select best machine type(s) for given part requirements.
   */
  selectMachineForPart(requirements: PartRequirements): MachineSelectionResult {
    log.info(`[LatheMachineIntel] Selecting machine for part: ${requirements.max_diameter_mm}x${requirements.length_mm}mm`);

    const recommendations: MachineRecommendation[] = [];
    const capabilityMatrix: CapabilityMatch[] = [];
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Evaluate each machine type
    for (const [machineType, profile] of Object.entries(MACHINE_PROFILES)) {
      const type = machineType as LatheMachineType;
      const score = this.evaluateMachineForPart(type, profile, requirements);

      if (score.suitability > 0) {
        recommendations.push({
          machine_type: type,
          suitability_score: score.suitability,
          strengths: score.strengths,
          limitations_for_part: score.limitations,
          estimated_cycle_time_factor: profile.typical_cycle_time_factor,
          setup_considerations: score.setup_notes,
          cost_effectiveness: this.rateCostEffectiveness(score.suitability, profile.relative_cost),
        });
      }

      // Build capability matrix
      score.capability_checks.forEach(check => {
        capabilityMatrix.push({
          requirement: check.requirement,
          machine_type: type,
          capable: check.capable,
          notes: check.notes,
        });
      });
    }

    // Sort by suitability
    recommendations.sort((a, b) => b.suitability_score - a.suitability_score);

    // Build reasoning
    if (recommendations.length > 0) {
      const best = recommendations[0];
      reasoning.push(`Best match: ${best.machine_type} with ${best.suitability_score}% suitability`);
      reasoning.push(`Key strengths: ${best.strengths.slice(0, 3).join(", ")}`);

      if (recommendations.length > 1) {
        reasoning.push(`Alternative: ${recommendations[1].machine_type} (${recommendations[1].suitability_score}%)`);
      }
    }

    // Add warnings
    if (requirements.has_cross_holes && !recommendations.some(r => r.machine_type.includes("live"))) {
      warnings.push("Cross-holes require live tooling or secondary operation");
    }
    if (requirements.needs_back_working && !recommendations.some(r =>
      MACHINE_PROFILES[r.machine_type].axis_config.sub_spindle)) {
      warnings.push("Back-working features require sub-spindle or secondary setup");
    }
    if (requirements.max_diameter_mm > 100 && recommendations.some(r => r.machine_type === "swiss_type")) {
      warnings.push("Part too large for Swiss-type machine");
    }

    return {
      recommended_machines: recommendations.slice(0, 5),
      capability_matrix: capabilityMatrix,
      selection_reasoning: reasoning,
      warnings,
    };
  }

  /**
   * Get workholding strategy for machine and part.
   */
  getWorkholdingStrategy(
    machineType: LatheMachineType,
    partDiameter_mm: number,
    partLength_mm: number,
    isBarStock: boolean,
    wallThickness_mm?: number
  ): WorkholdingStrategy {
    log.info(`[LatheMachineIntel] Getting workholding for ${machineType}`);

    const profile = MACHINE_PROFILES[machineType];
    const ldRatio = partLength_mm / partDiameter_mm;

    let primaryMethod: string;
    let secondarySupport: string[] = [];
    let jawType: string;
    let specialFixtures: string[] = [];
    let considerations: string[] = [];
    let gripLength = Math.max(partDiameter_mm * 0.75, 15);
    let maxRpm = profile.max_rpm;

    // Determine primary workholding
    if (machineType === "swiss_type") {
      primaryMethod = "Guide bushing + collet";
      jawType = "Collet (matched to bar size)";
      considerations.push("Guide bushing must match bar diameter precisely");
      considerations.push("Bar straightness critical for Swiss operation");
    } else if (isBarStock && partDiameter_mm <= profile.max_bar_capacity_mm) {
      primaryMethod = "Collet chuck with bar feeder";
      jawType = "Collet or pie jaws";
      considerations.push("Bar end facing required between parts");
    } else if (machineType === "vtl") {
      primaryMethod = "Face plate or large jaw chuck";
      jawType = "Special jaws or T-slot plate";
      considerations.push("Part weight assists workholding");
      considerations.push("Proper leveling critical for large parts");
    } else {
      primaryMethod = "3-jaw chuck";
      jawType = "Standard hard jaws or soft jaws";
    }

    // Determine if secondary support needed
    if (ldRatio > 3 && !machineType.includes("swiss")) {
      secondarySupport.push("Tailstock with live center");
      considerations.push(`L/D ratio ${ldRatio.toFixed(1)} requires tailstock support`);
    }
    if (ldRatio > 6) {
      secondarySupport.push("Steady rest at midpoint");
      considerations.push("Very long part - steady rest essential");
    }

    // Thin wall considerations
    if (wallThickness_mm && wallThickness_mm < partDiameter_mm * 0.1) {
      jawType = "Soft jaws bored in place";
      specialFixtures.push("Expanding mandrel for ID gripping");
      considerations.push("Reduce chuck pressure - thin wall risk");
      maxRpm = Math.min(maxRpm, 3000);  // Limit speed for thin walls
    }

    // Machine-specific considerations
    if (profile.axis_config.sub_spindle) {
      considerations.push("Sub-spindle can grip part for back-working");
      considerations.push("Plan part transfer point carefully");
    }

    return {
      machine_type: machineType,
      primary_method: primaryMethod,
      secondary_support: secondarySupport,
      jaw_type: jawType,
      special_fixtures: specialFixtures,
      considerations,
      grip_length_recommendation_mm: gripLength,
      maximum_rpm_with_workholding: maxRpm,
    };
  }

  /**
   * Get tooling configuration for machine type.
   */
  getToolingConfiguration(
    machineType: LatheMachineType,
    operations: string[]
  ): ToolingConfiguration {
    log.info(`[LatheMachineIntel] Getting tooling config for ${machineType}`);

    const profile = MACHINE_PROFILES[machineType];

    let turretPositions = 12;  // Default
    let livePositions = 0;
    const layout: ToolPosition[] = [];
    const considerations: string[] = [];

    // Adjust based on machine type
    switch (machineType) {
      case "swiss_type":
        turretPositions = 7;  // Gang tooling typical
        livePositions = 5;
        considerations.push("Gang tooling - minimize tool changes");
        considerations.push("Plan for simultaneous cutting on main/sub");
        break;
      case "multi_spindle":
        turretPositions = 6;  // One per spindle
        considerations.push("Each station has dedicated tooling");
        considerations.push("Minimize tool changes - slow cycle impact");
        break;
      case "twin_turret":
        turretPositions = 24;  // 12 per turret
        livePositions = 6;
        considerations.push("Balance tool count between turrets");
        considerations.push("Plan for simultaneous operations");
        break;
      default:
        turretPositions = 12;
        livePositions = profile.axis_config.live_tooling ? 6 : 0;
    }

    // Build recommended layout based on operations
    let position = 1;

    if (operations.includes("roughing") || operations.includes("OD turning")) {
      layout.push({ position: position++, tool_type: "OD Rough (CNMG)", purpose: "Heavy OD removal", is_live: false });
    }
    if (operations.includes("finishing")) {
      layout.push({ position: position++, tool_type: "OD Finish (DNMG/VNMG)", purpose: "OD finishing", is_live: false });
    }
    if (operations.includes("boring") || operations.includes("ID")) {
      layout.push({ position: position++, tool_type: "Boring bar", purpose: "ID boring", is_live: false });
    }
    if (operations.includes("drilling")) {
      layout.push({ position: position++, tool_type: "Center drill", purpose: "Spot/center", is_live: false });
      layout.push({ position: position++, tool_type: "Twist drill", purpose: "Drilling", is_live: false });
    }
    if (operations.includes("threading")) {
      layout.push({ position: position++, tool_type: "Thread insert", purpose: "OD threading", is_live: false });
    }
    if (operations.includes("grooving")) {
      layout.push({ position: position++, tool_type: "Grooving insert", purpose: "OD grooves", is_live: false });
    }
    if (operations.includes("parting")) {
      layout.push({ position: position++, tool_type: "Parting blade", purpose: "Cut-off", is_live: false });
    }

    // Live tools if available
    if (profile.axis_config.live_tooling) {
      if (operations.includes("cross-drilling") || operations.includes("milling")) {
        layout.push({ position: position++, tool_type: "Live drill", purpose: "Cross-drilling", is_live: true });
      }
      if (operations.includes("milling") || operations.includes("flats")) {
        layout.push({ position: position++, tool_type: "End mill", purpose: "Milling features", is_live: true });
      }
    }

    return {
      machine_type: machineType,
      turret_positions: turretPositions,
      live_tool_positions: livePositions,
      recommended_tool_layout: layout,
      tool_change_strategy: machineType === "swiss_type" ? "Gang tooling - simultaneous" : "Turret index",
      considerations,
    };
  }

  /**
   * Compare multiple machine types for a given application.
   */
  compareMachines(
    machineTypes: LatheMachineType[],
    requirements: PartRequirements
  ): MachineComparison {
    log.info(`[LatheMachineIntel] Comparing machines: ${machineTypes.join(", ")}`);

    const criteria: ComparisonCriterion[] = [];
    const tradeOffs: string[] = [];

    // Define comparison criteria
    const criteriaList = [
      "capability_match",
      "cycle_time",
      "precision",
      "flexibility",
      "cost",
      "setup_complexity",
    ];

    criteriaList.forEach(criterion => {
      const scores: Record<LatheMachineType, number> = {} as any;
      let maxScore = 0;
      let winner: LatheMachineType = machineTypes[0];

      machineTypes.forEach(type => {
        const profile = MACHINE_PROFILES[type];
        let score = 0;

        switch (criterion) {
          case "capability_match":
            const eval_result = this.evaluateMachineForPart(type, profile, requirements);
            score = eval_result.suitability;
            break;
          case "cycle_time":
            score = Math.round((1 / profile.typical_cycle_time_factor) * 50);
            break;
          case "precision":
            score = Math.round((0.01 / profile.positioning_accuracy_mm) * 10);
            break;
          case "flexibility":
            score = profile.axis_config.live_tooling ? 80 : 40;
            if (profile.axis_config.y_axis) score += 10;
            if (profile.axis_config.b_axis) score += 10;
            break;
          case "cost":
            const costMap = { low: 90, medium: 70, high: 40, very_high: 20 };
            score = costMap[profile.relative_cost];
            break;
          case "setup_complexity":
            const complexMap = { simple: 90, moderate: 70, complex: 40, very_complex: 20 };
            score = complexMap[profile.setup_complexity];
            break;
        }

        scores[type] = score;
        if (score > maxScore) {
          maxScore = score;
          winner = type;
        }
      });

      criteria.push({
        criterion,
        scores,
        winner,
        notes: `${winner} scores highest for ${criterion}`,
      });
    });

    // Determine overall recommendation
    const totalScores: Record<LatheMachineType, number> = {} as any;
    machineTypes.forEach(type => {
      totalScores[type] = criteria.reduce((sum, c) => sum + (c.scores[type] || 0), 0);
    });

    const recommendation = Object.entries(totalScores)
      .sort(([, a], [, b]) => b - a)[0][0] as LatheMachineType;

    // Trade-offs
    machineTypes.forEach(type => {
      if (type !== recommendation) {
        const profile = MACHINE_PROFILES[type];
        if (profile.typical_cycle_time_factor < MACHINE_PROFILES[recommendation].typical_cycle_time_factor) {
          tradeOffs.push(`${type} has faster cycle time but may have other limitations`);
        }
        if (profile.relative_cost === "low" && MACHINE_PROFILES[recommendation].relative_cost !== "low") {
          tradeOffs.push(`${type} is more cost-effective but may lack capabilities`);
        }
      }
    });

    return {
      machines: machineTypes,
      comparison_criteria: criteria,
      recommendation: `Recommended: ${recommendation} based on overall scoring`,
      trade_offs: tradeOffs,
    };
  }

  /**
   * Get all available machine types.
   */
  listMachineTypes(): { type: LatheMachineType; description: string }[] {
    return Object.entries(MACHINE_PROFILES).map(([type, profile]) => ({
      type: type as LatheMachineType,
      description: profile.description,
    }));
  }

  /**
   * Check if machine can handle specific operation.
   */
  canMachineHandleOperation(
    machineType: LatheMachineType,
    operation: string
  ): { capable: boolean; notes: string } {
    const profile = MACHINE_PROFILES[machineType];
    const capable = profile.capable_operations.some(op =>
      op.toLowerCase().includes(operation.toLowerCase())
    );

    let notes = "";
    if (capable) {
      notes = `${machineType} supports ${operation}`;
    } else {
      // Check if it could with modifications
      if (operation.includes("mill") && !profile.axis_config.live_tooling) {
        notes = "Requires live tooling which this machine lacks";
      } else if (operation.includes("off-center") && !profile.axis_config.y_axis) {
        notes = "Requires Y-axis which this machine lacks";
      } else if (operation.includes("back") && !profile.axis_config.sub_spindle) {
        notes = "Requires sub-spindle which this machine lacks";
      } else {
        notes = "Operation not in machine capability list";
      }
    }

    return { capable, notes };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private evaluateMachineForPart(
    machineType: LatheMachineType,
    profile: Omit<MachineCapabilityProfile, "machine_type">,
    requirements: PartRequirements
  ): {
    suitability: number;
    strengths: string[];
    limitations: string[];
    setup_notes: string[];
    capability_checks: Array<{ requirement: string; capable: boolean; notes: string }>;
  } {
    let score = 100;
    const strengths: string[] = [];
    const limitations: string[] = [];
    const setupNotes: string[] = [];
    const checks: Array<{ requirement: string; capable: boolean; notes: string }> = [];

    // Size checks
    if (requirements.max_diameter_mm > profile.max_turning_diameter_mm) {
      score = 0;  // Disqualified
      limitations.push("Part diameter exceeds machine capacity");
      checks.push({ requirement: "diameter", capable: false, notes: "Part too large" });
    } else {
      checks.push({ requirement: "diameter", capable: true, notes: "Within capacity" });
    }

    if (requirements.length_mm > profile.max_turning_length_mm) {
      score = 0;
      limitations.push("Part length exceeds machine capacity");
      checks.push({ requirement: "length", capable: false, notes: "Part too long" });
    } else {
      checks.push({ requirement: "length", capable: true, notes: "Within capacity" });
    }

    if (score === 0) {
      return { suitability: 0, strengths, limitations, setup_notes: setupNotes, capability_checks: checks };
    }

    // Feature capability checks
    if (requirements.has_cross_holes || requirements.has_flats) {
      if (profile.axis_config.live_tooling) {
        strengths.push("Live tooling handles cross-features in one setup");
        checks.push({ requirement: "cross_features", capable: true, notes: "Live tooling available" });
      } else {
        score -= 30;
        limitations.push("Cross-features require secondary operation");
        checks.push({ requirement: "cross_features", capable: false, notes: "No live tooling" });
      }
    }

    if (requirements.has_off_center_features) {
      if (profile.axis_config.y_axis) {
        strengths.push("Y-axis handles off-center features");
        checks.push({ requirement: "off_center", capable: true, notes: "Y-axis available" });
      } else if (profile.axis_config.live_tooling && profile.axis_config.c_axis) {
        score -= 10;
        limitations.push("Off-center limited to C-axis interpolation");
        checks.push({ requirement: "off_center", capable: true, notes: "C-axis only - limited" });
      } else {
        score -= 40;
        limitations.push("Off-center features require secondary operation");
        checks.push({ requirement: "off_center", capable: false, notes: "No Y-axis capability" });
      }
    }

    if (requirements.has_angular_features) {
      if (profile.axis_config.b_axis) {
        strengths.push("B-axis handles angular features");
        checks.push({ requirement: "angular", capable: true, notes: "B-axis available" });
      } else {
        score -= 30;
        limitations.push("Angular features may require special tooling or secondary op");
        checks.push({ requirement: "angular", capable: false, notes: "No B-axis" });
      }
    }

    if (requirements.needs_back_working) {
      if (profile.axis_config.sub_spindle) {
        strengths.push("Sub-spindle enables complete back-working");
        checks.push({ requirement: "back_working", capable: true, notes: "Sub-spindle available" });
      } else {
        score -= 25;
        limitations.push("Back-working requires secondary setup or manual flip");
        setupNotes.push("Plan for part flip operation");
        checks.push({ requirement: "back_working", capable: false, notes: "No sub-spindle" });
      }
    }

    if (requirements.has_polygons) {
      if (machineType === "swiss_type" || (profile.axis_config.c_axis && profile.axis_config.live_tooling)) {
        strengths.push("Polygon turning capable with synchronized C-axis");
        checks.push({ requirement: "polygon", capable: true, notes: "C-axis + live tooling" });
      } else {
        score -= 20;
        limitations.push("Polygon features require special setup");
        checks.push({ requirement: "polygon", capable: false, notes: "Limited polygon capability" });
      }
    }

    // Precision checks
    if (requirements.tightest_tolerance_mm < profile.positioning_accuracy_mm) {
      score -= 30;
      limitations.push(`Tolerance ${requirements.tightest_tolerance_mm}mm tighter than machine capability`);
      checks.push({ requirement: "precision", capable: false, notes: "Tolerance too tight" });
    } else {
      checks.push({ requirement: "precision", capable: true, notes: "Precision adequate" });
    }

    if (requirements.best_surface_finish_ra < profile.surface_finish_achievable_ra) {
      score -= 20;
      limitations.push(`Surface finish Ra ${requirements.best_surface_finish_ra} may require additional passes`);
    }

    // Volume considerations
    if (requirements.annual_volume > 100000) {
      if (machineType === "multi_spindle") {
        strengths.push("Multi-spindle ideal for very high volume");
        score += 20;
      } else if (machineType === "swiss_type" && requirements.max_diameter_mm <= 32) {
        strengths.push("Swiss-type excellent for high-volume small parts");
        score += 10;
      }
    } else if (requirements.annual_volume < 1000) {
      if (machineType === "multi_spindle") {
        score -= 50;
        limitations.push("Multi-spindle setup time not justified for low volume");
      }
      if (profile.setup_complexity === "very_complex") {
        score -= 20;
        limitations.push("Complex setup not ideal for low volume");
      }
    }

    // Swiss-type specific
    if (machineType === "swiss_type") {
      if (requirements.max_diameter_mm > 32) {
        score = 0;
        limitations.push("Part diameter exceeds Swiss-type capacity");
      } else if (requirements.length_mm / requirements.max_diameter_mm > 4) {
        score += 20;
        strengths.push("Swiss-type excels at slender parts");
      }
    }

    // VTL specific
    if (machineType === "vtl") {
      if (requirements.max_diameter_mm < 300) {
        score -= 40;
        limitations.push("Part too small for VTL - inefficient use");
      } else if (requirements.max_diameter_mm > 500) {
        score += 20;
        strengths.push("VTL ideal for large diameter work");
      }
    }

    return {
      suitability: Math.max(0, Math.min(100, score)),
      strengths,
      limitations,
      setup_notes: setupNotes,
      capability_checks: checks,
    };
  }

  private rateCostEffectiveness(
    suitability: number,
    relativeCost: "low" | "medium" | "high" | "very_high"
  ): "excellent" | "good" | "acceptable" | "poor" {
    const costScore = { low: 4, medium: 3, high: 2, very_high: 1 }[relativeCost];
    const effectivenessScore = (suitability / 25) * costScore;

    if (effectivenessScore > 12) return "excellent";
    if (effectivenessScore > 8) return "good";
    if (effectivenessScore > 4) return "acceptable";
    return "poor";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheMachineIntelligenceEngine = new LatheMachineIntelligenceEngine();
