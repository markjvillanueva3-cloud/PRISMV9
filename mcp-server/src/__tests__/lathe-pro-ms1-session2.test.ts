/**
 * LATHE-PRO-MS-1 Session 2 Tests — CAD Import, Stock Selection, Ambiguity Resolution
 *
 * U-LPI04: TurningCADImportEngine — STEP/IGES → turning profile
 * U-LPI05: StockSelectionEngine — optimal bar stock selection
 * U-LPI06: AmbiguityResolutionEngine — gap detection + default application
 */
import { describe, it, expect } from "vitest";
import { turningCADImportEngine } from "../engines/TurningCADImportEngine.js";
import type { CADSolidInput, CADFace, CADEdge } from "../engines/TurningCADImportEngine.js";
import { stockSelectionEngine } from "../engines/StockSelectionEngine.js";
import { ambiguityResolutionEngine } from "../engines/AmbiguityResolutionEngine.js";
import type { TurningFeature } from "../engines/TurningPrintToProgramEngine.js";

// ============================================================================
// HELPERS — Build synthetic CAD geometry
// ============================================================================

/** Build a simple shaft: one cylindrical face + two planar end faces */
function buildShaftSolid(od_mm: number, length_mm: number): CADSolidInput {
  const radius = od_mm / 2;
  const cylArea = Math.PI * od_mm * length_mm; // πDL
  const endArea = Math.PI * radius * radius;   // πr²

  const faces: CADFace[] = [
    {
      id: "F1", type: "cylindrical",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
      radius_mm: radius, area_mm2: cylArea,
      sense: "outward", edge_ids: ["E1", "E2"],
    },
    {
      id: "F2", type: "planar",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
      area_mm2: endArea, sense: "outward", edge_ids: ["E1"],
    },
    {
      id: "F3", type: "planar",
      axis: { origin: { x: 0, y: 0, z: length_mm }, direction: { x: 0, y: 0, z: 1 } },
      area_mm2: endArea, sense: "outward", edge_ids: ["E2"],
    },
  ];

  const edges: CADEdge[] = [
    {
      id: "E1", type: "circle",
      start: { x: radius, y: 0, z: 0 }, end: { x: radius, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 }, radius_mm: radius,
      face_ids: ["F1", "F2"],
    },
    {
      id: "E2", type: "circle",
      start: { x: radius, y: 0, z: length_mm }, end: { x: radius, y: 0, z: length_mm },
      center: { x: 0, y: 0, z: length_mm }, radius_mm: radius,
      face_ids: ["F1", "F3"],
    },
  ];

  return {
    source_format: "step",
    faces, edges, vertices: [],
    bounding_box: {
      min: { x: -radius, y: -radius, z: 0 },
      max: { x: radius, y: radius, z: length_mm },
    },
  };
}

/** Build a stepped shaft: two diameters */
function buildSteppedShaft(
  od1: number, len1: number,
  od2: number, len2: number,
): CADSolidInput {
  const r1 = od1 / 2, r2 = od2 / 2;

  const faces: CADFace[] = [
    {
      id: "F1", type: "cylindrical",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
      radius_mm: r1, area_mm2: Math.PI * od1 * len1,
      sense: "outward", edge_ids: ["E1", "E2"],
    },
    {
      id: "F2", type: "cylindrical",
      axis: { origin: { x: 0, y: 0, z: len1 }, direction: { x: 0, y: 0, z: 1 } },
      radius_mm: r2, area_mm2: Math.PI * od2 * len2,
      sense: "outward", edge_ids: ["E3", "E4"],
    },
    // Step face (shoulder)
    {
      id: "F3", type: "planar",
      axis: { origin: { x: 0, y: 0, z: len1 }, direction: { x: 0, y: 0, z: 1 } },
      area_mm2: Math.PI * (r1 * r1 - r2 * r2),
      sense: "outward", edge_ids: ["E2", "E3"],
    },
    // End faces
    {
      id: "F4", type: "planar",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
      area_mm2: Math.PI * r1 * r1,
      sense: "outward", edge_ids: ["E1"],
    },
    {
      id: "F5", type: "planar",
      axis: { origin: { x: 0, y: 0, z: len1 + len2 }, direction: { x: 0, y: 0, z: 1 } },
      area_mm2: Math.PI * r2 * r2,
      sense: "outward", edge_ids: ["E4"],
    },
  ];

  const edges: CADEdge[] = [
    { id: "E1", type: "circle", start: { x: r1, y: 0, z: 0 }, end: { x: r1, y: 0, z: 0 }, center: { x: 0, y: 0, z: 0 }, radius_mm: r1, face_ids: ["F1", "F4"] },
    { id: "E2", type: "circle", start: { x: r1, y: 0, z: len1 }, end: { x: r1, y: 0, z: len1 }, center: { x: 0, y: 0, z: len1 }, radius_mm: r1, face_ids: ["F1", "F3"] },
    { id: "E3", type: "circle", start: { x: r2, y: 0, z: len1 }, end: { x: r2, y: 0, z: len1 }, center: { x: 0, y: 0, z: len1 }, radius_mm: r2, face_ids: ["F2", "F3"] },
    { id: "E4", type: "circle", start: { x: r2, y: 0, z: len1 + len2 }, end: { x: r2, y: 0, z: len1 + len2 }, center: { x: 0, y: 0, z: len1 + len2 }, radius_mm: r2, face_ids: ["F2", "F5"] },
  ];

  return {
    source_format: "step",
    faces, edges, vertices: [],
    bounding_box: {
      min: { x: -r1, y: -r1, z: 0 },
      max: { x: r1, y: r1, z: len1 + len2 },
    },
  };
}

/** Build a shaft with a through-bore */
function buildBoredShaft(od_mm: number, bore_id_mm: number, length_mm: number): CADSolidInput {
  const rOD = od_mm / 2, rID = bore_id_mm / 2;

  const faces: CADFace[] = [
    {
      id: "F1", type: "cylindrical",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
      radius_mm: rOD, area_mm2: Math.PI * od_mm * length_mm,
      sense: "outward", edge_ids: ["E1", "E2"],
    },
    {
      id: "F2", type: "cylindrical",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
      radius_mm: rID, area_mm2: Math.PI * bore_id_mm * length_mm,
      sense: "inward", edge_ids: ["E3", "E4"],
    },
    // End faces (annular)
    {
      id: "F3", type: "planar",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
      area_mm2: Math.PI * (rOD * rOD - rID * rID),
      sense: "outward", edge_ids: ["E1", "E3"],
    },
    {
      id: "F4", type: "planar",
      axis: { origin: { x: 0, y: 0, z: length_mm }, direction: { x: 0, y: 0, z: 1 } },
      area_mm2: Math.PI * (rOD * rOD - rID * rID),
      sense: "outward", edge_ids: ["E2", "E4"],
    },
  ];

  const edges: CADEdge[] = [
    { id: "E1", type: "circle", start: { x: rOD, y: 0, z: 0 }, end: { x: rOD, y: 0, z: 0 }, center: { x: 0, y: 0, z: 0 }, radius_mm: rOD, face_ids: ["F1", "F3"] },
    { id: "E2", type: "circle", start: { x: rOD, y: 0, z: length_mm }, end: { x: rOD, y: 0, z: length_mm }, center: { x: 0, y: 0, z: length_mm }, radius_mm: rOD, face_ids: ["F1", "F4"] },
    { id: "E3", type: "circle", start: { x: rID, y: 0, z: 0 }, end: { x: rID, y: 0, z: 0 }, center: { x: 0, y: 0, z: 0 }, radius_mm: rID, face_ids: ["F2", "F3"] },
    { id: "E4", type: "circle", start: { x: rID, y: 0, z: length_mm }, end: { x: rID, y: 0, z: length_mm }, center: { x: 0, y: 0, z: length_mm }, radius_mm: rID, face_ids: ["F2", "F4"] },
  ];

  return {
    source_format: "step",
    faces, edges, vertices: [],
    bounding_box: {
      min: { x: -rOD, y: -rOD, z: 0 },
      max: { x: rOD, y: rOD, z: length_mm },
    },
  };
}

/** Build a tapered shaft (conical) */
function buildTaperedShaft(od1: number, od2: number, length: number): CADSolidInput {
  const r1 = od1 / 2, r2 = od2 / 2;
  const halfAngle = Math.atan2(Math.abs(r1 - r2), length) * 180 / Math.PI;

  const faces: CADFace[] = [
    {
      id: "F1", type: "conical",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
      half_angle_deg: halfAngle,
      area_mm2: Math.PI * (r1 + r2) * Math.sqrt((r1 - r2) ** 2 + length ** 2),
      sense: "outward", edge_ids: ["E1", "E2"],
    },
    {
      id: "F2", type: "planar",
      axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
      area_mm2: Math.PI * r1 * r1,
      sense: "outward", edge_ids: ["E1"],
    },
    {
      id: "F3", type: "planar",
      axis: { origin: { x: 0, y: 0, z: length }, direction: { x: 0, y: 0, z: 1 } },
      area_mm2: Math.PI * r2 * r2,
      sense: "outward", edge_ids: ["E2"],
    },
  ];

  const edges: CADEdge[] = [
    { id: "E1", type: "circle", start: { x: r1, y: 0, z: 0 }, end: { x: r1, y: 0, z: 0 }, center: { x: 0, y: 0, z: 0 }, radius_mm: r1, face_ids: ["F1", "F2"] },
    { id: "E2", type: "circle", start: { x: r2, y: 0, z: length }, end: { x: r2, y: 0, z: length }, center: { x: 0, y: 0, z: length }, radius_mm: r2, face_ids: ["F1", "F3"] },
  ];

  return {
    source_format: "step",
    faces, edges, vertices: [],
    bounding_box: {
      min: { x: -Math.max(r1, r2), y: -Math.max(r1, r2), z: 0 },
      max: { x: Math.max(r1, r2), y: Math.max(r1, r2), z: length },
    },
  };
}

// ============================================================================
// U-LPI04: TurningCADImportEngine
// ============================================================================

describe("TurningCADImportEngine", () => {

  describe("axis detection", () => {
    it("detects Z-axis from simple cylinder", () => {
      const solid = buildShaftSolid(50, 100);
      const result = turningCADImportEngine.importSolid(solid);
      expect(result.success).toBe(true);
      expect(result.axis_confidence).toBeGreaterThanOrEqual(0.5);
      // Axis should be along Z
      expect(Math.abs(result.revolution_axis.direction.z)).toBeGreaterThan(0.99);
    });

    it("detects axis from conical face when no cylinders", () => {
      const solid = buildTaperedShaft(40, 20, 80);
      const result = turningCADImportEngine.importSolid(solid);
      expect(result.success).toBe(true);
      expect(result.axis_confidence).toBeGreaterThanOrEqual(0.5);
    });

    it("falls back to Z-axis with low confidence when no rotational faces", () => {
      const solid: CADSolidInput = {
        source_format: "step",
        faces: [
          { id: "F1", type: "planar", area_mm2: 100, sense: "outward", edge_ids: [] },
        ],
        edges: [], vertices: [],
        bounding_box: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } },
      };
      const result = turningCADImportEngine.importSolid(solid);
      expect(result.axis_confidence).toBeLessThan(0.5);
    });
  });

  describe("profile extraction", () => {
    it("extracts OD profile from simple shaft", () => {
      const solid = buildShaftSolid(50, 100);
      const result = turningCADImportEngine.importSolid(solid);
      expect(result.od_profile.length).toBeGreaterThan(0);
      expect(result.envelope.max_od_mm).toBeCloseTo(50, 0);
    });

    it("extracts ID profile from bored shaft", () => {
      const solid = buildBoredShaft(60, 20, 100);
      const result = turningCADImportEngine.importSolid(solid);
      expect(result.od_profile.length).toBeGreaterThan(0);
      expect(result.id_profile.length).toBeGreaterThan(0);
      expect(result.envelope.max_od_mm).toBeCloseTo(60, 0);
    });

    it("extracts stepped profile with two diameters", () => {
      const solid = buildSteppedShaft(50, 40, 30, 60);
      const result = turningCADImportEngine.importSolid(solid);
      expect(result.success).toBe(true);
      expect(result.envelope.max_od_mm).toBeCloseTo(50, 0);
      expect(result.envelope.total_length_mm).toBeCloseTo(100, 0);
    });
  });

  describe("feature classification", () => {
    it("identifies OD features from simple shaft", () => {
      const solid = buildShaftSolid(50, 100);
      const result = turningCADImportEngine.importSolid(solid);
      const odFeatures = result.features.filter(f => f.type.startsWith("od") || f.type === "face");
      expect(odFeatures.length).toBeGreaterThan(0);
    });

    it("identifies bore features from bored shaft", () => {
      const solid = buildBoredShaft(60, 20, 100);
      const result = turningCADImportEngine.importSolid(solid);
      const boreFeatures = result.features.filter(f => f.type.startsWith("id"));
      expect(boreFeatures.length).toBeGreaterThan(0);
    });

    it("applies thread annotations from PMI", () => {
      const solid = buildShaftSolid(12, 30);
      solid.thread_annotations = [{
        face_id: "F1",
        callout: "M12x1.75",
        pitch_mm: 1.75,
        is_internal: false,
      }];
      const result = turningCADImportEngine.importSolid(solid);
      const threadFeatures = result.features.filter(f => f.type.includes("thread"));
      expect(threadFeatures.length).toBeGreaterThanOrEqual(1);
      expect(threadFeatures[0].thread_pitch_mm).toBe(1.75);
    });
  });

  describe("non-axisymmetric features", () => {
    it("flags cross-hole as non-axisymmetric", () => {
      const solid = buildShaftSolid(50, 100);
      // Add a cylindrical face NOT on the Z-axis (cross-hole)
      solid.faces.push({
        id: "CROSS1", type: "cylindrical",
        axis: { origin: { x: 0, y: 0, z: 50 }, direction: { x: 1, y: 0, z: 0 } },
        radius_mm: 3, area_mm2: 50,
        sense: "inward", edge_ids: [],
      });
      const result = turningCADImportEngine.importSolid(solid);
      expect(result.non_axi_features.length).toBeGreaterThanOrEqual(1);
      expect(result.non_axi_features[0].type).toBe("cross_hole");
      expect(result.warnings.some(w => w.includes("non-axisymmetric"))).toBe(true);
    });
  });

  describe("unit conversion", () => {
    it("converts imperial input to mm", () => {
      // 2" diameter × 4" length shaft
      const solid = buildShaftSolid(2, 4);
      solid.units = "in";
      const result = turningCADImportEngine.importSolid(solid);
      // 2 inches = 50.8mm diameter
      expect(result.envelope.max_od_mm).toBeCloseTo(50.8, 0);
    });
  });
});

// ============================================================================
// U-LPI05: StockSelectionEngine
// ============================================================================

describe("StockSelectionEngine", () => {

  describe("metric round bar selection", () => {
    it("selects Ø50mm stock for Ø48mm part", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 48,
        part_length_mm: 100,
        iso_group: "P",
      });
      expect(result.success).toBe(true);
      expect(result.recommended).not.toBeNull();
      expect(result.recommended!.od_mm).toBe(50);
      expect(result.recommended!.shape).toBe("round");
    });

    it("selects Ø25mm stock for Ø22mm part", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 22,
        part_length_mm: 50,
      });
      expect(result.success).toBe(true);
      expect(result.recommended!.od_mm).toBeGreaterThanOrEqual(24); // 22 + 2mm min allowance
    });

    it("computes correct bar length (part + facing + cutoff + grip)", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 30,
        part_length_mm: 80,
        cutoff_width_mm: 3,
        grip_length_mm: 25,
        facing_allowance_mm: 1,
      });
      expect(result.recommended).not.toBeNull();
      // 80 + 1×2 + 3 + 25 = 110mm
      expect(result.recommended!.bar_length_1pc_mm).toBeCloseTo(110, 0);
    });
  });

  describe("imperial stock", () => {
    it("selects imperial stock when preferred", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 24,
        part_length_mm: 50,
        preferred_units: "imperial",
      });
      expect(result.success).toBe(true);
      expect(result.recommended!.unit_system).toBe("imperial");
      expect(result.recommended!.catalog_value).toContain("\"");
    });
  });

  describe("tube stock", () => {
    it("considers tube stock when bore is close to tube ID", () => {
      // Tube [30, 5] has ID=20. Bore=22 → tubeID(20) ≤ boreID-2(20). Passes.
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 28,
        part_length_mm: 60,
        min_bore_id_mm: 22,
        preferred_shape: "tube",
      });
      expect(result.success).toBe(true);
      const tubeCandidates = result.candidates.filter(c => c.shape === "tube");
      expect(tubeCandidates.length).toBeGreaterThan(0);
      expect(tubeCandidates[0].id_mm).toBeGreaterThan(0);
    });
  });

  describe("hex stock", () => {
    it("selects hex stock when preferred", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 40,
        preferred_shape: "hex",
      });
      expect(result.success).toBe(true);
      const hexCandidates = result.candidates.filter(c => c.shape === "hex");
      expect(hexCandidates.length).toBeGreaterThan(0);
    });
  });

  describe("weight calculation", () => {
    it("computes weight for steel stock", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 50,
        part_length_mm: 100,
        iso_group: "P",
      });
      expect(result.recommended).not.toBeNull();
      expect(result.recommended!.weight_1pc_kg).toBeGreaterThan(0);
      // Ø50mm steel bar, ~110mm long ≈ 0.17kg
      expect(result.recommended!.weight_1pc_kg).toBeLessThan(5);
    });

    it("aluminum is lighter than steel", () => {
      const steel = stockSelectionEngine.select({ max_finished_od_mm: 50, part_length_mm: 100, iso_group: "P" });
      const aluminum = stockSelectionEngine.select({ max_finished_od_mm: 50, part_length_mm: 100, iso_group: "N" });
      expect(aluminum.recommended!.weight_1pc_kg).toBeLessThan(steel.recommended!.weight_1pc_kg);
    });
  });

  describe("remnant calculation", () => {
    it("computes remnant percentage", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 48,
        part_length_mm: 100,
      });
      expect(result.recommended!.remnant_pct).toBeGreaterThan(0);
      expect(result.recommended!.remnant_pct).toBeLessThan(100);
    });
  });

  describe("machine constraints", () => {
    it("respects bar feeder max OD", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 60,
        part_length_mm: 100,
        bar_feeder_max_od_mm: 65,
      });
      expect(result.success).toBe(true);
      expect(result.recommended!.od_mm).toBeLessThanOrEqual(65);
    });

    it("warns when part exceeds bar feeder", () => {
      const result = stockSelectionEngine.select({
        max_finished_od_mm: 100,
        part_length_mm: 100,
        bar_feeder_max_od_mm: 65,
      });
      expect(result.warnings.some(w => w.includes("bar feeder"))).toBe(true);
    });
  });

  describe("parts per bar", () => {
    it("calculates parts per standard bar lengths", () => {
      const ppb = stockSelectionEngine.partsPerBar(80, 3, 25, 1);
      expect(ppb.length).toBe(4);
      // 1000mm bar: (1000-25) / (80+2+3) ≈ 11 parts
      const oneM = ppb.find(p => p.bar_length_mm === 1000);
      expect(oneM).toBeDefined();
      expect(oneM!.parts_count).toBeGreaterThan(5);
      expect(oneM!.utilization_pct).toBeGreaterThan(50);
    });
  });

  describe("edge cases", () => {
    it("rejects zero OD", () => {
      const result = stockSelectionEngine.select({ max_finished_od_mm: 0, part_length_mm: 100 });
      expect(result.success).toBe(false);
    });

    it("handles very large part", () => {
      const result = stockSelectionEngine.select({ max_finished_od_mm: 280, part_length_mm: 500 });
      expect(result.success).toBe(true);
      expect(result.recommended!.od_mm).toBeGreaterThanOrEqual(282);
    });
  });
});

// ============================================================================
// U-LPI06: AmbiguityResolutionEngine
// ============================================================================

describe("AmbiguityResolutionEngine", () => {

  const baseFeatures: TurningFeature[] = [
    { id: "F1", type: "od_straight", od_mm: 50, length_mm: 40 },
    { id: "F2", type: "od_straight", od_mm: 30, length_mm: 60, position_z_mm: 40 },
    { id: "F3", type: "id_bore", id_mm: 15, length_mm: 30 },
  ];

  describe("missing material detection", () => {
    it("flags missing material as critical", () => {
      const result = ambiguityResolutionEngine.resolve({
        features: [...baseFeatures],
        has_material: false,
        has_general_tolerance: true,
        has_gdt: false,
        has_default_surface_finish: true,
        default_ra_um: 3.2,
      });
      const matAmb = result.ambiguities.find(a => a.type === "missing_material");
      expect(matAmb).toBeDefined();
      expect(matAmb!.severity).toBe("critical");
      expect(matAmb!.can_proceed).toBe(false);
      expect(matAmb!.user_question).toBeDefined();
      expect(matAmb!.options!.length).toBeGreaterThan(3);
    });

    it("does not flag material when present", () => {
      const result = ambiguityResolutionEngine.resolve({
        features: [...baseFeatures],
        has_material: true,
        material_callout: "4140",
        has_general_tolerance: true,
        has_gdt: false,
        has_default_surface_finish: true,
      });
      expect(result.ambiguities.find(a => a.type === "missing_material")).toBeUndefined();
    });
  });

  describe("tolerance defaults", () => {
    it("applies ISO 2768-m defaults to un-toleranced features", () => {
      const features: TurningFeature[] = [
        { id: "T1", type: "od_straight", od_mm: 50, length_mm: 40 },
      ];
      const result = ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: false,
        has_gdt: false,
        has_default_surface_finish: true,
      });
      // Should have applied tolerance default
      expect(features[0].tolerance_mm).toBeDefined();
      expect(features[0].tolerance_mm).toBeGreaterThan(0);
      // ISO 2768-m for 50mm nominal = ±0.30mm → 0.3
      expect(features[0].tolerance_mm).toBeCloseTo(0.3, 1);
    });

    it("applies ISO 2768-f class when specified", () => {
      const features: TurningFeature[] = [
        { id: "T1", type: "od_straight", od_mm: 50, length_mm: 40 },
      ];
      ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: true,
        general_tolerance_class: "f",
        has_gdt: false,
        has_default_surface_finish: true,
      });
      // ISO 2768-f for 50mm = ±0.10mm (30<50≤120 band)
      expect(features[0].tolerance_mm).toBeCloseTo(0.15, 2);
    });

    it("does not overwrite existing tolerance", () => {
      const features: TurningFeature[] = [
        { id: "T1", type: "od_straight", od_mm: 50, length_mm: 40, tolerance_mm: 0.01 },
      ];
      ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: true,
        has_gdt: false,
        has_default_surface_finish: true,
      });
      expect(features[0].tolerance_mm).toBe(0.01);
    });
  });

  describe("surface finish defaults", () => {
    it("applies Ra 3.2μm default when no drawing-level finish", () => {
      const features: TurningFeature[] = [
        { id: "S1", type: "od_straight", od_mm: 30, length_mm: 50 },
      ];
      const result = ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: true,
        has_gdt: false,
        has_default_surface_finish: false,
      });
      expect(features[0].surface_finish_Ra_um).toBe(3.2);
      expect(result.ambiguities.find(a => a.type === "missing_surface_finish")).toBeDefined();
    });
  });

  describe("thread ambiguity", () => {
    it("flags thread without pitch as critical", () => {
      const features: TurningFeature[] = [
        { id: "THR1", type: "thread_od", od_mm: 12, length_mm: 20 },
      ];
      const result = ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: true,
        has_gdt: false,
        has_default_surface_finish: true,
      });
      const threadAmb = result.ambiguities.find(a => a.type === "incomplete_thread");
      expect(threadAmb).toBeDefined();
      expect(threadAmb!.severity).toBe("critical");
      expect(threadAmb!.can_proceed).toBe(false);
      expect(threadAmb!.options!.length).toBeGreaterThan(5);
    });
  });

  describe("groove ambiguity", () => {
    it("applies 3mm default groove width", () => {
      const features: TurningFeature[] = [
        { id: "G1", type: "groove_od", od_mm: 40, length_mm: 5, groove_depth_mm: 3 },
      ];
      ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: true,
        has_gdt: false,
        has_default_surface_finish: true,
      });
      expect(features[0].groove_width_mm).toBe(3);
    });
  });

  describe("geometry warnings", () => {
    it("flags high L/D ratio", () => {
      const result = ambiguityResolutionEngine.resolve({
        features: [{ id: "F1", type: "od_straight", od_mm: 10, length_mm: 200 }],
        has_material: true,
        has_general_tolerance: true,
        has_gdt: false,
        has_default_surface_finish: true,
        part_max_od_mm: 10,
        part_total_length_mm: 200,
      });
      const ldAmb = result.ambiguities.find(a => a.description.includes("L/D"));
      expect(ldAmb).toBeDefined();
      expect(ldAmb!.description).toContain("slender");
    });

    it("flags thin wall", () => {
      const features: TurningFeature[] = [
        { id: "F1", type: "id_bore", id_mm: 48, length_mm: 50 },
      ];
      const result = ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: true,
        has_gdt: false,
        has_default_surface_finish: true,
        part_max_od_mm: 50,
        part_total_length_mm: 50,
      });
      const wallAmb = result.ambiguities.find(a => a.description.includes("wall"));
      expect(wallAmb).toBeDefined();
    });
  });

  describe("confidence scoring", () => {
    it("gives high confidence for fully specified drawing", () => {
      const features: TurningFeature[] = [
        { id: "F1", type: "od_straight", od_mm: 50, length_mm: 40, tolerance_mm: 0.05, surface_finish_Ra_um: 1.6 },
      ];
      const result = ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: true,
        has_gdt: true,
        part_number: "PART-001",
        has_default_surface_finish: true,
        default_ra_um: 3.2,
      });
      expect(result.overall_confidence).toBeGreaterThanOrEqual(80);
    });

    it("gives low confidence when material and threads missing", () => {
      const features: TurningFeature[] = [
        { id: "THR1", type: "thread_od", od_mm: 12, length_mm: 20 },
      ];
      const result = ambiguityResolutionEngine.resolve({
        features,
        has_material: false,
        has_general_tolerance: false,
        has_gdt: false,
        has_default_surface_finish: false,
      });
      expect(result.overall_confidence).toBeLessThan(50);
      expect(result.must_ask_count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("user summary", () => {
    it("generates human-readable summary", () => {
      const result = ambiguityResolutionEngine.resolve({
        features: [...baseFeatures],
        has_material: false,
        has_general_tolerance: false,
        has_gdt: false,
        has_default_surface_finish: false,
      });
      expect(result.user_summary).toBeDefined();
      expect(result.user_summary.length).toBeGreaterThan(10);
    });

    it("reports no ambiguities for fully specified part", () => {
      const features: TurningFeature[] = [
        { id: "F1", type: "od_straight", od_mm: 50, length_mm: 40, tolerance_mm: 0.05, surface_finish_Ra_um: 1.6 },
      ];
      const result = ambiguityResolutionEngine.resolve({
        features,
        has_material: true,
        has_general_tolerance: true,
        has_gdt: true,
        part_number: "PART-001",
        has_default_surface_finish: true,
        default_ra_um: 3.2,
      });
      expect(result.must_ask_count).toBe(0);
    });
  });
});
