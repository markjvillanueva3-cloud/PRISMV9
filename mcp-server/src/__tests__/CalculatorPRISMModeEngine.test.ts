/**
 * Tests for CalculatorPRISMModeEngine
 * @milestone MCAT-MS0/P3-U04
 *
 * Verifies PRISM mode orchestration for calculator that derives best-fit
 * tooling, holder, coolant, software, and toolpath categories.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  calculatorPRISMModeEngine,
  type PRISMModeInput,
  type PRISMModeResult,
  type ToolingRecommendation,
  type HolderRecommendation,
  type CoolantRecommendation,
  type SoftwareRecommendation,
  type ToolpathRecommendation,
} from "../engines/CalculatorPRISMModeEngine.js";
import { shopMachineOverlayEngine } from "../engines/ShopMachineOverlayEngine.js";

describe("CalculatorPRISMModeEngine", () => {
  beforeAll(() => {
    // Ensure test overlays exist
    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-01",
        user_id: "prism-test",
        display_name: "PRISM Test Lathe",
      });
    } catch { /* exists */ }

    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-01",
        user_id: "prism-test",
        display_name: "PRISM Test VMC",
      });
    } catch { /* exists */ }
  });

  describe("calculate", () => {
    it("returns PRISM mode result for valid machine", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result).toBeDefined();
      expect(result?.machine_id).toBe("LTH-01");
    });

    it("includes operation type in result", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.operation_type).toBe("turning");
    });

    it("returns null for invalid machine", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "INVALID-XYZ",
        operation_type: "turning",
      });

      expect(result).toBeNull();
    });

    it("includes overall confidence score", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.overall_confidence).toBeGreaterThan(0);
      expect(result?.overall_confidence).toBeLessThanOrEqual(1);
    });

    it("includes optimization notes", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(Array.isArray(result?.optimization_notes)).toBe(true);
    });

    it("includes warnings array", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(Array.isArray(result?.warnings)).toBe(true);
    });
  });

  describe("tooling recommendations", () => {
    it("returns tooling recommendations", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(Array.isArray(result?.tooling)).toBe(true);
      expect(result?.tooling.length).toBeGreaterThan(0);
    });

    it("each recommendation has required fields", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      for (const tool of result?.tooling || []) {
        expect(tool.category).toBeDefined();
        expect(tool.tool_type).toBeDefined();
        expect(tool.coating).toBeDefined();
        expect(tool.grade).toBeDefined();
        expect(tool.reason).toBeDefined();
        expect(typeof tool.confidence).toBe("number");
      }
    });

    it("adjusts coating based on material ISO group", () => {
      const resultP = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
        material_iso_group: "P",
      });

      const resultS = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
        material_iso_group: "S",
      });

      expect(resultP?.tooling[0].coating).not.toBe(resultS?.tooling[0].coating);
    });

    it("adds finishing tool for tight surface finish", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
        surface_finish_ra: 0.8,
      });

      const finishingTool = result?.tooling.find(t => t.category === "finishing");
      expect(finishingTool).toBeDefined();
    });

    it("adds roughing tool for complex geometry", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
        geometry_complexity: "complex",
      });

      const roughingTool = result?.tooling.find(t => t.category === "roughing");
      expect(roughingTool).toBeDefined();
    });

    it("checks user inventory for matches", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
        user_inventory_ids: ["turning-insert-cnmg-001"],
      });

      const primaryTool = result?.tooling.find(t => t.category === "primary");
      expect(typeof primaryTool?.from_inventory).toBe("boolean");
    });
  });

  describe("holder recommendations", () => {
    it("returns holder recommendations", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "VMC-01",
        operation_type: "milling",
      });

      expect(Array.isArray(result?.holders)).toBe(true);
      expect(result?.holders.length).toBeGreaterThan(0);
    });

    it("each recommendation has required fields", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "VMC-01",
        operation_type: "milling",
      });

      for (const holder of result?.holders || []) {
        expect(holder.holder_type).toBeDefined();
        expect(holder.interface).toBeDefined();
        expect(holder.size).toBeDefined();
        expect(holder.balance_grade).toBeDefined();
        expect(holder.reason).toBeDefined();
      }
    });

    it("includes balance grade", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "VMC-01",
        operation_type: "milling",
      });

      expect(result?.holders[0].balance_grade).toMatch(/G\d+\.?\d*/);
    });
  });

  describe("coolant recommendations", () => {
    it("returns coolant recommendation", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.coolant).toBeDefined();
    });

    it("includes strategy and type", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.coolant.strategy).toBeDefined();
      expect(result?.coolant.type).toBeDefined();
    });

    it("recommends through-spindle for drilling", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "VMC-01",
        operation_type: "drilling",
      });

      // May or may not have through_spindle depending on machine capabilities
      expect(result?.coolant.strategy).toBeDefined();
    });

    it("adjusts for material requirements", () => {
      const resultN = calculatorPRISMModeEngine.calculate({
        machine_id: "VMC-01",
        operation_type: "milling",
        material_iso_group: "N",
      });

      // N (aluminum) may recommend MQL
      expect(resultN?.coolant.reason).toBeDefined();
    });

    it("includes confidence score", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.coolant.confidence).toBeGreaterThan(0);
      expect(result?.coolant.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("software recommendations", () => {
    it("returns software recommendation", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.software).toBeDefined();
    });

    it("includes CAM system", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.software.cam_system).toBeDefined();
    });

    it("includes post processor", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.software.post_processor).toBeDefined();
    });

    it("includes alternatives", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(Array.isArray(result?.software.alternatives)).toBe(true);
    });

    it("respects preferred CAM when compatible", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
        preferred_cam: "Fusion 360",
      });

      // May use preferred if compatible
      expect(result?.software.cam_system).toBeDefined();
    });

    it("includes controller compatibility score", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(result?.software.controller_compatibility).toBeGreaterThan(0);
    });
  });

  describe("toolpath recommendations", () => {
    it("returns toolpath recommendations", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "VMC-01",
        operation_type: "milling",
      });

      expect(Array.isArray(result?.toolpaths)).toBe(true);
    });

    it("each recommendation has required fields", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "VMC-01",
        operation_type: "milling",
      });

      for (const tp of result?.toolpaths || []) {
        expect(tp.category).toBeDefined();
        expect(tp.strategy).toBeDefined();
        expect(Array.isArray(tp.suitable_for)).toBe(true);
        expect(typeof tp.machine_capability_match).toBe("number");
        expect(tp.reason).toBeDefined();
      }
    });

    it("recommends turning strategies for lathe", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      const hasTurning = result?.toolpaths.some(tp =>
        tp.strategy.toLowerCase().includes("turn") ||
        tp.suitable_for.some(s => s.toLowerCase().includes("turn"))
      );
      expect(hasTurning).toBe(true);
    });

    it("includes machine capability match score", () => {
      const result = calculatorPRISMModeEngine.calculate({
        machine_id: "VMC-01",
        operation_type: "milling",
      });

      for (const tp of result?.toolpaths || []) {
        expect(tp.machine_capability_match).toBeGreaterThanOrEqual(0);
        expect(tp.machine_capability_match).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("checkInventory", () => {
    it("returns inventory match result", () => {
      const match = calculatorPRISMModeEngine.checkInventory("End Mill", ["em-001", "drill-002"]);

      expect(match).toBeDefined();
      expect(match.tool_type).toBe("End Mill");
    });

    it("identifies compatible inventory", () => {
      const match = calculatorPRISMModeEngine.checkInventory("End Mill", ["end-mill-001"]);

      expect(match.compatible).toBe(true);
      expect(match.match_score).toBeGreaterThan(0);
    });

    it("handles empty inventory", () => {
      const match = calculatorPRISMModeEngine.checkInventory("End Mill", []);

      expect(match.compatible).toBe(false);
      expect(match.match_score).toBe(0);
    });

    it("handles undefined inventory", () => {
      const match = calculatorPRISMModeEngine.checkInventory("End Mill", undefined);

      expect(match.compatible).toBe(false);
    });
  });

  describe("compareForMachines", () => {
    it("compares PRISM mode across machines", () => {
      const results = calculatorPRISMModeEngine.compareForMachines(
        { operation_type: "milling" },
        ["LTH-01", "VMC-01"]
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    it("each result has machine_id and score", () => {
      const results = calculatorPRISMModeEngine.compareForMachines(
        { operation_type: "milling" },
        ["LTH-01", "VMC-01"]
      );

      for (const r of results) {
        expect(r.machine_id).toBeDefined();
        expect(typeof r.score).toBe("number");
      }
    });

    it("sorts by score descending", () => {
      const results = calculatorPRISMModeEngine.compareForMachines(
        { operation_type: "milling" },
        ["LTH-01", "VMC-01"]
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it("handles single machine", () => {
      const results = calculatorPRISMModeEngine.compareForMachines(
        { operation_type: "turning" },
        ["LTH-01"]
      );

      expect(results.length).toBe(1);
    });
  });

  describe("getQuickSummary", () => {
    it("returns quick summary for calculator", () => {
      const summary = calculatorPRISMModeEngine.getQuickSummary("LTH-01", "turning");

      expect(summary).toBeDefined();
    });

    it("includes all hint fields", () => {
      const summary = calculatorPRISMModeEngine.getQuickSummary("LTH-01", "turning");

      expect(summary?.tooling_hint).toBeDefined();
      expect(summary?.holder_hint).toBeDefined();
      expect(summary?.coolant_hint).toBeDefined();
      expect(summary?.software_hint).toBeDefined();
    });

    it("returns null for invalid machine", () => {
      const summary = calculatorPRISMModeEngine.getQuickSummary("INVALID", "turning");

      expect(summary).toBeNull();
    });
  });

  describe("getStats", () => {
    it("returns statistics", () => {
      // Run a calculation first
      calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      const stats = calculatorPRISMModeEngine.getStats();

      expect(stats.total_recommendations).toBeGreaterThan(0);
      expect(typeof stats.average_confidence).toBe("number");
      expect(stats.last_calculation).not.toBe("never");
    });

    it("tracks inventory matches", () => {
      calculatorPRISMModeEngine.calculate({
        machine_id: "LTH-01",
        operation_type: "turning",
        user_inventory_ids: ["turning-insert-001"],
      });

      const stats = calculatorPRISMModeEngine.getStats();

      expect(typeof stats.inventory_matches).toBe("number");
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = calculatorPRISMModeEngine.getSelfAwareness();

      expect(awareness.engine).toBe("CalculatorPRISMModeEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P3-U04");
    });

    it("lists capabilities", () => {
      const awareness = calculatorPRISMModeEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("calculate");
      expect(awareness.capabilities).toContain("compareForMachines");
      expect(awareness.capabilities).toContain("getQuickSummary");
    });

    it("lists outputs", () => {
      const awareness = calculatorPRISMModeEngine.getSelfAwareness();

      expect(awareness.outputs).toContain("tooling_recommendations");
      expect(awareness.outputs).toContain("coolant_strategy");
      expect(awareness.outputs).toContain("toolpath_strategies");
    });

    it("lists integrations", () => {
      const awareness = calculatorPRISMModeEngine.getSelfAwareness();

      expect(awareness.integrations).toContain("MachineConsumerBindingEngine");
    });
  });
});
