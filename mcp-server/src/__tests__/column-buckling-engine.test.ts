/**
 * ColumnBucklingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B43
 */
import { describe, it, expect } from "vitest";
import { columnBucklingEngine } from "../engines/ColumnBucklingEngine.js";

describe("ColumnBucklingEngine", () => {
  it("Euler critical load > 0", () => {
    const r = columnBucklingEngine.calculate({});
    expect(r.euler_critical_load.value).toBeGreaterThan(0);
  });

  it("larger section has higher critical load", () => {
    const small = columnBucklingEngine.calculate({ outer_dimension_mm: 25 });
    const large = columnBucklingEngine.calculate({ outer_dimension_mm: 75 });
    expect(large.governing_load.value).toBeGreaterThan(
      small.governing_load.value
    );
  });

  it("longer column buckles at lower load", () => {
    const short = columnBucklingEngine.calculate({ length_mm: 500 });
    const long = columnBucklingEngine.calculate({ length_mm: 3000 });
    expect(long.euler_critical_load.value).toBeLessThan(
      short.euler_critical_load.value
    );
  });

  it("fixed-fixed has higher load than pinned-pinned", () => {
    const pp = columnBucklingEngine.calculate({ end_condition: "pinned_pinned" });
    const ff = columnBucklingEngine.calculate({ end_condition: "fixed_fixed" });
    expect(ff.euler_critical_load.value).toBeGreaterThan(
      pp.euler_critical_load.value
    );
  });

  it("effective length depends on K factor", () => {
    const pp = columnBucklingEngine.calculate({ end_condition: "pinned_pinned" });
    const cantilever = columnBucklingEngine.calculate({ end_condition: "fixed_free" });
    expect(cantilever.effective_length.value).toBeGreaterThan(
      pp.effective_length.value
    );
  });

  it("slenderness ratio > 0", () => {
    const r = columnBucklingEngine.calculate({});
    expect(r.slenderness_ratio.value).toBeGreaterThan(0);
  });

  it("safety factor > 0", () => {
    const r = columnBucklingEngine.calculate({});
    expect(r.safety_factor.value).toBeGreaterThan(0);
  });

  it("radius of gyration > 0", () => {
    const r = columnBucklingEngine.calculate({});
    expect(r.radius_of_gyration.value).toBeGreaterThan(0);
  });

  it("column type is valid", () => {
    const r = columnBucklingEngine.calculate({});
    expect(["short", "intermediate", "long"]).toContain(r.column_type.unit);
  });

  it("warns high slenderness", () => {
    const r = columnBucklingEngine.calculate({
      outer_dimension_mm: 20,
      length_mm: 5000,
    });
    expect(r.warnings.some(w => w.includes("lenderness") || w.includes("SF"))).toBe(true);
  });
});
