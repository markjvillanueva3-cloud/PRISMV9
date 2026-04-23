/**
 * LatheLoRAModelRegistryEngine Tests
 * LATHE-LORA-MS0 U-LLR19: Model version tracking and deployment
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAModelRegistryEngine, type RegisteredModel, type ModelStatus } from "../engines/LatheLoRAModelRegistryEngine.js";

describe("LatheLoRAModelRegistryEngine", () => {
  beforeEach(() => {
    latheLoRAModelRegistryEngine.reset();
  });

  describe("register", () => {
    it("registers new model", () => {
      const model = latheLoRAModelRegistryEngine.register({
        id: "lathe-lora-v1",
        name: "LatheLoRA v1",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready" as ModelStatus,
        type: "lora",
        tags: ["lathe", "okuma"],
        description: "First LatheLoRA model",
        artifacts: {},
      });

      expect(model.id).toBe("lathe-lora-v1");
      expect(model.created_at).toBeGreaterThan(0);
      expect(model.children_ids).toEqual([]);
    });

    it("links to parent model", () => {
      latheLoRAModelRegistryEngine.register({
        id: "base-model",
        name: "Base",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "base",
        tags: [],
        description: "Base model",
        artifacts: {},
      });

      latheLoRAModelRegistryEngine.register({
        id: "child-model",
        name: "Child",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "lora",
        parent_id: "base-model",
        tags: [],
        description: "Child model",
        artifacts: {},
      });

      const parent = latheLoRAModelRegistryEngine.get("base-model");
      expect(parent?.children_ids).toContain("child-model");
    });
  });

  describe("get", () => {
    it("retrieves registered model", () => {
      latheLoRAModelRegistryEngine.register({
        id: "test-model",
        name: "Test",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "lora",
        tags: [],
        description: "Test",
        artifacts: {},
      });

      const model = latheLoRAModelRegistryEngine.get("test-model");
      expect(model).toBeDefined();
      expect(model?.name).toBe("Test");
    });

    it("returns undefined for unknown model", () => {
      expect(latheLoRAModelRegistryEngine.get("nonexistent")).toBeUndefined();
    });
  });

  describe("update", () => {
    it("updates model fields", () => {
      latheLoRAModelRegistryEngine.register({
        id: "test-model",
        name: "Test",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "training",
        type: "lora",
        tags: [],
        description: "Test",
        artifacts: {},
      });

      const updated = latheLoRAModelRegistryEngine.update("test-model", {
        status: "ready",
        description: "Updated description",
      });

      expect(updated?.status).toBe("ready");
      expect(updated?.description).toBe("Updated description");
      expect(updated?.updated_at).toBeGreaterThanOrEqual(updated!.created_at);
    });

    it("prevents ID change", () => {
      latheLoRAModelRegistryEngine.register({
        id: "test-model",
        name: "Test",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "lora",
        tags: [],
        description: "Test",
        artifacts: {},
      });

      const updated = latheLoRAModelRegistryEngine.update("test-model", {
        id: "new-id",
      } as Partial<RegisteredModel>);

      expect(updated?.id).toBe("test-model");
    });

    it("returns undefined for unknown model", () => {
      expect(latheLoRAModelRegistryEngine.update("nonexistent", {})).toBeUndefined();
    });
  });

  describe("updateStatus", () => {
    it("updates model status", () => {
      latheLoRAModelRegistryEngine.register({
        id: "test-model",
        name: "Test",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "training",
        type: "lora",
        tags: [],
        description: "Test",
        artifacts: {},
      });

      const result = latheLoRAModelRegistryEngine.updateStatus("test-model", "ready");
      expect(result).toBe(true);

      const model = latheLoRAModelRegistryEngine.get("test-model");
      expect(model?.status).toBe("ready");
    });

    it("returns false for unknown model", () => {
      expect(latheLoRAModelRegistryEngine.updateStatus("nonexistent", "ready")).toBe(false);
    });
  });

  describe("addBenchmarks", () => {
    it("adds benchmark scores", () => {
      latheLoRAModelRegistryEngine.register({
        id: "test-model",
        name: "Test",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "evaluating",
        type: "lora",
        tags: [],
        description: "Test",
        artifacts: {},
      });

      const result = latheLoRAModelRegistryEngine.addBenchmarks("test-model", {
        physics_score: 85,
        safety_score: 90,
        reasoning_score: 80,
        benchmark_id: "bench-001",
      });

      expect(result).toBe(true);

      const model = latheLoRAModelRegistryEngine.get("test-model");
      expect(model?.benchmarks?.physics_score).toBe(85);
      expect(model?.benchmarks?.combined_score).toBeCloseTo(85, 1);
    });
  });

  describe("markDeployed / deactivateDeployment", () => {
    it("marks model as deployed", () => {
      latheLoRAModelRegistryEngine.register({
        id: "test-model",
        name: "Test",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "lora",
        tags: [],
        description: "Test",
        artifacts: {},
      });

      const result = latheLoRAModelRegistryEngine.markDeployed(
        "test-model",
        "http://localhost:8000",
        "vLLM"
      );

      expect(result).toBe(true);

      const model = latheLoRAModelRegistryEngine.get("test-model");
      expect(model?.status).toBe("deployed");
      expect(model?.deployment?.active).toBe(true);
      expect(model?.deployment?.endpoint).toBe("http://localhost:8000");
    });

    it("deactivates deployment", () => {
      latheLoRAModelRegistryEngine.register({
        id: "test-model",
        name: "Test",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "lora",
        tags: [],
        description: "Test",
        artifacts: {},
      });

      latheLoRAModelRegistryEngine.markDeployed("test-model", "http://localhost:8000", "vLLM");
      latheLoRAModelRegistryEngine.deactivateDeployment("test-model");

      const model = latheLoRAModelRegistryEngine.get("test-model");
      expect(model?.deployment?.active).toBe(false);
      expect(model?.status).toBe("ready");
    });
  });

  describe("query", () => {
    beforeEach(() => {
      latheLoRAModelRegistryEngine.register({
        id: "model-1",
        name: "Model 1",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "lora",
        tags: ["lathe", "roughing"],
        description: "First model",
        artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("model-1", {
        physics_score: 80, safety_score: 85, reasoning_score: 75, benchmark_id: "b1",
      });

      latheLoRAModelRegistryEngine.register({
        id: "model-2",
        name: "Model 2",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "deployed",
        type: "lora",
        tags: ["lathe", "finishing"],
        description: "Second model",
        artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("model-2", {
        physics_score: 90, safety_score: 95, reasoning_score: 85, benchmark_id: "b2",
      });

      latheLoRAModelRegistryEngine.register({
        id: "model-3",
        name: "Model 3",
        version: "1.0.0",
        base_model: "llama-7b",
        status: "training",
        type: "base",
        tags: ["mill"],
        description: "Third model",
        artifacts: {},
      });
    });

    it("filters by status", () => {
      const results = latheLoRAModelRegistryEngine.query({ status: ["ready"] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("model-1");
    });

    it("filters by type", () => {
      const results = latheLoRAModelRegistryEngine.query({ type: ["base"] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("model-3");
    });

    it("filters by base model", () => {
      const results = latheLoRAModelRegistryEngine.query({ base_model: "llama-7b" });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("model-3");
    });

    it("filters by minimum physics score", () => {
      const results = latheLoRAModelRegistryEngine.query({ min_physics_score: 85 });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("model-2");
    });

    it("filters by tags", () => {
      const results = latheLoRAModelRegistryEngine.query({ tags: ["finishing"] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("model-2");
    });

    it("sorts by combined score descending", () => {
      const results = latheLoRAModelRegistryEngine.query({
        sort_by: "combined_score",
        sort_order: "desc",
      });

      expect(results[0].id).toBe("model-2"); // Highest score
    });

    it("limits results", () => {
      const results = latheLoRAModelRegistryEngine.query({ limit: 1 });
      expect(results.length).toBe(1);
    });
  });

  describe("listAll", () => {
    it("returns all models", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.register({
        id: "m2", name: "M2", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });

      const all = latheLoRAModelRegistryEngine.listAll();
      expect(all.length).toBe(2);
    });
  });

  describe("getLineage", () => {
    it("returns ancestors and descendants", () => {
      latheLoRAModelRegistryEngine.register({
        id: "grandparent", name: "GP", version: "1.0", base_model: "base",
        status: "ready", type: "base", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.register({
        id: "parent", name: "P", version: "1.0", base_model: "base",
        status: "ready", type: "lora", parent_id: "grandparent",
        tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.register({
        id: "child", name: "C", version: "1.0", base_model: "base",
        status: "ready", type: "lora", parent_id: "parent",
        tags: [], description: "", artifacts: {},
      });

      const lineage = latheLoRAModelRegistryEngine.getLineage("parent");

      expect(lineage).toBeDefined();
      expect(lineage?.ancestors.length).toBe(1);
      expect(lineage?.ancestors[0].id).toBe("grandparent");
      expect(lineage?.descendants.length).toBe(1);
      expect(lineage?.descendants[0].id).toBe("child");
    });

    it("returns undefined for unknown model", () => {
      expect(latheLoRAModelRegistryEngine.getLineage("nonexistent")).toBeUndefined();
    });
  });

  describe("compareModels", () => {
    it("compares model metrics", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m1", {
        physics_score: 80, safety_score: 85, reasoning_score: 75, benchmark_id: "b1",
      });

      latheLoRAModelRegistryEngine.register({
        id: "m2", name: "M2", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m2", {
        physics_score: 90, safety_score: 80, reasoning_score: 85, benchmark_id: "b2",
      });

      const comparison = latheLoRAModelRegistryEngine.compareModels(["m1", "m2"]);

      expect(comparison.models).toEqual(["m1", "m2"]);
      expect(comparison.winner).toBe("m2"); // Higher combined
      expect(comparison.metrics["m1"].physics).toBe(80);
      expect(comparison.metrics["m2"].physics).toBe(90);
    });
  });

  describe("getBestForDeployment", () => {
    it("returns best ready model", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m1", {
        physics_score: 80, safety_score: 85, reasoning_score: 75, benchmark_id: "b1",
      });

      latheLoRAModelRegistryEngine.register({
        id: "m2", name: "M2", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m2", {
        physics_score: 90, safety_score: 90, reasoning_score: 85, benchmark_id: "b2",
      });

      const best = latheLoRAModelRegistryEngine.getBestForDeployment();
      expect(best?.id).toBe("m2");
    });

    it("respects minimum score constraints", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m1", {
        physics_score: 70, safety_score: 75, reasoning_score: 65, benchmark_id: "b1",
      });

      const best = latheLoRAModelRegistryEngine.getBestForDeployment({
        min_physics_score: 80,
      });

      expect(best).toBeUndefined();
    });
  });

  describe("getActiveDeployments", () => {
    it("returns active deployments", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.markDeployed("m1", "http://ep1", "vLLM");

      const deployments = latheLoRAModelRegistryEngine.getActiveDeployments();
      expect(deployments.length).toBe(1);
      expect(deployments[0].endpoint).toBe("http://ep1");
    });
  });

  describe("getStats", () => {
    it("returns registry statistics", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m1", {
        physics_score: 80, safety_score: 85, reasoning_score: 75, benchmark_id: "b1",
      });

      latheLoRAModelRegistryEngine.register({
        id: "m2", name: "M2", version: "1.0", base_model: "base",
        status: "deployed", type: "base", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("m2", {
        physics_score: 90, safety_score: 90, reasoning_score: 85, benchmark_id: "b2",
      });
      latheLoRAModelRegistryEngine.markDeployed("m2", "http://ep", "vLLM");

      const stats = latheLoRAModelRegistryEngine.getStats();

      expect(stats.total_models).toBe(2);
      expect(stats.by_status.ready).toBe(1);
      expect(stats.by_status.deployed).toBe(1);
      expect(stats.by_type.lora).toBe(1);
      expect(stats.by_type.base).toBe(1);
      expect(stats.active_deployments).toBe(1);
      expect(stats.avg_physics_score).toBe(85);
    });
  });

  describe("generateModelCard", () => {
    it("generates markdown model card", () => {
      latheLoRAModelRegistryEngine.register({
        id: "lathe-lora-v1",
        name: "LatheLoRA v1",
        version: "1.0.0",
        base_model: "mistral-7b",
        status: "ready",
        type: "lora",
        tags: ["lathe", "okuma"],
        description: "Fine-tuned for Okuma lathe programming",
        lora_config: {
          rank: 16,
          alpha: 32,
          target_modules: ["q_proj", "v_proj"],
          dropout: 0.05,
        },
        artifacts: {},
      });
      latheLoRAModelRegistryEngine.addBenchmarks("lathe-lora-v1", {
        physics_score: 85, safety_score: 90, reasoning_score: 80, benchmark_id: "b1",
      });

      const card = latheLoRAModelRegistryEngine.generateModelCard("lathe-lora-v1");

      expect(card).toContain("# LatheLoRA v1");
      expect(card).toContain("Version:** 1.0.0");
      expect(card).toContain("Rank: 16");
      expect(card).toContain("Physics | 85");
      expect(card).toContain("`lathe`");
    });

    it("returns not found for unknown model", () => {
      const card = latheLoRAModelRegistryEngine.generateModelCard("nonexistent");
      expect(card).toContain("not found");
    });
  });

  describe("delete", () => {
    it("deletes model", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });

      expect(latheLoRAModelRegistryEngine.delete("m1")).toBe(true);
      expect(latheLoRAModelRegistryEngine.get("m1")).toBeUndefined();
    });

    it("removes from parent children list", () => {
      latheLoRAModelRegistryEngine.register({
        id: "parent", name: "P", version: "1.0", base_model: "base",
        status: "ready", type: "base", tags: [], description: "", artifacts: {},
      });
      latheLoRAModelRegistryEngine.register({
        id: "child", name: "C", version: "1.0", base_model: "base",
        status: "ready", type: "lora", parent_id: "parent",
        tags: [], description: "", artifacts: {},
      });

      latheLoRAModelRegistryEngine.delete("child");

      const parent = latheLoRAModelRegistryEngine.get("parent");
      expect(parent?.children_ids).not.toContain("child");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      latheLoRAModelRegistryEngine.register({
        id: "m1", name: "M1", version: "1.0", base_model: "base",
        status: "ready", type: "lora", tags: [], description: "", artifacts: {},
      });

      latheLoRAModelRegistryEngine.reset();

      expect(latheLoRAModelRegistryEngine.listAll()).toEqual([]);
    });
  });
});
