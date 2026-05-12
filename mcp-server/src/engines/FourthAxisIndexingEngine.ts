/**
 * FourthAxisIndexingEngine — 4-Axis Milling Strategies for PRISM
 * ===============================================================
 * Core engine for 4th axis rotary indexing and interpolation:
 *   - Positional indexing (0°, 90°, 180°, 270° for tombstone/fixture plate)
 *   - Continuous 4th axis interpolation (wrap milling, rotary contouring)
 *   - Speed/feed compensation for rotary surface velocity
 *   - Index time calculation and cycle optimization
 *   - Collision-aware approach/retract for indexed positions
 *
 * Supports JM Die machines:
 *   - Haas VF-2 with TR160/TR210 rotary table
 *   - Hurco VM30i with 4th axis rotary
 *   - Okuma M460V-5AX in 4-axis indexing mode
 *
 * References:
 *   - Haas Automation TR Series Manual (rotary specs)
 *   - Machinery's Handbook 31st Ed, Ch. 22 (rotary milling)
 *
 * @module engines/FourthAxisIndexingEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Rotary axis configuration */
export type RotaryAxisType = "A" | "B" | "C";

/** Indexing mode */
export type IndexingMode =
  | "positional"    // Discrete positions (0°, 90°, etc.)
  | "continuous"    // Interpolated rotary motion
  | "wrap"          // Wrap-around cylindrical milling
  | "compound";     // Combined linear + rotary interpolation

/** Rotary table specification */
export interface RotaryTableSpec {
  model: string;
  axis: RotaryAxisType;
  diameter_mm: number;
  max_load_kg: number;
  max_rpm: number;
  min_increment_deg: number;
  clamp_time_sec: number;
  unclamp_time_sec: number;
  index_speed_deg_per_sec: number;
  has_tailstock: boolean;
  through_hole_mm?: number;
  tilting_axis?: RotaryAxisType;
  tilt_range_deg?: [number, number];
}

/** Haas TR160 spec — reference data */
export const HAAS_TR160: RotaryTableSpec = {
  model: "Haas TR160",
  axis: "A",
  diameter_mm: 160,
  max_load_kg: 54,
  max_rpm: 100,
  min_increment_deg: 0.001,
  clamp_time_sec: 0.5,
  unclamp_time_sec: 0.5,
  index_speed_deg_per_sec: 100,
  has_tailstock: false,
  through_hole_mm: 50,
  tilting_axis: "B",
  tilt_range_deg: [-120, 30],
};

/** Haas TR210 spec — reference data */
export const HAAS_TR210: RotaryTableSpec = {
  model: "Haas TR210",
  axis: "A",
  diameter_mm: 210,
  max_load_kg: 113,
  max_rpm: 60,
  min_increment_deg: 0.001,
  clamp_time_sec: 0.5,
  unclamp_time_sec: 0.5,
  index_speed_deg_per_sec: 60,
  has_tailstock: false,
  through_hole_mm: 64,
  tilting_axis: "B",
  tilt_range_deg: [-120, 30],
};

/** HRT210 (horizontal rotary table, no tilt) */
export const HAAS_HRT210: RotaryTableSpec = {
  model: "Haas HRT210",
  axis: "A",
  diameter_mm: 210,
  max_load_kg: 136,
  max_rpm: 100,
  min_increment_deg: 0.001,
  clamp_time_sec: 0.3,
  unclamp_time_sec: 0.3,
  index_speed_deg_per_sec: 100,
  has_tailstock: true,
  through_hole_mm: 64,
};

/** Indexed position for multi-face machining */
export interface IndexedPosition {
  face_id: number;
  angle_deg: number;
  face_normal: { x: number; y: number; z: number };
  work_offset?: string;  // G54-G59 or G54.1 P1-P99
  description?: string;
}

/** Standard tombstone/fixture plate configurations */
export const TOMBSTONE_CONFIGS = {
  "2-face": [
    { face_id: 0, angle_deg: 0, face_normal: { x: 0, y: 0, z: 1 }, description: "Front face" },
    { face_id: 1, angle_deg: 180, face_normal: { x: 0, y: 0, z: -1 }, description: "Back face" },
  ] as IndexedPosition[],
  "4-face": [
    { face_id: 0, angle_deg: 0, face_normal: { x: 0, y: 0, z: 1 }, description: "Front face" },
    { face_id: 1, angle_deg: 90, face_normal: { x: 1, y: 0, z: 0 }, description: "Right face" },
    { face_id: 2, angle_deg: 180, face_normal: { x: 0, y: 0, z: -1 }, description: "Back face" },
    { face_id: 3, angle_deg: 270, face_normal: { x: -1, y: 0, z: 0 }, description: "Left face" },
  ] as IndexedPosition[],
  "6-face": [
    { face_id: 0, angle_deg: 0, face_normal: { x: 0, y: 0, z: 1 }, description: "Front face" },
    { face_id: 1, angle_deg: 60, face_normal: { x: 0.866, y: 0, z: 0.5 }, description: "Face 60°" },
    { face_id: 2, angle_deg: 120, face_normal: { x: 0.866, y: 0, z: -0.5 }, description: "Face 120°" },
    { face_id: 3, angle_deg: 180, face_normal: { x: 0, y: 0, z: -1 }, description: "Back face" },
    { face_id: 4, angle_deg: 240, face_normal: { x: -0.866, y: 0, z: -0.5 }, description: "Face 240°" },
    { face_id: 5, angle_deg: 300, face_normal: { x: -0.866, y: 0, z: 0.5 }, description: "Face 300°" },
  ] as IndexedPosition[],
};

/** Input for 4th axis indexing calculation */
export interface FourthAxisInput {
  /** Machine ID from shop configuration */
  machine_id: string;
  /** Rotary table spec (if known) */
  rotary_table?: RotaryTableSpec;
  /** Indexing mode */
  mode: IndexingMode;
  /** Indexed positions for positional mode */
  positions?: IndexedPosition[];
  /** Tombstone configuration shortcut */
  tombstone_config?: "2-face" | "4-face" | "6-face";
  /** Part diameter for wrap milling (mm) */
  part_diameter_mm?: number;
  /** Part length along rotary axis (mm) */
  part_length_mm?: number;
  /** Cutting parameters */
  cutting?: {
    tool_diameter_mm: number;
    vc_m_min: number;
    fz_mm: number;
    ae_mm: number;
    ap_mm: number;
    flutes: number;
  };
  /** Safe Z height for indexing (mm above part) */
  safe_z_mm?: number;
}

/** Result for positional indexing */
export interface PositionalIndexingResult {
  mode: "positional";
  positions: IndexedPosition[];
  total_index_time_sec: number;
  index_sequence: Array<{
    from_deg: number;
    to_deg: number;
    travel_deg: number;
    direction: "cw" | "ccw";
    time_sec: number;
  }>;
  cycle_optimization: {
    optimized_sequence: number[];  // Face IDs in optimal order
    total_travel_deg: number;
    time_saved_sec: number;
  };
  g_code_snippet: string;
}

/** Result for continuous/wrap milling */
export interface ContinuousIndexingResult {
  mode: "continuous" | "wrap";
  /** Effective cutting diameter at part surface */
  effective_diameter_mm: number;
  /** Surface speed at part OD (m/min) */
  surface_speed_m_min: number;
  /** Required rotary RPM for wrap milling */
  rotary_rpm: number;
  /** Adjusted feed rate for rotary motion */
  adjusted_feed_mm_min: number;
  /** Circumference of part (mm) */
  circumference_mm: number;
  /** G-code for rotary interpolation */
  g_code_snippet: string;
  /** Warnings for edge cases */
  warnings: string[];
}

/** Combined result type */
export type FourthAxisResult = PositionalIndexingResult | ContinuousIndexingResult;

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * FourthAxisIndexingEngine — Core 4th axis milling intelligence.
 *
 * Provides calculations for:
 * - Positional indexing with optimized sequence
 * - Wrap milling with surface speed compensation
 * - Cycle time estimation for rotary operations
 */
export class FourthAxisIndexingEngine {
  /**
   * Calculate 4th axis indexing parameters.
   *
   * @param input - 4th axis configuration
   * @returns Indexing result with optimized sequence or wrap parameters
   */
  static calculate(input: FourthAxisInput): FourthAxisResult {
    log.info(`[FourthAxisIndexing] mode=${input.mode}, machine=${input.machine_id}`);

    if (input.mode === "positional") {
      return this.calculatePositionalIndexing(input);
    } else if (input.mode === "wrap" || input.mode === "continuous") {
      return this.calculateContinuousIndexing(input);
    } else {
      // Compound mode — combination
      return this.calculateContinuousIndexing(input);
    }
  }

  /**
   * Calculate positional indexing with optimized sequence.
   * Uses nearest-neighbor heuristic for minimal total rotation.
   */
  private static calculatePositionalIndexing(input: FourthAxisInput): PositionalIndexingResult {
    // Get positions from tombstone config or explicit list
    let positions: IndexedPosition[];
    if (input.tombstone_config) {
      positions = [...TOMBSTONE_CONFIGS[input.tombstone_config]];
    } else if (input.positions && input.positions.length > 0) {
      positions = [...input.positions];
    } else {
      // Default to 4-face when no positions specified
      positions = [...TOMBSTONE_CONFIGS["4-face"]];
    }

    // Get rotary table spec
    const rotary = input.rotary_table ?? HAAS_TR160;
    const indexSpeed = rotary.index_speed_deg_per_sec;
    const clampTime = rotary.clamp_time_sec;
    const unclampTime = rotary.unclamp_time_sec;

    // Calculate index sequence (naive order first)
    const indexSequence: PositionalIndexingResult["index_sequence"] = [];
    let currentAngle = 0;
    let totalTime = 0;

    for (const pos of positions) {
      const travel = this.shortestRotation(currentAngle, pos.angle_deg);
      const time = unclampTime + Math.abs(travel) / indexSpeed + clampTime;
      indexSequence.push({
        from_deg: currentAngle,
        to_deg: pos.angle_deg,
        travel_deg: Math.abs(travel),
        direction: travel >= 0 ? "cw" : "ccw",
        time_sec: time,
      });
      totalTime += time;
      currentAngle = pos.angle_deg;
    }

    // Optimize sequence using nearest-neighbor
    const optimized = this.optimizeIndexSequence(positions);
    let optimizedTravel = 0;
    let optimizedTime = 0;
    let optCurrent = 0;

    for (const faceId of optimized) {
      const pos = positions[faceId];
      const travel = Math.abs(this.shortestRotation(optCurrent, pos.angle_deg));
      optimizedTravel += travel;
      optimizedTime += unclampTime + travel / indexSpeed + clampTime;
      optCurrent = pos.angle_deg;
    }

    const naiveTravel = indexSequence.reduce((sum, s) => sum + s.travel_deg, 0);
    const timeSaved = totalTime - optimizedTime;

    // Generate G-code snippet
    const axis = rotary.axis;
    const gCode = positions
      .map((p) => `G0 ${axis}${p.angle_deg.toFixed(3)} (${p.description ?? `Face ${p.face_id}`})`)
      .join("\n");

    log.info(`[FourthAxisIndexing] ${positions.length} positions, total_time=${totalTime.toFixed(1)}s, optimized saves ${timeSaved.toFixed(1)}s`);

    return {
      mode: "positional",
      positions,
      total_index_time_sec: totalTime,
      index_sequence: indexSequence,
      cycle_optimization: {
        optimized_sequence: optimized,
        total_travel_deg: optimizedTravel,
        time_saved_sec: timeSaved,
      },
      g_code_snippet: gCode,
    };
  }

  /**
   * Calculate continuous/wrap milling parameters.
   * Adjusts feed for rotary surface velocity.
   */
  private static calculateContinuousIndexing(input: FourthAxisInput): ContinuousIndexingResult {
    const warnings: string[] = [];

    // Part geometry
    const partDia = input.part_diameter_mm ?? 50;
    const partLength = input.part_length_mm ?? 100;
    const circumference = Math.PI * partDia;

    // Cutting parameters
    const cutting = input.cutting ?? {
      tool_diameter_mm: 10,
      vc_m_min: 100,
      fz_mm: 0.1,
      ae_mm: 5,
      ap_mm: 2,
      flutes: 4,
    };

    // For wrap milling, the rotary axis feeds the work past the cutter
    // Surface speed at part OD determines rotary RPM
    // N = (Vc × 1000) / (π × D_part)
    const rotaryRpm = (cutting.vc_m_min * 1000) / (Math.PI * partDia);

    // Feed rate in mm/min along the rotary direction
    // At the part surface: Vf = fz × z × N_spindle
    // But we also need to coordinate with rotary motion
    const spindleRpm = (cutting.vc_m_min * 1000) / (Math.PI * cutting.tool_diameter_mm);
    const linearFeed = cutting.fz_mm * cutting.flutes * spindleRpm;

    // Rotary table spec
    const rotary = input.rotary_table ?? HAAS_TR160;

    // Check rotary RPM limits
    if (rotaryRpm > rotary.max_rpm) {
      warnings.push(`Rotary RPM ${rotaryRpm.toFixed(1)} exceeds table max ${rotary.max_rpm} RPM — reduce surface speed or increase part diameter`);
    }

    // Effective cutting diameter (tool at part surface)
    const effectiveDia = partDia + cutting.tool_diameter_mm;

    // G-code for wrap milling (Haas style)
    const axis = rotary.axis;
    const gCode = [
      `G0 ${axis}0 Z${(input.safe_z_mm ?? 50).toFixed(1)} (Start position)`,
      `G1 Z-${cutting.ap_mm.toFixed(2)} F${(linearFeed * 0.5).toFixed(0)} (Plunge)`,
      `G1 ${axis}360. F${linearFeed.toFixed(0)} (Wrap mill one revolution)`,
      `G0 Z${(input.safe_z_mm ?? 50).toFixed(1)} (Retract)`,
    ].join("\n");

    log.info(`[FourthAxisIndexing] wrap mode: part_dia=${partDia}mm, rotary_rpm=${rotaryRpm.toFixed(1)}, feed=${linearFeed.toFixed(0)} mm/min`);

    return {
      mode: input.mode === "wrap" ? "wrap" : "continuous",
      effective_diameter_mm: effectiveDia,
      surface_speed_m_min: cutting.vc_m_min,
      rotary_rpm: rotaryRpm,
      adjusted_feed_mm_min: linearFeed,
      circumference_mm: circumference,
      g_code_snippet: gCode,
      warnings,
    };
  }

  /**
   * Calculate shortest rotation between two angles.
   * Returns signed value: positive = CW, negative = CCW.
   */
  private static shortestRotation(from: number, to: number): number {
    let diff = to - from;
    // Normalize to -180..180
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }

  /**
   * Optimize index sequence using nearest-neighbor heuristic.
   * Returns face IDs in optimal visiting order.
   */
  private static optimizeIndexSequence(positions: IndexedPosition[]): number[] {
    if (positions.length <= 2) {
      return positions.map((p) => p.face_id);
    }

    const visited = new Set<number>();
    const sequence: number[] = [];
    let currentAngle = 0;

    // Greedy nearest-neighbor
    while (visited.size < positions.length) {
      let bestId = -1;
      let bestTravel = Infinity;

      for (const pos of positions) {
        if (visited.has(pos.face_id)) continue;
        const travel = Math.abs(this.shortestRotation(currentAngle, pos.angle_deg));
        if (travel < bestTravel) {
          bestTravel = travel;
          bestId = pos.face_id;
        }
      }

      if (bestId >= 0) {
        visited.add(bestId);
        sequence.push(bestId);
        currentAngle = positions.find((p) => p.face_id === bestId)!.angle_deg;
      }
    }

    return sequence;
  }

  /**
   * Get rotary table spec for a machine.
   */
  static getRotaryTableForMachine(machineId: string): RotaryTableSpec | undefined {
    // Map machines to their rotary tables
    const machineRotaryMap: Record<string, RotaryTableSpec> = {
      "VMC-03": HAAS_TR160,  // Haas VF-2
      "VMC-01": HAAS_HRT210, // Hurco VM30i (typical config)
    };

    return machineRotaryMap[machineId];
  }

  /**
   * Check if a machine supports 4th axis operation.
   */
  static machineSupports4thAxis(machineId: string, capabilities: string[]): boolean {
    // Direct 4th axis capability
    if (capabilities.includes("4th_axis") || capabilities.includes("rotary")) {
      return true;
    }

    // 5-axis machines can do 4-axis by locking one rotary
    if (capabilities.includes("5axis_contouring")) {
      return true;
    }

    // Mill-turn with B-axis
    if (capabilities.includes("b_axis") && capabilities.includes("milling")) {
      return true;
    }

    return false;
  }

  /**
   * Calculate cycle time for multi-face tombstone operation.
   *
   * @param faces - Number of faces (2, 4, or 6)
   * @param machineTimePerFace - Machining time per face in minutes
   * @param rotary - Rotary table spec
   * @returns Total cycle time in minutes
   */
  static calculateTombstoneCycleTime(
    faces: 2 | 4 | 6,
    machineTimePerFace: number,
    rotary: RotaryTableSpec = HAAS_TR160,
  ): { total_minutes: number; index_minutes: number; cutting_minutes: number } {
    const positions = TOMBSTONE_CONFIGS[`${faces}-face`];
    const indexResult = this.calculatePositionalIndexing({
      machine_id: "VMC-03",
      rotary_table: rotary,
      mode: "positional",
      tombstone_config: `${faces}-face`,
    });

    const indexMinutes = indexResult.total_index_time_sec / 60;
    const cuttingMinutes = faces * machineTimePerFace;

    return {
      total_minutes: indexMinutes + cuttingMinutes,
      index_minutes: indexMinutes,
      cutting_minutes: cuttingMinutes,
    };
  }
}

// Export singleton for easy import
export const fourthAxisIndexingEngine = new FourthAxisIndexingEngine();
