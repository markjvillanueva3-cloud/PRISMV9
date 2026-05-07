/**
 * LatheLoRAMergeStrategyEngine Tests
 * LATHE-LORA-MS0 U-LLR17: LoRA adapter merging strategies
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAMergeStrategyEngine, type LoRAAdapter, type MergeConfig } from "../engines/LatheLoRAMergeStrategyEngine.js";

describe("LatheLoRAMergeStrategyEngine", () => {
  beforeEach(() => {
    latheLoRAMergeStrategyEngine.reset();
  });

  describe("registerAdapter / getAdapter", () => {
    it("registers and retrieves adapter", () => {
      const adapter: LoRAAdapter = {
        id: "adapter-001",
        name: "Steel Roughing Adapter",
        base_model: "mistral-7b",
        rank: 16,
        alpha: 32,
        target_modules: ["q_proj", "v_proj"],
        training_steps: 1000,
        loss: 0.5,
      };

      latheLoRAMergeStrategyEngine.registerAdapter(adapter);
      const retrieved = latheLoRAMergeStrategyEngine.getAdapter("adapter-001");

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Steel Roughing Adapter");
      expect(retrieved?.rank).toBe(16);
    });

    it("returns undefined for unknown adapter", () => {
      expect(latheLoRAMergeStrategyEngine.getAdapter("nonexistent")).toBeUndefined();
    });
  });

  describe("listAdapters", () => {
    it("returns all registered adapters", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "base", rank: 8, alpha: 16,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "base", rank: 16, alpha: 32,
        target_modules: ["q", "v"], training_steps: 200, loss: 0.2,
      });

      const list = latheLoRAMergeStrategyEngine.listAdapters();
      expect(list.length).toBe(2);
      expect(list.map(a => a.id)).toContain("a1");
      expect(list.map(a => a.id)).toContain("a2");
    });
  });

  describe("getStrategies", () => {
    it("returns all available merge strategies", () => {
      const strategies = latheLoRAMergeStrategyEngine.getStrategies();
      expect(strategies.linear).toBeDefined();
      expect(strategies.ties).toBeDefined();
      expect(strategies.dare).toBeDefined();
      expect(strategies.task_arithmetic).toBeDefined();
      expect(strategies.concatenate).toBeDefined();
    });

    it("includes descriptions for each strategy", () => {
      const strategies = latheLoRAMergeStrategyEngine.getStrategies();
      expect(strategies.linear.description).toContain("Weighted average");
      expect(strategies.ties.description).toContain("Trim");
    });
  });

  describe("recommendStrategy", () => {
    it("recommends linear for two compatible adapters", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q", "v"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q", "v"], training_steps: 200, loss: 0.2,
      });

      const rec = latheLoRAMergeStrategyEngine.recommendStrategy(["a1", "a2"]);
      expect(rec.strategy).toBe("linear");
      expect(rec.confidence).toBeGreaterThan(0.7);
    });

    it("recommends ties for multiple adapters", () => {
      for (let i = 1; i <= 5; i++) {
        latheLoRAMergeStrategyEngine.registerAdapter({
          id: `a${i}`, name: `A${i}`, base_model: "mistral-7b", rank: 16, alpha: 32,
          target_modules: ["q", "v"], training_steps: 100 * i, loss: 0.3,
        });
      }

      const rec = latheLoRAMergeStrategyEngine.recommendStrategy(["a1", "a2", "a3", "a4"]);
      expect(rec.strategy).toBe("ties");
    });

    it("recommends concatenate for incompatible ranks", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 8, alpha: 16,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "llama-7b", rank: 32, alpha: 64,
        target_modules: ["v"], training_steps: 200, loss: 0.2,
      });

      const rec = latheLoRAMergeStrategyEngine.recommendStrategy(["a1", "a2"]);
      expect(rec.strategy).toBe("concatenate");
    });

    it("defaults to linear when no adapters found", () => {
      const rec = latheLoRAMergeStrategyEngine.recommendStrategy(["nonexistent"]);
      expect(rec.strategy).toBe("linear");
      expect(rec.confidence).toBe(0.5);
    });
  });

  describe("checkCompatibility", () => {
    it("returns compatible for matching adapters", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q_proj", "v_proj"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q_proj", "v_proj"], training_steps: 200, loss: 0.2,
      });

      const check = latheLoRAMergeStrategyEngine.checkCompatibility(["a1", "a2"]);
      expect(check.compatible).toBe(true);
      expect(check.issues.length).toBe(0);
    });

    it("flags incompatible base models", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "llama-7b", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });

      const check = latheLoRAMergeStrategyEngine.checkCompatibility(["a1", "a2"]);
      expect(check.compatible).toBe(false);
      expect(check.issues.some(i => i.includes("base model"))).toBe(true);
    });

    it("warns about different ranks", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 8, alpha: 16,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });

      const check = latheLoRAMergeStrategyEngine.checkCompatibility(["a1", "a2"]);
      expect(check.warnings.some(w => w.includes("rank"))).toBe(true);
    });

    it("requires at least 2 adapters", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });

      const check = latheLoRAMergeStrategyEngine.checkCompatibility(["a1"]);
      expect(check.compatible).toBe(false);
      expect(check.issues.some(i => i.includes("at least 2"))).toBe(true);
    });
  });

  describe("prepareMerge", () => {
    it("prepares valid merge config", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q", "v"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q", "v"], training_steps: 200, loss: 0.2,
      });

      const prep = latheLoRAMergeStrategyEngine.prepareMerge(["a1", "a2"], {
        strategy: "linear",
        output_name: "merged-test",
      });

      expect(prep.valid).toBe(true);
      expect(prep.config.strategy).toBe("linear");
      expect(prep.config.output_name).toBe("merged-test");
    });

    it("normalizes weights", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });

      const prep = latheLoRAMergeStrategyEngine.prepareMerge(["a1", "a2"], {
        weights: [2, 2],
      });

      expect(prep.config.weights).toEqual([0.5, 0.5]);
    });
  });

  describe("executeMerge", () => {
    it("executes linear merge successfully", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q_proj", "v_proj"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q_proj", "v_proj"], training_steps: 200, loss: 0.2,
      });

      const config: MergeConfig = {
        strategy: "linear",
        output_name: "merged-linear",
        weights: [0.5, 0.5],
        scale_factor: 1.0,
      };

      const result = latheLoRAMergeStrategyEngine.executeMerge(["a1", "a2"], config);

      expect(result.success).toBe(true);
      expect(result.output_adapter).toBe("merged-linear");
      expect(result.strategy_used).toBe("linear");
      expect(result.effective_rank).toBe(16);
    });

    it("concatenate merge increases rank", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral-7b", rank: 8, alpha: 16,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });

      const config: MergeConfig = {
        strategy: "concatenate",
        output_name: "merged-concat",
      };

      const result = latheLoRAMergeStrategyEngine.executeMerge(["a1", "a2"], config);
      expect(result.effective_rank).toBe(24); // 8 + 16
    });

    it("registers merged adapter", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });

      latheLoRAMergeStrategyEngine.executeMerge(["a1", "a2"], {
        strategy: "linear",
        output_name: "merged-result",
      });

      const merged = latheLoRAMergeStrategyEngine.getAdapter("merged-result");
      expect(merged).toBeDefined();
      expect(merged?.name).toContain("Merged");
    });

    it("warns about high DARE density", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });

      const result = latheLoRAMergeStrategyEngine.executeMerge(["a1", "a2"], {
        strategy: "dare",
        output_name: "dare-merge",
        density: 0.9,
      });

      expect(result.warnings.some(w => w.includes("DARE density"))).toBe(true);
    });
  });

  describe("getMergeHistory", () => {
    it("tracks merge history", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });

      latheLoRAMergeStrategyEngine.executeMerge(["a1", "a2"], {
        strategy: "linear",
        output_name: "merge1",
      });

      const history = latheLoRAMergeStrategyEngine.getMergeHistory();
      expect(history.length).toBe(1);
      expect(history[0].output_adapter).toBe("merge1");
    });
  });

  describe("calculateOptimalWeights", () => {
    it("weights by physics score", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
        metrics: { physics_score: 80, safety_score: 70, reasoning_score: 60 },
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
        metrics: { physics_score: 40, safety_score: 70, reasoning_score: 60 },
      });

      const weights = latheLoRAMergeStrategyEngine.calculateOptimalWeights(["a1", "a2"], "physics");
      expect(weights[0]).toBeGreaterThan(weights[1]); // a1 has higher physics
    });

    it("returns equal weights when no metrics", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a2", name: "A2", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 200, loss: 0.2,
      });

      const weights = latheLoRAMergeStrategyEngine.calculateOptimalWeights(["a1", "a2"], "balanced");
      expect(weights).toEqual([0.5, 0.5]);
    });
  });

  describe("generateMergeCommand", () => {
    it("generates mergekit YAML config", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "adapter1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });

      const cmd = latheLoRAMergeStrategyEngine.generateMergeCommand(
        ["adapter1"],
        { strategy: "linear", output_name: "output" },
        "mergekit"
      );

      expect(cmd).toContain("mergekit");
      expect(cmd).toContain("merge_config.yaml");
    });

    it("generates PEFT merge code", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "adapter1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });

      const cmd = latheLoRAMergeStrategyEngine.generateMergeCommand(
        ["adapter1"],
        { strategy: "linear", output_name: "output" },
        "peft"
      );

      expect(cmd).toContain("from peft import PeftModel");
      expect(cmd).toContain("merge_and_unload");
    });
  });

  describe("getAdapterSummary", () => {
    it("formats adapter summary", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "adapter1", name: "Steel Adapter", base_model: "mistral-7b", rank: 16, alpha: 32,
        target_modules: ["q_proj", "v_proj"], training_steps: 1000, loss: 0.25,
        metrics: { physics_score: 85, safety_score: 90, reasoning_score: 80 },
      });

      const summary = latheLoRAMergeStrategyEngine.getAdapterSummary("adapter1");
      expect(summary).toContain("Steel Adapter");
      expect(summary).toContain("Rank: 16");
      expect(summary).toContain("Physics=85");
    });

    it("handles unknown adapter", () => {
      const summary = latheLoRAMergeStrategyEngine.getAdapterSummary("unknown");
      expect(summary).toContain("not found");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      latheLoRAMergeStrategyEngine.registerAdapter({
        id: "a1", name: "A1", base_model: "mistral", rank: 16, alpha: 32,
        target_modules: ["q"], training_steps: 100, loss: 0.3,
      });

      latheLoRAMergeStrategyEngine.reset();

      expect(latheLoRAMergeStrategyEngine.listAdapters()).toEqual([]);
      expect(latheLoRAMergeStrategyEngine.getMergeHistory()).toEqual([]);
    });
  });
});
