/**
 * MotionCompensationEngine Tests — CPL-MS1 P1-U01/U02/U10
 * Tests servo lag compensation, rotary axis limits, controller compatibility, and stage filtering.
 */
import { describe, it, expect } from "vitest";
import {
  motionCompensationEngine,
  type MotionBlock,
  type MachineMotionParams,
  type StageConfig,
} from "../engines/MotionCompensationEngine.js";

/** Helper: create a linear block */
function linBlock(
  index: number, x: number, y: number, z: number, feed: number,
  opts?: { a?: number; b?: number; c?: number },
): MotionBlock {
  return { index, x, y, z, feed_mmmin: feed, type: "linear", ...opts };
}

/** Helper: create a rapid block */
function rapidBlock(index: number, x: number, y: number, z: number): MotionBlock {
  return { index, x, y, z, feed_mmmin: 0, type: "rapid" };
}

describe("MotionCompensationEngine", () => {

  // ═══════════════════════════════════════════════════════════════════════
  // 1. SERVO LAG COMPENSATION
  // ═══════════════════════════════════════════════════════════════════════

  it("applies servo lag coordinate offsets proportional to feed rate", () => {
    // Two blocks moving along X at different feed rates
    const blocks: MotionBlock[] = [
      linBlock(0, 0, 0, 0, 6000),   // origin, 6000 mm/min = 100 mm/s
      linBlock(1, 100, 0, 0, 6000), // move +100 X at 6000 mm/min
      linBlock(2, 200, 0, 0, 3000), // move +100 X at 3000 mm/min (half feed)
    ];
    const Kv = 200; // 1/s
    const res = motionCompensationEngine.servoLagCompensation(blocks, {
      servo: { Kv_per_s: Kv },
    });

    // Block 1: v=100mm/s, delta = 100/200 = 0.5mm = 500µm, offset along +X
    expect(res.blocks[1].x).toBeCloseTo(100.5, 3);
    expect(res.blocks[1].y).toBeCloseTo(0, 5);

    // Block 2: v=50mm/s, delta = 50/200 = 0.25mm = 250µm
    expect(res.blocks[2].x).toBeCloseTo(200.25, 3);

    // Max compensation should be ~500µm
    expect(res.max_compensation_um).toBeCloseTo(500, 0);
    expect(res.blocks_compensated).toBe(2);
  });

  it("skips rapids and zero-length blocks", () => {
    const blocks: MotionBlock[] = [
      rapidBlock(0, 0, 0, 0),
      rapidBlock(1, 50, 0, 0),
      linBlock(2, 50, 0, 0, 1000), // zero-length
      linBlock(3, 100, 0, 0, 1000),
    ];
    const res = motionCompensationEngine.servoLagCompensation(blocks);
    // Rapids + zero-length = 3 skipped, 1 compensated
    expect(res.blocks_skipped).toBe(3);
    expect(res.blocks_compensated).toBe(1);
    expect(res.blocks).toHaveLength(4);
  });

  it("handles empty input gracefully", () => {
    const res = motionCompensationEngine.servoLagCompensation([]);
    expect(res.blocks).toEqual([]);
    expect(res.max_compensation_um).toBe(0);
    expect(res.blocks_compensated).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. ROTARY AXIS LIMITS
  // ═══════════════════════════════════════════════════════════════════════

  it("clamps feed for fast rotary moves exceeding velocity limits", () => {
    // Block 0 is first so prevBlock is null -> no rotary check
    // Block 1: 45 deg A change over a short linear move at high feed
    const blocks: MotionBlock[] = [
      linBlock(0, 0, 0, 0, 5000, { a: 0 }),
      linBlock(1, 10, 0, 0, 5000, { a: 45 }),
    ];
    const params: MachineMotionParams = {
      rotary: { max_vel_deg_s: 10, max_accel_deg_s2: 50 },
    };
    const res = motionCompensationEngine.rotaryAxisLimits(blocks, params);

    // 45 deg at max 10 deg/s requires 4.5s minimum
    // Linear: 10mm at 5000mm/min = 0.12s -- rotary is bottleneck
    expect(res.feeds_limited).toBeGreaterThanOrEqual(1);
    // Feed must be reduced: 10mm / 4.5s * 60 ≈ 133 mm/min
    expect(res.blocks[1].feed_mmmin).toBeLessThan(5000);
    expect(res.g93_blocks_generated).toBeGreaterThanOrEqual(1);
  });

  it("does not limit feed when rotary can keep up", () => {
    // Very slow linear feed, tiny angular move
    const blocks: MotionBlock[] = [
      linBlock(0, 0, 0, 0, 100, { a: 0 }),
      linBlock(1, 100, 0, 0, 100, { a: 1 }),
    ];
    const params: MachineMotionParams = {
      rotary: { max_vel_deg_s: 60, max_accel_deg_s2: 200 },
    };
    const res = motionCompensationEngine.rotaryAxisLimits(blocks, params);
    // Linear: 100mm at 100mm/min = 60s, rotary: 1 deg at 60 deg/s = 0.017s
    // Rotary easily keeps up, no limiting
    expect(res.feeds_limited).toBe(0);
    // Feed should remain original
    expect(res.blocks[1].feed_mmmin).toBe(100);
  });

  it("generates G93 inverse-time feed for all rotary blocks", () => {
    const blocks: MotionBlock[] = [
      linBlock(0, 0, 0, 0, 2000, { a: 0, b: 0 }),
      linBlock(1, 50, 0, 0, 2000, { a: 10, b: 5 }),
      linBlock(2, 100, 0, 0, 2000, { a: 20, b: 10 }),
    ];
    const res = motionCompensationEngine.rotaryAxisLimits(blocks);
    // Blocks 1 and 2 should have G93 codes
    expect(res.g93_blocks_generated).toBe(2);
    expect(res.blocks[1].gcode).toMatch(/G93\s+F/);
    expect(res.blocks[2].gcode).toMatch(/G93\s+F/);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. CONTROLLER COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════════════

  it("reports full compatibility for features a controller supports", () => {
    // fanuc_30i supports nurbs, tcp, high_speed_mode, macro_b, look_ahead
    const res = motionCompensationEngine.checkControllerCompatibility(
      "fanuc_30i",
      ["nurbs", "tcp", "macro_b", "high_speed_mode"],
    );
    expect(res.compatible).toBe(true);
    expect(res.supported).toContain("nurbs");
    expect(res.supported).toContain("tcp");
    expect(res.unsupported).toHaveLength(0);
  });

  it("gates features the controller does not support", () => {
    // haas_ngc: no nurbs, no tcp
    const res = motionCompensationEngine.checkControllerCompatibility(
      "haas_ngc",
      ["nurbs", "tcp", "macro_b"],
    );
    expect(res.compatible).toBe(false);
    expect(res.unsupported).toContain("nurbs");
    expect(res.unsupported).toContain("tcp");
    expect(res.supported).toContain("macro_b");
    expect(res.recommendations.length).toBeGreaterThan(0);
  });

  it("returns all unsupported for unknown controller dialect", () => {
    const res = motionCompensationEngine.checkControllerCompatibility(
      "unknown_controller_xyz",
      ["nurbs", "tcp"],
    );
    expect(res.compatible).toBe(false);
    expect(res.unsupported).toEqual(["nurbs", "tcp"]);
    expect(res.recommendations[0]).toContain("Unknown controller");
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. PIPELINE STAGE FILTERING
  // ═══════════════════════════════════════════════════════════════════════

  it("disables capability-gated stages for limited controllers", () => {
    // fanuc_0i: no nurbs, no tcp, no high_speed_mode
    const stages: StageConfig = {
      hsm_injection: true,
      nurbs_conversion: true,
      tcp_mode_activation: true,
      macro_subroutine_call: true,
    };
    const res = motionCompensationEngine.filterPipelineStages(stages, "fanuc_0i");
    // hsm_injection requires high_speed_mode -> disabled on 0i
    expect(res.stages.hsm_injection).toBe(false);
    expect(res.stages.nurbs_conversion).toBe(false);
    expect(res.stages.tcp_mode_activation).toBe(false);
    // macro_b is supported on fanuc_0i
    expect(res.stages.macro_subroutine_call).toBe(true);
    expect(res.disabled).toContain("hsm_injection");
    expect(res.disabled).toContain("nurbs_conversion");
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it("keeps all stages enabled for capable controllers", () => {
    const stages: StageConfig = {
      hsm_injection: true,
      nurbs_conversion: true,
      tcp_mode_activation: true,
    };
    const res = motionCompensationEngine.filterPipelineStages(stages, "siemens_840d");
    expect(res.disabled).toHaveLength(0);
    expect(res.stages.hsm_injection).toBe(true);
    expect(res.stages.nurbs_conversion).toBe(true);
    expect(res.stages.tcp_mode_activation).toBe(true);
  });

  it("disables all gated stages for unknown controller", () => {
    const stages: StageConfig = {
      hsm_injection: true,
      nurbs_conversion: true,
      tcp_mode_activation: true,
    };
    const res = motionCompensationEngine.filterPipelineStages(stages, "totally_unknown");
    expect(res.disabled).toContain("hsm_injection");
    expect(res.disabled).toContain("nurbs_conversion");
    expect(res.disabled).toContain("tcp_mode_activation");
    expect(res.warnings[0]).toContain("Unknown controller");
  });
});
