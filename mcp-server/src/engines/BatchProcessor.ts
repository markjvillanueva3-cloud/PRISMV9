/**
 * PRISM D4 — Batch Processor
 * =============================
 * 
 * Priority queue for bulk operations integrated with cadence ticks.
 * Safety-critical calculations bypass batching and execute immediately.
 * Fail-fast isolation: failed operations don't block the queue.
 * 
 * Priority levels:
 * - CRITICAL (0): Safety calcs — immediate execution, never batched
 * - HIGH (1): Active manufacturing calcs — next cadence tick
 * - NORMAL (2): Data lookups, searches — batched at cadence
 * - LOW (3): Stats, logging, cleanup — deferred
 * 
 * IMPORTED BY: cadenceExecutor.ts
 * ZERO TOKEN COST — pure server-side execution
 * 
 * @version 1.0.0
 * @date 2026-02-09
 * @dimension D4 — Performance & Caching
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type BatchPriority = 0 | 1 | 2 | 3;
export const PRIORITY_LABELS: Record<BatchPriority, string> = {
  0: "CRITICAL", 1: "HIGH", 2: "NORMAL", 3: "LOW",
};

export interface BatchItem {
  id: string;
  priority: BatchPriority;
  action: string;
  params: Record<string, any>;
  callback?: (result: any) => void;
  added_at: number;
  max_age_ms: number;        // auto-expire if not processed
  retry_count: number;
  max_retries: number;
}

export interface BatchResult {
  id: string;
  status: "success" | "failed" | "expired" | "skipped";
  result?: any;
  error?: string;
  duration_ms: number;
}

export interface BatchStats {
  total_queued: number;
  total_processed: number;
  total_failed: number;
  total_expired: number;
  current_queue_size: number;
  queue_by_priority: Record<number, number>;
  avg_wait_ms: number;
  avg_process_ms: number;
}

const STATE_DIR = "C:\\PRISM\\state";
const BATCH_STATS_FILE = path.join(STATE_DIR, "d4_batch_stats.json");
const MAX_QUEUE_SIZE = 200;
const DEFAULT_MAX_AGE_MS = 60_000;  // 1 minute max age
const DEFAULT_MAX_RETRIES = 2;
const MAX_BATCH_PER_TICK = 10;      // process up to 10 items per cadence tick

// ============================================================================
// BATCH PROCESSOR CLASS
// ============================================================================

class BatchProcessor {
  private queue: BatchItem[] = [];
  private stats: BatchStats = {
    total_queued: 0, total_processed: 0, total_failed: 0,
    total_expired: 0, current_queue_size: 0,
    queue_by_priority: { 0: 0, 1: 0, 2: 0, 3: 0 },
    avg_wait_ms: 0, avg_process_ms: 0,
  };
  private waitTimes: number[] = [];
  private processTimes: number[] = [];
  private processorFn: ((action: string, params: Record<string, any>) => Promise<any>) | null = null;

  /**
   * Register the processor function (called once at startup).
   * This is how batch items actually get executed.
   */
  registerProcessor(fn: (action: string, params: Record<string, any>) => Promise<any>): void {
    this.processorFn = fn;
  }

  /**
   * Add item to batch queue
   */
  enqueue(
    action: string,
    params: Record<string, any>,
    priority: BatchPriority = 2,
    options?: { max_age_ms?: number; max_retries?: number; callback?: (r: any) => void }
  ): string {
    const id = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // CRITICAL priority items execute immediately, never queued
    if (priority === 0) {
      // We don't actually batch these — they're markers for the caller
      return id;
    }

    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Drop lowest priority item
      this.queue.sort((a, b) => b.priority - a.priority); // lowest priority last
      const dropped = this.queue.pop();
      if (dropped) {
        this.stats.total_expired++;
        this.stats.queue_by_priority[dropped.priority]--;
      }
    }

    const item: BatchItem = {
      id, priority, action, params,
      callback: options?.callback,
      added_at: Date.now(),
      max_age_ms: options?.max_age_ms || DEFAULT_MAX_AGE_MS,
      retry_count: 0,
      max_retries: options?.max_retries ?? DEFAULT_MAX_RETRIES,
    };

    this.queue.push(item);
    this.stats.total_queued++;
    this.stats.current_queue_size = this.queue.length;
    this.stats.queue_by_priority[priority] = (this.stats.queue_by_priority[priority] || 0) + 1;

    return id;
  }

  /**
   * Process batch items — called by cadence tick.
   * Processes up to MAX_BATCH_PER_TICK items per call, highest priority first.
   */
  async processTick(): Promise<BatchResult[]> {
    if (this.queue.length === 0 || !this.processorFn) return [];

    const now = Date.now();
    const results: BatchResult[] = [];

    // Remove expired items first
    const expired = this.queue.filter(item => now - item.added_at > item.max_age_ms);
    for (const item of expired) {
      this.stats.total_expired++;
      this.stats.queue_by_priority[item.priority]--;
      results.push({ id: item.id, status: "expired", duration_ms: 0 });
    }
    this.queue = this.queue.filter(item => now - item.added_at <= item.max_age_ms);

    // Sort by priority (0=highest) then by age (oldest first)
    this.queue.sort((a, b) => a.priority - b.priority || a.added_at - b.added_at);

    // Process up to MAX_BATCH_PER_TICK
    const batch = this.queue.splice(0, MAX_BATCH_PER_TICK);

    for (const item of batch) {
      const start = Date.now();
      this.stats.queue_by_priority[item.priority]--;
      const waitTime = start - item.added_at;
      this.waitTimes.push(waitTime);

      try {
        const result = await this.processorFn(item.action, item.params);
        const duration = Date.now() - start;
        this.processTimes.push(duration);
        this.stats.total_processed++;

        if (item.callback) {
          try { item.callback(result); } catch { /* non-fatal */ }
        }

        results.push({ id: item.id, status: "success", result, duration_ms: duration });
      } catch (err: any) {
        const duration = Date.now() - start;
        item.retry_count++;

        if (item.retry_count < item.max_retries) {
          // Re-queue for retry
          this.queue.push(item);
          this.stats.queue_by_priority[item.priority]++;
        } else {
          this.stats.total_failed++;
          results.push({
            id: item.id, status: "failed",
            error: err.message?.slice(0, 200) || "Unknown error",
            duration_ms: duration,
          });
        }
      }
    }

    // Update running averages (keep last 100)
    if (this.waitTimes.length > 100) this.waitTimes = this.waitTimes.slice(-100);
    if (this.processTimes.length > 100) this.processTimes = this.processTimes.slice(-100);
    this.stats.avg_wait_ms = this.waitTimes.reduce((a, b) => a + b, 0) / (this.waitTimes.length || 1);
    this.stats.avg_process_ms = this.processTimes.reduce((a, b) => a + b, 0) / (this.processTimes.length || 1);
    this.stats.current_queue_size = this.queue.length;

    return results;
  }

  getStats(): BatchStats { return { ...this.stats }; }
  getQueueSize(): number { return this.queue.length; }

  persistStats(): void {
    try {
      fs.writeFileSync(BATCH_STATS_FILE, JSON.stringify(this.getStats(), null, 2));
    } catch { /* non-fatal */ }
  }

  /**
   * Drain queue (for shutdown)
   */
  drain(): BatchItem[] {
    const items = [...this.queue];
    this.queue = [];
    this.stats.current_queue_size = 0;
    return items;
  }
}

// Singleton export
export const batchProcessor = new BatchProcessor();
