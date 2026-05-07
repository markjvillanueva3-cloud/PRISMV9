/**
 * Mastercam5AxisEngine - 5-Axis Simultaneous Milling Strategies for Mastercam
 *
 * Provides intelligent 5-axis strategy selection, toolpath generation parameters,
 * and physics-validated cutting conditions for Mastercam 2024/2025 multi-axis
 * operations. Covers simultaneous 5-axis, indexed 3+2, swarf cutting, and
 * flow-based surface machining.
 *
 * Chain-of-thought reasoning:
 * 1. Analyze geometry type (freeform, ruled, steep wall, impeller, etc.)
 * 2. Evaluate material group (ISO P/M/K/N/S/H) for cutting parameter bounds
 * 3. Consider machine kinematics (trunnion, swivel head, mixed)
 * 4. Select optimal tool axis control mode (lead/lag, tilt, swarf, auto)
 * 5. Apply collision avoidance strategy
 * 6. Generate confidence score based on geometry-strategy fit
 *
 * @engine Mastercam5AxisEngine
 * @shortcode E2501
 * @dispatcher camDispatcher
 * @actions mastercam_5axis_recommend, mastercam_5axis_params, mastercam_5axis_tilt_limits
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP02
 */

import type { ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type FiveAxisGeometry =
  | "freeform_surface"
  | "ruled_surface"
  | "steep_wall"
  | "shallow_area"
  | "impeller_blade"
  | "impeller_hub"
  | "blisk"
  | "turbine_blade"
  | "undercut"
  | "port_cavity"
  | "manifold"
  | "tube_bore"
  | "dental";

export type FiveAxisGoal =
  | "roughing"
  | "semi_finishing"
  | "finishing"
  | "rest_machining"
  | "swarf_milling"
  | "point_milling"
  | "flow_milling";

export type ToolAxisMode =
  | "lead_lag"
  | "tilt_only"
  | "swarf"
  | "automatic"
  | "from_surface"
  | "interpolated"
  | "to_point";

export type MachineKinematics =
  | "trunnion_table"
  | "swivel_head"
  | "mixed"
  | "nutator";

export interface FiveAxisInput {
  /** Geometry type to machine */
  geometry: FiveAxisGeometry;
  /** Machining goal */
  goal: FiveAxisGoal;
  /** ISO material group */
  isoGroup: ISOGroup;
  /** Tool diameter in mm */
  toolDiameterMm: number;
  /** Tool type */
  toolType: "ballnose" | "bullnose" | "endmill" | "barrel" | "circle_segment" | "tapered";
  /** Corner radius for bullnose/barrel (mm) */
  cornerRadiusMm?: number;
  /** Machine kinematics type */
  kinematics?: MachineKinematics;
  /** Maximum wall angle in degrees (0 = flat, 90 = vertical) */
  maxWallAngleDeg?: number;
  /** Minimum fillet radius in part geometry (mm) */
  minFilletRadiusMm?: number;
  /** Target surface roughness Ra (um) */
  targetRaUm?: number;
  /** Whether holder/spindle collision checking is required */
  requireCollisionCheck?: boolean;
  /** Part tolerance in mm */
  partToleranceMm?: number;
}

export interface FiveAxisStrategy {
  /** Strategy name */
  name: string;
  /** Mastercam cycle name */
  mastercamCycle: string;
  /** Tool axis control mode */
  toolAxisMode: ToolAxisMode;
  /** Strategy group */
  group: string;
  /** Description */
  description: string;
  /** Applicable geometry types */
  applicableGeometry: FiveAxisGeometry[];
  /** Applicable goals */
  applicableGoals: FiveAxisGoal[];
  /** Lead angle in degrees (tool forward tilt) */
  leadAngleDeg: number;
  /** Lag angle in degrees (tool backward tilt) */
  lagAngleDeg: number;
  /** Tilt angle in degrees (lateral) */
  tiltAngleDeg: number;
  /** Recommended stepover as fraction of tool diameter */
  stepoverFactor: number;
  /** Recommended stepdown as fraction of tool diameter */
  stepdownFactor: number;
  /** Collision avoidance method */
  collisionMethod: "gouge_check" | "holder_check" | "full_machine" | "tilting";
  /** Priority score for ranking (higher = better match) */
  priority: number;
}

export interface FiveAxisRecommendation {
  /** Rank (1 = best) */
  rank: number;
  /** Recommended strategy */
  strategy: FiveAxisStrategy;
  /** Overall score */
  score: number;
  /** Confidence (0-1) */
  confidence: number;
  /** Chain-of-thought reasoning */
  reasoning: string[];
  /** Calculated cutting parameters */
  params: {
    stepoverMm: number;
    stepdownMm: number;
    leadAngleDeg: number;
    lagAngleDeg: number;
    tiltAngleDeg: number;
    scallopHeightMm: number;
  };
  /** Warnings */
  warnings: string[];
}

export interface TiltLimitParams {
  /** A-axis tilt angle [degrees] */
  tiltADeg: number;
  /** B-axis tilt angle [degrees] */
  tiltBDeg: number;
  /** Machine A-axis minimum limit [degrees] */
  machineAMin: number;
  /** Machine A-axis maximum limit [degrees] */
  machineAMax: number;
  /** Machine B-axis minimum limit [degrees] */
  machineBMin: number;
  /** Machine B-axis maximum limit [degrees] */
  machineBMax: number;
}

export interface TiltLimitResult {
  /** Whether the tilt combination is within machine limits */
  pass: boolean;
  /** Human-readable reason if blocked */
  reason?: string;
  /** A-axis status */
  aAxis: {
    requested: number;
    min: number;
    max: number;
    pass: boolean;
    marginDeg: number;
  };
  /** B-axis status */
  bAxis: {
    requested: number;
    min: number;
    max: number;
    pass: boolean;
    marginDeg: number;
  };
  /** Confidence score */
  confidence: number;
}

// ============================================================================
// 5-AXIS STRATEGY DATABASE
// ============================================================================

const FIVE_AXIS_STRATEGIES: FiveAxisStrategy[] = [
  // ── Simultaneous 5-Axis Surface Strategies ────────────────────────────────
  {
    name: "5X Flow Finishing",
    mastercamCycle: "Multiaxis Flow",
    toolAxisMode: "from_surface",
    group: "5Axis-Flow",
    description: "5-axis toolpath following UV flow lines of surface parameterization. Natural surface-following motion for smooth continuous passes on organic shapes.",
    applicableGeometry: ["freeform_surface", "impeller_blade", "turbine_blade", "dental"],
    applicableGoals: ["finishing", "semi_finishing"],
    leadAngleDeg: 5,
    lagAngleDeg: 0,
    tiltAngleDeg: 0,
    stepoverFactor: 0.08,
    stepdownFactor: 0.05,
    collisionMethod: "holder_check",
    priority: 10,
  },
  {
    name: "5X Morph Finishing",
    mastercamCycle: "Multiaxis Morph",
    toolAxisMode: "interpolated",
    group: "5Axis-Morph",
    description: "5-axis morphed toolpath between multiple boundary surfaces or curves. Creates smoothly interpolated passes for complex blended geometry.",
    applicableGeometry: ["freeform_surface", "impeller_hub", "blisk", "port_cavity"],
    applicableGoals: ["finishing", "semi_finishing"],
    leadAngleDeg: 5,
    lagAngleDeg: 0,
    tiltAngleDeg: 3,
    stepoverFactor: 0.1,
    stepdownFactor: 0.05,
    collisionMethod: "holder_check",
    priority: 9,
  },
  {
    name: "5X Swarf Cutting",
    mastercamCycle: "Multiaxis Swarf",
    toolAxisMode: "swarf",
    group: "5Axis-Swarf",
    description: "Side-cutting with full flute engagement on ruled surfaces. Tool flank follows surface geometry for maximum efficiency on walls and blades.",
    applicableGeometry: ["ruled_surface", "steep_wall", "impeller_blade", "turbine_blade", "blisk"],
    applicableGoals: ["finishing", "swarf_milling"],
    leadAngleDeg: 0,
    lagAngleDeg: 0,
    tiltAngleDeg: 0,
    stepoverFactor: 0.05,
    stepdownFactor: 2.0,
    collisionMethod: "holder_check",
    priority: 11,
  },
  {
    name: "5X Parallel Finishing",
    mastercamCycle: "Multiaxis Parallel",
    toolAxisMode: "lead_lag",
    group: "5Axis-Parallel",
    description: "Linear parallel passes with 5-axis tool orientation. Good for gentle surfaces where consistent cut direction is desired.",
    applicableGeometry: ["freeform_surface", "shallow_area"],
    applicableGoals: ["finishing", "semi_finishing"],
    leadAngleDeg: 10,
    lagAngleDeg: 0,
    tiltAngleDeg: 0,
    stepoverFactor: 0.1,
    stepdownFactor: 0.05,
    collisionMethod: "gouge_check",
    priority: 7,
  },
  {
    name: "5X Contour",
    mastercamCycle: "Multiaxis Contour",
    toolAxisMode: "automatic",
    group: "5Axis-Contour",
    description: "5-axis contouring with automatic tool axis adjustment for collision avoidance. Follows complex contours with smooth axis motion.",
    applicableGeometry: ["freeform_surface", "undercut", "port_cavity", "manifold"],
    applicableGoals: ["finishing", "semi_finishing"],
    leadAngleDeg: 5,
    lagAngleDeg: 5,
    tiltAngleDeg: 5,
    stepoverFactor: 0.08,
    stepdownFactor: 0.1,
    collisionMethod: "full_machine",
    priority: 8,
  },

  // ── 5-Axis Roughing Strategies ────────────────────────────────────────────
  {
    name: "5X Shape Offset Roughing",
    mastercamCycle: "Multiaxis Roughing",
    toolAxisMode: "automatic",
    group: "5Axis-Roughing",
    description: "5-axis roughing with automatic tool axis tilting to avoid collisions in deep cavities and complex pockets.",
    applicableGeometry: ["freeform_surface", "port_cavity", "manifold", "undercut"],
    applicableGoals: ["roughing"],
    leadAngleDeg: 5,
    lagAngleDeg: 0,
    tiltAngleDeg: 10,
    stepoverFactor: 0.4,
    stepdownFactor: 0.8,
    collisionMethod: "tilting",
    priority: 9,
  },
  {
    name: "5X Rest Roughing",
    mastercamCycle: "Multiaxis Rest",
    toolAxisMode: "automatic",
    group: "5Axis-Rest",
    description: "5-axis rest material removal targeting areas unreachable by 3-axis tools. Uses stock model awareness for efficient material targeting.",
    applicableGeometry: ["freeform_surface", "undercut", "port_cavity", "impeller_hub"],
    applicableGoals: ["rest_machining", "roughing"],
    leadAngleDeg: 5,
    lagAngleDeg: 0,
    tiltAngleDeg: 15,
    stepoverFactor: 0.3,
    stepdownFactor: 0.5,
    collisionMethod: "full_machine",
    priority: 8,
  },

  // ── Impeller/Blade Specific ───────────────────────────────────────────────
  {
    name: "5X Blade Point Milling",
    mastercamCycle: "Multiaxis Blade",
    toolAxisMode: "lead_lag",
    group: "5Axis-Blade",
    description: "Point-contact finishing of blade surfaces with tangent-plane tool orientation. Ball nose or barrel tool for high surface quality on thin blades.",
    applicableGeometry: ["impeller_blade", "turbine_blade", "blisk"],
    applicableGoals: ["finishing", "point_milling"],
    leadAngleDeg: 10,
    lagAngleDeg: 5,
    tiltAngleDeg: 0,
    stepoverFactor: 0.06,
    stepdownFactor: 0.05,
    collisionMethod: "holder_check",
    priority: 10,
  },
  {
    name: "5X Hub Finishing",
    mastercamCycle: "Multiaxis Hub",
    toolAxisMode: "automatic",
    group: "5Axis-Impeller",
    description: "Finishes hub surface between impeller blades with controlled tool axis orientation. Handles narrow channels and deep pockets.",
    applicableGeometry: ["impeller_hub", "blisk"],
    applicableGoals: ["finishing", "semi_finishing"],
    leadAngleDeg: 5,
    lagAngleDeg: 0,
    tiltAngleDeg: 5,
    stepoverFactor: 0.12,
    stepdownFactor: 0.08,
    collisionMethod: "full_machine",
    priority: 9,
  },

  // ── Special Geometry ──────────────────────────────────────────────────────
  {
    name: "5X Tube Milling",
    mastercamCycle: "Multiaxis Tube",
    toolAxisMode: "to_point",
    group: "5Axis-Tube",
    description: "5-axis milling inside tubular geometries with tool axis following tube centerline. For internal bore and manifold finishing.",
    applicableGeometry: ["tube_bore", "manifold", "port_cavity"],
    applicableGoals: ["finishing", "roughing"],
    leadAngleDeg: 5,
    lagAngleDeg: 0,
    tiltAngleDeg: 0,
    stepoverFactor: 0.15,
    stepdownFactor: 0.4,
    collisionMethod: "full_machine",
    priority: 8,
  },
  {
    name: "5X Undercut",
    mastercamCycle: "Multiaxis Undercut",
    toolAxisMode: "tilt_only",
    group: "5Axis-Undercut",
    description: "5-axis machining of undercut features unreachable from primary axis direction. Automatic tool tilting for collision-free access.",
    applicableGeometry: ["undercut"],
    applicableGoals: ["finishing", "semi_finishing", "rest_machining"],
    leadAngleDeg: 0,
    lagAngleDeg: 0,
    tiltAngleDeg: 45,
    stepoverFactor: 0.1,
    stepdownFactor: 0.1,
    collisionMethod: "full_machine",
    priority: 10,
  },

  // ── Indexed 3+2 ───────────────────────────────────────────────────────────
  {
    name: "3+2 Indexed Machining",
    mastercamCycle: "Plane (3+2)",
    toolAxisMode: "tilt_only",
    group: "Indexed-3+2",
    description: "Indexed 5-axis with rotary axes locked during cutting. Simpler programming with 5-axis accessibility for multi-face parts.",
    applicableGeometry: ["freeform_surface", "steep_wall", "undercut", "port_cavity"],
    applicableGoals: ["roughing", "finishing", "semi_finishing"],
    leadAngleDeg: 0,
    lagAngleDeg: 0,
    tiltAngleDeg: 30,
    stepoverFactor: 0.3,
    stepdownFactor: 0.5,
    collisionMethod: "holder_check",
    priority: 6,
  },
];

// ============================================================================
// MACHINE PRESETS
// ============================================================================

export const MACHINE_TILT_PRESETS: Record<
  string,
  { machineAMin: number; machineAMax: number; machineBMin: number; machineBMax: number }
> = {
  DMG_DMU50: { machineAMin: -120, machineAMax: 30, machineBMin: -360, machineBMax: 360 },
  Matsuura_MX520: { machineAMin: -110, machineAMax: 30, machineBMin: -360, machineBMax: 360 },
  Hermle_C400: { machineAMin: -115, machineAMax: 25, machineBMin: -360, machineBMax: 360 },
  Okuma_MU400V: { machineAMin: -120, machineAMax: 30, machineBMin: -360, machineBMax: 360 },
  Haas_UMC750: { machineAMin: -120, machineAMax: 35, machineBMin: -360, machineBMax: 360 },
  Mazak_Variaxis: { machineAMin: -125, machineAMax: 30, machineBMin: -360, machineBMax: 360 },
  generic_5axis: { machineAMin: -90, machineAMax: 30, machineBMin: -360, machineBMax: 360 },
};

// ============================================================================
// MATERIAL-SPECIFIC PARAMETER MODIFIERS
// ============================================================================

const MATERIAL_MODIFIERS: Record<ISOGroup, {
  speedFactor: number;
  feedFactor: number;
  stepoverFactor: number;
  leadAngleAdjust: number;
  notes: string;
}> = {
  P: { speedFactor: 1.0, feedFactor: 1.0, stepoverFactor: 1.0, leadAngleAdjust: 0, notes: "Steel - standard 5-axis parameters" },
  M: { speedFactor: 0.85, feedFactor: 0.9, stepoverFactor: 0.9, leadAngleAdjust: 2, notes: "Stainless - increase lead angle to reduce BUE" },
  K: { speedFactor: 1.1, feedFactor: 1.0, stepoverFactor: 1.1, leadAngleAdjust: 0, notes: "Cast iron - higher speeds OK, dry cutting possible" },
  N: { speedFactor: 2.0, feedFactor: 1.2, stepoverFactor: 1.2, leadAngleAdjust: -2, notes: "Aluminum - high speed, can reduce lead angle" },
  S: { speedFactor: 0.5, feedFactor: 0.6, stepoverFactor: 0.7, leadAngleAdjust: 5, notes: "Superalloy - conservative parameters, higher lead for chip clearance" },
  H: { speedFactor: 0.6, feedFactor: 0.7, stepoverFactor: 0.8, leadAngleAdjust: 3, notes: "Hardened - reduced parameters, CBN/ceramic tools recommended" },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class Mastercam5AxisEngine {
  private calcCount = 0;

  /**
   * Recommend 5-axis strategies for given geometry and machining goal.
   *
   * Chain-of-thought reasoning process:
   * 1. Filter strategies by geometry compatibility
   * 2. Filter by machining goal
   * 3. Apply material-specific modifiers
   * 4. Score based on priority, tool fit, and surface requirements
   * 5. Generate cutting parameters with confidence
   *
   * @param input - Geometry, material, tool, and machine specifications
   * @returns Ranked list of strategy recommendations with reasoning
   */
  recommend(input: FiveAxisInput): FiveAxisRecommendation[] {
    this.calcCount++;
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // ── Step 1: Filter by geometry ──────────────────────────────────────────
    let candidates = FIVE_AXIS_STRATEGIES.filter(
      (s) => s.applicableGeometry.includes(input.geometry)
    );
    reasoning.push(`Geometry '${input.geometry}' matches ${candidates.length} strategies`);

    if (candidates.length === 0) {
      // Fallback to freeform_surface strategies
      candidates = FIVE_AXIS_STRATEGIES.filter(
        (s) => s.applicableGeometry.includes("freeform_surface")
      );
      reasoning.push(`No exact geometry match - using freeform_surface strategies as fallback`);
      warnings.push(`Geometry '${input.geometry}' not directly supported - using general 5-axis strategies`);
    }

    // ── Step 2: Filter by goal ──────────────────────────────────────────────
    const goalMatched = candidates.filter(
      (s) => s.applicableGoals.includes(input.goal)
    );
    if (goalMatched.length > 0) {
      candidates = goalMatched;
      reasoning.push(`Goal '${input.goal}' narrows to ${candidates.length} strategies`);
    } else {
      reasoning.push(`Goal '${input.goal}' has no exact matches - keeping all geometry-matched strategies`);
      warnings.push(`Goal '${input.goal}' may require parameter adjustments`);
    }

    // ── Step 3: Get material modifiers ──────────────────────────────────────
    const matMod = MATERIAL_MODIFIERS[input.isoGroup];
    reasoning.push(`Material ISO ${input.isoGroup}: ${matMod.notes}`);

    // ── Step 4: Score and rank strategies ───────────────────────────────────
    const scored = candidates.map((strategy) => {
      let score = strategy.priority * 10;
      const strategyReasons: string[] = [...reasoning];
      const strategyWarnings: string[] = [...warnings];

      // Tool type scoring
      if (strategy.toolAxisMode === "swarf" && input.toolType === "endmill") {
        score += 5;
        strategyReasons.push("Swarf cutting optimal with endmill for full flute engagement");
      }
      if ((strategy.toolAxisMode === "lead_lag" || strategy.toolAxisMode === "from_surface") &&
          (input.toolType === "ballnose" || input.toolType === "barrel")) {
        score += 4;
        strategyReasons.push("Point-contact strategies benefit from ball/barrel tools");
      }

      // Wall angle considerations
      if (input.maxWallAngleDeg !== undefined) {
        if (input.maxWallAngleDeg > 60 && strategy.name.includes("Swarf")) {
          score += 5;
          strategyReasons.push(`Steep walls (${input.maxWallAngleDeg} deg) favor swarf cutting`);
        }
        if (input.maxWallAngleDeg < 30 && strategy.name.includes("Flow")) {
          score += 3;
          strategyReasons.push(`Shallow walls (${input.maxWallAngleDeg} deg) suit flow finishing`);
        }
      }

      // Fillet radius vs tool size
      if (input.minFilletRadiusMm !== undefined && input.toolDiameterMm > input.minFilletRadiusMm * 2) {
        strategyWarnings.push(`Tool diameter ${input.toolDiameterMm}mm may not fit fillets < ${input.minFilletRadiusMm}mm`);
        score -= 3;
      }

      // Collision requirements
      if (input.requireCollisionCheck && strategy.collisionMethod === "full_machine") {
        score += 3;
        strategyReasons.push("Full machine collision checking enabled as required");
      }

      // Material-specific adjustments
      if (input.isoGroup === "S" || input.isoGroup === "H") {
        if (strategy.collisionMethod === "full_machine") {
          score += 2;
          strategyReasons.push("Difficult material benefits from full collision checking");
        }
      }

      // Calculate cutting parameters
      const baseStepover = strategy.stepoverFactor * input.toolDiameterMm * matMod.stepoverFactor;
      const baseStepdown = strategy.stepdownFactor * input.toolDiameterMm;
      const leadAngle = strategy.leadAngleDeg + matMod.leadAngleAdjust;
      const lagAngle = strategy.lagAngleDeg;
      const tiltAngle = strategy.tiltAngleDeg;

      // Scallop height calculation (for ball nose)
      // h = stepover^2 / (8 * R) where R is effective cutter radius
      const effectiveRadius = input.toolType === "ballnose"
        ? input.toolDiameterMm / 2
        : (input.cornerRadiusMm ?? input.toolDiameterMm / 4);
      const scallopHeightMm = (baseStepover * baseStepover) / (8 * effectiveRadius);

      // Surface finish check
      if (input.targetRaUm !== undefined) {
        const estimatedRa = scallopHeightMm * 1000 * 0.3; // Rough Ra estimate from scallop
        if (estimatedRa > input.targetRaUm) {
          strategyWarnings.push(`Estimated Ra ${estimatedRa.toFixed(2)}um may exceed target ${input.targetRaUm}um - reduce stepover`);
          score -= 2;
        }
      }

      // Calculate confidence
      let confidence = 0.85;
      if (strategyWarnings.length > 0) confidence -= 0.1 * strategyWarnings.length;
      if (strategy.applicableGeometry.includes(input.geometry)) confidence += 0.05;
      if (strategy.applicableGoals.includes(input.goal)) confidence += 0.05;
      confidence = Math.max(0.4, Math.min(1.0, confidence));

      return {
        strategy,
        score,
        confidence,
        reasoning: strategyReasons,
        warnings: strategyWarnings,
        params: {
          stepoverMm: Math.round(baseStepover * 1000) / 1000,
          stepdownMm: Math.round(baseStepdown * 1000) / 1000,
          leadAngleDeg: leadAngle,
          lagAngleDeg: lagAngle,
          tiltAngleDeg: tiltAngle,
          scallopHeightMm: Math.round(scallopHeightMm * 10000) / 10000,
        },
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return ranked recommendations
    return scored.map((s, i) => ({
      rank: i + 1,
      strategy: s.strategy,
      score: Math.round(s.score * 10) / 10,
      confidence: Math.round(s.confidence * 100) / 100,
      reasoning: s.reasoning,
      warnings: s.warnings,
      params: s.params,
    }));
  }

  /**
   * Check tilt angles against machine kinematic limits.
   *
   * @param params - Tilt angles and machine limits
   * @returns Pass/fail result with axis details
   */
  checkTiltLimits(params: TiltLimitParams): TiltLimitResult {
    this.calcCount++;

    // A-axis check
    const aPass = params.tiltADeg >= params.machineAMin && params.tiltADeg <= params.machineAMax;
    const aMargin = aPass
      ? Math.min(params.tiltADeg - params.machineAMin, params.machineAMax - params.tiltADeg)
      : 0;

    // B-axis check
    const bPass = params.tiltBDeg >= params.machineBMin && params.tiltBDeg <= params.machineBMax;
    const bMargin = bPass
      ? Math.min(params.tiltBDeg - params.machineBMin, params.machineBMax - params.tiltBDeg)
      : 0;

    const pass = aPass && bPass;
    const reasons: string[] = [];

    if (!aPass) {
      reasons.push(`A-axis ${params.tiltADeg} deg outside [${params.machineAMin}, ${params.machineAMax}]`);
    }
    if (!bPass) {
      reasons.push(`B-axis ${params.tiltBDeg} deg outside [${params.machineBMin}, ${params.machineBMax}]`);
    }

    // Calculate confidence based on margin
    const minMargin = Math.min(aMargin, bMargin);
    let confidence = pass ? 0.9 : 0.2;
    if (pass && minMargin < 10) {
      confidence = 0.7; // Close to limits
    }

    return {
      pass,
      reason: pass ? undefined : reasons.join("; "),
      aAxis: {
        requested: params.tiltADeg,
        min: params.machineAMin,
        max: params.machineAMax,
        pass: aPass,
        marginDeg: aMargin,
      },
      bAxis: {
        requested: params.tiltBDeg,
        min: params.machineBMin,
        max: params.machineBMax,
        pass: bPass,
        marginDeg: bMargin,
      },
      confidence,
    };
  }

  /**
   * Get machine preset limits by name.
   */
  getMachinePreset(machineName: string): typeof MACHINE_TILT_PRESETS[string] | undefined {
    return MACHINE_TILT_PRESETS[machineName];
  }

  /**
   * List all available 5-axis strategies.
   */
  listStrategies(): Array<{
    name: string;
    mastercamCycle: string;
    group: string;
    toolAxisMode: ToolAxisMode;
    applicableGeometry: FiveAxisGeometry[];
    applicableGoals: FiveAxisGoal[];
  }> {
    return FIVE_AXIS_STRATEGIES.map((s) => ({
      name: s.name,
      mastercamCycle: s.mastercamCycle,
      group: s.group,
      toolAxisMode: s.toolAxisMode,
      applicableGeometry: s.applicableGeometry,
      applicableGoals: s.applicableGoals,
    }));
  }

  /**
   * Get material modifiers for parameter adjustment.
   */
  getMaterialModifiers(isoGroup: ISOGroup): typeof MATERIAL_MODIFIERS[ISOGroup] {
    return MATERIAL_MODIFIERS[isoGroup];
  }

  /**
   * Get engine statistics.
   */
  stats(): { calculations: number; strategyCount: number; machinePresetCount: number } {
    return {
      calculations: this.calcCount,
      strategyCount: FIVE_AXIS_STRATEGIES.length,
      machinePresetCount: Object.keys(MACHINE_TILT_PRESETS).length,
    };
  }
}

export const mastercam5AxisEngine = new Mastercam5AxisEngine();
