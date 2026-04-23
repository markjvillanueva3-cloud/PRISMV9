/**
 * ProbingIntegrationEngine Tests (U-MIO36)
 * ========================================
 * Covers: probe routine generation, canonical P-code mapping, G-code
 * rendering, result disposition (PASS/MARGINAL/FAIL/UNKNOWN),
 * compensation recommendations, markdown, storage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ProbingIntegrationEngine,
  type ProbingIntegrationPlanInput,
  type ProbingRoutineInput,
} from "../engines/ProbingIntegrationEngine.js";

function routine(over: Partial<ProbingRoutineInput> = {}): ProbingRoutineInput {
  return {
    kind: "feature_probe",
    op_num: 20,
    feature_id: "F1",
    feature_name: "Bore Ø1.500",
    nominal: 1.5,
    tolerance_plus: 0.001,
    tolerance_minus: -0.001,
    unit: "in",
    axis: "XY",
    offset_register: "H01",
    ...over,
  };
}

function plan(extra: Partial<ProbingIntegrationPlanInput> = {}): ProbingIntegrationPlanInput {
  return {
    setup_id: "SU-00001",
    part_number: "PN-PROBE-1",
    revision: "A",
    routines: [routine()],
    ...extra,
  };
}

describe("ProbingIntegrationEngine — generate", () => {
  let engine: ProbingIntegrationEngine;
  beforeEach(() => { engine = new ProbingIntegrationEngine(); });

  it("generates plan with probing_id and routine per input", () => {
    const p = engine.generate(plan({
      routines: [routine({ routine_id: "R1" }), routine({ routine_id: "R2", kind: "tool_length_verify" })],
    }));
    expect(p.probing_id).toMatch(/^PB-\d{5}$/);
    expect(p.routines).toHaveLength(2);
    expect(p.summary.total_routines).toBe(2);
  });

  it("assigns auto routine_id when not provided", () => {
    const p = engine.generate(plan({
      routines: [routine({ routine_id: undefined }), routine({ routine_id: undefined })],
    }));
    expect(p.routines[0].routine_id).toBe("PR-001");
    expect(p.routines[1].routine_id).toBe("PR-002");
  });

  it("maps kind → Renishaw canonical P-code correctly", () => {
    const p = engine.generate(plan({
      routines: [
        routine({ kind: "wcs_find", axis: "X" }),          // P9811
        routine({ kind: "wcs_find", axis: "XY" }),         // P9814 (pocket centre)
        routine({ kind: "tool_length_verify", axis: "Z" }),// P9820
        routine({ kind: "feature_probe", axis: "Z" }),     // P9810
        routine({ kind: "feature_probe", axis: "XY" }),    // P9811
        routine({ kind: "calibration" }),                  // P9801
      ],
    }));
    expect(p.routines[0].canned_cycle).toBe("G65 P9811");
    expect(p.routines[1].canned_cycle).toBe("G65 P9814");
    expect(p.routines[2].canned_cycle).toBe("G65 P9820");
    expect(p.routines[3].canned_cycle).toBe("G65 P9810");
    expect(p.routines[4].canned_cycle).toBe("G65 P9811");
    expect(p.routines[5].canned_cycle).toBe("G65 P9801");
  });

  it("rolls up by_kind counts correctly", () => {
    const p = engine.generate(plan({
      routines: [
        routine({ kind: "wcs_find" }),
        routine({ kind: "tool_length_verify", offset_register: "H01" }),
        routine({ kind: "feature_probe" }),
        routine({ kind: "feature_probe" }),
        routine({ kind: "post_op_verify" }),
      ],
    }));
    expect(p.summary.by_kind.wcs_find).toBe(1);
    expect(p.summary.by_kind.tool_length_verify).toBe(1);
    expect(p.summary.by_kind.feature_probe).toBe(2);
    expect(p.summary.by_kind.post_op_verify).toBe(1);
    expect(p.summary.by_kind.calibration).toBe(0);
  });

  it("sums estimated_total_time_s correctly", () => {
    const p = engine.generate(plan({
      routines: [
        routine({ kind: "wcs_find" }),               // 25
        routine({ kind: "tool_length_verify" }),     // 15
        routine({ kind: "feature_probe" }),          // 20
      ],
    }));
    expect(p.summary.estimated_total_time_s).toBe(60);
  });

  it("warns on tool_length_verify without offset_register", () => {
    const p = engine.generate(plan({
      routines: [routine({ kind: "tool_length_verify", offset_register: undefined })],
    }));
    expect(p.summary.warnings.some(w => w.includes("offset_register"))).toBe(true);
  });

  it("warns on feature_probe without nominal", () => {
    const p = engine.generate(plan({
      routines: [routine({ kind: "feature_probe", nominal: undefined })],
    }));
    expect(p.summary.warnings.some(w => w.includes("no nominal"))).toBe(true);
  });

  it("warns on zero/negative tolerance band", () => {
    const p = engine.generate(plan({
      routines: [routine({ tolerance_plus: 0, tolerance_minus: 0 })],
    }));
    expect(p.summary.warnings.some(w => w.includes("tolerance band"))).toBe(true);
  });

  it("includes feature_name, G-code block, approach/retract in rendered gcode", () => {
    const p = engine.generate(plan({
      routines: [routine({ feature_name: "Bore Ø1.500", nominal: 1.5, approach_mm: 10, retract_mm: 5 })],
    }));
    expect(p.routines[0].gcode).toContain("(Bore Ø1.500)");
    expect(p.routines[0].gcode).toContain("G65 P9810 Z10.000");
    expect(p.routines[0].gcode).toContain("G65 P9811");
    expect(p.routines[0].gcode).toContain("G65 P9810 Z5.000");
  });

  it("throws when routines list is empty", () => {
    expect(() => engine.generate(plan({ routines: [] }))).toThrow(/at least one routine/);
  });

  it("applies defaults for missing setup_id", () => {
    const p = engine.generate({
      part_number: "PN-D",
      revision: "A",
      routines: [routine()],
    });
    expect(p.setup_id).toBe("N/A");
  });

  it("increments probing_id monotonically", () => {
    const p1 = engine.generate(plan());
    const p2 = engine.generate(plan());
    expect(p1.probing_id).toBe("PB-00001");
    expect(p2.probing_id).toBe("PB-00002");
  });
});

describe("ProbingIntegrationEngine — recordResult", () => {
  let engine: ProbingIntegrationEngine;
  beforeEach(() => { engine = new ProbingIntegrationEngine(); });

  it("disposes PASS when measurement is well within tolerance", () => {
    const p = engine.generate(plan({
      routines: [routine({ routine_id: "R1", nominal: 1.5, tolerance_plus: 0.001, tolerance_minus: -0.001 })],
    }));
    const r = engine.recordResult(p.probing_id, { routine_id: "R1", measured: 1.5001 });
    expect(r.disposition).toBe("PASS");
    expect(r.delta).toBeCloseTo(0.0001, 5);
    expect(r.compensation.action).toBe("none");
  });

  it("disposes MARGINAL when measurement is >80% of tolerance band", () => {
    const p = engine.generate(plan({
      routines: [routine({ routine_id: "R1", nominal: 1.5, tolerance_plus: 0.001, tolerance_minus: -0.001, offset_register: "H01" })],
    }));
    const r = engine.recordResult(p.probing_id, { routine_id: "R1", measured: 1.50085 });
    expect(r.disposition).toBe("MARGINAL");
    expect(r.compensation.action).toBe("apply_offset");
    expect(r.compensation.offset_register).toBe("H01");
    expect(r.compensation.delta_to_apply).toBeCloseTo(0.00085, 5);
  });

  it("disposes FAIL when measurement exceeds tolerance (upper)", () => {
    const p = engine.generate(plan({
      routines: [routine({ routine_id: "R1", nominal: 1.5, tolerance_plus: 0.001, tolerance_minus: -0.001 })],
    }));
    const r = engine.recordResult(p.probing_id, { routine_id: "R1", measured: 1.502 });
    expect(r.disposition).toBe("FAIL");
    expect(r.compensation.action).toBe("hold");
    expect(r.compensation.rationale).toMatch(/Human disposition/);
  });

  it("disposes FAIL when measurement exceeds tolerance (lower)", () => {
    const p = engine.generate(plan({
      routines: [routine({ routine_id: "R1", nominal: 1.5, tolerance_plus: 0.001, tolerance_minus: -0.001 })],
    }));
    const r = engine.recordResult(p.probing_id, { routine_id: "R1", measured: 1.498 });
    expect(r.disposition).toBe("FAIL");
    expect(r.delta).toBeCloseTo(-0.002, 5);
  });

  it("disposes UNKNOWN when no tolerance band configured", () => {
    const p = engine.generate(plan({
      routines: [routine({ routine_id: "R1", tolerance_plus: 0, tolerance_minus: 0 })],
    }));
    const r = engine.recordResult(p.probing_id, { routine_id: "R1", measured: 1.5 });
    expect(r.disposition).toBe("UNKNOWN");
    expect(r.compensation.action).toBe("none");
  });

  it("recommends apply_offset for tool_length_verify PASS with register", () => {
    const p = engine.generate(plan({
      routines: [routine({
        routine_id: "R1", kind: "tool_length_verify", axis: "Z",
        nominal: 150.0, tolerance_plus: 0.05, tolerance_minus: -0.05,
        offset_register: "H01", unit: "mm",
      })],
    }));
    const r = engine.recordResult(p.probing_id, { routine_id: "R1", measured: 150.02 });
    expect(r.disposition).toBe("PASS");
    expect(r.compensation.action).toBe("apply_offset");
    expect(r.compensation.offset_register).toBe("H01");
    expect(r.compensation.delta_to_apply).toBeCloseTo(0.02, 5);
  });

  it("throws on unknown probing_id", () => {
    expect(() => engine.recordResult("PB-99999", { routine_id: "R1", measured: 1.5 })).toThrow(/unknown probing_id/);
  });

  it("throws on unknown routine_id within plan", () => {
    const p = engine.generate(plan({ routines: [routine({ routine_id: "R1" })] }));
    expect(() => engine.recordResult(p.probing_id, { routine_id: "R99", measured: 1.5 })).toThrow(/not found in plan/);
  });

  it("stores result for later retrieval via getResult/listResults", () => {
    const p = engine.generate(plan({
      routines: [routine({ routine_id: "R1" }), routine({ routine_id: "R2", kind: "tool_length_verify", offset_register: "H02", nominal: 150, tolerance_plus: 0.1, tolerance_minus: -0.1 })],
    }));
    engine.recordResult(p.probing_id, { routine_id: "R1", measured: 1.5 });
    engine.recordResult(p.probing_id, { routine_id: "R2", measured: 150.05 });
    expect(engine.getResult(p.probing_id, "R1")).not.toBeNull();
    expect(engine.getResult(p.probing_id, "R99")).toBeNull();
    expect(engine.listResults(p.probing_id)).toHaveLength(2);
  });
});

describe("ProbingIntegrationEngine — rendering & storage", () => {
  it("renders Markdown with routine table, summary, warnings", () => {
    const engine = new ProbingIntegrationEngine();
    const p = engine.generate(plan({
      routines: [
        routine({ routine_id: "R1", kind: "wcs_find" }),
        routine({ routine_id: "R2", kind: "tool_length_verify", offset_register: undefined, nominal: 150 }), // triggers warning
      ],
    }));
    const md = engine.renderMarkdown(p);
    expect(md).toContain("# Probing Plan PB-");
    expect(md).toContain("PN-PROBE-1");
    expect(md).toContain("R1");
    expect(md).toContain("R2");
    expect(md).toContain("G65 P981");
    expect(md).toContain("## Summary");
    expect(md).toContain("## Warnings");
  });

  it("retrieves plans by probing_id; null for unknown", () => {
    const engine = new ProbingIntegrationEngine();
    const p = engine.generate(plan());
    expect(engine.get(p.probing_id)).toEqual(p);
    expect(engine.get("PB-99999")).toBeNull();
  });

  it("reset() clears store, results, and counter", () => {
    const engine = new ProbingIntegrationEngine();
    const p1 = engine.generate(plan());
    engine.recordResult(p1.probing_id, { routine_id: p1.routines[0].routine_id, measured: 1.5 });
    engine.reset();
    expect(engine.get(p1.probing_id)).toBeNull();
    expect(engine.listResults(p1.probing_id)).toHaveLength(0);
    const p2 = engine.generate(plan());
    expect(p2.probing_id).toBe("PB-00001");
  });
});
