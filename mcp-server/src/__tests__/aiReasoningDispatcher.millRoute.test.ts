/**
 * MILL-MASTER-P1-U05-PRISM-AI-ROUTE — aiReasoningDispatcher mill-route test
 *
 * Verifies the 6 new facade-routed mill actions added to prism_ai:
 *   - route_mill_pipeline  (caller picks type)
 *   - mill_agi_reason      (type=agi)
 *   - mill_scientific_analyze (type=scientific)
 *   - mill_validate_approach  (type=validate)
 *   - mill_awareness_query (drift|stats|facade|full)
 *   - mill_recommend_features (task → mill engines + AI features)
 *
 * All 6 flow through MillMasterOrchestratorFacadeEngine — no direct-to-sub
 * engine bypass. Spies verify actual invocation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { millMasterOrchestratorFacadeEngine } from "../engines/MillMasterOrchestratorFacadeEngine.js";
import { millAISelfAwarenessIntegrationEngine } from "../engines/MillAISelfAwarenessIntegrationEngine.js";
import { prismSelfAwarenessEngine } from "../engines/PRISMSelfAwarenessEngine.js";

function makeServer() {
  const registered: Array<{ name: string; desc: string; schema: any; handler: Function }> = [];
  return {
    registered,
    tool(name: string, desc: string, schema: any, handler: Function) {
      registered.push({ name, desc, schema, handler });
    },
  };
}

async function invoke(handler: Function, action: string, params: any = {}): Promise<any> {
  const rsp = await handler({ action, params });
  const text = rsp?.content?.[0]?.text;
  if (typeof text !== "string") return rsp;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

async function getHandler(): Promise<Function> {
  const server = makeServer();
  registerAIReasoningDispatcher(server as any);
  return server.registered[0]!.handler as Function;
}

const baseMill = {
  material: "4140",
  material_iso: "P" as const,
  operation: "roughing",
  tool_diameter_mm: 12,
  tool_flutes: 4,
  cutting_speed_m_min: 100,
  feed_per_tooth_mm: 0.1,
  axial_depth_mm: 2,
  radial_depth_mm: 6,
};

describe("MILL-MASTER-P1-U05 · prism_ai mill-route — action registration", () => {
  it("registers prism_ai tool", async () => {
    const server = makeServer();
    registerAIReasoningDispatcher(server as any);
    expect(server.registered).toHaveLength(1);
    expect(server.registered[0]!.name).toBe("prism_ai");
  });

  it("handler accepts all 6 new mill-route actions (no 'Unknown action' error)", async () => {
    const handler = await getHandler();
    for (const a of [
      "route_mill_pipeline",
      "mill_agi_reason",
      "mill_awareness_query",
      "mill_recommend_features",
      "mill_scientific_analyze",
      "mill_validate_approach",
    ]) {
      const out = await invoke(handler, a, a === "mill_recommend_features" ? { task: "ping" }
        : a === "mill_awareness_query" ? { mode: "facade" }
        : baseMill);
      // Any response is fine EXCEPT the default-branch "Unknown action" error
      const err = (out?.error ?? "") as string;
      expect(err, `action ${a} hit default branch`).not.toMatch(/Unknown action/);
    }
  });
});

describe("MILL-MASTER-P1-U05 · route_mill_pipeline — generic pipeline router", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("routes through facade with caller-specified type", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const handler = await getHandler();
    await invoke(handler, "route_mill_pipeline", { ...baseMill, type: "scientific" });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.[0]?.type).toBe("scientific");
  });

  it("defaults type to 'quick' when unspecified", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const handler = await getHandler();
    await invoke(handler, "route_mill_pipeline", baseMill);
    expect(spy.mock.calls[0]?.[0]?.type).toBe("quick");
  });

  it("rejects invalid type with structured error", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "route_mill_pipeline", { ...baseMill, type: "made_up_type" });
    expect(out.error).toBeDefined();
    expect(out.error).toContain("Invalid type");
  });

  it("rejects missing material", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "route_mill_pipeline", { type: "quick" });
    expect(out.error).toBeDefined();
    expect(out.error).toMatch(/material/i);
  });

  it("accepts all 6 valid types", async () => {
    const handler = await getHandler();
    for (const type of ["print_to_program", "scientific", "agi", "validate", "quick", "wisdom"] as const) {
      const out = await invoke(handler, "route_mill_pipeline", { ...baseMill, type });
      expect(out.error).toBeUndefined();
    }
  });
});

describe("MILL-MASTER-P1-U05 · typed facade routes", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("mill_agi_reason forces type=agi through facade", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const handler = await getHandler();
    await invoke(handler, "mill_agi_reason", baseMill);
    expect(spy.mock.calls[0]?.[0]?.type).toBe("agi");
  });

  it("mill_scientific_analyze forces type=scientific", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const handler = await getHandler();
    await invoke(handler, "mill_scientific_analyze", baseMill);
    expect(spy.mock.calls[0]?.[0]?.type).toBe("scientific");
  });

  it("mill_validate_approach forces type=validate", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const handler = await getHandler();
    await invoke(handler, "mill_validate_approach", { ...baseMill, rpm: 3000, feed_mm_min: 500 });
    expect(spy.mock.calls[0]?.[0]?.type).toBe("validate");
  });

  it("typed routes reject missing material (uniform contract)", async () => {
    const handler = await getHandler();
    for (const action of ["mill_agi_reason", "mill_scientific_analyze", "mill_validate_approach"]) {
      const out = await invoke(handler, action, {});
      expect(out.error).toMatch(/material/i);
    }
  });

  it("typed-route result carries facade provenance (engines_invoked present)", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_scientific_analyze", baseMill);
    expect(out.provenance).toBeDefined();
    expect(Array.isArray(out.provenance.engines_invoked)).toBe(true);
    expect(out.provenance.engines_invoked.length).toBeGreaterThan(0);
  });
});

describe("MILL-MASTER-P1-U05 · mill_awareness_query — 4 modes", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("mode=drift returns refreshRegistry drift report", async () => {
    const spy = vi.spyOn(millAISelfAwarenessIntegrationEngine, "refreshRegistry");
    const handler = await getHandler();
    const out = await invoke(handler, "mill_awareness_query", { mode: "drift" });
    expect(spy).toHaveBeenCalled();
    expect(out).toHaveProperty("curated_count");
    expect(out).toHaveProperty("on_disk_count");
  });

  it("mode=stats returns getStatistics result", async () => {
    const spy = vi.spyOn(millAISelfAwarenessIntegrationEngine, "getStatistics");
    const handler = await getHandler();
    const out = await invoke(handler, "mill_awareness_query", { mode: "stats" });
    expect(spy).toHaveBeenCalled();
    expect(out).toHaveProperty("version");
    expect(out).toHaveProperty("engines");
  });

  it("mode=facade returns MillMaster facade getSelfAwareness", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "getSelfAwareness");
    const handler = await getHandler();
    const out = await invoke(handler, "mill_awareness_query", { mode: "facade" });
    expect(spy).toHaveBeenCalled();
    expect(out.engine_name).toBe("MillMasterOrchestratorFacadeEngine");
  });

  it("mode=full (default) aggregates drift + stats + facade", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_awareness_query", {});
    expect(out.drift).toBeDefined();
    expect(out.stats).toBeDefined();
    expect(out.facade).toBeDefined();
  });
});

describe("MILL-MASTER-P1-U05 · mill_recommend_features — delegates to PRISM self-awareness", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("delegates to PRISMSelfAwarenessEngine.recommendMillFeatures", async () => {
    const spy = vi.spyOn(prismSelfAwarenessEngine, "recommendMillFeatures");
    const handler = await getHandler();
    await invoke(handler, "mill_recommend_features", { task: "optimize milling feed and speed" });
    expect(spy).toHaveBeenCalledWith("optimize milling feed and speed");
  });

  it("returns mill_scoped=true marker", async () => {
    const handler = await getHandler();
    const out = await invoke(handler, "mill_recommend_features", { task: "roughing 4140" });
    expect(out.mill_scoped).toBe(true);
  });

  it("passes empty string when task omitted (not undefined)", async () => {
    const spy = vi.spyOn(prismSelfAwarenessEngine, "recommendMillFeatures");
    const handler = await getHandler();
    await invoke(handler, "mill_recommend_features", {});
    expect(spy).toHaveBeenCalledWith("");
  });
});

describe("MILL-MASTER-P1-U05 · anti-regression", () => {
  it("prism_ai tool description mentions it handles a large action set", async () => {
    const server = makeServer();
    registerAIReasoningDispatcher(server as any);
    const desc = server.registered[0]!.desc;
    // Description carries the live action list; just sanity-check it's large
    expect(desc.length).toBeGreaterThan(1000);
    // And each of our 6 new actions appears in the description
    for (const a of [
      "route_mill_pipeline",
      "mill_agi_reason",
      "mill_awareness_query",
      "mill_recommend_features",
      "mill_scientific_analyze",
      "mill_validate_approach",
    ]) {
      expect(desc, `description missing ${a}`).toContain(a);
    }
  });

  it("no direct-to-sub-engine bypass — all 4 facade-routed actions touch orchestrate()", async () => {
    const spy = vi.spyOn(millMasterOrchestratorFacadeEngine, "orchestrate");
    const handler = await getHandler();
    for (const a of ["route_mill_pipeline", "mill_agi_reason", "mill_scientific_analyze", "mill_validate_approach"]) {
      spy.mockClear();
      await invoke(handler, a, baseMill);
      expect(spy, `action ${a} did not route through facade`).toHaveBeenCalledTimes(1);
    }
  });
});
