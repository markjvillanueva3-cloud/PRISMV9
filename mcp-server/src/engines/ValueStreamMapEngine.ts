/**
 * ValueStreamMapEngine -- builds a real lean value-stream map (VSM) for a job from EXISTING
 * shop data. Composition-only (reads other engines' singletons; no fabricated data, R12).
 *
 * Data sources (all real, per-operation):
 *   - JobTravelerEngine.getTraveler(job_id): planned (est_*) + actual (setup/cycle) times,
 *     variance, and parts_scrapped per routing step.
 *   - MachineDispatchEngine.getAllQueues(): live machine-queue depth (WIP) + queue-wait estimate.
 *
 * Honest limitations (surfaced as `caveats`, never faked):
 *   - WIP is machine-queue depth (jobs waiting at the step's machine), NOT true between-operation
 *     inventory; inter-op wait is approximated by the machine-queue estimate (precise hand-off
 *     timestamps are not yet captured). The qualitative "seven wastes" narrative is NOT invented
 *     here -- this engine returns only computed flow data.
 *
 * Lean reference: Rother & Shook, "Learning to See" (1999) -- value-added ratio = value-added time /
 * total lead time; lead time = value-added (cycle) + non-value-added (setup + queue wait).
 */
import { jobTravelerEngine, type TravelerSummary } from "./JobTravelerEngine.js";
import { machineDispatchEngine, type PlanningBoard } from "./MachineDispatchEngine.js";

export interface VsmStep {
  step_number: number;
  operation: string;
  machine_id?: string;
  status: string;
  planned_setup_min: number;
  planned_cycle_min: number;
  actual_setup_min: number;
  actual_cycle_min: number;
  /** (actual - planned) / planned * 100; 0 when planned is 0. */
  variance_pct: number;
  parts_complete: number;
  parts_scrapped: number;
  /** scrapped / (complete + scrapped) * 100; 0 when nothing made yet. */
  scrap_rate_pct: number;
  /** Machine-queue depth at this step's machine, or null if no machine / board unavailable. */
  wip_at_machine: number | null;
  /** Machine-queue wait estimate (min), or null. */
  queue_wait_min: number | null;
}

export interface VsmTotals {
  total_planned_setup_min: number;
  total_planned_cycle_min: number;
  total_actual_setup_min: number;
  total_actual_cycle_min: number;
  value_added_min: number;
  non_value_added_min: number;
  total_queue_wait_min: number;
  lead_time_min: number;
  /** value_added_min / lead_time_min, 0..1; 0 when lead is 0. */
  value_added_ratio: number;
  total_parts_complete: number;
  total_parts_scrapped: number;
  scrap_rate_pct: number;
  setup_variance_pct: number;
  cycle_variance_pct: number;
}

export interface ValueStreamMap {
  data_available: boolean;
  job_id: string;
  message?: string;
  steps: VsmStep[];
  totals: VsmTotals;
  generated_at: string;
  caveats: string[];
}

function emptyTotals(): VsmTotals {
  return {
    total_planned_setup_min: 0,
    total_planned_cycle_min: 0,
    total_actual_setup_min: 0,
    total_actual_cycle_min: 0,
    value_added_min: 0,
    non_value_added_min: 0,
    total_queue_wait_min: 0,
    lead_time_min: 0,
    value_added_ratio: 0,
    total_parts_complete: 0,
    total_parts_scrapped: 0,
    scrap_rate_pct: 0,
    setup_variance_pct: 0,
    cycle_variance_pct: 0,
  };
}

/**
 * Pure transform: (real traveler summary, live machine queues) -> value-stream map.
 * Extracted so it is unit-testable against reference values without the traveler-creation flow.
 *
 * @param summary - the job's TravelerSummary (planned + actual per-step times + scrap).
 * @param board - the live PlanningBoard for WIP, or null if unavailable (omits WIP, adds a caveat).
 * @param nowIso - ISO timestamp for `generated_at` (injected for deterministic tests).
 * @returns a ValueStreamMap with per-step flow + totals + honest caveats.
 */
export function computeValueStreamMap(
  summary: TravelerSummary,
  board: PlanningBoard | null,
  nowIso: string,
): ValueStreamMap {
  if (!summary || summary.total_steps === 0) {
    return {
      data_available: false,
      job_id: summary?.job_id ?? "",
      message:
        "No traveler/routing data for this job. A value-stream map requires a job traveler with recorded operation times.",
      steps: [],
      totals: emptyTotals(),
      generated_at: nowIso,
      caveats: [],
    };
  }

  const queueByMachine = new Map<string, { wip: number; wait: number }>();
  if (board) {
    for (const mq of board.machines) queueByMachine.set(mq.machine_id, { wip: mq.total_queued, wait: mq.total_est_min });
  }

  const steps: VsmStep[] = summary.steps.map((s) => {
    const planned = s.est_setup_min + s.est_cycle_min;
    const actual = s.setup_time_min + s.cycle_time_min;
    const q = s.machine_id ? queueByMachine.get(s.machine_id) : undefined;
    const complete = s.parts_complete ?? 0;
    const scrap = s.parts_scrapped ?? 0;
    const made = complete + scrap;
    return {
      step_number: s.step_number,
      operation: s.operation,
      machine_id: s.machine_id,
      status: s.status,
      planned_setup_min: s.est_setup_min,
      planned_cycle_min: s.est_cycle_min,
      actual_setup_min: s.setup_time_min,
      actual_cycle_min: s.cycle_time_min,
      variance_pct: planned > 0 ? ((actual - planned) / planned) * 100 : 0,
      parts_complete: complete,
      parts_scrapped: scrap,
      scrap_rate_pct: made > 0 ? (scrap / made) * 100 : 0,
      wip_at_machine: q ? q.wip : null,
      queue_wait_min: q ? q.wait : null,
    };
  });

  const totalQueueWait = steps.reduce((a, s) => a + (s.queue_wait_min ?? 0), 0);
  const valueAdded = summary.total_cycle_min; // value-added time = actual cycle (machining) time
  const nonValueAdded = summary.total_setup_min + totalQueueWait; // setup + queue wait are non-value-added
  const lead = valueAdded + nonValueAdded;
  const complete = steps.reduce((a, s) => a + s.parts_complete, 0);
  const scrap = steps.reduce((a, s) => a + s.parts_scrapped, 0);
  const made = complete + scrap;

  const caveats: string[] = [];
  if (!board) caveats.push("Machine queue board unavailable; WIP / queue-wait omitted for all steps.");
  caveats.push("WIP is machine-queue depth (jobs queued at the step's machine), not true between-operation inventory.");
  caveats.push("Inter-operation wait is approximated by the machine-queue estimate; precise hand-off timestamps are not yet captured.");

  return {
    data_available: true,
    job_id: summary.job_id,
    steps,
    totals: {
      total_planned_setup_min: summary.est_total_setup_min,
      total_planned_cycle_min: summary.est_total_cycle_min,
      total_actual_setup_min: summary.total_setup_min,
      total_actual_cycle_min: summary.total_cycle_min,
      value_added_min: valueAdded,
      non_value_added_min: nonValueAdded,
      total_queue_wait_min: totalQueueWait,
      lead_time_min: lead,
      value_added_ratio: lead > 0 ? valueAdded / lead : 0,
      total_parts_complete: complete,
      total_parts_scrapped: scrap,
      scrap_rate_pct: made > 0 ? (scrap / made) * 100 : 0,
      setup_variance_pct: summary.setup_variance_pct,
      cycle_variance_pct: summary.cycle_variance_pct,
    },
    generated_at: nowIso,
    caveats,
  };
}

class ValueStreamMapEngine {
  /**
   * Build the value-stream map for a job from live traveler + machine-queue data.
   * @param input - { job_id }.
   * @returns ValueStreamMap; `data_available:false` when the job has no traveler (R12 -- not faked).
   */
  build(input: { job_id: string }): ValueStreamMap {
    const jobId = (input?.job_id ?? "").trim();
    if (!jobId) throw new Error("value_stream_map: job_id is required");

    // No traveler for a job is a normal business state, not an error -> degrade to data_available:false
    // (surfaced, not swallowed). Genuine programmer errors still propagate.
    let summary: TravelerSummary | null = null;
    try {
      summary = jobTravelerEngine.getTraveler(jobId);
    } catch {
      summary = null;
    }
    if (!summary) {
      return computeValueStreamMap({ job_id: jobId, total_steps: 0 } as TravelerSummary, null, new Date().toISOString());
    }

    let board: PlanningBoard | null = null;
    try {
      board = machineDispatchEngine.getAllQueues();
    } catch {
      board = null;
    }

    return computeValueStreamMap(summary, board, new Date().toISOString());
  }
}

export const valueStreamMapEngine = new ValueStreamMapEngine();
