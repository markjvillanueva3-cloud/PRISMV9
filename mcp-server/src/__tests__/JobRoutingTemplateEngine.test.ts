/**
 * JobRoutingTemplateEngine.test.ts — hotel iter18 / G7 close-out.
 * Verifies template CRUD, deterministic instantiation, time-invariant
 * gate, R12 fail-loud surface.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { jobRoutingTemplateEngine } from "../engines/JobRoutingTemplateEngine.js";
import type { RoutingOperation } from "../engines/JobRoutingTemplateEngine.js";

const MILLED_BRACKET_OPS: RoutingOperation[] = [
  { seq: 10, op_code: "MILL-ROUGH", description: "Rough mill perimeter", work_center_id: "MILL-VF2", setup_time_min: 30, run_time_per_part_min: 4.5 },
  { seq: 20, op_code: "MILL-FINISH", description: "Finish mill perimeter + features", work_center_id: "MILL-VF2", setup_time_min: 15, run_time_per_part_min: 6.2 },
  { seq: 30, op_code: "DEBURR", description: "Hand deburr edges", work_center_id: "BENCH-1", setup_time_min: 0, run_time_per_part_min: 1.5 },
  { seq: 40, op_code: "INSPECT", description: "First-article CMM inspection", work_center_id: "CMM-1", setup_time_min: 10, run_time_per_part_min: 0.8 },
];

const TURNED_SHAFT_OPS: RoutingOperation[] = [
  { seq: 10, op_code: "TURN-OD", description: "Rough + finish OD turn", work_center_id: "LATHE-OKUMA", setup_time_min: 25, run_time_per_part_min: 3.0 },
  { seq: 20, op_code: "THREAD", description: "Single-point thread", work_center_id: "LATHE-OKUMA", setup_time_min: 8, run_time_per_part_min: 1.5 },
];

describe("JobRoutingTemplateEngine — create + read", () => {
  beforeEach(() => jobRoutingTemplateEngine.__resetForTests());

  it("creates a template with RTE-NNNNNN id + sorts operations ASC by seq", () => {
    const t = jobRoutingTemplateEngine.create({
      name: "Milled Bracket Standard",
      part_family: "milled-bracket",
      operations: [...MILLED_BRACKET_OPS].reverse(),  // intentionally out of order
    });
    expect(t.id).toMatch(/^RTE-\d{6}$/);
    expect(t.operations.map(o => o.seq)).toEqual([10, 20, 30, 40]);
  });

  it("defensive copy — mutation does not affect storage", () => {
    const t = jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: MILLED_BRACKET_OPS,
    });
    t.operations[0].setup_time_min = 99999;
    const reread = jobRoutingTemplateEngine.get(t.id);
    expect(reread?.operations[0].setup_time_min).toBe(30);
  });

  it("get(null/empty/missing) returns null", () => {
    expect(jobRoutingTemplateEngine.get("")).toBe(null);
    expect(jobRoutingTemplateEngine.get("RTE-999999")).toBe(null);
  });

  it("list filters by part_family", () => {
    jobRoutingTemplateEngine.create({
      name: "Bracket", part_family: "milled-bracket", operations: MILLED_BRACKET_OPS,
    });
    jobRoutingTemplateEngine.create({
      name: "Shaft", part_family: "turned-shaft", operations: TURNED_SHAFT_OPS,
    });
    expect(jobRoutingTemplateEngine.list("milled-bracket").length).toBe(1);
    expect(jobRoutingTemplateEngine.list("turned-shaft").length).toBe(1);
    expect(jobRoutingTemplateEngine.list().length).toBe(2);
  });

  it("list ordered by id ASC (deterministic)", () => {
    const a = jobRoutingTemplateEngine.create({ name: "A", part_family: "x", operations: MILLED_BRACKET_OPS });
    const b = jobRoutingTemplateEngine.create({ name: "B", part_family: "x", operations: TURNED_SHAFT_OPS });
    expect(jobRoutingTemplateEngine.list().map(t => t.id)).toEqual([a.id, b.id]);
  });
});

describe("JobRoutingTemplateEngine — instantiate (time-invariant gate)", () => {
  beforeEach(() => jobRoutingTemplateEngine.__resetForTests());

  it("instantiates milled bracket for qty=10 with correct per-op totals", () => {
    const t = jobRoutingTemplateEngine.create({
      name: "Milled Bracket", part_family: "milled-bracket", operations: MILLED_BRACKET_OPS,
    });
    const inst = jobRoutingTemplateEngine.instantiate(t.id, "PART-ALC-001", 10);
    // MILL-ROUGH: 30 + 4.5*10 = 75
    // MILL-FINISH: 15 + 6.2*10 = 77
    // DEBURR: 0 + 1.5*10 = 15
    // INSPECT: 10 + 0.8*10 = 18
    // total = 185
    expect(inst.rows[0].total_time_min).toBeCloseTo(75, 2);
    expect(inst.rows[1].total_time_min).toBeCloseTo(77, 2);
    expect(inst.rows[2].total_time_min).toBeCloseTo(15, 2);
    expect(inst.rows[3].total_time_min).toBeCloseTo(18, 2);
    expect(inst.total_estimated_time_min).toBeCloseTo(185, 2);
  });

  it("setup time is qty-invariant, run time scales linearly", () => {
    const t = jobRoutingTemplateEngine.create({
      name: "Shaft", part_family: "turned-shaft", operations: TURNED_SHAFT_OPS,
    });
    const small = jobRoutingTemplateEngine.instantiate(t.id, "P1", 10);
    const big = jobRoutingTemplateEngine.instantiate(t.id, "P1", 100);
    expect(big.total_setup_min).toBe(small.total_setup_min);  // setup unchanged
    // Run time scales 10x
    expect(Math.abs(big.total_run_min - small.total_run_min * 10)).toBeLessThan(0.01);
  });

  it("HOTEL-SOUL: row-sum equals total_estimated_time (within tolerance)", () => {
    const t = jobRoutingTemplateEngine.create({
      name: "B", part_family: "x", operations: MILLED_BRACKET_OPS,
    });
    const inst = jobRoutingTemplateEngine.instantiate(t.id, "P", 25);
    const rowSum = inst.rows.reduce((s, r) => s + r.total_time_min, 0);
    expect(Math.abs(rowSum - inst.total_estimated_time_min)).toBeLessThan(0.01);
    expect(inst.rows_balanced).toBe(true);
  });

  it("total_setup + total_run == total_estimated_time", () => {
    const t = jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: MILLED_BRACKET_OPS,
    });
    const inst = jobRoutingTemplateEngine.instantiate(t.id, "P", 50);
    expect(Math.abs(inst.total_setup_min + inst.total_run_min - inst.total_estimated_time_min)).toBeLessThan(0.01);
  });

  it("R12: rejects unknown template id", () => {
    expect(() => jobRoutingTemplateEngine.instantiate("RTE-999999", "P", 10)).toThrow(/not found/);
  });

  it("R12: rejects non-positive qty", () => {
    const t = jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: MILLED_BRACKET_OPS,
    });
    expect(() => jobRoutingTemplateEngine.instantiate(t.id, "P", 0)).toThrow(/> 0/);
    expect(() => jobRoutingTemplateEngine.instantiate(t.id, "P", -1)).toThrow(/> 0/);
  });

  it("R12: rejects empty part_id", () => {
    const t = jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: MILLED_BRACKET_OPS,
    });
    expect(() => jobRoutingTemplateEngine.instantiate(t.id, "", 10)).toThrow(/empty/);
  });
});

describe("JobRoutingTemplateEngine — R12 fail-loud on create", () => {
  beforeEach(() => jobRoutingTemplateEngine.__resetForTests());

  it("rejects empty name", () => {
    expect(() => jobRoutingTemplateEngine.create({
      name: "", part_family: "x", operations: MILLED_BRACKET_OPS,
    })).toThrow(/empty/);
  });

  it("rejects empty operations", () => {
    expect(() => jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: [],
    })).toThrow(/at least 1/);
  });

  it("rejects duplicate seq", () => {
    expect(() => jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: [
        { seq: 10, op_code: "A", description: "a", work_center_id: "w", setup_time_min: 0, run_time_per_part_min: 1 },
        { seq: 10, op_code: "B", description: "b", work_center_id: "w", setup_time_min: 0, run_time_per_part_min: 1 },
      ],
    })).toThrow(/duplicate sequence/);
  });

  it("rejects non-positive seq", () => {
    expect(() => jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: [
        { seq: 0, op_code: "A", description: "a", work_center_id: "w", setup_time_min: 0, run_time_per_part_min: 1 },
      ],
    })).toThrow(/positive integer/);
  });

  it("rejects negative setup_time_min", () => {
    expect(() => jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: [
        { seq: 10, op_code: "A", description: "a", work_center_id: "w", setup_time_min: -1, run_time_per_part_min: 1 },
      ],
    })).toThrow(/>= 0/);
  });

  it("rejects negative run_time_per_part_min", () => {
    expect(() => jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: [
        { seq: 10, op_code: "A", description: "a", work_center_id: "w", setup_time_min: 0, run_time_per_part_min: -1 },
      ],
    })).toThrow(/>= 0/);
  });

  it("rejects empty op_code", () => {
    expect(() => jobRoutingTemplateEngine.create({
      name: "X", part_family: "x", operations: [
        { seq: 10, op_code: "", description: "a", work_center_id: "w", setup_time_min: 0, run_time_per_part_min: 1 },
      ],
    })).toThrow(/empty/);
  });
});
