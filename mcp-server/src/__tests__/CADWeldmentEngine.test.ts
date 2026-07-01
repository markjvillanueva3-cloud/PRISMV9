import { describe, it, expect } from "vitest";
import { CADWeldmentEngine, cadWeldmentEngine } from "../engines/CADWeldmentEngine.js";

const eng = new CADWeldmentEngine();

describe("CADWeldmentEngine — structural members / gussets / fillet weld-beads", () => {
  // ---- happy path: exact reference volumes (R9) ----
  it("member: volume = section_area * length (400mm^2 x 1000mm = 400000)", () => {
    const r = eng.member(400, 1000);
    expect(r.success).toBe(true);
    expect(r.volume_mm3).toBe(400000);
    expect(r.cadquery_op).toContain(".sweep(profile)");
  });

  it("gusset: volume = 0.5 * a * b * t (50x50x6 = 7500)", () => {
    const r = eng.gusset(50, 50, 6);
    expect(r.success).toBe(true);
    expect(r.volume_mm3).toBe(7500);
    expect(r.cadquery_op).toContain(".extrude(6)");
  });

  it("weld_bead: equal-leg fillet, volume = 0.5*leg^2*length (leg6 len100 = 1800), throat = leg/sqrt2", () => {
    const r = eng.weldBead(6, 100);
    expect(r.success).toBe(true);
    expect(r.volume_mm3).toBe(1800);
    expect(r.throat_mm).toBeCloseTo(4.242640687, 6); // 6 / sqrt(2)
  });

  it("member: a different section/length (200x500 = 100000)", () => {
    expect(eng.member(200, 500).volume_mm3).toBe(100000);
  });

  it("weld_bead: leg 8 length 250 -> 0.5*64*250 = 8000", () => {
    expect(eng.weldBead(8, 250).volume_mm3).toBe(8000);
  });

  // ---- failure modes (>=3) ----
  it("non-positive member inputs -> structured failure", () => {
    expect(eng.member(0, 100).success).toBe(false);
    expect(eng.member(400, -5).success).toBe(false);
  });

  it("non-positive gusset / weld inputs -> structured failure", () => {
    expect(eng.gusset(50, 0, 6).success).toBe(false);
    expect(eng.weldBead(-6, 100).success).toBe(false);
    expect(eng.weldBead(6, 0).success).toBe(false);
  });

  it("apply: unknown op -> structured failure naming valid ops", () => {
    const r = eng.apply({ op: "rivet" });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/member\|gusset\|weld_bead/);
  });

  // ---- adversarial (>=2): NaN / Infinity ----
  it("NaN / Infinity -> structured failure, never throws", () => {
    expect(eng.member(NaN, 100).success).toBe(false);
    expect(eng.gusset(50, 50, Infinity).success).toBe(false);
    expect(eng.weldBead(6, NaN).success).toBe(false);
  });

  // ---- dispatcher entrypoint round-trip (R15) ----
  it("apply(): routes member/gusset/weld_bead by op (+ weldment/type aliases)", () => {
    expect(cadWeldmentEngine.apply({ op: "member", section_area_mm2: 400, length_mm: 1000 }).volume_mm3).toBe(400000);
    expect(cadWeldmentEngine.apply({ weldment: "gusset", leg_a_mm: 50, leg_b_mm: 50, thickness_mm: 6 }).volume_mm3).toBe(7500);
    expect(cadWeldmentEngine.apply({ type: "weld_bead", leg_mm: 6, length_mm: 100 }).volume_mm3).toBe(1800);
  });

  it("apply: weld_bead with a missing dim -> Number(undefined)=NaN -> structured failure", () => {
    expect(cadWeldmentEngine.apply({ op: "weld_bead", leg_mm: 6 }).success).toBe(false);
  });
});
