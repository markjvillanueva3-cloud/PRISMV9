/**
 * LatheActiveLearningEngine Tests
 * ================================
 * Comprehensive tests for active learning algorithms.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheActiveLearningEngine,
  latheActiveLearningEngine,
  type LatheDataPoint,
  type QueryStrategy,
  type OperatorFeedback,
} from "../engines/LatheActiveLearningEngine.js";

// ============================================================================
// TEST DATA
// ============================================================================

function createMockDataPoint(id: string, overrides: Partial<LatheDataPoint> = {}): LatheDataPoint {
  return {
    id,
    timestamp: new Date().toISOString(),
    material_iso: "P",
    hardness_hrc: 35,
    diameter_mm: 50,
    length_mm: 100,
    l_d_ratio: 2,
    operation: "roughing",
    tool_nose_radius_mm: 0.8,
    tool_lead_angle_deg: 45,
    insert_grade: "GC4325",
    machine_power_kw: 15,
    rigidity_factor: 0.8,
    is_labeled: false,
    ...overrides,
  };
}

function createLabeledDataPoint(
  id: string,
  quality: 0 | 1 | 2 | 3,
  overrides: Partial<LatheDataPoint> = {}
): LatheDataPoint {
  return createMockDataPoint(id, {
    quality_class: quality,
    is_labeled: true,
    labeled_by: "expert",
    label_confidence: 0.9,
    ...overrides,
  });
}

function generatePool(n: number): LatheDataPoint[] {
  const points: LatheDataPoint[] = [];
  const operations: LatheDataPoint["operation"][] = [
    "roughing", "finishing", "threading", "grooving"
  ];
  const materials: LatheDataPoint["material_iso"][] = ["P", "M", "K", "N"];

  for (let i = 0; i < n; i++) {
    points.push(createMockDataPoint(`pool_${i}`, {
      material_iso: materials[i % materials.length],
      operation: operations[i % operations.length],
      hardness_hrc: 20 + (i % 40),
      diameter_mm: 20 + (i % 100),
      l_d_ratio: 1 + (i % 10),
      rigidity_factor: 0.3 + (i % 7) * 0.1,
    }));
  }
  return points;
}

function generateLabeledData(n: number): LatheDataPoint[] {
  const points: LatheDataPoint[] = [];
  for (let i = 0; i < n; i++) {
    const quality = (i % 4) as 0 | 1 | 2 | 3;
    points.push(createLabeledDataPoint(`labeled_${i}`, quality, {
      material_iso: i % 2 === 0 ? "P" : "M",
      hardness_hrc: 25 + (i % 30),
      diameter_mm: 30 + (i % 70),
    }));
  }
  return points;
}

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Initialization", () => {
  let engine: LatheActiveLearningEngine;

  beforeEach(() => {
    engine = new LatheActiveLearningEngine();
  });

  it("should initialize with labeled data", () => {
    const labeled = generateLabeledData(20);
    const pool = generatePool(50);

    engine.initialize(labeled, pool);

    expect(engine.getLabeledSize()).toBe(20);
    expect(engine.getPoolSize()).toBe(50);
    expect(engine.getCommitteeSize()).toBe(5);
  });

  it("should create a diverse committee", () => {
    const labeled = generateLabeledData(30);
    engine.initialize(labeled);

    expect(engine.getCommitteeSize()).toBeGreaterThan(0);
    expect(engine.getModelError()).toBeLessThan(2);  // Reasonable error
  });

  it("should handle empty initialization", () => {
    engine.initialize([]);

    expect(engine.getLabeledSize()).toBe(0);
    expect(engine.getPoolSize()).toBe(0);
  });

  it("should set budget correctly", () => {
    const labeled = generateLabeledData(10);
    engine.initialize(labeled, [], {
      total_budget: 100,
      cost_per_sample: 50,
    });

    const budget = engine.getBudget();
    expect(budget.total_budget).toBe(100);
    expect(budget.cost_per_sample).toBe(50);
  });
});

// ============================================================================
// QUERY STRATEGY TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Query Strategies", () => {
  let engine: LatheActiveLearningEngine;

  beforeEach(() => {
    engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(30);
    const pool = generatePool(100);
    engine.initialize(labeled, pool);
  });

  it("should select samples with uncertainty sampling", () => {
    const result = engine.selectSamples(undefined, 10, "uncertainty_sampling");

    expect(result.selected_ids.length).toBe(10);
    expect(result.scores.length).toBe(10);
    expect(result.strategy_used).toBe("uncertainty_sampling");
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("should select samples with margin sampling", () => {
    const result = engine.selectSamples(undefined, 10, "margin_sampling");

    expect(result.selected_ids.length).toBe(10);
    expect(result.strategy_used).toBe("margin_sampling");
  });

  it("should select samples with entropy sampling", () => {
    const result = engine.selectSamples(undefined, 10, "entropy_sampling");

    expect(result.selected_ids.length).toBe(10);
    expect(result.strategy_used).toBe("entropy_sampling");
  });

  it("should select samples with query-by-committee", () => {
    const result = engine.selectSamples(undefined, 10, "query_by_committee");

    expect(result.selected_ids.length).toBe(10);
    expect(result.strategy_used).toBe("query_by_committee");
  });

  it("should select samples with expected model change", () => {
    const result = engine.selectSamples(undefined, 10, "expected_model_change");

    expect(result.selected_ids.length).toBe(10);
    expect(result.strategy_used).toBe("expected_model_change");
  });

  it("should select samples with BALD", () => {
    const result = engine.selectSamples(undefined, 10, "bald");

    expect(result.selected_ids.length).toBe(10);
    expect(result.strategy_used).toBe("bald");
  });

  it("should select samples with core-set", () => {
    const result = engine.selectSamples(undefined, 10, "core_set");

    expect(result.selected_ids.length).toBe(10);
    expect(result.strategy_used).toBe("core_set");
    expect(result.reasoning).toContain("Core-set: Selected points maximizing coverage of feature space");
  });

  it("should select samples with hybrid strategy", () => {
    const result = engine.selectSamples(undefined, 10, "hybrid");

    expect(result.selected_ids.length).toBe(10);
    expect(result.strategy_used).toBe("hybrid");
    expect(result.reasoning.some(r => r.includes("Hybrid"))).toBe(true);
  });

  it("should return unique samples", () => {
    const result = engine.selectSamples(undefined, 20, "uncertainty_sampling");

    const uniqueIds = new Set(result.selected_ids);
    expect(uniqueIds.size).toBe(result.selected_ids.length);
  });

  it("should handle empty pool", () => {
    const emptyEngine = new LatheActiveLearningEngine();
    emptyEngine.initialize(generateLabeledData(10), []);

    const result = emptyEngine.selectSamples(undefined, 10, "uncertainty_sampling");

    expect(result.selected_ids.length).toBe(0);
    expect(result.reasoning).toContain("Pool is empty");
  });
});

// ============================================================================
// BATCH SELECTION TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Batch Selection", () => {
  let engine: LatheActiveLearningEngine;

  beforeEach(() => {
    engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(30);
    const pool = generatePool(100);
    engine.initialize(labeled, pool);
  });

  it("should select diverse batches with BatchBALD", () => {
    const result = engine.selectSamples(undefined, 15, "batch_bald");

    expect(result.selected_ids.length).toBe(15);
    expect(result.strategy_used).toBe("batch_bald");
    expect(result.reasoning.some(r => r.includes("BatchBALD"))).toBe(true);
  });

  it("should balance diversity and uncertainty in hybrid selection", () => {
    const result = engine.selectSamples(undefined, 10, "hybrid");

    // Check that batch has diversity metric
    expect(result.reasoning.some(r => r.includes("diversity"))).toBe(true);
    expect(result.reasoning.some(r => r.includes("uncertainty"))).toBe(true);
  });

  it("should provide greedy gain per sample", () => {
    const result = engine.selectSamples(undefined, 10, "batch_bald");

    // Greedy gains should generally decrease
    for (let i = 1; i < result.scores.length; i++) {
      // Allow some variation but first samples should generally be more informative
      expect(result.scores[0]).toBeGreaterThan(result.scores[result.scores.length - 1] * 0.1);
    }
  });
});

// ============================================================================
// MODEL UPDATE TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Model Updates", () => {
  let engine: LatheActiveLearningEngine;

  beforeEach(() => {
    engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(20);
    const pool = generatePool(100);
    engine.initialize(labeled, pool);
  });

  it("should update model with new samples", () => {
    const initialError = engine.getModelError();
    const initialLabeledSize = engine.getLabeledSize();

    // Add new labeled samples
    const newSamples = [
      createLabeledDataPoint("new_1", 3, { material_iso: "P", hardness_hrc: 30 }),
      createLabeledDataPoint("new_2", 2, { material_iso: "M", hardness_hrc: 40 }),
    ];

    const result = engine.updateModel(newSamples);

    expect(result.samples_added).toBe(2);
    expect(engine.getLabeledSize()).toBe(initialLabeledSize + 2);
    expect(result.previous_error).toBe(initialError);
    expect(result.convergence_status).toBeDefined();
  });

  it("should track feature importance changes", () => {
    const newSamples = [
      createLabeledDataPoint("new_1", 3, { hardness_hrc: 55 }),
      createLabeledDataPoint("new_2", 0, { hardness_hrc: 60 }),
    ];

    const result = engine.updateModel(newSamples);

    expect(result.feature_importance_change).toBeInstanceOf(Map);
    // Should have some feature importance data
    expect(result.feature_importance_change.size).toBeGreaterThan(0);
  });

  it("should update budget after adding samples", () => {
    const initialBudget = engine.getBudget();
    const newSamples = [
      createLabeledDataPoint("new_1", 2),
      createLabeledDataPoint("new_2", 3),
      createLabeledDataPoint("new_3", 1),
    ];

    engine.updateModel(newSamples);

    const newBudget = engine.getBudget();
    expect(newBudget.spent).toBe(initialBudget.spent + 3);
    expect(newBudget.remaining).toBe(initialBudget.remaining - 3);
    expect(newBudget.experiments_completed).toBe(initialBudget.experiments_completed + 3);
  });

  it("should detect convergence status", () => {
    // Add many consistent samples
    const newSamples = Array.from({ length: 20 }, (_, i) =>
      createLabeledDataPoint(`batch_${i}`, (i % 4) as 0 | 1 | 2 | 3, {
        hardness_hrc: 30 + i,
      })
    );

    const result = engine.updateModel(newSamples);

    expect(["converging", "stable", "diverging"]).toContain(result.convergence_status);
  });
});

// ============================================================================
// UNCERTAINTY QUERY TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Uncertainty Queries", () => {
  let engine: LatheActiveLearningEngine;

  beforeEach(() => {
    engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(30);
    const pool = generatePool(50);
    engine.initialize(labeled, pool);
  });

  it("should return uncertainty scores for all pool samples", () => {
    const scores = engine.queryUncertainty();

    expect(scores.size).toBe(50);
    for (const [id, score] of scores) {
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });

  it("should return QBC scores for all pool samples", () => {
    const scores = engine.queryByCommittee();

    expect(scores.size).toBe(50);
    for (const [id, score] of scores) {
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });

  it("should calculate information metrics for samples", () => {
    const pool = generatePool(20);
    engine.initialize(generateLabeledData(30), pool);

    const metrics = engine.getInformationMetrics(pool[0].id);

    expect(metrics).not.toBeNull();
    expect(metrics!.mutual_information).toBeGreaterThanOrEqual(0);
    expect(metrics!.bald_score).toBeDefined();
    expect(metrics!.information_gain).toBeDefined();
  });
});

// ============================================================================
// EXPERIMENT SUGGESTION TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Experiment Suggestions", () => {
  let engine: LatheActiveLearningEngine;

  beforeEach(() => {
    engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(30);
    const pool = generatePool(100);
    engine.initialize(labeled, pool, { total_budget: 50 });
  });

  it("should suggest experiments within budget", () => {
    const suggestions = engine.suggestExperiments();

    expect(suggestions.length).toBeLessThanOrEqual(50);
    for (const s of suggestions) {
      expect(s.id).toBeDefined();
      expect(s.parameters).toBeDefined();
      expect(s.expected_information_gain).toBeGreaterThanOrEqual(0);
      expect(["critical", "high", "medium", "low"]).toContain(s.priority);
    }
  });

  it("should include boundary experiments", () => {
    // Add samples to create a clear boundary
    const labeled = [
      createLabeledDataPoint("success_1", 3, { hardness_hrc: 30 }),
      createLabeledDataPoint("success_2", 3, { hardness_hrc: 32 }),
      createLabeledDataPoint("failure_1", 0, { hardness_hrc: 50 }),
      createLabeledDataPoint("failure_2", 0, { hardness_hrc: 52 }),
    ];

    engine.initialize(labeled, generatePool(100));
    const suggestions = engine.suggestExperiments();

    // Should have some suggestions
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("should prioritize high-information experiments", () => {
    const suggestions = engine.suggestExperiments();

    if (suggestions.length > 1) {
      // Critical and high priority should come first
      const criticalHighCount = suggestions.filter(
        s => s.priority === "critical" || s.priority === "high"
      ).length;

      // First few should be higher priority
      const firstFew = suggestions.slice(0, 5);
      const firstFewCriticalHigh = firstFew.filter(
        s => s.priority === "critical" || s.priority === "high"
      ).length;

      expect(firstFewCriticalHigh).toBeGreaterThanOrEqual(
        Math.min(criticalHighCount, 3)
      );
    }
  });

  it("should provide reasoning for each suggestion", () => {
    const suggestions = engine.suggestExperiments();

    for (const s of suggestions) {
      expect(s.reasoning).toBeDefined();
      expect(s.reasoning.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// HUMAN-IN-THE-LOOP TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Human-in-the-Loop", () => {
  let engine: LatheActiveLearningEngine;

  beforeEach(() => {
    engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(30);
    const pool = generatePool(50);
    engine.initialize(labeled, pool);
  });

  it("should generate expert queries for uncertain samples", () => {
    const queries = engine.generateExpertQueries(5);

    expect(queries.length).toBeLessThanOrEqual(5);
    for (const q of queries) {
      expect(q.query_id).toBeDefined();
      expect(q.query_type).toBeDefined();
      expect(q.question).toBeDefined();
      expect(q.importance).toBeGreaterThanOrEqual(0);
    }
  });

  it("should process operator feedback", () => {
    // First add a labeled sample
    const sample = createLabeledDataPoint("feedback_test", 2);
    engine.updateModel([sample]);

    const feedback: OperatorFeedback = {
      experiment_id: "feedback_test",
      operator_id: "op_001",
      timestamp: new Date().toISOString(),
      actual_quality: 3,
      observations: ["Surface finish better than expected"],
      anomalies_noted: [],
      confidence: 0.9,
    };

    const result = engine.processOperatorFeedback(feedback);

    expect(result.updated_label).toBeDefined();
    expect(result.updated_confidence).toBeGreaterThan(0);
    expect(result.source).toBeDefined();
  });

  it("should assess label quality", () => {
    const labeled = generateLabeledData(20);
    engine.initialize(labeled, []);

    const feedbackHistory = new Map<string, OperatorFeedback[]>();
    // Add some consistent feedback
    feedbackHistory.set("labeled_0", [
      {
        experiment_id: "labeled_0",
        operator_id: "op_001",
        timestamp: new Date().toISOString(),
        actual_quality: 0,
        observations: [],
        anomalies_noted: [],
        confidence: 0.8,
      },
    ]);

    const assessments = engine.assessAllLabels(feedbackHistory);

    expect(assessments.length).toBe(20);
    for (const a of assessments) {
      expect(a.point_id).toBeDefined();
      expect(a.label_quality).toBeGreaterThanOrEqual(0);
      expect(a.label_quality).toBeLessThanOrEqual(1);
      expect(["accept", "review", "reject"]).toContain(a.recommendation);
    }
  });

  it("should calibrate model confidence", () => {
    const labeled = generateLabeledData(50);
    const pool = generatePool(50);
    engine.initialize(labeled, pool);

    const calibration = engine.calibrateModelConfidence();

    expect(calibration.slope).toBeDefined();
    expect(calibration.intercept).toBeDefined();
    expect(calibration.reliability_score).toBeGreaterThanOrEqual(0);
    expect(calibration.reliability_score).toBeLessThanOrEqual(1);
    expect(calibration.recommendation).toBeDefined();
  });
});

// ============================================================================
// STATE EXPORT TESTS
// ============================================================================

describe("LatheActiveLearningEngine - State Export", () => {
  it("should export engine state for persistence", () => {
    const engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(20);
    const pool = generatePool(50);
    engine.initialize(labeled, pool);

    const state = engine.exportState();

    expect(state.labeled_ids.length).toBe(20);
    expect(state.pool_ids.length).toBe(50);
    expect(state.model_error).toBeGreaterThanOrEqual(0);
    expect(state.budget).toBeDefined();
    expect(state.committee_weights.length).toBe(5);
  });
});

// ============================================================================
// SINGLETON TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Singleton", () => {
  it("should export singleton instance", () => {
    expect(latheActiveLearningEngine).toBeInstanceOf(LatheActiveLearningEngine);
  });

  it("should be reusable across initializations", () => {
    latheActiveLearningEngine.initialize(generateLabeledData(10));
    expect(latheActiveLearningEngine.getLabeledSize()).toBe(10);

    latheActiveLearningEngine.initialize(generateLabeledData(20));
    expect(latheActiveLearningEngine.getLabeledSize()).toBe(20);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Edge Cases", () => {
  let engine: LatheActiveLearningEngine;

  beforeEach(() => {
    engine = new LatheActiveLearningEngine();
  });

  it("should handle single sample in pool", () => {
    engine.initialize(generateLabeledData(10), generatePool(1));

    const result = engine.selectSamples(undefined, 5, "uncertainty_sampling");

    expect(result.selected_ids.length).toBe(1);
  });

  it("should handle requesting more samples than available", () => {
    engine.initialize(generateLabeledData(10), generatePool(5));

    const result = engine.selectSamples(undefined, 100, "uncertainty_sampling");

    expect(result.selected_ids.length).toBeLessThanOrEqual(5);
  });

  it("should handle all same material", () => {
    const pool = Array.from({ length: 20 }, (_, i) =>
      createMockDataPoint(`same_${i}`, { material_iso: "P" })
    );

    engine.initialize(generateLabeledData(10), pool);
    const result = engine.selectSamples(undefined, 5, "core_set");

    expect(result.selected_ids.length).toBe(5);
  });

  it("should handle extreme parameter values", () => {
    const extremePool = [
      createMockDataPoint("extreme_1", { hardness_hrc: 70, l_d_ratio: 20 }),
      createMockDataPoint("extreme_2", { hardness_hrc: 15, l_d_ratio: 0.5 }),
    ];

    engine.initialize(generateLabeledData(10), extremePool);
    const suggestions = engine.suggestExperiments();

    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("should handle zero budget", () => {
    engine.initialize(generateLabeledData(10), generatePool(50), {
      total_budget: 0,
      remaining: 0,
    });

    const suggestions = engine.suggestExperiments();

    expect(suggestions.length).toBe(0);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Performance", () => {
  it("should handle large pools efficiently", () => {
    const engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(100);
    const pool = generatePool(1000);

    const startTime = Date.now();
    engine.initialize(labeled, pool);
    const initTime = Date.now() - startTime;

    expect(initTime).toBeLessThan(5000);  // Should initialize in < 5s

    const selectStart = Date.now();
    const result = engine.selectSamples(undefined, 50, "hybrid");
    const selectTime = Date.now() - selectStart;

    expect(selectTime).toBeLessThan(2000);  // Should select in < 2s
    expect(result.selected_ids.length).toBe(50);
  });

  it("should perform incremental updates efficiently", () => {
    const engine = new LatheActiveLearningEngine();
    engine.initialize(generateLabeledData(100), generatePool(500));

    const updateTimes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      engine.updateModel([
        createLabeledDataPoint(`update_${i}`, (i % 4) as 0 | 1 | 2 | 3),
      ]);
      updateTimes.push(Date.now() - startTime);
    }

    // Each update should be relatively fast
    const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
    expect(avgUpdateTime).toBeLessThan(1000);  // < 1s per update
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("LatheActiveLearningEngine - Integration", () => {
  it("should run full active learning loop", () => {
    const engine = new LatheActiveLearningEngine();

    // Initial labeled data (small)
    const initialLabeled = generateLabeledData(10);
    const pool = generatePool(100);
    engine.initialize(initialLabeled, pool, { total_budget: 30 });

    const iterations = 5;
    const errorsOverTime: number[] = [];

    for (let i = 0; i < iterations; i++) {
      errorsOverTime.push(engine.getModelError());

      // Select samples
      const selection = engine.selectSamples(undefined, 5, "hybrid");
      expect(selection.selected_ids.length).toBeGreaterThan(0);

      // Simulate labeling (in practice, this would be real experiments)
      const newLabeled = selection.selected_ids.map((id, idx) => {
        const point = pool.find(p => p.id === id)!;
        return createLabeledDataPoint(`new_${i}_${idx}`, (idx % 4) as 0 | 1 | 2 | 3, {
          material_iso: point.material_iso,
          hardness_hrc: point.hardness_hrc,
        });
      });

      // Update model
      const updateResult = engine.updateModel(newLabeled);
      expect(updateResult.samples_added).toBeGreaterThan(0);
    }

    // Model should have learned
    expect(engine.getLabeledSize()).toBeGreaterThan(initialLabeled.length);
    expect(engine.getBudget().spent).toBeGreaterThan(0);
  });

  it("should integrate operator feedback into learning", () => {
    const engine = new LatheActiveLearningEngine();
    const labeled = generateLabeledData(20);
    engine.initialize(labeled, generatePool(50));

    // Add sample and get feedback
    const sample = createLabeledDataPoint("feedback_sample", 2);
    engine.updateModel([sample]);

    // Operator disagrees
    const feedback: OperatorFeedback = {
      experiment_id: "feedback_sample",
      operator_id: "op_expert",
      timestamp: new Date().toISOString(),
      actual_quality: 3,
      actual_surface_ra: 0.8,
      observations: ["Excellent surface finish achieved"],
      anomalies_noted: [],
      confidence: 0.95,
    };

    const result = engine.processOperatorFeedback(feedback);

    // Should adjust toward operator's assessment
    expect(result.updated_label).toBeGreaterThan(2);
    expect(result.source).toBeDefined();
  });
});
