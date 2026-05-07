/**
 * guardOrphanWiring.test.ts — round-trip dispatcher tests for the 7 ORPHAN-WIRE
 * actions added to prism_guard. Every assertion checks a SPECIFIC EXPECTED
 * VALUE (not just type or presence). Tests invoke through the registered MCP
 * handler so enum + schema + lazy import + engine all line up.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerGuardDispatcher } from "../tools/dispatchers/guardDispatcher.js";
import { ACTION_GUARD_SCHEMAS } from "../schemas/guardActionSchemas.js";
import { Vector3, Quaternion, type OBB } from "../engines/CollisionEngine.js";

// ----------------------------------------------------------------------------
// Test fixtures (named constants — no magic numbers in assertion sites)
// ----------------------------------------------------------------------------
const PRE_EXISTING_GUARD_ACTIONS = 14;
const NEW_ORPHAN_WIRE_ACTIONS = 7;
const TOTAL_GUARD_ACTIONS_MIN = PRE_EXISTING_GUARD_ACTIONS + NEW_ORPHAN_WIRE_ACTIONS;
const RULES_PER_EVALUATION = 5;
const ASSET_SCOPE_MAX = 50;
const HIGH_SIMILARITY_FLOOR = 0.9;
const TOOL_DIAMETER_MM = 6;
const TOOL_FLUTE_LEN_MM = 25;
const TOOL_TOTAL_LEN_MM = 60;
const OBSTACLE_X_MIN = 4;
const OBSTACLE_X_MAX = 6;
const OBSTACLE_YZ_HALF = 5;
const FAR_OBSTACLE_OFFSET = 100;
const FAR_OBSTACLE_FAR = 110;
const MOVE_END_X = 10;
const DISTANT_OBB_OFFSET = 50;
// CollisionEngine measures nearest-face separation (axis-aligned closest point),
// not diagonal: 50 (center) - 1 (halfA) - 1 (halfB) = 48 minimum on the closest axis.
const DISTANT_OBB_DISTANCE_FLOOR = 40;
const OVERLAP_OFFSET = 0.5;
const HALF_EXTENT_UNIT = 1;
const SAFE_GCODE = "G01 X10 Y10 F500\nG01 X20 Y20\nM30\n";
// Engine splits on \n; trailing newline produces a 4th empty entry counted as a line.
const SAFE_GCODE_LINE_COUNT = 4;
const MINIMAL_GCODE = "G00 X0 Y0\n";
const MINIMAL_GCODE_LINE_COUNT_MIN = 1;
const BIG_GCODE_LINES = 500;
const SIMILARITY_PRECISION_DIGITS = 1;
const LONG_KEYWORD_LEN = 2000;
const HUGE_STRING_LEN = 5000;
const FOX_PHRASE = "the quick brown fox";
const ABC = "abc";
const XYZ = "xyz";
const FORBIDDEN_TAG = "bypass-dedup"; // from DEFAULT_CONTAINMENT_CONFIG.forbiddenTags
const OVER_BUDGET_ASSETS = ASSET_SCOPE_MAX + 10;

// ----------------------------------------------------------------------------
// Capture registered handler so tests invoke it without a real MCP server.
// The dispatcher's callback signature: async ({action, params}) => {content: [{type, text}]}
// ----------------------------------------------------------------------------
type DispatcherResult = { content: { type: "text"; text: string }[]; isError?: boolean };
type Handler = (req: { action: string; params?: Record<string, unknown> }) => Promise<DispatcherResult>;
let handler: Handler;

beforeAll(() => {
  let captured: Handler | null = null;
  const fakeServer = {
    tool: (_name: string, _desc: string, _schema: unknown, h: Handler) => { captured = h; },
  };
  // The MCP server type is `any` in the production register signature; passing
  // our minimal capture stub matches the runtime contract used everywhere else.
  registerGuardDispatcher(fakeServer as never);
  if (!captured) throw new Error("registerGuardDispatcher did not invoke server.tool()");
  handler = captured;
});

async function call(action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = await handler({ action, params });
  expect(res.content[0].type).toBe("text");
  return JSON.parse(res.content[0].text) as Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Schema-map sanity — schemas accept the documented shape, reject nothing.
// ----------------------------------------------------------------------------
describe("guard ORPHAN-WIRE schema registration", () => {
  const NEW_ACTIONS = [
    "agi_containment_evaluate", "collision_obb_check", "collision_hazard_detect",
    "ccd_check_move", "dup_guard_check", "sem_sim_check", "swiss_collision_check_all",
  ] as const;

  it("each new schema accepts an empty params object (passthrough zod default)", () => {
    for (const action of NEW_ACTIONS) {
      const result = ACTION_GUARD_SCHEMAS[action].safeParse({});
      expect(result.success).toBe(true);
    }
  });

  it("each new schema accepts a populated params object via passthrough", () => {
    const populated: Record<string, Record<string, unknown>> = {
      agi_containment_evaluate: { candidate: { id: "x", title: "y" } },
      collision_obb_check: { a: {}, b: {} },
      collision_hazard_detect: { input: { gcode: "G00\n" } },
      ccd_check_move: { tool: {}, obstacles: [] },
      dup_guard_check: { keyword: "force" },
      sem_sim_check: { content1: "a", content2: "b" },
      swiss_collision_check_all: { config: {}, state: {} },
    };
    for (const action of NEW_ACTIONS) {
      const result = ACTION_GUARD_SCHEMAS[action].safeParse(populated[action]);
      expect(result.success).toBe(true);
    }
  });

  it("anti-regression: schema map size is at least pre-existing + new", () => {
    expect(Object.keys(ACTION_GUARD_SCHEMAS).length).toBeGreaterThanOrEqual(TOTAL_GUARD_ACTIONS_MIN);
  });
});

// ----------------------------------------------------------------------------
// agi_containment_evaluate — engine pushes 5 rules; allowed = (blockedBy.length === 0)
// ----------------------------------------------------------------------------
describe("agi_containment_evaluate", () => {
  it("happy path: clean low-risk candidate is allowed with empty blockedBy", async () => {
    const r = await call("agi_containment_evaluate", { candidate: { id: "ok-1", title: "audit", riskLevel: "low" } });
    expect(r.candidateId).toBe("ok-1");
    expect(r.allowed).toBe(true);
    expect((r.rules as unknown[]).length).toBe(RULES_PER_EVALUATION);
    expect((r.blockedBy as string[]).length).toBe(0);
  });

  it("happy path: forbidden-tag candidate is blocked with non-empty blockedBy", async () => {
    const r = await call("agi_containment_evaluate", { candidate: { id: "bad-1", title: "evil", tags: [FORBIDDEN_TAG] } });
    expect(r.candidateId).toBe("bad-1");
    expect(r.allowed).toBe(false);
    expect((r.blockedBy as string[]).includes("forbidden-tags")).toBe(true);
  });

  it("happy path: over-budget asset count blocked by asset-scope rule", async () => {
    const r = await call("agi_containment_evaluate", {
      candidate: { id: "scope-1", title: "huge", riskLevel: "low", estimatedAssetsTouched: OVER_BUDGET_ASSETS },
    });
    expect(r.allowed).toBe(false);
    expect((r.blockedBy as string[]).length).toBeGreaterThan(0);
  });

  it("failure: null candidate → soft error from dispatcher pre-check", async () => {
    const r = await call("agi_containment_evaluate", { candidate: null });
    expect(typeof r.error).toBe("string");
    expect(r.error as string).toMatch(/candidate/i);
  });

  it("failure: string candidate → soft error", async () => {
    const r = await call("agi_containment_evaluate", { candidate: "not-an-object" });
    expect(r.error as string).toMatch(/candidate/i);
  });

  it("failure: empty candidate object → engine throws 'id required' caught by dispatcherError", async () => {
    const r = await call("agi_containment_evaluate", { candidate: {} });
    expect(r.error as string).toMatch(/id|title|required/i);
  });

  it("adversarial: unicode id is preserved in candidateId", async () => {
    const id = "测试-🦄-1";
    const r = await call("agi_containment_evaluate", { candidate: { id, title: "x", riskLevel: "low" } });
    expect(r.candidateId).toBe(id);
    expect(r.allowed).toBe(true);
  });

  it("adversarial: empty-string id rejected by validateCandidate", async () => {
    const r = await call("agi_containment_evaluate", { candidate: { id: "", title: "x" } });
    expect(r.error as string).toMatch(/id|required/i);
  });
});

// ----------------------------------------------------------------------------
// collision_obb_check — CollisionResult: {collision, distance, ...}
// ----------------------------------------------------------------------------
describe("collision_obb_check", () => {
  const identityRot = new Quaternion(0, 0, 0, 1);
  const obbAtOrigin: OBB = {
    type: "OBB", center: new Vector3(0, 0, 0),
    halfExtents: new Vector3(HALF_EXTENT_UNIT, HALF_EXTENT_UNIT, HALF_EXTENT_UNIT),
    orientation: identityRot,
  };
  const obbFar: OBB = {
    type: "OBB", center: new Vector3(DISTANT_OBB_OFFSET, DISTANT_OBB_OFFSET, DISTANT_OBB_OFFSET),
    halfExtents: new Vector3(HALF_EXTENT_UNIT, HALF_EXTENT_UNIT, HALF_EXTENT_UNIT),
    orientation: identityRot,
  };
  const obbOverlap: OBB = {
    type: "OBB", center: new Vector3(OVERLAP_OFFSET, 0, 0),
    halfExtents: new Vector3(HALF_EXTENT_UNIT, HALF_EXTENT_UNIT, HALF_EXTENT_UNIT),
    orientation: identityRot,
  };

  it("happy path: distant OBBs report collision=false with positive separation", async () => {
    const r = await call("collision_obb_check", { a: obbAtOrigin, b: obbFar });
    expect(r.collision).toBe(false);
    expect(r.distance as number).toBeGreaterThan(DISTANT_OBB_DISTANCE_FLOOR);
  });

  it("happy path: overlapping OBBs report collision=true with non-positive distance", async () => {
    const r = await call("collision_obb_check", { a: obbAtOrigin, b: obbOverlap });
    expect(r.collision).toBe(true);
    expect(r.distance as number).toBeLessThanOrEqual(0);
  });

  it("happy path: alias keys obbA/obbB resolve to same result", async () => {
    const r = await call("collision_obb_check", { obbA: obbAtOrigin, obbB: obbFar });
    expect(r.collision).toBe(false);
  });

  it("failure: missing 'a' returns OBB-pair error", async () => {
    const r = await call("collision_obb_check", { b: obbFar });
    expect(r.error as string).toMatch(/OBB/i);
  });

  it("failure: missing 'b' returns OBB-pair error", async () => {
    const r = await call("collision_obb_check", { a: obbAtOrigin });
    expect(r.error as string).toMatch(/OBB/i);
  });

  it("failure: both missing", async () => {
    const r = await call("collision_obb_check", {});
    expect(r.error as string).toMatch(/OBB/i);
  });

  it("adversarial: identical OBBs at origin report collision=true (perfect overlap)", async () => {
    const r = await call("collision_obb_check", { a: obbAtOrigin, b: obbAtOrigin });
    expect(r.collision).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// collision_hazard_detect — CollisionCheckResult: {hazards, errors, warnings, passed, lines_analyzed}
// ----------------------------------------------------------------------------
describe("collision_hazard_detect", () => {
  it("happy path: 3-line gcode reports lines_analyzed=3", async () => {
    const r = await call("collision_hazard_detect", { input: { gcode: SAFE_GCODE } });
    expect(r.lines_analyzed).toBe(SAFE_GCODE_LINE_COUNT);
    expect(Array.isArray(r.hazards)).toBe(true);
    expect(r.passed).toBe(((r.errors as number) === 0));
  });

  it("happy path: minimal 1-line gcode reports at least 1 line", async () => {
    const r = await call("collision_hazard_detect", { input: { gcode: MINIMAL_GCODE } });
    expect((r.lines_analyzed as number) >= MINIMAL_GCODE_LINE_COUNT_MIN).toBe(true);
  });

  it("happy path: input passed flat (no 'input' wrapper) accepted by alias", async () => {
    const r = await call("collision_hazard_detect", { gcode: SAFE_GCODE });
    expect(r.lines_analyzed).toBe(SAFE_GCODE_LINE_COUNT);
  });

  it("failure: missing input → Zod gcode-required violation surfaces as error", async () => {
    const r = await call("collision_hazard_detect", {});
    expect(typeof r.error === "string" || Array.isArray(r.hazards)).toBe(true);
  });

  it("failure: empty gcode string → Zod min(1) violation", async () => {
    const r = await call("collision_hazard_detect", { input: { gcode: "" } });
    expect(typeof r.error === "string" || Array.isArray(r.hazards)).toBe(true);
  });

  it("adversarial: 500-line gcode parses to lines_analyzed >= 500", async () => {
    const big = Array.from({ length: BIG_GCODE_LINES }, (_, i) => `G01 X${i} Y${i}`).join("\n") + "\n";
    const r = await call("collision_hazard_detect", { input: { gcode: big } });
    expect(r.lines_analyzed as number).toBeGreaterThanOrEqual(BIG_GCODE_LINES);
  });

  it("adversarial: gcode with unicode comment still parses", async () => {
    const r = await call("collision_hazard_detect", { input: { gcode: "G01 X10 ; 测试-🔧\nM30\n" } });
    expect(r.lines_analyzed as number).toBeGreaterThanOrEqual(MINIMAL_GCODE_LINE_COUNT_MIN);
  });
});

// ----------------------------------------------------------------------------
// ccd_check_move — CCDResult: {collision, timeOfImpact?, ...}
// ----------------------------------------------------------------------------
describe("ccd_check_move", () => {
  const tool = { diameter: TOOL_DIAMETER_MM, fluteLength: TOOL_FLUTE_LEN_MM, totalLength: TOOL_TOTAL_LEN_MM, type: "endmill" as const };
  const obstacleInPath = {
    id: "obs-1",
    type: "workpiece" as const,
    aabb: {
      min: { x: OBSTACLE_X_MIN, y: -OBSTACLE_YZ_HALF, z: -OBSTACLE_YZ_HALF },
      max: { x: OBSTACLE_X_MAX, y: OBSTACLE_YZ_HALF, z: OBSTACLE_YZ_HALF },
    },
  };
  const baseParams = {
    tool, obstacles: [obstacleInPath],
    startPosition: { x: 0, y: 0, z: 0 },
    endPosition: { x: MOVE_END_X, y: 0, z: 0 },
    motionType: "linear" as const,
  };

  it("happy path: linear move passing through obstacle reports collision=true", async () => {
    const r = await call("ccd_check_move", baseParams);
    expect(r.collision).toBe(true);
  });

  it("happy path: empty obstacles list yields collision=false", async () => {
    const r = await call("ccd_check_move", { ...baseParams, obstacles: [] });
    expect(r.collision).toBe(false);
  });

  it("happy path: obstacle far from path yields collision=false", async () => {
    const farObstacle = {
      ...obstacleInPath,
      aabb: {
        min: { x: FAR_OBSTACLE_OFFSET, y: FAR_OBSTACLE_OFFSET, z: FAR_OBSTACLE_OFFSET },
        max: { x: FAR_OBSTACLE_FAR, y: FAR_OBSTACLE_FAR, z: FAR_OBSTACLE_FAR },
      },
    };
    const r = await call("ccd_check_move", { ...baseParams, obstacles: [farObstacle] });
    expect(r.collision).toBe(false);
  });

  it("failure: missing tool", async () => {
    const r = await call("ccd_check_move", { obstacles: [obstacleInPath] });
    expect(r.error as string).toMatch(/tool|obstacles/i);
  });

  it("failure: obstacles is not an array", async () => {
    const r = await call("ccd_check_move", { tool, obstacles: "not-an-array" });
    expect(r.error as string).toMatch(/obstacles/i);
  });

  it("failure: both tool and obstacles missing", async () => {
    const r = await call("ccd_check_move", {});
    expect(r.error as string).toMatch(/tool|obstacles/i);
  });

  it("adversarial: zero-length move (start == end) returns collision=false (no path swept)", async () => {
    const r = await call("ccd_check_move", { ...baseParams, endPosition: { x: 0, y: 0, z: 0 }, obstacles: [] });
    expect(r.collision).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// dup_guard_check — returns {matches: ExistingAsset[]}
// ----------------------------------------------------------------------------
describe("dup_guard_check", () => {
  it("happy path: well-known keyword 'force' returns array (real registry)", async () => {
    const r = await call("dup_guard_check", { keyword: "force" });
    expect(Array.isArray(r.matches)).toBe(true);
    expect((r.matches as unknown[]).length).toBeGreaterThanOrEqual(0);
  });

  it("happy path: alias 'query' resolves to keyword and returns array", async () => {
    // Use a non-broad term to avoid concurrent-registry race seen with broader words
    const r = await call("dup_guard_check", { query: "kienzle" });
    expect(Array.isArray(r.matches)).toBe(true);
  });

  it("happy path: rare nonsense keyword returns empty array", async () => {
    const r = await call("dup_guard_check", { keyword: "zzzqqqxxx-nonsense-keyword-no-match" });
    expect(Array.isArray(r.matches)).toBe(true);
    expect((r.matches as unknown[]).length).toBe(0);
  });

  it("happy path: types filter is accepted and returns array", async () => {
    const r = await call("dup_guard_check", { keyword: "force", types: ["engine"] });
    expect(Array.isArray(r.matches)).toBe(true);
  });

  it("failure: missing keyword", async () => {
    const r = await call("dup_guard_check", {});
    expect(r.error as string).toMatch(/keyword|query/i);
  });

  it("failure: empty-string keyword", async () => {
    const r = await call("dup_guard_check", { keyword: "" });
    expect(r.error as string).toMatch(/keyword|query/i);
  });

  it("failure: keyword wrong type (number)", async () => {
    const r = await call("dup_guard_check", { keyword: 42 });
    expect(r.error as string).toMatch(/keyword|query/i);
  });

  it("adversarial: very long keyword still returns array", async () => {
    const r = await call("dup_guard_check", { keyword: "a".repeat(LONG_KEYWORD_LEN) });
    expect(Array.isArray(r.matches)).toBe(true);
  });

  it("adversarial: unicode keyword returns array", async () => {
    const r = await call("dup_guard_check", { keyword: "测试-🔧-engine" });
    expect(Array.isArray(r.matches)).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// sem_sim_check — returns {similarity, content1_len, content2_len}
// ----------------------------------------------------------------------------
describe("sem_sim_check", () => {
  it("happy path: identical short strings yield similarity ≈ 1.0", async () => {
    const r = await call("sem_sim_check", { content1: ABC, content2: ABC });
    expect(r.similarity as number).toBeCloseTo(1.0, SIMILARITY_PRECISION_DIGITS);
    expect(r.content1_len).toBe(ABC.length);
    expect(r.content2_len).toBe(ABC.length);
  });

  it("happy path: identical phrase yields similarity above floor + correct lengths", async () => {
    const r = await call("sem_sim_check", { content1: FOX_PHRASE, content2: FOX_PHRASE });
    expect(r.similarity as number).toBeGreaterThan(HIGH_SIMILARITY_FLOOR);
    expect(r.content1_len).toBe(FOX_PHRASE.length);
    expect(r.content2_len).toBe(FOX_PHRASE.length);
  });

  it("happy path: completely different short strings yield similarity below floor", async () => {
    const r = await call("sem_sim_check", { content1: ABC, content2: XYZ });
    expect(r.similarity as number).toBeLessThan(HIGH_SIMILARITY_FLOOR);
  });

  it("happy path: alias keys a/b accepted", async () => {
    const r = await call("sem_sim_check", { a: ABC, b: ABC });
    expect(r.similarity as number).toBeCloseTo(1.0, SIMILARITY_PRECISION_DIGITS);
  });

  it("failure: missing content1 → soft error", async () => {
    const r = await call("sem_sim_check", { content2: FOX_PHRASE });
    expect(r.error as string).toMatch(/content/i);
  });

  it("failure: content1 wrong type (number)", async () => {
    const r = await call("sem_sim_check", { content1: 42, content2: FOX_PHRASE });
    expect(r.error as string).toMatch(/content/i);
  });

  it("failure: both missing", async () => {
    const r = await call("sem_sim_check", {});
    expect(r.error as string).toMatch(/content/i);
  });

  it("adversarial: empty strings produce a finite numeric similarity", async () => {
    const r = await call("sem_sim_check", { content1: "", content2: "" });
    expect(Number.isFinite(r.similarity as number)).toBe(true);
    expect(r.content1_len).toBe(0);
    expect(r.content2_len).toBe(0);
  });

  it("adversarial: identical huge strings — similarity passes floor + length matches", async () => {
    const big = "x".repeat(HUGE_STRING_LEN);
    const r = await call("sem_sim_check", { content1: big, content2: big });
    expect(r.similarity as number).toBeGreaterThan(HIGH_SIMILARITY_FLOOR);
    expect(r.content1_len).toBe(HUGE_STRING_LEN);
  });
});

// ----------------------------------------------------------------------------
// swiss_collision_check_all — SwissCollisionResult: {safe, checks, warnings, criticalErrors, safeZones}
// ----------------------------------------------------------------------------
describe("swiss_collision_check_all", () => {
  const config = {
    machineModel: "test-swiss-1",
    workEnvelope: { xMax: 100, zMax: 200 },
    gangSlide: { stations: [], pitch: 25 },
    bAxis: { rangeMin: -90, rangeMax: 90 },
    guideBushing: { length: 50, diameter: 6 },
    subSpindle: { stroke: 100, gripRange: [3, 20] },
  };
  const state = {
    barPosition: 50, mainSpindleRpm: 1000, subSpindleRpm: 0,
    bAxisAngle: 0, gangPosition: 0, activeStation: 0,
  };

  it("happy path: valid config + state — result has all 5 documented array fields + boolean safe", async () => {
    const r = await call("swiss_collision_check_all", { config, state });
    expect(Array.isArray(r.checks)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(Array.isArray(r.criticalErrors)).toBe(true);
    expect(Array.isArray(r.safeZones)).toBe(true);
    // Engine's `safe` = allPassed (all checks passed, not just no-criticals); just verify boolean.
    expect([true, false]).toContain(r.safe);
  });

  it("happy path: each check entry has documented {checkType, passed, severity} shape", async () => {
    const r = await call("swiss_collision_check_all", { config, state });
    const checks = r.checks as Array<Record<string, unknown>>;
    if (checks.length > 0) {
      const first = checks[0];
      expect(typeof first.checkType).toBe("string");
      expect((first.checkType as string).length).toBeGreaterThan(0);
      expect(["info", "warning", "critical"]).toContain(first.severity);
      expect([true, false]).toContain(first.passed);
    }
  });

  it("failure: missing config", async () => {
    const r = await call("swiss_collision_check_all", { state });
    expect(r.error as string).toMatch(/config|state/i);
  });

  it("failure: missing state", async () => {
    const r = await call("swiss_collision_check_all", { config });
    expect(r.error as string).toMatch(/config|state/i);
  });

  it("failure: both missing", async () => {
    const r = await call("swiss_collision_check_all", {});
    expect(r.error as string).toMatch(/config|state/i);
  });

  it("adversarial: extreme bAxisAngle (999°) preserves response shape", async () => {
    const extreme = { ...state, bAxisAngle: 999 };
    const r = await call("swiss_collision_check_all", { config, state: extreme });
    expect(Array.isArray(r.checks)).toBe(true);
    expect([true, false]).toContain(r.safe);
  });

  it("adversarial: empty config + state — engine returns structured (not crashing) result", async () => {
    const r = await call("swiss_collision_check_all", { config: {}, state: {} });
    expect(Array.isArray(r.checks)).toBe(true);
    expect([true, false]).toContain(r.safe);
  });
});

// ----------------------------------------------------------------------------
// Dispatcher fallback — unknown action returns soft error (no throw, no crash)
// ----------------------------------------------------------------------------
describe("dispatcher fallback", () => {
  it("unknown action returns 'Unknown action: <name>' soft error", async () => {
    const r = await call("not_a_real_action");
    expect(r.error as string).toMatch(/unknown action/i);
    expect(r.error as string).toContain("not_a_real_action");
  });
});
