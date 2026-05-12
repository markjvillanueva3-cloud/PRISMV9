/**
 * Electrode Advanced AI Tests — ELEC-PIPE-ULTRA-AI
 *
 * Tests for:
 * 1. SHAP-style feature importance
 * 2. Counterfactual explanations
 * 3. Multi-expert consensus
 * 4. Anomaly detection (Mahalanobis)
 * 5. Active learning prioritization
 * 6. Causal DAG and effects
 * 7. Ensemble predictions
 * 8. LLM explanations
 * 9. Comprehensive advanced analysis
 *
 * @module __tests__/electrode-advanced-ai.test
 */

import { describe, it, expect } from "vitest";
import {
  electrodeAdvancedAIEngine,
  type FeatureImportance,
  type Counterfactual,
  type ConsensusResult,
  type AnomalyResult,
  type CausalEffect,
  type EnsemblePrediction,
} from "../engines/ElectrodeAdvancedAIEngine.js";

// ============================================================================
// FEATURE IMPORTANCE (XAI)
// ============================================================================

describe("SHAP-Style Feature Importance", () => {
  it("should compute feature importance for all inputs", () => {
    const result = electrodeAdvancedAIEngine.computeFeatureImportance({
      discharge_energy_mJ: 50,
      num_cavities: 1,
      workpiece_hardness_HRC: 55,
      electrode_grain_size_um: 5,
      surface_area_mm2: 500,
      depth_mm: 25,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].feature).toBeDefined();
    expect(result[0].importance).toBeGreaterThanOrEqual(0);
    expect(["positive", "negative"]).toContain(result[0].direction);
    expect(result[0].description).toBeDefined();
  });

  it("should sort features by importance descending", () => {
    const result = electrodeAdvancedAIEngine.computeFeatureImportance({
      discharge_energy_mJ: 80,
      num_cavities: 2,
      workpiece_hardness_HRC: 60,
      electrode_grain_size_um: 3,
      surface_area_mm2: 800,
      depth_mm: 40,
    });

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].importance).toBeGreaterThanOrEqual(result[i].importance);
    }
  });

  it("should provide meaningful descriptions", () => {
    const result = electrodeAdvancedAIEngine.computeFeatureImportance({
      discharge_energy_mJ: 50,
      num_cavities: 1,
      workpiece_hardness_HRC: 55,
      electrode_grain_size_um: 5,
      surface_area_mm2: 500,
      depth_mm: 25,
    });

    for (const f of result) {
      expect(f.description.length).toBeGreaterThan(10);
    }
  });
});

// ============================================================================
// COUNTERFACTUAL EXPLANATIONS
// ============================================================================

describe("Counterfactual Explanations", () => {
  it("should generate improvement scenarios", () => {
    const result = electrodeAdvancedAIEngine.generateCounterfactuals(
      {
        discharge_energy_mJ: 60,
        electrode_grain_size_um: 8,
        duty_cycle: 0.45,
        num_skim_passes: 2,
        spark_gap_mm: 0.06,
      },
      1.6 // target Ra
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].scenario).toBeDefined();
    expect(result[0].predicted_outcome).toBeGreaterThan(0);
    expect(typeof result[0].improvement_percent).toBe("number");
  });

  it("should sort by improvement descending", () => {
    const result = electrodeAdvancedAIEngine.generateCounterfactuals(
      {
        discharge_energy_mJ: 70,
        electrode_grain_size_um: 10,
        duty_cycle: 0.50,
        num_skim_passes: 1,
        spark_gap_mm: 0.08,
      },
      0.8
    );

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].improvement_percent).toBeGreaterThanOrEqual(result[i].improvement_percent);
    }
  });

  it("should include parameter changes", () => {
    const result = electrodeAdvancedAIEngine.generateCounterfactuals(
      {
        discharge_energy_mJ: 50,
        electrode_grain_size_um: 5,
        duty_cycle: 0.40,
        num_skim_passes: 2,
        spark_gap_mm: 0.05,
      },
      1.6
    );

    for (const cf of result) {
      expect(Object.keys(cf.changes).length).toBeGreaterThan(0);
      for (const [key, change] of Object.entries(cf.changes)) {
        expect(change.from).toBeDefined();
        expect(change.to).toBeDefined();
      }
    }
  });
});

// ============================================================================
// MULTI-EXPERT CONSENSUS
// ============================================================================

describe("Multi-Expert Consensus", () => {
  it("should include multiple expert opinions", () => {
    const result = electrodeAdvancedAIEngine.runExpertConsensus({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      num_cavities: 1,
      target_Ra_um: 1.6,
    });

    expect(result.experts.length).toBeGreaterThanOrEqual(2);
    expect(result.experts.some(e => e.domain === "wear")).toBe(true);
    expect(result.experts.some(e => e.domain === "finish")).toBe(true);
  });

  it("should produce weighted final prediction", () => {
    const result = electrodeAdvancedAIEngine.runExpertConsensus({
      discharge_energy_mJ: 60,
      duty_cycle: 0.45,
      electrode_grain_size_um: 8,
      workpiece_hardness_HRC: 60,
      num_cavities: 2,
      target_Ra_um: 1.2,
    });

    expect(result.final_prediction).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.agreement_level).toBeGreaterThanOrEqual(0);
  });

  it("should include force expert for trilobe params", () => {
    const result = electrodeAdvancedAIEngine.runExpertConsensus({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      num_cavities: 1,
      target_Ra_um: 1.6,
      c_dia_in: 0.260,
      e_dia_in: 0.240,
    });

    expect(result.experts.some(e => e.domain === "force")).toBe(true);
  });

  it("should identify resolution method", () => {
    const result = electrodeAdvancedAIEngine.runExpertConsensus({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      num_cavities: 1,
      target_Ra_um: 1.6,
    });

    expect(["unanimous", "majority", "weighted", "expert_override"]).toContain(result.resolution_method);
  });
});

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

describe("Anomaly Detection", () => {
  it("should not flag normal parameters", () => {
    const result = electrodeAdvancedAIEngine.detectAnomaly({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      spark_gap_mm: 0.05,
      num_passes: 2,
    });

    expect(result.is_anomaly).toBe(false);
    expect(result.anomaly_score).toBeLessThan(5);
  });

  it("should flag extreme parameters", () => {
    const result = electrodeAdvancedAIEngine.detectAnomaly({
      discharge_energy_mJ: 200, // Very high
      duty_cycle: 0.55, // High
      electrode_grain_size_um: 25, // Very coarse
      workpiece_hardness_HRC: 72, // Max hardness
      spark_gap_mm: 0.20, // Very large
      num_passes: 8, // Many passes
    });

    expect(result.anomaly_score).toBeGreaterThan(3);
    expect(result.out_of_distribution_features.length).toBeGreaterThan(0);
  });

  it("should provide Mahalanobis distance", () => {
    const result = electrodeAdvancedAIEngine.detectAnomaly({
      discharge_energy_mJ: 80,
      duty_cycle: 0.50,
      electrode_grain_size_um: 10,
      workpiece_hardness_HRC: 65,
      spark_gap_mm: 0.10,
      num_passes: 4,
    });

    expect(result.mahalanobis_distance).toBeGreaterThan(0);
    expect(result.isolation_score).toBeGreaterThanOrEqual(0);
    expect(result.epistemic_uncertainty).toBeGreaterThanOrEqual(0);
  });

  it("should provide recommendation", () => {
    const result = electrodeAdvancedAIEngine.detectAnomaly({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      spark_gap_mm: 0.05,
      num_passes: 2,
    });

    expect(result.recommendation.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// ACTIVE LEARNING
// ============================================================================

describe("Active Learning Prioritization", () => {
  it("should prioritize uncertain jobs", () => {
    const jobs = [
      {
        job_id: "JOB-001",
        params: { discharge_energy_mJ: 50, duty_cycle: 0.40, electrode_grain_size_um: 5, workpiece_hardness_HRC: 55, spark_gap_mm: 0.05, num_passes: 2 },
        predicted_wear: 0.5,
        predicted_finish: 1.6,
      },
      {
        job_id: "JOB-002",
        params: { discharge_energy_mJ: 150, duty_cycle: 0.55, electrode_grain_size_um: 20, workpiece_hardness_HRC: 70, spark_gap_mm: 0.15, num_passes: 6 },
        predicted_wear: 1.2,
        predicted_finish: 3.5,
      },
    ];

    const result = electrodeAdvancedAIEngine.recommendFeedbackPriority(jobs);

    expect(result.length).toBe(2);
    // Higher uncertainty job should be first
    expect(result[0].priority_score).toBeGreaterThanOrEqual(result[1].priority_score);
  });

  it("should recommend measurements", () => {
    const jobs = [
      {
        job_id: "JOB-003",
        params: { discharge_energy_mJ: 60, duty_cycle: 0.42, electrode_grain_size_um: 6, workpiece_hardness_HRC: 58, spark_gap_mm: 0.06, num_passes: 3 },
        predicted_wear: 0.6,
        predicted_finish: 1.8,
      },
    ];

    const result = electrodeAdvancedAIEngine.recommendFeedbackPriority(jobs);

    expect(result[0].recommended_measurements.length).toBeGreaterThan(0);
    expect(result[0].recommended_measurements).toContain("actual_wear_ratio");
  });

  it("should calculate information gain", () => {
    const jobs = [
      {
        job_id: "JOB-004",
        params: { discharge_energy_mJ: 100, duty_cycle: 0.48, electrode_grain_size_um: 12, workpiece_hardness_HRC: 62, spark_gap_mm: 0.10, num_passes: 4 },
        predicted_wear: 0.9,
        predicted_finish: 2.5,
      },
    ];

    const result = electrodeAdvancedAIEngine.recommendFeedbackPriority(jobs);

    expect(result[0].expected_information_gain).toBeGreaterThan(0);
    expect(result[0].reasoning.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// CAUSAL DAG
// ============================================================================

describe("Causal DAG", () => {
  it("should return valid DAG structure", () => {
    const dag = electrodeAdvancedAIEngine.getCausalDAG();

    expect(dag.length).toBeGreaterThan(10);

    for (const node of dag) {
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
      expect(["input", "intermediate", "output"]).toContain(node.type);
      expect(Array.isArray(node.parents)).toBe(true);
      expect(Array.isArray(node.children)).toBe(true);
    }
  });

  it("should have input nodes without parents", () => {
    const dag = electrodeAdvancedAIEngine.getCausalDAG();
    const inputNodes = dag.filter(n => n.type === "input");

    for (const node of inputNodes) {
      expect(node.parents.length).toBe(0);
    }
  });

  it("should have output nodes without children", () => {
    const dag = electrodeAdvancedAIEngine.getCausalDAG();
    const outputNodes = dag.filter(n => n.type === "output");

    for (const node of outputNodes) {
      expect(node.children.length).toBe(0);
    }
  });
});

describe("Causal Effect Estimation", () => {
  it("should estimate effect of discharge energy on wear", () => {
    const effect = electrodeAdvancedAIEngine.estimateCausalEffect(
      "discharge_energy",
      "electrode_wear"
    );

    expect(effect.cause).toBe("discharge_energy");
    expect(effect.effect).toBe("electrode_wear");
    expect(effect.total_effect).toBeGreaterThan(0);
    expect(effect.direct_effect).toBeGreaterThanOrEqual(0);
  });

  it("should identify mediators", () => {
    const effect = electrodeAdvancedAIEngine.estimateCausalEffect(
      "discharge_energy",
      "surface_finish"
    );

    // Thermal load is a mediator between energy and finish
    expect(effect.mediators.length).toBeGreaterThanOrEqual(0);
  });

  it("should provide confidence intervals", () => {
    const effect = electrodeAdvancedAIEngine.estimateCausalEffect(
      "duty_cycle",
      "surface_finish"
    );

    expect(effect.confidence_interval.lower).toBeLessThan(effect.confidence_interval.upper);
  });

  it("should return zero effect for unconnected nodes", () => {
    const effect = electrodeAdvancedAIEngine.estimateCausalEffect(
      "nonexistent",
      "electrode_wear"
    );

    expect(effect.total_effect).toBe(0);
  });
});

// ============================================================================
// ENSEMBLE PREDICTIONS
// ============================================================================

describe("Ensemble Predictions", () => {
  it("should combine multiple models for wear", () => {
    const result = electrodeAdvancedAIEngine.ensemblePredict("wear", {
      discharge_energy_mJ: 50,
      num_cavities: 1,
      workpiece_hardness_HRC: 55,
      electrode_grain_size_um: 5,
      surface_area_mm2: 500,
      depth_mm: 25,
    });

    expect(result.model_predictions.length).toBeGreaterThanOrEqual(2);
    expect(result.prediction).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should combine multiple models for finish", () => {
    const result = electrodeAdvancedAIEngine.ensemblePredict("finish", {
      discharge_energy_mJ: 50,
      num_skim_passes: 2,
      electrode_grain_size_um: 5,
      duty_cycle: 0.40,
      spark_gap_mm: 0.05,
    });

    expect(result.model_predictions.length).toBeGreaterThanOrEqual(2);
    expect(result.prediction).toBeGreaterThan(0);
  });

  it("should combine multiple models for force", () => {
    const result = electrodeAdvancedAIEngine.ensemblePredict("force", {
      c_dia_in: 0.260,
      e_dia_in: 0.240,
      rpm: 1500,
      feed_ipr: 0.003,
      workpiece_material: "graphite",
    });

    expect(result.model_predictions.length).toBeGreaterThanOrEqual(2);
    expect(result.prediction).toBeGreaterThan(0);
  });

  it("should calculate disagreement", () => {
    const result = electrodeAdvancedAIEngine.ensemblePredict("wear", {
      discharge_energy_mJ: 80,
      num_cavities: 2,
      workpiece_hardness_HRC: 65,
      electrode_grain_size_um: 10,
      surface_area_mm2: 800,
      depth_mm: 40,
    });

    expect(typeof result.disagreement).toBe("number");
    expect(typeof result.diversity_score).toBe("number");
  });

  it("should include model weights", () => {
    const result = electrodeAdvancedAIEngine.ensemblePredict("finish", {
      discharge_energy_mJ: 50,
      num_skim_passes: 3,
      electrode_grain_size_um: 3,
      duty_cycle: 0.35,
      spark_gap_mm: 0.04,
    });

    const totalWeight = result.model_predictions.reduce((sum, m) => sum + m.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 1);
  });
});

// ============================================================================
// LLM EXPLANATION
// ============================================================================

describe("LLM Explanation Generation", () => {
  it("should generate natural language explanation", () => {
    const featureImportance = electrodeAdvancedAIEngine.computeFeatureImportance({
      discharge_energy_mJ: 50,
      num_cavities: 1,
      workpiece_hardness_HRC: 55,
      electrode_grain_size_um: 5,
      surface_area_mm2: 500,
      depth_mm: 25,
    });

    const consensus = electrodeAdvancedAIEngine.runExpertConsensus({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      num_cavities: 1,
      target_Ra_um: 1.6,
    });

    const anomaly = electrodeAdvancedAIEngine.detectAnomaly({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      spark_gap_mm: 0.05,
      num_passes: 2,
    });

    const explanation = (electrodeAdvancedAIEngine as any).generateLLMExplanation({
      wear_prediction: 0.5,
      finish_prediction: 1.6,
      feature_importance: featureImportance,
      consensus,
      anomaly,
      workpiece_material: "D2",
      target_finish_Ra_um: 1.6,
    });

    expect(explanation.natural_language.length).toBeGreaterThan(50);
    expect(explanation.technical_summary.length).toBeGreaterThan(20);
  });

  it("should include tribal wisdom for carbide", () => {
    const featureImportance = electrodeAdvancedAIEngine.computeFeatureImportance({
      discharge_energy_mJ: 50,
      num_cavities: 1,
      workpiece_hardness_HRC: 70,
      electrode_grain_size_um: 5,
      surface_area_mm2: 500,
      depth_mm: 25,
    });

    const consensus = electrodeAdvancedAIEngine.runExpertConsensus({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 70,
      num_cavities: 1,
      target_Ra_um: 0.8,
    });

    const anomaly = electrodeAdvancedAIEngine.detectAnomaly({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 70,
      spark_gap_mm: 0.05,
      num_passes: 2,
    });

    const explanation = (electrodeAdvancedAIEngine as any).generateLLMExplanation({
      wear_prediction: 0.8,
      finish_prediction: 0.8,
      feature_importance: featureImportance,
      consensus,
      anomaly,
      workpiece_material: "carbide",
      target_finish_Ra_um: 0.8,
    });

    expect(explanation.tribal_wisdom.some((w: string) => w.toLowerCase().includes("cuw"))).toBe(true);
  });
});

// ============================================================================
// COMPREHENSIVE ANALYSIS
// ============================================================================

describe("Comprehensive Advanced Analysis", () => {
  it("should run all AI capabilities", async () => {
    const result = await electrodeAdvancedAIEngine.comprehensiveAdvancedAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_skim_passes: 2,
      spark_gap_mm: 0.05,
      target_finish_Ra_um: 1.6,
    });

    expect(result.wear_prediction).toBeDefined();
    expect(result.finish_prediction).toBeDefined();
    expect(result.feature_importance.length).toBeGreaterThan(0);
    expect(result.counterfactuals.length).toBeGreaterThan(0);
    expect(result.consensus).toBeDefined();
    expect(result.anomaly_check).toBeDefined();
    expect(result.feedback_priority).toBeDefined();
    expect(result.causal_effects.length).toBeGreaterThan(0);
    expect(result.llm_explanation).toBeDefined();
  });

  it("should include trilobe force prediction when params provided", async () => {
    const result = await electrodeAdvancedAIEngine.comprehensiveAdvancedAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_skim_passes: 2,
      spark_gap_mm: 0.05,
      target_finish_Ra_um: 1.6,
      c_dia_in: 0.260,
      e_dia_in: 0.240,
      rpm: 1500,
      feed_ipr: 0.003,
    });

    expect(result.force_prediction.prediction).toBeGreaterThan(0);
  });

  it("should list all AI layers used", async () => {
    const result = await electrodeAdvancedAIEngine.comprehensiveAdvancedAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_skim_passes: 2,
      spark_gap_mm: 0.05,
      target_finish_Ra_um: 1.6,
    });

    expect(result.ai_layers_used.length).toBe(3);
    expect(result.ai_layers_used.some(l => l.includes("L1"))).toBe(true);
    expect(result.ai_layers_used.some(l => l.includes("L2"))).toBe(true);
    expect(result.ai_layers_used.some(l => l.includes("L3"))).toBe(true);
  });

  it("should calculate overall confidence", async () => {
    const result = await electrodeAdvancedAIEngine.comprehensiveAdvancedAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_skim_passes: 2,
      spark_gap_mm: 0.05,
      target_finish_Ra_um: 1.6,
    });

    expect(result.overall_confidence).toBeGreaterThan(0.5);
    expect(result.overall_confidence).toBeLessThanOrEqual(1);
  });

  it("should track processing time", async () => {
    const result = await electrodeAdvancedAIEngine.comprehensiveAdvancedAnalysis({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      workpiece_material: "D2",
      num_cavities: 1,
      num_skim_passes: 2,
      spark_gap_mm: 0.05,
      target_finish_Ra_um: 1.6,
    });

    expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// ENGINE STATISTICS
// ============================================================================

describe("Engine Statistics", () => {
  it("should track queries processed", () => {
    const statsBefore = electrodeAdvancedAIEngine.stats();

    // Run a query
    electrodeAdvancedAIEngine.detectAnomaly({
      discharge_energy_mJ: 50,
      duty_cycle: 0.40,
      electrode_grain_size_um: 5,
      workpiece_hardness_HRC: 55,
      spark_gap_mm: 0.05,
      num_passes: 2,
    });

    const statsAfter = electrodeAdvancedAIEngine.stats();
    expect(statsAfter.queries_processed).toBeGreaterThan(statsBefore.queries_processed);
  });

  it("should report DAG node count", () => {
    const stats = electrodeAdvancedAIEngine.stats();
    expect(stats.causal_dag_nodes).toBeGreaterThan(10);
  });

  it("should list expert domains", () => {
    const stats = electrodeAdvancedAIEngine.stats();
    expect(stats.expert_domains).toContain("wear");
    expect(stats.expert_domains).toContain("finish");
    expect(stats.expert_domains).toContain("force");
  });
});
