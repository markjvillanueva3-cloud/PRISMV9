/**
 * OperationSequencerEngine — CAMK-MS3/U02
 * Optimal operation ordering for multi-operation CNC programs.
 *
 * Models:
 * - Graph-based optimization: operations as nodes, costs as edges
 * - Tool change minimization: group same-tool operations (TSP-inspired greedy)
 * - Thermal relaxation: enforce cooling time between roughing and finishing
 * - Deflection state: rough first → finish with compensation
 * - Fixture/datum awareness: respect setup constraints
 *
 * References:
 * - Halevi & Weill (1995): Principles of Process Planning, Ch. 8
 * - Xu et al. (2011): Computer-Aided Process Planning — A Critical Review
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface Operation {
  id: string;
  type: "roughing" | "semi_finish" | "finishing" | "drilling" | "threading" | "deburr" | "probing" | "chamfer";
  tool_id: string;
  tool_diameter_mm: number;
  algorithm?: string;
  feature_id?: string;
  setup_id?: string;                // which fixture setup
  datum_id?: string;                // datum reference
  estimated_time_sec: number;
  mrr_mm3_per_min?: number;         // material removal rate
  surface_requirement_ra_um?: number;
  depth_mm?: number;
  priority?: number;                // lower = higher priority
  depends_on?: string[];            // operation IDs that must come first
}

interface SequencerInput {
  operations: Operation[];
  tool_change_time_sec?: number;    // default 5
  thermal_relaxation_sec?: number;  // default 60 (between rough and finish)
  optimize_tool_changes?: boolean;  // default true
  optimize_thermal?: boolean;       // default true
  fixture_aware?: boolean;          // default true
}

interface SequencedOperation extends Operation {
  sequence: number;
  wait_before_sec: number;          // thermal relaxation wait
  reason: string;                   // why this position
}

interface SequencerResult {
  sequence: SequencedOperation[];
  total_time_sec: number;
  cutting_time_sec: number;
  tool_change_time_sec: number;
  thermal_wait_time_sec: number;
  tool_changes: number;
  optimization_score: number;       // 0-100, higher = better
  notes: string[];
}

// ── Engine ──────────────────────────────────────────────────────────────────

class OperationSequencerEngine {
  /**
   * Build dependency graph from operations.
   * Returns adjacency list: opId → [must-come-after IDs]
   */
  buildDependencyGraph(ops: Operation[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    for (const op of ops) {
      graph.set(op.id, new Set(op.depends_on ?? []));
    }

    // Implicit dependencies: roughing before semi-finish before finishing
    // for same feature
    const featureOps = new Map<string, Operation[]>();
    for (const op of ops) {
      if (op.feature_id) {
        if (!featureOps.has(op.feature_id)) featureOps.set(op.feature_id, []);
        featureOps.get(op.feature_id)!.push(op);
      }
    }

    const typeOrder = { roughing: 0, semi_finish: 1, drilling: 2, threading: 3, finishing: 4, chamfer: 5, deburr: 6, probing: 7 };
    for (const [, fOps] of featureOps) {
      const sorted = [...fOps].sort((a, b) => (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5));
      for (let i = 1; i < sorted.length; i++) {
        const deps = graph.get(sorted[i].id) ?? new Set();
        deps.add(sorted[i - 1].id);
        graph.set(sorted[i].id, deps);
      }
    }

    return graph;
  }

  /**
   * Topological sort respecting dependencies.
   * Returns ordered operation IDs.
   */
  topologicalSort(ops: Operation[], graph: Map<string, Set<string>>): string[] {
    const inDegree = new Map<string, number>();
    for (const op of ops) inDegree.set(op.id, 0);

    for (const [, deps] of graph) {
      for (const dep of deps) {
        // dep must come before — so the dependent has higher in-degree
      }
    }
    // Count in-degrees
    for (const [id, deps] of graph) {
      inDegree.set(id, deps.size);
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const result: string[] = [];
    const opMap = new Map(ops.map(o => [o.id, o]));

    while (queue.length > 0) {
      // Among ready nodes, prefer by: same tool (minimize changes), then priority
      queue.sort((a, b) => {
        const opA = opMap.get(a)!;
        const opB = opMap.get(b)!;
        // Prefer same tool as last sequenced
        if (result.length > 0) {
          const lastTool = opMap.get(result[result.length - 1])!.tool_id;
          if (opA.tool_id === lastTool && opB.tool_id !== lastTool) return -1;
          if (opB.tool_id === lastTool && opA.tool_id !== lastTool) return 1;
        }
        // Then by priority
        return (opA.priority ?? 50) - (opB.priority ?? 50);
      });

      const id = queue.shift()!;
      result.push(id);

      // Reduce in-degrees of dependents
      for (const [depId, deps] of graph) {
        if (deps.has(id)) {
          deps.delete(id);
          const newDeg = (inDegree.get(depId) ?? 1) - 1;
          inDegree.set(depId, newDeg);
          if (newDeg === 0 && !result.includes(depId)) {
            queue.push(depId);
          }
        }
      }
    }

    return result;
  }

  /**
   * Check if thermal relaxation is needed between two operations.
   */
  needsThermalRelaxation(prev: Operation, next: Operation): boolean {
    // Roughing/semi-finish before finishing on same feature
    if (prev.feature_id && prev.feature_id === next.feature_id) {
      if ((prev.type === "roughing" || prev.type === "semi_finish") && next.type === "finishing") {
        return true;
      }
    }
    // High MRR before precision operation
    if (prev.mrr_mm3_per_min && prev.mrr_mm3_per_min > 50 &&
        next.surface_requirement_ra_um && next.surface_requirement_ra_um < 1.6) {
      return true;
    }
    return false;
  }

  /**
   * Main sequencing algorithm.
   */
  sequence(input: SequencerInput): SequencerResult {
    const {
      operations,
      tool_change_time_sec = 5,
      thermal_relaxation_sec = 60,
      optimize_tool_changes = true,
      optimize_thermal = true,
      fixture_aware = true,
    } = input;

    if (operations.length === 0) {
      return {
        sequence: [], total_time_sec: 0, cutting_time_sec: 0,
        tool_change_time_sec: 0, thermal_wait_time_sec: 0,
        tool_changes: 0, optimization_score: 100, notes: [],
      };
    }

    // Build dependency graph
    const graph = this.buildDependencyGraph(operations);

    // Group by setup if fixture-aware
    let orderedIds: string[];
    if (fixture_aware) {
      const setupGroups = new Map<string, Operation[]>();
      for (const op of operations) {
        const setup = op.setup_id ?? "default";
        if (!setupGroups.has(setup)) setupGroups.set(setup, []);
        setupGroups.get(setup)!.push(op);
      }

      orderedIds = [];
      for (const [, group] of setupGroups) {
        const subGraph = new Map<string, Set<string>>();
        for (const op of group) {
          const deps = graph.get(op.id) ?? new Set();
          // Filter deps to only those in this group
          const groupIds = new Set(group.map(g => g.id));
          subGraph.set(op.id, new Set([...deps].filter(d => groupIds.has(d))));
        }
        const subOrder = this.topologicalSort(group, subGraph);
        orderedIds.push(...subOrder);
      }
    } else {
      orderedIds = this.topologicalSort(operations, graph);
    }

    // Build sequenced operations
    const opMap = new Map(operations.map(o => [o.id, o]));
    const sequence: SequencedOperation[] = [];
    let totalToolChanges = 0;
    let totalThermalWait = 0;
    let prevToolId = "";

    for (let i = 0; i < orderedIds.length; i++) {
      const op = opMap.get(orderedIds[i])!;
      let waitBefore = 0;

      // Tool change check
      if (op.tool_id !== prevToolId && prevToolId !== "") {
        totalToolChanges++;
      }

      // Thermal relaxation check
      if (optimize_thermal && i > 0) {
        const prevOp = opMap.get(orderedIds[i - 1])!;
        if (this.needsThermalRelaxation(prevOp, op)) {
          waitBefore = thermal_relaxation_sec;
          totalThermalWait += waitBefore;
        }
      }

      // Reason for position
      let reason = "";
      if (op.depends_on && op.depends_on.length > 0) {
        reason = `After dependencies: ${op.depends_on.join(", ")}`;
      } else if (op.type === "roughing") {
        reason = "Roughing first for stock removal";
      } else if (op.type === "finishing") {
        reason = "Finishing after roughing/semi-finish";
      } else if (op.type === "probing") {
        reason = "Probing at end for verification";
      } else {
        reason = `Ordered by type priority (${op.type})`;
      }

      sequence.push({
        ...op,
        sequence: i + 1,
        wait_before_sec: waitBefore,
        reason,
      });

      prevToolId = op.tool_id;
    }

    const cuttingTime = operations.reduce((s, o) => s + o.estimated_time_sec, 0);
    const tcTime = totalToolChanges * tool_change_time_sec;
    const totalTime = cuttingTime + tcTime + totalThermalWait;

    // Optimization score: fewer tool changes + thermal compliance = better
    const maxChanges = operations.length - 1;
    const tcScore = maxChanges > 0 ? (1 - totalToolChanges / maxChanges) * 50 : 50;
    const thermalScore = optimize_thermal ? 30 : 0; // bonus for thermal compliance
    const depScore = 20; // base score for respecting dependencies
    const score = Math.min(100, tcScore + thermalScore + depScore);

    const notes: string[] = [];
    if (totalToolChanges > operations.length * 0.5) {
      notes.push("High tool change count — consider tool consolidation");
    }
    if (totalThermalWait > 0) {
      notes.push(`${totalThermalWait}s thermal relaxation scheduled between roughing and finishing`);
    }

    return {
      sequence,
      total_time_sec: totalTime,
      cutting_time_sec: cuttingTime,
      tool_change_time_sec: tcTime,
      thermal_wait_time_sec: totalThermalWait,
      tool_changes: totalToolChanges,
      optimization_score: Math.round(score),
      notes,
    };
  }

  /**
   * Quick check: estimate tool changes for a set of operations.
   */
  quickEstimate(ops: Operation[]): { tool_changes: number; estimated_min: number } {
    const result = this.sequence({ operations: ops });
    return {
      tool_changes: result.tool_changes,
      estimated_min: result.total_time_sec / 60,
    };
  }
}

export const operationSequencerEngine = new OperationSequencerEngine();
export { OperationSequencerEngine };
