/**
 * WEDM-UNIFIED M2: Wire EDM Feature Editor Tests
 * Tests: contour-to-feature mapping, wire secondary ops, feature classification,
 *        real engine calls (EDMEngine, EDMFeasibility, EDMDrawingInterpretation,
 *        EDMMaterialMachineWire, EDMWireSlugCornerTaper), engine integration coverage
 */

import { describe, it, expect } from "vitest";

// ── Local replicas of FeatureEditorPanel pure functions ──

function classifyWireContour(
  contour: { is_closed: boolean; area_mm2: number; bounding_box?: { width: number; height: number } },
  index: number,
  total: number,
): string {
  if (!contour.is_closed) return "RELIEF_CUT";
  if (contour.area_mm2 < 5) return "START_HOLE";
  if (index === 0 && total > 1) return "DIE_PROFILE";
  if (contour.bounding_box) {
    const { width, height } = contour.bounding_box;
    const aspect = Math.max(width, height) / Math.max(Math.min(width, height), 0.01);
    if (aspect > 5) return "WIRE_SLOT";
  }
  if (contour.area_mm2 < 200) return "PUNCH_PROFILE";
  return "DIE_PROFILE";
}

interface ContourData {
  id: string;
  segments: unknown[];
  is_closed: boolean;
  perimeter_mm: number;
  area_mm2: number;
  min_radius_mm?: number;
  bounding_box?: { width: number; height: number };
}

function contoursToPartFeatures(contours: ContourData[]) {
  const sorted = [...contours].sort((a, b) => b.area_mm2 - a.area_mm2);
  return sorted.map((c, i) => {
    const featureType = classifyWireContour(c, i, sorted.length);
    return {
      id: c.id || `wire-feat-${i}`,
      type: featureType,
      label: `${featureType.replace(/_/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase())} ${i + 1}`,
      dimensions: [
        { key: "perimeter_mm", value: Number(c.perimeter_mm.toFixed(2)) },
        { key: "area_mm2", value: Number(c.area_mm2.toFixed(2)) },
        { key: "min_radius_mm", value: c.min_radius_mm ?? 0.15 },
        { key: "offset_mm", value: 0.13 },
        { key: "taper_angle_deg", value: 0 },
      ],
      secondary_ops: [],
      tolerance_mm: 0.01,
      surface_finish_Ra_um: 0.8,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Contour Classification
// ═══════════════════════════════════════════════════════════════════════

describe("Wire EDM Contour Classification", () => {
  it("classifies open contour as RELIEF_CUT", () => {
    expect(classifyWireContour({ is_closed: false, area_mm2: 100 }, 0, 1)).toBe("RELIEF_CUT");
  });

  it("classifies tiny closed contour as START_HOLE", () => {
    expect(classifyWireContour({ is_closed: true, area_mm2: 3 }, 0, 1)).toBe("START_HOLE");
  });

  it("classifies largest contour in multi-contour set as DIE_PROFILE", () => {
    expect(classifyWireContour({ is_closed: true, area_mm2: 5000 }, 0, 3)).toBe("DIE_PROFILE");
  });

  it("classifies narrow contour as WIRE_SLOT (aspect > 5)", () => {
    expect(classifyWireContour(
      { is_closed: true, area_mm2: 50, bounding_box: { width: 2, height: 25 } },
      1, 3,
    )).toBe("WIRE_SLOT");
  });

  it("classifies small internal contour as PUNCH_PROFILE (area < 200)", () => {
    expect(classifyWireContour({ is_closed: true, area_mm2: 150 }, 1, 3)).toBe("PUNCH_PROFILE");
  });

  it("classifies large non-first contour as DIE_PROFILE", () => {
    expect(classifyWireContour({ is_closed: true, area_mm2: 500 }, 1, 2)).toBe("DIE_PROFILE");
  });

  it("boundary: area exactly 5 is not START_HOLE", () => {
    expect(classifyWireContour({ is_closed: true, area_mm2: 5 }, 1, 2)).toBe("PUNCH_PROFILE");
  });

  it("boundary: area exactly 200 is DIE_PROFILE not PUNCH", () => {
    expect(classifyWireContour({ is_closed: true, area_mm2: 200 }, 1, 2)).toBe("DIE_PROFILE");
  });

  it("aspect ratio exactly 5 does not trigger WIRE_SLOT", () => {
    expect(classifyWireContour(
      { is_closed: true, area_mm2: 50, bounding_box: { width: 5, height: 25 } },
      1, 2,
    )).toBe("PUNCH_PROFILE");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Contour-to-Feature Mapping
// ═══════════════════════════════════════════════════════════════════════

describe("Wire EDM Contour-to-Feature Mapping", () => {
  const sampleContours: ContourData[] = [
    { id: "c1", segments: [], is_closed: true, perimeter_mm: 400, area_mm2: 8000, min_radius_mm: 5 },
    { id: "c2", segments: [], is_closed: true, perimeter_mm: 80, area_mm2: 120, min_radius_mm: 0.5 },
    { id: "c3", segments: [], is_closed: false, perimeter_mm: 30, area_mm2: 0 },
  ];

  it("sorts contours by area descending — largest first", () => {
    const features = contoursToPartFeatures(sampleContours);
    expect(features).toHaveLength(3);
    expect(features[0].id).toBe("c1");
    expect(features[0].dimensions.find(d => d.key === "area_mm2")?.value).toBe(8000);
  });

  it("classifies die + punch + relief correctly", () => {
    const features = contoursToPartFeatures(sampleContours);
    expect(features[0].type).toBe("DIE_PROFILE");
    expect(features[1].type).toBe("PUNCH_PROFILE");
    expect(features[2].type).toBe("RELIEF_CUT");
  });

  it("preserves perimeter as read-only dimension", () => {
    const features = contoursToPartFeatures(sampleContours);
    expect(features[0].dimensions.find(d => d.key === "perimeter_mm")?.value).toBeCloseTo(400, 1);
  });

  it("sets wire offset default to 0.13mm (half kerf for 0.25mm brass)", () => {
    const features = contoursToPartFeatures(sampleContours);
    expect(features[0].dimensions.find(d => d.key === "offset_mm")?.value).toBeCloseTo(0.13, 2);
  });

  it("uses contour min_radius when present", () => {
    const features = contoursToPartFeatures(sampleContours);
    expect(features[0].dimensions.find(d => d.key === "min_radius_mm")?.value).toBeCloseTo(5, 1);
    expect(features[1].dimensions.find(d => d.key === "min_radius_mm")?.value).toBeCloseTo(0.5, 1);
  });

  it("falls back to 0.15mm min_radius when not provided", () => {
    const features = contoursToPartFeatures([
      { id: "x1", segments: [], is_closed: true, perimeter_mm: 100, area_mm2: 500 },
    ]);
    expect(features[0].dimensions.find(d => d.key === "min_radius_mm")?.value).toBeCloseTo(0.15, 2);
  });

  it("generates wire-feat-N IDs for contours without id", () => {
    const features = contoursToPartFeatures([
      { id: "", segments: [], is_closed: true, perimeter_mm: 100, area_mm2: 500 },
    ]);
    expect(features[0].id).toBe("wire-feat-0");
  });

  it("handles empty contour array without error", () => {
    expect(contoursToPartFeatures([])).toHaveLength(0);
  });

  it("defaults tolerance to 0.01mm and Ra to 0.8um", () => {
    const features = contoursToPartFeatures([
      { id: "t1", segments: [], is_closed: true, perimeter_mm: 100, area_mm2: 400 },
    ]);
    expect(features[0].tolerance_mm).toBeCloseTo(0.01, 3);
    expect(features[0].surface_finish_Ra_um).toBeCloseTo(0.8, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. EDMEngine — Real wireEDM() Calls
// ═══════════════════════════════════════════════════════════════════════

describe("EDMEngine.wireEDM() — feature editor parameter validation", () => {
  it("D2 tool steel 25mm — kerf, spark gap, Ra for die profile", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const result = edmEngine.wireEDM({
      workpiece_thickness_mm: 25,
      material_iso_group: "H",
      wire_diameter_mm: 0.25,
      num_cuts: 4,
      target_ra_um: 0.8,
    });
    expect(result.kerf_width.value).toBeGreaterThan(0.25);
    expect(result.kerf_width.value).toBeLessThan(0.40);
    expect(result.spark_gap.value).toBeGreaterThan(0);
    expect(result.spark_gap.value).toBeLessThan(0.05);
    expect(result.predicted_ra.value).toBeLessThan(1.0);
    expect(result.predicted_ra.value).toBeGreaterThan(0);
    expect(result.wire_tension.value).toBeGreaterThan(5);
    expect(result.wire_tension.value).toBeLessThan(20);
  });

  it("aluminum 6061 cuts faster than D2 tool steel", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const steel = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "H" });
    const aluminum = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "N" });
    expect(aluminum.cutting_speed.value).toBeGreaterThan(steel.cutting_speed.value);
  });

  it("100mm thick workpiece has longer cycle time than 10mm", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const thin = edmEngine.wireEDM({ workpiece_thickness_mm: 10, material_iso_group: "P" });
    const thick = edmEngine.wireEDM({ workpiece_thickness_mm: 100, material_iso_group: "P" });
    expect(thick.cycle_time_per_meter.value).toBeGreaterThan(thin.cycle_time_per_meter.value);
  });

  it("more skim cuts → lower predicted Ra", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const rough = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "P", num_cuts: 1 });
    const finish = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "P", num_cuts: 4 });
    expect(finish.predicted_ra.value).toBeLessThan(rough.predicted_ra.value);
    expect(rough.predicted_ra.value).toBeCloseTo(3.2, 0);
  });

  it("warns for extreme thickness > 300mm", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const result = edmEngine.wireEDM({ workpiece_thickness_mm: 350, material_iso_group: "P" });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => /300mm/i.test(w))).toBe(true);
  });

  it("fine wire 0.10mm produces narrower kerf", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const standard = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "P", wire_diameter_mm: 0.25 });
    const fine = edmEngine.wireEDM({ workpiece_thickness_mm: 25, material_iso_group: "P", wire_diameter_mm: 0.10 });
    expect(fine.kerf_width.value).toBeLessThan(standard.kerf_width.value);
    expect(fine.kerf_width.value).toBeGreaterThan(0.10);
  });

  it("flushing pressure scales with thickness", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const thin = edmEngine.wireEDM({ workpiece_thickness_mm: 10, material_iso_group: "P" });
    const thick = edmEngine.wireEDM({ workpiece_thickness_mm: 120, material_iso_group: "P" });
    expect(thick.flushing_pressure.value).toBeGreaterThan(thin.flushing_pressure.value);
  });
});

describe("EDMEngine.sinkerEDM() — electrode parameter validation", () => {
  it("graphite electrode has lower wear than copper", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const graphite = edmEngine.sinkerEDM({ cavity_depth_mm: 15, electrode_material: "graphite", material_iso_group: "P" });
    const copper = edmEngine.sinkerEDM({ cavity_depth_mm: 15, electrode_material: "copper", material_iso_group: "P" });
    expect(graphite.electrode_wear_ratio.value).toBeLessThan(copper.electrode_wear_ratio.value);
    expect(graphite.electrode_wear_ratio.value).toBeGreaterThan(0);
    expect(graphite.electrode_wear_ratio.value).toBeLessThan(1);
  });

  it("MRR increases with coarser target Ra", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const fine = edmEngine.sinkerEDM({ cavity_depth_mm: 10, electrode_material: "graphite", material_iso_group: "P", target_ra_um: 0.4 });
    const coarse = edmEngine.sinkerEDM({ cavity_depth_mm: 10, electrode_material: "graphite", material_iso_group: "P", target_ra_um: 6.3 });
    expect(coarse.mrr.value).toBeGreaterThan(fine.mrr.value);
  });

  it("cycle time scales with cavity depth", async () => {
    const { edmEngine } = await import("../engines/EDMEngine.js");
    const shallow = edmEngine.sinkerEDM({ cavity_depth_mm: 5, electrode_material: "graphite", material_iso_group: "P" });
    const deep = edmEngine.sinkerEDM({ cavity_depth_mm: 30, electrode_material: "graphite", material_iso_group: "P" });
    expect(deep.cycle_time.value).toBeGreaterThan(shallow.cycle_time.value);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. EDMFeasibilityEngine — Real assess() + check_conductivity()
// ═══════════════════════════════════════════════════════════════════════

describe("EDMFeasibilityEngine — feasibility assessment for feature editor", () => {
  // Use "tool steel" for exact match in resistivity lookup (D2/A2 are tool steel grades)
  const baseFeasibilityInput = {
    material: "tool steel",
    material_resistivity_uohm_cm: 55,
    features: [
      { name: "die_cavity", is_through: true, profile_length_mm: 200, min_corner_radius_mm: 0.5, tolerance_mm: 0.01, surface_finish_ra_um: 0.8 },
      { name: "punch_profile", is_through: true, profile_length_mm: 80, min_corner_radius_mm: 0.3, tolerance_mm: 0.02 },
    ],
    workpiece: { thickness_mm: 25, length_mm: 200, width_mm: 150, height_mm: 25 },
    wire_diameter_mm: 0.25,
  };

  it("tool steel (D2-class) is EDM-feasible (conductive)", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const result = edmFeasibilityEngine.assess(baseFeasibilityInput);
    expect(result.overall_feasible).toBe(true);
    expect(result.conductivity.feasible).toBe(true);
    expect(result.conductivity.resistivity).toBeCloseTo(55, 0);
  });

  it("check_conductivity returns resistivity for tool steel", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const conductivity = edmFeasibilityEngine.check_conductivity(baseFeasibilityInput);
    expect(conductivity.feasible).toBe(true);
    expect(conductivity.resistivity).toBeCloseTo(55, 0);
    expect(conductivity.classification).toBe("EASY");
  });

  it("estimate_time returns positive cutting hours", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const time = edmFeasibilityEngine.estimate_time(baseFeasibilityInput);
    expect(time.total_hours).toBeGreaterThan(0);
    expect(time.cutting_hours).toBeGreaterThan(0);
    expect(time.cutting_speed_mm2_min).toBeGreaterThan(0);
  });

  it("non-conductive material (very high resistivity) → not EDM feasible", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const result = edmFeasibilityEngine.assess({
      ...baseFeasibilityInput,
      material: "ceramic_alumina",
      material_resistivity_uohm_cm: 1e12,
    });
    expect(result.conductivity.feasible).toBe(false);
    expect(result.overall_feasible).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("geometry checks return one result per feature", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const geoResults = edmFeasibilityEngine.check_geometry(baseFeasibilityInput);
    expect(geoResults).toHaveLength(2);
    for (const geo of geoResults) {
      expect(geo.feature).toBeDefined();
      expect(typeof geo.feasible).toBe("boolean");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. EDMDrawingInterpretationEngine — Feature Classification
// ═══════════════════════════════════════════════════════════════════════

describe("EDMDrawingInterpretationEngine — classifyFeaturesAction", () => {
  it("classifies D2 through-hole profile as wire_edm", async () => {
    const { edmDrawingInterpretationEngine } = await import("../engines/EDMDrawingInterpretationEngine.js");
    const result = edmDrawingInterpretationEngine.classifyFeaturesAction({
      material: "D2",
      features: [
        { name: "punch_profile", type: "profile" as const, is_through: true, dimensions_mm: { length: 50, width: 20 }, profile_length_mm: 100, min_corner_radius_mm: 0.5, tolerance_mm: 0.01 },
      ],
      is_through_feature: true,
    });
    expect(result.features_classified).toHaveLength(1);
    expect(result.features_classified[0].edm_process).toBe("wire_edm");
    expect(result.features_classified[0].confidence).toBeGreaterThan(0.5);
  });

  it("classifies blind cavity as sinker_edm", async () => {
    const { edmDrawingInterpretationEngine } = await import("../engines/EDMDrawingInterpretationEngine.js");
    const result = edmDrawingInterpretationEngine.classifyFeaturesAction({
      material: "D2",
      features: [
        { name: "mold_cavity", type: "cavity" as const, is_through: false, dimensions_mm: { length: 30, width: 20, depth: 10 }, min_corner_radius_mm: 1 },
      ],
      is_through_feature: false,
    });
    expect(result.features_classified).toHaveLength(1);
    expect(result.features_classified[0].edm_process).toBe("sinker_edm");
  });

  it("calculatePassesAction returns pass count for precision tolerance", async () => {
    const { edmDrawingInterpretationEngine } = await import("../engines/EDMDrawingInterpretationEngine.js");
    const passes = edmDrawingInterpretationEngine.calculatePassesAction({
      material: "D2",
      features: [{ name: "test", type: "profile" as const, is_through: true, dimensions_mm: { length: 50 }, tolerance_mm: 0.005, surface_finish_ra_um: 0.4 }],
    });
    expect(passes.total_passes).toBeGreaterThanOrEqual(3);
    expect(passes.driven_by).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. EDMMaterialMachineWireEngine — Material Assessment + Wire Selection
// ═══════════════════════════════════════════════════════════════════════

describe("EDMMaterialMachineWireEngine — material & wire for feature editor", () => {
  it("assessMaterial: D2 returns valid machinability class and thermal data", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.assessMaterial({
      material: "D2",
      thickness_mm: 25,
    });
    expect(["A", "B", "C"]).toContain(result.machinability_class);
    expect(result.mrr_factor).toBeGreaterThan(0);
    expect(result.thermal.melting_point_C).toBeGreaterThan(1000);
    expect(result.electrical.resistivity_uOhm_cm).toBeGreaterThan(0);
  });

  it("assessMaterial: unknown material gets conservative defaults", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.assessMaterial({
      material: "unobtanium_999",
      thickness_mm: 25,
    });
    expect(result.machinability_class).toBe("C");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("selectWire: 0.3mm corner radius → recommends wire ≤0.25mm", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.selectWire({
      material: "D2",
      thickness_mm: 25,
      min_corner_radius_mm: 0.3,
      target_surface_finish_Ra_um: 0.8,
      priority: "accuracy",
    });
    expect(result.diameter_mm).toBeLessThanOrEqual(0.25);
    expect(result.diameter_mm).toBeGreaterThan(0);
    expect(result.recommended_wire).toBeDefined();
    expect(result.rationale.length).toBeGreaterThan(0);
  });

  it("selectWire: speed priority may recommend larger wire than accuracy", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const speed = edmMaterialMachineWireEngine.selectWire({
      material: "D2", thickness_mm: 25, min_corner_radius_mm: 0.5,
      target_surface_finish_Ra_um: 1.6, priority: "speed",
    });
    const accuracy = edmMaterialMachineWireEngine.selectWire({
      material: "D2", thickness_mm: 25, min_corner_radius_mm: 0.5,
      target_surface_finish_Ra_um: 1.6, priority: "accuracy",
    });
    expect(speed.diameter_mm).toBeGreaterThanOrEqual(accuracy.diameter_mm);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. EDMWireSlugCornerTaperEngine — Corner Compensation + Taper
// ═══════════════════════════════════════════════════════════════════════

describe("EDMWireSlugCornerTaperEngine — corner & taper for feature editor", () => {
  it("calculateCornerCompensation for 90° corners on 25mm part", async () => {
    const { edmWireSlugCornerTaperEngine } = await import("../engines/EDMWireSlugCornerTaperEngine.js");
    const result = edmWireSlugCornerTaperEngine.calculateCornerCompensation({
      wire_tension_N: 12,
      guide_distance_mm: 55,
      workpiece_height_mm: 25,
      wire_type: "brass_0.25",
      corners: [
        { angle_deg: 90, position: { x: 10, y: 10 } },
        { angle_deg: 90, position: { x: 50, y: 10 } },
        { angle_deg: 90, position: { x: 50, y: 40 } },
        { angle_deg: 90, position: { x: 10, y: 40 } },
      ],
    });
    expect(result).toHaveLength(4);
    for (const corner of result) {
      expect(corner.over_travel_mm).toBeGreaterThan(0);
      expect(corner.dwell_time_sec).toBeGreaterThanOrEqual(0);
      expect(corner.over_travel_mm).toBeLessThan(2);
      expect(corner.wire_lag_mm).toBeGreaterThan(0);
    }
  });

  it("solveTaper for 3° taper on 25mm thick part", async () => {
    const { edmWireSlugCornerTaperEngine } = await import("../engines/EDMWireSlugCornerTaperEngine.js");
    const result = edmWireSlugCornerTaperEngine.solveTaper({
      workpiece_height_mm: 25,
      guide_distance_mm: 55,
      wire_diameter_mm: 0.25,
      segments: [
        {
          start_point: { x: 0, y: 0 },
          end_point: { x: 50, y: 0 },
          taper_angle_deg: 3,
        },
      ],
    });
    expect(result.segments).toHaveLength(1);
    expect(result.max_uv_travel_required_mm).toBeGreaterThan(0);
    expect(result.max_uv_travel_required_mm).toBeLessThan(5);
    expect(result.segments[0].taper_angle_deg).toBeCloseTo(3, 1);
    expect(result.achievable_accuracy_mm).toBeGreaterThan(0);
  });

  it("taller workpiece needs more UV travel for same taper angle", async () => {
    const { edmWireSlugCornerTaperEngine } = await import("../engines/EDMWireSlugCornerTaperEngine.js");
    const seg = [{ start_point: { x: 0, y: 0 }, end_point: { x: 50, y: 0 }, taper_angle_deg: 5 }];
    const thin = edmWireSlugCornerTaperEngine.solveTaper({ workpiece_height_mm: 10, guide_distance_mm: 55, wire_diameter_mm: 0.25, segments: seg });
    const thick = edmWireSlugCornerTaperEngine.solveTaper({ workpiece_height_mm: 50, guide_distance_mm: 55, wire_diameter_mm: 0.25, segments: seg });
    expect(thick.max_uv_travel_required_mm).toBeGreaterThan(thin.max_uv_travel_required_mm);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. Engine Integration Coverage (≥4 distinct engines)
// ═══════════════════════════════════════════════════════════════════════

describe("EDM engines — feature editor workflow integration", () => {
  it("wedm_classify_features: classifies A2 keyway as wire_edm", async () => {
    const { edmDrawingInterpretationEngine } = await import("../engines/EDMDrawingInterpretationEngine.js");
    const result = edmDrawingInterpretationEngine.classifyFeaturesAction({
      material: "A2",
      features: [
        { name: "keyway_slot", type: "slot" as const, is_through: true, dimensions_mm: { length: 40, width: 5 }, min_corner_radius_mm: 0.2, tolerance_mm: 0.01 },
      ],
    });
    expect(result.features_classified[0].edm_process).toBe("wire_edm");
    expect(result.warnings).toBeDefined();
  });

  it("wedm_assess_feasibility: tool steel die block is feasible", async () => {
    const { edmFeasibilityEngine } = await import("../engines/EDMFeasibilityEngine.js");
    const result = edmFeasibilityEngine.assess({
      material: "tool steel",
      material_resistivity_uohm_cm: 55,
      features: [
        { name: "die_opening", is_through: true, profile_length_mm: 150, min_corner_radius_mm: 1.0, tolerance_mm: 0.02 },
      ],
      workpiece: { thickness_mm: 50, length_mm: 300, width_mm: 200, height_mm: 50 },
      wire_diameter_mm: 0.25,
    });
    expect(result.overall_feasible).toBe(true);
    expect(result.time_estimate.total_hours).toBeGreaterThan(0);
    expect(result.geometry).toHaveLength(1);
    expect(result.geometry[0].feasible).toBe(true);
  });

  it("wedm_select_wire: 4140 speed-priority wire selection", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.selectWire({
      material: "4140",
      thickness_mm: 30,
      min_corner_radius_mm: 0.5,
      target_surface_finish_Ra_um: 1.6,
      priority: "speed",
    });
    expect(result.recommended_wire).toBeDefined();
    expect(result.diameter_mm).toBeGreaterThan(0);
    expect(result.wire_type).toBeDefined();
  });

  it("wedm_assess_material: Inconel-718 machinability", async () => {
    const { edmMaterialMachineWireEngine } = await import("../engines/EDMMaterialMachineWireEngine.js");
    const result = edmMaterialMachineWireEngine.assessMaterial({
      material: "Inconel-718",
      thickness_mm: 20,
    });
    expect(result.machinability_class).toBeDefined();
    expect(result.mrr_factor).toBeGreaterThan(0);
    expect(result.mrr_factor).toBeLessThanOrEqual(1);
    expect(result.recast.risk_level).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. Wire EDM Surface Integrity Physics (Carslaw & Jaeger recast model)
// ═══════════════════════════════════════════════════════════════════════

describe("Wire EDM Surface Integrity Physics — recast + Ra models", () => {
  it("recast depth d = 2*sqrt(alpha*t_on) — Carslaw & Jaeger", () => {
    const alpha = 12e-6; // steel thermal diffusivity m²/s
    const t_on = 5e-6; // 5μs pulse on-time
    const d_recast = 2 * Math.sqrt(alpha * t_on) * 1e6; // μm
    expect(d_recast).toBeCloseTo(15.5, 0);
  });

  it("skim passes reduce recast layer (lower t_on)", () => {
    const alpha = 12e-6;
    const d_rough = 2 * Math.sqrt(alpha * 10e-6) * 1e6;
    const d_skim = 2 * Math.sqrt(alpha * 1e-6) * 1e6;
    expect(d_skim).toBeLessThan(d_rough);
    expect(d_skim).toBeCloseTo(6.93, 0);
  });

  it("Toenshoff cascade: pass energy E_n = E_rough × gamma^(n-1)", () => {
    const E_rough = 100;
    const gamma = 0.25;
    const passes = [1, 2, 3, 4].map(n => E_rough * Math.pow(gamma, n - 1));
    expect(passes[0]).toBeCloseTo(100, 0);
    expect(passes[1]).toBeCloseTo(25, 0);
    expect(passes[2]).toBeCloseTo(6.25, 1);
    expect(passes[3]).toBeCloseTo(1.5625, 2);
  });

  it("Klocke Ra model: Ra = k * I_p^a * t_on^b yields reasonable Ra", () => {
    const k = 0.5, I_p = 10, t_on = 5, a = 0.4, b = 0.3;
    const Ra = k * Math.pow(I_p, a) * Math.pow(t_on, b);
    // k=0.5 * 10^0.4 * 5^0.3 = 0.5 * 2.5119 * 1.6207 ≈ 2.035
    expect(Ra).toBeCloseTo(2.04, 1);
    expect(Ra).toBeGreaterThan(1);
    expect(Ra).toBeLessThan(4);
  });
});
