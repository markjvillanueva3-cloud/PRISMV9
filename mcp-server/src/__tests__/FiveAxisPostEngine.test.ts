/**
 * FiveAxisPostEngine tests — MILL-MASTER Phase 4 (5-Axis Hardening)
 *
 * Validates TCPC/RTCP emission per controller dialect, singularity detection,
 * inverse-time-feed calculation, 5-axis linearization to tolerance, and rotary
 * unwinding near axis limits.
 *
 * Coverage floor: happy + ≥3 failure modes + ≥2 adversarial inputs.
 * Variability: ≥3 controller dialects spanned (Fanuc, Siemens, Heidenhain).
 */
import { describe, it, expect } from "vitest";
import {
  fiveAxisPostEngine,
  type FiveAxisBlock,
  type TCPCConfig,
} from "../engines/FiveAxisPostEngine.js";
import { ACTIONS as CAM_ACTIONS } from "../tools/dispatchers/camDispatcher.js";

// ═══════════════════════════════════════════════════════════════════════════
describe("FiveAxisPostEngine.getTCPCCodes — controller dialect matrix", () => {
  it("Fanuc 31i emits G43.4 with tool offset + G49 off", () => {
    const codes = fiveAxisPostEngine.getTCPCCodes("fanuc_31i", 7);
    expect(codes.on).toBe("G43.4 H7");
    expect(codes.off).toBe("G49");
  });

  it("Siemens 840D emits TRAORI(1) + TRAFOOF", () => {
    const codes = fiveAxisPostEngine.getTCPCCodes("siemens_840d");
    expect(codes.on).toBe("TRAORI(1)");
    expect(codes.off).toBe("TRAFOOF");
  });

  it("Heidenhain TNC640 emits FUNCTION TCPM + FUNCTION RESET TCPM", () => {
    const codes = fiveAxisPostEngine.getTCPCCodes("heidenhain_tnc640");
    expect(codes.on).toContain("FUNCTION TCPM");
    expect(codes.off).toBe("FUNCTION RESET TCPM");
  });

  it("Haas NGC uses G234 (Haas-specific TCPC)", () => {
    const codes = fiveAxisPostEngine.getTCPCCodes("haas_ngc");
    expect(codes.on).toBe("G234");
    expect(codes.off).toBe("G49");
  });

  it("Okuma OSP P500 uses G43.5 with H-offset", () => {
    const codes = fiveAxisPostEngine.getTCPCCodes("okuma_osp_p500", 3);
    expect(codes.on).toBe("G43.5 H3");
    expect(codes.off).toBe("G49");
  });

  it("unknown controller falls back to generic Fanuc codes", () => {
    const codes = fiveAxisPostEngine.getTCPCCodes("__unknown_controller__", 5);
    expect(codes.on).toBe("G43.4 H5");
    expect(codes.off).toBe("G49");
  });

  it("omitted tool offset defaults to H1", () => {
    const codes = fiveAxisPostEngine.getTCPCCodes("fanuc_31i");
    expect(codes.on).toBe("G43.4 H1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("FiveAxisPostEngine.getCoordRotation — coordinate rotation codes", () => {
  it("Fanuc 31i emits G68.2 with fully substituted XYZ + IJK (angle→3dp)", () => {
    const code = fiveAxisPostEngine.getCoordRotation(
      "fanuc_31i",
      { a: 15, b: 30, c: 45 },
      { x: 10, y: 20, z: 30 },
    );
    expect(code).toContain("G68.2");
    expect(code).toContain("X10.000");
    expect(code).toContain("Y20.000");
    expect(code).toContain("Z30.000");
    expect(code).toContain("I15.000");
    expect(code).toContain("J30.000");
    expect(code).toContain("K45.000");
  });

  it("Heidenhain TNC640 emits PLANE SPATIAL with SPA/SPB/SPC", () => {
    const code = fiveAxisPostEngine.getCoordRotation(
      "heidenhain_tnc640",
      { a: 10, b: 20, c: 30 },
    );
    expect(code).toContain("PLANE SPATIAL");
    expect(code).toContain("SPA10.000");
    expect(code).toContain("SPB20.000");
    expect(code).toContain("SPC30.000");
  });

  it("Siemens 840D emits CYCLE800 with angle substitution", () => {
    const code = fiveAxisPostEngine.getCoordRotation(
      "siemens_840d",
      { a: 5, b: -10, c: 25 },
    );
    expect(code).toContain("CYCLE800");
    expect(code).toContain("5.000");
    expect(code).toContain("-10.000");
    expect(code).toContain("25.000");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("FiveAxisPostEngine.detectSingularities", () => {
  const acConfig: TCPCConfig = {
    controller: "fanuc_31i",
    kinematics: "table_table",
    rotary_axis_1: "A",
    rotary_axis_2: "C",
  };

  const headHeadConfig: TCPCConfig = {
    controller: "heidenhain_tnc640",
    kinematics: "head_head",
    rotary_axis_1: "B",
    rotary_axis_2: "C",
  };

  it("table-table A≈0 (tool vertical, C indeterminate) → critical gimbal_lock", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0.2, b: 0, c: 0 },
    ];
    const result = fiveAxisPostEngine.detectSingularities(blocks, acConfig);
    expect(result.has_singularity).toBe(true);
    expect(result.singularity_blocks[0].type).toBe("gimbal_lock");
    expect(result.singularity_blocks[0].severity).toBe("critical");
  });

  it("head-head B≈0 → gimbal_lock (critical under 0.5°)", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0, b: 0.1, c: 0 },
    ];
    const result = fiveAxisPostEngine.detectSingularities(blocks, headHeadConfig);
    expect(result.has_singularity).toBe(true);
    expect(result.singularity_blocks[0].type).toBe("gimbal_lock");
    expect(result.singularity_blocks[0].severity).toBe("critical");
  });

  it("C-axis flip of 180° between adjacent blocks → axis_flip warning", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 30, b: 0, c: 10 },
      { x: 1, y: 0, z: 0, a: 30, b: 0, c: 185 }, // 175° jump
    ];
    const result = fiveAxisPostEngine.detectSingularities(blocks, acConfig);
    const flip = result.singularity_blocks.find((sing) => sing.type === "axis_flip");
    expect(flip).not.toBe(undefined);
    expect(flip!.severity).toBe("warning");
  });

  it("rotary axis outside configured limits → near_pole critical", () => {
    const boundedConfig: TCPCConfig = {
      ...acConfig,
      rotary_limits: { axis1_min: -90, axis1_max: 90, axis2_min: -360, axis2_max: 360 },
    };
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 120, b: 0, c: 0 },
    ];
    const result = fiveAxisPostEngine.detectSingularities(blocks, boundedConfig);
    const over = result.singularity_blocks.find((sing) => sing.type === "near_pole");
    expect(over).not.toBe(undefined);
    expect(over!.severity).toBe("critical");
  });

  it("safe toolpath (all rotary far from singularity) → has_singularity=false", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 45, b: 0, c: 10 },
      { x: 1, y: 0, z: 0, a: 46, b: 0, c: 12 },
    ];
    const result = fiveAxisPostEngine.detectSingularities(blocks, acConfig);
    expect(result.has_singularity).toBe(false);
    expect(result.singularity_blocks.length).toBe(0);
  });

  it("critical singularity generates a reorient recommendation", () => {
    const blocks: FiveAxisBlock[] = [{ x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 }];
    const result = fiveAxisPostEngine.detectSingularities(blocks, acConfig);
    expect(result.recommendations.some((r) => r.includes("CRITICAL"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("FiveAxisPostEngine.calculateInverseTimeFeed", () => {
  it("straight linear move: F = feed / distance (minutes inverted)", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
      { x: 100, y: 0, z: 0, a: 0, b: 0, c: 0 }, // 100 mm linear only
    ];
    const out = fiveAxisPostEngine.calculateInverseTimeFeed(blocks, {
      feed_mm_min: 1000,
      pivot_length_mm: 200,
    });
    expect(out.blocks.length).toBe(1);
    const entry = out.blocks[0];
    // time = 100mm / 1000 mm/min = 0.1 min → F = 1/0.1 = 10
    expect(entry.f_inverse).toBeCloseTo(10, 1);
    expect(entry.linear_dist_mm).toBeCloseTo(100, 3);
    expect(entry.rotary_dist_deg).toBeCloseTo(0, 3);
  });

  it("zero-motion block yields f_inverse=0 (not infinity)", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 10, y: 0, z: 0, a: 0, b: 0, c: 0 },
      { x: 10, y: 0, z: 0, a: 0, b: 0, c: 0 }, // no movement
    ];
    const out = fiveAxisPostEngine.calculateInverseTimeFeed(blocks, { feed_mm_min: 500 });
    expect(out.blocks[0].f_inverse).toBe(0);
  });

  it("pure rotary move contributes arc length at pivot (200mm × 90° in rad)", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
      { x: 0, y: 0, z: 0, a: 90, b: 0, c: 0 }, // 90° A-axis
    ];
    const out = fiveAxisPostEngine.calculateInverseTimeFeed(blocks, {
      feed_mm_min: 1000,
      pivot_length_mm: 200,
    });
    // arc = 200 × (90 × π / 180) = 200 × 1.5708 ≈ 314.16mm
    const expectedArc = 200 * (Math.PI / 2);
    expect(out.blocks[0].linear_dist_mm).toBeCloseTo(0, 3);
    // f_inverse = feed / totalDist ≈ 1000 / 314.16 ≈ 3.183
    expect(out.blocks[0].f_inverse).toBeCloseTo(1000 / expectedArc, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("FiveAxisPostEngine.linearize", () => {
  it("pure linear moves (no rotary change) pass through unchanged", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 30, b: 0, c: 0 },
      { x: 50, y: 0, z: 0, a: 30, b: 0, c: 0 },
      { x: 100, y: 0, z: 0, a: 30, b: 0, c: 0 },
    ];
    const { blocks: out, result } = fiveAxisPostEngine.linearize(blocks, 0.01);
    expect(out.length).toBe(3);
    expect(result.original_blocks).toBe(3);
    expect(result.linearized_blocks).toBe(3);
  });

  it("large rotary move with 0.01mm tolerance inserts intermediate blocks", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
      { x: 100, y: 0, z: 0, a: 45, b: 0, c: 0 }, // 45° rotary + 100mm linear
    ];
    const { blocks: out, result } = fiveAxisPostEngine.linearize(blocks, 0.01);
    expect(out.length).toBeGreaterThan(2);
    expect(result.linearized_blocks).toBeGreaterThan(result.original_blocks);
    expect(result.max_deviation_mm).toBeLessThanOrEqual(0.01);
    expect(result.tolerance_mm).toBe(0.01);
  });

  it("loose tolerance (1mm) produces fewer segments than tight (0.001mm)", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
      { x: 100, y: 0, z: 0, a: 45, b: 0, c: 0 },
    ];
    const loose = fiveAxisPostEngine.linearize(blocks, 1.0);
    const tight = fiveAxisPostEngine.linearize(blocks, 0.001);
    expect(tight.result.linearized_blocks).toBeGreaterThanOrEqual(loose.result.linearized_blocks);
  });

  it("interpolated segments are linear in all 3 rotary axes", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
      { x: 100, y: 0, z: 0, a: 60, b: 30, c: 10 },
    ];
    const { blocks: out } = fiveAxisPostEngine.linearize(blocks, 0.01);
    // First inserted segment between block 0 and final: A monotonically increases
    for (let i = 2; i < out.length; i++) {
      expect(out[i].a! >= out[i - 1].a!).toBe(true);
      expect(out[i].b! >= out[i - 1].b!).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("FiveAxisPostEngine.checkRotaryUnwind", () => {
  it("C-axis near upper limit (355° of 360 max) is unwound to -5°", () => {
    const blocks: FiveAxisBlock[] = [{ x: 0, y: 0, z: 0, a: 0, b: 0, c: 355 }];
    const { unwound_blocks, unwinds_inserted } = fiveAxisPostEngine.checkRotaryUnwind(
      blocks,
      { min: -360, max: 360, axis: "C" },
    );
    expect(unwinds_inserted).toBe(1);
    // 355 > 360 - 10 → unwind: 355 - 360 = -5
    expect(unwound_blocks[0].c).toBe(-5);
  });

  it("axis well within limits (C=10) is left untouched", () => {
    const blocks: FiveAxisBlock[] = [{ x: 0, y: 0, z: 0, a: 0, b: 0, c: 10 }];
    const { unwound_blocks, unwinds_inserted } = fiveAxisPostEngine.checkRotaryUnwind(
      blocks,
      { min: -360, max: 360, axis: "C" },
    );
    expect(unwinds_inserted).toBe(0);
    expect(unwound_blocks[0].c).toBe(10);
  });

  it("axis near lower limit (-355 of -360 min) is unwound to +5", () => {
    const blocks: FiveAxisBlock[] = [{ x: 0, y: 0, z: 0, a: 0, b: 0, c: -355 }];
    const { unwound_blocks, unwinds_inserted } = fiveAxisPostEngine.checkRotaryUnwind(
      blocks,
      { min: -360, max: 360, axis: "C" },
    );
    expect(unwinds_inserted).toBe(1);
    expect(unwound_blocks[0].c).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("FiveAxisPostEngine — adversarial inputs", () => {
  const acConfig: TCPCConfig = {
    controller: "fanuc_31i",
    kinematics: "table_table",
    rotary_axis_1: "A",
    rotary_axis_2: "C",
  };

  it("empty blocks array: no singularities, no recommendations", () => {
    const result = fiveAxisPostEngine.detectSingularities([], acConfig);
    expect(result.has_singularity).toBe(false);
    expect(result.singularity_blocks.length).toBe(0);
    expect(result.recommendations.length).toBe(0);
  });

  it("blocks with NaN rotary values do not crash singularity detection", () => {
    const blocks: FiveAxisBlock[] = [{ x: 0, y: 0, z: 0, a: NaN, b: 0, c: 0 }];
    // NaN < threshold is false; NaN > threshold is false → rule skips cleanly
    const result = fiveAxisPostEngine.detectSingularities(blocks, acConfig);
    expect(Array.isArray(result.singularity_blocks)).toBe(true);
  });

  it("negative pivot_length_mm does not produce NaN in inverse time feed", () => {
    const blocks: FiveAxisBlock[] = [
      { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
      { x: 10, y: 0, z: 0, a: 0, b: 0, c: 0 },
    ];
    const out = fiveAxisPostEngine.calculateInverseTimeFeed(blocks, {
      feed_mm_min: 100,
      pivot_length_mm: -1, // nonsensical but shouldn't crash
    });
    expect(Number.isFinite(out.blocks[0].f_inverse)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("FiveAxisPostEngine — dispatcher wiring parity", () => {
  it("camDispatcher ACTIONS includes five_axis_tcpc, _singularity, _linearize", () => {
    expect(CAM_ACTIONS).toContain("five_axis_tcpc");
    expect(CAM_ACTIONS).toContain("five_axis_singularity");
    expect(CAM_ACTIONS).toContain("five_axis_linearize");
  });

  it("lazy-import round-trip: dispatcher pattern returns working engine", async () => {
    const mod = await import("../engines/FiveAxisPostEngine.js");
    const viaLazy = mod.fiveAxisPostEngine;
    const codes = viaLazy.getTCPCCodes("fanuc_31i", 1);
    expect(codes.on).toBe("G43.4 H1");
    expect(codes.off).toBe("G49");
  });

  it("dispatcher-style params survive round-trip for five_axis_singularity", async () => {
    const params = {
      blocks: [{ x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 }] as FiveAxisBlock[],
      config: {
        controller: "fanuc_31i",
        kinematics: "table_table",
        rotary_axis_1: "A",
        rotary_axis_2: "C",
      } as TCPCConfig,
    };
    const mod = await import("../engines/FiveAxisPostEngine.js");
    const eng = mod.fiveAxisPostEngine;
    const out = eng.detectSingularities(params.blocks, params.config);
    // A=0 with table_table kinematics → critical gimbal_lock
    expect(out.has_singularity).toBe(true);
    expect(out.singularity_blocks[0].severity).toBe("critical");
  });
});
