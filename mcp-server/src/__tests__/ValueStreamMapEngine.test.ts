import { describe, it, expect } from "vitest";
import { computeValueStreamMap } from "../engines/ValueStreamMapEngine.js";
import type { TravelerSummary, RoutingStep } from "../engines/JobTravelerEngine.js";
import type { PlanningBoard } from "../engines/MachineDispatchEngine.js";

// Reference fixture: a 2-step traveler with known planned/actual times + scrap, and a machine board.
// All expected values below are hand-computed from these inputs (R9 -- the test fails if the VSM math drifts).
function step(over: Partial<RoutingStep> & Pick<RoutingStep, "step_number" | "operation">): RoutingStep {
  return {
    id: `s${over.step_number}`,
    job_id: "JOB-1",
    status: "complete",
    setup_time_min: 0,
    cycle_time_min: 0,
    est_setup_min: 0,
    est_cycle_min: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const SUMMARY: TravelerSummary = {
  job_id: "JOB-1",
  total_steps: 2,
  completed_steps: 2,
  pct_complete: 100,
  total_setup_min: 57, // 45 + 12 (actual)
  total_cycle_min: 205, // 180 + 25 (actual) -- value-added time
  est_total_setup_min: 40, // 30 + 10 (planned)
  est_total_cycle_min: 180, // 160 + 20 (planned)
  setup_variance_pct: 42.5, // (57-40)/40
  cycle_variance_pct: 13.888888, // (205-180)/180
  steps: [
    step({ step_number: 1, operation: "MILL-ROUGH", machine_id: "VMC-01", est_setup_min: 30, est_cycle_min: 160, setup_time_min: 45, cycle_time_min: 180, parts_complete: 8, parts_scrapped: 2 }),
    step({ step_number: 2, operation: "INSPECT", machine_id: "CMM-01", est_setup_min: 10, est_cycle_min: 20, setup_time_min: 12, cycle_time_min: 25, parts_complete: 10, parts_scrapped: 0 }),
  ],
};

const BOARD: PlanningBoard = {
  timestamp: "2026-01-01T00:00:00.000Z",
  total_queued_jobs: 4,
  machines: [
    { machine_id: "VMC-01", entries: [], total_queued: 3, total_est_min: 90 },
    { machine_id: "CMM-01", entries: [], total_queued: 1, total_est_min: 30 },
  ],
};

const NOW = "2026-06-25T00:00:00.000Z";

describe("computeValueStreamMap", () => {
  it("maps real per-step planned/actual/variance/scrap + machine WIP", () => {
    const vsm = computeValueStreamMap(SUMMARY, BOARD, NOW);
    expect(vsm.data_available).toBe(true);
    expect(vsm.steps).toHaveLength(2);

    const s1 = vsm.steps[0];
    expect(s1.operation).toBe("MILL-ROUGH");
    expect(s1.planned_setup_min).toBe(30);
    expect(s1.actual_setup_min).toBe(45);
    // (45+180 - (30+160)) / 190 * 100 = 35/190*100
    expect(s1.variance_pct).toBeCloseTo(18.4210, 3);
    expect(s1.scrap_rate_pct).toBeCloseTo(20, 6); // 2 / (8+2)
    expect(s1.wip_at_machine).toBe(3);
    expect(s1.queue_wait_min).toBe(90);

    const s2 = vsm.steps[1];
    expect(s2.variance_pct).toBeCloseTo(23.3333, 3); // (37-30)/30
    expect(s2.scrap_rate_pct).toBe(0);
    expect(s2.wip_at_machine).toBe(1);
  });

  it("computes lead time, value-added ratio, and scrap rate from totals (hand-checked)", () => {
    const t = computeValueStreamMap(SUMMARY, BOARD, NOW).totals;
    expect(t.total_queue_wait_min).toBe(120); // 90 + 30
    expect(t.value_added_min).toBe(205); // actual cycle
    expect(t.non_value_added_min).toBe(177); // setup 57 + queue 120
    expect(t.lead_time_min).toBe(382); // 205 + 177
    expect(t.value_added_ratio).toBeCloseTo(0.53665, 4); // 205 / 382
    expect(t.total_parts_scrapped).toBe(2);
    expect(t.scrap_rate_pct).toBeCloseTo(10, 6); // 2 / (18+2)
    expect(t.setup_variance_pct).toBe(42.5);
  });

  it("omits WIP and adds a caveat when the machine board is unavailable (R12, not faked)", () => {
    const vsm = computeValueStreamMap(SUMMARY, null, NOW);
    expect(vsm.steps[0].wip_at_machine).toBeNull();
    expect(vsm.steps[0].queue_wait_min).toBeNull();
    expect(vsm.totals.total_queue_wait_min).toBe(0);
    expect(vsm.totals.lead_time_min).toBe(262); // 205 cycle + 57 setup, no queue
    expect(vsm.caveats.some((c) => /board unavailable/i.test(c))).toBe(true);
  });

  it("returns data_available:false with an honest message when the job has no traveler", () => {
    const empty = { job_id: "JOB-NONE", total_steps: 0 } as TravelerSummary;
    const vsm = computeValueStreamMap(empty, BOARD, NOW);
    expect(vsm.data_available).toBe(false);
    expect(vsm.steps).toHaveLength(0);
    expect(vsm.message).toMatch(/no traveler/i);
    expect(vsm.totals.lead_time_min).toBe(0);
  });

  it("leaves WIP null for a step whose machine is not on the board", () => {
    const summary: TravelerSummary = {
      ...SUMMARY,
      steps: [step({ step_number: 1, operation: "DEBURR", machine_id: "BENCH-99", est_setup_min: 5, est_cycle_min: 5, setup_time_min: 5, cycle_time_min: 5, parts_complete: 10 })],
      total_steps: 1,
    };
    const vsm = computeValueStreamMap(summary, BOARD, NOW);
    expect(vsm.steps[0].wip_at_machine).toBeNull();
    expect(vsm.steps[0].queue_wait_min).toBeNull();
  });

  it("guards variance_pct to 0 (not Infinity/NaN) when a step has zero planned time", () => {
    // A step with no planned time but real actual time: (actual-0)/0 would be Infinity -- engine guards to 0.
    const zeroPlanned: TravelerSummary = {
      job_id: "JOB-ZP", total_steps: 1, completed_steps: 1, pct_complete: 100,
      total_setup_min: 10, total_cycle_min: 20, est_total_setup_min: 0, est_total_cycle_min: 0,
      setup_variance_pct: 0, cycle_variance_pct: 0,
      steps: [step({ step_number: 1, operation: "UNPLANNED", machine_id: "VMC-01", est_setup_min: 0, est_cycle_min: 0, setup_time_min: 10, cycle_time_min: 20, parts_complete: 5, parts_scrapped: 0 })],
    };
    const vsm = computeValueStreamMap(zeroPlanned, null, NOW);
    expect(vsm.steps[0].variance_pct).toBe(0);
    expect(Number.isFinite(vsm.steps[0].variance_pct)).toBe(true);
  });

  it("guards scrap_rate_pct to 0 (not NaN) when nothing has been made yet", () => {
    // complete=0, scrap=0 -> made=0 -> scrap/made would be NaN -- engine guards to 0.
    const nothingMade: TravelerSummary = {
      ...SUMMARY, total_steps: 1,
      steps: [step({ step_number: 1, operation: "QUEUED", est_setup_min: 5, est_cycle_min: 5, setup_time_min: 5, cycle_time_min: 5, parts_complete: 0, parts_scrapped: 0 })],
    };
    const vsm = computeValueStreamMap(nothingMade, null, NOW);
    expect(vsm.steps[0].scrap_rate_pct).toBe(0);
    expect(Number.isNaN(vsm.steps[0].scrap_rate_pct)).toBe(false);
    expect(vsm.totals.scrap_rate_pct).toBe(0);
  });

  it("guards value_added_ratio to 0 (not NaN) when total lead time is 0", () => {
    // A planned-only job (no actual time logged yet, no board) -> lead=0 -> 0/0 guarded to 0.
    const plannedOnly: TravelerSummary = {
      job_id: "JOB-ZT", total_steps: 1, completed_steps: 0, pct_complete: 0,
      total_setup_min: 0, total_cycle_min: 0, est_total_setup_min: 10, est_total_cycle_min: 20,
      setup_variance_pct: 0, cycle_variance_pct: 0,
      steps: [step({ step_number: 1, operation: "PLANNED-ONLY", machine_id: "VMC-01", est_setup_min: 10, est_cycle_min: 20 })],
    };
    const vsm = computeValueStreamMap(plannedOnly, null, NOW);
    expect(vsm.data_available).toBe(true);
    expect(vsm.totals.lead_time_min).toBe(0);
    expect(vsm.totals.value_added_ratio).toBe(0);
    expect(Number.isNaN(vsm.totals.value_added_ratio)).toBe(false);
  });

  it("always emits the two standing honesty caveats with a board, and never the 'board unavailable' one (R12)", () => {
    const vsm = computeValueStreamMap(SUMMARY, BOARD, NOW);
    expect(vsm.caveats).toHaveLength(2);
    expect(vsm.caveats.some((c) => /machine-queue depth/i.test(c))).toBe(true);
    expect(vsm.caveats.some((c) => /approximated/i.test(c))).toBe(true);
    expect(vsm.caveats.some((c) => /board unavailable/i.test(c))).toBe(false);
  });

  it("defaults missing parts_complete/parts_scrapped to 0 rather than NaN", () => {
    // step() omits parts fields here -> engine's `?? 0` path must apply.
    const noParts: TravelerSummary = {
      ...SUMMARY, total_steps: 1,
      steps: [step({ step_number: 1, operation: "BORE", machine_id: "VMC-01", est_setup_min: 10, est_cycle_min: 10, setup_time_min: 10, cycle_time_min: 10 })],
    };
    const vsm = computeValueStreamMap(noParts, BOARD, NOW);
    expect(vsm.steps[0].parts_complete).toBe(0);
    expect(vsm.steps[0].parts_scrapped).toBe(0);
    expect(vsm.steps[0].scrap_rate_pct).toBe(0);
    expect(vsm.totals.total_parts_complete).toBe(0);
  });

  it("reports negative variance_pct when an operation beats its plan (sign correctness, adversarial)", () => {
    // planned 60+140=200, actual 40+120=160 -> (160-200)/200*100 = -20.
    const aheadOfPlan: TravelerSummary = {
      ...SUMMARY, total_steps: 1, total_setup_min: 40, total_cycle_min: 120, est_total_setup_min: 60, est_total_cycle_min: 140,
      steps: [step({ step_number: 1, operation: "FAST", machine_id: "VMC-01", est_setup_min: 60, est_cycle_min: 140, setup_time_min: 40, cycle_time_min: 120, parts_complete: 10, parts_scrapped: 0 })],
    };
    const vsm = computeValueStreamMap(aheadOfPlan, BOARD, NOW);
    expect(vsm.steps[0].variance_pct).toBeCloseTo(-20, 6);
    expect(vsm.generated_at).toBe(NOW); // deterministic timestamp echo
  });
});
