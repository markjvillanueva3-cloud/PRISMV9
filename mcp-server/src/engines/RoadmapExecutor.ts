/**
 * PRISM RoadmapExecutor — Parallel Execution Protocol Engine
 *
 * Reads a RoadmapEnvelope, builds a dependency DAG, identifies units
 * that can run in parallel (all dependencies met), and produces batched
 * execution plans. Integrates with:
 *   - pre-roadmap-execute hook (validation)
 *   - post-roadmap-unit hook (position update, indexing, gate check)
 *   - AgentExecutor / SwarmExecutor for actual dispatch
 *
 * Pure logic engine — file I/O is handled by callers (dispatchers, commands).
 *
 * @module engines/RoadmapExecutor
 */

import { log } from "../utils/Logger.js";
import {
  type RoadmapEnvelope,
  type RoadmapPhase,
  type RoadmapUnit,
  type RoadmapGate,
} from "../schemas/roadmapSchema.js";
import {
  validatePreExecution,
  type PositionTracker as PrePositionTracker,
  type PreExecuteResult,
} from "../hooks/pre-roadmap-execute.js";
import {
  processUnitCompletion,
  type PositionTracker,
  type UnitCompletionResult,
  type PostUnitResult,
} from "../hooks/post-roadmap-unit.js";

// ============================================================================
// TYPES
// ============================================================================

/** A node in the dependency DAG. */
export interface DAGNode {
  unitId: string;
  unit: RoadmapUnit;
  phaseId: string;
  /** Unit IDs that must complete before this one. */
  dependsOn: string[];
  /** Unit IDs that depend on this one completing. */
  dependedBy: string[];
  /** Topological depth (0 = no dependencies). */
  depth: number;
}

/** Full dependency DAG for a roadmap. */
export interface DependencyDAG {
  nodes: Map<string, DAGNode>;
  /** Execution layers — each layer can run in parallel. */
  layers: string[][];
  /** Total number of units. */
  totalUnits: number;
  /** True if the DAG has circular dependencies. */
  hasCycles: boolean;
  /** Cycle details if any. */
  cycleInfo?: string;
}

/** A batch of units that can run simultaneously. */
export interface ExecutionBatch {
  batchId: number;
  /** Units in this batch — all dependencies satisfied. */
  units: RoadmapUnit[];
  /** Whether this batch can run in parallel (>1 unit). */
  parallel: boolean;
  /** Phase this batch belongs to. */
  phaseId: string;
  /** Estimated total tokens for this batch. */
  estimatedTokens: number;
}

/** Plan for executing a phase with parallel batching. */
export interface PhaseExecutionPlan {
  phaseId: string;
  phaseTitle: string;
  batches: ExecutionBatch[];
  totalUnits: number;
  parallelBatches: number;
  sequentialBatches: number;
  estimatedTokens: number;
  gate: RoadmapGate;
}

/** Full roadmap execution plan. */
export interface RoadmapExecutionPlan {
  roadmapId: string;
  phases: PhaseExecutionPlan[];
  totalUnits: number;
  totalBatches: number;
  parallelBatches: number;
  maxParallelWidth: number;
  dag: DependencyDAG;
  estimatedTokens: number;
}

/** Result of executing a batch. */
export interface BatchResult {
  batchId: number;
  completed: string[];
  failed: string[];
  skipped: string[];
  buildPassed: boolean;
  testsPassed: boolean;
  duration_ms: number;
}

/** Result of a gate check. */
export interface GateResult {
  phaseId: string;
  passed: boolean;
  checks: GateCheck[];
  omegaScore: number;
}

export interface GateCheck {
  name: string;
  passed: boolean;
  detail: string;
}

// ============================================================================
// DAG CONSTRUCTION
// ============================================================================

/**
 * Build a dependency DAG from a roadmap envelope.
 * Detects cycles and computes topological layers for parallel execution.
 */
export function buildDependencyDAG(roadmap: RoadmapEnvelope): DependencyDAG {
  const nodes = new Map<string, DAGNode>();

  // Phase 1: Create all nodes
  for (const phase of roadmap.phases) {
    for (const unit of phase.units) {
      nodes.set(unit.id, {
        unitId: unit.id,
        unit,
        phaseId: phase.id,
        dependsOn: [...(unit.dependencies || [])],
        dependedBy: [],
        depth: 0,
      });
    }
  }

  // Phase 2: Build reverse edges (dependedBy)
  for (const [, node] of nodes) {
    for (const depId of node.dependsOn) {
      const depNode = nodes.get(depId);
      if (depNode) {
        depNode.dependedBy.push(node.unitId);
      } else {
        log.warn(
          `[RoadmapExecutor] Unit ${node.unitId} depends on unknown unit ${depId}`
        );
      }
    }
  }

  // Phase 3: Detect cycles using Kahn's algorithm + compute layers
  const { layers, hasCycles, cycleInfo } = topologicalSort(nodes);

  // Phase 4: Assign depths from layers
  for (let i = 0; i < layers.length; i++) {
    for (const unitId of layers[i]) {
      const node = nodes.get(unitId);
      if (node) node.depth = i;
    }
  }

  return {
    nodes,
    layers,
    totalUnits: nodes.size,
    hasCycles,
    cycleInfo,
  };
}

/**
 * Kahn's algorithm for topological sorting.
 * Returns execution layers where each layer's units can run in parallel.
 */
function topologicalSort(
  nodes: Map<string, DAGNode>
): { layers: string[][]; hasCycles: boolean; cycleInfo?: string } {
  // Compute in-degree for each node
  const inDegree = new Map<string, number>();
  for (const [id, node] of nodes) {
    inDegree.set(id, node.dependsOn.filter((d) => nodes.has(d)).length);
  }

  const layers: string[][] = [];
  const processed = new Set<string>();

  // Process layers until all nodes processed or cycle detected
  let iterations = 0;
  const maxIterations = nodes.size + 1;

  while (processed.size < nodes.size && iterations < maxIterations) {
    iterations++;

    // Find all nodes with in-degree 0 (ready to execute)
    const layer: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0 && !processed.has(id)) {
        layer.push(id);
      }
    }

    if (layer.length === 0) {
      // Cycle detected — remaining nodes are in the cycle
      const remaining = Array.from(nodes.keys()).filter(
        (id) => !processed.has(id)
      );
      return {
        layers,
        hasCycles: true,
        cycleInfo: `Circular dependency among units: ${remaining.join(", ")}`,
      };
    }

    // Process this layer
    for (const id of layer) {
      processed.add(id);
      // Reduce in-degree of dependents
      const node = nodes.get(id);
      if (node) {
        for (const depById of node.dependedBy) {
          const current = inDegree.get(depById) || 0;
          inDegree.set(depById, Math.max(0, current - 1));
        }
      }
    }

    layers.push(layer);
  }

  return { layers, hasCycles: false };
}

// ============================================================================
// READY UNIT DETECTION
// ============================================================================

/**
 * Identify units within a phase (or entire roadmap) whose dependencies
 * are all satisfied by the set of completed unit IDs.
 *
 * This is the core function that drives parallel execution.
 */
export function getReadyUnits(
  units: RoadmapUnit[],
  completedIds: Set<string>
): RoadmapUnit[] {
  return units.filter((unit) => {
    // Already completed? Skip.
    if (completedIds.has(unit.id)) return false;

    // All dependencies met?
    const deps = unit.dependencies || [];
    return deps.every((depId) => completedIds.has(depId));
  });
}

/**
 * Get ready units within a specific phase.
 */
export function getReadyUnitsInPhase(
  phase: RoadmapPhase,
  completedIds: Set<string>
): RoadmapUnit[] {
  return getReadyUnits(phase.units, completedIds);
}

/**
 * Get ready units across the entire roadmap.
 * Respects phase ordering — only returns units from the current or
 * unlocked phases (all prior phase gates must be passed).
 */
export function getReadyUnitsGlobal(
  roadmap: RoadmapEnvelope,
  completedIds: Set<string>,
  passedGates: Set<string>
): RoadmapUnit[] {
  const ready: RoadmapUnit[] = [];

  for (const phase of roadmap.phases) {
    // Check if all prior phases have passed their gates
    const phaseIdx = roadmap.phases.indexOf(phase);
    const priorPhasesPassed = roadmap.phases
      .slice(0, phaseIdx)
      .every((p) => {
        const allUnitsComplete = p.units.every((u) =>
          completedIds.has(u.id)
        );
        return allUnitsComplete || passedGates.has(p.id);
      });

    if (!priorPhasesPassed) break;

    const phaseReady = getReadyUnitsInPhase(phase, completedIds);
    ready.push(...phaseReady);
  }

  return ready;
}

// ============================================================================
// EXECUTION PLAN GENERATION
// ============================================================================

/**
 * Generate a batched execution plan for a single phase.
 * Groups ready units into parallel batches.
 */
export function planPhaseExecution(
  phase: RoadmapPhase,
  completedIds: Set<string>
): PhaseExecutionPlan {
  const batches: ExecutionBatch[] = [];
  const localCompleted = new Set(completedIds);
  let batchId = 0;

  // Iteratively find ready units until all phase units are planned
  const phaseUnitIds = new Set(phase.units.map((u) => u.id));
  let safety = 0;
  const maxSafety = phase.units.length + 1;

  while (safety < maxSafety) {
    safety++;

    const ready = getReadyUnitsInPhase(phase, localCompleted);
    // Filter to only unplanned units in this phase
    const unplanned = ready.filter(
      (u) => phaseUnitIds.has(u.id) && !localCompleted.has(u.id)
    );

    if (unplanned.length === 0) break;

    batchId++;
    batches.push({
      batchId,
      units: unplanned,
      parallel: unplanned.length > 1,
      phaseId: phase.id,
      estimatedTokens: unplanned.reduce(
        (sum, u) => sum + (u.estimated_tokens || 500),
        0
      ),
    });

    // Mark as "planned" for next iteration
    for (const u of unplanned) {
      localCompleted.add(u.id);
    }
  }

  const parallelBatches = batches.filter((b) => b.parallel).length;

  return {
    phaseId: phase.id,
    phaseTitle: phase.title,
    batches,
    totalUnits: phase.units.length,
    parallelBatches,
    sequentialBatches: batches.length - parallelBatches,
    estimatedTokens: batches.reduce((sum, b) => sum + b.estimatedTokens, 0),
    gate: phase.gate,
  };
}

/**
 * Generate a full execution plan for an entire roadmap.
 */
export function planRoadmapExecution(
  roadmap: RoadmapEnvelope,
  completedIds: Set<string> = new Set()
): RoadmapExecutionPlan {
  const dag = buildDependencyDAG(roadmap);

  if (dag.hasCycles) {
    log.error(`[RoadmapExecutor] DAG has cycles: ${dag.cycleInfo}`);
  }

  const phases: PhaseExecutionPlan[] = [];
  const currentCompleted = new Set(completedIds);

  for (const phase of roadmap.phases) {
    const phasePlan = planPhaseExecution(phase, currentCompleted);
    phases.push(phasePlan);

    // Accumulate completed units for next phase
    for (const batch of phasePlan.batches) {
      for (const unit of batch.units) {
        currentCompleted.add(unit.id);
      }
    }
  }

  const totalBatches = phases.reduce((sum, p) => sum + p.batches.length, 0);
  const parallelBatches = phases.reduce(
    (sum, p) => sum + p.parallelBatches,
    0
  );
  const maxParallelWidth = Math.max(
    0,
    ...phases.flatMap((p) => p.batches.map((b) => b.units.length))
  );

  return {
    roadmapId: roadmap.id,
    phases,
    totalUnits: roadmap.total_units,
    totalBatches,
    parallelBatches,
    maxParallelWidth,
    dag,
    estimatedTokens: phases.reduce((sum, p) => sum + p.estimatedTokens, 0),
  };
}

// ============================================================================
// POSITION MANAGEMENT
// ============================================================================

/**
 * Create an initial position tracker for a roadmap.
 */
export function createInitialPosition(
  roadmap: RoadmapEnvelope
): PositionTracker {
  const firstPhase = roadmap.phases[0];
  const firstUnit = firstPhase?.units
    .slice()
    .sort((a, b) => a.sequence - b.sequence)[0];

  return {
    roadmap_id: roadmap.id,
    current_unit: firstUnit?.id || null,
    current_phase: firstPhase?.id || "P1",
    units_completed: 0,
    total_units: roadmap.total_units,
    percent_complete: 0,
    last_completed_unit: null,
    status: "IN_PROGRESS",
    history: [],
  };
}

/**
 * Get completed unit IDs from a position tracker.
 */
export function getCompletedIds(position: PositionTracker): Set<string> {
  return new Set(position.history.map((h) => h.unit_id));
}

/**
 * Advance position after a batch of units complete.
 * Returns the updated position tracker.
 */
export function advancePosition(
  position: PositionTracker,
  completedUnits: Array<{ unitId: string; buildPassed: boolean }>,
  roadmap: RoadmapEnvelope
): PositionTracker {
  let updated = { ...position };
  const now = new Date().toISOString();

  for (const { unitId, buildPassed } of completedUnits) {
    updated = {
      ...updated,
      last_completed_unit: unitId,
      units_completed: updated.units_completed + 1,
      history: [
        ...updated.history,
        { unit_id: unitId, completed_at: now, build_status: buildPassed },
      ],
    };
  }

  // Recompute percent
  updated.percent_complete =
    roadmap.total_units > 0
      ? Math.round(
          (updated.units_completed / roadmap.total_units) * 10000
        ) / 100
      : 100;

  // Find next ready unit
  const completedIds = getCompletedIds(updated);
  const allUnits = roadmap.phases.flatMap((p) => p.units);
  const ready = getReadyUnits(allUnits, completedIds);

  if (ready.length > 0) {
    updated.current_unit = ready[0].id;
    updated.current_phase = ready[0].phase;
    updated.status = "IN_PROGRESS";
  } else if (updated.units_completed >= roadmap.total_units) {
    updated.current_unit = null;
    updated.status = "COMPLETE";
  }

  return updated;
}

// ============================================================================
// VALIDATION & GATE CHECKS
// ============================================================================

/**
 * Validate a unit is ready to execute using the pre-roadmap-execute hook.
 */
export function validateUnit(
  unit: RoadmapUnit,
  position: PositionTracker,
  roadmap: RoadmapEnvelope
): PreExecuteResult {
  // Adapt PositionTracker to PrePositionTracker format
  const prePosition: PrePositionTracker = {
    roadmap_id: position.roadmap_id,
    current_unit: position.current_unit || "",
    last_completed_unit: position.last_completed_unit,
    units_completed: position.units_completed,
    total_units: position.total_units,
    percent_complete: position.percent_complete,
    status: position.status as "IN_PROGRESS" | "GATE_PENDING" | "COMPLETE" | "BLOCKED",
    history: position.history,
  };

  return validatePreExecution(unit, prePosition, roadmap);
}

/**
 * Validate all units in a batch before execution.
 * Returns units that passed validation and those that were blocked.
 */
export function validateBatch(
  units: RoadmapUnit[],
  position: PositionTracker,
  roadmap: RoadmapEnvelope
): { valid: RoadmapUnit[]; blocked: Array<{ unit: RoadmapUnit; blockers: string[] }> } {
  const valid: RoadmapUnit[] = [];
  const blocked: Array<{ unit: RoadmapUnit; blockers: string[] }> = [];

  for (const unit of units) {
    const result = validateUnit(unit, position, roadmap);
    if (result.proceed) {
      valid.push(unit);
    } else {
      blocked.push({ unit, blockers: result.blockers });
    }
  }

  return { valid, blocked };
}

/**
 * Check a phase gate.
 * Verifies: all units complete, omega threshold, build/test pass, anti-regression.
 */
export function checkPhaseGate(
  phase: RoadmapPhase,
  completedIds: Set<string>,
  metrics: {
    buildPassed: boolean;
    testsPassed: boolean;
    testCount: number;
    baselineTestCount: number;
    omegaScore: number;
  }
): GateResult {
  const gate = phase.gate;
  const checks: GateCheck[] = [];

  // Check all units complete
  const allComplete = phase.units.every((u) => completedIds.has(u.id));
  checks.push({
    name: "all_units_complete",
    passed: allComplete,
    detail: allComplete
      ? `All ${phase.units.length} units complete`
      : `${phase.units.filter((u) => completedIds.has(u.id)).length}/${phase.units.length} complete`,
  });

  // Build check
  if (gate.build_required) {
    checks.push({
      name: "build_passes",
      passed: metrics.buildPassed,
      detail: metrics.buildPassed ? "Build passed" : "Build FAILED",
    });
  }

  // Test check
  if (gate.test_required) {
    checks.push({
      name: "tests_pass",
      passed: metrics.testsPassed,
      detail: metrics.testsPassed
        ? `Tests passed (${metrics.testCount})`
        : "Tests FAILED",
    });
  }

  // Anti-regression check
  if (gate.anti_regression) {
    const noRegression = metrics.testCount >= metrics.baselineTestCount;
    checks.push({
      name: "anti_regression",
      passed: noRegression,
      detail: noRegression
        ? `Test count ${metrics.testCount} >= baseline ${metrics.baselineTestCount}`
        : `REGRESSION: ${metrics.testCount} < baseline ${metrics.baselineTestCount}`,
    });
  }

  // Omega floor check
  const omegaPassed = metrics.omegaScore >= gate.omega_floor;
  checks.push({
    name: "omega_floor",
    passed: omegaPassed,
    detail: `Omega ${metrics.omegaScore.toFixed(2)} ${omegaPassed ? ">=" : "<"} floor ${gate.omega_floor}`,
  });

  // Safety floor check
  const safetyPassed = metrics.omegaScore >= gate.safety_floor;
  checks.push({
    name: "safety_floor",
    passed: safetyPassed,
    detail: `Score ${metrics.omegaScore.toFixed(2)} ${safetyPassed ? ">=" : "<"} safety floor ${gate.safety_floor}`,
  });

  const allPassed = checks.every((c) => c.passed);

  return {
    phaseId: phase.id,
    passed: allPassed,
    checks,
    omegaScore: metrics.omegaScore,
  };
}

// ============================================================================
// EXECUTION SUMMARY
// ============================================================================

/**
 * Generate a summary of the execution plan for display.
 */
export function summarizePlan(plan: RoadmapExecutionPlan): string {
  const lines: string[] = [];

  lines.push(`ROADMAP EXECUTION PLAN: ${plan.roadmapId}`);
  lines.push(`Total: ${plan.totalUnits} units in ${plan.phases.length} phases`);
  lines.push(
    `Batches: ${plan.totalBatches} (${plan.parallelBatches} parallel, ${plan.totalBatches - plan.parallelBatches} sequential)`
  );
  lines.push(`Max parallel width: ${plan.maxParallelWidth}`);
  lines.push(`Estimated tokens: ${plan.estimatedTokens.toLocaleString()}`);

  if (plan.dag.hasCycles) {
    lines.push(`WARNING: Dependency cycle detected — ${plan.dag.cycleInfo}`);
  }

  lines.push("");

  for (const phase of plan.phases) {
    lines.push(`--- ${phase.phaseId}: ${phase.phaseTitle} ---`);
    lines.push(
      `  Units: ${phase.totalUnits} | Batches: ${phase.batches.length} (${phase.parallelBatches} parallel)`
    );

    for (const batch of phase.batches) {
      const mode = batch.parallel ? "PARALLEL" : "SEQUENTIAL";
      const unitList = batch.units.map((u) => u.id).join(", ");
      lines.push(`  Batch ${batch.batchId} [${mode}]: ${unitList}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate the next-batch instruction for the continue-roadmap command.
 * This is the primary integration point for Claude Code.
 */
export function getNextBatch(
  roadmap: RoadmapEnvelope,
  position: PositionTracker
): {
  batch: ExecutionBatch | null;
  gatePending: boolean;
  gatePhaseId: string | null;
  complete: boolean;
  message: string;
} {
  const completedIds = getCompletedIds(position);

  // Check if any phase gate is pending
  for (const phase of roadmap.phases) {
    const phaseComplete = phase.units.every((u) => completedIds.has(u.id));
    if (phaseComplete) {
      // Check if gate was already passed (simple heuristic: next phase has units started)
      const phaseIdx = roadmap.phases.indexOf(phase);
      const nextPhase = roadmap.phases[phaseIdx + 1];
      if (nextPhase) {
        const nextStarted = nextPhase.units.some((u) =>
          completedIds.has(u.id)
        );
        if (!nextStarted && phaseIdx < roadmap.phases.length - 1) {
          // Check if there are any remaining units in later phases
          const hasRemaining = roadmap.phases
            .slice(phaseIdx + 1)
            .some((p) => p.units.some((u) => !completedIds.has(u.id)));
          if (hasRemaining) {
            return {
              batch: null,
              gatePending: true,
              gatePhaseId: phase.id,
              complete: false,
              message: `Phase gate pending for ${phase.id}: ${phase.title}. Run gate checks before continuing.`,
            };
          }
        }
      }
    }
  }

  // Find ready units
  const allUnits = roadmap.phases.flatMap((p) => p.units);
  const ready = getReadyUnits(allUnits, completedIds);

  if (ready.length === 0) {
    const allDone = completedIds.size >= roadmap.total_units;
    return {
      batch: null,
      gatePending: false,
      gatePhaseId: null,
      complete: allDone,
      message: allDone
        ? "Roadmap execution COMPLETE."
        : `No ready units. ${completedIds.size}/${roadmap.total_units} complete. Check for blockers.`,
    };
  }

  const batch: ExecutionBatch = {
    batchId: position.history.length + 1,
    units: ready,
    parallel: ready.length > 1,
    phaseId: ready[0].phase,
    estimatedTokens: ready.reduce(
      (sum, u) => sum + (u.estimated_tokens || 500),
      0
    ),
  };

  const mode = batch.parallel
    ? `PARALLEL (${ready.length} units — use Task with isolation: "worktree")`
    : `SEQUENTIAL (1 unit)`;

  return {
    batch,
    gatePending: false,
    gatePhaseId: null,
    complete: false,
    message: `Next batch: ${mode}\nUnits: ${ready.map((u) => `${u.id} (${u.title})`).join(", ")}`,
  };
}

// ============================================================================
// SINGLETON & CONVENIENCE
// ============================================================================

export class RoadmapExecutorEngine {
  /** Build the full dependency DAG. */
  buildDAG(roadmap: RoadmapEnvelope): DependencyDAG {
    return buildDependencyDAG(roadmap);
  }

  /** Plan execution with parallel batching. */
  plan(
    roadmap: RoadmapEnvelope,
    completedIds?: Set<string>
  ): RoadmapExecutionPlan {
    return planRoadmapExecution(roadmap, completedIds);
  }

  /** Get the next batch of ready units. */
  nextBatch(
    roadmap: RoadmapEnvelope,
    position: PositionTracker
  ): ReturnType<typeof getNextBatch> {
    return getNextBatch(roadmap, position);
  }

  /** Get ready units in a phase. */
  readyUnits(
    phase: RoadmapPhase,
    completedIds: Set<string>
  ): RoadmapUnit[] {
    return getReadyUnitsInPhase(phase, completedIds);
  }

  /** Validate a batch before execution. */
  validate(
    units: RoadmapUnit[],
    position: PositionTracker,
    roadmap: RoadmapEnvelope
  ) {
    return validateBatch(units, position, roadmap);
  }

  /** Check a phase gate. */
  gate(
    phase: RoadmapPhase,
    completedIds: Set<string>,
    metrics: Parameters<typeof checkPhaseGate>[2]
  ): GateResult {
    return checkPhaseGate(phase, completedIds, metrics);
  }

  /** Create initial position. */
  initPosition(roadmap: RoadmapEnvelope): PositionTracker {
    return createInitialPosition(roadmap);
  }

  /** Advance position after batch completion. */
  advance(
    position: PositionTracker,
    completedUnits: Array<{ unitId: string; buildPassed: boolean }>,
    roadmap: RoadmapEnvelope
  ): PositionTracker {
    return advancePosition(position, completedUnits, roadmap);
  }

  /** Summarize an execution plan. */
  summarize(plan: RoadmapExecutionPlan): string {
    return summarizePlan(plan);
  }
}

export const roadmapExecutor = new RoadmapExecutorEngine();
