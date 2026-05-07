/**
 * Fusion5AxisEngine — CAM-PARITY-AGI-MS0/U-CAMP07
 * ================================================
 * Fusion 360 5-axis CAM strategies with physics-based parameter calculation.
 *
 * Covers Fusion 360's native 5-axis strategies:
 *   - Swarf: Flank milling with drive/check surfaces
 *   - Multi-Axis Contour: Surface-following with lead/lag/tilt
 *   - Flow: UV-flowline finishing
 *   - Steep and Shallow: Automatic angle-based strategy switching
 *   - Parallel 5-Axis: UV-based parallel paths
 *   - Morphed Spiral: Between-curves morphing
 *
 * Physics integration:
 *   - Kienzle cutting force model
 *   - Tool deflection analysis
 *   - Scallop height calculation
 *   - Singularity proximity detection
 *
 * @module engines/Fusion5AxisEngine
 * @version 1.0.0
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP07
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Fusion 360 5-axis strategy identifiers */
export type Fusion5AxisStrategy =
  | "swarf"
  | "multi_axis_contour"
  | "flow"
  | "steep_and_shallow"
  | "parallel_5axis"
  | "morphed_spiral"
  | "trimming";

/** Surface geometry type */
export type SurfaceGeometry =
  | "ruled_surface"
  | "freeform"
  | "blended"
  | "impeller_blade"
  | "turbine_blade"
  | "mold_cavity"
  | "mold_core"
  | "medical_implant";

/** Tool orientation control method */
export type OrientationMode =
  | "lead_lag"       // Lead/lag angle from surface normal
  | "tilt_lead"      // Tilt + lead control
  | "automatic"      // CAM auto-calculation
  | "from_surface"   // Tool axis from drive surface
  | "to_point"       // Tool points to reference point
  | "parallel_to_axis"; // Tool parallel to fixed axis

/** 3D vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Material specification for physics calculations */
export interface MaterialSpec {
  name: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Kienzle specific cutting force coefficient (MPa) */
  kc11_mpa: number;
  /** Kienzle exponent */
  mc: number;
}

/** Tool specification */
export interface ToolSpec5Ax {
  type: "ball_nose" | "bull_nose" | "flat_end" | "barrel" | "tapered_ball" | "lollipop";
  diameter_mm: number;
  corner_radius_mm?: number;
  flute_count: number;
  flute_length_mm: number;
  overall_length_mm: number;
  helix_angle_deg: number;
}

/** Fusion 360 5-axis strategy parameters */
export interface Fusion5AxisParams {
  /** Selected strategy */
  strategy: Fusion5AxisStrategy;
  /** Surface geometry type */
  geometry: SurfaceGeometry;
  /** Tool specification */
  tool: ToolSpec5Ax;
  /** Material being cut */
  material: MaterialSpec;
  /** Operation type */
  operation: "roughing" | "semi_finishing" | "finishing";
  /** Stepover (ae) in mm or as percentage of tool diameter */
  stepover_mm?: number;
  stepover_pct?: number;
  /** Stepdown (ap) in mm */
  stepdown_mm?: number;
  /** Feed per tooth (mm) */
  fz_mm?: number;
  /** Spindle RPM */
  rpm?: number;
  /** Target surface roughness Ra (um) */
  target_ra_um?: number;
  /** Lead angle (degrees, positive = tool leads) */
  lead_angle_deg?: number;
  /** Lag angle (degrees, positive = tool lags) */
  lag_angle_deg?: number;
  /** Tilt angle (degrees, lateral tilt) */
  tilt_angle_deg?: number;
  /** Tool orientation mode */
  orientation_mode?: OrientationMode;
  /** Whether to use automatic collision avoidance */
  collision_avoidance?: boolean;
  /** Maximum tilt limit from vertical (degrees) */
  max_tilt_deg?: number;
}

/** Fusion 360 5-axis strategy result */
export interface Fusion5AxisResult {
  /** Strategy name */
  strategy: Fusion5AxisStrategy;
  /** Fusion 360 native operation name */
  fusion_operation_name: string;
  /** Key parameters for post output */
  parameters: {
    lead_angle_deg: number;
    lag_angle_deg: number;
    tilt_angle_deg: number;
    stepover_mm: number;
    stepdown_mm: number;
    feed_mmmin: number;
    rpm: number;
  };
  /** Physics analysis */
  physics: {
    cutting_force_n: number;
    deflection_um: number;
    scallop_height_um: number;
    mrr_cm3_min: number;
    surface_ra_um_predicted: number;
  };
  /** Safety checks */
  safety: {
    singularity_risk: "none" | "low" | "medium" | "high";
    collision_risk: "none" | "low" | "medium" | "high";
    tilt_within_limits: boolean;
  };
  /** Strategy selection rationale */
  rationale: string;
  /** Warnings and recommendations */
  warnings: string[];
  /** Confidence score 0-1 */
  confidence: number;
}

/** Strategy metadata entry */
export interface Fusion5AxisStrategyInfo {
  id: Fusion5AxisStrategy;
  name: string;
  fusion_name: string;
  description: string;
  applicable_geometries: SurfaceGeometry[];
  applicable_tools: ToolSpec5Ax["type"][];
  optimal_operation: ("roughing" | "semi_finishing" | "finishing")[];
  surface_quality: 1 | 2 | 3 | 4 | 5;
  productivity: 1 | 2 | 3 | 4 | 5;
  complexity: 1 | 2 | 3 | 4 | 5;
  hsm_capable: boolean;
}

// ============================================================================
// STRATEGY CATALOG
// ============================================================================

/** Complete Fusion 360 5-axis strategy catalog */
export const FUSION_5AXIS_CATALOG: Fusion5AxisStrategyInfo[] = [
  {
    id: "swarf",
    name: "Swarf Milling",
    fusion_name: "Swarf",
    description: "Flank milling using full flute length on ruled surfaces. Maximum productivity for straight-sided features. Uses drive surface and optional check surface.",
    applicable_geometries: ["ruled_surface", "impeller_blade", "turbine_blade"],
    applicable_tools: ["flat_end", "bull_nose"],
    optimal_operation: ["finishing"],
    surface_quality: 5,
    productivity: 5,
    complexity: 4,
    hsm_capable: false,
  },
  {
    id: "multi_axis_contour",
    name: "Multi-Axis Contour",
    fusion_name: "Multi-Axis Contour",
    description: "Point-milling with lead/lag/tilt angle control. Best for freeform surfaces requiring precise tool orientation. Supports automatic collision avoidance.",
    applicable_geometries: ["freeform", "blended", "mold_cavity", "mold_core", "medical_implant"],
    applicable_tools: ["ball_nose", "bull_nose", "barrel", "tapered_ball"],
    optimal_operation: ["semi_finishing", "finishing"],
    surface_quality: 5,
    productivity: 3,
    complexity: 3,
    hsm_capable: true,
  },
  {
    id: "flow",
    name: "Flow",
    fusion_name: "Flow",
    description: "Toolpath follows surface UV flowlines for smooth, consistent cutting. Ideal for organic shapes with smooth surface transitions.",
    applicable_geometries: ["freeform", "blended", "medical_implant"],
    applicable_tools: ["ball_nose", "bull_nose"],
    optimal_operation: ["finishing"],
    surface_quality: 5,
    productivity: 3,
    complexity: 3,
    hsm_capable: true,
  },
  {
    id: "steep_and_shallow",
    name: "Steep and Shallow",
    fusion_name: "Steep and Shallow",
    description: "Automatic strategy switching based on surface angle. Steep areas use Z-level patterns, shallow areas use parallel patterns.",
    applicable_geometries: ["freeform", "mold_cavity", "mold_core"],
    applicable_tools: ["ball_nose", "bull_nose"],
    optimal_operation: ["semi_finishing", "finishing"],
    surface_quality: 4,
    productivity: 4,
    complexity: 2,
    hsm_capable: true,
  },
  {
    id: "parallel_5axis",
    name: "Parallel 5-Axis",
    fusion_name: "Parallel",
    description: "UV-based parallel toolpath with automatic tilt optimization. Good general-purpose 5-axis finishing strategy.",
    applicable_geometries: ["freeform", "mold_cavity", "mold_core", "medical_implant"],
    applicable_tools: ["ball_nose", "bull_nose"],
    optimal_operation: ["finishing"],
    surface_quality: 4,
    productivity: 4,
    complexity: 2,
    hsm_capable: true,
  },
  {
    id: "morphed_spiral",
    name: "Morphed Spiral",
    fusion_name: "Morphed Spiral",
    description: "Spiral toolpath morphing between boundary curves. Excellent for blended surfaces and gradual transitions.",
    applicable_geometries: ["freeform", "blended", "impeller_blade"],
    applicable_tools: ["ball_nose"],
    optimal_operation: ["finishing"],
    surface_quality: 4,
    productivity: 3,
    complexity: 3,
    hsm_capable: true,
  },
  {
    id: "trimming",
    name: "Trimming",
    fusion_name: "Trimming",
    description: "5-axis edge trimming operation for composite and sheet materials. Uses tool side for edge finishing.",
    applicable_geometries: ["ruled_surface"],
    applicable_tools: ["flat_end", "bull_nose"],
    optimal_operation: ["finishing"],
    surface_quality: 3,
    productivity: 4,
    complexity: 2,
    hsm_capable: false,
  },
];

// ============================================================================
// CANONICAL MATERIAL DATABASE
// ============================================================================

const MATERIAL_DB: Record<string, MaterialSpec> = {
  aluminum_6061: { name: "Aluminum 6061-T6", iso_group: "N", kc11_mpa: 700, mc: 0.23 },
  aluminum_7075: { name: "Aluminum 7075-T6", iso_group: "N", kc11_mpa: 850, mc: 0.23 },
  steel_4140: { name: "Steel 4140", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
  steel_1045: { name: "Steel 1045", iso_group: "P", kc11_mpa: 1700, mc: 0.25 },
  stainless_304: { name: "Stainless 304", iso_group: "M", kc11_mpa: 2100, mc: 0.25 },
  stainless_316: { name: "Stainless 316", iso_group: "M", kc11_mpa: 2200, mc: 0.25 },
  titanium_6al4v: { name: "Titanium Ti-6Al-4V", iso_group: "S", kc11_mpa: 2800, mc: 0.28 },
  inconel_718: { name: "Inconel 718", iso_group: "S", kc11_mpa: 2900, mc: 0.28 },
  cast_iron_gray: { name: "Gray Cast Iron", iso_group: "K", kc11_mpa: 1100, mc: 0.22 },
  tool_steel_d2: { name: "Tool Steel D2 (60 HRC)", iso_group: "H", kc11_mpa: 3200, mc: 0.30 },
};

// ============================================================================
// PHYSICS HELPERS
// ============================================================================

/**
 * Kienzle cutting force model: Fc = kc1.1 * ap * h^(1-mc)
 * Reference: Altintas, Manufacturing Automation (2012), Ch. 2
 */
function calculateKienzleForce(
  kc11: number,
  mc: number,
  ap_mm: number,
  fz_mm: number,
  ae_mm: number,
  d_mm: number,
): number {
  // Calculate mean chip thickness for peripheral milling
  const engagementAngle = Math.acos(1 - (2 * ae_mm) / d_mm);
  const h_mean = fz_mm * Math.sin(engagementAngle / 2);
  if (h_mean <= 0) return 0;

  // Specific cutting force with chip thickness correction
  const kc = kc11 * Math.pow(h_mean, -mc);
  return kc * ap_mm * h_mean;
}

/**
 * Tool deflection: delta = F * L^3 / (3 * E * I)
 * Reference: Machinery's Handbook, 31st Ed., Tool Deflection section
 * E for carbide = 600 GPa (600,000 MPa)
 */
function calculateDeflection(
  force_n: number,
  overhang_mm: number,
  diameter_mm: number,
  e_mpa: number = 600000,
): number {
  const I = (Math.PI * Math.pow(diameter_mm / 2, 4)) / 4; // mm^4
  return (force_n * Math.pow(overhang_mm, 3)) / (3 * e_mpa * I); // mm
}

/**
 * Scallop height for ball endmill: h = R - sqrt(R^2 - (ae/2)^2)
 * Reference: Sandvik Coromant, Modern Metal Cutting
 */
function calculateScallop(radius_mm: number, stepover_mm: number): number {
  const halfAe = stepover_mm / 2;
  if (halfAe >= radius_mm) return radius_mm;
  return radius_mm - Math.sqrt(radius_mm * radius_mm - halfAe * halfAe);
}

/**
 * Estimate Ra from scallop height (empirical relationship)
 * Ra ~ scallop_height * 0.25 (for ball nose finishing)
 */
function scallopToRa(scallop_um: number): number {
  return scallop_um * 0.25;
}

/**
 * Material removal rate: MRR = ae * ap * feed (mm^3/min -> cm^3/min)
 */
function calculateMRR(ae_mm: number, ap_mm: number, feed_mmmin: number): number {
  return (ae_mm * ap_mm * feed_mmmin) / 1000;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Fusion 360 5-Axis Strategy Engine
 *
 * Provides physics-based parameter calculation and strategy selection
 * for Fusion 360's 5-axis CAM operations.
 */
export class Fusion5AxisEngine {
  private _stats = { calculations: 0, lastInput: null as Fusion5AxisParams | null };

  /**
   * Calculate optimal parameters for a Fusion 360 5-axis operation.
   *
   * @param params - Input parameters including strategy, geometry, tool, material
   * @returns Complete result with parameters, physics analysis, and safety checks
   */
  calculate(params: Fusion5AxisParams): Fusion5AxisResult {
    this._stats.calculations++;
    this._stats.lastInput = params;

    const startTime = Date.now();
    log.debug(`[Fusion5Axis] Calculating ${params.strategy} for ${params.geometry}`);

    // Get strategy info
    const strategyInfo = this.getStrategyById(params.strategy);
    if (!strategyInfo) {
      throw new Error(`Unknown strategy: ${params.strategy}`);
    }

    // Resolve parameters with defaults
    const resolved = this._resolveParameters(params, strategyInfo);

    // Calculate physics
    const physics = this._calculatePhysics(params, resolved);

    // Assess safety
    const safety = this._assessSafety(params, resolved, physics);

    // Generate rationale
    const rationale = this._generateRationale(params, strategyInfo, physics);

    // Generate warnings
    const warnings = this._generateWarnings(params, strategyInfo, physics, safety);

    // Calculate confidence
    const confidence = this._calculateConfidence(params, strategyInfo, physics, safety);

    const elapsed = Date.now() - startTime;
    log.debug(`[Fusion5Axis] Completed in ${elapsed}ms, confidence=${confidence.toFixed(2)}`);

    return {
      strategy: params.strategy,
      fusion_operation_name: strategyInfo.fusion_name,
      parameters: resolved,
      physics,
      safety,
      rationale,
      warnings,
      confidence,
    };
  }

  /**
   * Recommend the best 5-axis strategy for given geometry and operation.
   *
   * @param geometry - Surface geometry type
   * @param operation - Operation type (roughing/semi_finishing/finishing)
   * @param tool - Tool specification
   * @returns Ranked list of applicable strategies
   */
  recommendStrategy(
    geometry: SurfaceGeometry,
    operation: "roughing" | "semi_finishing" | "finishing",
    tool: ToolSpec5Ax,
  ): Array<{ strategy: Fusion5AxisStrategyInfo; score: number; reason: string }> {
    const applicable = FUSION_5AXIS_CATALOG.filter(s => {
      const geomMatch = s.applicable_geometries.includes(geometry);
      const toolMatch = s.applicable_tools.includes(tool.type);
      const opMatch = s.optimal_operation.includes(operation);
      return geomMatch && toolMatch;
    });

    const scored = applicable.map(strategy => {
      let score = 0;
      let reasons: string[] = [];

      // Operation match (0.25)
      if (strategy.optimal_operation.includes(operation)) {
        score += 0.25;
        reasons.push(`optimal for ${operation}`);
      }

      // Surface quality (0.25)
      score += (strategy.surface_quality / 5) * 0.25;
      reasons.push(`surface quality ${strategy.surface_quality}/5`);

      // Productivity (0.2)
      score += (strategy.productivity / 5) * 0.2;

      // Lower complexity is better for general use (0.15)
      score += ((6 - strategy.complexity) / 5) * 0.15;

      // HSM bonus for roughing/semi-finishing (0.15)
      if (strategy.hsm_capable && operation !== "finishing") {
        score += 0.15;
        reasons.push("HSM capable");
      }

      return {
        strategy,
        score,
        reason: reasons.join(", "),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Get all available 5-axis strategies.
   */
  getAllStrategies(): Fusion5AxisStrategyInfo[] {
    return [...FUSION_5AXIS_CATALOG];
  }

  /**
   * Get strategy by ID.
   */
  getStrategyById(id: Fusion5AxisStrategy): Fusion5AxisStrategyInfo | undefined {
    return FUSION_5AXIS_CATALOG.find(s => s.id === id);
  }

  /**
   * Get strategies applicable to a geometry type.
   */
  getStrategiesForGeometry(geometry: SurfaceGeometry): Fusion5AxisStrategyInfo[] {
    return FUSION_5AXIS_CATALOG.filter(s => s.applicable_geometries.includes(geometry));
  }

  /**
   * Get material specification by name.
   */
  getMaterial(name: string): MaterialSpec | undefined {
    const key = name.toLowerCase().replace(/[- ]/g, "_");
    return MATERIAL_DB[key];
  }

  /**
   * Get engine statistics.
   */
  stats(): { calculations: number; lastInput: Fusion5AxisParams | null } {
    return { ...this._stats };
  }

  /**
   * Clear engine statistics.
   */
  clear(): void {
    this._stats = { calculations: 0, lastInput: null };
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private _resolveParameters(
    params: Fusion5AxisParams,
    _strategy: Fusion5AxisStrategyInfo,
  ): Fusion5AxisResult["parameters"] {
    const toolDiam = params.tool.diameter_mm;
    const fluteCount = params.tool.flute_count;

    // Resolve stepover
    let stepover_mm: number;
    if (params.stepover_mm !== undefined) {
      stepover_mm = params.stepover_mm;
    } else if (params.stepover_pct !== undefined) {
      stepover_mm = toolDiam * (params.stepover_pct / 100);
    } else {
      // Defaults based on operation
      switch (params.operation) {
        case "roughing":
          stepover_mm = toolDiam * 0.4; // 40%
          break;
        case "semi_finishing":
          stepover_mm = toolDiam * 0.2; // 20%
          break;
        case "finishing":
          stepover_mm = toolDiam * 0.1; // 10%
          break;
      }
    }

    // Resolve stepdown
    const stepdown_mm = params.stepdown_mm ?? (params.operation === "roughing" ? toolDiam * 0.5 : toolDiam * 0.25);

    // Resolve RPM (defaults based on material ISO group)
    const rpm = params.rpm ?? this._defaultRpm(params.material.iso_group, toolDiam);

    // Resolve feed per tooth
    const fz_mm = params.fz_mm ?? this._defaultFz(params.material.iso_group, params.operation);

    // Calculate feed rate
    const feed_mmmin = fz_mm * fluteCount * rpm;

    // Resolve angles
    const lead_angle_deg = params.lead_angle_deg ?? (params.strategy === "swarf" ? 0 : 5);
    const lag_angle_deg = params.lag_angle_deg ?? 0;
    const tilt_angle_deg = params.tilt_angle_deg ?? (params.strategy === "swarf" ? 0 : 3);

    return {
      lead_angle_deg,
      lag_angle_deg,
      tilt_angle_deg,
      stepover_mm,
      stepdown_mm,
      feed_mmmin,
      rpm,
    };
  }

  private _defaultRpm(isoGroup: MaterialSpec["iso_group"], diameter_mm: number): number {
    // Surface speed recommendations (m/min) by ISO group
    const vcMap: Record<MaterialSpec["iso_group"], number> = {
      P: 200, // Steel
      M: 120, // Stainless
      K: 250, // Cast iron
      N: 400, // Aluminum
      S: 50,  // Superalloys
      H: 80,  // Hardened steel
    };
    const vc = vcMap[isoGroup];
    return Math.round((vc * 1000) / (Math.PI * diameter_mm));
  }

  private _defaultFz(isoGroup: MaterialSpec["iso_group"], operation: "roughing" | "semi_finishing" | "finishing"): number {
    // Feed per tooth (mm) defaults
    const baseMap: Record<MaterialSpec["iso_group"], number> = {
      P: 0.12,
      M: 0.08,
      K: 0.15,
      N: 0.20,
      S: 0.05,
      H: 0.04,
    };
    const base = baseMap[isoGroup];
    switch (operation) {
      case "roughing":
        return base * 1.2;
      case "semi_finishing":
        return base;
      case "finishing":
        return base * 0.7;
    }
  }

  private _calculatePhysics(
    params: Fusion5AxisParams,
    resolved: Fusion5AxisResult["parameters"],
  ): Fusion5AxisResult["physics"] {
    const { material, tool } = params;
    const { stepover_mm, stepdown_mm, feed_mmmin, rpm } = resolved;
    const fz = feed_mmmin / (tool.flute_count * rpm);

    // Cutting force (Kienzle)
    const cutting_force_n = calculateKienzleForce(
      material.kc11_mpa,
      material.mc,
      stepdown_mm,
      fz,
      stepover_mm,
      tool.diameter_mm,
    );

    // Deflection
    const overhang = tool.overall_length_mm - tool.flute_length_mm;
    const deflection_mm = calculateDeflection(cutting_force_n, overhang, tool.diameter_mm);
    const deflection_um = deflection_mm * 1000;

    // Scallop height (for ball nose tools)
    let scallop_height_um = 0;
    if (tool.type === "ball_nose") {
      const scallop_mm = calculateScallop(tool.diameter_mm / 2, stepover_mm);
      scallop_height_um = scallop_mm * 1000;
    } else if (tool.type === "bull_nose" && tool.corner_radius_mm) {
      const scallop_mm = calculateScallop(tool.corner_radius_mm, stepover_mm);
      scallop_height_um = scallop_mm * 1000;
    }

    // MRR
    const mrr_cm3_min = calculateMRR(stepover_mm, stepdown_mm, feed_mmmin);

    // Predicted Ra
    const surface_ra_um_predicted = scallop_height_um > 0
      ? scallopToRa(scallop_height_um)
      : 1.6; // Default for flat end tools

    return {
      cutting_force_n: Math.round(cutting_force_n * 10) / 10,
      deflection_um: Math.round(deflection_um * 10) / 10,
      scallop_height_um: Math.round(scallop_height_um * 100) / 100,
      mrr_cm3_min: Math.round(mrr_cm3_min * 100) / 100,
      surface_ra_um_predicted: Math.round(surface_ra_um_predicted * 100) / 100,
    };
  }

  private _assessSafety(
    params: Fusion5AxisParams,
    resolved: Fusion5AxisResult["parameters"],
    physics: Fusion5AxisResult["physics"],
  ): Fusion5AxisResult["safety"] {
    // Singularity risk (based on tilt angle)
    let singularity_risk: Fusion5AxisResult["safety"]["singularity_risk"] = "none";
    const totalTilt = Math.abs(resolved.lead_angle_deg) + Math.abs(resolved.tilt_angle_deg);
    if (totalTilt < 5) {
      singularity_risk = "high"; // Near vertical = singularity zone
    } else if (totalTilt < 10) {
      singularity_risk = "medium";
    } else if (totalTilt < 15) {
      singularity_risk = "low";
    }

    // Collision risk (based on tool length and tilt)
    let collision_risk: Fusion5AxisResult["safety"]["collision_risk"] = "none";
    const holderProximity = params.tool.overall_length_mm / params.tool.flute_length_mm;
    if (holderProximity < 1.5 && totalTilt > 30) {
      collision_risk = "high";
    } else if (holderProximity < 2 && totalTilt > 20) {
      collision_risk = "medium";
    } else if (totalTilt > 40) {
      collision_risk = "low";
    }

    // Tilt limits
    const maxTilt = params.max_tilt_deg ?? 45;
    const tilt_within_limits = Math.abs(resolved.tilt_angle_deg) <= maxTilt &&
                               Math.abs(resolved.lead_angle_deg) <= maxTilt;

    return {
      singularity_risk,
      collision_risk,
      tilt_within_limits,
    };
  }

  private _generateRationale(
    params: Fusion5AxisParams,
    strategy: Fusion5AxisStrategyInfo,
    physics: Fusion5AxisResult["physics"],
  ): string {
    const parts: string[] = [];

    parts.push(`Selected ${strategy.name} (${strategy.fusion_name}) for ${params.geometry} ${params.operation}.`);

    if (strategy.id === "swarf") {
      parts.push("Swarf milling uses full flute contact for maximum material removal on ruled surfaces.");
    } else if (strategy.id === "multi_axis_contour") {
      parts.push("Multi-axis contour provides precise tool orientation control with lead/lag/tilt angles.");
    } else if (strategy.id === "flow") {
      parts.push("Flow strategy follows surface UV flowlines for smooth, consistent cutting.");
    } else if (strategy.id === "steep_and_shallow") {
      parts.push("Steep and shallow automatically switches strategy based on surface angle.");
    }

    parts.push(`Predicted surface finish: Ra ${physics.surface_ra_um_predicted} um.`);
    parts.push(`MRR: ${physics.mrr_cm3_min} cm3/min.`);

    return parts.join(" ");
  }

  private _generateWarnings(
    params: Fusion5AxisParams,
    strategy: Fusion5AxisStrategyInfo,
    physics: Fusion5AxisResult["physics"],
    safety: Fusion5AxisResult["safety"],
  ): string[] {
    const warnings: string[] = [];

    // Geometry mismatch
    if (!strategy.applicable_geometries.includes(params.geometry)) {
      warnings.push(`Strategy ${strategy.name} is not optimal for ${params.geometry} geometry.`);
    }

    // Tool mismatch
    if (!strategy.applicable_tools.includes(params.tool.type)) {
      warnings.push(`Tool type ${params.tool.type} is not recommended for ${strategy.name}.`);
    }

    // Operation mismatch
    if (!strategy.optimal_operation.includes(params.operation)) {
      warnings.push(`Strategy ${strategy.name} is not typically used for ${params.operation}.`);
    }

    // Deflection warning
    if (physics.deflection_um > 50) {
      warnings.push(`High tool deflection (${physics.deflection_um} um) may affect surface quality.`);
    }

    // Singularity warning
    if (safety.singularity_risk === "high") {
      warnings.push("High singularity risk: tool orientation near vertical. Consider increasing lead/tilt angles.");
    } else if (safety.singularity_risk === "medium") {
      warnings.push("Medium singularity risk: verify rotary axis motion in simulation.");
    }

    // Collision warning
    if (safety.collision_risk !== "none") {
      warnings.push(`${safety.collision_risk.charAt(0).toUpperCase() + safety.collision_risk.slice(1)} collision risk: verify with simulation before cutting.`);
    }

    // Tilt limits
    if (!safety.tilt_within_limits) {
      warnings.push("Tilt angles exceed machine limits. Reduce lead/tilt angles or verify machine capability.");
    }

    // Superalloy warning
    if (params.material.iso_group === "S") {
      warnings.push("Superalloy material: use through-spindle coolant and monitor tool wear closely.");
    }

    // Hardened steel warning
    if (params.material.iso_group === "H") {
      warnings.push("Hardened steel: ensure CBN or ceramic tooling for HRC > 55.");
    }

    // Target Ra check
    if (params.target_ra_um && physics.surface_ra_um_predicted > params.target_ra_um) {
      warnings.push(`Predicted Ra (${physics.surface_ra_um_predicted} um) exceeds target (${params.target_ra_um} um). Consider reducing stepover.`);
    }

    return warnings;
  }

  private _calculateConfidence(
    params: Fusion5AxisParams,
    strategy: Fusion5AxisStrategyInfo,
    physics: Fusion5AxisResult["physics"],
    safety: Fusion5AxisResult["safety"],
  ): number {
    let confidence = 0.5; // Base

    // Geometry match bonus
    if (strategy.applicable_geometries.includes(params.geometry)) {
      confidence += 0.15;
    }

    // Tool match bonus
    if (strategy.applicable_tools.includes(params.tool.type)) {
      confidence += 0.1;
    }

    // Operation match bonus
    if (strategy.optimal_operation.includes(params.operation)) {
      confidence += 0.1;
    }

    // Safety bonus
    if (safety.singularity_risk === "none") confidence += 0.05;
    if (safety.collision_risk === "none") confidence += 0.05;
    if (safety.tilt_within_limits) confidence += 0.05;

    // Clamp to [0, 1]
    return Math.min(1, Math.max(0, confidence));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of Fusion5AxisEngine */
export const fusion5AxisEngine = new Fusion5AxisEngine();
