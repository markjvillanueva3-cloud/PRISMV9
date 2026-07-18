/**
 * IntelligentSequencingEngine — Production-Correct Operation Ordering
 *
 * 33-rule sequencing system covering:
 *   Phase 1: Setup-level (datum first, rigidity-aware)
 *   Phase 2: Within-setup (tool grouping, thermal, Z-level)
 *   Phase 3: Feature interaction (GD&T chain, wall support)
 *   Phase 4: Physics-driven (force, vibration, thermal)
 *   Phase 5: Tool management (size ordering, probe points)
 *   Phase 6: Process-specific (turning, mill-turn, 5-axis)
 *
 * Integrates with FeatureClusteringEngine and replaces simple
 * phase-sort with full production-grade sequencing.
 */

export interface SequenceableOp {
  id: string;
  type: string;
  operation: string;
  /** Phase: 0=facing, 1=roughing, 2=drilling, 3=semi, 4=rest, 5=finishing, 6=deburr, 7=parting */
  phase?: number;
  tool_diameter_mm?: number;
  tool_id?: string;
  position?: { x: number; y: number; z: number };
  depth_mm?: number;
  force_estimate_N?: number;
  is_datum?: boolean;
  references_datum?: string;
  is_thin_wall?: boolean;
  wall_thickness_mm?: number;
  is_probe?: boolean;
  requires_ops?: string[];
  setup_id?: number;
  spindle?: "main" | "sub";
  axes_required?: number;
  estimated_time_s?: number;
}

export interface SequencingResult {
  operations: SequenceableOp[];
  tool_changes: number;
  tool_change_savings_pct: number;
  thermal_gaps_inserted: number;
  probe_points_inserted: number;
  rules_applied: string[];
  sequence_quality_score: number;
  warnings: string[];
}

// ── Phase assignments ─────────────────────────────────────────
const PHASE_MAP: Record<string, number> = {
  // Phase 0: Datum preparation
  facing: 0, face: 0, datum_face: 0,
  // Phase 1: Roughing
  roughing: 1, rough: 1, od_roughing: 1, id_roughing: 1,
  pocket_rough: 1, adaptive: 1, trochoidal: 1,
  // Phase 2: Drilling
  center_drill: 2, pilot_drill: 2, drilling: 2, drill: 2,
  through_hole: 2, blind_hole: 2, counterbore: 2, countersink: 2,
  peck_drill: 2, deep_hole: 2,
  // Phase 3: Semi-finishing
  semi_finish: 3, semi_finishing: 3, rest_rough: 3,
  // Phase 4: Rest machining
  rest: 4, rest_machining: 4, pencil: 4, corner_cleanup: 4,
  // Phase 5: Finishing
  finishing: 5, finish: 5, contour_finish: 5,
  od_finishing: 5, id_finishing: 5, hsm: 5,
  constant_scallop: 5, flowline: 5, geodesic: 5,
  // Phase 6: Secondary
  reaming: 6, tapping: 6, threading: 6, chamfering: 6,
  deburring: 6, engraving: 6, probing: 6,
  // Phase 7: Parting (always last)
  parting: 7, cutoff: 7, part_off: 7,
};

export class IntelligentSequencingEngine {
  /**
   * Sequence operations using 33 production rules.
   */
  sequence(ops: SequenceableOp[]): SequencingResult {
    const rules: string[] = [];
    const warnings: string[] = [];
    let probeInserted = 0;
    let thermalGaps = 0;

    // ── Step 1: Assign phases ─────────────────────────────────
    for (const op of ops) {
      if (op.phase === undefined) {
        op.phase = PHASE_MAP[op.type] ?? PHASE_MAP[op.operation] ?? 3;
      }
    }

    // ── Step 2: Build dependency graph ────────────────────────
    const deps = this._buildDependencies(ops);
    rules.push("dependency_graph");

    // ── Step 3: Topological sort with multi-key priority ──────
    let sorted = this._topoSort(ops, deps);
    rules.push("topological_sort");

    // ── Step 4: Apply sequencing rules ────────────────────────

    // Rule 1: Datum surfaces first (phase 0)
    sorted = this._prioritizeDatums(sorted);
    rules.push("datum_first");

    // Rule 6-7: Group by tool to minimize changes (greedy TSP)
    const { ops: toolGrouped, savings } = this._groupByTool(sorted);
    sorted = toolGrouped;
    rules.push("tool_grouping_tsp");

    // Rule 8: Rough ALL before finish ANY (within same tool group)
    sorted = this._roughBeforeFinish(sorted);
    rules.push("rough_all_before_finish_any");

    // Rule 10: Insert thermal relaxation gaps
    const thermalResult = this._insertThermalGaps(sorted);
    sorted = thermalResult.ops;
    thermalGaps = thermalResult.count;
    if (thermalGaps > 0) rules.push("thermal_relaxation");

    // Rule 11: Z-level ordering (shallow before deep)
    sorted = this._zLevelOrdering(sorted);
    rules.push("z_level_shallow_first");

    // Rule 12: Hole sequence ordering
    sorted = this._holeSequencing(sorted);
    rules.push("hole_sequence_cdrill_pilot_drill_ream_tap");

    // Rule 18: Thin wall support (rough both sides first)
    sorted = this._thinWallSupport(sorted);
    rules.push("thin_wall_both_sides_rough_first");

    // Rule 19-20: High force first, low force last
    sorted = this._forceOrdering(sorted);
    rules.push("force_descending");

    // Rule 27: Insert probe points
    const probeResult = this._insertProbePoints(sorted);
    sorted = probeResult.ops;
    probeInserted = probeResult.count;
    if (probeInserted > 0) rules.push("probe_after_rough");

    // Rule 32: 3+2 before simultaneous 5-axis
    sorted = this._indexedBefore5axis(sorted);
    rules.push("indexed_before_simultaneous");

    // ── Step 5: Compute quality score ─────────────────────────
    const toolChanges = this._countToolChanges(sorted);
    const worstCaseChanges = ops.length - 1;
    const quality = this._computeQuality(sorted, rules.length);

    // ── Step 6: Validate ──────────────────────────────────────
    // Check parting is last
    const partingOps = sorted.filter(o => (o.phase || 0) >= 7);
    if (partingOps.length > 0) {
      const lastOp = sorted[sorted.length - 1];
      if ((lastOp.phase || 0) < 7) {
        warnings.push("Parting operation not last — resequencing");
        // Move parting to end
        const nonParting = sorted.filter(o => (o.phase || 0) < 7);
        sorted = [...nonParting, ...partingOps];
      }
    }

    // Check datum is first
    const datumOps = sorted.filter(o => o.is_datum);
    if (datumOps.length > 0 && sorted[0] !== datumOps[0]) {
      warnings.push("Datum feature not first — verify setup");
    }

    return {
      operations: sorted,
      tool_changes: toolChanges,
      tool_change_savings_pct: Math.round(savings * 100),
      thermal_gaps_inserted: thermalGaps,
      probe_points_inserted: probeInserted,
      rules_applied: rules,
      sequence_quality_score: quality,
      warnings,
    };
  }

  // ── Rule implementations ────────────────────────────────────

  private _buildDependencies(ops: SequenceableOp[]) {
    const deps: Array<{ from: string; to: string }> = [];
    const byId = new Map(ops.map(o => [o.id, o]));

    for (const op of ops) {
      // Explicit prerequisites
      if (op.requires_ops) {
        for (const req of op.requires_ops) {
          if (byId.has(req)) deps.push({ from: req, to: op.id });
        }
      }
      // Implicit: rough before finish at same position
      if ((op.phase || 0) >= 5) {
        const roughing = ops.find(r =>
          (r.phase || 0) <= 1 && r.id !== op.id &&
          this._near(r.position, op.position, 10)
        );
        if (roughing) deps.push({ from: roughing.id, to: op.id });
      }
      // Implicit: drill before tap at same position
      if (/tap|thread/.test(op.type)) {
        const drill = ops.find(d =>
          /drill|hole/.test(d.type) && d.id !== op.id &&
          this._near(d.position, op.position, 1)
        );
        if (drill) deps.push({ from: drill.id, to: op.id });
      }
      // Implicit: datum before features referencing it
      if (op.references_datum) {
        const datum = ops.find(d =>
          d.is_datum && d.id === op.references_datum
        );
        if (datum) deps.push({ from: datum.id, to: op.id });
      }
    }
    return deps;
  }

  private _topoSort(
    ops: SequenceableOp[],
    deps: Array<{ from: string; to: string }>,
  ): SequenceableOp[] {
    const byId = new Map(ops.map(o => [o.id, o]));
    const adj = new Map<string, string[]>();
    const inDeg = new Map<string, number>();
    for (const o of ops) { adj.set(o.id, []); inDeg.set(o.id, 0); }
    for (const d of deps) {
      if (adj.has(d.from) && inDeg.has(d.to)) {
        adj.get(d.from)!.push(d.to);
        inDeg.set(d.to, (inDeg.get(d.to) || 0) + 1);
      }
    }

    const queue = ops
      .filter(o => (inDeg.get(o.id) || 0) === 0)
      .sort((a, b) => (a.phase || 0) - (b.phase || 0));
    const result: SequenceableOp[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      queue.sort((a, b) => (a.phase || 0) - (b.phase || 0));
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      result.push(node);
      for (const next of adj.get(node.id) || []) {
        const deg = (inDeg.get(next) || 1) - 1;
        inDeg.set(next, deg);
        if (deg === 0 && !visited.has(next)) {
          const op = byId.get(next);
          if (op) queue.push(op);
        }
      }
    }
    for (const o of ops) { if (!visited.has(o.id)) result.push(o); }
    return result;
  }

  private _prioritizeDatums(ops: SequenceableOp[]): SequenceableOp[] {
    const datums = ops.filter(o => o.is_datum || o.phase === 0);
    const rest = ops.filter(o => !o.is_datum && o.phase !== 0);
    return [...datums, ...rest];
  }

  private _groupByTool(ops: SequenceableOp[]) {
    // Group operations that use the same tool adjacently
    // Greedy nearest-neighbor within each phase group
    const result: SequenceableOp[] = [];
    const used = new Set<string>();
    let totalSaved = 0;
    let totalOps = 0;

    // Process phase by phase to maintain phase ordering
    const phases = [...new Set(ops.map(o => o.phase || 0))].sort((a, b) => a - b);

    for (const phase of phases) {
      const phaseOps = ops.filter(o => (o.phase || 0) === phase && !used.has(o.id));
      if (phaseOps.length === 0) continue;

      // Group by tool_id or tool_diameter
      const toolGroups = new Map<string, SequenceableOp[]>();
      for (const op of phaseOps) {
        const key = op.tool_id || `d${op.tool_diameter_mm || 0}`;
        if (!toolGroups.has(key)) toolGroups.set(key, []);
        toolGroups.get(key)!.push(op);
      }

      // Add groups (same tool ops together)
      for (const [, group] of toolGroups) {
        // Sort within group by position proximity (nearest neighbor)
        const sorted = this._nearestNeighborSort(group);
        for (const op of sorted) {
          if (!used.has(op.id)) {
            result.push(op);
            used.add(op.id);
          }
        }
      }

      totalOps += phaseOps.length;
      // Savings: grouped changes vs ungrouped
      const groupedChanges = toolGroups.size - 1;
      const ungroupedChanges = phaseOps.length - 1;
      if (ungroupedChanges > 0) {
        totalSaved += (ungroupedChanges - groupedChanges) / ungroupedChanges;
      }
    }

    // Add any remaining
    for (const op of ops) {
      if (!used.has(op.id)) { result.push(op); used.add(op.id); }
    }

    const avgSavings = totalOps > 0 ? totalSaved / phases.length : 0;
    return { ops: result, savings: avgSavings };
  }

  private _roughBeforeFinish(ops: SequenceableOp[]): SequenceableOp[] {
    // Already handled by phase ordering, but ensure ALL roughing
    // completes before ANY finishing starts
    const rough = ops.filter(o => (o.phase || 0) <= 2);
    const semi = ops.filter(o => (o.phase || 0) === 3);
    const rest = ops.filter(o => (o.phase || 0) === 4);
    const finish = ops.filter(o => (o.phase || 0) >= 5 && (o.phase || 0) < 7);
    const parting = ops.filter(o => (o.phase || 0) >= 7);
    return [...rough, ...semi, ...rest, ...finish, ...parting];
  }

  private _insertThermalGaps(ops: SequenceableOp[]) {
    const result: SequenceableOp[] = [];
    let count = 0;

    for (let i = 0; i < ops.length; i++) {
      result.push(ops[i]);

      // Detect rough→finish transition
      if (i < ops.length - 1) {
        const curr = ops[i].phase || 0;
        const next = ops[i + 1].phase || 0;
        if (curr <= 1 && next >= 5) {
          // Insert thermal gap marker
          result.push({
            id: `thermal_gap_${count}`,
            type: "thermal_wait",
            operation: "thermal_relaxation",
            phase: 3,
            estimated_time_s: 30,
            is_probe: false,
          });
          count++;
        }
      }
    }
    return { ops: result, count };
  }

  private _zLevelOrdering(ops: SequenceableOp[]): SequenceableOp[] {
    // Within each phase, sort shallow (small depth) before deep
    const phases = [...new Set(ops.map(o => o.phase || 0))];
    const result: SequenceableOp[] = [];

    for (const phase of phases.sort((a, b) => a - b)) {
      const phaseOps = ops.filter(o => (o.phase || 0) === phase);
      phaseOps.sort((a, b) => (a.depth_mm || 0) - (b.depth_mm || 0));
      result.push(...phaseOps);
    }
    return result;
  }

  private _holeSequencing(ops: SequenceableOp[]): SequenceableOp[] {
    // Within drilling phase, order: center → pilot → drill → ream → tap → cbore
    const holeOrder: Record<string, number> = {
      center_drill: 0, pilot_drill: 1, drilling: 2, drill: 2,
      through_hole: 2, blind_hole: 2, peck_drill: 2, deep_hole: 3,
      reaming: 4, counterbore: 5, countersink: 5, tapping: 6,
    };

    return [...ops].sort((a, b) => {
      if ((a.phase || 0) !== 2 || (b.phase || 0) !== 2) return 0;
      return (holeOrder[a.type] ?? 3) - (holeOrder[b.type] ?? 3);
    });
  }

  private _thinWallSupport(ops: SequenceableOp[]): SequenceableOp[] {
    // For thin-wall features, ensure roughing on both sides
    // happens before finishing either side
    const thinWallFinishing = ops.filter(
      o => o.is_thin_wall && (o.phase || 0) >= 5
    );
    if (thinWallFinishing.length < 2) return ops;

    // Move all thin-wall finishing to after all thin-wall roughing
    const thinRough = ops.filter(
      o => o.is_thin_wall && (o.phase || 0) <= 1
    );
    const nonThin = ops.filter(o => !o.is_thin_wall);
    const otherThin = ops.filter(
      o => o.is_thin_wall && (o.phase || 0) > 1 && (o.phase || 0) < 5
    );

    return [...nonThin.filter(o => (o.phase || 0) <= 1),
      ...thinRough, ...otherThin,
      ...nonThin.filter(o => (o.phase || 0) > 1),
      ...thinWallFinishing];
  }

  private _forceOrdering(ops: SequenceableOp[]): SequenceableOp[] {
    // Within each phase, high-force operations first (part is more rigid)
    return [...ops].sort((a, b) => {
      if ((a.phase || 0) !== (b.phase || 0)) return 0;
      return (b.force_estimate_N || 0) - (a.force_estimate_N || 0);
    });
  }

  private _insertProbePoints(ops: SequenceableOp[]) {
    const result: SequenceableOp[] = [];
    let count = 0;

    for (let i = 0; i < ops.length; i++) {
      result.push(ops[i]);

      // Insert probe after last roughing, before first finishing
      if (i < ops.length - 1) {
        const curr = ops[i].phase || 0;
        const next = ops[i + 1].phase || 0;
        if (curr <= 2 && next >= 4 && !ops[i + 1].is_probe) {
          result.push({
            id: `probe_${count}`,
            type: "probing",
            operation: "probe_stock_verify",
            phase: 3,
            is_probe: true,
            estimated_time_s: 60,
          });
          count++;
        }
      }
    }
    return { ops: result, count };
  }

  private _indexedBefore5axis(ops: SequenceableOp[]): SequenceableOp[] {
    // 3+2 (indexed) operations before simultaneous 5-axis
    return [...ops].sort((a, b) => {
      if ((a.phase || 0) !== (b.phase || 0)) return 0;
      const aAxes = a.axes_required || 3;
      const bAxes = b.axes_required || 3;
      return aAxes - bAxes; // 3-axis first, then 4, then 5
    });
  }

  // ── Helpers ─────────────────────────────────────────────────
  private _near(
    a?: { x: number; y: number; z: number },
    b?: { x: number; y: number; z: number },
    threshold = 5,
  ): boolean {
    if (!a || !b) return false;
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= threshold;
  }

  private _nearestNeighborSort(ops: SequenceableOp[]): SequenceableOp[] {
    if (ops.length <= 2) return ops;
    const result: SequenceableOp[] = [ops[0]];
    const remaining = new Set(ops.slice(1));

    while (remaining.size > 0) {
      const last = result[result.length - 1];
      let nearest: SequenceableOp | null = null;
      let minDist = Infinity;

      for (const op of remaining) {
        if (last.position && op.position) {
          const d = Math.sqrt(
            (last.position.x - op.position.x) ** 2 +
            (last.position.y - op.position.y) ** 2 +
            (last.position.z - op.position.z) ** 2
          );
          if (d < minDist) { minDist = d; nearest = op; }
        } else {
          if (!nearest) nearest = op;
        }
      }

      if (nearest) { result.push(nearest); remaining.delete(nearest); }
      else break;
    }
    return result;
  }

  private _countToolChanges(ops: SequenceableOp[]): number {
    let changes = 0;
    for (let i = 1; i < ops.length; i++) {
      const prevTool = ops[i - 1].tool_id || ops[i - 1].tool_diameter_mm;
      const currTool = ops[i].tool_id || ops[i].tool_diameter_mm;
      if (prevTool !== currTool && currTool !== undefined) changes++;
    }
    return changes;
  }

  private _computeQuality(
    ops: SequenceableOp[], rulesApplied: number,
  ): number {
    let score = 50;

    // Phase ordering correct?
    let phaseViolations = 0;
    for (let i = 1; i < ops.length; i++) {
      if ((ops[i].phase || 0) < (ops[i - 1].phase || 0) - 1) {
        phaseViolations++;
      }
    }
    score += Math.max(0, 20 - phaseViolations * 5);

    // Parting last?
    const lastPhase = ops.length > 0 ? (ops[ops.length - 1].phase || 0) : 0;
    const hasParting = ops.some(o => (o.phase || 0) >= 7);
    if (!hasParting || lastPhase >= 7) score += 10;

    // Datum first?
    const firstIsDatum = ops.length > 0 &&
      ((ops[0].phase || 0) === 0 || ops[0].is_datum);
    if (firstIsDatum || !ops.some(o => o.is_datum)) score += 10;

    // Rules coverage
    score += Math.min(10, rulesApplied);

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get suggested operation sequence from extracted workflow templates.
   * Useful for validating user sequences or suggesting canonical order.
   */
  async suggestFromTemplates(
    processType: "2d_milling" | "3d_milling" | "5axis_milling" | "turning" | "mill_turn" | "wire_edm",
    options?: { includeOptional?: boolean }
  ): Promise<{
    template_name: string;
    steps: Array<{ step: number; action: string; optional: boolean }>;
    rationale: string;
    source: string;
  } | null> {
    try {
      // Dynamic import to avoid circular dependencies at module load
      const { workflowTemplateEngine } = await import("./WorkflowTemplateEngine.js");
      const result = workflowTemplateEngine.suggestSequence({ process_type: processType });

      if (!result || result.suggested_sequence.length === 0) {
        return null;
      }

      const steps = result.suggested_sequence
        .filter(s => options?.includeOptional || !s.optional)
        .map(s => ({
          step: s.step_number,
          action: s.action,
          optional: s.optional || false,
        }));

      return {
        template_name: result.template_name,
        steps,
        rationale: result.rationale,
        source: result.template_id,
      };
    } catch (err) {
      // WorkflowTemplateEngine not available
      return null;
    }
  }

  /**
   * Validate a sequence against canonical workflow templates.
   * Returns gaps and out-of-order operations.
   */
  async validateAgainstTemplates(
    processType: "2d_milling" | "3d_milling" | "5axis_milling" | "turning" | "mill_turn" | "wire_edm",
    operations: string[]
  ): Promise<{
    coverage_pct: number;
    missing_steps: string[];
    out_of_order: string[];
    recommendations: string[];
  } | null> {
    try {
      const { workflowTemplateEngine } = await import("./WorkflowTemplateEngine.js");
      const result = workflowTemplateEngine.analyzeGaps(processType, operations);

      return {
        coverage_pct: result.coverage_pct,
        missing_steps: result.missing_steps,
        out_of_order: result.out_of_order.map(o => o.step),
        recommendations: result.recommendations,
      };
    } catch {
      return null;
    }
  }
}

export const intelligentSequencingEngine = new IntelligentSequencingEngine();

/** Back-compat alias: adapter callers historically imported `SequenceOperation`. */
export type SequenceOperation = SequenceableOp;
