import { describe, it, expect } from "vitest";
import { BlueprintVisionOCREngine, type BlueprintVisionResult, type ExpectedFeatureFlag } from "../engines/BlueprintVisionOCREngine.js";

const engine = new BlueprintVisionOCREngine();

function emptyResult(overrides: Partial<BlueprintVisionResult> = {}): BlueprintVisionResult {
  return {
    dimensions: [],
    gdt_frames: [],
    title_block: {
      part_number: undefined, revision: undefined, drawing_number: undefined, title: undefined,
      material: undefined, finish: undefined, scale: undefined, units: "mm",
      general_tolerance: undefined, third_angle: true, confidence: 0.85,
    },
    notes: [],
    summary: {
      total_dimensions: 0, total_gdt: 0, total_notes: 0,
      tightest_tolerance_mm: 0, critical_features: [], material: "", has_gdt: false,
    },
    profiles: [],
    tokens_used: 0,
    processing_time_ms: 0,
    ...overrides,
  };
}

function countByKind(flags: ExpectedFeatureFlag[], kind: ExpectedFeatureFlag["kind"]): number {
  return flags.filter((f) => f.kind === kind).length;
}

function pickByKind(flags: ExpectedFeatureFlag[], kind: ExpectedFeatureFlag["kind"]): ExpectedFeatureFlag {
  const f = flags.find((x) => x.kind === kind);
  if (!f) throw new Error(`expected flag of kind "${kind}" but none returned`);
  return f;
}

describe("BlueprintVisionOCREngine.inferPartClass", () => {
  it('classifies "EXTRUDE PUNCH" in title as extrude_punch', () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "EXTRUDE PUNCH" },
    });
    expect(engine.inferPartClass(r)).toBe("extrude_punch");
  });

  it('classifies "PIERCE PUNCH" in drawing number as extrude_punch', () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, drawing_number: "2475-037 PIERCE PUNCH" },
    });
    expect(engine.inferPartClass(r)).toBe("extrude_punch");
  });

  it("classifies bare DIE as die", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "DIE PLATE 4140" },
    });
    expect(engine.inferPartClass(r)).toBe("die");
  });

  it("classifies SHAFT title as shaft", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "SPINDLE SHAFT 4140" },
    });
    expect(engine.inferPartClass(r)).toBe("shaft");
  });

  it("classifies BUSHING title as bushing", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "BRONZE BUSHING" },
    });
    expect(engine.inferPartClass(r)).toBe("bushing");
  });

  it("classifies long-thin geometry as shaft when no title hint (aspect=10)", () => {
    const r = emptyResult({
      part_bounds_mm: { width: 250, height: 25 },
    });
    expect(engine.inferPartClass(r)).toBe("shaft");
  });

  it("falls back to general for unknown shapes with low aspect ratio", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "WIDGET" },
      part_bounds_mm: { width: 50, height: 50 },
    });
    expect(engine.inferPartClass(r)).toBe("general");
  });

  it("uses PLATE keyword when nothing more specific", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "FIXTURE PLATE" },
    });
    expect(engine.inferPartClass(r)).toBe("plate");
  });
});

describe("BlueprintVisionOCREngine.flagExpectedFeatures — extrude punch", () => {
  it("flags exactly one oil-hole entry at confidence 0.85 with typical Ø1.27mm", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "EXTRUDE PUNCH" },
      part_class: "extrude_punch",
    });
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "central_oil_hole")).toBe(1);
    const oil = pickByKind(flags, "central_oil_hole");
    expect(oil.found).toBe(false);
    expect(oil.confidence).toBe(0.85);
    expect(oil.typical_size_mm).toBe(1.27);
    expect(oil.reason).toContain("oil");
  });

  it("emits zero oil-hole flags when a Ø.05\" dimension already exists", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "EXTRUDE PUNCH" },
      part_class: "extrude_punch",
      dimensions: [
        { id: "DIM-1", type: "diameter", nominal: 1.27, unit: "mm", raw_text: "Ø.05", confidence: 0.9 } as never,
      ],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "central_oil_hole")).toBe(0);
  });

  it("emits zero oil-hole flags when a note explicitly mentions one", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "EXTRUDE PUNCH" },
      part_class: "extrude_punch",
      notes: [{ id: "N1", category: "general", text: "Central oil hole through axis", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "central_oil_hole")).toBe(0);
  });

  it("flags exactly one cross-drilled relief entry at confidence 0.65 with typical Ø1.524mm", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "EXTRUDE PUNCH" },
      part_class: "extrude_punch",
    });
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "cross_drilled_relief_holes")).toBe(1);
    const relief = pickByKind(flags, "cross_drilled_relief_holes");
    expect(relief.found).toBe(false);
    expect(relief.confidence).toBe(0.65);
    expect(relief.typical_size_mm).toBe(1.524);
  });

  it("punch with note mentioning chamfer still flags oil hole separately", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "EXTRUDE PUNCH" },
      part_class: "extrude_punch",
      notes: [{ id: "N1", category: "general", text: "8 deg chamfer at base", is_critical: false, confidence: 0.9 }],
    });
    const oil = pickByKind(engine.flagExpectedFeatures(r), "central_oil_hole");
    expect(oil.confidence).toBe(0.85);
  });

  it("punch with both Ø.05 + Ø.06 small diameters → zero flags emitted", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "EXTRUDE PUNCH" },
      part_class: "extrude_punch",
      dimensions: [
        { id: "DIM-1", type: "diameter", nominal: 1.27, unit: "mm", raw_text: "Ø.05", confidence: 0.9 } as never,
        { id: "DIM-2", type: "diameter", nominal: 1.524, unit: "mm", raw_text: "Ø.06", confidence: 0.9 } as never,
      ],
    });
    expect(engine.flagExpectedFeatures(r).length).toBe(0);
  });
});

describe("BlueprintVisionOCREngine.flagExpectedFeatures — die", () => {
  it("flags missing ejector pin hole at confidence 0.55", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "FORMING DIE" },
      part_class: "die",
    });
    const ejector = pickByKind(engine.flagExpectedFeatures(r), "ejector_pin_hole");
    expect(ejector.found).toBe(false);
    expect(ejector.confidence).toBe(0.55);
  });

  it("flags missing vent groove at confidence 0.4", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "FORMING DIE" },
      part_class: "die",
    });
    const vent = pickByKind(engine.flagExpectedFeatures(r), "vent_groove");
    expect(vent.found).toBe(false);
    expect(vent.confidence).toBe(0.4);
  });

  it("emits zero ejector flags when notes mention 'KNOCKOUT'", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "FORMING DIE" },
      part_class: "die",
      notes: [{ id: "N1", category: "general", text: "knockout pin Ø.25", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "ejector_pin_hole")).toBe(0);
  });
});

describe("BlueprintVisionOCREngine.flagExpectedFeatures — shaft", () => {
  it("flags missing datum relief at confidence 0.55 with typical 0.5mm", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "DRIVE SHAFT" },
      part_class: "shaft",
    });
    const relief = pickByKind(engine.flagExpectedFeatures(r), "datum_relief");
    expect(relief.found).toBe(false);
    expect(relief.confidence).toBe(0.55);
    expect(relief.typical_size_mm).toBe(0.5);
  });

  it("flags missing bevel face chamfer at confidence 0.6", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "DRIVE SHAFT" },
      part_class: "shaft",
    });
    const chamfer = pickByKind(engine.flagExpectedFeatures(r), "bevel_face_chamfer");
    expect(chamfer.confidence).toBe(0.6);
  });

  it("emits zero relief flags when 'undercut' appears in notes", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "DRIVE SHAFT" },
      part_class: "shaft",
      notes: [{ id: "N1", category: "general", text: "undercut at shoulder, .5 wide", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "datum_relief")).toBe(0);
  });
});

describe("BlueprintVisionOCREngine.flagExpectedFeatures — general", () => {
  it("returns zero flags for general parts (no priors active)", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "WIDGET" },
      part_class: "general",
    });
    expect(engine.flagExpectedFeatures(r).length).toBe(0);
  });

  it("filters out found=true entries (consumer wants 'absent' set, never 'present')", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "EXTRUDE PUNCH" },
      part_class: "extrude_punch",
    });
    const flags = engine.flagExpectedFeatures(r);
    const allAbsent = flags.every((f) => f.found === false);
    expect(allAbsent).toBe(true);
    expect(flags.length).toBeGreaterThan(0);
  });
});
