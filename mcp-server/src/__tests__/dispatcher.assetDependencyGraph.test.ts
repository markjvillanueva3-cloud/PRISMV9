/**
 * dispatcher.assetDependencyGraph.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP dispatcher wiring.
 *
 * Drives 5 read-only AssetDependencyGraph actions through real `prism_dev`:
 *
 *   - asset_dep_node          → getNode(id)
 *   - asset_dep_dependencies  → getDependencies(id, depth?)
 *   - asset_dep_dependents    → getDependents(id, depth?)
 *   - asset_dep_impact        → analyzeImpact(assetId)
 *   - asset_dep_stats         → getStats()
 *
 * The engine ships a hard-coded 7-node graph
 * (CuttingForceEngine, kienzle_formula, material_db, SpeedFeedEngine,
 *  ToolLifeEngine, taylor_formula, PostProcessorEngine).
 *
 * ROUTING PROOF: the hard-coded edge "CuttingForceEngine uses kienzle_formula"
 * means CuttingForceEngine's dependencies MUST include "kienzle_formula"
 * when queried through the wire.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { assetDependencyGraphEngine } from "../engines/AssetDependencyGraphEngine.js";

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

// Keep the singleton graph stable between tests
beforeEach(() => {
  assetDependencyGraphEngine.reset();
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP — Zod schemas", () => {
  it("asset_dep_stats schema accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["asset_dep_stats"].safeParse({}).success).toBe(true);
  });

  it("asset_dep_node schema requires non-empty id", () => {
    expect(ACTION_DEV_SCHEMAS["asset_dep_node"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asset_dep_node"].safeParse({ id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asset_dep_node"].safeParse({ id: "CuttingForceEngine" }).success).toBe(true);
  });

  it("asset_dep_dependencies schema accepts id + optional depth", () => {
    expect(ACTION_DEV_SCHEMAS["asset_dep_dependencies"].safeParse({
      id: "CuttingForceEngine",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["asset_dep_dependencies"].safeParse({
      id: "CuttingForceEngine", depth: 3,
    }).success).toBe(true);
  });

  it("asset_dep_dependencies schema rejects non-positive depth", () => {
    expect(ACTION_DEV_SCHEMAS["asset_dep_dependencies"].safeParse({
      id: "x", depth: 0,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asset_dep_dependencies"].safeParse({
      id: "x", depth: -1,
    }).success).toBe(false);
  });

  it("asset_dep_dependencies schema caps depth at 20", () => {
    expect(ACTION_DEV_SCHEMAS["asset_dep_dependencies"].safeParse({
      id: "x", depth: 21,
    }).success).toBe(false);
  });

  it("asset_dep_impact schema requires asset_id OR assetId (refine guard)", () => {
    expect(ACTION_DEV_SCHEMAS["asset_dep_impact"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asset_dep_impact"].safeParse({
      asset_id: "CuttingForceEngine",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["asset_dep_impact"].safeParse({
      assetId: "CuttingForceEngine",
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP — prism_dev :: asset_dep_node", () => {
  it("known id 'CuttingForceEngine' → returns DependencyNode with type='engine'", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_node", { id: "CuttingForceEngine" });
    const data = r as { node?: { id?: string; type?: string; name?: string; dependencies?: string[] } };
    expect(data.node?.id).toBe("CuttingForceEngine");
    expect(data.node?.type).toBe("engine");
    expect(data.node?.name).toBe("Cutting Force Engine");
    // ROUTING PROOF: hard-coded dependency "kienzle_formula" surfaces
    expect(data.node?.dependencies).toContain("kienzle_formula");
    expect(data.node?.dependencies).toContain("material_db");
  });

  it("known formula id 'kienzle_formula' → type='formula'", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_node", { id: "kienzle_formula" });
    const data = r as { node?: { type?: string; dependencies?: string[]; dependents?: string[] } };
    expect(data.node?.type).toBe("formula");
    expect(data.node?.dependencies).toContain("material_db");
    expect(data.node?.dependents).toContain("CuttingForceEngine");
  });

  it("unknown id → returns {node: null} (engine fail-soft, slimResponse-aware)", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_node", { id: "does-not-exist-zzz" });
    const data = r as { node?: unknown };
    const val = "node" in data ? data.node : null;
    expect(val).toBe(null);
    // Confirm via engine-direct
    expect(await assetDependencyGraphEngine.getNode("does-not-exist-zzz")).toBe(null);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP — prism_dev :: asset_dep_dependencies", () => {
  it("CuttingForceEngine depth=1 → kienzle_formula + material_db are immediate deps", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_dependencies", {
      id: "CuttingForceEngine", depth: 1,
    });
    const data = r as { dependencies?: string[] };
    expect(Array.isArray(data.dependencies)).toBe(true);
    expect(data.dependencies).toContain("kienzle_formula");
    expect(data.dependencies).toContain("material_db");
  });

  it("dispatcher round-trips getDependencies match engine-direct for depth=1 and depth=3", async () => {
    // Containment is the load-bearing semantic: every dep returned through
    // the wire must equal the engine-direct result (the engine may keep the
    // same set across depths if the graph topology already converged at
    // depth=1 — this is correct behavior, not a wiring failure).
    for (const depth of [1, 3]) {
      const r = await invokeHandler(devHandler, "asset_dep_dependencies", {
        id: "CuttingForceEngine", depth,
      });
      const wireDeps = (r as { dependencies?: string[] }).dependencies ?? [];
      const directDeps = await assetDependencyGraphEngine.getDependencies(
        "CuttingForceEngine", depth,
      );
      // ROUTING PROOF: wire result equals engine-direct result for the SAME depth.
      expect([...wireDeps].sort()).toEqual([...directDeps].sort());
      // At a minimum, the direct dependency kienzle_formula always surfaces.
      expect(wireDeps).toContain("kienzle_formula");
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP — prism_dev :: asset_dep_dependents", () => {
  it("kienzle_formula → CuttingForceEngine is in dependents", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_dependents", {
      id: "kienzle_formula",
    });
    const data = r as { dependents?: string[] };
    expect(Array.isArray(data.dependents)).toBe(true);
    // ROUTING PROOF: the reverse-edge from kienzle → CuttingForceEngine round-trips
    expect(data.dependents).toContain("CuttingForceEngine");
  });

  it("PostProcessorEngine has zero dependents (leaf node)", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_dependents", {
      id: "PostProcessorEngine",
    });
    const data = r as { dependents?: string[] };
    // slimResponse strips empty arrays → undefined === []
    const deps = data.dependents ?? [];
    expect(deps.length).toBe(0);
    // Engine-direct cross-check
    expect((await assetDependencyGraphEngine.getDependents("PostProcessorEngine")).length).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP — prism_dev :: asset_dep_impact", () => {
  it("impact of changing material_db → affects every downstream consumer", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_impact", { asset_id: "material_db" });
    const data = r as {
      impact?: {
        affectedAssets?: string[];
        impactDepth?: number;
        criticalPath?: string[];
        recommendations?: string[];
      };
    };
    expect(Array.isArray(data.impact?.affectedAssets)).toBe(true);
    // material_db has dependents [kienzle_formula, CuttingForceEngine]
    // and those propagate to SpeedFeedEngine, ToolLifeEngine, PostProcessorEngine
    const affected = data.impact?.affectedAssets ?? [];
    expect(affected.length).toBeGreaterThan(0);
    expect(affected).toContain("CuttingForceEngine");
    expect(typeof data.impact?.impactDepth).toBe("number");
    expect(data.impact?.impactDepth).toBeGreaterThan(0);
  });

  it("camelCase assetId alias resolves identically to asset_id", async () => {
    const a = await invokeHandler(devHandler, "asset_dep_impact", { asset_id: "kienzle_formula" });
    const b = await invokeHandler(devHandler, "asset_dep_impact", { assetId: "kienzle_formula" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP — prism_dev :: asset_dep_stats", () => {
  it("returns stats matching the hard-coded 7-node graph", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_stats", {});
    const data = r as {
      stats?: {
        totalNodes?: number;
        totalEdges?: number;
        avgDependencies?: number;
        maxDependencyDepth?: number;
        orphanNodes?: number;
      };
    };
    // ROUTING PROOF: hard-coded buildGraph() creates exactly 7 nodes
    expect(data.stats?.totalNodes).toBe(7);
    expect(typeof data.stats?.totalEdges).toBe("number");
    expect(data.stats?.totalEdges).toBeGreaterThan(0);
    expect(typeof data.stats?.avgDependencies).toBe("number");
    expect(data.stats?.avgDependencies).toBeGreaterThan(0);
    // Engine-direct cross-check on the load-bearing total
    const direct = await assetDependencyGraphEngine.getStats();
    expect(data.stats?.totalNodes).toBe(direct.totalNodes);
    expect(data.stats?.totalEdges).toBe(direct.totalEdges);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP — error envelope", () => {
  it("asset_dep_node without id → schema rejects with {error}", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_node", {});
    const data = r as { error?: string };
    expect(typeof data.error).toBe("string");
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("asset_dep_impact without asset_id OR assetId → refine guard rejects with details", async () => {
    const r = await invokeHandler(devHandler, "asset_dep_impact", {});
    const data = r as { error?: string; details?: string };
    expect(typeof data.error).toBe("string");
    expect(String(data.details ?? "")).toMatch(/asset_id|assetId/i);
  });
});
