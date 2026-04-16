/**
 * IntelligentSequencingEngine — CAM Operation Sequencing
 * ========================================================
 * Sequences CAM operations using intelligent rules:
 * - datum_first: Datum/reference surfaces before dependent ops
 * - rough_all_before_finish_any: Roughing passes before finishing
 * - hole_sequence: center_drill -> drill -> ream -> tap
 * - tool_grouping_tsp: Group same-tool operations (minimize tool changes)
 * - parting_last: Parting/cutoff always last
 * - thermal_wait: Insert thermal stabilization gaps
 * - probe_points: Insert probe points after roughing
 *
 * @module engines/IntelligentSequencingEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Operation types for sequencing */
export type OperationType =
  | "facing"
  | "roughing"
  | "finishing"
  | "drilling"
  | "center_drill"
  | "reaming"
  | "tapping"
  | "boring"
  | "threading"
  | "grooving"
  | "parting"
  | "rest"
  | "thermal_wait"
  | "probe";

/** Input operation for sequencing */
export interface SequenceOperation {
  id: string;
  type: OperationType | string;
  operation: string;
  tool_id?: string;
  tool_diameter_mm?: number;
  position?: { x: number; y: number; z: number };
  is_datum?: boolean;
  depth_mm?: number;
  diameter_mm?: number;
  requires_ops?: string[];
  axes_required?: number;
}

/** Sequencing result */
export interface SequenceResult {
  operations: SequenceOperation[];
  rules_applied: string[];
  thermal_gaps_inserted: number;
  probe_points_inserted: number;
  tool_changes: number;
  tool_changes_saved?: number;
  rationale: string[];
  sequence_quality_score: number;
}

// ============================================================================
// SEQUENCING RULES
// ============================================================================

const OPERATION_PRIORITY: Record<string, number> = {
  facing: 10,
  center_drill: 20,
  drilling: 30,
  reaming: 40,
  boring: 45,
  tapping: 50,
  roughing: 60,
  rest: 65,
  thermal_wait: 70,
  probing: 75,
  probe: 75,
  finishing: 80,
  threading: 85,
  grooving: 90,
  parting: 100,
};

const HOLE_SEQUENCE = ["center_drill", "drilling", "reaming", "boring", "tapping"];

/** Quality scoring weights */
const QUALITY_WEIGHTS = {
  datum_first: 15,
  rough_before_finish: 20,
  tool_grouping: 15,
  hole_sequence: 10,
  depth_ordering: 10,
  dependency_respect: 15,
  axis_ordering: 5,
  thermal_gaps: 5,
  probe_points: 5,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class IntelligentSequencingEngine {
  /**
   * Sequence a list of CAM operations according to intelligent rules.
   */
  sequence(operations: SequenceOperation[]): SequenceResult {
    log.info("IntelligentSequencingEngine.sequence", { count: operations.length });

    const rules_applied: string[] = [];
    const rationale: string[] = [];
    let thermal_gaps_inserted = 0;
    let probe_points_inserted = 0;
    let qualityScore = 0;

    // Track original tool change count for savings calculation
    const originalToolChanges = this._countToolChanges(operations);

    // Clone operations for manipulation
    let ops = [...operations];

    // Rule 1: Handle explicit dependencies (requires_ops)
    ops = this._resolveDependencies(ops);
    if (operations.some(o => o.requires_ops?.length)) {
      rules_applied.push("dependency_resolution");
      qualityScore += QUALITY_WEIGHTS.dependency_respect;
    }

    // Rule 2: Datum operations first
    const datumOps = ops.filter(o => o.is_datum);
    const nonDatumOps = ops.filter(o => !o.is_datum);
    if (datumOps.length > 0) {
      ops = [...datumOps, ...nonDatumOps];
      rules_applied.push("datum_first");
      rationale.push(`Moved ${datumOps.length} datum ops to front`);
      qualityScore += QUALITY_WEIGHTS.datum_first;
    }

    // Rule 3: Sort by operation priority (rough before finish)
    ops.sort((a, b) => {
      const prioA = OPERATION_PRIORITY[a.type] ?? 50;
      const prioB = OPERATION_PRIORITY[b.type] ?? 50;
      return prioA - prioB;
    });
    rules_applied.push("rough_all_before_finish_any");
    qualityScore += QUALITY_WEIGHTS.rough_before_finish;

    // Rule 4: Hole sequencing (group by position, sequence properly)
    ops = this._sequenceHoles(ops);
    if (ops.some(o => HOLE_SEQUENCE.includes(o.type))) {
      rules_applied.push("hole_sequence");
      qualityScore += QUALITY_WEIGHTS.hole_sequence;
    }

    // Rule 5: Z-level ordering (shallow before deep within same type)
    ops = this._orderByDepth(ops);
    if (operations.some(o => o.depth_mm !== undefined)) {
      rules_applied.push("z_level_shallow_first");
      qualityScore += QUALITY_WEIGHTS.depth_ordering;
    }

    // Rule 6: Axis ordering (3+2 indexed before 5-axis simultaneous)
    ops = this._orderByAxes(ops);
    if (operations.some(o => o.axes_required !== undefined)) {
      rules_applied.push("axis_ordering_3plus2_first");
      qualityScore += QUALITY_WEIGHTS.axis_ordering;
    }

    // Rule 7: Tool grouping (minimize tool changes)
    ops = this._groupByTool(ops);
    rules_applied.push("tool_grouping_tsp");
    qualityScore += QUALITY_WEIGHTS.tool_grouping;

    // Rule 8: Parting last
    const partingOps = ops.filter(o => o.type === "parting");
    const nonPartingOps = ops.filter(o => o.type !== "parting");
    ops = [...nonPartingOps, ...partingOps];

    // Rule 9: Insert thermal gaps between roughing and finishing
    const hasRoughing = ops.some(o => o.type === "roughing");
    const hasFinishing = ops.some(o => o.type === "finishing");
    if (hasRoughing && hasFinishing) {
      ops = this._insertThermalGaps(ops);
      thermal_gaps_inserted = ops.filter(o => o.type === "thermal_wait").length;
      rationale.push(`Inserted ${thermal_gaps_inserted} thermal stabilization gaps`);
      rules_applied.push("thermal_relaxation");
      qualityScore += QUALITY_WEIGHTS.thermal_gaps;
    }

    // Rule 10: Insert probe points after roughing
    if (hasRoughing) {
      ops = this._insertProbePoints(ops);
      probe_points_inserted = ops.filter(o => o.type === "probing").length;
      rationale.push(`Inserted ${probe_points_inserted} probe verification points`);
      rules_applied.push("probe_insertion");
      qualityScore += QUALITY_WEIGHTS.probe_points;
    }

    // Count tool changes and calculate savings
    const tool_changes = this._countToolChanges(ops.filter(o => o.type !== "thermal_wait" && o.type !== "probing"));
    const tool_changes_saved = Math.max(0, originalToolChanges - tool_changes);

    // Normalize quality score to 0-100 range
    const maxPossibleScore = Object.values(QUALITY_WEIGHTS).reduce((a, b) => a + b, 0);
    const sequence_quality_score = Math.round((qualityScore / maxPossibleScore) * 100);

    return {
      operations: ops,
      rules_applied,
      thermal_gaps_inserted,
      probe_points_inserted,
      tool_changes,
      tool_changes_saved,
      rationale,
      sequence_quality_score,
    };
  }

  /**
   * Resolve explicit dependencies (requires_ops).
   */
  private _resolveDependencies(ops: SequenceOperation[]): SequenceOperation[] {
    const idMap = new Map(ops.map(o => [o.id, o]));
    const result: SequenceOperation[] = [];
    const added = new Set<string>();

    const addWithDeps = (op: SequenceOperation) => {
      if (added.has(op.id)) return;

      // Add dependencies first
      if (op.requires_ops) {
        for (const depId of op.requires_ops) {
          const dep = idMap.get(depId);
          if (dep && !added.has(depId)) {
            addWithDeps(dep);
          }
        }
      }

      result.push(op);
      added.add(op.id);
    };

    for (const op of ops) {
      addWithDeps(op);
    }

    return result;
  }

  /**
   * Order operations by depth (shallow before deep).
   */
  private _orderByDepth(ops: SequenceOperation[]): SequenceOperation[] {
    return [...ops].sort((a, b) => {
      // Only compare if same type and both have depth
      if (a.type !== b.type) return 0;
      if (a.depth_mm === undefined || b.depth_mm === undefined) return 0;
      return a.depth_mm - b.depth_mm; // Shallow first
    });
  }

  /**
   * Order by axes required (3+2 before 5-axis).
   */
  private _orderByAxes(ops: SequenceOperation[]): SequenceOperation[] {
    return [...ops].sort((a, b) => {
      // Only compare if same type
      if (a.type !== b.type) return 0;
      const axesA = a.axes_required ?? 3;
      const axesB = b.axes_required ?? 3;
      return axesA - axesB; // Lower axis count first
    });
  }

  private _sequenceHoles(ops: SequenceOperation[]): SequenceOperation[] {
    const posKey = (p?: { x: number; y: number; z: number }) =>
      p ? `${p.x.toFixed(3)},${p.y.toFixed(3)}` : "no-pos";

    const holeGroups = new Map<string, SequenceOperation[]>();
    const nonHoleOps: SequenceOperation[] = [];

    for (const op of ops) {
      if (HOLE_SEQUENCE.includes(op.type) && op.position) {
        const key = posKey(op.position);
        if (!holeGroups.has(key)) holeGroups.set(key, []);
        holeGroups.get(key)!.push(op);
      } else {
        nonHoleOps.push(op);
      }
    }

    for (const [, group] of holeGroups) {
      group.sort((a, b) => {
        const idxA = HOLE_SEQUENCE.indexOf(a.type);
        const idxB = HOLE_SEQUENCE.indexOf(b.type);
        return idxA - idxB;
      });
    }

    const sortedHoles = Array.from(holeGroups.values()).flat();
    return [...nonHoleOps, ...sortedHoles].sort((a, b) => {
      const prioA = OPERATION_PRIORITY[a.type] ?? 50;
      const prioB = OPERATION_PRIORITY[b.type] ?? 50;
      return prioA - prioB;
    });
  }

  private _groupByTool(ops: SequenceOperation[]): SequenceOperation[] {
    const toolGroups = new Map<string, SequenceOperation[]>();
    const noToolOps: SequenceOperation[] = [];

    for (const op of ops) {
      if (op.tool_id) {
        if (!toolGroups.has(op.tool_id)) toolGroups.set(op.tool_id, []);
        toolGroups.get(op.tool_id)!.push(op);
      } else {
        noToolOps.push(op);
      }
    }

    const grouped = Array.from(toolGroups.values()).flat();
    return [...noToolOps, ...grouped].sort((a, b) => {
      const prioA = OPERATION_PRIORITY[a.type] ?? 50;
      const prioB = OPERATION_PRIORITY[b.type] ?? 50;
      return prioA - prioB;
    });
  }

  private _insertThermalGaps(ops: SequenceOperation[]): SequenceOperation[] {
    const result: SequenceOperation[] = [];
    let lastWasRoughing = false;

    for (const op of ops) {
      if (op.type === "finishing" && lastWasRoughing) {
        result.push({
          id: `thermal-${result.length}`,
          type: "thermal_wait",
          operation: "thermal_stabilization",
        });
      }
      result.push(op);
      lastWasRoughing = op.type === "roughing" || op.type === "rest";
    }

    return result;
  }

  private _insertProbePoints(ops: SequenceOperation[]): SequenceOperation[] {
    const result: SequenceOperation[] = [];

    for (let i = 0; i < ops.length; i++) {
      result.push(ops[i]);
      if (ops[i].type === "roughing" || ops[i].type === "rest") {
        const next = ops[i + 1];
        if (!next || (next.type !== "roughing" && next.type !== "rest")) {
          result.push({
            id: `probe-${result.length}`,
            type: "probing",
            operation: "verification_probe",
          });
        }
      }
    }

    return result;
  }

  private _countToolChanges(ops: SequenceOperation[]): number {
    let changes = 0;
    let lastTool: string | undefined;

    for (const op of ops) {
      if (op.tool_id && op.tool_id !== lastTool) {
        if (lastTool !== undefined) changes++;
        lastTool = op.tool_id;
      }
    }

    return changes;
  }
}

/** Singleton instance */
export const intelligentSequencingEngine = new IntelligentSequencingEngine();
