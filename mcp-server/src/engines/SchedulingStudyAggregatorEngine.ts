/**
 * SchedulingStudyAggregatorEngine — Multi-Algorithm Scheduling Aggregator
 * ========================================================================
 *
 * Aggregates results from multiple scheduling algorithms (job-shop, single-machine,
 * Johnson's two-machine, CPM) into unified study records for the scheduling desk.
 *
 * Backs the SchedulingProvider contract from
 * web/src/features/operating-system/contracts.ts.
 *
 * @version 1.0.0 — Sprint C1
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StudyTone = "ready" | "loaded" | "watch" | "critical";
export type ExceptionSeverity = "info" | "watch" | "critical";
export type ApprovalStatus = "ready" | "waiting" | "approved" | "blocked";

export interface SummaryMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}

export interface StudyException {
  id: string;
  title: string;
  detail: string;
  severity: ExceptionSeverity;
}

export interface PlannerAction {
  id: string;
  title: string;
  detail: string;
}

export interface SequenceStep {
  id: string;
  label: string;
  detail: string;
  badge?: string;
}

export interface MachineBlock {
  id: string;
  jobId: string;
  start: number;
  end: number;
}

export interface MachineLane {
  id: string;
  machine: string;
  note: string;
  blocks: MachineBlock[];
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

export interface ScheduleReleaseCheck {
  id: string;
  label: string;
  detail: string;
}

export interface ScheduleRelease {
  studyKey: string;
  owner: string;
  publishSummary: string;
  approvals: ApprovalSummary[];
  shortages: ShortageRecord[];
  checks: ScheduleReleaseCheck[];
}

export interface SchedulingStudyRecord {
  key: string;
  label: string;
  detail: string;
  tone: StudyTone;
  statusLabel: string;
  postureValue: string;
  bottleneckValue: string;
  publishValue: string;
  boardTitle: string;
  boardSubtitle: string;
  metrics: SummaryMetric[];
  exceptions: StudyException[];
  plannerActions: PlannerAction[];
  sequence: SequenceStep[];
  machineLanes: MachineLane[];
  release: ScheduleRelease;
  payload: unknown | null;
  payloadLabel: string;
  inspectorNote: string;
}

/** Input from existing scheduling engines */
export interface SchedulingStudyInputs {
  jobShopResult: JobShopResult | null;
  singleResult: SingleMachineResult | null;
  johnsonsResult: JohnsonsResult | null;
  cpmResult: CpmResult | null;
}

export interface JobShopResult {
  makespan: number;
  jobs: Array<{ id: string; machine: string; start: number; end: number }>;
  utilization: Record<string, number>;
}

export interface SingleMachineResult {
  sequence: string[];
  totalWeightedCompletion: number;
  avgFlowTime: number;
}

export interface JohnsonsResult {
  sequence: string[];
  makespan: number;
  machine1Idle: number;
  machine2Idle: number;
}

export interface CpmResult {
  criticalPath: string[];
  projectDuration: number;
  slack: Record<string, number>;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class SchedulingStudyAggregatorEngine {
  /**
   * Build study records from scheduling algorithm outputs.
   * @param inputs - Results from job-shop, single-machine, Johnson's, and CPM solvers
   */
  static buildStudies(inputs: SchedulingStudyInputs): SchedulingStudyRecord[] {
    const studies: SchedulingStudyRecord[] = [];

    if (inputs.jobShopResult) {
      studies.push(SchedulingStudyAggregatorEngine.buildJobShopStudy(inputs.jobShopResult));
    }
    if (inputs.singleResult) {
      studies.push(SchedulingStudyAggregatorEngine.buildSingleMachineStudy(inputs.singleResult));
    }
    if (inputs.johnsonsResult) {
      studies.push(SchedulingStudyAggregatorEngine.buildJohnsonsStudy(inputs.johnsonsResult));
    }
    if (inputs.cpmResult) {
      studies.push(SchedulingStudyAggregatorEngine.buildCpmStudy(inputs.cpmResult));
    }

    if (studies.length === 0) {
      studies.push(SchedulingStudyAggregatorEngine.buildEmptyStudy());
    }

    return studies;
  }

  /**
   * Build a schedule release record for approval workflow.
   */
  static buildScheduleRelease(input: {
    studyKey: string;
    tone: StudyTone;
    checks: ScheduleReleaseCheck[];
    exceptions: StudyException[];
  }): ScheduleRelease {
    const criticalCount = input.exceptions.filter((e) => e.severity === "critical").length;
    return {
      studyKey: input.studyKey,
      owner: "Scheduling Lead",
      publishSummary: criticalCount > 0
        ? `${criticalCount} critical exception(s) — review before release`
        : "Schedule ready for release",
      approvals: [
        { id: `appr-sched-${input.studyKey}`, label: "Scheduling", owner: "Scheduling Lead", status: input.tone === "critical" ? "blocked" : "ready", detail: "Schedule feasibility review" },
        { id: `appr-floor-${input.studyKey}`, label: "Floor Lead", owner: "Shift Lead", status: "waiting", detail: "Capacity and resource confirmation" },
      ],
      shortages: [],
      checks: input.checks,
    };
  }

  // ─── Private Builders ─────────────────────────────────────────────────────

  private static determineTone(utilization: number, exceptions: number): StudyTone {
    if (exceptions > 0) return "critical";
    if (utilization > 0.9) return "loaded";
    if (utilization > 0.7) return "watch";
    return "ready";
  }

  private static buildJobShopStudy(result: JobShopResult): SchedulingStudyRecord {
    const machines = Object.keys(result.utilization);
    const avgUtil = machines.length > 0
      ? machines.reduce((sum, m) => sum + (result.utilization[m] || 0), 0) / machines.length
      : 0;
    const bottleneck = machines.reduce((best, m) =>
      (result.utilization[m] || 0) > (result.utilization[best] || 0) ? m : best, machines[0] || "none");

    const exceptions: StudyException[] = [];
    if (avgUtil > 0.95) {
      exceptions.push({ id: "exc-overload", title: "Near capacity", detail: `Average utilization ${(avgUtil * 100).toFixed(0)}% — no buffer for breakdowns`, severity: "critical" });
    }

    const tone = SchedulingStudyAggregatorEngine.determineTone(avgUtil, exceptions.length);

    return {
      key: "job-shop",
      label: "Job Shop Schedule",
      detail: `${result.jobs.length} operations across ${machines.length} machines`,
      tone,
      statusLabel: tone === "ready" ? "Feasible" : tone === "loaded" ? "Tight" : "Review",
      postureValue: `${(avgUtil * 100).toFixed(0)}% util`,
      bottleneckValue: bottleneck,
      publishValue: exceptions.length > 0 ? "Hold" : "Ready",
      boardTitle: "Job Shop Gantt",
      boardSubtitle: `Makespan: ${result.makespan} min`,
      metrics: [
        { id: "js-makespan", label: "Makespan", value: `${result.makespan} min`, hint: "Total schedule duration" },
        { id: "js-util", label: "Avg Utilization", value: `${(avgUtil * 100).toFixed(0)}%`, hint: "Mean machine utilization", accent: avgUtil > 0.9 ? "amber" : "emerald" },
        { id: "js-machines", label: "Machines", value: String(machines.length), hint: "Active machine count" },
        { id: "js-ops", label: "Operations", value: String(result.jobs.length), hint: "Scheduled operation count" },
      ],
      exceptions,
      plannerActions: [
        { id: "pa-review", title: "Review bottleneck", detail: `Machine ${bottleneck} is the constraint — consider load balancing` },
      ],
      sequence: result.jobs.slice(0, 10).map((j, i) => ({
        id: `seq-${i}`, label: j.id, detail: `${j.machine}: ${j.start}–${j.end} min`, badge: j.machine,
      })),
      machineLanes: machines.map((m) => ({
        id: `lane-${m}`, machine: m, note: `${(result.utilization[m] * 100).toFixed(0)}% util`,
        blocks: result.jobs.filter((j) => j.machine === m).map((j, i) => ({
          id: `blk-${m}-${i}`, jobId: j.id, start: j.start, end: j.end,
        })),
      })),
      release: SchedulingStudyAggregatorEngine.buildScheduleRelease({
        studyKey: "job-shop", tone, checks: [
          { id: "chk-capacity", label: "Capacity check", detail: `${machines.length} machines, ${(avgUtil * 100).toFixed(0)}% average load` },
        ], exceptions,
      }),
      payload: result,
      payloadLabel: "JobShopSchedulingEngine result",
      inspectorNote: `Job-shop schedule with ${result.jobs.length} ops, makespan ${result.makespan} min, avg util ${(avgUtil * 100).toFixed(0)}%.`,
    };
  }

  private static buildSingleMachineStudy(result: SingleMachineResult): SchedulingStudyRecord {
    return {
      key: "single-machine",
      label: "Single Machine Sequence",
      detail: `${result.sequence.length} jobs in optimal order`,
      tone: "ready",
      statusLabel: "Optimal",
      postureValue: `${result.avgFlowTime.toFixed(0)} min avg`,
      bottleneckValue: "Single machine",
      publishValue: "Ready",
      boardTitle: "Job Sequence",
      boardSubtitle: `Avg flow: ${result.avgFlowTime.toFixed(0)} min`,
      metrics: [
        { id: "sm-flow", label: "Avg Flow Time", value: `${result.avgFlowTime.toFixed(0)} min`, hint: "Weighted completion time / n" },
        { id: "sm-jobs", label: "Jobs", value: String(result.sequence.length), hint: "Total jobs in sequence" },
        { id: "sm-twc", label: "Total Weighted Completion", value: `${result.totalWeightedCompletion.toFixed(0)}`, hint: "Sum of weighted completion times" },
      ],
      exceptions: [],
      plannerActions: [],
      sequence: result.sequence.map((jobId, i) => ({
        id: `seq-sm-${i}`, label: jobId, detail: `Position ${i + 1}`, badge: String(i + 1),
      })),
      machineLanes: [],
      release: SchedulingStudyAggregatorEngine.buildScheduleRelease({
        studyKey: "single-machine", tone: "ready", checks: [], exceptions: [],
      }),
      payload: result,
      payloadLabel: "SingleMachineScheduling result",
      inspectorNote: `SPT-ordered sequence of ${result.sequence.length} jobs.`,
    };
  }

  private static buildJohnsonsStudy(result: JohnsonsResult): SchedulingStudyRecord {
    const totalIdle = result.machine1Idle + result.machine2Idle;
    const tone: StudyTone = totalIdle > result.makespan * 0.3 ? "watch" : "ready";

    return {
      key: "johnsons",
      label: "Johnson's Two-Machine",
      detail: `Optimal sequence for 2-machine flow shop`,
      tone,
      statusLabel: "Johnson's Rule",
      postureValue: `${result.makespan} min`,
      bottleneckValue: result.machine1Idle > result.machine2Idle ? "Machine 1 idle" : "Machine 2 idle",
      publishValue: "Ready",
      boardTitle: "Flow Shop",
      boardSubtitle: `Makespan: ${result.makespan} min`,
      metrics: [
        { id: "jn-makespan", label: "Makespan", value: `${result.makespan} min`, hint: "Total flow shop duration" },
        { id: "jn-idle1", label: "M1 Idle", value: `${result.machine1Idle} min`, hint: "Machine 1 idle time" },
        { id: "jn-idle2", label: "M2 Idle", value: `${result.machine2Idle} min`, hint: "Machine 2 idle time" },
      ],
      exceptions: [],
      plannerActions: [],
      sequence: result.sequence.map((jobId, i) => ({
        id: `seq-jn-${i}`, label: jobId, detail: `Position ${i + 1}`, badge: String(i + 1),
      })),
      machineLanes: [],
      release: SchedulingStudyAggregatorEngine.buildScheduleRelease({
        studyKey: "johnsons", tone, checks: [], exceptions: [],
      }),
      payload: result,
      payloadLabel: "Johnson's algorithm result",
      inspectorNote: `Johnson's rule sequence, makespan ${result.makespan} min, total idle ${totalIdle} min.`,
    };
  }

  private static buildCpmStudy(result: CpmResult): SchedulingStudyRecord {
    const criticalLen = result.criticalPath.length;
    const zeroSlack = Object.values(result.slack).filter((s) => s === 0).length;

    return {
      key: "cpm",
      label: "Critical Path Method",
      detail: `${criticalLen} activities on critical path`,
      tone: zeroSlack > criticalLen * 0.8 ? "watch" : "ready",
      statusLabel: "CPM",
      postureValue: `${result.projectDuration} min`,
      bottleneckValue: `${criticalLen} critical activities`,
      publishValue: "Ready",
      boardTitle: "Project Network",
      boardSubtitle: `Duration: ${result.projectDuration} min`,
      metrics: [
        { id: "cpm-dur", label: "Duration", value: `${result.projectDuration} min`, hint: "Critical path length" },
        { id: "cpm-critical", label: "Critical Activities", value: String(criticalLen), hint: "Zero-slack activities" },
        { id: "cpm-slack", label: "Avg Slack", value: `${(Object.values(result.slack).reduce((a, b) => a + b, 0) / Math.max(Object.keys(result.slack).length, 1)).toFixed(0)} min`, hint: "Average slack across all activities" },
      ],
      exceptions: [],
      plannerActions: result.criticalPath.length > 5
        ? [{ id: "pa-cpm", title: "Long critical path", detail: "Consider crashing critical activities to reduce duration" }]
        : [],
      sequence: result.criticalPath.map((act, i) => ({
        id: `seq-cpm-${i}`, label: act, detail: `Slack: ${result.slack[act] ?? 0} min`, badge: result.slack[act] === 0 ? "Critical" : undefined,
      })),
      machineLanes: [],
      release: SchedulingStudyAggregatorEngine.buildScheduleRelease({
        studyKey: "cpm", tone: "ready", checks: [], exceptions: [],
      }),
      payload: result,
      payloadLabel: "CPM analysis result",
      inspectorNote: `CPM network: ${criticalLen} critical activities, project duration ${result.projectDuration} min.`,
    };
  }

  private static buildEmptyStudy(): SchedulingStudyRecord {
    return {
      key: "empty",
      label: "No Scheduling Data",
      detail: "Run a scheduling algorithm to see results here",
      tone: "ready",
      statusLabel: "Waiting",
      postureValue: "N/A",
      bottleneckValue: "N/A",
      publishValue: "N/A",
      boardTitle: "Empty",
      boardSubtitle: "No data",
      metrics: [],
      exceptions: [],
      plannerActions: [{ id: "pa-run", title: "Run scheduler", detail: "Submit jobs to the scheduling engine" }],
      sequence: [],
      machineLanes: [],
      release: { studyKey: "empty", owner: "", publishSummary: "", approvals: [], shortages: [], checks: [] },
      payload: null,
      payloadLabel: "No payload",
      inspectorNote: "No scheduling results available.",
    };
  }
}

export const schedulingStudyAggregatorEngine = new SchedulingStudyAggregatorEngine();
