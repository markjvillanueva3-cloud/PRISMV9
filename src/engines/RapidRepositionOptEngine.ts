/**
 * RapidRepositionOptEngine — Rapid Repositioning & Non-Cutting Time Optimization
 *
 * Consolidates POST-ULT-MS7 U01–U09: optimizes all non-cutting CNC motion using
 * actual per-axis machine kinematics. Covers rapid move timing, diagonal vs sequential
 * strategy, retract height, air-cut detection, feature sequencing (TSP), tool change
 * positioning, rotary axis repositioning, non-cutting time budgeting, and ATC magazine
 * slot optimization.
 *
 * Physics basis:
 * - Per-axis rapid time: t = d / v_rapid (full-speed), t = sqrt(2d / a) (short moves)
 * - Trapezoidal motion profile: accel → cruise → decel
 * - Diagonal moves: time = max(t_x, t_y, t_z) if axes independent,
 *   or time = dist_3d / min(v_x, v_y, v_z) if controller limits to slowest axis
 * - Rotary axis: normalize delta to [-180, +180] for shortest path
 * - TSP: nearest-neighbor heuristic + 2-opt local search
 *
 * References:
 * - Altintas, Y. (2012): "Manufacturing Automation", Ch. 2–3 (machine dynamics)
 * - PRISM ExtendedMachineProfile & AxisDetail (machine-profiles-catalog.ts)
 * - Flood, M.M. (1956): "The Traveling-Salesman Problem" (TSP heuristics)
 *
 * @module RapidRepositionOptEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AxisKinematics {
  name: string;
  rapid_m_min: number;
  accel_g?: number;
  is_rotary: boolean;
  rpm?: number;
  travel_mm?: number;
  travel_deg?: number;
}

export interface RapidMove {
  from: { x: number; y: number; z: number; a?: number; b?: number; c?: number };
  to: { x: number; y: number; z: number; a?: number; b?: number; c?: number };
  line_number: number;
}

export interface RapidOptimization {
  original_move: RapidMove;
  optimized_strategy: "diagonal" | "z_first" | "xy_first" | "overlap_rotary" | "unchanged";
  original_time_sec: number;
  optimized_time_sec: number;
  time_saved_sec: number;
  explanation: string;
}

export interface RetractOptimization {
  line_number: number;
  original_z: number;
  optimized_z: number;
  clearance_needed_mm: number;
  time_saved_sec: number;
}

export interface AirCutDetection {
  start_line: number;
  end_line: number;
  operation_index: number;
  percent_air: number;
  time_wasted_sec: number;
  recommendation: string;
}

export interface FeaturePoint {
  x: number;
  y: number;
  z?: number;
  id?: string;
  tool?: string;
  operation_index?: number;
}

export interface FeatureSequenceResult {
  original_sequence: number[];
  optimized_sequence: number[];
  original_distance_mm: number;
  optimized_distance_mm: number;
  distance_saved_mm: number;
  time_saved_sec: number;
  improvement_pct: number;
  method: string;
}

export interface ToolChangePositionResult {
  tool_changes: Array<{
    tool_from: string;
    tool_to: string;
    line_number: number;
    original_xy: { x: number; y: number };
    optimized_xy: { x: number; y: number };
    distance_saved_mm: number;
    time_saved_sec: number;
  }>;
  total_time_saved_sec: number;
}

export interface RotaryOptResult {
  moves: Array<{
    line_number: number;
    axis: string;
    from_deg: number;
    to_deg: number;
    naive_delta_deg: number;
    optimized_delta_deg: number;
    time_saved_sec: number;
    wrap_used: boolean;
  }>;
  total_time_saved_sec: number;
}

export interface NonCuttingBudget {
  total_cycle_sec: number;
  cutting_time_sec: number;
  non_cutting_time_sec: number;
  non_cutting_percent: number;
  breakdown: {
    rapid_repositioning_sec: number;
    tool_changes_sec: number;
    spindle_accel_decel_sec: number;
    retract_approach_sec: number;
    rotary_repositioning_sec: number;
    dwell_sec: number;
    air_cutting_sec: number;
  };
  savings_available: {
    rapid_optimization_sec: number;
    retract_optimization_sec: number;
    air_cut_elimination_sec: number;
    tool_change_position_sec: number;
    hole_resequence_sec: number;
    magazine_optimization_sec: number;
    total_sec: number;
  };
}

export interface MagazineOptimization {
  tool_sequence: number[];
  original_slot_assignment: Record<number, number>;
  optimized_slot_assignment: Record<number, number>;
  original_total_rotation: number;
  optimized_total_rotation: number;
  time_saved_sec: number;
  atc_type: "carousel" | "side_mount" | "chain" | "turret";
}

export interface RapidOptInput {
  moves?: RapidMove[];
  axes?: AxisKinematics[];
  controller_diagonal_mode?: "independent" | "slowest_axis";
  retract_clearance_mm?: number;
  obstacle_heights_mm?: number[];
  features?: FeaturePoint[];
  rapid_rate_m_min?: number;
  tool_changes?: Array<{
    tool_from: string;
    tool_to: string;
    line_number: number;
    current_xy: { x: number; y: number };
    next_cut_xy: { x: number; y: number };
    tc_position_xy?: { x: number; y: number };
  }>;
  rotary_moves?: Array<{
    line_number: number;
    axis: string;
    from_deg: number;
    to_deg: number;
    rpm: number;
    continuous?: boolean;
  }>;
  cycle_data?: {
    total_cycle_sec: number;
    cutting_time_sec: number;
    tool_change_count: number;
    tool_change_time_each_sec: number;
    spindle_accel_events: number;
    spindle_accel_time_each_sec: number;
    dwell_time_sec: number;
  };
  magazine?: {
    atc_type: "carousel" | "side_mount" | "chain" | "turret";
    capacity: number;
    tool_sequence: number[];
    current_assignment?: Record<number, number>;
    rotation_time_per_slot_sec?: number;
  };
  air_cut_data?: Array<{
    start_line: number;
    end_line: number;
    operation_index: number;
    feedrate_mm_min: number;
    distance_mm: number;
    material_contact_pct: number;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GRAVITY_MM_S2 = 9806.65;
const DEFAULT_ACCEL_G = 0.1;
const DEFAULT_RAPID_M_MIN = 30;
const DEFAULT_ROTARY_RPM = 30;
const DEFAULT_RETRACT_CLEARANCE_MM = 5;
const AIR_CUT_THRESHOLD_PCT = 15;

// ============================================================================
// ENGINE
// ============================================================================

class RapidRepositionOptEngineImpl {

  // ──────────────────────────────────────────────────────────────────────
  // U01: Per-Axis Kinematics Solver
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Calculate move time for a single linear axis, accounting for acceleration.
   * Uses trapezoidal motion profile: if distance is short, the axis never
   * reaches full rapid speed.
   *
   * For a trapezoidal profile:
   *   d_accel = v_max^2 / (2 * a)
   *   If distance < 2 * d_accel: triangular profile, t = 2 * sqrt(d / a)
   *   Else: t = v_max / a + (d - d_accel) / v_max   [accel + cruise, symmetric decel]
   *     Full: t_accel + t_cruise + t_decel = v/a + (d - v^2/a) / v + v/a
   */
  calcAxisMoveTime(distance_mm: number, rapid_m_min: number, accel_g: number = DEFAULT_ACCEL_G): number {
    if (distance_mm <= 0) return 0;

    const v_max_mm_s = (rapid_m_min * 1000) / 60;
    const a_mm_s2 = accel_g * GRAVITY_MM_S2;

    // Distance needed to accelerate to full speed (and decelerate)
    const d_accel = (v_max_mm_s * v_max_mm_s) / (2 * a_mm_s2);

    if (distance_mm < 2 * d_accel) {
      // Triangular profile: never reaches full speed
      // t = 2 * sqrt(distance / accel)
      return 2 * Math.sqrt(distance_mm / a_mm_s2);
    }

    // Trapezoidal profile: accel + cruise + decel
    const t_accel = v_max_mm_s / a_mm_s2;
    const d_cruise = distance_mm - 2 * d_accel;
    const t_cruise = d_cruise / v_max_mm_s;
    return 2 * t_accel + t_cruise;
  }

  /**
   * Calculate the time for a rotary axis move, accounting for RPM and wrap-around.
   */
  calcRotaryMoveTime(delta_deg: number, rpm: number): number {
    if (delta_deg === 0 || rpm <= 0) return 0;
    const deg_per_sec = (rpm * 360) / 60;
    return Math.abs(delta_deg) / deg_per_sec;
  }

  /**
   * Calculate per-axis times for a rapid move given axis kinematics.
   * Returns the time for each axis and the total move time under
   * the specified diagonal mode.
   */
  calcMoveTime(
    move: RapidMove,
    axes: AxisKinematics[],
    mode: "independent" | "slowest_axis" = "independent",
  ): { axis_times: Record<string, number>; total_sec: number } {
    const axisMap = new Map<string, AxisKinematics>();
    for (const a of axes) axisMap.set(a.name.toUpperCase(), a);

    const deltas: Record<string, number> = {
      X: Math.abs(move.to.x - move.from.x),
      Y: Math.abs(move.to.y - move.from.y),
      Z: Math.abs(move.to.z - move.from.z),
    };

    // Rotary axes
    const rotaryAxes = ["A", "B", "C"] as const;
    for (const rn of rotaryAxes) {
      const fromVal = move.from[rn.toLowerCase() as "a" | "b" | "c"];
      const toVal = move.to[rn.toLowerCase() as "a" | "b" | "c"];
      if (fromVal !== undefined && toVal !== undefined) {
        deltas[rn] = Math.abs(this.normalizeAngleDelta(toVal - fromVal));
      }
    }

    const axis_times: Record<string, number> = {};

    for (const [name, dist] of Object.entries(deltas)) {
      if (dist === 0) {
        axis_times[name] = 0;
        continue;
      }
      const ak = axisMap.get(name);
      if (!ak) {
        // Use defaults
        if (["A", "B", "C"].includes(name)) {
          axis_times[name] = this.calcRotaryMoveTime(dist, DEFAULT_ROTARY_RPM);
        } else {
          axis_times[name] = this.calcAxisMoveTime(dist, DEFAULT_RAPID_M_MIN, DEFAULT_ACCEL_G);
        }
        continue;
      }

      if (ak.is_rotary) {
        axis_times[name] = this.calcRotaryMoveTime(dist, ak.rpm ?? DEFAULT_ROTARY_RPM);
      } else {
        axis_times[name] = this.calcAxisMoveTime(dist, ak.rapid_m_min, ak.accel_g ?? DEFAULT_ACCEL_G);
      }
    }

    let total_sec: number;

    if (mode === "independent") {
      // All axes move simultaneously; total = longest axis
      total_sec = Math.max(...Object.values(axis_times), 0);
    } else {
      // "slowest_axis" mode: controller limits all linear axes to rate of slowest
      const linearDists = [deltas.X ?? 0, deltas.Y ?? 0, deltas.Z ?? 0];
      const dist3d = Math.sqrt(linearDists[0] ** 2 + linearDists[1] ** 2 + linearDists[2] ** 2);

      if (dist3d > 0) {
        const linearAxes = ["X", "Y", "Z"]
          .map(n => axisMap.get(n))
          .filter((a): a is AxisKinematics => a !== undefined && !a.is_rotary);

        const minRate = linearAxes.length > 0
          ? Math.min(...linearAxes.map(a => a.rapid_m_min))
          : DEFAULT_RAPID_M_MIN;

        const minAccel = linearAxes.length > 0
          ? Math.min(...linearAxes.map(a => a.accel_g ?? DEFAULT_ACCEL_G))
          : DEFAULT_ACCEL_G;

        const linearTime = this.calcAxisMoveTime(dist3d, minRate, minAccel);

        // Rotary axes still move independently from linear
        const rotaryTime = Math.max(
          ...["A", "B", "C"].map(n => axis_times[n] ?? 0),
          0,
        );

        total_sec = Math.max(linearTime, rotaryTime);
      } else {
        total_sec = Math.max(...Object.values(axis_times), 0);
      }
    }

    return { axis_times, total_sec };
  }

  // ──────────────────────────────────────────────────────────────────────
  // U02: Diagonal vs Sequential Optimizer
  // ──────────────────────────────────────────────────────────────────────

  /**
   * For each rapid move, compare diagonal (simultaneous) vs sequential
   * (Z up → XY → Z down) strategies and pick the faster one.
   */
  optimizeRapids(input: RapidOptInput): { optimizations: RapidOptimization[]; total_saved_sec: number } {
    const moves = input.moves ?? [];
    const axes = input.axes ?? this.defaultAxes();
    const mode = input.controller_diagonal_mode ?? "independent";
    const optimizations: RapidOptimization[] = [];
    let totalSaved = 0;

    for (const move of moves) {
      const diagonalResult = this.calcMoveTime(move, axes, mode);
      const diagonalTime = diagonalResult.total_sec;

      // Sequential: Z retract → XY move → Z plunge
      const zUp = Math.abs(move.to.z - move.from.z);
      const dxSeq = Math.abs(move.to.x - move.from.x);
      const dySeq = Math.abs(move.to.y - move.from.y);

      const axisMap = new Map<string, AxisKinematics>();
      for (const a of axes) axisMap.set(a.name.toUpperCase(), a);
      const zAxis = axisMap.get("Z");
      const xAxis = axisMap.get("X");
      const yAxis = axisMap.get("Y");

      const zRate = zAxis?.rapid_m_min ?? DEFAULT_RAPID_M_MIN;
      const zAccel = zAxis?.accel_g ?? DEFAULT_ACCEL_G;
      const xRate = xAxis?.rapid_m_min ?? DEFAULT_RAPID_M_MIN;
      const xAccel = xAxis?.accel_g ?? DEFAULT_ACCEL_G;
      const yRate = yAxis?.rapid_m_min ?? DEFAULT_RAPID_M_MIN;
      const yAccel = yAxis?.accel_g ?? DEFAULT_ACCEL_G;

      // For Z-first: retract to higher Z, move XY, plunge
      // We estimate z move as full delta (simplified — retract height optimization is separate)
      const tZRetract = this.calcAxisMoveTime(zUp, zRate, zAccel);
      const tX = this.calcAxisMoveTime(dxSeq, xRate, xAccel);
      const tY = this.calcAxisMoveTime(dySeq, yRate, yAccel);
      const tXY = mode === "independent" ? Math.max(tX, tY) : this.calcAxisMoveTime(
        Math.sqrt(dxSeq ** 2 + dySeq ** 2),
        Math.min(xRate, yRate),
        Math.min(xAccel, yAccel),
      );
      const sequentialZFirst = tZRetract + tXY + tZRetract;

      // XY-first strategy (used when Z is going up — approach from above)
      const sequentialXYFirst = tXY + tZRetract;

      // Check rotary overlap: if rotary axes are involved, we can overlap them
      const hasRotary = (move.from.a !== undefined && move.to.a !== undefined && move.from.a !== move.to.a) ||
                        (move.from.b !== undefined && move.to.b !== undefined && move.from.b !== move.to.b) ||
                        (move.from.c !== undefined && move.to.c !== undefined && move.from.c !== move.to.c);

      let bestTime = diagonalTime;
      let bestStrategy: RapidOptimization["optimized_strategy"] = "diagonal";
      let explanation = "Diagonal (simultaneous) move is fastest.";

      if (move.to.z > move.from.z) {
        // Moving Z up (retracting) — XY first may work if going up overall
        if (sequentialXYFirst < bestTime) {
          bestTime = sequentialXYFirst;
          bestStrategy = "xy_first";
          explanation = "XY move then Z retract is faster; Z is moving up (retract).";
        }
      }

      if (sequentialZFirst < bestTime) {
        bestTime = sequentialZFirst;
        bestStrategy = "z_first";
        explanation = `Z-first sequential (retract → XY → plunge) is faster. Z axis rate (${zRate} m/min) is asymmetric.`;
      }

      if (hasRotary && bestStrategy === "diagonal") {
        bestStrategy = "overlap_rotary";
        explanation = "Diagonal with rotary overlap: rotary axes move during linear rapids.";
      }

      // If no improvement, keep unchanged
      const originalTime = diagonalTime;
      const timeSaved = originalTime - bestTime;

      if (timeSaved < 0.001) {
        bestStrategy = "unchanged";
        bestTime = originalTime;
        explanation = "No beneficial strategy change found.";
      }

      const opt: RapidOptimization = {
        original_move: move,
        optimized_strategy: bestStrategy,
        original_time_sec: round4(originalTime),
        optimized_time_sec: round4(bestTime),
        time_saved_sec: round4(Math.max(0, originalTime - bestTime)),
        explanation,
      };

      optimizations.push(opt);
      totalSaved += opt.time_saved_sec;
    }

    return { optimizations, total_saved_sec: round4(totalSaved) };
  }

  // ──────────────────────────────────────────────────────────────────────
  // U03: Retract Height Optimizer
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Minimize retract height for each rapid move based on obstacle clearance.
   * Instead of retracting to machine Z-max, retract only high enough to clear
   * obstacles between current and next position.
   */
  optimizeRetracts(input: RapidOptInput): { optimizations: RetractOptimization[]; total_saved_sec: number } {
    const moves = input.moves ?? [];
    const axes = input.axes ?? this.defaultAxes();
    const clearance = input.retract_clearance_mm ?? DEFAULT_RETRACT_CLEARANCE_MM;
    const obstacles = input.obstacle_heights_mm ?? [];
    const optimizations: RetractOptimization[] = [];
    let totalSaved = 0;

    const maxObstacle = obstacles.length > 0 ? Math.max(...obstacles) : 0;

    const axisMap = new Map<string, AxisKinematics>();
    for (const a of axes) axisMap.set(a.name.toUpperCase(), a);
    const zAxis = axisMap.get("Z");
    const zRate = zAxis?.rapid_m_min ?? DEFAULT_RAPID_M_MIN;
    const zAccel = zAxis?.accel_g ?? DEFAULT_ACCEL_G;

    for (const move of moves) {
      // Only process moves that include Z retraction (Z going up)
      if (move.to.z <= move.from.z) continue;

      const originalZ = move.to.z;

      // Optimized Z: max of (from.z, to.z of next move position, max obstacle) + clearance
      // For standalone analysis, use obstacle data
      const neededZ = Math.max(
        move.from.z,
        maxObstacle,
      ) + clearance;

      const optimizedZ = Math.min(originalZ, neededZ);

      if (optimizedZ >= originalZ - 0.01) continue;

      const originalDist = Math.abs(originalZ - move.from.z);
      const optimizedDist = Math.abs(optimizedZ - move.from.z);
      const savedDist = originalDist - optimizedDist;

      // Time saved for retract + approach (both directions)
      const originalRetractTime = this.calcAxisMoveTime(originalDist, zRate, zAccel);
      const optimizedRetractTime = this.calcAxisMoveTime(optimizedDist, zRate, zAccel);
      const timeSaved = (originalRetractTime - optimizedRetractTime) * 2;

      optimizations.push({
        line_number: move.line_number,
        original_z: round2(originalZ),
        optimized_z: round2(optimizedZ),
        clearance_needed_mm: round2(clearance),
        time_saved_sec: round4(Math.max(0, timeSaved)),
      });

      totalSaved += Math.max(0, timeSaved);
    }

    return { optimizations, total_saved_sec: round4(totalSaved) };
  }

  // ──────────────────────────────────────────────────────────────────────
  // U04: Air Cut Eliminator
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Detect air-cutting passes: segments at cutting feedrate with minimal material contact.
   * Flags segments with material contact below threshold and provides recommendations.
   */
  detectAirCuts(input: RapidOptInput): { detections: AirCutDetection[]; total_time_wasted_sec: number } {
    const data = input.air_cut_data ?? [];
    const detections: AirCutDetection[] = [];
    let totalWasted = 0;

    for (const seg of data) {
      const contactPct = seg.material_contact_pct;
      const airPct = 100 - contactPct;

      if (airPct < AIR_CUT_THRESHOLD_PCT) continue;

      const feedrate_mm_s = seg.feedrate_mm_min / 60;
      const totalTime = feedrate_mm_s > 0 ? seg.distance_mm / feedrate_mm_s : 0;
      const airTime = totalTime * (airPct / 100);

      // Determine recommendation
      let recommendation: string;
      if (airPct >= 95) {
        recommendation = "REMOVE: Entire pass is air-cutting. Replace with rapid traverse.";
      } else if (airPct >= 75) {
        recommendation = "SPLIT: Break into cutting and rapid segments. Replace air portions with G0.";
      } else if (airPct >= 50) {
        recommendation = "OPTIMIZE: Significant air cutting. Consider approach strategy change or rest machining.";
      } else {
        recommendation = "MONITOR: Moderate air cutting detected. Review toolpath entry/exit strategy.";
      }

      detections.push({
        start_line: seg.start_line,
        end_line: seg.end_line,
        operation_index: seg.operation_index,
        percent_air: round2(airPct),
        time_wasted_sec: round4(airTime),
        recommendation,
      });

      totalWasted += airTime;
    }

    // Sort by time wasted descending (highest impact first)
    detections.sort((a, b) => b.time_wasted_sec - a.time_wasted_sec);

    return { detections, total_time_wasted_sec: round4(totalWasted) };
  }

  // ──────────────────────────────────────────────────────────────────────
  // U05: Rapid Path Sequencer (TSP)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Reorder feature sequences using nearest-neighbor + 2-opt TSP to minimize
   * total rapid travel distance between features (holes, pockets, etc.).
   */
  sequenceFeatures(input: RapidOptInput): FeatureSequenceResult {
    const features = input.features ?? [];
    const rapidRate = input.rapid_rate_m_min ?? DEFAULT_RAPID_M_MIN;

    if (features.length <= 1) {
      return {
        original_sequence: features.map((_, i) => i),
        optimized_sequence: features.map((_, i) => i),
        original_distance_mm: 0,
        optimized_distance_mm: 0,
        distance_saved_mm: 0,
        time_saved_sec: 0,
        improvement_pct: 0,
        method: "trivial",
      };
    }

    const n = features.length;
    const distMatrix = this.buildDistanceMatrix(features);
    const originalSeq = Array.from({ length: n }, (_, i) => i);
    const originalDist = this.calcPathDistance(originalSeq, distMatrix);

    // Phase 1: Nearest-neighbor from best starting point
    let bestNNSeq: number[] = [];
    let bestNNDist = Infinity;

    // Try multiple starting points (up to 10 or all if small)
    const startCount = Math.min(n, 10);
    const startIndices = startCount === n
      ? Array.from({ length: n }, (_, i) => i)
      : Array.from({ length: startCount }, (_, i) => Math.floor((i * n) / startCount));

    for (const startIdx of startIndices) {
      const seq = this.nearestNeighbor(startIdx, n, distMatrix);
      const dist = this.calcPathDistance(seq, distMatrix);
      if (dist < bestNNDist) {
        bestNNDist = dist;
        bestNNSeq = seq;
      }
    }

    // Phase 2: 2-opt improvement
    const { sequence: optimizedSeq, distance: optimizedDist } = this.twoOpt(bestNNSeq, distMatrix);

    const distSaved = originalDist - optimizedDist;
    const rapidMmSec = (rapidRate * 1000) / 60;
    const timeSaved = rapidMmSec > 0 ? distSaved / rapidMmSec : 0;

    return {
      original_sequence: originalSeq,
      optimized_sequence: optimizedSeq,
      original_distance_mm: round2(originalDist),
      optimized_distance_mm: round2(optimizedDist),
      distance_saved_mm: round2(Math.max(0, distSaved)),
      time_saved_sec: round4(Math.max(0, timeSaved)),
      improvement_pct: originalDist > 0 ? round2((distSaved / originalDist) * 100) : 0,
      method: "nearest_neighbor+2opt",
    };
  }

  /** Nearest-neighbor greedy construction heuristic. */
  private nearestNeighbor(start: number, n: number, dist: number[][]): number[] {
    const visited = new Set<number>([start]);
    const path = [start];

    while (path.length < n) {
      const current = path[path.length - 1];
      let bestNext = -1;
      let bestDist = Infinity;

      for (let j = 0; j < n; j++) {
        if (visited.has(j)) continue;
        if (dist[current][j] < bestDist) {
          bestDist = dist[current][j];
          bestNext = j;
        }
      }

      if (bestNext < 0) break;
      path.push(bestNext);
      visited.add(bestNext);
    }

    return path;
  }

  /** 2-opt local search improvement. */
  private twoOpt(sequence: number[], dist: number[][]): { sequence: number[]; distance: number } {
    const n = sequence.length;
    if (n <= 3) return { sequence: [...sequence], distance: this.calcPathDistance(sequence, dist) };

    let improved = true;
    let seq = [...sequence];
    let bestDistance = this.calcPathDistance(seq, dist);
    const maxIterations = Math.min(n * n, 5000);
    let iteration = 0;

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 2; j < n; j++) {
          // Calculate improvement from reversing segment [i+1..j]
          const a = seq[i], b = seq[i + 1];
          const c = seq[j], d = j + 1 < n ? seq[j + 1] : -1;

          const oldCost = dist[a][b] + (d >= 0 ? dist[c][d] : 0);
          const newCost = dist[a][c] + (d >= 0 ? dist[b][d] : 0);

          if (newCost < oldCost - 1e-10) {
            // Reverse the segment [i+1..j]
            const reversed = seq.slice(i + 1, j + 1).reverse();
            seq = [...seq.slice(0, i + 1), ...reversed, ...seq.slice(j + 1)];
            bestDistance -= (oldCost - newCost);
            improved = true;
          }
        }
      }
    }

    return { sequence: seq, distance: this.calcPathDistance(seq, dist) };
  }

  /** Build Euclidean distance matrix from features. */
  private buildDistanceMatrix(features: FeaturePoint[]): number[][] {
    const n = features.length;
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i === j) return 0;
        const dx = features[j].x - features[i].x;
        const dy = features[j].y - features[i].y;
        const dz = (features[j].z ?? 0) - (features[i].z ?? 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      }),
    );
  }

  /** Calculate total path distance. */
  private calcPathDistance(path: number[], dist: number[][]): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += dist[path[i]][path[i + 1]];
    }
    return total;
  }

  // ──────────────────────────────────────────────────────────────────────
  // U06: Tool Change Position Optimizer
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Optimize XY position during tool changes. Instead of returning to machine
   * home for tool change, move to a position that minimizes total rapid distance:
   * current → TC position → next cut start.
   */
  optimizeToolChanges(input: RapidOptInput): ToolChangePositionResult {
    const changes = input.tool_changes ?? [];
    const axes = input.axes ?? this.defaultAxes();
    const mode = input.controller_diagonal_mode ?? "independent";
    const results: ToolChangePositionResult["tool_changes"] = [];
    let totalSaved = 0;

    const axisMap = new Map<string, AxisKinematics>();
    for (const a of axes) axisMap.set(a.name.toUpperCase(), a);

    const xRate = axisMap.get("X")?.rapid_m_min ?? DEFAULT_RAPID_M_MIN;
    const yRate = axisMap.get("Y")?.rapid_m_min ?? DEFAULT_RAPID_M_MIN;
    const xAccel = axisMap.get("X")?.accel_g ?? DEFAULT_ACCEL_G;
    const yAccel = axisMap.get("Y")?.accel_g ?? DEFAULT_ACCEL_G;

    for (const tc of changes) {
      const cur = tc.current_xy;
      const next = tc.next_cut_xy;
      const tcPos = tc.tc_position_xy ?? { x: 0, y: 0 };

      // Original: cur → TC position → next
      const origDist = this.dist2d(cur, tcPos) + this.dist2d(tcPos, next);

      // Optimized: move to the midpoint (weighted) between TC and next cut
      // Actually, the TC position is fixed by the machine. The optimization is
      // to move to the TC position that is closest to the next cut.
      // For machines with a fixed TC position, we optimize the approach:
      // Instead of moving to TC then to next, we check if direct is feasible
      // or if we can overlap the XY move with the tool change.

      // Best strategy: position at next_cut XY during tool change (if ATC allows)
      // so after change, we're already at the next cut position.
      const optimizedPos = next; // Move to next cut XY during tool change
      const optDist = this.dist2d(cur, optimizedPos);

      const distSaved = origDist - optDist;

      // Calculate time saved using XY rapid rates
      const calcXYTime = (from: { x: number; y: number }, to: { x: number; y: number }): number => {
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);
        if (mode === "independent") {
          return Math.max(
            this.calcAxisMoveTime(dx, xRate, xAccel),
            this.calcAxisMoveTime(dy, yRate, yAccel),
          );
        }
        const d = Math.sqrt(dx * dx + dy * dy);
        return this.calcAxisMoveTime(d, Math.min(xRate, yRate), Math.min(xAccel, yAccel));
      };

      const origTime = calcXYTime(cur, tcPos) + calcXYTime(tcPos, next);
      const optTime = calcXYTime(cur, optimizedPos);
      const timeSaved = origTime - optTime;

      if (timeSaved > 0.001) {
        results.push({
          tool_from: tc.tool_from,
          tool_to: tc.tool_to,
          line_number: tc.line_number,
          original_xy: tcPos,
          optimized_xy: optimizedPos,
          distance_saved_mm: round2(Math.max(0, distSaved)),
          time_saved_sec: round4(timeSaved),
        });
        totalSaved += timeSaved;
      }
    }

    return { tool_changes: results, total_time_saved_sec: round4(totalSaved) };
  }

  // ──────────────────────────────────────────────────────────────────────
  // U07: Rotary Axis Reposition Optimizer
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Optimize rotary axis repositioning by using shortest angular path.
   * Handles wrap-around: 350° → 10° = +20° (not -340°).
   * For continuous rotary axes, uses the shortest delta in [-180, +180].
   */
  optimizeRotaryMoves(input: RapidOptInput): RotaryOptResult {
    const rotaryMoves = input.rotary_moves ?? [];
    const results: RotaryOptResult["moves"] = [];
    let totalSaved = 0;

    for (const rm of rotaryMoves) {
      const naiveDelta = rm.to_deg - rm.from_deg;
      const isContinuous = rm.continuous !== false;

      let optimizedDelta: number;
      let wrapUsed = false;

      if (isContinuous) {
        optimizedDelta = this.normalizeAngleDelta(naiveDelta);
        wrapUsed = Math.abs(optimizedDelta) !== Math.abs(naiveDelta);
      } else {
        // Non-continuous: cannot wrap, must take the direct path
        optimizedDelta = naiveDelta;
      }

      const rpm = rm.rpm > 0 ? rm.rpm : DEFAULT_ROTARY_RPM;
      const naiveTime = this.calcRotaryMoveTime(naiveDelta, rpm);
      const optTime = this.calcRotaryMoveTime(optimizedDelta, rpm);
      const timeSaved = naiveTime - optTime;

      results.push({
        line_number: rm.line_number,
        axis: rm.axis,
        from_deg: rm.from_deg,
        to_deg: rm.to_deg,
        naive_delta_deg: round2(naiveDelta),
        optimized_delta_deg: round2(optimizedDelta),
        time_saved_sec: round4(Math.max(0, timeSaved)),
        wrap_used: wrapUsed,
      });

      totalSaved += Math.max(0, timeSaved);
    }

    return { moves: results, total_time_saved_sec: round4(totalSaved) };
  }

  /**
   * Normalize angle delta to [-180, +180] range for shortest rotary path.
   */
  normalizeAngleDelta(delta: number): number {
    let d = delta % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  // ──────────────────────────────────────────────────────────────────────
  // U08: Non-Cutting Time Budget
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Calculate complete non-cutting time breakdown and available savings.
   * Aggregates results from all other optimizers.
   */
  calculateBudget(input: RapidOptInput): NonCuttingBudget {
    const cycle = input.cycle_data;
    if (!cycle) {
      return this.emptyBudget();
    }

    // Run sub-optimizers to get savings
    const rapidOpt = this.optimizeRapids(input);
    const retractOpt = this.optimizeRetracts(input);
    const airCutOpt = this.detectAirCuts(input);
    const tcOpt = this.optimizeToolChanges(input);
    const seqOpt = this.sequenceFeatures(input);
    const magOpt = input.magazine ? this.optimizeMagazine(input) : undefined;

    // Calculate rapid repositioning time from moves
    const rapidMoves = input.moves ?? [];
    const axes = input.axes ?? this.defaultAxes();
    const mode = input.controller_diagonal_mode ?? "independent";
    let rapidTime = 0;
    for (const m of rapidMoves) {
      rapidTime += this.calcMoveTime(m, axes, mode).total_sec;
    }

    // Rotary repositioning
    const rotaryOpt = this.optimizeRotaryMoves(input);
    let rotaryTime = 0;
    for (const rm of rotaryOpt.moves) {
      rotaryTime += this.calcRotaryMoveTime(rm.naive_delta_deg, DEFAULT_ROTARY_RPM);
    }

    // Retract/approach time (from rapid moves with Z component)
    let retractTime = 0;
    const zAxis = axes.find(a => a.name.toUpperCase() === "Z");
    const zRate = zAxis?.rapid_m_min ?? DEFAULT_RAPID_M_MIN;
    const zAccel = zAxis?.accel_g ?? DEFAULT_ACCEL_G;
    for (const m of rapidMoves) {
      const dz = Math.abs(m.to.z - m.from.z);
      if (dz > 0) retractTime += this.calcAxisMoveTime(dz, zRate, zAccel);
    }

    const toolChangeTime = cycle.tool_change_count * cycle.tool_change_time_each_sec;
    const spindleTime = cycle.spindle_accel_events * cycle.spindle_accel_time_each_sec;
    const dwellTime = cycle.dwell_time_sec;
    const airCutTime = airCutOpt.total_time_wasted_sec;

    const nonCuttingTime = rapidTime + toolChangeTime + spindleTime +
      retractTime + rotaryTime + dwellTime + airCutTime;

    const totalCycle = cycle.total_cycle_sec;
    const cuttingTime = cycle.cutting_time_sec;

    const rapidSavings = rapidOpt.total_saved_sec;
    const retractSavings = retractOpt.total_saved_sec;
    const airCutSavings = airCutOpt.total_time_wasted_sec;
    const tcPosSavings = tcOpt.total_time_saved_sec;
    const holeSavings = seqOpt.time_saved_sec;
    const magSavings = magOpt?.time_saved_sec ?? 0;
    const totalSavings = rapidSavings + retractSavings + airCutSavings +
      tcPosSavings + holeSavings + magSavings;

    return {
      total_cycle_sec: round2(totalCycle),
      cutting_time_sec: round2(cuttingTime),
      non_cutting_time_sec: round2(nonCuttingTime),
      non_cutting_percent: round2(totalCycle > 0 ? (nonCuttingTime / totalCycle) * 100 : 0),
      breakdown: {
        rapid_repositioning_sec: round2(rapidTime),
        tool_changes_sec: round2(toolChangeTime),
        spindle_accel_decel_sec: round2(spindleTime),
        retract_approach_sec: round2(retractTime),
        rotary_repositioning_sec: round2(rotaryTime),
        dwell_sec: round2(dwellTime),
        air_cutting_sec: round2(airCutTime),
      },
      savings_available: {
        rapid_optimization_sec: round4(rapidSavings),
        retract_optimization_sec: round4(retractSavings),
        air_cut_elimination_sec: round4(airCutSavings),
        tool_change_position_sec: round4(tcPosSavings),
        hole_resequence_sec: round4(holeSavings),
        magazine_optimization_sec: round4(magSavings),
        total_sec: round4(totalSavings),
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // U09: Tool Magazine Slot Optimizer
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Optimize carousel/turret slot assignment to minimize total ATC rotation.
   * Carousel: rotation cost proportional to angular distance between slots.
   * Side-mount/chain: all slot accesses take equal time.
   * Turret: rotation proportional to slot distance.
   */
  optimizeMagazine(input: RapidOptInput): MagazineOptimization {
    const mag = input.magazine;
    if (!mag) {
      return {
        tool_sequence: [],
        original_slot_assignment: {},
        optimized_slot_assignment: {},
        original_total_rotation: 0,
        optimized_total_rotation: 0,
        time_saved_sec: 0,
        atc_type: "carousel",
      };
    }

    const { atc_type, capacity, tool_sequence, rotation_time_per_slot_sec } = mag;
    const timePerSlot = rotation_time_per_slot_sec ?? 0.15;

    // Get unique tools
    const uniqueTools = [...new Set(tool_sequence)];

    // Build current assignment
    const currentAssignment: Record<number, number> = mag.current_assignment
      ? { ...mag.current_assignment }
      : Object.fromEntries(uniqueTools.map((t, i) => [t, i + 1]));

    if (atc_type === "side_mount" || atc_type === "chain") {
      // Side-mount and chain: all accesses equal time, no optimization possible
      return {
        tool_sequence,
        original_slot_assignment: currentAssignment,
        optimized_slot_assignment: currentAssignment,
        original_total_rotation: 0,
        optimized_total_rotation: 0,
        time_saved_sec: 0,
        atc_type,
      };
    }

    // For carousel and turret: optimize slot assignment to minimize total rotation
    // Rotation distance between slots in a carousel is the shorter arc
    const slotDist = (s1: number, s2: number, cap: number): number => {
      const d = Math.abs(s1 - s2);
      return Math.min(d, cap - d);
    };

    // Calculate total rotation for a given assignment
    const calcTotalRotation = (assignment: Record<number, number>): number => {
      let total = 0;
      for (let i = 0; i < tool_sequence.length - 1; i++) {
        const t1 = tool_sequence[i];
        const t2 = tool_sequence[i + 1];
        if (t1 === t2) continue;
        const s1 = assignment[t1] ?? 1;
        const s2 = assignment[t2] ?? 2;
        total += slotDist(s1, s2, capacity);
      }
      return total;
    };

    const originalRotation = calcTotalRotation(currentAssignment);

    // Build transition frequency matrix
    const freq: Record<string, number> = {};
    for (let i = 0; i < tool_sequence.length - 1; i++) {
      const t1 = tool_sequence[i];
      const t2 = tool_sequence[i + 1];
      if (t1 === t2) continue;
      const key = `${Math.min(t1, t2)}-${Math.max(t1, t2)}`;
      freq[key] = (freq[key] ?? 0) + 1;
    }

    // Greedy assignment: place most frequently adjacent tool pairs in adjacent slots
    const sortedPairs = Object.entries(freq)
      .map(([k, v]) => ({ tools: k.split("-").map(Number), count: v }))
      .sort((a, b) => b.count - a.count);

    // Build adjacency-weighted assignment
    const assigned = new Map<number, number>(); // tool -> slot
    const usedSlots = new Set<number>();

    if (sortedPairs.length > 0) {
      // Start with the most frequent pair
      const firstPair = sortedPairs[0];
      const startSlot = Math.floor(capacity / 2);
      assigned.set(firstPair.tools[0], startSlot);
      assigned.set(firstPair.tools[1], startSlot + 1 <= capacity ? startSlot + 1 : 1);
      usedSlots.add(startSlot);
      usedSlots.add(assigned.get(firstPair.tools[1])!);

      // Place remaining tools greedily
      for (const pair of sortedPairs.slice(1)) {
        for (const tool of pair.tools) {
          if (assigned.has(tool)) continue;

          // Find the best slot: adjacent to its most frequent neighbor
          const neighborTool = pair.tools.find(t => assigned.has(t));
          const neighborSlot = neighborTool !== undefined ? assigned.get(neighborTool)! : 1;

          // Try slots adjacent to neighbor first, then expand outward
          let bestSlot = -1;
          let bestDist = Infinity;
          for (let s = 1; s <= capacity; s++) {
            if (usedSlots.has(s)) continue;
            const d = slotDist(s, neighborSlot, capacity);
            if (d < bestDist) {
              bestDist = d;
              bestSlot = s;
            }
          }

          if (bestSlot > 0) {
            assigned.set(tool, bestSlot);
            usedSlots.add(bestSlot);
          }
        }
      }

      // Assign any remaining unassigned tools to available slots
      for (const tool of uniqueTools) {
        if (assigned.has(tool)) continue;
        for (let s = 1; s <= capacity; s++) {
          if (!usedSlots.has(s)) {
            assigned.set(tool, s);
            usedSlots.add(s);
            break;
          }
        }
      }
    } else {
      // No transitions, keep original
      for (const [t, s] of Object.entries(currentAssignment)) {
        assigned.set(Number(t), s);
      }
    }

    const optimizedAssignment: Record<number, number> = {};
    for (const [t, s] of assigned.entries()) {
      optimizedAssignment[t] = s;
    }

    const optimizedRotation = calcTotalRotation(optimizedAssignment);

    const rotationSaved = originalRotation - optimizedRotation;
    const timeSaved = rotationSaved * timePerSlot;

    return {
      tool_sequence,
      original_slot_assignment: currentAssignment,
      optimized_slot_assignment: optimizedAssignment,
      original_total_rotation: originalRotation,
      optimized_total_rotation: optimizedRotation,
      time_saved_sec: round4(Math.max(0, timeSaved)),
      atc_type,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Full Optimize (all sub-engines combined)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Run all optimizers and return a comprehensive result.
   */
  fullOptimize(input: RapidOptInput): {
    rapids: ReturnType<RapidRepositionOptEngineImpl["optimizeRapids"]>;
    retracts: ReturnType<RapidRepositionOptEngineImpl["optimizeRetracts"]>;
    air_cuts: ReturnType<RapidRepositionOptEngineImpl["detectAirCuts"]>;
    feature_sequence: FeatureSequenceResult;
    tool_changes: ToolChangePositionResult;
    rotary: RotaryOptResult;
    magazine: MagazineOptimization | null;
    budget: NonCuttingBudget;
    total_time_saved_sec: number;
    summary: string;
  } {
    const rapids = this.optimizeRapids(input);
    const retracts = this.optimizeRetracts(input);
    const airCuts = this.detectAirCuts(input);
    const featureSeq = this.sequenceFeatures(input);
    const tcOpt = this.optimizeToolChanges(input);
    const rotary = this.optimizeRotaryMoves(input);
    const magazine = input.magazine ? this.optimizeMagazine(input) : null;
    const budget = this.calculateBudget(input);

    const totalSaved = rapids.total_saved_sec +
      retracts.total_saved_sec +
      airCuts.total_time_wasted_sec +
      featureSeq.time_saved_sec +
      tcOpt.total_time_saved_sec +
      rotary.total_time_saved_sec +
      (magazine?.time_saved_sec ?? 0);

    const summaryParts: string[] = [];
    if (rapids.total_saved_sec > 0)
      summaryParts.push(`Rapid strategy: ${round2(rapids.total_saved_sec)}s saved`);
    if (retracts.total_saved_sec > 0)
      summaryParts.push(`Retract optimization: ${round2(retracts.total_saved_sec)}s saved`);
    if (airCuts.total_time_wasted_sec > 0)
      summaryParts.push(`Air cut elimination: ${round2(airCuts.total_time_wasted_sec)}s recoverable`);
    if (featureSeq.time_saved_sec > 0)
      summaryParts.push(`Feature resequencing: ${round2(featureSeq.time_saved_sec)}s saved (${featureSeq.improvement_pct}% shorter)`);
    if (tcOpt.total_time_saved_sec > 0)
      summaryParts.push(`Tool change positioning: ${round2(tcOpt.total_time_saved_sec)}s saved`);
    if (rotary.total_time_saved_sec > 0)
      summaryParts.push(`Rotary optimization: ${round2(rotary.total_time_saved_sec)}s saved`);
    if (magazine && magazine.time_saved_sec > 0)
      summaryParts.push(`Magazine optimization: ${round2(magazine.time_saved_sec)}s saved`);

    const summary = summaryParts.length > 0
      ? `Total non-cutting time savings: ${round2(totalSaved)}s. ` + summaryParts.join(". ") + "."
      : "No significant non-cutting time savings identified.";

    return {
      rapids,
      retracts,
      air_cuts: airCuts,
      feature_sequence: featureSeq,
      tool_changes: tcOpt,
      rotary,
      magazine,
      budget,
      total_time_saved_sec: round4(totalSaved),
      summary,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────────────────────────────

  /** Default 3-axis kinematics when none provided. */
  private defaultAxes(): AxisKinematics[] {
    return [
      { name: "X", rapid_m_min: 36, accel_g: 0.1, is_rotary: false, travel_mm: 1020 },
      { name: "Y", rapid_m_min: 36, accel_g: 0.1, is_rotary: false, travel_mm: 610 },
      { name: "Z", rapid_m_min: 30, accel_g: 0.08, is_rotary: false, travel_mm: 610 },
    ];
  }

  /** 2D Euclidean distance. */
  private dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  }

  /** Empty budget for missing input. */
  private emptyBudget(): NonCuttingBudget {
    return {
      total_cycle_sec: 0,
      cutting_time_sec: 0,
      non_cutting_time_sec: 0,
      non_cutting_percent: 0,
      breakdown: {
        rapid_repositioning_sec: 0,
        tool_changes_sec: 0,
        spindle_accel_decel_sec: 0,
        retract_approach_sec: 0,
        rotary_repositioning_sec: 0,
        dwell_sec: 0,
        air_cutting_sec: 0,
      },
      savings_available: {
        rapid_optimization_sec: 0,
        retract_optimization_sec: 0,
        air_cut_elimination_sec: 0,
        tool_change_position_sec: 0,
        hole_resequence_sec: 0,
        magazine_optimization_sec: 0,
        total_sec: 0,
      },
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ============================================================================
// Singleton Export
// ============================================================================

export const rapidRepositionOptEngine = new RapidRepositionOptEngineImpl();
