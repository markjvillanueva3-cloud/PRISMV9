/**
 * CycleTimeEngine — Unit Tests
 * @milestone FORGE-ENGINES-B20
 */
import { describe, it, expect } from "vitest";
import { cycleTimeEngine } from "../engines/CycleTimeEngine.js";

describe("CycleTimeEngine", () => {
  it("calculates cutting time from path and feed", () => {
    const r = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
    });
    // 1000/500 = 2min
    expect(r.cutting_time.value).toBe(2);
  });

  it("total > cutting time (non-productive adds)", () => {
    const r = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
    });
    expect(r.total_cycle_time.value).toBeGreaterThan(
      r.cutting_time.value
    );
  });

  it("cutting efficiency < 100%", () => {
    const r = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
    });
    expect(r.cutting_efficiency.value).toBeLessThan(100);
    expect(r.cutting_efficiency.value).toBeGreaterThan(0);
  });

  it("parts per hour from cycle time", () => {
    const r = cycleTimeEngine.calculate({
      cutting_path_mm: 500,
      feed_rate_mm_min: 1000,
      tool_changes: 1,
      load_unload_time_sec: 10,
    });
    expect(r.parts_per_hour.value).toBeGreaterThan(0);
  });

  it("more tool changes increases cycle time", () => {
    const few = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
      tool_changes: 2,
    });
    const many = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
      tool_changes: 10,
    });
    expect(many.total_cycle_time.value).toBeGreaterThan(
      few.total_cycle_time.value
    );
  });

  it("HMC has faster tool change than VMC", () => {
    const vmc = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
      tool_changes: 5,
      machine_type: "vmc",
    });
    const hmc = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
      tool_changes: 5,
      machine_type: "hmc",
    });
    expect(hmc.tool_change_time.value).toBeLessThan(
      vmc.tool_change_time.value
    );
  });

  it("batch time = cycle × batch size", () => {
    const r = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
      batch_size: 50,
    });
    expect(r.batch_time.value).toBeCloseTo(
      r.total_cycle_time.value * 50, 0
    );
  });

  it("warns low cutting efficiency", () => {
    const r = cycleTimeEngine.calculate({
      cutting_path_mm: 100,
      feed_rate_mm_min: 1000,
      tool_changes: 10,
      load_unload_time_sec: 60,
    });
    expect(
      r.warnings.some(w => w.includes("efficiency") ||
        w.includes("non-productive"))
    ).toBe(true);
  });

  it("warns many tool changes", () => {
    const r = cycleTimeEngine.calculate({
      cutting_path_mm: 5000,
      feed_rate_mm_min: 500,
      tool_changes: 20,
    });
    expect(
      r.warnings.some(w => w.includes("tool changes"))
    ).toBe(true);
  });

  it("non-productive includes all components", () => {
    const r = cycleTimeEngine.calculate({
      cutting_path_mm: 1000,
      feed_rate_mm_min: 500,
      probing_time_sec: 15,
      pallet_change_sec: 8,
    });
    expect(r.non_productive_time.value).toBeGreaterThan(
      r.tool_change_time.value
    );
  });
});
