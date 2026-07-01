/**
 * EmployeeMultiJobConcurrencyEngine — Multi-job concurrent state + time allocation.
 *
 * Closes two operator gaps:
 *
 *  1. **Phone "quick menu"** — operator on a phone needs to see all the jobs
 *     they're checked into AT A GLANCE and pause/resume any of them in 1 tap.
 *     The existing portal supports ONE active task per employee with explicit
 *     pause/resume; this engine layers a multi-job concurrent state on top.
 *
 *  2. **Concurrency-aware time allocation** — when an operator runs 3 machines
 *     simultaneously, wall-clock time charges fully against each task by
 *     default. That's unfair (one human can't truly run 3 jobs each for a full
 *     hour in an hour). This engine allocates wall-clock-time across the
 *     concurrent set via one of two strategies:
 *       - "equal": each active job gets wall_clock / N
 *       - "weighted": each active job gets wall_clock × (its_weight / sum_weights)
 *
 *  Wall-clock time is ticked in via `tickConcurrentTime(employee_id, ms)`;
 *  the engine distributes ms across the active set per the current strategy.
 *
 *  Standard interpretation: an "active set" = jobs in the `running` state for
 *  this employee right now. A `paused` job accumulates zero time. When a job
 *  is added/paused, the active set changes — subsequent ticks split differently.
 *
 *  Compose-not-rebuild: this engine does NOT replicate the per-task state in
 *  `EmployeeShopFloorMobileEngine` — it tracks ONLY the concurrent set + per-
 *  job effective runtime. The portal stays the source of truth for individual
 *  task lifecycle (start/pause/resume/stop). This engine is the **multi-job
 *  meta-layer**: which jobs am I on right now, what was the effective time
 *  charged to each, and what's the quick-menu order.
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud: NaN ms / negative weights / invalid strategy → throw
 *   - PII-free (employee_id string only)
 *   - Object.frozen on every return
 *   - Time-allocation invariant: Σ allocated_ms_per_tick = ms_elapsed (within float tolerance)
 *
 * @module EmployeeMultiJobConcurrencyEngine
 * @milestone HOTEL/U-EMP-MULTI-JOB-CONCURRENCY (2026-05-25, slot:hotel iter10)
 */

// ─── Constants ────────────────────────────────────────────────
/** Default attention weight when no override. */
const DEFAULT_WEIGHT = 1;
/** Minimum weight (avoid div-by-zero with floor). */
const MIN_WEIGHT = 0.05;
/** Floor for ms tick — refuses negative / NaN. */
const MIN_TICK_MS = 0;

// ─── Types ────────────────────────────────────────────────────

export type ConcurrentJobState = "running" | "paused";
export type ConcurrencyStrategy = "equal" | "weighted";

export interface ConcurrentJob {
  job_id: string;
  operation_id: string;
  task_id: string;
  employee_id: string;
  state: ConcurrentJobState;
  /** ISO timestamp the operator joined this job in the concurrent set. */
  joined_at: string;
  /** ISO timestamp of last state change (paused/resumed). */
  last_state_change_at: string;
  /** Wall-clock seconds since join (informational). */
  wall_clock_ms: number;
  /** Effective time allocated per concurrency strategy. */
  effective_ms: number;
  /** Attention-weight (1.0 default; only used in "weighted" strategy). */
  attention_weight: number;
  /** Operator notes / running flag. */
  notes?: string;
}

export interface QuickMenuEntry {
  job_id: string;
  operation_id: string;
  task_id: string;
  state: ConcurrentJobState;
  effective_minutes: number;
  wall_clock_minutes: number;
  share_pct: number; // proportion of attention right now (0-100)
  age_minutes: number;
  attention_weight: number;
  next_action: "pause" | "resume" | "switch_to" | "stop";
}

export interface TickAllocation {
  employee_id: string;
  strategy: ConcurrencyStrategy;
  active_count: number;
  ms_distributed: number;
  per_job: ReadonlyArray<{ job_id: string; allocated_ms: number; share: number }>;
}

export interface PartCountAdjustment {
  id: string;
  employee_id: string;
  job_id: string;
  prior: number;
  next: number;
  delta: number;
  reason: string;
  at: string;
}

export interface ClockedTimeAdjustment {
  id: string;
  employee_id: string;
  job_id: string;
  prior_ms: number;
  next_ms: number;
  delta_ms: number;
  reason: string;
  at: string;
}

// ─── Engine ───────────────────────────────────────────────────

class EmployeeMultiJobConcurrencyEngine {
  /** Per-employee → per-job concurrent state. */
  private jobs: Map<string, Map<string, ConcurrentJob>> = new Map();
  /** Per-employee → strategy override (default "equal"). */
  private strategy: Map<string, ConcurrencyStrategy> = new Map();
  /** Per-employee → per-job manual part-count overlay (separate from PerOpTracker). */
  private partOverlay: Map<string, Map<string, number>> = new Map();
  private partAdjustments: PartCountAdjustment[] = [];
  private clockAdjustments: ClockedTimeAdjustment[] = [];
  private nextAdjId = 1;

  /**
   * Add a job to the operator's concurrent set in "running" state.
   * Multiple calls with the same job_id are idempotent (resumes if paused).
   */
  checkInToJob(input: {
    employee_id: string;
    job_id: string;
    operation_id: string;
    task_id: string;
    attention_weight?: number;
  }): ConcurrentJob {
    this.validateIds(input);
    const w = input.attention_weight ?? DEFAULT_WEIGHT;
    if (!Number.isFinite(w) || w < MIN_WEIGHT) {
      throw new Error(`EmployeeMultiJobConcurrencyEngine: attention_weight must be ≥${MIN_WEIGHT}, got ${w}`);
    }
    const empMap = this.getOrCreateEmp(input.employee_id);
    const existing = empMap.get(input.job_id);
    const now = new Date().toISOString();
    if (existing) {
      const updated: ConcurrentJob = {
        ...existing,
        state: "running",
        last_state_change_at: now,
        attention_weight: w,
      };
      empMap.set(input.job_id, updated);
      return Object.freeze({ ...updated });
    }
    const fresh: ConcurrentJob = {
      job_id: input.job_id,
      operation_id: input.operation_id,
      task_id: input.task_id,
      employee_id: input.employee_id,
      state: "running",
      joined_at: now,
      last_state_change_at: now,
      wall_clock_ms: 0,
      effective_ms: 0,
      attention_weight: w,
    };
    empMap.set(input.job_id, fresh);
    return Object.freeze({ ...fresh });
  }

  /** Pause ONE job. */
  pauseJob(args: { employee_id: string; job_id: string }): ConcurrentJob {
    const job = this.requireJob(args.employee_id, args.job_id);
    if (job.state === "paused") return Object.freeze({ ...job });
    const updated: ConcurrentJob = { ...job, state: "paused", last_state_change_at: new Date().toISOString() };
    this.getOrCreateEmp(args.employee_id).set(args.job_id, updated);
    return Object.freeze({ ...updated });
  }

  /** Resume ONE job. */
  resumeJob(args: { employee_id: string; job_id: string }): ConcurrentJob {
    const job = this.requireJob(args.employee_id, args.job_id);
    if (job.state === "running") return Object.freeze({ ...job });
    const updated: ConcurrentJob = { ...job, state: "running", last_state_change_at: new Date().toISOString() };
    this.getOrCreateEmp(args.employee_id).set(args.job_id, updated);
    return Object.freeze({ ...updated });
  }

  /** Pause every job in the operator's set. */
  pauseAll(args: { employee_id: string }): ReadonlyArray<ConcurrentJob> {
    const empMap = this.jobs.get(args.employee_id);
    if (!empMap) return Object.freeze([]);
    const out: ConcurrentJob[] = [];
    const now = new Date().toISOString();
    for (const [jobId, job] of empMap) {
      if (job.state === "paused") {
        out.push({ ...job });
        continue;
      }
      const updated: ConcurrentJob = { ...job, state: "paused", last_state_change_at: now };
      empMap.set(jobId, updated);
      out.push(updated);
    }
    return Object.freeze(out.map((j) => Object.freeze(j)));
  }

  /**
   * Quick-switch: pause `from_job`, resume (or check-in to) `to_job` atomically.
   * Used for the phone "tap to switch" UX.
   */
  quickSwitch(input: {
    employee_id: string;
    from_job_id: string;
    to_job_id: string;
    to_operation_id?: string;
    to_task_id?: string;
  }): { paused: ConcurrentJob; resumed: ConcurrentJob } {
    this.pauseJob({ employee_id: input.employee_id, job_id: input.from_job_id });
    const empMap = this.getOrCreateEmp(input.employee_id);
    const existingTo = empMap.get(input.to_job_id);
    let resumed: ConcurrentJob;
    if (existingTo) {
      resumed = this.resumeJob({ employee_id: input.employee_id, job_id: input.to_job_id });
    } else {
      if (!input.to_operation_id || !input.to_task_id) {
        throw new Error(
          "EmployeeMultiJobConcurrencyEngine.quickSwitch: to_operation_id + to_task_id required when to_job is new",
        );
      }
      resumed = this.checkInToJob({
        employee_id: input.employee_id,
        job_id: input.to_job_id,
        operation_id: input.to_operation_id,
        task_id: input.to_task_id,
      });
    }
    const paused = this.requireJob(input.employee_id, input.from_job_id);
    return Object.freeze({ paused: Object.freeze({ ...paused }), resumed });
  }

  /** Set strategy for an employee. */
  setStrategy(args: { employee_id: string; strategy: ConcurrencyStrategy }): { employee_id: string; strategy: ConcurrencyStrategy } {
    if (args.strategy !== "equal" && args.strategy !== "weighted") {
      throw new Error(`EmployeeMultiJobConcurrencyEngine.setStrategy: strategy must be 'equal' or 'weighted', got '${args.strategy}'`);
    }
    this.strategy.set(args.employee_id, args.strategy);
    return Object.freeze({ employee_id: args.employee_id, strategy: args.strategy });
  }

  /** Get the strategy for an employee (defaults to "equal"). */
  getStrategy(employee_id: string): ConcurrencyStrategy {
    return this.strategy.get(employee_id) ?? "equal";
  }

  /** Set attention weight on a specific job (used in "weighted" strategy). */
  setAttentionWeight(input: { employee_id: string; job_id: string; attention_weight: number }): ConcurrentJob {
    const job = this.requireJob(input.employee_id, input.job_id);
    if (!Number.isFinite(input.attention_weight) || input.attention_weight < MIN_WEIGHT) {
      throw new Error(
        `EmployeeMultiJobConcurrencyEngine.setAttentionWeight: must be ≥${MIN_WEIGHT}, got ${input.attention_weight}`,
      );
    }
    const updated: ConcurrentJob = { ...job, attention_weight: input.attention_weight };
    this.getOrCreateEmp(input.employee_id).set(input.job_id, updated);
    return Object.freeze({ ...updated });
  }

  /**
   * Tick wall-clock time forward. Each active (running) job receives:
   *   - "equal" strategy:   ms_elapsed / N
   *   - "weighted" strategy: ms_elapsed × (weight_i / Σ weights)
   *
   * Paused jobs receive zero. wall_clock_ms also advances on running jobs
   * (unallocated wall-clock — the operator's clocked-in but distracted time).
   */
  tickConcurrentTime(args: { employee_id: string; ms_elapsed: number }): TickAllocation {
    if (!Number.isFinite(args.ms_elapsed) || args.ms_elapsed < MIN_TICK_MS) {
      throw new Error(
        `EmployeeMultiJobConcurrencyEngine.tickConcurrentTime: ms_elapsed must be ≥${MIN_TICK_MS} finite, got ${args.ms_elapsed}`,
      );
    }
    const empMap = this.jobs.get(args.employee_id);
    const strategy = this.getStrategy(args.employee_id);
    if (!empMap) {
      return Object.freeze({
        employee_id: args.employee_id,
        strategy,
        active_count: 0,
        ms_distributed: 0,
        per_job: Object.freeze([]),
      });
    }
    const active = [...empMap.values()].filter((j) => j.state === "running");
    if (active.length === 0) {
      return Object.freeze({
        employee_id: args.employee_id,
        strategy,
        active_count: 0,
        ms_distributed: 0,
        per_job: Object.freeze([]),
      });
    }
    const sumW = strategy === "weighted" ? active.reduce((acc, j) => acc + Math.max(MIN_WEIGHT, j.attention_weight), 0) : 0;
    const perJob: { job_id: string; allocated_ms: number; share: number }[] = [];
    let dist = 0;
    for (const j of active) {
      let allocated: number;
      let share: number;
      if (strategy === "equal") {
        allocated = args.ms_elapsed / active.length;
        share = 1 / active.length;
      } else {
        const w = Math.max(MIN_WEIGHT, j.attention_weight);
        share = w / sumW;
        allocated = args.ms_elapsed * share;
      }
      const updated: ConcurrentJob = {
        ...j,
        wall_clock_ms: j.wall_clock_ms + args.ms_elapsed,
        effective_ms: j.effective_ms + allocated,
      };
      empMap.set(j.job_id, updated);
      perJob.push({ job_id: j.job_id, allocated_ms: allocated, share });
      dist += allocated;
    }
    return Object.freeze({
      employee_id: args.employee_id,
      strategy,
      active_count: active.length,
      ms_distributed: dist,
      per_job: Object.freeze(perJob.map((p) => Object.freeze(p))),
    });
  }

  /**
   * Render the quick-menu surface for the phone UX: every job the operator
   * is checked into, sorted running-first then by last activity.
   */
  quickMenu(args: { employee_id: string; now?: Date }): ReadonlyArray<QuickMenuEntry> {
    const empMap = this.jobs.get(args.employee_id);
    if (!empMap) return Object.freeze([]);
    const now = (args.now ?? new Date()).getTime();
    const strategy = this.getStrategy(args.employee_id);
    const active = [...empMap.values()].filter((j) => j.state === "running");
    const sumW = strategy === "weighted" ? active.reduce((acc, j) => acc + Math.max(MIN_WEIGHT, j.attention_weight), 0) : 0;
    const out: QuickMenuEntry[] = [];
    for (const job of empMap.values()) {
      let share = 0;
      if (job.state === "running") {
        if (strategy === "equal") share = active.length === 0 ? 0 : 1 / active.length;
        else share = sumW === 0 ? 0 : Math.max(MIN_WEIGHT, job.attention_weight) / sumW;
      }
      const ageMs = now - Date.parse(job.joined_at);
      out.push({
        job_id: job.job_id,
        operation_id: job.operation_id,
        task_id: job.task_id,
        state: job.state,
        effective_minutes: Math.round((job.effective_ms / 60000) * 100) / 100,
        wall_clock_minutes: Math.round((job.wall_clock_ms / 60000) * 100) / 100,
        share_pct: Math.round(share * 10000) / 100,
        age_minutes: Math.round((ageMs / 60000) * 100) / 100,
        attention_weight: job.attention_weight,
        next_action: job.state === "running" ? "pause" : "resume",
      });
    }
    // Sort: running first, then by most-recently-changed.
    out.sort((a, b) => {
      if (a.state !== b.state) return a.state === "running" ? -1 : 1;
      return b.age_minutes - a.age_minutes;
    });
    return Object.freeze(out.map((e) => Object.freeze(e)));
  }

  /** Return the current concurrent set for an employee. Read-only. */
  listConcurrent(args: { employee_id: string }): ReadonlyArray<ConcurrentJob> {
    const empMap = this.jobs.get(args.employee_id);
    if (!empMap) return Object.freeze([]);
    return Object.freeze([...empMap.values()].map((j) => Object.freeze({ ...j })));
  }

  /**
   * Operator manual adjustment to the part-count overlay for a job.
   * Audit-traceable. Does not modify the per-op part tracker — this is a
   * fast-lane override on the concurrency surface for the operator's own
   * count display.
   */
  adjustPartCount(input: {
    employee_id: string;
    job_id: string;
    new_count: number;
    reason: string;
  }): PartCountAdjustment {
    if (!input.reason || input.reason.trim().length < 3) {
      throw new Error("EmployeeMultiJobConcurrencyEngine.adjustPartCount: reason (≥3 chars) required");
    }
    if (!Number.isInteger(input.new_count) || input.new_count < 0) {
      throw new Error(
        `EmployeeMultiJobConcurrencyEngine.adjustPartCount: new_count must be a non-negative integer, got ${input.new_count}`,
      );
    }
    let empOverlay = this.partOverlay.get(input.employee_id);
    if (!empOverlay) {
      empOverlay = new Map();
      this.partOverlay.set(input.employee_id, empOverlay);
    }
    const prior = empOverlay.get(input.job_id) ?? 0;
    empOverlay.set(input.job_id, input.new_count);
    const adj: PartCountAdjustment = Object.freeze({
      id: `PCA-${String(this.nextAdjId++).padStart(6, "0")}`,
      employee_id: input.employee_id,
      job_id: input.job_id,
      prior,
      next: input.new_count,
      delta: input.new_count - prior,
      reason: input.reason,
      at: new Date().toISOString(),
    });
    this.partAdjustments.push(adj);
    return adj;
  }

  /**
   * Operator manual adjustment to the clocked-time for a job (effective_ms).
   * Used when the operator paused the wrong job and needs to correct.
   */
  adjustClockedTime(input: {
    employee_id: string;
    job_id: string;
    new_effective_ms: number;
    reason: string;
  }): ClockedTimeAdjustment {
    if (!input.reason || input.reason.trim().length < 3) {
      throw new Error("EmployeeMultiJobConcurrencyEngine.adjustClockedTime: reason (≥3 chars) required");
    }
    if (!Number.isFinite(input.new_effective_ms) || input.new_effective_ms < 0) {
      throw new Error(
        `EmployeeMultiJobConcurrencyEngine.adjustClockedTime: new_effective_ms must be ≥0 finite, got ${input.new_effective_ms}`,
      );
    }
    const job = this.requireJob(input.employee_id, input.job_id);
    const prior = job.effective_ms;
    const updated: ConcurrentJob = { ...job, effective_ms: input.new_effective_ms };
    this.getOrCreateEmp(input.employee_id).set(input.job_id, updated);
    const adj: ClockedTimeAdjustment = Object.freeze({
      id: `CTA-${String(this.nextAdjId++).padStart(6, "0")}`,
      employee_id: input.employee_id,
      job_id: input.job_id,
      prior_ms: prior,
      next_ms: input.new_effective_ms,
      delta_ms: input.new_effective_ms - prior,
      reason: input.reason,
      at: new Date().toISOString(),
    });
    this.clockAdjustments.push(adj);
    return adj;
  }

  /** List part-count adjustments. */
  listPartAdjustments(args?: { employee_id?: string; job_id?: string }): ReadonlyArray<PartCountAdjustment> {
    let out = [...this.partAdjustments];
    if (args?.employee_id) out = out.filter((a) => a.employee_id === args.employee_id);
    if (args?.job_id) out = out.filter((a) => a.job_id === args.job_id);
    return Object.freeze(out);
  }

  /** List clocked-time adjustments. */
  listClockAdjustments(args?: { employee_id?: string; job_id?: string }): ReadonlyArray<ClockedTimeAdjustment> {
    let out = [...this.clockAdjustments];
    if (args?.employee_id) out = out.filter((a) => a.employee_id === args.employee_id);
    if (args?.job_id) out = out.filter((a) => a.job_id === args.job_id);
    return Object.freeze(out);
  }

  /** Reset state — test-only. */
  reset(): void {
    this.jobs.clear();
    this.strategy.clear();
    this.partOverlay.clear();
    this.partAdjustments = [];
    this.clockAdjustments = [];
    this.nextAdjId = 1;
  }

  // ─── Internals ──────────────────────────────────────────────

  private validateIds(input: { employee_id: string; job_id: string; operation_id: string; task_id: string }): void {
    if (!input.employee_id || !input.job_id || !input.operation_id || !input.task_id) {
      throw new Error("EmployeeMultiJobConcurrencyEngine: employee_id + job_id + operation_id + task_id required");
    }
  }

  private getOrCreateEmp(employee_id: string): Map<string, ConcurrentJob> {
    let m = this.jobs.get(employee_id);
    if (!m) {
      m = new Map();
      this.jobs.set(employee_id, m);
    }
    return m;
  }

  private requireJob(employee_id: string, job_id: string): ConcurrentJob {
    const empMap = this.jobs.get(employee_id);
    const job = empMap?.get(job_id);
    if (!job) {
      throw new Error(`EmployeeMultiJobConcurrencyEngine: employee "${employee_id}" not checked into job "${job_id}"`);
    }
    return job;
  }
}

export const employeeMultiJobConcurrencyEngine = new EmployeeMultiJobConcurrencyEngine();
