import { describe, it, expect } from "vitest";
import { STEPGeometryParserEngine } from "../engines/STEPGeometryParserEngine.js";

const engine = new STEPGeometryParserEngine();

// Synthetic STEP fragments — minimal but real ISO 10303-21 syntax.
// Each fixture exercises one entity-type counting path.

const STEP_HEADER = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('STEP test fixture'),'2;1');
FILE_NAME('test.step','2026-05-06T12:00:00',('PRISM'),('PRISM'),'STEP AP214','PRISM','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));
ENDSEC;
DATA;
`;

const STEP_FOOTER = `ENDSEC;
END-ISO-10303-21;
`;

function buildStep(body: string): string {
  return STEP_HEADER + body + STEP_FOOTER;
}

describe("STEPGeometryParserEngine.countEntities", () => {
  it("counts CYLINDRICAL_SURFACE instances correctly", () => {
    const step = buildStep(`
#1 = CYLINDRICAL_SURFACE('cyl1', #100, 5.0);
#2 = CYLINDRICAL_SURFACE('cyl2', #101, 10.0);
#3 = CYLINDRICAL_SURFACE('cyl3', #102, 15.0);
`);
    const counts = engine.countEntities(step);
    expect(counts.cylindrical_surface).toBe(3);
  });

  it("counts CONICAL_SURFACE (chamfers/tapers)", () => {
    const step = buildStep(`
#1 = CONICAL_SURFACE('chamfer', #100, 1.0, 0.785);
#2 = CONICAL_SURFACE('taper', #101, 5.0, 0.0349);
`);
    const counts = engine.countEntities(step);
    expect(counts.conical_surface).toBe(2);
  });

  it("counts TOROIDAL_SURFACE (fillets)", () => {
    const step = buildStep(`
#1 = TOROIDAL_SURFACE('fillet1', #100, 5.0, 0.5);
#2 = TOROIDAL_SURFACE('fillet2', #101, 5.0, 1.0);
#3 = TOROIDAL_SURFACE('fillet3', #102, 5.0, 0.25);
#4 = TOROIDAL_SURFACE('fillet4', #103, 5.0, 0.5);
`);
    const counts = engine.countEntities(step);
    expect(counts.toroidal_surface).toBe(4);
  });

  it("counts B_SPLINE_SURFACE (free-form / airfoil)", () => {
    const step = buildStep(`
#1 = B_SPLINE_SURFACE('airfoil1', 3, 3, ((#10, #11), (#12, #13)), .UNSPECIFIED., .F., .F., .F.);
#2 = B_SPLINE_SURFACE_WITH_KNOTS('airfoil2', 3, 3, ((#20)), .UNSPECIFIED., .F., .F., .F., (4), (4), (0., 1.), (0., 1.), .UNSPECIFIED.);
`);
    const counts = engine.countEntities(step);
    expect(counts.b_spline_surface).toBe(2);
  });

  it("counts ADVANCED_FACE (total face count)", () => {
    const step = buildStep(`
#1 = ADVANCED_FACE('face1', (#10), #20, .T.);
#2 = ADVANCED_FACE('face2', (#11), #21, .T.);
#3 = ADVANCED_FACE('face3', (#12), #22, .F.);
`);
    const counts = engine.countEntities(step);
    expect(counts.advanced_face).toBe(3);
  });

  it("counts total_entities by line scan", () => {
    const step = buildStep(`
#1 = CARTESIAN_POINT('p1', (0., 0., 0.));
#2 = DIRECTION('d1', (0., 0., 1.));
#3 = AXIS2_PLACEMENT_3D('axis', #1, #2, #2);
#4 = CYLINDRICAL_SURFACE('cyl', #3, 5.0);
`);
    const counts = engine.countEntities(step);
    expect(counts.total_entities).toBe(4);
  });

  it("returns zero counts for empty body", () => {
    const counts = engine.countEntities(buildStep(""));
    expect(counts.cylindrical_surface).toBe(0);
    expect(counts.advanced_face).toBe(0);
    expect(counts.total_entities).toBe(0);
  });
});

describe("STEPGeometryParserEngine.inferGeometry", () => {
  it("flags has_cylindrical_holes when count > 0", () => {
    const g = engine.inferGeometry({
      advanced_face: 2, plane: 0, cylindrical_surface: 2, conical_surface: 0,
      toroidal_surface: 0, spherical_surface: 0, b_spline_surface: 0,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    expect(g.has_cylindrical_holes).toBe(true);
    expect(g.cylindrical_feature_count).toBe(2);
  });

  it("classifies complexity as simple when ≤ 20 faces", () => {
    const g = engine.inferGeometry({
      advanced_face: 10, plane: 0, cylindrical_surface: 0, conical_surface: 0,
      toroidal_surface: 0, spherical_surface: 0, b_spline_surface: 0,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    expect(g.complexity).toBe("simple");
  });

  it("classifies complexity as medium for 21-100 faces", () => {
    const g = engine.inferGeometry({
      advanced_face: 50, plane: 0, cylindrical_surface: 0, conical_surface: 0,
      toroidal_surface: 0, spherical_surface: 0, b_spline_surface: 0,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    expect(g.complexity).toBe("medium");
  });

  it("classifies complexity as complex above 100 faces", () => {
    const g = engine.inferGeometry({
      advanced_face: 500, plane: 0, cylindrical_surface: 0, conical_surface: 0,
      toroidal_surface: 0, spherical_surface: 0, b_spline_surface: 0,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    expect(g.complexity).toBe("complex");
  });

  it("flags taper + fillet + freeform from entity counts", () => {
    const g = engine.inferGeometry({
      advanced_face: 50, plane: 5, cylindrical_surface: 4, conical_surface: 2,
      toroidal_surface: 3, spherical_surface: 0, b_spline_surface: 4,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    expect(g.has_taper_or_chamfer).toBe(true);
    expect(g.taper_count).toBe(2);
    expect(g.has_fillets).toBe(true);
    expect(g.fillet_count).toBe(3);
    expect(g.has_freeform_surfaces).toBe(true);
    expect(g.freeform_count).toBe(4);
  });
});

describe("STEPGeometryParserEngine.evidenceForFeatureKinds", () => {
  it("3+ cylindrical surfaces → stepped_revolved_axis evidence", () => {
    const g = engine.inferGeometry({
      advanced_face: 10, plane: 0, cylindrical_surface: 4, conical_surface: 0,
      toroidal_surface: 0, spherical_surface: 0, b_spline_surface: 0,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    const ev = engine.evidenceForFeatureKinds(g);
    expect(ev.has("stepped_revolved_axis")).toBe(true);
    expect(ev.has("central_oil_hole")).toBe(true);
  });

  it("5+ cylindrical surfaces → cross_drilled_relief_holes evidence", () => {
    const g = engine.inferGeometry({
      advanced_face: 20, plane: 0, cylindrical_surface: 6, conical_surface: 0,
      toroidal_surface: 0, spherical_surface: 0, b_spline_surface: 0,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    const ev = engine.evidenceForFeatureKinds(g);
    expect(ev.has("cross_drilled_relief_holes")).toBe(true);
  });

  it("conical surfaces → chamfer evidence; 2+ → working_tip_taper", () => {
    const ev1 = engine.evidenceForFeatureKinds({
      has_cylindrical_holes: false, cylindrical_feature_count: 0,
      has_taper_or_chamfer: true, taper_count: 1,
      has_fillets: false, fillet_count: 0,
      has_freeform_surfaces: false, freeform_count: 0,
      complexity: "simple",
    });
    expect(ev1.has("bevel_face_chamfer")).toBe(true);
    expect(ev1.has("working_tip_taper")).toBe(false);

    const ev2 = engine.evidenceForFeatureKinds({
      has_cylindrical_holes: false, cylindrical_feature_count: 0,
      has_taper_or_chamfer: true, taper_count: 3,
      has_fillets: false, fillet_count: 0,
      has_freeform_surfaces: false, freeform_count: 0,
      complexity: "simple",
    });
    expect(ev2.has("working_tip_taper")).toBe(true);
  });

  it("3+ toroidal surfaces → blade_root_fillet evidence (turbomachinery sig)", () => {
    const g = engine.inferGeometry({
      advanced_face: 30, plane: 0, cylindrical_surface: 0, conical_surface: 0,
      toroidal_surface: 5, spherical_surface: 0, b_spline_surface: 0,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    const ev = engine.evidenceForFeatureKinds(g);
    expect(ev.has("blade_root_fillet")).toBe(true);
  });

  it("2+ B-spline surfaces → leading_edge + trailing_edge fillet evidence (airfoil)", () => {
    const g = engine.inferGeometry({
      advanced_face: 40, plane: 0, cylindrical_surface: 0, conical_surface: 0,
      toroidal_surface: 0, spherical_surface: 0, b_spline_surface: 4,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    const ev = engine.evidenceForFeatureKinds(g);
    expect(ev.has("leading_edge_fillet")).toBe(true);
    expect(ev.has("trailing_edge_fillet")).toBe(true);
  });

  it("returns empty evidence for empty geometry", () => {
    const g = engine.inferGeometry({
      advanced_face: 0, plane: 0, cylindrical_surface: 0, conical_surface: 0,
      toroidal_surface: 0, spherical_surface: 0, b_spline_surface: 0,
      edge_loop: 0, vertex_point: 0, total_entities: 0,
    });
    const ev = engine.evidenceForFeatureKinds(g);
    expect(ev.size).toBe(0);
  });
});

describe("STEPGeometryParserEngine.parseString — end-to-end", () => {
  it("parses a stepped-shaft fixture with chamfer + fillet", () => {
    const step = buildStep(`
#1 = ADVANCED_FACE('end_face', (#10), #20, .T.);
#2 = ADVANCED_FACE('shoulder_face', (#11), #21, .T.);
#3 = ADVANCED_FACE('shank_face', (#12), #22, .T.);
#4 = CYLINDRICAL_SURFACE('shank', #100, 12.7);
#5 = CYLINDRICAL_SURFACE('mid', #101, 8.0);
#6 = CYLINDRICAL_SURFACE('back', #102, 5.0);
#7 = CONICAL_SURFACE('chamfer', #103, 1.0, 0.785);
#8 = TOROIDAL_SURFACE('shoulder_fillet', #104, 8.0, 0.25);
`);
    const result = engine.parseString(step);
    expect(result.parse_ok).toBe(true);
    expect(result.entity_counts.cylindrical_surface).toBe(3);
    expect(result.entity_counts.conical_surface).toBe(1);
    expect(result.entity_counts.toroidal_surface).toBe(1);
    expect(result.geometry.has_cylindrical_holes).toBe(true);
    expect(result.geometry.has_taper_or_chamfer).toBe(true);
    expect(result.geometry.has_fillets).toBe(true);
    const ev = engine.evidenceForFeatureKinds(result.geometry);
    expect(ev.has("stepped_revolved_axis")).toBe(true);
    expect(ev.has("bevel_face_chamfer")).toBe(true);
    expect(ev.has("shoulder_fillet")).toBe(true);
  });

  it("extracts FILE_NAME from the header", () => {
    const step = buildStep("");
    const result = engine.parseString(step);
    expect(result.file_name).toBe("test.step");
  });

  it("extracts FILE_SCHEMA from the header", () => {
    const step = buildStep("");
    const result = engine.parseString(step);
    expect(result.schema?.includes("AUTOMOTIVE_DESIGN")).toBe(true);
  });

  it("parse_ok=true with parse_ms recorded", () => {
    const result = engine.parseString(buildStep(""));
    expect(result.parse_ok).toBe(true);
    expect(result.parse_ms).toBeGreaterThanOrEqual(0);
  });
});
