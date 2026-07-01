import { describe, it, expect } from "vitest";
import { CADReferenceGeometryEngine, cadReferenceGeometryEngine } from "../engines/CADReferenceGeometryEngine.js";

const eng = new CADReferenceGeometryEngine();

describe("CADReferenceGeometryEngine — datum plane / axis / point", () => {
  // ---- happy path: exact reference values (R9) ----
  it("datumPlane: normalizes plane, carries offset, emits .workplane(offset=)", () => {
    const r = eng.datumPlane("xy", 10);
    expect(r.success).toBe(true);
    expect(r.base_plane).toBe("XY");
    expect(r.offset_mm).toBe(10);
    expect(r.cadquery_op).toContain(".workplane(offset=10)");
  });

  it("datumAxis: 3-4-5 -> length 5, unit direction [0.6,0.8,0]", () => {
    const r = eng.datumAxis([0, 0, 0], [3, 4, 0]);
    expect(r.success).toBe(true);
    expect(r.length_mm).toBe(5);
    expect(r.direction[0]).toBeCloseTo(0.6, 9);
    expect(r.direction[1]).toBeCloseTo(0.8, 9);
    expect(r.direction[2]).toBe(0);
  });

  it("datumPoint: carries coordinates", () => {
    const r = eng.datumPoint(1, 2, 3);
    expect(r.success).toBe(true);
    expect(r.point).toEqual([1, 2, 3]);
  });

  // ---- failure modes (>=3) ----
  it("invalid base plane -> failure naming valid planes", () => {
    const r = eng.datumPlane("diagonal", 5);
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/XY\|YZ\|XZ/);
  });

  it("coincident axis points -> failure (axis undefined)", () => {
    const r = eng.datumAxis([1, 1, 1], [1, 1, 1]);
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/coincident/);
  });

  it("malformed point array (wrong length) -> failure", () => {
    const r = eng.datumAxis([0, 0] as unknown as [number, number, number], [1, 1, 1]);
    expect(r.success).toBe(false);
  });

  // ---- adversarial (>=2): NaN / Infinity ----
  it("NaN / Infinity -> structured failure, never throws", () => {
    expect(eng.datumPlane("XY", NaN).success).toBe(false);
    expect(eng.datumAxis([0, 0, 0], [Infinity, 0, 0]).success).toBe(false);
    expect(eng.datumPoint(NaN, 0, 0).success).toBe(false);
  });

  // ---- dispatcher entrypoint round-trip (R15) ----
  it("apply(): routes plane/axis/point by kind param", () => {
    expect(cadReferenceGeometryEngine.apply({ kind: "plane", base_plane: "YZ", offset_mm: 7 }).offset_mm).toBe(7);
    expect(cadReferenceGeometryEngine.apply({ kind: "axis", p1: [0, 0, 0], p2: [3, 4, 0] }).length_mm).toBe(5);
    expect(cadReferenceGeometryEngine.apply({ datum: "point", x: 1, y: 2, z: 3 }).point).toEqual([1, 2, 3]);
  });

  it("apply(): unknown kind -> structured failure naming valid kinds", () => {
    const r = cadReferenceGeometryEngine.apply({ kind: "csys" });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/plane\|axis\|point/);
  });

  it("datumPlane: negative offset accepted (construction plane below base) on YZ", () => {
    const r = eng.datumPlane("YZ", -12.5);
    expect(r.success).toBe(true);
    expect(r.base_plane).toBe("YZ");
    expect(r.offset_mm).toBe(-12.5);
    expect(r.cadquery_op).toContain(".workplane(offset=-12.5)");
  });
});
