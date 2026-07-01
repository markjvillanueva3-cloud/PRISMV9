/**
 * RunbookEngine — U-LPR-OBS6
 *
 * Operational runbook management with RACI coverage:
 * - Runbook creation and versioning
 * - RACI matrix (Responsible, Accountable, Consulted, Informed)
 * - Step execution tracking
 * - Automated runbook triggers
 * - Incident playbook integration
 * - Runbook analytics
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OBS6
 * @phase PHASE-10 (Observability + SLO)
 */

import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type RunbookCategory =
  | 'incident_response'
  | 'maintenance'
  | 'deployment'
  | 'recovery'
  | 'troubleshooting'
  | 'escalation';

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export type RACIRole = 'responsible' | 'accountable' | 'consulted' | 'informed';

export interface RACIAssignment {
  role: RACIRole;
  team: string;
  individuals?: string[];
  escalationPath?: string[];
}

export interface RunbookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  expectedDuration: number;  // minutes
  raci: RACIAssignment[];
  commands?: string[];
  checkpoints?: string[];
  rollback?: string;
  automatable: boolean;
  dependencies?: string[];  // step IDs
}

export interface Runbook {
  id: string;
  name: string;
  description: string;
  category: RunbookCategory;
  version: string;
  steps: RunbookStep[];
  triggers: RunbookTrigger[];
  metadata: RunbookMetadata;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RunbookTrigger {
  type: 'alert' | 'schedule' | 'manual' | 'event';
  condition: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoExecute: boolean;
}

export interface RunbookMetadata {
  owner: string;
  reviewers: string[];
  lastReviewedAt?: number;
  reviewCycle: number;  // days
  tags: string[];
  relatedRunbooks?: string[];
}

export interface RunbookExecution {
  id: string;
  runbookId: string;
  runbookVersion: string;
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  triggeredBy: string;
  triggerType: RunbookTrigger['type'];
  incidentId?: string;
  steps: StepExecution[];
  notes: ExecutionNote[];
}

export interface StepExecution {
  stepId: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  executor?: string;
  output?: string;
  error?: string;
}

export interface ExecutionNote {
  timestamp: number;
  author: string;
  content: string;
  stepId?: string;
}

export interface RunbookStats {
  totalRunbooks: number;
  byCategory: Record<RunbookCategory, number>;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  mostExecuted: string[];
}

export interface RACIMatrix {
  runbookId: string;
  steps: Array<{
    stepId: string;
    stepTitle: string;
    responsible: string[];
    accountable: string[];
    consulted: string[];
    informed: string[];
  }>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class RunbookEngine {
  private runbooks: Map<string, Runbook> = new Map();
  private executions: Map<string, RunbookExecution> = new Map();
  private executionCounter = 0;

  /**
   * Creates a new runbook.
   */
  createRunbook(input: Omit<Runbook, 'createdAt' | 'updatedAt'>): Runbook {
    if (this.runbooks.has(input.id)) {
      throw new Error(`Runbook ${input.id} already exists`);
    }

    const now = Date.now();
    const runbook: Runbook = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.runbooks.set(input.id, runbook);
    log.info(`[Runbook] Created: ${input.name} (${input.category})`);
    return runbook;
  }

  /**
   * Gets a runbook by ID.
   */
  getRunbook(id: string): Runbook | null {
    return this.runbooks.get(id) || null;
  }

  /**
   * Updates a runbook (creates new version).
   */
  updateRunbook(id: string, updates: Partial<Omit<Runbook, 'id' | 'createdAt'>>): Runbook | null {
    const existing = this.runbooks.get(id);
    if (!existing) return null;

    const updated: Runbook = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    this.runbooks.set(id, updated);
    log.info(`[Runbook] Updated: ${existing.name} to v${updated.version}`);
    return updated;
  }

  /**
   * Lists runbooks with optional filtering.
   */
  listRunbooks(options?: {
    category?: RunbookCategory;
    enabled?: boolean;
    tag?: string;
  }): Runbook[] {
    let results = [...this.runbooks.values()];

    if (options?.category) {
      results = results.filter(r => r.category === options.category);
    }

    if (options?.enabled !== undefined) {
      results = results.filter(r => r.enabled === options.enabled);
    }

    if (options?.tag) {
      const tag = options.tag;
      results = results.filter(r => r.metadata.tags.includes(tag));
    }

    return results;
  }

  /**
   * Deletes a runbook.
   */
  deleteRunbook(id: string): boolean {
    return this.runbooks.delete(id);
  }

  /**
   * Starts runbook execution.
   */
  startExecution(
    runbookId: string,
    triggeredBy: string,
    triggerType: RunbookTrigger['type'],
    incidentId?: string
  ): RunbookExecution | null {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook || !runbook.enabled) return null;

    const executionId = `exec-${++this.executionCounter}-${Date.now()}`;

    const execution: RunbookExecution = {
      id: executionId,
      runbookId,
      runbookVersion: runbook.version,
      startedAt: Date.now(),
      status: 'running',
      triggeredBy,
      triggerType,
      incidentId,
      steps: runbook.steps.map(step => ({
        stepId: step.id,
        status: 'pending',
      })),
      notes: [],
    };

    this.executions.set(executionId, execution);
    log.info(`[Runbook] Started execution: ${executionId} for ${runbook.name}`);
    return execution;
  }

  /**
   * Gets an execution by ID.
   */
  getExecution(id: string): RunbookExecution | null {
    return this.executions.get(id) || null;
  }

  /**
   * Updates step status in execution.
   */
  updateStepStatus(
    executionId: string,
    stepId: string,
    status: StepStatus,
    executor?: string,
    output?: string,
    error?: string
  ): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    const step = execution.steps.find(s => s.stepId === stepId);
    if (!step) return false;

    const now = Date.now();

    if (status === 'in_progress' && !step.startedAt) {
      step.startedAt = now;
    }

    if (status === 'completed' || status === 'failed' || status === 'skipped') {
      step.completedAt = now;
    }

    step.status = status;
    step.executor = executor;
    step.output = output;
    step.error = error;

    // Check if all steps complete
    const allComplete = execution.steps.every(
      s => s.status === 'completed' || s.status === 'skipped'
    );
    const anyFailed = execution.steps.some(s => s.status === 'failed');

    if (anyFailed) {
      execution.status = 'failed';
      execution.completedAt = now;
    } else if (allComplete) {
      execution.status = 'completed';
      execution.completedAt = now;
    }

    return true;
  }

  /**
   * Adds note to execution.
   */
  addExecutionNote(
    executionId: string,
    author: string,
    content: string,
    stepId?: string
  ): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    execution.notes.push({
      timestamp: Date.now(),
      author,
      content,
      stepId,
    });

    return true;
  }

  /**
   * Aborts execution.
   */
  abortExecution(executionId: string, reason: string, author: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return false;

    execution.status = 'aborted';
    execution.completedAt = Date.now();
    execution.notes.push({
      timestamp: Date.now(),
      author,
      content: `Aborted: ${reason}`,
    });

    return true;
  }

  /**
   * Gets executions for a runbook.
   */
  getExecutionsForRunbook(runbookId: string, limit = 10): RunbookExecution[] {
    return [...this.executions.values()]
      .filter(e => e.runbookId === runbookId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  /**
   * Gets active executions.
   */
  getActiveExecutions(): RunbookExecution[] {
    return [...this.executions.values()].filter(e => e.status === 'running');
  }

  /**
   * Gets RACI matrix for a runbook.
   */
  getRACIMatrix(runbookId: string): RACIMatrix | null {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) return null;

    const steps = runbook.steps.map(step => {
      const responsible: string[] = [];
      const accountable: string[] = [];
      const consulted: string[] = [];
      const informed: string[] = [];

      for (const assignment of step.raci) {
        const individuals = assignment.individuals || [assignment.team];

        switch (assignment.role) {
          case 'responsible':
            responsible.push(...individuals);
            break;
          case 'accountable':
            accountable.push(...individuals);
            break;
          case 'consulted':
            consulted.push(...individuals);
            break;
          case 'informed':
            informed.push(...individuals);
            break;
        }
      }

      return {
        stepId: step.id,
        stepTitle: step.title,
        responsible,
        accountable,
        consulted,
        informed,
      };
    });

    return { runbookId, steps };
  }

  /**
   * Finds runbooks for a trigger.
   */
  findRunbooksForTrigger(
    triggerType: RunbookTrigger['type'],
    condition: string
  ): Runbook[] {
    return [...this.runbooks.values()].filter(runbook => {
      if (!runbook.enabled) return false;

      return runbook.triggers.some(trigger => {
        if (trigger.type !== triggerType) return false;
        // Simple condition matching (in production, use regex or expression evaluator)
        return trigger.condition === condition || trigger.condition === '*';
      });
    });
  }

  /**
   * Gets runbooks needing review.
   */
  getRunbooksNeedingReview(): Runbook[] {
    const now = Date.now();

    return [...this.runbooks.values()].filter(runbook => {
      const reviewCycleMs = runbook.metadata.reviewCycle * 24 * 60 * 60 * 1000;
      const lastReview = runbook.metadata.lastReviewedAt || runbook.createdAt;
      return now - lastReview > reviewCycleMs;
    });
  }

  /**
   * Marks runbook as reviewed.
   */
  markReviewed(runbookId: string, reviewer: string): boolean {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) return false;

    runbook.metadata.lastReviewedAt = Date.now();
    if (!runbook.metadata.reviewers.includes(reviewer)) {
      runbook.metadata.reviewers.push(reviewer);
    }
    runbook.updatedAt = Date.now();

    return true;
  }

  /**
   * Gets statistics.
   */
  getStats(): RunbookStats {
    const runbooks = [...this.runbooks.values()];
    const executions = [...this.executions.values()];

    const byCategory: Record<RunbookCategory, number> = {
      incident_response: 0,
      maintenance: 0,
      deployment: 0,
      recovery: 0,
      troubleshooting: 0,
      escalation: 0,
    };

    for (const r of runbooks) {
      byCategory[r.category]++;
    }

    const completedExecutions = executions.filter(e => e.status === 'completed');
    const successRate = executions.length > 0
      ? completedExecutions.length / executions.length
      : 0;

    const executionTimes = completedExecutions
      .filter(e => e.completedAt)
      .map(e => e.completedAt! - e.startedAt);
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    // Most executed runbooks
    const executionCounts = new Map<string, number>();
    for (const e of executions) {
      executionCounts.set(e.runbookId, (executionCounts.get(e.runbookId) || 0) + 1);
    }
    const mostExecuted = [...executionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    return {
      totalRunbooks: runbooks.length,
      byCategory,
      totalExecutions: executions.length,
      successRate,
      avgExecutionTime,
      mostExecuted,
    };
  }

  /**
   * Creates standard PRISM runbooks.
   */
  createStandardRunbooks(): void {
    // Incident Response Runbook
    this.createRunbook({
      id: 'incident-response-p1',
      name: 'P1 Incident Response',
      description: 'Critical incident response procedure',
      category: 'incident_response',
      version: '1.0.0',
      enabled: true,
      triggers: [
        { type: 'alert', condition: 'severity=critical', priority: 'critical', autoExecute: false },
      ],
      metadata: {
        owner: 'sre-team',
        reviewers: ['sre-lead'],
        reviewCycle: 90,
        tags: ['incident', 'critical', 'p1'],
      },
      steps: [
        {
          id: 'acknowledge',
          order: 1,
          title: 'Acknowledge Incident',
          description: 'Acknowledge the alert and begin response',
          expectedDuration: 5,
          automatable: false,
          raci: [
            { role: 'responsible', team: 'oncall' },
            { role: 'accountable', team: 'sre-lead' },
            { role: 'informed', team: 'engineering-management' },
          ],
        },
        {
          id: 'assess',
          order: 2,
          title: 'Assess Impact',
          description: 'Determine scope and customer impact',
          expectedDuration: 10,
          automatable: false,
          dependencies: ['acknowledge'],
          raci: [
            { role: 'responsible', team: 'oncall' },
            { role: 'consulted', team: 'customer-success' },
            { role: 'informed', team: 'stakeholders' },
          ],
        },
        {
          id: 'communicate',
          order: 3,
          title: 'Communicate Status',
          description: 'Post status update to stakeholders',
          expectedDuration: 5,
          automatable: true,
          dependencies: ['assess'],
          raci: [
            { role: 'responsible', team: 'oncall' },
            { role: 'accountable', team: 'sre-lead' },
            { role: 'informed', team: 'all' },
          ],
        },
        {
          id: 'mitigate',
          order: 4,
          title: 'Mitigate',
          description: 'Apply mitigation to restore service',
          expectedDuration: 30,
          automatable: false,
          dependencies: ['assess'],
          rollback: 'Revert last deployment or failover to backup',
          raci: [
            { role: 'responsible', team: 'oncall' },
            { role: 'consulted', team: 'platform-team' },
            { role: 'accountable', team: 'sre-lead' },
          ],
        },
        {
          id: 'verify',
          order: 5,
          title: 'Verify Resolution',
          description: 'Confirm service is restored',
          expectedDuration: 10,
          automatable: true,
          dependencies: ['mitigate'],
          checkpoints: ['All health checks pass', 'Error rate normal', 'Latency normal'],
          raci: [
            { role: 'responsible', team: 'oncall' },
            { role: 'consulted', team: 'qa' },
          ],
        },
        {
          id: 'postmortem',
          order: 6,
          title: 'Schedule Postmortem',
          description: 'Schedule blameless postmortem within 48h',
          expectedDuration: 5,
          automatable: true,
          dependencies: ['verify'],
          raci: [
            { role: 'responsible', team: 'sre-lead' },
            { role: 'consulted', team: 'engineering' },
            { role: 'informed', team: 'all' },
          ],
        },
      ],
    });

    // Deployment Runbook
    this.createRunbook({
      id: 'production-deployment',
      name: 'Production Deployment',
      description: 'Standard production deployment procedure',
      category: 'deployment',
      version: '1.0.0',
      enabled: true,
      triggers: [
        { type: 'manual', condition: '*', priority: 'medium', autoExecute: false },
      ],
      metadata: {
        owner: 'platform-team',
        reviewers: ['tech-lead'],
        reviewCycle: 30,
        tags: ['deployment', 'production'],
      },
      steps: [
        {
          id: 'pre-checks',
          order: 1,
          title: 'Pre-deployment Checks',
          description: 'Verify all tests pass and approval granted',
          expectedDuration: 5,
          automatable: true,
          checkpoints: ['CI/CD green', 'Code review approved', 'No active incidents'],
          raci: [
            { role: 'responsible', team: 'deployer' },
            { role: 'accountable', team: 'tech-lead' },
          ],
        },
        {
          id: 'backup',
          order: 2,
          title: 'Create Backup',
          description: 'Snapshot current state for rollback',
          expectedDuration: 10,
          automatable: true,
          dependencies: ['pre-checks'],
          raci: [
            { role: 'responsible', team: 'platform-team' },
          ],
        },
        {
          id: 'deploy-canary',
          order: 3,
          title: 'Deploy Canary',
          description: 'Deploy to 5% of traffic',
          expectedDuration: 15,
          automatable: true,
          dependencies: ['backup'],
          rollback: 'kubectl rollback deployment/app',
          raci: [
            { role: 'responsible', team: 'deployer' },
            { role: 'informed', team: 'oncall' },
          ],
        },
        {
          id: 'monitor-canary',
          order: 4,
          title: 'Monitor Canary',
          description: 'Watch metrics for 15 minutes',
          expectedDuration: 15,
          automatable: true,
          dependencies: ['deploy-canary'],
          checkpoints: ['Error rate < 0.1%', 'Latency p95 < 200ms'],
          raci: [
            { role: 'responsible', team: 'deployer' },
            { role: 'consulted', team: 'sre-team' },
          ],
        },
        {
          id: 'full-rollout',
          order: 5,
          title: 'Full Rollout',
          description: 'Deploy to 100% of traffic',
          expectedDuration: 20,
          automatable: true,
          dependencies: ['monitor-canary'],
          raci: [
            { role: 'responsible', team: 'deployer' },
            { role: 'accountable', team: 'tech-lead' },
            { role: 'informed', team: 'stakeholders' },
          ],
        },
        {
          id: 'verify-deployment',
          order: 6,
          title: 'Verify Deployment',
          description: 'Confirm deployment successful',
          expectedDuration: 10,
          automatable: true,
          dependencies: ['full-rollout'],
          checkpoints: ['Version tag correct', 'All pods healthy', 'Smoke tests pass'],
          raci: [
            { role: 'responsible', team: 'deployer' },
            { role: 'informed', team: 'all' },
          ],
        },
      ],
    });

    log.info('[Runbook] Standard PRISM runbooks created');
  }

  /**
   * Clears all data (for testing).
   */
  clear(): void {
    this.runbooks.clear();
    this.executions.clear();
    this.executionCounter = 0;
  }
}

export const runbookEngine = new RunbookEngine();
