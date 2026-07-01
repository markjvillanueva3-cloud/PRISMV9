/**
 * JobDeskAggregatorEngine — Job Desk Record Builder
 * ==================================================
 *
 * Aggregates job lifecycle data into desk records suitable for the
 * operating-system job desk UI. Builds traveler step records, shortage
 * summaries, approval chains, timeline entries, and full tracking packets.
 *
 * Backs the JobExecutionProvider and WorkflowProvider contracts from
 * web/src/features/operating-system/contracts.ts.
 *
 * @version 1.0.0 — Sprint C1
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TravelerStepStatus = "complete" | "running" | "ready" | "blocked";
export type WorkflowTone = "neutral" | "watch" | "good";
export type ApprovalStatus = "ready" | "waiting" | "approved" | "blocked";

export interface TravelerStepRecord {
  id: string;
  code: string;
  title: string;
  machine: string;
  estimate: string;
  status: TravelerStepStatus;
  note: string;
}

export interface WorkflowTimelineEntry {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: WorkflowTone;
}

export interface ApprovalSummary {
  id: string;
  label: string;
  owner: string;
  status: ApprovalStatus;
  detail: string;
}

export interface ShortageRecord {
  id: string;
  item: string;
  eta: string;
  severity: "watch" | "high";
  action: string;
  owner: string;
}

export interface JobAttachmentRecord {
  id: string;
  label: string;
  type: string;
  freshness: string;
}

export interface JobDeskRecord {
  jobId: string;
  owner: string;
  workcenter: string;
  queueSlot: string;
  isHot: boolean;
  hotNote: string | null;
  traveler: TravelerStepRecord[];
  shortages: ShortageRecord[];
  approvals: ApprovalSummary[];
  attachments: JobAttachmentRecord[];
  timeline: WorkflowTimelineEntry[];
  purchasingActions: string[];
  nextActions: string[];
}

/** Minimal job input — matches the Job type from the frontend api/types */
export interface JobInput {
  id: string;
  status: string;
  customer?: string;
  part_number?: string;
  due_date?: string;
  quantity?: number;
  material?: string;
  priority?: string;
  machine?: string;
  routing?: Array<{
    step: number;
    operation: string;
    work_center: string;
    estimated_time_min?: number;
    actual_time_min?: number;
    setup_time_min?: number;
    status?: string;
    tool_list?: string[];
  }>;
  status_history?: Array<{
    status: string;
    timestamp: string;
    user: string;
    notes?: string;
  }>;
}

// ─── Status mapping ────────────────────────────────────────────────────────

const STATUS_TO_TRAVELER: Record<string, TravelerStepStatus> = {
  complete: "complete",
  in_progress: "running",
  running: "running",
  scheduled: "ready",
  pending: "ready",
  ready: "ready",
  on_hold: "blocked",
  blocked: "blocked",
  qc_pending: "running",
  qc_passed: "complete",
  qc_failed: "blocked",
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class JobDeskAggregatorEngine {
  /**
   * Build desk records for multiple jobs.
   * @param jobs - Array of job records from ERP/lifecycle engine
   * @param hotJobIds - Set of job IDs currently flagged as hot
   */
  static buildJobDeskRecords(
    jobs: JobInput[],
    hotJobIds: Set<string> = new Set(),
  ): JobDeskRecord[] {
    if (!Array.isArray(jobs)) return [];
    return jobs.map((job) => JobDeskAggregatorEngine.buildSingleDeskRecord(job, hotJobIds));
  }

  /**
   * Build approval chain for a job.
   * @param job - Job record
   */
  static buildJobApprovals(job: JobInput): ApprovalSummary[] {
    const approvals: ApprovalSummary[] = [];
    const status = job.status || "pending";

    // Engineering approval (route sign-off)
    approvals.push({
      id: `appr-eng-${job.id}`,
      label: "Engineering",
      owner: "Engineering",
      status: ["in_progress", "running", "qc_pending", "qc_passed", "complete", "shipped"].includes(status)
        ? "approved"
        : "waiting",
      detail: "Route and tooling sign-off",
    });

    // Quality approval (FAI)
    const qcDone = ["qc_passed", "complete", "shipped", "invoiced", "closed"].includes(status);
    const qcFailed = status === "qc_failed";
    approvals.push({
      id: `appr-qc-${job.id}`,
      label: "Quality",
      owner: "Quality",
      status: qcFailed ? "blocked" : qcDone ? "approved" : "waiting",
      detail: qcFailed ? "FAI failed — requires disposition" : "First article inspection",
    });

    // Shipping approval
    approvals.push({
      id: `appr-ship-${job.id}`,
      label: "Shipping",
      owner: "Shipping",
      status: ["shipped", "invoiced", "closed"].includes(status) ? "approved" : "waiting",
      detail: "Pack and ship authorization",
    });

    return approvals;
  }

  /**
   * Build a full tracking packet for a job.
   * @param job - Job record
   */
  static buildJobPacket(
    job: JobInput,
  ): {
    jobId: string;
    partNumber: string;
    customer: string;
    status: string;
    dueDate: string;
    desk: JobDeskRecord;
  } {
    const desk = JobDeskAggregatorEngine.buildSingleDeskRecord(job, new Set());
    return {
      jobId: job.id,
      partNumber: job.part_number || job.id,
      customer: job.customer || "Unknown",
      status: job.status,
      dueDate: job.due_date || "",
      desk,
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private static buildSingleDeskRecord(
    job: JobInput,
    hotJobIds: Set<string>,
  ): JobDeskRecord {
    const routing = job.routing || [];
    const isHot = hotJobIds.has(job.id);

    // Build traveler steps from routing
    const traveler: TravelerStepRecord[] = routing.map((step, i) => {
      const stepStatus = STATUS_TO_TRAVELER[step.status || "pending"] || "ready";
      const estMin = step.estimated_time_min || 0;
      const actMin = step.actual_time_min || 0;
      const setupMin = step.setup_time_min || 0;

      return {
        id: `trav-${job.id}-${step.step}`,
        code: `OP${String(step.step * 10).padStart(3, "0")}`,
        title: step.operation,
        machine: step.work_center,
        estimate: estMin > 0 ? `${setupMin > 0 ? `${setupMin}m setup + ` : ""}${estMin}m cycle` : "TBD",
        status: stepStatus,
        note: actMin > 0 && estMin > 0 && actMin > estMin * 1.2
          ? `Over estimate by ${Math.round(((actMin - estMin) / estMin) * 100)}%`
          : "",
      };
    });

    // Detect shortages (placeholder — real impl reads material/tool inventory)
    const shortages: ShortageRecord[] = [];
    if (job.material && job.status === "scheduled") {
      shortages.push({
        id: `short-mat-${job.id}`,
        item: job.material,
        eta: "Check stock",
        severity: "watch",
        action: "Verify material availability before start",
        owner: "Purchasing",
      });
    }

    // Build timeline from status history
    const timeline: WorkflowTimelineEntry[] = (job.status_history || [])
      .slice(-10)
      .map((entry, i) => ({
        id: `tl-${job.id}-${i}`,
        time: entry.timestamp,
        title: `Status → ${entry.status}`,
        detail: entry.notes || `Changed by ${entry.user}`,
        tone: (entry.status === "qc_failed" || entry.status === "on_hold" ? "watch" : "neutral") as WorkflowTone,
      }));

    // Determine queue slot
    const activeStep = routing.find((s) => s.status === "in_progress" || s.status === "running");
    const queueSlot = activeStep
      ? `OP${String(activeStep.step * 10).padStart(3, "0")} @ ${activeStep.work_center}`
      : job.status === "scheduled"
        ? "Queued"
        : job.status;

    // Determine next actions
    const nextActions: string[] = [];
    if (job.status === "scheduled") nextActions.push("Release to floor");
    if (job.status === "in_progress") nextActions.push("Monitor cycle time");
    if (job.status === "qc_pending") nextActions.push("Perform inspection");
    if (job.status === "qc_failed") nextActions.push("Review disposition");
    if (job.status === "qc_passed") nextActions.push("Prepare for shipping");
    if (isHot) nextActions.unshift("PRIORITY: expedite this job");

    return {
      jobId: job.id,
      owner: job.customer || "Unknown",
      workcenter: activeStep?.work_center || routing[0]?.work_center || "Unassigned",
      queueSlot,
      isHot,
      hotNote: isHot ? "Flagged as priority job" : null,
      traveler,
      shortages,
      approvals: JobDeskAggregatorEngine.buildJobApprovals(job),
      attachments: JobDeskAggregatorEngine.buildAttachments(job),
      timeline,
      purchasingActions: shortages.length > 0 ? ["Check material stock levels"] : [],
      nextActions,
    };
  }

  private static buildAttachments(job: JobInput): JobAttachmentRecord[] {
    const attachments: JobAttachmentRecord[] = [
      { id: `att-route-${job.id}`, label: "Route Sheet", type: "pdf", freshness: "current" },
    ];
    if (job.routing && job.routing.length > 0) {
      attachments.push({ id: `att-setup-${job.id}`, label: "Setup Sheet", type: "pdf", freshness: "current" });
    }
    return attachments;
  }
}

export const jobDeskAggregatorEngine = new JobDeskAggregatorEngine();
