import { describe, it, expect } from "vitest";
import { CumulativeStockChainEngine } from "../engines/CumulativeStockChainEngine.js";

const engine = new CumulativeStockChainEngine();
const stock = { length_mm: 100, width_mm: 80, height_mm: 30 };

describe("CumulativeStockChainEngine", () => {
  it("tracks single operation material removal", () => {
    const result = engine.chain(stock, [{
      operation_id: "op-1",
      type: "pocket",
      tool_diameter_mm: 10,
      cutting_region: { min_x: 10, max_x: 50, min_y: 10, max_y: 40, min_z: -15, max_z: 0 },
      depth_mm: 15,
      engagement_ae_mm: 3,
      engagement_ap_mm: 5,
    }]);

    expect(result.states.length).toBe(1);
    expect(result.final_state.removed_pct).toBeGreaterThan(0);
    expect(result.final_state.volume_mm3).toBeLessThan(100 * 80 * 30);
    expect(result.total_material_removed_mm3).toBeGreaterThan(0);
  });

  it("chains multiple operations cumulatively", () => {
    const ops = [
      {
        operation_id: "rough-1", type: "pocket", tool_diameter_mm: 12,
        cutting_region: { min_x: 10, max_x: 60, min_y: 10, max_y: 50, min_z: -20, max_z: 0 },
        depth_mm: 20, engagement_ae_mm: 4, engagement_ap_mm: 10,
      },
      {
        operation_id: "rough-2", type: "pocket", tool_diameter_mm: 8,
        cutting_region: { min_x: 65, max_x: 90, min_y: 15, max_y: 65, min_z: -10, max_z: 0 },
        depth_mm: 10, engagement_ae_mm: 3, engagement_ap_mm: 5,
      },
    ];
    const result = engine.chain(stock, ops);

    expect(result.states.length).toBe(2);
    // Second state should have more material removed
    expect(result.states[1].stock_state.removed_pct)
      .toBeGreaterThan(result.states[0].stock_state.removed_pct);
  });

  it("detects air cuts (no material in cutting region)", () => {
    const result = engine.chain(stock, [
      {
        operation_id: "real-cut", type: "pocket", tool_diameter_mm: 10,
        cutting_region: { min_x: 10, max_x: 50, min_y: 10, max_y: 40, min_z: -15, max_z: 0 },
        depth_mm: 15, engagement_ae_mm: 3, engagement_ap_mm: 5,
      },
      {
        // Same region again — should be air cut
        operation_id: "air-cut", type: "pocket", tool_diameter_mm: 10,
        cutting_region: { min_x: 10, max_x: 50, min_y: 10, max_y: 40, min_z: -15, max_z: 0 },
        depth_mm: 15, engagement_ae_mm: 3, engagement_ap_mm: 5,
      },
    ]);

    expect(result.air_cut_operations).toContain("air-cut");
  });

  it("volume conservation: removed + remaining = original", () => {
    const result = engine.chain(stock, [{
      operation_id: "op-1", type: "pocket", tool_diameter_mm: 10,
      cutting_region: { min_x: 0, max_x: 50, min_y: 0, max_y: 40, min_z: -15, max_z: 0 },
      depth_mm: 15, engagement_ae_mm: 3, engagement_ap_mm: 5,
    }]);

    const original = 100 * 80 * 30;
    const remaining = result.final_state.volume_mm3;
    const removed = result.total_material_removed_mm3;
    // Allow small rounding tolerance
    expect(Math.abs((remaining + removed) - original)).toBeLessThan(1);
  });

  it("handles 50+ sequential operations", () => {
    const ops = Array.from({ length: 50 }, (_, i) => ({
      operation_id: `op-${i}`,
      type: "pocket",
      tool_diameter_mm: 6,
      cutting_region: {
        min_x: (i % 10) * 10,
        max_x: (i % 10) * 10 + 8,
        min_y: Math.floor(i / 10) * 16,
        max_y: Math.floor(i / 10) * 16 + 14,
        min_z: -5,
        max_z: 0,
      },
      depth_mm: 5,
      engagement_ae_mm: 2,
      engagement_ap_mm: 5,
    }));

    const t0 = Date.now();
    const result = engine.chain(stock, ops);
    const elapsed = Date.now() - t0;

    expect(result.states.length).toBe(50);
    expect(elapsed).toBeLessThan(1000);
    expect(result.final_state.removed_pct).toBeGreaterThan(0);
  });

  it("reports increasing removal percentage", () => {
    const ops = [
      {
        operation_id: "op-1", type: "pocket", tool_diameter_mm: 10,
        cutting_region: { min_x: 0, max_x: 30, min_y: 0, max_y: 30, min_z: -10, max_z: 0 },
        depth_mm: 10, engagement_ae_mm: 3, engagement_ap_mm: 5,
      },
      {
        operation_id: "op-2", type: "pocket", tool_diameter_mm: 10,
        cutting_region: { min_x: 40, max_x: 70, min_y: 0, max_y: 30, min_z: -10, max_z: 0 },
        depth_mm: 10, engagement_ae_mm: 3, engagement_ap_mm: 5,
      },
    ];
    const result = engine.chain(stock, ops);

    expect(result.states[0].stock_state.removed_pct).toBeGreaterThan(0);
    expect(result.states[1].stock_state.removed_pct)
      .toBeGreaterThan(result.states[0].stock_state.removed_pct);
  });

  it("handles empty operation list", () => {
    const result = engine.chain(stock, []);
    expect(result.final_state.volume_mm3).toBe(100 * 80 * 30);
    expect(result.final_state.removed_pct).toBe(0);
    expect(result.states.length).toBe(0);
  });
});
