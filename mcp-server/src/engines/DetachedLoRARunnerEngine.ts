/**
 * DetachedLoRARunnerEngine (U-LPR-GPU-ASYNC)
 *
 * State machine + bounded queue for long-running detached LoRA training
 * jobs. The actual process-spawning is caller-injected (via
 * `ProcessLauncher`) so this engine stays pure and testable — it owns
 * the lifecycle book-keeping, not the nohup invocation.
 *
 * Lifecycle: queued → running → (paused ↔ running)* → {completed,
 * aborted, failed, killed}. Transitions auto-stamp timestamps; the
 * engine refuses illegal transitions (e.g. resuming a completed job)
 * rather than silently no-op.
 *
 * Capacity protocol (plan spec):
 *   - Bounded FIFO queue — default 32 slots.
 *   - On submit when full: HTTP-429 shed semantics. Engine throws a
 *     QueueSaturatedError tagged with retry_after_ms (≥ p95 service
 *     time × remaining_queue / concurrency). Callers translate to 429.
 *   - Single concurrency slot per GPU (configurable).
 *   - Pause does NOT free the GPU slot (the job still owns memory).
 *   - Kill releases the GPU slot and frees the queue.
 *
 * State is in-memory (engine is pure); persistence sits in the caller —
 * typically `data/lora/runner-state.json` with schemaVersion 1.
 *
 * Refs:
 *   - Netflix Hystrix paper (2012) on bounded-queue shed-load patterns.
 *   - POSIX nohup(1) for process detachment idioms.
 *   - Linux SIGSTOP/SIGCONT for pause/resume (windows uses suspend/
 *     resume thread APIs — abstracted via ProcessLauncher).
 */

export type JobStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "aborted"
  | "failed"
  | "killed";

export interface ProcessLauncher {
  /** Spawn a detached OS process; returns platform PID. */
  spawn(cmd: string, args: string[], cwd?: string): number;
  /** SIGSTOP on POSIX, suspend on Windows. */
  pause(pid: number): void;
  /** SIGCONT on POSIX, resume on Windows. */
  resume(pid: number): void;
  /** SIGKILL on POSIX, TerminateProcess on Windows. */
  kill(pid: number): void;
  /** Liveness probe. */
  isAlive(pid: number): boolean;
}

export interface JobRequest {
  job_id: string;
  experiment_id: string;
  command: string;
  args: string[];
  cwd?: string;
  gpu_id?: string;            // device pin, e.g. "cuda:0"
  priority?: number;          // higher = earlier; default 0
  timeout_ms?: number;        // hard kill after this many ms
  enqueued_by: string;
}

export interface Job {
  job_id: string;
  experiment_id: string;
  command: string;
  args: string[];
  cwd?: string;
  gpu_id?: string;
  priority: number;
  timeout_ms?: number;
  enqueued_by: string;
  status: JobStatus;
  pid?: number;
  enqueued_at: number;
  started_at?: number;
  paused_at?: number;
  resumed_at?: number;
  completed_at?: number;
  exit_code?: number;
  error?: string;
  pause_count: number;
  cumulative_pause_ms: number;
}

export interface QueueStatus {
  capacity: number;
  queued_count: number;
  running_count: number;
  available_slots: number;
  is_saturated: boolean;
  concurrency: number;
  p95_service_time_ms: number;
}

export class QueueSaturatedError extends Error {
  retry_after_ms: number;
  constructor(msg: string, retry_after_ms: number) {
    super(msg);
    this.name = "QueueSaturatedError";
    this.retry_after_ms = retry_after_ms;
  }
}

const DEFAULT_CAPACITY = 32;
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_P95_SERVICE_TIME_MS = 20 * 60 * 1000; // 20-min LoRA epoch

export class DetachedLoRARunnerEngine {
  private queue: Job[] = [];
  private jobs = new Map<string, Job>();
  private completedOrder: string[] = [];
  private capacity = DEFAULT_CAPACITY;
  private concurrency = DEFAULT_CONCURRENCY;
  private p95ServiceMs = DEFAULT_P95_SERVICE_TIME_MS;
  private launcher: ProcessLauncher;
  private recentServiceTimes: number[] = [];

  constructor(launcher: ProcessLauncher) {
    this.launcher = launcher;
  }

  configure(opts: {
    capacity?: number;
    concurrency?: number;
    p95_service_time_ms?: number;
  }): void {
    if (opts.capacity !== undefined) {
      if (opts.capacity < 1 || opts.capacity > 1024) {
        throw new Error("capacity must be in [1, 1024]");
      }
      this.capacity = opts.capacity;
    }
    if (opts.concurrency !== undefined) {
      if (opts.concurrency < 1 || opts.concurrency > 16) {
        throw new Error("concurrency must be in [1, 16]");
      }
      this.concurrency = opts.concurrency;
    }
    if (opts.p95_service_time_ms !== undefined) {
      if (opts.p95_service_time_ms <= 0) {
        throw new Error("p95_service_time_ms must be >0");
      }
      this.p95ServiceMs = opts.p95_service_time_ms;
    }
  }

  /** Enqueue a new job; throws QueueSaturatedError at capacity. */
  submit(req: JobRequest, now = Date.now()): Job {
    if (!req.job_id.trim()) throw new Error("job_id required");
    if (!req.experiment_id.trim()) throw new Error("experiment_id required");
    if (!req.command.trim()) throw new Error("command required");
    if (!req.enqueued_by.trim()) throw new Error("enqueued_by required");
    if (req.timeout_ms !== undefined && req.timeout_ms <= 0) {
      throw new Error("timeout_ms must be >0 when set");
    }
    if (this.jobs.has(req.job_id)) {
      throw new Error(`job_id ${req.job_id} already exists`);
    }
    const backlog = this.queue.length + this.runningCount();
    if (backlog >= this.capacity) {
      // Shed-load: estimate retry window as p95 × (backlog / concurrency).
      const retryAfter = Math.ceil(
        (this.p95ServiceMs * Math.max(1, this.queue.length)) / this.concurrency,
      );
      throw new QueueSaturatedError(
        `queue saturated (${backlog}/${this.capacity}) — retry after ${retryAfter} ms`,
        retryAfter,
      );
    }
    const job: Job = {
      job_id: req.job_id,
      experiment_id: req.experiment_id,
      command: req.command,
      args: [...req.args],
      cwd: req.cwd,
      gpu_id: req.gpu_id,
      priority: req.priority ?? 0,
      timeout_ms: req.timeout_ms,
      enqueued_by: req.enqueued_by,
      status: "queued",
      enqueued_at: now,
      pause_count: 0,
      cumulative_pause_ms: 0,
    };
    this.jobs.set(job.job_id, job);
    this.queue.push(job);
    // priority-order: highest priority first, then FIFO enqueued_at
    this.queue.sort((a, b) =>
      b.priority - a.priority || a.enqueued_at - b.enqueued_at,
    );
    return this.snapshot(job);
  }

  /**
   * Dispatch next eligible queued job if a GPU slot is free. Returns the
   * started job or null if no slot available / no queue head.
   */
  dispatchNext(now = Date.now()): Job | null {
    if (this.runningCount() >= this.concurrency) return null;
    const head = this.queue.shift();
    if (!head) return null;
    const pid = this.launcher.spawn(head.command, head.args, head.cwd);
    head.pid = pid;
    head.started_at = now;
    head.status = "running";
    return this.snapshot(head);
  }

  pause(job_id: string, now = Date.now()): Job {
    const job = this.mustFind(job_id);
    if (job.status !== "running") {
      throw new Error(`job ${job_id} status=${job.status}; can only pause running`);
    }
    if (job.pid === undefined) throw new Error("job has no pid");
    this.launcher.pause(job.pid);
    job.status = "paused";
    job.paused_at = now;
    job.pause_count += 1;
    return this.snapshot(job);
  }

  resume(job_id: string, now = Date.now()): Job {
    const job = this.mustFind(job_id);
    if (job.status !== "paused") {
      throw new Error(`job ${job_id} status=${job.status}; can only resume paused`);
    }
    if (job.pid === undefined) throw new Error("job has no pid");
    this.launcher.resume(job.pid);
    if (job.paused_at !== undefined) {
      job.cumulative_pause_ms += now - job.paused_at;
    }
    job.status = "running";
    job.resumed_at = now;
    job.paused_at = undefined;
    return this.snapshot(job);
  }

  /** Forced termination — counts toward SLA violations if within budget. */
  kill(job_id: string, reason: string, now = Date.now()): Job {
    if (!reason.trim() || reason.trim().length < 5) {
      throw new Error("kill reason must be ≥5 characters");
    }
    const job = this.mustFind(job_id);
    if (job.status === "completed" || job.status === "killed" || job.status === "aborted") {
      throw new Error(`job ${job_id} already terminal (${job.status})`);
    }
    if (job.pid !== undefined) this.launcher.kill(job.pid);
    if (job.status === "queued") {
      this.queue = this.queue.filter((q) => q.job_id !== job_id);
      job.status = "aborted";
    } else {
      job.status = "killed";
    }
    job.completed_at = now;
    job.error = reason.trim();
    this.completedOrder.push(job_id);
    return this.snapshot(job);
  }

  /** Caller notifies of natural exit from the spawned process. */
  markComplete(input: {
    job_id: string;
    exit_code: number;
    now?: number;
    error?: string;
  }): Job {
    const job = this.mustFind(input.job_id);
    if (job.status !== "running" && job.status !== "paused") {
      throw new Error(`job ${input.job_id} status=${job.status}; not completable`);
    }
    const now = input.now ?? Date.now();
    job.completed_at = now;
    job.exit_code = input.exit_code;
    job.status = input.exit_code === 0 ? "completed" : "failed";
    if (input.error) job.error = input.error.trim() || undefined;
    this.completedOrder.push(job.job_id);
    if (job.started_at !== undefined) {
      const service = now - job.started_at - job.cumulative_pause_ms;
      this.recentServiceTimes.push(service);
      // keep last 256 samples for p95 estimate
      if (this.recentServiceTimes.length > 256) this.recentServiceTimes.shift();
    }
    return this.snapshot(job);
  }

  /**
   * Timeout sweep — caller invokes periodically. Kills any running job
   * whose (now - started_at - cumulative_pause_ms) > timeout_ms.
   */
  sweepTimeouts(now = Date.now()): Job[] {
    const out: Job[] = [];
    for (const job of this.jobs.values()) {
      if (job.status !== "running" && job.status !== "paused") continue;
      if (job.timeout_ms === undefined || job.started_at === undefined) continue;
      const active_ms = now - job.started_at - job.cumulative_pause_ms;
      if (active_ms > job.timeout_ms) {
        out.push(this.kill(job.job_id, `timeout_ms ${job.timeout_ms} exceeded`, now));
      }
    }
    return out;
  }

  /** Re-queue a failed job with a fresh job_id for retry. */
  retry(job_id: string, new_job_id: string, now = Date.now()): Job {
    const job = this.mustFind(job_id);
    if (job.status !== "failed" && job.status !== "aborted" && job.status !== "killed") {
      throw new Error(`only failed/aborted/killed jobs can retry; got ${job.status}`);
    }
    if (this.jobs.has(new_job_id)) {
      throw new Error(`new_job_id ${new_job_id} already exists`);
    }
    return this.submit(
      {
        job_id: new_job_id,
        experiment_id: job.experiment_id,
        command: job.command,
        args: job.args,
        cwd: job.cwd,
        gpu_id: job.gpu_id,
        priority: job.priority + 1, // slight boost on retry
        timeout_ms: job.timeout_ms,
        enqueued_by: job.enqueued_by,
      },
      now,
    );
  }

  getJob(job_id: string): Job | null {
    const j = this.jobs.get(job_id);
    return j ? this.snapshot(j) : null;
  }

  listJobs(filter?: {
    status?: JobStatus;
    experiment_id?: string;
  }): Job[] {
    const out: Job[] = [];
    for (const j of this.jobs.values()) {
      if (filter?.status && j.status !== filter.status) continue;
      if (filter?.experiment_id && j.experiment_id !== filter.experiment_id) continue;
      out.push(this.snapshot(j));
    }
    return out;
  }

  queueStatus(): QueueStatus {
    const running = this.runningCount();
    const queued = this.queue.length;
    const backlog = running + queued;
    const p95 = this.estimateP95ServiceMs();
    return {
      capacity: this.capacity,
      queued_count: queued,
      running_count: running,
      available_slots: Math.max(0, this.capacity - backlog),
      is_saturated: backlog >= this.capacity,
      concurrency: this.concurrency,
      p95_service_time_ms: p95,
    };
  }

  /** Walk the jobs map + verify any PID the launcher still considers alive. */
  reconcileLiveness(now = Date.now()): Job[] {
    const drifted: Job[] = [];
    for (const j of this.jobs.values()) {
      if ((j.status === "running" || j.status === "paused") && j.pid !== undefined) {
        if (!this.launcher.isAlive(j.pid)) {
          this.markComplete({
            job_id: j.job_id,
            exit_code: -1,
            now,
            error: "process vanished (not alive per launcher)",
          });
          drifted.push(this.snapshot(j));
        }
      }
    }
    return drifted;
  }

  clearAll(): void {
    this.queue.length = 0;
    this.jobs.clear();
    this.completedOrder.length = 0;
    this.recentServiceTimes.length = 0;
  }

  private mustFind(id: string): Job {
    const j = this.jobs.get(id);
    if (!j) throw new Error(`job ${id} not found`);
    return j;
  }

  private runningCount(): number {
    let n = 0;
    for (const j of this.jobs.values()) {
      if (j.status === "running" || j.status === "paused") n += 1;
    }
    return n;
  }

  private snapshot(job: Job): Job {
    return { ...job, args: [...job.args] };
  }

  private estimateP95ServiceMs(): number {
    if (this.recentServiceTimes.length < 5) return this.p95ServiceMs;
    const sorted = this.recentServiceTimes.slice().sort((a, b) => a - b);
    const h = (sorted.length - 1) * 0.95;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    return lo === hi ? sorted[lo] : sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
  }
}

/**
 * In-memory fake launcher for tests / dev. Tracks spawned / paused /
 * killed PIDs without touching the host OS.
 */
export class InMemoryProcessLauncher implements ProcessLauncher {
  private nextPid = 1000;
  private alive = new Set<number>();
  private paused = new Set<number>();
  spawnLog: Array<{ pid: number; cmd: string; args: string[]; cwd?: string }> = [];
  killLog: Array<{ pid: number }> = [];

  spawn(cmd: string, args: string[], cwd?: string): number {
    const pid = this.nextPid++;
    this.alive.add(pid);
    this.spawnLog.push({ pid, cmd, args: [...args], cwd });
    return pid;
  }
  pause(pid: number): void {
    if (!this.alive.has(pid)) throw new Error(`pid ${pid} not alive`);
    this.paused.add(pid);
  }
  resume(pid: number): void {
    if (!this.paused.has(pid)) throw new Error(`pid ${pid} not paused`);
    this.paused.delete(pid);
  }
  kill(pid: number): void {
    this.alive.delete(pid);
    this.paused.delete(pid);
    this.killLog.push({ pid });
  }
  isAlive(pid: number): boolean {
    return this.alive.has(pid);
  }
  /** Test hook: simulate process natural death without a kill signal. */
  simulateExit(pid: number): void {
    this.alive.delete(pid);
    this.paused.delete(pid);
  }
}
