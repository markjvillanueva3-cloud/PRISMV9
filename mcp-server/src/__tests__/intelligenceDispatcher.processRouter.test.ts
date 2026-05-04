/**
 * intelligenceDispatcher.processRouter.test.ts — U-XPROC-ROUTER-01 dispatcher tests
 *
 * Round-trip tests for the cross-process pipeline router dispatcher actions:
 *   - process_pipeline_stages
 *   - process_route
 *   - process_full_pipeline
 *
 * @see src/engines/ProcessIntelligenceRouterEngine.ts
 * @see src/tools/dispatchers/intelligenceDispatcher.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerIntelligenceDispatcher(server as unknown as Parameters<typeof registerIntelligenceDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_intelligence");
  if (!tool) throw new Error("prism_intelligence tool not registered");
  handler = tool.handler;
});

describe("intelligenceDispatcher cross-process pipeline router (U-XPROC-ROUTER-01)", () => {
  // ===========================================================================
  // process_pipeline_stages
  // ===========================================================================

  describe("process_pipeline_stages", () => {
    it("returns 5 stages in canonical execution order", async () => {
      const r = await invoke("process_pipeline_stages");
      expect(r.success).toBe(true);
      expect(r.count).toBe(5);
      const stages = r.stages as Array<{ stage: string; bridge: string }>;
      expect(stages.map((s) => s.stage)).toEqual([
        "classify",
        "feature",
        "speedfeed",
        "post",
        "ai",
      ]);
    });
  });

  // ===========================================================================
  // process_route
  // ===========================================================================

  describe("process_route", () => {
    it("classifies a milling intent and recommends 4 downstream bridges", async () => {
      const r = await invoke("process_route", {
        intent: "make a pocket on the VMX mill",
      });
      expect(r.success).toBe(true);
      expect(r.process).toBe("mill");
      const recs = r.recommended_bridges as string[];
      expect(recs).toEqual(["feature", "speedfeed", "post", "ai"]);
    });

    it("classifies a wire-EDM intent as wedm", async () => {
      const r = await invoke("process_route", {
        intent: "wire EDM a tapered profile in D2 with skim passes",
      });
      expect(r.success).toBe(true);
      expect(r.process).toBe("wedm");
    });

    it("respects explicit process override", async () => {
      const r = await invoke("process_route", {
        intent: "ambiguous",
        process: "lathe",
      });
      expect(r.success).toBe(true);
      expect(r.process).toBe("lathe");
    });

    it("rejects missing intent at dispatcher boundary", async () => {
      const r = await invoke("process_route", {});
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/requires `intent`/);
    });
  });

  // ===========================================================================
  // process_full_pipeline
  // ===========================================================================

  describe("process_full_pipeline", () => {
    it("classifies + skips downstream stages when no opt-in bodies provided", async () => {
      const r = await invoke("process_full_pipeline", {
        intent: "make a pocket on the VMX mill",
      });
      expect(r.success).toBe(true);
      expect(r.process).toBe("mill");
      const executed = r.stages_executed as string[];
      expect(executed).toEqual(["classify"]);
    });

    it("runs feature stage when feature_request is supplied", async () => {
      const r = await invoke("process_full_pipeline", {
        intent: "make a pocket",
        feature_request: { feature: "pocket_2d" },
      });
      expect(r.success).toBe(true);
      const executed = r.stages_executed as string[];
      expect(executed).toContain("feature");
      const feat = r.feature_result as { feature: string; recommended_process: string };
      expect(feat.feature).toBe("pocket_2d");
      expect(feat.recommended_process).toBe("mill");
    });

    it("runs speedfeed stage for mill carbide on aluminum", { timeout: 30_000 }, async () => {
      const r = await invoke("process_full_pipeline", {
        intent: "rough mill",
        sf_request: {
          process: "mill",
          material: "aluminum",
          tool_material: "Carbide",
          mill_operation: "roughing",
          tool_diameter_mm: 12,
          number_of_teeth: 4,
          material_hardness_hb: 95,
        },
      });
      expect(r.success).toBe(true);
      const executed = r.stages_executed as string[];
      expect(executed).toContain("speedfeed");
      const sf = r.speedfeed_result as { process: string; spindle_rpm: number };
      expect(sf.process).toBe("mill");
      expect(sf.spindle_rpm).toBeGreaterThan(0);
    });

    it("runs ai stage in dry_run mode without invoking the heavy orchestrator", async () => {
      const r = await invoke("process_full_pipeline", {
        intent: "milling",
        ai_request: {
          intent: "milling pocket",
          process: "mill",
          dry_run: true,
        },
      });
      expect(r.success).toBe(true);
      const executed = r.stages_executed as string[];
      expect(executed).toContain("ai");
      const ai = r.ai_result as { dry_run: boolean; routed_to: string };
      expect(ai.dry_run).toBe(true);
      expect(ai.routed_to).toBe("MillMasterOrchestratorFacadeEngine.orchestrate");
    });

    it("force_ai_dry_run forces dry_run even if ai_request omits it", async () => {
      const r = await invoke("process_full_pipeline", {
        intent: "lathe groove",
        ai_request: { intent: "lathe orchestration", process: "lathe" },
        force_ai_dry_run: true,
      });
      expect(r.success).toBe(true);
      const ai = r.ai_result as { dry_run: boolean; routed_to: string };
      expect(ai.dry_run).toBe(true);
      expect(ai.routed_to).toBe("LatheMasterOrchestratorFacadeEngine.orchestrate");
    });

    it("captures partial failure (one stage fails, others continue)", { timeout: 30_000 }, async () => {
      const r = await invoke("process_full_pipeline", {
        intent: "mixed",
        feature_request: { feature: "pocket_2d" }, // valid
        sf_request: {
          process: "wedm",
          material: "unobtainium", // bad
          workpiece_thickness_mm: 10,
        },
      });
      expect(r.success).toBe(true);
      const executed = r.stages_executed as string[];
      const failed = r.stages_failed as Array<{ stage: string }>;
      expect(executed).toContain("feature");
      expect(failed.some((f) => f.stage === "speedfeed")).toBe(true);
    });

    it("restricts execution to stages listed in `stages`", async () => {
      const r = await invoke("process_full_pipeline", {
        intent: "milling",
        stages: ["classify", "feature"],
        feature_request: { feature: "pocket_2d" },
      });
      expect(r.success).toBe(true);
      const executed = r.stages_executed as string[];
      expect(executed).toEqual(["classify", "feature"]);
    });

    it("rejects missing intent at dispatcher boundary", async () => {
      const r = await invoke("process_full_pipeline", {});
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/requires `intent`/);
    });

    it("propagates engine error for invalid stage id", async () => {
      const r = await invoke("process_full_pipeline", {
        intent: "milling",
        stages: ["bogus"],
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/invalid stage/);
    });
  });
});
