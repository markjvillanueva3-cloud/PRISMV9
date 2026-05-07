/**
 * Continual Learning Engines Tests — U-LEARN-10
 * ==============================================
 * Tests for SI, DER++, TTA, LearningCascade, FedLoRA, PER, CrossCustomer, ContinualLoRA
 */
import { describe, it, expect, beforeEach } from "vitest";
import { synapticIntelligenceEngine } from "../engines/SynapticIntelligenceEngine.js";
import { derPlusPlusEngine } from "../engines/DERPlusPlusEngine.js";
import { testTimeAdaptationEngine } from "../engines/TestTimeAdaptationEngine.js";
import { learningCascadeEngine } from "../engines/LearningCascadeEngine.js";
import { federatedLoRAEngine } from "../engines/FederatedLoRAEngine.js";
import { prioritizedReplayBufferEngine } from "../engines/PrioritizedReplayBufferEngine.js";
import { crossCustomerPolicyTransferEngine } from "../engines/CrossCustomerPolicyTransferEngine.js";
import { continualLoRAEngine } from "../engines/ContinualLoRAEngine.js";

describe("SynapticIntelligenceEngine", () => {
  beforeEach(() => { synapticIntelligenceEngine.clear(); });

  it("registers model with correct parameter count", () => {
    const result = synapticIntelligenceEngine.register({ model_id: "test", parameter_count: 100 });
    expect(result.model_id).toBe("test");
    expect(result.parameter_count).toBe(100);
    expect(result.initialized).toBe(true);
  });

  it("updates running importance on gradient × delta", () => {
    synapticIntelligenceEngine.register({ model_id: "update_test", parameter_count: 10 });
    const result = synapticIntelligenceEngine.update({
      model_id: "update_test",
      gradients: Array(10).fill(0.1),
      parameter_deltas: Array(10).fill(0.01),
    });
    expect(result.omega_updated).toBe(true);
    expect(result.max_omega).toBeGreaterThan(0);
  });

  it("consolidates after task completion", () => {
    synapticIntelligenceEngine.register({ model_id: "consol_test", parameter_count: 10 });
    synapticIntelligenceEngine.update({ model_id: "consol_test", gradients: Array(10).fill(0.5), parameter_deltas: Array(10).fill(0.1) });
    const result = synapticIntelligenceEngine.consolidate({ model_id: "consol_test", task_id: "task1" });
    expect(result.task_id).toBe("task1");
    expect(result.mean_importance).toBeGreaterThanOrEqual(0);
  });

  it("computes SI loss with consolidated params", () => {
    synapticIntelligenceEngine.register({ model_id: "loss_test", parameter_count: 5 });
    synapticIntelligenceEngine.setParams("loss_test", [1, 2, 3, 4, 5]);
    synapticIntelligenceEngine.update({ model_id: "loss_test", gradients: [0.1, 0.2, 0.3, 0.4, 0.5], parameter_deltas: [0.01, 0.02, 0.03, 0.04, 0.05] });
    synapticIntelligenceEngine.consolidate({ model_id: "loss_test", task_id: "t1" });
    const result = synapticIntelligenceEngine.computeLoss({ model_id: "loss_test", current_params: [1.1, 2.1, 3.1, 4.1, 5.1] });
    expect(typeof result.regularization_loss).toBe("number");
    expect(Number.isFinite(result.regularization_loss)).toBe(true);
  });

  it("throws on dimension mismatch", () => {
    synapticIntelligenceEngine.register({ model_id: "dim_test", parameter_count: 10 });
    expect(() => synapticIntelligenceEngine.update({ model_id: "dim_test", gradients: [0.1], parameter_deltas: [0.1] })).toThrow();
  });

  it("returns null state for unknown model", () => {
    expect(synapticIntelligenceEngine.getState("nonexistent")).toBeNull();
  });

  it("lists and deletes models", () => {
    synapticIntelligenceEngine.register({ model_id: "m1", parameter_count: 10 });
    synapticIntelligenceEngine.register({ model_id: "m2", parameter_count: 20 });
    expect(synapticIntelligenceEngine.listModels()).toHaveLength(2);
    synapticIntelligenceEngine.deleteModel("m1");
    expect(synapticIntelligenceEngine.listModels()).toHaveLength(1);
  });
});

describe("DERPlusPlusEngine", () => {
  beforeEach(() => { derPlusPlusEngine.clear(); });

  it("creates buffer with config", () => {
    const result = derPlusPlusEngine.createBuffer({ buffer_id: "test", max_size: 1000 });
    expect(result.buffer_id).toBe("test");
    expect(result.max_size).toBe(1000);
  });

  it("adds experiences to buffer", () => {
    derPlusPlusEngine.createBuffer({ buffer_id: "add_test", max_size: 100 });
    const result = derPlusPlusEngine.addExperience("add_test", {
      experience_id: "e1", input: [1, 2], target: [0.5], logits: [0.3, 0.7], task_id: "task1",
    });
    expect(result.added).toBe(true);
    expect(result.buffer_size).toBe(1);
  });

  it("samples from buffer", () => {
    derPlusPlusEngine.createBuffer({ buffer_id: "sample_test", max_size: 100 });
    for (let i = 0; i < 10; i++) {
      derPlusPlusEngine.addExperience("sample_test", {
        experience_id: `e${i}`, input: [i, i+1], target: [i*0.1], logits: [0.5, 0.5], task_id: "t1",
      });
    }
    const sample = derPlusPlusEngine.sample({ buffer_id: "sample_test", batch_size: 5 });
    expect(sample.experiences.length).toBeLessThanOrEqual(5);
    expect(sample.indices.length).toBe(sample.experiences.length);
  });

  it("computes KL + MSE loss", () => {
    derPlusPlusEngine.createBuffer({ buffer_id: "loss_test", max_size: 100, alpha: 0.5, beta: 0.5 });
    derPlusPlusEngine.addExperience("loss_test", { experience_id: "e1", input: [1], target: [1], logits: [0.3, 0.7], task_id: "t1" });
    const result = derPlusPlusEngine.computeLoss({ buffer_id: "loss_test", current_logits: [[0.4, 0.6]], sample_indices: [0] });
    expect(result.kl_loss).toBeGreaterThanOrEqual(0);
    expect(result.mse_loss).toBeGreaterThanOrEqual(0);
    expect(result.samples_used).toBe(1);
  });

  it("handles empty buffer gracefully", () => {
    derPlusPlusEngine.createBuffer({ buffer_id: "empty", max_size: 100 });
    const sample = derPlusPlusEngine.sample({ buffer_id: "empty", batch_size: 10 });
    expect(sample.experiences).toHaveLength(0);
  });

  it("tracks task distribution", () => {
    derPlusPlusEngine.createBuffer({ buffer_id: "dist_test", max_size: 100 });
    derPlusPlusEngine.addExperience("dist_test", { experience_id: "e1", input: [1], target: [1], logits: [0.5], task_id: "A" });
    derPlusPlusEngine.addExperience("dist_test", { experience_id: "e2", input: [2], target: [2], logits: [0.5], task_id: "B" });
    const stats = derPlusPlusEngine.getStats("dist_test");
    expect(stats?.tasks).toContain("A");
    expect(stats?.tasks).toContain("B");
  });

  it("throws on unknown buffer", () => {
    expect(() => derPlusPlusEngine.sample({ buffer_id: "nope", batch_size: 1 })).toThrow();
  });
});

describe("TestTimeAdaptationEngine", () => {
  beforeEach(() => { testTimeAdaptationEngine.clear(); });

  it("configures model for TTA", () => {
    const result = testTimeAdaptationEngine.configure({ model_id: "test", entropy_threshold: 0.4 });
    expect(result.model_id).toBe("test");
    expect(result.configured).toBe(true);
  });

  it("adapts on reliable low-entropy sample", () => {
    testTimeAdaptationEngine.configure({ model_id: "adapt_test", entropy_threshold: 0.5 });
    const result = testTimeAdaptationEngine.adapt({ model_id: "adapt_test", sample_logits: [10, -10] });
    expect(result.reliable).toBe(true);
    expect(result.entropy).toBeLessThan(0.5);
  });

  it("skips high-entropy unreliable samples", () => {
    testTimeAdaptationEngine.configure({ model_id: "skip_test", entropy_threshold: 0.1 });
    const result = testTimeAdaptationEngine.adapt({ model_id: "skip_test", sample_logits: [0.5, 0.5, 0.5, 0.5] });
    expect(result.reliable).toBe(false);
    expect(result.adapted).toBe(false);
  });

  it("tracks BN and LoRA updates", () => {
    testTimeAdaptationEngine.configure({ model_id: "track_test", entropy_threshold: 0.5, adapt_bn: true, adapt_lora_a: true });
    testTimeAdaptationEngine.adapt({ model_id: "track_test", sample_logits: [5, -5] });
    const stats = testTimeAdaptationEngine.getStats("track_test");
    expect(stats?.bn_updates).toBeGreaterThan(0);
    expect(stats?.lora_updates).toBeGreaterThan(0);
  });

  it("resets adaptation state", () => {
    testTimeAdaptationEngine.configure({ model_id: "reset_test", entropy_threshold: 0.5 });
    testTimeAdaptationEngine.adapt({ model_id: "reset_test", sample_logits: [5, -5] });
    testTimeAdaptationEngine.reset("reset_test");
    const stats = testTimeAdaptationEngine.getStats("reset_test");
    expect(stats?.adaptation_count).toBe(0);
  });

  it("throws on unconfigured model", () => {
    expect(() => testTimeAdaptationEngine.adapt({ model_id: "nope", sample_logits: [1] })).toThrow();
  });
});

describe("LearningCascadeEngine", () => {
  beforeEach(() => { learningCascadeEngine.clear(); });

  it("creates cascade graph", () => {
    const result = learningCascadeEngine.createGraph({
      graph_id: "test",
      nodes: [{ node_id: "lora", node_type: "lora_finetune", threshold_count: 5 }],
      edges: [],
    });
    expect(result.graph_id).toBe("test");
    expect(result.node_count).toBe(1);
  });

  it("propagates outcome through nodes", () => {
    learningCascadeEngine.createGraph({
      graph_id: "prop_test",
      nodes: [
        { node_id: "lora", node_type: "lora_finetune", threshold_count: 5 },
        { node_id: "tribal", node_type: "tribal_kb", threshold_count: 3 },
      ],
      edges: [{ from: "lora", to: "tribal", weight: 1 }],
    });
    const result = learningCascadeEngine.propagate({
      graph_id: "prop_test", outcome_id: "o1", domain: "mill", delta: { sfm: -20 }, confidence: 0.9,
    });
    expect(result.nodes_triggered).toContain("lora");
    expect(result.actions_taken.length).toBeGreaterThan(0);
  });

  it("auto-promotes playbook rule at threshold", () => {
    learningCascadeEngine.createGraph({
      graph_id: "promo_test",
      nodes: [{ node_id: "rule", node_type: "playbook_rule", threshold_count: 2, auto_promote: true }],
      edges: [],
    });
    learningCascadeEngine.propagate({ graph_id: "promo_test", outcome_id: "o1", domain: "lathe", delta: {}, confidence: 1 });
    const result = learningCascadeEngine.propagate({ graph_id: "promo_test", outcome_id: "o2", domain: "lathe", delta: {}, confidence: 1 });
    const promoteAction = result.actions_taken.find(a => a.action.includes("promote_rule"));
    expect(promoteAction).toBeDefined();
  });

  it("tracks node confirmations", () => {
    learningCascadeEngine.createGraph({
      graph_id: "confirm_test",
      nodes: [{ node_id: "n1", node_type: "feature_store", threshold_count: 10 }],
      edges: [],
    });
    learningCascadeEngine.propagate({ graph_id: "confirm_test", outcome_id: "o1", domain: "wedm", delta: {}, confidence: 0.8 });
    const stats = learningCascadeEngine.getStats("confirm_test");
    expect(stats?.node_confirmations["n1"]).toBe(1);
  });

  it("throws on unknown graph", () => {
    expect(() => learningCascadeEngine.propagate({ graph_id: "nope", outcome_id: "x", domain: "x", delta: {}, confidence: 1 })).toThrow();
  });
});

describe("FederatedLoRAEngine", () => {
  beforeEach(() => { federatedLoRAEngine.clear(); });

  it("aggregates LoRA-A matrices with FedAvg", () => {
    const result = federatedLoRAEngine.aggregate({
      round_id: "r1",
      clients: [
        { client_id: "c1", customer_id: "cust1", material_class: "P", operation_type: "rough", machine_class: "VMC", lora_a_weights: [[1, 2], [3, 4]], sample_count: 100 },
        { client_id: "c2", customer_id: "cust2", material_class: "P", operation_type: "rough", machine_class: "VMC", lora_a_weights: [[2, 3], [4, 5]], sample_count: 100 },
      ],
      aggregation_method: "fedavg",
    });
    expect(result.round_id).toBe("r1");
    expect(result.clients_aggregated).toBe(2);
    expect(result.global_lora_a[0][0]).toBeCloseTo(1.5, 5);
  });

  it("computes divergence scores", () => {
    const result = federatedLoRAEngine.aggregate({
      round_id: "r2",
      clients: [
        { client_id: "c1", customer_id: "cust1", material_class: "M", operation_type: "finish", machine_class: "HMC", lora_a_weights: [[1]], sample_count: 50 },
        { client_id: "c2", customer_id: "cust2", material_class: "M", operation_type: "finish", machine_class: "HMC", lora_a_weights: [[5]], sample_count: 50 },
      ],
    });
    expect(result.divergence_scores.length).toBe(2);
    expect(result.divergence_scores[0].divergence).toBeGreaterThan(0);
  });

  it("stores and retrieves global weights", () => {
    federatedLoRAEngine.aggregate({
      round_id: "r3",
      clients: [{ client_id: "c1", customer_id: "x", material_class: "K", operation_type: "drill", machine_class: "lathe", lora_a_weights: [[1, 2]], sample_count: 10 }],
    });
    const weights = federatedLoRAEngine.getGlobalWeights("K", "drill", "lathe");
    expect(weights).not.toBeNull();
    expect(weights![0]).toEqual([1, 2]);
  });

  it("throws on empty clients", () => {
    expect(() => federatedLoRAEngine.aggregate({ round_id: "bad", clients: [] })).toThrow();
  });

  it("tracks round history", () => {
    federatedLoRAEngine.aggregate({ round_id: "h1", clients: [{ client_id: "c1", customer_id: "x", material_class: "N", operation_type: "face", machine_class: "VMC", lora_a_weights: [[1]], sample_count: 5 }] });
    const history = federatedLoRAEngine.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].roundId).toBe("h1");
  });
});

describe("PrioritizedReplayBufferEngine", () => {
  beforeEach(() => { prioritizedReplayBufferEngine.clear(); });

  it("creates buffer", () => {
    const result = prioritizedReplayBufferEngine.createBuffer({ buffer_id: "test", max_size: 1000 });
    expect(result.buffer_id).toBe("test");
  });

  it("adds experience with TD-error priority", () => {
    prioritizedReplayBufferEngine.createBuffer({ buffer_id: "add_test", max_size: 100 });
    const result = prioritizedReplayBufferEngine.add("add_test", {
      experience_id: "e1", state: [1, 2], action: [0.5], reward: 1, next_state: [2, 3], done: false, td_error: 0.5,
    });
    expect(result.added).toBe(true);
  });

  it("samples with IS weights", () => {
    prioritizedReplayBufferEngine.createBuffer({ buffer_id: "sample_test", max_size: 100 });
    for (let i = 0; i < 20; i++) {
      prioritizedReplayBufferEngine.add("sample_test", {
        experience_id: `e${i}`, state: [i], action: [0.1], reward: i * 0.1, next_state: [i+1], done: i === 19, td_error: Math.random(),
      });
    }
    const result = prioritizedReplayBufferEngine.sample("sample_test", 5);
    expect(result.experiences.length).toBeLessThanOrEqual(5);
    expect(result.weights.length).toBe(result.experiences.length);
    expect(Math.max(...result.weights)).toBeCloseTo(1, 5);
  });

  it("updates priorities", () => {
    prioritizedReplayBufferEngine.createBuffer({ buffer_id: "update_test", max_size: 100 });
    prioritizedReplayBufferEngine.add("update_test", { experience_id: "e1", state: [1], action: [1], reward: 1, next_state: [2], done: false });
    const result = prioritizedReplayBufferEngine.updatePriorities("update_test", [0], [2.0]);
    expect(result.updated).toBe(1);
  });

  it("handles empty buffer", () => {
    prioritizedReplayBufferEngine.createBuffer({ buffer_id: "empty", max_size: 100 });
    const result = prioritizedReplayBufferEngine.sample("empty", 10);
    expect(result.experiences).toHaveLength(0);
  });

  it("reports statistics", () => {
    prioritizedReplayBufferEngine.createBuffer({ buffer_id: "stats_test", max_size: 100 });
    prioritizedReplayBufferEngine.add("stats_test", { experience_id: "e1", state: [1], action: [1], reward: 1, next_state: [2], done: false, td_error: 0.1 });
    const stats = prioritizedReplayBufferEngine.getStats("stats_test");
    expect(stats?.size).toBe(1);
    expect(stats?.max_priority).toBeGreaterThan(0);
  });
});

describe("CrossCustomerPolicyTransferEngine", () => {
  beforeEach(() => { crossCustomerPolicyTransferEngine.clear(); });

  it("registers source policy", () => {
    const result = crossCustomerPolicyTransferEngine.registerSource({
      source_customer: "ITW", source_policy_id: "itw_p_rough", material_class: "P", operation_type: "roughing", machine_class: "VMC", performance_score: 0.9, sample_count: 500,
    });
    expect(result.registered).toBe(true);
  });

  it("transfers policy to new customer", () => {
    crossCustomerPolicyTransferEngine.registerSource({ source_customer: "ITW", source_policy_id: "itw1", material_class: "M", operation_type: "finishing", machine_class: "HMC", performance_score: 0.85, sample_count: 200 });
    const result = crossCustomerPolicyTransferEngine.transfer({ target_customer: "Alcoa", material_class: "M", operation_type: "finishing", machine_class: "HMC" });
    expect(result.target_customer).toBe("Alcoa");
    expect(result.sources_used.length).toBeGreaterThan(0);
    expect(result.expected_performance).toBeGreaterThan(0);
  });

  it("returns empty when no match", () => {
    const result = crossCustomerPolicyTransferEngine.transfer({ target_customer: "NewCust", material_class: "X", operation_type: "x", machine_class: "x" });
    expect(result.sources_used).toHaveLength(0);
    expect(result.adaptation_required).toBe(true);
  });

  it("finds similar policies", () => {
    crossCustomerPolicyTransferEngine.registerSource({ source_customer: "A", source_policy_id: "a1", material_class: "K", operation_type: "drill", machine_class: "lathe", performance_score: 0.9, sample_count: 100 });
    crossCustomerPolicyTransferEngine.registerSource({ source_customer: "B", source_policy_id: "b1", material_class: "K", operation_type: "drill", machine_class: "lathe", performance_score: 0.9, sample_count: 100 });
    const similar = crossCustomerPolicyTransferEngine.findSimilar({ target_customer: "C", material_class: "K", operation_type: "drill", machine_class: "lathe", min_similarity: 0.5 });
    expect(similar.length).toBe(2);
  });

  it("tracks transfer history", () => {
    crossCustomerPolicyTransferEngine.registerSource({ source_customer: "X", source_policy_id: "x1", material_class: "S", operation_type: "turn", machine_class: "lathe", performance_score: 0.95, sample_count: 300 });
    crossCustomerPolicyTransferEngine.transfer({ target_customer: "Y", material_class: "S", operation_type: "turn", machine_class: "lathe" });
    const history = crossCustomerPolicyTransferEngine.getTransferHistory("Y");
    expect(history.length).toBe(1);
  });
});

describe("ContinualLoRAEngine", () => {
  beforeEach(() => { continualLoRAEngine.clear(); });

  it("creates adapter with SI + DER backing", () => {
    const result = continualLoRAEngine.createAdapter({ adapter_id: "test", domain: "mill", rank: 8, alpha: 16 });
    expect(result.adapter_id).toBe("test");
    expect(result.domain).toBe("mill");
    expect(result.created).toBe(true);
  });

  it("trains with EWC + SI + DER enabled", () => {
    continualLoRAEngine.createAdapter({ adapter_id: "train_test", domain: "lathe" });
    const result = continualLoRAEngine.train({
      adapter_id: "train_test", task_id: "task1",
      experiences: [{ input: [1, 2, 3], target: [0.5, 0.5] }],
      epochs: 2, use_ewc: true, use_si: true, use_der: true,
    });
    expect(result.epochs_completed).toBe(2);
    expect(result.forgetting_metric).toBeGreaterThanOrEqual(0);
  });

  it("tracks multiple tasks", () => {
    continualLoRAEngine.createAdapter({ adapter_id: "multi_test", domain: "wedm" });
    continualLoRAEngine.train({ adapter_id: "multi_test", task_id: "t1", experiences: [{ input: [1], target: [1] }], epochs: 1 });
    continualLoRAEngine.train({ adapter_id: "multi_test", task_id: "t2", experiences: [{ input: [2], target: [2] }], epochs: 1 });
    const state = continualLoRAEngine.getState("multi_test");
    expect(state?.tasks_completed).toContain("t1");
    expect(state?.tasks_completed).toContain("t2");
  });

  it("handles empty experiences", () => {
    continualLoRAEngine.createAdapter({ adapter_id: "empty_test", domain: "sinker" });
    const result = continualLoRAEngine.train({ adapter_id: "empty_test", task_id: "t1", experiences: [], epochs: 5 });
    expect(result.epochs_completed).toBe(0);
  });

  it("supports all 6 domains", () => {
    const domains = ["mill", "lathe", "wedm", "sinker", "grinder", "welder"] as const;
    for (const domain of domains) {
      const result = continualLoRAEngine.createAdapter({ adapter_id: `dom_${domain}`, domain });
      expect(result.domain).toBe(domain);
    }
    expect(continualLoRAEngine.listAdapters()).toHaveLength(6);
  });

  it("deletes adapter and cleans backing stores", () => {
    continualLoRAEngine.createAdapter({ adapter_id: "del_test", domain: "grinder" });
    expect(continualLoRAEngine.listAdapters()).toContain("del_test");
    continualLoRAEngine.deleteAdapter("del_test");
    expect(continualLoRAEngine.listAdapters()).not.toContain("del_test");
  });

  it("returns null state for unknown adapter", () => {
    expect(continualLoRAEngine.getState("nope")).toBeNull();
  });

  it("throws on training unknown adapter", () => {
    expect(() => continualLoRAEngine.train({ adapter_id: "nope", task_id: "t1", experiences: [], epochs: 1 })).toThrow();
  });
});
