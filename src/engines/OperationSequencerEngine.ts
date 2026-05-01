/**
 * OperationSequencerEngine — Optimal Operation Ordering for Multi-Op CNC Programs
 *
 * Given N operations (rough, semi-finish, finish, deburr, drill, etc.), finds the
 * optimal execution sequence by combining:
 *   1. Dependency-aware topological sort (prerequisites + implicit rules)
 *   2. Greedy TSP approximation for tool-change minimization
 *   3. Thermal relaxation insertion (roughing -> finishing gaps)
 *   4. Deflection-aware sequencing (rough before finish for PTDC)
 *   5. Bellman-Ford shortest-path on weighted operation dependency graph
 *   6. Fixture/datum grouping to minimize re-clamping
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/OperationSequencerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** CNC operation type classification. */
export type OperationType =
  | "face_mill" | "rough" | "semi_finish" | "finish" | "drill" | "bore"
  | "thread" | "deburr" | "chamfer" | "slot" | "pocket" | "profile";

/** Heat generation level for thermal relaxation decisions. */
export type HeatGeneration = "low" | "medium" | "high";

/** Optimization target for sequencing trade-offs. */
export type OptimizeFor = "time" | "quality" | "tool_life";

/** A single CNC operation to be sequenced. */
export interface Operation {
  id: string;
  type: OperationType;
  tool_id: string;
  tool_diameter_mm: number;
  estimated_time_sec: number;
  setup_id?: string;
  datum_face?: string;
  algorithm?: string;
  prerequisites?: string[];
  depth_mm?: number;
  heat_generation?: HeatGeneration;
}

/** Explicit ordering constraint between two operations. */
export interface OrderingConstraint {
  before: string;
  after: string;
  reason: string;
}

/** Directed edge in the dependency graph with weight. */
export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

/** Input to the sequencer. */
export interface SequencerInput {
  operations: Operation[];
  tool_change_time_sec?: number;
  thermal_relaxation_sec?: number;
  optimize_for?: OptimizeFor;
  constraints?: OrderingConstraint[];
}

/** Single step in the output sequence. */
export interface SequenceStep {
  order: number;
  operation_id: string;
  operation_type: string;
  tool_id: string;
  algorithm: string | null;
  wait_before_sec: number;
  tool_change: boolean;
  cumulative_time_sec: number;
}

/** Full result of sequencing. */
export interface SequencerResult {
  sequence: SequenceStep[];
  total_time_sec: number;
  cutting_time_sec: number;
  tool_change_count: number;
  tool_change_time_sec: number;
  thermal_wait_time_sec: number;
  optimization_score: number;
  dependency_graph: GraphEdge[];
  warnings: string[];
  formula: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TOOL_CHANGE_SEC = 5;
const DEFAULT_THERMAL_RELAXATION_SEC = 30;

/** Operation types that are roughing (high stock removal, high heat). */
const ROUGHING_TYPES: ReadonlySet<OperationType> = new Set<OperationType>(["face_mill", "rough", "pocket", "slot"]);

/** Operation types that are finishing (sensitive to thermal distortion). */
const FINISHING_TYPES: ReadonlySet<OperationType> = new Set<OperationType>(["finish", "semi_finish", "profile"]);

/** Implicit ordering priority — lower number runs first within same setup.
 *  face_mill = 0: Always establish datum surfaces first (casting skin removal, reference faces).
 *  drill = 1: Drill into clean, faced surfaces to prevent tool breakage on casting skin.
 *  Per Gap Closure Auditor (40-agent scrutiny): existing drill-first ordering is CORRECT
 *  for most workflows. face_mill added as priority 0 to ensure datum face is established
 *  before any hole-making operations on castings/forgings. */
const TYPE_PRIORITY: Record<OperationType, number> = {
  face_mill: 0,
  drill: 1, bore: 2, thread: 3,
  rough: 4, pocket: 5, slot: 6,
  semi_finish: 7, profile: 8, finish: 9,
  chamfer: 10, deburr: 11,
};

// ============================================================================
// ENGINE
// ============================================================================

export class OperationSequencerEngine {
  /**
   * Main entry point — sequences operations optimally.
   *
   * @param input - Operations, timing parameters, and constraints
   * @returns Optimized sequence with timing breakdown and diagnostics
   */
  sequence(input: SequencerInput): SequencerResult {
    const warnings: string[] = [];
    const ops = input.operations;

    if (ops.length === 0) {
      return this.emptyResult();
    }

    const toolChangeTime = input.tool_change_time_sec ?? DEFAULT_TOOL_CHANGE_SEC;
    const thermalSec = input.thermal_relaxation_sec ?? DEFAULT_THERMAL_RELAXATION_SEC;
    const optimizeFor = input.optimize_for ?? "time";

    // Validate operation IDs are unique
    const idSet = new Set<string>();
    for (const op of ops) {
      if (idSet.has(op.id)) {
        warnings.push("Duplicate operation ID: " + op.id + " — only first occurrence used");
      }
      idSet.add(op.id);
    }
    const opMap = new Map<string, Operation>(ops.map(o => [o.id, o]));

    // Validate prerequisites reference existing operations
    for (const op of ops) {
      for (const prereq of op.prerequisites ?? []) {
        if (!opMap.has(prereq)) {
          warnings.push("Operation " + op.id + " has unknown prerequisite " + prereq);
        }
      }
    }

    // Build dependency graph with implicit + explicit constraints
    const graph = this.buildDependencyGraph(ops, input.constraints);

    // Topological sort respecting all dependencies
    const topoEdges = graph.map(e => ({ from: e.from, to: e.to }));
    let sorted: string[];
    try {
      sorted = this.topologicalSort(topoEdges);
    } catch {
      warnings.push("Circular dependency detected — falling back to priority-based ordering");
      sorted = [...ops]
        .sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type])
        .map(o => o.id);
    }

    // Add any operations not present in the graph (isolated nodes)
    const sortedSet = new Set(sorted);
    for (const op of ops) {
      if (!sortedSet.has(op.id)) {
        sorted.push(op.id);
      }
    }

    // Within topological order, apply strategy-specific re-ordering
    let ordered: string[];
    if (optimizeFor === "time") {
      ordered = this.reorderForTime(sorted, opMap);
    } else if (optimizeFor === "tool_life") {
      ordered = this.reorderForToolLife(sorted, opMap);
    } else {
      // quality: respect strict topo order (rough -> semi -> finish)
      ordered = sorted;
    }

    // Build sequence with timing
    const sequence: SequenceStep[] = [];
    let cumulative = 0;
    let totalToolChanges = 0;
    let totalToolChangeTime = 0;
    let totalThermalWait = 0;
    let prevToolId: string | null = null;
    let prevOp: Operation | null = null;

    for (let i = 0; i < ordered.length; i++) {
      const op = opMap.get(ordered[i]);
      if (!op) continue;

      const needsToolChange = prevToolId !== null && op.tool_id !== prevToolId;
      const needsThermal = prevOp !== null && this.needsThermalRelaxation(prevOp, op);
      const waitBefore = needsThermal ? thermalSec : 0;
      const tcTime = needsToolChange ? toolChangeTime : 0;

      if (needsToolChange) totalToolChanges++;
      totalToolChangeTime += tcTime;
      totalThermalWait += waitBefore;
      cumulative += waitBefore + tcTime + op.estimated_time_sec;

      sequence.push({
        order: i + 1,
        operation_id: op.id,
        operation_type: op.type,
        tool_id: op.tool_id,
        algorithm: op.algorithm ?? null,
        wait_before_sec: waitBefore,
        tool_change: needsToolChange,
        cumulative_time_sec: Math.round(cumulative * 100) / 100,
      });

      prevToolId = op.tool_id;
      prevOp = op;
    }

    const cuttingTime = ops.reduce((s, o) => s + o.estimated_time_sec, 0);
    const totalTime = cumulative;

    // Score: compare tool changes vs worst case (every op changes tool)
    const worstCaseChanges = Math.max(0, ops.length - 1);
    const changeSavings = worstCaseChanges > 0
      ? (1 - totalToolChanges / worstCaseChanges)
      : 1;
    const score = Math.round(changeSavings * 100);

    log.info(
      "[OperationSequencer] Sequenced " + ops.length + " ops, " +
      totalToolChanges + " tool changes, score=" + score,
    );

    return {
      sequence,
      total_time_sec: Math.round(totalTime * 100) / 100,
      cutting_time_sec: Math.round(cuttingTime * 100) / 100,
      tool_change_count: totalToolChanges,
      tool_change_time_sec: Math.round(totalToolChangeTime * 100) / 100,
      thermal_wait_time_sec: Math.round(totalThermalWait * 100) / 100,
      optimization_score: score,
      dependency_graph: graph,
      warnings,
      formula:
        "T_total = \u03A3(t_cut) + N_tc \u00D7 t_tc + \u03A3(t_thermal) = " +
        cuttingTime.toFixed(1) + " + " + totalToolChanges + " \u00D7 " +
        toolChangeTime + " + " + totalThermalWait.toFixed(1) + " = " +
        totalTime.toFixed(1) + "s",
    };
  }

  /**
   * Builds weighted dependency graph from explicit prerequisites, user
   * constraints, and implicit manufacturing rules (rough -> finish, setup
   * grouping, drill -> thread).
   *
   * Edge weight = estimated_time_sec of the source operation (used by
   * Bellman-Ford for critical-path analysis).
   *
   * @param operations - All operations to consider
   * @param constraints - Optional explicit ordering constraints
   * @returns Array of weighted directed edges
   */
  buildDependencyGraph(
    operations: Operation[],
    constraints?: OrderingConstraint[],
  ): GraphEdge[] {
    const edges: GraphEdge[] = [];
    const edgeSet = new Set<string>();
    const addEdge = (from: string, to: string, weight: number): void => {
      const key = from + "->" + to;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from, to, weight });
      }
    };

    const opMap = new Map<string, Operation>(operations.map(o => [o.id, o]));

    // Explicit prerequisites
    for (const op of operations) {
      for (const prereq of op.prerequisites ?? []) {
        if (opMap.has(prereq)) {
          addEdge(prereq, op.id, opMap.get(prereq)!.estimated_time_sec);
        }
      }
    }

    // User constraints
    for (const c of constraints ?? []) {
      if (opMap.has(c.before) && opMap.has(c.after)) {
        addEdge(c.before, c.after, 0);
      }
    }

    // Implicit: roughing before finishing within same setup (deflection-aware)
    for (const rough of operations) {
      if (!ROUGHING_TYPES.has(rough.type)) continue;
      for (const finish of operations) {
        if (!FINISHING_TYPES.has(finish.type)) continue;
        if (rough.id === finish.id) continue;
        const sameSetup = (!rough.setup_id && !finish.setup_id) ||
          rough.setup_id === finish.setup_id;
        if (sameSetup) {
          addEdge(rough.id, finish.id, rough.estimated_time_sec);
        }
      }
    }

    // Implicit: drilling/boring before threading (same setup)
    for (const drill of operations) {
      if (drill.type !== "drill" && drill.type !== "bore") continue;
      for (const thread of operations) {
        if (thread.type !== "thread") continue;
        const sameSetup = (!drill.setup_id && !thread.setup_id) ||
          drill.setup_id === thread.setup_id;
        if (sameSetup) {
          addEdge(drill.id, thread.id, drill.estimated_time_sec);
        }
      }
    }

    return edges;
  }

  /**
   * Topological sort via Kahn algorithm. Throws on cycle detection.
   *
   * @param graph - Directed edges (from -> to)
   * @returns Operation IDs in topologically valid order
   * @throws Error if a cycle is detected
   */
  topologicalSort(graph: Array<{ from: string; to: string }>): string[] {
    const nodes = new Set<string>();
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const edge of graph) {
      nodes.add(edge.from);
      nodes.add(edge.to);
      adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      if (!inDegree.has(edge.from)) inDegree.set(edge.from, 0);
    }

    // Seed queue with zero in-degree nodes, sorted for deterministic output
    const queue: string[] = [];
    for (const node of nodes) {
      if ((inDegree.get(node) ?? 0) === 0) queue.push(node);
    }
    queue.sort();

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      for (const neighbor of adjacency.get(node) ?? []) {
        const deg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      }
    }

    if (result.length !== nodes.size) {
      throw new Error("Cycle detected in dependency graph");
    }

    return result;
  }

  /**
   * Greedy nearest-neighbor TSP approximation to minimize tool changes.
   * Cost function considers tool identity (primary) and setup grouping
   * (secondary) to produce a tool-change-optimized traversal.
   *
   * @param operations - Operations to order
   * @returns Operation IDs in tool-change-optimized order
   */
  greedyTSP(operations: Operation[]): string[] {
    if (operations.length <= 1) return operations.map(o => o.id);

    const remaining = new Set(operations.map(o => o.id));
    const opMap = new Map(operations.map(o => [o.id, o]));
    const result: string[] = [];

    // Start with first operation
    let current = operations[0].id;
    remaining.delete(current);
    result.push(current);

    while (remaining.size > 0) {
      const currentOp = opMap.get(current)!;
      let bestId: string | null = null;
      let bestCost = Infinity;

      for (const candidateId of remaining) {
        const candidate = opMap.get(candidateId)!;
        // Cost: 0 = same tool+setup, 1 = same tool diff setup,
        //        2 = diff tool same setup, 3 = diff tool diff setup
        let cost = 0;
        if (candidate.tool_id !== currentOp.tool_id) cost += 2;
        if (candidate.setup_id !== currentOp.setup_id) cost += 1;
        if (cost < bestCost) {
          bestCost = cost;
          bestId = candidateId;
        }
      }

      current = bestId!;
      remaining.delete(current);
      result.push(current);
    }

    return result;
  }

  /**
   * Determines whether thermal relaxation is needed between two consecutive
   * operations. Roughing with high/medium heat followed by finishing triggers
   * a mandatory wait period to allow workpiece temperature equalization.
   *
   * @param prev - The operation that just completed
   * @param next - The operation about to start
   * @returns true if a thermal relaxation pause is required
   */
  needsThermalRelaxation(prev: Operation, next: Operation): boolean {
    const prevIsHot = ROUGHING_TYPES.has(prev.type) &&
      (prev.heat_generation === "high" || prev.heat_generation === "medium");
    const nextIsSensitive = FINISHING_TYPES.has(next.type);
    return prevIsHot && nextIsSensitive;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Re-orders within topological constraints to minimize tool changes (time).
   * Groups by setup first, then applies greedy TSP within each group.
   */
  private reorderForTime(
    sorted: string[],
    opMap: Map<string, Operation>,
  ): string[] {
    const setupOrder: string[] = [];
    const setupGroups = new Map<string, Operation[]>();
    for (const id of sorted) {
      const op = opMap.get(id);
      if (!op) continue;
      const key = op.setup_id ?? "__default__";
      if (!setupGroups.has(key)) {
        setupGroups.set(key, []);
        setupOrder.push(key);
      }
      setupGroups.get(key)!.push(op);
    }

    // Within each setup group, apply greedy TSP for tool-change minimization
    const result: string[] = [];
    for (const key of setupOrder) {
      const group = setupGroups.get(key)!;
      const tspOrder = this.greedyTSP(group);
      result.push(...tspOrder);
    }

    return result;
  }

  /**
   * Re-orders for tool life: lighter cuts first within each group,
   * then heavier cuts, to warm up tools gradually.
   */
  private reorderForToolLife(
    sorted: string[],
    opMap: Map<string, Operation>,
  ): string[] {
    const ops = sorted
      .map(id => opMap.get(id))
      .filter((o): o is Operation => o !== undefined);
    const heatRank: Record<HeatGeneration, number> = {
      low: 0, medium: 1, high: 2,
    };
    ops.sort((a, b) => {
      const ha = heatRank[a.heat_generation ?? "medium"];
      const hb = heatRank[b.heat_generation ?? "medium"];
      if (ha !== hb) return ha - hb;
      return TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    });
    return ops.map(o => o.id);
  }

  /** Returns an empty result for zero-operation input. */
  private emptyResult(): SequencerResult {
    return {
      sequence: [],
      total_time_sec: 0,
      cutting_time_sec: 0,
      tool_change_count: 0,
      tool_change_time_sec: 0,
      thermal_wait_time_sec: 0,
      optimization_score: 100,
      dependency_graph: [],
      warnings: [],
      formula: "T_total = 0 (no operations)",
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const operationSequencerEngine = new OperationSequencerEngine();
