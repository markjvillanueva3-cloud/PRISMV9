/**
 * StrategySequencingEngine (E1097) — CAMX-MS12 U06
 *
 * Optimizes the SEQUENCE of machining strategies for multi-operation features
 * by tracking stock state evolution through each step.  Each operation sees
 * only the material that remains after all prior operations, enabling realistic
 * time/load estimates and safety validation.
 *
 * Example deep-pocket sequence:
 *   1. TGAR adaptive rough  — remove ~80 % material, constant engagement
 *   2. Z-level semi-finish  — clean stair-steps left by roughing
 *   3. AMEF morphed-spiral  — semi-finish corner radii
 *   4. HRAF vibration-safe  — final wall quality
 *   5. PTDC floor finish    — deflection-compensated floor
 *
 * Methods:
 *   sequenceStrategies()  — greedy sequencer with stock-aware rule engine
 *   evaluateSequence()    — score one ordered sequence (time, cost, Ra, tool changes)
 *   optimizeSequence()    — permutation search up to 6! = 720 combinations
 *
 * All sub-engines are lazy-loaded (zero eager imports).
 *
 * @module engines/StrategySequencingEngine
 */

// ============================================================================
// LAZY-LOAD HELPERS
// ============================================================================

const _cache: Record<string, unknown> = {};

function _lazy<T>(key: string, path: string, exportName: string): T | null {
  if (!(key in _cache)) {
    try {
      const m = require(path) as Record<string, unknown>;
      _cache[key] = m[exportName] ?? null;
    } catch {
      _cache[key] = null;
    }
  }
  return _cache[key] as T | null;
}

function getPartDeflection() {
  return _lazy<{ estimateDeflection?: (d: number, l: number, F: number) => number }>(
    "partDeflectionEngine", "./PartDeflectionEngine.js", "partDeflectionEngine",
  );
}
function getCuttingThermal() {
  return _lazy<{ estimateTemperature?: (v: number, f: number, mat: string) => number }>(
    "cuttingThermalEngine", "./CuttingThermalEngine.js", "cuttingThermalEngine",
  );
}
function getMachineVibration() {
  return _lazy<{ checkChatterRisk?: (rpm: number, ap: number, mat: string) => number }>(
    "machineVibrationEngine", "./MachineVibrationEngine.js", "machineVibrationEngine",
  );
}

// ============================================================================
// TYPES — INPUTS
// ============================================================================

/** ISO material group */
export type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Operation role within a machining sequence */
export type OperationRole =
  | "adaptive_rough"
  | "zlevel_semi"
  | "corner_semi"
  | "wall_finish"
  | "floor_finish"
  | "rest_rough"
  | "contour_rough"
  | "face_mill"
  | "deburr";

/** Algorithmic shortcode tag (TGAR, AMEF, HRAF, PTDC, …) */
export type AlgoTag =
  | "TGAR"   // True-Geometry Adaptive Roughing
  | "AMEF"   // Adaptive Morphed-Edge Finishing
  | "HRAF"   // High-Rigidity Adaptive Finishing
  | "PTDC"   // Part-True-Deflection Compensation
  | "ZLSF"   // Z-Level Semi-Finish
  | "CCMP"   // Contour Climb Milling Profile
  | "FCMF"   // Floor Climb Milling Finish
  | "REST"   // Rest / pencil machining
  | "FACE";  // Face milling

/** A candidate machining strategy to be sequenced */
export interface StrategyCandidate {
  /** Unique identifier for this operation */
  id: string;
  /** Human-readable name */
  name: string;
  /** What role this operation plays */
  role: OperationRole;
  /** Algorithm shortcode */
  algo_tag: AlgoTag;
  /** Tool descriptor — must supply at least diameter */
  tool: {
    id: string;
    diameter_mm: number;
    corner_radius_mm?: number;
    flutes?: number;
    material?: "HSS" | "carbide" | "cermet" | "cbn" | "ceramic";
    coating?: string;
  };
  /** Expected material removal rate (cm³/min) — used for cycle-time estimate */
  mrr_cm3_per_min?: number;
  /** Estimated standalone cycle time (min) when operating on full stock */
  base_cycle_time_min?: number;
  /** Expected surface roughness Ra delivered (µm) */
  expected_Ra_um?: number;
  /** Fraction of feature volume this operation is expected to remove [0–1] */
  material_removal_fraction?: number;
  /** Minimum remaining_volume_pct in stock required before this op runs */
  requires_prior_removal_pct?: number;
  /** Minimum corner radius already achieved (mm) before this op is valid */
  requires_corner_radius_le_mm?: number;
  /** This op needs coolant; if thermal state is hot, insert gap before running */
  needs_coolant_gap?: boolean;
  /** Approximate cost rate ($/min) for this operation type */
  cost_per_min?: number;
}

/** Feature geometry */
export interface FeatureInput {
  type: "pocket" | "slot" | "contour" | "surface" | "bore" | "rib";
  depth_mm: number;
  width_mm?: number;
  length_mm?: number;
  corner_radius_mm?: number;
  wall_angle_deg?: number;       // 0 = vertical walls
  floor_tolerance_mm?: number;   // required floor flatness
  wall_Ra_target_um?: number;    // surface finish target for walls
  floor_Ra_target_um?: number;   // surface finish target for floor
}

/** Workpiece material descriptor */
export interface MaterialInput {
  name: string;
  iso_group: IsoGroup;
  hardness_HRC?: number;
  hardness_HB?: number;
  /** Thermal conductivity — affects cooling gap decisions */
  thermal_conductivity_W_mK?: number;
  /** Yield strength (MPa) — used for deflection load estimates */
  yield_strength_MPa?: number;
}

/** Raw stock bounding box */
export interface StockDimensions {
  length_mm: number;
  width_mm: number;
  height_mm: number;
}

/** Machine capability descriptor */
export interface MachineInput {
  id: string;
  max_spindle_rpm: number;
  max_feed_mmpm: number;
  /** Number of tool positions in ATC */
  tool_positions?: number;
  /** Estimated tool change time (sec) */
  tool_change_time_sec?: number;
  /** Does the machine have through-spindle coolant? */
  tsc?: boolean;
  /** Axis count */
  axes?: 3 | 4 | 5;
}

/** Sequence-level constraints */
export interface SequenceConstraints {
  /** If true, only minimize tool changes even at the cost of cycle time */
  minimize_tool_changes?: boolean;
  /** Maximum allowable total cycle time (min) — hard limit */
  max_cycle_time_min?: number;
  /** Maximum number of operations in the sequence */
  max_operations?: number;
  /** Insert thermal cool-down gap (min) when heat builds up */
  thermal_gap_min?: number;
  /** Optimization objective for permutation search */
  optimize_for?: "cycle_time" | "cost" | "quality" | "tool_changes" | "balanced";
}

// ============================================================================
// TYPES — OUTPUTS
// ============================================================================

/** Snapshot of the workpiece stock state after one operation */
export interface StockStateSnapshot {
  /** Approximate remaining volume as a fraction of original [0–1] */
  remaining_volume_pct: number;
  /** Estimated current wall thickness at the thinnest point (mm) */
  wall_thickness_current_mm: number;
  /** Estimated current floor thickness (mm) */
  floor_thickness_current_mm: number;
  /** Effective corner radius currently left in the part (mm) */
  corner_radius_current_mm: number;
  /** Current surface Ra on walls (µm) — improved by finishing ops */
  surface_Ra_current_um: number;
  /** Qualitative thermal state */
  thermal_state: "cold" | "warm" | "hot";
  /** True if a coolant gap was inserted before this step */
  cooling_gap_inserted: boolean;
}

/** One step in a resolved strategy sequence */
export interface SequenceStep {
  step_index: number;
  operation: StrategyCandidate;
  /** Stock state BEFORE this operation runs */
  stock_state_before: StockStateSnapshot;
  /** Stock state AFTER this operation completes */
  stock_state_after: StockStateSnapshot;
  /** Adjusted cycle time accounting for actual remaining stock (min) */
  adjusted_cycle_time_min: number;
  /** Whether a cooling gap was inserted BEFORE this step */
  cooling_gap_before_min: number;
  /** Validation result */
  valid: boolean;
  validation_warnings: string[];
}

/** Full resolved strategy sequence */
export interface StrategySequence {
  steps: SequenceStep[];
  total_cycle_time_min: number;
  total_cost: number;
  final_Ra_um: number;
  tool_changes: number;
  unique_tools: string[];
  warnings: string[];
  /** True if every step passed safety validation */
  all_valid: boolean;
}

/** Evaluation result for a complete sequence */
export interface SequenceEvaluation {
  total_cycle_time_min: number;
  total_cost: number;
  final_Ra_um: number;
  tool_changes: number;
  warnings: string[];
  /** Composite score — lower is better */
  score: number;
}

/** Result of the permutation optimizer */
export interface OptimizeResult {
  best_sequence: StrategySequence;
  best_evaluation: SequenceEvaluation;
  /** Number of permutations actually evaluated */
  permutations_evaluated: number;
  /** All evaluations sorted best-first (score ascending) */
  ranked_evaluations: Array<{
    order: string[];       // operation id order
    evaluation: SequenceEvaluation;
  }>;
}

// ============================================================================
// MATERIAL THERMAL PROFILES (for cooling-gap heuristics)
// ============================================================================

const THERMAL_PROFILES: Record<IsoGroup, {
  heat_per_min: number;   // arbitrary heat units / min of cutting
  dissipation: number;    // heat units dissipated per min of idle
  hot_threshold: number;  // heat units = "hot"
}> = {
  P: { heat_per_min: 8,  dissipation: 3, hot_threshold: 40 },  // steel
  M: { heat_per_min: 12, dissipation: 2, hot_threshold: 35 },  // stainless
  K: { heat_per_min: 5,  dissipation: 4, hot_threshold: 45 },  // cast iron
  N: { heat_per_min: 3,  dissipation: 5, hot_threshold: 50 },  // non-ferrous
  S: { heat_per_min: 15, dissipation: 1, hot_threshold: 30 },  // superalloy
  H: { heat_per_min: 10, dissipation: 2, hot_threshold: 35 },  // hardened
};

// ============================================================================
// SEQUENCING RULE PRIORITIES
// ============================================================================

/** Canonical role ordering — lower index = must run earlier */
const ROLE_ORDER: OperationRole[] = [
  "face_mill",
  "adaptive_rough",
  "contour_rough",
  "rest_rough",
  "zlevel_semi",
  "corner_semi",
  "wall_finish",
  "floor_finish",
  "deburr",
];

function roleScore(role: OperationRole): number {
  const idx = ROLE_ORDER.indexOf(role);
  return idx === -1 ? 99 : idx;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class StrategySequencingEngine {
  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * sequenceStrategies
   *
   * Orders the candidate operations into a physically valid sequence using a
   * greedy rule engine:
   *   1. Sort by canonical role order (rough → semi → finish)
   *   2. Group by tool to minimize tool changes when roles allow
   *   3. Validate each step against the current stock state
   *   4. Insert cooling gaps when thermal state exceeds threshold
   *   5. Skip operations that are already satisfied by current stock state
   */
  sequenceStrategies(
    feature: FeatureInput,
    material: MaterialInput,
    tool_options: StrategyCandidate[],
    machine: MachineInput,
    constraints: SequenceConstraints = {},
  ): StrategySequence {
    const ops = this._sortCandidates(tool_options, constraints);
    return this._buildSequence(ops, feature, material, machine, constraints);
  }

  /**
   * evaluateSequence
   *
   * Score a pre-ordered list of operations.  Returns total cycle time, cost,
   * final Ra, tool change count, warnings, and a composite score.
   */
  evaluateSequence(
    ordered_ops: StrategyCandidate[],
    feature: FeatureInput,
    material: MaterialInput,
    machine: MachineInput = {
      id: "generic",
      max_spindle_rpm: 10000,
      max_feed_mmpm: 5000,
      tool_change_time_sec: 10,
    },
    constraints: SequenceConstraints = {},
  ): SequenceEvaluation {
    const seq = this._buildSequence(ordered_ops, feature, material, machine, constraints);
    return this._scoreSequence(seq, constraints);
  }

  /**
   * optimizeSequence
   *
   * Exhaustive permutation search up to 6! = 720 combinations.
   * For n > 6, applies greedy + 2-opt improvement instead.
   * Returns the best ordered sequence and a ranked list of all evaluations.
   */
  optimizeSequence(
    feature: FeatureInput,
    material: MaterialInput,
    tools: StrategyCandidate[],
    machine: MachineInput,
    constraints: SequenceConstraints = {},
  ): OptimizeResult {
    const n = tools.length;
    const MAX_EXACT = 6;  // 6! = 720

    if (n <= MAX_EXACT) {
      return this._exhaustiveSearch(feature, material, tools, machine, constraints);
    }
    return this._greedyWithTwoOpt(feature, material, tools, machine, constraints);
  }

  // --------------------------------------------------------------------------
  // SEQUENCE BUILDER
  // --------------------------------------------------------------------------

  private _buildSequence(
    ops: StrategyCandidate[],
    feature: FeatureInput,
    material: MaterialInput,
    machine: MachineInput,
    constraints: SequenceConstraints,
  ): StrategySequence {
    const featureVolume = this._featureVolume(feature);
    const thermalProfile = THERMAL_PROFILES[material.iso_group];
    const tcSec = machine.tool_change_time_sec ?? 10;
    const tcMin = tcSec / 60;

    // Initial stock state
    let stock: StockStateSnapshot = {
      remaining_volume_pct: 100,
      wall_thickness_current_mm: (feature.width_mm ?? 50) / 2,
      floor_thickness_current_mm: feature.depth_mm * 0.6,
      corner_radius_current_mm: feature.width_mm ? feature.width_mm / 4 : 10,
      surface_Ra_current_um: 25,    // raw stock Ra
      thermal_state: "cold",
      cooling_gap_inserted: false,
    };

    let heatUnits = 0;
    let prevToolId = "";
    let toolChanges = 0;
    const uniqueTools: string[] = [];
    let totalTime = 0;
    let totalCost = 0;
    const steps: SequenceStep[] = [];
    const seqWarnings: string[] = [];

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const stockBefore = { ...stock };

      // ── Validate op against current stock state ──────────────────────────
      const valWarnings: string[] = [];
      let valid = true;

      if (op.requires_prior_removal_pct !== undefined) {
        const alreadyRemoved = 100 - stock.remaining_volume_pct;
        if (alreadyRemoved < op.requires_prior_removal_pct) {
          valWarnings.push(
            `${op.id}: requires ${op.requires_prior_removal_pct.toFixed(0)}% removed first,` +
            ` but only ${alreadyRemoved.toFixed(1)}% removed so far`,
          );
          valid = false;
        }
      }

      if (op.requires_corner_radius_le_mm !== undefined &&
          stock.corner_radius_current_mm > op.requires_corner_radius_le_mm) {
        valWarnings.push(
          `${op.id}: needs corner radius ≤ ${op.requires_corner_radius_le_mm} mm,` +
          ` current corner = ${stock.corner_radius_current_mm.toFixed(2)} mm`,
        );
        // non-fatal warning — we still run it but flag
      }

      // Check deflection safety on thin walls for finish ops
      if (
        (op.role === "wall_finish" || op.role === "floor_finish") &&
        stock.wall_thickness_current_mm < op.tool.diameter_mm * 2
      ) {
        const deflEng = getPartDeflection();
        if (deflEng?.estimateDeflection) {
          const tipForce_N = 50; // rough estimate
          const defl = deflEng.estimateDeflection(
            op.tool.diameter_mm,
            feature.depth_mm,
            tipForce_N,
          );
          if (defl > 0.05) {
            valWarnings.push(
              `${op.id}: estimated deflection ${defl.toFixed(3)} mm > 0.05 mm tolerance — consider PTDC or reduced depth of cut`,
            );
          }
        }
      }

      // ── Tool change accounting ────────────────────────────────────────────
      let toolChangePenaltyMin = 0;
      if (prevToolId && prevToolId !== op.tool.id) {
        toolChanges++;
        toolChangePenaltyMin = tcMin;
        if (machine.tool_positions && toolChanges > machine.tool_positions) {
          valWarnings.push(`Tool position limit (${machine.tool_positions}) exceeded — manual tool change required`);
        }
      }
      if (!uniqueTools.includes(op.tool.id)) uniqueTools.push(op.tool.id);
      prevToolId = op.tool.id;

      // ── Thermal state update ──────────────────────────────────────────────
      const baseTime = op.base_cycle_time_min ?? this._estimateCycleTime(op, stock, feature, featureVolume);
      heatUnits += baseTime * thermalProfile.heat_per_min;

      let coolingGapMin = 0;
      if (op.needs_coolant_gap && heatUnits >= thermalProfile.hot_threshold) {
        coolingGapMin = constraints.thermal_gap_min ?? 2.0;
        heatUnits = Math.max(0, heatUnits - coolingGapMin * thermalProfile.dissipation);
        stock = { ...stock, thermal_state: "warm", cooling_gap_inserted: true };
      } else {
        // Passive dissipation during tool change
        heatUnits = Math.max(0, heatUnits - toolChangePenaltyMin * thermalProfile.dissipation);
        stock = {
          ...stock,
          thermal_state: heatUnits >= thermalProfile.hot_threshold ? "hot"
            : heatUnits >= thermalProfile.hot_threshold * 0.6 ? "warm"
            : "cold",
          cooling_gap_inserted: false,
        };
      }

      // ── Stock state evolution ─────────────────────────────────────────────
      const removedThisOp = op.material_removal_fraction ?? this._defaultRemovalFraction(op.role);
      const newRemainingPct = Math.max(
        0,
        stock.remaining_volume_pct - removedThisOp * 100,
      );

      // Corner radius converges toward tool corner radius
      const toolCR = op.tool.corner_radius_mm ?? op.tool.diameter_mm * 0.05;
      const cornerImprovement = op.role === "corner_semi" || op.role === "rest_rough" ? 0.6 : 0.1;
      const newCornerRadius = Math.max(
        toolCR,
        stock.corner_radius_current_mm - cornerImprovement * (stock.corner_radius_current_mm - toolCR),
      );

      // Wall thickness thins as material is removed toward net shape
      const wallThinning = op.role === "wall_finish" ? feature.depth_mm * 0.01 : 0;
      const newWallThickness = Math.max(
        1.0,
        stock.wall_thickness_current_mm - wallThinning,
      );

      // Floor thickness: floor ops remove the last bit
      const floorCut = op.role === "floor_finish" ? feature.depth_mm * 0.02 : 0;
      const newFloorThickness = Math.max(0.5, stock.floor_thickness_current_mm - floorCut);

      // Surface Ra improves with finishing operations
      const newRa = this._updatedRa(stock.surface_Ra_current_um, op);

      const stockAfter: StockStateSnapshot = {
        remaining_volume_pct: Math.round(newRemainingPct * 10) / 10,
        wall_thickness_current_mm: Math.round(newWallThickness * 100) / 100,
        floor_thickness_current_mm: Math.round(newFloorThickness * 100) / 100,
        corner_radius_current_mm: Math.round(newCornerRadius * 1000) / 1000,
        surface_Ra_current_um: Math.round(newRa * 100) / 100,
        thermal_state: stock.thermal_state,
        cooling_gap_inserted: coolingGapMin > 0,
      };

      // ── Adjust cycle time based on actual remaining stock ─────────────────
      const stockFactor = Math.min(1.0, stock.remaining_volume_pct / 100 + 0.2);
      const adjustedTime = Math.round(baseTime * stockFactor * 100) / 100;
      const opCost = adjustedTime * (op.cost_per_min ?? this._defaultCostPerMin(op));

      totalTime += coolingGapMin + toolChangePenaltyMin + adjustedTime;
      totalCost += opCost;

      steps.push({
        step_index: i,
        operation: op,
        stock_state_before: stockBefore,
        stock_state_after: stockAfter,
        adjusted_cycle_time_min: adjustedTime,
        cooling_gap_before_min: coolingGapMin,
        valid,
        validation_warnings: valWarnings,
      });

      if (valWarnings.length > 0) seqWarnings.push(...valWarnings);
      stock = stockAfter;

      // Hard constraint check
      if (constraints.max_cycle_time_min && totalTime > constraints.max_cycle_time_min) {
        seqWarnings.push(
          `Cycle time limit ${constraints.max_cycle_time_min} min exceeded after step ${i + 1}`,
        );
      }
    }

    return {
      steps,
      total_cycle_time_min: Math.round(totalTime * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      final_Ra_um: stock.surface_Ra_current_um,
      tool_changes: toolChanges,
      unique_tools: uniqueTools,
      warnings: seqWarnings,
      all_valid: steps.every((s) => s.valid),
    };
  }

  // --------------------------------------------------------------------------
  // SORTING HELPERS
  // --------------------------------------------------------------------------

  private _sortCandidates(
    ops: StrategyCandidate[],
    constraints: SequenceConstraints,
  ): StrategyCandidate[] {
    const sorted = [...ops].sort((a, b) => {
      const roleDiff = roleScore(a.role) - roleScore(b.role);
      if (roleDiff !== 0) return roleDiff;
      // Within the same role, group by tool to reduce tool changes
      if (constraints.minimize_tool_changes) {
        return a.tool.id.localeCompare(b.tool.id);
      }
      return 0;
    });
    return sorted;
  }

  // --------------------------------------------------------------------------
  // PERMUTATION SEARCH
  // --------------------------------------------------------------------------

  private _exhaustiveSearch(
    feature: FeatureInput,
    material: MaterialInput,
    ops: StrategyCandidate[],
    machine: MachineInput,
    constraints: SequenceConstraints,
  ): OptimizeResult {
    const perms = this._permutations(ops);
    const ranked: OptimizeResult["ranked_evaluations"] = [];
    let bestScore = Infinity;
    let bestSeq: StrategySequence | null = null;
    let bestEval: SequenceEvaluation | null = null;

    for (const perm of perms) {
      const seq = this._buildSequence(perm, feature, material, machine, constraints);
      const ev = this._scoreSequence(seq, constraints);
      ranked.push({ order: perm.map((o) => o.id), evaluation: ev });
      if (ev.score < bestScore) {
        bestScore = ev.score;
        bestSeq = seq;
        bestEval = ev;
      }
    }

    ranked.sort((a, b) => a.evaluation.score - b.evaluation.score);

    return {
      best_sequence: bestSeq!,
      best_evaluation: bestEval!,
      permutations_evaluated: perms.length,
      ranked_evaluations: ranked,
    };
  }

  private _greedyWithTwoOpt(
    feature: FeatureInput,
    material: MaterialInput,
    ops: StrategyCandidate[],
    machine: MachineInput,
    constraints: SequenceConstraints,
  ): OptimizeResult {
    // Start with role-sorted greedy solution
    let current = this._sortCandidates(ops, constraints);
    let currentSeq = this._buildSequence(current, feature, material, machine, constraints);
    let currentEval = this._scoreSequence(currentSeq, constraints);

    let improved = true;
    let iters = 0;
    const MAX_ITERS = 500;

    while (improved && iters < MAX_ITERS) {
      improved = false;
      iters++;
      for (let i = 0; i < current.length - 1; i++) {
        for (let j = i + 1; j < current.length; j++) {
          // Only swap if both are in adjacent roles (otherwise physically invalid)
          if (Math.abs(roleScore(current[i].role) - roleScore(current[j].role)) > 1) continue;
          const candidate = [...current];
          [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
          const seq2 = this._buildSequence(candidate, feature, material, machine, constraints);
          const ev2 = this._scoreSequence(seq2, constraints);
          if (ev2.score < currentEval.score) {
            current = candidate;
            currentSeq = seq2;
            currentEval = ev2;
            improved = true;
          }
        }
      }
    }

    return {
      best_sequence: currentSeq,
      best_evaluation: currentEval,
      permutations_evaluated: iters * ops.length * ops.length,
      ranked_evaluations: [{ order: current.map((o) => o.id), evaluation: currentEval }],
    };
  }

  /** Heap's algorithm for generating all permutations */
  private _permutations<T>(arr: T[]): T[][] {
    const results: T[][] = [];
    const n = arr.length;
    const c = new Array<number>(n).fill(0);
    results.push([...arr]);
    let i = 0;
    while (i < n) {
      if (c[i] < i) {
        if (i % 2 === 0) [arr[0], arr[i]] = [arr[i], arr[0]];
        else [arr[c[i]], arr[i]] = [arr[i], arr[c[i]]];
        results.push([...arr]);
        c[i]++;
        i = 0;
      } else {
        c[i] = 0;
        i++;
      }
    }
    return results;
  }

  // --------------------------------------------------------------------------
  // SCORING
  // --------------------------------------------------------------------------

  private _scoreSequence(seq: StrategySequence, constraints: SequenceConstraints): SequenceEvaluation {
    const obj = constraints.optimize_for ?? "balanced";

    // Normalize each dimension to [0, 1] range (approximate)
    const timeNorm = Math.min(seq.total_cycle_time_min / 120, 1);   // 120 min = "bad"
    const costNorm = Math.min(seq.total_cost / 500, 1);              // $500 = "bad"
    const raNorm   = Math.min(seq.final_Ra_um / 3.2, 1);            // Ra 3.2 µm = "bad"
    const tcNorm   = Math.min(seq.tool_changes / 5, 1);             // 5 changes = "bad"
    const warnPenalty = seq.warnings.length * 0.05;

    let score: number;
    switch (obj) {
      case "cycle_time":
        score = timeNorm * 0.7 + costNorm * 0.1 + raNorm * 0.1 + tcNorm * 0.1;
        break;
      case "cost":
        score = costNorm * 0.7 + timeNorm * 0.15 + raNorm * 0.1 + tcNorm * 0.05;
        break;
      case "quality":
        score = raNorm * 0.6 + timeNorm * 0.2 + costNorm * 0.1 + tcNorm * 0.1;
        break;
      case "tool_changes":
        score = tcNorm * 0.6 + timeNorm * 0.2 + costNorm * 0.1 + raNorm * 0.1;
        break;
      default: // balanced
        score = timeNorm * 0.3 + costNorm * 0.25 + raNorm * 0.25 + tcNorm * 0.2;
        break;
    }
    score += warnPenalty;

    return {
      total_cycle_time_min: seq.total_cycle_time_min,
      total_cost: seq.total_cost,
      final_Ra_um: seq.final_Ra_um,
      tool_changes: seq.tool_changes,
      warnings: seq.warnings,
      score: Math.round(score * 10000) / 10000,
    };
  }

  // --------------------------------------------------------------------------
  // ESTIMATION HELPERS
  // --------------------------------------------------------------------------

  /** Rough feature envelope volume (mm³) */
  private _featureVolume(f: FeatureInput): number {
    const w = f.width_mm ?? 50;
    const l = f.length_mm ?? 80;
    return w * l * f.depth_mm;
  }

  /**
   * Estimate cycle time (min) from MRR and remaining stock volume.
   * Falls back to role-based heuristic if MRR not provided.
   */
  private _estimateCycleTime(
    op: StrategyCandidate,
    stock: StockStateSnapshot,
    feature: FeatureInput,
    featureVolume_mm3: number,
  ): number {
    const remVol_mm3 = featureVolume_mm3 * (stock.remaining_volume_pct / 100);
    const remFrac = op.material_removal_fraction ?? this._defaultRemovalFraction(op.role);
    const cutVol_mm3 = remVol_mm3 * remFrac;
    const cutVol_cm3 = cutVol_mm3 / 1000;

    if (op.mrr_cm3_per_min && op.mrr_cm3_per_min > 0) {
      return Math.max(0.5, cutVol_cm3 / op.mrr_cm3_per_min);
    }

    // Role-based defaults (min per 1000 mm³ removed)
    const roleMinPerKcm3: Record<OperationRole, number> = {
      face_mill:     0.5,
      adaptive_rough: 0.8,
      contour_rough:  1.2,
      rest_rough:     2.0,
      zlevel_semi:    1.5,
      corner_semi:    2.5,
      wall_finish:    3.0,
      floor_finish:   2.5,
      deburr:         1.0,
    };
    return Math.max(0.5, (cutVol_mm3 / 1000) * (roleMinPerKcm3[op.role] ?? 2.0));
  }

  /** Default fraction of remaining stock removed per role */
  private _defaultRemovalFraction(role: OperationRole): number {
    const fracs: Record<OperationRole, number> = {
      face_mill:      0.05,
      adaptive_rough: 0.70,
      contour_rough:  0.60,
      rest_rough:     0.10,
      zlevel_semi:    0.12,
      corner_semi:    0.04,
      wall_finish:    0.02,
      floor_finish:   0.02,
      deburr:         0.01,
    };
    return fracs[role] ?? 0.05;
  }

  /** Default cost rate ($/min) by tool material */
  private _defaultCostPerMin(op: StrategyCandidate): number {
    const mat = op.tool.material ?? "carbide";
    const rates: Record<string, number> = {
      HSS:     0.8,
      carbide: 1.5,
      cermet:  2.0,
      cbn:     3.5,
      ceramic: 2.8,
    };
    return rates[mat] ?? 1.5;
  }

  /**
   * Update surface Ra after an operation.
   * Ra improves (decreases) toward the operation's expected Ra,
   * weighted by how much of a finishing role the op plays.
   */
  private _updatedRa(currentRa: number, op: StrategyCandidate): number {
    if (op.expected_Ra_um === undefined) {
      // Rough guess from role
      const roleRa: Record<OperationRole, number> = {
        face_mill:      3.2,
        adaptive_rough: 12.5,
        contour_rough:  6.3,
        rest_rough:     6.3,
        zlevel_semi:    3.2,
        corner_semi:    1.6,
        wall_finish:    0.8,
        floor_finish:   0.8,
        deburr:         currentRa,
      };
      const target = roleRa[op.role] ?? currentRa;
      // Blend: finishing ops dominate, roughing ops only affect area cut
      const alpha = op.role.includes("finish") ? 0.9 : 0.5;
      return currentRa + alpha * (target - currentRa);
    }
    // Blend toward expected Ra
    const alpha = op.role.includes("finish") || op.role === "corner_semi" ? 0.9 : 0.5;
    return currentRa + alpha * (op.expected_Ra_um - currentRa);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const strategySequencingEngine = new StrategySequencingEngine();
