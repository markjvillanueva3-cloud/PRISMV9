import { describe, it, expect } from "vitest";
import { CADSubtractiveFeatureEngine, cadSubtractiveFeatureEngine } from "../engines/CADSubtractiveFeatureEngine.js";

const eng = new CADSubtractiveFeatureEngine();

describe("CADSubtractiveFeatureEngine — analytical removed-volume + cadquery emission", () => {
  // ---- happy path: exact reference values (R9 — geometry formulas, not stubs) ----
  it("pocket: removed = w*l*d exactly; result = base - removed", () => {
    const r = eng.pocket(1000, 4, 5, 10); // 4*5*10 = 200
    expect(r.success).toBe(true);
    expect(r.removed_volume_mm3).toBe(200);
    expect(r.result_volume_mm3).toBe(800);
    expect(r.cadquery_op).toContain("cutBlind(-10)");
  });

  it("groove: removed = w*d*l exactly", () => {
    const r = eng.groove(1000, 2, 3, 10); // 2*3*10 = 60
    expect(r.success).toBe(true);
    expect(r.removed_volume_mm3).toBe(60);
    expect(r.result_volume_mm3).toBe(940);
  });

  it("cutHole: removed = pi*r^2*h (cylinder volume)", () => {
    const r = eng.cutHole(1000, 10, 5); // r=5 -> pi*25*5 = 392.699
    expect(r.success).toBe(true);
    expect(r.removed_volume_mm3).toBeCloseTo(Math.PI * 125, 6);
    expect(r.result_volume_mm3).toBeCloseTo(1000 - Math.PI * 125, 6);
    expect(r.cadquery_op).toContain(".hole(10, 5)");
  });

  // ---- failure modes (>=3) ----
  it("non-positive dimension -> success:false, base unchanged", () => {
    expect(eng.pocket(1000, 0, 5, 10).success).toBe(false);
    expect(eng.cutHole(1000, -1, 5).success).toBe(false);
    const r = eng.groove(1000, 2, 3, 0);
    expect(r.success).toBe(false);
    expect(r.result_volume_mm3).toBe(1000); // base unchanged on failure
    expect(r.removed_volume_mm3).toBe(0);
  });

  it("removed volume >= base -> failure (cannot subtract more than exists)", () => {
    const r = eng.pocket(100, 10, 10, 10); // 1000 > 100
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/removed volume >= base/);
  });

  it("zero/negative base volume -> failure", () => {
    expect(eng.pocket(0, 4, 5, 10).success).toBe(false);
    expect(eng.cutHole(-50, 10, 5).success).toBe(false);
  });

  // ---- adversarial (>=2): NaN / Infinity ----
  it("NaN input -> structured failure, never throws", () => {
    const r = eng.pocket(1000, NaN, 5, 10);
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/non-finite/);
  });

  it("Infinity input -> structured failure, never throws", () => {
    expect(eng.cutHole(1000, Infinity, 5).success).toBe(false);
    expect(eng.groove(Infinity, 2, 3, 10).success).toBe(false);
  });

  // ---- dispatcher entrypoint round-trip (R15 — through apply(), not just the singleton methods) ----
  it("apply(): routes cut_hole/pocket/groove by op param", () => {
    expect(cadSubtractiveFeatureEngine.apply({ op: "pocket", base_volume_mm3: 1000, width_mm: 4, length_mm: 5, depth_mm: 10 }).removed_volume_mm3).toBe(200);
    expect(cadSubtractiveFeatureEngine.apply({ operation: "groove", base_volume_mm3: 1000, width_mm: 2, depth_mm: 3, length_mm: 10 }).removed_volume_mm3).toBe(60);
    expect(cadSubtractiveFeatureEngine.apply({ op: "cut_hole", base_volume_mm3: 1000, diameter_mm: 10, depth_mm: 5 }).success).toBe(true);
  });

  it("apply(): unknown op -> structured failure naming the valid ops", () => {
    const r = cadSubtractiveFeatureEngine.apply({ op: "bevel", base_volume_mm3: 1000 });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/cut_hole\|pocket\|groove/);
  });
});
