import { describe, it, expect } from "vitest";
import { CAD2DDrawingEngine, cad2DDrawingEngine, type DrawingView } from "../engines/CAD2DDrawingEngine.js";
import { INCH_TO_MM } from "../physics/unit-conversions.js";

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

// ---------------------------------------------------------------------------------------------
// U-CAD-2D-DRAWING-HARDEN — overlap clearance, degenerate geometry, units, PMI surfacing (R15)
// ---------------------------------------------------------------------------------------------

/** Axis-aligned paper rectangle of a placed view (center +- half extents). */
function rect(v: DrawingView) {
  return {
    x0: v.x_mm - v.width_mm! / 2, x1: v.x_mm + v.width_mm! / 2,
    y0: v.y_mm - v.height_mm! / 2, y1: v.y_mm + v.height_mm! / 2,
  };
}
function overlaps(a: ReturnType<typeof rect>, b: ReturnType<typeof rect>): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}
function assertNoViewOverlap(r: { views: DrawingView[] }) {
  const rects = r.views.map(rect);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      expect(overlaps(rects[i], rects[j]), `views ${r.views[i].name}/${r.views[j].name} overlap`).toBe(false);
    }
  }
}

describe("CAD2DDrawingEngine — view-overlap clearance from part bounding box", () => {
  // front<->right min = X/2 + Y/2 + gap(25) = 250 + 20 + 25 = 295; front<->top min = Z/2 + Y/2 + 25 = 30+20+25 = 75
  it("raises the horizontal spacing (never silently overlaps) when the part is wider than the spacing", () => {
    const r = eng.orthoViews("third_angle", 100, { partSizeMm: { x: 500, y: 40, z: 60 } });
    expect(r.success).toBe(true);
    expect(view(r, "right")!.x_mm).toBe(295);      // raised from 100
    expect(view(r, "top")!.y_mm).toBe(100);        // vertical clearance already satisfied -> untouched
    expect(r.spacing_adjusted).toBe(true);
    expect(r.notes.join(" ")).toMatch(/raised to 295/);
    assertNoViewOverlap(r);
  });

  it("first_angle mirrors the raised offset to the negative side", () => {
    const r = eng.orthoViews("first_angle", 100, { partSizeMm: { x: 500, y: 40, z: 60 } });
    expect(view(r, "right")!.x_mm).toBe(-295);
    expect(view(r, "top")!.y_mm).toBe(-100);
    assertNoViewOverlap(r);
  });

  it("extreme 1000:1 aspect ratio: no view AABB overlap, exact raised offset", () => {
    // min horizontal = 1000/2 + 1/2 + 25 = 525.5; min vertical = 1/2 + 1/2 + 25 = 26 (< 100, untouched)
    const r = eng.orthoViews("third_angle", 100, { partSizeMm: { x: 1000, y: 1, z: 1 } });
    expect(r.success).toBe(true);
    expect(view(r, "right")!.x_mm).toBe(525.5);
    expect(view(r, "top")!.y_mm).toBe(100);
    assertNoViewOverlap(r);
    // no NaN anywhere (adversarial invariant)
    for (const v of r.views) expect(Number.isFinite(v.x_mm) && Number.isFinite(v.y_mm)).toBe(true);
  });

  it("sufficient spacing is NOT adjusted; views carry paper extents (front XZ / top XY / right YZ)", () => {
    const r = eng.orthoViews("third_angle", 200, { partSizeMm: { x: 100, y: 40, z: 60 } });
    expect(r.spacing_adjusted).toBeUndefined();
    expect(view(r, "front")).toMatchObject({ width_mm: 100, height_mm: 60 });
    expect(view(r, "top")).toMatchObject({ width_mm: 100, height_mm: 40 });
    expect(view(r, "right")).toMatchObject({ width_mm: 40, height_mm: 60 });
  });

  it("min_gap override changes the clearance; negative gap -> structured failure", () => {
    const r = eng.orthoViews("third_angle", 10, { partSizeMm: { x: 100, y: 20, z: 20 }, minGapMm: 0 });
    expect(view(r, "right")!.x_mm).toBe(60); // 50 + 10 + 0
    expect(eng.orthoViews("third_angle", 10, { partSizeMm: { x: 100, y: 20, z: 20 }, minGapMm: -5 }).success).toBe(false);
  });
});

describe("CAD2DDrawingEngine — degenerate/zero-extent geometry (fail loud, never NaN)", () => {
  it("zero-thickness plate -> structured failure naming the zero axis", () => {
    const r = eng.orthoViews("third_angle", 100, { partSizeMm: { x: 100, y: 0, z: 50 } });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/degenerate part_size_mm\.y=0/);
    expect(r.views).toEqual([]); // no NaN coordinates ever emitted
  });

  it("single point (all extents 0) and negative extents -> structured failure", () => {
    expect(eng.orthoViews("third_angle", 100, { partSizeMm: { x: 0, y: 0, z: 0 } }).success).toBe(false);
    expect(eng.orthoViews("third_angle", 100, { partSizeMm: { x: 10, y: 10, z: -5 } }).success).toBe(false);
  });

  it("NaN / Infinity extents -> structured failure naming the axis (adversarial)", () => {
    const r = eng.orthoViews("third_angle", 100, { partSizeMm: { x: NaN, y: 10, z: 10 } });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/non-finite part_size_mm\.x/);
    expect(eng.orthoViews("third_angle", 100, { partSizeMm: { x: 10, y: Infinity, z: 10 } }).success).toBe(false);
  });

  it("apply: missing part_size axis -> structured failure (Number(undefined)=NaN caught, not silently defaulted)", () => {
    const r = eng.apply({ part_size_mm: { x: 100, z: 50 } });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/non-finite part_size_mm\.y/);
  });

  it("apply: non-object part_size -> structured failure", () => {
    expect(eng.apply({ part_size: 5 }).success).toBe(false);
    expect(eng.apply({ part_size: [100, 50, 25] }).success).toBe(false);
  });
});

describe("CAD2DDrawingEngine — units (UNITS FIRST: declared inch converts, mixing fails loud)", () => {
  it("units='inch': unsuffixed inputs convert via canonical INCH_TO_MM; conversion recorded in notes", () => {
    const r = eng.apply({ units: "inch", projection: "third_angle", view_spacing: 4 });
    expect(r.success).toBe(true);
    expect(view(r, "top")!.y_mm).toBeCloseTo(101.6, 10); // literal pin (NOT 4*INCH_TO_MM): self-detects a corrupted canonical constant
    expect(r.notes.join(" ")).toMatch(/NIST SP 811/);
  });

  it("units='in': inch part size converts + overlap clearance computed in mm", () => {
    // X=2in=50.8mm, Y=1in=25.4mm; min horizontal = 25.4 + 12.7 + 25(gap, mm) = 63.1; requested 1in=25.4 -> raised
    const r = eng.apply({ units: "in", view_spacing: 1, part_size: { x: 2, y: 1, z: 1 } });
    expect(r.success).toBe(true);
    expect(view(r, "right")!.x_mm).toBeCloseTo(2 * INCH_TO_MM / 2 + INCH_TO_MM / 2 + 25, 10);
    expect(r.spacing_adjusted).toBe(true);
  });

  it("units='inch' with *_mm params -> structured failure (never silently mix)", () => {
    const r = eng.apply({ units: "inch", view_spacing_mm: 100 });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/mixed units/);
    expect(eng.apply({ units: "in", part_size_mm: { x: 1, y: 1, z: 1 } }).success).toBe(false);
    expect(eng.apply({ units: "in", min_gap_mm: 10 }).success).toBe(false);
  });

  it("unknown units string -> structured failure (never assume)", () => {
    const r = eng.apply({ units: "cubits" });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/unknown units 'cubits'/);
  });

  it("both suffixed + unsuffixed twin -> structured failure (ambiguous)", () => {
    expect(eng.apply({ view_spacing: 50, view_spacing_mm: 50 }).success).toBe(false);
    expect(eng.apply({ part_size: { x: 1, y: 1, z: 1 }, part_size_mm: { x: 1, y: 1, z: 1 } }).success).toBe(false);
  });

  it("default mm behavior is byte-identical to the pre-units contract (regression pin)", () => {
    const r = eng.apply({ projection: "first_angle", view_spacing_mm: 60 });
    expect(r.success).toBe(true);
    expect(view(r, "top")!.y_mm).toBe(-60);
    expect(r.notes).toEqual([]);
  });
});

describe("CAD2DDrawingEngine — PMI surfacing (refuse: dropping-pmi-data-on-import)", () => {
  it("PMI-ish inputs are surfaced in unplaced_pmi_keys + note, never dropped silently", () => {
    const r = eng.apply({ gdt: [{ fcf: "|position|0.1|A|B|" }], dimensions: [{ nominal: 25.4 }] });
    expect(r.success).toBe(true); // layout itself is still valid
    expect(r.unplaced_pmi_keys).toEqual(["gdt", "dimensions"]);
    expect(r.notes.join(" ")).toMatch(/NOT placed/);
  });

  it("PMI keys are surfaced even alongside a structured failure (data never lost on the error path)", () => {
    const r = eng.apply({ units: "cubits", pmi: [{ note: "0.05 A" }] });
    expect(r.success).toBe(false);
    expect(r.unplaced_pmi_keys).toEqual(["pmi"]);
  });

  it("empty PMI containers do NOT trigger the surface note (no noise)", () => {
    const r = eng.apply({ pmi: [], gdt: {}, tolerances: null });
    expect(r.success).toBe(true);
    expect(r.unplaced_pmi_keys).toBeUndefined();
  });

  it("PMI keys survive the unknown-op failure path too (scrutiny arm-A P2 close-out)", () => {
    const r = eng.apply({ op: "isometric", gdt: [{ fcf: "|flatness|0.02|" }] });
    expect(r.success).toBe(false);
    expect(r.unplaced_pmi_keys).toEqual(["gdt"]);
  });

  it("clearance overflow (finite extents + huge gap -> non-finite minimum) is a structured failure, never non-finite coords", () => {
    const r = eng.orthoViews("third_angle", 100, {
      partSizeMm: { x: Number.MAX_VALUE, y: Number.MAX_VALUE, z: 1 },
      minGapMm: Number.MAX_VALUE,
    });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/clearance overflow/);
  });
});
