/**
 * LatheCollisionZoneEngine — Lathe-Specific Collision Detection & Safety
 *
 * Checks lathe-specific collision hazards that generic 3D collision engines miss:
 *   1. Turret rotation swept volume — longest tool × turret radius during indexing
 *   2. Tool holder envelope vs chuck jaw protrusion
 *   3. Rapid traverse safe corridors between operations
 *   4. Live tool holder vs tailstock quill position
 *   5. Turret index collision — longest tool swing radius vs part OD + jaws
 *   6. Safe retract position calculation before rapids and turret indexing
 *   7. Machine swing diameter validation
 *   8. Grooving/parting overhang limits
 *   9. Minimum chip thickness (rubbing detection)
 *  10. G71 Type I vs Type II monotonicity detection
 *
 * All clearance calculations use conservative safety margins.
 * False positives acceptable; false negatives NEVER (safety-critical).
 *
 * References:
 *   - DMG MORI Collision Avoidance System — 2mm default margin
 *   - Sandvik Turning Application Guide — tool overhang limits
 *   - ISO 10218 — workholding safety factor 2.5×
 *   - Machinery's Handbook Ch.27–29 — boring bar, grooving, turning safety
 *
 * @module LatheCollisionZoneEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default safety margin [mm] for all clearance checks */
const SAFETY_MARGIN_MM = 5.0;

/** Minimum X retract clearance beyond part OD [mm] */
const MIN_X_CLEARANCE_MM = 10.0;

/** Maximum grooving blade extension / blade width ratio */
const MAX_GROOVING_OVERHANG_RATIO = 8;

/** Maximum parting blade extension / blade width ratio (tool steel) */
const MAX_PARTING_OVERHANG_RATIO = 6;

/** Rubbing threshold: f×sin(kr) < edge_radius × this factor means rubbing */
const RUBBING_FACTOR = 0.3;

/** Boring bar L/D limits by material */
const BAR_LD_LIMITS: Record<string, number> = {
  steel: 4,
  carbide: 6,
  dampened: 10,
  heavy_metal: 5,
};

/** Minimum bar diameter as fraction of bore diameter */
const MIN_BAR_DIAMETER_RATIO = 0.7;

// ============================================================================
// TYPES
// ============================================================================

export interface LatheTurretConfig {
  /** Number of tool stations */
  station_count: number;
  /** Turret center-to-tool-tip radius [mm] */
  turret_radius_mm: number;
  /** Tool holder protrusion beyond turret face [mm] per station */
  tool_protrusions_mm: number[];
  /** Tool holder diameters [mm] per station (for envelope check) */
  tool_holder_diameters_mm?: number[];
  /** Live tool stations (station indices, 0-based) */
  live_tool_stations?: number[];
  /** Turret type */
  turret_type?: "disc" | "drum" | "gang" | "bmt";
}

export interface LatheWorkpieceConfig {
  /** Part outer diameter [mm] */
  part_od_mm: number;
  /** Part length [mm] (stickout from chuck face) */
  part_length_mm: number;
  /** Bar stock OD [mm] */
  bar_stock_od_mm: number;
  /** Chuck jaw protrusion beyond part OD [mm] */
  chuck_jaw_protrusion_mm?: number;
  /** Chuck jaw length along Z [mm] */
  chuck_jaw_length_mm?: number;
}

export interface LatheMachineConfig {
  /** Maximum swing diameter over bed [mm] */
  max_swing_diameter_mm: number;
  /** Maximum swing over cross slide [mm] */
  max_swing_cross_slide_mm?: number;
  /** Tailstock engaged */
  tailstock_engaged?: boolean;
  /** Tailstock quill position Z [mm] from chuck face */
  tailstock_z_mm?: number;
  /** Tailstock quill diameter [mm] */
  tailstock_quill_diameter_mm?: number;
  /** Sub-spindle present */
  has_sub_spindle?: boolean;
}

export interface LatheToolStation {
  /** Station number (1-based) */
  station: number;
  /** Tool type */
  tool_type: "turning" | "boring" | "grooving" | "threading" | "parting" | "drill" | "live_mill" | "live_drill";
  /** Tool stickout from holder [mm] */
  tool_stickout_mm: number;
  /** Tool holder protrusion [mm] */
  holder_protrusion_mm: number;
  /** Tool or holder diameter [mm] */
  diameter_mm: number;
  /** Blade width for grooving/parting [mm] */
  blade_width_mm?: number;
  /** Insert edge radius [mm] (for minimum chip thickness check) */
  edge_radius_mm?: number;
  /** Approach angle kr [degrees] (for minimum chip thickness check) */
  approach_angle_deg?: number;
  /** Bar diameter for boring bars [mm] */
  bar_diameter_mm?: number;
  /** Bar material for boring bars */
  bar_material?: "steel" | "carbide" | "dampened" | "heavy_metal";
  /** Bore depth [mm] for boring operations */
  bore_depth_mm?: number;
}

export interface CollisionCheckInput {
  turret: LatheTurretConfig;
  workpiece: LatheWorkpieceConfig;
  machine: LatheMachineConfig;
  tools?: LatheToolStation[];
  /** Current tool station (1-based) */
  current_station?: number;
  /** Target tool station for index check (1-based) */
  target_station?: number;
  /** Current X position [mm] (diameter programming) */
  current_x_mm?: number;
  /** Current Z position [mm] */
  current_z_mm?: number;
}

export interface CollisionResult {
  safe: boolean;
  checks: CollisionCheck[];
  safe_retract_x_mm: number;
  safe_retract_z_mm: number;
  warnings: string[];
  critical_errors: string[];
}

export interface CollisionCheck {
  check_type: string;
  passed: boolean;
  clearance_mm: number;
  description: string;
  severity: "info" | "warning" | "critical";
}

export interface GroovingOverhangResult {
  safe: boolean;
  blade_width_mm: number;
  extension_mm: number;
  overhang_ratio: number;
  max_ratio: number;
  recommendation: string;
}

export interface MinChipThicknessResult {
  cutting: boolean;
  chip_thickness_mm: number;
  edge_radius_mm: number;
  threshold_mm: number;
  recommendation: string;
}

export interface BoringReachResult {
  reachable: boolean;
  bar_diameter_mm: number;
  bore_diameter_mm: number;
  bore_depth_mm: number;
  ld_ratio: number;
  max_ld: number;
  bar_material: string;
  recommended_material: string;
  warnings: string[];
}

export interface G71TypeResult {
  type: "I" | "II";
  x_monotonic: boolean;
  reversal_indices: number[];
  recommendation: string;
}

export interface ProfilePoint {
  x: number;
  z: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheCollisionZoneEngineImpl {

  // --------------------------------------------------------------------------
  // 1. Full collision check suite
  // --------------------------------------------------------------------------
  checkAll(input: CollisionCheckInput): CollisionResult {
    const checks: CollisionCheck[] = [];
    const warnings: string[] = [];
    const criticals: string[] = [];

    // Machine swing validation
    const swingCheck = this.checkMachineSwing(input);
    checks.push(swingCheck);
    if (!swingCheck.passed) {
      criticals.push(swingCheck.description);
    }

    // Chuck jaw clearance
    const jawCheck = this.checkChuckJawClearance(input);
    checks.push(jawCheck);
    if (!jawCheck.passed) {
      criticals.push(jawCheck.description);
    }

    // Turret index collision (if target station given)
    if (input.target_station && input.current_station) {
      const indexCheck = this.checkTurretIndex(input);
      checks.push(indexCheck);
      if (!indexCheck.passed) {
        criticals.push(indexCheck.description);
      }
    }

    // Live tool vs tailstock
    if (input.machine.tailstock_engaged && input.tools) {
      const liveTools = input.tools.filter(t =>
        t.tool_type === "live_mill" || t.tool_type === "live_drill"
      );
      for (const lt of liveTools) {
        const tailCheck = this.checkLiveToolVsTailstock(input, lt);
        checks.push(tailCheck);
        if (!tailCheck.passed) {
          warnings.push(tailCheck.description);
        }
      }
    }

    // Tool-by-tool checks
    if (input.tools) {
      for (const tool of input.tools) {
        // Grooving/parting overhang
        if (tool.tool_type === "grooving" || tool.tool_type === "parting") {
          const ohResult = this.checkGroovingOverhang(tool);
          if (!ohResult.safe) {
            checks.push({
              check_type: "grooving_overhang",
              passed: false,
              clearance_mm: 0,
              description: ohResult.recommendation,
              severity: "warning",
            });
            warnings.push(ohResult.recommendation);
          }
        }

        // Boring bar reach
        if (tool.tool_type === "boring" && tool.bar_diameter_mm && tool.bore_depth_mm) {
          const reachResult = this.checkBoringBarReach(tool);
          if (!reachResult.reachable) {
            checks.push({
              check_type: "boring_reach",
              passed: false,
              clearance_mm: 0,
              description: reachResult.warnings.join("; "),
              severity: "critical",
            });
            criticals.push(...reachResult.warnings);
          }
        }
      }
    }

    // Calculate safe retract positions
    const safeX = this.calculateSafeRetractX(input);
    const safeZ = this.calculateSafeRetractZ(input);

    const allPassed = checks.every(c => c.passed);

    return {
      safe: allPassed,
      checks,
      safe_retract_x_mm: safeX,
      safe_retract_z_mm: safeZ,
      warnings,
      critical_errors: criticals,
    };
  }

  // --------------------------------------------------------------------------
  // 2. Machine swing validation (U08)
  // --------------------------------------------------------------------------
  checkMachineSwing(input: CollisionCheckInput): CollisionCheck {
    const partOD = input.workpiece.part_od_mm;
    const barOD = input.workpiece.bar_stock_od_mm;
    const maxSwing = input.machine.max_swing_diameter_mm;
    const effectiveOD = Math.max(partOD, barOD);
    const jawProtrusion = input.workpiece.chuck_jaw_protrusion_mm ?? 15;
    const totalSwingNeeded = effectiveOD + 2 * jawProtrusion;

    const clearance = maxSwing - totalSwingNeeded;
    const passed = clearance >= 0;

    return {
      check_type: "machine_swing",
      passed,
      clearance_mm: clearance,
      description: passed
        ? `Machine swing OK: ${totalSwingNeeded.toFixed(1)}mm needed, ${maxSwing}mm available (${clearance.toFixed(1)}mm clearance)`
        : `SWING EXCEEDED: Part + jaws = ${totalSwingNeeded.toFixed(1)}mm exceeds machine swing ${maxSwing}mm by ${Math.abs(clearance).toFixed(1)}mm — part CANNOT be machined on this machine`,
      severity: passed ? "info" : "critical",
    };
  }

  // --------------------------------------------------------------------------
  // 3. Chuck jaw clearance check
  // --------------------------------------------------------------------------
  checkChuckJawClearance(input: CollisionCheckInput): CollisionCheck {
    const jawProtrusion = input.workpiece.chuck_jaw_protrusion_mm ?? 15;
    const jawLength = input.workpiece.chuck_jaw_length_mm ?? 50;
    const partOD = input.workpiece.part_od_mm;

    // Longest tool protrusion across all stations
    let longestTool = 0;
    if (input.turret.tool_protrusions_mm.length > 0) {
      longestTool = Math.max(...input.turret.tool_protrusions_mm);
    }

    // Tool envelope radius from turret center
    const toolEnvelopeRadius = input.turret.turret_radius_mm + longestTool;

    // Chuck jaw outer radius
    const jawOuterRadius = partOD / 2 + jawProtrusion;

    // Clearance between tool swing and jaw
    // This is approximate — real check depends on turret position
    const clearance = toolEnvelopeRadius > 0
      ? (input.current_x_mm ?? toolEnvelopeRadius * 2) / 2 - jawOuterRadius - SAFETY_MARGIN_MM
      : SAFETY_MARGIN_MM;

    const passed = clearance >= 0;

    return {
      check_type: "chuck_jaw_clearance",
      passed,
      clearance_mm: clearance,
      description: passed
        ? `Chuck jaw clearance OK: ${clearance.toFixed(1)}mm clearance`
        : `Chuck jaw COLLISION risk: tool envelope may contact jaws — retract X to at least ${(jawOuterRadius * 2 + SAFETY_MARGIN_MM * 2).toFixed(1)}mm diameter before indexing`,
      severity: passed ? "info" : "critical",
    };
  }

  // --------------------------------------------------------------------------
  // 4. Turret index collision check (U06)
  // --------------------------------------------------------------------------
  checkTurretIndex(input: CollisionCheckInput): CollisionCheck {
    const longestTool = Math.max(...input.turret.tool_protrusions_mm, 0);
    const turretRadius = input.turret.turret_radius_mm;
    const swingRadius = turretRadius + longestTool;

    const partRadius = input.workpiece.bar_stock_od_mm / 2;
    const jawProtrusion = input.workpiece.chuck_jaw_protrusion_mm ?? 15;
    const obstacleRadius = partRadius + jawProtrusion;

    // X position must clear the swing radius
    const currentXRadius = (input.current_x_mm ?? 0) / 2; // diameter → radius
    const clearance = currentXRadius - swingRadius - obstacleRadius;

    // Minimum safe X (diameter) for turret indexing
    const minSafeXDia = 2 * (swingRadius + obstacleRadius + SAFETY_MARGIN_MM);

    const passed = clearance >= SAFETY_MARGIN_MM;

    return {
      check_type: "turret_index",
      passed,
      clearance_mm: clearance,
      description: passed
        ? `Turret index safe at X${(input.current_x_mm ?? 0).toFixed(1)}: ${clearance.toFixed(1)}mm clearance`
        : `TURRET INDEX COLLISION: swing radius ${swingRadius.toFixed(1)}mm + obstacle ${obstacleRadius.toFixed(1)}mm — retract X to at least ${minSafeXDia.toFixed(1)}mm diameter before indexing`,
      severity: passed ? "info" : "critical",
    };
  }

  // --------------------------------------------------------------------------
  // 5. Live tool vs tailstock check (U05)
  // --------------------------------------------------------------------------
  checkLiveToolVsTailstock(input: CollisionCheckInput, tool: LatheToolStation): CollisionCheck {
    if (!input.machine.tailstock_engaged || !input.machine.tailstock_z_mm) {
      return {
        check_type: "live_tool_vs_tailstock",
        passed: true,
        clearance_mm: 999,
        description: "Tailstock not engaged — no conflict",
        severity: "info",
      };
    }

    const tailstockZ = input.machine.tailstock_z_mm;
    const tailstockDia = input.machine.tailstock_quill_diameter_mm ?? 30;
    const toolStickout = tool.tool_stickout_mm + tool.holder_protrusion_mm;
    const toolDia = tool.diameter_mm;

    // Live tool reaches in Z: its position could conflict with tailstock quill
    // The tool needs clearance from the quill
    const clearance = tailstockZ - toolStickout - tailstockDia / 2 - SAFETY_MARGIN_MM;
    const passed = clearance >= 0;

    return {
      check_type: "live_tool_vs_tailstock",
      passed,
      clearance_mm: clearance,
      description: passed
        ? `Live tool station ${tool.station} clear of tailstock: ${clearance.toFixed(1)}mm`
        : `Live tool station ${tool.station} CONFLICTS with tailstock — retract tailstock before live tooling, re-engage after. Need ${Math.abs(clearance).toFixed(1)}mm more clearance`,
      severity: passed ? "info" : "warning",
    };
  }

  // --------------------------------------------------------------------------
  // 6. Safe retract X calculation (U07)
  // --------------------------------------------------------------------------
  calculateSafeRetractX(input: CollisionCheckInput): number {
    const partRadius = Math.max(input.workpiece.part_od_mm, input.workpiece.bar_stock_od_mm) / 2;
    const jawProtrusion = input.workpiece.chuck_jaw_protrusion_mm ?? 15;

    // For turret indexing: must clear longest tool swing
    const longestTool = Math.max(...input.turret.tool_protrusions_mm, 0);
    const swingRadius = input.turret.turret_radius_mm + longestTool;

    // Safe X = part radius + jaw protrusion + longest tool + safety margin
    // Returned as DIAMETER (CNC convention)
    const safeXRadius = partRadius + jawProtrusion + MIN_X_CLEARANCE_MM;

    // For indexing, need even more clearance
    const indexSafeXRadius = swingRadius + partRadius + jawProtrusion + SAFETY_MARGIN_MM;

    return Math.max(safeXRadius, indexSafeXRadius) * 2; // diameter
  }

  // --------------------------------------------------------------------------
  // 7. Safe retract Z calculation (U07)
  // --------------------------------------------------------------------------
  calculateSafeRetractZ(input: CollisionCheckInput): number {
    // Safe Z = positive of part face (chuck side), clear of chuck jaws
    const jawLength = input.workpiece.chuck_jaw_length_mm ?? 50;
    // Z positive = away from chuck. Safe retract is past part length + margin
    return input.workpiece.part_length_mm + SAFETY_MARGIN_MM;
  }

  // --------------------------------------------------------------------------
  // 8. Grooving/parting overhang check (U04)
  // --------------------------------------------------------------------------
  checkGroovingOverhang(tool: LatheToolStation): GroovingOverhangResult {
    const bladeWidth = tool.blade_width_mm ?? 3;
    const extension = tool.tool_stickout_mm;
    const ratio = extension / bladeWidth;
    const isParting = tool.tool_type === "parting";
    const maxRatio = isParting ? MAX_PARTING_OVERHANG_RATIO : MAX_GROOVING_OVERHANG_RATIO;
    const safe = ratio <= maxRatio;

    let recommendation: string;
    if (safe) {
      recommendation = `${isParting ? "Parting" : "Grooving"} overhang OK: ${ratio.toFixed(1)}× (max ${maxRatio}×)`;
    } else {
      recommendation = `${isParting ? "Parting" : "Grooving"} overhang EXCEEDED: ${ratio.toFixed(1)}× > ${maxRatio}× limit — use wider blade (${Math.ceil(extension / maxRatio)}mm) or reduce extension`;
    }

    return { safe, blade_width_mm: bladeWidth, extension_mm: extension, overhang_ratio: ratio, max_ratio: maxRatio, recommendation };
  }

  // --------------------------------------------------------------------------
  // 9. Minimum chip thickness check (U09)
  // --------------------------------------------------------------------------
  checkMinChipThickness(
    feed_per_rev_mm: number,
    approach_angle_deg: number,
    edge_radius_mm: number,
  ): MinChipThicknessResult {
    const kr = approach_angle_deg * Math.PI / 180;
    const chipThickness = feed_per_rev_mm * Math.sin(kr);
    const threshold = edge_radius_mm * RUBBING_FACTOR;
    const cutting = chipThickness >= threshold;

    let recommendation: string;
    if (cutting) {
      recommendation = `Chip thickness ${chipThickness.toFixed(4)}mm >= ${threshold.toFixed(4)}mm — cutting properly`;
    } else {
      const minFeed = threshold / Math.sin(kr);
      recommendation = `RUBBING: chip thickness ${chipThickness.toFixed(4)}mm < ${threshold.toFixed(4)}mm — increase feed to at least ${minFeed.toFixed(3)}mm/rev or use sharper insert (smaller edge radius)`;
    }

    return { cutting, chip_thickness_mm: chipThickness, edge_radius_mm, threshold_mm: threshold, recommendation };
  }

  // --------------------------------------------------------------------------
  // 10. Boring bar reach validation (U03)
  // --------------------------------------------------------------------------
  checkBoringBarReach(tool: LatheToolStation): BoringReachResult {
    const barDia = tool.bar_diameter_mm ?? 20;
    const boreDia = tool.diameter_mm; // bore diameter
    const boreDepth = tool.bore_depth_mm ?? 50;
    const barMat = tool.bar_material ?? "steel";

    const ldRatio = boreDepth / barDia;
    const maxLD = BAR_LD_LIMITS[barMat] ?? 4;
    const warnings: string[] = [];

    // Check L/D limit
    const reachable = ldRatio <= maxLD;
    if (!reachable) {
      warnings.push(`Boring bar L/D=${ldRatio.toFixed(1)} exceeds ${barMat} limit of ${maxLD} — chatter will occur`);
    }

    // Check minimum bar diameter (70% of bore diameter)
    if (barDia < boreDia * MIN_BAR_DIAMETER_RATIO) {
      warnings.push(`Bar diameter ${barDia}mm < ${(boreDia * MIN_BAR_DIAMETER_RATIO).toFixed(1)}mm (70% of bore) — insufficient rigidity`);
    }

    // Recommend bar material upgrade if needed
    let recommendedMaterial: string = barMat;
    if (!reachable) {
      for (const [mat, limit] of Object.entries(BAR_LD_LIMITS)) {
        if (ldRatio <= limit) {
          recommendedMaterial = mat;
          break;
        }
      }
      if (recommendedMaterial !== barMat) {
        warnings.push(`Upgrade bar to ${recommendedMaterial} (L/D limit ${BAR_LD_LIMITS[recommendedMaterial]})`);
      } else {
        warnings.push(`No standard bar material supports L/D=${ldRatio.toFixed(1)} — consider special tooling`);
      }
    }

    return {
      reachable,
      bar_diameter_mm: barDia,
      bore_diameter_mm: boreDia,
      bore_depth_mm: boreDepth,
      ld_ratio: ldRatio,
      max_ld: maxLD,
      bar_material: barMat,
      recommended_material: recommendedMaterial,
      warnings,
    };
  }

  // --------------------------------------------------------------------------
  // 11. Boring taper compensation (U11)
  // --------------------------------------------------------------------------
  calculateBoringTaperCompensation(
    bar_diameter_mm: number,
    bar_material: "steel" | "carbide" | "dampened" | "heavy_metal",
    bore_depth_mm: number,
    cutting_force_N: number,
    num_z_points?: number,
  ): Array<{ z_mm: number; deflection_mm: number; compensation_mm: number }> {
    // Young's modulus [GPa → N/mm²]
    const E_MAP: Record<string, number> = {
      steel: 210_000,
      carbide: 600_000, // QA-MS3 canonical
      dampened: 210_000,
      heavy_metal: 345_000,
    };

    const E = E_MAP[bar_material] ?? 210_000;
    const I = (Math.PI * Math.pow(bar_diameter_mm, 4)) / 64; // mm^4
    const points = num_z_points ?? 10;
    const result: Array<{ z_mm: number; deflection_mm: number; compensation_mm: number }> = [];

    for (let i = 0; i <= points; i++) {
      const z = (bore_depth_mm * i) / points;
      // Cantilever beam: delta = F * L^3 / (3 * E * I)
      // L = overhang = z (tool extends z mm into bore)
      const L = z;
      const deflection = L > 0 ? (cutting_force_N * Math.pow(L, 3)) / (3 * E * I) : 0;
      // Compensation: program OPPOSITE direction to straighten the bore
      result.push({
        z_mm: z,
        deflection_mm: deflection,
        compensation_mm: deflection === 0 ? 0 : -deflection, // counter-taper
      });
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // 12. Boring bar springback compensation (U12)
  // --------------------------------------------------------------------------
  calculateSpringbackCompensation(
    bar_diameter_mm: number,
    bar_material: "steel" | "carbide" | "dampened" | "heavy_metal",
    depth_of_cut_mm: number,
    overhang_mm: number,
    cutting_force_N: number,
  ): { springback_mm: number; compensation_mm: number; recommendation: string } {
    const E_MAP: Record<string, number> = {
      steel: 210_000,
      carbide: 600_000, // QA-MS3 canonical
      dampened: 210_000,
      heavy_metal: 345_000,
    };

    const E = E_MAP[bar_material] ?? 210_000;
    const I = (Math.PI * Math.pow(bar_diameter_mm, 4)) / 64;

    // When cutting stops at bore bottom, bar springs back toward workpiece
    // by the amount it was deflected during cutting
    const springback = (cutting_force_N * Math.pow(overhang_mm, 3)) / (3 * E * I);

    // Clamp to practical range [0.005mm - 0.02mm typical]
    const clampedCompensation = Math.min(Math.max(springback, 0.005), 0.05);

    return {
      springback_mm: springback,
      compensation_mm: clampedCompensation,
      recommendation: `Program ${clampedCompensation.toFixed(4)}mm smaller at bore bottom to compensate for springback (calculated: ${springback.toFixed(4)}mm)`,
    };
  }

  // --------------------------------------------------------------------------
  // 13. G71 Type I vs Type II detection (U13)
  // --------------------------------------------------------------------------
  detectG71Type(profile: ProfilePoint[]): G71TypeResult {
    if (profile.length < 2) {
      return {
        type: "I",
        x_monotonic: true,
        reversal_indices: [],
        recommendation: "Profile too short for type detection — default Type I",
      };
    }

    // Check X monotonicity: Type I requires X values to be monotonically
    // increasing (OD) or decreasing (ID) throughout the profile.
    // If X reverses direction, Type II is REQUIRED.
    const reversalIndices: number[] = [];
    let direction: "increasing" | "decreasing" | null = null;

    for (let i = 1; i < profile.length; i++) {
      const dx = profile[i].x - profile[i - 1].x;
      if (Math.abs(dx) < 0.001) continue; // ignore negligible changes

      const currentDir = dx > 0 ? "increasing" : "decreasing";
      if (direction === null) {
        direction = currentDir;
      } else if (currentDir !== direction) {
        reversalIndices.push(i);
        direction = currentDir;
      }
    }

    const isMonotonic = reversalIndices.length === 0;
    const type = isMonotonic ? "I" : "II";

    let recommendation: string;
    if (isMonotonic) {
      recommendation = "Profile X is monotonic — G71 Type I (standard) is safe";
    } else {
      recommendation = `CRITICAL: Profile X reverses at ${reversalIndices.length} point(s) [indices: ${reversalIndices.join(",")}] — MUST use G71 Type II (R1 on Yasnac). Using Type I will CRASH into the part`;
    }

    return { type, x_monotonic: isMonotonic, reversal_indices: reversalIndices, recommendation };
  }

  // --------------------------------------------------------------------------
  // 14. Rapid traverse corridor check (part of U07)
  // --------------------------------------------------------------------------
  checkRapidCorridor(
    from_x_mm: number,
    from_z_mm: number,
    to_x_mm: number,
    to_z_mm: number,
    workpiece: LatheWorkpieceConfig,
  ): CollisionCheck {
    const partRadius = workpiece.bar_stock_od_mm / 2;
    const jawProtrusion = workpiece.chuck_jaw_protrusion_mm ?? 15;
    const obstacleRadius = partRadius + jawProtrusion;

    // Check if rapid path crosses through part/jaw zone
    // Lathe rapids: machine moves in X and Z simultaneously (45-degree approach)
    // Danger: if Z is within part length and X is within part OD
    const minX = Math.min(from_x_mm, to_x_mm) / 2; // radius
    const maxZ = Math.max(from_z_mm, to_z_mm);
    const minZ = Math.min(from_z_mm, to_z_mm);

    let collision = false;
    let clearance = 999.0;

    // If rapid path passes through Z range of part
    if (minZ < workpiece.part_length_mm + SAFETY_MARGIN_MM) {
      // Check if X could enter part zone during rapid
      if (minX < obstacleRadius + SAFETY_MARGIN_MM) {
        collision = true;
        clearance = minX - obstacleRadius;
      }
    }

    return {
      check_type: "rapid_corridor",
      passed: !collision,
      clearance_mm: clearance,
      description: collision
        ? `Rapid from X${from_x_mm.toFixed(1)} Z${from_z_mm.toFixed(1)} to X${to_x_mm.toFixed(1)} Z${to_z_mm.toFixed(1)} passes through part zone — use intermediate G28 retract`
        : `Rapid corridor clear: ${clearance.toFixed(1)}mm from obstacles`,
      severity: collision ? "critical" : "info",
    };
  }
}

/** Singleton instance */
export const latheCollisionZoneEngine = new LatheCollisionZoneEngineImpl();
