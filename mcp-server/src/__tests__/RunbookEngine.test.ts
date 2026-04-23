/**
 * RunbookEngine Tests — U-LPR-OBS6
 *
 * Tests for runbook management, RACI coverage, and execution tracking.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS6
 * @phase PHASE-10 (Observability + SLO)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RunbookEngine,
  runbookEngine,
  Runbook,
  RunbookStep,
} from '../engines/RunbookEngine.js';

describe('RunbookEngine', () => {
  let engine: RunbookEngine;

  const createTestRunbook = (): Omit<Runbook, 'createdAt' | 'updatedAt'> => ({
    id: 'test-runbook',
    name: 'Test Runbook',
    description: 'A test runbook',
    category: 'incident_response',
    version: '1.0.0',
    enabled: true,
    triggers: [
      { type: 'alert', condition: 'severity=high', priority: 'high', autoExecute: false },
    ],
    metadata: {
      owner: 'test-team',
      reviewers: [],
      reviewCycle: 30,
      tags: ['test'],
    },
    steps: [
      {
        id: 'step-1',
        order: 1,
        title: 'First Step',
        description: 'Do the first thing',
        expectedDuration: 5,
        automatable: true,
        raci: [
          { role: 'responsible', team: 'team-a' },
          { role: 'accountable', team: 'team-lead' },
        ],
      },
      {
        id: 'step-2',
        order: 2,
        title: 'Second Step',
        description: 'Do the second thing',
        expectedDuration: 10,
        automatable: false,
        dependencies: ['step-1'],
        raci: [
          { role: 'responsible', team: 'team-b' },
          { role: 'consulted', team: 'team-a' },
          { role: 'informed', team: 'stakeholders' },
        ],
      },
    ],
  });

  beforeEach(() => {
    engine = new RunbookEngine();
  });

  describe('createRunbook', () => {
    it('should create runbook', () => {
      const input = createTestRunbook();
      const runbook = engine.createRunbook(input);

      expect(runbook.id).toBe('test-runbook');
      expect(runbook.name).toBe('Test Runbook');
      expect(runbook.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should reject duplicate runbook', () => {
      const input = createTestRunbook();
      engine.createRunbook(input);

      expect(() => engine.createRunbook(input)).toThrow('already exists');
    });

    it('should set timestamps', () => {
      const input = createTestRunbook();
      const runbook = engine.createRunbook(input);

      expect(runbook.createdAt).toBeDefined();
      expect(runbook.updatedAt).toBeDefined();
      expect(runbook.createdAt).toBe(runbook.updatedAt);
    });
  });

  describe('getRunbook', () => {
    it('should get existing runbook', () => {
      engine.createRunbook(createTestRunbook());

      const runbook = engine.getRunbook('test-runbook');
      expect(runbook).not.toBeNull();
      expect(runbook?.name).toBe('Test Runbook');
    });

    it('should return null for unknown runbook', () => {
      expect(engine.getRunbook('unknown')).toBeNull();
    });
  });

  describe('updateRunbook', () => {
    it('should update runbook', () => {
      engine.createRunbook(createTestRunbook());

      const updated = engine.updateRunbook('test-runbook', {
        version: '1.1.0',
        description: 'Updated description',
      });

      expect(updated?.version).toBe('1.1.0');
      expect(updated?.description).toBe('Updated description');
    });

    it('should update timestamp', () => {
      const original = engine.createRunbook(createTestRunbook());

      // Small delay to ensure different timestamp
      const updated = engine.updateRunbook('test-runbook', { version: '1.1.0' });

      expect(updated?.updatedAt).toBeGreaterThanOrEqual(original.updatedAt);
    });

    it('should return null for unknown runbook', () => {
      expect(engine.updateRunbook('unknown', {})).toBeNull();
    });
  });

  describe('listRunbooks', () => {
    beforeEach(() => {
      engine.createRunbook(createTestRunbook());
      engine.createRunbook({
        ...createTestRunbook(),
        id: 'maintenance-runbook',
        name: 'Maintenance Runbook',
        category: 'maintenance',
        enabled: false,
        metadata: {
          ...createTestRunbook().metadata,
          tags: ['maintenance', 'scheduled'],
        },
      });
    });

    it('should list all runbooks', () => {
      const runbooks = engine.listRunbooks();
      expect(runbooks).toHaveLength(2);
    });

    it('should filter by category', () => {
      const runbooks = engine.listRunbooks({ category: 'maintenance' });
      expect(runbooks).toHaveLength(1);
      expect(runbooks[0].name).toBe('Maintenance Runbook');
    });

    it('should filter by enabled', () => {
      const runbooks = engine.listRunbooks({ enabled: true });
      expect(runbooks).toHaveLength(1);
      expect(runbooks[0].id).toBe('test-runbook');
    });

    it('should filter by tag', () => {
      const runbooks = engine.listRunbooks({ tag: 'scheduled' });
      expect(runbooks).toHaveLength(1);
    });
  });

  describe('deleteRunbook', () => {
    it('should delete existing runbook', () => {
      engine.createRunbook(createTestRunbook());

      const result = engine.deleteRunbook('test-runbook');
      expect(result).toBe(true);
      expect(engine.getRunbook('test-runbook')).toBeNull();
    });

    it('should return false for unknown runbook', () => {
      expect(engine.deleteRunbook('unknown')).toBe(false);
    });
  });

  describe('startExecution', () => {
    beforeEach(() => {
      engine.createRunbook(createTestRunbook());
    });

    it('should start execution', () => {
      const execution = engine.startExecution(
        'test-runbook',
        'user@test.com',
        'manual'
      );

      expect(execution).not.toBeNull();
      expect(execution?.status).toBe('running');
      expect(execution?.triggeredBy).toBe('user@test.com');
    });

    it('should initialize step statuses', () => {
      const execution = engine.startExecution(
        'test-runbook',
        'user@test.com',
        'manual'
      );

      expect(execution?.steps).toHaveLength(2);
      expect(execution?.steps[0].status).toBe('pending');
      expect(execution?.steps[1].status).toBe('pending');
    });

    it('should include incident ID if provided', () => {
      const execution = engine.startExecution(
        'test-runbook',
        'user@test.com',
        'alert',
        'INC-123'
      );

      expect(execution?.incidentId).toBe('INC-123');
    });

    it('should return null for unknown runbook', () => {
      expect(engine.startExecution('unknown', 'user', 'manual')).toBeNull();
    });

    it('should return null for disabled runbook', () => {
      engine.updateRunbook('test-runbook', { enabled: false });

      expect(engine.startExecution('test-runbook', 'user', 'manual')).toBeNull();
    });
  });

  describe('getExecution', () => {
    it('should get existing execution', () => {
      engine.createRunbook(createTestRunbook());
      const started = engine.startExecution('test-runbook', 'user', 'manual');

      const execution = engine.getExecution(started!.id);
      expect(execution).not.toBeNull();
      expect(execution?.id).toBe(started?.id);
    });

    it('should return null for unknown execution', () => {
      expect(engine.getExecution('unknown')).toBeNull();
    });
  });

  describe('updateStepStatus', () => {
    let executionId: string;

    beforeEach(() => {
      engine.createRunbook(createTestRunbook());
      const execution = engine.startExecution('test-runbook', 'user', 'manual');
      executionId = execution!.id;
    });

    it('should update step to in_progress', () => {
      const result = engine.updateStepStatus(
        executionId,
        'step-1',
        'in_progress',
        'operator@test.com'
      );

      expect(result).toBe(true);

      const execution = engine.getExecution(executionId);
      const step = execution?.steps.find(s => s.stepId === 'step-1');
      expect(step?.status).toBe('in_progress');
      expect(step?.startedAt).toBeDefined();
    });

    it('should update step to completed', () => {
      engine.updateStepStatus(executionId, 'step-1', 'in_progress');
      engine.updateStepStatus(
        executionId,
        'step-1',
        'completed',
        'operator',
        'Step completed successfully'
      );

      const execution = engine.getExecution(executionId);
      const step = execution?.steps.find(s => s.stepId === 'step-1');
      expect(step?.status).toBe('completed');
      expect(step?.completedAt).toBeDefined();
      expect(step?.output).toBe('Step completed successfully');
    });

    it('should mark execution failed when step fails', () => {
      engine.updateStepStatus(
        executionId,
        'step-1',
        'failed',
        'operator',
        undefined,
        'Step failed due to error'
      );

      const execution = engine.getExecution(executionId);
      expect(execution?.status).toBe('failed');
      expect(execution?.completedAt).toBeDefined();
    });

    it('should mark execution completed when all steps complete', () => {
      engine.updateStepStatus(executionId, 'step-1', 'completed');
      engine.updateStepStatus(executionId, 'step-2', 'completed');

      const execution = engine.getExecution(executionId);
      expect(execution?.status).toBe('completed');
    });

    it('should allow skipped steps', () => {
      engine.updateStepStatus(executionId, 'step-1', 'skipped');
      engine.updateStepStatus(executionId, 'step-2', 'completed');

      const execution = engine.getExecution(executionId);
      expect(execution?.status).toBe('completed');
    });

    it('should return false for unknown execution', () => {
      expect(engine.updateStepStatus('unknown', 'step-1', 'completed')).toBe(false);
    });

    it('should return false for unknown step', () => {
      expect(engine.updateStepStatus(executionId, 'unknown-step', 'completed')).toBe(false);
    });
  });

  describe('addExecutionNote', () => {
    let executionId: string;

    beforeEach(() => {
      engine.createRunbook(createTestRunbook());
      const execution = engine.startExecution('test-runbook', 'user', 'manual');
      executionId = execution!.id;
    });

    it('should add note to execution', () => {
      const result = engine.addExecutionNote(
        executionId,
        'operator@test.com',
        'Investigation in progress'
      );

      expect(result).toBe(true);

      const execution = engine.getExecution(executionId);
      expect(execution?.notes).toHaveLength(1);
      expect(execution?.notes[0].content).toBe('Investigation in progress');
    });

    it('should add note with step reference', () => {
      engine.addExecutionNote(
        executionId,
        'operator',
        'Step requires manual intervention',
        'step-1'
      );

      const execution = engine.getExecution(executionId);
      expect(execution?.notes[0].stepId).toBe('step-1');
    });

    it('should return false for unknown execution', () => {
      expect(engine.addExecutionNote('unknown', 'author', 'note')).toBe(false);
    });
  });

  describe('abortExecution', () => {
    let executionId: string;

    beforeEach(() => {
      engine.createRunbook(createTestRunbook());
      const execution = engine.startExecution('test-runbook', 'user', 'manual');
      executionId = execution!.id;
    });

    it('should abort running execution', () => {
      const result = engine.abortExecution(
        executionId,
        'Higher priority incident',
        'manager'
      );

      expect(result).toBe(true);

      const execution = engine.getExecution(executionId);
      expect(execution?.status).toBe('aborted');
      expect(execution?.completedAt).toBeDefined();
      expect(execution?.notes[0].content).toContain('Higher priority incident');
    });

    it('should not abort completed execution', () => {
      engine.updateStepStatus(executionId, 'step-1', 'completed');
      engine.updateStepStatus(executionId, 'step-2', 'completed');

      const result = engine.abortExecution(executionId, 'Too late', 'manager');
      expect(result).toBe(false);
    });
  });

  describe('getExecutionsForRunbook', () => {
    beforeEach(() => {
      engine.createRunbook(createTestRunbook());
    });

    it('should return executions for runbook', () => {
      engine.startExecution('test-runbook', 'user1', 'manual');
      engine.startExecution('test-runbook', 'user2', 'alert');

      const executions = engine.getExecutionsForRunbook('test-runbook');
      expect(executions).toHaveLength(2);
    });

    it('should return most recent first', () => {
      engine.startExecution('test-runbook', 'user1', 'manual');
      engine.startExecution('test-runbook', 'user2', 'manual');

      const executions = engine.getExecutionsForRunbook('test-runbook');
      expect(executions[0].startedAt).toBeGreaterThanOrEqual(executions[1].startedAt);
    });

    it('should limit results', () => {
      for (let i = 0; i < 5; i++) {
        engine.startExecution('test-runbook', `user${i}`, 'manual');
      }

      const executions = engine.getExecutionsForRunbook('test-runbook', 3);
      expect(executions).toHaveLength(3);
    });
  });

  describe('getActiveExecutions', () => {
    beforeEach(() => {
      engine.createRunbook(createTestRunbook());
    });

    it('should return only running executions', () => {
      const exec1 = engine.startExecution('test-runbook', 'user1', 'manual');
      const exec2 = engine.startExecution('test-runbook', 'user2', 'manual');

      // Complete exec1
      engine.updateStepStatus(exec1!.id, 'step-1', 'completed');
      engine.updateStepStatus(exec1!.id, 'step-2', 'completed');

      const active = engine.getActiveExecutions();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(exec2!.id);
    });
  });

  describe('getRACIMatrix', () => {
    it('should generate RACI matrix', () => {
      engine.createRunbook(createTestRunbook());

      const matrix = engine.getRACIMatrix('test-runbook');
      expect(matrix).not.toBeNull();
      expect(matrix?.steps).toHaveLength(2);
    });

    it('should extract roles correctly', () => {
      engine.createRunbook(createTestRunbook());

      const matrix = engine.getRACIMatrix('test-runbook');
      const step1 = matrix?.steps.find(s => s.stepId === 'step-1');

      expect(step1?.responsible).toContain('team-a');
      expect(step1?.accountable).toContain('team-lead');
    });

    it('should return null for unknown runbook', () => {
      expect(engine.getRACIMatrix('unknown')).toBeNull();
    });
  });

  describe('findRunbooksForTrigger', () => {
    beforeEach(() => {
      engine.createRunbook(createTestRunbook());
      engine.createRunbook({
        ...createTestRunbook(),
        id: 'wildcard-runbook',
        name: 'Wildcard Runbook',
        triggers: [
          { type: 'alert', condition: '*', priority: 'low', autoExecute: false },
        ],
      });
    });

    it('should find runbooks matching trigger', () => {
      const runbooks = engine.findRunbooksForTrigger('alert', 'severity=high');
      expect(runbooks.some(r => r.id === 'test-runbook')).toBe(true);
    });

    it('should match wildcard triggers', () => {
      const runbooks = engine.findRunbooksForTrigger('alert', 'any-condition');
      expect(runbooks.some(r => r.id === 'wildcard-runbook')).toBe(true);
    });

    it('should not return disabled runbooks', () => {
      engine.updateRunbook('test-runbook', { enabled: false });

      const runbooks = engine.findRunbooksForTrigger('alert', 'severity=high');
      expect(runbooks.some(r => r.id === 'test-runbook')).toBe(false);
    });
  });

  describe('getRunbooksNeedingReview', () => {
    it('should return runbooks past review cycle', () => {
      const oldRunbook = createTestRunbook();
      oldRunbook.metadata.reviewCycle = 1; // 1 day cycle
      oldRunbook.metadata.lastReviewedAt = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago

      engine.createRunbook(oldRunbook);

      const needsReview = engine.getRunbooksNeedingReview();
      expect(needsReview).toHaveLength(1);
    });

    it('should not return recently reviewed runbooks', () => {
      const recentRunbook = createTestRunbook();
      recentRunbook.metadata.reviewCycle = 365; // One year cycle
      recentRunbook.metadata.lastReviewedAt = Date.now(); // Just reviewed

      engine.createRunbook(recentRunbook);

      const needsReview = engine.getRunbooksNeedingReview();
      expect(needsReview).toHaveLength(0);
    });
  });

  describe('markReviewed', () => {
    it('should mark runbook as reviewed', () => {
      engine.createRunbook(createTestRunbook());

      const result = engine.markReviewed('test-runbook', 'reviewer@test.com');
      expect(result).toBe(true);

      const runbook = engine.getRunbook('test-runbook');
      expect(runbook?.metadata.lastReviewedAt).toBeDefined();
      expect(runbook?.metadata.reviewers).toContain('reviewer@test.com');
    });

    it('should not duplicate reviewers', () => {
      engine.createRunbook(createTestRunbook());

      engine.markReviewed('test-runbook', 'reviewer@test.com');
      engine.markReviewed('test-runbook', 'reviewer@test.com');

      const runbook = engine.getRunbook('test-runbook');
      const reviewerCount = runbook?.metadata.reviewers.filter(
        r => r === 'reviewer@test.com'
      ).length;
      expect(reviewerCount).toBe(1);
    });

    it('should return false for unknown runbook', () => {
      expect(engine.markReviewed('unknown', 'reviewer')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return empty stats for no data', () => {
      const stats = engine.getStats();
      expect(stats.totalRunbooks).toBe(0);
      expect(stats.totalExecutions).toBe(0);
    });

    it('should count runbooks by category', () => {
      engine.createRunbook(createTestRunbook());
      engine.createRunbook({
        ...createTestRunbook(),
        id: 'maintenance-1',
        category: 'maintenance',
      });

      const stats = engine.getStats();
      expect(stats.byCategory.incident_response).toBe(1);
      expect(stats.byCategory.maintenance).toBe(1);
    });

    it('should calculate success rate', () => {
      engine.createRunbook(createTestRunbook());

      const exec1 = engine.startExecution('test-runbook', 'user', 'manual');
      engine.updateStepStatus(exec1!.id, 'step-1', 'completed');
      engine.updateStepStatus(exec1!.id, 'step-2', 'completed');

      const exec2 = engine.startExecution('test-runbook', 'user', 'manual');
      engine.updateStepStatus(exec2!.id, 'step-1', 'failed');

      const stats = engine.getStats();
      expect(stats.successRate).toBe(0.5);
    });

    it('should track most executed runbooks', () => {
      engine.createRunbook(createTestRunbook());
      engine.createRunbook({
        ...createTestRunbook(),
        id: 'other-runbook',
      });

      // Execute test-runbook 3 times, other-runbook 1 time
      for (let i = 0; i < 3; i++) {
        engine.startExecution('test-runbook', 'user', 'manual');
      }
      engine.startExecution('other-runbook', 'user', 'manual');

      const stats = engine.getStats();
      expect(stats.mostExecuted[0]).toBe('test-runbook');
    });
  });

  describe('createStandardRunbooks', () => {
    it('should create standard PRISM runbooks', () => {
      engine.createStandardRunbooks();

      expect(engine.getRunbook('incident-response-p1')).not.toBeNull();
      expect(engine.getRunbook('production-deployment')).not.toBeNull();
    });

    it('should have proper RACI assignments', () => {
      engine.createStandardRunbooks();

      const matrix = engine.getRACIMatrix('incident-response-p1');
      expect(matrix?.steps.length).toBeGreaterThan(0);

      // Every step should have at least one responsible party
      for (const step of matrix!.steps) {
        expect(step.responsible.length).toBeGreaterThan(0);
      }
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      engine.createRunbook(createTestRunbook());
      engine.startExecution('test-runbook', 'user', 'manual');

      engine.clear();

      expect(engine.listRunbooks()).toHaveLength(0);
      expect(engine.getActiveExecutions()).toHaveLength(0);
    });
  });

  describe('singleton', () => {
    it('should export singleton', () => {
      expect(runbookEngine).toBeInstanceOf(RunbookEngine);
    });
  });
});
