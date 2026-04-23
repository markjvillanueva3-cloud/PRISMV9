/**
 * Tests for LatheLoRAModelSelectorEngine — LATHE-LORA-MS0 U-LLR43
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheLoRAModelSelectorEngine,
  type SelectionContext,
} from "../engines/LatheLoRAModelSelectorEngine.js";

describe("LatheLoRAModelSelectorEngine", () => {
  beforeEach(() => {
    latheLoRAModelSelectorEngine.reset();
  });

  const makeModel = (id: string, specs: string[], acc = 0.85, lat = 300, max = 4) =>
    latheLoRAModelSelectorEngine.registerModel({
      id,
      name: `Model-${id}`,
      specializations: specs as any,
      avg_accuracy: acc,
      avg_latency_ms: lat,
      max_concurrent: max,
      enabled: true,
    });

  describe("Configuration", () => {
    it("should have default config", () => {
      const config = latheLoRAModelSelectorEngine.getConfig();
      expect(config.accuracy_weight).toBe(0.5);
      expect(config.min_accuracy).toBe(0.6);
    });

    it("should update config", () => {
      latheLoRAModelSelectorEngine.setConfig({ min_accuracy: 0.7 });
      expect(latheLoRAModelSelectorEngine.getConfig().min_accuracy).toBe(0.7);
    });
  });

  describe("Model Registration", () => {
    it("should register a model", () => {
      const m = makeModel("m1", ["turning"]);
      expect(m.id).toBe("m1");
      expect(m.current_load).toBe(0);
      expect(m.success_count).toBe(0);
    });

    it("should retrieve registered model", () => {
      makeModel("m1", ["turning"]);
      expect(latheLoRAModelSelectorEngine.getModel("m1")).toBeDefined();
    });

    it("should unregister a model", () => {
      makeModel("m1", ["turning"]);
      expect(latheLoRAModelSelectorEngine.unregisterModel("m1")).toBe(true);
      expect(latheLoRAModelSelectorEngine.getModel("m1")).toBeUndefined();
    });

    it("should find models by specialization", () => {
      makeModel("m1", ["turning"]);
      makeModel("m2", ["threading"]);
      makeModel("m3", ["turning"]);
      const found = latheLoRAModelSelectorEngine.findBySpecialization("turning");
      expect(found.length).toBe(2);
    });
  });

  describe("Scoring", () => {
    it("should score higher for matching specialization", () => {
      const m1 = makeModel("m1", ["turning"]);
      const m2 = makeModel("m2", ["threading"]);
      const context: SelectionContext = { operation: "turning" };
      const s1 = latheLoRAModelSelectorEngine.scoreModel(m1, context);
      const s2 = latheLoRAModelSelectorEngine.scoreModel(m2, context);
      expect(s1).toBeGreaterThan(s2);
    });

    it("should return 0 for disabled model", () => {
      const m = makeModel("m1", ["turning"]);
      m.enabled = false;
      expect(latheLoRAModelSelectorEngine.scoreModel(m, { operation: "turning" })).toBe(0);
    });

    it("should return 0 when below min accuracy", () => {
      const m = makeModel("m1", ["turning"], 0.4);
      expect(latheLoRAModelSelectorEngine.scoreModel(m, { operation: "turning" })).toBe(0);
    });

    it("should return 0 when at capacity", () => {
      const m = makeModel("m1", ["turning"], 0.85, 300, 2);
      m.current_load = 2;
      expect(latheLoRAModelSelectorEngine.scoreModel(m, { operation: "turning" })).toBe(0);
    });

    it("should enforce hard required tags", () => {
      const m = makeModel("m1", ["turning"]);
      const score = latheLoRAModelSelectorEngine.scoreModel(m, {
        required_tags: ["threading"],
      });
      expect(score).toBe(0);
    });
  });

  describe("Selection", () => {
    it("should select best model", () => {
      makeModel("m1", ["turning"]);
      makeModel("m2", ["threading"]);
      const result = latheLoRAModelSelectorEngine.select({ operation: "turning" });
      expect(result).not.toBeNull();
      expect(result!.selected_model.id).toBe("m1");
    });

    it("should return null when no models", () => {
      expect(latheLoRAModelSelectorEngine.select({ operation: "turning" })).toBeNull();
    });

    it("should provide backup models", () => {
      makeModel("m1", ["turning"]);
      makeModel("m2", ["turning"]);
      makeModel("m3", ["turning"]);
      const result = latheLoRAModelSelectorEngine.select({ operation: "turning" });
      expect(result!.backup_models.length).toBeGreaterThan(0);
    });

    it("should increment load on selection", () => {
      const m = makeModel("m1", ["turning"]);
      latheLoRAModelSelectorEngine.select({ operation: "turning" });
      expect(m.current_load).toBe(1);
    });

    it("should include rationale", () => {
      makeModel("m1", ["turning"]);
      const result = latheLoRAModelSelectorEngine.select({ operation: "turning" });
      expect(result!.rationale).toContain("Model-m1");
    });
  });

  describe("Load Management", () => {
    it("should release model", () => {
      const m = makeModel("m1", ["turning"]);
      latheLoRAModelSelectorEngine.select({ operation: "turning" });
      expect(m.current_load).toBe(1);
      latheLoRAModelSelectorEngine.release("m1");
      expect(m.current_load).toBe(0);
    });

    it("should not go below zero", () => {
      const m = makeModel("m1", ["turning"]);
      latheLoRAModelSelectorEngine.release("m1");
      expect(m.current_load).toBe(0);
    });
  });

  describe("Outcome Recording", () => {
    it("should record success", () => {
      makeModel("m1", ["turning"]);
      latheLoRAModelSelectorEngine.recordOutcome("m1", true, 250);
      const m = latheLoRAModelSelectorEngine.getModel("m1");
      expect(m!.success_count).toBe(1);
    });

    it("should record failure", () => {
      makeModel("m1", ["turning"]);
      latheLoRAModelSelectorEngine.recordOutcome("m1", false);
      const m = latheLoRAModelSelectorEngine.getModel("m1");
      expect(m!.failure_count).toBe(1);
    });

    it("should update accuracy based on outcomes", () => {
      makeModel("m1", ["turning"], 0.5);
      latheLoRAModelSelectorEngine.recordOutcome("m1", true);
      latheLoRAModelSelectorEngine.recordOutcome("m1", true);
      latheLoRAModelSelectorEngine.recordOutcome("m1", false);
      const m = latheLoRAModelSelectorEngine.getModel("m1");
      expect(m!.avg_accuracy).toBeCloseTo(0.667, 2);
    });

    it("should update latency with EMA", () => {
      makeModel("m1", ["turning"], 0.85, 1000);
      latheLoRAModelSelectorEngine.recordOutcome("m1", true, 500);
      const m = latheLoRAModelSelectorEngine.getModel("m1");
      expect(m!.avg_latency_ms).toBeLessThan(1000);
      expect(m!.avg_latency_ms).toBeGreaterThan(500);
    });
  });

  describe("Stats", () => {
    it("should return stats", () => {
      makeModel("m1", ["turning"]);
      makeModel("m2", ["threading"]);
      const stats = latheLoRAModelSelectorEngine.getStats();
      expect(stats.total_models).toBe(2);
      expect(stats.enabled_models).toBe(2);
    });

    it("should return summary", () => {
      makeModel("m1", ["turning"]);
      expect(latheLoRAModelSelectorEngine.getSummary()).toContain("Models:");
    });
  });
});
