import { describe, it, expect } from "vitest";
import { BlueprintVisionOCREngine, type BlueprintVisionResult, type ExpectedFeatureFlag, type PartClass } from "../engines/BlueprintVisionOCREngine.js";

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

function withTitle(title: string, partClass?: PartClass): BlueprintVisionResult {
  return emptyResult({
    title_block: { ...emptyResult().title_block, title },
    part_class: partClass,
  });
}

function pickByKind(flags: ExpectedFeatureFlag[], kind: ExpectedFeatureFlag["kind"]): ExpectedFeatureFlag {
  const f = flags.find((x) => x.kind === kind);
  if (!f) throw new Error(`expected flag of kind "${kind}" but none returned`);
  return f;
}

function countByKind(flags: ExpectedFeatureFlag[], kind: ExpectedFeatureFlag["kind"]): number {
  return flags.filter((f) => f.kind === kind).length;
}

// ──────────────────────────────────────────────────────────────────
// CLASSIFIER — turbomachinery
// ──────────────────────────────────────────────────────────────────

describe("inferPartClass — turbomachinery", () => {
  it("BLISK → blisk", () => {
    expect(engine.inferPartClass(withTitle("HPC ROTOR BLISK STAGE 4"))).toBe("blisk");
  });
  it("INTEGRAL BLADED DISK → blisk", () => {
    expect(engine.inferPartClass(withTitle("INTEGRAL BLADED DISK ASSY"))).toBe("blisk");
  });
  it("IMPELLER → impeller", () => {
    expect(engine.inferPartClass(withTitle("CENTRIFUGAL IMPELLER 4140"))).toBe("impeller");
  });
  it("COMPRESSOR WHEEL → impeller", () => {
    expect(engine.inferPartClass(withTitle("COMPRESSOR WHEEL R/H"))).toBe("impeller");
  });
  it("HPT BLADE → turbine_blade", () => {
    expect(engine.inferPartClass(withTitle("HPT BLADE STAGE 1 SINGLE CRYSTAL"))).toBe("turbine_blade");
  });
  it("STATOR VANE → turbine_vane", () => {
    expect(engine.inferPartClass(withTitle("LPT STATOR VANE SEGMENT"))).toBe("turbine_vane");
  });
  it("NOZZLE GUIDE VANE → turbine_nozzle", () => {
    expect(engine.inferPartClass(withTitle("NOZZLE GUIDE VANE SEG 6"))).toBe("turbine_nozzle");
  });
  it("ROTOR DISK → turbine_disk", () => {
    expect(engine.inferPartClass(withTitle("HPT ROTOR DISK INCONEL 718"))).toBe("turbine_disk");
  });
  it("TURBINE CASING → casing", () => {
    expect(engine.inferPartClass(withTitle("TURBINE CASING — REAR"))).toBe("casing");
  });
});

// ──────────────────────────────────────────────────────────────────
// CLASSIFIER — medical
// ──────────────────────────────────────────────────────────────────

describe("inferPartClass — medical", () => {
  it("HIP STEM → medical_implant", () => {
    expect(engine.inferPartClass(withTitle("HIP STEM SIZE 5 — Ti-6Al-4V ELI"))).toBe("medical_implant");
  });
  it("DENTAL ABUTMENT → medical_implant", () => {
    expect(engine.inferPartClass(withTitle("DENTAL ABUTMENT 3.5MM CONICAL"))).toBe("medical_implant");
  });
  it("SPINAL CAGE → medical_implant", () => {
    expect(engine.inferPartClass(withTitle("LUMBAR SPINAL CAGE — PEEK"))).toBe("medical_implant");
  });
  it("FORCEPS → surgical_instrument", () => {
    expect(engine.inferPartClass(withTitle("KELLY FORCEPS — CURVED 6.5IN"))).toBe("surgical_instrument");
  });
  it("CORTICAL SCREW → bone_screw", () => {
    expect(engine.inferPartClass(withTitle("CORTICAL SCREW 3.5MM SELF-TAPPING"))).toBe("bone_screw");
  });
  it("CANNULATED SCREW → bone_screw", () => {
    expect(engine.inferPartClass(withTitle("CANNULATED SCREW 4.0MM"))).toBe("bone_screw");
  });
});

// ──────────────────────────────────────────────────────────────────
// CLASSIFIER — automotive
// ──────────────────────────────────────────────────────────────────

describe("inferPartClass — automotive", () => {
  it("V8 BLOCK → engine_block", () => {
    expect(engine.inferPartClass(withTitle("LS3 V8 ENGINE BLOCK"))).toBe("engine_block");
  });
  it("TRANSMISSION HOUSING → transmission_housing", () => {
    expect(engine.inferPartClass(withTitle("ZF 8-SPEED TRANSMISSION HOUSING"))).toBe("transmission_housing");
  });
  it("BRAKE CALIPER → brake_caliper", () => {
    expect(engine.inferPartClass(withTitle("FRONT BRAKE CALIPER 6-PISTON"))).toBe("brake_caliper");
  });
  it("VALVE BODY → valve_body", () => {
    expect(engine.inferPartClass(withTitle("HYDRAULIC VALVE BODY 6L80"))).toBe("valve_body");
  });
  it("CONNECTING ROD → connecting_rod", () => {
    expect(engine.inferPartClass(withTitle("CONNECTING ROD I-BEAM 6.000IN"))).toBe("connecting_rod");
  });
});

// ──────────────────────────────────────────────────────────────────
// CLASSIFIER — aerospace
// ──────────────────────────────────────────────────────────────────

describe("inferPartClass — aerospace", () => {
  it("PRESSURE BULKHEAD → bulkhead", () => {
    expect(engine.inferPartClass(withTitle("AFT PRESSURE BULKHEAD"))).toBe("bulkhead");
  });
  it("WING RIB → structural_frame", () => {
    expect(engine.inferPartClass(withTitle("WING RIB STA 250.0"))).toBe("structural_frame");
  });
  it("LONGERON → structural_frame", () => {
    expect(engine.inferPartClass(withTitle("FUSELAGE LONGERON LH"))).toBe("structural_frame");
  });
  it("CLEVIS LUG → lug", () => {
    expect(engine.inferPartClass(withTitle("WING ATTACH CLEVIS LUG 7075-T6"))).toBe("lug");
  });
  it("AN FITTING → fitting", () => {
    expect(engine.inferPartClass(withTitle("AN FITTING -8 STRAIGHT"))).toBe("fitting");
  });
  it("ENGINE PYLON → pylon", () => {
    expect(engine.inferPartClass(withTitle("ENGINE MOUNT PYLON STA 320"))).toBe("pylon");
  });
  it("MOUNTING BRACKET → bracket", () => {
    expect(engine.inferPartClass(withTitle("AVIONICS MOUNTING BRACKET"))).toBe("bracket");
  });
});

// ──────────────────────────────────────────────────────────────────
// PRIORS — turbomachinery
// ──────────────────────────────────────────────────────────────────

describe("flagExpectedFeatures — blisk priors", () => {
  it("blisk with no notes flags LE/TE/root fillets + balance hole (4 priors)", () => {
    const r = withTitle("HPC BLISK STAGE 4", "blisk");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "leading_edge_fillet")).toBe(1);
    expect(countByKind(flags, "trailing_edge_fillet")).toBe(1);
    expect(countByKind(flags, "blade_root_fillet")).toBe(1);
    expect(countByKind(flags, "balance_hole")).toBe(1);
  });

  it("blisk with 'leading edge R.005' note suppresses LE fillet flag", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "HPC BLISK STAGE 4" },
      part_class: "blisk",
      notes: [{ id: "N1", category: "general", text: "Leading edge R.005 typ", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "leading_edge_fillet")).toBe(0);
  });

  it("LE fillet flagged at confidence 0.85 with typical_size_mm 0.25", () => {
    const r = withTitle("HPC BLISK", "blisk");
    const le = pickByKind(engine.flagExpectedFeatures(r), "leading_edge_fillet");
    expect(le.confidence).toBe(0.85);
    expect(le.typical_size_mm).toBe(0.25);
  });

  it("blade root fillet at confidence 0.8 with typical_size_mm 1.0", () => {
    const r = withTitle("HPC BLISK", "blisk");
    const root = pickByKind(engine.flagExpectedFeatures(r), "blade_root_fillet");
    expect(root.confidence).toBe(0.8);
    expect(root.typical_size_mm).toBe(1.0);
  });
});

describe("flagExpectedFeatures — turbine blade priors", () => {
  it("turbine blade flags LE/TE/root + tip clearance", () => {
    const r = withTitle("HPT BLADE STAGE 1", "turbine_blade");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "leading_edge_fillet")).toBe(1);
    expect(countByKind(flags, "tip_clearance")).toBe(1);
  });

  it("turbine blade WITHOUT 'tip clearance' note → flag emitted at 0.55", () => {
    const r = withTitle("HPT BLADE", "turbine_blade");
    const tip = pickByKind(engine.flagExpectedFeatures(r), "tip_clearance");
    expect(tip.confidence).toBe(0.55);
  });
});

describe("flagExpectedFeatures — impeller priors", () => {
  it("impeller flags balance hole + LE/TE/root fillets", () => {
    const r = withTitle("CENTRIFUGAL IMPELLER", "impeller");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "balance_hole")).toBe(1);
    expect(countByKind(flags, "leading_edge_fillet")).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────
// PRIORS — medical
// ──────────────────────────────────────────────────────────────────

describe("flagExpectedFeatures — medical_implant priors", () => {
  it("hip stem flags polish_callout + biocompat_note", () => {
    const r = withTitle("HIP STEM SIZE 5", "medical_implant");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "polish_callout")).toBe(1);
    expect(countByKind(flags, "biocompat_note")).toBe(1);
  });

  it("biocompat at confidence 0.9 (high — implants mandate ISO 10993)", () => {
    const r = withTitle("HIP STEM", "medical_implant");
    const bio = pickByKind(engine.flagExpectedFeatures(r), "biocompat_note");
    expect(bio.confidence).toBe(0.9);
  });

  it("note 'Ra ≤ 0.4' suppresses polish_callout", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "HIP STEM" },
      part_class: "medical_implant",
      notes: [{ id: "N1", category: "general", text: "Ra ≤ 0.2 μm on biocontact surfaces", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "polish_callout")).toBe(0);
  });

  it("ISO 10993 reference suppresses biocompat_note", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "HIP STEM" },
      part_class: "medical_implant",
      notes: [{ id: "N1", category: "general", text: "Per ISO 10993-5 cytotoxicity", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "biocompat_note")).toBe(0);
  });
});

describe("flagExpectedFeatures — bone_screw priors", () => {
  it("bone screw flags cannulation + thread_chamfer", () => {
    const r = withTitle("CORTICAL SCREW 3.5MM", "bone_screw");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "cannulation")).toBe(1);
    expect(countByKind(flags, "thread_chamfer")).toBe(1);
  });

  it("cannulation at confidence 0.55, thread_chamfer at 0.7", () => {
    const r = withTitle("CORTICAL SCREW", "bone_screw");
    const flags = engine.flagExpectedFeatures(r);
    expect(pickByKind(flags, "cannulation").confidence).toBe(0.55);
    expect(pickByKind(flags, "thread_chamfer").confidence).toBe(0.7);
  });
});

// ──────────────────────────────────────────────────────────────────
// PRIORS — automotive
// ──────────────────────────────────────────────────────────────────

describe("flagExpectedFeatures — engine_block priors", () => {
  it("engine block flags deck_flatness + main_bearing_bore", () => {
    const r = withTitle("LS3 V8 BLOCK", "engine_block");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "deck_flatness_callout")).toBe(1);
    expect(countByKind(flags, "main_bearing_bore")).toBe(1);
  });

  it("deck_flatness at confidence 0.85 with typical_size_mm 0.05", () => {
    const r = withTitle("LS3 V8 BLOCK", "engine_block");
    const deck = pickByKind(engine.flagExpectedFeatures(r), "deck_flatness_callout");
    expect(deck.confidence).toBe(0.85);
    expect(deck.typical_size_mm).toBe(0.05);
  });

  it("note mentioning 'main bearing' suppresses main_bearing_bore flag", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "LS3 V8 BLOCK" },
      part_class: "engine_block",
      notes: [{ id: "N1", category: "general", text: "Main bearing bore Ø2.7530 +.0008/-.0000", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "main_bearing_bore")).toBe(0);
  });
});

describe("flagExpectedFeatures — valve_body priors", () => {
  it("valve body flags valve_seat_angle + valve_guide_bore", () => {
    const r = withTitle("HYDRAULIC VALVE BODY", "valve_body");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "valve_seat_angle")).toBe(1);
    expect(countByKind(flags, "valve_guide_bore")).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────
// PRIORS — aerospace
// ──────────────────────────────────────────────────────────────────

describe("flagExpectedFeatures — lug priors", () => {
  it("lug flags edge_distance + fatigue_finish + shot_peen + bushing + lockwire (5 priors)", () => {
    const r = withTitle("WING ATTACH CLEVIS LUG", "lug");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "edge_distance_callout")).toBe(1);
    expect(countByKind(flags, "fatigue_finish_callout")).toBe(1);
    expect(countByKind(flags, "shot_peen_zone")).toBe(1);
    expect(countByKind(flags, "bushing_press_fit")).toBe(1);
    expect(countByKind(flags, "lockwire_hole")).toBe(1);
  });

  it("note 'edge distance e/D=2.0' suppresses edge_distance_callout", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "CLEVIS LUG" },
      part_class: "lug",
      notes: [{ id: "N1", category: "general", text: "edge distance e/D ≥ 2.0 minimum", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "edge_distance_callout")).toBe(0);
  });

  it("note 'shot peen Almen .012A' suppresses shot_peen_zone", () => {
    const r = emptyResult({
      title_block: { ...emptyResult().title_block, title: "CLEVIS LUG" },
      part_class: "lug",
      notes: [{ id: "N1", category: "general", text: "shot peen all fillet radii Almen .012A", is_critical: false, confidence: 0.9 }],
    });
    expect(countByKind(engine.flagExpectedFeatures(r), "shot_peen_zone")).toBe(0);
  });
});

describe("flagExpectedFeatures — bulkhead priors", () => {
  it("bulkhead flags fatigue_finish + shot_peen", () => {
    const r = withTitle("AFT PRESSURE BULKHEAD", "bulkhead");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "fatigue_finish_callout")).toBe(1);
    expect(countByKind(flags, "shot_peen_zone")).toBe(1);
  });
});

describe("flagExpectedFeatures — fitting priors", () => {
  it("fitting flags edge_distance + lockwire_hole", () => {
    const r = withTitle("AN FITTING -8", "fitting");
    const flags = engine.flagExpectedFeatures(r);
    expect(countByKind(flags, "edge_distance_callout")).toBe(1);
    expect(countByKind(flags, "lockwire_hole")).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────
// REGRESSION — old part classes still work
// ──────────────────────────────────────────────────────────────────

describe("regression — original tooling priors still active after taxonomy expansion", () => {
  it("extrude_punch still classifies and flags central_oil_hole", () => {
    const r = withTitle("EXTRUDE PUNCH JM-2475-037", "extrude_punch");
    expect(engine.inferPartClass(r)).toBe("extrude_punch");
    expect(countByKind(engine.flagExpectedFeatures(r), "central_oil_hole")).toBe(1);
  });

  it("die still classifies and flags ejector_pin_hole", () => {
    const r = withTitle("FORMING DIE 4140", "die");
    expect(engine.inferPartClass(r)).toBe("die");
    expect(countByKind(engine.flagExpectedFeatures(r), "ejector_pin_hole")).toBe(1);
  });
});
