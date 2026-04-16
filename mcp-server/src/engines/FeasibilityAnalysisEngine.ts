/**
 * FeasibilityAnalysisEngine — Machining Feasibility Intelligence Stack (MF-MS1)
 *
 * Combines three physical feasibility sub-analyses into a single engine:
 *   1. Accessibility Analysis — tool reach, holder clearance, corner access, chip evacuation
 *   2. Workholding Viability — clamping force vs cutting force, grip degradation, datum integrity
 *   3. Rigidity Degradation — wall/floor stiffness, natural frequency, chatter onset
 *
 * Physics Models:
 *   - Tool deflection: δ = FL³ / 3EI (cantilever beam)
 *   - Clamping force: F_clamp = μ × N × n_jaws
 *   - Vacuum holding: F = P_atm × A_seal × η
 *   - Wall stiffness: k = E × w × t³ / (4 × h³) (cantilever plate)
 *   - Natural frequency: fn = (1/2π) × √(k/m)
 *   - Floor stiffness: k_floor = (16 × E × t³) / (3 × (1 - ν²) × a² × b²) (simply-supported plate)
 *
 * References:
 *   - Altintas, Y. "Manufacturing Automation" (2012) — chatter stability
 *   - Tlusty, J. "Manufacturing Processes and Equipment" (2000) — deflection limits
 *   - ISO 10303-224 — feature-based machining
 *   - Nee, A.Y.C. "Handbook of Manufacturing Engineering" (2015) — workholding
 *
 * @module engines/FeasibilityAnalysisEngine
 */

// ── Accessibility Types ─────────────────────────────────────────────────────────

/** Feature description for accessibility analysis */
export interface AccessibilityFeature {
  /** Feature type classification */
  type: "pocket_open" | "pocket_closed" | "hole_through" | "hole_blind" |
        "slot" | "bore" | "groove" | "step" | "profile" | "face" | "wall" |
        "contour" | "thread" | "chamfer" | "fillet"
  /** Position of feature centroid (mm) */
  position: { x: number; y: number; z: number }
  /** Feature depth from top surface (mm) */
  depth_mm: number
  /** Feature width (mm) — for pockets/slots */
  width_mm?: number
  /** Feature length (mm) — for pockets/slots */
  length_mm?: number
  /** Feature diameter (mm) — for holes/bores */
  diameter_mm?: number
  /** Internal corner radius required (mm) */
  corner_radius_mm?: number
  /** Adjacent wall height (mm) — for holder clearance checks */
  adjacent_wall_height_mm?: number
  /** Adjacent wall distance from feature edge (mm) */
  adjacent_wall_distance_mm?: number
}

/** Tool description for accessibility analysis */
export interface AccessibilityTool {
  /** Tool cutting diameter (mm) */
  diameter_mm: number
  /** Tool overall length (mm) */
  length_mm: number
  /** Length of cut / flute length (mm) */
  loc_mm: number
  /** Holder/shank diameter (mm) — typically larger than cutting diameter */
  holder_diameter_mm: number
  /** Corner radius of tool (mm) — 0 for square end */
  corner_radius_mm?: number
  /** Tool material for deflection calculation */
  material?: "carbide" | "hss" | "ceramic" | "cbn" | "diamond"
  /** Number of flutes */
  flutes?: number
}

/** Approach direction for tool access */
export type ApproachDirection = "top" | "bottom" | "side_x_pos" | "side_x_neg" |
                                "side_y_pos" | "side_y_neg" | "angled"

/** Result of accessibility analysis */
export interface AccessibilityResult {
  /** Whether the feature is accessible with given tool/approach */
  accessible: boolean
  /** Minimum clearance between tool assembly and workpiece (mm) */
  clearance_mm: number
  /** Tool deflection at full depth (mm) */
  deflection_mm: number
  /** What limits accessibility — null if fully accessible */
  limiting_factor: "tool_reach" | "holder_collision" | "corner_radius" |
                   "chip_evacuation" | "deflection_excessive" | null
  /** Depth-to-diameter ratio for chip evacuation assessment */
  depth_to_diameter_ratio: number
  /** Whether tool corner radius can reach feature corners */
  corner_accessible: boolean
  /** Whether holder will collide with adjacent walls */
  holder_clear: boolean
  /** Actionable suggestions for improving accessibility */
  suggestions: string[]
  /** Physics detail */
  physics: {
    /** Moment of inertia of tool cross-section (mm⁴) */
    I_mm4: number
    /** Elastic modulus of tool material (GPa) */
    E_GPa: number
    /** Estimated cutting force at depth (N) */
    estimated_force_N: number
    /** Maximum recommended depth for <0.05mm deflection (mm) */
    max_depth_for_target_deflection_mm: number
  }
}

// ── Workholding Types ───────────────────────────────────────────────────────────

/** Clamping method classification */
export type ClampingMethod = "vise" | "chuck_3jaw" | "chuck_4jaw" | "chuck_6jaw" |
                             "vacuum" | "magnetic" | "fixture_plate" | "collet" |
                             "soft_jaws" | "toe_clamp" | "strap_clamp"

/** Workpiece state for workholding analysis (compatible with WorkpieceStateEngine) */
export interface WorkholdingWorkpieceState {
  /** Remaining stock bounding box (mm) */
  stock: { min_x: number; max_x: number; min_y: number; max_y: number; min_z: number; max_z: number }
  /** Volume remaining as fraction (0–1) */
  volume_remaining_pct: number
  /** Available clamping surfaces with area */
  clamping_surfaces: {
    zone: "top" | "bottom" | "side_x_pos" | "side_x_neg" | "side_y_pos" | "side_y_neg" | "bore"
    area_mm2: number
    is_machined: boolean
    is_datum: boolean
    flatness_um?: number
  }[]
  /** Datum surfaces still intact */
  datum_surfaces?: {
    datum_id: string
    intact: boolean
    surface_zone: string
  }[]
  /** Workpiece material */
  material?: {
    name?: string
    /** Whether material is magnetic (for magnetic chucks) */
    magnetic?: boolean
    /** Density kg/m³ */
    density_kg_m3?: number
  }
  /** Workpiece mass (kg) */
  mass_kg?: number
}

/** Operation forces for workholding check */
export interface OperationForces {
  /** Cutting force components (N) */
  Fx: number
  Fy: number
  Fz: number
  /** Torque about Z axis (N·m) — for turning/drilling */
  torque_Nm?: number
  /** Moment about X axis (N·m) — for eccentric loads */
  Mx_Nm?: number
  /** Moment about Y axis (N·m) */
  My_Nm?: number
}

/** Clamping configuration details */
export interface ClampingConfig {
  method: ClampingMethod
  /** Number of jaws/clamps */
  n_jaws?: number
  /** Clamping force per jaw/clamp (N) */
  force_per_jaw_N?: number
  /** Coefficient of friction between jaw and workpiece */
  friction_coefficient?: number
  /** For vacuum: pump gauge pressure (kPa, negative) */
  vacuum_pressure_kPa?: number
  /** For vacuum: seal efficiency (0–1) */
  vacuum_efficiency?: number
  /** For magnetic: holding force per unit area (N/cm²) */
  magnetic_force_per_cm2?: number
  /** Jaw/clamp width (mm) */
  jaw_width_mm?: number
  /** Jaw/clamp depth / bite (mm) */
  jaw_depth_mm?: number
  /** Minimum required safety factor override */
  min_safety_factor?: number
}

/** Result of workholding viability analysis */
export interface WorkholdingResult {
  /** Whether workholding is viable for the given operation */
  viable: boolean
  /** Safety factor: clamping force / cutting force (≥ 2.0 required) */
  safety_factor: number
  /** How much grip has degraded due to material removal (%) */
  grip_degradation_pct: number
  /** Total clamping force available (N) */
  total_clamp_force_N: number
  /** Total cutting force magnitude (N) */
  total_cutting_force_N: number
  /** Whether sufficient clamping surface area remains */
  sufficient_area: boolean
  /** Available clamping area (mm²) */
  available_clamp_area_mm2: number
  /** Whether datum surfaces are still available for re-fixturing */
  datum_available: boolean
  /** Vacuum-specific: whether continuous seal perimeter exists */
  vacuum_seal_intact?: boolean
  /** Warnings about potential issues */
  warnings: string[]
  /** Physics detail */
  physics: {
    /** Normal force from clamps (N) */
    normal_force_N: number
    /** Friction force available (N) */
    friction_force_N: number
    /** For vacuum: effective seal area (mm²) */
    effective_seal_area_mm2?: number
    /** For vacuum: atmospheric pressure force (N) */
    atmospheric_force_N?: number
    /** Resultant moment about clamp centroid (N·m) */
    resultant_moment_Nm: number
  }
}

// ── Rigidity Types ──────────────────────────────────────────────────────────────

/** Material properties for rigidity analysis */
export interface RigidityMaterial {
  /** Material name */
  name?: string
  /** Young's modulus (GPa) */
  E_GPa: number
  /** Density (kg/m³) */
  density_kg_m3: number
  /** Poisson's ratio */
  poisson_ratio?: number
  /** Yield strength (MPa) — for stress check */
  yield_MPa?: number
}

/** Workpiece state for rigidity analysis */
export interface RigidityWorkpieceState {
  /** Remaining stock bounding box (mm) */
  stock: { min_x: number; max_x: number; min_y: number; max_y: number; min_z: number; max_z: number }
  /** Volume remaining as fraction (0–1) */
  volume_remaining_pct: number
  /** Thin wall sections detected */
  wall_sections?: {
    thickness_mm: number
    height_mm: number
    length_mm: number
  }[]
  /** Thin floor sections detected */
  floor_sections?: {
    thickness_mm: number
    length_mm: number
    width_mm: number
  }[]
}

/** Result of rigidity degradation analysis */
export interface RigidityResult {
  /** Overall rigidity score (0–100, higher = more rigid) */
  rigidity_score: number
  /** Lowest natural frequency of thin sections (Hz) */
  natural_freq_hz: number
  /** Chatter risk assessment */
  chatter_risk: "low" | "medium" | "high" | "critical"
  /** Maximum safe depth of cut before chatter onset (mm) */
  max_safe_depth_mm: number
  /** Wall analysis results */
  wall_analysis: {
    thickness_mm: number
    height_mm: number
    stiffness_N_per_mm: number
    natural_freq_hz: number
    max_force_N: number
    deflection_at_1N_mm: number
    chatter_risk: "low" | "medium" | "high" | "critical"
  }[]
  /** Floor analysis results */
  floor_analysis: {
    thickness_mm: number
    stiffness_N_per_mm: number
    natural_freq_hz: number
    max_force_N: number
    chatter_risk: "low" | "medium" | "high" | "critical"
  }[]
  /** Recommendations for improving rigidity */
  recommendations: string[]
  /** Physics detail */
  physics: {
    /** Minimum wall stiffness (N/mm) */
    min_wall_stiffness_N_per_mm: number
    /** Minimum floor stiffness (N/mm) */
    min_floor_stiffness_N_per_mm: number
    /** Critical spindle speed to avoid (RPM) — first harmonic */
    critical_spindle_rpm: number
    /** Second harmonic critical RPM */
    critical_spindle_rpm_2nd: number
    /** Effective mass of thinnest section (kg) */
    effective_mass_kg: number
  }
}

// ── Unified Input/Output ────────────────────────────────────────────────────────

/** Unified input for calculate() dispatch */
export type FeasibilityAction = "analyzeAccessibility" | "analyzeWorkholding" | "analyzeRigidity"

export interface FeasibilityInput {
  action: FeasibilityAction
  // Accessibility params
  feature?: AccessibilityFeature
  tool?: AccessibilityTool
  approach_direction?: ApproachDirection
  cutting_force_N?: number
  // Workholding params
  workpiece_state?: WorkholdingWorkpieceState | RigidityWorkpieceState
  clamping?: ClampingConfig
  operation_forces?: OperationForces
  // Rigidity params
  wall_thickness_mm?: number
  wall_height_mm?: number
  wall_length_mm?: number
  floor_thickness_mm?: number
  floor_length_mm?: number
  floor_width_mm?: number
  material?: RigidityMaterial
  spindle_speed_rpm?: number
  number_of_flutes?: number
}

export type FeasibilityResult = AccessibilityResult | WorkholdingResult | RigidityResult

// ── Constants ───────────────────────────────────────────────────────────────────

/** Tool material elastic modulus (GPa) */
const TOOL_E_MAP: Record<string, number> = {
  carbide: 620,
  hss: 210,
  ceramic: 370,
  cbn: 680,
  diamond: 1050
}

/** Default friction coefficients by clamping method */
const FRICTION_MAP: Record<ClampingMethod, number> = {
  vise: 0.15,
  chuck_3jaw: 0.25,
  chuck_4jaw: 0.25,
  chuck_6jaw: 0.25,
  vacuum: 0.0,       // vacuum uses pressure, not friction
  magnetic: 0.0,     // magnetic uses direct pull
  fixture_plate: 0.20,
  collet: 0.30,
  soft_jaws: 0.35,
  toe_clamp: 0.18,
  strap_clamp: 0.15
}

/** Default clamping force per jaw (N) */
const DEFAULT_CLAMP_FORCE: Record<ClampingMethod, number> = {
  vise: 20000,
  chuck_3jaw: 8000,
  chuck_4jaw: 6000,
  chuck_6jaw: 5000,
  vacuum: 0,
  magnetic: 0,
  fixture_plate: 5000,
  collet: 15000,
  soft_jaws: 10000,
  toe_clamp: 4000,
  strap_clamp: 3000
}

/** Default jaw counts */
const DEFAULT_JAW_COUNT: Record<ClampingMethod, number> = {
  vise: 2,
  chuck_3jaw: 3,
  chuck_4jaw: 4,
  chuck_6jaw: 6,
  vacuum: 1,
  magnetic: 1,
  fixture_plate: 4,
  collet: 1,
  soft_jaws: 2,
  toe_clamp: 4,
  strap_clamp: 4
}

/** Atmospheric pressure (kPa) */
const P_ATM_KPA = 101.325

/** Target deflection limit for accessibility (mm) */
const TARGET_DEFLECTION_MM = 0.050

/** Minimum safety factor for workholding */
const MIN_SAFETY_FACTOR = 2.0

/** Chip evacuation depth/diameter ratio thresholds */
const CHIP_EVAC_THRESHOLDS = {
  easy: 2.0,       // < 2:1 — no issues
  moderate: 4.0,   // 2:1–4:1 — peck cycle or through-coolant
  difficult: 6.0,  // 4:1–6:1 — high-pressure coolant required
  critical: 8.0    // > 6:1 — specialized tooling/strategy required
}

// ── Engine ───────────────────────────────────────────────────────────────────────

/**
 * FeasibilityAnalysisEngine — Physical feasibility analysis for machining operations.
 *
 * Provides three sub-analyses:
 * - `analyzeAccessibility`: Can the tool physically reach and machine the feature?
 * - `analyzeWorkholding`: Will the workholding survive the cutting forces?
 * - `analyzeRigidity`: Will the workpiece remain rigid enough to avoid chatter?
 *
 * @example
 * ```ts
 * const result = feasibilityAnalysisEngine.analyzeAccessibility({
 *   type: "pocket_closed", position: { x: 50, y: 50, z: 0 },
 *   depth_mm: 40, width_mm: 20, length_mm: 60, corner_radius_mm: 3
 * }, {
 *   diameter_mm: 10, length_mm: 80, loc_mm: 50, holder_diameter_mm: 20
 * }, "top");
 * ```
 */
export class FeasibilityAnalysisEngine {
  /**
   * Unified dispatch — routes to sub-analysis by action.
   *
   * @param input - Unified feasibility input with action discriminator
   * @returns Result from the appropriate sub-analysis
   * @throws Error if action is unknown or required params are missing
   */
  calculate(input: FeasibilityInput): FeasibilityResult {
    switch (input.action) {
      case "analyzeAccessibility": {
        if (!input.feature || !input.tool) {
          throw new Error("analyzeAccessibility requires 'feature' and 'tool' params");
        }
        return this.analyzeAccessibility(
          input.feature,
          input.tool,
          input.approach_direction || "top",
          input.cutting_force_N
        );
      }
      case "analyzeWorkholding": {
        if (!input.workpiece_state || !input.clamping || !input.operation_forces) {
          throw new Error("analyzeWorkholding requires 'workpiece_state', 'clamping', and 'operation_forces' params");
        }
        return this.analyzeWorkholding(
          input.workpiece_state as WorkholdingWorkpieceState,
          input.clamping,
          input.operation_forces
        );
      }
      case "analyzeRigidity": {
        if (!input.material) {
          throw new Error("analyzeRigidity requires 'material' param");
        }
        return this.analyzeRigidity(
          input.workpiece_state as RigidityWorkpieceState | undefined,
          input.wall_thickness_mm,
          input.wall_height_mm,
          input.material,
          input.wall_length_mm,
          input.floor_thickness_mm,
          input.floor_length_mm,
          input.floor_width_mm,
          input.spindle_speed_rpm,
          input.number_of_flutes
        );
      }
      default:
        throw new Error(`Unknown feasibility action: ${(input as FeasibilityInput).action}`);
    }
  }

  // ── 1. Accessibility Analysis ───────────────────────────────────────────────

  /**
   * Analyze whether a tool can physically access and machine a feature.
   *
   * Checks performed:
   * 1. **Tool reach**: Is feature depth within tool LOC (length of cut)?
   * 2. **Holder clearance**: Will the holder/shank collide with adjacent walls?
   * 3. **Corner radius**: Can the tool reach internal corners of the feature?
   * 4. **Chip evacuation**: Is the depth-to-diameter ratio manageable?
   * 5. **Deflection**: Will tool deflection exceed tolerance at full depth?
   *
   * Physics: δ = FL³ / (3EI), where I = π d⁴ / 64 for solid cylindrical tool.
   * Minimum corner radius = tool_radius (tool cannot cut sharper corners than its own radius).
   *
   * @param feature - Feature geometry to machine
   * @param tool - Tool to use
   * @param approach - Direction of tool approach
   * @param cutting_force_N - Optional override for estimated cutting force (N)
   * @returns Accessibility analysis result
   */
  analyzeAccessibility(
    feature: AccessibilityFeature,
    tool: AccessibilityTool,
    approach: ApproachDirection = "top",
    cutting_force_N?: number
  ): AccessibilityResult {
    const suggestions: string[] = [];
    const tool_radius = tool.diameter_mm / 2;
    const feature_corner_radius = feature.corner_radius_mm ?? 0;

    // ── Tool material properties ──
    const E_GPa = TOOL_E_MAP[tool.material || "carbide"] || TOOL_E_MAP.carbide;
    const E_Pa = E_GPa * 1e9;
    const E_MPa = E_GPa * 1e3;

    // ── Moment of inertia for solid cylindrical tool (mm⁴) ──
    // I = π × d⁴ / 64
    const d = tool.diameter_mm;
    const I_mm4 = (Math.PI * Math.pow(d, 4)) / 64;

    // ── 1. Tool Reach Check ──
    // Can the tool's LOC (length of cut) reach the feature depth?
    const effective_reach = tool.loc_mm;
    const depth = feature.depth_mm;
    const reach_ok = depth <= effective_reach;
    const reach_margin = effective_reach - depth;

    if (!reach_ok) {
      suggestions.push(
        `Feature depth (${depth.toFixed(1)}mm) exceeds tool LOC (${effective_reach.toFixed(1)}mm). ` +
        `Need tool with LOC ≥ ${(depth + 2).toFixed(1)}mm or use step-down strategy.`
      );
    }

    // ── 2. Holder Clearance Check ──
    // Check if the holder (larger than cutting diameter) will collide with adjacent walls
    // when tool is at full depth. The holder starts at LOC distance from tip.
    const holder_radius = tool.holder_diameter_mm / 2;
    let holder_clear = true;
    let holder_clearance_mm = Infinity;

    if (feature.adjacent_wall_height_mm !== undefined &&
        feature.adjacent_wall_distance_mm !== undefined) {
      // If tool is at full depth, holder enters the feature when:
      //   depth > LOC (holder enters pocket)
      // Holder collision occurs when:
      //   adjacent_wall_distance < holder_radius AND
      //   adjacent_wall_height > (depth - LOC) from top
      const holder_penetration = Math.max(0, depth - tool.loc_mm);
      if (holder_penetration > 0) {
        // Holder is inside the feature zone
        holder_clearance_mm = (feature.adjacent_wall_distance_mm || 0) - holder_radius;
        holder_clear = holder_clearance_mm > 0;
      } else {
        // Holder stays above feature — check if adjacent wall extends above feature
        const wall_extends_above = (feature.adjacent_wall_height_mm || 0) > depth;
        if (wall_extends_above) {
          holder_clearance_mm = (feature.adjacent_wall_distance_mm || 0) - holder_radius;
          holder_clear = holder_clearance_mm > 0;
        } else {
          holder_clearance_mm = tool.holder_diameter_mm; // plenty of room
        }
      }

      if (!holder_clear) {
        suggestions.push(
          `Holder (Ø${tool.holder_diameter_mm.toFixed(1)}mm) will collide with adjacent wall ` +
          `at ${(feature.adjacent_wall_distance_mm || 0).toFixed(1)}mm distance. ` +
          `Use extended-reach tool or reduced-shank holder.`
        );
      }
    } else {
      // No adjacent wall data — assume accessible for holder
      // For closed pockets, use feature width as proxy
      if ((feature.type === "pocket_closed" || feature.type === "slot") && feature.width_mm) {
        const pocket_half_width = feature.width_mm / 2;
        const holder_penetration = Math.max(0, depth - tool.loc_mm);
        if (holder_penetration > 0) {
          holder_clearance_mm = pocket_half_width - holder_radius;
          holder_clear = holder_clearance_mm > 0;
          if (!holder_clear) {
            suggestions.push(
              `Holder (Ø${tool.holder_diameter_mm.toFixed(1)}mm) wider than pocket ` +
              `(${feature.width_mm.toFixed(1)}mm) at extended depth. Use longer LOC tool.`
            );
          }
        } else {
          holder_clearance_mm = pocket_half_width - tool_radius;
        }
      } else {
        holder_clearance_mm = holder_radius; // neutral assumption
      }
    }

    // ── 3. Corner Radius Check ──
    // Minimum achievable internal corner radius = tool radius
    const min_achievable_corner = tool_radius;
    const corner_accessible = feature_corner_radius >= min_achievable_corner ||
                              feature_corner_radius === 0; // 0 means "don't care"

    if (!corner_accessible) {
      suggestions.push(
        `Feature requires R${feature_corner_radius.toFixed(2)}mm corners but tool radius is ` +
        `R${tool_radius.toFixed(2)}mm. Need tool Ø ≤ ${(feature_corner_radius * 2).toFixed(1)}mm ` +
        `or add corner relief/EDM.`
      );
    }

    // ── 4. Chip Evacuation Check ──
    // Depth-to-diameter ratio determines chip evacuation difficulty
    const effective_diameter = feature.diameter_mm || tool.diameter_mm;
    const depth_to_dia = depth / effective_diameter;
    let chip_evac_ok = true;

    if (depth_to_dia > CHIP_EVAC_THRESHOLDS.critical) {
      chip_evac_ok = false;
      suggestions.push(
        `Depth/diameter ratio ${depth_to_dia.toFixed(1)}:1 is critical (>${CHIP_EVAC_THRESHOLDS.critical}:1). ` +
        `Requires specialized deep-hole strategy, gun drill, or EDM.`
      );
    } else if (depth_to_dia > CHIP_EVAC_THRESHOLDS.difficult) {
      suggestions.push(
        `Depth/diameter ratio ${depth_to_dia.toFixed(1)}:1 is difficult. ` +
        `Use high-pressure through-coolant and peck cycle.`
      );
    } else if (depth_to_dia > CHIP_EVAC_THRESHOLDS.moderate) {
      suggestions.push(
        `Depth/diameter ratio ${depth_to_dia.toFixed(1)}:1 — consider peck drilling or ` +
        `through-coolant tooling for reliable chip evacuation.`
      );
    }

    // ── 5. Tool Deflection at Depth ──
    // δ = F × L³ / (3 × E × I)
    // Estimate cutting force if not provided (rough Kienzle approximation)
    const estimated_force = cutting_force_N ||
      this._estimateCuttingForce(tool.diameter_mm, depth, tool.flutes || 2);

    // Stick-out length = depth + small clearance (tool extends into feature)
    const stickout_mm = Math.max(depth, tool.loc_mm * 0.8);
    const L_m = stickout_mm / 1000;
    const I_m4 = I_mm4 * 1e-12;
    const deflection_m = (estimated_force * Math.pow(L_m, 3)) / (3 * E_Pa * I_m4);
    const deflection_mm = deflection_m * 1000;

    const deflection_ok = deflection_mm <= TARGET_DEFLECTION_MM;
    if (!deflection_ok) {
      suggestions.push(
        `Tool deflection at depth: ${deflection_mm.toFixed(4)}mm exceeds ${TARGET_DEFLECTION_MM}mm limit. ` +
        `Use larger diameter tool, shorter stickout, or reduce depth of cut.`
      );
    }

    // ── Max depth for target deflection ──
    // δ_target = F × L³ / (3EI)  →  L = ∛(δ_target × 3EI / F)
    const max_L_m = Math.pow((TARGET_DEFLECTION_MM / 1000 * 3 * E_Pa * I_m4) / Math.max(estimated_force, 1), 1 / 3);
    const max_depth_for_target = max_L_m * 1000;

    // ── Determine limiting factor ──
    let limiting_factor: AccessibilityResult["limiting_factor"] = null;
    if (!reach_ok) {
      limiting_factor = "tool_reach";
    } else if (!holder_clear) {
      limiting_factor = "holder_collision";
    } else if (!corner_accessible) {
      limiting_factor = "corner_radius";
    } else if (!chip_evac_ok) {
      limiting_factor = "chip_evacuation";
    } else if (!deflection_ok) {
      limiting_factor = "deflection_excessive";
    }

    // Minimum clearance across all checks
    const min_clearance = Math.min(
      reach_margin,
      holder_clearance_mm === Infinity ? 999 : holder_clearance_mm
    );

    const accessible = reach_ok && holder_clear && corner_accessible &&
                       chip_evac_ok && deflection_ok;

    // Add approach direction note if not top
    if (approach !== "top" && approach !== "angled") {
      suggestions.push(
        `Side approach (${approach}) — verify fixture clearance and ` +
        `consider gravity-assisted chip evacuation direction.`
      );
    }

    return {
      accessible,
      clearance_mm: Math.max(0, min_clearance),
      deflection_mm,
      limiting_factor,
      depth_to_diameter_ratio: depth_to_dia,
      corner_accessible,
      holder_clear,
      suggestions,
      physics: {
        I_mm4,
        E_GPa,
        estimated_force_N: estimated_force,
        max_depth_for_target_deflection_mm: max_depth_for_target
      }
    };
  }

  // ── 2. Workholding Viability ────────────────────────────────────────────────

  /**
   * Analyze whether workholding can sustain the cutting forces for an operation.
   *
   * Checks performed:
   * 1. **Clamping surface area**: Sufficient contact area remaining after prior operations
   * 2. **Grip force vs cutting force**: Safety factor ≥ 2.0
   * 3. **Vacuum seal integrity**: Continuous perimeter check for vacuum workholding
   * 4. **Datum surface availability**: Can part be re-fixtured if needed
   *
   * Physics:
   * - Mechanical clamps: F_clamp = μ × N × n_jaws, where N = force per jaw
   * - Vacuum: F = P_atm × A_seal × η (atmospheric pressure × seal area × efficiency)
   * - Magnetic: F = f_spec × A_contact (specific force × contact area)
   *
   * @param workpiece - Current workpiece state (from WorkpieceStateEngine or manual)
   * @param clamping - Clamping method and configuration
   * @param forces - Cutting force components from the operation
   * @returns Workholding viability result
   */
  analyzeWorkholding(
    workpiece: WorkholdingWorkpieceState,
    clamping: ClampingConfig,
    forces: OperationForces
  ): WorkholdingResult {
    const warnings: string[] = [];
    const method = clamping.method;
    const min_sf = clamping.min_safety_factor ?? MIN_SAFETY_FACTOR;

    // ── Total cutting force magnitude ──
    const F_total = Math.sqrt(
      forces.Fx * forces.Fx +
      forces.Fy * forces.Fy +
      forces.Fz * forces.Fz
    );

    // ── Calculate resultant moment about centroid ──
    const stock = workpiece.stock;
    const cx = (stock.min_x + stock.max_x) / 2;
    const cy = (stock.min_y + stock.max_y) / 2;
    const Mx = forces.Mx_Nm || (forces.Fz * (cy - stock.min_y) / 1000);
    const My = forces.My_Nm || (forces.Fz * (cx - stock.min_x) / 1000);
    const Mz = forces.torque_Nm || 0;
    const M_resultant = Math.sqrt(Mx * Mx + My * My + Mz * Mz);

    // ── Available clamping surfaces ──
    const clamp_surfaces = workpiece.clamping_surfaces || [];
    let available_area_mm2 = 0;

    // Determine which surfaces the clamping method uses
    const used_zones = this._getClampingZones(method);
    for (const surf of clamp_surfaces) {
      if (used_zones.includes(surf.zone)) {
        available_area_mm2 += surf.area_mm2;
      }
    }

    // ── Minimum area check ──
    // Minimum contact area heuristic: 200mm² per kN of cutting force
    const min_area_mm2 = (F_total / 1000) * 200;
    const sufficient_area = available_area_mm2 >= min_area_mm2;

    if (!sufficient_area) {
      warnings.push(
        `Available clamping area (${available_area_mm2.toFixed(0)}mm²) below minimum ` +
        `(${min_area_mm2.toFixed(0)}mm²) for ${(F_total).toFixed(0)}N cutting force.`
      );
    }

    // ── Clamping force calculation ──
    let total_clamp_force_N = 0;
    let normal_force_N = 0;
    let friction_force_N = 0;
    let effective_seal_area_mm2: number | undefined;
    let atmospheric_force_N: number | undefined;
    let vacuum_seal_intact: boolean | undefined;

    const n_jaws = clamping.n_jaws ?? DEFAULT_JAW_COUNT[method];
    const mu = clamping.friction_coefficient ?? FRICTION_MAP[method];

    if (method === "vacuum") {
      // ── Vacuum workholding ──
      // F = P_atm × A_seal × η
      const vacuum_eff = clamping.vacuum_efficiency ?? 0.85;
      const vacuum_p = Math.abs(clamping.vacuum_pressure_kPa ?? 80);

      // Effective seal area: use bottom surface area
      const bottom_surfaces = clamp_surfaces.filter(s => s.zone === "bottom");
      effective_seal_area_mm2 = bottom_surfaces.reduce((sum, s) => sum + s.area_mm2, 0);

      // Check seal integrity — if bottom surface has been machined through, seal breaks
      vacuum_seal_intact = effective_seal_area_mm2 > 0 &&
        bottom_surfaces.every(s => !s.is_machined || (s.flatness_um || 0) < 50);

      if (!vacuum_seal_intact) {
        warnings.push("Vacuum seal compromised — bottom surface machined or insufficient flatness.");
      }

      // Atmospheric force: F = ΔP × A × η
      // ΔP = vacuum gauge pressure (typically 80 kPa) relative to atmospheric
      atmospheric_force_N = vacuum_p * (effective_seal_area_mm2 / 1e6) * 1e3 * vacuum_eff;
      // For vacuum, the clamping force IS the atmospheric force pushing part down
      normal_force_N = atmospheric_force_N;
      // Lateral resistance from vacuum is friction between part and table
      friction_force_N = normal_force_N * 0.3; // typical table friction
      total_clamp_force_N = friction_force_N; // lateral holding = friction only

      // For vertical forces (Fz pulling up), normal force resists directly
      // Total effective resistance depends on force direction
      const lateral_force = Math.sqrt(forces.Fx * forces.Fx + forces.Fy * forces.Fy);
      const vertical_force = Math.abs(forces.Fz);

      // Combined check: lateral via friction, vertical via atmospheric pressure
      if (lateral_force > 0 && vertical_force > 0) {
        // Use worst-case ratio
        const sf_lateral = friction_force_N / Math.max(lateral_force, 0.001);
        const sf_vertical = normal_force_N / Math.max(vertical_force, 0.001);
        total_clamp_force_N = Math.min(sf_lateral, sf_vertical) * F_total;
      } else if (vertical_force > lateral_force) {
        total_clamp_force_N = normal_force_N;
      }

    } else if (method === "magnetic") {
      // ── Magnetic workholding ──
      // F = f_spec × A_contact
      const f_spec = clamping.magnetic_force_per_cm2 ?? 120; // N/cm² typical
      const bottom_area = clamp_surfaces
        .filter(s => s.zone === "bottom")
        .reduce((sum, s) => sum + s.area_mm2, 0);

      // Check material is magnetic
      if (workpiece.material && workpiece.material.magnetic === false) {
        warnings.push("Material is non-magnetic — magnetic workholding not viable.");
        normal_force_N = 0;
      } else {
        normal_force_N = f_spec * (bottom_area / 100); // mm² → cm²
      }

      friction_force_N = normal_force_N * 0.2; // magnetic table friction
      total_clamp_force_N = normal_force_N; // primarily vertical hold

    } else {
      // ── Mechanical clamping (vise, chuck, fixture, clamp) ──
      // F_clamp = μ × N × n_jaws
      const force_per_jaw = clamping.force_per_jaw_N ?? DEFAULT_CLAMP_FORCE[method];
      normal_force_N = force_per_jaw * n_jaws;
      friction_force_N = mu * normal_force_N;
      total_clamp_force_N = friction_force_N;

      // For chucks with radial grip, add direct grip component for lateral forces
      if (method.startsWith("chuck") || method === "collet" || method === "soft_jaws") {
        // Radial grip directly resists lateral forces through friction
        total_clamp_force_N = friction_force_N;
      }
    }

    // ── Safety factor ──
    const safety_factor = total_clamp_force_N / Math.max(F_total, 0.001);

    if (safety_factor < min_sf) {
      warnings.push(
        `Safety factor ${safety_factor.toFixed(2)} below minimum ${min_sf.toFixed(1)}. ` +
        `Increase clamping force or reduce cutting parameters.`
      );
    }

    if (safety_factor < 1.0) {
      warnings.push("CRITICAL: Clamping force insufficient — workpiece WILL move during cutting!");
    }

    // ── Grip degradation ──
    // As material is removed, clamping contact area decreases
    const original_stock_area = this._calculateStockSurfaceArea(stock);
    const current_area = clamp_surfaces.reduce((sum, s) => sum + s.area_mm2, 0);
    const grip_degradation_pct = Math.max(0,
      (1 - current_area / Math.max(original_stock_area, 1)) * 100
    );

    if (grip_degradation_pct > 50) {
      warnings.push(
        `Grip degradation at ${grip_degradation_pct.toFixed(0)}% — consider re-fixturing ` +
        `or additional support.`
      );
    }

    // ── Datum availability ──
    let datum_available = true;
    if (workpiece.datum_surfaces) {
      const compromised = workpiece.datum_surfaces.filter(d => !d.intact);
      if (compromised.length > 0) {
        datum_available = false;
        warnings.push(
          `Datum surface(s) ${compromised.map(d => d.datum_id).join(", ")} compromised — ` +
          `re-fixturing may require new datum scheme.`
        );
      }
    }

    // ── Volume-based grip warning ──
    if (workpiece.volume_remaining_pct < 0.3) {
      warnings.push(
        `Only ${(workpiece.volume_remaining_pct * 100).toFixed(0)}% of stock volume remaining — ` +
        `workpiece significantly weakened. Consider sacrificial clamping tabs.`
      );
    }

    const viable = safety_factor >= min_sf && sufficient_area &&
                   (vacuum_seal_intact === undefined || vacuum_seal_intact);

    return {
      viable,
      safety_factor,
      grip_degradation_pct,
      total_clamp_force_N,
      total_cutting_force_N: F_total,
      sufficient_area,
      available_clamp_area_mm2: available_area_mm2,
      datum_available,
      vacuum_seal_intact,
      warnings,
      physics: {
        normal_force_N,
        friction_force_N,
        effective_seal_area_mm2,
        atmospheric_force_N,
        resultant_moment_Nm: M_resultant
      }
    };
  }

  // ── 3. Rigidity Degradation ─────────────────────────────────────────────────

  /**
   * Analyze workpiece rigidity degradation from thin walls and floors.
   *
   * Models:
   * - **Wall stiffness (cantilever)**: k = E × w × t³ / (4 × h³)
   *   where E = modulus, w = wall length, t = thickness, h = height
   * - **Wall natural frequency**: fn = (1/2π) × √(k / m_eff)
   *   where m_eff = ρ × w × t × h (effective mass of wall)
   * - **Floor stiffness (simply-supported plate)**: k = 16 × E × t³ / (3 × (1-ν²) × a² × b²)
   *   where a, b = plate dimensions
   * - **Chatter onset**: when spindle tooth-passing frequency ≈ workpiece natural frequency
   *
   * @param workpiece_state - Current workpiece geometry state (optional, for auto wall/floor detection)
   * @param wall_thickness_mm - Wall thickness (mm) — overrides state detection
   * @param wall_height_mm - Wall height (mm)
   * @param material - Material properties (E, ρ, ν)
   * @param wall_length_mm - Wall length (mm), defaults to 50mm
   * @param floor_thickness_mm - Floor/bottom thickness (mm)
   * @param floor_length_mm - Floor length (mm)
   * @param floor_width_mm - Floor width (mm)
   * @param spindle_speed_rpm - Spindle speed for chatter check (RPM)
   * @param number_of_flutes - Number of tool flutes for tooth-passing frequency
   * @returns Rigidity degradation analysis result
   */
  analyzeRigidity(
    workpiece_state?: RigidityWorkpieceState,
    wall_thickness_mm?: number,
    wall_height_mm?: number,
    material?: RigidityMaterial,
    wall_length_mm?: number,
    floor_thickness_mm?: number,
    floor_length_mm?: number,
    floor_width_mm?: number,
    spindle_speed_rpm?: number,
    number_of_flutes?: number
  ): RigidityResult {
    if (!material) {
      throw new Error("analyzeRigidity requires material properties (E_GPa, density_kg_m3)");
    }

    const recommendations: string[] = [];
    const E_Pa = material.E_GPa * 1e9;
    const E_MPa = material.E_GPa * 1e3;
    const rho = material.density_kg_m3;
    const nu = material.poisson_ratio ?? 0.30;
    const rpm = spindle_speed_rpm ?? 10000;
    const flutes = number_of_flutes ?? 2;

    // ── Collect wall sections ──
    const walls: { thickness_mm: number; height_mm: number; length_mm: number }[] = [];

    // From explicit params
    if (wall_thickness_mm !== undefined && wall_height_mm !== undefined) {
      walls.push({
        thickness_mm: wall_thickness_mm,
        height_mm: wall_height_mm,
        length_mm: wall_length_mm ?? 50
      });
    }

    // From workpiece state
    if (workpiece_state?.wall_sections) {
      for (const ws of workpiece_state.wall_sections) {
        walls.push({
          thickness_mm: ws.thickness_mm,
          height_mm: ws.height_mm,
          length_mm: ws.length_mm
        });
      }
    }

    // ── Collect floor sections ──
    const floors: { thickness_mm: number; length_mm: number; width_mm: number }[] = [];

    if (floor_thickness_mm !== undefined) {
      floors.push({
        thickness_mm: floor_thickness_mm,
        length_mm: floor_length_mm ?? 100,
        width_mm: floor_width_mm ?? 100
      });
    }

    if (workpiece_state?.floor_sections) {
      for (const fs of workpiece_state.floor_sections) {
        floors.push({
          thickness_mm: fs.thickness_mm,
          length_mm: fs.length_mm,
          width_mm: fs.width_mm
        });
      }
    }

    // If nothing specified, generate a default wall from stock dimensions
    if (walls.length === 0 && floors.length === 0) {
      if (workpiece_state?.stock) {
        const s = workpiece_state.stock;
        const sx = s.max_x - s.min_x;
        const sy = s.max_y - s.min_y;
        const sz = s.max_z - s.min_z;
        // Default assumption: thinnest remaining dimension is wall thickness
        const minDim = Math.min(sx, sy);
        walls.push({
          thickness_mm: minDim * (workpiece_state.volume_remaining_pct ?? 0.5),
          height_mm: sz,
          length_mm: Math.max(sx, sy)
        });
      } else {
        // Nothing to analyze — return perfect rigidity
        return {
          rigidity_score: 100,
          natural_freq_hz: Infinity,
          chatter_risk: "low",
          max_safe_depth_mm: 999,
          wall_analysis: [],
          floor_analysis: [],
          recommendations: ["No thin sections detected — workpiece is fully rigid."],
          physics: {
            min_wall_stiffness_N_per_mm: Infinity,
            min_floor_stiffness_N_per_mm: Infinity,
            critical_spindle_rpm: 0,
            critical_spindle_rpm_2nd: 0,
            effective_mass_kg: 0
          }
        };
      }
    }

    // ── Tooth-passing frequency ──
    const f_tooth_hz = (rpm * flutes) / 60;

    // ── Analyze walls (cantilever beam model) ──
    const wall_results: RigidityResult["wall_analysis"] = [];
    let min_wall_stiffness = Infinity;
    let min_wall_freq = Infinity;

    for (const wall of walls) {
      const t = wall.thickness_mm;
      const h = wall.height_mm;
      const w = wall.length_mm;

      // Stiffness: k = E × w × t³ / (4 × h³) [N/mm]
      // E in MPa = N/mm², so k comes out in N/mm
      const k = (E_MPa * w * Math.pow(t, 3)) / (4 * Math.pow(h, 3));

      // Effective mass: m = ρ × w × t × h × (33/140) [cantilever effective mass ≈ 33/140 of total]
      // Volume in mm³, density in kg/m³ → convert
      const volume_mm3 = w * t * h;
      const mass_kg = rho * volume_mm3 * 1e-9; // mm³ → m³
      const m_eff = mass_kg * (33 / 140); // Rayleigh effective mass for cantilever

      // Natural frequency: fn = (1/2π) × √(k / m_eff) [Hz]
      // k in N/mm, m_eff in kg → need consistent units
      // k_SI = k × 1000 [N/m], then fn = (1/2π) × √(k_SI / m_eff)
      const k_SI = k * 1000; // N/m
      const fn = m_eff > 0 ? (1 / (2 * Math.PI)) * Math.sqrt(k_SI / m_eff) : Infinity;

      // Maximum safe force before yield (σ = M×c/I, M = F×h, c = t/2, I = w×t³/12)
      const sigma_yield = (material.yield_MPa ?? 250);
      const I_wall = (w * Math.pow(t, 3)) / 12;
      const max_force = (sigma_yield * I_wall) / (h * t / 2);

      // Deflection per 1N at tip
      const defl_per_N = 1 / k;

      // Chatter risk assessment
      const freq_ratio = fn / Math.max(f_tooth_hz, 1);
      let wall_chatter: "low" | "medium" | "high" | "critical" = "low";

      if (fn < f_tooth_hz * 0.8 || (freq_ratio > 0.9 && freq_ratio < 1.1)) {
        wall_chatter = "critical"; // resonance zone
      } else if (freq_ratio > 0.7 && freq_ratio < 1.3) {
        wall_chatter = "high";
      } else if (fn < 500) {
        wall_chatter = "high"; // absolutely low frequency
      } else if (fn < 1500) {
        wall_chatter = "medium";
      }

      wall_results.push({
        thickness_mm: t,
        height_mm: h,
        stiffness_N_per_mm: k,
        natural_freq_hz: fn,
        max_force_N: max_force,
        deflection_at_1N_mm: defl_per_N,
        chatter_risk: wall_chatter
      });

      if (k < min_wall_stiffness) min_wall_stiffness = k;
      if (fn < min_wall_freq) min_wall_freq = fn;
    }

    // ── Analyze floors (simply-supported rectangular plate model) ──
    const floor_results: RigidityResult["floor_analysis"] = [];
    let min_floor_stiffness = Infinity;
    let min_floor_freq = Infinity;

    for (const floor of floors) {
      const t = floor.thickness_mm;
      const a = floor.length_mm;
      const b = floor.width_mm;

      // Plate flexural rigidity: D = E × t³ / (12 × (1 - ν²))
      // Central stiffness of simply-supported plate:
      // k ≈ 16 × D × π⁴ / (a² × b²) × (a² + b²)⁻¹ simplified to:
      // k = (16 × E × t³) / (3 × (1 - ν²) × a² × b²) × min(a,b)² [approximate]
      // Better: use D directly
      const D = (E_MPa * Math.pow(t, 3)) / (12 * (1 - nu * nu)); // N·mm

      // Central deflection of simply-supported plate under point load P:
      // w_max ≈ P × a² × b² / (π⁴ × D × (a² + b²))
      // So k = P / w_max = π⁴ × D × (a² + b²) / (a² × b²)
      const k = (Math.pow(Math.PI, 4) * D * (a * a + b * b)) / (a * a * b * b); // N/mm

      // Floor mass
      const volume_mm3 = a * b * t;
      const mass_kg = rho * volume_mm3 * 1e-9;
      const m_eff = mass_kg * 0.25; // effective mass ≈ 1/4 of total for plate

      // Natural frequency: fn = (π/2) × √(D / (ρ×t)) × √(1/a² + 1/b²)
      // More rigorous: fn = (π/2) × √((1/a² + 1/b²) × D / (ρ_area)) where ρ_area = ρ×t
      const rho_area = rho * t * 1e-9; // kg/mm² (convert from kg/m³ and mm)
      const fn = (Math.PI / 2) * Math.sqrt(
        ((1 / (a * a)) + (1 / (b * b))) * (D / rho_area)
      );

      // Max force before yield
      const sigma_yield = material.yield_MPa ?? 250;
      // Max stress in plate center: σ = 6M / (b×t²), M ≈ P×a×b / (2π(a+b))
      // Simplified: P_max ≈ sigma_yield × t² × 2π(a+b) / (6×a×b)
      const max_force = (sigma_yield * t * t * 2 * Math.PI * (a + b)) / (6 * Math.min(a, b));

      const freq_ratio = fn / Math.max(f_tooth_hz, 1);
      let floor_chatter: "low" | "medium" | "high" | "critical" = "low";

      if (fn < f_tooth_hz * 0.8 || (freq_ratio > 0.9 && freq_ratio < 1.1)) {
        floor_chatter = "critical";
      } else if (freq_ratio > 0.7 && freq_ratio < 1.3) {
        floor_chatter = "high";
      } else if (fn < 500) {
        floor_chatter = "high";
      } else if (fn < 1500) {
        floor_chatter = "medium";
      }

      floor_results.push({
        thickness_mm: t,
        stiffness_N_per_mm: k,
        natural_freq_hz: fn,
        max_force_N: max_force,
        chatter_risk: floor_chatter
      });

      if (k < min_floor_stiffness) min_floor_stiffness = k;
      if (fn < min_floor_freq) min_floor_freq = fn;
    }

    // ── Overall rigidity score (0–100) ──
    const all_freqs = [
      ...wall_results.map(w => w.natural_freq_hz),
      ...floor_results.map(f => f.natural_freq_hz)
    ].filter(f => isFinite(f));

    const min_freq = all_freqs.length > 0 ? Math.min(...all_freqs) : Infinity;

    // Score based on minimum natural frequency and stiffness
    // fn > 5000 Hz → 100, fn < 200 Hz → 0, logarithmic scale between
    let freq_score: number;
    if (!isFinite(min_freq) || min_freq > 5000) {
      freq_score = 100;
    } else if (min_freq < 200) {
      freq_score = Math.max(0, (min_freq / 200) * 30);
    } else {
      // Logarithmic mapping: 200→30, 5000→100
      freq_score = 30 + 70 * (Math.log(min_freq / 200) / Math.log(5000 / 200));
    }

    // Stiffness component
    const min_stiffness = Math.min(
      min_wall_stiffness === Infinity ? 1e6 : min_wall_stiffness,
      min_floor_stiffness === Infinity ? 1e6 : min_floor_stiffness
    );
    let stiffness_score: number;
    if (min_stiffness > 10000) {
      stiffness_score = 100;
    } else if (min_stiffness < 10) {
      stiffness_score = Math.max(0, (min_stiffness / 10) * 20);
    } else {
      stiffness_score = 20 + 80 * (Math.log(min_stiffness / 10) / Math.log(10000 / 10));
    }

    const rigidity_score = Math.round(0.6 * freq_score + 0.4 * stiffness_score);

    // ── Overall chatter risk ──
    const all_risks = [
      ...wall_results.map(w => w.chatter_risk),
      ...floor_results.map(f => f.chatter_risk)
    ];
    const risk_order = ["low", "medium", "high", "critical"] as const;
    const max_risk_idx = all_risks.reduce((max, r) => Math.max(max, risk_order.indexOf(r as typeof risk_order[number])), 0);
    const chatter_risk = risk_order[max_risk_idx];

    // ── Max safe depth of cut ──
    // Based on achieving minimum stiffness ratio: k_part / k_tool > 4
    // For thin walls: max additional depth before unacceptable frequency drop
    let max_safe_depth = 999.0;
    for (const wr of wall_results) {
      // Approximate: removing more material from base increases height
      // Safe if fn stays above 500 Hz
      // fn ∝ t^1.5 / h² (from k ∝ t³/h³ and m ∝ t×h)
      // If current fn is already low, limit further depth
      if (wr.natural_freq_hz < 2000) {
        // Estimate how much more height before fn drops below 500 Hz
        // fn_new / fn_old = (h_old / h_new)²
        // fn_new = 500 → h_new = h_old × √(fn_old / 500)
        const max_h = wr.height_mm * Math.sqrt(wr.natural_freq_hz / 500);
        const additional = Math.max(0, max_h - wr.height_mm);
        max_safe_depth = Math.min(max_safe_depth, additional);
      }
    }

    // ── Critical spindle speeds ──
    const critical_rpm = isFinite(min_freq) ? (min_freq * 60) / flutes : 0;
    const critical_rpm_2nd = isFinite(min_freq) ? (min_freq * 60) / (2 * flutes) : 0;

    // ── Effective mass ──
    const thinnest_wall = wall_results.length > 0
      ? wall_results.reduce((min, w) => w.thickness_mm < min.thickness_mm ? w : min)
      : null;
    const eff_mass = thinnest_wall
      ? rho * thinnest_wall.thickness_mm * (walls[0]?.length_mm ?? 50) *
        thinnest_wall.height_mm * 1e-9 * (33 / 140)
      : 0;

    // ── Recommendations ──
    if (chatter_risk === "critical") {
      recommendations.push(
        "CRITICAL chatter risk — reduce spindle speed to avoid resonance, " +
        "increase wall thickness, or add damping (wax fill, support fixture)."
      );
      recommendations.push(
        `Avoid spindle speeds near ${Math.round(critical_rpm)} RPM and ${Math.round(critical_rpm_2nd)} RPM.`
      );
    } else if (chatter_risk === "high") {
      recommendations.push(
        "High chatter risk — use reduced depth of cut, climb milling, " +
        "and light finishing passes. Consider damped toolholders."
      );
    } else if (chatter_risk === "medium") {
      recommendations.push(
        "Moderate chatter risk — monitor surface finish for chatter marks. " +
        "Prefer climb milling and sharp tools."
      );
    }

    for (const wr of wall_results) {
      if (wr.thickness_mm < 2.0) {
        recommendations.push(
          `Wall ${wr.thickness_mm.toFixed(1)}mm × ${wr.height_mm.toFixed(0)}mm is very thin — ` +
          `consider support fixture, wax backfill, or alternating-side machining strategy.`
        );
      }
      if (wr.deflection_at_1N_mm > 0.01) {
        recommendations.push(
          `Wall deflects ${(wr.deflection_at_1N_mm * 100).toFixed(1)}μm per 1N — ` +
          `spring passes may be needed for dimensional accuracy.`
        );
      }
    }

    for (const fr of floor_results) {
      if (fr.thickness_mm < 3.0) {
        recommendations.push(
          `Floor thickness ${fr.thickness_mm.toFixed(1)}mm — risk of distortion during unclamping. ` +
          `Consider stress-relief or leaving extra stock for final skim pass.`
        );
      }
    }

    if (rigidity_score > 80 && recommendations.length === 0) {
      recommendations.push("Workpiece rigidity is adequate for standard machining parameters.");
    }

    return {
      rigidity_score,
      natural_freq_hz: isFinite(min_freq) ? min_freq : 0,
      chatter_risk,
      max_safe_depth_mm: max_safe_depth > 900 ? 999 : Math.round(max_safe_depth * 10) / 10,
      wall_analysis: wall_results,
      floor_analysis: floor_results,
      recommendations,
      physics: {
        min_wall_stiffness_N_per_mm: isFinite(min_wall_stiffness) ? min_wall_stiffness : 0,
        min_floor_stiffness_N_per_mm: isFinite(min_floor_stiffness) ? min_floor_stiffness : 0,
        critical_spindle_rpm: Math.round(critical_rpm),
        critical_spindle_rpm_2nd: Math.round(critical_rpm_2nd),
        effective_mass_kg: eff_mass
      }
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Estimate cutting force using simplified Kienzle model.
   * F = kc1.1 × b × h^(1-mc), with typical kc1.1 ≈ 1500 N/mm² for steel.
   *
   * @param tool_diameter_mm - Tool diameter
   * @param depth_mm - Axial depth of cut
   * @param flutes - Number of flutes
   * @returns Estimated tangential cutting force (N)
   */
  private _estimateCuttingForce(tool_diameter_mm: number, depth_mm: number, flutes: number): number {
    // Assume ae = 0.3 × diameter (30% radial engagement — typical roughing)
    const ae = tool_diameter_mm * 0.3;
    // Chip thickness: h = fz × (ae/D) for peripheral milling
    const fz = 0.05 + tool_diameter_mm * 0.005; // rough estimate of feed per tooth
    const h = fz * Math.sqrt(ae / tool_diameter_mm);
    // Kienzle: F = kc1.1 × b × h^(1-mc)
    const kc1_1 = 1800; // N/mm² ISO P steel — Sandvik canonical (CANONICAL_KIENZLE.P.kc1_1)
    const mc = 0.25;    // Kienzle exponent — ISO P canonical
    const b = Math.min(depth_mm, 5); // limit to reasonable ap
    const F_per_tooth = kc1_1 * b * Math.pow(Math.max(h, 0.01), 1 - mc);
    // Average force ≈ engagement ratio × flutes × F_per_tooth
    const engagement_ratio = Math.acos(1 - 2 * ae / tool_diameter_mm) / Math.PI;
    return F_per_tooth * engagement_ratio * Math.max(flutes * 0.5, 1);
  }

  /**
   * Determine which surface zones a clamping method uses.
   *
   * @param method - Clamping method
   * @returns Array of surface zone identifiers
   */
  private _getClampingZones(method: ClampingMethod): string[] {
    switch (method) {
      case "vise":
      case "soft_jaws":
        return ["side_x_pos", "side_x_neg"]; // vise grips X sides
      case "chuck_3jaw":
      case "chuck_4jaw":
      case "chuck_6jaw":
      case "collet":
        return ["side_x_pos", "side_x_neg", "side_y_pos", "side_y_neg"]; // radial grip
      case "vacuum":
      case "magnetic":
        return ["bottom"]; // bottom surface contact
      case "fixture_plate":
      case "toe_clamp":
      case "strap_clamp":
        return ["top", "side_x_pos", "side_x_neg", "side_y_pos", "side_y_neg"]; // flexible
      default:
        return ["bottom", "side_x_pos", "side_x_neg"];
    }
  }

  /**
   * Calculate total surface area of stock bounding box.
   *
   * @param stock - Stock AABB
   * @returns Total surface area (mm²)
   */
  private _calculateStockSurfaceArea(stock: { min_x: number; max_x: number; min_y: number; max_y: number; min_z: number; max_z: number }): number {
    const lx = stock.max_x - stock.min_x;
    const ly = stock.max_y - stock.min_y;
    const lz = stock.max_z - stock.min_z;
    return 2 * (lx * ly + ly * lz + lx * lz);
  }
}

// ── Singleton Export ─────────────────────────────────────────────────────────────

/** Singleton instance of FeasibilityAnalysisEngine */
export const feasibilityAnalysisEngine = new FeasibilityAnalysisEngine();
