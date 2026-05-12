/**
 * file-format-engines.test.ts — Tests for IGESImportEngine, STLToVoxelGridEngine,
 * PDFBlueprintDimensionExtractorEngine
 *
 * 45 tests across 3 engines covering parsing, geometry extraction,
 * voxelization, dimension extraction, GD&T, threads, and completeness.
 */
import { describe, it, expect } from "vitest";
import { IGESImportEngine } from "../engines/IGESImportEngine.js";
import { STLToVoxelGridEngine } from "../engines/STLToVoxelGridEngine.js";
import { PDFBlueprintDimensionExtractorEngine } from "../engines/PDFBlueprintDimensionExtractorEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Minimal IGES file with a line (110) and a point (116) entity */
// Each line must be exactly 80 chars: cols 1-72=data, col 73=section, cols 74-80=seq
// D-section: cols 1-8 entity type, 9-16 param ptr, 33-40 layer; col 73='D', 74-80=seq
// P-section: cols 1-64 data, 65-72 DE pointer, col 73='P', 74-80=seq
function pad80(data: string, section: string, seq: number): string {
  const seqStr = String(seq).padStart(7);
  const needed = 80 - data.length - 1 - 7;
  return data + " ".repeat(Math.max(0, needed)) + section + seqStr;
}
function padP(data: string, dePtr: number, pSeq: number): string {
  // cols 1-64: param data, 65-72: DE pointer (8 chars right-aligned), col 73: 'P', 74-80: seq (7 chars)
  const dataPart = data.padEnd(64);
  const dePart = String(dePtr).padStart(8);
  const seqPart = String(pSeq).padStart(7);
  return dataPart + dePart + "P" + seqPart;
}
const IGES_SAMPLE = [
  pad80("Test IGES file", "S", 1),
  pad80("1H,,1H;,7Htest.igs,4HPRISM,5H1.0.0,32,38,6,308,15,,1.0,2,2HMM,,", "G", 1),
  pad80("1,4,14HIGES_TEST_FILE,3HJWS,,,;", "G", 2),
  //    cols: 1-----8 9----16 17---24 25---32 33---40 41---48 49---56 57---64 65---72
  pad80("     110       1       0       0       0       0       0       00000001", "D", 1),
  pad80("     110       0       0       1       0                               ", "D", 2),
  pad80("     116       2       0       0       0       0       0       00000001", "D", 3),
  pad80("     116       0       0       1       0                               ", "D", 4),
  pad80("     100       3       0       0       1       0       0       00000001", "D", 5),
  pad80("     100       0       0       1       0                               ", "D", 6),
  // P-section: cols 1-64=param data, 65-72=DE seq num (8 chars), col 73='P', 74-80=P seq
  padP("110,0.0,0.0,0.0,10.0,20.0,30.0;", 1, 1),
  padP("116,5.0,10.0,15.0,0;", 3, 2),
  padP("100,0.0,5.0,5.0,10.0,5.0,0.0,5.0;", 5, 3),
  pad80("S      1G      2D      6P      3", "T", 1),
].join("\n");

/** Minimal IGES with two lines on different layers */
const IGES_LAYERS = [
  pad80("Test", "S", 1),
  pad80("1H,,1H;,7Htest.igs,4HPRISM,5H1.0.0,32,38,6,308,15,,1.0,2,2HMM,,", "G", 1),
  pad80("1,4,,,,;", "G", 2),
  pad80("     110       1       0       0       1       0       0       00000001", "D", 1),
  pad80("     110       0       0       1       0                               ", "D", 2),
  pad80("     110       2       0       0       2       0       0       00000001", "D", 3),
  pad80("     110       0       0       1       0                               ", "D", 4),
  padP("110,0.0,0.0,0.0,1.0,0.0,0.0;", 1, 1),
  padP("110,0.0,0.0,0.0,0.0,1.0,0.0;", 3, 2),
  pad80("S      1G      2D      4P      2", "T", 1),
].join("\n");

/** ASCII STL cube: 1mm x 1mm x 1mm (12 triangles) */
const STL_CUBE = `solid cube
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 1 1 0
      vertex 1 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 1 0
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 1
      vertex 1 0 1
      vertex 1 1 1
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 1
      vertex 1 1 1
      vertex 0 1 1
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 1 0 1
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 1 0 1
      vertex 0 0 1
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 1 0
      vertex 0 1 1
      vertex 1 1 1
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 1 0
      vertex 1 1 1
      vertex 1 1 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0 1
      vertex 0 1 1
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 1 1
      vertex 0 1 0
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 1 0 0
      vertex 1 1 0
      vertex 1 1 1
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 1 0 0
      vertex 1 1 1
      vertex 1 0 1
    endloop
  endfacet
endsolid cube`;

/** STL sphere approximation (octahedron — 8 triangles, rough sphere) */
function makeOctahedronSTL(r: number): string {
  // 6 vertices: ±x, ±y, ±z at radius r
  const top = { x: 0, y: 0, z: r };
  const bot = { x: 0, y: 0, z: -r };
  const px = { x: r, y: 0, z: 0 };
  const nx = { x: -r, y: 0, z: 0 };
  const py = { x: 0, y: r, z: 0 };
  const ny = { x: 0, y: -r, z: 0 };

  const faces = [
    [top, px, py], [top, py, nx], [top, nx, ny], [top, ny, px],
    [bot, py, px], [bot, nx, py], [bot, ny, nx], [bot, px, ny],
  ];

  let stl = "solid sphere\n";
  for (const [a, b, c] of faces) {
    stl += `  facet normal 0 0 0\n    outer loop\n`;
    stl += `      vertex ${a.x} ${a.y} ${a.z}\n`;
    stl += `      vertex ${b.x} ${b.y} ${b.z}\n`;
    stl += `      vertex ${c.x} ${c.y} ${c.z}\n`;
    stl += `    endloop\n  endfacet\n`;
  }
  stl += "endsolid sphere";
  return stl;
}

/** Blueprint text with dimensions, GD&T, threads, part info */
const BLUEPRINT_TEXT = `
TITLE: Widget Bracket Assembly
P/N: WBA-2024-001
REV: C
MATERIAL: 6061-T6 ALUMINUM
SCALE: 1:1
DRAWN BY: J.SMITH

NOTES:
1. ALL DIMENSIONS IN mm UNLESS OTHERWISE STATED
2. BREAK ALL SHARP EDGES 0.5x45°
3. SURFACE FINISH Ra 1.6 UNLESS OTHERWISE NOTED

DIMENSIONS:
Overall length 125.00 ±0.05
Width 50.00 ±0.10
Height 25.00 +0.02/-0.01
Bore Ø12.00 ±0.01
Bore Ø25.00
Counterbore DEPTH 8.00 ±0.05
R5.00 fillet
45°±0.5° chamfer

THREADS:
M8x1.25 through hole (4 places)
M10x1.5
1/4-20 UNC dowel pin hole

GD&T:
POSITION 0.05 |A|B|C|
FLATNESS 0.02
PERPENDICULARITY 0.03 |A|
PARALLELISM 0.01 |A|B|

Ra 0.8 on bore surfaces
Ra 3.2 on external surfaces
`;

const BLUEPRINT_INCH = `
P/N: PLT-100
MATERIAL: AISI 1045 STEEL
REV: A

DIMENSIONS IN INCHES
2.500 ±0.005
DIA 0.750 ±0.001
DEPTH 0.375
3/8-16 UNC
#10-32 UNF

POSITION 0.002 |A|
Ra 32 µin
`;

const BLUEPRINT_MINIMAL = `
Some random text with no real dimensions.
No part number here.
`;

// ============================================================================
// IGES IMPORT ENGINE TESTS
// ============================================================================

describe("IGESImportEngine", () => {
  const engine = new IGESImportEngine();

  it("should parse multi-entity IGES file", () => {
    const result = engine.parseIGES({ content: IGES_SAMPLE });
    expect(result.entities.length).toBe(3);
    expect(result.summary.total_entities).toBe(3);
  });

  it("should identify entity types correctly", () => {
    const result = engine.parseIGES({ content: IGES_SAMPLE });
    const types = result.entities.map(e => e.type);
    expect(types).toContain(110); // line
    expect(types).toContain(116); // point
    expect(types).toContain(100); // circular arc
  });

  it("should map entity type names", () => {
    const result = engine.parseIGES({ content: IGES_SAMPLE });
    const names = result.entities.map(e => e.type_name);
    expect(names).toContain("line");
    expect(names).toContain("point");
    expect(names).toContain("circular_arc");
  });

  it("should parse line entity parameters", () => {
    const result = engine.parseIGES({ content: IGES_SAMPLE });
    const line = result.entities.find(e => e.type === 110);
    expect(line).toBeDefined();
    expect(line!.params.length).toBeGreaterThanOrEqual(6);
    // Line from (0,0,0) to (10,20,30)
    expect(line!.params[0]).toBeCloseTo(0);
    expect(line!.params[3]).toBeCloseTo(10);
    expect(line!.params[4]).toBeCloseTo(20);
    expect(line!.params[5]).toBeCloseTo(30);
  });

  it("should parse point entity parameters", () => {
    const result = engine.parseIGES({ content: IGES_SAMPLE });
    const point = result.entities.find(e => e.type === 116);
    expect(point).toBeDefined();
    expect(point!.params.length).toBeGreaterThanOrEqual(3);
    expect(point!.params[0]).toBeCloseTo(5);
    expect(point!.params[1]).toBeCloseTo(10);
    expect(point!.params[2]).toBeCloseTo(15);
  });

  it("should parse circular arc parameters", () => {
    const result = engine.parseIGES({ content: IGES_SAMPLE });
    const arc = result.entities.find(e => e.type === 100);
    expect(arc).toBeDefined();
    expect(arc!.params.length).toBeGreaterThanOrEqual(5);
  });

  it("should parse global section units", () => {
    const result = engine.parseIGES({ content: IGES_SAMPLE });
    expect(result.global.units).toBe("mm");
  });

  it("should handle summary by_type counts", () => {
    const result = engine.parseIGES({ content: IGES_SAMPLE });
    expect(result.summary.by_type["line"]).toBe(1);
    expect(result.summary.by_type["point"]).toBe(1);
    expect(result.summary.by_type["circular_arc"]).toBe(1);
  });

  it("should return empty result for empty content", () => {
    const result = engine.parseIGES({ content: "" });
    expect(result.entities).toHaveLength(0);
    expect(result.summary.total_entities).toBe(0);
  });

  it("should extract lines from geometry", () => {
    const result = engine.extractGeometry({ content: IGES_SAMPLE });
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].start.x).toBeCloseTo(0);
    expect(result.lines[0].end.x).toBeCloseTo(10);
    expect(result.lines[0].end.y).toBeCloseTo(20);
    expect(result.lines[0].end.z).toBeCloseTo(30);
  });

  it("should extract points from geometry", () => {
    const result = engine.extractGeometry({ content: IGES_SAMPLE });
    expect(result.points.length).toBe(1);
    expect(result.points[0].x).toBeCloseTo(5);
    expect(result.points[0].y).toBeCloseTo(10);
  });

  it("should extract arcs from geometry", () => {
    const result = engine.extractGeometry({ content: IGES_SAMPLE });
    expect(result.arcs.length).toBe(1);
    expect(result.arcs[0].center.x).toBeCloseTo(5);
    expect(result.arcs[0].center.y).toBeCloseTo(5);
    expect(result.arcs[0].radius).toBeCloseTo(5);
  });

  it("should filter by entity type", () => {
    const result = engine.extractGeometry({ content: IGES_SAMPLE, filter: { types: ["line"] } });
    expect(result.lines.length).toBe(1);
    expect(result.points.length).toBe(0);
    expect(result.arcs.length).toBe(0);
  });

  it("should filter by layer", () => {
    const result = engine.extractGeometry({ content: IGES_LAYERS, filter: { layers: [1] } });
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].end.x).toBeCloseTo(1);
  });

  it("should provide summary with entity counts", () => {
    const result = engine.getSummary({ content: IGES_SAMPLE });
    expect(result.total_entities).toBe(3);
    expect(result.units).toBe("mm");
    expect(result.by_type["line"]).toBe(1);
  });

  it("should estimate bounding box in summary", () => {
    const result = engine.getSummary({ content: IGES_SAMPLE });
    expect(result.bounding_box).not.toBeNull();
    if (result.bounding_box) {
      expect(result.bounding_box.max.x).toBeGreaterThanOrEqual(10);
      expect(result.bounding_box.max.y).toBeGreaterThanOrEqual(10);
    }
  });
});

// ============================================================================
// STL TO VOXEL GRID ENGINE TESTS
// ============================================================================

describe("STLToVoxelGridEngine", () => {
  const engine = new STLToVoxelGridEngine();

  it("should parse ASCII STL cube", () => {
    const result = engine.parseSTL({ content: STL_CUBE });
    expect(result.triangle_count).toBe(12);
    expect(result.triangles.length).toBe(12);
    expect(result.solid_name).toBe("cube");
  });

  it("should compute correct bounding box for cube", () => {
    const result = engine.parseSTL({ content: STL_CUBE });
    expect(result.bounding_box.min.x).toBeCloseTo(0);
    expect(result.bounding_box.min.y).toBeCloseTo(0);
    expect(result.bounding_box.min.z).toBeCloseTo(0);
    expect(result.bounding_box.max.x).toBeCloseTo(1);
    expect(result.bounding_box.max.y).toBeCloseTo(1);
    expect(result.bounding_box.max.z).toBeCloseTo(1);
  });

  it("should parse triangle normals", () => {
    const result = engine.parseSTL({ content: STL_CUBE });
    // First facet has normal (0, 0, -1)
    const bottomFace = result.triangles.find(t => t.normal.z === -1);
    expect(bottomFace).toBeDefined();
  });

  it("should parse triangle vertices", () => {
    const result = engine.parseSTL({ content: STL_CUBE });
    const firstTri = result.triangles[0];
    expect(firstTri.vertices).toHaveLength(3);
    expect(typeof firstTri.vertices[0].x).toBe("number");
  });

  it("should handle empty STL", () => {
    const result = engine.parseSTL({ content: "" });
    expect(result.triangle_count).toBe(0);
    expect(result.triangles).toHaveLength(0);
  });

  it("should voxelize cube and produce grid", () => {
    const parsed = engine.parseSTL({ content: STL_CUBE });
    const result = engine.voxelize({ triangles: parsed.triangles, resolution_mm: 0.25 });
    expect(result.dimensions.nx).toBeGreaterThan(0);
    expect(result.dimensions.ny).toBeGreaterThan(0);
    expect(result.dimensions.nz).toBeGreaterThan(0);
    expect(result.volume_mm3).toBeGreaterThan(0);
  });

  it("should approximate cube volume (~1mm³)", () => {
    const parsed = engine.parseSTL({ content: STL_CUBE });
    const result = engine.voxelize({ triangles: parsed.triangles, resolution_mm: 0.1 });
    // Volume of 1x1x1 cube = 1.0 mm³, allow 30% tolerance for voxel approximation
    expect(result.volume_mm3).toBeGreaterThan(0.5);
    expect(result.volume_mm3).toBeLessThan(1.5);
  });

  it("should handle empty triangle list for voxelize", () => {
    const result = engine.voxelize({ triangles: [], resolution_mm: 1.0 });
    expect(result.dimensions.nx).toBe(0);
    expect(result.volume_mm3).toBe(0);
  });

  it("should analyze cube geometry", () => {
    const result = engine.analyzeGeometry({ content: STL_CUBE, resolution_mm: 0.25 });
    expect(result.volume_mm3).toBeGreaterThan(0);
    expect(result.surface_area_mm2).toBeGreaterThan(0);
    expect(result.bounding_box.max.x).toBeCloseTo(1);
  });

  it("should compute cube surface area (~6mm²)", () => {
    const result = engine.analyzeGeometry({ content: STL_CUBE, resolution_mm: 0.25 });
    // 6 faces * 1mm² each = 6mm²
    expect(result.surface_area_mm2).toBeCloseTo(6, 0);
  });

  it("should compute aspect ratios for cube (~1:1:1)", () => {
    const result = engine.analyzeGeometry({ content: STL_CUBE });
    expect(result.aspect_ratio.xy).toBeCloseTo(1, 0);
    expect(result.aspect_ratio.xz).toBeCloseTo(1, 0);
    expect(result.aspect_ratio.yz).toBeCloseTo(1, 0);
  });

  it("should not flag cube as needing 5-axis", () => {
    const result = engine.analyzeGeometry({ content: STL_CUBE });
    expect(result.estimated_5axis_needed).toBe(false);
  });

  it("should parse octahedron STL", () => {
    const stl = makeOctahedronSTL(10);
    const result = engine.parseSTL({ content: stl });
    expect(result.triangle_count).toBe(8);
    expect(result.solid_name).toBe("sphere");
  });

  it("should handle empty content in analyzeGeometry", () => {
    const result = engine.analyzeGeometry({ content: "" });
    expect(result.volume_mm3).toBe(0);
    expect(result.surface_area_mm2).toBe(0);
    expect(result.thin_wall_warnings).toHaveLength(0);
  });
});

// ============================================================================
// PDF BLUEPRINT DIMENSION EXTRACTOR ENGINE TESTS
// ============================================================================

describe("PDFBlueprintDimensionExtractorEngine", () => {
  const engine = new PDFBlueprintDimensionExtractorEngine();

  it("should extract linear dimensions with symmetric tolerance", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT, drawing_units: "mm" });
    const dim125 = result.dimensions.find(d => d.nominal === 125 && d.type === "linear");
    expect(dim125).toBeDefined();
    expect(dim125!.tolerance_plus).toBeCloseTo(0.05);
    expect(dim125!.tolerance_minus).toBeCloseTo(-0.05);
  });

  it("should extract diameter dimensions", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT, drawing_units: "mm" });
    const diam = result.dimensions.filter(d => d.type === "diameter");
    expect(diam.length).toBeGreaterThanOrEqual(1);
    const d12 = diam.find(d => d.nominal === 12);
    expect(d12).toBeDefined();
  });

  it("should extract angle dimensions", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT, drawing_units: "mm" });
    const angles = result.dimensions.filter(d => d.type === "angle");
    expect(angles.length).toBeGreaterThanOrEqual(1);
    const a45withTol = angles.find(d => d.nominal === 45 && d.tolerance_plus !== 0);
    expect(a45withTol).toBeDefined();
    expect(a45withTol!.tolerance_plus).toBeCloseTo(0.5);
  });

  it("should extract depth dimensions", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT, drawing_units: "mm" });
    const depths = result.dimensions.filter(d => d.type === "depth");
    expect(depths.length).toBeGreaterThanOrEqual(1);
    expect(depths[0].nominal).toBeCloseTo(8);
  });

  it("should extract radius dimensions", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT, drawing_units: "mm" });
    const radii = result.dimensions.filter(d => d.type === "radius");
    expect(radii.length).toBeGreaterThanOrEqual(1);
    expect(radii[0].nominal).toBeCloseTo(5);
  });

  it("should extract GD&T callouts", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    expect(result.gdt_callouts.length).toBeGreaterThanOrEqual(3);
    const pos = result.gdt_callouts.find(g => g.symbol === "position");
    expect(pos).toBeDefined();
    expect(pos!.value).toBeCloseTo(0.05);
    expect(pos!.datums).toContain("A");
  });

  it("should extract flatness GD&T", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    const flat = result.gdt_callouts.find(g => g.symbol === "flatness");
    expect(flat).toBeDefined();
    expect(flat!.value).toBeCloseTo(0.02);
  });

  it("should extract perpendicularity with datum", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    const perp = result.gdt_callouts.find(g => g.symbol === "perpendicularity");
    expect(perp).toBeDefined();
    expect(perp!.datums).toContain("A");
  });

  it("should extract surface finishes", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    expect(result.surface_finishes.length).toBeGreaterThanOrEqual(2);
    const ra08 = result.surface_finishes.find(sf => sf.ra === 0.8);
    expect(ra08).toBeDefined();
  });

  it("should extract metric threads", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    expect(result.threads.length).toBeGreaterThanOrEqual(2);
    const m8 = result.threads.find(t => t.spec.includes("M8"));
    expect(m8).toBeDefined();
    expect(m8!.type).toBe("metric");
    expect(m8!.major_diameter).toBeCloseTo(8);
    expect(m8!.pitch).toBeCloseTo(1.25);
  });

  it("should extract imperial threads", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    const unc = result.threads.find(t => t.type === "imperial");
    expect(unc).toBeDefined();
    expect(unc!.spec).toContain("UNC");
  });

  it("should extract part info", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    expect(result.part_info.part_number).toBe("WBA-2024-001");
    expect(result.part_info.material).toContain("6061");
    expect(result.part_info.revision).toBe("C");
    expect(result.part_info.title).toContain("Widget");
    expect(result.part_info.scale).toBe("1:1");
  });

  it("should detect mm units automatically", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    const linDims = result.dimensions.filter(d => d.type === "linear");
    expect(linDims.every(d => d.unit === "mm")).toBe(true);
  });

  it("should handle inch blueprint", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_INCH });
    expect(result.dimensions.length).toBeGreaterThan(0);
    expect(result.threads.length).toBeGreaterThanOrEqual(1);
    expect(result.part_info.part_number).toBe("PLT-100");
    expect(result.part_info.material).toContain("1045");
  });

  it("should extract surface finish in microinches", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_INCH });
    const sf = result.surface_finishes.find(s => s.ra === 32);
    expect(sf).toBeDefined();
    expect(sf!.unit).toBe("uin");
  });

  it("should validate completeness — full blueprint", () => {
    const result = engine.validateCompleteness({ text_content: BLUEPRINT_TEXT });
    expect(result.has_material).toBe(true);
    expect(result.has_tolerances).toBe(true);
    expect(result.has_surface_finish).toBe(true);
    expect(result.has_gdt).toBe(true);
    expect(result.has_threads).toBe(true);
    expect(result.completeness_score).toBeGreaterThanOrEqual(80);
    expect(result.missing_likely).toHaveLength(0);
  });

  it("should validate completeness — minimal blueprint", () => {
    const result = engine.validateCompleteness({ text_content: BLUEPRINT_MINIMAL });
    expect(result.has_material).toBe(false);
    expect(result.has_tolerances).toBe(false);
    expect(result.completeness_score).toBeLessThan(30);
    expect(result.missing_likely.length).toBeGreaterThanOrEqual(3);
    expect(result.missing_likely).toContain("material_specification");
  });

  it("should handle empty text content", () => {
    const result = engine.extractDimensions({ text_content: "" });
    expect(result.dimensions).toHaveLength(0);
    expect(result.gdt_callouts).toHaveLength(0);
    expect(result.threads).toHaveLength(0);
  });

  it("should extract chamfer dimensions", () => {
    const result = engine.extractDimensions({ text_content: BLUEPRINT_TEXT });
    const chamfers = result.dimensions.filter(d => d.type === "chamfer");
    expect(chamfers.length).toBeGreaterThanOrEqual(1);
    expect(chamfers[0].nominal).toBeCloseTo(0.5);
  });
});
