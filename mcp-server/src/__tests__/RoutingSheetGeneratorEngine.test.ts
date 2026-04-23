/**
 * RoutingSheetGeneratorEngine Tests (U-MIO33)
 * ===========================================
 * Covers: row generation, time math, queue accounting, lead-time calc,
 * Markdown/CSV rendering, validation warnings, edge cases.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RoutingSheetGeneratorEngine,
  type RoutingSheetInput,
} from "../engines/RoutingSheetGeneratorEngine.js";

function simpleInput(): RoutingSheetInput {
  return {
    job_id: "J-100",
    part_number: "PN-ACME",
    revision: "A",
    customer: "ALCOA",
    quantity: 10,
    operations: [
      { op_num: 10, op_name: "Saw Cut", machine_id: "SAW-01", machine_type: "saw", setup_min: 15, cycle_min: 1.5 },
      { op_num: 20, op_name: "Rough Turn", machine_id: "OKUMA-LB3000", machine_type: "lathe", setup_min: 45, cycle_min: 4, tools: ["CNMG-432", "DCGT-21.51"] },
      { op_num: 30, op_name: "Mill Flats", machine_id: "HAAS-VF4", machine_type: "mill", setup_min: 30, cycle_min: 2.5 },
    ],
  };
}

describe("RoutingSheetGeneratorEngine — generate", () => {
  let engine: RoutingSheetGeneratorEngine;
  beforeEach(() => { engine = new RoutingSheetGeneratorEngine(); });

  it("produces one row per input operation", () => {
    const sheet = engine.generate(simpleInput());
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.routing_id).toMatch(/^RT-/);
  });

  it("calculates run_min = cycle_min × pieces", () => {
    const sheet = engine.generate(simpleInput());
    expect(sheet.rows[0].run_min).toBe(15); // 1.5 × 10
    expect(sheet.rows[1].run_min).toBe(40); // 4 × 10
    expect(sheet.rows[2].run_min).toBe(25); // 2.5 × 10
  });

  it("calculates op_total_min = setup + run", () => {
    const sheet = engine.generate(simpleInput());
    expect(sheet.rows[0].op_total_min).toBe(30);  // 15 + 15
    expect(sheet.rows[1].op_total_min).toBe(85);  // 45 + 40
    expect(sheet.rows[2].op_total_min).toBe(55);  // 30 + 25
  });

  it("calculates cumulative time with queue added between ops", () => {
    const sheet = engine.generate(simpleInput());
    // op1: 30 (no queue before first)
    // op2: 30 + 15 + 85 = 130
    // op3: 130 + 15 + 55 = 200
    expect(sheet.rows[0].cumulative_min).toBe(30);
    expect(sheet.rows[1].cumulative_min).toBe(130);
    expect(sheet.rows[2].cumulative_min).toBe(200);
  });

  it("calculates totals correctly", () => {
    const sheet = engine.generate(simpleInput());
    expect(sheet.totals.op_count).toBe(3);
    expect(sheet.totals.total_setup_min).toBe(90);  // 15+45+30
    expect(sheet.totals.total_run_min).toBe(80);    // 15+40+25
    expect(sheet.totals.total_queue_min).toBe(30);  // 15 × 2
    expect(sheet.totals.total_min).toBe(200);
    expect(sheet.totals.total_hr).toBeCloseTo(3.33, 2);
    expect(sheet.totals.lead_time_business_days).toBe(1);
  });

  it("lead_time scales up across multiple days (8-hr days)", () => {
    const input: RoutingSheetInput = {
      job_id: "J-BIG",
      part_number: "PN-BIG",
      revision: "A",
      quantity: 100,
      operations: [
        { op_num: 10, op_name: "Run", machine_id: "M1", setup_min: 30, cycle_min: 10 }, // 30+1000 = 1030
        { op_num: 20, op_name: "Run2", machine_id: "M2", setup_min: 30, cycle_min: 10 }, // 30+1000 = 1030
      ],
    };
    const sheet = engine.generate(input);
    // totals: 60 + 2000 + 15 queue = 2075 min = 34.58 hr
    expect(sheet.totals.total_min).toBe(2075);
    expect(sheet.totals.lead_time_business_days).toBe(Math.ceil(2075 / 60 / 8));
    expect(sheet.totals.lead_time_business_days).toBe(5);
  });

  it("respects custom queue_min_between_ops", () => {
    const input: RoutingSheetInput = {
      ...simpleInput(),
      queue_min_between_ops: 60,
    };
    const sheet = engine.generate(input);
    expect(sheet.totals.total_queue_min).toBe(120); // 60 × 2
  });

  it("handles single-op routing (no queue time)", () => {
    const sheet = engine.generate({
      job_id: "J-1",
      part_number: "PN-SINGLE",
      revision: "A",
      operations: [
        { op_num: 10, op_name: "Single", machine_id: "M1", setup_min: 10, cycle_min: 5 },
      ],
    });
    expect(sheet.totals.op_count).toBe(1);
    expect(sheet.totals.total_queue_min).toBe(0);
  });

  it("flags non-monotonic op sequence as warning", () => {
    const sheet = engine.generate({
      job_id: "J-X",
      part_number: "PN-X",
      revision: "A",
      operations: [
        { op_num: 10, op_name: "A", machine_id: "M1", setup_min: 5, cycle_min: 1 },
        { op_num: 20, op_name: "B", machine_id: "M2", setup_min: 5, cycle_min: 1 },
        { op_num: 15, op_name: "C", machine_id: "M3", setup_min: 5, cycle_min: 1 }, // out of order
      ],
    });
    expect(sheet.warnings.some(w => w.includes("monotonic"))).toBe(true);
  });

  it("flags invalid (negative or non-finite) times as warnings", () => {
    const sheet = engine.generate({
      job_id: "J-INV",
      part_number: "PN-INV",
      revision: "A",
      operations: [
        { op_num: 10, op_name: "Bad", machine_id: "M1", setup_min: -5, cycle_min: 1 },
      ],
    });
    expect(sheet.warnings.some(w => w.includes("setup_min"))).toBe(true);
  });

  it("throws when operations list is empty", () => {
    expect(() => engine.generate({
      job_id: "J-X", part_number: "PN-X", revision: "A", operations: [],
    })).toThrow(/at least one operation/);
  });

  it("defaults missing fields (fixture_id=N/A, wcs=G54, skill=journeyman)", () => {
    const sheet = engine.generate({
      job_id: "J-D",
      part_number: "PN-D",
      revision: "A",
      operations: [
        { op_num: 10, op_name: "X", machine_id: "M1", setup_min: 1, cycle_min: 1 },
      ],
    });
    expect(sheet.rows[0].fixture_id).toBe("N/A");
    expect(sheet.rows[0].wcs).toBe("G54");
    expect(sheet.rows[0].skill_level).toBe("journeyman");
  });
});

describe("RoutingSheetGeneratorEngine — rendering", () => {
  it("renders Markdown with all ops and totals", () => {
    const engine = new RoutingSheetGeneratorEngine();
    const forms = engine.generateAll(simpleInput());
    expect(forms.markdown).toContain("Routing Sheet RT-");
    expect(forms.markdown).toContain("Saw Cut");
    expect(forms.markdown).toContain("OKUMA-LB3000");
    expect(forms.markdown).toContain("**Total:** 200 min");
    expect(forms.markdown).toContain("business day");
  });

  it("renders CSV with header + rows", () => {
    const engine = new RoutingSheetGeneratorEngine();
    const forms = engine.generateAll(simpleInput());
    const lines = forms.csv.split("\n");
    expect(lines.length).toBe(4); // header + 3 ops
    expect(lines[0]).toContain("op_num");
    expect(lines[0]).toContain("cycle_min");
    expect(lines[1]).toContain("Saw Cut");
    expect(lines[2]).toContain("CNMG-432|DCGT-21.51"); // pipe-joined tools
  });

  it("escapes CSV cells containing commas", () => {
    const engine = new RoutingSheetGeneratorEngine();
    const forms = engine.generateAll({
      job_id: "J",
      part_number: "P",
      revision: "A",
      operations: [
        { op_num: 10, op_name: "Turn, then Bore", machine_id: "M1", setup_min: 5, cycle_min: 1, notes: "Start, then stop" },
      ],
    });
    expect(forms.csv).toContain('"Turn, then Bore"');
    expect(forms.csv).toContain('"Start, then stop"');
  });
});

describe("RoutingSheetGeneratorEngine — storage & retrieval", () => {
  it("retrieves sheets by routing_id", () => {
    const engine = new RoutingSheetGeneratorEngine();
    const sheet = engine.generate(simpleInput());
    expect(engine.get(sheet.routing_id)).toEqual(sheet);
    expect(engine.get("RT-99999")).toBeNull();
  });

  it("reset() clears store and counter", () => {
    const engine = new RoutingSheetGeneratorEngine();
    const s1 = engine.generate(simpleInput());
    engine.reset();
    expect(engine.get(s1.routing_id)).toBeNull();
    const s2 = engine.generate(simpleInput());
    expect(s2.routing_id).toBe("RT-00001");
  });
});
