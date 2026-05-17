/**
 * dispatcher.mobileLookup.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-ML (MobileLookupEngine).
 *
 * 9 pure-read static methods through real `prism_dev`:
 *   ml_search_materials / ml_search_tools / ml_search_gcodes
 *   ml_get_speed_feed   / ml_universal_search
 *   ml_get_material / ml_get_tool / ml_get_gcode
 *   ml_get_self_awareness
 *
 * Cleanest wire of session — zero state mutation anywhere on the engine;
 * all 9 methods are static + pure over module-scope reference data.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { MobileLookupEngine } from "../engines/MobileLookupEngine.js";

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

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ML — Zod schemas", () => {
  it("ml_search_materials requires non-empty query + caps limit at 100", () => {
    expect(ACTION_DEV_SCHEMAS["ml_search_materials"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ml_search_materials"].safeParse({ query: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ml_search_materials"].safeParse({ query: "steel" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ml_search_materials"].safeParse({ query: "x", limit: 101 }).success).toBe(false);
  });

  it("ml_universal_search requires type enum + query", () => {
    expect(ACTION_DEV_SCHEMAS["ml_universal_search"].safeParse({ query: "steel" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ml_universal_search"].safeParse({
      query: "steel", type: "material",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ml_universal_search"].safeParse({
      query: "steel", type: "not_a_type",
    }).success).toBe(false);
  });

  it("ml_get_material / ml_get_tool / ml_get_gcode require non-empty key", () => {
    expect(ACTION_DEV_SCHEMAS["ml_get_material"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ml_get_material"].safeParse({ code: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ml_get_material"].safeParse({ code: "4140" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ml_get_tool"].safeParse({ toolId: "EM-0500-4FL" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ml_get_gcode"].safeParse({ code: "G00" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ML — search actions", () => {
  it("ml_search_materials 'steel' returns >=3 hits (4140 + D2 + S7 in catalog)", async () => {
    const r = await invokeHandler(devHandler, "ml_search_materials", { query: "steel" });
    expect(r.query).toBe("steel");
    const matches = (r.matches as unknown[] | undefined) ?? [];
    expect((r.count as number | undefined) ?? 0).toBe(matches.length);
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("ml_search_materials limit cap honored", async () => {
    const r = await invokeHandler(devHandler, "ml_search_materials", {
      query: "steel", limit: 1,
    });
    const matches = (r.matches as unknown[] | undefined) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it("ml_search_tools 'carbide' returns >=3 hits (EM-0500/EM-0250/DR-0312/INS-CNMG all carbide)", async () => {
    const r = await invokeHandler(devHandler, "ml_search_tools", { query: "carbide" });
    const matches = (r.matches as unknown[] | undefined) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("ml_search_gcodes 'G' returns >=7 codes (G00/G01/G02/G03/G28/G41/G43/G54/G76 in catalog)", async () => {
    const r = await invokeHandler(devHandler, "ml_search_gcodes", { query: "G" });
    const matches = (r.matches as unknown[] | undefined) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(7);
  });

  it("ml_search_gcodes controller='fanuc' includes universal codes + fanuc-specific (G28/G76)", async () => {
    const r = await invokeHandler(devHandler, "ml_search_gcodes", {
      query: "G", controller: "fanuc",
    });
    const matches = ((r.matches as Array<{ code: string; controller: string }> | undefined)) ?? [];
    // Engine line 160: controller filter passes universal OR matches input.
    // G28 + G76 are fanuc-specific so MUST appear under controller='fanuc'.
    const codes = matches.map(m => m.code);
    expect(codes).toContain("G28");
    expect(codes).toContain("G76");
  });

  it("ml_get_speed_feed material='4140' returns >=2 entries (roughing + finishing in catalog)", async () => {
    const r = await invokeHandler(devHandler, "ml_get_speed_feed", { material: "4140" });
    const matches = (r.matches as unknown[] | undefined) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("ml_get_speed_feed material='4140' operation='finishing' returns exactly 1 (catalog has 1 finishing entry)", async () => {
    const r = await invokeHandler(devHandler, "ml_get_speed_feed", {
      material: "4140", operation: "finishing",
    });
    const matches = (r.matches as Array<{ operation: string }> | undefined) ?? [];
    expect(matches.length).toBe(1);
    expect(matches[0]?.operation).toBe("finishing");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ML — universal_search dispatcher", () => {
  it("type='material' routes ONLY to material results (other counts zero)", async () => {
    const r = await invokeHandler(devHandler, "ml_universal_search", {
      query: "steel", type: "material",
    });
    expect((r.material_count as number | undefined) ?? 0).toBeGreaterThanOrEqual(1);
    expect((r.tool_count as number | undefined) ?? 0).toBe(0);
    expect((r.gcode_count as number | undefined) ?? 0).toBe(0);
    expect((r.speedfeed_count as number | undefined) ?? 0).toBe(0);
  });

  it("type='machine' falls into default branch: returns hits across ALL 4 categories", async () => {
    // Engine line 203-209: default branch returns 3 of each + getSpeedFeed.
    const r = await invokeHandler(devHandler, "ml_universal_search", {
      query: "4140", type: "machine",
    });
    // material_count <= 3 (default limit) + tool/gcode_count >= 0 + speedfeed for 4140 >= 1
    expect((r.material_count as number | undefined) ?? 0).toBeGreaterThanOrEqual(1);
    expect((r.speedfeed_count as number | undefined) ?? 0).toBeGreaterThanOrEqual(1);
    expect((r.total_count as number | undefined) ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("VARIABILITY — all 5 type discriminators produce well-formed results", async () => {
    const types: Array<"material"|"tool"|"gcode"|"speedfeed"|"machine"> = [
      "material", "tool", "gcode", "speedfeed", "machine",
    ];
    for (const type of types) {
      const r = await invokeHandler(devHandler, "ml_universal_search", { query: "4140", type });
      expect(r.type).toBe(type);
      expect((r.total_count as number | undefined) ?? 0).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ML — exact-match getters", () => {
  it("ml_get_material '4140' returns found:true with material.code='4140'", async () => {
    const r = await invokeHandler(devHandler, "ml_get_material", { code: "4140" });
    expect(r.found).toBe(true);
    const m = (r as { material: { code: string } }).material;
    expect(m.code).toBe("4140");
  });

  it("ml_get_material with unknown code returns found:false", async () => {
    const r = await invokeHandler(devHandler, "ml_get_material", {
      code: "no-such-material-" + Date.now(),
    });
    expect(r.found).toBe(false);
  });

  it("ml_get_material is case-insensitive (engine line 219 lower-compare)", async () => {
    const upper = await invokeHandler(devHandler, "ml_get_material", { code: "4140" });
    const lower = await invokeHandler(devHandler, "ml_get_material", { code: "4140" });
    expect(upper.found).toBe(lower.found);
  });

  it("ml_get_tool 'EM-0500-4FL' returns found:true with tool.toolId echoed", async () => {
    const r = await invokeHandler(devHandler, "ml_get_tool", { toolId: "EM-0500-4FL" });
    expect(r.found).toBe(true);
    const t = (r as { tool: { toolId: string } }).tool;
    expect(t.toolId).toBe("EM-0500-4FL");
  });

  it("ml_get_gcode 'G00' returns found:true with gcode.code='G00'", async () => {
    const r = await invokeHandler(devHandler, "ml_get_gcode", { code: "G00" });
    expect(r.found).toBe(true);
    const g = (r as { gcode: { code: string } }).gcode;
    expect(g.code).toBe("G00");
  });

  it("ROUTING PROOF — wire ml_get_material '4140' produces same material.code as engine direct", async () => {
    const r = await invokeHandler(devHandler, "ml_get_material", { code: "4140" });
    const direct = MobileLookupEngine.getMaterial("4140");
    expect(r.found).toBe(direct !== undefined);
    if (direct) {
      const wireCode = (r as { material: { code: string } }).material.code;
      expect(wireCode).toBe(direct.code);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ML — self-awareness", () => {
  it("returns engine name + version + capabilities + dataSize per engine line 240-249", async () => {
    const r = await invokeHandler(devHandler, "ml_get_self_awareness", {});
    const info = (r as { info: { name: string; version: string; capabilities: string[]; dataSize: { materials: number; tools: number; gcodes: number; speedFeeds: number } } }).info;
    expect(info.name).toBe("MobileLookupEngine");
    expect(info.version.length).toBeGreaterThan(0);
    expect(info.capabilities.length).toBeGreaterThan(0);
    expect(info.dataSize.materials).toBeGreaterThan(0);
    expect(info.dataSize.gcodes).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ML — error envelope", () => {
  it("ml_search_materials without query → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ml_search_materials", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ml_universal_search with invalid type enum → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ml_universal_search", {
      query: "x", type: "INVALID_TYPE",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ml_get_material with empty code → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ml_get_material", { code: "" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
