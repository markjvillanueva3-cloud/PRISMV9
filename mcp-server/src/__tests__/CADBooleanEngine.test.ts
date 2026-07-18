import { describe, it, expect } from "vitest";
import { CADBooleanEngine, cadBooleanEngine } from "../engines/CADBooleanEngine.js";

const eng = new CADBooleanEngine();

describe("CADBooleanEngine — composes GeometryEngine.boolean estimate + cadquery op + real-kernel signal", () => {
  // ---- happy path: exact reference volumes from GeometryEngine.boolean (R9) ----
  it("union: result = round(A + 0.95*B) (100,50 -> round 147.5 = 148) + .union op", () => {
    // GeometryEngine.boolean rounds result_volume_mm3 to an integer; the composer passes it through.
    const r = eng.apply({ op: "union", volume_a_mm3: 100, volume_b_mm3: 50 });
    expect(r.success).toBe(true);
    expect(r.result_volume_mm3).toBe(148);
    expect(r.cadquery_op).toBe(".union(solidB)");
    expect(r.uses_real_kernel).toBe(false);
  });

  it("subtract: result = max(0, A-B) (100,30 -> 70) + .cut op", () => {
    const r = eng.apply({ op: "subtract", volume_a_mm3: 100, volume_b_mm3: 30 });
    expect(r.result_volume_mm3).toBeCloseTo(70, 6);
    expect(r.cadquery_op).toBe(".cut(solidB)");
  });

  it("intersect: result = 0.5*min(A,B) (100,40 -> 20) + .intersect op", () => {
    const r = eng.apply({ op: "intersect", volume_a_mm3: 100, volume_b_mm3: 40 });
    expect(r.result_volume_mm3).toBeCloseTo(20, 6);
    expect(r.cadquery_op).toBe(".intersect(solidB)");
  });

  it("subtract where B >= A -> clamped to 0 (never negative volume)", () => {
    expect(eng.apply({ op: "subtract", volume_a_mm3: 30, volume_b_mm3: 100 }).result_volume_mm3).toBe(0);
  });

  it("accepts the `operation` alias for `op`", () => {
    // round(10 + 0.95*10) = round(19.5) = 20
    expect(eng.apply({ operation: "union", volume_a_mm3: 10, volume_b_mm3: 10 }).result_volume_mm3).toBe(20);
  });

  // ---- real-kernel signal (solid IDs) ----
  it("solid IDs (no volumes) -> success, uses_real_kernel true, estimate skipped", () => {
    const r = eng.apply({ op: "subtract", solid_a: "s1", solid_b: "s2" });
    expect(r.success).toBe(true);
    expect(r.uses_real_kernel).toBe(true);
    expect(r.result_volume_mm3).toBe(0);
    expect(r.cadquery_op).toBe(".cut(solidB)");
    expect(r.notes[0]).toMatch(/real kernel/i);
  });

  it("solid IDs + volumes -> estimate computed AND uses_real_kernel true (dispatcher runs both)", () => {
    const r = eng.apply({ op: "union", volume_a_mm3: 100, volume_b_mm3: 50, solid_a: "s1", solid_b: "s2" });
    expect(r.result_volume_mm3).toBe(148); // round(147.5)
    expect(r.uses_real_kernel).toBe(true);
  });

  // ---- failure modes (>=3) ----
  it("unknown op -> structured failure naming valid ops", () => {
    const r = eng.apply({ op: "carve", volume_a_mm3: 1, volume_b_mm3: 1 });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/union\|subtract\|intersect/);
  });

  it("negative volume -> structured failure", () => {
    expect(eng.apply({ op: "union", volume_a_mm3: -5, volume_b_mm3: 10 }).success).toBe(false);
    expect(eng.apply({ op: "union", volume_a_mm3: 10, volume_b_mm3: -5 }).success).toBe(false);
  });

  it("neither volumes nor solids -> structured failure with guidance", () => {
    const r = eng.apply({ op: "union" });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/volume_a_mm3.*solid_a|provide/);
  });

  // ---- adversarial (>=2): NaN / Infinity / empty solid ids ----
  it("NaN / Infinity volumes (no solids) -> treated as absent -> failure, never throws", () => {
    expect(eng.apply({ op: "union", volume_a_mm3: NaN, volume_b_mm3: 10 }).success).toBe(false);
    expect(eng.apply({ op: "intersect", volume_a_mm3: Infinity, volume_b_mm3: 10 }).success).toBe(false);
  });

  it("empty-string solid ids are not treated as real solids", () => {
    const r = eng.apply({ op: "union", solid_a: "", solid_b: "" });
    expect(r.success).toBe(false); // no volumes, no valid solids
    expect(r.uses_real_kernel).toBe(false);
  });

  // ---- dispatcher entrypoint round-trip (R15) ----
  it("singleton apply(): routes by op param (the exact call the cadDispatcher case makes)", () => {
    expect(cadBooleanEngine.apply({ op: "intersect", volume_a_mm3: 80, volume_b_mm3: 60 }).result_volume_mm3).toBeCloseTo(30, 6);
  });
});
