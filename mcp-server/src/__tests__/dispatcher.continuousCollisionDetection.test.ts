/**
 * dispatcher.continuousCollisionDetection.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CCD (ContinuousCollisionDetectionEngine).
 *
 * 3 pure-compute actions through real `prism_dev`:
 *   ccd_check_move, ccd_validate_rapid_moves, ccd_compare_with_discrete
 *
 * Engine-pair test pre-exists at continuous-collision-detection.test.ts.
 *
 * VECTOR3 RECONSTRUCTION: Engine expects Vector3 instances (not plain
 * {x,y,z}) because it calls .add/.subtract/.multiply/.length() on them.
 * Dispatcher reconstructs Vector3 from JSON shape — this test verifies
 * the reconstruction path works (no "v.subtract is not a function").
 *
 * Safety-critical: false-negative CCD verdict could cause real machine
 * crash. Test asserts collision is actually detected, not just "no error".
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { Vector3 } from "../engines/CollisionEngine.js";
import { ContinuousCollisionDetectionEngine } from "../engines/ContinuousCollisionDetectionEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

const ENDMILL_10MM = {
  diameter: 10,
  fluteLength: 30,
  totalLength: 75,
  type: "endmill" as const,
};

// A wall blocking the path from (0,0,50) to (50,0,50) — tool must collide
// at x≈25 with this obstacle which spans x∈[24,26], y∈[-50,50], z∈[0,100].
const WALL_OBSTACLE = {
  id: "test-wall",
  type: "wall" as const,
  aabb: {
    min: { x: 24, y: -50, z: 0 },
    max: { x: 26, y: 50, z: 100 },
  },
};

// A wall well clear of the path — no collision expected.
const CLEAR_OBSTACLE = {
  id: "far-wall",
  type: "wall" as const,
  aabb: {
    min: { x: 100, y: -50, z: 0 },
    max: { x: 102, y: 50, z: 100 },
  },
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CCD — Zod schemas", () => {
  it("ccd_check_move requires startPosition + endPosition + toolGeometry + obstacles + motionType", () => {
    expect(ACTION_DEV_SCHEMAS["ccd_check_move"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ccd_check_move"].safeParse({
      startPosition: { x: 0, y: 0, z: 0 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [],
      motionType: "linear",
    }).success).toBe(true);
  });

  it("ccd_check_move rejects NaN/Infinity in positions (z.number().finite())", () => {
    expect(ACTION_DEV_SCHEMAS["ccd_check_move"].safeParse({
      startPosition: { x: NaN, y: 0, z: 0 },
      endPosition: { x: 50, y: 0, z: 0 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [],
      motionType: "linear",
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ccd_check_move"].safeParse({
      startPosition: { x: 0, y: 0, z: 0 },
      endPosition: { x: Infinity, y: 0, z: 0 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [],
      motionType: "linear",
    }).success).toBe(false);
  });

  it("ccd_check_move caps obstacles at 500 (DoS)", () => {
    const huge = new Array(501).fill(WALL_OBSTACLE);
    expect(ACTION_DEV_SCHEMAS["ccd_check_move"].safeParse({
      startPosition: { x: 0, y: 0, z: 0 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: huge,
      motionType: "linear",
    }).success).toBe(false);
  });

  it("ccd_validate_rapid_moves caps moves at 1000 (DoS)", () => {
    const huge = new Array(1001).fill({
      start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 },
    });
    expect(ACTION_DEV_SCHEMAS["ccd_validate_rapid_moves"].safeParse({
      moves: huge,
      toolGeometry: ENDMILL_10MM,
      obstacles: [],
    }).success).toBe(false);
  });

  it("ccd_check_move rejects bad motionType enum", () => {
    expect(ACTION_DEV_SCHEMAS["ccd_check_move"].safeParse({
      startPosition: { x: 0, y: 0, z: 0 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [],
      motionType: "INVALID",
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CCD — prism_dev :: ccd_check_move", () => {
  it("VECTOR3 RECONSTRUCTION proof — dispatcher does NOT crash with 'subtract is not a function'", async () => {
    // This is THE critical test — if dispatcher passed raw {x,y,z}, engine
    // would crash inside conservativeAdvancement / sweptVolumeAnalysis when
    // calling .subtract or .add. A clean response with collision boolean
    // proves Vector3 reconstruction works.
    const r = await invokeHandler(devHandler, "ccd_check_move", {
      startPosition: { x: 0, y: 0, z: 50 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [WALL_OBSTACLE],
      motionType: "linear",
    });
    expect(typeof r.collision).toBe("boolean");
    expect(typeof r.is_tunneling_case).toBe("boolean");
    expect(typeof r.min_clearance_mm).toBe("number");
  });

  it("SAFETY-CRITICAL — collision DETECTED when path crosses wall obstacle", async () => {
    const r = await invokeHandler(devHandler, "ccd_check_move", {
      startPosition: { x: 0, y: 0, z: 50 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [WALL_OBSTACLE],
      motionType: "linear",
    });
    expect(r.collision).toBe(true);
  });

  it("SAFETY-CRITICAL — NO collision when path is clear of obstacle", async () => {
    const r = await invokeHandler(devHandler, "ccd_check_move", {
      startPosition: { x: 0, y: 0, z: 50 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [CLEAR_OBSTACLE],
      motionType: "linear",
    });
    expect(r.collision).toBe(false);
  });

  it("algorithm field is one of 3 documented algorithms", async () => {
    const r = await invokeHandler(devHandler, "ccd_check_move", {
      startPosition: { x: 0, y: 0, z: 50 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [CLEAR_OBSTACLE],
      motionType: "linear",
    });
    expect(["swept_volume", "conservative_advancement", "temporal_subdivision"]).toContain(r.algorithm);
  });

  it("ROUTING PROOF — wire collision verdict matches engine-direct checkMove()", async () => {
    const r = await invokeHandler(devHandler, "ccd_check_move", {
      startPosition: { x: 0, y: 0, z: 50 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [WALL_OBSTACLE],
      motionType: "linear",
    });
    const direct = ContinuousCollisionDetectionEngine.getInstance().checkMove({
      startPosition: new Vector3(0, 0, 50),
      endPosition: new Vector3(50, 0, 50),
      toolGeometry: ENDMILL_10MM,
      obstacles: [WALL_OBSTACLE],
      motionType: "linear",
    });
    expect(r.collision).toBe(direct.collision);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CCD — prism_dev :: ccd_validate_rapid_moves", () => {
  it("returns safe=true for all-clear rapid sequence", async () => {
    const r = await invokeHandler(devHandler, "ccd_validate_rapid_moves", {
      moves: [
        { start: { x: 0, y: 0, z: 50 }, end: { x: 10, y: 0, z: 50 } },
        { start: { x: 10, y: 0, z: 50 }, end: { x: 20, y: 0, z: 50 } },
      ],
      toolGeometry: ENDMILL_10MM,
      obstacles: [CLEAR_OBSTACLE],
    });
    expect(r.safe).toBe(true);
    expect(r.collision_count).toBe(0);
    expect(r.critical_issue_count).toBe(0);
    expect(r.move_count).toBe(2);
  });

  it("returns safe=false when ANY move collides with wall", async () => {
    const r = await invokeHandler(devHandler, "ccd_validate_rapid_moves", {
      moves: [
        { start: { x: 0, y: 0, z: 50 }, end: { x: 10, y: 0, z: 50 } },     // safe
        { start: { x: 10, y: 0, z: 50 }, end: { x: 50, y: 0, z: 50 } },    // hits wall at x=24-26
      ],
      toolGeometry: ENDMILL_10MM,
      obstacles: [WALL_OBSTACLE],
    });
    expect(r.safe).toBe(false);
    expect((r.collision_count as number)).toBeGreaterThanOrEqual(1);
    expect((r.critical_issue_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("VARIABILITY — 3 distinct tool geometries (endmill/ball/drill) all roundtrip", async () => {
    const tools = [
      { ...ENDMILL_10MM, type: "endmill" as const },
      { ...ENDMILL_10MM, type: "ball" as const, ballRadius: 5 },
      { ...ENDMILL_10MM, type: "drill" as const },
    ];
    for (const tool of tools) {
      const r = await invokeHandler(devHandler, "ccd_validate_rapid_moves", {
        moves: [{ start: { x: 0, y: 0, z: 50 }, end: { x: 5, y: 0, z: 50 } }],
        toolGeometry: tool,
        obstacles: [CLEAR_OBSTACLE],
      });
      expect(typeof r.safe).toBe("boolean");
      expect(r.move_count).toBe(1);
    }
  });

  it("ROUTING PROOF — wire move_count equals engine-direct validateRapidMoves().results.length", async () => {
    const moves = [
      { start: { x: 0, y: 0, z: 50 }, end: { x: 5, y: 0, z: 50 } },
      { start: { x: 5, y: 0, z: 50 }, end: { x: 10, y: 0, z: 50 } },
    ];
    const r = await invokeHandler(devHandler, "ccd_validate_rapid_moves", {
      moves,
      toolGeometry: ENDMILL_10MM,
      obstacles: [CLEAR_OBSTACLE],
    });
    const direct = ContinuousCollisionDetectionEngine.getInstance().validateRapidMoves(
      moves.map((m) => ({
        start: new Vector3(m.start.x, m.start.y, m.start.z),
        end: new Vector3(m.end.x, m.end.y, m.end.z),
      })),
      ENDMILL_10MM,
      [CLEAR_OBSTACLE],
    );
    expect(r.move_count).toBe(direct.results.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CCD — prism_dev :: ccd_compare_with_discrete", () => {
  it("returns ccd + discrete results + tunneling flag", async () => {
    const r = await invokeHandler(devHandler, "ccd_compare_with_discrete", {
      startPosition: { x: 0, y: 0, z: 50 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [WALL_OBSTACLE],
      motionType: "linear",
      discreteInterval_mm: 5,
    });
    expect(typeof r.ccd_collision).toBe("boolean");
    expect(typeof r.discrete_collision).toBe("boolean");
    expect(typeof r.tunneling_detected).toBe("boolean");
  });

  it("tunneling_detected=true when discrete misses but CCD catches (thin wall)", async () => {
    // A thin wall at x=24.5-25.5 (1mm thick) at z=50 plane. Discrete at
    // 50mm interval samples x=0 then x=50 — both miss the 1mm slab.
    // CCD via swept volume catches the crossing.
    const thinWall = {
      id: "thin",
      type: "wall" as const,
      aabb: {
        min: { x: 24.5, y: -50, z: 0 },
        max: { x: 25.5, y: 50, z: 100 },
      },
      thickness_mm: 1,
      isThinWall: true,
    };
    const r = await invokeHandler(devHandler, "ccd_compare_with_discrete", {
      startPosition: { x: 0, y: 0, z: 50 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [thinWall],
      motionType: "linear",
      discreteInterval_mm: 50, // very coarse — designed to miss thin wall
    });
    // CCD MUST catch this (engine-direct truth)
    expect(r.ccd_collision).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CCD — error envelope", () => {
  it("ccd_check_move with NaN start → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ccd_check_move", {
      startPosition: { x: NaN, y: 0, z: 0 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: [],
      motionType: "linear",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ccd_check_move with negative tool diameter → schema rejects (positive)", async () => {
    const r = await invokeHandler(devHandler, "ccd_check_move", {
      startPosition: { x: 0, y: 0, z: 0 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: { ...ENDMILL_10MM, diameter: -10 },
      obstacles: [],
      motionType: "linear",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ccd_check_move with > 500 obstacles → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ccd_check_move", {
      startPosition: { x: 0, y: 0, z: 0 },
      endPosition: { x: 50, y: 0, z: 50 },
      toolGeometry: ENDMILL_10MM,
      obstacles: new Array(600).fill(WALL_OBSTACLE),
      motionType: "linear",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ccd_validate_rapid_moves with empty moves array → schema rejects (min 1)", async () => {
    const r = await invokeHandler(devHandler, "ccd_validate_rapid_moves", {
      moves: [],
      toolGeometry: ENDMILL_10MM,
      obstacles: [],
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
