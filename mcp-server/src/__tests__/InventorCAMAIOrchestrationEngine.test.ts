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
