/**
 * PRISM MCP Server — Job Lifecycle Engine
 *
 * Full job tracking with 13-state lifecycle, time tracking,
 * inspection results, cost variance, and progress monitoring.
 *
 * U-XWIRE1: Cross-engine wiring — job completion cascades to
 * TimeClock → ActualCost → GeneralLedger automatically.
 *
 * Ported from PRISM_JOB_TRACKING_ENGINE.js (monolith R2.3.1).
 *
 * @module JobLifecycleEngine
 */

// U-XWIRE1: Cross-engine imports for job completion cascade
import { timeClockEngine } from "./TimeClockEngine.js";
import { actualCostEngine } from "./ActualCostEngine.js";
import { generalLedgerEngine } from "./GeneralLedgerEngine.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export const JOB_STATUS = {
  QUOTED: "quoted",
  ORDERED: "ordered",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  ON_HOLD: "on_hold",
  QC_PENDING: "qc_pending",
  QC_PASSED: "qc_passed",
  QC_FAILED: "qc_failed",
  FINISHING: "finishing",
  COMPLETE: "complete",
  SHIPPED: "shipped",
  INVOICED: "invoiced",
  CLOSED: "closed",
} as const;

/** Job Status type definition.
 */
export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];

const CLOSED_STATUSES: JobStatus[] = [
  JOB_STATUS.CLOSED,
  JOB_STATUS.SHIPPED,
  JOB_STATUS.INVOICED,
];

/** Status Entry configuration/data structure.
 */
export interface StatusEntry {
  status: JobStatus;
  previous_status?: JobStatus;
  timestamp: string;
  user: string;
  notes?: string;
}

/** Time Entry configuration/data structure.
 */
export interface TimeEntry {
  id: number;
  date: string;
  employee: string;
  operation: string;
  hours: number;
  machine?: string;
  notes?: string;
}

/** Inspection Result configuration/data structure.
 */
export interface InspectionResult {
  id: number;
  timestamp: string;
  inspector: string;
  type: string;
  part_numbers: string[];
  passed: boolean;
  measurements: Array<{
    dimension: string;
    nominal: number;
    actual: number;
    tolerance: number;
    in_spec: boolean;
  }>;
  notes?: string;
}

/** Job configuration/data structure.
 */
export interface Job {
  id: string;
  quote_number?: string;
  customer: string;
  part_number: string;
  part_name?: string;
  status: JobStatus;
  status_history: StatusEntry[];
  quantity: number;
  schedule: {
    order_date: string;
    due_date: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
  };
  progress: {
    percent_complete: number;
    parts_complete: number;
    parts_total: number;
  };
  materials: {
    ordered: boolean;
    received: boolean;
    allocated: boolean;
  };
  quality: {
    first_article_passed: boolean | null;
    inspections: InspectionResult[];
    ncrs: string[];
  };
  time_tracking: {
    estimated_hours: number;
    actual_hours: number;
    entries: TimeEntry[];
  };
  costs: {
    estimated: Record<string, number>;
    actual: Record<string, number>;
  };
  notes: string[];
}

/** Job Summary configuration/data structure.
 */
export interface JobSummary {
  id: string;
  status: JobStatus;
  customer: string;
  part_number: string;
  quantity: number;
  progress: Job["progress"];
  schedule: {
    due_date: string;
    days_remaining: number;
    on_schedule: boolean;
  };
  financials: {
    estimated_total: number;
    actual_total: number;
    cost_variance: number;
    variance_pct: number;
  };
  quality: {
    first_article: boolean | null;
    inspections: number;
    ncrs: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

class JobLifecycleEngineImpl {
  private jobs = new Map<string, Job>();
  private counter = 0;

  /**
   * Create a new job
   */
  createJob(params: {
    customer: string;
    part_number: string;
    part_name?: string;
    quantity: number;
    due_date?: string;
    lead_time_days?: number;
    estimated_hours?: number;
    estimated_costs?: Record<string, number>;
    quote_number?: string;
    user?: string;
  }): Job {
    const id = this._generateJobId();
    const now = new Date().toISOString();
    const dueDate = params.due_date
      ?? this._calculateDueDate(params.lead_time_days ?? 14);

    const job: Job = {
      id,
      quote_number: params.quote_number,
      customer: params.customer,
      part_number: params.part_number,
      part_name: params.part_name,
      status: JOB_STATUS.ORDERED,
      status_history: [{
        status: JOB_STATUS.ORDERED,
        timestamp: now,
        user: params.user ?? "system",
      }],
      quantity: params.quantity,
      schedule: {
        order_date: now.split("T")[0],
        due_date: dueDate,
        scheduled_start: null,
        scheduled_end: null,
        actual_start: null,
        actual_end: null,
      },
      progress: {
        percent_complete: 0,
        parts_complete: 0,
        parts_total: params.quantity,
      },
      materials: { ordered: false, received: false, allocated: false },
      quality: {
        first_article_passed: null,
        inspections: [],
        ncrs: [],
      },
      time_tracking: {
        estimated_hours: params.estimated_hours ?? 0,
        actual_hours: 0,
        entries: [],
      },
      costs: {
        estimated: params.estimated_costs ?? {},
        actual: {},
      },
      notes: [],
    };

    this.jobs.set(id, job);
    persistenceBridge.persist("job_lifecycle_jobs", id, job as any);
    return job;
  }

  /**
   * Update job status with auto-timestamp updates
   */
  updateStatus(
    jobId: string,
    newStatus: JobStatus,
    details: { user?: string; notes?: string } = {},
  ): { success: boolean; job?: Job; error?: string; cascade?: Record<string, any> } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: "Job not found" };

    const previous = job.status;
    job.status = newStatus;
    job.status_history.push({
      status: newStatus,
      previous_status: previous,
      timestamp: new Date().toISOString(),
      user: details.user ?? "system",
      notes: details.notes,
    });

    // Auto-update schedule timestamps
    if (newStatus === JOB_STATUS.IN_PROGRESS && !job.schedule.actual_start) {
      job.schedule.actual_start = new Date().toISOString();
    }
    if (
      (newStatus === JOB_STATUS.COMPLETE || newStatus === JOB_STATUS.SHIPPED)
      && !job.schedule.actual_end
    ) {
      job.schedule.actual_end = new Date().toISOString();
    }

    // U-XWIRE1: Cross-engine cascade on job completion
    let cascade: Record<string, any> | undefined;
    if (newStatus === JOB_STATUS.COMPLETE) {
      cascade = this._onJobComplete(job);
    }

    persistenceBridge.persist("job_lifecycle_jobs", jobId, job as any);
    return { success: true, job, cascade };
  }

  /**
   * Record a time entry against a job
   */
  recordTime(
    jobId: string,
    entry: {
      employee: string;
      operation: string;
      hours: number;
      machine?: string;
      date?: string;
      notes?: string;
    },
  ): { success: boolean; entry?: TimeEntry; error?: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: "Job not found" };

    const te: TimeEntry = {
      id: Date.now(),
      date: entry.date ?? new Date().toISOString().split("T")[0],
      employee: entry.employee,
      operation: entry.operation,
      hours: entry.hours,
      machine: entry.machine,
      notes: entry.notes,
    };
    job.time_tracking.entries.push(te);
    job.time_tracking.actual_hours += entry.hours;
    return { success: true, entry: te };
  }

  /**
   * Update part completion progress
   */
  updateProgress(
    jobId: string,
    partsComplete: number,
  ): { success: boolean; progress?: Job["progress"]; error?: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: "Job not found" };

    job.progress.parts_complete = partsComplete;
    job.progress.percent_complete = job.progress.parts_total > 0
      ? Math.round((partsComplete / job.progress.parts_total) * 100)
      : 0;
    return { success: true, progress: job.progress };
  }

  /**
   * Add inspection result
   */
  addInspection(
    jobId: string,
    result: {
      inspector: string;
      type?: string;
      part_numbers?: string[];
      passed: boolean;
      measurements?: InspectionResult["measurements"];
      notes?: string;
    },
  ): { success: boolean; inspection?: InspectionResult; error?: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: "Job not found" };

    const insp: InspectionResult = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      inspector: result.inspector,
      type: result.type ?? "in_process",
      part_numbers: result.part_numbers ?? [],
      passed: result.passed,
      measurements: result.measurements ?? [],
      notes: result.notes,
    };
    job.quality.inspections.push(insp);

    if (result.type === "first_article") {
      job.quality.first_article_passed = result.passed;
    }
    return { success: true, inspection: insp };
  }

  /**
   * Get job summary with schedule + cost variance
   */
  getJobSummary(jobId: string): JobSummary | { error: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { error: "Job not found" };

    const dueDate = new Date(job.schedule.due_date);
    const today = new Date();
    const daysRemaining = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    const estTotal = Object.values(job.costs.estimated)
      .reduce((a, b) => a + b, 0);
    const actTotal = Object.values(job.costs.actual)
      .reduce((a, b) => a + b, 0);
    const variance = actTotal - estTotal;

    return {
      id: job.id,
      status: job.status,
      customer: job.customer,
      part_number: job.part_number,
      quantity: job.quantity,
      progress: job.progress,
      schedule: { due_date: job.schedule.due_date, days_remaining: daysRemaining, on_schedule: daysRemaining >= 0 },
      financials: {
        estimated_total: estTotal,
        actual_total: actTotal,
        cost_variance: variance,
        variance_pct: estTotal > 0
          ? Math.round((variance / estTotal) * 1000) / 10
          : 0,
      },
      quality: {
        first_article: job.quality.first_article_passed,
        inspections: job.quality.inspections.length,
        ncrs: job.quality.ncrs.length,
      },
    };
  }

  /**
   * Get all active (non-closed) jobs sorted by due date urgency
   */
  getActiveJobs(): JobSummary[] {
    const active: JobSummary[] = [];
    for (const [id, job] of this.jobs) {
      if (!CLOSED_STATUSES.includes(job.status)) {
        const summary = this.getJobSummary(id);
        if ("id" in summary) active.push(summary);
      }
    }
    return active.sort((a, b) => a.schedule.days_remaining - b.schedule.days_remaining);
  }

  /**
   * Get a job by ID (full object)
   */
  getJob(jobId: string): Job | { error: string } {
    return this.jobs.get(jobId) ?? { error: "Job not found" };
  }

  /**
   * Update actual costs
   */
  updateCosts(
    jobId: string,
    costs: Record<string, number>,
  ): { success: boolean; error?: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: "Job not found" };
    Object.assign(job.costs.actual, costs);
    return { success: true };
  }

  /**
   * Dashboard: all jobs status breakdown
   */
  dashboard(): {
    total_jobs: number;
    active_jobs: number;
    by_status: Record<string, number>;
    overdue: number;
    at_risk: number;
  } {
    const byStatus: Record<string, number> = {};
    let overdue = 0;
    let atRisk = 0;
    const today = new Date();

    for (const job of this.jobs.values()) {
      byStatus[job.status] = (byStatus[job.status] ?? 0) + 1;
      if (!CLOSED_STATUSES.includes(job.status)) {
        const due = new Date(job.schedule.due_date);
        const days = Math.ceil(
          (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (days < 0) overdue++;
        else if (days <= 3) atRisk++;
      }
    }

    return {
      total_jobs: this.jobs.size,
      active_jobs: [...this.jobs.values()]
        .filter(j => !CLOSED_STATUSES.includes(j.status)).length,
      by_status: byStatus,
      overdue,
      at_risk: atRisk,
    };
  }

  /**
   * Operations KPI rollup for the ERP "operations-kpis" dashboard. Composes ONLY real
   * job-lifecycle fields (status, schedule.due_date / schedule.actual_end) -- nothing fabricated.
   * Returns { data_available:false } when the job store is empty (honest empty, mirroring
   * value_stream_map) so the SPA renders an empty state rather than treating zeros as real data.
   *
   * NOTE on the active/completed split: completed_jobs counts CLOSED_STATUSES (closed/shipped/
   * invoiced); a job in status 'complete' but not yet shipped is still counted as ACTIVE (open WIP),
   * matching dashboard(). active + completed == total (disjoint, exhaustive partition).
   *
   * @returns counts by status, active/overdue/at-risk (reused from dashboard()), completed count,
   *   on_time_delivery_rate (share of completed jobs WITH a delivery date (actual_end) whose
   *   actual_end <= due_date; null when none qualify), and schedule_health_pct (active not overdue
   *   / active). A date-only due_date is treated as end-of-day for the on-time comparison.
   */
  operationsKpis(): {
    data_available: boolean;
    generated_at: string;
    total_jobs: number;
    active_jobs: number;
    completed_jobs: number;
    overdue: number;
    at_risk: number;
    by_status: Record<string, number>;
    on_time_delivery_rate: number | null;
    schedule_health_pct: number | null;
    overdue_pct: number;
    at_risk_pct: number;
    message?: string;
  } {
    const base = this.dashboard();
    const round1 = (n: number): number => Math.round(n * 10) / 10;
    if (base.total_jobs === 0) {
      return {
        data_available: false,
        generated_at: new Date().toISOString(),
        total_jobs: 0, active_jobs: 0, completed_jobs: 0, overdue: 0, at_risk: 0,
        by_status: {}, on_time_delivery_rate: null, schedule_health_pct: null,
        overdue_pct: 0, at_risk_pct: 0,
        message: "No jobs in the lifecycle store yet.",
      };
    }
    let completed = 0;
    let completedWithEnd = 0;
    let onTime = 0;
    for (const job of this.jobs.values()) {
      if (!CLOSED_STATUSES.includes(job.status)) continue;
      completed++;
      if (job.schedule.actual_end) {
        completedWithEnd++;
        // A date-only due_date ("2026-06-27") is treated as end-of-day so a same-day ship is on-time.
        const due = job.schedule.due_date;
        const dueMs = due.includes("T")
          ? new Date(due).getTime()
          : new Date(`${due}T23:59:59.999Z`).getTime();
        if (new Date(job.schedule.actual_end).getTime() <= dueMs) {
          onTime++;
        }
      }
    }
    const active = base.active_jobs;
    return {
      data_available: true,
      generated_at: new Date().toISOString(),
      total_jobs: base.total_jobs,
      active_jobs: active,
      completed_jobs: completed,
      overdue: base.overdue,
      at_risk: base.at_risk,
      by_status: base.by_status,
      on_time_delivery_rate: completedWithEnd > 0 ? round1((onTime / completedWithEnd) * 100) : null,
      schedule_health_pct: active > 0 ? round1(((active - base.overdue) / active) * 100) : null,
      overdue_pct: active > 0 ? round1((base.overdue / active) * 100) : 0,
      at_risk_pct: active > 0 ? round1((base.at_risk / active) * 100) : 0,
    };
  }

  // ── U-XWIRE1: Cross-engine cascade ──────────────────────

  /**
   * Cascade triggered when a job transitions to "complete".
   * Pulls actual labor from TimeClock, calculates full actual cost via ActualCostEngine,
   * and posts a journal entry to GeneralLedger. Each step is try/catch-guarded so a
   * cascade failure never blocks the primary status transition.
   *
   * Cost model: labor + material + tooling + machine + overhead + scrap (7 components).
   * ActualCostEngine.calculate() handles aggregation from TimeClock + ToolUsage data.
   */
  private _onJobComplete(job: Job): Record<string, any> {
    const results: Record<string, any> = { warnings: [] as string[] };

    // Step 1: Pull actual labor hours and cost from TimeClock
    try {
      const labor = timeClockEngine.jobLaborCost(job.id);
      job.time_tracking.actual_hours = labor.total_hours;
      results.labor = {
        hours: labor.total_hours,
        cost: labor.total_cost,
        employees: labor.by_employee.length,
      };
      if (labor.total_hours === 0) {
        results.warnings.push("No time clock entries found for this job — labor cost is $0. Was time tracked in TimeClock?");
      }
      if (job.time_tracking.estimated_hours > 0 && labor.total_hours > job.time_tracking.estimated_hours * 1.2) {
        results.warnings.push(
          `Labor overrun: ${labor.total_hours.toFixed(1)}h actual vs ${job.time_tracking.estimated_hours}h estimated (${((labor.total_hours / job.time_tracking.estimated_hours - 1) * 100).toFixed(0)}% over)`,
        );
      }
    } catch (e: any) {
      results.labor = { error: e.message };
      results.warnings.push(`TimeClock cascade failed: ${e.message}`);
    }

    // Step 2: Calculate full actual cost (labor + material + tooling + machine + overhead + scrap)
    try {
      const costRecord = actualCostEngine.calculate({ job_id: job.id });
      job.costs.actual = {
        labor: costRecord.labor.cost,
        material: costRecord.material.cost,
        tooling: costRecord.tooling.cost,
        machine: costRecord.machine.cost,
        overhead: costRecord.overhead.cost,
        scrap: costRecord.material.scrap_cost,
        total: costRecord.total_cost,
      };
      results.actual_cost = {
        total: costRecord.total_cost,
        labor: costRecord.labor.cost,
        material: costRecord.material.cost,
        tooling: costRecord.tooling.cost,
        machine: costRecord.machine.cost,
        overhead: costRecord.overhead.cost,
        scrap: costRecord.material.scrap_cost,
      };

      // Cost variance check against estimates
      const estTotal = Object.values(job.costs.estimated).reduce((s, v) => s + v, 0);
      if (estTotal > 0) {
        const variancePct = ((costRecord.total_cost - estTotal) / estTotal) * 100;
        results.actual_cost.variance_pct = Math.round(variancePct * 10) / 10;
        if (variancePct > 15) {
          results.warnings.push(
            `Cost overrun: $${costRecord.total_cost.toFixed(2)} actual vs $${estTotal.toFixed(2)} estimated (+${variancePct.toFixed(1)}%). Review for future quote calibration.`,
          );
        } else if (variancePct < -15) {
          results.warnings.push(
            `Significant underspend: ${variancePct.toFixed(1)}% below estimate. Consider tightening future quotes.`,
          );
        }
      }
    } catch (e: any) {
      results.actual_cost = { error: e.message };
      results.warnings.push(`ActualCost cascade failed: ${e.message}`);
    }

    // Step 3: Post to General Ledger (double-entry: WIP debit, expense credits)
    try {
      const cost = job.costs.actual as Record<string, number>;
      // recordJobCost was retired; recordWipToCogs is the successor (double-entry
      // posting from WIP to COGS at the aggregate cost level).
      const amount = (cost.labor ?? 0) + (cost.material ?? 0)
                   + (cost.tooling ?? 0) + (cost.overhead ?? 0);
      const entry = generalLedgerEngine.recordWipToCogs({
        job_id: job.id,
        amount,
        date: new Date().toISOString().slice(0, 10),
      });
      results.gl_entry = { id: entry.id, posted: entry.posted };
    } catch (e: any) {
      results.gl_entry = { error: e.message };
      results.warnings.push(`GL posting cascade failed: ${e.message}`);
    }

    if (results.warnings.length === 0) {
      results.warnings.push("All cascade steps completed successfully.");
    }

    return results;
  }

  // ── helpers ──

  private _generateJobId(): string {
    this.counter++;
    const yr = new Date().getFullYear().toString().slice(-2);
    const mo = (new Date().getMonth() + 1).toString().padStart(2, "0");
    const seq = this.counter.toString().padStart(3, "0");
    return `J${yr}${mo}-${seq}`;
  }

  private _calculateDueDate(leadDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + leadDays);
    return d.toISOString().split("T")[0];
  }
}

/** Job Lifecycle Engine constant.
 */
export const jobLifecycleEngine = new JobLifecycleEngineImpl();

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "job_lifecycle_jobs",
  getMap: () => (jobLifecycleEngine as any).jobs as Map<string, any>,
  keyField: "id",
});
