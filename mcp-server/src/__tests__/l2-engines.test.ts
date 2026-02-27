/**
 * L2-P0-MS1 — 8 Monolith Engine Port Tests
 * Covers: FileIO, Simulation, Visualization, AIML, CADKernel, CAMKernel, Report, Settings
 */
import { describe, it, expect } from "vitest";

// ── FileIOEngine ────────────────────────────────────────────
import { FileIOEngine, fileIOEngine } from "../engines/FileIOEngine.js";

describe("FileIOEngine", () => {
  it("singleton exists and is correct class", () => {
    expect(fileIOEngine).toBeInstanceOf(FileIOEngine);
  });

  it("parses STEP AP203 file content", () => {
    const step = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Test'),'2;1');
FILE_NAME('test.step','2024-01-01',('author'),('org'),'preprocessor','originator','auth');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=CARTESIAN_POINT('origin',(0.0,0.0,0.0));
#2=DIRECTION('z',(0.0,0.0,1.0));
#3=AXIS2_PLACEMENT_3D('base',#1,#2,#2);
#4=CIRCLE('c1',#3,10.0);
#5=EDGE_CURVE('e1',#1,#1,#4,.T.);
ENDSEC;
END-ISO-10303-21;`;
    const result = fileIOEngine.parseSTEP(step);
    expect(result.header.file_name).toBe("test.step");
    expect(result.entities.size).toBe(5);
    expect(result.statistics.total_entities).toBe(5);
  });

  it("parses STL ASCII content with geometry metrics", () => {
    const stl = `solid test
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
facet normal 0 0 -1
  outer loop
    vertex 0 0 0
    vertex 0 1 0
    vertex 1 0 0
  endloop
endfacet
endsolid test`;
    const result = fileIOEngine.parse(stl, "stl_ascii") as any;
    expect(result.name).toBe("test");
    expect(result.statistics.triangle_count).toBe(2);
    expect(result.statistics.surface_area).toBeGreaterThan(0);
    expect(result.bounding_box).toBeDefined();
  });

  it("parses IGES content", () => {
    const iges = `                                                                        S      1
1H,,1H;,7Htest.igs,11Htranslator;                                      G      1
     110       1       0       0       0                        00000000D      1
     110       0       0       1       0                                D      2
110,0.0,0.0,0.0,10.0,10.0,0.0;                                        1P      1
S      1G      1D      2P      1                                        T      1`;
    const result = fileIOEngine.parseIGES(iges);
    expect(result.entities.length).toBeGreaterThanOrEqual(1);
  });

  it("generates STL ASCII output", () => {
    const triangles = [
      { v1: {x:0,y:0,z:0}, v2: {x:1,y:0,z:0}, v3: {x:0,y:1,z:0}, normal: {x:0,y:0,z:1} },
    ];
    const output = fileIOEngine.generateSTL("test_out", triangles);
    expect(output).toContain("solid test_out");
    expect(output).toContain("facet normal");
    expect(output).toContain("endsolid test_out");
  });

  it("generates DXF output", () => {
    const entities = [
      { type: "LINE", points: [{x:0,y:0,z:0}, {x:10,y:10,z:0}] },
    ];
    const output = fileIOEngine.generateDXF(entities);
    expect(output).toContain("SECTION");
    expect(output).toContain("LINE");
    expect(output).toContain("EOF");
  });

  it("detects format from content", () => {
    expect(fileIOEngine.detectFormat("ISO-10303-21;\nHEADER;")).toBe("step");
    expect(fileIOEngine.detectFormat("solid cube\nfacet normal\nendsolid cube")).toBe("stl_ascii");
  });
});

// ── SimulationEngine ────────────────────────────────────────
import { SimulationEngine, simulationEngine } from "../engines/SimulationEngine.js";

describe("SimulationEngine", () => {
  it("singleton exists and is correct class", () => {
    expect(simulationEngine).toBeInstanceOf(SimulationEngine);
  });

  it("parses G-code lines", () => {
    const lines = simulationEngine.parseGCode("G0 X10 Y20 Z5\nG1 X20 F500\nM30");
    expect(lines.length).toBe(3);
    expect(lines[0].g_codes).toContain(0);
    expect(lines[0].x).toBe(10);
    expect(lines[1].f).toBe(500);
  });

  it("runs full simulation with cycle time", () => {
    const gcode = `G90 G21
T1 M6
S10000 M3
G0 X0 Y0 Z50
G0 Z5
G1 Z-2 F200
G1 X50 F1000
G1 Y50
G0 Z50
M30`;
    const tool = { id: "T1", type: "endmill" as const, diameter: 10, flute_length: 30, total_length: 100, number_of_flutes: 4 };

    const result = simulationEngine.simulate({
      program: gcode,
      tools: [tool],
      machine: { name: "Test", controller: "fanuc", axes: 3, travel: {x:500,y:500,z:300}, max_rpm: 24000, max_feed: 15000, rapid_rate: 30000, spindle_taper: "BT40" },
    });
    expect(result.total_moves).toBeGreaterThan(0);
    expect(result.cycle_time_sec).toBeGreaterThan(0);
    expect(result.tool_usage.length).toBeGreaterThanOrEqual(1);
    expect(result.bounding_box).toBeDefined();
  });

  it("detects rapid plunge collision (spindle off)", () => {
    // Rapid plunge >5mm with spindle off triggers collision
    const gcode = `G90 G21
T1 M6
G0 X25 Y25 Z-10
M30`;
    const tool = { id: "T1", type: "endmill" as const, diameter: 10, flute_length: 30, total_length: 100, number_of_flutes: 4 };

    const result = simulationEngine.simulate({
      program: gcode,
      tools: [tool],
    });
    expect(result.collisions.length).toBeGreaterThan(0);
    expect(result.collisions[0].type).toBe("rapid_plunge");
  });

  it("estimates cycle time for known path length", () => {
    const gcode = `G90 G21\nG1 X100 F1000\nM30`;
    const result = simulationEngine.simulate({ program: gcode });
    expect(result.cycle_time_sec).toBeGreaterThan(5);
    expect(result.cycle_time_sec).toBeLessThan(20);
  });
});

// ── VisualizationEngine ─────────────────────────────────────
import { VisualizationEngine, visualizationEngine } from "../engines/VisualizationEngine.js";

describe("VisualizationEngine", () => {
  it("singleton exists and is correct class", () => {
    expect(visualizationEngine).toBeInstanceOf(VisualizationEngine);
  });

  it("returns valid camera config for all presets", () => {
    const presets = ["front", "back", "top", "bottom", "left", "right", "iso", "iso_rear"] as const;
    for (const p of presets) {
      const cam = visualizationEngine.getCamera(p);
      expect(cam.position).toBeDefined();
      expect(cam.target).toBeDefined();
      expect(cam.up).toBeDefined();
      expect(cam.fov).toBeGreaterThan(0);
    }
  });

  it("generates box mesh with correct structure", () => {
    const mesh = visualizationEngine.generateBoxMesh("box1", "Stock", 10, 20, 30);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(mesh.normals.length).toBeGreaterThan(0);
    expect(mesh.id).toBe("box1");
  });

  it("generates cylinder mesh", () => {
    const mesh = visualizationEngine.generateCylinderMesh("cyl1", "Tool", 5, 20, 16);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it("builds toolpath visualization data", () => {
    const moves = [
      { move_type: "G0", start: {x:0,y:0,z:10}, end: {x:50,y:0,z:10}, feed_rate: 0 },
      { move_type: "G1", start: {x:50,y:0,z:10}, end: {x:50,y:50,z:-2}, feed_rate: 1000 },
    ];
    const viz = visualizationEngine.generateToolpathVis(moves, "by_type");
    expect(viz.segments.length).toBe(2);
    expect(viz.segments[0].color).toBeDefined();
    expect(viz.total_points).toBeGreaterThan(0);
  });

  it("generates heatmap config", () => {
    const config = visualizationEngine.generateHeatmap("thermal", 20, 500, "°C");
    expect(config.type).toBe("thermal");
    expect(config.min_value).toBe(20);
    expect(config.max_value).toBe(500);
    expect(config.color_stops.length).toBeGreaterThan(0);
  });

  it("builds complete scene graph", () => {
    const scene = visualizationEngine.buildScene({
      stock: { width: 100, height: 100, depth: 50 },
    });
    expect(scene.root).toBeDefined();
    expect(scene.root.children).toBeDefined();
    expect(scene.camera).toBeDefined();
  });
});

// ── AIMLEngine ──────────────────────────────────────────────
import { AIMLEngine, aimlEngine } from "../engines/AIMLEngine.js";

describe("AIMLEngine", () => {
  it("singleton exists and is correct class", () => {
    expect(aimlEngine).toBeInstanceOf(AIMLEngine);
  });

  it("lists built-in models", () => {
    const models = aimlEngine.listModels();
    expect(models.length).toBeGreaterThanOrEqual(8);
    const ids = models.map(m => m.id);
    expect(ids).toContain("speed_feed_regressor");
    expect(ids).toContain("tool_life_predictor");
    expect(ids).toContain("chatter_detector");
  });

  it("returns prediction for speed_feed model", () => {
    const result = aimlEngine.predict({
      model_id: "speed_feed_regressor",
      features: { material_hardness: 150, tool_diameter: 10 },
    });
    expect(result.prediction).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.computation_ms).toBeGreaterThanOrEqual(0);
  });

  it("predicts tool life", () => {
    const result = aimlEngine.predict({
      model_id: "tool_life_predictor",
      features: { cutting_speed: 200, feed_per_tooth: 0.1 },
    });
    expect(result.prediction).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("classifies manufacturing intent", () => {
    const result = aimlEngine.classifyIntent("What speed and feed should I use for aluminum?");
    expect(result.intent).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it("performs k-means clustering", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: i < 15 ? Math.random() * 10 : 50 + Math.random() * 10,
      y: Math.random() * 10,
    }));
    const result = aimlEngine.cluster({ features: data, k: 2 });
    expect(result.clusters.length).toBe(2);
    expect(result.silhouette_score).toBeDefined();
  });

  it("detects anomaly via z-score", () => {
    const result = aimlEngine.detectAnomaly({ temp: 200, vibration: 15, force: 9999 });
    expect(result.is_anomaly).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.threshold).toBeGreaterThan(0);
  });

  it("extracts features from structured data", () => {
    const features = aimlEngine.extractFeatures({
      material: { name: "aluminum 6061", hardness: 95, iso_group: "N" },
      tool: { diameter: 10, type: "endmill", flutes: 3 },
    });
    expect(features).toBeDefined();
    expect(Object.keys(features).length).toBeGreaterThan(0);
    expect(features.tool_diameter).toBe(10);
  });
});

// ── CADKernelEngine ─────────────────────────────────────────
import { CADKernelEngine, cadKernelEngine } from "../engines/CADKernelEngine.js";

describe("CADKernelEngine", () => {
  it("singleton exists and is correct class", () => {
    expect(cadKernelEngine).toBeInstanceOf(CADKernelEngine);
  });

  // Vec3 operations
  it("performs Vec3 arithmetic", () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 4, y: 5, z: 6 };
    expect(cadKernelEngine.vec3Add(a, b)).toEqual({ x: 5, y: 7, z: 9 });
    expect(cadKernelEngine.vec3Sub(b, a)).toEqual({ x: 3, y: 3, z: 3 });
    expect(cadKernelEngine.vec3Dot(a, b)).toBe(32);
    const cross = cadKernelEngine.vec3Cross(a, b);
    expect(cross.x).toBe(-3);
    expect(cross.y).toBe(6);
    expect(cross.z).toBe(-3);
  });

  it("normalizes vectors", () => {
    const n = cadKernelEngine.vec3Normalize({ x: 3, y: 0, z: 0 });
    expect(n.x).toBeCloseTo(1);
    expect(n.y).toBeCloseTo(0);
    expect(n.z).toBeCloseTo(0);
  });

  // Mat4 operations
  it("creates identity matrix", () => {
    const I = cadKernelEngine.mat4Identity();
    expect(I.elements[0]).toBe(1); expect(I.elements[5]).toBe(1);
    expect(I.elements[10]).toBe(1); expect(I.elements[15]).toBe(1);
    expect(I.elements[1]).toBe(0);
  });

  it("transforms point by translation matrix", () => {
    const T = cadKernelEngine.mat4Translation(10, 20, 30);
    const p = cadKernelEngine.mat4TransformPoint(T, { x: 1, y: 2, z: 3 });
    expect(p.x).toBeCloseTo(11);
    expect(p.y).toBeCloseTo(22);
    expect(p.z).toBeCloseTo(33);
  });

  // Quaternion
  it("rotates vector by quaternion", () => {
    const q = cadKernelEngine.quatFromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
    const rotated = cadKernelEngine.quatRotateVec3(q, { x: 1, y: 0, z: 0 });
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(1);
    expect(rotated.z).toBeCloseTo(0);
  });

  // NURBS
  it("evaluates linear NURBS curve", () => {
    const curve = {
      degree: 1,
      control_points: [{ x: 0, y: 0, z: 0, w: 1 }, { x: 10, y: 10, z: 0, w: 1 }],
      knot_vector: [0, 0, 1, 1],
      is_periodic: false,
    };
    const mid = cadKernelEngine.evaluateNURBSCurve(curve, 0.5);
    expect(mid.x).toBeCloseTo(5);
    expect(mid.y).toBeCloseTo(5);
  });

  // Bezier
  it("evaluates quadratic Bezier curve", () => {
    const curve = {
      control_points: [{ x: 0, y: 0, z: 0 }, { x: 5, y: 10, z: 0 }, { x: 10, y: 0, z: 0 }],
    };
    const mid = cadKernelEngine.evaluateBezierCurve(curve, 0.5);
    expect(mid.x).toBeCloseTo(5);
    expect(mid.y).toBeCloseTo(5);
  });

  // Ray intersection
  it("performs ray-AABB intersection", () => {
    const ray = { origin: { x: -10, y: 0.5, z: 0.5 }, direction: { x: 1, y: 0, z: 0 } };
    const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
    const hit = cadKernelEngine.rayAABBIntersect(ray, box);
    expect(hit.hit).toBe(true);
    expect(hit.t).toBeCloseTo(10);
  });

  it("returns miss for ray-AABB miss", () => {
    const ray = { origin: { x: -10, y: 5, z: 5 }, direction: { x: 1, y: 0, z: 0 } };
    const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
    const hit = cadKernelEngine.rayAABBIntersect(ray, box);
    expect(hit.hit).toBe(false);
  });

  it("performs ray-triangle intersection (Moller-Trumbore)", () => {
    const ray = { origin: { x: 0.25, y: 0.25, z: -1 }, direction: { x: 0, y: 0, z: 1 } };
    const tri = {
      v0: { x: 0, y: 0, z: 0 },
      v1: { x: 1, y: 0, z: 0 },
      v2: { x: 0, y: 1, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    };
    const hit = cadKernelEngine.rayTriangleIntersect(ray, tri);
    expect(hit.hit).toBe(true);
    expect(hit.t).toBeCloseTo(1);
  });

  // Mesh operations
  it("computes mesh volume and surface area", () => {
    const box = cadKernelEngine.generateBox(2, 2, 2);
    const vol = cadKernelEngine.meshVolume(box);
    expect(vol).toBeGreaterThan(0);
    const area = cadKernelEngine.meshSurfaceArea(box);
    expect(area).toBeGreaterThan(0);
    // Box mesh produces consistent triangle coverage
    expect(box.triangle_count).toBeGreaterThanOrEqual(12);
  });

  // Convex hull
  it("computes 2D convex hull (Graham scan)", () => {
    const points = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.5 },
      { x: 0, y: 1 }, { x: 1, y: 1 },
    ];
    const hull = cadKernelEngine.convexHull2D(points);
    expect(hull.length).toBe(4);
  });

  // Point in polygon
  it("checks point-in-polygon (ray casting)", () => {
    const polygon = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(cadKernelEngine.pointInPolygon2D({ x: 5, y: 5 }, polygon)).toBe(true);
    expect(cadKernelEngine.pointInPolygon2D({ x: 15, y: 5 }, polygon)).toBe(false);
  });

  // Polygon area
  it("computes polygon area (shoelace formula)", () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(cadKernelEngine.polygonArea2D(square)).toBeCloseTo(100);
  });

  // AABB
  it("computes and queries AABB", () => {
    const points = [{ x: -5, y: -5, z: -5 }, { x: 5, y: 5, z: 5 }, { x: 0, y: 0, z: 0 }];
    const aabb = cadKernelEngine.computeAABB(points);
    expect(aabb.min).toEqual({ x: -5, y: -5, z: -5 });
    expect(aabb.max).toEqual({ x: 5, y: 5, z: 5 });
    expect(cadKernelEngine.aabbContains(aabb, { x: 0, y: 0, z: 0 })).toBe(true);
    expect(cadKernelEngine.aabbContains(aabb, { x: 10, y: 0, z: 0 })).toBe(false);
  });
});

// ── CAMKernelEngine ─────────────────────────────────────────
import { CAMKernelEngine, camKernelEngine } from "../engines/CAMKernelEngine.js";

describe("CAMKernelEngine", () => {
  it("singleton exists and is correct class", () => {
    expect(camKernelEngine).toBeInstanceOf(CAMKernelEngine);
  });

  // Scallop math
  it("calculates scallop height", () => {
    const h = camKernelEngine.calculateScallopHeight(10, 5);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(5);
  });

  it("calculates stepover from scallop target", () => {
    const s = camKernelEngine.stepoverFromScallop(10, 0.01);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(10);
  });

  // Chip thinning
  it("calculates chip thinning compensation", () => {
    const result = camKernelEngine.calculateChipThinning(0.1, 3, 10);
    expect(result.compensated_feed_rate).toBeGreaterThan(0);
    expect(result.compensation_factor).toBeGreaterThan(0);
    expect(result.radial_engagement_percent).toBeGreaterThan(0);
  });

  // Engagement
  it("calculates radial engagement angle", () => {
    const result = camKernelEngine.calculateRadialEngagement(60, 10);
    expect(result.engagement_angle_deg).toBeGreaterThan(0);
    expect(result.engagement_angle_deg).toBeLessThanOrEqual(180);
    expect(result.stepover_percent).toBeGreaterThan(0);
  });

  // Toolpath generation - face mill
  it("generates face mill toolpath", () => {
    const tp = camKernelEngine.generateFaceMill({
      width: 100, length: 100, tool_diameter: 50,
      stepover_percent: 70, z_top: 0, z_bottom: -1,
      step_down: 1, feed_rate: 2000, rapid_height: 10,
    });
    expect(tp.moves.length).toBeGreaterThan(0);
    expect(tp.operation).toBe("face_mill");
    expect(tp.stats.cutting_distance_mm).toBeGreaterThan(0);
  });

  // 2D pocket
  it("generates 2D pocket toolpath", () => {
    const tp = camKernelEngine.generatePocket2D({
      boundary: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
      tool_diameter: 10, stepover_percent: 60,
      z_top: 0, z_bottom: -5, step_down: 2,
      feed_rate: 1000, rapid_height: 10,
    });
    expect(tp.moves.length).toBeGreaterThan(0);
    expect(tp.operation).toBe("pocket_2d");
  });

  // 2D contour
  it("generates 2D contour toolpath", () => {
    const tp = camKernelEngine.generateContour2D({
      contour: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
      tool_diameter: 10, z_top: 0, z_bottom: -5,
      step_down: 2, feed_rate: 1000, rapid_height: 10,
      side: "left",
    });
    expect(tp.moves.length).toBeGreaterThan(0);
    expect(tp.operation).toBe("contour_2d");
  });

  // Helical ramp
  it("generates helical ramp entry", () => {
    const result = camKernelEngine.generateHelicalRamp({
      center: { x: 25, y: 25 }, diameter: 10,
      z_start: 0, z_end: -10, feed_rate: 200,
    });
    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.total_depth).toBeCloseTo(10);
  });

  // Peck drill
  it("generates peck drill cycle", () => {
    const tp = camKernelEngine.generatePeckDrill({
      x: 25, y: 25, z_top: 0, z_bottom: -20,
      peck_depth: 5, retract_height: 5, feed_rate: 100,
    });
    expect(tp.moves.length).toBeGreaterThan(0);
    expect(tp.operation).toBe("drill_peck");
  });

  // Entry strategy selection
  it("selects entry strategy based on material", () => {
    const tool = { id: "T1", type: "endmill" as const, diameter: 10, flute_length: 30, total_length: 75, number_of_flutes: 3 };
    const entry = camKernelEngine.selectEntryStrategy(tool, "aluminum", 20, 5);
    expect(["helix", "ramp", "plunge", "arc_entry", "pre_drill"]).toContain(entry.strategy);
    expect(entry.moves).toBeDefined();
  });

  it("selects conservative entry for titanium", () => {
    const tool = { id: "T1", type: "endmill" as const, diameter: 10, flute_length: 30, total_length: 75, number_of_flutes: 3 };
    const entry = camKernelEngine.selectEntryStrategy(tool, "titanium", 20, 20);
    expect(["helix", "ramp"]).toContain(entry.strategy);
  });

  // G-code serialization
  it("serializes toolpath to G-code", () => {
    const moves = [
      { type: "rapid" as const, x: 0, y: 0, z: 50 },
      { type: "rapid" as const, x: 10, y: 10, z: 50 },
      { type: "feed" as const, x: 10, y: 10, z: -2, f: 200 },
      { type: "feed" as const, x: 50, y: 10, z: -2, f: 1000 },
    ];
    const gcode = camKernelEngine.serializeGCode(moves, { controller: "fanuc" });
    expect(gcode.some((l: string) => l.includes("G0"))).toBe(true);
    expect(gcode.some((l: string) => l.includes("G1"))).toBe(true);
    expect(gcode.some((l: string) => l.includes("F200"))).toBe(true);
  });

  // Program generation
  it("generates complete G-code program", () => {
    const tp: any = {
      operation: "face_mill",
      moves: [
        { type: "rapid", x: 0, y: 0, z: 50 },
        { type: "feed", x: 50, y: 0, z: -2, f: 500 },
      ],
      stats: { total_moves: 2, rapid_moves: 1, cutting_moves: 1, total_distance_mm: 100, cutting_distance_mm: 50, estimated_time_sec: 5 },
    };
    const tool = { id: "T1", type: "endmill" as const, diameter: 10, flute_length: 30, total_length: 75, number_of_flutes: 3 };
    const program = camKernelEngine.generateProgram({
      toolpaths: [tp],
      tools: [tool],
      params: { controller: "fanuc", program_number: "1001", rpm: 10000 },
    });
    expect(program.lines.some((l: string) => l.includes("O1001"))).toBe(true);
    expect(program.lines.some((l: string) => l.includes("G0") || l.includes("G1"))).toBe(true);
    expect(program.lines.some((l: string) => l.includes("M30"))).toBe(true);
  });

  // Collision checking
  it("detects collision for rapid into stock", () => {
    const toolpath: any = {
      moves: [{ type: "rapid", x: 25, y: 25, z: -5 }],
      operation: "test",
    };
    const tool = { id: "T1", type: "endmill" as const, diameter: 10, flute_length: 30, total_length: 75, number_of_flutes: 3 };
    const result = camKernelEngine.checkCollisions({
      toolpath,
      stock_bounds: { min: { x: 0, y: 0, z: -10 }, max: { x: 50, y: 50, z: 0 } },
      tool,
    });
    expect(result.collisions.length).toBeGreaterThan(0);
    expect(result.has_collision).toBe(true);
  });

  it("reports safe for normal operation", () => {
    const toolpath: any = {
      moves: [
        { type: "rapid", x: 0, y: 0, z: 50 },
        { type: "rapid", x: 25, y: 25, z: 5 },
        { type: "feed", x: 25, y: 25, z: -2, f: 200 },
      ],
      operation: "test",
    };
    const tool = { id: "T1", type: "endmill" as const, diameter: 10, flute_length: 30, total_length: 75, number_of_flutes: 3 };
    const result = camKernelEngine.checkCollisions({
      toolpath,
      stock_bounds: { min: { x: 0, y: 0, z: -10 }, max: { x: 50, y: 50, z: 0 } },
      tool,
    });
    expect(result.has_collision).toBe(false);
  });
});

// ── ReportEngine ────────────────────────────────────────────
import { ReportEngine, reportEngine } from "../engines/ReportEngine.js";

describe("ReportEngine", () => {
  it("singleton exists and is correct class", () => {
    expect(reportEngine).toBeInstanceOf(ReportEngine);
  });

  it("generates setup sheet report", () => {
    const report = reportEngine.generateSetupSheet({
      part_number: "TEST-001",
      machine: { name: "Haas VF-2", controller: "Haas", axes: 3, spindle_taper: "BT40" },
      stock: { material: "6061-T6 Aluminum", iso_group: "N", dimensions: { x: 100, y: 100, z: 50 } },
      tools: [
        { position: 1, tool_id: "EM10", description: "10mm 3FL EM", diameter: 10, flute_length: 30, total_length: 75 },
      ],
      operations: [
        { seq: 1, description: "Face mill top", tool_position: 1, spindle_rpm: 10000, feed_rate: 2000, depth_of_cut: 1.0, coolant: "flood", estimated_time_min: 2 },
      ],
      notes: ["Deburr all edges"],
    });
    expect(report.meta.type).toBe("setup_sheet");
    expect(report.machine.name).toBe("Haas VF-2");
    expect(report.stock.material).toContain("6061-T6");
  });

  it("generates tool list report", () => {
    const report = reportEngine.generateToolList({
      tools: [
        { position: 1, tool_id: "EM10", type: "endmill", description: "10mm EM", diameter: 10, flute_length: 30, total_length: 75, number_of_flutes: 3, coating: "TiAlN", material: "carbide", holder: "ER16", gauge_length: 50, operations_used: ["facing"], max_rpm: 15000, max_feed: 3000, estimated_life_min: 120, cost: 45 },
        { position: 2, tool_id: "DR8.5", type: "drill", description: "8.5mm drill", diameter: 8.5, flute_length: 60, total_length: 100, number_of_flutes: 2, coating: "TiN", material: "HSS", holder: "ER16", gauge_length: 70, operations_used: ["drilling"], max_rpm: 3000, max_feed: 500, estimated_life_min: 60, cost: 15 },
      ],
    });
    expect(report.meta.type).toBe("tool_list");
    expect(report.total_tools).toBe(2);
    expect(report.tools[0].type).toBe("endmill");
  });

  it("generates cost estimate report", () => {
    const report = reportEngine.generateCostEstimate({
      part_number: "TEST-001",
      material: { material: "aluminum", weight_kg: 2.5, cost_per_kg: 8.0 },
      tools: [{ id: "EM10", cost: 45, expected_life_parts: 120, cost_per_part: 0.375 }],
      machine: { name: "Haas VF-2", rate_per_hour: 85, cycle_time_min: 15.5, setup_time_min: 30 },
    });
    expect(report.meta.type).toBe("cost_estimate");
    expect(report.total_cost_per_part).toBeGreaterThan(0);
  });
});

// ── SettingsEngine ──────────────────────────────────────────
import { SettingsEngine, settingsEngine } from "../engines/SettingsEngine.js";

describe("SettingsEngine", () => {
  it("singleton exists and is correct class", () => {
    expect(settingsEngine).toBeInstanceOf(SettingsEngine);
  });

  it("converts mm to inches and back", () => {
    const result = settingsEngine.convertUnit(25.4, "mm", "in", "length");
    expect(result.value).toBeCloseTo(1.0);
    const result2 = settingsEngine.convertUnit(1.0, "in", "mm", "length");
    expect(result2.value).toBeCloseTo(25.4);
  });

  it("converts temperature between units", () => {
    const result = settingsEngine.convertUnit(100, "celsius", "fahrenheit", "temperature");
    expect(result.value).toBeCloseTo(212);
    const result2 = settingsEngine.convertUnit(212, "fahrenheit", "celsius", "temperature");
    expect(result2.value).toBeCloseTo(100);
    const result3 = settingsEngine.convertUnit(0, "celsius", "kelvin", "temperature");
    expect(result3.value).toBeCloseTo(273.15);
  });

  it("returns valid presets", () => {
    const presets = settingsEngine.listPresets();
    expect(presets).toBeDefined();
  });

  it("validates safety limits — force exceeded", () => {
    const result = settingsEngine.checkSafetyLimits({
      force_N: 50000,
      deflection_mm: 0.5,
      temperature_C: 1000,
    });
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.safe).toBe(false);
  });

  it("returns safe for normal parameters", () => {
    const result = settingsEngine.checkSafetyLimits({
      force_N: 500,
      deflection_mm: 0.01,
      temperature_C: 200,
    });
    expect(result.safe).toBe(true);
  });
});
