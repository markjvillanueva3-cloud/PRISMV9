/**
 * JobTravelerEngine — Session 6-7 U-TRAV1
 *
 * E2-style job traveler with ordered routing steps and dual time tracking
 * (setup time + cycle time per operation). Integrates with JobLifecycleEngine
 * for status transitions and ActualCostEngine for variance reporting.
 *
 * NOT a duplicate of JobLifecycleEngine — that tracks the 13-state job lifecycle.
 * This engine manages the per-operation routing within a job: Op 10 Saw → Op 20 Mill → Op 30 Inspect,
 * each with separate setup and cycle time tracking.
 *
 * NOT a duplicate of TimeClockEngine — that tracks shift clock in/out and job-level labor.
 * This engine tracks operation-level setup vs cycle time for routing step granularity.
 *
 * Actions: traveler_create, traveler_start_setup, traveler_start_cycle,
 *          traveler_complete_step, traveler_get_active, traveler_get,
 *          traveler_scan
 *
 * DB: job_routing_steps, routing_time_entries (migration 006)
 */

import { eventBus } from "./EventBus.js";
import { auditEngine } from "./AuditEngine.js";
import { emitPipelineOutcome } from "./pipelineOutcomeEmit.js"; // CLOSE-THE-LOOPS-MS0: feed traveler progress to the learning bus

// ============================================================================
// TYPES
// ============================================================================

export type RoutingStepStatus = "pending" | "setup" | "running" | "complete" | "skipped" | "hold";

export interface RoutingStep {
  id: string;
  job_id: string;
  step_number: number;
  operation: string;
  machine_id?: string;
  workcenter?: string;
  description?: string;
  status: RoutingStepStatus;
  setup_time_min: number;
  cycle_time_min: number;
  est_setup_min: number;
  est_cycle_min: number;
  quantity?: number;
  parts_complete?: number;
  parts_scrapped?: number;
  cycle_time_per_part?: number;
  is_outside_service?: boolean;
  vendor_name?: string;
  outside_po_number?: string;
  ship_date?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  outside_lead_days?: number;
  is_inspection_gate?: boolean;
  lot_number?: string;
  serial_numbers?: string[];
  operator_id?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface RoutingTimeEntry {
  id: string;
  routing_step_id: string;
  job_id: string;
  entry_type: "setup" | "cycle";
  operator_id?: string;
  start_time: string;
  end_time?: string;
  duration_min?: number;
  notes?: string;
  created_at: string;
}

export interface CreateTravelerInput {
  job_id: string;
  steps: {
    step_number: number;
    operation: string;
    machine_id?: string;
    workcenter?: string;
    description?: string;
    est_setup_min?: number;
    est_cycle_min?: number;
    quantity?: number;
    is_outside_service?: boolean;
    vendor_name?: string;
    is_inspection_gate?: boolean;
  }[];
  created_by?: string;
}

export interface StartTimerInput {
  job_id: string;
  step_number: number;
  operator_id: string;
  notes?: string;
}

export interface CompleteStepInput {
  job_id: string;
  step_number: number;
  operator_id: string;
  notes?: string;
  skip?: boolean;
  parts_complete?: number;
  parts_scrapped?: number;
}

export interface TravelerSummary {
  job_id: string;
  total_steps: number;
  completed_steps: number;
  current_step?: RoutingStep;
  pct_complete: number;
  total_setup_min: number;
  total_cycle_min: number;
  est_total_setup_min: number;
  est_total_cycle_min: number;
  setup_variance_pct: number;
  cycle_variance_pct: number;
  steps: RoutingStep[];
  active_timer?: RoutingTimeEntry;
}

export interface ScanInput {
  code: string;
  operator_id: string;
  action?: "start_setup" | "start_cycle" | "complete";
}

// ============================================================================
// ENGINE
// ============================================================================

let stepSeq = 0;
let timeEntrySeq = 0;

export class JobTravelerEngine {
  private steps: Map<string, RoutingStep> = new Map();
  private timeEntries: Map<string, RoutingTimeEntry> = new Map();

  // Index: job_id → step ids (ordered)
  private jobSteps: Map<string, string[]> = new Map();
  // Index: step_id → active time entry id
  private activeTimers: Map<string, string> = new Map();

  // ========================================================================
  // TRAVELER LIFECYCLE
  // ========================================================================

  /** Create a traveler (routing) for a job.
   * @param input - job_id + ordered steps with estimates
   * @returns the created routing steps
   */
  createTraveler(input: CreateTravelerInput): RoutingStep[] {
    if (!input.job_id || input.job_id.trim().length === 0) {
      throw new Error("job_id is required");
    }
    if (!input.steps || input.steps.length === 0) {
      throw new Error("At least one routing step is required");
    }

    // Validate sequential step numbers
    const sorted = [...input.steps].sort((a, b) => a.step_number - b.step_number);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].step_number < 1) {
        throw new Error("Step numbers must be >= 1");
      }
      if (i > 0 && sorted[i].step_number <= sorted[i - 1].step_number) {
        throw new Error(`Duplicate step number: ${sorted[i].step_number}`);
      }
    }

    // Check for existing traveler
    if (this.jobSteps.has(input.job_id)) {
      throw new Error(`Traveler already exists for job '${input.job_id}'. Delete first to recreate.`);
    }

    const now = new Date().toISOString();
    const createdSteps: RoutingStep[] = [];
    const stepIds: string[] = [];

    for (const s of sorted) {
      const id = `rs-${++stepSeq}-${Date.now().toString(36)}`;
      const step: RoutingStep = {
        id,
        job_id: input.job_id,
        step_number: s.step_number,
        operation: s.operation,
        machine_id: s.machine_id,
        workcenter: s.workcenter,
        description: s.description,
        status: "pending",
        setup_time_min: 0,
        cycle_time_min: 0,
        est_setup_min: s.est_setup_min ?? 0,
        est_cycle_min: s.est_cycle_min ?? 0,
        created_at: now,
      };

      this.steps.set(id, step);
      stepIds.push(id);
      createdSteps.push(step);
    }

    this.jobSteps.set(input.job_id, stepIds);

    auditEngine.log("data", "traveler_created", input.created_by ?? "system", {
      job_id: input.job_id, step_count: createdSteps.length,
    }, { resource_type: "job", resource_id: input.job_id });

    eventBus.publish("traveler.created", {
      job_id: input.job_id, step_count: createdSteps.length,
    }, { category: "data", source: "JobTravelerEngine" });

    // CLOSE-THE-LOOPS-MS0: DATA-only traveler-create outcome (fire-and-forget, never blocks routing creation).
    emitPipelineOutcome({
      domain: "traveler",
      engineName: "JobTravelerEngine",
      outcomeEventId: "traveler_create",
      predictionId: `${input.job_id}-create`,
      inline: { job_id: input.job_id, step_count: createdSteps.length },
      adapted: { step_count: createdSteps.length },
      reward: { objective: "other", raw_value: createdSteps.length, sign_convention: "maximize" },
      metadata: { created_by: input.created_by ?? "system" },
    });

    return createdSteps;
  }

  /** Start setup timer on a routing step. Step must be pending.
   * @param input - job_id, step_number, operator_id
   * @returns the time entry and updated step
   */
  startSetup(input: StartTimerInput): { step: RoutingStep; timer: RoutingTimeEntry } {
    const step = this.getStepByNumber(input.job_id, input.step_number);

    if (step.status !== "pending" && step.status !== "hold") {
      throw new Error(`Step ${input.step_number} is '${step.status}', must be 'pending' or 'hold' to start setup`);
    }

    // H4 SECURITY: Predecessor check � all prior steps must be complete or skipped
    const jobStepIds = this.jobSteps.get(input.job_id) ?? [];
    const allSteps = jobStepIds.map((id: string) => this.steps.get(id)).filter((s): s is RoutingStep => s != null);
    const priorIncomplete = allSteps.filter(s => s.step_number < input.step_number && s.status !== "complete" && s.status !== "skipped");
    if (priorIncomplete.length > 0) {
      const blocking = priorIncomplete.map(s => `Op ${s.step_number} (${s.status})`).join(", ");
      throw new Error(`Cannot start step ${input.step_number}: preceding steps not complete: ${blocking}`);
    }

    // Check no active timer on any step for this job by this operator
    this.ensureNoActiveTimer(input.job_id, input.operator_id);

    const now = new Date().toISOString();
    step.status = "setup";
    step.operator_id = input.operator_id;
    step.started_at = now;
    this.steps.set(step.id, step);

    const timer = this.createTimeEntry(step.id, input.job_id, "setup", input.operator_id, now, input.notes);

    auditEngine.log("data", "traveler_setup_started", input.operator_id, {
      job_id: input.job_id, step: input.step_number, operation: step.operation,
    }, { resource_type: "job", resource_id: input.job_id });

    eventBus.publish("traveler.setup_started", {
      job_id: input.job_id, step_number: input.step_number,
      operation: step.operation, operator_id: input.operator_id,
    }, { category: "data", source: "JobTravelerEngine" });

    return { step, timer };
  }

  /** Transition from setup to cycle (production run). Closes setup timer, opens cycle timer.
   * @param input - job_id, step_number, operator_id
   * @returns the step + new cycle timer
   */
  startCycle(input: StartTimerInput): { step: RoutingStep; timer: RoutingTimeEntry } {
    const step = this.getStepByNumber(input.job_id, input.step_number);

    if (step.status !== "setup") {
      throw new Error(`Step ${input.step_number} is '${step.status}', must be 'setup' to start cycle`);
    }

    const now = new Date().toISOString();

    // Close setup timer
    const setupTimer = this.closeActiveTimer(step.id, now);
    if (setupTimer) {
      step.setup_time_min += setupTimer.duration_min ?? 0;
    }

    // Transition to running
    step.status = "running";
    this.steps.set(step.id, step);

    // Open cycle timer
    const timer = this.createTimeEntry(step.id, input.job_id, "cycle", input.operator_id, now, input.notes);

    auditEngine.log("data", "traveler_cycle_started", input.operator_id, {
      job_id: input.job_id, step: input.step_number, operation: step.operation,
      setup_time_min: step.setup_time_min,
    }, { resource_type: "job", resource_id: input.job_id });

    eventBus.publish("traveler.cycle_started", {
      job_id: input.job_id, step_number: input.step_number,
      operation: step.operation, operator_id: input.operator_id,
      setup_time_min: step.setup_time_min,
    }, { category: "data", source: "JobTravelerEngine" });

    return { step, timer };
  }

  /** Complete (or skip) a routing step. Closes any active timer.
   * @param input - job_id, step_number, operator_id, optional skip flag
   * @returns the completed step + traveler summary
   */
  completeStep(input: CompleteStepInput): { step: RoutingStep; summary: TravelerSummary } {
    const step = this.getStepByNumber(input.job_id, input.step_number);

    if (input.skip) {
      if (step.status === "complete" || step.status === "skipped") {
        throw new Error(`Step ${input.step_number} is already '${step.status}'`);
      }
      step.status = "skipped";
    } else {
      if (step.status !== "setup" && step.status !== "running") {
        throw new Error(`Step ${input.step_number} is '${step.status}', must be 'setup' or 'running' to complete`);
      }

      const now = new Date().toISOString();

      // Close active timer
      const activeTimer = this.closeActiveTimer(step.id, now);
      if (activeTimer) {
        if (activeTimer.entry_type === "setup") {
          step.setup_time_min += activeTimer.duration_min ?? 0;
        } else {
          step.cycle_time_min += activeTimer.duration_min ?? 0;
        }
      }

      step.status = "complete";
      // H1 DOMAIN: Track parts completed and compute per-part cycle time
      if (input.parts_complete != null && input.parts_complete > 0) {
        step.parts_complete = input.parts_complete;
        if (step.cycle_time_min && step.cycle_time_min > 0) {
          step.cycle_time_per_part = Math.round((step.cycle_time_min / input.parts_complete) * 100) / 100;
        }
      }
      if (input.parts_scrapped != null) {
        step.parts_scrapped = input.parts_scrapped;
      }
      step.completed_at = now;
    }

    step.notes = input.notes ?? step.notes;
    this.steps.set(step.id, step);
    // CLOSE-THE-LOOPS-MS0: per-step DATA outcome (fire-and-forget, never blocks traveler progress).
    emitPipelineOutcome({
      domain: "traveler",
      engineName: "JobTravelerEngine",
      outcomeEventId: "traveler_step_complete",
      predictionId: `${input.job_id}-step-${input.step_number}`,
      inline: { job_id: input.job_id, step_number: input.step_number, status: step.status },
      adapted: {
        setup_time_min: step.setup_time_min ?? 0,
        cycle_time_min: step.cycle_time_min ?? 0,
        parts_complete: step.parts_complete ?? 0,
      },
      reward: { objective: "cycle_time", raw_value: step.cycle_time_per_part ?? step.cycle_time_min ?? 0, sign_convention: "minimize" },
      metadata: { skipped: step.status === "skipped", parts_scrapped: step.parts_scrapped ?? 0 },
    });

    // Check if ALL steps are complete → update job lifecycle
    const allStepIds = this.jobSteps.get(input.job_id) ?? [];
    const allComplete = allStepIds.every((id) => {
      const s = this.steps.get(id);
      return s?.status === "complete" || s?.status === "skipped";
    });

    if (allComplete && allStepIds.length > 0) {
      // Wire to JobLifecycleEngine
      try {
        const { jobLifecycleEngine } = require("./JobLifecycleEngine.js");
        jobLifecycleEngine.updateStatus(input.job_id, "complete", {
          user: input.operator_id,
          notes: "All routing steps complete",
        });
      } catch { /* JobLifecycleEngine integration is best-effort */ }

      // Wire to ActualCostEngine — report setup + cycle totals
      try {
        const summary = this.getTraveler(input.job_id);
        const { actualCostEngine } = require("./ActualCostEngine.js");
        actualCostEngine.recordMachineTime(
          input.job_id,
          (summary.total_setup_min + summary.total_cycle_min) / 60
        );
      } catch { /* ActualCostEngine integration is best-effort */ }

      eventBus.publish("traveler.all_complete", {
        job_id: input.job_id,
        total_steps: allStepIds.length,
      }, { category: "data", source: "JobTravelerEngine" });
    }

    auditEngine.log("data", input.skip ? "traveler_step_skipped" : "traveler_step_completed", input.operator_id, {
      job_id: input.job_id, step: input.step_number, operation: step.operation,
      setup_time_min: step.setup_time_min, cycle_time_min: step.cycle_time_min,
      parts_complete: input.parts_complete,
    }, { resource_type: "job", resource_id: input.job_id });

    eventBus.publish("traveler.step_completed", {
      job_id: input.job_id, step_number: input.step_number,
      operation: step.operation, status: step.status,
      setup_time_min: step.setup_time_min, cycle_time_min: step.cycle_time_min,
    }, { category: "data", source: "JobTravelerEngine" });

    return { step, summary: this.getTraveler(input.job_id) };
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /** Get traveler summary for a job.
   * @param jobId - the job ID
   * @returns full traveler with steps, times, variance
   */
  getTraveler(jobId: string): TravelerSummary {
    const stepIds = this.jobSteps.get(jobId);
    if (!stepIds || stepIds.length === 0) {
      throw new Error(`No traveler found for job '${jobId}'`);
    }

    const steps = stepIds.map((id) => this.steps.get(id)!).sort((a, b) => a.step_number - b.step_number);
    const completed = steps.filter((s) => s.status === "complete" || s.status === "skipped");
    const current = steps.find((s) => s.status === "setup" || s.status === "running");

    let totalSetup = 0, totalCycle = 0, estSetup = 0, estCycle = 0;
    for (const s of steps) {
      totalSetup += s.setup_time_min;
      totalCycle += s.cycle_time_min;
      estSetup += s.est_setup_min;
      estCycle += s.est_cycle_min;
    }

    const setupVar = estSetup > 0 ? ((totalSetup - estSetup) / estSetup) * 100 : 0;
    const cycleVar = estCycle > 0 ? ((totalCycle - estCycle) / estCycle) * 100 : 0;

    // Find active timer
    let activeTimer: RoutingTimeEntry | undefined;
    if (current) {
      const timerId = this.activeTimers.get(current.id);
      if (timerId) activeTimer = this.timeEntries.get(timerId);
    }

    return {
      job_id: jobId,
      total_steps: steps.length,
      completed_steps: completed.length,
      current_step: current,
      pct_complete: Math.round((completed.length / steps.length) * 100),
      total_setup_min: Math.round(totalSetup * 10) / 10,
      total_cycle_min: Math.round(totalCycle * 10) / 10,
      est_total_setup_min: Math.round(estSetup * 10) / 10,
      est_total_cycle_min: Math.round(estCycle * 10) / 10,
      setup_variance_pct: Math.round(setupVar * 10) / 10,
      cycle_variance_pct: Math.round(cycleVar * 10) / 10,
      steps,
      active_timer: activeTimer,
    };
  }

  /** Get all active travelers (jobs with routing steps in progress).
   * @returns array of traveler summaries with active steps
   */
  getActiveTravelers(): TravelerSummary[] {
    const result: TravelerSummary[] = [];
    for (const jobId of this.jobSteps.keys()) {
      const stepIds = this.jobSteps.get(jobId)!;
      const hasActive = stepIds.some((id) => {
        const s = this.steps.get(id);
        return s?.status === "setup" || s?.status === "running";
      });
      const allDone = stepIds.every((id) => {
        const s = this.steps.get(id);
        return s?.status === "complete" || s?.status === "skipped";
      });
      if (hasActive || !allDone) {
        result.push(this.getTraveler(jobId));
      }
    }
    return result.sort((a, b) => b.pct_complete - a.pct_complete);
  }

  /** Handle QR/barcode scan — parse code and dispatch to appropriate action.
   * Code format: JOB-{jobId}-STEP-{stepNumber} or just JOB-{jobId}
   * @param input - code string, operator_id, optional explicit action
   * @returns the action taken and resulting step/summary
   */
  scan(input: ScanInput): { action: string; step: RoutingStep; summary: TravelerSummary } {
    if (!input.code || input.code.trim().length === 0) {
      throw new Error("Scan code is required");
    }
    if (!input.operator_id || input.operator_id.trim().length === 0) {
      throw new Error("operator_id is required");
    }

    // Parse code: JOB-{id}-STEP-{num} or JOB-{id}
    const match = input.code.match(/^JOB-(.+?)(?:-STEP-(\d+))?$/i);
    if (!match) {
      throw new Error(`Invalid scan code format: '${input.code}'. Expected JOB-{id}-STEP-{num}`);
    }

    const jobId = match[1];
    const stepNumber = match[2] ? parseInt(match[2], 10) : undefined;

    // If no step specified, find the next pending step
    let targetStep: number;
    if (stepNumber != null) {
      targetStep = stepNumber;
    } else {
      const stepIds = this.jobSteps.get(jobId);
      if (!stepIds) throw new Error(`No traveler for job '${jobId}'`);
      const nextPending = stepIds
        .map((id) => this.steps.get(id)!)
        .find((s) => s.status === "pending" || s.status === "setup" || s.status === "running");
      if (!nextPending) throw new Error(`All steps complete for job '${jobId}'`);
      targetStep = nextPending.step_number;
    }

    const step = this.getStepByNumber(jobId, targetStep);

    // Auto-detect action based on current step status
    let action = input.action;
    if (!action) {
      switch (step.status) {
        case "pending": action = "start_setup"; break;
        case "setup": action = "start_cycle"; break;
        case "running": action = "complete"; break;
        default:
          throw new Error(`Step ${targetStep} is '${step.status}' — cannot auto-detect action`);
      }
    }

    const timerInput: StartTimerInput = {
      job_id: jobId,
      step_number: targetStep,
      operator_id: input.operator_id,
    };

    let resultStep: RoutingStep;
    switch (action) {
      case "start_setup":
        resultStep = this.startSetup(timerInput).step;
        break;
      case "start_cycle":
        resultStep = this.startCycle(timerInput).step;
        break;
      case "complete":
        resultStep = this.completeStep({
          ...timerInput,
        }).step;
        break;
      default:
        throw new Error(`Unknown scan action: '${action}'`);
    }

    return { action, step: resultStep, summary: this.getTraveler(jobId) };
  }

  /** Get time entries for a specific routing step.
   * @param stepId - the routing step ID
   * @returns time entries sorted by start_time
   */
  getStepTimeEntries(stepId: string): RoutingTimeEntry[] {
    return [...this.timeEntries.values()]
      .filter((e) => e.routing_step_id === stepId)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  /** Get all time entries for a job across all routing steps.
   * @param jobId - the job ID
   * @returns time entries sorted by start_time
   */
  getJobTimeEntries(jobId: string): RoutingTimeEntry[] {
    return [...this.timeEntries.values()]
      .filter((e) => e.job_id === jobId)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private getStepByNumber(jobId: string, stepNumber: number): RoutingStep {
    const stepIds = this.jobSteps.get(jobId);
    if (!stepIds) throw new Error(`No traveler found for job '${jobId}'`);

    const step = stepIds
      .map((id) => this.steps.get(id)!)
      .find((s) => s.step_number === stepNumber);

    if (!step) throw new Error(`Step ${stepNumber} not found in job '${jobId}'`);
    return step;
  }

  private ensureNoActiveTimer(jobId: string, operatorId: string): void {
    const stepIds = this.jobSteps.get(jobId) ?? [];
    for (const sid of stepIds) {
      const timerId = this.activeTimers.get(sid);
      if (timerId) {
        const timer = this.timeEntries.get(timerId);
        if (timer && timer.operator_id === operatorId && !timer.end_time) {
          throw new Error(
            `Operator '${operatorId}' already has an active ${timer.entry_type} timer on step '${sid}'. Complete or cancel it first.`
          );
        }
      }
    }
  }

  private createTimeEntry(
    stepId: string, jobId: string, type: "setup" | "cycle",
    operatorId: string, startTime: string, notes?: string
  ): RoutingTimeEntry {
    const id = `rte-${++timeEntrySeq}-${Date.now().toString(36)}`;
    const entry: RoutingTimeEntry = {
      id,
      routing_step_id: stepId,
      job_id: jobId,
      entry_type: type,
      operator_id: operatorId,
      start_time: startTime,
      notes,
      created_at: startTime,
    };
    this.timeEntries.set(id, entry);
    this.activeTimers.set(stepId, id);
    return entry;
  }

  private closeActiveTimer(stepId: string, endTime: string): RoutingTimeEntry | undefined {
    const timerId = this.activeTimers.get(stepId);
    if (!timerId) return undefined;

    const timer = this.timeEntries.get(timerId);
    if (!timer || timer.end_time) return undefined;

    timer.end_time = endTime;
    timer.duration_min = (new Date(endTime).getTime() - new Date(timer.start_time).getTime()) / 60_000;
    this.timeEntries.set(timerId, timer);
    this.activeTimers.delete(stepId);
    return timer;
  }
}

export const jobTravelerEngine = new JobTravelerEngine();
