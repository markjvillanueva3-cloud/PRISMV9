/**
 * HyperMillJobMonitor — AC + nightSHIFT Batch Job Status Monitor
 *
 * Tracks the lifecycle of hyperMILL Automation Center jobs and nightSHIFT
 * batch operations.  Polls the AC companion server (or mock) for progress
 * updates and emits structured events.
 *
 * Job lifecycle states:
 *   submitted → calculating → simulating → posting → complete
 *   (any state can transition to: failed | cancelled)
 *
 * Event types emitted:
 *   job_start     — job accepted by AC, initial state set
 *   progress      — progress update at configured interval (default every 10%)
 *   job_complete  — final state: complete with NC output info
 *   job_error     — final state: failed with error details
 *
 * @engine HyperMillJobMonitor
 * @shortcode E1168
 * @dispatcher camDispatcher
 * @actions hypermill_job_status (declared here)
 * @milestone HM-REV-MS9/U-HMR49
 */

// ─── Job State Types ──────────────────────────────────────────────────────────

export type HMJobState =
  | "submitted"
  | "calculating"
  | "simulating"
  | "posting"
  | "complete"
  | "failed"
  | "cancelled";

/** Valid transitions from a given state. */
export const JOB_STATE_TRANSITIONS: Record<HMJobState, readonly HMJobState[]> = {
  submitted:   ["calculating", "failed", "cancelled"],
  calculating: ["simulating", "posting", "complete", "failed", "cancelled"],
  simulating:  ["posting", "complete", "failed", "cancelled"],
  posting:     ["complete", "failed", "cancelled"],
  complete:    [],
  failed:      [],
  cancelled:   [],
};

/** Terminal states — no further transitions possible. */
export const TERMINAL_STATES = new Set<HMJobState>(["complete", "failed", "cancelled"]);

// ─── Job Record ───────────────────────────────────────────────────────────────

export interface HMJobRecord {
  jobId: string;
  jobName: string;
  state: HMJobState;
  /** Progress percentage [0, 100]. */
  progressPct: number;
  /** Estimated time remaining in milliseconds. */
  etaMs: number | undefined;
  /** When the job was submitted (Unix epoch ms). */
  submittedAt: number;
  /** When the job reached its current state (Unix epoch ms). */
  updatedAt: number;
  /** When the job entered a terminal state (Unix epoch ms). */
  completedAt: number | undefined;
  /** Description of the current operation being processed. */
  currentOperation: string | undefined;
  /** Error details if state === "failed". */
  errorMessage: string | undefined;
  /** Number of times the monitor has polled for this job. */
  pollCount: number;
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export type HMJobEventType = "job_start" | "progress" | "job_complete" | "job_error";

export interface HMJobEvent {
  type: HMJobEventType;
  jobId: string;
  jobName: string;
  state: HMJobState;
  progressPct: number;
  timestamp: number;
  message: string;
  errorMessage?: string;
  etaMs?: number;
}

export type HMJobEventListener = (event: HMJobEvent) => void;

// ─── Poll Response (from AC server) ──────────────────────────────────────────

interface ACJobStatusResponse {
  job_id: string;
  state: HMJobState;
  progress_pct?: number;
  eta_ms?: number;
  current_operation?: string;
  error?: string;
}

// ─── HyperMillJobMonitor ──────────────────────────────────────────────────────

/**
 * HyperMillJobMonitor
 *
 * Track and report on hyperMILL AC and nightSHIFT batch job progress.
 *
 * Usage:
 *   const monitor = new HyperMillJobMonitor({ mockMode: true });
 *   monitor.addListener((event) => console.log(event));
 *   const job = monitor.submitJob("batch_calculate", "NightShift_2025-04-04");
 *   // In real mode: starts polling AC server
 *   // In mock mode: simulates lifecycle automatically
 */
export class HyperMillJobMonitor {
  private readonly _mockMode: boolean;
  private readonly _acHost: string;
  private readonly _acPort: number;
  private readonly _pollIntervalMs: number;
  private readonly _progressEventThresholdPct: number;

  private readonly _jobs = new Map<string, HMJobRecord>();
  private readonly _timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly _listeners: HMJobEventListener[] = [];

  constructor(options: {
    mockMode?: boolean;
    acHost?: string;
    acPort?: number;
    /** How often to poll the AC server for job progress (ms). Default: 2000. */
    pollIntervalMs?: number;
    /** Emit progress events every N% change. Default: 10. */
    progressEventThresholdPct?: number;
  } = {}) {
    this._mockMode = options.mockMode ?? false;
    this._acHost = options.acHost ?? "127.0.0.1";
    this._acPort = options.acPort ?? 18365;
    this._pollIntervalMs = options.pollIntervalMs ?? 2_000;
    this._progressEventThresholdPct = options.progressEventThresholdPct ?? 10;
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  /**
   * Register an event listener for job lifecycle events.
   * @param listener - Callback that receives HMJobEvent objects.
   */
  addListener(listener: HMJobEventListener): void {
    this._listeners.push(listener);
  }

  /** Remove a previously registered listener. */
  removeListener(listener: HMJobEventListener): void {
    const idx = this._listeners.indexOf(listener);
    if (idx !== -1) this._listeners.splice(idx, 1);
  }

  private _emit(event: HMJobEvent): void {
    for (const listener of this._listeners) {
      try { listener(event); } catch { /* listener errors must not crash the monitor */ }
    }
  }

  // ── Job submission ─────────────────────────────────────────────────────────

  /**
   * Register a new job with the monitor and start tracking it.
   *
   * @param jobId   - Unique AC job identifier.
   * @param jobName - Human-readable job name.
   * @returns The initial HMJobRecord.
   */
  submitJob(jobId: string, jobName: string): HMJobRecord {
    const now = Date.now();
    const record: HMJobRecord = {
      jobId,
      jobName,
      state: "submitted",
      progressPct: 0,
      etaMs: undefined,
      submittedAt: now,
      updatedAt: now,
      completedAt: undefined,
      currentOperation: undefined,
      errorMessage: undefined,
      pollCount: 0,
    };

    this._jobs.set(jobId, record);

    this._emit({
      type: "job_start",
      jobId,
      jobName,
      state: "submitted",
      progressPct: 0,
      timestamp: now,
      message: `Job "${jobName}" (${jobId}) submitted to hyperMILL AC.`,
    });

    if (this._mockMode) {
      this._startMockProgression(jobId);
    } else {
      this._startPolling(jobId);
    }

    return record;
  }

  // ── State transition ───────────────────────────────────────────────────────

  /**
   * Transition a job to a new state.
   * Validates the transition is allowed.
   *
   * @param jobId    - Job to transition.
   * @param newState - Target state.
   * @param extras   - Optional fields to update on the record.
   * @returns Updated record or undefined if job not found.
   */
  transitionJob(
    jobId: string,
    newState: HMJobState,
    extras: {
      progressPct?: number;
      etaMs?: number;
      currentOperation?: string;
      errorMessage?: string;
    } = {}
  ): HMJobRecord | undefined {
    const record = this._jobs.get(jobId);
    if (!record) return undefined;

    const allowedTransitions = JOB_STATE_TRANSITIONS[record.state];
    if (!allowedTransitions.includes(newState)) {
      // Invalid transition — do not update, just return current record
      return record;
    }

    const prevProgressPct = record.progressPct;
    const now = Date.now();

    record.state = newState;
    record.updatedAt = now;

    if (extras.progressPct !== undefined) {
      record.progressPct = Math.min(100, Math.max(0, extras.progressPct));
    }
    if (extras.etaMs !== undefined) record.etaMs = extras.etaMs;
    if (extras.currentOperation !== undefined) record.currentOperation = extras.currentOperation;
    if (extras.errorMessage !== undefined) record.errorMessage = extras.errorMessage;

    if (TERMINAL_STATES.has(newState)) {
      record.completedAt = now;
      this._stopTracking(jobId);

      const eventType: HMJobEventType = newState === "complete" ? "job_complete" : "job_error";
      this._emit({
        type: eventType,
        jobId,
        jobName: record.jobName,
        state: newState,
        progressPct: record.progressPct,
        timestamp: now,
        message: newState === "complete"
          ? `Job "${record.jobName}" completed successfully.`
          : `Job "${record.jobName}" failed: ${record.errorMessage ?? "unknown error"}`,
        errorMessage: record.errorMessage,
      });
    } else {
      // Emit progress event if threshold crossed
      const delta = record.progressPct - prevProgressPct;
      if (delta >= this._progressEventThresholdPct) {
        this._emit({
          type: "progress",
          jobId,
          jobName: record.jobName,
          state: newState,
          progressPct: record.progressPct,
          timestamp: now,
          message: `Job "${record.jobName}": ${record.progressPct}% complete (${newState})`,
          etaMs: record.etaMs,
        });
      }
    }

    return record;
  }

  // ── Job queries ────────────────────────────────────────────────────────────

  /**
   * Get the current status of a job.
   * @param jobId - Job identifier.
   * @returns HMJobRecord or undefined if not tracked.
   */
  getJob(jobId: string): HMJobRecord | undefined {
    return this._jobs.get(jobId);
  }

  /**
   * Get all currently tracked jobs.
   * @returns Array of all HMJobRecord objects.
   */
  getAllJobs(): HMJobRecord[] {
    return Array.from(this._jobs.values());
  }

  /**
   * Get jobs in a specific state.
   * @param state - Filter by state.
   */
  getJobsByState(state: HMJobState): HMJobRecord[] {
    return Array.from(this._jobs.values()).filter((j) => j.state === state);
  }

  /**
   * Stop tracking a job and clean up its timer.
   * Call this when the job result is no longer needed.
   */
  removeJob(jobId: string): boolean {
    this._stopTracking(jobId);
    return this._jobs.delete(jobId);
  }

  // ── Internal polling / mock progression ───────────────────────────────────

  private _stopTracking(jobId: string): void {
    const timer = this._timers.get(jobId);
    if (timer !== undefined) {
      clearInterval(timer);
      this._timers.delete(jobId);
    }
  }

  /** Start polling the AC server for real job status. */
  private _startPolling(jobId: string): void {
    const interval = setInterval(async () => {
      const record = this._jobs.get(jobId);
      if (!record || TERMINAL_STATES.has(record.state)) {
        this._stopTracking(jobId);
        return;
      }

      try {
        const status = await this._pollACServer(jobId);
        if (status) {
          record.pollCount++;
          this.transitionJob(jobId, status.state, {
            progressPct: status.progress_pct,
            etaMs: status.eta_ms,
            currentOperation: status.current_operation,
            errorMessage: status.error,
          });
        }
      } catch {
        /* poll errors are non-fatal — next interval will retry */
      }
    }, this._pollIntervalMs);

    this._timers.set(jobId, interval);
  }

  private async _pollACServer(jobId: string): Promise<ACJobStatusResponse | null> {
    try {
      let fetchFn: typeof fetch;
      if (typeof globalThis.fetch === "function") {
        fetchFn = globalThis.fetch.bind(globalThis);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = await import("node-fetch" as any);
        fetchFn = (mod.default ?? mod) as unknown as typeof fetch;
      }

      const res = await fetchFn(
        `http://${this._acHost}:${this._acPort}/job-status?job_id=${encodeURIComponent(jobId)}`,
        { headers: { "X-PRISM-Client": "E1168" } }
      );

      if (!res.ok) return null;
      return await res.json() as ACJobStatusResponse;
    } catch {
      return null;
    }
  }

  /**
   * Mock progression — simulates the full job lifecycle automatically
   * using setTimeout calls, without any network activity.
   *
   * Timeline (wall clock):
   *   0ms     → submitted (already set in submitJob)
   *   50ms    → calculating (10%)
   *   100ms   → calculating (40%)
   *   150ms   → simulating (60%)
   *   200ms   → posting (80%)
   *   250ms   → complete (100%)
   */
  private _startMockProgression(jobId: string): void {
    const steps: Array<[number, () => void]> = [
      [50,  () => this.transitionJob(jobId, "calculating", { progressPct: 10, currentOperation: "toolpath_calculate" })],
      [100, () => this.transitionJob(jobId, "calculating", { progressPct: 40, etaMs: 1000, currentOperation: "roughing_cycle" })],
      [150, () => this.transitionJob(jobId, "simulating",  { progressPct: 60, etaMs: 500,  currentOperation: "simulation_pass_1" })],
      [200, () => this.transitionJob(jobId, "posting",     { progressPct: 80, etaMs: 200,  currentOperation: "nc_generation" })],
      [250, () => this.transitionJob(jobId, "complete",    { progressPct: 100, currentOperation: "finished" })],
    ];

    for (const [delayMs, fn] of steps) {
      setTimeout(() => {
        const record = this._jobs.get(jobId);
        if (record && !TERMINAL_STATES.has(record.state)) fn();
      }, delayMs);
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/** Default production job monitor — polls 127.0.0.1:18365. */
export const hyperMillJobMonitor = new HyperMillJobMonitor({
  mockMode: false,
});

/** Mock job monitor for CI environments. */
export const hyperMillJobMonitorMock = new HyperMillJobMonitor({
  mockMode: true,
});
