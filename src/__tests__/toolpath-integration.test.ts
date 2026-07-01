/**
 * ToolpathIntegrationEngine Tests — CPL-MS1 P1-U08/U09/U11
 * Tests tolerance verification, adaptive smoothing, cut reordering, hole reordering,
 * learning corrections, and prediction recording.
 */
import { describe, it, expect } from "vitest";
import {
  ToolpathIntegrationEngine,
  toolpathIntegrationEngine,
  type Point3D,
  type CutSegment,
  type ToolpathBlock,
  type CorrectionFactors,
} from "../engines/ToolpathIntegrationEngine.js";

/** Helper: straight line points along X */
function straightLine(n: number, spacing = 10): Point3D[] {
  return Array.from({ length: n }, (_, i) => ({ x: i * spacing, y: 0, z: 0 }));
}

/** Helper: make a cut segment */
function cut(id: number, sx: number, sy: number, ex: number, ey: number): CutSegment {
  return { id, start: { x: sx, y: sy, z: 0 }, end: { x: ex, y: ey, z: 0 }, type: "contour" };
}

describe("ToolpathIntegrationEngine", () => {

  // ═══════════════════════════════════════════════════════════════════════
  // 1. TOLERANCE BAND VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════

  it("detects tolerance violations when smoothed points deviate", () => {
    const original = straightLine(5); // 0,10,20,30,40 along X
    // Smoothed point at index 2 deviates 0.5mm in Y
    const smoothed: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 20, y: 0.5, z: 0 }, // 0.5mm deviation
      { x: 30, y: 0, z: 0 },
      { x: 40, y: 0, z: 0 },
    ];
    const res = toolpathIntegrationEngine.verifyToleranceBand(original, smoothed, 0.01);
    expect(res.within_tolerance).toBe(false);
    expect(res.violations).toBeGreaterThanOrEqual(1);
    expect(res.violation_indices).toContain(2);
    expect(res.max_deviation_mm).toBeCloseTo(0.5, 2);
  });

  it("reports within-tolerance when all points are close", () => {
    const original = straightLine(5);
    // Smoothed points with tiny deviation (0.005mm)
    const smoothed: Point3D[] = original.map((p) => ({
      x: p.x, y: 0.005, z: 0,
    }));
    const res = toolpathIntegrationEngine.verifyToleranceBand(original, smoothed, 0.01);
    expect(res.within_tolerance).toBe(true);
    expect(res.violations).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. ADAPTIVE SMOOTHING REDUCTION
  // ═══════════════════════════════════════════════════════════════════════

  it("reduces smoothing at violation points to bring them within tolerance", () => {
    const original = straightLine(5);
    const smoothed: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 20, y: 1.0, z: 0 }, // 1mm deviation — way over 0.01 tolerance
      { x: 30, y: 0, z: 0 },
      { x: 40, y: 0, z: 0 },
    ];
    const res = toolpathIntegrationEngine.adaptiveSmoothingReduction(original, smoothed, 0.01);
    expect(res.adjustments_made).toBe(1);
    expect(res.original_violations).toBe(1);
    // The corrected point should be much closer to original than 1mm
    expect(res.max_residual_deviation_mm).toBeLessThan(1.0);
    // Corrected Y should be pulled toward 0
    expect(Math.abs(res.corrected_points[2].y)).toBeLessThan(0.5);
  });

  it("does nothing when no violations exist", () => {
    const original = straightLine(3);
    const smoothed = straightLine(3);
    const res = toolpathIntegrationEngine.adaptiveSmoothingReduction(original, smoothed, 0.1);
    expect(res.adjustments_made).toBe(0);
    expect(res.original_violations).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. CUT REORDERING
  // ═══════════════════════════════════════════════════════════════════════

  it("computes savings from nearest-neighbor reordering", () => {
    // Deliberately bad order: cuts far apart
    const cuts: CutSegment[] = [
      cut(0, 100, 100, 110, 100), // far from origin
      cut(1, 0, 0, 10, 0),       // near origin
      cut(2, 50, 50, 60, 50),    // middle
    ];
    const start: Point3D = { x: 0, y: 0, z: 0 };
    const res = toolpathIntegrationEngine.reorderCuts(cuts, start);

    expect(res.savings_pct).toBeGreaterThan(0);
    expect(res.optimized_rapid_mm).toBeLessThanOrEqual(res.original_rapid_mm);
    // First cut should be nearest to origin (id=1)
    expect(res.reordered[0].id).toBe(1);
  });

  it("uses nearest-neighbor heuristic correctly", () => {
    // Start at origin; cut A at (100,0), cut B at (5,0) — B should come first
    const cuts: CutSegment[] = [
      cut(0, 100, 0, 110, 0),
      cut(1, 5, 0, 15, 0),
    ];
    const start: Point3D = { x: 0, y: 0, z: 0 };
    const res = toolpathIntegrationEngine.reorderCuts(cuts, start);
    expect(res.reordered[0].id).toBe(1); // nearest to origin
    expect(res.reordered[1].id).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. HOLE PATTERN REORDERING
  // ═══════════════════════════════════════════════════════════════════════

  it("reorders holes for minimum traverse distance", () => {
    // Random-ish hole positions
    const holes: Point3D[] = [
      { x: 80, y: 80, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 40, y: 40, z: 0 },
    ];
    const start: Point3D = { x: 0, y: 0, z: 0 };
    const res = toolpathIntegrationEngine.reorderHolePattern(holes, start);
    expect(res.savings_pct).toBeGreaterThanOrEqual(0);
    expect(res.optimized_rapid_mm).toBeLessThanOrEqual(res.original_rapid_mm);
    // Nearest hole to origin is (10,10)
    expect(res.ordered_holes[0].x).toBeCloseTo(10, 1);
    expect(res.ordered_holes[0].y).toBeCloseTo(10, 1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. LEARNING CORRECTIONS
  // ═══════════════════════════════════════════════════════════════════════

  it("caps correction factors at +/-30%", () => {
    const blocks: ToolpathBlock[] = [
      { spindle_rpm: 10000, feed_mm_min: 500, depth_of_cut_mm: 2.0 },
    ];
    // Extreme factors that should be capped
    const factors: CorrectionFactors = {
      speedFactor: 2.0,  // would double RPM — capped to 1.30
      feedFactor: 0.5,   // would halve feed — capped to 0.70
      depthFactor: 1.0,  // no change
    };
    const res = toolpathIntegrationEngine.applyLearningCorrections(blocks, factors);
    expect(res.applied_factors.speedFactor).toBe(1.3);
    expect(res.applied_factors.feedFactor).toBe(0.7);
    expect(res.applied_factors.depthFactor).toBe(1.0);
    expect(res.safety_capped).toBe(2); // speed + feed capped
    expect(res.blocks[0].spindle_rpm).toBe(13000); // 10000 * 1.3
    expect(res.blocks[0].feed_mm_min).toBeCloseTo(350, 0); // 500 * 0.7
  });

  it("applies uncapped factors within 30% range", () => {
    const blocks: ToolpathBlock[] = [
      { spindle_rpm: 10000, feed_mm_min: 500, depth_of_cut_mm: 2.0 },
    ];
    const factors: CorrectionFactors = {
      speedFactor: 1.1,
      feedFactor: 0.9,
      depthFactor: 1.05,
    };
    const res = toolpathIntegrationEngine.applyLearningCorrections(blocks, factors);
    expect(res.safety_capped).toBe(0);
    expect(res.blocks[0].spindle_rpm).toBe(11000); // 10000 * 1.1
    expect(res.blocks_modified).toBe(1);
    expect(res.corrections_applied).toBe(3);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. RECORD PREDICTIONS
  // ═══════════════════════════════════════════════════════════════════════

  it("handles single-element and empty inputs for reordering", () => {
    const single = [cut(0, 10, 10, 20, 20)];
    const res = toolpathIntegrationEngine.reorderCuts(single, { x: 0, y: 0, z: 0 });
    expect(res.reordered).toHaveLength(1);
    expect(res.savings_pct).toBe(0);

    const holeRes = toolpathIntegrationEngine.reorderHolePattern(
      [{ x: 5, y: 5, z: 0 }], { x: 0, y: 0, z: 0 },
    );
    expect(holeRes.ordered_holes).toHaveLength(1);
    expect(holeRes.savings_pct).toBe(0);
  });

  it("records null predictions when pipeline output lacks fields", () => {
    const rec = toolpathIntegrationEngine.recordPredictions({ unrelated: "data" });
    expect(rec.predictions.force_N).toBeNull();
    expect(rec.predictions.ra_um).toBeNull();
    expect(rec.predictions.tool_life_min).toBeNull();
    expect(rec.predictions.cpk).toBeNull();
    expect(rec.source_stages).toHaveLength(0);
  });

  it("extracts predictions from pipeline output", () => {
    const pipelineOutput = {
      force_N: 450,
      surface: { Ra_um: 1.6 },
      tool_life_min: 45,
      cpk: 1.33,
    };
    const rec = toolpathIntegrationEngine.recordPredictions(pipelineOutput);
    expect(rec.predictions.force_N).toBe(450);
    expect(rec.predictions.ra_um).toBe(1.6);
    expect(rec.predictions.tool_life_min).toBe(45);
    expect(rec.predictions.cpk).toBe(1.33);
    expect(rec.pipeline_id).toMatch(/^pred_/);
    expect(rec.source_stages).toContain("force");
    expect(rec.source_stages).toContain("surface_finish");
    expect(rec.source_stages).toContain("tool_life");
    expect(rec.source_stages).toContain("capability");
  });
});
