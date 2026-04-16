/**
 * QueueEngine — L2-P3-MS1 Infrastructure Layer
 *
 * In-memory job queue with priority levels, retry policies,
 * dead-letter queue, and job lifecycle management.
 *
 * Actions: queue_enqueue, queue_dequeue, queue_status, queue_retry,
 *          queue_cancel, queue_list, queue_stats
 */

// ============================================================================
// TYPES
// ============================================================================

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "dead_letter";
/** Job Priority type definition.
 */
export type JobPriority = "critical" | "high" | "normal" | "low";

/** Queue Job configuration/data structure.
 */
export interface QueueJob<T = unknown> {
  id: string;
  queue_name: string;
  payload: T;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  result?: unknown;
  timeout_sec: number;
  delay_until?: string;
}

/** Queue Stats configuration/data structure.
 */
export interface QueueStats {
  queue_name: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  dead_letter: number;
  total_processed: number;
  avg_processing_time_ms: number;
}

/** Enqueue Options configuration/data structure.
 */
export interface EnqueueOptions {
  priority?: JobPriority;
  max_attempts?: number;
  timeout_sec?: number;
  delay_sec?: number;
}

// ============================================================================
// PRIORITY MAP
// ============================================================================

const PRIORITY_ORDER: Record<JobPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };

// ============================================================================
// ENGINE CLASS
// ============================================================================

let jobIdCounter = 0;

/** Queue Engine engine/manager.
 */
export class QueueEngine {
  private jobs = new Map<string, QueueJob>();
  private processingTimes: number[] = [];

  enqueue<T = unknown>(queueName: string, payload: T, options?: EnqueueOptions): QueueJob<T> {
    jobIdCounter++;
    const id = `JOB-${String(jobIdCounter).padStart(6, "0")}`;
    const now = new Date();

    const job: QueueJob<T> = {
      id, queue_name: queueName, payload,
      priority: options?.priority || "normal",
      status: "pending",
      attempts: 0,
      max_attempts: options?.max_attempts || 3,
      created_at: now.toISOString(),
      timeout_sec: options?.timeout_sec || 300,
      delay_until: options?.delay_sec ? new Date(now.getTime() + options.delay_sec * 1000).toISOString() : undefined,
    };

    this.jobs.set(id, job as QueueJob);
    return job;
  }

  /** Dequeue.
   * @param queueName - queue name
   * @returns queue job | undefined
   */
  dequeue(queueName: string): QueueJob | undefined {
    const now = Date.now();
    const pending = [...this.jobs.values()]
      .filter(j => j.queue_name === queueName && j.status === "pending")
      .filter(j => !j.delay_until || new Date(j.delay_until).getTime() <= now)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const job = pending[0];
    if (!job) return undefined;

    job.status = "processing";
    job.started_at = new Date().toISOString();
    job.attempts++;
    return job;
  }

  /** Complete.
   * @param jobId - job id
   * @param result - result
   * @returns true if condition is met
   */
  complete(jobId: string, result?: unknown): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "processing") return false;

    job.status = "completed";
    job.completed_at = new Date().toISOString();
    job.result = result;

    /** If.
     * @param job.started_at - job.started_at
     * @returns void
     */
    if (job.started_at) {
      const elapsed = Date.now() - new Date(job.started_at).getTime();
      this.processingTimes.push(elapsed);
      if (this.processingTimes.length > 1000) this.processingTimes.shift();
    }

    return true;
  }

  /** Fail.
   * @param jobId - job id
   * @param error - error
   * @returns true if condition is met
   */
  fail(jobId: string, error: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "processing") return false;

    job.error = error;

    /** If.
     * @param job.attempts - job.attempts
     * @returns void
     */
    if (job.attempts < job.max_attempts) {
      job.status = "pending"; // Will be retried
    } else {
      job.status = "dead_letter";
    }

    return true;
  }

  /** Checks whether cancel.
   * @param jobId - job id
   * @returns true if condition is met
   */
  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "completed") return false;
    job.status = "cancelled";
    return true;
  }

  /** Retry.
   * @param jobId - job id
   * @returns true if condition is met
   */
  retry(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== "failed" && job.status !== "dead_letter")) return false;
    job.status = "pending";
    job.attempts = 0;
    job.error = undefined;
    return true;
  }

  /** Gets job.
   * @param jobId - job id
   * @returns queue job | undefined
   */
  getJob(jobId: string): QueueJob | undefined {
    return this.jobs.get(jobId);
  }

  /** List Jobs.
   * @param queueName - queue name
   * @param status - status
   * @returns queue job[]
   */
  listJobs(queueName: string, status?: JobStatus): QueueJob[] {
    let result = [...this.jobs.values()].filter(j => j.queue_name === queueName);
    if (status) result = result.filter(j => j.status === status);
    return result;
  }

  /** Stats.
   * @param queueName - queue name
   * @returns queue stats
   */
  stats(queueName: string): QueueStats {
    const jobs = [...this.jobs.values()].filter(j => j.queue_name === queueName);
    const counts: Record<JobStatus, number> = { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, dead_letter: 0 };
    for (const j of jobs) counts[j.status]++;

    const avgTime = this.processingTimes.length > 0
      ? Math.round(this.processingTimes.reduce((s, v) => s + v, 0) / this.processingTimes.length)
      : 0;

    return {
      queue_name: queueName,
      pending: counts.pending,
      processing: counts.processing,
      completed: counts.completed,
      failed: counts.failed + counts.cancelled,
      dead_letter: counts.dead_letter,
      total_processed: counts.completed + counts.failed + counts.cancelled,
      avg_processing_time_ms: avgTime,
    };
  }

  /** List Queues.
   * @returns string[]
   */
  listQueues(): string[] {
    const queues = new Set<string>();
    for (const j of this.jobs.values()) queues.add(j.queue_name);
    return [...queues];
  }

  /** Purge.
   * @param queueName - queue name
   * @param status - status
   * @returns computed numeric result
   */
  purge(queueName: string, status: JobStatus = "completed"): number {
    let count = 0;
    /** For.
     * @param const - const
     * @param job] - job]
     * @returns void
     */
    for (const [id, job] of this.jobs) {
      /** If.
       * @param job.queue_name - job.queue_name
       * @returns void
       */
      if (job.queue_name === queueName && job.status === status) {
        this.jobs.delete(id);
        count++;
      }
    }
    return count;
  }

  /** Clear.
   * @returns void { this.jobs.clear(); this.processing times = []; job id counter = 0; }
   */
  clear(): void { this.jobs.clear(); this.processingTimes = []; jobIdCounter = 0; }
}

/** Queue Engine constant.
 */
export const queueEngine = new QueueEngine();
