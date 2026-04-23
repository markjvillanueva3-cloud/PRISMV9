/**
 * PRISM Dead Letter Queue Engine
 *
 * Handles failed task claims and orchestration errors.
 * Provides retry policies, failure analysis, and manual intervention workflows.
 *
 * Features:
 * - Persists failed tasks to file/database for durability
 * - Configurable retry policies with exponential backoff
 * - Failure categorization (transient vs permanent)
 * - Manual retry/discard workflows
 * - Metrics and alerting integration
 *
 * @module engines/DeadLetterQueueEngine
 * @version 1.0.0
 */

import * as fs from "fs/promises";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { PATHS } from "../constants.js";

// ── Types ───────────────────────────────────────────────────────

export type FailureReason =
  | "lock_timeout"
  | "lock_conflict"
  | "heartbeat_missed"
  | "execution_error"
  | "validation_error"
  | "resource_exhausted"
  | "dependency_failed"
  | "manual_cancel"
  | "unknown";

export type FailureSeverity = "transient" | "permanent" | "unknown";

export interface DeadLetterEntry {
  id: string;
  taskType: "claim" | "milestone" | "pipeline" | "job";
  resource: string;
  milestoneId?: string;
  unitId?: string;
  instanceId?: string;

  // Failure details
  reason: FailureReason;
  severity: FailureSeverity;
  errorMessage: string;
  errorStack?: string;

  // Retry tracking
  attempts: number;
  maxRetries: number;
  firstFailedAt: string;
  lastFailedAt: string;
  nextRetryAt?: string;

  // Context
  context?: Record<string, unknown>;

  // Resolution
  status: "pending" | "retrying" | "resolved" | "discarded";
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableReasons: FailureReason[];
}

export interface DLQStats {
  pending: number;
  retrying: number;
  resolved: number;
  discarded: number;
  byReason: Record<FailureReason, number>;
  byTaskType: Record<string, number>;
  oldestPending?: string;
  averageAttempts: number;
}

// ── Default Policies ────────────────────────────────────────────

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 5,
  baseDelayMs: 5000,          // 5 seconds
  maxDelayMs: 5 * 60 * 1000,  // 5 minutes
  backoffMultiplier: 2,
  jitterMs: 1000,
  retryableReasons: [
    "lock_timeout",
    "lock_conflict",
    "heartbeat_missed",
    "resource_exhausted",
  ],
};

const TASK_TYPE_POLICIES: Record<string, Partial<RetryPolicy>> = {
  claim: {
    maxRetries: 3,
    baseDelayMs: 10000,       // 10 seconds
  },
  milestone: {
    maxRetries: 5,
    baseDelayMs: 30000,       // 30 seconds
    maxDelayMs: 15 * 60 * 1000, // 15 minutes
  },
  pipeline: {
    maxRetries: 2,
    baseDelayMs: 60000,       // 1 minute
    maxDelayMs: 30 * 60 * 1000, // 30 minutes
  },
  job: {
    maxRetries: 3,
    baseDelayMs: 5000,
  },
};

// ── Engine Implementation ───────────────────────────────────────

class DeadLetterQueueEngineImpl {
  private dlqDir: string;
  private entries = new Map<string, DeadLetterEntry>();
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private initialized = false;
  private onRetryCallback?: (entry: DeadLetterEntry) => Promise<boolean>;

  constructor() {
    this.dlqDir = path.join(PATHS.MCP_SERVER, "data", "dlq");
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.dlqDir, { recursive: true });
      await this.loadEntries();
      this.initialized = true;
      log.info(`[DLQ] Initialized with ${this.entries.size} pending entries`);
    } catch (err: any) {
      log.error(`[DLQ] Failed to initialize: ${err.message}`);
      throw err;
    }
  }

  /**
   * Load persisted DLQ entries from disk.
   */
  private async loadEntries(): Promise<void> {
    try {
      const files = await fs.readdir(this.dlqDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const content = await fs.readFile(path.join(this.dlqDir, file), "utf-8");
          const entry = JSON.parse(content) as DeadLetterEntry;
          this.entries.set(entry.id, entry);

          // Schedule retry if applicable
          if (entry.status === "pending" && entry.nextRetryAt) {
            this.scheduleRetry(entry);
          }
        } catch {
          // Skip invalid entries
        }
      }
    } catch {
      // Directory might not exist yet
    }
  }

  /**
   * Generate unique entry ID.
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `dlq-${timestamp}-${random}`;
  }

  /**
   * Persist an entry to disk.
   */
  private async persistEntry(entry: DeadLetterEntry): Promise<void> {
    const filePath = path.join(this.dlqDir, `${entry.id}.json`);
    await atomicWrite(filePath, JSON.stringify(entry, null, 2));
  }

  /**
   * Remove an entry from disk.
   */
  private async removeEntry(id: string): Promise<void> {
    const filePath = path.join(this.dlqDir, `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // Already removed
    }
  }

  /**
   * Get retry policy for a task type.
   */
  private getPolicy(taskType: string): RetryPolicy {
    const override = TASK_TYPE_POLICIES[taskType] ?? {};
    return { ...DEFAULT_RETRY_POLICY, ...override };
  }

  /**
   * Calculate next retry delay with exponential backoff and jitter.
   */
  private calculateRetryDelay(attempts: number, policy: RetryPolicy): number {
    const exponentialDelay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempts - 1);
    const cappedDelay = Math.min(exponentialDelay, policy.maxDelayMs);
    const jitter = Math.random() * policy.jitterMs;
    return cappedDelay + jitter;
  }

  /**
   * Categorize failure severity based on reason.
   */
  private categorizeSeverity(reason: FailureReason, policy: RetryPolicy): FailureSeverity {
    if (policy.retryableReasons.includes(reason)) {
      return "transient";
    }
    if (reason === "validation_error" || reason === "manual_cancel") {
      return "permanent";
    }
    return "unknown";
  }

  /**
   * Add a failed task to the dead letter queue.
   */
  async addFailure(params: {
    taskType: DeadLetterEntry["taskType"];
    resource: string;
    milestoneId?: string;
    unitId?: string;
    instanceId?: string;
    reason: FailureReason;
    errorMessage: string;
    errorStack?: string;
    context?: Record<string, unknown>;
  }): Promise<DeadLetterEntry> {
    if (!this.initialized) {
      await this.init();
    }

    const policy = this.getPolicy(params.taskType);
    const severity = this.categorizeSeverity(params.reason, policy);
    const now = new Date().toISOString();

    // Check for existing entry for same resource
    const existingId = Array.from(this.entries.values())
      .find(e => e.resource === params.resource && e.status === "pending")?.id;

    let entry: DeadLetterEntry;

    if (existingId) {
      // Update existing entry
      entry = this.entries.get(existingId)!;
      entry.attempts += 1;
      entry.lastFailedAt = now;
      entry.errorMessage = params.errorMessage;
      entry.errorStack = params.errorStack;

      if (entry.attempts >= policy.maxRetries) {
        entry.status = "discarded";
        log.warn(`[DLQ] Max retries exceeded for ${params.resource}, discarding`);
      } else if (severity === "permanent") {
        entry.status = "discarded";
        log.warn(`[DLQ] Permanent failure for ${params.resource}, discarding`);
      } else {
        const delay = this.calculateRetryDelay(entry.attempts, policy);
        entry.nextRetryAt = new Date(Date.now() + delay).toISOString();
        this.scheduleRetry(entry);
      }
    } else {
      // Create new entry
      entry = {
        id: this.generateId(),
        taskType: params.taskType,
        resource: params.resource,
        milestoneId: params.milestoneId,
        unitId: params.unitId,
        instanceId: params.instanceId,
        reason: params.reason,
        severity,
        errorMessage: params.errorMessage,
        errorStack: params.errorStack,
        attempts: 1,
        maxRetries: policy.maxRetries,
        firstFailedAt: now,
        lastFailedAt: now,
        context: params.context,
        status: "pending",
      };

      if (severity === "permanent") {
        entry.status = "discarded";
        log.warn(`[DLQ] Permanent failure for ${params.resource}, discarding immediately`);
      } else {
        const delay = this.calculateRetryDelay(1, policy);
        entry.nextRetryAt = new Date(Date.now() + delay).toISOString();
        this.scheduleRetry(entry);
      }

      this.entries.set(entry.id, entry);
    }

    await this.persistEntry(entry);
    log.info(`[DLQ] Added failure: ${params.resource} (${params.reason}), attempt ${entry.attempts}/${policy.maxRetries}`);

    return entry;
  }

  /**
   * Schedule automatic retry for an entry.
   */
  private scheduleRetry(entry: DeadLetterEntry): void {
    if (!entry.nextRetryAt) return;

    // Clear existing timer
    const existingTimer = this.retryTimers.get(entry.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const delayMs = new Date(entry.nextRetryAt).getTime() - Date.now();
    if (delayMs <= 0) {
      // Retry immediately
      this.executeRetry(entry);
      return;
    }

    const timer = setTimeout(() => {
      this.executeRetry(entry);
    }, delayMs);

    this.retryTimers.set(entry.id, timer);
  }

  /**
   * Execute a retry for an entry.
   */
  private async executeRetry(entry: DeadLetterEntry): Promise<void> {
    if (!this.onRetryCallback) {
      log.warn(`[DLQ] No retry callback registered, skipping retry for ${entry.resource}`);
      return;
    }

    entry.status = "retrying";
    await this.persistEntry(entry);

    try {
      const success = await this.onRetryCallback(entry);

      if (success) {
        await this.resolve(entry.id, "automatic_retry");
      } else {
        // Retry failed - addFailure will handle re-queueing
        entry.status = "pending";
        await this.persistEntry(entry);
      }
    } catch (err: any) {
      log.error(`[DLQ] Retry failed for ${entry.resource}: ${err.message}`);
      // Will be re-added via addFailure
      entry.status = "pending";
      await this.persistEntry(entry);
    }
  }

  /**
   * Register a callback for automatic retries.
   */
  onRetry(callback: (entry: DeadLetterEntry) => Promise<boolean>): void {
    this.onRetryCallback = callback;
  }

  /**
   * Manually retry a failed task.
   */
  async retry(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`DLQ entry not found: ${id}`);
    }

    if (entry.status !== "pending" && entry.status !== "discarded") {
      throw new Error(`Cannot retry entry with status: ${entry.status}`);
    }

    entry.status = "retrying";
    entry.attempts = 0; // Reset attempts for manual retry
    await this.persistEntry(entry);

    if (this.onRetryCallback) {
      try {
        const success = await this.onRetryCallback(entry);
        if (success) {
          await this.resolve(id, "manual_retry");
          return true;
        }
      } catch (err: any) {
        entry.attempts = 1;
        entry.lastFailedAt = new Date().toISOString();
        entry.status = "pending";
        await this.persistEntry(entry);
        throw err;
      }
    }

    entry.status = "pending";
    await this.persistEntry(entry);
    return false;
  }

  /**
   * Mark an entry as resolved.
   */
  async resolve(id: string, resolvedBy: string, notes?: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`DLQ entry not found: ${id}`);
    }

    // Clear retry timer
    const timer = this.retryTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(id);
    }

    entry.status = "resolved";
    entry.resolvedAt = new Date().toISOString();
    entry.resolvedBy = resolvedBy;
    entry.resolutionNotes = notes;

    await this.persistEntry(entry);
    log.info(`[DLQ] Resolved: ${entry.resource} by ${resolvedBy}`);
  }

  /**
   * Discard an entry (give up on retrying).
   */
  async discard(id: string, reason: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`DLQ entry not found: ${id}`);
    }

    // Clear retry timer
    const timer = this.retryTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(id);
    }

    entry.status = "discarded";
    entry.resolvedAt = new Date().toISOString();
    entry.resolutionNotes = reason;

    await this.persistEntry(entry);
    log.info(`[DLQ] Discarded: ${entry.resource} - ${reason}`);
  }

  /**
   * Permanently delete an entry.
   */
  async delete(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) return;

    // Clear retry timer
    const timer = this.retryTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(id);
    }

    this.entries.delete(id);
    await this.removeEntry(id);
    log.info(`[DLQ] Deleted: ${id}`);
  }

  /**
   * Get an entry by ID.
   */
  get(id: string): DeadLetterEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get entries by resource.
   */
  getByResource(resource: string): DeadLetterEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.resource === resource);
  }

  /**
   * Get entries by milestone.
   */
  getByMilestone(milestoneId: string): DeadLetterEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.milestoneId === milestoneId);
  }

  /**
   * List entries with filtering.
   */
  list(filter?: {
    status?: DeadLetterEntry["status"];
    taskType?: DeadLetterEntry["taskType"];
    reason?: FailureReason;
    limit?: number;
    offset?: number;
  }): DeadLetterEntry[] {
    let entries = Array.from(this.entries.values());

    if (filter?.status) {
      entries = entries.filter(e => e.status === filter.status);
    }
    if (filter?.taskType) {
      entries = entries.filter(e => e.taskType === filter.taskType);
    }
    if (filter?.reason) {
      entries = entries.filter(e => e.reason === filter.reason);
    }

    // Sort by lastFailedAt descending
    entries.sort((a, b) =>
      new Date(b.lastFailedAt).getTime() - new Date(a.lastFailedAt).getTime()
    );

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;

    return entries.slice(offset, offset + limit);
  }

  /**
   * Get DLQ statistics.
   */
  getStats(): DLQStats {
    const stats: DLQStats = {
      pending: 0,
      retrying: 0,
      resolved: 0,
      discarded: 0,
      byReason: {} as Record<FailureReason, number>,
      byTaskType: {},
      averageAttempts: 0,
    };

    let totalAttempts = 0;
    let oldestPendingTime = Infinity;

    for (const entry of this.entries.values()) {
      // Status counts
      stats[entry.status]++;

      // Reason counts
      stats.byReason[entry.reason] = (stats.byReason[entry.reason] ?? 0) + 1;

      // Task type counts
      stats.byTaskType[entry.taskType] = (stats.byTaskType[entry.taskType] ?? 0) + 1;

      // Attempt tracking
      totalAttempts += entry.attempts;

      // Oldest pending
      if (entry.status === "pending") {
        const failedTime = new Date(entry.firstFailedAt).getTime();
        if (failedTime < oldestPendingTime) {
          oldestPendingTime = failedTime;
          stats.oldestPending = entry.firstFailedAt;
        }
      }
    }

    stats.averageAttempts = this.entries.size > 0
      ? totalAttempts / this.entries.size
      : 0;

    return stats;
  }

  /**
   * Clean up old resolved/discarded entries.
   */
  async cleanup(maxAgeDays: number = 7): Promise<number> {
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const toDelete: string[] = [];

    for (const [id, entry] of this.entries) {
      if (entry.status === "resolved" || entry.status === "discarded") {
        const resolvedTime = entry.resolvedAt
          ? new Date(entry.resolvedAt).getTime()
          : 0;
        if (resolvedTime < cutoff) {
          toDelete.push(id);
        }
      }
    }

    for (const id of toDelete) {
      await this.delete(id);
    }

    if (toDelete.length > 0) {
      log.info(`[DLQ] Cleaned up ${toDelete.length} old entries`);
    }

    return toDelete.length;
  }

  /**
   * Export entries for analysis.
   */
  export(): DeadLetterEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Shutdown - clear timers and persist state.
   */
  async shutdown(): Promise<void> {
    // Clear all retry timers
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();

    log.info("[DLQ] Shutdown complete");
  }
}

// Singleton export
export const deadLetterQueueEngine = new DeadLetterQueueEngineImpl();

// Also export class for testing
export { DeadLetterQueueEngineImpl };
