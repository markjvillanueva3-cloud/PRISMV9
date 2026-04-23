/**
 * LatheLoRANeuralBridgeEngine Tests — LATHE-LORA-MS0 U-LLR33
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRANeuralBridgeEngine } from "../engines/LatheLoRANeuralBridgeEngine.js";

describe("LatheLoRANeuralBridgeEngine", () => {
  beforeEach(() => {
    latheLoRANeuralBridgeEngine.reset();
  });

  describe("configuration", () => {
    it("returns default config", () => {
      const cfg = latheLoRANeuralBridgeEngine.getConfig();
      expect(cfg.default_fusion_method).toBe("weighted_avg");
      expect(cfg.divergence_threshold).toBe(0.3);
      expect(cfg.prefer_physics_when_uncertain).toBe(true);
      expect(cfg.enable_fallback).toBe(true);
      expect(cfg.max_hooks_per_type).toBe(10);
    });

    it("merges partial config", () => {
      latheLoRANeuralBridgeEngine.setConfig({ divergence_threshold: 0.5 });
      const cfg = latheLoRANeuralBridgeEngine.getConfig();
      expect(cfg.divergence_threshold).toBe(0.5);
      expect(cfg.default_fusion_method).toBe("weighted_avg");
    });
  });

  describe("hook registration", () => {
    it("registers a hook and returns an id", () => {
      const hook = latheLoRANeuralBridgeEngine.registerHook({
        type: "pre_inference",
        name: "test-hook",
        priority: 10,
        handler_id: "handler-1",
        enabled: true,
      });
      expect(hook.id).toMatch(/^hook-/);
      expect(hook.type).toBe("pre_inference");
    });

    it("unregisters hook by id", () => {
      const hook = latheLoRANeuralBridgeEngine.registerHook({
        type: "post_inference",
        name: "gone",
        priority: 1,
        handler_id: "h",
        enabled: true,
      });
      expect(latheLoRANeuralBridgeEngine.unregisterHook(hook.id)).toBe(true);
      expect(latheLoRANeuralBridgeEngine.unregisterHook(hook.id)).toBe(false);
    });

    it("returns hooks by type sorted by priority", () => {
      latheLoRANeuralBridgeEngine.registerHook({
        type: "fusion", name: "low", priority: 1, handler_id: "h1", enabled: true,
      });
      latheLoRANeuralBridgeEngine.registerHook({
        type: "fusion", name: "high", priority: 10, handler_id: "h2", enabled: true,
      });
      const hooks = latheLoRANeuralBridgeEngine.getHooksByType("fusion");
      expect(hooks).toHaveLength(2);
      expect(hooks[0].name).toBe("high");
    });

    it("filters disabled hooks", () => {
      const h1 = latheLoRANeuralBridgeEngine.registerHook({
        type: "fusion", name: "a", priority: 5, handler_id: "h1", enabled: true,
      });
      latheLoRANeuralBridgeEngine.setHookEnabled(h1.id, false);
      expect(latheLoRANeuralBridgeEngine.getHooksByType("fusion")).toHaveLength(0);
    });

    it("throws when exceeding max hooks per type", () => {
      latheLoRANeuralBridgeEngine.setConfig({ max_hooks_per_type: 2 });
      latheLoRANeuralBridgeEngine.registerHook({
        type: "fallback", name: "a", priority: 1, handler_id: "h", enabled: true,
      });
      latheLoRANeuralBridgeEngine.registerHook({
        type: "fallback", name: "b", priority: 1, handler_id: "h", enabled: true,
      });
      expect(() => latheLoRANeuralBridgeEngine.registerHook({
        type: "fallback", name: "c", priority: 1, handler_id: "h", enabled: true,
      })).toThrow(/Max hooks/);
    });
  });

  describe("request creation", () => {
    it("creates a bridge request with id", () => {
      const req = latheLoRANeuralBridgeEngine.createRequest({
        direction: "bidirectional",
        context: { material: "steel", operation: "turning" },
      });
      expect(req.id).toMatch(/^bridge-/);
      expect(req.context.material).toBe("steel");
    });
  });

  describe("value fusion", () => {
    it("weighted_avg weights by confidence", () => {
      const r = latheLoRANeuralBridgeEngine.fuseValues(100, 200, 0.8, 0.2, "weighted_avg");
      expect(r.fusion_weight_llm).toBeCloseTo(0.8);
      expect(r.fusion_weight_physics).toBeCloseTo(0.2);
      expect(r.combined_value).toBeCloseTo(100 * 0.8 + 200 * 0.2);
    });

    it("physics_priority weights physics at 0.9", () => {
      const r = latheLoRANeuralBridgeEngine.fuseValues(100, 200, 1.0, 1.0, "physics_priority");
      expect(r.fusion_weight_physics).toBeCloseTo(0.9);
      expect(r.combined_value).toBeCloseTo(100 * 0.1 + 200 * 0.9);
    });

    it("llm_priority weights llm at 0.9", () => {
      const r = latheLoRANeuralBridgeEngine.fuseValues(100, 200, 1.0, 1.0, "llm_priority");
      expect(r.fusion_weight_llm).toBeCloseTo(0.9);
    });

    it("consensus uses avg when divergence is low", () => {
      const r = latheLoRANeuralBridgeEngine.fuseValues(100, 105, 0.5, 0.5, "consensus");
      expect(r.combined_value).toBeCloseTo(102.5);
    });

    it("consensus falls back to physics when divergence is high", () => {
      const r = latheLoRANeuralBridgeEngine.fuseValues(100, 200, 0.5, 0.5, "consensus");
      expect(r.combined_value).toBe(200);
      expect(r.fusion_weight_physics).toBe(1);
    });

    it("computes divergence as relative difference", () => {
      const r = latheLoRANeuralBridgeEngine.fuseValues(150, 100, 0.5, 0.5);
      expect(r.divergence).toBeCloseTo(0.5);
    });
  });

  describe("divergence detection", () => {
    it("flags high divergence above threshold", () => {
      const r = latheLoRANeuralBridgeEngine.fuseValues(200, 100, 0.5, 0.5);
      expect(latheLoRANeuralBridgeEngine.isHighDivergence(r)).toBe(true);
    });

    it("does not flag low divergence", () => {
      const r = latheLoRANeuralBridgeEngine.fuseValues(101, 100, 0.5, 0.5);
      expect(latheLoRANeuralBridgeEngine.isHighDivergence(r)).toBe(false);
    });
  });

  describe("fusion recommendations", () => {
    it("recommends physics_priority for roughing", () => {
      expect(latheLoRANeuralBridgeEngine.recommendFusion({ operation: "roughing" })).toBe("physics_priority");
    });

    it("recommends physics_priority for heavy_cut", () => {
      expect(latheLoRANeuralBridgeEngine.recommendFusion({ operation: "heavy_cut" })).toBe("physics_priority");
    });

    it("recommends consensus for steel", () => {
      expect(latheLoRANeuralBridgeEngine.recommendFusion({ material: "steel" })).toBe("consensus");
    });

    it("recommends weighted_avg for inconel", () => {
      expect(latheLoRANeuralBridgeEngine.recommendFusion({ material: "inconel" })).toBe("weighted_avg");
    });

    it("falls back to default for unknown context", () => {
      expect(latheLoRANeuralBridgeEngine.recommendFusion({})).toBe("weighted_avg");
    });
  });

  describe("history and stats", () => {
    it("tracks fusion history", () => {
      latheLoRANeuralBridgeEngine.fuseValues(1, 2, 0.5, 0.5);
      latheLoRANeuralBridgeEngine.fuseValues(3, 4, 0.5, 0.5);
      expect(latheLoRANeuralBridgeEngine.getFusionHistory()).toHaveLength(2);
    });

    it("limits history to supplied limit", () => {
      for (let i = 0; i < 5; i++) {
        latheLoRANeuralBridgeEngine.fuseValues(i, i + 1, 0.5, 0.5);
      }
      expect(latheLoRANeuralBridgeEngine.getFusionHistory(2)).toHaveLength(2);
    });

    it("computes divergence stats", () => {
      latheLoRANeuralBridgeEngine.fuseValues(200, 100, 0.5, 0.5);
      latheLoRANeuralBridgeEngine.fuseValues(101, 100, 0.5, 0.5);
      const stats = latheLoRANeuralBridgeEngine.getDivergenceStats();
      expect(stats.total).toBe(2);
      expect(stats.high_divergence_count).toBe(1);
      expect(stats.high_divergence_rate).toBeCloseTo(0.5);
      expect(stats.max_divergence).toBeGreaterThan(0);
    });

    it("returns zero stats with no history", () => {
      const stats = latheLoRANeuralBridgeEngine.getDivergenceStats();
      expect(stats.total).toBe(0);
      expect(stats.avg_divergence).toBe(0);
    });

    it("clears history", () => {
      latheLoRANeuralBridgeEngine.fuseValues(1, 2, 0.5, 0.5);
      latheLoRANeuralBridgeEngine.clearHistory();
      expect(latheLoRANeuralBridgeEngine.getFusionHistory()).toHaveLength(0);
    });
  });

  describe("summary", () => {
    it("produces summary text", () => {
      latheLoRANeuralBridgeEngine.registerHook({
        type: "fusion", name: "h", priority: 1, handler_id: "h1", enabled: true,
      });
      latheLoRANeuralBridgeEngine.fuseValues(1, 1, 0.5, 0.5);
      const s = latheLoRANeuralBridgeEngine.getSummary();
      expect(s).toContain("Neural Bridge Summary");
      expect(s).toContain("Hooks:");
      expect(s).toContain("Fusion Stats");
    });
  });
});
