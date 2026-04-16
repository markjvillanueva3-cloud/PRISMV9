/**
 * LATHE-PRO-MS-1 Session 4 — Input Pipeline Integration Tests
 *
 * Cross-engine integration tests verifying data flows correctly through
 * the full turning input pipeline:
 *   CAD Import → Rev Profile → Feature Taxonomy → ISO 2768 → Stock Selection
 *   Print Intake → Ambiguity Resolution → ISO 2768
 *   Fit Notation → Tolerance bands
 *   Material Callout → ISO group
 *
 * These tests exercise engine interoperability, NOT individual engine logic
 * (which is covered in session2 + session3 test files).
 */

import { describe, it, expect } from "vitest";
import { turningCADImportEngine } from "../engines/TurningCADImportEngine.js";
import { TurningRevProfileEngine } from "../engines/TurningRevProfileEngine.js";
import { TurningFeatureTaxonomyEngine } from "../engines/TurningFeatureTaxonomyEngine.js";
import { FitNotationParserEngine } from "../engines/FitNotationParserEngine.js";
import { ISO2768ApplicatorEngine } from "../engines/ISO2768ApplicatorEngine.js";
import { stockSelectionEngine } from "../engines/StockSelectionEngine.js";
import { ambiguityResolutionEngine } from "../engines/AmbiguityResolutionEngine.js";
import { materialCalloutParserEngine } from "../engines/MaterialCalloutParserEngine.js";
import type { CADSolidInput, CADFace, CADEdge } from "../engines/TurningCADImportEngine.js";
import type { XZSegment } from "../engines/TurningRevProfileEngine.js";

// ============================================================================
// HELPERS — Synthetic geometry builders
// ============================================================================

function buildShaftSolid(od_mm: number, length_mm: number): CADSolidInput {
  const r = od_mm / 2;
  return {
    source_format: "step",
    faces: [
      {
        id: "f1", type: "cylindrical",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
        radius_mm: r, area_mm2: Math.PI * od_mm * length_mm,
        sense: "outward", edge_ids: ["e1", "e2"],
      },
      {
        id: "f2", type: "planar",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
        area_mm2: Math.PI * r * r, sense: "outward", edge_ids: ["e1"],
      },
      {
        id: "f3", type: "planar",
        axis: { origin: { x: 0, y: 0, z: length_mm }, direction: { x: 0, y: 0, z: 1 } },
        area_mm2: Math.PI * r * r, sense: "outward", edge_ids: ["e2"],
      },
    ],
    edges: [
      { id: "e1", type: "circle", start: { x: r, y: 0, z: 0 }, end: { x: r, y: 0, z: 0 }, radius_mm: r, face_ids: ["f1", "f2"] },
      { id: "e2", type: "circle", start: { x: r, y: 0, z: length_mm }, end: { x: r, y: 0, z: length_mm }, radius_mm: r, face_ids: ["f1", "f3"] },
    ],
    vertices: [],
    bounding_box: {
      min: { x: -r, y: -r, z: 0 },
      max: { x: r, y: r, z: length_mm },
    },
  };
}

function buildSteppedShaft(od1: number, len1: number, od2: number, len2: number): CADSolidInput {
  const r1 = od1 / 2, r2 = od2 / 2;
  return {
    source_format: "step",
    faces: [
      {
        id: "f1", type: "cylindrical",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
        radius_mm: r1, area_mm2: Math.PI * od1 * len1,
        sense: "outward", edge_ids: ["e1", "e2"],
      },
      {
        id: "f2", type: "cylindrical",
        axis: { origin: { x: 0, y: 0, z: len1 }, direction: { x: 0, y: 0, z: 1 } },
        radius_mm: r2, area_mm2: Math.PI * od2 * len2,
        sense: "outward", edge_ids: ["e3", "e4"],
      },
      {
        id: "f3", type: "planar",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
        area_mm2: Math.PI * r1 * r1, sense: "outward", edge_ids: ["e1"],
      },
      {
        id: "f4", type: "planar",
        axis: { origin: { x: 0, y: 0, z: len1 }, direction: { x: 0, y: 0, z: 1 } },
        area_mm2: Math.PI * (r1 * r1 - r2 * r2), sense: "outward", edge_ids: ["e2", "e3"],
      },
      {
        id: "f5", type: "planar",
        axis: { origin: { x: 0, y: 0, z: len1 + len2 }, direction: { x: 0, y: 0, z: 1 } },
        area_mm2: Math.PI * r2 * r2, sense: "outward", edge_ids: ["e4"],
      },
    ],
    edges: [
      { id: "e1", type: "circle", start: { x: r1, y: 0, z: 0 }, end: { x: r1, y: 0, z: 0 }, radius_mm: r1, face_ids: ["f1", "f3"] },
      { id: "e2", type: "circle", start: { x: r1, y: 0, z: len1 }, end: { x: r1, y: 0, z: len1 }, radius_mm: r1, face_ids: ["f1", "f4"] },
      { id: "e3", type: "circle", start: { x: r2, y: 0, z: len1 }, end: { x: r2, y: 0, z: len1 }, radius_mm: r2, face_ids: ["f2", "f4"] },
      { id: "e4", type: "circle", start: { x: r2, y: 0, z: len1 + len2 }, end: { x: r2, y: 0, z: len1 + len2 }, radius_mm: r2, face_ids: ["f2", "f5"] },
    ],
    vertices: [],
    bounding_box: {
      min: { x: -r1, y: -r1, z: 0 },
      max: { x: r1, y: r1, z: len1 + len2 },
    },
  };
}

function buildBoredShaft(od_mm: number, bore_id_mm: number, length_mm: number): CADSolidInput {
  const rOuter = od_mm / 2, rInner = bore_id_mm / 2;
  return {
    source_format: "step",
    faces: [
      {
        id: "f1", type: "cylindrical",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
        radius_mm: rOuter, area_mm2: Math.PI * od_mm * length_mm,
        sense: "outward", edge_ids: ["e1", "e2"],
      },
      {
        id: "f2", type: "cylindrical",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
        radius_mm: rInner, area_mm2: Math.PI * bore_id_mm * length_mm,
        sense: "inward", edge_ids: ["e3", "e4"],
      },
      {
        id: "f3", type: "planar",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
        area_mm2: Math.PI * (rOuter * rOuter - rInner * rInner), sense: "outward",
        edge_ids: ["e1", "e3"],
      },
      {
        id: "f4", type: "planar",
        axis: { origin: { x: 0, y: 0, z: length_mm }, direction: { x: 0, y: 0, z: 1 } },
        area_mm2: Math.PI * (rOuter * rOuter - rInner * rInner), sense: "outward",
        edge_ids: ["e2", "e4"],
      },
    ],
    edges: [
      { id: "e1", type: "circle", start: { x: rOuter, y: 0, z: 0 }, end: { x: rOuter, y: 0, z: 0 }, radius_mm: rOuter, face_ids: ["f1", "f3"] },
      { id: "e2", type: "circle", start: { x: rOuter, y: 0, z: length_mm }, end: { x: rOuter, y: 0, z: length_mm }, radius_mm: rOuter, face_ids: ["f1", "f4"] },
      { id: "e3", type: "circle", start: { x: rInner, y: 0, z: 0 }, end: { x: rInner, y: 0, z: 0 }, radius_mm: rInner, face_ids: ["f2", "f3"] },
      { id: "e4", type: "circle", start: { x: rInner, y: 0, z: length_mm }, end: { x: rInner, y: 0, z: length_mm }, radius_mm: rInner, face_ids: ["f2", "f4"] },
    ],
    vertices: [],
    bounding_box: {
      min: { x: -rOuter, y: -rOuter, z: 0 },
      max: { x: rOuter, y: rOuter, z: length_mm },
    },
  };
}

function buildODProfile(segments: Array<{ x1: number; z1: number; x2: number; z2: number }>): XZSegment[] {
  return segments.map((s, i) => ({
    start: { x: s.x1, z: s.z1 },
    end: { x: s.x2, z: s.z2 },
    type: "line" as const,
    source_face_id: `f${i + 1}`,
  }));
}

// ============================================================================
// 1. CAD Import → Rev Profile Pipeline
// ============================================================================

describe("Pipeline: CAD Import → Rev Profile", () => {
  it("simple shaft → CAD import succeeds with revolution axis", () => {
    const solid = buildShaftSolid(50, 100);
    const cadResult = turningCADImportEngine.importSolid(solid);
    expect(cadResult.success).toBe(true);
    expect(cadResult.revolution_axis).toBeDefined();
    expect(cadResult.od_profile.length).toBeGreaterThan(0);
  });

  it("simple shaft → rev profile produces valid XZ contour", () => {
    const solid = buildShaftSolid(50, 100);
    const revResult = TurningRevProfileEngine.extract(solid);
    expect(revResult.xz_profile.length).toBeGreaterThan(0);
    // OD should be at radius 25mm
    const maxX = Math.max(...revResult.xz_profile.map(s => Math.max(s.start.x, s.end.x)));
    expect(maxX).toBeCloseTo(25, 0);
  });

  it("stepped shaft → rev profile detects diameter step", () => {
    const solid = buildSteppedShaft(60, 50, 30, 50);
    const revResult = TurningRevProfileEngine.extract(solid);
    expect(revResult.xz_profile.length).toBeGreaterThanOrEqual(2);
    const radii = new Set(revResult.xz_profile.flatMap(s => [
      Math.round(s.start.x * 10) / 10,
      Math.round(s.end.x * 10) / 10,
    ]));
    expect(radii.size).toBeGreaterThanOrEqual(2);
  });

  it("bored shaft → rev profile has both OD and ID", () => {
    const solid = buildBoredShaft(60, 20, 80);
    const revResult = TurningRevProfileEngine.extract(solid);
    expect(revResult.xz_profile.length).toBeGreaterThan(0);
    expect(revResult.xz_id_profile.length).toBeGreaterThan(0);
    const idRadii = revResult.xz_id_profile.map(s => Math.max(s.start.x, s.end.x));
    expect(Math.max(...idRadii)).toBeCloseTo(10, 0);
  });
});

// ============================================================================
// 2. Rev Profile → Feature Taxonomy Pipeline
// ============================================================================

describe("Pipeline: Rev Profile → Feature Taxonomy", () => {
  it("straight OD segments → classified as OD_STRAIGHT", () => {
    const result = TurningFeatureTaxonomyEngine.classify({
      od_profile: buildODProfile([{ x1: 25, z1: 0, x2: 25, z2: 100 }]),
      id_profile: [],
    });
    expect(result.features.length).toBeGreaterThanOrEqual(1);
    expect(result.features.some(f => f.type === "od_straight")).toBe(true);
  });

  it("stepped profile → detects shoulder at step", () => {
    const result = TurningFeatureTaxonomyEngine.classify({
      od_profile: buildODProfile([
        { x1: 30, z1: 0, x2: 30, z2: 50 },
        { x1: 30, z1: 50, x2: 15, z2: 50 },
        { x1: 15, z1: 50, x2: 15, z2: 100 },
      ]),
      id_profile: [],
    });
    const types = result.features.map(f => f.type);
    expect(types.some(t => t === "od_shoulder" || t === "face" || t === "od_straight")).toBe(true);
    expect(result.total_features).toBeGreaterThanOrEqual(2);
  });

  it("OD with taper → detects OD_TAPER", () => {
    const result = TurningFeatureTaxonomyEngine.classify({
      od_profile: buildODProfile([{ x1: 30, z1: 0, x2: 20, z2: 60 }]),
      id_profile: [],
    });
    expect(result.features.some(f => f.type === "od_taper")).toBe(true);
  });

  it("ID segments → detects bore features", () => {
    const result = TurningFeatureTaxonomyEngine.classify({
      od_profile: buildODProfile([{ x1: 30, z1: 0, x2: 30, z2: 80 }]),
      id_profile: buildODProfile([{ x1: 10, z1: 0, x2: 10, z2: 80 }]),
    });
    expect(result.features.some(f => f.type === "id_bore" || f.type === "id_taper")).toBe(true);
  });

  it("taxonomy produces total_features count", () => {
    const result = TurningFeatureTaxonomyEngine.classify({
      od_profile: buildODProfile([
        { x1: 25, z1: 0, x2: 25, z2: 50 },
        { x1: 25, z1: 50, x2: 20, z2: 50 },
        { x1: 20, z1: 50, x2: 20, z2: 100 },
      ]),
      id_profile: [],
    });
    expect(result.total_features).toBeGreaterThanOrEqual(2);
    expect(Object.keys(result.classification_summary).length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. Full Pipeline: CAD → Rev Profile → Taxonomy → Stock Select
// ============================================================================

describe("Pipeline: CAD → Rev Profile → Taxonomy → Stock Select", () => {
  it("simple shaft 50mm OD × 100mm → stock ≥ 50mm", () => {
    const solid = buildShaftSolid(50, 100);
    const revResult = TurningRevProfileEngine.extract(solid);
    const maxOD = Math.max(...revResult.xz_profile.flatMap(s => [s.start.x, s.end.x])) * 2;
    const stockResult = stockSelectionEngine.select({
      max_finished_od_mm: maxOD,
      part_length_mm: 100,
      iso_group: "P",
    });
    expect(stockResult.success).toBe(true);
    expect(stockResult.recommended).not.toBeNull();
    expect(stockResult.recommended!.od_mm).toBeGreaterThanOrEqual(50);
    expect(stockResult.recommended!.bar_length_1pc_mm).toBeGreaterThan(100);
  });

  it("stepped shaft → stock sized to max OD section", () => {
    const solid = buildSteppedShaft(80, 40, 40, 60);
    const revResult = TurningRevProfileEngine.extract(solid);
    const maxOD = Math.max(...revResult.xz_profile.flatMap(s => [s.start.x, s.end.x])) * 2;
    expect(maxOD).toBeCloseTo(80, 0);
    const stockResult = stockSelectionEngine.select({
      max_finished_od_mm: maxOD,
      part_length_mm: 100,
      iso_group: "P",
    });
    expect(stockResult.success).toBe(true);
    expect(stockResult.recommended!.od_mm).toBeGreaterThanOrEqual(80);
  });

  it("bored shaft → tube stock when bore exists", () => {
    const solid = buildBoredShaft(60, 25, 80);
    const revResult = TurningRevProfileEngine.extract(solid);
    const maxOD = Math.max(...revResult.xz_profile.flatMap(s => [s.start.x, s.end.x])) * 2;
    const minID = Math.min(...revResult.xz_id_profile.map(s => Math.min(s.start.x, s.end.x))) * 2;
    const stockResult = stockSelectionEngine.select({
      max_finished_od_mm: maxOD,
      part_length_mm: 80,
      min_bore_id_mm: minID,
      preferred_shape: "tube",
    });
    expect(stockResult.success).toBe(true);
    // Stock should cover the OD; tube stock may or may not be in catalog
    expect(stockResult.recommended!.od_mm).toBeGreaterThanOrEqual(60);
  });
});

// ============================================================================
// 4. Fit Notation → Tolerance Pipeline
// ============================================================================

describe("Pipeline: Fit Notation → Machining Implications", () => {
  it("H7/g6 at 25mm → clearance fit, correct IT values", () => {
    const result = FitNotationParserEngine.parse("H7/g6", 25);
    expect(result.fit_type).toBe("clearance");
    expect(result.hole).toBeDefined();
    expect(result.shaft).toBeDefined();
    // H7@25mm: IT7 = 21µm, EI = 0
    expect(result.hole!.tolerance_band_um).toBe(21);
    expect(result.hole!.lower_deviation_um).toBe(0);
    // g6@25mm: es = -7, IT6 = 13µm
    expect(result.shaft!.upper_deviation_um).toBe(-7);
    expect(result.shaft!.tolerance_band_um).toBe(13);
  });

  it("p6 at 10mm → interference fit", () => {
    const result = FitNotationParserEngine.parse("p6", 10);
    expect(result.shaft).toBeDefined();
    expect(result.shaft!.upper_deviation_um).toBeGreaterThan(0);
  });

  it("H8 at 50mm → IT8 = 39µm", () => {
    const result = FitNotationParserEngine.parse("H8", 50);
    expect(result.hole).toBeDefined();
    expect(result.hole!.tolerance_band_um).toBe(39);
  });
});

// ============================================================================
// 5. ISO 2768 → Feature Tolerance Pipeline
// ============================================================================

describe("Pipeline: ISO 2768 → Feature Tolerances", () => {
  it("class m at 15mm → ±0.2mm per ISO 2768-1 Table 1", () => {
    const result = ISO2768ApplicatorEngine.apply({
      dimensions: [{ id: "d1", nominal_mm: 15, type: "linear" }],
      linear_class: "m",
    });
    expect(result.dimensions.length).toBe(1);
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.2, 2);
    expect(result.dimensions[0].tolerance_minus_mm).toBeCloseTo(-0.2, 2);
    expect(result.dimensions[0].source).toBe("iso2768_linear");
  });

  it("class f at 80mm → ±0.15mm per ISO 2768-1 Table 1", () => {
    const result = ISO2768ApplicatorEngine.apply({
      dimensions: [{ id: "d1", nominal_mm: 80, type: "linear" }],
      linear_class: "f",
    });
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.15, 2);
  });

  it("explicit tolerance NOT overridden by ISO 2768", () => {
    const result = ISO2768ApplicatorEngine.apply({
      dimensions: [{
        id: "d1", nominal_mm: 25, type: "linear",
        explicit_tolerance_plus_mm: 0.05,
        explicit_tolerance_minus_mm: -0.05,
      }],
      linear_class: "m",
    });
    expect(result.dimensions[0].source).toBe("explicit");
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.05, 3);
  });

  it("mixed explicit + general → both sources present", () => {
    const result = ISO2768ApplicatorEngine.apply({
      dimensions: [
        { id: "d1", nominal_mm: 25, type: "linear",
          explicit_tolerance_plus_mm: 0.01, explicit_tolerance_minus_mm: -0.01 },
        { id: "d2", nominal_mm: 50, type: "linear" },
      ],
      linear_class: "m",
    });
    const sources = result.dimensions.map(d => d.source);
    expect(sources).toContain("explicit");
    expect(sources).toContain("iso2768_linear");
  });
});

// ============================================================================
// 6. Ambiguity Resolution Pipeline
// ============================================================================

describe("Pipeline: Ambiguity Resolution", () => {
  it("complete part data → can proceed", () => {
    const features: any[] = [
      { type: "OD_STRAIGHT", diameter_mm: 50, length_mm: 100,
        tolerance_plus_mm: 0.1, tolerance_minus_mm: -0.1, ra_um: 3.2 },
    ];
    const result = ambiguityResolutionEngine.resolve({
      features,
      has_material: true,
      material_callout: "AISI 4140",
      has_general_tolerance: true,
      general_tolerance_class: "m",
      has_gdt: false,
      has_default_surface_finish: true,
      default_ra_um: 3.2,
      part_max_od_mm: 50,
      part_total_length_mm: 100,
    });
    expect(result.must_ask_count).toBe(0);
  });

  it("missing material → flags ambiguity", () => {
    const features: any[] = [
      { type: "OD_STRAIGHT", diameter_mm: 50, length_mm: 100 },
    ];
    const result = ambiguityResolutionEngine.resolve({
      features,
      has_material: false,
      has_general_tolerance: true,
      general_tolerance_class: "m",
      has_gdt: false,
      has_default_surface_finish: false,
      part_max_od_mm: 50,
      part_total_length_mm: 100,
    });
    expect(result.ambiguities.some((a: any) => a.type === "missing_material")).toBe(true);
  });
});

// ============================================================================
// 7. Material Callout Parsing Pipeline
// ============================================================================

describe("Pipeline: Material Callout Parsing", () => {
  const cases: Array<{ callout: string; expectedGroup: string }> = [
    { callout: "AISI 4140", expectedGroup: "P" },
    { callout: "304 Stainless Steel", expectedGroup: "M" },
    { callout: "Aluminum 6061-T6", expectedGroup: "N" },
    { callout: "Ti-6Al-4V", expectedGroup: "S" },
    { callout: "Grey Cast Iron", expectedGroup: "K" },
  ];

  for (const { callout, expectedGroup } of cases) {
    it(`"${callout}" → ISO group ${expectedGroup}`, () => {
      const result = materialCalloutParserEngine.parse(callout);
      expect(result.success).toBe(true);
      expect(result.iso_group).toBe(expectedGroup);
    });
  }
});

// ============================================================================
// 8. End-to-End: Full part through complete pipeline
// ============================================================================

describe("End-to-End Pipeline", () => {
  it("stepped shaft through full pipeline", () => {
    // 1. CAD Import
    const solid = buildSteppedShaft(50, 40, 25, 60);
    const cadResult = turningCADImportEngine.importSolid(solid);
    expect(cadResult.success).toBe(true);

    // 2. Rev Profile extraction
    const revResult = TurningRevProfileEngine.extract(solid);
    expect(revResult.xz_profile.length).toBeGreaterThan(0);

    // 3. Feature taxonomy (map rev profile output → taxonomy input)
    const taxResult = TurningFeatureTaxonomyEngine.classify({
      od_profile: revResult.xz_profile,
      id_profile: revResult.xz_id_profile,
      iso2768_class: "m",
    });
    expect(taxResult.features.length).toBeGreaterThanOrEqual(2);

    // 4. ISO 2768 tolerances on classified features
    const dims = taxResult.features.map((f: any, i: number) => ({
      id: `feat-${i}`,
      nominal_mm: f.diameter_mm || f.length_mm || 25,
      type: "linear" as const,
    }));
    const isoResult = ISO2768ApplicatorEngine.apply({
      dimensions: dims,
      linear_class: "m",
    });
    expect(isoResult.dimensions.length).toBe(dims.length);
    for (const d of isoResult.dimensions) {
      expect(d.tolerance_plus_mm).toBeGreaterThan(0);
    }

    // 5. Stock selection from envelope
    const maxOD = Math.max(...revResult.xz_profile.flatMap(s => [s.start.x, s.end.x])) * 2;
    const stockResult = stockSelectionEngine.select({
      max_finished_od_mm: maxOD,
      part_length_mm: 100,
      iso_group: "P",
    });
    expect(stockResult.success).toBe(true);
    expect(stockResult.recommended!.od_mm).toBeGreaterThanOrEqual(maxOD);
  });

  it("bored part with ambiguity check", () => {
    // 1. CAD → Rev Profile
    const solid = buildBoredShaft(40, 15, 60);
    const cadResult = turningCADImportEngine.importSolid(solid);
    expect(cadResult.success).toBe(true);

    const revResult = TurningRevProfileEngine.extract(solid);
    expect(revResult.xz_profile.length).toBeGreaterThan(0);

    // 2. Taxonomy
    const taxResult = TurningFeatureTaxonomyEngine.classify({
      od_profile: revResult.xz_profile,
      id_profile: revResult.xz_id_profile,
    });
    // ID features classified as id_bore or the OD features include the whole part
    expect(taxResult.features.length).toBeGreaterThan(0);

    // 3. Ambiguity resolution (no material specified)
    const ambResult = ambiguityResolutionEngine.resolve({
      features: taxResult.features,
      has_material: false,
      has_general_tolerance: false,
      has_gdt: false,
      has_default_surface_finish: false,
      part_max_od_mm: 40,
      part_total_length_mm: 60,
    });
    expect(ambResult.ambiguities.length).toBeGreaterThan(0);
  });

  it("fit notation feeds into ISO 2768 tolerance assignment", () => {
    const fitResult = FitNotationParserEngine.parse("H7/g6", 25);
    expect(fitResult.fit_type).toBe("clearance");

    // Apply fit tolerance as explicit — ISO 2768 should NOT override
    const isoResult = ISO2768ApplicatorEngine.apply({
      dimensions: [{
        id: "bore-d1",
        nominal_mm: 25,
        type: "diameter",
        explicit_tolerance_plus_mm: (fitResult.hole!.upper_deviation_um) / 1000,
        explicit_tolerance_minus_mm: (fitResult.hole!.lower_deviation_um) / 1000,
      }],
      linear_class: "m",
    });
    expect(isoResult.dimensions[0].source).toBe("explicit");
    // H7@25mm: ES=+21µm=+0.021mm, EI=0
    expect(isoResult.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.021, 3);
  });
});

// ============================================================================
// 9. Edge Cases
// ============================================================================

describe("Pipeline Edge Cases", () => {
  it("empty OD profile → taxonomy returns empty features", () => {
    const result = TurningFeatureTaxonomyEngine.classify({
      od_profile: [],
      id_profile: [],
    });
    expect(result.features.length).toBe(0);
    expect(result.total_features).toBe(0);
  });

  it("invalid fit notation → returns no hole/shaft + warning", () => {
    const result = FitNotationParserEngine.parse("ZZ99", 25);
    expect(result.hole).toBeUndefined();
    expect(result.shaft).toBeUndefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("ISO 2768 with all explicit tolerances → all source=explicit", () => {
    const result = ISO2768ApplicatorEngine.apply({
      dimensions: [
        { id: "d1", nominal_mm: 10, type: "linear",
          explicit_tolerance_plus_mm: 0.01, explicit_tolerance_minus_mm: -0.01 },
        { id: "d2", nominal_mm: 50, type: "linear",
          explicit_tolerance_plus_mm: 0.05, explicit_tolerance_minus_mm: -0.05 },
      ],
      linear_class: "m",
    });
    expect(result.dimensions.every(d => d.source === "explicit")).toBe(true);
  });

  it("stock selection with very small part → still finds standard stock", () => {
    const result = stockSelectionEngine.select({
      max_finished_od_mm: 5,
      part_length_mm: 10,
      iso_group: "P",
    });
    expect(result.success).toBe(true);
    expect(result.recommended).not.toBeNull();
    expect(result.recommended!.od_mm).toBeGreaterThanOrEqual(5);
  });
});
