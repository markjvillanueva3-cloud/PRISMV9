/**
 * LoRA Composition Engine Tests — U-LEARN-05
 * ============================================
 *
 * Tests for:
 * - LoRAMoEGatingEngine: expert registration, top-K gating, softmax routing
 * - DoRAAdapterEngine: magnitude/direction decomposition, forward pass
 * - AdaLoRARankAllocatorEngine: SVD-based rank allocation
 * - OrthogonalLoRAEngine: orthogonality constraints, Gram-Schmidt
 * - LoRACompositionEngine: orchestrated composition
 *
 * @module __tests__/engines/loraCompositionU-LEARN-05.test
 * @milestone PSAU P2.5-LEARN U-LEARN-05
 */

import { describe, it, expect, beforeEach } from "vitest";
import { loraMoEGatingEngine } from "../../engines/LoRAMoEGatingEngine.js";
import { doRAAdapterEngine } from "../../engines/DoRAAdapterEngine.js";
import { adaLoRARankAllocatorEngine } from "../../engines/AdaLoRARankAllocatorEngine.js";
import { orthogonalLoRAEngine } from "../../engines/OrthogonalLoRAEngine.js";
import { loraCompositionEngine } from "../../engines/LoRACompositionEngine.js";
import type { Expert } from "../../schemas/loraCompositionSchema.js";

describe("LoRAMoEGatingEngine", () => {
  beforeEach(() => {
    loraMoEGatingEngine.clear();
  });

  const createExpert = (id: string, domain: string, accuracy: number): Expert => ({
    adapter_id: id,
    domain: domain as Expert["domain"],
    quality_score: {
      accuracy,
      stability: 0.8,
      coverage: 0.7,
      confidence: 0.9,
      freshness: 0.6,
    },
    rank: 8,
    alpha: 16,
  });

  it("should register single expert", () => {
    const expert = createExpert("adapter-1", "cutting_force", 0.95);
    loraMoEGatingEngine.registerExpert(expert);

    const retrieved = loraMoEGatingEngine.getExpert("adapter-1");
    expect(retrieved).toBeDefined();
    expect(retrieved?.adapter_id).toBe("adapter-1");
  });

  it("should register multiple experts", () => {
    const experts = [
      createExpert("adapter-1", "cutting_force", 0.95),
      createExpert("adapter-2", "cutting_force", 0.85),
      createExpert("adapter-3", "tool_wear", 0.90),
    ];

    const result = loraMoEGatingEngine.registerExperts(experts);
    expect(result.registered).toBe(3);

    const stats = loraMoEGatingEngine.getStats();
    expect(stats.total_experts).toBe(3);
  });

  it("should list experts by domain", () => {
    loraMoEGatingEngine.registerExperts([
      createExpert("adapter-1", "cutting_force", 0.95),
      createExpert("adapter-2", "cutting_force", 0.85),
      createExpert("adapter-3", "tool_wear", 0.90),
    ]);

    const cuttingForceExperts = loraMoEGatingEngine.listExperts("cutting_force");
    expect(cuttingForceExperts.length).toBe(2);

    const toolWearExperts = loraMoEGatingEngine.listExperts("tool_wear");
    expect(toolWearExperts.length).toBe(1);
  });

  it("should gate to top-K experts", () => {
    loraMoEGatingEngine.registerExperts([
      createExpert("adapter-1", "cutting_force", 0.95),
      createExpert("adapter-2", "cutting_force", 0.85),
      createExpert("adapter-3", "cutting_force", 0.75),
      createExpert("adapter-4", "cutting_force", 0.65),
    ]);

    const result = loraMoEGatingEngine.gate({
      domain: "cutting_force",
      top_k: 2,
      temperature: 1.0,
    });

    expect(result.selected_experts.length).toBe(2);
    expect(result.total_experts).toBe(4);
    expect(result.gating_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("should apply softmax weights that sum to 1", () => {
    loraMoEGatingEngine.registerExperts([
      createExpert("adapter-1", "cutting_force", 0.95),
      createExpert("adapter-2", "cutting_force", 0.85),
      createExpert("adapter-3", "cutting_force", 0.75),
    ]);

    const result = loraMoEGatingEngine.gate({
      domain: "cutting_force",
      top_k: 3,
      temperature: 1.0,
    });

    const weightSum = result.selected_experts.reduce((sum, e) => sum + e.weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 5);
  });

  it("should rank higher accuracy experts first", () => {
    loraMoEGatingEngine.registerExperts([
      createExpert("low-acc", "cutting_force", 0.50),
      createExpert("high-acc", "cutting_force", 0.99),
      createExpert("mid-acc", "cutting_force", 0.75),
    ]);

    const result = loraMoEGatingEngine.gate({
      domain: "cutting_force",
      top_k: 3,
    });

    expect(result.selected_experts[0].adapter_id).toBe("high-acc");
  });

  it("should boost domain-matching experts", () => {
    loraMoEGatingEngine.registerExperts([
      createExpert("wrong-domain", "tool_wear", 0.95),
      createExpert("right-domain", "cutting_force", 0.80),
    ]);

    const result = loraMoEGatingEngine.gate({
      domain: "cutting_force",
      top_k: 2,
    });

    expect(result.selected_experts[0].adapter_id).toBe("right-domain");
  });

  it("should batch gate multiple inputs", () => {
    loraMoEGatingEngine.registerExperts([
      createExpert("adapter-1", "cutting_force", 0.95),
      createExpert("adapter-2", "tool_wear", 0.90),
    ]);

    const results = loraMoEGatingEngine.batchGate([
      { domain: "cutting_force", top_k: 1 },
      { domain: "tool_wear", top_k: 1 },
    ]);

    expect(results.length).toBe(2);
    expect(results[0].input_index).toBe(0);
    expect(results[1].input_index).toBe(1);
  });

  it("should unregister expert", () => {
    loraMoEGatingEngine.registerExpert(createExpert("to-remove", "cutting_force", 0.9));
    expect(loraMoEGatingEngine.getExpert("to-remove")).toBeDefined();

    const removed = loraMoEGatingEngine.unregisterExpert("to-remove");
    expect(removed).toBe(true);
    expect(loraMoEGatingEngine.getExpert("to-remove")).toBeUndefined();
  });
});

describe("DoRAAdapterEngine", () => {
  beforeEach(() => {
    doRAAdapterEngine.clear();
  });

  it("should create DoRA adapter", () => {
    const result = doRAAdapterEngine.createAdapter({
      adapter_id: "dora-1",
      rank: 8,
      alpha: 16,
      magnitude_lr_scale: 1.0,
      direction_lr_scale: 1.0,
      normalize_direction: true,
    });

    expect(result.adapter_id).toBe("dora-1");
    expect(result.rank).toBe(8);
  });

  it("should initialize weights with correct dimensions", () => {
    doRAAdapterEngine.createAdapter({
      adapter_id: "dora-1",
      rank: 4,
      alpha: 8,
    });

    const weights = doRAAdapterEngine.initializeWeights("dora-1", 16, 32, 0.01);

    expect(weights.adapter_id).toBe("dora-1");
    expect(weights.magnitude.length).toBe(32);
    expect(weights.direction_A.length).toBe(4);
    expect(weights.direction_A[0].length).toBe(16);
    expect(weights.direction_B.length).toBe(32);
    expect(weights.direction_B[0].length).toBe(4);
  });

  it("should compute delta W", () => {
    doRAAdapterEngine.createAdapter({
      adapter_id: "dora-1",
      rank: 2,
      alpha: 1.0,
    });

    doRAAdapterEngine.initializeWeights("dora-1", 4, 3, 0.1);

    const deltaW = doRAAdapterEngine.computeDeltaW("dora-1");
    expect(deltaW).not.toBeNull();
    expect(deltaW!.length).toBe(3);
    expect(deltaW![0].length).toBe(4);
  });

  it("should perform forward pass", () => {
    doRAAdapterEngine.createAdapter({
      adapter_id: "dora-1",
      rank: 2,
      alpha: 1.0,
    });

    doRAAdapterEngine.initializeWeights("dora-1", 4, 3, 0.1);

    const input = [1.0, 0.5, -0.5, 0.0];
    const output = doRAAdapterEngine.forward("dora-1", input);

    expect(output).not.toBeNull();
    expect(output!.length).toBe(3);
  });

  it("should batch forward", () => {
    doRAAdapterEngine.createAdapter({
      adapter_id: "dora-1",
      rank: 2,
      alpha: 1.0,
    });

    doRAAdapterEngine.initializeWeights("dora-1", 4, 3, 0.1);

    const inputs = [
      [1.0, 0.5, -0.5, 0.0],
      [0.0, 1.0, 0.0, -1.0],
    ];
    const outputs = doRAAdapterEngine.batchForward("dora-1", inputs);

    expect(outputs).not.toBeNull();
    expect(outputs!.length).toBe(2);
  });

  it("should get magnitude stats", () => {
    doRAAdapterEngine.createAdapter({
      adapter_id: "dora-1",
      rank: 2,
      alpha: 1.0,
    });

    doRAAdapterEngine.initializeWeights("dora-1", 4, 8, 0.1);

    const stats = doRAAdapterEngine.getMagnitudeStats("dora-1");
    expect(stats).not.toBeNull();
    expect(stats!.min).toBe(1.0);
    expect(stats!.max).toBe(1.0);
    expect(stats!.mean).toBe(1.0);
  });

  it("should list and delete adapters", () => {
    doRAAdapterEngine.createAdapter({ adapter_id: "a1", rank: 2, alpha: 1 });
    doRAAdapterEngine.createAdapter({ adapter_id: "a2", rank: 2, alpha: 1 });

    expect(doRAAdapterEngine.listAdapters().length).toBe(2);

    doRAAdapterEngine.deleteAdapter("a1");
    expect(doRAAdapterEngine.listAdapters().length).toBe(1);
  });

  it("should throw on unknown adapter", () => {
    expect(() => doRAAdapterEngine.initializeWeights("unknown", 4, 4, 0.1)).toThrow();
  });
});

describe("AdaLoRARankAllocatorEngine", () => {
  beforeEach(() => {
    adaLoRARankAllocatorEngine.clear();
  });

  it("should create allocation with even distribution", () => {
    const allocation = adaLoRARankAllocatorEngine.createAllocation(
      {
        adapter_id: "ada-1",
        total_rank_budget: 24,
        min_rank: 1,
        max_rank: 16,
        importance_metric: "svd",
        reallocation_interval: 100,
      },
      ["layer1", "layer2", "layer3"]
    );

    expect(allocation.adapter_id).toBe("ada-1");
    expect(Object.keys(allocation.layer_ranks).length).toBe(3);
    expect(allocation.layer_ranks["layer1"]).toBe(8);
  });

  it("should update importance scores", () => {
    adaLoRARankAllocatorEngine.createAllocation(
      {
        adapter_id: "ada-1",
        total_rank_budget: 24,
        importance_metric: "svd",
      },
      ["layer1", "layer2"]
    );

    const importance = adaLoRARankAllocatorEngine.updateImportance("ada-1", "layer1", {
      weights: [[1, 2], [3, 4]],
    });

    expect(importance).toBeGreaterThan(0);

    const allocation = adaLoRARankAllocatorEngine.getAllocation("ada-1");
    expect(allocation?.importance_scores?.["layer1"]).toBe(importance);
  });

  it("should reallocate ranks based on importance", () => {
    adaLoRARankAllocatorEngine.createAllocation(
      {
        adapter_id: "ada-1",
        total_rank_budget: 20,
        min_rank: 2,
        max_rank: 16,
        importance_metric: "svd",
      },
      ["important", "less_important"]
    );

    adaLoRARankAllocatorEngine.updateImportance("ada-1", "important", {
      weights: [[10, 10], [10, 10]],
    });
    adaLoRARankAllocatorEngine.updateImportance("ada-1", "less_important", {
      weights: [[1, 1], [1, 1]],
    });

    const allocation = adaLoRARankAllocatorEngine.reallocateRanks("ada-1");

    expect(allocation.layer_ranks["important"]).toBeGreaterThan(allocation.layer_ranks["less_important"]);
  });

  it("should step and potentially reallocate", () => {
    adaLoRARankAllocatorEngine.createAllocation(
      {
        adapter_id: "ada-1",
        total_rank_budget: 16,
        reallocation_interval: 2,
      },
      ["layer1", "layer2"]
    );

    adaLoRARankAllocatorEngine.step("ada-1", {
      layer1: { weights: [[5, 5], [5, 5]] },
      layer2: { weights: [[1, 1], [1, 1]] },
    });

    const allocation = adaLoRARankAllocatorEngine.step("ada-1", {
      layer1: { weights: [[5, 5], [5, 5]] },
      layer2: { weights: [[1, 1], [1, 1]] },
    });

    expect(allocation).not.toBeNull();
  });

  it("should get rank distribution stats", () => {
    adaLoRARankAllocatorEngine.createAllocation(
      {
        adapter_id: "ada-1",
        total_rank_budget: 30,
      },
      ["a", "b", "c"]
    );

    const dist = adaLoRARankAllocatorEngine.getRankDistribution("ada-1");
    expect(dist).not.toBeNull();
    expect(dist!.min).toBe(10);
    expect(dist!.max).toBe(10);
    expect(dist!.mean).toBe(10);
  });

  it("should support gradient-based importance", () => {
    adaLoRARankAllocatorEngine.createAllocation(
      {
        adapter_id: "ada-grad",
        total_rank_budget: 16,
        importance_metric: "gradient",
      },
      ["layer1"]
    );

    const importance = adaLoRARankAllocatorEngine.updateImportance("ada-grad", "layer1", {
      gradients: [1.0, 2.0, 3.0, 4.0],
    });

    expect(importance).toBeGreaterThan(0);
  });
});

describe("OrthogonalLoRAEngine", () => {
  beforeEach(() => {
    orthogonalLoRAEngine.clear();
  });

  it("should register adapter directions", () => {
    orthogonalLoRAEngine.registerDirection("adapter-1", [1, 0, 0], "cutting_force");
    orthogonalLoRAEngine.registerDirection("adapter-2", [0, 1, 0], "tool_wear");

    expect(orthogonalLoRAEngine.listAdapters().length).toBe(2);
  });

  it("should compute orthogonality between perpendicular vectors", () => {
    orthogonalLoRAEngine.registerDirection("x", [1, 0, 0]);
    orthogonalLoRAEngine.registerDirection("y", [0, 1, 0]);

    const metrics = orthogonalLoRAEngine.computeOrthogonality("x", "y");

    expect(metrics).not.toBeNull();
    expect(metrics!.cosine_similarity).toBeCloseTo(0, 5);
    expect(metrics!.orthogonality_loss).toBeCloseTo(0, 5);
  });

  it("should compute high similarity for parallel vectors", () => {
    orthogonalLoRAEngine.registerDirection("a", [1, 2, 3]);
    orthogonalLoRAEngine.registerDirection("b", [2, 4, 6]);

    const metrics = orthogonalLoRAEngine.computeOrthogonality("a", "b");

    expect(metrics).not.toBeNull();
    expect(metrics!.cosine_similarity).toBeCloseTo(1.0, 5);
    expect(metrics!.subspace_overlap).toBeCloseTo(1.0, 5);
  });

  it("should compute all pairwise metrics", () => {
    orthogonalLoRAEngine.registerDirection("a", [1, 0, 0]);
    orthogonalLoRAEngine.registerDirection("b", [0, 1, 0]);
    orthogonalLoRAEngine.registerDirection("c", [0, 0, 1]);

    const allMetrics = orthogonalLoRAEngine.computeAllPairwiseMetrics();

    expect(allMetrics.length).toBe(3);
  });

  it("should detect violations above threshold", () => {
    orthogonalLoRAEngine.registerDirection("similar1", [1, 0.1, 0]);
    orthogonalLoRAEngine.registerDirection("similar2", [1, 0.2, 0]);
    orthogonalLoRAEngine.registerDirection("different", [0, 0, 1]);

    const violations = orthogonalLoRAEngine.getViolations(0.5);

    expect(violations.length).toBe(1);
    expect(violations[0].adapter_pair).toContain("similar1");
    expect(violations[0].adapter_pair).toContain("similar2");
  });

  it("should orthogonalize using Gram-Schmidt", () => {
    orthogonalLoRAEngine.registerDirection("base", [1, 0, 0]);
    orthogonalLoRAEngine.registerDirection("to-orthogonalize", [1, 1, 0]);

    const orthogonalized = orthogonalLoRAEngine.orthogonalize("to-orthogonalize", ["base"]);

    expect(orthogonalized).not.toBeNull();
    expect(orthogonalized![0]).toBeCloseTo(0, 5);
    expect(Math.abs(orthogonalized![1])).toBeCloseTo(1, 5);
  });

  it("should orthogonalize all adapters", () => {
    orthogonalLoRAEngine.registerDirection("a", [1, 1, 0]);
    orthogonalLoRAEngine.registerDirection("b", [1, 0, 1]);
    orthogonalLoRAEngine.registerDirection("c", [0, 1, 1]);

    const result = orthogonalLoRAEngine.orthogonalizeAll();

    expect(result.size).toBe(3);

    const violations = orthogonalLoRAEngine.getViolations(0.01);
    expect(violations.length).toBe(0);
  });

  it("should add and compute constrained loss", () => {
    orthogonalLoRAEngine.registerDirection("a", [1, 0.5, 0]);
    orthogonalLoRAEngine.registerDirection("b", [1, 0.3, 0]);

    orthogonalLoRAEngine.addConstraint({
      adapter_ids: ["a", "b"],
      constraint_strength: 0.5,
    });

    const loss = orthogonalLoRAEngine.computeConstrainedLoss();

    expect(loss.total_loss).toBeGreaterThan(0);
    expect(loss.per_constraint.length).toBe(1);
  });

  it("should get domain orthogonality stats", () => {
    orthogonalLoRAEngine.registerDirection("cf1", [1, 0, 0], "cutting_force");
    orthogonalLoRAEngine.registerDirection("cf2", [0, 1, 0], "cutting_force");
    orthogonalLoRAEngine.registerDirection("tw1", [0, 0, 1], "tool_wear");

    const stats = orthogonalLoRAEngine.getDomainOrthogonality("cutting_force");

    expect(stats).not.toBeNull();
    expect(stats!.adapter_count).toBe(2);
    expect(stats!.avg_cosine).toBeCloseTo(0, 5);
  });
});

describe("LoRACompositionEngine", () => {
  beforeEach(() => {
    loraCompositionEngine.clear();
    loraMoEGatingEngine.clear();
    orthogonalLoRAEngine.clear();
  });

  it("should register adapter deltas", () => {
    const result = loraCompositionEngine.registerAdapterDeltas([
      { adapter_id: "a1", delta: { kc1_1: 50, n: 0.02 } },
      { adapter_id: "a2", delta: { kc1_1: 30, n: -0.01 } },
    ]);

    expect(result.registered).toBe(2);
  });

  it("should compose with weighted_sum mode", () => {
    loraMoEGatingEngine.registerExperts([
      {
        adapter_id: "a1",
        domain: "cutting_force",
        quality_score: { accuracy: 0.9, stability: 0.8, coverage: 0.7, confidence: 0.9, freshness: 0.8 },
        rank: 8,
        alpha: 16,
      },
      {
        adapter_id: "a2",
        domain: "cutting_force",
        quality_score: { accuracy: 0.8, stability: 0.8, coverage: 0.7, confidence: 0.9, freshness: 0.8 },
        rank: 8,
        alpha: 16,
      },
    ]);

    loraCompositionEngine.registerAdapterDeltas([
      { adapter_id: "a1", delta: { force: 100 } },
      { adapter_id: "a2", delta: { force: 50 } },
    ]);

    const result = loraCompositionEngine.compose({
      domain: "cutting_force",
      context: {},
      base_values: { force: 1000 },
      composition_mode: "weighted_sum",
      max_experts: 2,
    });

    expect(result.adapted_values.force).toBeGreaterThan(1000);
    expect(result.experts_used.length).toBe(2);
    expect(result.composition_time_ms).toBeLessThan(50);
  });

  it("should compose with residual mode", () => {
    loraMoEGatingEngine.registerExperts([
      {
        adapter_id: "a1",
        domain: "cutting_force",
        quality_score: { accuracy: 0.9, stability: 0.8, coverage: 0.7, confidence: 0.9, freshness: 0.8 },
        rank: 8,
        alpha: 16,
      },
    ]);

    loraCompositionEngine.registerAdapterDelta("a1", { force: 200 });
    loraCompositionEngine.configure({ residual_alpha: 0.5 });

    const result = loraCompositionEngine.compose({
      domain: "cutting_force",
      context: {},
      base_values: { force: 1000 },
      composition_mode: "residual",
      max_experts: 1,
    });

    expect(result.provenance.mode).toBe("residual");
  });

  it("should batch compose", () => {
    loraMoEGatingEngine.registerExperts([
      {
        adapter_id: "a1",
        domain: "cutting_force",
        quality_score: { accuracy: 0.9, stability: 0.8, coverage: 0.7, confidence: 0.9, freshness: 0.8 },
        rank: 8,
        alpha: 16,
      },
    ]);

    loraCompositionEngine.registerAdapterDelta("a1", { val: 10 });

    const results = loraCompositionEngine.batchCompose([
      { domain: "cutting_force", context: {}, base_values: { val: 100 }, max_experts: 1 },
      { domain: "cutting_force", context: {}, base_values: { val: 200 }, max_experts: 1 },
    ]);

    expect(results.length).toBe(2);
    expect(results[0].input_index).toBe(0);
    expect(results[1].input_index).toBe(1);
  });

  it("should get composition stats", () => {
    loraCompositionEngine.registerAdapterDelta("test", { x: 1 });

    const stats = loraCompositionEngine.getStats();

    expect(stats.registered_deltas).toBe(1);
    expect(stats.config).toBeDefined();
  });

  it("should complete composition in <50ms", () => {
    loraMoEGatingEngine.registerExperts(
      Array.from({ length: 10 }, (_, i) => ({
        adapter_id: `adapter-${i}`,
        domain: "cutting_force" as const,
        quality_score: { accuracy: 0.9 - i * 0.05, stability: 0.8, coverage: 0.7, confidence: 0.9, freshness: 0.8 },
        rank: 8,
        alpha: 16,
      }))
    );

    for (let i = 0; i < 10; i++) {
      loraCompositionEngine.registerAdapterDelta(`adapter-${i}`, { force: 10 * i, power: 5 * i });
    }

    const result = loraCompositionEngine.compose({
      domain: "cutting_force",
      context: { material: "steel", machine: "okuma" },
      base_values: { force: 1000, power: 500 },
      composition_mode: "weighted_sum",
      max_experts: 3,
    });

    expect(result.composition_time_ms).toBeLessThan(50);
    expect(result.experts_used.length).toBe(3);
  });
});

describe("mlDispatcher LoRA actions", () => {
  beforeEach(() => {
    loraMoEGatingEngine.clear();
    doRAAdapterEngine.clear();
    adaLoRARankAllocatorEngine.clear();
    orthogonalLoRAEngine.clear();
    loraCompositionEngine.clear();
  });

  it("should handle lora_register_expert via dispatcher", async () => {
    const { registerMLDispatcher } = await import("../../tools/dispatchers/mlDispatcher.js");

    let capturedResult: unknown;
    let handlerPromise: Promise<unknown> | undefined;
    const mockServer = {
      tool: (_name: string, _desc: string, _schema: unknown, handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) => {
        handlerPromise = handler({
          action: "lora_register_expert",
          params: {
            experts: [{
              adapter_id: "test-adapter",
              domain: "cutting_force",
              quality_score: { accuracy: 0.9, stability: 0.8, coverage: 0.7, confidence: 0.85, freshness: 0.75 },
              rank: 8,
              alpha: 16,
            }],
          },
        }).then(r => { capturedResult = r; });
      },
    };

    registerMLDispatcher(mockServer);
    // Await the actual handler promise rather than racing a fixed 50ms timer: the
    // handler chains await import(...) lazy-loads, which under full-suite thread-pool
    // contention can exceed a fixed sleep -> capturedResult stays undefined (a
    // load-dependent flake, not state pollution; vitest isolate:true rules that out).
    await handlerPromise;

    expect(capturedResult).toBeDefined();
    const text = (capturedResult as { content: Array<{ text: string }> }).content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.success).toBe(true);
    expect(parsed.registered).toBe(1);
  });

  it("should handle dora_create via dispatcher", async () => {
    const { registerMLDispatcher } = await import("../../tools/dispatchers/mlDispatcher.js");

    let capturedResult: unknown;
    let handlerPromise: Promise<unknown> | undefined;
    const mockServer = {
      tool: (_name: string, _desc: string, _schema: unknown, handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) => {
        handlerPromise = handler({
          action: "dora_create",
          params: {
            adapter_id: "dora-test",
            rank: 4,
            alpha: 8,
          },
        }).then(r => { capturedResult = r; });
      },
    };

    registerMLDispatcher(mockServer);
    // Await the real handler completion, not a fixed timer (load-independent; see lora_register_expert above).
    await handlerPromise;

    expect(capturedResult).toBeDefined();
    const text = (capturedResult as { content: Array<{ text: string }> }).content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.success).toBe(true);
    expect(parsed.adapter_id).toBe("dora-test");
  });

  it("should handle olora_check via dispatcher", async () => {
    orthogonalLoRAEngine.registerDirection("a", [1, 0, 0]);
    orthogonalLoRAEngine.registerDirection("b", [0, 1, 0]);

    const { registerMLDispatcher } = await import("../../tools/dispatchers/mlDispatcher.js");

    let capturedResult: unknown;
    let handlerPromise: Promise<unknown> | undefined;
    const mockServer = {
      tool: (_name: string, _desc: string, _schema: unknown, handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) => {
        handlerPromise = handler({
          action: "olora_check",
          params: { threshold: 0.1 },
        }).then(r => { capturedResult = r; });
      },
    };

    registerMLDispatcher(mockServer);
    // Await the real handler completion, not a fixed timer (load-independent; see lora_register_expert above).
    await handlerPromise;

    expect(capturedResult).toBeDefined();
    const text = (capturedResult as { content: Array<{ text: string }> }).content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.success).toBe(true);
    expect(parsed.violation_count).toBe(0);
  });
});
