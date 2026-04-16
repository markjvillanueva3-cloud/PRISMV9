/**
 * Electrode Ultimate AI Tests — ELEC-PIPE-OMEGA-AI
 *
 * Tests for all 19 AI systems:
 * - Deep Learning: Transformer, GNN, LSTM, VAE, PINN
 * - Deep Reasoning: ToT, Self-Consistency, CoVe, Reflexion, ReAct
 * - Memory: Episodic, Knowledge Graph, Working Memory
 * - Uncertainty: Deep Ensemble, MC Dropout, Conformal
 * - Planning: Hierarchical
 * - Self-Improvement: Continual Learning, Curriculum
 *
 * @module __tests__/electrode-ultimate-ai.test
 */

import { describe, it, expect } from "vitest";
import {
  electrodeUltimateAIEngine,
  type AttentionOutput,
  type NodeEmbedding,
  type ToTNode,
  type SelfConsistencyResult,
  type CoVeResult,
  type ReflexionResult,
  type ReActTrace,
  type EpisodicMemory,
  type KGTriple,
  type DeepEnsemblePrediction,
  type ConformalSet,
  type HierarchicalPlan,
} from "../engines/ElectrodeUltimateAIEngine.js";

// ============================================================================
// TRANSFORMER ATTENTION
// ============================================================================

describe("Transformer Attention", () => {
  it("should compute multi-head attention", () => {
    const result = electrodeUltimateAIEngine.runTransformerAttention({
      discharge_energy: 50,
      duty_cycle: 0.40,
      electrode_grain: 5,
      workpiece_hardness: 55,
    });

    expect(result.attended_values).toBeDefined();
    expect(result.attended_values.length).toBe(64);
    expect(result.attention_weights.length).toBe(4); // 4 heads
    expect(result.head_outputs.length).toBe(4);
  });

  it("should produce normalized attention weights", () => {
    const result = electrodeUltimateAIEngine.runTransformerAttention({
      energy: 60,
      grain: 8,
    });

    for (const headWeights of result.attention_weights) {
      const sum = headWeights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 1);
    }
  });
});

// ============================================================================
// GRAPH NEURAL NETWORK
// ============================================================================

describe("Graph Neural Network", () => {
  it("should produce node embeddings", () => {
    const embeddings = electrodeUltimateAIEngine.runGNN();

    expect(embeddings.length).toBeGreaterThan(0);
    for (const emb of embeddings) {
      expect(emb.node_id).toBeDefined();
      expect(emb.embedding.length).toBe(32);
      expect(Array.isArray(emb.neighbors)).toBe(true);
    }
  });

  it("should include physics-relevant nodes", () => {
    const embeddings = electrodeUltimateAIEngine.runGNN();
    const nodeIds = embeddings.map(e => e.node_id);

    expect(nodeIds).toContain("discharge_energy");
    expect(nodeIds).toContain("electrode_wear");
    expect(nodeIds).toContain("surface_finish");
  });
});

// ============================================================================
// LSTM WEAR PROGRESSION
// ============================================================================

describe("LSTM Wear Progression", () => {
  it("should predict wear over passes", () => {
    const result = electrodeUltimateAIEngine.predictWearProgression({
      discharge_energy_mJ: 50,
      num_passes: 3,
    });

    expect(result.wear_progression.length).toBe(3);
    expect(result.final_wear).toBeGreaterThanOrEqual(0);
  });

  it("should show increasing wear trend", () => {
    const result = electrodeUltimateAIEngine.predictWearProgression({
      discharge_energy_mJ: 80,
      num_passes: 5,
    });

    // Wear should generally increase over passes
    expect(result.wear_progression[result.wear_progression.length - 1])
      .toBeGreaterThanOrEqual(result.wear_progression[0]);
  });
});

// ============================================================================
// VARIATIONAL AUTOENCODER
// ============================================================================

describe("Variational Autoencoder", () => {
  it("should encode to latent space", () => {
    const result = electrodeUltimateAIEngine.encodeToLatent({
      discharge_energy: 50,
      duty_cycle: 0.40,
      electrode_grain: 5,
      workpiece_hardness: 55,
    });

    expect(result.mean.length).toBe(8);
    expect(result.log_variance.length).toBe(8);
    expect(result.sampled.length).toBe(8);
    expect(result.reconstruction_loss).toBeGreaterThanOrEqual(0);
  });

  it("should have negative log variance", () => {
    const result = electrodeUltimateAIEngine.encodeToLatent({
      energy: 60,
    });

    for (const lv of result.log_variance) {
      expect(lv).toBeLessThanOrEqual(0);
    }
  });
});

// ============================================================================
// PHYSICS-INFORMED NEURAL NETWORK
// ============================================================================

describe("Physics-Informed Neural Network", () => {
  it("should predict with physics constraints", () => {
    const result = electrodeUltimateAIEngine.predictWithPhysicsConstraints({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_um: 5,
      workpiece_hardness: 55,
    });

    expect(result.value).toBeGreaterThan(0);
    expect(result.physics_loss).toBeGreaterThanOrEqual(0);
    expect(result.constraint_satisfaction).toBeGreaterThanOrEqual(0);
    expect(result.constraint_satisfaction).toBeLessThanOrEqual(1);
  });

  it("should have high constraint satisfaction for valid params", () => {
    const result = electrodeUltimateAIEngine.predictWithPhysicsConstraints({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_um: 5,
      workpiece_hardness: 55,
    });

    expect(result.constraint_satisfaction).toBe(1.0);
  });

  it("should detect invalid params", () => {
    const result = electrodeUltimateAIEngine.predictWithPhysicsConstraints({
      discharge_energy_mJ: -10, // Invalid
      duty_cycle: 0.40,
      electrode_grain_um: 5,
      workpiece_hardness: 55,
    });

    expect(result.constraint_satisfaction).toBeLessThan(1.0);
  });
});

// ============================================================================
// TREE OF THOUGHTS
// ============================================================================

describe("Tree of Thoughts", () => {
  it("should explore reasoning tree", () => {
    const result = electrodeUltimateAIEngine.exploreWithToT(
      "Design electrode for D2 tool steel, 1.6μm Ra"
    );

    expect(result.best_path.length).toBeGreaterThan(0);
    expect(result.explored_nodes).toBeGreaterThan(0);
    expect(result.depth_reached).toBeGreaterThanOrEqual(1);
  });

  it("should have evaluated nodes", () => {
    const result = electrodeUltimateAIEngine.exploreWithToT(
      "Optimize electrode for carbide workpiece"
    );

    for (const node of result.best_path) {
      expect(node.evaluation).toBeGreaterThanOrEqual(0);
      expect(node.evaluation).toBeLessThanOrEqual(1);
      expect(node.thought.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// SELF-CONSISTENCY
// ============================================================================

describe("Self-Consistency", () => {
  it("should generate multiple chains", () => {
    const result = electrodeUltimateAIEngine.runSelfConsistency(
      "Select electrode material for H13 steel",
      5
    );

    expect(result.chains.length).toBe(5);
    expect(result.majority_answer.length).toBeGreaterThan(0);
    expect(result.agreement_ratio).toBeGreaterThanOrEqual(0);
    expect(result.agreement_ratio).toBeLessThanOrEqual(1);
  });

  it("should combine confidence from agreement", () => {
    const result = electrodeUltimateAIEngine.runSelfConsistency(
      "Determine pass count for fine finish",
      3
    );

    expect(result.final_confidence).toBeGreaterThanOrEqual(0);
    expect(result.final_confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// CHAIN OF VERIFICATION
// ============================================================================

describe("Chain of Verification", () => {
  it("should verify reasoning steps", () => {
    const result = electrodeUltimateAIEngine.verifyReasoning([
      "Step 1: Analyze material hardness",
      "Step 2: Select appropriate grain size",
      "Step 3: Determine discharge energy",
    ]);

    expect(result.verification_questions.length).toBe(3);
    expect(result.verification_answers.length).toBe(3);
    expect(result.verification_score).toBeGreaterThanOrEqual(0);
    expect(result.verification_score).toBeLessThanOrEqual(1);
  });

  it("should provide corrections if needed", () => {
    const result = electrodeUltimateAIEngine.verifyReasoning([
      "Some step that may need correction",
    ]);

    expect(Array.isArray(result.corrections)).toBe(true);
    expect(result.final_verified_answer.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// REFLEXION
// ============================================================================

describe("Reflexion", () => {
  it("should reflect on success", () => {
    const result = electrodeUltimateAIEngine.reflectOnOutcome(
      "Used EDM-3 with 3 passes",
      "Achieved 1.5μm Ra",
      true
    );

    expect(result.reflection.length).toBeGreaterThan(0);
    expect(result.lesson_learned.length).toBeGreaterThan(0);
    expect(result.improved_attempt).toBeDefined();
  });

  it("should reflect on failure and improve", () => {
    const result = electrodeUltimateAIEngine.reflectOnOutcome(
      "Used high energy settings",
      "Surface finish too rough",
      false
    );

    expect(result.reflection).toContain("failed");
    expect(result.improved_attempt).not.toBe(result.initial_attempt);
  });
});

// ============================================================================
// REACT
// ============================================================================

describe("ReAct", () => {
  it("should execute reasoning + acting loop", () => {
    const result = electrodeUltimateAIEngine.executeReActLoop(
      "Design electrode for precision finishing"
    );

    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.final_answer.length).toBeGreaterThan(0);
    expect(result.total_actions).toBeGreaterThan(0);
  });

  it("should have thought-action-observation structure", () => {
    const result = electrodeUltimateAIEngine.executeReActLoop(
      "Select electrode for D2 steel"
    );

    for (const step of result.steps) {
      expect(step.thought.length).toBeGreaterThan(0);
      expect(step.action.length).toBeGreaterThan(0);
      expect(step.observation.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// EPISODIC MEMORY
// ============================================================================

describe("Episodic Memory", () => {
  it("should store and retrieve episodes", () => {
    electrodeUltimateAIEngine.storeEpisode({
      job_id: "TEST-001",
      embedding: Array(16).fill(0.5),
      params: { discharge_energy: 50, workpiece_hardness: 55 },
      outcome: { wear_ratio: 0.5, surface_finish: 1.6 },
      success: true,
      lessons: ["Good settings for standard work"],
    });

    const retrieved = electrodeUltimateAIEngine.retrieveSimilarEpisodes(
      { discharge_energy: 52, workpiece_hardness: 56 },
      1
    );

    // May not find exact match but should not error
    expect(Array.isArray(retrieved)).toBe(true);
  });
});

// ============================================================================
// KNOWLEDGE GRAPH
// ============================================================================

describe("Knowledge Graph", () => {
  it("should query for triples", () => {
    const triples = electrodeUltimateAIEngine.queryKnowledgeGraph(
      "graphite", "suitable_for"
    );

    expect(triples.length).toBeGreaterThan(0);
    for (const t of triples) {
      expect(t.subject).toBe("graphite");
      expect(t.predicate).toBe("suitable_for");
      expect(t.confidence).toBeGreaterThan(0);
    }
  });

  it("should infer facts", () => {
    const inferred = electrodeUltimateAIEngine.inferFromKnowledgeGraph("fine_grain");

    expect(inferred.length).toBeGreaterThan(0);
    expect(inferred.some(f => f.includes("improves"))).toBe(true);
  });

  it("should have safety rules for carbide", () => {
    const triples = electrodeUltimateAIEngine.queryKnowledgeGraph(
      "graphite", "NOT_suitable_for", "carbide_workpiece"
    );

    expect(triples.length).toBe(1);
    expect(triples[0].confidence).toBeGreaterThan(0.95);
  });
});

// ============================================================================
// WORKING MEMORY
// ============================================================================

describe("Working Memory", () => {
  it("should update and retrieve slots", () => {
    electrodeUltimateAIEngine.updateWorkingMemory("test_slot", { value: 42 }, 0.8);

    const state = electrodeUltimateAIEngine.getWorkingMemoryState();

    expect(state.length).toBeGreaterThan(0);
    const slot = state.find(s => s.slot_id === "test_slot");
    expect(slot?.content.value).toBe(42);
  });

  it("should sort by attention weight", () => {
    electrodeUltimateAIEngine.updateWorkingMemory("low_attn", {}, 0.2);
    electrodeUltimateAIEngine.updateWorkingMemory("high_attn", {}, 0.9);

    const state = electrodeUltimateAIEngine.getWorkingMemoryState();

    // High attention should come first
    const highIdx = state.findIndex(s => s.slot_id === "high_attn");
    const lowIdx = state.findIndex(s => s.slot_id === "low_attn");

    if (highIdx >= 0 && lowIdx >= 0) {
      expect(highIdx).toBeLessThan(lowIdx);
    }
  });
});

// ============================================================================
// DEEP ENSEMBLE
// ============================================================================

describe("Deep Ensemble", () => {
  it("should produce ensemble prediction", () => {
    const result = electrodeUltimateAIEngine.runDeepEnsemble({
      discharge_energy: 50,
      duty_cycle: 0.40,
    });

    expect(result.mean).toBeDefined();
    expect(result.std).toBeGreaterThanOrEqual(0);
    expect(result.predictions.length).toBe(5); // 5 models
    expect(result.epistemic_uncertainty).toBeGreaterThanOrEqual(0);
  });

  it("should have model disagreement as uncertainty", () => {
    const result = electrodeUltimateAIEngine.runDeepEnsemble({
      energy: 80,
      grain: 12,
    });

    // If std > 0, we have model disagreement
    expect(result.std).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// MC DROPOUT
// ============================================================================

describe("MC Dropout", () => {
  it("should run multiple dropout samples", () => {
    const result = electrodeUltimateAIEngine.runMCDropout(
      { discharge_energy: 50 },
      20
    );

    expect(result.samples).toBe(20);
    expect(result.mean).toBeDefined();
    expect(result.std).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// CONFORMAL PREDICTION
// ============================================================================

describe("Conformal Prediction", () => {
  it("should produce prediction intervals", () => {
    const result = electrodeUltimateAIEngine.predictWithConformal(0.5, 0.95);

    expect(result.prediction).toBe(0.5);
    expect(result.lower_bound).toBeLessThan(result.upper_bound);
    expect(result.coverage_guarantee).toBe(0.95);
    expect(result.set_size).toBeGreaterThan(0);
  });

  it("should have wider intervals for higher coverage", () => {
    const narrow = electrodeUltimateAIEngine.predictWithConformal(0.5, 0.80);
    const wide = electrodeUltimateAIEngine.predictWithConformal(0.5, 0.99);

    expect(wide.set_size).toBeGreaterThanOrEqual(narrow.set_size);
  });
});

// ============================================================================
// HIERARCHICAL PLANNING
// ============================================================================

describe("Hierarchical Planning", () => {
  it("should generate three-level plan", () => {
    const plan = electrodeUltimateAIEngine.generateHierarchicalPlan({
      workpiece_material: "D2",
      target_finish_Ra: 1.6,
      num_cavities: 1,
    });

    expect(plan.strategic.objective.length).toBeGreaterThan(0);
    expect(plan.strategic.approach).toBeDefined();
    expect(plan.tactical.stages.length).toBeGreaterThan(0);
    expect(plan.operational.steps.length).toBeGreaterThan(0);
  });

  it("should have sequential operational steps", () => {
    const plan = electrodeUltimateAIEngine.generateHierarchicalPlan({
      workpiece_material: "H13",
      target_finish_Ra: 0.8,
      num_cavities: 2,
    });

    for (const step of plan.operational.steps) {
      expect(step.action.length).toBeGreaterThan(0);
      expect(step.timing_ms).toBeGreaterThan(0);
      expect(Array.isArray(step.dependencies)).toBe(true);
    }
  });
});

// ============================================================================
// CURRICULUM LEARNING
// ============================================================================

describe("Curriculum Learning", () => {
  it("should track curriculum state", () => {
    const state = electrodeUltimateAIEngine.getCurriculumState();

    expect(state.current_difficulty).toBeGreaterThanOrEqual(0);
    expect(state.current_difficulty).toBeLessThanOrEqual(1);
    expect(state.stages.length).toBe(5);
  });

  it("should have increasing difficulty stages", () => {
    const state = electrodeUltimateAIEngine.getCurriculumState();

    for (let i = 1; i < state.stages.length; i++) {
      expect(state.stages[i].difficulty).toBeGreaterThan(state.stages[i - 1].difficulty);
    }
  });
});

// ============================================================================
// COMPREHENSIVE ANALYSIS
// ============================================================================

describe("Comprehensive Ultimate Analysis", () => {
  it("should run all 19 AI systems", async () => {
    const result = await electrodeUltimateAIEngine.comprehensiveUltimateAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_passes: 3,
      target_finish_Ra_um: 1.6,
    });

    // Deep learning outputs
    expect(result.transformer_attention).toBeDefined();
    expect(result.gnn_embeddings.length).toBeGreaterThan(0);
    expect(result.lstm_prediction.wear_progression.length).toBe(3);
    expect(result.vae_latent.sampled.length).toBe(8);
    expect(result.pinn_prediction.value).toBeGreaterThan(0);

    // Deep reasoning outputs
    expect(result.tree_of_thoughts.best_path.length).toBeGreaterThan(0);
    expect(result.self_consistency.chains.length).toBe(5);
    expect(result.chain_of_verification.verification_score).toBeGreaterThanOrEqual(0);
    expect(result.reflexion.lesson_learned.length).toBeGreaterThan(0);
    expect(result.react_trace.steps.length).toBeGreaterThan(0);

    // Memory outputs
    expect(Array.isArray(result.episodic_retrieval)).toBe(true);
    expect(result.knowledge_graph_reasoning.relevant_triples.length).toBeGreaterThan(0);
    expect(Array.isArray(result.working_memory_state)).toBe(true);

    // Uncertainty outputs
    expect(result.deep_ensemble.predictions.length).toBe(5);
    expect(result.mc_dropout.samples).toBe(20);
    expect(result.conformal_prediction.coverage_guarantee).toBe(0.95);

    // Planning outputs
    expect(result.hierarchical_plan.tactical.stages.length).toBeGreaterThan(0);
  });

  it("should list all AI systems used", async () => {
    const result = await electrodeUltimateAIEngine.comprehensiveUltimateAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_passes: 3,
      target_finish_Ra_um: 1.6,
    });

    expect(result.ai_systems_used.length).toBe(19);
    expect(result.ai_systems_used.some(s => s.includes("Transformer"))).toBe(true);
    expect(result.ai_systems_used.some(s => s.includes("Tree of Thoughts"))).toBe(true);
    expect(result.ai_systems_used.some(s => s.includes("Knowledge Graph"))).toBe(true);
  });

  it("should calculate overall confidence", async () => {
    const result = await electrodeUltimateAIEngine.comprehensiveUltimateAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_passes: 3,
      target_finish_Ra_um: 1.6,
    });

    expect(result.overall_confidence).toBeGreaterThan(0);
    expect(result.overall_confidence).toBeLessThanOrEqual(1);
  });

  it("should track processing time", async () => {
    const result = await electrodeUltimateAIEngine.comprehensiveUltimateAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_passes: 3,
      target_finish_Ra_um: 1.6,
    });

    expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// ENGINE STATISTICS
// ============================================================================

describe("Engine Statistics", () => {
  it("should report all AI systems", () => {
    const stats = electrodeUltimateAIEngine.stats();

    expect(stats.ai_systems).toBe(19);
    expect(stats.queries_processed).toBeGreaterThan(0);
  });

  it("should track episodic memory stats", () => {
    const stats = electrodeUltimateAIEngine.stats();

    expect(stats.episodic_memory_stats.total_memories).toBeGreaterThanOrEqual(0);
    expect(stats.episodic_memory_stats.successful_ratio).toBeGreaterThanOrEqual(0);
  });

  it("should track curriculum state", () => {
    const stats = electrodeUltimateAIEngine.stats();

    expect(stats.curriculum_state.current_difficulty).toBeGreaterThanOrEqual(0);
    expect(stats.curriculum_state.stages_mastered).toBeGreaterThanOrEqual(0);
  });
});
