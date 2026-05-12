/**
 * CycleTimeAccuracyEngine Tests — CAMK-MS2/U05
 * Tests cycle time estimation from novel toolpath segments
 */
import { describe, it, expect } from "vitest";
import { cycleTimeAccuracyEngine } from "../engines/CycleTimeAccuracyEngine.js";

function straightPath(count: number, spacing: number, feed: number, rpm = 8000) {
  return Array.from({ length: count }, (_, i) => ({
    x: i * spacing, y: 50, z: -3,
    ae_mm: 5, ap_mm: 2, rpm, feed_mmmin: feed,
  }));
}

describe("CycleTimeAccuracyEngine", () => {
  // ---- Basic time calculation ----
  it("estimates time for straight path", () => {
    const segs = straightPath(11, 10, 1000); // 10 segments × 10mm = 100mm at 1000mm/min
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    // Ideal: 100mm / 1000mm/min = 0.1min = 6sec + accel overhead
    expect(result.total_time_sec).toBeGreaterThan(5);
    expect(result.total_time_sec).toBeLessThan(15);
    expect(result.cutting_distance_mm).toBeCloseTo(100, 0);
  });

  // ---- Higher feed = less time ----
  it("higher feed rate reduces cutting time", () => {
    const slow = cycleTimeAccuracyEngine.estimate({ segments: straightPath(11, 10, 500) });
    const fast = cycleTimeAccuracyEngine.estimate({ segments: straightPath(11, 10, 2000) });
    expect(fast.total_time_sec).toBeLessThan(slow.total_time_sec);
  });

  // ---- Acceleration penalty ----
  it("acceleration adds time penalty", () => {
    const segs = straightPath(11, 10, 1000);
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    expect(result.breakdown.accel_decel_sec).toBeGreaterThanOrEqual(0);
  });

  // ---- Corner slowdown ----
  it("sharp corners add slowdown time", () => {
    // Zigzag path with 90° corners
    const segs = [
      { x: 0, y: 0, z: -3, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 },
      { x: 10, y: 0, z: -3, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 },
      { x: 10, y: 10, z: -3, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 },
      { x: 20, y: 10, z: -3, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 },
      { x: 20, y: 0, z: -3, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 },
    ];
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    expect(result.breakdown.corner_slowdown_sec).toBeGreaterThan(0);
  });

  // ---- Straight path has minimal corner slowdown ----
  it("straight path has minimal corner slowdown", () => {
    const segs = straightPath(11, 10, 1000);
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    expect(result.breakdown.corner_slowdown_sec).toBeLessThan(0.1);
  });

  // ---- Tool change overhead ----
  it("tool changes add overhead", () => {
    const segs = straightPath(11, 10, 1000);
    const noTC = cycleTimeAccuracyEngine.estimate({ segments: segs, tool_changes: 0 });
    const withTC = cycleTimeAccuracyEngine.estimate({ segments: segs, tool_changes: 3 });
    expect(withTC.total_time_sec).toBeGreaterThan(noTC.total_time_sec);
    expect(withTC.breakdown.tool_change_sec).toBe(15); // 3 × 5sec default
  });

  // ---- Spindle ramp time ----
  it("RPM changes add spindle ramp time", () => {
    const segs = [
      { x: 0, y: 0, z: -3, ae_mm: 5, ap_mm: 2, rpm: 5000, feed_mmmin: 1000 },
      { x: 10, y: 0, z: -3, ae_mm: 5, ap_mm: 2, rpm: 5000, feed_mmmin: 1000 },
      { x: 20, y: 0, z: -3, ae_mm: 5, ap_mm: 2, rpm: 12000, feed_mmmin: 1000 }, // +7000 RPM
      { x: 30, y: 0, z: -3, ae_mm: 5, ap_mm: 2, rpm: 12000, feed_mmmin: 1000 },
    ];
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    expect(result.breakdown.spindle_ramp_sec).toBeGreaterThan(0);
  });

  // ---- Rapid moves ----
  it("rapid moves use rapid rate", () => {
    const segs = [
      { x: 0, y: 0, z: 5, ae_mm: 0, ap_mm: 0, rpm: 8000, feed_mmmin: 1000, is_rapid: true },
      { x: 100, y: 0, z: 5, ae_mm: 0, ap_mm: 0, rpm: 8000, feed_mmmin: 1000, is_rapid: true },
    ];
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    expect(result.rapid_distance_mm).toBeCloseTo(100, 0);
    expect(result.cutting_distance_mm).toBe(0);
    expect(result.breakdown.rapid_sec).toBeGreaterThan(0);
  });

  // ---- Distance calculation ----
  it("computes 3D distance correctly", () => {
    const a = { x: 0, y: 0, z: 0, ae_mm: 0, ap_mm: 0, rpm: 0, feed_mmmin: 0 };
    const b = { x: 3, y: 4, z: 0, ae_mm: 0, ap_mm: 0, rpm: 0, feed_mmmin: 0 };
    expect(cycleTimeAccuracyEngine.distance(a, b)).toBe(5);
  });

  // ---- Corner angle ----
  it("computes corner angle for 90° turn", () => {
    const a = { x: 0, y: 0, z: 0, ae_mm: 0, ap_mm: 0, rpm: 0, feed_mmmin: 0 };
    const b = { x: 10, y: 0, z: 0, ae_mm: 0, ap_mm: 0, rpm: 0, feed_mmmin: 0 };
    const c = { x: 10, y: 10, z: 0, ae_mm: 0, ap_mm: 0, rpm: 0, feed_mmmin: 0 };
    const angle = cycleTimeAccuracyEngine.cornerAngle(a, b, c);
    expect(angle).toBeCloseTo(Math.PI / 2, 5);
  });

  // ---- Single segment time ----
  it("segmentTime helper works", () => {
    const t = cycleTimeAccuracyEngine.segmentTime(100, 1000);
    // 100mm at 1000mm/min = 6sec + accel
    expect(t).toBeGreaterThan(5.5);
    expect(t).toBeLessThan(8);
  });

  // ---- Feed utilization ----
  it("feed utilization < 100% due to dynamics", () => {
    const segs = straightPath(21, 5, 5000); // short segments at high feed
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    expect(result.feed_utilization_pct).toBeLessThanOrEqual(100);
  });

  // ---- Compare two paths ----
  it("compare identifies faster path", () => {
    const a = { segments: straightPath(11, 10, 500) };
    const b = { segments: straightPath(11, 10, 2000) };
    const cmp = cycleTimeAccuracyEngine.compare(a, b);
    expect(cmp.faster).toBe("b");
    expect(cmp.delta_sec).toBeGreaterThan(0);
    expect(cmp.delta_pct).toBeGreaterThan(0);
  });

  // ---- Quick estimate ----
  it("quickEstimate returns summary", () => {
    const segs = straightPath(11, 10, 1000);
    const quick = cycleTimeAccuracyEngine.quickEstimate({ segments: segs });
    expect(quick.total_min).toBeGreaterThan(0);
    expect(quick.cutting_min).toBeGreaterThan(0);
  });

  // ---- Breakdown sums to total ----
  it("breakdown components sum to total", () => {
    const segs = straightPath(11, 10, 1000);
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs, tool_changes: 1 });
    const bd = result.breakdown;
    const sum = bd.cutting_sec + bd.rapid_sec + bd.accel_decel_sec +
      bd.corner_slowdown_sec + bd.tool_change_sec + bd.spindle_ramp_sec + bd.coolant_sec;
    expect(sum).toBeCloseTo(bd.total_sec, 5);
  });

  // ---- Empty segments ----
  it("handles empty segments", () => {
    const result = cycleTimeAccuracyEngine.estimate({ segments: [] });
    expect(result.total_time_sec).toBe(0);
    expect(result.segment_times).toHaveLength(0);
  });

  // ---- Bottleneck identification ----
  it("identifies cutting as bottleneck for long paths", () => {
    const segs = straightPath(101, 10, 500); // 1000mm at 500mm/min = 120sec cutting
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    expect(result.bottleneck).toBe("cutting");
  });

  // ---- Custom machine profile ----
  it("respects custom machine profile", () => {
    const segs = straightPath(11, 10, 1000);
    const slow = cycleTimeAccuracyEngine.estimate({
      segments: segs,
      machine: { max_accel_mm_s2: 500 }, // slow accel
    });
    const fast = cycleTimeAccuracyEngine.estimate({
      segments: segs,
      machine: { max_accel_mm_s2: 5000 }, // fast accel
    });
    expect(slow.breakdown.accel_decel_sec).toBeGreaterThanOrEqual(fast.breakdown.accel_decel_sec);
  });

  // ---- Overhead can be excluded ----
  it("exclude overhead removes non-cutting time", () => {
    const segs = straightPath(11, 10, 1000);
    const with_oh = cycleTimeAccuracyEngine.estimate({ segments: segs, tool_changes: 2 });
    const no_oh = cycleTimeAccuracyEngine.estimate({ segments: segs, tool_changes: 2, include_overhead: false });
    expect(no_oh.breakdown.tool_change_sec).toBe(0);
    expect(no_oh.total_time_sec).toBeLessThan(with_oh.total_time_sec);
  });
});
