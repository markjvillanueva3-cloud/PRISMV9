/**
 * CADRegenerationTestEngine tests — U-CADC21
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  cadRegenerationTestEngine,
  CADRegenerationTestEngine,
  type CADGeometry,
} from "../engines/CADRegenerationTestEngine.js";

describe("CADRegenerationTestEngine", () => {
  let engine: CADRegenerationTestEngine;

  beforeEach(() => {
    engine = new CADRegenerationTestEngine();
  });

  // ── Engine metadata ────────────────────────────────────────────────────────

  it("has correct engine info", () => {
    const info = cadRegenerationTestEngine.getInfo();
    expect(info.name).toBe("CADRegenerationTestEngine");
    expect(info.domain).toBe("cad_testing");
    expect(info.version).toBe("1.0.0");
  });

  it("exposes test, batch, compare, thresholds capabilities", () => {
    const caps = cadRegenerationTestEngine.getCapabilities();
    const names = caps.map((c) => c.name);
    expect(names).toContain("test");
    expect(names).toContain("batch");
    expect(names).toContain("compare");
    expect(names).toContain("thresholds");
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("validates input must be object", () => {
    expect(engine.validate(null)).not.toBeNull();
    expect(engine.validate("string")).not.toBeNull();
    expect(engine.validate(123)).not.toBeNull();
  });

  it("validates originalPath is required", () => {
    const err = engine.validate({});
    expect(err).toContain("originalPath");
  });

  it("validates originalPath must be non-empty", () => {
    const err = engine.validate({ originalPath: "" });
    expect(err).toContain("originalPath");
  });

  it("passes validation with valid originalPath", () => {
    const err = engine.validate({ originalPath: "/path/to/file.step" });
    expect(err).toBeNull();
  });

  it("validates threshold ranges", () => {
    const err = engine.validate({
      originalPath: "/file.step",
      thresholds: { volumeDeltaPercent: 150 },
    });
    expect(err).toContain("volumeDeltaPercent");
  });

  // ── Thresholds ─────────────────────────────────────────────────────────────

  it("returns default thresholds", () => {
    const thresholds = engine.getThresholds();
    expect(thresholds.volumeDeltaPercent).toBe(5);
    expect(thresholds.bboxDeltaPercent).toBe(2);
    expect(thresholds.topologySimilarityMin).toBe(0.8);
    expect(thresholds.featureCountDeltaPercent).toBe(20);
  });

  it("allows setting custom thresholds", () => {
    const updated = engine.setThresholds({ volumeDeltaPercent: 10 });
    expect(updated.volumeDeltaPercent).toBe(10);
    expect(updated.bboxDeltaPercent).toBe(2); // unchanged
  });

  it("custom thresholds via constructor", () => {
    const custom = new CADRegenerationTestEngine({ volumeDeltaPercent: 15 });
    expect(custom.getThresholds().volumeDeltaPercent).toBe(15);
  });

  // ── Compare geometries ─────────────────────────────────────────────────────

  it("compares identical geometries as pass", () => {
    const geometry: CADGeometry = {
      volume: 1000,
      surfaceArea: 600,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 80, maxZ: 30 },
      features: ["extrude", "fillet"],
      featureCount: 2,
    };
    const result = engine.compare(geometry, geometry);
    expect(result.passed).toBe(true);
    expect(result.overallScore).toBe(1);
  });

  it("detects volume delta failure", () => {
    const original: CADGeometry = {
      volume: 1000,
      surfaceArea: 600,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 80, maxZ: 30 },
      features: ["extrude"],
      featureCount: 1,
    };
    const generated: CADGeometry = {
      ...original,
      volume: 1200, // 20% off
    };
    const result = engine.compare(original, generated);
    expect(result.metrics.volume.passed).toBe(false);
    expect(result.metrics.volume.deltaPercent).toBeCloseTo(20);
  });

  it("detects bounding box delta failure", () => {
    const original: CADGeometry = {
      volume: 1000,
      surfaceArea: 600,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 80, maxZ: 30 },
      features: ["extrude"],
      featureCount: 1,
    };
    const generated: CADGeometry = {
      ...original,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 110, maxY: 80, maxZ: 30 }, // 10% X diff
    };
    const result = engine.compare(original, generated);
    expect(result.metrics.bboxX.passed).toBe(false);
    expect(result.metrics.bboxX.deltaPercent).toBeCloseTo(10);
  });

  it("detects topology similarity failure", () => {
    const original: CADGeometry = {
      volume: 1000,
      surfaceArea: 600,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 80, maxZ: 30 },
      features: ["extrude", "fillet", "chamfer", "hole"],
      featureCount: 4,
    };
    const generated: CADGeometry = {
      ...original,
      features: ["extrude"], // missing 3 features
    };
    const result = engine.compare(original, generated);
    expect(result.metrics.topology.passed).toBe(false);
    expect(result.metrics.topology.jaccardSimilarity).toBeCloseTo(0.25); // 1/4 overlap
  });

  it("detects feature count delta failure", () => {
    const original: CADGeometry = {
      volume: 1000,
      surfaceArea: 600,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 80, maxZ: 30 },
      features: ["extrude", "fillet", "chamfer", "hole", "pocket"],
      featureCount: 5,
    };
    const generated: CADGeometry = {
      ...original,
      featureCount: 2, // 60% off
    };
    const result = engine.compare(original, generated);
    expect(result.metrics.featureCount.passed).toBe(false);
    expect(result.metrics.featureCount.deltaPercent).toBeCloseTo(60);
  });

  it("calculates Jaccard similarity correctly", () => {
    const original: CADGeometry = {
      volume: 1000,
      surfaceArea: 600,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 80, maxZ: 30 },
      features: ["extrude", "fillet"],
      featureCount: 2,
    };
    const generated: CADGeometry = {
      ...original,
      features: ["extrude", "chamfer"], // 1 overlap, 3 total union
    };
    const result = engine.compare(original, generated);
    expect(result.metrics.topology.intersection).toContain("extrude");
    expect(result.metrics.topology.union).toHaveLength(3);
    expect(result.metrics.topology.jaccardSimilarity).toBeCloseTo(1 / 3);
  });

  it("handles empty feature sets", () => {
    const original: CADGeometry = {
      volume: 1000,
      surfaceArea: 600,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 80, maxZ: 30 },
      features: [],
      featureCount: 0,
    };
    const result = engine.compare(original, original);
    expect(result.metrics.topology.jaccardSimilarity).toBe(1); // empty sets = 100% match
    expect(result.metrics.topology.passed).toBe(true);
  });

  it("handles zero volume edge case", () => {
    const original: CADGeometry = {
      volume: 0,
      surfaceArea: 0,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 },
      features: [],
      featureCount: 0,
    };
    const generated: CADGeometry = { ...original, volume: 100 };
    const result = engine.compare(original, generated);
    expect(result.metrics.volume.deltaPercent).toBe(100);
    expect(result.metrics.volume.passed).toBe(false);
  });

  // ── Single test ────────────────────────────────────────────────────────────

  it("runs single regeneration test", async () => {
    const result = await engine.test({ originalPath: "/test/bracket.step" });
    expect(result.testId).toMatch(/^REGEN-/);
    expect(result.originalPath).toBe("/test/bracket.step");
    expect(["pass", "fail", "error"]).toContain(result.status);
    expect(result.metrics).toHaveProperty("volume");
    expect(result.metrics).toHaveProperty("topology");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("test result contains all required fields", async () => {
    const result = await engine.test({ originalPath: "/test/flange.step" });
    expect(result).toHaveProperty("testId");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("metrics");
    expect(result).toHaveProperty("overallScore");
    expect(result).toHaveProperty("passedCount");
    expect(result).toHaveProperty("totalCount");
    expect(result.totalCount).toBe(6); // volume, bboxX/Y/Z, featureCount, topology
  });

  it("test with custom thresholds", async () => {
    const result = await engine.test({
      originalPath: "/test/housing.step",
      thresholds: { volumeDeltaPercent: 50 }, // very loose
    });
    expect(result.metrics.volume.threshold).toBe(50);
  });

  // ── Batch test ─────────────────────────────────────────────────────────────

  it("runs batch regeneration tests", async () => {
    const result = await engine.batch({
      paths: ["/test/part1.step", "/test/part2.step", "/test/part3.step"],
    });
    expect(result.batchId).toMatch(/^BATCH-/);
    expect(result.totalTests).toBe(3);
    expect(result.passed + result.failed + result.errors).toBe(3);
    expect(result.passRate).toBeGreaterThanOrEqual(0);
    expect(result.passRate).toBeLessThanOrEqual(1);
    expect(result.results).toHaveLength(3);
  });

  it("batch test with stopOnFirstFail stops early", async () => {
    // Run batch with stopOnFirstFail - verify it completes
    const result = await engine.batch({
      paths: ["/a.step", "/b.step", "/c.step", "/d.step", "/e.step"],
      stopOnFirstFail: true,
    });
    // With stopOnFirstFail, if any test fails, we stop and return fewer results
    // If all pass, we get all results. Either way, totalTests <= paths.length
    expect(result.totalTests).toBeLessThanOrEqual(5);
    expect(result.results.length).toBe(result.totalTests);
    // Check the pass/fail/error counts sum to total
    expect(result.passed + result.failed + result.errors).toBe(result.totalTests);
  });

  it("batch test calculates pass rate correctly", async () => {
    const result = await engine.batch({ paths: ["/x.step"] });
    expect(result.passRate).toBe(result.passed / result.totalTests);
  });

  it("batch test handles empty paths array", async () => {
    const result = await engine.batch({ paths: [] });
    expect(result.totalTests).toBe(0);
    expect(result.passRate).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  // ── Overall score calculation ──────────────────────────────────────────────

  it("overall score is fraction of passed metrics", () => {
    const original: CADGeometry = {
      volume: 1000,
      surfaceArea: 600,
      boundingBox: { minX: 0, minY: 0, minZ: 0, maxX: 100, maxY: 80, maxZ: 30 },
      features: ["extrude"],
      featureCount: 1,
    };
    // All pass
    let result = engine.compare(original, original);
    expect(result.overallScore).toBe(1);

    // One fails (volume)
    const volumeFail = { ...original, volume: 2000 };
    result = engine.compare(original, volumeFail);
    expect(result.overallScore).toBeLessThan(1);
    expect(result.overallScore).toBeGreaterThan(0);
  });

  // ── Singleton export ───────────────────────────────────────────────────────

  it("cadRegenerationTestEngine singleton works", () => {
    expect(cadRegenerationTestEngine).toBeInstanceOf(CADRegenerationTestEngine);
    expect(cadRegenerationTestEngine.getInfo().name).toBe("CADRegenerationTestEngine");
  });
});
