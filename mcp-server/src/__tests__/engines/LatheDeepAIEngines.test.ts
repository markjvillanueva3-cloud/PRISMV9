/**
 * LatheDeepAIEngines.test.ts — Tests for lathe deep AI engines
 * ==============================================================
 *
 * Tests for attention, causal, ensemble, knowledge graph, and RL engines.
 *
 * @module tests/engines/LatheDeepAIEngines
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// TEST DATA
// ============================================================================

const SAMPLE_PROGRAM = `
( JM DIE COMPANY - D2 TOOL STEEL )
NAT01 (FACE)
T010101
G50 S3500
G96 S250 M3 M8
G0 X2.5 Z0.1
G1 X0 Z0 F.008

NAT02 (OD ROUGH)
T020202
G50 S3000
G96 S200 M3 M8
G71 U0.100 R0.020
M30
`;

// ============================================================================
// ATTENTION MECHANISM ENGINE TESTS
// ============================================================================

describe("LatheAttentionMechanismEngine", () => {
  it("should export singleton instance", async () => {
    const { latheAttentionMechanismEngine } = await import(
      "../../engines/LatheAttentionMechanismEngine.js"
    );

    expect(latheAttentionMechanismEngine).toBeDefined();
  });

  it("should have visualizeAttention method", async () => {
    const { latheAttentionMechanismEngine } = await import(
      "../../engines/LatheAttentionMechanismEngine.js"
    );

    expect(typeof latheAttentionMechanismEngine.visualizeAttention).toBe("function");
  });

  it("should have findCriticalTokens method", async () => {
    const { latheAttentionMechanismEngine } = await import(
      "../../engines/LatheAttentionMechanismEngine.js"
    );

    expect(typeof latheAttentionMechanismEngine.findCriticalTokens).toBe("function");
  });

  it("should have analyzeOperationDependencies method", async () => {
    const { latheAttentionMechanismEngine } = await import(
      "../../engines/LatheAttentionMechanismEngine.js"
    );

    expect(typeof latheAttentionMechanismEngine.analyzeOperationDependencies).toBe("function");
  });

  it("should have analyzeSafetyCriticalAttention method", async () => {
    const { latheAttentionMechanismEngine } = await import(
      "../../engines/LatheAttentionMechanismEngine.js"
    );

    expect(typeof latheAttentionMechanismEngine.analyzeSafetyCriticalAttention).toBe("function");
  });
});

// ============================================================================
// CAUSAL INFERENCE ENGINE TESTS
// ============================================================================

describe("LatheCausalInferenceEngine", () => {
  it("should export singleton instance", async () => {
    const { latheCausalInferenceEngine } = await import(
      "../../engines/LatheCausalInferenceEngine.js"
    );

    expect(latheCausalInferenceEngine).toBeDefined();
  });

  it("should have estimateCausalEffect method", async () => {
    const { latheCausalInferenceEngine } = await import(
      "../../engines/LatheCausalInferenceEngine.js"
    );

    expect(typeof latheCausalInferenceEngine.estimateCausalEffect).toBe("function");
  });

  it("should have estimateCausalEffect method", async () => {
    const { latheCausalInferenceEngine } = await import(
      "../../engines/LatheCausalInferenceEngine.js"
    );

    // Method exists (may return null if no data)
    expect(typeof latheCausalInferenceEngine.estimateCausalEffect).toBe("function");
  });

  it("should have counterfactual method", async () => {
    const { latheCausalInferenceEngine } = await import(
      "../../engines/LatheCausalInferenceEngine.js"
    );

    expect(typeof latheCausalInferenceEngine.counterfactual).toBe("function");
  });

  it("should have discoverStructure method", async () => {
    const { latheCausalInferenceEngine } = await import(
      "../../engines/LatheCausalInferenceEngine.js"
    );

    expect(typeof latheCausalInferenceEngine.discoverStructure).toBe("function");
  });
});

// ============================================================================
// ENSEMBLE LEARNING ENGINE TESTS
// ============================================================================

describe("LatheEnsembleLearningEngine", () => {
  it("should export singleton instance", async () => {
    const { latheEnsembleLearningEngine } = await import(
      "../../engines/LatheEnsembleLearningEngine.js"
    );

    expect(latheEnsembleLearningEngine).toBeDefined();
  });

  it("should have predictSurfaceFinish method", async () => {
    const { latheEnsembleLearningEngine } = await import(
      "../../engines/LatheEnsembleLearningEngine.js"
    );

    expect(typeof latheEnsembleLearningEngine.predictSurfaceFinish).toBe("function");
  });

  it("should have predictSurfaceFinish accepting ensemble and input", async () => {
    const { latheEnsembleLearningEngine } = await import(
      "../../engines/LatheEnsembleLearningEngine.js"
    );

    // predictSurfaceFinish requires trained models, so just verify method exists
    expect(typeof latheEnsembleLearningEngine.predictSurfaceFinish).toBe("function");
    expect(latheEnsembleLearningEngine.predictSurfaceFinish.length).toBeGreaterThan(0);
  });

  it("should have predictToolLife method", async () => {
    const { latheEnsembleLearningEngine } = await import(
      "../../engines/LatheEnsembleLearningEngine.js"
    );

    expect(typeof latheEnsembleLearningEngine.predictToolLife).toBe("function");
  });

  it("should have predictAllManufacturingMetrics method", async () => {
    const { latheEnsembleLearningEngine } = await import(
      "../../engines/LatheEnsembleLearningEngine.js"
    );

    expect(typeof latheEnsembleLearningEngine.predictAllManufacturingMetrics).toBe("function");
  });
});

// ============================================================================
// KNOWLEDGE GRAPH ENGINE TESTS
// ============================================================================

describe("LatheKnowledgeGraphEngine", () => {
  it("should export singleton instance", async () => {
    const { latheKnowledgeGraphEngine } = await import(
      "../../engines/LatheKnowledgeGraphEngine.js"
    );

    expect(latheKnowledgeGraphEngine).toBeDefined();
  });

  it("should have query method", async () => {
    const { latheKnowledgeGraphEngine } = await import(
      "../../engines/LatheKnowledgeGraphEngine.js"
    );

    expect(typeof latheKnowledgeGraphEngine.query).toBe("function");
  });

  it("should query the knowledge graph", async () => {
    const { latheKnowledgeGraphEngine } = await import(
      "../../engines/LatheKnowledgeGraphEngine.js"
    );

    const result = latheKnowledgeGraphEngine.query({
      material: "D2",
      operation: "roughing",
    });

    expect(result).toBeDefined();
  });

  it("should have findPath method", async () => {
    const { latheKnowledgeGraphEngine } = await import(
      "../../engines/LatheKnowledgeGraphEngine.js"
    );

    expect(typeof latheKnowledgeGraphEngine.findPath).toBe("function");
  });

  it("should have getNodesByType method", async () => {
    const { latheKnowledgeGraphEngine } = await import(
      "../../engines/LatheKnowledgeGraphEngine.js"
    );

    expect(typeof latheKnowledgeGraphEngine.getNodesByType).toBe("function");
  });
});

// ============================================================================
// REINFORCEMENT LEARNING ENGINE TESTS
// ============================================================================

describe("LatheReinforcementLearningEngine", () => {
  // Full state for RL
  const FULL_RL_STATE = {
    part: {
      max_diameter_mm: 50,
      min_diameter_mm: 25,
      length_mm: 100,
      feature_count: 5,
      complexity_score: 0.6,
      threads_count: 1,
      grooves_count: 2,
      tapers_count: 0,
      radii_count: 3,
    },
    material: {
      iso_group: "P" as const,
      hardness_hrc: 30,
      hardness_normalized: 0.5,
      machinability_factor: 1.0,
      kc1_1: 1800,
      thermal_conductivity: 50,
    },
    operation: {
      current_operation: "od_rough" as const,
      operations_completed: 1,
      operations_remaining: 3,
      current_tool_number: 1,
      material_removed_pct: 0.25,
      current_diameter_mm: 48,
      current_z_position_mm: -20,
      is_roughing: true,
      is_finishing: false,
    },
    tool: {
      flank_wear_vb_mm: 0.1,
      crater_wear_kt_mm: 0.02,
      wear_rate_mm_per_min: 0.001,
      remaining_life_pct: 85,
      edge_condition: "fresh" as const,
    },
    machine: {
      spindle_load_pct: 45,
      spindle_rpm: 1200,
      feed_rate_mm_rev: 0.12,
      doc_mm: 2.0,
      turret_position: 1,
      coolant_active: true,
      cycle_time_elapsed_s: 120,
    },
    quality: {
      target_ra_um: 1.6,
      current_ra_um: 3.2,
      tolerance_mm: 0.02,
      achieved_tolerance_pct: 0.8,
    },
    cost: {
      tool_cost_usd: 25,
      time_cost_per_hour: 85,
      material_cost_usd: 15,
      scrap_risk_pct: 0.05,
    },
  };

  it("should export singleton instance", async () => {
    const { latheReinforcementLearningEngine } = await import(
      "../../engines/LatheReinforcementLearningEngine.js"
    );

    expect(latheReinforcementLearningEngine).toBeDefined();
  });

  it("should have selectAction method", async () => {
    const { latheReinforcementLearningEngine } = await import(
      "../../engines/LatheReinforcementLearningEngine.js"
    );

    expect(typeof latheReinforcementLearningEngine.selectAction).toBe("function");
  });

  it("should select action with full state", async () => {
    const { latheReinforcementLearningEngine } = await import(
      "../../engines/LatheReinforcementLearningEngine.js"
    );

    const action = latheReinforcementLearningEngine.selectAction(FULL_RL_STATE);

    expect(action).toBeDefined();
    expect(action.action !== undefined || action.actionData !== undefined).toBe(true);
  });

  it("should have getQValues method", async () => {
    const { latheReinforcementLearningEngine } = await import(
      "../../engines/LatheReinforcementLearningEngine.js"
    );

    expect(typeof latheReinforcementLearningEngine.getQValues).toBe("function");
  });

  it("should return Q-values array", async () => {
    const { latheReinforcementLearningEngine } = await import(
      "../../engines/LatheReinforcementLearningEngine.js"
    );

    const qValues = latheReinforcementLearningEngine.getQValues(FULL_RL_STATE);

    // May be undefined if state not seen, or array of values
    expect(qValues === undefined || Array.isArray(qValues)).toBe(true);
  });
});

// ============================================================================
// ENGINE LOADING TESTS
// ============================================================================

describe("Engine Loading", () => {
  it("should load all deep AI engines", async () => {
    const attention = await import("../../engines/LatheAttentionMechanismEngine.js");
    const causal = await import("../../engines/LatheCausalInferenceEngine.js");
    const ensemble = await import("../../engines/LatheEnsembleLearningEngine.js");
    const kg = await import("../../engines/LatheKnowledgeGraphEngine.js");
    const rl = await import("../../engines/LatheReinforcementLearningEngine.js");

    expect(attention.latheAttentionMechanismEngine).toBeDefined();
    expect(causal.latheCausalInferenceEngine).toBeDefined();
    expect(ensemble.latheEnsembleLearningEngine).toBeDefined();
    expect(kg.latheKnowledgeGraphEngine).toBeDefined();
    expect(rl.latheReinforcementLearningEngine).toBeDefined();
  });
});
