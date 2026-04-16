/**
 * LATHE-PRO-MS3, U-LPS02
 * LatheSequenceOptimizerEngine — Multi-Criteria Operation Sequencing
 *
 * Optimizes operation order for turned parts using hard constraints + soft objectives.
 *
 * Hard constraints (NEVER violated):
 * - Face first (establishes Z datum)
 * - Cutoff/part-off last
 * - G96 (CSS) for turning/facing, G97 (RPM) for drilling/tapping
 * - Center drill before drill
 * - Rough before finish on same feature
 * - Thread after OD finish (thread won't survive roughing loads)
 *
 * Soft objectives (multi-criteria weighted):
 * - Minimize cycle time (reduce tool changes, minimize rapid travel)
 * - Maximize tool life (sequence high-wear ops when tool is fresh)
 * - Minimize tool changes (group operations by tool)
 * - Minimize thermal drift (rough_all → cool → finish_all for tight tolerance)
 *
 * Reference: Peter Smid "CNC Programming Handbook" Ch. 2
 * Reference: Machinery's Handbook, 31st Ed. — Process Planning
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type OperationType =
  | "face"
  | "center_drill"
  | "rough_od"
  | "finish_od"
  | "rough_bore"
  | "finish_bore"
  | "drill"
  | "ream"
  | "tap"
  | "thread_od"
  | "thread_id"
  | "groove_od"
  | "groove_id"
  | "groove_face"
  | "part_off"
  | "chamfer"
  | "knurl"
  | "polish"
  | "g73_rough"
  | "keyway"
  | "profile_od"
  | "profile_bore";

export type SpindleMode = "G96" | "G97";

export interface SequenceOperation {
  id: string;
  type: OperationType;
  feature_id?: string;
  tool_number?: number;
  /** Estimated cycle time in seconds */
  estimated_time_sec?: number;
  /** Is this a roughing operation? */
  is_roughing?: boolean;
  /** Is this a finishing operation? */
  is_finishing?: boolean;
  /** Required tolerance in mm (for thermal sequencing) */
  tolerance_mm?: number;
  /** Tool group — operations sharing same tool get grouped */
  tool_group?: string;
}

export interface SequenceConstraints {
  /** Tolerance threshold for thermal sequencing (default 0.05mm) */
  thermal_tolerance_threshold_mm?: number;
  /** Enable thermal rough-cool-finish sequencing */
  force_thermal_sequencing?: boolean;
  /** Weight: cycle time minimization (0-1, default 0.3) */
  weight_cycle_time?: number;
  /** Weight: tool life maximization (0-1, default 0.2) */
  weight_tool_life?: number;
  /** Weight: tool change minimization (0-1, default 0.3) */
  weight_tool_changes?: number;
  /** Weight: thermal drift minimization (0-1, default 0.2) */
  weight_thermal?: number;
}

export interface SequenceResult {
  operations: SequenceOperation[];
  spindle_modes: Map<string, SpindleMode>;
  tool_changes: number;
  thermal_sequencing_active: boolean;
  constraint_violations: string[];
  optimization_score: number;
  reasoning: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// OPERATION METADATA
// ═══════════════════════════════════════════════════════════════════════

/** Spindle mode per operation type: G96 (CSS) vs G97 (RPM) */
const SPINDLE_MODE: Record<OperationType, SpindleMode> = {
  face: "G96",
  center_drill: "G97",
  rough_od: "G96",
  finish_od: "G96",
  rough_bore: "G96",
  finish_bore: "G96",
  drill: "G97",
  ream: "G97",
  tap: "G97",
  thread_od: "G97",
  thread_id: "G97",
  groove_od: "G96",
  groove_id: "G96",
  groove_face: "G96",
  part_off: "G96",
  chamfer: "G96",
  knurl: "G96",
  polish: "G96",
  g73_rough: "G96",
  keyway: "G97",
  profile_od: "G96",
  profile_bore: "G96",
};

/** Hard constraint: operation priority tiers (lower = must come earlier) */
const PRIORITY_TIER: Record<OperationType, number> = {
  face: 1,            // Always first — Z datum
  center_drill: 2,    // Before drilling
  drill: 3,           // After center drill, before bore
  rough_od: 4,
  g73_rough: 4,
  rough_bore: 4,
  ream: 5,            // After drill
  finish_od: 6,
  finish_bore: 6,
  profile_od: 6,
  profile_bore: 6,
  groove_od: 7,
  groove_id: 7,
  groove_face: 7,
  thread_od: 8,       // After OD finish
  thread_id: 8,
  chamfer: 9,
  knurl: 9,
  polish: 9,
  keyway: 9,
  tap: 10,            // After drill + ream
  part_off: 99,       // Always last
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class LatheSequenceOptimizerEngine {
  /**
   * Optimize operation sequence with hard constraints and soft objectives.
   *
   * @param operations Unordered list of operations
   * @param constraints Optimization weights and thresholds
   * @returns Optimized sequence with analysis
   */
  optimize(operations: SequenceOperation[], constraints: SequenceConstraints = {}): SequenceResult {
    const thermalThreshold = constraints.thermal_tolerance_threshold_mm ?? 0.05;
    const wCycleTime = constraints.weight_cycle_time ?? 0.3;
    const wToolLife = constraints.weight_tool_life ?? 0.2;
    const wToolChanges = constraints.weight_tool_changes ?? 0.3;
    const wThermal = constraints.weight_thermal ?? 0.2;

    const reasoning: string[] = [];
    const violations: string[] = [];

    // Determine if thermal sequencing is needed
    const hasTightTolerance = operations.some(op => (op.tolerance_mm ?? 1) < thermalThreshold);
    const thermalActive = constraints.force_thermal_sequencing || hasTightTolerance;

    if (thermalActive) {
      reasoning.push(`Thermal sequencing active: ${hasTightTolerance ? `tolerance < ${thermalThreshold}mm detected` : "forced by constraint"}`);
    }

    // ── Step 1: Apply hard constraints via priority sort ─────────────
    let sorted = [...operations].sort((a, b) => {
      const pa = PRIORITY_TIER[a.type] ?? 50;
      const pb = PRIORITY_TIER[b.type] ?? 50;
      return pa - pb;
    });

    // ── Step 2: Thermal sequencing — rough_all → cool → finish_all ──
    if (thermalActive) {
      const roughOps = sorted.filter(op => op.is_roughing || this.isRoughingType(op.type));
      const finishOps = sorted.filter(op => op.is_finishing || this.isFinishingType(op.type));
      const otherOps = sorted.filter(op =>
        !roughOps.includes(op) && !finishOps.includes(op)
      );

      // Reconstruct: face → rough ops → other → finish ops → part_off
      const faceOps = sorted.filter(op => op.type === "face");
      const partOff = sorted.filter(op => op.type === "part_off");
      const preDrill = sorted.filter(op => op.type === "center_drill" || op.type === "drill");

      // Remove face, part_off, and pre-drill from their respective groups
      const cleanRough = roughOps.filter(op => op.type !== "face" && op.type !== "part_off");
      const cleanFinish = finishOps.filter(op => op.type !== "face" && op.type !== "part_off");
      const cleanOther = otherOps.filter(op =>
        op.type !== "face" && op.type !== "part_off" &&
        op.type !== "center_drill" && op.type !== "drill"
      );

      sorted = [
        ...faceOps,
        ...preDrill,
        ...cleanRough,
        ...cleanOther,
        ...cleanFinish,
        ...partOff,
      ];

      reasoning.push(`Rough-cool-finish: ${cleanRough.length} rough → ${cleanOther.length} other → ${cleanFinish.length} finish`);
    }

    // ── Step 3: Tool change minimization — group by tool within tiers ──
    sorted = this.groupByTool(sorted, thermalActive);

    // ── Step 4: Assign spindle modes ─────────────────────────────────
    const spindleModes = new Map<string, SpindleMode>();
    for (const op of sorted) {
      spindleModes.set(op.id, SPINDLE_MODE[op.type] ?? "G96");
    }

    // ── Step 5: Validate hard constraints ────────────────────────────
    this.validateConstraints(sorted, violations);

    // ── Step 6: Count tool changes ───────────────────────────────────
    let toolChanges = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prevTool = sorted[i - 1].tool_number ?? sorted[i - 1].tool_group ?? i - 1;
      const currTool = sorted[i].tool_number ?? sorted[i].tool_group ?? i;
      if (prevTool !== currTool) toolChanges++;
    }

    // ── Step 7: Compute optimization score ───────────────────────────
    const maxToolChanges = sorted.length - 1;
    const tcScore = maxToolChanges > 0 ? 1 - (toolChanges / maxToolChanges) : 1;
    const thermalScore = thermalActive ? 1 : (hasTightTolerance ? 0.3 : 0.8);
    const constraintScore = violations.length === 0 ? 1 : Math.max(0, 1 - violations.length * 0.2);
    // Tool life: roughing first = fresh tool on heavy cuts = good
    const lifeScore = this.computeToolLifeScore(sorted);

    const score = wCycleTime * tcScore + wToolLife * lifeScore +
                  wToolChanges * tcScore + wThermal * thermalScore;
    const normalizedScore = Math.min(1, score / (wCycleTime + wToolLife + wToolChanges + wThermal)) * constraintScore;

    reasoning.push(`Tool changes: ${toolChanges}/${maxToolChanges} possible`);
    reasoning.push(`Optimization score: ${(normalizedScore * 100).toFixed(0)}%`);

    return {
      operations: sorted,
      spindle_modes: spindleModes,
      tool_changes: toolChanges,
      thermal_sequencing_active: thermalActive,
      constraint_violations: violations,
      optimization_score: normalizedScore,
      reasoning,
    };
  }

  /**
   * Validate a sequence against hard constraints.
   * Returns list of violations (empty = valid).
   */
  validateSequence(operations: SequenceOperation[]): string[] {
    const violations: string[] = [];
    this.validateConstraints(operations, violations);
    return violations;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private isRoughingType(type: OperationType): boolean {
    return type === "rough_od" || type === "rough_bore" || type === "g73_rough";
  }

  private isFinishingType(type: OperationType): boolean {
    return type === "finish_od" || type === "finish_bore" || type === "profile_od" ||
           type === "profile_bore" || type === "polish";
  }

  private groupByTool(ops: SequenceOperation[], thermalActive: boolean): SequenceOperation[] {
    if (ops.length <= 2) return ops;

    // Group ops within the same priority tier by tool
    const result: SequenceOperation[] = [];
    let i = 0;
    while (i < ops.length) {
      const tier = PRIORITY_TIER[ops[i].type] ?? 50;
      const tierOps: SequenceOperation[] = [];

      // Collect all ops in same tier
      while (i < ops.length && (PRIORITY_TIER[ops[i].type] ?? 50) === tier) {
        tierOps.push(ops[i]);
        i++;
      }

      // Sort tier by tool group/number to minimize changes
      if (!thermalActive || (tier !== 4 && tier !== 6)) {
        tierOps.sort((a, b) => {
          const ta = a.tool_number ?? a.tool_group ?? "";
          const tb = b.tool_number ?? b.tool_group ?? "";
          return String(ta).localeCompare(String(tb));
        });
      }

      result.push(...tierOps);
    }

    return result;
  }

  private validateConstraints(ops: SequenceOperation[], violations: string[]): void {
    const indices = new Map<string, number>();
    ops.forEach((op, idx) => {
      // Store first occurrence of each type
      if (!indices.has(op.type)) indices.set(op.type, idx);
    });

    // Store last occurrence too for rough/finish pairs
    const lastIndices = new Map<string, number>();
    ops.forEach((op, idx) => {
      lastIndices.set(op.type, idx);
    });

    // Face must be first (or among first operations)
    const faceIdx = indices.get("face");
    if (faceIdx !== undefined && faceIdx > 1) {
      violations.push(`HARD: Face operation at position ${faceIdx + 1}, should be position 1 (Z datum)`);
    }

    // Part-off must be last
    const partOffIdx = indices.get("part_off");
    if (partOffIdx !== undefined && partOffIdx < ops.length - 1) {
      // Check nothing after part_off except other part_offs
      for (let j = partOffIdx + 1; j < ops.length; j++) {
        if (ops[j].type !== "part_off") {
          violations.push(`HARD: Operation '${ops[j].type}' after part_off at position ${j + 1}`);
        }
      }
    }

    // Center drill before drill
    const cdIdx = indices.get("center_drill");
    const drillIdx = indices.get("drill");
    if (cdIdx !== undefined && drillIdx !== undefined && cdIdx > drillIdx) {
      violations.push("HARD: Center drill must precede drill");
    }

    // Rough before finish on OD
    const roughOdLast = lastIndices.get("rough_od");
    const finOdFirst = indices.get("finish_od");
    if (roughOdLast !== undefined && finOdFirst !== undefined && roughOdLast > finOdFirst) {
      violations.push("HARD: Rough OD must precede finish OD");
    }

    // Rough before finish on bore
    const roughBoreLast = lastIndices.get("rough_bore");
    const finBoreFirst = indices.get("finish_bore");
    if (roughBoreLast !== undefined && finBoreFirst !== undefined && roughBoreLast > finBoreFirst) {
      violations.push("HARD: Rough bore must precede finish bore");
    }

    // Thread after OD finish
    const threadOdIdx = indices.get("thread_od");
    const finOdIdx = lastIndices.get("finish_od");
    if (threadOdIdx !== undefined && finOdIdx !== undefined && threadOdIdx < finOdIdx) {
      violations.push("HARD: Thread OD should come after finish OD");
    }

    // Drill before ream
    const reamIdx = indices.get("ream");
    if (reamIdx !== undefined && drillIdx !== undefined && drillIdx > reamIdx) {
      violations.push("HARD: Drill must precede ream");
    }

    // Drill before tap
    const tapIdx = indices.get("tap");
    if (tapIdx !== undefined && drillIdx !== undefined && drillIdx > tapIdx) {
      violations.push("HARD: Drill must precede tap");
    }

    // G97 operations should not use G96
    for (const op of ops) {
      if ((op.type === "drill" || op.type === "tap" || op.type === "ream") &&
          SPINDLE_MODE[op.type] !== "G97") {
        violations.push(`HARD: ${op.type} must use G97, not G96`);
      }
    }
  }

  private computeToolLifeScore(ops: SequenceOperation[]): number {
    // Roughing operations first = fresh tool on heavy cuts = better tool life
    let roughBeforeFinish = 0;
    let totalRoughFinishPairs = 0;
    let lastRoughIdx = -1;

    for (let i = 0; i < ops.length; i++) {
      if (this.isRoughingType(ops[i].type)) lastRoughIdx = i;
      if (this.isFinishingType(ops[i].type) && lastRoughIdx >= 0) {
        totalRoughFinishPairs++;
        if (lastRoughIdx < i) roughBeforeFinish++;
      }
    }

    return totalRoughFinishPairs > 0 ? roughBeforeFinish / totalRoughFinishPairs : 0.8;
  }
}

export const latheSequenceOptimizerEngine = new LatheSequenceOptimizerEngine();
