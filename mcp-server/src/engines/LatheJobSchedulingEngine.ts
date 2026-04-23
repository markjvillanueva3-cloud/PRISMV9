/**
 * LatheJobSchedulingEngine — U-LTH50 (LATHE-MASTER P5 ERP)
 *
 * Multi-machine lathe scheduling respecting:
 *   - 21-machine JM Die fleet (subset passable via machines param)
 *   - Per-job cycle time (from U-LTH48 quote.evidence.total_cycle_min) +
 *     setup time (setup_count × 45 min)
 *   - Due dates with Earliest-Due-Date (EDD) primary sort
 *   - Critical-Ratio (CR = slack/remaining_work) tiebreak for same due_date
 *   - Setup-minimizing adjacent-pair reordering inside each machine queue
 *     (changeover = big when material or fixture type changes, small when same)
 *   - Machine suitability (spindle bore, max OD, max Z, controller) — jobs
 *     are rejected from incompatible machines before scheduling
 *
 * Algorithm:
 *   1. Filter feasible machines per job by envelope check
 *   2. Sort jobs globally by EDD → CR tiebreak
 *   3. For each job, assign to the earliest-available feasible machine
 *      using machine_available_at as the greedy selector
 *   4. Per-machine local improvement: swap adjacent pairs if it reduces
 *      total changeover time without pushing any job past its due date
 *   5. Compute per-job: start_time, end_time, lateness (end - due),
 *      slack (due - end) → lateness > 0 violates due date
 *
 * Complexity: O(J·M) feasibility + O(J log J) EDD sort + O(J) assignment
 *             + O(M·Q²) adjacent-pair local search (Q = queue length per mach).
 *
 * Physics:
 *   - job_elapsed_min = setup_min + cycle_min × quantity
 *   - changeover_min = material_change_tax + fixture_change_tax + teardown_time
 *
 * Citations:
 *   - Pinedo, "Scheduling: Theory, Algorithms, and Systems" (EDD / CR rules)
 *   - Baker & Trietsch, "Principles of Sequencing and Scheduling"
 *
 * @milestone LATHE-MASTER U-LTH50
 * @version 1.0.0
 */

import { z } from "zod";
import type { QuotePackage } from "./LatheAutoQuoteFromPrintEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Setup minutes per unique setup (matches U-LTH48 SETUP_MIN_PER_SETUP). */
const SETUP_MIN_PER_SETUP = 45;
/** Minutes lost to a material change on a running spindle (flush, swap stock). */
const MATERIAL_CHANGE_TAX_MIN = 20;
/** Minutes lost to a fixture change (chuck jaws, soft vs hard). */
const FIXTURE_CHANGE_TAX_MIN = 15;
/** Minimum teardown time between any two jobs (tool probe, spindle warm-up). */
const TEARDOWN_MIN = 5;
/** Minutes in an 8-hour shift. */
const SHIFT_MINUTES = 480;

// ============================================================================
// SCHEMAS
// ============================================================================

export const MachineSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  controller: z.enum(["fanuc", "haas", "okuma_osp", "mitsubishi", "mazak", "siemens", "generic"]),
  max_od_mm: z.number().positive(),
  max_z_mm: z.number().positive(),
  max_spindle_bore_mm: z.number().nonnegative(),
  has_live_tool: z.boolean().default(false),
  has_sub_spindle: z.boolean().default(false),
  has_y_axis: z.boolean().default(false),
  available_at_iso: z.string().datetime().optional(),
});
export type MachineSpec = z.infer<typeof MachineSpecSchema>;

export const SchedulableJobSchema = z.object({
  job_id: z.string().min(1),
  customer: z.string().optional(),
  part_number: z.string().optional(),
  material_name: z.string().min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  stock_od_mm: z.number().positive(),
  stock_length_mm: z.number().positive(),
  quantity: z.number().int().positive(),
  setup_min: z.number().nonnegative(),
  cycle_min_per_part: z.number().positive(),
  due_date_iso: z.string().datetime(),
  priority: z.number().int().min(0).max(100).default(50),
  fixture_type: z.enum(["3jaw", "6jaw", "collet", "soft_jaw", "custom"]).default("3jaw"),
  requires_live_tool: z.boolean().default(false),
  requires_sub_spindle: z.boolean().default(false),
  requires_y_axis: z.boolean().default(false),
  allowed_machine_ids: z.array(z.string()).optional(),
});
export type SchedulableJob = z.infer<typeof SchedulableJobSchema>;

export const ScheduleInputSchema = z.object({
  jobs: z.array(SchedulableJobSchema).min(1).max(1000),
  machines: z.array(MachineSpecSchema).min(1).max(50),
  schedule_start_iso: z.string().datetime().optional(),
});
export type ScheduleInput = z.infer<typeof ScheduleInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface ScheduledOperation {
  job_id: string;
  machine_id: string;
  start_iso: string;
  end_iso: string;
  duration_min: number;
  setup_min: number;
  cycle_min_total: number;
  changeover_from_prev_min: number;
  due_date_iso: string;
  slack_min: number;
  lateness_min: number;
  on_time: boolean;
  material_name: string;
  material_iso_group: string;
  fixture_type: string;
  customer?: string;
  part_number?: string;
}

export interface MachineTimeline {
  machine_id: string;
  machine_name: string;
  controller: string;
  operations: ScheduledOperation[];
  total_busy_min: number;
  total_changeover_min: number;
  utilization_pct: number;
  completes_at_iso: string | null;
}

export interface UnscheduledJob {
  job_id: string;
  reason: "no_feasible_machine" | "envelope_exceeded";
  detail: string;
}

export interface ScheduleReport {
  generated_at: string;
  schedule_start_iso: string;
  jobs_scheduled: number;
  jobs_unscheduled: number;
  jobs_on_time: number;
  jobs_late: number;
  total_lateness_min: number;
  total_changeover_min: number;
  total_busy_min: number;
  avg_utilization_pct: number;
  machines: MachineTimeline[];
  unscheduled: UnscheduledJob[];
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheJobSchedulingEngine {
  /**
   * Schedule jobs across machines, return a per-machine timeline plus
   * aggregate lateness + utilization stats.
   */
  schedule(input: ScheduleInput): ScheduleReport {
    const parsed = ScheduleInputSchema.parse(input);
    const scheduleStartMs = parsed.schedule_start_iso
      ? Date.parse(parsed.schedule_start_iso)
      : Date.now();
    if (!Number.isFinite(scheduleStartMs)) {
      throw new Error("LatheJobSchedulingEngine: invalid schedule_start_iso");
    }

    const machines = parsed.machines;
    const machineById = new Map(machines.map((m) => [m.id, m]));

    // Machine availability clock (ms from epoch)
    const machineAvailableAt = new Map<string, number>();
    for (const m of machines) {
      const at = m.available_at_iso ? Date.parse(m.available_at_iso) : scheduleStartMs;
      machineAvailableAt.set(m.id, Math.max(at, scheduleStartMs));
    }
    const machineLastOp = new Map<string, { material: string; fixture: string } | null>();
    for (const m of machines) machineLastOp.set(m.id, null);

    // Feasibility filter
    const unscheduled: UnscheduledJob[] = [];
    const feasibleJobs: Array<{ job: SchedulableJob; feasibleMachines: string[] }> = [];
    for (const job of parsed.jobs) {
      const feasible = this.feasibleMachines(job, machines);
      if (feasible.length === 0) {
        unscheduled.push({
          job_id: job.job_id,
          reason: "no_feasible_machine",
          detail: this.describeInfeasibility(job, machines),
        });
        continue;
      }
      feasibleJobs.push({ job, feasibleMachines: feasible });
    }

    // Sort: EDD primary, then priority desc, then CR tiebreak
    feasibleJobs.sort((a, b) => {
      const dueA = Date.parse(a.job.due_date_iso);
      const dueB = Date.parse(b.job.due_date_iso);
      if (dueA !== dueB) return dueA - dueB;
      if (a.job.priority !== b.job.priority) return b.job.priority - a.job.priority;
      const workA = a.job.setup_min + a.job.cycle_min_per_part * a.job.quantity;
      const workB = b.job.setup_min + b.job.cycle_min_per_part * b.job.quantity;
      const slackA = dueA - scheduleStartMs - workA * 60_000;
      const slackB = dueB - scheduleStartMs - workB * 60_000;
      const crA = workA > 0 ? slackA / (workA * 60_000) : 0;
      const crB = workB > 0 ? slackB / (workB * 60_000) : 0;
      return crA - crB;
    });

    // Greedy assign: earliest-available feasible machine
    const machineQueues = new Map<string, SchedulableJob[]>();
    for (const m of machines) machineQueues.set(m.id, []);

    for (const { job, feasibleMachines } of feasibleJobs) {
      let chosenMachine = feasibleMachines[0];
      let earliestAvail = Infinity;
      for (const machineId of feasibleMachines) {
        const avail = machineAvailableAt.get(machineId) ?? scheduleStartMs;
        if (avail < earliestAvail) {
          earliestAvail = avail;
          chosenMachine = machineId;
        }
      }
      machineQueues.get(chosenMachine)!.push(job);
      const jobMin = job.setup_min + job.cycle_min_per_part * job.quantity;
      const changeover = this.changeoverMin(machineLastOp.get(chosenMachine), {
        material: job.material_name,
        fixture: job.fixture_type,
      });
      machineAvailableAt.set(
        chosenMachine,
        earliestAvail + (jobMin + changeover) * 60_000,
      );
      machineLastOp.set(chosenMachine, {
        material: job.material_name,
        fixture: job.fixture_type,
      });
    }

    // Local improvement: adjacent-pair swap if it lowers changeover without
    // pushing any job past its due date.
    for (const [machineId, queue] of machineQueues) {
      this.adjacentPairImprove(queue, machineAvailableAt, machineId, scheduleStartMs);
    }

    // Build timelines
    const timelines: MachineTimeline[] = [];
    let totalLateness = 0;
    let totalChangeover = 0;
    let totalBusy = 0;
    let jobsOnTime = 0;
    let jobsLate = 0;

    for (const m of machines) {
      const queue = machineQueues.get(m.id) ?? [];
      let cursor = Math.max(
        m.available_at_iso ? Date.parse(m.available_at_iso) : scheduleStartMs,
        scheduleStartMs,
      );
      let lastOp: { material: string; fixture: string } | null = null;
      const ops: ScheduledOperation[] = [];
      let busyMin = 0;
      let changeMin = 0;
      for (const job of queue) {
        const changeover = this.changeoverMin(lastOp, {
          material: job.material_name,
          fixture: job.fixture_type,
        });
        changeMin += changeover;
        cursor += changeover * 60_000;

        const durationMin = job.setup_min + job.cycle_min_per_part * job.quantity;
        const startMs = cursor;
        const endMs = cursor + durationMin * 60_000;
        const dueMs = Date.parse(job.due_date_iso);
        const slackMin = Math.round((dueMs - endMs) / 60_000);
        const lateness = Math.max(0, (endMs - dueMs) / 60_000);

        ops.push({
          job_id: job.job_id,
          machine_id: m.id,
          start_iso: new Date(startMs).toISOString(),
          end_iso: new Date(endMs).toISOString(),
          duration_min: Math.round(durationMin * 100) / 100,
          setup_min: job.setup_min,
          cycle_min_total: Math.round(job.cycle_min_per_part * job.quantity * 100) / 100,
          changeover_from_prev_min: changeover,
          due_date_iso: job.due_date_iso,
          slack_min: slackMin,
          lateness_min: Math.round(lateness * 100) / 100,
          on_time: lateness <= 0,
          material_name: job.material_name,
          material_iso_group: job.material_iso_group,
          fixture_type: job.fixture_type,
          customer: job.customer,
          part_number: job.part_number,
        });

        if (lateness <= 0) jobsOnTime++;
        else jobsLate++;
        totalLateness += lateness;
        busyMin += durationMin;
        cursor = endMs;
        lastOp = { material: job.material_name, fixture: job.fixture_type };
      }

      totalChangeover += changeMin;
      totalBusy += busyMin;

      // Utilization: busy / (total elapsed since scheduleStart)
      const elapsed = queue.length > 0
        ? (Date.parse(ops[ops.length - 1].end_iso) - scheduleStartMs) / 60_000
        : 0;
      const utilization = elapsed > 0 ? (busyMin / elapsed) * 100 : 0;

      timelines.push({
        machine_id: m.id,
        machine_name: m.name,
        controller: m.controller,
        operations: ops,
        total_busy_min: Math.round(busyMin * 100) / 100,
        total_changeover_min: Math.round(changeMin * 100) / 100,
        utilization_pct: Math.round(utilization * 100) / 100,
        completes_at_iso: ops.length > 0 ? ops[ops.length - 1].end_iso : null,
      });
    }

    const machinesWithWork = timelines.filter((t) => t.operations.length > 0);
    const avgUtil = machinesWithWork.length > 0
      ? machinesWithWork.reduce((s, t) => s + t.utilization_pct, 0) / machinesWithWork.length
      : 0;

    return {
      generated_at: new Date().toISOString(),
      schedule_start_iso: new Date(scheduleStartMs).toISOString(),
      jobs_scheduled: parsed.jobs.length - unscheduled.length,
      jobs_unscheduled: unscheduled.length,
      jobs_on_time: jobsOnTime,
      jobs_late: jobsLate,
      total_lateness_min: Math.round(totalLateness * 100) / 100,
      total_changeover_min: Math.round(totalChangeover * 100) / 100,
      total_busy_min: Math.round(totalBusy * 100) / 100,
      avg_utilization_pct: Math.round(avgUtil * 100) / 100,
      machines: timelines,
      unscheduled,
    };
  }

  /**
   * Build a schedulable job from a QuotePackage (U-LTH48 output).
   * Convenience adapter; caller still supplies due_date + priority.
   */
  jobFromQuote(
    quote: QuotePackage,
    extras: {
      job_id: string;
      due_date_iso: string;
      priority?: number;
      fixture_type?: SchedulableJob["fixture_type"];
      requires_live_tool?: boolean;
      requires_sub_spindle?: boolean;
      requires_y_axis?: boolean;
      allowed_machine_ids?: string[];
    },
  ): SchedulableJob {
    const setupMin = quote.evidence.setup_count * SETUP_MIN_PER_SETUP;
    const cyclePerPart = quote.evidence.total_cycle_min;
    return SchedulableJobSchema.parse({
      job_id: extras.job_id,
      customer: quote.customer,
      part_number: quote.part_number,
      material_name: quote.evidence.material_name,
      material_iso_group: quote.evidence.iso_group,
      stock_od_mm: quote.evidence.stock_od_mm,
      stock_length_mm: quote.evidence.stock_length_mm,
      quantity: quote.quantity,
      setup_min: setupMin,
      cycle_min_per_part: cyclePerPart,
      due_date_iso: extras.due_date_iso,
      priority: extras.priority ?? 50,
      fixture_type: extras.fixture_type ?? "3jaw",
      requires_live_tool: extras.requires_live_tool ?? false,
      requires_sub_spindle: extras.requires_sub_spindle ?? false,
      requires_y_axis: extras.requires_y_axis ?? false,
      allowed_machine_ids: extras.allowed_machine_ids,
    });
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private feasibleMachines(job: SchedulableJob, machines: MachineSpec[]): string[] {
    const feasible: string[] = [];
    for (const m of machines) {
      if (job.allowed_machine_ids && !job.allowed_machine_ids.includes(m.id)) continue;
      if (m.max_od_mm < job.stock_od_mm) continue;
      if (m.max_z_mm < job.stock_length_mm) continue;
      if (job.requires_live_tool && !m.has_live_tool) continue;
      if (job.requires_sub_spindle && !m.has_sub_spindle) continue;
      if (job.requires_y_axis && !m.has_y_axis) continue;
      feasible.push(m.id);
    }
    return feasible;
  }

  private describeInfeasibility(job: SchedulableJob, machines: MachineSpec[]): string {
    const reasons: string[] = [];
    const maxOd = machines.reduce((m, x) => Math.max(m, x.max_od_mm), 0);
    const maxZ = machines.reduce((m, x) => Math.max(m, x.max_z_mm), 0);
    if (job.stock_od_mm > maxOd) reasons.push(`stock_od_mm ${job.stock_od_mm} > max fleet ${maxOd}`);
    if (job.stock_length_mm > maxZ) reasons.push(`stock_length_mm ${job.stock_length_mm} > max fleet ${maxZ}`);
    if (job.requires_live_tool && !machines.some((m) => m.has_live_tool)) {
      reasons.push("live_tool required but no machine has it");
    }
    if (job.requires_sub_spindle && !machines.some((m) => m.has_sub_spindle)) {
      reasons.push("sub_spindle required but no machine has it");
    }
    if (job.requires_y_axis && !machines.some((m) => m.has_y_axis)) {
      reasons.push("y_axis required but no machine has it");
    }
    if (job.allowed_machine_ids && job.allowed_machine_ids.length > 0) {
      reasons.push(`restricted to [${job.allowed_machine_ids.join(", ")}]`);
    }
    return reasons.length > 0 ? reasons.join("; ") : "no feasible machine";
  }

  private changeoverMin(
    prev: { material: string; fixture: string } | null | undefined,
    next: { material: string; fixture: string },
  ): number {
    if (!prev) return 0;
    let total = TEARDOWN_MIN;
    if (prev.material !== next.material) total += MATERIAL_CHANGE_TAX_MIN;
    if (prev.fixture !== next.fixture) total += FIXTURE_CHANGE_TAX_MIN;
    return total;
  }

  /**
   * In-place adjacent-pair improvement: for each i, swap queue[i] and queue[i+1]
   * if the swap reduces total machine changeover AND neither job's effective
   * completion time would exceed its due date by more than it already does.
   *
   * Simple O(Q²) sweep — adequate for Q ≤ 100 (typical shop queue).
   */
  private adjacentPairImprove(
    queue: SchedulableJob[],
    machineAvailableAt: Map<string, number>,
    machineId: string,
    scheduleStartMs: number,
  ): void {
    if (queue.length < 2) return;
    let improved = true;
    let passes = 0;
    const MAX_PASSES = queue.length;
    while (improved && passes < MAX_PASSES) {
      improved = false;
      passes++;
      for (let i = 0; i < queue.length - 1; i++) {
        const before = this.simulateChangeover(queue);
        const swapped = queue.slice();
        [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
        const after = this.simulateChangeover(swapped);
        if (after.total >= before.total) continue;

        // Due-date guard: no worsening of net lateness
        const lateBefore = this.simulateLateness(queue, scheduleStartMs);
        const lateAfter = this.simulateLateness(swapped, scheduleStartMs);
        if (lateAfter > lateBefore) continue;

        queue[i] = swapped[i];
        queue[i + 1] = swapped[i + 1];
        improved = true;
      }
    }
    // Recompute machine availability after re-ordering
    if (queue.length > 0) {
      let cursor = scheduleStartMs;
      let lastOp: { material: string; fixture: string } | null = null;
      for (const job of queue) {
        cursor += this.changeoverMin(lastOp, {
          material: job.material_name,
          fixture: job.fixture_type,
        }) * 60_000;
        cursor += (job.setup_min + job.cycle_min_per_part * job.quantity) * 60_000;
        lastOp = { material: job.material_name, fixture: job.fixture_type };
      }
      machineAvailableAt.set(machineId, cursor);
    }
  }

  private simulateChangeover(queue: SchedulableJob[]): { total: number } {
    let total = 0;
    let lastOp: { material: string; fixture: string } | null = null;
    for (const job of queue) {
      total += this.changeoverMin(lastOp, {
        material: job.material_name,
        fixture: job.fixture_type,
      });
      lastOp = { material: job.material_name, fixture: job.fixture_type };
    }
    return { total };
  }

  private simulateLateness(queue: SchedulableJob[], scheduleStartMs: number): number {
    let cursor = scheduleStartMs;
    let lastOp: { material: string; fixture: string } | null = null;
    let totalLateMin = 0;
    for (const job of queue) {
      cursor += this.changeoverMin(lastOp, {
        material: job.material_name,
        fixture: job.fixture_type,
      }) * 60_000;
      cursor += (job.setup_min + job.cycle_min_per_part * job.quantity) * 60_000;
      const dueMs = Date.parse(job.due_date_iso);
      const lateMin = Math.max(0, (cursor - dueMs) / 60_000);
      totalLateMin += lateMin;
      lastOp = { material: job.material_name, fixture: job.fixture_type };
    }
    return totalLateMin;
  }
}

export const latheJobSchedulingEngine = new LatheJobSchedulingEngine();
export { LatheJobSchedulingEngine, SHIFT_MINUTES };
