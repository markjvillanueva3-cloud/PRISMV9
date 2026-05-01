import type { MilestoneKey, MilestoneTimeline } from "./MilestoneTrackingEngine.js";
import { milestoneTrackingEngine } from "./MilestoneTrackingEngine.js";

export type MilestoneSyncSurface =
  | "jobs-desk"
  | "order-tracking"
  | "traveler-desk"
  | "dispatch-board"
  | "shop-floor-clock";

export type MilestoneSyncTrigger =
  | "job-created"
  | "job-status-changed"
  | "order-created"
  | "order-status-changed"
  | "order-time-logged"
  | "order-production-logged"
  | "traveler-created"
  | "traveler-step-started"
  | "traveler-step-completed"
  | "traveler-step-skipped"
  | "traveler-scan-transition"
  | "dispatch-job-queued"
  | "dispatch-queue-reordered"
  | "dispatch-entry-removed"
  | "dispatch-what-if-ran"
  | "shop-floor-job-registered"
  | "shop-floor-department-check-in"
  | "shop-floor-job-started"
  | "shop-floor-job-paused"
  | "shop-floor-job-stopped"
  | "shop-floor-task-started"
  | "shop-floor-task-paused"
  | "shop-floor-task-completed";

export type MilestoneSyncOutcome = "seeded" | "aligned" | "observed" | "drift" | "error";

export interface MilestoneSyncEvent {
  id: string;
  job_id: string;
  source: MilestoneSyncSurface;
  trigger: MilestoneSyncTrigger;
  outcome: MilestoneSyncOutcome;
  summary: string;
  details: string[];
  timestamp: string;
  target_milestone?: MilestoneKey;
  cli_command: string;
}

export interface MilestoneSyncInput {
  job_id: string;
  source: MilestoneSyncSurface;
  trigger: MilestoneSyncTrigger;
  status?: string;
  operation?: string;
  department?: string;
  machine_id?: string;
  action?: string;
  step_number?: number;
  hours?: number;
  quantity_completed?: number;
  scrap_qty?: number;
  note?: string;
}

export interface MilestoneSyncResult {
  event: MilestoneSyncEvent;
  timeline: MilestoneTimeline | null;
  refresh_timeline: boolean;
  recent_events: MilestoneSyncEvent[];
}

interface MilestoneSyncIntent {
  createAt?: MilestoneKey;
  targetMilestone?: MilestoneKey;
  summary: string;
  details: string[];
  maxAutoAdvanceSteps: number;
}

const JOB_STATUS_TARGETS: Record<string, MilestoneKey> = {
  quoted: "quote_sent",
  planned: "programming",
  in_progress: "production",
  complete: "quality_inspection",
  shipped: "packing_shipping",
  invoiced: "delivered",
};

const ORDER_STATUS_TARGETS: Record<string, MilestoneKey> = {
  planned: "programming",
  pending: "programming",
  in_progress: "production",
  running: "production",
  complete: "quality_inspection",
  completed: "quality_inspection",
  shipped: "packing_shipping",
};

function normalizeValue(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function milestoneLabel(key: MilestoneKey) {
  return titleCase(key);
}

function buildCliCommand(source: MilestoneSyncSurface, jobId: string, targetMilestone?: MilestoneKey) {
  const targetSuffix = targetMilestone ? ` --target ${targetMilestone}` : "";
  return `prism milestone align --job ${jobId} --surface ${source}${targetSuffix}`;
}

function activeMilestone(timeline: MilestoneTimeline | null) {
  return timeline?.current_milestone
    ?? timeline?.milestones.find((entry) => entry.status === "active")?.milestone_key
    ?? null;
}

function milestoneIndex(timeline: MilestoneTimeline, key: MilestoneKey) {
  return timeline.milestones.findIndex((entry) => entry.milestone_key === key);
}

function inferOperationMilestone(operation?: string): MilestoneKey {
  const normalized = normalizeValue(operation);
  if (normalized.includes("program")) return "programming";
  if (normalized.includes("cad") || normalized.includes("design")) return "design_review";
  if (normalized.includes("setup")) return "setup";
  if (normalized.includes("first")) return "first_article";
  if (normalized.includes("inspect")) return "quality_inspection";
  if (normalized.includes("finish") || normalized.includes("deburr")) return "finishing";
  if (normalized.includes("pack") || normalized.includes("ship")) return "packing_shipping";
  return "production";
}

function inferDepartmentMilestone(department?: string): MilestoneKey | undefined {
  const normalized = normalizeValue(department);
  if (!normalized) {
    return undefined;
  }

  if (normalized.includes("intake") || normalized.includes("order")) return "order_confirmed";
  if (normalized.includes("cad") || normalized.includes("design")) return "design_review";
  if (normalized.includes("cam") || normalized.includes("program")) return "programming";
  if (normalized.includes("setup")) return "setup";
  if (normalized.includes("run") || normalized.includes("machin") || normalized.includes("production")) return "production";
  if (normalized.includes("quality") || normalized.includes("inspect") || normalized.includes("qc")) return "quality_inspection";
  if (normalized.includes("finish") || normalized.includes("deburr")) return "finishing";
  if (normalized.includes("pack") || normalized.includes("ship")) return "packing_shipping";
  return undefined;
}

function inferExecutionMilestone(operation?: string, department?: string): MilestoneKey {
  return inferDepartmentMilestone(department) ?? inferOperationMilestone(operation);
}

function inferTravelerActionMilestone(input: MilestoneSyncInput): MilestoneKey {
  const normalizedAction = normalizeValue(input.action);
  if (normalizedAction === "setup" || normalizedAction === "start_setup") {
    return "setup";
  }
  if (normalizedAction === "cycle" || normalizedAction === "start_cycle") {
    return inferExecutionMilestone(input.operation, input.department);
  }
  return inferExecutionMilestone(input.operation, input.department);
}

function machineDetail(machineId?: string) {
  return machineId ? ` on ${machineId}` : "";
}

function stepDetail(stepNumber?: number, operation?: string) {
  const fragments = [
    typeof stepNumber === "number" ? `step ${stepNumber}` : "",
    operation ? titleCase(operation) : "",
  ].filter(Boolean);

  return fragments.length > 0 ? fragments.join(" ") : "the current traveler step";
}

function appendNote(details: string[], note?: string) {
  if (note?.trim()) {
    details.push(note.trim());
  }
}

function inferSyncIntent(input: MilestoneSyncInput): MilestoneSyncIntent {
  const details: string[] = [];

  switch (input.trigger) {
    case "job-created":
      appendNote(details, input.note);
      details.push("Start the internal execution timeline where programming and release decisions become shop-floor work.");
      return {
        createAt: "programming",
        targetMilestone: "programming",
        summary: "Seeded a PRISM execution timeline for a newly released job.",
        details,
        maxAutoAdvanceSteps: 0,
      };
    case "job-status-changed": {
      const normalizedStatus = normalizeValue(input.status);
      const targetMilestone = JOB_STATUS_TARGETS[normalizedStatus];
      details.push(`Dispatch changed the job status to ${titleCase(normalizedStatus || "unknown")}.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: `Aligned the job timeline to the ${titleCase(normalizedStatus || "current")} execution posture.`,
        details,
        maxAutoAdvanceSteps: 4,
      };
    }
    case "order-created":
      appendNote(details, input.note);
      details.push("The work order now has enough routing context to start in the machine-ready execution band.");
      return {
        createAt: "setup",
        targetMilestone: "setup",
        summary: "Seeded a PRISM milestone timeline for a newly staged work order.",
        details,
        maxAutoAdvanceSteps: 0,
      };
    case "order-status-changed": {
      const normalizedStatus = normalizeValue(input.status);
      const targetMilestone = ORDER_STATUS_TARGETS[normalizedStatus];
      details.push(`Order control changed the work-order status to ${titleCase(normalizedStatus || "unknown")}.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: `Aligned the work-order timeline to the ${titleCase(normalizedStatus || "current")} production posture.`,
        details,
        maxAutoAdvanceSteps: 4,
      };
    }
    case "order-time-logged": {
      const targetMilestone = inferOperationMilestone(input.operation);
      details.push(
        input.hours && input.hours > 0
          ? `Logged ${input.hours} hours against ${input.operation || "the active operation"}.`
          : `Logged execution time against ${input.operation || "the active operation"}.`,
      );
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Used logged execution time to align the PRISM work-order timeline.",
        details,
        maxAutoAdvanceSteps: 3,
      };
    }
    case "order-production-logged": {
      const targetMilestone = "production";
      details.push(
        input.quantity_completed && input.quantity_completed > 0
          ? `Recorded ${input.quantity_completed} completed parts on the work order.`
          : "Recorded production activity on the work order.",
      );
      if (typeof input.scrap_qty === "number" && input.scrap_qty > 0) {
        details.push(`Scrap signal detected: ${input.scrap_qty} parts require quality review.`);
      }
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Aligned the PRISM timeline to active production using live completion signals.",
        details,
        maxAutoAdvanceSteps: 3,
      };
    }
    case "traveler-created":
      details.push("Traveler routing is now staged as an executable packet instead of a planning-only job record.");
      appendNote(details, input.note);
      return {
        createAt: "setup",
        targetMilestone: "setup",
        summary: "Seeded a traveler-driven execution timeline at machine setup.",
        details,
        maxAutoAdvanceSteps: 1,
      };
    case "traveler-step-started": {
      const targetMilestone = inferTravelerActionMilestone(input);
      const actionLabel = normalizeValue(input.action) === "setup" ? "setup" : normalizeValue(input.action) === "cycle" ? "cycle" : "step";
      details.push(`Traveler ${stepDetail(input.step_number, input.operation)} entered ${actionLabel} execution.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Aligned the PRISM traveler timeline to the actively running routing step.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    }
    case "traveler-step-completed": {
      const targetMilestone = inferTravelerActionMilestone(input);
      details.push(`Traveler ${stepDetail(input.step_number, input.operation)} completed.`);
      if (input.quantity_completed && input.quantity_completed > 0) {
        details.push(`Completed quantity captured: ${input.quantity_completed}.`);
      }
      if (typeof input.scrap_qty === "number" && input.scrap_qty > 0) {
        details.push(`Scrap signal detected at traveler completion: ${input.scrap_qty}.`);
      }
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Used traveler completion feedback to align the live routing timeline.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    }
    case "traveler-step-skipped": {
      const targetMilestone = inferTravelerActionMilestone(input);
      details.push(`Traveler ${stepDetail(input.step_number, input.operation)} was skipped and requires explicit continuity memory.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Captured a traveler skip event without losing milestone continuity.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    }
    case "traveler-scan-transition": {
      const targetMilestone = inferTravelerActionMilestone(input);
      const scanAction = normalizeValue(input.action) || "scan";
      details.push(`Scanner-driven traveler transition executed ${scanAction.replace(/_/g, " ")} on ${stepDetail(input.step_number, input.operation)}.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Folded a scanner-driven traveler transition into canonical PRISM routing memory.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    }
    case "dispatch-job-queued":
      details.push(`Dispatch queued the job${machineDetail(input.machine_id)} and exposed it to machine-ready execution.`);
      appendNote(details, input.note);
      return {
        createAt: "setup",
        targetMilestone: "setup",
        summary: "Aligned queued dispatch work to the machine-ready setup posture.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    case "dispatch-queue-reordered":
      details.push(`Dispatch reordered the live queue${machineDetail(input.machine_id)}.`);
      appendNote(details, input.note);
      return {
        summary: "Captured a dispatch reorder in canonical PRISM queue memory.",
        details,
        maxAutoAdvanceSteps: 0,
      };
    case "dispatch-entry-removed":
      details.push(`Dispatch removed a queued entry${machineDetail(input.machine_id)}.`);
      appendNote(details, input.note);
      return {
        summary: "Captured a dispatch removal without forcing milestone alignment.",
        details,
        maxAutoAdvanceSteps: 0,
      };
    case "dispatch-what-if-ran":
      details.push(`Dispatch ran a what-if simulation${machineDetail(input.machine_id)} to inspect downstream queue impact.`);
      appendNote(details, input.note);
      return {
        summary: "Stored a dispatch what-if reasoning pass in PRISM execution memory.",
        details,
        maxAutoAdvanceSteps: 0,
      };
    case "shop-floor-job-registered": {
      const targetMilestone = inferExecutionMilestone(input.operation, input.department);
      details.push(
        `Shop floor registered a traveler packet${input.department ? ` in ${titleCase(input.department)}` : ""}${input.operation ? ` for ${titleCase(input.operation)}` : ""}.`,
      );
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Seeded floor-side PRISM memory from a registered traveler packet.",
        details,
        maxAutoAdvanceSteps: 1,
      };
    }
    case "shop-floor-department-check-in": {
      const targetMilestone = inferExecutionMilestone(input.operation, input.department);
      details.push(`The packet checked into ${titleCase(input.department || input.operation || "the selected department")}.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Aligned the timeline to the department currently owning the packet.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    }
    case "shop-floor-job-started": {
      const targetMilestone = inferExecutionMilestone(input.operation, input.department);
      details.push(`A floor timer started${input.operation ? ` on ${titleCase(input.operation)}` : ""}.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Aligned the timeline to an actively running floor timer.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    }
    case "shop-floor-job-paused":
      details.push(`A floor timer paused${input.operation ? ` on ${titleCase(input.operation)}` : ""}.`);
      appendNote(details, input.note);
      return {
        summary: "Captured a floor pause event without forcing a milestone jump.",
        details,
        maxAutoAdvanceSteps: 0,
      };
    case "shop-floor-job-stopped": {
      const targetMilestone = inferExecutionMilestone(input.operation, input.department);
      details.push(`A floor timer stopped${input.operation ? ` on ${titleCase(input.operation)}` : ""}.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Recorded a floor timer stop while preserving PRISM execution continuity.",
        details,
        maxAutoAdvanceSteps: 1,
      };
    }
    case "shop-floor-task-started": {
      const targetMilestone = inferExecutionMilestone(input.operation, input.department);
      details.push(`A mobile floor task started for ${titleCase(input.operation || input.department || "the active packet")}.`);
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Aligned PRISM floor memory to a locally started task.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    }
    case "shop-floor-task-paused":
      details.push(`A mobile floor task paused for ${titleCase(input.operation || input.department || "the active packet")}.`);
      appendNote(details, input.note);
      return {
        summary: "Captured a paused floor task without changing milestone alignment.",
        details,
        maxAutoAdvanceSteps: 0,
      };
    case "shop-floor-task-completed": {
      const targetMilestone = inferExecutionMilestone(input.operation, input.department);
      details.push(`A mobile floor task completed for ${titleCase(input.operation || input.department || "the active packet")}.`);
      if (input.quantity_completed && input.quantity_completed > 0) {
        details.push(`Completed quantity recorded from the floor task: ${input.quantity_completed}.`);
      }
      if (typeof input.scrap_qty === "number" && input.scrap_qty > 0) {
        details.push(`Extra or scrap quantity to review from floor completion: ${input.scrap_qty}.`);
      }
      appendNote(details, input.note);
      return {
        createAt: targetMilestone,
        targetMilestone,
        summary: "Used floor task completion to keep the canonical packet memory aligned.",
        details,
        maxAutoAdvanceSteps: 2,
      };
    }
  }
}

export class MilestoneIntelligenceEngine {
  private syncEventLog: MilestoneSyncEvent[] = [];

  syncMutation(input: MilestoneSyncInput): MilestoneSyncResult {
    const timestamp = new Date().toISOString();
    const intent = inferSyncIntent(input);
    const targetMilestone = intent.targetMilestone ?? intent.createAt;

    if (!targetMilestone) {
      return this.buildResult(
        input,
        "observed",
        intent.summary,
        [
          "PRISM captured the event but left milestone alignment unchanged because no trusted target milestone was inferred.",
          ...intent.details,
        ],
        timestamp,
        null,
      );
    }

    try {
      let timeline = milestoneTrackingEngine.getTimeline(input.job_id);
      let created = false;

      if (!timeline) {
        timeline = milestoneTrackingEngine.createTimeline({
          job_id: input.job_id,
          start_at_milestone: intent.createAt ?? targetMilestone,
        });
        created = true;
      }

      if (created) {
        return this.buildResult(
          input,
          "seeded",
          intent.summary,
          [
            `Seeded the timeline at ${milestoneLabel(targetMilestone)} so the PRISM copilot, CLI, and desk surfaces start from the current execution band.`,
            ...intent.details,
          ],
          timestamp,
          timeline,
          targetMilestone,
          true,
        );
      }

      const currentMilestone = activeMilestone(timeline);
      if (!currentMilestone) {
        return this.buildResult(
          input,
          "error",
          "PRISM could not align the timeline because no active milestone is available.",
          [
            "The timeline exists, but there is no active milestone for the alignment engine to advance.",
            ...intent.details,
          ],
          timestamp,
          timeline,
          targetMilestone,
        );
      }

      const currentIdx = milestoneIndex(timeline, currentMilestone);
      const targetIdx = milestoneIndex(timeline, targetMilestone);

      if (currentIdx < 0 || targetIdx < 0) {
        return this.buildResult(
          input,
          "error",
          "PRISM could not align the timeline because the target milestone is missing.",
          [
            `Current milestone: ${milestoneLabel(currentMilestone)}.`,
            `Target milestone: ${milestoneLabel(targetMilestone)}.`,
            ...intent.details,
          ],
          timestamp,
          timeline,
          targetMilestone,
        );
      }

      if (currentIdx === targetIdx) {
        return this.buildResult(
          input,
          "observed",
          intent.summary,
          [
            `Timeline already matches ${milestoneLabel(targetMilestone)}.`,
            ...intent.details,
          ],
          timestamp,
          timeline,
          targetMilestone,
        );
      }

      if (currentIdx > targetIdx) {
        return this.buildResult(
          input,
          "observed",
          "PRISM kept the timeline where it is because execution is already ahead of this event.",
          [
            `Timeline is already at ${milestoneLabel(currentMilestone)} while this event maps to ${milestoneLabel(targetMilestone)}.`,
            ...intent.details,
          ],
          timestamp,
          timeline,
          targetMilestone,
        );
      }

      const gap = targetIdx - currentIdx;
      if (gap > intent.maxAutoAdvanceSteps) {
        return this.buildResult(
          input,
          "drift",
          "PRISM detected timeline drift and stopped before auto-advancing too far.",
          [
            `Current milestone ${milestoneLabel(currentMilestone)} is ${gap} stages behind ${milestoneLabel(targetMilestone)}.`,
            "Use the CLI route or the intelligence desk to review the missing handoff history before forcing alignment.",
            ...intent.details,
          ],
          timestamp,
          timeline,
          targetMilestone,
        );
      }

      let nextTimeline = timeline;
      while (nextTimeline.current_idx < targetIdx && activeMilestone(nextTimeline)) {
        nextTimeline = milestoneTrackingEngine.advanceMilestone({
          job_id: input.job_id,
          notes: `${intent.summary} Auto-aligned from ${input.source}.`,
          advanced_by: `${input.source}:milestone-sync`,
        });
      }

      return this.buildResult(
        input,
        activeMilestone(nextTimeline) === targetMilestone ? "aligned" : "drift",
        intent.summary,
        [
          `Advanced the live timeline from ${milestoneLabel(currentMilestone)} to ${milestoneLabel(activeMilestone(nextTimeline) ?? targetMilestone)}.`,
          ...intent.details,
        ],
        timestamp,
        nextTimeline,
        targetMilestone,
        true,
      );
    } catch (issue: any) {
      return this.buildResult(
        input,
        "error",
        "PRISM failed to synchronize the milestone timeline.",
        [
          issue?.message || "Unknown milestone synchronization error.",
          ...intent.details,
        ],
        timestamp,
        milestoneTrackingEngine.getTimeline(input.job_id),
        targetMilestone,
      );
    }
  }

  listSyncEvents(jobId: string, limit = 10): MilestoneSyncEvent[] {
    return this.syncEventLog
      .filter((event) => event.job_id === jobId)
      .slice(-Math.max(limit, 1))
      .reverse();
  }

  private buildResult(
    input: MilestoneSyncInput,
    outcome: MilestoneSyncOutcome,
    summary: string,
    details: string[],
    timestamp: string,
    timeline: MilestoneTimeline | null,
    targetMilestone?: MilestoneKey,
    refreshTimeline = false,
  ): MilestoneSyncResult {
    const event: MilestoneSyncEvent = {
      id: `${input.job_id}:${input.trigger}:${timestamp}:${outcome}`,
      job_id: input.job_id,
      source: input.source,
      trigger: input.trigger,
      outcome,
      summary,
      details: details.filter(Boolean),
      timestamp,
      target_milestone: targetMilestone,
      cli_command: buildCliCommand(input.source, input.job_id, targetMilestone),
    };

    this.syncEventLog.push(event);
    if (this.syncEventLog.length > 5000) {
      this.syncEventLog = this.syncEventLog.slice(-2500);
    }

    return {
      event,
      timeline,
      refresh_timeline: refreshTimeline,
      recent_events: this.listSyncEvents(input.job_id, 6),
    };
  }
}

export const milestoneIntelligenceEngine = new MilestoneIntelligenceEngine();
