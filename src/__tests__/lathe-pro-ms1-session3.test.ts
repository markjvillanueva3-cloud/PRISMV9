/**
 * LATHE-PRO-MS-1 Session 3 Tests — Turning Feature Intelligence
 *
 * Tests for:
 *   - TurningRevProfileEngine (U-LPI09): 3D STEP → 2D XZ silhouette
 *   - TurningFeatureTaxonomyEngine (U-LPI10): profile → classified features
 *   - FitNotationParserEngine (U-LPI11): H7/g6 → tolerance bands
 *   - ISO2768ApplicatorEngine (U-LPI12): general tolerance application
 */

import { describe, it, expect } from "vitest";
import { TurningRevProfileEngine } from "../engines/TurningRevProfileEngine.js";
import { TurningFeatureTaxonomyEngine } from "../engines/TurningFeatureTaxonomyEngine.js";
import { FitNotationParserEngine } from "../engines/FitNotationParserEngine.js";
import { ISO2768ApplicatorEngine } from "../engines/ISO2768ApplicatorEngine.js";
import type { CADSolidInput, CADFace, CADEdge, CADVertex } from "../engines/TurningCADImportEngine.js";
import type { XZSegment } from "../engines/TurningRevProfileEngine.js";
import type { TaxonomyInput, OCRDimension } from "../engines/TurningFeatureTaxonomyEngine.js";
import type { ISO2768Input } from "../engines/ISO2768ApplicatorEngine.js";

// ============================================================================
// HELPERS — Build Test Solids
// ============================================================================

function buildShaftSolid(od_mm: number, length_mm: number): CADSolidInput {
  const r = od_mm / 2;
  return {
    source_format: "step",
    filename: "shaft.step",
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
    vertices: [
      { id: "v1", position: { x: r, y: 0, z: 0 } },
      { id: "v2", position: { x: -r, y: 0, z: 0 } },
      { id: "v3", position: { x: 0, y: r, z: 0 } },
      { id: "v4", position: { x: 0, y: -r, z: 0 } },
      { id: "v5", position: { x: r, y: 0, z: length_mm } },
      { id: "v6", position: { x: -r, y: 0, z: length_mm } },
      { id: "v7", position: { x: 0, y: r, z: length_mm } },
      { id: "v8", position: { x: 0, y: -r, z: length_mm } },
    ],
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
        axis: { origin: { x: 0, y: 0, z: len1 }, direction: { x: 0, y: 0, z: 1 } },
        area_mm2: Math.PI * (r1 * r1 - r2 * r2), sense: "outward",
        edge_ids: ["e2", "e3"],
      },
    ],
    edges: [
      { id: "e1", type: "circle", start: { x: r1, y: 0, z: 0 }, end: { x: r1, y: 0, z: 0 }, radius_mm: r1, face_ids: ["f1"] },
      { id: "e2", type: "circle", start: { x: r1, y: 0, z: len1 }, end: { x: r1, y: 0, z: len1 }, radius_mm: r1, face_ids: ["f1", "f3"] },
      { id: "e3", type: "circle", start: { x: r2, y: 0, z: len1 }, end: { x: r2, y: 0, z: len1 }, radius_mm: r2, face_ids: ["f2", "f3"] },
      { id: "e4", type: "circle", start: { x: r2, y: 0, z: len1 + len2 }, end: { x: r2, y: 0, z: len1 + len2 }, radius_mm: r2, face_ids: ["f2"] },
    ],
    vertices: [
      { id: "v1", position: { x: r1, y: 0, z: 0 } },
      { id: "v2", position: { x: -r1, y: 0, z: 0 } },
      { id: "v3", position: { x: 0, y: r1, z: 0 } },
      { id: "v4", position: { x: 0, y: -r1, z: 0 } },
      { id: "v5", position: { x: r1, y: 0, z: len1 } },
      { id: "v6", position: { x: r2, y: 0, z: len1 } },
      { id: "v7", position: { x: r2, y: 0, z: len1 + len2 } },
      { id: "v8", position: { x: -r2, y: 0, z: len1 + len2 } },
    ],
    bounding_box: {
      min: { x: -r1, y: -r1, z: 0 },
      max: { x: r1, y: r1, z: len1 + len2 },
    },
  };
}

function buildBoredShaft(od: number, bore_id: number, length: number): CADSolidInput {
  const rOD = od / 2, rID = bore_id / 2;
  return {
    source_format: "step",
    faces: [
      {
        id: "f1", type: "cylindrical",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
        radius_mm: rOD, area_mm2: Math.PI * od * length,
        sense: "outward", edge_ids: ["e1", "e2"],
      },
      {
        id: "f2", type: "cylindrical",
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
        radius_mm: rID, area_mm2: Math.PI * bore_id * length,
        sense: "inward", edge_ids: ["e3", "e4"],
      },
    ],
    edges: [
      { id: "e1", type: "circle", start: { x: rOD, y: 0, z: 0 }, end: { x: rOD, y: 0, z: 0 }, radius_mm: rOD, face_ids: ["f1"] },
      { id: "e2", type: "circle", start: { x: rOD, y: 0, z: length }, end: { x: rOD, y: 0, z: length }, radius_mm: rOD, face_ids: ["f1"] },
      { id: "e3", type: "circle", start: { x: rID, y: 0, z: 0 }, end: { x: rID, y: 0, z: 0 }, radius_mm: rID, face_ids: ["f2"] },
      { id: "e4", type: "circle", start: { x: rID, y: 0, z: length }, end: { x: rID, y: 0, z: length }, radius_mm: rID, face_ids: ["f2"] },
    ],
    vertices: [
      { id: "v1", position: { x: rOD, y: 0, z: 0 } },
      { id: "v2", position: { x: -rOD, y: 0, z: 0 } },
      { id: "v3", position: { x: 0, y: rOD, z: 0 } },
      { id: "v4", position: { x: 0, y: -rOD, z: 0 } },
      { id: "v5", position: { x: rOD, y: 0, z: length } },
      { id: "v6", position: { x: -rOD, y: 0, z: length } },
      { id: "v7", position: { x: 0, y: rOD, z: length } },
      { id: "v8", position: { x: 0, y: -rOD, z: length } },
    ],
    bounding_box: {
      min: { x: -rOD, y: -rOD, z: 0 },
      max: { x: rOD, y: rOD, z: length },
    },
  };
}

function buildCrossHoleShaft(od: number, length: number, holeRadius: number): CADSolidInput {
  const r = od / 2;
  const base = buildShaftSolid(od, length);
  // Add an off-axis cylindrical face for cross-hole
  base.faces.push({
    id: "f-xhole", type: "cylindrical",
    axis: { origin: { x: 0, y: 0, z: length / 2 }, direction: { x: 1, y: 0, z: 0 } },
    radius_mm: holeRadius, area_mm2: Math.PI * holeRadius * 2 * od,
    sense: "inward", edge_ids: ["ex1"],
  });
  base.edges.push({
    id: "ex1", type: "circle",
    start: { x: r, y: 0, z: length / 2 }, end: { x: r, y: 0, z: length / 2 },
    radius_mm: holeRadius, face_ids: ["f-xhole"],
  });
  return base;
}

// Helper: build OD profile segments
function buildODProfile(segments: Array<{ r1: number; z1: number; r2: number; z2: number }>): XZSegment[] {
  return segments.map((s, i) => ({
    start: { x: s.r1, z: s.z1 },
    end: { x: s.r2, z: s.z2 },
    type: "line" as const,
    source_face_id: `seg-${i}`,
  }));
}

// ============================================================================
// TurningRevProfileEngine Tests
// ============================================================================

describe("TurningRevProfileEngine", () => {
  it("detects axis from cylindrical faces", () => {
    const solid = buildShaftSolid(50, 100);
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.success).toBe(true);
    expect(result.axis_confidence).toBeGreaterThanOrEqual(0.5);
    // Axis should be along Z
    expect(Math.abs(result.axis.direction.z)).toBeGreaterThan(0.9);
  });

  it("extracts OD profile for simple shaft", () => {
    const solid = buildShaftSolid(50, 100);
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.xz_profile.length).toBeGreaterThan(0);
    // Profile should span 100mm in Z
    const zVals = result.xz_profile.flatMap(s => [s.start.z, s.end.z]);
    const zRange = Math.max(...zVals) - Math.min(...zVals);
    expect(zRange).toBeCloseTo(100, 0);
  });

  it("extracts ID profile for bored shaft", () => {
    const solid = buildBoredShaft(50, 20, 80);
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.xz_id_profile.length).toBeGreaterThan(0);
    // ID profile radius should be around 10mm (bore_id/2)
    const idRadii = result.xz_id_profile.flatMap(s => [s.start.x, s.end.x]);
    expect(Math.min(...idRadii)).toBeCloseTo(10, 0);
  });

  it("extracts stepped profile", () => {
    const solid = buildSteppedShaft(50, 40, 30, 60);
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.xz_profile.length).toBeGreaterThanOrEqual(2);
    // Envelope should show max OD = 50mm
    expect(result.envelope.max_od_mm).toBeCloseTo(50, 0);
    // Total length = 40 + 60 = 100
    expect(result.envelope.total_length_mm).toBeCloseTo(100, 0);
  });

  it("flags cross-hole as non-axisymmetric", () => {
    const solid = buildCrossHoleShaft(50, 100, 5);
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.non_axisymmetric_features.length).toBeGreaterThan(0);
    expect(result.non_axisymmetric_features[0].type).toBe("cross_hole");
  });

  it("uses inertia tensor for axis detection with many vertices", () => {
    const solid = buildShaftSolid(50, 200);
    // Add extra vertices to trigger inertia tensor path (need >= 8)
    for (let i = 0; i < 10; i++) {
      solid.vertices.push({
        id: `extra-${i}`,
        position: { x: 25 * Math.cos(i), y: 25 * Math.sin(i), z: i * 20 },
      });
    }
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.success).toBe(true);
    // Should still detect Z-axis
    expect(Math.abs(result.axis.direction.z)).toBeGreaterThan(0.5);
  });

  it("falls back to bbox for non-cylindrical solid", () => {
    const solid: CADSolidInput = {
      source_format: "step",
      faces: [
        { id: "f1", type: "planar", area_mm2: 100, sense: "outward", edge_ids: [] },
      ],
      edges: [],
      vertices: [
        { id: "v1", position: { x: 0, y: 0, z: 0 } },
        { id: "v2", position: { x: 10, y: 0, z: 0 } },
        { id: "v3", position: { x: 0, y: 10, z: 0 } },
        { id: "v4", position: { x: 0, y: 0, z: 50 } },
      ],
      bounding_box: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 50 },
      },
    };
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.axis_confidence).toBeLessThanOrEqual(0.5);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles imperial units (inches → mm)", () => {
    const solid = buildShaftSolid(1, 4); // 1 inch OD, 4 inch length
    solid.units = "in";
    const result = TurningRevProfileEngine.extract(solid);
    // 1 inch = 25.4mm OD
    expect(result.envelope.max_od_mm).toBeCloseTo(25.4, 0);
    // 4 inch = 101.6mm length
    expect(result.envelope.total_length_mm).toBeCloseTo(101.6, 0);
  });

  it("computes revolve volume > 0 for a valid shaft", () => {
    const solid = buildShaftSolid(50, 100);
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.volume_validation.profile_volume_mm3).toBeGreaterThan(0);
    expect(result.volume_validation.bbox_volume_mm3).toBeGreaterThan(0);
    // For a cylinder, profile volume / bbox volume ≈ π/4 ≈ 0.785
    expect(result.volume_validation.volume_ratio).toBeGreaterThan(0.05);
    expect(result.volume_validation.volume_ratio).toBeLessThanOrEqual(1.0);
    expect(result.volume_validation.valid).toBe(true);
  });

  it("reports gap stats", () => {
    const solid = buildShaftSolid(50, 100);
    const result = TurningRevProfileEngine.extract(solid);
    expect(result.gap_stats).toBeDefined();
    expect(typeof result.gap_stats.total_gaps).toBe("number");
    expect(typeof result.gap_stats.max_gap_mm).toBe("number");
    expect(typeof result.gap_stats.gaps_filled).toBe("number");
  });
});

// ============================================================================
// TurningFeatureTaxonomyEngine Tests
// ============================================================================

describe("TurningFeatureTaxonomyEngine", () => {
  it("classifies OD straight segment", () => {
    const input: TaxonomyInput = {
      od_profile: buildODProfile([{ r1: 25, z1: 0, r2: 25, z2: 50 }]),
      id_profile: [],
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    expect(result.total_features).toBe(1);
    expect(result.features[0].type).toBe("od_straight");
    expect(result.features[0].od_mm).toBeCloseTo(50, 0); // diameter = 2 × radius
  });

  it("classifies OD taper", () => {
    const input: TaxonomyInput = {
      od_profile: buildODProfile([{ r1: 25, z1: 0, r2: 15, z2: 30 }]),
      id_profile: [],
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    expect(result.features[0].type).toBe("od_taper");
    expect(result.features[0].taper_angle_deg).toBeDefined();
    expect(result.features[0].taper_angle_deg!).toBeGreaterThan(0);
  });

  it("classifies face/shoulder from vertical step", () => {
    const input: TaxonomyInput = {
      od_profile: buildODProfile([
        { r1: 25, z1: 0, r2: 25, z2: 40 },
        { r1: 25, z1: 40, r2: 15, z2: 40 }, // vertical step
        { r1: 15, z1: 40, r2: 15, z2: 80 },
      ]),
      id_profile: [],
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    expect(result.total_features).toBe(3);
    // Middle segment should be shoulder or face
    const shoulder = result.features.find(f => f.type === "od_shoulder" || f.type === "face");
    expect(shoulder).toBeDefined();
  });

  it("classifies chamfer from short angled segment", () => {
    const input: TaxonomyInput = {
      od_profile: buildODProfile([
        { r1: 25, z1: 0, r2: 24, z2: 1 }, // 1mm × 1mm chamfer (45°)
        { r1: 24, z1: 1, r2: 24, z2: 50 },
      ]),
      id_profile: [],
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    const chamfer = result.features.find(f => f.type === "face"); // chamfer maps to face
    expect(chamfer).toBeDefined();
  });

  it("classifies OD groove between two larger segments", () => {
    const input: TaxonomyInput = {
      od_profile: buildODProfile([
        { r1: 25, z1: 0, r2: 25, z2: 30 },
        { r1: 20, z1: 30, r2: 20, z2: 33 }, // 3mm narrow dip
        { r1: 25, z1: 33, r2: 25, z2: 60 },
      ]),
      id_profile: [],
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    const groove = result.features.find(f => f.type === "groove_od");
    expect(groove).toBeDefined();
    expect(groove!.groove_width_mm).toBeCloseTo(3, 0);
  });

  it("classifies bore features", () => {
    const input: TaxonomyInput = {
      od_profile: [],
      id_profile: buildODProfile([{ r1: 10, z1: 0, r2: 10, z2: 40 }]),
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    expect(result.features.length).toBe(1);
    expect(result.features[0].type).toBe("id_bore");
  });

  it("applies ISO 2768-m default tolerance", () => {
    const input: TaxonomyInput = {
      od_profile: buildODProfile([{ r1: 25, z1: 0, r2: 25, z2: 50 }]),
      id_profile: [],
      iso2768_class: "m",
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    // 50mm diameter → ISO 2768-m → ±0.3mm
    expect(result.features[0].tolerance_mm).toBeCloseTo(0.3, 1);
    expect(result.features[0].tolerance_source).toBe("iso2768_default");
  });

  it("applies default Ra per feature type", () => {
    const input: TaxonomyInput = {
      od_profile: buildODProfile([{ r1: 25, z1: 0, r2: 25, z2: 50 }]),
      id_profile: [],
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    expect(result.features[0].surface_finish_Ra_um).toBe(3.2);
    expect(result.features[0].finish_source).toBe("feature_default");
  });

  it("matches OCR dimensions to features by proximity", () => {
    const dims: OCRDimension[] = [
      { id: "d1", value_mm: 50, type_hint: "diameter", tolerance_plus_mm: 0.05, tolerance_minus_mm: -0.05 },
    ];
    const input: TaxonomyInput = {
      od_profile: buildODProfile([{ r1: 25, z1: 0, r2: 25, z2: 50 }]),
      id_profile: [],
      ocr_dimensions: dims,
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    expect(result.features[0].matched_ocr_ids).toContain("d1");
    expect(result.features[0].tolerance_mm).toBeCloseTo(0.05, 2);
    expect(result.features[0].tolerance_source).toBe("ocr_explicit");
  });

  it("identifies thread from OCR callout", () => {
    const dims: OCRDimension[] = [
      { id: "t1", value_mm: 50, type_hint: "diameter", thread_callout: "M50x1.5" },
    ];
    const input: TaxonomyInput = {
      od_profile: buildODProfile([{ r1: 25, z1: 0, r2: 25, z2: 30 }]),
      id_profile: [],
      ocr_dimensions: dims,
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    // Thread callout should match and override type
    const threadF = result.features.find(f => f.type === "thread_od");
    expect(threadF).toBeDefined();
    expect(threadF!.thread_pitch_mm).toBeCloseTo(1.5, 1);
  });

  it("reports orphan dimension rate", () => {
    const dims: OCRDimension[] = [
      { id: "d1", value_mm: 999, type_hint: "diameter" }, // no match
    ];
    const input: TaxonomyInput = {
      od_profile: buildODProfile([{ r1: 25, z1: 0, r2: 25, z2: 50 }]),
      id_profile: [],
      ocr_dimensions: dims,
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    expect(result.orphan_dimension_rate).toBeGreaterThan(0);
    expect(result.unmatched_dimensions.length).toBe(1);
  });

  it("classification summary counts feature types", () => {
    const input: TaxonomyInput = {
      od_profile: buildODProfile([
        { r1: 25, z1: 0, r2: 25, z2: 40 },
        { r1: 25, z1: 40, r2: 15, z2: 40 },
        { r1: 15, z1: 40, r2: 15, z2: 80 },
      ]),
      id_profile: [],
    };
    const result = TurningFeatureTaxonomyEngine.classify(input);
    expect(Object.keys(result.classification_summary).length).toBeGreaterThan(0);
    const totalInSummary = Object.values(result.classification_summary).reduce((a, b) => a + b, 0);
    expect(totalInSummary).toBe(result.total_features);
  });
});

// ============================================================================
// FitNotationParserEngine Tests
// ============================================================================

describe("FitNotationParserEngine", () => {
  it("parses H7/g6 combined fit", () => {
    const result = FitNotationParserEngine.parse("H7/g6", 25);
    expect(result.notation.hole).toBeDefined();
    expect(result.notation.shaft).toBeDefined();
    expect(result.notation.hole!.letter).toBe("H");
    expect(result.notation.hole!.grade).toBe(7);
    expect(result.notation.shaft!.letter).toBe("g");
    expect(result.notation.shaft!.grade).toBe(6);
  });

  it("H7 at 25mm has EI=0 and correct IT7 band", () => {
    const result = FitNotationParserEngine.parse("H7", 25);
    expect(result.hole).toBeDefined();
    expect(result.hole!.lower_deviation_um).toBe(0);
    // IT7 for 18-30mm range = 21µm (ISO 286)
    expect(result.hole!.tolerance_band_um).toBe(21);
    expect(result.hole!.upper_deviation_um).toBe(21);
  });

  it("g6 at 25mm has correct deviations", () => {
    const result = FitNotationParserEngine.parse("g6", 25);
    expect(result.shaft).toBeDefined();
    // g: es = -7µm for 18-30mm range
    expect(result.shaft!.upper_deviation_um).toBe(-7);
    // IT6 for 18-30mm = 13µm
    expect(result.shaft!.tolerance_band_um).toBe(13);
    // ei = es - IT = -7 - 13 = -20
    expect(result.shaft!.lower_deviation_um).toBe(-20);
  });

  it("H7/g6 at 25mm is clearance fit", () => {
    const result = FitNotationParserEngine.parse("H7/g6", 25);
    expect(result.fit_type).toBe("clearance");
    expect(result.clearance_um).toBeDefined();
    // Min clearance = H7_EI - g6_es = 0 - (-7) = 7µm
    expect(result.clearance_um!.min).toBe(7);
    // Max clearance = H7_ES - g6_ei = 21 - (-20) = 41µm
    expect(result.clearance_um!.max).toBe(41);
  });

  it("H7/p6 at 25mm is interference fit", () => {
    const result = FitNotationParserEngine.parse("H7/p6", 25);
    expect(result.fit_type).toBe("interference");
    // p: ei = +22µm for 18-30mm
    expect(result.shaft!.lower_deviation_um).toBe(22);
    // es = ei + IT6 = 22 + 13 = 35
    expect(result.shaft!.upper_deviation_um).toBe(35);
  });

  it("h6 at 25mm has es=0", () => {
    const result = FitNotationParserEngine.parse("h6", 25);
    expect(result.shaft!.upper_deviation_um).toBe(0);
    expect(result.shaft!.lower_deviation_um).toBe(-13); // -IT6
  });

  it("js7 at 25mm is symmetrical", () => {
    const result = FitNotationParserEngine.parse("js7", 25);
    expect(result.shaft).toBeDefined();
    // IT7 = 21 for 18-30mm → ±10.5, rounded to ±11/10
    const half = Math.round(21 / 2);
    expect(result.shaft!.upper_deviation_um).toBe(half);
    expect(result.shaft!.lower_deviation_um).toBe(-half);
  });

  it("IT7 value for 50mm diameter = 25µm", () => {
    // 30-50mm range, IT7 column
    const it7 = FitNotationParserEngine.getITValue(7, 50);
    expect(it7).toBe(25);
  });

  it("IT6 value for 10mm diameter = 9µm", () => {
    // 6-10mm range, IT6 column
    const it6 = FitNotationParserEngine.getITValue(6, 10);
    expect(it6).toBe(9);
  });

  it("provides machining implications", () => {
    const result = FitNotationParserEngine.parse("H7/g6", 25);
    expect(result.machining.length).toBe(2);
    // IT7 → careful turning, IT6 → finish turning
    expect(result.machining[0].process).toContain("Hole");
    expect(result.machining[1].process).toContain("Shaft");
  });

  it("handles invalid notation gracefully", () => {
    const result = FitNotationParserEngine.parse("invalid", 25);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.hole).toBeUndefined();
    expect(result.shaft).toBeUndefined();
  });

  it("warns for diameter outside ISO 286 range", () => {
    const result = FitNotationParserEngine.parse("H7", 600);
    expect(result.warnings.some(w => w.includes("outside"))).toBe(true);
  });

  it("parses single-letter shaft notation (p6)", () => {
    const result = FitNotationParserEngine.parse("p6", 25);
    expect(result.notation.shaft).toBeDefined();
    expect(result.notation.shaft!.letter).toBe("p");
    expect(result.notation.shaft!.grade).toBe(6);
    expect(result.notation.hole).toBeUndefined();
  });

  it("H7/k6 at 25mm is transition fit", () => {
    const result = FitNotationParserEngine.parse("H7/k6", 25);
    // k: ei = +2µm for 18-30mm, es = 2+13 = 15
    // Min clearance = H_EI - k_es = 0 - 15 = -15 (interference)
    // Max clearance = H_ES - k_ei = 21 - 2 = 19 (clearance)
    expect(result.fit_type).toBe("transition");
  });
});

// ============================================================================
// ISO2768ApplicatorEngine Tests
// ============================================================================

describe("ISO2768ApplicatorEngine", () => {
  it("applies ISO 2768-m linear tolerance to un-toleranced dimension", () => {
    const input: ISO2768Input = {
      dimensions: [
        { id: "d1", nominal_mm: 50, type: "linear" },
      ],
      linear_class: "m",
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.3, 2);
    expect(result.dimensions[0].tolerance_minus_mm).toBeCloseTo(-0.3, 2);
    expect(result.dimensions[0].source).toBe("iso2768_linear");
    expect(result.dimensions[0].iso2768_class).toBe("m");
  });

  it("applies ISO 2768-f (fine) linear tolerance", () => {
    const input: ISO2768Input = {
      dimensions: [
        { id: "d1", nominal_mm: 50, type: "linear" },
      ],
      linear_class: "f",
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.15, 2);
  });

  it("preserves explicit tolerances (never overrides)", () => {
    const input: ISO2768Input = {
      dimensions: [
        { id: "d1", nominal_mm: 50, type: "linear", explicit_tolerance_plus_mm: 0.02, explicit_tolerance_minus_mm: -0.01 },
      ],
      linear_class: "m",
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.02, 3);
    expect(result.dimensions[0].tolerance_minus_mm).toBeCloseTo(-0.01, 3);
    expect(result.dimensions[0].source).toBe("explicit");
    expect(result.stats.explicit_count).toBe(1);
    expect(result.stats.iso2768_applied_count).toBe(0);
  });

  it("class f is tighter than class m", () => {
    const f = ISO2768ApplicatorEngine.getLinearTolerance(50, "f");
    const m = ISO2768ApplicatorEngine.getLinearTolerance(50, "m");
    const c = ISO2768ApplicatorEngine.getLinearTolerance(50, "c");
    const v = ISO2768ApplicatorEngine.getLinearTolerance(50, "v");
    expect(f).toBeLessThan(m);
    expect(m).toBeLessThan(c);
    expect(c).toBeLessThan(v);
  });

  it("applies angular tolerances", () => {
    const input: ISO2768Input = {
      dimensions: [
        { id: "a1", nominal_mm: 30, type: "angular" },
      ],
      linear_class: "m",
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    expect(result.dimensions[0].source).toBe("iso2768_angular");
    // 10-50mm range, ISO 2768-1:1989 class m → ±30 minutes = 0.5°
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(30 / 60, 2);
  });

  it("applies broken edge tolerances", () => {
    const input: ISO2768Input = {
      dimensions: [
        { id: "be1", nominal_mm: 1, type: "broken_edge" },
      ],
      linear_class: "m",
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    expect(result.dimensions[0].source).toBe("iso2768_broken_edge");
    // 0.2-4mm range, class m → ±0.4
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.4, 2);
  });

  it("applies geometrical tolerances (straightness, class K)", () => {
    const input: ISO2768Input = {
      dimensions: [],
      linear_class: "m",
      geometrical_class: "K",
      geometrical: [
        { id: "g1", type: "straightness", nominal_range_mm: 50 },
      ],
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    expect(result.geometrical.length).toBe(1);
    expect(result.geometrical[0].source).toBe("iso2768_geometrical");
    // 30-100mm range, class K → 0.2mm
    expect(result.geometrical[0].tolerance_mm).toBeCloseTo(0.2, 2);
  });

  it("applies circularity tolerance", () => {
    const input: ISO2768Input = {
      dimensions: [],
      linear_class: "m",
      geometrical_class: "H",
      geometrical: [
        { id: "g1", type: "circularity", nominal_range_mm: 50 },
      ],
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    // 30-100mm, class H → 0.04mm
    expect(result.geometrical[0].tolerance_mm).toBeCloseTo(0.04, 3);
  });

  it("applies runout tolerance", () => {
    const input: ISO2768Input = {
      dimensions: [],
      linear_class: "m",
      geometrical_class: "K",
      geometrical: [
        { id: "g1", type: "runout", nominal_range_mm: 50 },
      ],
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    // Any range, class K → 0.2mm
    expect(result.geometrical[0].tolerance_mm).toBeCloseTo(0.2, 2);
  });

  it("preserves explicit geometrical tolerances", () => {
    const input: ISO2768Input = {
      dimensions: [],
      linear_class: "m",
      geometrical_class: "K",
      geometrical: [
        { id: "g1", type: "straightness", nominal_range_mm: 50, explicit_value_mm: 0.05 },
      ],
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    expect(result.geometrical[0].tolerance_mm).toBeCloseTo(0.05, 3);
    expect(result.geometrical[0].source).toBe("explicit");
    expect(result.stats.geometrical_explicit).toBe(1);
  });

  it("handles mixed explicit and default dimensions", () => {
    const input: ISO2768Input = {
      dimensions: [
        { id: "d1", nominal_mm: 25, type: "linear" },
        { id: "d2", nominal_mm: 50, type: "linear", explicit_tolerance_plus_mm: 0.01, explicit_tolerance_minus_mm: -0.02 },
        { id: "d3", nominal_mm: 100, type: "linear" },
      ],
      linear_class: "m",
    };
    const result = ISO2768ApplicatorEngine.apply(input);
    expect(result.stats.total_dimensions).toBe(3);
    expect(result.stats.explicit_count).toBe(1);
    expect(result.stats.iso2768_applied_count).toBe(2);
    // d1: 6-30mm → ±0.2
    expect(result.dimensions[0].tolerance_plus_mm).toBeCloseTo(0.2, 2);
    // d2: explicit
    expect(result.dimensions[1].tolerance_plus_mm).toBeCloseTo(0.01, 3);
    // d3: 30-120mm → ±0.3
    expect(result.dimensions[2].tolerance_plus_mm).toBeCloseTo(0.3, 2);
  });

  it("all 8 ISO 2768-1 linear bands are correct for class m", () => {
    // Verify each band matches ISO 2768-1:1989 published values
    expect(ISO2768ApplicatorEngine.getLinearTolerance(2, "m")).toBeCloseTo(0.1, 2);
    expect(ISO2768ApplicatorEngine.getLinearTolerance(5, "m")).toBeCloseTo(0.1, 2);
    expect(ISO2768ApplicatorEngine.getLinearTolerance(20, "m")).toBeCloseTo(0.2, 2);
    expect(ISO2768ApplicatorEngine.getLinearTolerance(50, "m")).toBeCloseTo(0.3, 2);
    expect(ISO2768ApplicatorEngine.getLinearTolerance(200, "m")).toBeCloseTo(0.5, 2);
    expect(ISO2768ApplicatorEngine.getLinearTolerance(500, "m")).toBeCloseTo(0.8, 2);
    expect(ISO2768ApplicatorEngine.getLinearTolerance(1500, "m")).toBeCloseTo(1.2, 2);
    expect(ISO2768ApplicatorEngine.getLinearTolerance(3000, "m")).toBeCloseTo(2.0, 2);
  });

  it("static getLinearTolerance helper works", () => {
    const tol = ISO2768ApplicatorEngine.getLinearTolerance(100, "c");
    expect(tol).toBeCloseTo(0.8, 2); // 30-120mm, class c
  });

  it("static getAngularTolerance helper works", () => {
    const tol = ISO2768ApplicatorEngine.getAngularTolerance(30, "m");
    // 10-50mm, ISO 2768-1:1989 class m → ±30 minutes = 0.5°
    expect(tol).toBeCloseTo(30 / 60, 2);
  });
});
