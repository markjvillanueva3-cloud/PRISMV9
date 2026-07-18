/**
 * CAM Kernel Enhancements — hyperMILL Knowledge Integration
 * Tests for 7 enhancements across ToolpathGenerationEngine,
 * CAMKernelEngine, and CollisionEngine.
 *
 * 29 tests total.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { ToolpathGenerationEngine } from "../engines/ToolpathGenerationEngine";
import {
  CAMKernelEngine,
  type ToolSpec,
  type MaterialType,
  type ClearancePlaneConfig,
  type SequencedOperation,
} from "../engines/CAMKernelEngine";
import {
  CollisionEngine,
  Vector3,
  Quaternion,
  type ToolAssembly,
  type MachineEnvelope,
  type Fixture,
  type Workpiece,
  type Toolpath,
  type AABB,
} from "../engines/CollisionEngine";

// ── Shared helpers ──────────────────────────────────────────────────

const tpEngine = new ToolpathGenerationEngine();
const camEngine = new CAMKernelEngine();

function makeToolSpec(overrides: Partial<ToolSpec> = {}): ToolSpec {
  return {
    id: "T1",
    type: "endmill",
    diameter: 10,
    flute_length: 25,
    total_length: 75,
    number_of_flutes: 4,
    corner_radius: 0,
    ...overrides,
  };
}

function makeToolpathParams(overrides: Record<string, unknown> = {}) {
  return {
    strategy: "pocket_zigzag" as const,
    tool_diameter_mm: 10,
    stepover_pct: 50,
    stepdown_mm: 2,
    feed_rate_mmmin: 1000,
    plunge_rate_mmmin: 300,
    spindle_rpm: 10000,
    cut_direction: "climb" as const,
    coolant: "flood" as const,
    retract_height_mm: 25,
    ...overrides,
  };
}

// ============================================================================
// Enhancement 1: Material-Specific Stepdown Defaults
// ============================================================================

describe("Enhancement 1: Material-Specific Stepdown Defaults", () => {
  it("aluminium gets high stepdown (1.5x tool diameter)", () => {
    const sd = tpEngine.getStepdownForMaterial("aluminium", 10);
    expect(sd).toBe(15); // 1.5 * 10
  });

  it("titanium gets low stepdown (0.3x tool diameter)", () => {
    const sd = tpEngine.getStepdownForMaterial("titanium", 10);
    expect(sd).toBe(3); // 0.3 * 10
  });

  it("unknown material defaults to 0.5x factor", () => {
    const sd = tpEngine.getStepdownForMaterial("unobtanium", 10);
    expect(sd).toBe(5); // 0.5 * 10
  });

  it("generate() with material param uses material stepdown", () => {
    const params = makeToolpathParams({ stepdown_mm: 2 });
    const result = tpEngine.generate(
      "pocket_rectangular",
      { width_mm: 50, length_mm: 50, depth_mm: 20 },
      params,
      "aluminium"
    );
    // Aluminium stepdown = 1.5 * 10 = 15mm, so depth 20 / 15 = 2 passes
    expect(result.number_of_passes).toBe(2);
  });
});

// ============================================================================
// Enhancement 2: Helical Entry Enhancement
// ============================================================================

describe("Enhancement 2: Helical Entry Enhancement", () => {
  it("aluminium gets wide helix diameter", () => {
    const tool = makeToolSpec({ diameter: 10 });
    const result = camEngine.selectEntryStrategy(tool, "aluminum", 30, 10);
    expect(result.strategy).toBe("helix");
    expect(result.description).toContain("D8.0mm"); // 0.80 * 10 = 8.0
  });

  it("titanium gets narrow helix diameter", () => {
    const tool = makeToolSpec({ diameter: 10 });
    const result = camEngine.selectEntryStrategy(tool, "titanium", 30, 10);
    expect(result.strategy).toBe("helix");
    // titanium helix_diameter_pct = 0.50, min = 6mm → max(5.0, 6.0) = 6.0
    expect(result.description).toContain("D6.0mm");
  });

  it("narrow feature triggers ramp fallback", () => {
    const tool = makeToolSpec({ diameter: 10 });
    // Feature 13mm wide: > 1.2*10=12 but < helixDia+toolDia=18
    const result = camEngine.selectEntryStrategy(tool, "aluminum", 13, 10);
    expect(result.strategy).toBe("ramp");
    expect(result.description).toContain("narrow feature");
  });

  it("pitch computed from chip load factor", () => {
    const tool = makeToolSpec({ diameter: 10, number_of_flutes: 4 });
    const result = camEngine.selectEntryStrategy(tool, "aluminum", 30, 10);
    // pitch = 0.05 * 4 * 1.2 = 0.240
    expect(result.description).toContain("pitch 0.240mm");
  });
});

// ============================================================================
// Enhancement 3: Clearance Plane + Linking Moves
// ============================================================================

describe("Enhancement 3: Clearance Plane + Linking Moves", () => {
  it("clearance above all obstacles", () => {
    const config = camEngine.computeClearancePlane(50, 60, 55, 5);
    expect(config.globalClearanceZ).toBe(65); // max(50,60,55) + 5
  });

  it("linking through clearance Z", () => {
    const config: ClearancePlaneConfig = {
      globalClearanceZ: 65,
      linkingMode: "z_clearance",
      minClearanceMm: 5,
    };
    const moves = camEngine.generateLinkingMove(
      { x: 0, y: 0, z: -10 },
      { x: 50, y: 50, z: -5 },
      config
    );
    expect(moves.length).toBe(3);
    expect(moves[0].type).toBe("rapid");
    expect(moves[0].z).toBe(65);
    expect(moves[1].x).toBe(50);
    expect(moves[1].y).toBe(50);
  });

  it("direct link when safe", () => {
    const config: ClearancePlaneConfig = {
      globalClearanceZ: 65,
      linkingMode: "direct",
      minClearanceMm: 5,
    };
    // Both positions above clearance
    const moves = camEngine.generateLinkingMove(
      { x: 0, y: 0, z: 70 },
      { x: 50, y: 50, z: 70 },
      config
    );
    expect(moves.length).toBe(1);
    expect(moves[0].type).toBe("rapid");
  });

  it("full retract mode", () => {
    const config: ClearancePlaneConfig = {
      globalClearanceZ: 65,
      linkingMode: "full_retract",
      minClearanceMm: 5,
    };
    const moves = camEngine.generateLinkingMove(
      { x: 0, y: 0, z: -10 },
      { x: 50, y: 50, z: -5 },
      config
    );
    expect(moves.length).toBe(3);
    expect(moves[0].z).toBe(115); // 65 + 50
  });

  it("warning when < 2mm clearance", () => {
    const config = camEngine.computeClearancePlane(50, 60, 55, 1);
    expect(config.warnings?.length).toBeGreaterThan(0);
    expect(config.warnings![0]).toContain("< 2mm");
  });
});

// ============================================================================
// Enhancement 4: Operation Sequencing Rules
// ============================================================================

describe("Enhancement 4: Operation Sequencing Rules", () => {
  it("face mill is sequenced first", () => {
    const ops: SequencedOperation[] = [
      { id: "A", type: "pocket_2d", tool_diameter: 10, feature_id: "F1" },
      { id: "B", type: "face_mill", tool_diameter: 50, feature_id: "F0" },
    ];
    const result = camEngine.sequenceOperations(ops);
    expect(result.sorted[0].type).toBe("face_mill");
  });

  it("roughing before finishing per feature", () => {
    const ops: SequencedOperation[] = [
      { id: "A", type: "scallop_3d", tool_diameter: 6, feature_id: "F1", is_finishing: true },
      { id: "B", type: "adaptive_clear", tool_diameter: 12, feature_id: "F1", is_roughing: true },
    ];
    const result = camEngine.sequenceOperations(ops);
    expect(result.sorted[0].id).toBe("B"); // roughing first
    expect(result.sorted[1].id).toBe("A"); // finishing after
  });

  it("largest tool first within same type", () => {
    const ops: SequencedOperation[] = [
      { id: "A", type: "pocket_2d", tool_diameter: 6, feature_id: "F1" },
      { id: "B", type: "pocket_2d", tool_diameter: 12, feature_id: "F2" },
    ];
    const result = camEngine.sequenceOperations(ops);
    expect(result.sorted[0].id).toBe("B"); // 12mm first
  });

  it("drilling is sequenced last", () => {
    const ops: SequencedOperation[] = [
      { id: "A", type: "drill_peck", tool_diameter: 8, feature_id: "H1" },
      { id: "B", type: "pocket_2d", tool_diameter: 10, feature_id: "F1" },
      { id: "C", type: "face_mill", tool_diameter: 50, feature_id: "F0" },
    ];
    const result = camEngine.sequenceOperations(ops);
    expect(result.sorted[result.sorted.length - 1].type).toBe("drill_peck");
  });

  it("rest machining after referenced finish", () => {
    const ops: SequencedOperation[] = [
      { id: "R", type: "pocket_2d", tool_diameter: 3, feature_id: "F1",
        is_rest: true, rest_reference_id: "F" },
      { id: "F", type: "scallop_3d", tool_diameter: 6, feature_id: "F1",
        is_finishing: true },
      { id: "G", type: "adaptive_clear", tool_diameter: 12, feature_id: "F1",
        is_roughing: true },
    ];
    const result = camEngine.sequenceOperations(ops);
    const fIdx = result.sorted.findIndex(o => o.id === "F");
    const rIdx = result.sorted.findIndex(o => o.id === "R");
    expect(rIdx).toBeGreaterThan(fIdx);
  });
});

// ============================================================================
// Enhancement 5: Rest Machining Logic
// ============================================================================

describe("Enhancement 5: Rest Machining Logic", () => {
  it("rest machining generates smaller passes", () => {
    const params = makeToolpathParams({
      strategy: "rest_machining",
      tool_diameter_mm: 6,
      stepover_pct: 50,
      stepdown_mm: 2,
      previousToolDiameter: 12,
    });
    const result = tpEngine.generate(
      "pocket_rectangular",
      { width_mm: 50, length_mm: 50, depth_mm: 4 },
      params
    );
    // Should produce cutting segments within the offset band
    const feedMoves = result.segments.filter(s => s.type === "feed");
    expect(feedMoves.length).toBeGreaterThan(0);
  });

  it("previous tool diameter affects zone width", () => {
    const paramsSmallPrev = makeToolpathParams({
      strategy: "rest_machining",
      tool_diameter_mm: 6,
      stepover_pct: 50,
      previousToolDiameter: 8, // small prev → narrow band
    });
    const paramsLargePrev = makeToolpathParams({
      strategy: "rest_machining",
      tool_diameter_mm: 6,
      stepover_pct: 50,
      previousToolDiameter: 20, // large prev → wide band
    });
    const dims = { width_mm: 50, length_mm: 50, depth_mm: 4 };
    const rSmall = tpEngine.generate("pocket_rectangular", dims, paramsSmallPrev);
    const rLarge = tpEngine.generate("pocket_rectangular", dims, paramsLargePrev);
    // Wider band = more cutting distance
    expect(rLarge.cutting_distance_mm).toBeGreaterThan(rSmall.cutting_distance_mm);
  });

  it("corner zones for rectangular pockets", () => {
    const params = makeToolpathParams({
      strategy: "rest_machining",
      tool_diameter_mm: 4,
      previousToolDiameter: 16,
    });
    const result = tpEngine.generate(
      "pocket_rectangular",
      { width_mm: 40, length_mm: 40, depth_mm: 2 },
      params
    );
    expect(result.segments.length).toBeGreaterThan(4);
  });

  it("no rest passes when same tool size", () => {
    const params = makeToolpathParams({
      strategy: "rest_machining",
      tool_diameter_mm: 10,
      previousToolDiameter: 10, // same size → bandWidth = 0
    });
    const result = tpEngine.generate(
      "pocket_rectangular",
      { width_mm: 50, length_mm: 50, depth_mm: 4 },
      params
    );
    // Only rapid segments (initial + final retract), no cutting
    const feedMoves = result.segments.filter(s => s.type === "feed");
    expect(feedMoves.length).toBe(0);
  });
});

// ============================================================================
// Enhancement 6: Holder Collision Sweep
// ============================================================================

describe("Enhancement 6: Holder Collision Sweep", () => {
  let collisionEngine: CollisionEngine;

  function makeToolAssembly(
    overrides: Partial<ToolAssembly> = {}
  ): ToolAssembly {
    return {
      toolId: "T1",
      toolType: "endmill",
      diameter: 10,
      fluteLength: 25,
      overallLength: 75,
      shankDiameter: 10,
      stickout: 50,
      ...overrides,
    };
  }

  beforeAll(() => {
    collisionEngine = new CollisionEngine();
  });

  it("helical move generates swept segments", () => {
    const tool = makeToolAssembly();
    const move = {
      type: "HELICAL" as const,
      start: new Vector3(0, 0, 0),
      end: new Vector3(5, 0, -10),
      arcCenter: new Vector3(2.5, 0, 0),
      arcRadius: 2.5,
      feedRate: 500,
    };
    const segments = collisionEngine.generateSweptVolumeForMove(move, tool);
    expect(segments.length).toBeGreaterThan(0);
  });

  it("holder generates wider swept volume than tool", () => {
    const tool = makeToolAssembly({
      diameter: 10,
      holder: {
        holderId: "H1",
        holderType: "CAT40",
        envelope: [],
        maxDiameter: 50,
        length: 80,
      },
    });
    const move = {
      type: "LINEAR" as const,
      start: new Vector3(0, 0, 0),
      end: new Vector3(100, 0, 0),
      feedRate: 500,
    };
    const segments = collisionEngine.generateSweptVolumeForMove(move, tool);
    // Should have both tool segment and holder segment
    expect(segments.length).toBe(2);
    // Holder segment should be wider
    expect(segments[1].diameter).toBe(50);
    expect(segments[0].diameter).toBe(10);
  });

  it("holder collision in deep pocket detected", () => {
    const tool = makeToolAssembly({
      diameter: 10,
      fluteLength: 25,
      holder: {
        holderId: "H1",
        holderType: "CAT40",
        envelope: [],
        maxDiameter: 50,
        length: 80,
      },
    });
    const move = {
      type: "LINEAR" as const,
      start: new Vector3(0, 0, -20),
      end: new Vector3(100, 0, -20),
      feedRate: 500,
    };
    const segments = collisionEngine.generateSweptVolumeForMove(move, tool);
    // Holder segment Z should be offset by fluteLength above tool tip
    const holderSeg = segments[1];
    expect(holderSeg.start.z).toBe(5); // -20 + 25 = 5
  });

  it("no holder segments when holder undefined", () => {
    const tool = makeToolAssembly({ holder: undefined });
    const move = {
      type: "LINEAR" as const,
      start: new Vector3(0, 0, 0),
      end: new Vector3(100, 0, 0),
      feedRate: 500,
    };
    const segments = collisionEngine.generateSweptVolumeForMove(move, tool);
    expect(segments.length).toBe(1); // tool only
  });
});

// ============================================================================
// Enhancement 7: Rapid Move vs Stock Validation
// ============================================================================

describe("Enhancement 7: Rapid Move vs Stock Validation", () => {
  let collisionEngine: CollisionEngine;

  const machine: MachineEnvelope = {
    machineId: "M1",
    xLimits: { min: -500, max: 500 },
    yLimits: { min: -500, max: 500 },
    zLimits: { min: -300, max: 100 },
  };

  function makeToolpath(moves: Array<{
    type: string; start: [number, number, number]; end: [number, number, number];
  }>) {
    return {
      tool: {
        toolId: "T1", toolType: "endmill",
        diameter: 10, fluteLength: 25,
        overallLength: 75, shankDiameter: 10, stickout: 50,
      },
      moves: moves.map((m, i) => ({
        type: m.type,
        start: new Vector3(...m.start),
        end: new Vector3(...m.end),
        lineNumber: i,
        feedRate: m.type === "RAPID" ? 30000 : 1000,
      })),
    };
  }

  beforeAll(() => {
    collisionEngine = new CollisionEngine();
  });

  it("rapid through stock detected as CRITICAL", () => {
    const tp = makeToolpath([
      { type: "RAPID", start: [0, 0, 50], end: [0, 0, -5] }, // plunges into stock
    ]);
    const workpiece: Workpiece = {
      workpieceId: "W1",
      stockGeometry: {
        type: "AABB",
        min: new Vector3(-50, -50, -30),
        max: new Vector3(50, 50, 0),
      } as AABB,
      workOffset: new Vector3(0, 0, 0),
      orientation: new Quaternion(0, 0, 0, 1),
    };
    const result = collisionEngine.validateRapidMoves(
      tp as unknown as Toolpath, machine, [], workpiece
    );
    expect(result.safe).toBe(false);
    expect(result.issues.some(i => i.startsWith("CRITICAL"))).toBe(true);
  });

  it("rapid above stock passes", () => {
    const tp = makeToolpath([
      { type: "RAPID", start: [0, 0, 50], end: [100, 0, 20] }, // well above
    ]);
    const workpiece: Workpiece = {
      workpieceId: "W1",
      stockGeometry: {
        type: "AABB",
        min: new Vector3(-50, -50, -30),
        max: new Vector3(50, 50, 0),
      } as AABB,
      workOffset: new Vector3(0, 0, 0),
      orientation: new Quaternion(0, 0, 0, 1),
    };
    const result = collisionEngine.validateRapidMoves(
      tp as unknown as Toolpath, machine, [], workpiece
    );
    const criticals = result.issues.filter(i => i.startsWith("CRITICAL"));
    expect(criticals.length).toBe(0);
  });

  it("rapid near fixture flagged", () => {
    const tp = makeToolpath([
      { type: "RAPID", start: [0, 0, 50], end: [0, 0, 12] },
    ]);
    const fixture: Fixture = {
      fixtureId: "FX1",
      type: "vise",
      position: new Vector3(0, 0, 0),
      orientation: new Quaternion(0, 0, 0, 1),
      geometry: [],
      clearanceZone: {
        type: "AABB",
        min: new Vector3(-60, -60, -10),
        max: new Vector3(60, 60, 10),
      } as AABB,
    };
    const result = collisionEngine.validateRapidMoves(
      tp as unknown as Toolpath, machine, [fixture], undefined, 5
    );
    // rapid Z=12, fixture top Z=10, margin=5 → 12 < 15 → flagged
    expect(result.issues.some(i => i.includes("fixture FX1"))).toBe(true);
  });
});
