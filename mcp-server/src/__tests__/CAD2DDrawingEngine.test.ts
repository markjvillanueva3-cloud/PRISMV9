import { describe, it, expect } from "vitest";
import { CAD2DDrawingEngine, cad2DDrawingEngine } from "../engines/CAD2DDrawingEngine.js";

const eng = new CAD2DDrawingEngine();
const view = (r: { views: any[] }, name: string) => r.views.find((v) => v.name === name);

describe("CAD2DDrawingEngine — orthographic 2D drawing layout (third/first angle)", () => {
  // ---- happy path: exact standard view positions (R9) ----
  it("third_angle (ASME): top ABOVE front (+y), right to the RIGHT (+x)", () => {
    const r = eng.orthoViews("third_angle", 100);
    expect(r.success).toBe(true);
    expect(view(r, "front")).toMatchObject({ x_mm: 0, y_mm: 0 });
    expect(view(r, "top")).toMatchObject({ x_mm: 0, y_mm: 100 });   // above
    expect(view(r, "right")).toMatchObject({ x_mm: 100, y_mm: 0 }); // right
  });

  it("first_angle (ISO): top BELOW front (-y), right to the LEFT (-x)", () => {
    const r = eng.orthoViews("first_angle", 100);
    expect(view(r, "top")).toMatchObject({ x_mm: 0, y_mm: -100 });  // below
    expect(view(r, "right")).toMatchObject({ x_mm: -100, y_mm: 0 });// left
  });

  it("emits 3 named views + a cadquery projection op", () => {
    const r = eng.orthoViews("third_angle", 50);
    expect(r.views.map((v) => v.name).sort()).toEqual(["front", "right", "top"]);
    expect(r.cadquery_op).toContain("ortho drawing (third_angle)");
    expect(view(r, "top")!.y_mm).toBe(50);
  });

  it("view spacing scales the offsets", () => {
    expect(view(eng.orthoViews("third_angle", 75), "right")!.x_mm).toBe(75);
    expect(view(eng.orthoViews("first_angle", 75), "right")!.x_mm).toBe(-75);
  });

  // ---- failure modes (>=3) ----
  it("unknown projection -> structured failure naming valid projections", () => {
    const r = eng.orthoViews("isometric" as any, 100);
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/first_angle\|third_angle/);
  });

  it("non-positive spacing -> structured failure", () => {
    expect(eng.orthoViews("third_angle", 0).success).toBe(false);
    expect(eng.orthoViews("third_angle", -10).success).toBe(false);
  });

  it("apply: unknown drawing op -> structured failure", () => {
    const r = eng.apply({ op: "iso_view" });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/ortho_views/);
  });

  // ---- adversarial (>=2): NaN / Infinity ----
  it("NaN / Infinity spacing -> structured failure, never throws", () => {
    expect(eng.orthoViews("third_angle", NaN).success).toBe(false);
    expect(eng.orthoViews("first_angle", Infinity).success).toBe(false);
    expect(eng.apply({ projection: "third_angle", view_spacing_mm: NaN }).success).toBe(false);
  });

  // ---- dispatcher entrypoint round-trip (R15) ----
  it("apply(): defaults to third_angle + 100mm spacing; routes projection/spacing", () => {
    const d = cad2DDrawingEngine.apply({});
    expect(d.success).toBe(true);
    expect(d.projection).toBe("third_angle");
    expect(view(d, "right")!.x_mm).toBe(100);
    expect(view(cad2DDrawingEngine.apply({ projection: "first_angle", view_spacing_mm: 60 }), "top")!.y_mm).toBe(-60);
  });
});
