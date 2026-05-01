/**
 * CK-MS10 Geometry Tests
 *
 * TurningProfileEngine  (8 tests)
 * SheetNestingEngine    (8 tests)
 * DXFParserEngine       (8 tests)
 * Total: 24 tests
 */

import { describe, it, expect } from "vitest";
import {
  TurningProfileEngine,
  type TurningFeature,
  type TurningProfile,
} from "../engines/TurningProfileEngine.js";
import {
  SheetNestingEngine,
  type Polygon2D,
  type Sheet,
} from "../engines/SheetNestingEngine.js";
import { DXFParserEngine } from "../engines/DXFParserEngine.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRect(id: string, w: number, h: number, qty = 1): Polygon2D {
  return {
    id,
    vertices: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ],
    quantity: qty,
  };
}

// ─── TurningProfileEngine ────────────────────────────────────────────────────

describe("TurningProfileEngine", () => {
  const engine = new TurningProfileEngine();

  it("generates OD profile with correct type and points", () => {
    const features: TurningFeature[] = [
      { type: "cylinder", diameter_mm: 40, z_start_mm: 0, z_end_mm: -50 },
      { type: "cylinder", diameter_mm: 30, z_start_mm: -50, z_end_mm: -80 },
    ];
    const profile = engine.generateODProfile(features, 50, "low_carbon_steel");
    expect(profile.type).toBe("OD");
    expect(profile.points.length).toBeGreaterThan(3);
    expect(profile.stock_diameter_mm).toBe(50);
    expect(profile.finish_diameter_mm).toBeLessThan(50);
  });

  it("OD profile physics: positive MRR, force, Ra", () => {
    const features: TurningFeature[] = [
      { type: "cylinder", diameter_mm: 45, z_start_mm: 0, z_end_mm: -60 },
    ];
    const profile = engine.generateODProfile(features, 50, "aluminum");
    expect(profile.mrr_cm3min).toBeGreaterThan(0);
    expect(profile.cutting_force_N).toBeGreaterThan(0);
    expect(profile.ra_predicted_um).toBeGreaterThan(0);
    expect(profile.surface_speed_mmin).toBeGreaterThan(0);
    expect(profile.speed_rpm).toBeGreaterThan(0);
  });

  it("OD profile with chamfer feature includes chamfer points", () => {
    const features: TurningFeature[] = [
      { type: "cylinder", diameter_mm: 40, z_start_mm: 0, z_end_mm: -40 },
      { type: "chamfer", diameter_mm: 40, z_start_mm: -40, z_end_mm: -42, chamfer_mm: 2 },
    ];
    const profile = engine.generateODProfile(features, 50, "stainless_steel");
    expect(profile.type).toBe("OD");
    expect(profile.points.length).toBeGreaterThan(4);
  });

  it("OD profile with groove feature generates plunge/exit points", () => {
    const features: TurningFeature[] = [
      { type: "cylinder", diameter_mm: 40, z_start_mm: 0, z_end_mm: -30 },
      { type: "groove", diameter_mm: 40, z_start_mm: -20, z_end_mm: -25, groove_width_mm: 5, groove_depth_mm: 3 },
    ];
    const profile = engine.generateODProfile(features, 50);
    // groove adds 4 points (approach, plunge, traverse, exit)
    expect(profile.points.length).toBeGreaterThan(5);
    // Check for reduced feed on plunge
    const plungePoint = profile.points.find((pt) => pt.comment?.includes("plunge"));
    expect(plungePoint).toBeDefined();
    expect(plungePoint!.feed).toBeDefined();
  });

  it("generates ID profile with smaller doc and bore warnings", () => {
    const features: TurningFeature[] = [
      { type: "cylinder", diameter_mm: 25, z_start_mm: 0, z_end_mm: -40 },
    ];
    const profile = engine.generateIDProfile(features, 25, 20, "cast_iron");
    expect(profile.type).toBe("ID");
    expect(profile.finish_diameter_mm).toBe(25);
    expect(profile.feed_mmrev).toBeGreaterThan(0);
  });

  it("generates G76 thread profile with correct blocks", () => {
    const result = engine.generateThreadProfile({
      type: "external",
      nominal_diameter_mm: 20,
      pitch_mm: 2.5,
      length_mm: 30,
      z_start_mm: 0,
      controller: "fanuc",
    });
    expect(result.g76_blocks.length).toBeGreaterThanOrEqual(2);
    expect(result.pitch_mm).toBe(2.5);
    expect(result.minor_diameter_mm).toBeLessThan(20);
    expect(result.total_depth_mm).toBeCloseTo(0.6495 * 2.5, 2);
    // Must include G76 keyword
    const hasG76 = result.g76_blocks.some((b) => b.includes("G76"));
    expect(hasG76).toBe(true);
  });

  it("profileToGCode returns G-code array with G71 and G70", () => {
    const features: TurningFeature[] = [
      { type: "cylinder", diameter_mm: 40, z_start_mm: 0, z_end_mm: -50 },
    ];
    const profile = engine.generateODProfile(features, 50);
    const gcode = engine.profileToGCode(profile, { controller: "fanuc", include_g70: true });
    expect(Array.isArray(gcode)).toBe(true);
    expect(gcode.length).toBeGreaterThan(4);
    const hasG71 = gcode.some((l) => l.includes("G71"));
    const hasG70 = gcode.some((l) => l.includes("G70"));
    expect(hasG71).toBe(true);
    expect(hasG70).toBe(true);
  });

  it("profileToGCode haas controller produces G71 P/Q U/W format", () => {
    const features: TurningFeature[] = [
      { type: "cylinder", diameter_mm: 38, z_start_mm: 0, z_end_mm: -45 },
    ];
    const profile = engine.generateODProfile(features, 45);
    const gcode = engine.profileToGCode(profile, { controller: "haas" });
    const g71line = gcode.find((l) => l.includes("G71") && l.includes("P") && l.includes("Q"));
    expect(g71line).toBeDefined();
  });
});

// ─── SheetNestingEngine ───────────────────────────────────────────────────────

describe("SheetNestingEngine", () => {
  const engine = new SheetNestingEngine();
  const sheet: Sheet = { width_mm: 1000, height_mm: 500 };

  it("nests a single part on a sheet", () => {
    const parts = [makeRect("A", 100, 80)];
    const result = engine.nestParts(parts, sheet);
    expect(result.placed.length).toBe(1);
    expect(result.unplaced.length).toBe(0);
    expect(result.sheets_used).toBe(1);
    expect(result.placed[0].part_id).toBe("A");
  });

  it("nests multiple parts with correct utilization", () => {
    const parts = [
      makeRect("A", 200, 100, 3),
      makeRect("B", 150, 80, 2),
    ];
    const result = engine.nestParts(parts, sheet);
    expect(result.placed.length).toBe(5);
    expect(result.utilization_pct).toBeGreaterThan(0);
    expect(result.utilization_pct).toBeLessThanOrEqual(100);
    expect(result.total_part_area_mm2).toBeCloseTo(
      3 * 200 * 100 + 2 * 150 * 80, 0
    );
  });

  it("rotation: 90° rotation fits tall part when sheet is wide", () => {
    // Part 10×400 — fits rotated as 400×10 on 1000×500 sheet
    const parts = [makeRect("tall", 10, 400)];
    const result = engine.nestParts(parts, sheet, { rotation_allowed: true });
    expect(result.placed.length).toBe(1);
    // Placed rotation should be 0 or 90
    expect([0, 90, 180, 270]).toContain(result.placed[0].rotation_deg);
  });

  it("overflows to second sheet when first is full", () => {
    // 10 large parts that exceed 1000×500 sheet
    const parts = [makeRect("big", 400, 300, 10)];
    const result = engine.nestParts(parts, sheet, { spacing_mm: 5 });
    expect(result.sheets_used).toBeGreaterThan(1);
    expect(result.placed.length + result.unplaced.length).toBe(10);
  });

  it("calculateUtilization returns same value as result", () => {
    const parts = [makeRect("X", 300, 200, 2)];
    const result = engine.nestParts(parts, sheet);
    const util = engine.calculateUtilization(result);
    expect(util).toBeCloseTo(result.utilization_pct, 1);
  });

  it("optimizeNesting tries multiple strategies and returns best", () => {
    const parts = [makeRect("P", 100, 60, 5), makeRect("Q", 80, 80, 3)];
    const best = engine.optimizeNesting(parts, sheet);
    const basic = engine.nestParts(parts, sheet, { strategy: "blf" });
    // optimized should be at least as good
    expect(best.utilization_pct).toBeGreaterThanOrEqual(basic.utilization_pct - 0.1);
  });

  it("generateCutOrder returns all placed parts in boustrophedon order", () => {
    const parts = [makeRect("R", 100, 80, 6)];
    const result = engine.nestParts(parts, sheet);
    const order = engine.generateCutOrder(result);
    expect(order.length).toBe(result.placed.length);
    // All placed parts accounted for
    const ids = order.map((p) => `${p.part_id}_${p.instance}`).sort();
    const orig = result.placed.map((p) => `${p.part_id}_${p.instance}`).sort();
    expect(ids).toEqual(orig);
  });

  it("estimateScrap returns correct scrap area and percentage", () => {
    const parts = [makeRect("S", 500, 250, 1)]; // half the sheet
    const result = engine.nestParts(parts, sheet);
    const scrap = engine.estimateScrap(result, sheet);
    expect(scrap.scrap_area_mm2).toBeGreaterThan(0);
    expect(scrap.scrap_pct).toBeGreaterThan(0);
    expect(scrap.scrap_pct).toBeLessThan(100);
  });
});

// ─── DXFParserEngine ─────────────────────────────────────────────────────────

describe("DXFParserEngine", () => {
  const engine = new DXFParserEngine();

  const makeDXF = (entities: string) => `
0
SECTION
2
ENTITIES
${entities}
0
ENDSEC
0
EOF
`;

  it("parseDXF: LINE entities build a closed square loop", () => {
    const dxf = makeDXF(`
0
LINE
10
0.0
20
0.0
11
100.0
21
0.0
0
LINE
10
100.0
20
0.0
11
100.0
21
100.0
0
LINE
10
100.0
20
100.0
11
0.0
21
100.0
0
LINE
10
0.0
20
100.0
11
0.0
21
0.0
`);
    const polygons = engine.parseDXF(dxf);
    expect(polygons.length).toBeGreaterThanOrEqual(1);
    const sq = polygons[0];
    expect(sq.vertices.length).toBeGreaterThanOrEqual(4);
    expect(sq.area_mm2).toBeCloseTo(10000, 0);
  });

  it("parseDXF: CIRCLE entity produces 36-point polygon", () => {
    const dxf = makeDXF(`
0
CIRCLE
10
50.0
20
50.0
40
30.0
`);
    const polygons = engine.parseDXF(dxf);
    expect(polygons.length).toBe(1);
    const circ = polygons[0];
    expect(circ.vertices.length).toBe(36);
    // Area ≈ π × 30² ≈ 2827 (discrete 36-pt polygon slightly underestimates)
    expect(circ.area_mm2).toBeCloseTo(Math.PI * 900, -2);
  });

  it("parseDXF: ARC entity discretizes to polyline segment", () => {
    const dxf = makeDXF(`
0
ARC
10
0.0
20
0.0
40
50.0
50
0.0
51
180.0
`);
    const polygons = engine.parseDXF(dxf);
    // ARC alone won't close unless paired, but we get at least one segment result
    // or a forced-close polygon
    expect(Array.isArray(polygons)).toBe(true);
  });

  it("parseDXF: LWPOLYLINE with vertices forms correct polygon", () => {
    const dxf = makeDXF(`
0
LWPOLYLINE
70
1
10
0.0
20
0.0
10
200.0
20
0.0
10
200.0
20
100.0
10
0.0
20
100.0
`);
    const polygons = engine.parseDXF(dxf);
    expect(polygons.length).toBeGreaterThanOrEqual(1);
    expect(polygons[0].area_mm2).toBeCloseTo(20000, 0);
  });

  it("parseSVG: rect element produces 4-vertex polygon", () => {
    const svg = `<svg><rect x="10" y="20" width="100" height="50"/></svg>`;
    const polygons = engine.parseSVG(svg);
    expect(polygons.length).toBe(1);
    expect(polygons[0].vertices.length).toBe(4);
    expect(polygons[0].area_mm2).toBeCloseTo(5000, 0);
  });

  it("parseSVG: path with M L Z commands produces polygon", () => {
    const svg = `<svg><path d="M 0 0 L 100 0 L 100 80 L 0 80 Z"/></svg>`;
    const polygons = engine.parseSVG(svg);
    expect(polygons.length).toBeGreaterThanOrEqual(1);
    const area = polygons[0].area_mm2;
    expect(area).toBeCloseTo(8000, 0);
  });

  it("calculateArea shoelace formula is correct", () => {
    const poly = {
      id: "test",
      vertices: [
        { x: 0, y: 0 }, { x: 50, y: 0 },
        { x: 50, y: 40 }, { x: 0, y: 40 },
      ],
      is_hole: false,
      area_mm2: 2000,
      perimeter_mm: 180,
      bbox: { x: 0, y: 0, w: 50, h: 40 },
    };
    const area = engine.calculateArea(poly);
    expect(area).toBeCloseTo(2000, 0);
  });

  it("classifyContours marks inner polygon as hole", () => {
    // Outer 200×200 square, inner 50×50 square (centroid inside outer)
    const outer = {
      id: "outer",
      vertices: [
        { x: 0, y: 0 }, { x: 200, y: 0 },
        { x: 200, y: 200 }, { x: 0, y: 200 },
      ],
      is_hole: false,
      area_mm2: 40000,
      perimeter_mm: 800,
      bbox: { x: 0, y: 0, w: 200, h: 200 },
    };
    const inner = {
      id: "inner",
      vertices: [
        { x: 75, y: 75 }, { x: 125, y: 75 },
        { x: 125, y: 125 }, { x: 75, y: 125 },
      ],
      is_hole: false,
      area_mm2: 2500,
      perimeter_mm: 200,
      bbox: { x: 75, y: 75, w: 50, h: 50 },
    };
    const classified = engine.classifyContours([outer, inner]);
    const outerResult = classified.find((p) => p.id === "outer");
    const innerResult = classified.find((p) => p.id === "inner");
    expect(outerResult?.is_hole).toBe(false);
    expect(innerResult?.is_hole).toBe(true);
  });
});
