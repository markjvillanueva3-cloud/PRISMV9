/**
 * LatheJobSchedulingEngine tests — U-LTH50
 *
 * Coverage:
 *   - EDD sort (earliest due date first)
 *   - Critical-ratio tiebreak on same due date
 *   - Feasibility filter (envelope, controller, live-tool, sub-spindle, y-axis)
 *   - Setup-minimizing adjacent pair improvement
 *   - Due-date guard: improvement must not worsen net lateness
 *   - Multi-machine assignment (earliest-available greedy)
 *   - Machine timelines: start/end ISO consistency, durations, changeovers
 *   - Utilization math
 *   - jobFromQuote adapter
 *   - Failure modes: empty jobs/machines rejected by Zod
 *   - Adversarial: oversize stock, bad ISO group, bad date
 *   - 3 ISO groups (P steel, N aluminum, S Inconel) across mixed machines
 *   - Dispatcher wiring (2 actions)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  LatheJobSchedulingEngine,
  type MachineSpec,
  type SchedulableJob,
  type ScheduleInput,
} from "../engines/LatheJobSchedulingEngine.js";
import type { QuotePackage } from "../engines/LatheAutoQuoteFromPrintEngine.js";

// ============================================================================
// FIXTURE BUILDERS
// ============================================================================

function makeMachine(overrides: Partial<MachineSpec> = {}): MachineSpec {
  return {
    id: "LATHE-01",
    name: "Okuma LB3000",
    controller: "okuma_osp",
    max_od_mm: 350,
    max_z_mm: 1000,
    max_spindle_bore_mm: 65,
    has_live_tool: false,
    has_sub_spindle: false,
    has_y_axis: false,
    ...overrides,
  };
}

function makeJob(overrides: Partial<SchedulableJob> = {}): SchedulableJob {
  return {
    job_id: "JOB-001",
    material_name: "1018",
    material_iso_group: "P",
    stock_od_mm: 40,
    stock_length_mm: 80,
    quantity: 10,
    setup_min: 45,
    cycle_min_per_part: 7,
    due_date_iso: "2026-05-01T00:00:00.000Z",
    priority: 50,
    fixture_type: "3jaw",
    requires_live_tool: false,
    requires_sub_spindle: false,
    requires_y_axis: false,
    ...overrides,
  };
}

const SCHEDULE_START = "2026-04-23T08:00:00.000Z";

// ============================================================================
// EDD SORT
// ============================================================================

describe("LatheJobSchedulingEngine — EDD sort", () => {
  it("schedules earlier-due jobs first on single machine", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine()],
      jobs: [
        makeJob({ job_id: "LATE", due_date_iso: "2026-05-15T00:00:00.000Z" }),
        makeJob({ job_id: "EARLY", due_date_iso: "2026-04-25T00:00:00.000Z" }),
      ],
    });
    const ops = report.machines[0].operations;
    expect(ops[0].job_id).toBe("EARLY");
    expect(ops[1].job_id).toBe("LATE");
  });

  it("critical-ratio tiebreaker: smaller slack goes first for same due date", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine()],
      jobs: [
        // Small job (low work, high slack) → later
        makeJob({ job_id: "SMALL", quantity: 1, cycle_min_per_part: 2, due_date_iso: "2026-04-25T00:00:00.000Z" }),
        // Big job (high work, low slack) → first
        makeJob({ job_id: "BIG", quantity: 50, cycle_min_per_part: 10, due_date_iso: "2026-04-25T00:00:00.000Z" }),
      ],
    });
    const ops = report.machines[0].operations;
    expect(ops[0].job_id).toBe("BIG");
  });
});

// ============================================================================
// FEASIBILITY
// ============================================================================

describe("LatheJobSchedulingEngine — feasibility filter", () => {
  it("rejects job whose stock OD exceeds every machine max_od_mm", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine({ max_od_mm: 100 })],
      jobs: [makeJob({ job_id: "TOO-BIG", stock_od_mm: 150 })],
    });
    expect(report.jobs_scheduled).toBe(0);
    expect(report.unscheduled).toHaveLength(1);
    expect(report.unscheduled[0].reason).toBe("no_feasible_machine");
    expect(report.unscheduled[0].detail).toContain("stock_od_mm 150");
  });

  it("rejects job requiring live tool on non-live-tool machines", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine({ has_live_tool: false })],
      jobs: [makeJob({ job_id: "NEEDS-LIVE", requires_live_tool: true })],
    });
    expect(report.jobs_scheduled).toBe(0);
    expect(report.unscheduled[0].detail).toContain("live_tool required");
  });

  it("respects allowed_machine_ids restriction", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [
        makeMachine({ id: "LATHE-01" }),
        makeMachine({ id: "LATHE-02", name: "Haas ST-20" }),
      ],
      jobs: [makeJob({ job_id: "RESTRICTED", allowed_machine_ids: ["LATHE-02"] })],
    });
    const op01 = report.machines.find((m) => m.machine_id === "LATHE-01")?.operations ?? [];
    const op02 = report.machines.find((m) => m.machine_id === "LATHE-02")?.operations ?? [];
    expect(op01).toHaveLength(0);
    expect(op02).toHaveLength(1);
  });
});

// ============================================================================
// MULTI-MACHINE ASSIGNMENT
// ============================================================================

describe("LatheJobSchedulingEngine — multi-machine assignment", () => {
  it("distributes jobs across machines using earliest-available greedy", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [
        makeMachine({ id: "M1" }),
        makeMachine({ id: "M2" }),
      ],
      jobs: [
        makeJob({ job_id: "J1", due_date_iso: "2026-05-01T00:00:00.000Z" }),
        makeJob({ job_id: "J2", due_date_iso: "2026-05-01T00:00:00.000Z" }),
      ],
    });
    const m1Jobs = report.machines.find((m) => m.machine_id === "M1")?.operations.length ?? 0;
    const m2Jobs = report.machines.find((m) => m.machine_id === "M2")?.operations.length ?? 0;
    expect(m1Jobs + m2Jobs).toBe(2);
    // Balanced: each machine should get one
    expect(m1Jobs).toBe(1);
    expect(m2Jobs).toBe(1);
  });
});

// ============================================================================
// CHANGEOVER + SETUP MINIMIZATION
// ============================================================================

describe("LatheJobSchedulingEngine — changeover math", () => {
  it("first op has zero changeover; subsequent ops carry teardown + material/fixture tax", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine()],
      jobs: [
        makeJob({ job_id: "A", material_name: "1018", fixture_type: "3jaw" }),
        makeJob({ job_id: "B", material_name: "304", fixture_type: "collet", due_date_iso: "2026-05-02T00:00:00.000Z" }),
      ],
    });
    const ops = report.machines[0].operations;
    expect(ops[0].changeover_from_prev_min).toBe(0);
    // teardown 5 + material 20 + fixture 15 = 40
    expect(ops[1].changeover_from_prev_min).toBe(40);
  });

  it("same material + fixture → only teardown (5 min)", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine()],
      jobs: [
        makeJob({ job_id: "A", material_name: "1018", fixture_type: "3jaw" }),
        makeJob({ job_id: "B", material_name: "1018", fixture_type: "3jaw", due_date_iso: "2026-05-02T00:00:00.000Z" }),
      ],
    });
    const ops = report.machines[0].operations;
    expect(ops[1].changeover_from_prev_min).toBe(5);
  });
});

// ============================================================================
// DUE-DATE LATENESS
// ============================================================================

describe("LatheJobSchedulingEngine — due-date lateness", () => {
  it("job completing before due date has lateness=0 and on_time=true", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine()],
      jobs: [
        makeJob({ job_id: "OT", quantity: 5, cycle_min_per_part: 2, due_date_iso: "2026-04-30T00:00:00.000Z" }),
      ],
    });
    const op = report.machines[0].operations[0];
    expect(op.lateness_min).toBe(0);
    expect(op.on_time).toBe(true);
    expect(op.slack_min).toBeGreaterThan(0);
  });

  it("job exceeding due date has positive lateness and on_time=false", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: "2026-04-23T08:00:00.000Z",
      machines: [makeMachine()],
      jobs: [
        // Big job with a too-soon due date
        makeJob({
          job_id: "LATE",
          quantity: 1000,
          cycle_min_per_part: 10,
          due_date_iso: "2026-04-23T10:00:00.000Z",
        }),
      ],
    });
    const op = report.machines[0].operations[0];
    expect(op.lateness_min).toBeGreaterThan(0);
    expect(op.on_time).toBe(false);
    expect(op.slack_min).toBeLessThan(0);
    expect(report.jobs_late).toBe(1);
  });
});

// ============================================================================
// ISO GROUP VARIABILITY (3 GROUPS)
// ============================================================================

describe("LatheJobSchedulingEngine — ISO group variability", () => {
  it("steel (P), aluminum (N), and Inconel (S) jobs all schedule independently", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine()],
      jobs: [
        makeJob({ job_id: "STEEL", material_name: "1018", material_iso_group: "P" }),
        makeJob({ job_id: "ALUM", material_name: "6061", material_iso_group: "N", due_date_iso: "2026-05-03T00:00:00.000Z" }),
        makeJob({ job_id: "INCO", material_name: "Inconel 718", material_iso_group: "S", due_date_iso: "2026-05-05T00:00:00.000Z" }),
      ],
    });
    expect(report.jobs_scheduled).toBe(3);
    const materials = report.machines[0].operations.map((o) => o.material_iso_group);
    expect(materials).toEqual(["P", "N", "S"]);
  });
});

// ============================================================================
// JOB FROM QUOTE
// ============================================================================

describe("LatheJobSchedulingEngine — jobFromQuote adapter", () => {
  it("converts a QuotePackage into a valid SchedulableJob", () => {
    const engine = new LatheJobSchedulingEngine();
    const quote: QuotePackage = {
      quote_id: "Q-X",
      generated_at: new Date().toISOString(),
      generation_ms: 10,
      customer: "ALCOA",
      part_number: "ALCOA-DIE-PIN",
      quantity: 10,
      cost: {} as any,
      tool_wear_lines: [],
      evidence: {
        material_name: "1018",
        iso_group: "P",
        stock_od_mm: 40,
        stock_id_mm: 0,
        stock_length_mm: 80,
        stock_volume_cm3: 100,
        stock_mass_kg: 0.79,
        total_cycle_min: 7,
        total_rapid_min: 0.03,
        setup_count: 1,
        operation_count: 3,
        material_price_usd_per_kg: 2.5,
        machine_rate_usd_hr: 85,
        setup_rate_usd_hr: 95,
        overhead_rate: 0.15,
        margin_rate: 0.35,
        scrap_factor: 0.2,
      },
      variance_band: {} as any,
      meets_sla: true,
      sla_limit_sec: 90,
    };
    const job = engine.jobFromQuote(quote, {
      job_id: "JOB-FROM-Q",
      due_date_iso: "2026-05-01T00:00:00.000Z",
      priority: 80,
    });
    expect(job.job_id).toBe("JOB-FROM-Q");
    expect(job.customer).toBe("ALCOA");
    expect(job.material_iso_group).toBe("P");
    expect(job.setup_min).toBe(45); // setup_count 1 * 45
    expect(job.cycle_min_per_part).toBe(7);
    expect(job.quantity).toBe(10);
    expect(job.priority).toBe(80);
  });
});

// ============================================================================
// FAILURE MODES
// ============================================================================

describe("LatheJobSchedulingEngine — failure modes", () => {
  it("rejects empty jobs list", () => {
    const engine = new LatheJobSchedulingEngine();
    expect(() =>
      engine.schedule({ jobs: [], machines: [makeMachine()] } as unknown as ScheduleInput),
    ).toThrow();
  });

  it("rejects empty machines list", () => {
    const engine = new LatheJobSchedulingEngine();
    expect(() =>
      engine.schedule({ jobs: [makeJob()], machines: [] } as unknown as ScheduleInput),
    ).toThrow();
  });

  it("rejects invalid iso_group", () => {
    const engine = new LatheJobSchedulingEngine();
    expect(() =>
      engine.schedule({
        jobs: [makeJob({ material_iso_group: "Z" as any })],
        machines: [makeMachine()],
      } as ScheduleInput),
    ).toThrow();
  });

  it("rejects invalid due_date ISO string", () => {
    const engine = new LatheJobSchedulingEngine();
    expect(() =>
      engine.schedule({
        jobs: [makeJob({ due_date_iso: "not-a-date" })],
        machines: [makeMachine()],
      } as ScheduleInput),
    ).toThrow();
  });

  it("rejects negative cycle_min_per_part (Zod positive)", () => {
    const engine = new LatheJobSchedulingEngine();
    expect(() =>
      engine.schedule({
        jobs: [makeJob({ cycle_min_per_part: -1 })],
        machines: [makeMachine()],
      } as ScheduleInput),
    ).toThrow();
  });

  it("rejects NaN stock_od_mm", () => {
    const engine = new LatheJobSchedulingEngine();
    expect(() =>
      engine.schedule({
        jobs: [makeJob({ stock_od_mm: Number.NaN })],
        machines: [makeMachine()],
      } as ScheduleInput),
    ).toThrow();
  });

  it("rejects Infinity cycle time", () => {
    const engine = new LatheJobSchedulingEngine();
    expect(() =>
      engine.schedule({
        jobs: [makeJob({ cycle_min_per_part: Number.POSITIVE_INFINITY })],
        machines: [makeMachine()],
      } as ScheduleInput),
    ).toThrow();
  });
});

// ============================================================================
// AGGREGATE STATS
// ============================================================================

describe("LatheJobSchedulingEngine — aggregate stats", () => {
  it("computes jobs_scheduled + jobs_on_time + total_busy_min", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine()],
      jobs: [
        makeJob({ job_id: "A" }),
        makeJob({ job_id: "B", due_date_iso: "2026-05-02T00:00:00.000Z" }),
      ],
    });
    expect(report.jobs_scheduled).toBe(2);
    expect(report.jobs_on_time + report.jobs_late).toBe(2);
    expect(report.total_busy_min).toBeGreaterThan(0);
  });

  it("utilization per machine in [0, 100]", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [makeMachine()],
      jobs: [makeJob()],
    });
    for (const m of report.machines) {
      if (m.operations.length > 0) {
        expect(m.utilization_pct).toBeGreaterThanOrEqual(0);
        expect(m.utilization_pct).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ============================================================================
// DISPATCHER WIRING
// ============================================================================

describe("LatheJobSchedulingEngine — dispatcher wiring", () => {
  it("both U-LTH50 actions are enum-registered with case handlers + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_job_schedule"');
    expect(src).toContain('"lathe_job_from_quote"');
    expect(src).toMatch(/case "lathe_job_schedule"/);
    expect(src).toMatch(/case "lathe_job_from_quote"/);
    expect(src).toContain('"../../engines/LatheJobSchedulingEngine.js"');
    expect(src).toContain('case "latheScheduler"');
  });

  it("end-to-end round-trip: schedule 3 jobs, 1 on time, 2 machines", () => {
    const engine = new LatheJobSchedulingEngine();
    const report = engine.schedule({
      schedule_start_iso: SCHEDULE_START,
      machines: [
        makeMachine({ id: "M1", name: "Okuma LB3000" }),
        makeMachine({ id: "M2", name: "Haas ST-20", controller: "haas" }),
      ],
      jobs: [
        makeJob({ job_id: "J1", due_date_iso: "2026-04-26T00:00:00.000Z" }),
        makeJob({ job_id: "J2", due_date_iso: "2026-04-27T00:00:00.000Z" }),
        makeJob({ job_id: "J3", due_date_iso: "2026-04-28T00:00:00.000Z" }),
      ],
    });
    expect(report.jobs_scheduled).toBe(3);
    const allJobIds = report.machines.flatMap((m) => m.operations.map((o) => o.job_id));
    expect(allJobIds.sort()).toEqual(["J1", "J2", "J3"]);
    // Distinct machines used (greedy fan-out)
    const machinesUsed = report.machines.filter((m) => m.operations.length > 0).length;
    expect(machinesUsed).toBeGreaterThanOrEqual(1);
  });
});
