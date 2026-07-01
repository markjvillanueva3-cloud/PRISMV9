import { describe, it, expect } from "vitest";
import { CADDieDesignEngine, cadDieDesignEngine } from "../engines/CADDieDesignEngine.js";

const eng = new CADDieDesignEngine();

describe("CADDieDesignEngine — blanking / piercing die + punch clearance", () => {
  // ---- happy path: exact reference values (R9) ----
  it("blank: die = part + 2*clearance; punch = part (10mm part, 2mm thick, 5%/side)", () => {
    const r = eng.blank(10, 2, 5); // perSide = 0.05*2 = 0.1
    expect(r.success).toBe(true);
    expect(r.clearance_per_side_mm).toBeCloseTo(0.1, 9);
    expect(r.die_opening_mm).toBeCloseTo(10.2, 9);
    expect(r.punch_dim_mm).toBe(10);
  });

  it("pierce: die = hole; punch = hole - 2*clearance (8mm hole, 2mm thick, 5%/side)", () => {
    const r = eng.pierce(8, 2, 5); // perSide = 0.1
    expect(r.success).toBe(true);
    expect(r.die_opening_mm).toBe(8);
    expect(r.punch_dim_mm).toBeCloseTo(7.8, 9);
  });

  it("blank: 20mm part, 1mm thick, 10%/side -> clearance 0.1, die 20.2", () => {
    const r = eng.blank(20, 1, 10);
    expect(r.clearance_per_side_mm).toBeCloseTo(0.1, 9);
    expect(r.die_opening_mm).toBeCloseTo(20.2, 9);
  });

  it("pierce: 5mm hole, 3mm thick, 8%/side -> clearance 0.24, punch 4.52", () => {
    const r = eng.pierce(5, 3, 8);
    expect(r.clearance_per_side_mm).toBeCloseTo(0.24, 9);
    expect(r.punch_dim_mm).toBeCloseTo(4.52, 9);
  });

  it("blank: emits a die-opening rect op", () => {
    expect(eng.blank(10, 2, 5).cadquery_op).toContain(".rect(10.2, 10.2)");
  });

  // ---- failure modes (>=3) ----
  it("non-positive feature/thickness -> failure", () => {
    expect(eng.blank(0, 2, 5).success).toBe(false);
    expect(eng.pierce(8, -1, 5).success).toBe(false);
  });

  it("clearance% out of (0,50) -> failure", () => {
    expect(eng.blank(10, 2, 0).success).toBe(false);
    expect(eng.blank(10, 2, 50).success).toBe(false);
    expect(eng.pierce(8, 2, -3).success).toBe(false);
  });

  it("pierce where clearance exceeds hole -> punch non-positive -> failure", () => {
    const r = eng.pierce(0.5, 2, 20); // perSide = 0.4 -> punch = 0.5 - 0.8 = -0.3
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/non-positive/);
  });

  // ---- adversarial (>=2): NaN / Infinity ----
  it("NaN / Infinity -> structured failure, never throws", () => {
    expect(eng.blank(NaN, 2, 5).success).toBe(false);
    expect(eng.pierce(8, Infinity, 5).success).toBe(false);
    expect(eng.blank(10, 2, NaN).success).toBe(false);
  });

  // ---- dispatcher entrypoint round-trip (R15) ----
  it("apply(): routes blank/pierce by mode param", () => {
    expect(cadDieDesignEngine.apply({ mode: "blank", feature_dim_mm: 10, thickness_mm: 2, clearance_pct_per_side: 5 }).die_opening_mm).toBeCloseTo(10.2, 9);
    expect(cadDieDesignEngine.apply({ mode: "pierce", feature_dim_mm: 8, thickness_mm: 2, clearance_pct_per_side: 5 }).punch_dim_mm).toBeCloseTo(7.8, 9);
  });

  it("apply(): unknown mode -> structured failure naming valid modes", () => {
    const r = cadDieDesignEngine.apply({ mode: "draw" });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/blank\|pierce/);
  });
});
