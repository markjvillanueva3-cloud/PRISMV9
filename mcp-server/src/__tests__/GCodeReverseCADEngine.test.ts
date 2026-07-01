/**
 * GCodeReverseCADEngine.test.ts
 *
 * Real reference-value + algebraic-invariant tests for G-code -> CAD
 * feature-bucket reconstruction (ECHO-ULTIMATE-ROADMAP Track A).
 *
 * Verified exported symbols:
 *   - GCodeReverseCADEngine (class) -- .reconstruct(blocks, tools, stock)
 *   - gcodeReverseCADEngine (singleton)
 *   - ToolEnvelope, StockBlock, ReverseCADFeature, ReverseCADResult (types)
 *
 * ParsedBlock is imported from GCodeRuntimePredictorEngine (the engine under
 * test imports it as a type; tests import from the source to stay structural).
 *
 * Reference values are hand-derived below each fixture (see inline comments).
 * Algebraic invariant: finished_vol = stock_vol - removed_vol >= 0 always.
 *
 * R9: every assertion encodes WHY the value matters, not incidental output.
 */

import { describe, it, expect } from "vitest";
import {
  GCodeReverseCADEngine,
  gcodeReverseCADEngine,
  type ToolEnvelope,
  type StockBlock,
  type ReverseCADFeature,
} from "../engines/GCodeReverseCADEngine.js";
import type { ParsedBlock } from "../engines/GCodeRuntimePredictorEngine.js";

const engine = new GCodeReverseCADEngine();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard 100 x 80 x 50 mm stock block. vol = 400,000 mm^3 */
const STD_STOCK: StockBlock = {
  min: { x: 0, y: 0, z: -50 },
  max: { x: 100, y: 80, z: 0 },
};
const STD_STOCK_VOL = 100 * 80 * 50; // 400,000

function toolChange(t: number): ParsedBlock {
  return { m: [6], t };
}

function feed(x: number, y: number, z: number, n?: number): ParsedBlock {
  return { motion: "G1", x, y, z, f: 500, n };
}

function cannedDrill(
  x: number,
  y: number,
  z: number,
  cycle: "G81" | "G83" = "G83",
): ParsedBlock {
  return { motion: cycle, x, y, z, q: 5 };
}

function cannedTap(x: number, y: number, z: number): ParsedBlock {
  return { motion: "G84", x, y, z };
}

function cannedBore(x: number, y: number, z: number): ParsedBlock {
  return { motion: "G85", x, y, z };
}

/**
 * Build a canonical 4-tool program:
 *   T1 = 10mm drill    -> hole,        depth 25mm -> vol = PI*(5^2)*25 ~= 1963.495
 *   T2 = 12mm endmill  -> pocket,      40x30x15   -> vol = 40*30*15 = 18,000
 *   T3 = 50mm facemill -> face,        80x60x1    -> vol = 80*60*1  = 4,800
 *   T4 = 6mm tap       -> tapped_hole, depth 20mm -> vol = PI*(3^2)*20 ~= 565.487
 *   total removed ~= 25,328.982 mm^3
 *   finished  ~= 374,671.018 mm^3
 */
function buildFourToolProgram(): {
  blocks: ParsedBlock[];
  tools: Map<number, ToolEnvelope>;
} {
  const blocks: ParsedBlock[] = [
    // T1: drill
    toolChange(1),
    { motion: "G0", x: 50, y: 40, z: 2 },
    cannedDrill(50, 40, -25),
    // T2: endmill pocket  XY extent: x=10..50 (40mm), y=10..40 (30mm), z_min=-15 -> depth 15
    toolChange(2),
    feed(10, 10, -1),
    feed(50, 10, -15),
    feed(50, 40, -15),
    feed(10, 40, -15),
    feed(10, 10, -15),
    // T3: facemill  XY=80x60, DOC=1mm (<= FACE_DOC_MAX=2)
    toolChange(3),
    feed(0,  0,  -1),
    feed(80, 0,  -1),
    feed(80, 60, -1),
    feed(0,  60, -1),
    // T4: tap  depth 20mm
    toolChange(4),
    { motion: "G0", x: 25, y: 25, z: 2 },
    cannedTap(25, 25, -20),
  ];

  const tools = new Map<number, ToolEnvelope>([
    [1, { tool_number: 1, type: "drill",    diameter_mm: 10 }],
    [2, { tool_number: 2, type: "endmill",  diameter_mm: 12 }],
    [3, { tool_number: 3, type: "facemill", diameter_mm: 50 }],
    [4, { tool_number: 4, type: "tap",      diameter_mm: 6  }],
  ]);

  return { blocks, tools };
}

// ---------------------------------------------------------------------------
// Suite 1 -- algebraic invariant: volume conservation
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- algebraic volume invariant", () => {
  it("stock_vol = finished_vol + material_removed_mm3 (conservation law)", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);

    expect(r.stock_volume_mm3).toBeCloseTo(STD_STOCK_VOL, 3);
    // Conservation: finished + removed must equal stock to floating-point precision
    expect(r.finished_volume_mm3 + r.material_removed_mm3).toBeCloseTo(
      r.stock_volume_mm3,
      3,
    );
    expect(r.finished_volume_mm3).toBeGreaterThanOrEqual(0);
  });

  it("finished_volume < stock_volume when features are extracted", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.finished_volume_mm3).toBeLessThan(r.stock_volume_mm3);
    expect(r.material_removed_mm3).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 -- happy path: reference feature counts + kinds
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- 4-tool happy path", () => {
  it("extracts exactly 4 features from the 4-tool program", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.features.length).toBe(4);
  });

  it("classifies T1 drill cycle (G83) as 'hole' with correct diameter and depth", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    const hole: ReverseCADFeature | undefined = r.features.find(
      (f) => f.kind === "hole",
    );
    expect(hole?.kind).toBe("hole");
    expect(hole?.tool_number).toBe(1);
    expect(hole?.primary_dim_mm).toBeCloseTo(10, 5); // 10mm drill dia
    expect(hole?.depth_mm).toBeCloseTo(25, 3);       // |z_min| = 25
    expect(hole?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("classifies T2 endmill op as 'pocket' with correct XY extents and depth", () => {
    // x=10..50 -> 40mm, y=10..40 -> 30mm, z_min=-15 -> depth=15
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    const pocket: ReverseCADFeature | undefined = r.features.find(
      (f) => f.kind === "pocket",
    );
    expect(pocket?.kind).toBe("pocket");
    expect(pocket?.primary_dim_mm).toBeCloseTo(40, 3);
    expect(pocket?.secondary_dim_mm).toBeCloseTo(30, 3);
    expect(pocket?.depth_mm).toBeCloseTo(15, 3);
    expect(pocket?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("classifies T3 facemill op as 'face' with correct XY extents and DOC", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    const face: ReverseCADFeature | undefined = r.features.find(
      (f) => f.kind === "face",
    );
    expect(face?.kind).toBe("face");
    expect(face?.primary_dim_mm).toBeCloseTo(80, 3);
    expect(face?.secondary_dim_mm).toBeCloseTo(60, 3);
    expect(face?.depth_mm).toBeCloseTo(1, 5);
  });

  it("classifies T4 tap cycle (G84) as 'tapped_hole' with correct dia and depth", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    const tap: ReverseCADFeature | undefined = r.features.find(
      (f) => f.kind === "tapped_hole",
    );
    expect(tap?.kind).toBe("tapped_hole");
    expect(tap?.tool_number).toBe(4);
    expect(tap?.primary_dim_mm).toBeCloseTo(6, 5);
    expect(tap?.depth_mm).toBeCloseTo(20, 3);
    expect(tap?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("reference total material removed ~= 25328.98 mm^3 (hand-computed)", () => {
    // hole:    PI * (10/2)^2 * 25 = PI * 25 * 25 = 1963.4954...
    // tap:     PI * (6/2)^2  * 20 = PI * 9  * 20 =  565.4867...
    // pocket:  40 * 30 * 15       = 18000
    // face:    80 * 60 *  1       =  4800
    // total  = 25328.982...
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    const expected =
      Math.PI * 25 * 25 +   // hole  (r=5, depth=25)
      Math.PI *  9 * 20 +   // tap   (r=3, depth=20)
      40 * 30 * 15     +    // pocket
      80 * 60 *  1;         // face
    expect(r.material_removed_mm3).toBeCloseTo(expected, 1);
  });

  it("finished volume ~= 374,671 mm^3 (stock_vol - total_removed)", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    const expectedRemoved =
      Math.PI * 25 * 25 +
      Math.PI *  9 * 20 +
      40 * 30 * 15      +
      80 * 60 *  1;
    const expectedFinished = STD_STOCK_VOL - expectedRemoved;
    expect(r.finished_volume_mm3).toBeCloseTo(expectedFinished, 1);
  });

  it("feature_counts histogram matches extracted feature kinds", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.feature_counts.hole).toBe(1);
    expect(r.feature_counts.pocket).toBe(1);
    expect(r.feature_counts.face).toBe(1);
    expect(r.feature_counts.tapped_hole).toBe(1);
    expect(r.feature_counts["3d_surface"]).toBe(0);
    expect(r.feature_counts.chamfer).toBe(0);
    expect(r.feature_counts.bored_hole).toBe(0);
    expect(r.feature_counts.contour_edge).toBe(0);
  });

  it("summary[0] contains stock dimensions '100.0 x 80.0 x 50.0'", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.summary.length).toBeGreaterThanOrEqual(3);
    expect(r.summary[0]).toContain("100.0 x 80.0 x 50.0");
  });

  it("summary contains a 'Material removed' line with a percentage figure", () => {
    const { blocks, tools } = buildFourToolProgram();
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    const removedLine = r.summary.find((s) => s.includes("Material removed"));
    // The line must exist and contain a percentage like '6.3%'
    expect(removedLine).toMatch(/Material removed:.*\d+\.\d+%/);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 -- bore classification (G85)
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- bore cycle (G85)", () => {
  it("classifies G85 with bore tool as 'bored_hole' with correct volume", () => {
    // bored_hole volume = PI * r^2 * depth = PI * 12.5^2 * 18
    const blocks: ParsedBlock[] = [
      toolChange(1),
      { motion: "G0", x: 30, y: 30, z: 2 },
      cannedBore(30, 30, -18),
    ];
    const tools = new Map<number, ToolEnvelope>([
      [1, { tool_number: 1, type: "bore", diameter_mm: 25 }],
    ]);
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.features.length).toBe(1);
    expect(r.features[0].kind).toBe("bored_hole");
    expect(r.features[0].primary_dim_mm).toBeCloseTo(25, 5);
    expect(r.features[0].confidence).toBeGreaterThanOrEqual(0.9);
    // volume = PI * (25/2)^2 * 18 = PI * 156.25 * 18
    const expectedVol = Math.PI * (25 / 2) ** 2 * 18;
    expect(r.material_removed_mm3).toBeCloseTo(expectedVol, 1);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 -- chamfer classification
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- chamfer tool", () => {
  it("classifies a chamfer-mill pass as 'chamfer' with correct primary_dim", () => {
    const blocks: ParsedBlock[] = [
      toolChange(1),
      feed(10, 10, -0.5),
      feed(50, 10, -0.5),
      feed(50, 50, -0.5),
    ];
    const tools = new Map<number, ToolEnvelope>([
      [1, { tool_number: 1, type: "chamfermill", diameter_mm: 16 }],
    ]);
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.features.length).toBe(1);
    expect(r.features[0].kind).toBe("chamfer");
    expect(r.features[0].primary_dim_mm).toBeCloseTo(16, 5);
    expect(r.feature_counts.chamfer).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 -- singleton mirrors instance behaviour
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- singleton export", () => {
  it("gcodeReverseCADEngine singleton produces identical results to new instance", () => {
    const { blocks, tools } = buildFourToolProgram();
    const fromInstance  = engine.reconstruct(blocks, tools, STD_STOCK);
    const fromSingleton = gcodeReverseCADEngine.reconstruct(blocks, tools, STD_STOCK);
    expect(fromSingleton.features.length).toBe(fromInstance.features.length);
    expect(fromSingleton.stock_volume_mm3).toBe(fromInstance.stock_volume_mm3);
    expect(fromSingleton.material_removed_mm3).toBeCloseTo(
      fromInstance.material_removed_mm3,
      6,
    );
    expect(fromSingleton.feature_counts.hole).toBe(fromInstance.feature_counts.hole);
  });
});

// ---------------------------------------------------------------------------
// Suite 6 -- failure modes (>=3 required by law)
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- failure modes", () => {
  it("[failure] throws on inverted stock (x max < x min -> negative span)", () => {
    const badStock: StockBlock = {
      min: { x: 50, y: 0, z: -50 },
      max: { x: 20, y: 80, z: 0 },
    };
    expect(() => engine.reconstruct([], new Map(), badStock)).toThrow(
      /Stock dimensions must be positive/,
    );
  });

  it("[failure] throws on zero-depth stock (z span = 0)", () => {
    const zeroZ: StockBlock = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 100, y: 80, z: 0 },
    };
    expect(() => engine.reconstruct([], new Map(), zeroZ)).toThrow(
      /Stock dimensions must be positive/,
    );
  });

  it("[failure] throws when blocks argument is not an array", () => {
    // @ts-expect-error -- intentional bad input for failure-mode coverage
    expect(() => engine.reconstruct(null, new Map(), STD_STOCK)).toThrow(
      /blocks must be an array/,
    );
  });

  it("[failure] throws when stock.min is absent", () => {
    const badStock = { min: undefined, max: { x: 100, y: 80, z: 0 } } as unknown as StockBlock;
    expect(() => engine.reconstruct([], new Map(), badStock)).toThrow(
      /stock geometry required/,
    );
  });

  it("[failure] unknown tool number goes to warnings (not features); conservation holds", () => {
    const blocks: ParsedBlock[] = [
      toolChange(99),
      feed(10, 10, -5),
      feed(20, 10, -5),
      feed(20, 20, -5),
    ];
    const r = engine.reconstruct(blocks, new Map(), STD_STOCK);
    expect(r.features.length).toBe(0);
    expect(r.warnings.some((w) => w.includes("T99"))).toBe(true);
    // Nothing removed -- conservation trivially holds
    expect(r.material_removed_mm3).toBeCloseTo(0, 10);
    expect(r.finished_volume_mm3).toBeCloseTo(STD_STOCK_VOL, 6);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 -- adversarial inputs (>=2 required by law)
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- adversarial inputs", () => {
  it("[adversarial] empty program: zero features, stock volume intact", () => {
    const r = engine.reconstruct([], new Map(), STD_STOCK);
    expect(r.features.length).toBe(0);
    expect(r.warnings.length).toBe(0);
    expect(r.material_removed_mm3).toBeCloseTo(0, 10);
    expect(r.stock_volume_mm3).toBeCloseTo(STD_STOCK_VOL, 3);
    // Conservation: finished = stock when nothing removed
    expect(r.finished_volume_mm3).toBeCloseTo(STD_STOCK_VOL, 3);
    expect(r.feature_counts.hole).toBe(0);
    expect(r.feature_counts.pocket).toBe(0);
  });

  it("[adversarial] blocks with no x/y/z coords: engine warns, no crash, invariant holds", () => {
    // classifyOp returns null when xs/ys/zs are empty (no extent derivable)
    const blocks: ParsedBlock[] = [
      toolChange(1),
      { motion: "G1", f: 500 },    // no x/y/z
      { motion: "G1", f: 500 },
    ];
    const tools = new Map<number, ToolEnvelope>([
      [1, { tool_number: 1, type: "endmill", diameter_mm: 10 }],
    ]);
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.features.length).toBe(0);
    expect(r.warnings.some((w) => w.includes("T1"))).toBe(true);
    // Volume invariant still holds even with unclassifiable op
    expect(r.finished_volume_mm3 + r.material_removed_mm3).toBeCloseTo(
      r.stock_volume_mm3,
      6,
    );
  });

  it("[adversarial] T# without M06 is a preload (ignored) -- no features formed", () => {
    // A bare T# without M06 must not trigger a tool-group boundary
    const blocks: ParsedBlock[] = [
      { t: 5 },                 // preload only -- no M06
      feed(0,  0,  -10),
      feed(50, 0,  -10),
      feed(50, 50, -10),
    ];
    const tools = new Map<number, ToolEnvelope>([
      [5, { tool_number: 5, type: "endmill", diameter_mm: 16 }],
    ]);
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    // currentTool stays 0, never in catalog => no features
    expect(r.features.length).toBe(0);
    expect(r.finished_volume_mm3).toBeCloseTo(r.stock_volume_mm3, 6);
  });

  it("[adversarial] shallow drill (depth < DRILL_DEPTH_THRESHOLD_MM=1.0) is NOT a hole", () => {
    // z_min = -0.5 => |z_min| = 0.5 < 1.0 threshold
    const blocks: ParsedBlock[] = [
      toolChange(1),
      cannedDrill(50, 40, -0.5),
    ];
    const tools = new Map<number, ToolEnvelope>([
      [1, { tool_number: 1, type: "drill", diameter_mm: 8 }],
    ]);
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.feature_counts.hole).toBe(0);
  });

  it("[adversarial] oversized drill (dia > HOLE_DIAMETER_MAX_MM=50) is NOT classified as hole", () => {
    const blocks: ParsedBlock[] = [
      toolChange(1),
      cannedDrill(50, 40, -20),
    ];
    const tools = new Map<number, ToolEnvelope>([
      [1, { tool_number: 1, type: "drill", diameter_mm: 55 }],
    ]);
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.feature_counts.hole).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 8 -- 3D surface (ballmill fallback)
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- 3D surface (ballmill fallback)", () => {
  it("classifies ball-mill with >50 motions and no canned cycles as '3d_surface'", () => {
    // Need >50 motion blocks to cross the threshold (engine checks motions.length > 50)
    const motionBlocks: ParsedBlock[] = Array.from({ length: 55 }, (_, i) =>
      feed(i * 1.0, i * 0.5, -2 - i * 0.05),
    );
    const blocks: ParsedBlock[] = [toolChange(1), ...motionBlocks];
    const tools = new Map<number, ToolEnvelope>([
      [1, { tool_number: 1, type: "ballmill", diameter_mm: 6 }],
    ]);
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.features.length).toBe(1);
    expect(r.features[0].kind).toBe("3d_surface");
    // Volume formula: primary_dim^2 * depth * 0.3
    const f = r.features[0];
    const expectedVol = f.primary_dim_mm * f.primary_dim_mm * f.depth_mm * 0.3;
    expect(r.material_removed_mm3).toBeCloseTo(expectedVol, 4);
  });
});

// ---------------------------------------------------------------------------
// Suite 9 -- source block traceability (N-numbers)
// ---------------------------------------------------------------------------

describe("GCodeReverseCADEngine -- source block N-number traceability", () => {
  it("features carry source_blocks with the first and last N-numbers of the op", () => {
    const blocks: ParsedBlock[] = [
      toolChange(1),
      { motion: "G83", x: 50, y: 40, z: -25, n: 100, q: 5 },
      { motion: "G83", x: 55, y: 40, z: -25, n: 110, q: 5 },
    ];
    const tools = new Map<number, ToolEnvelope>([
      [1, { tool_number: 1, type: "drill", diameter_mm: 10 }],
    ]);
    const r = engine.reconstruct(blocks, tools, STD_STOCK);
    expect(r.features.length).toBe(1);
    expect(r.features[0].source_blocks.start).toBe(100);
    expect(r.features[0].source_blocks.end).toBe(110);
  });
});
