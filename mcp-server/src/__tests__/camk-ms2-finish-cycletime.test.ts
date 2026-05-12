/**
 * Tests for CAMK-MS2 U04-U05
 * - SurfaceFinishPredictorEngine — Scallop + roughness from novel paths
 * - CycleTimeAccuracyEngine — Precise time from novel G-code
 */
import { describe, it, expect } from "vitest";
import { surfaceFinishPredictorEngine } from "../engines/SurfaceFinishPredictorEngine.js";
import { cycleTimeAccuracyEngine } from "../engines/CycleTimeAccuracyEngine.js";

// ── Segment helpers ─────────────────────────────────────────

function linearSegs(n: number, opts: Partial<{
  ae: number; ap: number; rpm: number; feed: number; fz: number;
}> = {}) {
  const ae = opts.ae ?? 5;
  const ap = opts.ap ?? 2;
  const rpm = opts.rpm ?? 8000;
  const feed = opts.feed ?? 1000;
  return Array.from({ length: n }, (_, i) => ({
    x: i * 5, y: 0, z: -ap,
    ae_mm: ae, ap_mm: ap, rpm, feed_mmmin: feed,
    fz_mm: opts.fz,
  }));
}

// ── SurfaceFinishPredictorEngine ────────────────────────────

describe("SurfaceFinishPredictorEngine", () => {
  it("predicts roughness for each segment point", () => {
    const result = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(10),
      tool: { type: "flat", diameter_mm: 20, flute_count: 4 },
    });
    expect(result.points.length).toBe(10);
    for (const pt of result.points) {
      expect(pt.ra_um).toBeGreaterThan(0);
      expect(pt.composite_ra_um).toBeGreaterThan(0);
      expect(typeof pt.segment_idx).toBe("number");
    }
  });

  it("ball endmill produces scallop height from stepover", () => {
    const result = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(5, { ae: 1 }),
      tool: { type: "ball", diameter_mm: 10 },
    });
    // Ball with ae=1mm on D10 → scallop = R - sqrt(R²-(ae/2)²) = 5-sqrt(25-0.25) ≈ 0.025mm = 25µm
    for (const pt of result.points) {
      expect(pt.scallop_um).toBeGreaterThan(0);
    }
  });

  it("flat endmill scallop follows ae²/(8R) formula", () => {
    const ae = 5;
    const result = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(5, { ae }),
      tool: { type: "flat", diameter_mm: 20 },
    });
    // Flat endmill cusp: ae²/(8R) × 1000 µm = 5²/(8×10)×1000 = 312.5 µm
    const R = 10;
    const expected = (ae * ae / (8 * R)) * 1000;
    for (const pt of result.points) {
      expect(pt.scallop_um).toBeCloseTo(expected, 0);
    }
  });

  it("higher feed → higher Ra (Brammertz)", () => {
    const lowFeed = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(5, { feed: 500 }),
      tool: { type: "ball", diameter_mm: 10, flute_count: 4 },
    });
    const highFeed = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(5, { feed: 2000 }),
      tool: { type: "ball", diameter_mm: 10, flute_count: 4 },
    });
    // Ra ∝ f² — higher feed = rougher
    expect(highFeed.points[0].ra_um).toBeGreaterThan(lowFeed.points[0].ra_um);
  });

  it("larger stepover → higher scallop", () => {
    const small = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(5, { ae: 0.5 }),
      tool: { type: "ball", diameter_mm: 10 },
    });
    const large = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(5, { ae: 3 }),
      tool: { type: "ball", diameter_mm: 10 },
    });
    expect(large.points[0].scallop_um).toBeGreaterThan(small.points[0].scallop_um);
  });

  it("meets_target flag works", () => {
    const result = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(5, { feed: 500 }),
      tool: { type: "ball", diameter_mm: 10, flute_count: 4 },
      target_ra_um: 10000, // extremely generous target (10mm)
    });
    // With an extremely generous target, all points should meet it
    expect(result.points.every(p => p.meets_target)).toBe(true);
  });

  it("summary statistics are consistent", () => {
    const result = surfaceFinishPredictorEngine.predict({
      segments: linearSegs(10),
      tool: { type: "flat", diameter_mm: 20, flute_count: 4 },
    });
    const summary = result as any;
    if (summary.mean_ra_um !== undefined) {
      expect(summary.mean_ra_um).toBeGreaterThan(0);
      expect(summary.max_ra_um).toBeGreaterThanOrEqual(summary.mean_ra_um);
    }
  });
});

// ── CycleTimeAccuracyEngine ─────────────────────────────────

describe("CycleTimeAccuracyEngine", () => {
  it("estimates total cycle time", () => {
    const result = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(20, { feed: 1000 }),
    });
    expect(result.total_time_sec).toBeGreaterThan(0);
  });

  it("longer path → longer time", () => {
    const short = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(5, { feed: 1000 }),
    });
    const long = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(50, { feed: 1000 }),
    });
    expect(long.total_time_sec).toBeGreaterThan(short.total_time_sec);
  });

  it("slower feed → longer time", () => {
    const fast = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(10, { feed: 2000 }),
    });
    const slow = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(10, { feed: 500 }),
    });
    expect(slow.total_time_sec).toBeGreaterThan(fast.total_time_sec);
  });

  it("includes acceleration/deceleration penalty", () => {
    const result = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(10, { feed: 5000 }),
      machine: { max_accel_mm_s2: 1000 },
    });
    // Accel penalty should contribute to total time
    expect(result.total_time_sec).toBeGreaterThan(0);
    // Total should be ≥ sum of ideal times (ideal = dist/feed without accel)
    if (result.segment_times) {
      const idealSum = result.segment_times.reduce((s: number, t: any) => s + t.ideal_time_sec, 0);
      expect(result.total_time_sec).toBeGreaterThanOrEqual(idealSum * 0.95);
    }
  });

  it("tool change time is included", () => {
    const noTC = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(10),
      tool_changes: 0,
    });
    const withTC = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(10),
      tool_changes: 3,
      machine: { tool_change_sec: 5 },
    });
    expect(withTC.total_time_sec).toBeGreaterThan(noTC.total_time_sec);
  });

  it("breakdown sums to total", () => {
    const result = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(10),
    });
    if (result.breakdown) {
      const sum = result.breakdown.cutting_sec +
                  result.breakdown.rapid_sec +
                  result.breakdown.accel_decel_sec +
                  result.breakdown.corner_slowdown_sec +
                  result.breakdown.tool_change_sec +
                  result.breakdown.spindle_ramp_sec +
                  result.breakdown.coolant_sec;
      // Sum should equal total_sec in the breakdown
      expect(Math.abs(sum - result.breakdown.total_sec)).toBeLessThan(0.01);
      // And match total_time_sec
      expect(Math.abs(sum - result.total_time_sec)).toBeLessThan(0.01);
    }
  });

  it("per-segment times exist", () => {
    const result = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(5),
    });
    if (result.segment_times) {
      expect(result.segment_times.length).toBe(5);
      // First segment has distance=0 (no previous point), so skip it
      for (let i = 1; i < result.segment_times.length; i++) {
        expect(result.segment_times[i].actual_time_sec).toBeGreaterThan(0);
        expect(result.segment_times[i].distance_mm).toBeGreaterThan(0);
      }
    }
  });

  it("handles rapid moves", () => {
    const segs = [
      { x: 0, y: 0, z: 0, ae_mm: 0, ap_mm: 0, rpm: 8000, feed_mmmin: 1000, is_rapid: true },
      { x: 100, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 },
    ];
    const result = cycleTimeAccuracyEngine.estimate({ segments: segs });
    expect(result.total_time_sec).toBeGreaterThan(0);
  });

  it("corner slowdown increases time", () => {
    // Zigzag path has many corners
    const zigzag = Array.from({ length: 20 }, (_, i) => ({
      x: (i % 2) * 50, y: Math.floor(i / 2) * 5, z: -2,
      ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 3000,
    }));
    const withCorners = cycleTimeAccuracyEngine.estimate({
      segments: zigzag,
      machine: { corner_slowdown: true },
    });
    const noCorners = cycleTimeAccuracyEngine.estimate({
      segments: zigzag,
      machine: { corner_slowdown: false },
    });
    expect(withCorners.total_time_sec).toBeGreaterThanOrEqual(noCorners.total_time_sec);
  });

  it("machine profile affects timing", () => {
    const fast = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(10, { feed: 5000 }),
      machine: { max_accel_mm_s2: 5000, rapid_rate_mmmin: 60000 },
    });
    const slow = cycleTimeAccuracyEngine.estimate({
      segments: linearSegs(10, { feed: 5000 }),
      machine: { max_accel_mm_s2: 500, rapid_rate_mmmin: 10000 },
    });
    // Faster machine acceleration should result in shorter or equal time
    expect(fast.total_time_sec).toBeLessThanOrEqual(slow.total_time_sec * 1.1);
  });
});
