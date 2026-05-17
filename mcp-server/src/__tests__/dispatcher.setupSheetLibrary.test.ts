/**
 * dispatcher.setupSheetLibrary.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-SSL (SetupSheetLibraryEngine).
 *
 * 3 pure-read actions through real `prism_dev`:
 *   ssl_find_setup     → findSetup({part_number?, material?, workholding_type?, keyword?})
 *   ssl_get_setup      → getSetup({setup_id})
 *   ssl_suggest_reuse  → suggestReuse({material, approximate_size, features[]})
 *
 * DEFERRED:
 *   - saveSetup(input): mutates the singleton store
 *   - clear(): wipes entire store — peer data destruction
 *
 * Test seeds the store ONCE via engine-direct saveSetup() in beforeAll
 * so read paths have observable data with a known setup_id, then never
 * mutates again.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { setupSheetLibraryEngine } from "../engines/SetupSheetLibraryEngine.js";

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
let SEEDED_SETUP_ID: string;

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;

  // Seed one well-known setup so read paths have observable data.
  const r = setupSheetLibraryEngine.saveSetup({
    part_number: "TEST-PROBE-ABC",
    operation: "rough_pocket",
    machine_id: "MILL-1",
    workholding: { type: "vise", jaw_type: "step_jaw" },
    datum: { primary: "B1-bottom", secondary: "C1-edge" },
    tools: [
      { id: "EM-0500-4FL", description: "1/2 inch 4-flute endmill" },
      { id: "EM-0250-2FL", description: "1/4 inch 2-flute endmill" },
    ],
    notes: "Test-only setup for dispatcher round-trip — 4140 steel, prismatic pocket",
  });
  SEEDED_SETUP_ID = r.setup_id;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SSL — Zod schemas", () => {
  it("ssl_find_setup accepts {} (all fields optional) but rejects oversize", () => {
    expect(ACTION_DEV_SCHEMAS["ssl_find_setup"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ssl_find_setup"].safeParse({
      part_number: "x".repeat(129),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ssl_find_setup"].safeParse({
      keyword: "x".repeat(513),
    }).success).toBe(false);
  });

  it("ssl_get_setup requires setup_id", () => {
    expect(ACTION_DEV_SCHEMAS["ssl_get_setup"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ssl_get_setup"].safeParse({ setup_id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ssl_get_setup"].safeParse({ setup_id: "s-001" }).success).toBe(true);
  });

  it("ssl_suggest_reuse requires material + 3D size + features[]", () => {
    expect(ACTION_DEV_SCHEMAS["ssl_suggest_reuse"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ssl_suggest_reuse"].safeParse({
      material: "4140",
      approximate_size: { x: 1, y: 1, z: 1 },
      features: ["pocket"],
    }).success).toBe(true);
  });

  it("ssl_suggest_reuse caps approximate_size axes at 10_000 (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["ssl_suggest_reuse"].safeParse({
      material: "4140",
      approximate_size: { x: 10_001, y: 1, z: 1 },
      features: [],
    }).success).toBe(false);
  });

  it("ssl_suggest_reuse caps features at 64 items (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["ssl_suggest_reuse"].safeParse({
      material: "4140",
      approximate_size: { x: 1, y: 1, z: 1 },
      features: new Array(65).fill("x"),
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SSL — ssl_find_setup", () => {
  it("part_number='TEST-PROBE-ABC' matches the seeded setup with its setup_id present", async () => {
    const r = await invokeHandler(devHandler, "ssl_find_setup", {
      part_number: "TEST-PROBE-ABC",
    });
    const matches = (r.matches as Array<{ part_number: string; setup_id: string }> | undefined) ?? [];
    expect((r.count as number | undefined) ?? 0).toBe(matches.length);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Strict identity check — the seeded setup_id must be present.
    const seededIds = matches.filter(m => m.setup_id === SEEDED_SETUP_ID);
    expect(seededIds.length).toBe(1);
    expect(seededIds[0]?.part_number).toBe("TEST-PROBE-ABC");
  });

  it("keyword='4140 pocket' produces seeded setup with positive relevance_score", async () => {
    const r = await invokeHandler(devHandler, "ssl_find_setup", { keyword: "4140 pocket" });
    const matches = (r.matches as Array<{ setup_id: string; relevance_score: number }> | undefined) ?? [];
    const seededMatches = matches.filter(m => m.setup_id === SEEDED_SETUP_ID);
    expect(seededMatches.length).toBe(1);
    expect(seededMatches[0]!.relevance_score).toBeGreaterThan(0);
  });

  it("matches sorted DESC by relevance_score (engine line 233)", async () => {
    const r = await invokeHandler(devHandler, "ssl_find_setup", { keyword: "endmill 4140" });
    const matches = (r.matches as Array<{ relevance_score: number }> | undefined) ?? [];
    for (let i = 1; i < matches.length; i++) {
      const prev = matches[i - 1];
      const curr = matches[i];
      if (prev && curr) {
        expect(prev.relevance_score).toBeGreaterThanOrEqual(curr.relevance_score);
      }
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SSL — ssl_get_setup", () => {
  it("seeded setup_id returns found:true with full record echoing seeded values", async () => {
    const r = await invokeHandler(devHandler, "ssl_get_setup", { setup_id: SEEDED_SETUP_ID });
    expect(r.found).toBe(true);
    const setup = (r as { setup: { setup_id: string; part_number: string; operation: string } }).setup;
    expect(setup.setup_id).toBe(SEEDED_SETUP_ID);
    expect(setup.part_number).toBe("TEST-PROBE-ABC");
    expect(setup.operation).toBe("rough_pocket");
  });

  it("unknown setup_id returns found:false with non-empty error message", async () => {
    const synthetic = "no-such-id-" + Date.now() + "-" + Math.random();
    const r = await invokeHandler(devHandler, "ssl_get_setup", { setup_id: synthetic });
    expect(r.found).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error as string).length).toBeGreaterThan(0);
    // Engine error string echoes the requested id (engine line 244)
    expect(r.error).toBe(`Setup not found: ${synthetic}`);
  });

  it("ROUTING PROOF — wire setup.part_number equals engine-direct getSetup().part_number", async () => {
    const r = await invokeHandler(devHandler, "ssl_get_setup", { setup_id: SEEDED_SETUP_ID });
    const direct = setupSheetLibraryEngine.getSetup({ setup_id: SEEDED_SETUP_ID });
    expect(r.found).toBe(!("error" in direct));
    if (!("error" in direct)) {
      const wirePn = (r as { setup: { part_number: string } }).setup.part_number;
      expect(wirePn).toBe(direct.part_number);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SSL — ssl_suggest_reuse", () => {
  it("prismatic features (pocket+slot+mill) match seeded vise setup with 'prismatic' reason", async () => {
    const r = await invokeHandler(devHandler, "ssl_suggest_reuse", {
      material: "4140",
      approximate_size: { x: 100, y: 50, z: 25 },
      features: ["pocket", "slot", "mill"],
    });
    const suggestions = (r.suggestions as Array<{ setup_id: string; match_score: number; match_reasons: string[] }> | undefined) ?? [];
    expect((r.suggestion_count as number | undefined) ?? 0).toBe(suggestions.length);
    const seededSugs = suggestions.filter(s => s.setup_id === SEEDED_SETUP_ID);
    expect(seededSugs.length).toBe(1);
    expect(seededSugs[0]!.match_score).toBeGreaterThan(0);
    // Engine line 304-307: workholding=vise + prismatic features adds +10
    // with reason 'Workholding type matches prismatic features'.
    const reasons = seededSugs[0]!.match_reasons;
    expect(reasons.some(rsn => rsn.includes("prismatic"))).toBe(true);
  });

  it("VARIABILITY — 3 distinct material/feature combos cap at 10 suggestions (engine line 338)", async () => {
    const combos = [
      { material: "4140", approximate_size: { x: 100, y: 50, z: 25 }, features: ["pocket"] },
      { material: "6061", approximate_size: { x: 50, y: 50, z: 50 }, features: ["face", "drill"] },
      { material: "D2", approximate_size: { x: 200, y: 100, z: 50 }, features: ["mill", "slot", "tap"] },
    ];
    for (const c of combos) {
      const r = await invokeHandler(devHandler, "ssl_suggest_reuse", c);
      const suggestions = (r.suggestions as unknown[] | undefined) ?? [];
      expect(suggestions.length).toBeLessThanOrEqual(10);
    }
  });

  it("suggestions sorted DESC by match_score (engine line 335)", async () => {
    const r = await invokeHandler(devHandler, "ssl_suggest_reuse", {
      material: "4140",
      approximate_size: { x: 100, y: 50, z: 25 },
      features: ["pocket", "slot"],
    });
    const suggestions = (r.suggestions as Array<{ match_score: number }> | undefined) ?? [];
    for (let i = 1; i < suggestions.length; i++) {
      const prev = suggestions[i - 1];
      const curr = suggestions[i];
      if (prev && curr) {
        expect(prev.match_score).toBeGreaterThanOrEqual(curr.match_score);
      }
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SSL — error envelope", () => {
  it("ssl_get_setup without setup_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ssl_get_setup", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ssl_suggest_reuse without approximate_size → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ssl_suggest_reuse", {
      material: "4140", features: [],
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ssl_find_setup with oversize keyword → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ssl_find_setup", {
      keyword: "x".repeat(1000),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
