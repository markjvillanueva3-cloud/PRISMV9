/**
 * LathePartoffSafetyRailEngine — engine-direct tests.
 *
 * Companion to the dispatcher round-trip suite
 * (dispatcher.lathePartoffSafetyGate.test.ts). Covers all 7 gates + the
 * orchestrating evaluate() flow + input validation.
 *
 * Every assertion pins a concrete reference value computed from the engine's
 * declared thresholds (Sandvik parting guide + Machinery's Handbook 31st ed.):
 *   - L/D hard_block at 4.0, warn at 3.0
 *   - SFM warn at 800, hard_block at 1200
 *   - feed/rev warn at 0.12, hard_block at 0.25 mm/rev
 *   - clearance/width hard_block < 1.5, warn < 2.5
 *   - chip breaker required when UTS ≥ 600 MPa
 *   - bar_puller workholding warns when D > 50 mm
 */

import { describe, it, expect } from "vitest";
import {
  LathePartoffSafetyRailEngine,
  lathePartoffSafetyRailEngine,
  type PartoffOpSpec,
} from "../engines/LathePartoffSafetyRailEngine.js";

/** A spec that passes EVERY gate. Used as the "all-green" baseline. */
function safeOp(): PartoffOpSpec {
  return {
    part_diameter_mm: 25,        // SFM at 1000 RPM = π·25·1000/304.8 ≈ 257 → well under 800 warn
    parting_width_mm: 3,
    tool_overhang_mm: 6,         // ratio 2.0 → under 3.0 warn
    spindle_rpm: 1000,
    feed_mm_per_rev: 0.08,       // under 0.12 warn
    material_uts_mpa: 500,       // under 600 chip-breaker required
    workholding_type: "chuck",
    chip_clearance_mm: 9,        // 9/3 = 3.0 → above 2.5 warn
    has_subspindle_purge: false,
    chip_breaker: "none",
  };
}

describe("LathePartoffSafetyRailEngine — evaluate() orchestration", () => {
  it("all-green op passes every gate with zero violations", () => {
    const v = lathePartoffSafetyRailEngine.evaluate(safeOp());
    expect(v.passed).toBe(true);
    expect(v.gates.length).toBe(7);
    expect(v.violations.length).toBe(0);
    expect(v.advisories.length).toBe(0);
    expect(v.summary).toBe("All parting-off safety gates passed.");
  });

  it("returns gates in declared order: overhang, sfm, feed, clearance, breaker, workholding, purge", () => {
    const v = lathePartoffSafetyRailEngine.evaluate(safeOp());
    expect(v.gates.map((g) => g.name)).toEqual([
      "tool_overhang_ratio",
      "surface_speed_sfm",
      "feed_per_rev",
      "chip_clearance",
      "chip_breaker",
      "workholding_adequacy",
      "subspindle_purge",
    ]);
  });

  it("any hard_block failure flips passed=false even with otherwise green gates", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      tool_overhang_mm: 15,  // 15/3 = 5.0 > 4.0 hard_block
    });
    expect(v.passed).toBe(false);
    expect(v.summary.startsWith("BLOCKED by 1 hard gate")).toBe(true);
    expect(v.summary.includes("tool_overhang_ratio")).toBe(true);
  });

  it("warn-only violations keep passed=true but populate advisories", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      tool_overhang_mm: 12,  // 12/3 = 4.0 — boundary, NOT >4.0 hard_block. Use 4.0 exactly.
    });
    // 4.0 is the boundary — engine uses > (strict), so this should PASS hard_block but FAIL warn.
    // ratio == 4.0 → !(4.0 > 4.0) → !(4.0 > 3.0) is false → warn fires.
    expect(v.passed).toBe(true);
    expect(v.violations.length).toBe(1);
    expect(v.advisories.length).toBe(1);
    expect(v.violations[0]!.severity).toBe("warn");
    expect(v.summary).toBe("Passed with 1 advisory violation(s).");
  });

  it("a fresh instance produces the same verdict as the exported singleton", () => {
    const fresh = new LathePartoffSafetyRailEngine();
    const a = fresh.evaluate(safeOp());
    const b = lathePartoffSafetyRailEngine.evaluate(safeOp());
    expect(a).toEqual(b);
  });
});

describe("LathePartoffSafetyRailEngine — tool_overhang_ratio gate", () => {
  it("ratio > 4.0 → hard_block (note cites the strict threshold)", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      tool_overhang_mm: 13,  // 13/3 ≈ 4.33
    });
    const g = v.gates[0]!;
    expect(g.severity).toBe("hard_block");
    expect(g.passed).toBe(false);
    expect(g.value).toBe(4.33);
    expect(g.threshold).toBe(4);
    expect(g.note).toContain("snap");
  });

  it("3.0 < ratio ≤ 4.0 → warn", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      tool_overhang_mm: 10,  // 10/3 ≈ 3.33
    });
    const g = v.gates[0]!;
    expect(g.severity).toBe("warn");
    expect(g.passed).toBe(false);
    expect(g.value).toBe(3.33);
  });

  it("ratio ≤ 3.0 → pass", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      tool_overhang_mm: 6,  // ratio 2.0
    });
    expect(v.gates[0]!.passed).toBe(true);
  });
});

describe("LathePartoffSafetyRailEngine — surface_speed_sfm gate", () => {
  it("SFM > 1200 → hard_block", () => {
    // π·100·1500/304.8 ≈ 1546 SFM
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      part_diameter_mm: 100,
      spindle_rpm: 1500,
    });
    const g = v.gates[1]!;
    expect(g.severity).toBe("hard_block");
    expect(g.passed).toBe(false);
    expect(g.value).toBe(Math.round((Math.PI * 100 * 1500) / 304.8));
  });

  it("800 < SFM ≤ 1200 → warn", () => {
    // π·100·1000/304.8 ≈ 1031
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      part_diameter_mm: 100,
      spindle_rpm: 1000,
    });
    const g = v.gates[1]!;
    expect(g.severity).toBe("warn");
    expect(g.passed).toBe(false);
  });

  it("SFM ≤ 800 → pass", () => {
    const v = lathePartoffSafetyRailEngine.evaluate(safeOp());
    expect(v.gates[1]!.passed).toBe(true);
  });
});

describe("LathePartoffSafetyRailEngine — feed_per_rev gate", () => {
  it("feed > 0.25 mm/rev → hard_block (notes overload certain)", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({ ...safeOp(), feed_mm_per_rev: 0.3 });
    const g = v.gates[2]!;
    expect(g.severity).toBe("hard_block");
    expect(g.value).toBe(0.3);
    expect(g.threshold).toBe(0.25);
    expect(g.note).toContain("overload");
  });

  it("0.12 < feed ≤ 0.25 → warn", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({ ...safeOp(), feed_mm_per_rev: 0.18 });
    expect(v.gates[2]!.severity).toBe("warn");
    expect(v.gates[2]!.passed).toBe(false);
  });

  it("feed ≤ 0.12 → pass", () => {
    expect(lathePartoffSafetyRailEngine.evaluate(safeOp()).gates[2]!.passed).toBe(true);
  });
});

describe("LathePartoffSafetyRailEngine — chip_clearance gate", () => {
  it("clearance/width < 1.5 → hard_block (jam risk)", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      chip_clearance_mm: 3,  // 3/3 = 1.0
    });
    const g = v.gates[3]!;
    expect(g.severity).toBe("hard_block");
    expect(g.value).toBe(1);
    expect(g.threshold).toBe(1.5);
    expect(g.note).toContain("jam");
  });

  it("1.5 ≤ ratio < 2.5 → warn (TSC/air-blast required)", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      chip_clearance_mm: 6,  // 6/3 = 2.0
    });
    expect(v.gates[3]!.severity).toBe("warn");
  });

  it("ratio ≥ 2.5 → pass", () => {
    expect(lathePartoffSafetyRailEngine.evaluate(safeOp()).gates[3]!.passed).toBe(true);
  });
});

describe("LathePartoffSafetyRailEngine — chip_breaker gate", () => {
  it("UTS ≥ 600 MPa AND breaker='none' → warn", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      material_uts_mpa: 800,
      chip_breaker: "none",
    });
    const g = v.gates[4]!;
    expect(g.severity).toBe("warn");
    expect(g.passed).toBe(false);
    expect(g.value).toBe(800);
    expect(g.threshold).toBe(600);
  });

  it("UTS ≥ 600 MPa AND breaker='groove' → pass (selected breaker satisfies the gate)", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      material_uts_mpa: 800,
      chip_breaker: "groove",
    });
    expect(v.gates[4]!.passed).toBe(true);
  });

  it("UTS < 600 MPa AND breaker='none' → pass (no breaker required)", () => {
    expect(lathePartoffSafetyRailEngine.evaluate(safeOp()).gates[4]!.passed).toBe(true);
  });
});

describe("LathePartoffSafetyRailEngine — workholding_adequacy + subspindle_purge gates", () => {
  it("bar_puller on D > 50mm → warn (part may fly)", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      // raise diameter without crossing the 1200 SFM hard block:
      // π·60·400/304.8 ≈ 247 → safe.
      part_diameter_mm: 60,
      spindle_rpm: 400,
      workholding_type: "bar_puller",
    });
    expect(v.gates[5]!.severity).toBe("warn");
    expect(v.gates[5]!.passed).toBe(false);
    expect(v.gates[5]!.value).toBe(60);
  });

  it("bar_puller on D ≤ 50mm → pass", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      workholding_type: "bar_puller",
    });
    expect(v.gates[5]!.passed).toBe(true);
  });

  it("sub_spindle without purge plan → info advisory (passed=true)", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      workholding_type: "sub_spindle",
      has_subspindle_purge: false,
    });
    expect(v.gates[6]!.severity).toBe("info");
    expect(v.gates[6]!.passed).toBe(false);
    expect(v.passed).toBe(true);                     // info ≠ hard_block
    expect(v.advisories.length).toBe(1);
  });

  it("sub_spindle WITH purge plan → pass", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      workholding_type: "sub_spindle",
      has_subspindle_purge: true,
    });
    expect(v.gates[6]!.passed).toBe(true);
  });
});

describe("LathePartoffSafetyRailEngine — _validate input guards", () => {
  it("throws on zero parting width", () => {
    expect(() => lathePartoffSafetyRailEngine.evaluate({ ...safeOp(), parting_width_mm: 0 }))
      .toThrow(/parting_width_mm must be a positive finite number/);
  });

  it("throws on negative spindle RPM", () => {
    expect(() => lathePartoffSafetyRailEngine.evaluate({ ...safeOp(), spindle_rpm: -1 }))
      .toThrow(/spindle_rpm must be a positive finite number/);
  });

  it("throws on NaN feed", () => {
    expect(() => lathePartoffSafetyRailEngine.evaluate({ ...safeOp(), feed_mm_per_rev: NaN }))
      .toThrow(/feed_mm_per_rev must be a positive finite number/);
  });

  it("throws on Infinity tool overhang", () => {
    expect(() => lathePartoffSafetyRailEngine.evaluate({ ...safeOp(), tool_overhang_mm: Infinity }))
      .toThrow(/tool_overhang_mm must be a positive finite number/);
  });
});

describe("LathePartoffSafetyRailEngine — multi-gate failure summary counts", () => {
  it("counts every distinct hard_block name in the BLOCKED summary", () => {
    const v = lathePartoffSafetyRailEngine.evaluate({
      ...safeOp(),
      tool_overhang_mm: 15,       // hard_block #1: tool_overhang_ratio
      feed_mm_per_rev: 0.3,       // hard_block #2: feed_per_rev
      chip_clearance_mm: 1,       // hard_block #3: chip_clearance
    });
    expect(v.passed).toBe(false);
    expect(v.summary.startsWith("BLOCKED by 3 hard gate(s):")).toBe(true);
    expect(v.summary).toContain("tool_overhang_ratio");
    expect(v.summary).toContain("feed_per_rev");
    expect(v.summary).toContain("chip_clearance");
  });
});
