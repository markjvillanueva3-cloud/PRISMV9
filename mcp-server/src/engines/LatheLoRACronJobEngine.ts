/**
 * LatheLoRACronJobEngine — LATHE-LORA-MS0 U-LLR32
 * ================================================
 *
 * Schedules and executes LatheLoRA maintenance jobs.
 * Handles periodic tasks like drift checks and backups.
 *
 * Features:
 *   - Cron expression parsing
 *   - Job scheduling and execution
 *   - Execution history tracking
 *   - Job dependencies
 *
 * @module engines/LatheLoRACronJobEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Job status */
export type JobStatus = "scheduled" | "running" | "completed" | "failed" | "disabled";

/** Job type */
export type JobType =
  | "drift_check"
  | "backup"
  | "metrics_export"
  | "model_health"
  | "cleanup"
  | "retraining"
  | "custom";

/** Cron job definition */
export interface CronJob {
  id: string;
  name: string;
  type: JobType;
  cron_expression: string;
  enabled: boolean;
  model_id?: string;
  config?: Record<string, unknown>;
  last_run?: number;
  next_run?: number;
  run_count: number;
  failure_count: number;
}

/** Job execution record */
export interface JobExecution {
  id: string;
  job_id: string;
  started_at: number;
  completed_at?: number;
  status: JobStatus;
  duration_ms?: number;
  result?: Record<string, unknown>;
  error?: string;
}

/** Parsed cron expression */
export interface ParsedCron {
  minute: number[];
  hour: number[];
  day_of_month: number[];
  month: number[];
  day_of_week: number[];
}

/** Engine configuration */
export interface CronConfig {
  max_concurrent_jobs: number;
  default_timeout_ms: number;
  retry_on_failure: boolean;
  max_retries: number;
  execution_history_limit: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: CronConfig = {
  max_concurrent_jobs: 3,
  default_timeout_ms: 300000, // 5 minutes
  retry_on_failure: true,
  max_retries: 3,
  execution_history_limit: 100,
};

/** Pre-defined job templates */
const JOB_TEMPLATES: Record<JobType, Partial<CronJob>> = {
  drift_check: {
    name: "Drift Detection Check",
    cron_expression: "0 */6 * * *", // Every 6 hours
    config: { threshold: 1.5 },
  },
  backup: {
    name: "Model Checkpoint Backup",
    cron_expression: "0 0 * * *", // Daily at midnight
    config: { retention_days: 30 },
  },
  metrics_export: {
    name: "Metrics Export",
    cron_expression: "0 * * * *", // Every hour
    config: { format: "json" },
  },
  model_health: {
    name: "Model Health Check",
    cron_expression: "*/15 * * * *", // Every 15 minutes
    config: { ping_timeout_ms: 5000 },
  },
  cleanup: {
    name: "Old Data Cleanup",
    cron_expression: "0 3 * * 0", // Weekly on Sunday at 3 AM
    config: { max_age_days: 90 },
  },
  retraining: {
    name: "Scheduled Retraining",
    cron_expression: "0 2 * * 6", // Weekly on Saturday at 2 AM
    config: { min_samples: 100 },
  },
  custom: {
    name: "Custom Job",
    cron_expression: "0 0 * * *",
    config: {},
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRACronJobEngine {
  private config: CronConfig = DEFAULT_CONFIG;
  private jobs: Map<string, CronJob> = new Map();
  private executions: JobExecution[] = [];
  private runningJobs: Set<string> = new Set();

  /**
   * Set configuration
   */
  setConfig(config: Partial<CronConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): CronConfig {
    return { ...this.config };
  }

  /**
   * Create job from template
   */
  createJob(
    type: JobType,
    modelId?: string,
    overrides?: Partial<CronJob>
  ): CronJob {
    const template = JOB_TEMPLATES[type];

    const job: CronJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: template.name || "Unnamed Job",
      type,
      cron_expression: template.cron_expression || "0 0 * * *",
      enabled: true,
      model_id: modelId,
      config: { ...template.config },
      run_count: 0,
      failure_count: 0,
      ...overrides,
    };

    // Calculate next run
    job.next_run = this.calculateNextRun(job.cron_expression);

    this.jobs.set(job.id, job);
    log.info(`Created cron job: ${job.id} (${job.name})`);

    return job;
  }

  /**
   * Parse cron expression
   */
  parseCron(expression: string): ParsedCron | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return null;

    try {
      return {
        minute: this.parseCronField(parts[0], 0, 59),
        hour: this.parseCronField(parts[1], 0, 23),
        day_of_month: this.parseCronField(parts[2], 1, 31),
        month: this.parseCronField(parts[3], 1, 12),
        day_of_week: this.parseCronField(parts[4], 0, 6),
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse single cron field
   */
  private parseCronField(field: string, min: number, max: number): number[] {
    if (field === "*") {
      return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }

    const values: number[] = [];

    for (const part of field.split(",")) {
      if (part.includes("/")) {
        const [range, step] = part.split("/");
        const stepNum = parseInt(step, 10);
        const start = range === "*" ? min : parseInt(range, 10);
        for (let i = start; i <= max; i += stepNum) {
          values.push(i);
        }
      } else if (part.includes("-")) {
        const [start, end] = part.split("-").map(n => parseInt(n, 10));
        for (let i = start; i <= end; i++) {
          values.push(i);
        }
      } else {
        values.push(parseInt(part, 10));
      }
    }

    return [...new Set(values)].filter(v => v >= min && v <= max).sort((a, b) => a - b);
  }

  /**
   * Calculate next run time
   */
  calculateNextRun(cronExpression: string, fromTime?: number): number {
    const parsed = this.parseCron(cronExpression);
    if (!parsed) return Date.now() + 3600000; // Default to 1 hour

    const now = new Date(fromTime || Date.now());
    now.setSeconds(0);
    now.setMilliseconds(0);

    // Simple forward search (limited to 1 year)
    const maxIterations = 525600; // Minutes in a year
    let candidate = new Date(now.getTime() + 60000); // Start 1 minute ahead

    for (let i = 0; i < maxIterations; i++) {
      const minute = candidate.getMinutes();
      const hour = candidate.getHours();
      const dayOfMonth = candidate.getDate();
      const month = candidate.getMonth() + 1;
      const dayOfWeek = candidate.getDay();

      if (
        parsed.minute.includes(minute) &&
        parsed.hour.includes(hour) &&
        parsed.day_of_month.includes(dayOfMonth) &&
        parsed.month.includes(month) &&
        parsed.day_of_week.includes(dayOfWeek)
      ) {
        return candidate.getTime();
      }

      candidate = new Date(candidate.getTime() + 60000);
    }

    return Date.now() + 3600000;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by type
   */
  getJobsByType(type: JobType): CronJob[] {
    return Array.from(this.jobs.values()).filter(j => j.type === type);
  }

  /**
   * Get jobs by model
   */
  getJobsByModel(modelId: string): CronJob[] {
    return Array.from(this.jobs.values()).filter(j => j.model_id === modelId);
  }

  /**
   * Enable/disable job
   */
  setJobEnabled(jobId: string, enabled: boolean): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.enabled = enabled;
    if (enabled) {
      job.next_run = this.calculateNextRun(job.cron_expression);
    }

    return true;
  }

  /**
   * Update job schedule
   */
  updateSchedule(jobId: string, cronExpression: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (!this.parseCron(cronExpression)) {
      return false;
    }

    job.cron_expression = cronExpression;
    job.next_run = this.calculateNextRun(cronExpression);

    return true;
  }

  /**
   * Delete job
   */
  deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * Check for due jobs
   */
  getDueJobs(): CronJob[] {
    const now = Date.now();
    return Array.from(this.jobs.values())
      .filter(j => j.enabled && j.next_run && j.next_run <= now)
      .filter(j => !this.runningJobs.has(j.id));
  }

  /**
   * Start job execution
   */
  startExecution(jobId: string): JobExecution | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    if (this.runningJobs.size >= this.config.max_concurrent_jobs) {
      return null;
    }

    const execution: JobExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      job_id: jobId,
      started_at: Date.now(),
      status: "running",
    };

    this.executions.push(execution);
    this.runningJobs.add(jobId);

    // Trim history
    if (this.executions.length > this.config.execution_history_limit) {
      this.executions = this.executions.slice(-this.config.execution_history_limit);
    }

    return execution;
  }

  /**
   * Complete job execution
   */
  completeExecution(
    executionId: string,
    result?: Record<string, unknown>,
    error?: string
  ): JobExecution | null {
    const execution = this.executions.find(e => e.id === executionId);
    if (!execution) return null;

    execution.completed_at = Date.now();
    execution.duration_ms = execution.completed_at - execution.started_at;
    execution.status = error ? "failed" : "completed";
    execution.result = result;
    execution.error = error;

    // Update job stats
    const job = this.jobs.get(execution.job_id);
    if (job) {
      job.run_count++;
      job.last_run = execution.completed_at;
      job.next_run = this.calculateNextRun(job.cron_expression);

      if (error) {
        job.failure_count++;
      }

      this.runningJobs.delete(job.id);
    }

    return execution;
  }

  /**
   * Get execution history
   */
  getExecutions(jobId?: string, limit?: number): JobExecution[] {
    let executions = [...this.executions];

    if (jobId) {
      executions = executions.filter(e => e.job_id === jobId);
    }

    return limit ? executions.slice(-limit) : executions;
  }

  /**
   * Get job statistics
   */
  getJobStats(jobId: string): {
    total_runs: number;
    success_rate: number;
    avg_duration_ms: number;
    last_status: JobStatus;
  } | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const executions = this.executions.filter(e => e.job_id === jobId);
    const completed = executions.filter(e => e.status === "completed");
    const durations = completed
      .filter(e => e.duration_ms)
      .map(e => e.duration_ms!);

    return {
      total_runs: job.run_count,
      success_rate: job.run_count > 0
        ? ((job.run_count - job.failure_count) / job.run_count) * 100
        : 0,
      avg_duration_ms: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      last_status: executions.length > 0
        ? executions[executions.length - 1].status
        : "scheduled",
    };
  }

  /**
   * Get schedule summary
   */
  getScheduleSummary(): string {
    const jobs = this.getAllJobs();
    const now = Date.now();

    const lines = [
      `Cron Job Schedule`,
      `=================`,
      `Total Jobs: ${jobs.length}`,
      `Running: ${this.runningJobs.size}`,
      ``,
    ];

    for (const job of jobs.sort((a, b) => (a.next_run || 0) - (b.next_run || 0))) {
      const status = job.enabled ? "✓" : "✗";
      const nextIn = job.next_run
        ? `${Math.round((job.next_run - now) / 60000)} min`
        : "N/A";
      lines.push(`${status} ${job.name} (${job.type}): next in ${nextIn}`);
    }

    return lines.join("\n");
  }

  /**
   * Validate cron expression
   */
  validateCron(expression: string): {
    valid: boolean;
    error?: string;
    next_runs?: number[];
  } {
    const parsed = this.parseCron(expression);

    if (!parsed) {
      return {
        valid: false,
        error: "Invalid cron expression format. Expected: minute hour day month weekday",
      };
    }

    // Calculate next 5 runs
    const next_runs: number[] = [];
    let current = Date.now();
    for (let i = 0; i < 5; i++) {
      const next = this.calculateNextRun(expression, current);
      next_runs.push(next);
      current = next + 60000;
    }

    return { valid: true, next_runs };
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.jobs.clear();
    this.executions = [];
    this.runningJobs.clear();
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRACronJobEngine = new LatheLoRACronJobEngine();
