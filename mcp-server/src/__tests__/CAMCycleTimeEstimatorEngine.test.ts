/**
 * CAMCycleTimeEstimatorEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-CYCLE-TIME
 */
import { describe, it, expect } from "vitest";
import { CAMCycleTimeEstimatorEngine } from "../engines/CAMCycleTimeEstimatorEngine.js";

const engine = new CAMCycleTimeEstimatorEngine();

describe("CAMCycleTimeEstimatorEngine", () => {

  it("classic face-mill cycle: 100 cm^3 removal, 240 mm^3/s MRR", () => {
    // MRR = depth*width*feed = 2 * 10 * 1200 = 24000 mm^3/min = 400 mm^3/s
    // removal = 100000 mm^3 → cuttingMin = 100000/24000 = 4.1667 min
    const r = engine.estimate({
      removalVolumeMm3: 100000,
      cuttingFeedMmMin: 1200,
      depthOfCutMm: 2,
      widthOfCutMm: 10,
      airDistanceMm: 0,
      toolChangeSec: 0,
    });
    expect(r.effectiveMRR).toBeCloseTo(24000, 2);
    expect(r.cuttingMin).toBeCloseTo(100000 / 24000, 4);
    expect(r.airMin).toBe(0);
    expect(r.toolChangeMin).toBe(0);
    expect(r.totalMin).toBeCloseTo(100000 / 24000, 4);
  });

  it("air-time = airDistance / rapidFeed", () => {
    const r = engine.estimate({
      removalVolumeMm3: 0,
      cuttingFeedMmMin: 1000,
      depthOfCutMm: 1,
      widthOfCutMm: 1,
      airDistanceMm: 6000,
      rapidFeedMmMin: 30000,
      toolChangeSec: 0,
    });
    expect(r.airMin).toBeCloseTo(6000 / 30000, 4); // 0.2 min = 12 s
  });

  it("tool-change overhead = sec/60", () => {
    const r = engine.estimate({
      removalVolumeMm3: 0,
      cuttingFeedMmMin: 1000,
      depthOfCutMm: 1,
      widthOfCutMm: 1,
      airDistanceMm: 0,
      toolChangeSec: 15,
    });
    expect(r.toolChangeMin).toBeCloseTo(15 / 60, 4);
  });

  it("total = cutting + air + toolChange", () => {
    const r = engine.estimate({
      removalVolumeMm3: 24000, // 1 min worth at MRR below
      cuttingFeedMmMin: 1200,
      depthOfCutMm: 2,
      widthOfCutMm: 10,
      airDistanceMm: 3000,
      rapidFeedMmMin: 30000,
      toolChangeSec: 12,
    });
    expect(r.cuttingMin).toBeCloseTo(1, 4);
    expect(r.airMin).toBeCloseTo(0.1, 4);
    expect(r.toolChangeMin).toBeCloseTo(0.2, 4);
    expect(r.totalMin).toBeCloseTo(1.3, 4);
  });

  it("uses defaults: rapid=30000, air=100, toolChange=5", () => {
    const r = engine.estimate({
      removalVolumeMm3: 0,
      cuttingFeedMmMin: 1000,
      depthOfCutMm: 1,
      widthOfCutMm: 1,
    });
    expect(r.airMin).toBeCloseTo(100 / 30000, 4);
    expect(r.toolChangeMin).toBeCloseTo(5 / 60, 4);
  });

  it("zero removal → cuttingMin = 0 (air + toolChange only)", () => {
    const r = engine.estimate({
      removalVolumeMm3: 0,
      cuttingFeedMmMin: 1000,
      depthOfCutMm: 1,
      widthOfCutMm: 1,
      airDistanceMm: 0,
      toolChangeSec: 0,
    });
    expect(r.cuttingMin).toBe(0);
    expect(r.totalMin).toBe(0);
  });

  it("zero feed clamped to floor=1 (avoids div-by-zero)", () => {
    const r = engine.estimate({
      removalVolumeMm3: 1,
      cuttingFeedMmMin: 0,
      depthOfCutMm: 1,
      widthOfCutMm: 1,
      airDistanceMm: 0,
      toolChangeSec: 0,
    });
    expect(Number.isFinite(r.cuttingMin)).toBe(true);
    expect(r.effectiveMRR).toBe(1); // 1*1*1 (clamped feed)
  });

  it("zero depth clamped to 0.01 (avoids div-by-zero)", () => {
    const r = engine.estimate({
      removalVolumeMm3: 1,
      cuttingFeedMmMin: 1000,
      depthOfCutMm: 0,
      widthOfCutMm: 1,
      airDistanceMm: 0,
      toolChangeSec: 0,
    });
    expect(Number.isFinite(r.cuttingMin)).toBe(true);
  });

  it("negative removalVolume treated as zero", () => {
    const r = engine.estimate({
      removalVolumeMm3: -1000,
      cuttingFeedMmMin: 1000,
      depthOfCutMm: 1,
      widthOfCutMm: 1,
      airDistanceMm: 0,
      toolChangeSec: 0,
    });
    expect(r.cuttingMin).toBe(0);
  });

  it("higher MRR → shorter cutting time (monotonic)", () => {
    const slow = engine.estimate({ removalVolumeMm3: 100000, cuttingFeedMmMin: 500, depthOfCutMm: 1, widthOfCutMm: 5, airDistanceMm: 0, toolChangeSec: 0 });
    const fast = engine.estimate({ removalVolumeMm3: 100000, cuttingFeedMmMin: 2000, depthOfCutMm: 2, widthOfCutMm: 10, airDistanceMm: 0, toolChangeSec: 0 });
    expect(fast.cuttingMin).toBeLessThan(slow.cuttingMin);
    expect(fast.effectiveMRR).toBeGreaterThan(slow.effectiveMRR);
  });

  it("estimate_batch sums per-op totalMin", () => {
    const ops = [
      { op: "face",   inputs: { removalVolumeMm3: 24000, cuttingFeedMmMin: 1200, depthOfCutMm: 2, widthOfCutMm: 10, airDistanceMm: 0, toolChangeSec: 0 } },
      { op: "drill",  inputs: { removalVolumeMm3: 12000, cuttingFeedMmMin: 1200, depthOfCutMm: 2, widthOfCutMm: 10, airDistanceMm: 0, toolChangeSec: 0 } },
    ];
    const r = engine.estimate_batch(ops);
    expect(typeof r.perOp.face?.cuttingMin).toBe("number");
    expect(typeof r.perOp.drill?.cuttingMin).toBe("number");
    expect(r.totalMin).toBeCloseTo((r.perOp.face.totalMin + r.perOp.drill.totalMin), 4);
  });

  it("estimate_batch empty returns zero total", () => {
    const r = engine.estimate_batch([]);
    expect(r.totalMin).toBe(0);
    expect(Object.keys(r.perOp).length).toBe(0);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes estimate + estimate_batch", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("estimate");
    expect(names).toContain("estimate_batch");
  });
});
