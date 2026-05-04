/**
 * Tests for InventorCAMAIOrchestrationEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-AI03
 */

import { describe, it, expect } from "vitest";
import { inventorCAMAIOrchestrationEngine, type InventorAIRequest } from "../engines/InventorCAMAIOrchestrationEngine.js";

describe("InventorCAMAIOrchestrationEngine", () => {
  describe("orchestrate", () => {
    it("should orchestrate strategy request with reasoning chain", async () => {
      const request: InventorAIRequest = {
        request_type: "strategy",
        reasoning_mode: "chain_of_thought",
        feature_type: "pocket",
        material_iso: "P",
        include_chain: true
      };

      const result = await inventorCAMAIOrchestrationEngine.orchestrate(request);

      expect(result.request_type).toBe("strategy");
      expect(result.reasoning_mode).toBe("chain_of_thought");
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
      expect(result.engines_invoked).toContain("InventorCAMAIOrchestrationEngine");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should optimize iMachining for imachining request", async () => {
      const request: InventorAIRequest = {
        request_type: "imachining",
        material_iso: "P",
        tool_diameter_mm: 12,
        machine_power_kW: 20,
        tool_material: "carbide"
      };

      const result = await inventorCAMAIOrchestrationEngine.orchestrate(request);

      expect(result.imachining_optimization).toBeDefined();
      expect(result.imachining_optimization?.level).toBeGreaterThanOrEqual(1);
      expect(result.imachining_optimization?.level).toBeLessThanOrEqual(8);
      expect(result.imachining_optimization?.mrr_increase_pct).toBeGreaterThan(0);
      expect(result.imachining_optimization?.tool_life_increase_pct).toBeGreaterThan(0);
    });

    it("should limit iMachining level for difficult materials", async () => {
      const aluminum: InventorAIRequest = {
        request_type: "imachining",
        material_iso: "N",
        machine_power_kW: 30
      };

      const superalloy: InventorAIRequest = {
        request_type: "imachining",
        material_iso: "S",
        machine_power_kW: 30
      };

      const alResult = await inventorCAMAIOrchestrationEngine.orchestrate(aluminum);
      const saResult = await inventorCAMAIOrchestrationEngine.orchestrate(superalloy);

      expect(alResult.imachining_optimization?.level).toBeGreaterThan(
        saResult.imachining_optimization?.level || 0
      );
    });

    it("should reduce iMachining level for low-power machines", async () => {
      const highPower: InventorAIRequest = {
        request_type: "imachining",
        material_iso: "P",
        machine_power_kW: 30
      };

      const lowPower: InventorAIRequest = {
        request_type: "imachining",
        material_iso: "P",
        machine_power_kW: 8
      };

      const highResult = await inventorCAMAIOrchestrationEngine.orchestrate(highPower);
      const lowResult = await inventorCAMAIOrchestrationEngine.orchestrate(lowPower);

      expect(highResult.imachining_optimization?.level).toBeGreaterThanOrEqual(
        lowResult.imachining_optimization?.level || 0
      );
    });

    it("should calculate physics when requested", async () => {
      const request: InventorAIRequest = {
        request_type: "physics",
        material_iso: "P",
        tool_diameter_mm: 12,
        tool_flutes: 4,
        spindle_rpm: 5000,
        feed_mm_min: 1000,
        axial_depth_mm: 5,
        include_physics: true
      };

      const result = await inventorCAMAIOrchestrationEngine.orchestrate(request);

      expect(result.physics_analysis).toBeDefined();
      expect(result.physics_analysis?.cutting_force_N).toBeGreaterThan(0);
      expect(result.physics_analysis?.power_kW).toBeGreaterThan(0);
      expect(result.physics_analysis?.tool_life_min).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(result.physics_analysis?.deflection_risk);
    });

    it("should retrieve tribal knowledge when requested", async () => {
      const request: InventorAIRequest = {
        request_type: "tribal",
        material_iso: "P",
        include_tribal: true
      };

      const result = await inventorCAMAIOrchestrationEngine.orchestrate(request);

      expect(result.tribal_tips).toBeDefined();
      expect(result.tribal_tips?.length).toBeGreaterThan(0);
      expect(result.tribal_tips?.[0].source).toBeTruthy();
    });

    it("should filter tribal knowledge for iMachining operations", async () => {
      const request: InventorAIRequest = {
        request_type: "tribal",
        operation: "imachining_2d",
        include_tribal: true
      };

      const result = await inventorCAMAIOrchestrationEngine.orchestrate(request);

      expect(result.tribal_tips).toBeDefined();
      result.tribal_tips?.forEach(tip => {
        expect(tip.category).toBe("imachining");
      });
    });

    it("should select appropriate strategy for features", async () => {
      const pocketRequest: InventorAIRequest = {
        request_type: "strategy",
        feature_type: "pocket",
        material_iso: "P",
        operation: "roughing"
      };

      const surfaceRequest: InventorAIRequest = {
        request_type: "strategy",
        feature_type: "freeform_surface",
        material_iso: "P",
        operation: "finishing"
      };

      const pocketResult = await inventorCAMAIOrchestrationEngine.orchestrate(pocketRequest);
      const surfaceResult = await inventorCAMAIOrchestrationEngine.orchestrate(surfaceRequest);

      expect(pocketResult.recommended_strategy?.name).toContain("iMachining");
      expect(surfaceResult.recommended_strategy?.name).toBe("Scallop");
    });

    it("should generate optimizations for high-risk physics", async () => {
      const request: InventorAIRequest = {
        request_type: "optimize",
        material_iso: "H", // Hardened - high forces
        tool_diameter_mm: 6,
        tool_flutes: 4,
        spindle_rpm: 8000,
        feed_mm_min: 800,
        axial_depth_mm: 15, // Deep cut
        include_physics: true,
        imachining_level: 6
      };

      const result = await inventorCAMAIOrchestrationEngine.orchestrate(request);

      expect(result.optimizations).toBeDefined();
      expect(result.optimizations?.length).toBeGreaterThan(0);
    });

    it("should warn when power exceeds machine limit", async () => {
      const request: InventorAIRequest = {
        request_type: "optimize",
        material_iso: "S",
        tool_diameter_mm: 25,
        tool_flutes: 6,
        spindle_rpm: 3000,
        feed_mm_min: 500,
        axial_depth_mm: 20,
        radial_depth_mm: 20,
        machine_power_kW: 10, // Low power machine
        include_physics: true
      };

      const result = await inventorCAMAIOrchestrationEngine.orchestrate(request);

      // Should either warn or suggest optimization
      const hasWarning = result.warnings.some(w => w.toLowerCase().includes("power"));
      const hasOptimization = result.optimizations?.some(o => o.parameter === "step_down_mm");
      expect(hasWarning || hasOptimization).toBe(true);
    });

    it("should use all 8 reasoning modes", async () => {
      const modes = [
        "chain_of_thought", "tree_of_thought", "multi_path", "backtracking",
        "abductive", "deductive", "inductive", "analogical"
      ] as const;

      for (const mode of modes) {
        const request: InventorAIRequest = {
          request_type: "diagnose",
          reasoning_mode: mode
        };

        const result = await inventorCAMAIOrchestrationEngine.orchestrate(request);
        expect(result.reasoning_mode).toBe(mode);
      }
    });
  });

  describe("getReasoningModes", () => {
    it("should return all 8 reasoning modes", () => {
      const modes = inventorCAMAIOrchestrationEngine.getReasoningModes();

      expect(modes).toHaveLength(8);
      expect(modes).toContain("chain_of_thought");
      expect(modes).toContain("analogical");
    });
  });

  describe("getStats", () => {
    it("should return engine statistics", () => {
      const stats = inventorCAMAIOrchestrationEngine.getStats();

      expect(stats.reasoning_modes).toBe(8);
      expect(stats.tribal_tips).toBeGreaterThan(0);
      expect(stats.imachining_levels).toBe(8);
      expect(stats.signature_features).toContain("iMachining 2D/3D (SolidCAM technology)");
    });
  });
});

describe("InventorCAMAIOrchestrationEngine — dispatcher wiring (camDispatcher.ts)", () => {
  const INV_AI_ACTIONS = [
    "cam_inventor_ai_orchestrate",
    "cam_inventor_ai_get_reasoning_modes",
    "cam_inventor_ai_get_stats",
  ] as const;

  const ACTION_COUNT_EXPECTED = 3;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 3 cam_inventor_ai_* enum entries", async () => {
    const src = await readDispatcher();
    expect(INV_AI_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of INV_AI_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _invAIOrch singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_invAIOrch\s*:\s*any/);
  });

  it("registers an invAIOrch case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"invAIOrch"\s*:\s*return\s+_invAIOrch\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/InventorCAMAIOrchestrationEngine\.js"\s*\)\)\.inventorCAMAIOrchestrationEngine/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of INV_AI_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"invAIOrch\")", async () => {
    const src = await readDispatcher();
    for (const action of INV_AI_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("invAIOrch"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("orchestrate case awaits the async pipeline and pass-throughs params", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_inventor_ai_orchestrate"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("await engine.orchestrate(");
    expect(body).toContain("params as never");
    expect(body).toContain("response");
  });

  it("get_reasoning_modes case routes to getReasoningModes() and reports count", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_inventor_ai_get_reasoning_modes"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getReasoningModes()");
    expect(body).toContain("count");
  });

  it("get_stats case routes to getStats() and spreads the result", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_inventor_ai_get_stats"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getStats()");
    expect(body).toMatch(/\.\.\.stats/);
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of INV_AI_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("orchestrate is the only async-await case (modes + stats are synchronous)", async () => {
    const src = await readDispatcher();
    const orchRe = /case\s+"cam_inventor_ai_orchestrate"\s*:[\s\S]*?break;/;
    const orchBody = src.match(orchRe)?.[0] ?? "";
    expect(orchBody).toContain("await engine.orchestrate");

    const modesRe = /case\s+"cam_inventor_ai_get_reasoning_modes"\s*:[\s\S]*?break;/;
    const modesBody = modesRe.exec(src)?.[0] ?? "";
    expect(modesBody).not.toMatch(/await\s+engine\.getReasoningModes/);

    const statsRe = /case\s+"cam_inventor_ai_get_stats"\s*:[\s\S]*?break;/;
    const statsBody = statsRe.exec(src)?.[0] ?? "";
    expect(statsBody).not.toMatch(/await\s+engine\.getStats/);
  });
});
