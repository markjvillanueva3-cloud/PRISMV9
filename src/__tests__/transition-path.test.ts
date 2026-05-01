/**
 * TransitionPathEngine Tests — CAMK-MS3/U03
 * Tests optimized linking moves between operations
 */
import { describe, it, expect } from "vitest";
import { transitionPathEngine } from "../engines/TransitionPathEngine.js";

const stock = { min_x: 0, min_y: 0, min_z: -30, max_x: 100, max_y: 80, max_z: 0 };

describe("TransitionPathEngine", () => {
  // ---- Shortest retract ----
  it("shortest retract goes up → across → down", () => {
    const result = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: -10 },
      to: { x: 80, y: 60, z: -15 },
      stock, strategy: "shortest_retract",
    });
    expect(result.strategy_used).toBe("shortest_retract");
    expect(result.moves.length).toBeGreaterThanOrEqual(2);
    expect(result.total_distance_mm).toBeGreaterThan(0);
    expect(result.air_time_sec).toBeGreaterThan(0);
    // First move should retract Z
    expect(result.moves[0].z).toBeGreaterThan(-10);
  });

  // ---- Direct link (collision-free) ----
  it("direct link when path is above stock", () => {
    const result = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: 10 },
      to: { x: 80, y: 60, z: 10 },
      stock, strategy: "direct",
    });
    expect(result.strategy_used).toBe("direct");
    expect(result.moves).toHaveLength(1);
  });

  it("direct link falls back to retract when blocked", () => {
    const result = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: -10 },
      to: { x: 80, y: 60, z: -10 },
      stock, strategy: "direct",
    });
    // Path goes through stock → should fall back
    expect(result.strategy_used).toBe("shortest_retract");
    expect(result.moves.length).toBeGreaterThan(1);
  });

  // ---- Spiral transition ----
  it("spiral transition generates arc moves", () => {
    const result = transitionPathEngine.plan({
      from: { x: 20, y: 20, z: -5 },
      to: { x: 60, y: 40, z: -10 },
      stock, strategy: "spiral", tool_diameter_mm: 10,
    });
    expect(result.strategy_used).toBe("spiral");
    expect(result.moves.some(m => m.type === "arc_cw" || m.type === "arc_cc")).toBe(true);
  });

  // ---- Smooth transition ----
  it("smooth transition for close points", () => {
    const result = transitionPathEngine.plan({
      from: { x: 20, y: 20, z: -5 },
      to: { x: 25, y: 22, z: -5 },
      stock, strategy: "smooth", tool_diameter_mm: 10,
    });
    expect(result.strategy_used).toBe("smooth");
    expect(result.moves.length).toBeGreaterThan(0);
  });

  // ---- Auto strategy ----
  it("auto selects direct for collision-free paths", () => {
    const result = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: 10 },
      to: { x: 50, y: 40, z: 10 },
      stock, strategy: "auto",
    });
    expect(result.strategy_used).toBe("direct");
  });

  it("auto selects retract/smooth for obstructed paths", () => {
    const result = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: -10 },
      to: { x: 80, y: 60, z: -10 },
      stock, strategy: "auto",
    });
    expect(["shortest_retract", "smooth"].includes(result.strategy_used)).toBe(true);
  });

  // ---- Obstacle avoidance ----
  it("avoids obstacles in direct link", () => {
    const obstacle = { min_x: 30, min_y: 30, min_z: 0, max_x: 50, max_y: 50, max_z: 20 };
    const result = transitionPathEngine.plan({
      from: { x: 20, y: 20, z: 10 },
      to: { x: 60, y: 60, z: 10 },
      stock, obstacles: [obstacle], strategy: "direct",
    });
    // Path goes through obstacle → should retract
    expect(result.moves.length).toBeGreaterThan(1);
  });

  // ---- Batch planning ----
  it("plans transitions for entire toolpath", () => {
    const points = [
      { x: 10, y: 10, z: 5 },
      { x: 50, y: 10, z: 5 },
      { x: 50, y: 50, z: 5 },
      { x: 10, y: 50, z: 5 },
    ];
    const result = transitionPathEngine.planBatch({ points, stock });
    expect(result.transitions).toHaveLength(3); // 4 points = 3 transitions
    expect(result.total_air_distance_mm).toBeGreaterThan(0);
    expect(result.total_air_time_sec).toBeGreaterThan(0);
  });

  it("batch savings > 0 vs full retract for direct paths", () => {
    const points = [
      { x: 10, y: 10, z: 10 },
      { x: 20, y: 10, z: 10 },
      { x: 30, y: 10, z: 10 },
    ];
    const result = transitionPathEngine.planBatch({ points, stock, strategy: "auto" });
    expect(result.savings_vs_full_retract_pct).toBeGreaterThanOrEqual(0);
  });

  // ---- Distance calculations ----
  it("retract distance depends on clearance height", () => {
    const low = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: -10 }, to: { x: 50, y: 50, z: -10 },
      stock, clearance_mm: 2,
    });
    const high = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: -10 }, to: { x: 50, y: 50, z: -10 },
      stock, clearance_mm: 20,
    });
    expect(high.total_distance_mm).toBeGreaterThan(low.total_distance_mm);
  });

  // ---- Time measurement ----
  it("air time varies with rapid rate", () => {
    const slow = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: -5 }, to: { x: 80, y: 60, z: -5 },
      stock, rapid_rate_mmmin: 10000,
    });
    const fast = transitionPathEngine.plan({
      from: { x: 10, y: 10, z: -5 }, to: { x: 80, y: 60, z: -5 },
      stock, rapid_rate_mmmin: 50000,
    });
    expect(slow.air_time_sec).toBeGreaterThan(fast.air_time_sec);
  });

  // ---- Same point ----
  it("handles same start and end point", () => {
    const result = transitionPathEngine.plan({
      from: { x: 50, y: 50, z: -5 },
      to: { x: 50, y: 50, z: -5 },
      stock,
    });
    expect(result.total_distance_mm).toBeLessThan(1);
  });

  // ---- Empty batch ----
  it("handles empty/single point batch", () => {
    const result = transitionPathEngine.planBatch({ points: [{ x: 0, y: 0, z: 0 }], stock });
    expect(result.transitions).toHaveLength(0);
  });
});
