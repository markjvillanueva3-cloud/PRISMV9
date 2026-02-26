/**
 * Post-Roadmap-Unit Hook
 * Fires AFTER a roadmap unit completes successfully.
 *
 * Responsibilities:
 * 1. Position update (mark unit complete, advance to next)
 * 2. Auto-index deliverables (track what was created)
 * 3. Phase gate check (if last unit before gate)
 * 4. Checkpoint (every 3 completed units)
 *
 * Event: roadmap.unit.post_complete
 * Priority: 1
 *
 * @module hooks/post-roadmap-unit
 */

import { z } from 'zod';
import {
  RoadmapUnit,
  RoadmapEnvelope,
  RoadmapPhase,
  DeliverableType,
} from '../schemas/roadmapSchema.js';

type Unit = z.infer<typeof RoadmapUnit>;
type Phase = z.infer<typeof RoadmapPhase>;
type Envelope = z.infer<typeof RoadmapEnvelope>;
type DelType = z.infer<typeof DeliverableType>;

// ---------------------------------------------------------------------------
// PositionTracker
// ---------------------------------------------------------------------------
// NOTE: Once pre-roadmap-execute.ts is created, this interface should be
// imported from './pre-roadmap-execute.js' and the local definition removed.
// ---------------------------------------------------------------------------

/** Tracks the current execution position within a roadmap. */
export interface PositionTracker {
  roadmap_id: string;
  current_unit: string | null;
  current_phase: string;
  units_completed: number;
  total_units: number;
  percent_complete: number;
  last_completed_unit: string | null;
  status: 'IN_PROGRESS' | 'COMPLETE' | 'BLOCKED' | 'PAUSED';
  history: Array<{
    unit_id: string;
    completed_at: string;
    build_status: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Result interfaces
// ---------------------------------------------------------------------------

/** Outcome from a unit's build/test execution. */
export interface UnitCompletionResult {
  build_passed: boolean;
  tests_passed: boolean;
  /** File paths created or modified during unit execution. */
  artifacts: string[];
}

/** Aggregate result returned by the post-unit hook. */
export interface PostUnitResult {
  position_updated: boolean;
  /** Paths that were identified for MASTER.md indexing. */
  deliverables_indexed: string[];
  gate_pending: boolean;
  checkpoint_triggered: boolean;
  /** ID of the next unit, or null if the roadmap is complete. */
  next_unit: string | null;
  percent_complete: number;
}

// ---------------------------------------------------------------------------
// Deliverable type buckets used for categorisation
// ---------------------------------------------------------------------------

const DELIVERABLE_CATEGORIES: Record<string, DelType[]> = {
  source: ['source'],
  test: ['test'],
  config: ['config'],
  doc: ['doc'],
  skill: ['skill'],
  script: ['script'],
  hook: ['hook'],
  command: ['command'],
  schema: ['schema'],
};

// ---------------------------------------------------------------------------
// 1. updatePosition
// ---------------------------------------------------------------------------

/**
 * Mark a unit complete and advance the position tracker to the next unit.
 *
 * Pure function -- returns a new PositionTracker without mutating the input.
 *
 * Next-unit resolution order:
 *   a) Next sequence in the same phase
 *   b) First unit of the next phase
 *   c) null (roadmap complete)
 *
 * @param position  Current position state
 * @param unit      The unit that just completed
 * @param result    Build/test outcome for the completed unit
 * @param roadmap   The full roadmap envelope (for phase traversal)
 * @returns         Updated position tracker
 */
export function updatePosition(
  position: PositionTracker,
  unit: Unit,
  result: UnitCompletionResult,
  roadmap: Envelope,
): PositionTracker {
  const updated: PositionTracker = {
    ...position,
    last_completed_unit: unit.id,
    units_completed: position.units_completed + 1,
    percent_complete: 0,
    history: [
      ...position.history,
      {
        unit_id: unit.id,
        completed_at: new Date().toISOString(),
        build_status: result.build_passed,
      },
    ],
    current_unit: null,
    status: position.status,
    current_phase: position.current_phase,
  };

  // Recompute percent complete
  updated.percent_complete =
    roadmap.total_units > 0
      ? Math.round((updated.units_completed / roadmap.total_units) * 10000) / 100
      : 100;

  // --- Find the next unit ---------------------------------------------------
  const nextUnit = findNextUnit(unit, roadmap);

  if (nextUnit) {
    updated.current_unit = nextUnit.id;
    updated.current_phase = nextUnit.phase;
  } else {
    // Roadmap complete
    updated.current_unit = null;
    updated.status = 'COMPLETE';
  }

  return updated;
}

// ---------------------------------------------------------------------------
// findNextUnit (internal helper)
// ---------------------------------------------------------------------------

/**
 * Locate the unit that should execute after the given one.
 *
 * Search strategy:
 *   1. Same phase, sequence = current + 1
 *   2. First unit (lowest sequence) of the next phase
 *
 * @returns The next Unit, or null if there are no more units.
 */
function findNextUnit(current: Unit, roadmap: Envelope): Unit | null {
  const phases = roadmap.phases;

  // Find the phase that owns the current unit
  const phaseIdx = phases.findIndex((p) => p.id === current.phase);
  if (phaseIdx === -1) return null;

  const currentPhase = phases[phaseIdx];

  // Look for the next sequence within the same phase
  const samePhaseNext = currentPhase.units
    .filter((u) => u.sequence > current.sequence)
    .sort((a, b) => a.sequence - b.sequence)[0];

  if (samePhaseNext) return samePhaseNext;

  // Move to subsequent phases
  for (let i = phaseIdx + 1; i < phases.length; i++) {
    const phase = phases[i];
    if (phase.units.length > 0) {
      const sorted = [...phase.units].sort((a, b) => a.sequence - b.sequence);
      return sorted[0];
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 2. indexDeliverables
// ---------------------------------------------------------------------------

/**
 * Extract deliverable paths from a unit and categorise them for MASTER.md
 * indexing.
 *
 * Actual MASTER.md writes are deferred to the indexer script -- this function
 * only identifies *what* needs indexing.
 *
 * @param unit  The unit whose deliverables should be indexed
 * @returns     Array of deliverable paths eligible for indexing
 */
export function indexDeliverables(unit: Unit): string[] {
  if (!unit.deliverables || unit.deliverables.length === 0) {
    return [];
  }

  // Collect the set of types that belong to any known category
  const indexableTypes = new Set<string>(
    Object.values(DELIVERABLE_CATEGORIES).flat(),
  );

  return unit.deliverables
    .filter((d) => indexableTypes.has(d.type))
    .map((d) => d.path);
}

// ---------------------------------------------------------------------------
// 3. checkPhaseGate
// ---------------------------------------------------------------------------

/**
 * Determine whether the completed unit is the last one in its phase,
 * meaning a phase gate check is now pending.
 *
 * @param unit   The unit that just completed
 * @param phase  The phase the unit belongs to
 * @returns      true if the unit has the highest sequence in the phase
 */
export function checkPhaseGate(unit: Unit, phase: Phase): boolean {
  if (!phase.units || phase.units.length === 0) return false;

  const maxSequence = Math.max(...phase.units.map((u) => u.sequence));
  return unit.sequence === maxSequence;
}

// ---------------------------------------------------------------------------
// 4. shouldCheckpoint
// ---------------------------------------------------------------------------

/**
 * Decide whether a checkpoint should be created.
 * Triggers every 3 completed units.
 *
 * @param position  The *updated* position tracker (after incrementing)
 * @returns         true when units_completed is a multiple of 3
 */
export function shouldCheckpoint(position: PositionTracker): boolean {
  return position.units_completed > 0 && position.units_completed % 3 === 0;
}

// ---------------------------------------------------------------------------
// 5. processUnitCompletion (orchestrator)
// ---------------------------------------------------------------------------

/**
 * Top-level orchestrator invoked by the hook system after a unit
 * completes successfully.
 *
 * Calls all four sub-functions in order:
 *   1. updatePosition   -- advance the tracker
 *   2. indexDeliverables -- identify files for MASTER.md
 *   3. checkPhaseGate   -- detect pending gate checks
 *   4. shouldCheckpoint -- decide on periodic checkpointing
 *
 * @param unit      The unit that just completed
 * @param result    Build/test outcome for the unit
 * @param position  Current position tracker (pre-update)
 * @param roadmap   The full roadmap envelope
 * @returns         Aggregated PostUnitResult
 */
export function processUnitCompletion(
  unit: Unit,
  result: UnitCompletionResult,
  position: PositionTracker,
  roadmap: Envelope,
): PostUnitResult {
  // 1. Position update
  const updatedPosition = updatePosition(position, unit, result, roadmap);

  // 2. Auto-index deliverables
  const deliverables = indexDeliverables(unit);

  // 3. Phase gate check -- find the phase for this unit
  const phase = roadmap.phases.find((p) => p.id === unit.phase);
  const gatePending = phase ? checkPhaseGate(unit, phase) : false;

  // 4. Checkpoint decision
  const checkpointTriggered = shouldCheckpoint(updatedPosition);

  return {
    position_updated: true,
    deliverables_indexed: deliverables,
    gate_pending: gatePending,
    checkpoint_triggered: checkpointTriggered,
    next_unit: updatedPosition.current_unit,
    percent_complete: updatedPosition.percent_complete,
  };
}

// ---------------------------------------------------------------------------
// Hook metadata
// ---------------------------------------------------------------------------

export const hookMeta = {
  id: 'post-roadmap-unit',
  event: 'roadmap.unit.post_complete',
  handler: processUnitCompletion,
  enabled: true,
  priority: 1,
  description:
    'Auto-updates position, indexes deliverables, checkpoints after unit completion',
};
