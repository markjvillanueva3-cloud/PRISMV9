/**
 * PRISM RGS -- Roadmap Hooks Test Suite
 *
 * Tests the pre-execution validation hook and post-unit processing hook
 * that manage roadmap execution lifecycle.
 *
 * 3 describe blocks, 16 test cases.
 */

import { describe, it, expect } from 'vitest';

import {
  validatePreExecution,
  hookMeta as preHookMeta,
} from '../hooks/pre-roadmap-execute.js';
import type { PositionTracker as PrePositionTracker } from '../hooks/pre-roadmap-execute.js';

import {
  updatePosition,
  indexDeliverables,
  checkPhaseGate,
  shouldCheckpoint,
  processUnitCompletion,
  hookMeta as postHookMeta,
} from '../hooks/post-roadmap-unit.js';
import type { PositionTracker, UnitCompletionResult } from '../hooks/post-roadmap-unit.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestUnit(overrides?: Record<string, unknown>) {
  return {
    id: 'P1-U01',
    title: 'Test Unit',
    phase: 'P1',
    sequence: 1,
    role: 'R2',
    role_name: 'Implementer',
    model: 'sonnet-4.6',
    effort: 80,
    steps: [
      {
        number: 1,
        instruction: 'Create the file',
        tool_calls: ['prism_dev:build'],
        validation: 'File exists',
      },
    ],
    deliverables: [
      { path: 'src/test.ts', type: 'source', description: 'Test source' },
    ],
    entry_conditions: ['Previous unit complete'],
    exit_conditions: ['File exists', 'Tests pass'],
    rollback: 'git checkout -- src/test.ts',
    ...overrides,
  };
}

function createTestGate(overrides?: Record<string, unknown>) {
  return {
    omega_floor: 0.75,
    safety_floor: 0.7,
    ralph_required: false,
    ralph_grade_floor: 'B',
    anti_regression: true,
    test_required: true,
    build_required: true,
    checkpoint: true,
    learning_save: true,
    custom_checks: [],
    ...overrides,
  };
}

function createTestPhase(overrides?: Record<string, unknown>) {
  return {
    id: 'P1',
    title: 'Test Phase',
    description: 'Phase for testing',
    sessions: '1-2',
    primary_role: 'R2',
    primary_model: 'sonnet-4.6',
    units: [createTestUnit()],
    gate: createTestGate(),
    scrutiny_checkpoint: false,
    scrutiny_focus: [],
    ...overrides,
  };
}

function createTestRoadmap(overrides?: Record<string, unknown>) {
  const phases = (overrides?.phases as any[]) || [createTestPhase()];
  const totalUnits = phases.reduce((sum: number, p: any) => sum + p.units.length, 0);
  return {
    id: 'TEST',
    version: '1.0.0',
    title: 'Test Roadmap',
    brief: 'Test brief',
    created_at: '2026-01-01T00:00:00Z',
    created_by: 'test',
    phases,
    total_units: totalUnits,
    total_sessions: '1-2',
    role_matrix: [{ code: 'R2', name: 'Implementer', model: 'sonnet-4.6', unit_count: totalUnits }],
    tool_map: [],
    deliverables_index: [],
    scrutiny_config: { min_passes: 3, max_passes: 7, convergence_delta: 2, escalation_round: 4, approval_threshold: 0.92 },
    ...overrides,
  };
}

function createPrePosition(overrides?: Record<string, unknown>): PrePositionTracker {
  return {
    roadmap_id: 'TEST',
    current_unit: 'P1-U01',
    last_completed_unit: null,
    units_completed: 0,
    total_units: 1,
    percent_complete: 0,
    status: 'IN_PROGRESS',
    history: [],
    ...overrides,
  } as PrePositionTracker;
}

function createPostPosition(overrides?: Record<string, unknown>): PositionTracker {
  return {
    roadmap_id: 'TEST',
    current_unit: 'P1-U01',
    current_phase: 'P1',
    last_completed_unit: null,
    units_completed: 0,
    total_units: 1,
    percent_complete: 0,
    status: 'IN_PROGRESS',
    history: [],
    ...overrides,
  } as PositionTracker;
}

function createCompletionResult(overrides?: Partial<UnitCompletionResult>): UnitCompletionResult {
  return {
    build_passed: true,
    tests_passed: true,
    artifacts: ['src/test.ts'],
    ...overrides,
  };
}

// ===========================================================================
// 1. Pre-Roadmap-Execute Hook
// ===========================================================================

describe('Pre-Roadmap-Execute Hook', () => {
  it('should allow execution when all conditions met', () => {
    const unit = createTestUnit();
    const position = createPrePosition();
    const roadmap = createTestRoadmap();
    const result = validatePreExecution(unit as any, position, roadmap as any);
    expect(result.proceed).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it('should block when entry conditions are missing', () => {
    const unit = createTestUnit({ entry_conditions: [] });
    const position = createPrePosition();
    const roadmap = createTestRoadmap();
    const result = validatePreExecution(unit as any, position, roadmap as any);
    expect(result.proceed).toBe(false);
    expect(result.blockers.some((b: string) => b.includes('no entry conditions'))).toBe(true);
  });

  it('should block when dependencies not met', () => {
    const unit = createTestUnit({ dependencies: ['P0-U01'] });
    const position = createPrePosition({ history: [] });
    const roadmap = createTestRoadmap();
    const result = validatePreExecution(unit as any, position, roadmap as any);
    expect(result.proceed).toBe(false);
    expect(result.blockers.some((b: string) => b.includes('P0-U01'))).toBe(true);
  });

  it('should pass when dependencies are satisfied', () => {
    const unit = createTestUnit({ dependencies: ['P0-U01'] });
    const position = createPrePosition({
      history: [{ unit_id: 'P0-U01', completed_at: '2026-01-01T00:00:00Z', build_status: true }],
    });
    const roadmap = createTestRoadmap();
    const result = validatePreExecution(unit as any, position, roadmap as any);
    expect(result.proceed).toBe(true);
  });

  it('should block when unknown tool referenced', () => {
    const unit = createTestUnit({
      tools: [{ tool: 'unknown_tool:action', action: 'do_thing', params_hint: '' }],
    });
    const position = createPrePosition();
    const roadmap = createTestRoadmap();
    const result = validatePreExecution(unit as any, position, roadmap as any);
    expect(result.proceed).toBe(false);
    expect(result.blockers.some((b: string) => b.includes('unknown tool'))).toBe(true);
  });

  it('should block when position is BLOCKED', () => {
    const unit = createTestUnit();
    const position = createPrePosition({ status: 'BLOCKED' });
    const roadmap = createTestRoadmap();
    const result = validatePreExecution(unit as any, position, roadmap as any);
    expect(result.proceed).toBe(false);
    expect(result.blockers.some((b: string) => b.includes('BLOCKED'))).toBe(true);
  });
});

// ===========================================================================
// 2. Post-Roadmap-Unit Hook
// ===========================================================================

describe('Post-Roadmap-Unit Hook', () => {
  it('should update position after unit completion', () => {
    const unit = createTestUnit();
    const position = createPostPosition();
    const result = createCompletionResult();
    const roadmap = createTestRoadmap();
    const updated = updatePosition(position, unit as any, result, roadmap as any);
    expect(updated.units_completed).toBe(1);
    expect(updated.last_completed_unit).toBe('P1-U01');
    expect(updated.history).toHaveLength(1);
    expect(updated.percent_complete).toBe(100);
  });

  it('should advance to next unit in same phase', () => {
    const u1 = createTestUnit({ id: 'P1-U01', sequence: 1 });
    const u2 = createTestUnit({ id: 'P1-U02', sequence: 2 });
    const phase = createTestPhase({ units: [u1, u2] });
    const roadmap = createTestRoadmap({ phases: [phase] });
    const position = createPostPosition({ total_units: 2 });
    const result = createCompletionResult();
    const updated = updatePosition(position, u1 as any, result, roadmap as any);
    expect(updated.current_unit).toBe('P1-U02');
  });

  it('should advance to next phase when current phase ends', () => {
    const u1 = createTestUnit({ id: 'P1-U01', phase: 'P1', sequence: 1 });
    const u2 = createTestUnit({ id: 'P2-U01', phase: 'P2', sequence: 1 });
    const p1 = createTestPhase({ id: 'P1', units: [u1] });
    const p2 = createTestPhase({ id: 'P2', units: [u2] });
    const roadmap = createTestRoadmap({ phases: [p1, p2] });
    const position = createPostPosition({ total_units: 2 });
    const result = createCompletionResult();
    const updated = updatePosition(position, u1 as any, result, roadmap as any);
    expect(updated.current_unit).toBe('P2-U01');
    expect(updated.current_phase).toBe('P2');
  });

  it('should mark roadmap COMPLETE when last unit finishes', () => {
    const unit = createTestUnit();
    const position = createPostPosition();
    const result = createCompletionResult();
    const roadmap = createTestRoadmap();
    const updated = updatePosition(position, unit as any, result, roadmap as any);
    expect(updated.status).toBe('COMPLETE');
    expect(updated.current_unit).toBeNull();
  });

  it('should index deliverables by type', () => {
    const unit = createTestUnit({
      deliverables: [
        { path: 'src/foo.ts', type: 'source', description: 'Source' },
        { path: 'src/foo.test.ts', type: 'test', description: 'Test' },
        { path: 'docs/README.md', type: 'doc', description: 'Docs' },
      ],
    });
    const indexed = indexDeliverables(unit as any);
    expect(indexed).toHaveLength(3);
    expect(indexed).toContain('src/foo.ts');
    expect(indexed).toContain('src/foo.test.ts');
    expect(indexed).toContain('docs/README.md');
  });

  it('should detect phase gate on last unit', () => {
    const u1 = createTestUnit({ sequence: 1 });
    const u2 = createTestUnit({ id: 'P1-U02', sequence: 2 });
    const phase = createTestPhase({ units: [u1, u2] });
    expect(checkPhaseGate(u2 as any, phase as any)).toBe(true);
    expect(checkPhaseGate(u1 as any, phase as any)).toBe(false);
  });

  it('should trigger checkpoint every 3 units', () => {
    expect(shouldCheckpoint(createPostPosition({ units_completed: 3 }) as any)).toBe(true);
    expect(shouldCheckpoint(createPostPosition({ units_completed: 6 }) as any)).toBe(true);
    expect(shouldCheckpoint(createPostPosition({ units_completed: 4 }) as any)).toBe(false);
    expect(shouldCheckpoint(createPostPosition({ units_completed: 0 }) as any)).toBe(false);
  });

  it('should return empty array when no deliverables', () => {
    const unit = createTestUnit({ deliverables: [] });
    expect(indexDeliverables(unit as any)).toHaveLength(0);
  });
});

// ===========================================================================
// 3. Hook Chain Integration
// ===========================================================================

describe('Hook Chain Integration', () => {
  it('should have correct hook metadata for pre-execute', () => {
    expect(preHookMeta.id).toBe('pre-roadmap-execute');
    expect(preHookMeta.event).toBe('roadmap.unit.pre_execute');
    expect(preHookMeta.priority).toBe(1);
    expect(preHookMeta.enabled).toBe(true);
  });

  it('should have correct hook metadata for post-unit', () => {
    expect(postHookMeta.id).toBe('post-roadmap-unit');
    expect(postHookMeta.event).toBe('roadmap.unit.post_complete');
    expect(postHookMeta.priority).toBe(1);
    expect(postHookMeta.enabled).toBe(true);
  });
});
