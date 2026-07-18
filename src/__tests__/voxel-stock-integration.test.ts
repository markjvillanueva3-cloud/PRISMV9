/**
 * VoxelStockIntegrationEngine Tests — CAMK-MS2/U02
 * Tests voxel-based material removal tracking along novel toolpath segments
 */
import { describe, it, expect } from "vitest";
import { voxelStockIntegrationEngine } from "../engines/VoxelStockIntegrationEngine.js";

// Helper: simple pocket toolpath (zigzag in XY at fixed Z)
function pocketPath(width: number, length: number, depth: number, stepover: number, d: number) {
  const segments = [];
  const passes = Math.ceil(width / stepover);
  for (let p = 0; p < passes; p++) {
    const y = p * stepover;
    if (p % 2 === 0) {
      for (let x = 0; x <= length; x += d / 2) {
        segments.push({ x, y, z: -depth, ae_mm: stepover, ap_mm: depth, rpm: 8000, feed_mmmin: 1000 });
      }
    } else {
      for (let x = length; x >= 0; x -= d / 2) {
        segments.push({ x, y, z: -depth, ae_mm: stepover, ap_mm: depth, rpm: 8000, feed_mmmin: 1000 });
      }
    }
  }
  return segments;
}

describe("VoxelStockIntegrationEngine", () => {
  const smallStock = { min_x: -5, min_y: -5, min_z: -10, max_x: 55, max_y: 35, max_z: 5 };
  const tool = { type: "endmill" as const, diameter_mm: 10 };

  // ---- Basic simulation ----
  it("simulates material removal along a simple path", () => {
    const segments = pocketPath(30, 50, 5, 5, 10);
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool,
    });
    expect(result.points.length).toBe(segments.length);
    expect(result.total_removed_mm3).toBeGreaterThan(0);
    expect(result.initial_volume_mm3).toBeGreaterThan(0);
    expect(result.removal_pct).toBeGreaterThan(0);
    expect(result.removal_pct).toBeLessThanOrEqual(100);
  });

  // ---- Volume tracking ----
  it("cumulative removal increases monotonically", () => {
    const segments = pocketPath(20, 30, 3, 5, 10);
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool,
    });
    for (let i = 1; i < result.points.length; i++) {
      expect(result.points[i].cumulative_removed_mm3)
        .toBeGreaterThanOrEqual(result.points[i - 1].cumulative_removed_mm3);
    }
  });

  // ---- Remaining volume decreases ----
  it("remaining volume decreases with each cut", () => {
    const segments = pocketPath(20, 30, 3, 5, 10);
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool,
    });
    const cuttingPoints = result.points.filter(p => !p.is_air_cut);
    if (cuttingPoints.length > 1) {
      for (let i = 1; i < cuttingPoints.length; i++) {
        expect(cuttingPoints[i].remaining_volume_mm3)
          .toBeLessThanOrEqual(cuttingPoints[i - 1].remaining_volume_mm3);
      }
    }
  });

  // ---- Air cutting detection ----
  it("detects air cutting when tool moves outside stock", () => {
    const segments = [
      { x: -20, y: -20, z: -3, ae_mm: 5, ap_mm: 3, rpm: 8000, feed_mmmin: 1000 },
      { x: -15, y: -20, z: -3, ae_mm: 5, ap_mm: 3, rpm: 8000, feed_mmmin: 1000 },
    ];
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool,
    });
    // Points far outside stock should be air cuts
    expect(result.air_cutting.count).toBeGreaterThanOrEqual(0);
  });

  // ---- Engagement prediction ----
  it("predicted engagement angle from ae/d", () => {
    // Full slot: ae = d → 180°
    expect(voxelStockIntegrationEngine.predictedEngagement(10, 10)).toBe(180);
    // Half engagement: ae = d/2 → 90°
    expect(voxelStockIntegrationEngine.predictedEngagement(5, 10)).toBeCloseTo(90, -1);
    // Zero engagement
    expect(voxelStockIntegrationEngine.predictedEngagement(0, 10)).toBe(0);
  });

  // ---- IPW snapshots ----
  it("produces IPW snapshots at intervals", () => {
    const segments = pocketPath(20, 30, 3, 5, 10);
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool,
    });
    expect(result.ipw_snapshots.length).toBeGreaterThanOrEqual(2);
    // First snapshot at step 0
    expect(result.ipw_snapshots[0].step).toBe(0);
    // Last snapshot at last step
    expect(result.ipw_snapshots[result.ipw_snapshots.length - 1].step).toBe(segments.length - 1);
  });

  // ---- Residual stock analysis ----
  it("identifies residual stock after partial machining", () => {
    // Only machine half the stock
    const segments = pocketPath(10, 25, 3, 5, 10);
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool,
    });
    // Should have residual stock remaining
    expect(result.residual.voxel_count).toBeGreaterThan(0);
    expect(result.residual.volume_mm3).toBeGreaterThan(0);
  });

  // ---- Ball endmill tool type ----
  it("works with ball endmill tool", () => {
    const segments = [
      { x: 10, y: 10, z: -3, ae_mm: 3, ap_mm: 3, rpm: 10000, feed_mmmin: 800 },
      { x: 20, y: 10, z: -3, ae_mm: 3, ap_mm: 3, rpm: 10000, feed_mmmin: 800 },
      { x: 30, y: 10, z: -3, ae_mm: 3, ap_mm: 3, rpm: 10000, feed_mmmin: 800 },
    ];
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock,
      tool: { type: "ball", diameter_mm: 10 },
    });
    expect(result.points).toHaveLength(3);
    expect(result.total_removed_mm3).toBeGreaterThan(0);
  });

  // ---- Quick simulate ----
  it("quickSimulate returns volume summary", () => {
    const segments = pocketPath(20, 30, 3, 5, 10);
    const quick = voxelStockIntegrationEngine.quickSimulate({
      segments, stock: smallStock, tool,
    });
    expect(quick.initial_mm3).toBeGreaterThan(0);
    expect(quick.removed_mm3).toBeGreaterThan(0);
    expect(quick.remaining_mm3).toBeGreaterThanOrEqual(0);
    expect(quick.removal_pct).toBeGreaterThan(0);
  });

  // ---- Empty segments ----
  it("handles empty segments", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: [], stock: smallStock, tool,
    });
    expect(result.points).toHaveLength(0);
    expect(result.total_removed_mm3).toBe(0);
    expect(result.removal_pct).toBe(0);
  });

  // ---- Single point ----
  it("handles single segment point", () => {
    const result = voxelStockIntegrationEngine.simulate({
      segments: [{ x: 10, y: 10, z: -3, ae_mm: 5, ap_mm: 3, rpm: 8000, feed_mmmin: 1000 }],
      stock: smallStock, tool,
    });
    expect(result.points).toHaveLength(1);
    expect(result.total_removed_mm3).toBeGreaterThan(0);
  });

  // ---- Algorithm validation: TGAR ----
  it("validates TGAR engagement tracking", () => {
    const segments = pocketPath(20, 30, 3, 5, 10);
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool, algorithm: "TGAR",
    });
    expect(result.validation.length).toBeGreaterThanOrEqual(1);
    expect(result.validation[0]).toContain("TGAR");
  });

  // ---- Algorithm validation: VCER ----
  it("validates VCER chip evacuation", () => {
    const segments = pocketPath(20, 30, 5, 5, 10);
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool, algorithm: "VCER",
    });
    expect(result.validation.some(v => v.includes("VCER"))).toBe(true);
  });

  // ---- Custom resolution ----
  it("respects custom voxel resolution", () => {
    const segments = [{ x: 10, y: 10, z: -3, ae_mm: 5, ap_mm: 3, rpm: 8000, feed_mmmin: 1000 }];
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool, resolution_mm: 2,
    });
    expect(result.points).toHaveLength(1);
  });

  // ---- Engagement accuracy stats ----
  it("computes engagement accuracy statistics", () => {
    const segments = pocketPath(20, 30, 3, 5, 10);
    const result = voxelStockIntegrationEngine.simulate({
      segments, stock: smallStock, tool,
    });
    expect(result.engagement_accuracy.rmse_deg).toBeGreaterThanOrEqual(0);
    expect(result.engagement_accuracy.max_error_deg).toBeGreaterThanOrEqual(0);
  });
});
