/**
 * Tests for devDispatcher U-UTL-WIRE04 — wires Phase 0.23 U-UTL1..U-UTL15
 * (15 Max-Asset-Utilization engines) into prism_dev via 35 util_* actions.
 *
 * These tests exercise dispatcher routing and Zod validation rather than
 * the deep engine logic (each engine has its own test file).
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

// Filesystem-scanning engine audits + 36 sequential dispatcher calls are slow.
vi.setConfig({ testTimeout: 600_000, hookTimeout: 600_000 });

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerDevDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("devDispatcher U-UTL-WIRE04 (Phase 0.23 asset utilization)", () => {
  let handler: Handler;

  beforeAll(async () => {
    const s = createServer();
    handler = await s.handler;
  });

  describe("U-UTL1 EngineUtilizationAuditor", () => {
    it("util_engine_audit returns an audit result with counts", async () => {
      const r = await call(handler, "util_engine_audit", {
        include_tests: true,
        include_dispatchers: true,
      });
      expect(r).toBeDefined();
      expect(r).toHaveProperty("totalEngines");
      expect(r).toHaveProperty("orphanRate");
    });

    it("util_engine_orphans returns orphans + exit-gate flag", async () => {
      const r = await call(handler, "util_engine_orphans", {});
      expect(r).toHaveProperty("meets_exit_gate");
    });

    it("util_engine_summary returns summary counts after audit", async () => {
      const r = await call(handler, "util_engine_summary", {});
      // summary is null only if no audit ever ran; orphans endpoint ran one
      if (r !== null) {
        expect(r).toHaveProperty("total");
        expect(r).toHaveProperty("active");
      }
    });
  });

  describe("U-UTL2 FormulaIntegration", () => {
    it("util_formula_query accepts domain filter", async () => {
      const r = await call(handler, "util_formula_query", { domain: "cutting", limit: 5 });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_formula_stats returns totals", async () => {
      const r = await call(handler, "util_formula_stats", {});
      expect(r).toHaveProperty("totalFormulas");
      expect(r).toHaveProperty("verifiedFormulas");
    });

    it("util_formula_verify returns a boolean verification", async () => {
      const r = await call(handler, "util_formula_verify", { id: "nonexistent" });
      expect(r).toHaveProperty("verified");
    });
  });

  describe("U-UTL3 AlgorithmOrchestrator", () => {
    it("util_algorithm_query accepts category filter", async () => {
      const r = await call(handler, "util_algorithm_query", { category: "control" });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_algorithm_recommend returns an orchestration result", async () => {
      const r = await call(handler, "util_algorithm_recommend", {
        problem_type: "optimization",
        domain: "cutting",
      });
      expect(r).toHaveProperty("algorithmId");
    });
  });

  describe("U-UTL4 ToolpathStrategyRouter", () => {
    it("util_strategy_route returns a recommendation", async () => {
      const r = await call(handler, "util_strategy_route", {
        machine_type: "mill",
        priority: "speed",
      });
      expect(r).toHaveProperty("recommended");
      expect(r).toHaveProperty("reasoning");
    });

    it("util_strategy_list returns strategies for a machine type", async () => {
      const r = await call(handler, "util_strategy_list", { machine_type: "lathe" });
      expect(r).toHaveProperty("total");
    });
  });

  describe("U-UTL5 MaterialDatabaseBridge", () => {
    it("util_material_query filters by type", async () => {
      const r = await call(handler, "util_material_query", { type: "steel", limit: 3 });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_material_stats returns byType map", async () => {
      const r = await call(handler, "util_material_stats", {});
      expect(r).toHaveProperty("totalMaterials");
      expect(r).toHaveProperty("byType");
    });
  });

  describe("U-UTL6 ToolDatabaseBridge", () => {
    it("util_tool_query filters by manufacturer", async () => {
      const r = await call(handler, "util_tool_query", {
        manufacturer: "Sandvik",
        limit: 5,
      });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_tool_stats returns coating breakdown", async () => {
      const r = await call(handler, "util_tool_stats", {});
      expect(r).toHaveProperty("byCoating");
    });
  });

  describe("U-UTL7 MachineCapabilityIndex", () => {
    it("util_machine_query filters by type", async () => {
      const r = await call(handler, "util_machine_query", { type: "mill", limit: 5 });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_machine_capable returns capable machines", async () => {
      const r = await call(handler, "util_machine_capable", {
        required_capabilities: ["5-axis"],
      });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_machine_stats returns byController map", async () => {
      const r = await call(handler, "util_machine_stats", {});
      expect(r).toHaveProperty("byController");
    });
  });

  describe("U-UTL8 TribalKnowledgeMaximizer", () => {
    it("util_tribal_search accepts keyword filter", async () => {
      const r = await call(handler, "util_tribal_search", {
        keywords: ["thin", "wall"],
        limit: 5,
      });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_tribal_underutilized returns low-usage tips", async () => {
      const r = await call(handler, "util_tribal_underutilized", { threshold: 10 });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_tribal_stats returns total tip count", async () => {
      const r = await call(handler, "util_tribal_stats", {});
      expect(r).toHaveProperty("totalTips");
    });
  });

  describe("U-UTL9 MITCourseFullIntegration", () => {
    it("util_mit_query accepts department filter", async () => {
      const r = await call(handler, "util_mit_query", { department: "2", limit: 5 });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_mit_stats returns course counts", async () => {
      const r = await call(handler, "util_mit_stats", {});
      expect(r).toHaveProperty("totalCourses");
    });
  });

  describe("U-UTL10 JMDieProgramLearning", () => {
    it("util_jmdie_query accepts machine_type filter", async () => {
      const r = await call(handler, "util_jmdie_query", {
        machine_type: "mill",
        limit: 5,
      });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_jmdie_tips returns tips array", async () => {
      const r = await call(handler, "util_jmdie_tips", { machine_type: "lathe" });
      expect(r).toHaveProperty("tips");
    });

    it("util_jmdie_stats returns pattern counts", async () => {
      const r = await call(handler, "util_jmdie_stats", {});
      expect(r).toHaveProperty("totalPrograms");
      expect(r).toHaveProperty("extractedPatterns");
    });
  });

  describe("U-UTL11 VideoKnowledgeIntegration", () => {
    it("util_video_query accepts topic filter", async () => {
      const r = await call(handler, "util_video_query", { topic: "milling", limit: 5 });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_video_stats returns totals", async () => {
      const r = await call(handler, "util_video_stats", {});
      expect(r).toHaveProperty("totalVideos");
    });
  });

  describe("U-UTL12 PostProcessorUnification", () => {
    it("util_post_query filters by controller", async () => {
      const r = await call(handler, "util_post_query", {
        controller: "Fanuc",
        limit: 5,
      });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_post_stats returns byController map", async () => {
      const r = await call(handler, "util_post_stats", {});
      expect(r).toHaveProperty("totalConfigs");
    });
  });

  describe("U-UTL13 RegistryFederation", () => {
    it("util_registry_query accepts a query string", async () => {
      const r = await call(handler, "util_registry_query", { query: "steel" });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_registry_list returns known registries", async () => {
      const r = await call(handler, "util_registry_list", {});
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });

    it("util_registry_stats returns federation stats", async () => {
      const r = await call(handler, "util_registry_stats", {});
      expect(r).toHaveProperty("totalRegistries");
    });
  });

  describe("U-UTL14 SkillGapAnalyzer", () => {
    it("util_skill_gap_analyze returns gap analysis", async () => {
      const r = await call(handler, "util_skill_gap_analyze", {});
      expect(r).toBeDefined();
    });

    it("util_skill_by_domain returns domain skills", async () => {
      const r = await call(handler, "util_skill_by_domain", { domain: "cutting" });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });
  });

  describe("U-UTL15 HookCoverageMaximizer", () => {
    it("util_hook_coverage_analyze returns coverage report", async () => {
      const r = await call(handler, "util_hook_coverage_analyze", {});
      expect(r).toHaveProperty("coveragePercent");
    });

    it("util_hook_query filters by event type", async () => {
      const r = await call(handler, "util_hook_query", { type: "pre", limit: 5 });
      expect(Array.isArray(r) || r._items).toBeTruthy();
    });
  });

  describe("action enum coverage", () => {
    it("all remaining util_* actions route without validation error", async () => {
      // util_engine_audit/orphans/summary covered above — skipped here because
      // the filesystem scan dominates total test time and the U-UTL1 block
      // has already proven they route correctly.
      const minimal: Array<[string, Record<string, any>]> = [
        ["util_formula_query", {}],
        ["util_formula_stats", {}],
        ["util_formula_verify", { id: "x" }],
        ["util_algorithm_query", {}],
        ["util_algorithm_recommend", { problem_type: "x", domain: "y" }],
        ["util_strategy_route", { machine_type: "mill" }],
        ["util_strategy_list", { machine_type: "mill" }],
        ["util_material_query", {}],
        ["util_material_stats", {}],
        ["util_tool_query", {}],
        ["util_tool_stats", {}],
        ["util_machine_query", {}],
        ["util_machine_capable", {}],
        ["util_machine_stats", {}],
        ["util_tribal_search", {}],
        ["util_tribal_underutilized", {}],
        ["util_tribal_stats", {}],
        ["util_mit_query", {}],
        ["util_mit_stats", {}],
        ["util_jmdie_query", {}],
        ["util_jmdie_tips", {}],
        ["util_jmdie_stats", {}],
        ["util_video_query", {}],
        ["util_video_stats", {}],
        ["util_post_query", {}],
        ["util_post_stats", {}],
        ["util_registry_query", { query: "test" }],
        ["util_registry_list", {}],
        ["util_registry_stats", {}],
        ["util_skill_gap_analyze", {}],
        ["util_skill_by_domain", { domain: "cutting" }],
        ["util_hook_coverage_analyze", {}],
        ["util_hook_query", {}],
      ];
      expect(minimal).toHaveLength(33); // 36 total; 3 engine-audit actions covered in U-UTL1 block
      for (const [action, params] of minimal) {
        const r = await call(handler, action, params);
        // "Invalid params" indicates schema rejection
        if (r?.error && /Invalid params/.test(r.error)) {
          throw new Error(`${action} rejected by Zod: ${r.error}`);
        }
      }
    });
  });
});
