/**
 * FiveAxisPostEngine.test.ts -- companion unit test (R9, U-PP-5AX-POST-TEST)
 *
 * FiveAxisPostEngine (5-axis RTCP/TCPC post) had NO companion test. It is a real,
 * deterministic emit/geometry engine (per-controller TCPC codes, tilted-plane rotation,
 * singularity detection, G93 inverse-time feed, chord-error linearization, rotary unwind),
 * so every assertion below is a hand-traced reference value or an algebraic invariant --
 * each FAILS if the dialect tables or the geometry math change (R9 intent, not behavior).
 *
 * Serves JM Die VMC-02 (Okuma M460V-5AX). No physics constants (kinematics/geometry only).
 */

import { describe, it, expect } from "vitest";
import {
  fiveAxisPostEngine,
  FiveAxisPostEngineImpl,
  type FiveAxisBlock,
  type TCPCConfig,
} from "../engines/FiveAxisPostEngine.js";

const eng = new FiveAxisPostEngineImpl();

// ---------------------------------------------------------------------------
// TCPC / RTCP activation codes -- per-controller dialect
// ---------------------------------------------------------------------------

describe("FiveAxisPostEngine -- getTCPCCodes (per-controller RTCP)", () => {
  it("Fanuc 31i uses G43.4 H<offset> on / G49 off", () => {
    const c = eng.getTCPCCodes("fanuc_31i", 5);
    expect(c.on).toBe("G43.4 H5");
    expect(c.off).toBe("G49");
  });

  it("Okuma OSP-P300 uses bare G43.4 (no H offset token in template)", () => {
    const c = eng.getTCPCCodes("okuma_osp_p300", 5);
    expect(c.on).toBe("G43.4");
    expect(c.off).toBe("G49");
  });

  it("Okuma OSP-P500 uses G43.5 H<offset> (distinct from P300)", () => {
    const c = eng.getTCPCCodes("okuma_osp_p500", 2);
    expect(c.on).toBe("G43.5 H2");
  });

  it("Haas NGC uses G234 (not G43.4)", () => {
    expect(eng.getTCPCCodes("haas_ngc").on).toBe("G234");
  });

  it("Siemens 840D uses TRAORI(1) on / TRAFOOF off", () => {
    const c = eng.getTCPCCodes("siemens_840d");
    expect(c.on).toBe("TRAORI(1)");
    expect(c.off).toBe("TRAFOOF");
  });

  it("Heidenhain TNC640 uses FUNCTION TCPM on / FUNCTION RESET TCPM off", () => {
    const c = eng.getTCPCCodes("heidenhain_tnc640");
    expect(c.on).toContain("FUNCTION TCPM");
    expect(c.off).toBe("FUNCTION RESET TCPM");
  });

  it("unknown controller falls back to generic_fanuc G43.4 H1 (default offset 1) -- adversarial", () => {
    const c = eng.getTCPCCodes("totally_unknown_controller");
    expect(c.on).toBe("G43.4 H1");
    expect(c.off).toBe("G49");
  });

  it("offset defaults to 1 when omitted on an offset-bearing template", () => {
    expect(eng.getTCPCCodes("fanuc_31i").on).toBe("G43.4 H1");
  });
});

// ---------------------------------------------------------------------------
// Coordinate rotation (tilted work plane)
// ---------------------------------------------------------------------------

describe("FiveAxisPostEngine -- getCoordRotation (tilted-plane dialect)", () => {
  it("Fanuc 31i emits G68.2 with X/Y/Z origin and I/J/K angles", () => {
    const s = eng.getCoordRotation("fanuc_31i", { a: 10, b: 20, c: 30 }, { x: 1, y: 2, z: 3 });
    expect(s).toBe("G68.2 X1.000 Y2.000 Z3.000 I10.000 J20.000 K30.000");
  });

  it("Heidenhain TNC640 emits PLANE SPATIAL SPA/SPB/SPC ... STAY", () => {
    const s = eng.getCoordRotation("heidenhain_tnc640", { a: 15, b: 0, c: 45 });
    expect(s).toBe("PLANE SPATIAL SPA15.000 SPB0.000 SPC45.000 STAY");
  });

  it("Siemens 840D emits CYCLE800 with the three rotary angles", () => {
    const s = eng.getCoordRotation("siemens_840d", { a: 10, b: 20, c: 30 });
    expect(s).toContain("CYCLE800");
    expect(s).toContain("10.000,20.000,30.000");
  });

  it("Haas NGC emits G68.2 with literal X0 Y0 Z0 origin", () => {
    const s = eng.getCoordRotation("haas_ngc", { a: 10, b: 20, c: 30 });
    expect(s).toBe("G68.2 X0 Y0 Z0 I10.000 J20.000 K30.000");
  });

  it("origin defaults to 0,0,0 when omitted", () => {
    const s = eng.getCoordRotation("fanuc_31i", { a: 5, b: 5, c: 5 });
    expect(s).toBe("G68.2 X0.000 Y0.000 Z0.000 I5.000 J5.000 K5.000");
  });

  it("unknown controller falls back to the Fanuc G68.2 form -- adversarial", () => {
    const s = eng.getCoordRotation("bogus_ctrl", { a: 1, b: 2, c: 3 });
    expect(s).toContain("G68.2");
  });
});

// ---------------------------------------------------------------------------
// Singularity detection
// ---------------------------------------------------------------------------

const headHead: TCPCConfig = { controller: "fanuc_31i", kinematics: "head_head", rotary_axis_1: "B", rotary_axis_2: "C" };
const tableTable: TCPCConfig = { controller: "fanuc_31i", kinematics: "table_table", rotary_axis_1: "A", rotary_axis_2: "C" };

describe("FiveAxisPostEngine -- detectSingularities", () => {
  it("head-head flags gimbal lock CRITICAL when |B| < 0.5", () => {
    const r = eng.detectSingularities([{ x: 0, y: 0, z: 0, b: 0 }], headHead);
    expect(r.has_singularity).toBe(true);
    expect(r.singularity_blocks[0].type).toBe("gimbal_lock");
    expect(r.singularity_blocks[0].severity).toBe("critical");
  });

  it("head-head flags gimbal lock WARNING when 0.5 <= |B| < 2.0", () => {
    const r = eng.detectSingularities([{ x: 0, y: 0, z: 0, b: 1.0 }], headHead);
    expect(r.singularity_blocks[0].severity).toBe("warning");
  });

  it("head-head: B well away from zero (B=30) is clean", () => {
    const r = eng.detectSingularities([{ x: 0, y: 0, z: 0, b: 30 }], headHead);
    expect(r.has_singularity).toBe(false);
  });

  it("table-tilt flags gimbal lock CRITICAL when |A| < 2 (tool vertical, C indeterminate)", () => {
    const r = eng.detectSingularities([{ x: 0, y: 0, z: 0, a: 0.5 }], tableTable);
    expect(r.has_singularity).toBe(true);
    expect(r.singularity_blocks[0].severity).toBe("critical");
  });

  it("flags an axis flip when 170 < deltaC < 190 between adjacent blocks", () => {
    const r = eng.detectSingularities(
      [{ x: 0, y: 0, z: 0, a: 30, c: 0 }, { x: 1, y: 0, z: 0, a: 30, c: 180 }],
      tableTable,
    );
    expect(r.singularity_blocks.some((s) => s.type === "axis_flip")).toBe(true);
    expect(r.recommendations.some((m) => m.includes("axis flip"))).toBe(true);
  });

  it("does NOT flag a C jump of 200 deg as an axis flip (outside the 170-190 window) -- adversarial boundary", () => {
    const r = eng.detectSingularities(
      [{ x: 0, y: 0, z: 0, a: 30, c: 0 }, { x: 1, y: 0, z: 0, a: 30, c: 200 }],
      tableTable,
    );
    expect(r.singularity_blocks.some((s) => s.type === "axis_flip")).toBe(false);
  });

  it("flags near_pole CRITICAL when a rotary value exceeds configured limits", () => {
    const cfg: TCPCConfig = {
      ...tableTable,
      rotary_limits: { axis1_min: -120, axis1_max: 120, axis2_min: -360, axis2_max: 360 },
    };
    const r = eng.detectSingularities([{ x: 0, y: 0, z: 0, a: 130, c: 0 }], cfg);
    expect(r.singularity_blocks.some((s) => s.type === "near_pole" && s.severity === "critical")).toBe(true);
  });

  it("emits a CRITICAL recommendation when any critical singularity is present", () => {
    const r = eng.detectSingularities([{ x: 0, y: 0, z: 0, b: 0 }], headHead);
    expect(r.recommendations.some((m) => m.includes("CRITICAL"))).toBe(true);
  });

  it("empty toolpath -> no singularity, empty result (no crash) -- adversarial", () => {
    const r = eng.detectSingularities([], headHead);
    expect(r.has_singularity).toBe(false);
    expect(r.singularity_blocks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Inverse time feed (G93)
// ---------------------------------------------------------------------------

describe("FiveAxisPostEngine -- calculateInverseTimeFeed (G93)", () => {
  it("pure 3-4-5 linear move at F1000: F_inv = 1/(50/1000) = 20.0, equiv feed 1000", () => {
    const r = eng.calculateInverseTimeFeed(
      [{ x: 0, y: 0, z: 0 }, { x: 30, y: 40, z: 0 }],
      { feed_mm_min: 1000 },
    );
    expect(r.blocks[0].linear_dist_mm).toBeCloseTo(50, 4);
    expect(r.blocks[0].f_inverse).toBeCloseTo(20.0, 4);
    expect(r.blocks[0].equivalent_feed_mm_min).toBeCloseTo(1000, 1);
    expect(r.blocks[0].rotary_dist_deg).toBeCloseTo(0, 4);
  });

  it("pure 90deg rotary at pivot 200, F1000: arc = 200*(pi/2) = 314.159 -> F_inv ~ 3.1831", () => {
    const r = eng.calculateInverseTimeFeed(
      [{ x: 0, y: 0, z: 0, a: 0 }, { x: 0, y: 0, z: 0, a: 90 }],
      { pivot_length_mm: 200, feed_mm_min: 1000 },
    );
    expect(r.blocks[0].linear_dist_mm).toBeCloseTo(0, 4);
    expect(r.blocks[0].rotary_dist_deg).toBeCloseTo(90, 4);
    expect(r.blocks[0].f_inverse).toBeCloseTo(3.1831, 3);
  });

  it("zero-distance move (identical blocks) guards F_inverse to 0 (no divide-by-zero)", () => {
    const r = eng.calculateInverseTimeFeed(
      [{ x: 1, y: 1, z: 1, a: 5 }, { x: 1, y: 1, z: 1, a: 5 }],
      { feed_mm_min: 1000 },
    );
    expect(r.blocks[0].f_inverse).toBe(0);
  });

  it("single block yields no feed records (needs adjacent pairs) -- adversarial", () => {
    const r = eng.calculateInverseTimeFeed([{ x: 0, y: 0, z: 0 }], { feed_mm_min: 1000 });
    expect(r.blocks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Linearization (chord-error)
// ---------------------------------------------------------------------------

describe("FiveAxisPostEngine -- linearize", () => {
  it("pure linear moves (no rotary change) pass through unchanged", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0 },
      { x: 10, y: 0, z: 0, a: 0 },
      { x: 20, y: 0, z: 0, a: 0 },
    ];
    const { result } = eng.linearize(blocks, 0.01);
    expect(result.linearized_blocks).toBe(3);
    expect(result.original_blocks).toBe(3);
    expect(result.max_deviation_mm).toBe(0);
  });

  it("a large rotary+linear move is split into more blocks, bounded by tolerance", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0 },
      { x: 100, y: 0, z: 0, a: 90 },
    ];
    const { blocks: out, result } = eng.linearize(blocks, 0.01);
    expect(result.linearized_blocks).toBeGreaterThan(result.original_blocks);
    expect(result.max_deviation_mm).toBeLessThanOrEqual(0.01 + 1e-9);
    // last linearized block lands exactly on the target pose (t=1)
    expect(out[out.length - 1].x).toBeCloseTo(100, 6);
    expect(out[out.length - 1].a).toBeCloseTo(90, 6);
  });

  it("segment count is capped at 100 per move even for an extreme chord error", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0 },
      { x: 1000, y: 0, z: 0, a: 179 },
    ];
    const { result } = eng.linearize(blocks, 0.0001);
    expect(result.linearized_blocks).toBeLessThanOrEqual(1 + 100);
  });
});

// ---------------------------------------------------------------------------
// Rotary unwind
// ---------------------------------------------------------------------------

describe("FiveAxisPostEngine -- checkRotaryUnwind", () => {
  it("unwinds an axis approaching its max by -360 and counts it", () => {
    const r = eng.checkRotaryUnwind(
      [{ x: 0, y: 0, z: 0, a: 0 }, { x: 0, y: 0, z: 0, a: 195 }],
      { min: -200, max: 200, axis: "A" },
    );
    expect(r.unwound_blocks[0].a).toBe(0); // centered block untouched
    expect(r.unwound_blocks[1].a).toBe(195 - 360); // -165
    expect(r.unwinds_inserted).toBe(1);
  });

  it("unwinds an axis approaching its min by +360", () => {
    const r = eng.checkRotaryUnwind(
      [{ x: 0, y: 0, z: 0, a: -195 }],
      { min: -200, max: 200, axis: "A" },
    );
    expect(r.unwound_blocks[0].a).toBe(-195 + 360); // 165
    expect(r.unwinds_inserted).toBe(1);
  });

  it("leaves a centered axis untouched (no unwind)", () => {
    const r = eng.checkRotaryUnwind(
      [{ x: 0, y: 0, z: 0, c: 0 }],
      { min: -200, max: 200, axis: "C" },
    );
    expect(r.unwound_blocks[0].c).toBe(0);
    expect(r.unwinds_inserted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Singleton wiring
// ---------------------------------------------------------------------------

describe("FiveAxisPostEngine -- singleton", () => {
  it("exported singleton behaves identically to a fresh instance", () => {
    expect(fiveAxisPostEngine.getTCPCCodes("fanuc_31i", 3).on).toBe(eng.getTCPCCodes("fanuc_31i", 3).on);
  });
});

// ---------------------------------------------------------------------------
// NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP) -- a NaN/Infinity rotary
// angle or origin must never substitute a literal "NaN"/"Infinity" into the
// tilted-work-plane block the control rejects. 5-axis arm of the bug-class sweep.
// ---------------------------------------------------------------------------
describe("FiveAxisPostEngine -- getCoordRotation non-finite guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
  it("[regression] finite angles/origin emit real values with NO sanitize warning", () => {
    const s = eng.getCoordRotation("fanuc_31i", { a: 10, b: 20, c: 30 }, { x: 1, y: 2, z: 3 });
    expect(s).toContain("10.000");
    expect(s).not.toContain("NaN");
    expect(s).not.toContain("WARNING");
  });

  it("NaN rotary angle is sanitized to 0.000 + flagged -- no literal NaN", () => {
    const s = eng.getCoordRotation("fanuc_31i", { a: NaN, b: 20, c: 30 }, { x: 1, y: 2, z: 3 });
    expect(s).not.toContain("NaN");
    expect(s).toContain("0.000");
    expect(s).toContain("WARNING: NON-FINITE");
  });

  it("Infinity origin is sanitized to 0.000 + flagged -- no literal Infinity", () => {
    const s = eng.getCoordRotation("fanuc_31i", { a: 10, b: 20, c: 30 }, { x: Infinity, y: 2, z: 3 });
    expect(s).not.toContain("Infinity");
    expect(s).toContain("WARNING: NON-FINITE");
  });

  it("[regression] omitted origin still defaults to 0 with NO warning (finite path)", () => {
    const s = eng.getCoordRotation("fanuc_31i", { a: 5, b: 0, c: 45 });
    expect(s).not.toContain("WARNING");
    expect(s).not.toContain("NaN");
  });
});
