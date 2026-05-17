/**
 * dispatcher.deepLogicTrace.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-DLT dispatcher wiring.
 *
 * Drives 7 READ-ONLY actions through real `prism_dev`. Mutating methods
 * (beginProof/finalizeProof/clear) DEFERRED for safety; getTrace(id) also
 * DEFERRED because ProofTree.nodes is a Map<…> that needs Object.fromEntries
 * before JSON serialization.
 *
 * Setup uses engine-direct beginProof/finalizeProof to create a known proof,
 * then queries it via the wire (read-only).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { deepLogicTraceEngine } from "../engines/DeepLogicTraceEngine.js";

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
let knownProofId: string;

function buildSamplePoof(engineId = "test-engine-mill"): string {
  const builder = deepLogicTraceEngine.beginProof(engineId, { material: "1018 steel" });
  const p1 = builder.addPremise("material_known", [
    { name: "material", type: "string", value: "1018 steel" },
  ]);
  const p2 = builder.addPremise("tool_available", [
    { name: "tool", type: "string", value: "T-001" },
  ]);
  builder.setConclusion(
    [p1, p2],
    "cutting_force_valid",
    [
      { name: "F", type: "number", value: 1200, unit: "N" },
      { name: "material", type: "string", value: "1018 steel" },
      { name: "tool", type: "string", value: "T-001" },
    ],
    { type: "formula", id: "F-001", name: "Kienzle Cutting Force", citation: "Kienzle 1952" },
    "Kienzle force computation",
    "true",
  );
  const tree = deepLogicTraceEngine.finalizeProof(builder);
  return tree.id;
}

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;

  knownProofId = buildSamplePoof();
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — Zod schemas", () => {
  it("dlt_get_summary requires non-empty id", () => {
    expect(ACTION_DEV_SCHEMAS["dlt_get_summary"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dlt_get_summary"].safeParse({ id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dlt_get_summary"].safeParse({ id: "abc" }).success).toBe(true);
  });

  it("dlt_explain requires non-empty id", () => {
    expect(ACTION_DEV_SCHEMAS["dlt_explain"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dlt_explain"].safeParse({ id: "abc" }).success).toBe(true);
  });

  it("dlt_validate requires non-empty id", () => {
    expect(ACTION_DEV_SCHEMAS["dlt_validate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dlt_validate"].safeParse({ id: "abc" }).success).toBe(true);
  });

  it("dlt_query accepts {} (all filters optional)", () => {
    expect(ACTION_DEV_SCHEMAS["dlt_query"].safeParse({}).success).toBe(true);
  });

  it("dlt_query rejects limit > 1000 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["dlt_query"].safeParse({ limit: 1001 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dlt_query"].safeParse({ limit: 1000 }).success).toBe(true);
  });

  it("dlt_query rejects negative since/minDepth", () => {
    expect(ACTION_DEV_SCHEMAS["dlt_query"].safeParse({ since: -1 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dlt_query"].safeParse({ minDepth: -1 }).success).toBe(false);
  });

  it("dlt_stats / dlt_predicates / dlt_formulas accept {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["dlt_stats"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["dlt_predicates"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["dlt_formulas"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — prism_dev :: dlt_predicates", () => {
  it("returns the 12 built-in predicates with correct arity", async () => {
    const r = await invokeHandler(devHandler, "dlt_predicates", {});
    const data = r as { predicates: Record<string, { name: string; arity: number }>; count: number };
    expect(data.count).toBeGreaterThanOrEqual(12);
    // Per engine BUILT_IN_PREDICATES: cutting_force_valid arity=3, material_known arity=1
    expect(data.predicates["cutting_force_valid"]?.arity).toBe(3);
    expect(data.predicates["material_known"]?.arity).toBe(1);
    expect(data.predicates["tool_available"]?.arity).toBe(1);
    expect(data.predicates["tool_life_sufficient"]?.arity).toBe(2);
    expect(data.predicates["chatter_free"]?.arity).toBe(3);
  });

  it("ROUTING PROOF — predicate name-set equals engine-direct getPredicates()", async () => {
    const r = await invokeHandler(devHandler, "dlt_predicates", {});
    const wireNames = Object.keys((r as { predicates: Record<string, unknown> }).predicates).sort();
    const directNames = Object.keys(deepLogicTraceEngine.getPredicates()).sort();
    expect(JSON.stringify(wireNames)).toBe(JSON.stringify(directNames));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — prism_dev :: dlt_formulas", () => {
  it("returns the 8 canonical formulas with their canonical ids", async () => {
    const r = await invokeHandler(devHandler, "dlt_formulas", {});
    const data = r as { formulas: Record<string, { id: string; name: string; citation?: string }>; count: number };
    expect(data.count).toBeGreaterThanOrEqual(8);
    expect(data.formulas["kienzle"]?.id).toBe("F-001");
    expect(data.formulas["taylor"]?.id).toBe("F-002");
    expect(data.formulas["cantilever"]?.id).toBe("F-003");
    expect(data.formulas["stability_lobe"]?.id).toBe("F-004");
    expect(data.formulas["kinematic_roughness"]?.id).toBe("F-005");
    expect(data.formulas["johnson_cook"]?.id).toBe("F-006");
    expect(data.formulas["merchant"]?.id).toBe("F-007");
    expect(data.formulas["mrr"]?.id).toBe("F-008");
  });

  it("ROUTING PROOF — formula registry id-set equals engine-direct getFormulaRegistry()", async () => {
    const r = await invokeHandler(devHandler, "dlt_formulas", {});
    const wireIds = Object.values((r as { formulas: Record<string, { id: string }> }).formulas).map((f) => f.id).sort();
    const directIds = Object.values(deepLogicTraceEngine.getFormulaRegistry()).map((f) => f.id).sort();
    expect(JSON.stringify(wireIds)).toBe(JSON.stringify(directIds));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — prism_dev :: dlt_get_summary", () => {
  it("known proof id → returns summary with id + conclusion + isValid", async () => {
    const r = await invokeHandler(devHandler, "dlt_get_summary", { id: knownProofId });
    const summary = (r as { summary: { id?: string; conclusion?: string; stepCount?: number; depth?: number; isValid?: boolean } }).summary;
    expect(summary.id).toBe(knownProofId);
    expect(typeof summary.conclusion).toBe("string");
    expect((summary.stepCount as number | undefined) ?? 0).toBeGreaterThanOrEqual(3);
    expect(summary.isValid).toBe(true);
  });

  it("unknown id → summary is null (slimResponse strips → absent)", async () => {
    const r = await invokeHandler(devHandler, "dlt_get_summary", { id: "no-such-proof-" + Date.now() });
    const data = r as { summary?: unknown };
    expect((data.summary ?? null) === null).toBe(true);
  });

  it("ROUTING PROOF — wire summary field-by-field matches engine-direct getSummary()", async () => {
    const r = await invokeHandler(devHandler, "dlt_get_summary", { id: knownProofId });
    const wire = (r as { summary: { id?: string; conclusion?: string; stepCount?: number; depth?: number; isValid?: boolean } }).summary;
    const direct = deepLogicTraceEngine.getSummary(knownProofId);
    expect(direct === null).toBe(false);
    expect(wire.id).toBe(direct!.id);
    expect(wire.conclusion).toBe(direct!.conclusion);
    expect(wire.stepCount).toBe(direct!.stepCount);
    expect(wire.depth).toBe(direct!.depth);
    expect(wire.isValid).toBe(direct!.isValid);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — prism_dev :: dlt_explain", () => {
  it("known proof id → returns explanation with Kienzle in citations", async () => {
    const r = await invokeHandler(devHandler, "dlt_explain", { id: knownProofId });
    const explained = (r as { explained: { summary?: string; conclusion?: string; citations?: string[]; confidence?: number } }).explained;
    expect(typeof explained.summary).toBe("string");
    expect(typeof explained.conclusion).toBe("string");
    expect((explained.citations ?? []).some((c) => c.includes("Kienzle"))).toBe(true);
    expect((explained.confidence as number | undefined) ?? 0).toBeGreaterThan(0);
    expect((explained.confidence as number | undefined) ?? 0).toBeLessThanOrEqual(1);
  });

  it("unknown id → explained is null", async () => {
    const r = await invokeHandler(devHandler, "dlt_explain", { id: "no-such-" + Date.now() });
    const data = r as { explained?: unknown };
    expect((data.explained ?? null) === null).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — prism_dev :: dlt_validate", () => {
  it("known proof id → valid + no errors", async () => {
    const r = await invokeHandler(devHandler, "dlt_validate", { id: knownProofId });
    const validation = (r as { validation: { isValid?: boolean; errors?: string[] } }).validation;
    expect(validation.isValid).toBe(true);
    expect((validation.errors ?? []).length).toBe(0);
  });

  it("unknown id → isValid:false with 'not found' error", async () => {
    const r = await invokeHandler(devHandler, "dlt_validate", { id: "no-such-" + Date.now() });
    const validation = (r as { validation: { isValid?: boolean; errors?: string[] } }).validation;
    expect(validation.isValid).toBe(false);
    expect(((validation.errors ?? []).join(" ")).toLowerCase()).toContain("not found");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — prism_dev :: dlt_query", () => {
  it("no filters → returns the known proof in summaries[]", async () => {
    const r = await invokeHandler(devHandler, "dlt_query", {});
    const summaries = (r as { summaries: Array<{ id: string }> }).summaries ?? [];
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.some((s) => s.id === knownProofId)).toBe(true);
  });

  it("engineId='test-engine-mill' → returns the known proof", async () => {
    const r = await invokeHandler(devHandler, "dlt_query", { engineId: "test-engine-mill" });
    const summaries = (r as { summaries: Array<{ id: string }> }).summaries ?? [];
    expect(summaries.some((s) => s.id === knownProofId)).toBe(true);
  });

  it("engineId='no-such-engine' → 0 summaries", async () => {
    const r = await invokeHandler(devHandler, "dlt_query", { engineId: "no-such-engine-xyz" });
    const data = r as { summaries?: unknown[]; count?: number };
    expect((data.summaries ?? []).length).toBe(0);
    expect(data.count ?? 0).toBe(0);
  });

  it("limit=1 → cap at 1 summary", async () => {
    const r = await invokeHandler(devHandler, "dlt_query", { limit: 1 });
    const summaries = (r as { summaries: unknown[] }).summaries ?? [];
    expect(summaries.length).toBeLessThanOrEqual(1);
  });

  it("minDepth=999 → 0 summaries (no proof has that depth)", async () => {
    const r = await invokeHandler(devHandler, "dlt_query", { minDepth: 999 });
    const data = r as { summaries?: unknown[]; count?: number };
    expect((data.summaries ?? []).length).toBe(0);
    expect(data.count ?? 0).toBe(0);
  });

  it("since=future-ts → 0 summaries (all proofs predate future)", async () => {
    const future = Date.now() + 60_000;
    const r = await invokeHandler(devHandler, "dlt_query", { since: future });
    const data = r as { summaries?: unknown[]; count?: number };
    expect((data.summaries ?? []).length).toBe(0);
    expect(data.count ?? 0).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — prism_dev :: dlt_stats", () => {
  it("returns stats with totalProofs >= 1 and formulaCitations including Kienzle", async () => {
    const r = await invokeHandler(devHandler, "dlt_stats", {});
    const stats = (r as { stats: { totalProofs?: number; avgDepth?: number; avgSteps?: number; formulaCitations?: Record<string, number>; validProofs?: number } }).stats;
    expect((stats.totalProofs as number | undefined) ?? 0).toBeGreaterThanOrEqual(1);
    expect((stats.validProofs as number | undefined) ?? 0).toBeGreaterThanOrEqual(1);
    expect((stats.formulaCitations ?? {})["Kienzle Cutting Force"]).toBeGreaterThanOrEqual(1);
  });

  it("ROUTING PROOF — wire stats numeric fields >= engine-direct (telemetry monotone)", async () => {
    const direct = deepLogicTraceEngine.getStats();
    const r = await invokeHandler(devHandler, "dlt_stats", {});
    const wire = (r as { stats: { totalProofs?: number; validProofs?: number } }).stats;
    expect(((wire.totalProofs as number | undefined) ?? 0)).toBeGreaterThanOrEqual(direct.totalProofs);
    expect(((wire.validProofs as number | undefined) ?? 0)).toBeGreaterThanOrEqual(direct.validProofs);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-DLT — error envelope", () => {
  it("dlt_get_summary without id → schema rejects with mention of 'id'", async () => {
    const r = await invokeHandler(devHandler, "dlt_get_summary", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/id/i);
  });

  it("dlt_validate without id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "dlt_validate", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("dlt_query with negative since → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "dlt_query", { since: -1 });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
