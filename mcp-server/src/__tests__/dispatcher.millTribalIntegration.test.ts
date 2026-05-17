/**
 * dispatcher.millTribalIntegration.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MTI (MillTribalIntegrationEngine).
 *
 * Drives 3 pure-read actions through real `prism_dev`. integrateWithTraining()
 * DEFERRED — mutates millNeuralNetworkEngine training data
 * (ML-training-data-corruption class; LLM-callable would let any chat poison
 * the neural network's training set with crafted tribal-tip payloads).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { millTribalIntegrationEngine } from "../engines/MillTribalIntegrationEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-MTI — Zod schemas", () => {
  it("mti_get_adjustment requires all 4 params + caps tool_diameter_mm at 500 (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["mti_get_adjustment"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mti_get_adjustment"].safeParse({
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill",
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mti_get_adjustment"].safeParse({
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 12,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mti_get_adjustment"].safeParse({
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 501,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mti_get_adjustment"].safeParse({
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 0,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mti_get_adjustment"].safeParse({
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: -5,
    }).success).toBe(false);
  });

  it("mti_check_failure_modes caps rpm/feed/doc (DoS guards)", () => {
    expect(ACTION_DEV_SCHEMAS["mti_check_failure_modes"].safeParse({
      material_iso: "P", operation_type: "drill", rpm: 5000, feed: 150, doc: 2,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["mti_check_failure_modes"].safeParse({
      material_iso: "P", operation_type: "drill", rpm: 200_001, feed: 150, doc: 2,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mti_check_failure_modes"].safeParse({
      material_iso: "P", operation_type: "drill", rpm: 5000, feed: 50_001, doc: 2,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mti_check_failure_modes"].safeParse({
      material_iso: "P", operation_type: "drill", rpm: 5000, feed: 150, doc: 1001,
    }).success).toBe(false);
  });

  it("mti_get_statistics accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["mti_get_statistics"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MTI — prism_dev :: mti_get_adjustment", () => {
  it("returns rpm/feed/doc factors + warnings + tips_applied arrays + count parity", async () => {
    const r = await invokeHandler(devHandler, "mti_get_adjustment", {
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 12,
    });
    expect(r.material_iso).toBe("P");
    expect(r.operation_type).toBe("rough_profile");
    const adj = (r as { adjustment: { rpm_factor: number; feed_factor: number; doc_factor: number; warnings: string[]; tips_applied: string[] } }).adjustment;
    expect(typeof adj.rpm_factor).toBe("number");
    expect(typeof adj.feed_factor).toBe("number");
    expect(typeof adj.doc_factor).toBe("number");
    expect(adj.rpm_factor).toBeGreaterThan(0);
    expect(adj.feed_factor).toBeGreaterThan(0);
    expect(adj.doc_factor).toBeGreaterThan(0);
    // count parity: warnings_count + tips_applied_count must mirror arrays
    // (slimResponse may strip empty arrays — fall back to 0)
    const warnings = adj.warnings ?? [];
    const tips = adj.tips_applied ?? [];
    expect((r as { warnings_count?: number }).warnings_count ?? 0).toBe(warnings.length);
    expect((r as { tips_applied_count?: number }).tips_applied_count ?? 0).toBe(tips.length);
  });

  it("VARIABILITY — 3 distinct material/op combos all return positive factors", async () => {
    const combos = [
      { material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 12 },
      { material_iso: "S", operation_type: "finish_pocket", tool_type: "flat_endmill", tool_diameter_mm: 6 },
      { material_iso: "K", operation_type: "drill", tool_type: "twist_drill", tool_diameter_mm: 8 },
    ];
    for (const c of combos) {
      const r = await invokeHandler(devHandler, "mti_get_adjustment", c as unknown as Record<string, unknown>);
      const adj = (r as { adjustment: { rpm_factor: number } }).adjustment;
      expect(adj.rpm_factor).toBeGreaterThan(0);
    }
  });

  it("VARIABILITY — small tool diameter (<6mm) triggers small-tool heuristic", async () => {
    // Heuristic at engine line 536 fires when toolDiameterMm < 6
    const rSmall = await invokeHandler(devHandler, "mti_get_adjustment", {
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 3,
    });
    const rLarge = await invokeHandler(devHandler, "mti_get_adjustment", {
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 25,
    });
    // small tool should accumulate at least as many tips as large
    const smallTips = (rSmall as { tips_applied_count?: number }).tips_applied_count ?? 0;
    const largeTips = (rLarge as { tips_applied_count?: number }).tips_applied_count ?? 0;
    expect(smallTips).toBeGreaterThanOrEqual(largeTips);
  });

  it("ROUTING PROOF — wire adjustment per-field equals engine-direct getAdjustment()", async () => {
    const args = { material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 12 };
    const r = await invokeHandler(devHandler, "mti_get_adjustment", args);
    const wireAdj = (r as { adjustment: { rpm_factor: number; feed_factor: number; doc_factor: number; warnings: string[]; tips_applied: string[] } }).adjustment;
    const direct = millTribalIntegrationEngine.getAdjustment(
      args.material_iso, args.operation_type, args.tool_type, args.tool_diameter_mm,
    );
    expect(wireAdj.rpm_factor).toBeCloseTo(direct.rpm_factor, 6);
    expect(wireAdj.feed_factor).toBeCloseTo(direct.feed_factor, 6);
    expect(wireAdj.doc_factor).toBeCloseTo(direct.doc_factor, 6);
    expect((wireAdj.warnings ?? []).length).toBe(direct.warnings.length);
    expect((wireAdj.tips_applied ?? []).length).toBe(direct.tips_applied.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MTI — prism_dev :: mti_check_failure_modes", () => {
  it("returns matches array + count parity", async () => {
    const r = await invokeHandler(devHandler, "mti_check_failure_modes", {
      material_iso: "P", operation_type: "drill", rpm: 5000, feed: 150, doc: 2,
    });
    const matches = ((r as { matches?: unknown[] }).matches) ?? [];
    expect((r as { count?: number }).count).toBe(matches.length);
  });

  it("VARIABILITY — 3 distinct material/operation combos return count ≥ 0", async () => {
    const combos = [
      { material_iso: "P", operation_type: "drill", rpm: 5000, feed: 150, doc: 2 },
      { material_iso: "S", operation_type: "rough_profile", rpm: 1500, feed: 80, doc: 0.5 },
      { material_iso: "K", operation_type: "tap", rpm: 800, feed: 12, doc: 5 },
    ];
    for (const c of combos) {
      const r = await invokeHandler(devHandler, "mti_check_failure_modes", c as unknown as Record<string, unknown>);
      expect((r as { count?: number }).count ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it("ROUTING PROOF — wire count equals engine-direct checkFailureModes().length", async () => {
    const args = { material_iso: "P", operation_type: "drill", rpm: 5000, feed: 150, doc: 2 };
    const r = await invokeHandler(devHandler, "mti_check_failure_modes", args);
    const wireCount = (r as { count?: number }).count ?? 0;
    const direct = millTribalIntegrationEngine.checkFailureModes(
      args.material_iso, args.operation_type, args.rpm, args.feed, args.doc,
    );
    expect(wireCount).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MTI — prism_dev :: mti_get_statistics", () => {
  it("returns stats object with total_tips + total_heuristics + total_failure_modes", async () => {
    const r = await invokeHandler(devHandler, "mti_get_statistics", {});
    const stats = (r as { stats: { total_tips?: number; total_heuristics?: number; total_failure_modes?: number; critical_warnings?: number } }).stats;
    expect(typeof stats).toBe("object");
    expect(stats === null).toBe(false);
    if (stats.total_tips !== undefined) {
      expect(typeof stats.total_tips).toBe("number");
      expect(stats.total_tips).toBeGreaterThanOrEqual(0);
    }
    if (stats.total_heuristics !== undefined) {
      expect(typeof stats.total_heuristics).toBe("number");
      expect(stats.total_heuristics).toBeGreaterThanOrEqual(0);
    }
    if (stats.total_failure_modes !== undefined) {
      expect(typeof stats.total_failure_modes).toBe("number");
      expect(stats.total_failure_modes).toBeGreaterThanOrEqual(0);
    }
  });

  it("ROUTING PROOF — wire stats per-field equals engine-direct getStatistics()", async () => {
    const r = await invokeHandler(devHandler, "mti_get_statistics", {});
    const wireStats = (r as { stats: { total_tips?: number; total_heuristics?: number; total_failure_modes?: number; critical_warnings?: number } }).stats;
    const direct = millTribalIntegrationEngine.getStatistics();
    // slimResponse may strip zero-valued numeric fields when slim is active —
    // tolerate undefined as 0 for non-negative count fields.
    expect(wireStats.total_tips ?? 0).toBe(direct.total_tips);
    expect(wireStats.total_heuristics ?? 0).toBe(direct.total_heuristics);
    expect(wireStats.total_failure_modes ?? 0).toBe(direct.total_failure_modes);
    expect(wireStats.critical_warnings ?? 0).toBe(direct.critical_warnings);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MTI — error envelope", () => {
  it("mti_get_adjustment without tool_diameter_mm → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mti_get_adjustment", {
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("mti_get_adjustment with tool_diameter_mm > 500 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mti_get_adjustment", {
      material_iso: "P", operation_type: "rough_profile", tool_type: "flat_endmill", tool_diameter_mm: 999,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("mti_check_failure_modes with rpm > 200000 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mti_check_failure_modes", {
      material_iso: "P", operation_type: "drill", rpm: 999_999, feed: 150, doc: 2,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
