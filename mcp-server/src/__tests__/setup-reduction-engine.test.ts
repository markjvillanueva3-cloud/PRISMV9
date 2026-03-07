/**
 * SetupReductionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B26
 */
import { describe, it, expect } from "vitest";
import {
  setupReductionEngine,
} from "../engines/SetupReductionEngine.js";

describe("SetupReductionEngine", () => {
  it("SMED estimate < current setup time", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 45,
    });
    expect(r.smed_estimated_min.value).toBeLessThan(45);
  });

  it("internal + external = current total", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 60,
      internal_pct: 70,
    });
    expect(
      r.current_internal_min.value + r.current_external_min.value
    ).toBeCloseTo(60, 0);
  });

  it("savings per setup > 0", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 45,
    });
    expect(r.savings_per_setup_min.value).toBeGreaterThan(0);
  });

  it("setup cost per part decreases after SMED", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 45,
      batch_size: 50,
    });
    expect(r.setup_cost_per_part_after.value).toBeLessThan(
      r.setup_cost_per_part_before.value
    );
  });

  it("larger batch reduces setup cost per part", () => {
    const small = setupReductionEngine.calculate({
      current_setup_min: 30,
      batch_size: 10,
    });
    const large = setupReductionEngine.calculate({
      current_setup_min: 30,
      batch_size: 100,
    });
    expect(large.setup_cost_per_part_before.value).toBeLessThan(
      small.setup_cost_per_part_before.value
    );
  });

  it("annual savings > 0", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 45,
      batches_per_month: 20,
    });
    expect(r.annual_savings.value).toBeGreaterThan(0);
  });

  it("quick-change ROI calculated", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 60,
      quick_change_cost: 5000,
    });
    expect(r.quick_change_roi_months.value).toBeGreaterThan(0);
    expect(r.quick_change_roi_months.value).toBeLessThan(999);
  });

  it("warns excessive setup time", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 90,
    });
    expect(
      r.warnings.some(w => w.includes("excessive") ||
        w.includes("SMED"))
    ).toBe(true);
  });

  it("warns high internal percentage", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 45,
      internal_pct: 90,
    });
    expect(
      r.warnings.some(w => w.includes("internal"))
    ).toBe(true);
  });

  it("optimal batch size calculated", () => {
    const r = setupReductionEngine.calculate({
      current_setup_min: 30,
      cycle_time_min: 3,
    });
    expect(r.optimal_batch_size.value).toBeGreaterThan(0);
  });
});
