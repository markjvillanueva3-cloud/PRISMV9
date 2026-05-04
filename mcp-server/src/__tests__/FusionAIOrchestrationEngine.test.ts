/**
 * Tests for FusionAIOrchestrationEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-AI02
 */

import { describe, it, expect } from "vitest";
import { fusionAIOrchestrationEngine, type FusionAIRequest } from "../engines/FusionAIOrchestrationEngine.js";

describe("FusionAIOrchestrationEngine", () => {
  describe("orchestrate", () => {
    it("should orchestrate strategy request with chain-of-thought reasoning", async () => {
      const request: FusionAIRequest = {
        request_type: "strategy",
        reasoning_mode: "chain_of_thought",
        feature_type: "pocket",
        material_iso: "P",
        tool_diameter_mm: 12,
        include_chain: true
      };

      const result = await fusionAIOrchestrationEngine.orchestrate(request);

      expect(result.request_type).toBe("strategy");
      expect(result.reasoning_mode).toBe("chain_of_thought");
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
      expect(result.engines_invoked).toContain("FusionAIOrchestrationEngine");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.timestamp).toBeTruthy();
    });

    it("should include recommended strategy for feature requests", async () => {
      const request: FusionAIRequest = {
        request_type: "strategy",
        feature_type: "cavity",
        material_iso: "M",
        machine_type: "3axis"
      };

      const result = await fusionAIOrchestrationEngine.orchestrate(request);

      expect(result.recommended_strategy).toBeDefined();
      expect(result.recommended_strategy?.name).toBeTruthy();
      expect(result.recommended_strategy?.fusion_operation).toBeTruthy();
      expect(result.recommended_strategy?.parameters).toBeDefined();
    });

    it("should optimize Adaptive Clearing for adaptive requests", async () => {
      const request: FusionAIRequest = {
        request_type: "adaptive",
        material_iso: "N", // Aluminum
        tool_diameter_mm: 16,
        priority: "cycle_time"
      };

      const result = await fusionAIOrchestrationEngine.orchestrate(request);

      expect(result.adaptive_optimization).toBeDefined();
      expect(result.adaptive_optimization?.optimal_load_pct).toBeGreaterThan(50); // High for aluminum + cycle_time
      expect(result.adaptive_optimization?.keep_tool_down).toBe(true);
      expect(result.adaptive_optimization?.rationale).toContain("cycle_time");
    });

    it("should reduce optimal load for difficult materials", async () => {
      const easyMaterial: FusionAIRequest = {
        request_type: "adaptive",
        material_iso: "N", // Aluminum
        tool_diameter_mm: 12,
        priority: "balanced"
      };

      const hardMaterial: FusionAIRequest = {
        request_type: "adaptive",
        material_iso: "S", // Superalloys
        tool_diameter_mm: 12,
        priority: "balanced"
      };

      const easyResult = await fusionAIOrchestrationEngine.orchestrate(easyMaterial);
      const hardResult = await fusionAIOrchestrationEngine.orchestrate(hardMaterial);

      expect(easyResult.adaptive_optimization?.optimal_load_pct).toBeGreaterThan(
        hardResult.adaptive_optimization?.optimal_load_pct || 0
      );
    });

    it("should retrieve tribal knowledge when requested", async () => {
      const request: FusionAIRequest = {
        request_type: "tribal",
        material_iso: "P",
        include_tribal: true
      };

      const result = await fusionAIOrchestrationEngine.orchestrate(request);

      expect(result.tribal_tips).toBeDefined();
      expect(result.tribal_tips?.length).toBeGreaterThan(0);
      expect(result.tribal_tips?.[0].tip).toBeTruthy();
      expect(result.tribal_tips?.[0].source).toBeTruthy();
      expect(result.tribal_tips?.[0].confidence).toBeGreaterThan(0);
    });

    it("should use different reasoning modes", async () => {
      const modes = ["tree_of_thought", "multi_path", "abductive"] as const;

      for (const mode of modes) {
        const request: FusionAIRequest = {
          request_type: "strategy",
          reasoning_mode: mode,
          feature_type: "slot"
        };

        const result = await fusionAIOrchestrationEngine.orchestrate(request);
        expect(result.reasoning_mode).toBe(mode);
      }
    });

    it("should omit reasoning chain when include_chain is false", async () => {
      const request: FusionAIRequest = {
        request_type: "strategy",
        feature_type: "pocket",
        include_chain: false
      };

      const result = await fusionAIOrchestrationEngine.orchestrate(request);

      expect(result.reasoning_chain).toEqual([]);
    });

    it("should track processing time", async () => {
      const request: FusionAIRequest = {
        request_type: "strategy",
        feature_type: "freeform"
      };

      const result = await fusionAIOrchestrationEngine.orchestrate(request);

      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.processing_time_ms).toBeLessThan(5000);
    });

    it("should adjust adaptive parameters for tool_life priority", async () => {
      const balanced: FusionAIRequest = {
        request_type: "adaptive",
        material_iso: "P",
        priority: "balanced"
      };

      const toolLife: FusionAIRequest = {
        request_type: "adaptive",
        material_iso: "P",
        priority: "tool_life"
      };

      const balancedResult = await fusionAIOrchestrationEngine.orchestrate(balanced);
      const toolLifeResult = await fusionAIOrchestrationEngine.orchestrate(toolLife);

      expect(toolLifeResult.adaptive_optimization?.optimal_load_pct).toBeLessThan(
        balancedResult.adaptive_optimization?.optimal_load_pct || 100
      );
    });

    it("should default to chain_of_thought when no mode specified", async () => {
      const request: FusionAIRequest = {
        request_type: "diagnose"
      };

      const result = await fusionAIOrchestrationEngine.orchestrate(request);

      expect(result.reasoning_mode).toBe("chain_of_thought");
    });
  });

  describe("getReasoningModes", () => {
    it("should return all 8 reasoning modes", () => {
      const modes = fusionAIOrchestrationEngine.getReasoningModes();

      expect(modes).toHaveLength(8);
      expect(modes).toContain("chain_of_thought");
      expect(modes).toContain("tree_of_thought");
      expect(modes).toContain("multi_path");
      expect(modes).toContain("backtracking");
      expect(modes).toContain("abductive");
      expect(modes).toContain("deductive");
      expect(modes).toContain("inductive");
      expect(modes).toContain("analogical");
    });
  });

  describe("getStats", () => {
    it("should return engine statistics", () => {
      const stats = fusionAIOrchestrationEngine.getStats();

      expect(stats.reasoning_modes).toBe(8);
      expect(stats.tribal_tips).toBeGreaterThan(0);
      expect(stats.engines_integrated.length).toBeGreaterThan(0);
      expect(stats.signature_features).toContain("Adaptive Clearing (constant chip load)");
    });
  });
});

describe("FusionAIOrchestrationEngine — dispatcher wiring (camDispatcher.ts)", () => {
  const FUS_AIORCH_ACTIONS = [
    "cam_fusion_ai_orchestrate",
    "cam_fusion_ai_get_reasoning_modes",
    "cam_fusion_ai_get_stats",
  ] as const;

  const ACTION_COUNT_EXPECTED = 3;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 3 cam_fusion_ai_* enum entries", async () => {
    const src = await readDispatcher();
    expect(FUS_AIORCH_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of FUS_AIORCH_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _fusAIOrch singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_fusAIOrch\s*:\s*any/);
  });

  it("registers a fusAIOrch case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"fusAIOrch"\s*:\s*return\s+_fusAIOrch\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/FusionAIOrchestrationEngine\.js"\s*\)\)\.fusionAIOrchestrationEngine/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of FUS_AIORCH_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"fusAIOrch\")", async () => {
    const src = await readDispatcher();
    for (const action of FUS_AIORCH_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("fusAIOrch"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("orchestrate case awaits the async pipeline and pass-throughs params", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_ai_orchestrate"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("await engine.orchestrate(");
    expect(body).toContain("params as never");
    expect(body).toContain("response");
  });

  it("get_reasoning_modes case routes to getReasoningModes() and reports count", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_ai_get_reasoning_modes"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getReasoningModes()");
    expect(body).toContain("count");
  });

  it("get_stats case routes to getStats() and spreads the result", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_ai_get_stats"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getStats()");
    expect(body).toMatch(/\.\.\.stats/);
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of FUS_AIORCH_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("orchestrate is the only async-await case (modes + stats are synchronous)", async () => {
    const src = await readDispatcher();
    const orchRe = /case\s+"cam_fusion_ai_orchestrate"\s*:[\s\S]*?break;/;
    const orchBody = src.match(orchRe)?.[0] ?? "";
    expect(orchBody).toContain("await engine.orchestrate");

    const modesRe = /case\s+"cam_fusion_ai_get_reasoning_modes"\s*:[\s\S]*?break;/;
    const modesBody = modesRe.exec(src)?.[0] ?? "";
    expect(modesBody).not.toMatch(/await\s+engine\.getReasoningModes/);

    const statsRe = /case\s+"cam_fusion_ai_get_stats"\s*:[\s\S]*?break;/;
    const statsBody = statsRe.exec(src)?.[0] ?? "";
    expect(statsBody).not.toMatch(/await\s+engine\.getStats/);
  });

  it("dispatcher uses the canonical engine path (../../engines/FusionAIOrchestrationEngine.js)", async () => {
    const src = await readDispatcher();
    const re = /await\s+import\(\s*"\.\.\/\.\.\/engines\/FusionAIOrchestrationEngine\.js"\s*\)/g;
    const matches = src.match(re);
    expect(matches !== null).toBe(true);
    // 1 import in the lazy-getter switch case for fusAIOrch
    expect(matches!.length).toBeGreaterThanOrEqual(1);
  });
});
