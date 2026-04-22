/**
 * LathePrintToleranceStackEngine Tests — U-LTH35
 *
 * Coverage:
 * - Happy path: JM Die sample parts with GD&T
 * - Edge cases: empty features, missing tolerances, single feature
 * - Boundary: tight tolerances, budget limits
 * - Adversarial: NaN, Infinity, negative values, malformed GD&T
 * - Batch processing
 * - Validation
 * - Statistics
 *
 * Exit gates:
 * - Cpk target assigned for every feature
 * - Stack-up warnings when budget exceeded
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintToleranceStackEngine,
  LathePrintToleranceStackEngine,
  ToleranceStackOutputSchema,
  type ToleranceStackOutput,
} from "../engines/LathePrintToleranceStackEngine.js";
import type { RecognitionResult, RecognizedFeature } from "../engines/LatheTurningFeatureRecognizerEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createRecognitionResult(features: Partial<RecognizedFeature>[]): RecognitionResult {
  const fullFeatures: RecognizedFeature[] = features.map((f, i) => ({
    id: f.id || `F${i + 1}`,
    type: f.type || "od_turn",
    source_dim_ids: f.source_dim_ids || [`dim-${i}`],
    confidence: f.confidence ?? 0.9,
    ...f,
  } as RecognizedFeature));

  const countByType: Record<string, number> = {};
  for (const f of fullFeatures) {
    countByType[f.type] = (countByType[f.type] || 0) + 1;
  }

  return {
    features: fullFeatures,
    feature_count_by_type: countByType,
    unrecognized_dims: [],
    overall_confidence: 0.9,
    warnings: [],
    recognition_timestamp: new Date().toISOString(),
  };
}

const JM_DIE_SAMPLE_1: RecognitionResult = createRecognitionResult([
  {
    id: "F1",
    type: "face",
    start_z_mm: 0,
    end_z_mm: 0,
    tolerance_plus_mm: 0.02,
    tolerance_minus_mm: 0.02,
    gdt_requirements: [
      { symbol: "flatness", tolerance_mm: 0.01, datum_refs: [] },
    ],
  },
  {
    id: "F2",
    type: "od_turn",
    diameter_mm: 50.0,
    start_z_mm: 0,
    end_z_mm: 25,
    length_mm: 25,
    tolerance_plus_mm: 0.013,
    tolerance_minus_mm: 0.013,
    tolerance_class: "h7",
    gdt_requirements: [
      { symbol: "runout_circular", tolerance_mm: 0.025, datum_refs: ["A"] },
    ],
    critical_dimension: true,
  },
  {
    id: "F3",
    type: "id_bore",
    diameter_mm: 20.0,
    start_z_mm: 5,
    end_z_mm: 20,
    length_mm: 15,
    tolerance_plus_mm: 0.021,
    tolerance_minus_mm: 0,
    tolerance_class: "H7",
    gdt_requirements: [
      { symbol: "position", tolerance_mm: 0.05, datum_refs: ["A", "B"] },
      { symbol: "cylindricity", tolerance_mm: 0.015, datum_refs: [] },
    ],
  },
  {
    id: "F4",
    type: "thread_external",
    diameter_mm: 12.0,
    pitch_mm: 1.75,
    thread_class: "6g",
    start_z_mm: 25,
    end_z_mm: 35,
    gdt_requirements: [
      { symbol: "concentricity", tolerance_mm: 0.03, datum_refs: ["A", "B"] },
    ],
  },
]);

const JM_DIE_SAMPLE_2: RecognitionResult = createRecognitionResult([
  {
    id: "F1",
    type: "face",
    start_z_mm: 0,
    tolerance_plus_mm: 0.025,
    tolerance_minus_mm: 0.025,
  },
  {
    id: "F2",
    type: "od_turn",
    diameter_mm: 75.0,
    length_mm: 40,
    start_z_mm: 0,
    end_z_mm: 40,
    tolerance_plus_mm: 0.025,
    tolerance_minus_mm: 0.025,
  },
  {
    id: "F3",
    type: "groove_od",
    width_mm: 3.0,
    depth_mm: 2.0,
    start_z_mm: 30,
    tolerance_plus_mm: 0.05,
    tolerance_minus_mm: 0.05,
  },
]);

const TIGHT_TOLERANCE_SAMPLE: RecognitionResult = createRecognitionResult([
  {
    id: "F1",
    type: "od_turn",
    diameter_mm: 25.0,
    tolerance_plus_mm: 0.005,
    tolerance_minus_mm: 0.005,
    critical_dimension: true,
    gdt_requirements: [
      { symbol: "runout_total", tolerance_mm: 0.008, datum_refs: ["A"] },
    ],
  },
  {
    id: "F2",
    type: "id_bore",
    diameter_mm: 10.0,
    tolerance_plus_mm: 0.008,
    tolerance_minus_mm: 0,
    gdt_requirements: [
      { symbol: "position", tolerance_mm: 0.01, datum_refs: ["A", "B"] },
    ],
  },
]);

// ============================================================================
// HAPPY PATH TESTS
// ============================================================================

describe("LathePrintToleranceStackEngine — Happy Path", () => {
  it("propagates tolerances for JM Die sample 1 with GD&T", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);

    expect(result.feature_cpk_targets).toHaveLength(4);
    expect(result.datum_chains.length).toBeGreaterThanOrEqual(1);
    expect(result.timestamp).toBeDefined();
    expect(result.overall_process_capability).toBeDefined();

    // Every feature should have Cpk target assigned
    for (const target of result.feature_cpk_targets) {
      expect(target.cpk_target).toBeGreaterThanOrEqual(1.0);
      expect(target.cpk_minimum).toBe(1.0);
      expect(target.tolerance_total_mm).toBeGreaterThan(0);
    }
  });

  it("propagates tolerances for JM Die sample 2 without GD&T", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_2);

    expect(result.feature_cpk_targets).toHaveLength(3);
    // Should create default datum chain
    expect(result.datum_chains.length).toBeGreaterThanOrEqual(1);
    expect(result.datum_chains[0].id).toContain("default");
  });

  it("identifies critical dimensions correctly", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);

    const criticalFeatures = result.feature_cpk_targets.filter(t => t.is_critical);
    expect(criticalFeatures.length).toBeGreaterThanOrEqual(2); // F2 (explicit) + F3/F4 (position GD&T)

    // Critical features should have higher Cpk target
    for (const critical of criticalFeatures) {
      expect(critical.cpk_target).toBeGreaterThanOrEqual(1.33);
    }
  });

  it("builds datum chains from GD&T references", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);

    // Should have chains for A and A-B datum references
    const chainIds = result.datum_chains.map(c => c.id);
    expect(chainIds.some(id => id.includes("A") || id.includes("default"))).toBe(true);
  });

  it("performs tolerance stack analysis", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);

    // Should have stack analyses for grouped features
    if (result.stack_analyses.length > 0) {
      for (const stack of result.stack_analyses) {
        expect(stack.worst_case_tolerance_mm).toBeGreaterThanOrEqual(stack.rss_tolerance_mm);
        expect(stack.critical_contributors.length).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("LathePrintToleranceStackEngine — Edge Cases", () => {
  it("handles empty features array", () => {
    const emptyResult = createRecognitionResult([]);
    const result = lathePrintToleranceStackEngine.propagate(emptyResult);

    expect(result.feature_cpk_targets).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.overall_process_capability).toBe("achievable");
  });

  it("handles single feature without GD&T", () => {
    const singleFeature = createRecognitionResult([
      { id: "F1", type: "od_turn", diameter_mm: 30, tolerance_plus_mm: 0.05, tolerance_minus_mm: 0.05 },
    ]);
    const result = lathePrintToleranceStackEngine.propagate(singleFeature);

    expect(result.feature_cpk_targets).toHaveLength(1);
    expect(result.feature_cpk_targets[0].tolerance_total_mm).toBe(0.1);
  });

  it("handles features with missing tolerances (uses default)", () => {
    const noTolerance = createRecognitionResult([
      { id: "F1", type: "od_turn", diameter_mm: 30 },
    ]);
    const result = lathePrintToleranceStackEngine.propagate(noTolerance);

    expect(result.feature_cpk_targets[0].tolerance_total_mm).toBe(0.05); // Default
  });

  it("handles empty GD&T arrays", () => {
    const emptyGdt = createRecognitionResult([
      { id: "F1", type: "od_turn", gdt_requirements: [] },
    ]);
    const result = lathePrintToleranceStackEngine.propagate(emptyGdt);

    expect(result.feature_cpk_targets).toHaveLength(1);
    expect(result.datum_chains.length).toBeGreaterThanOrEqual(1);
  });

  it("handles features with only plus tolerance", () => {
    const plusOnly = createRecognitionResult([
      { id: "F1", type: "id_bore", tolerance_plus_mm: 0.021, tolerance_minus_mm: 0 },
    ]);
    const result = lathePrintToleranceStackEngine.propagate(plusOnly);

    expect(result.feature_cpk_targets[0].tolerance_total_mm).toBe(0.021);
  });
});

// ============================================================================
// BOUNDARY CONDITIONS
// ============================================================================

describe("LathePrintToleranceStackEngine — Boundary Conditions", () => {
  it("flags ultra-precision for very tight tolerances", () => {
    const result = lathePrintToleranceStackEngine.propagate(TIGHT_TOLERANCE_SAMPLE);

    const ultraPrecision = result.feature_cpk_targets.filter(
      t => t.process_capability_class === "ultra-precision"
    );
    expect(ultraPrecision.length).toBeGreaterThanOrEqual(1);
  });

  it("generates warning when budget exceeded", () => {
    const tightBudget = lathePrintToleranceStackEngine.propagate(
      JM_DIE_SAMPLE_1,
      { tolerance_budget_mm: 0.01 } // Very tight budget
    );

    // Should have budget warnings
    const budgetWarnings = tightBudget.warnings.filter(
      w => w.code.includes("BUDGET")
    );
    expect(budgetWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it("respects custom Cpk target", () => {
    const highCpk = lathePrintToleranceStackEngine.propagate(
      JM_DIE_SAMPLE_2,
      { target_cpk: 2.0 }
    );

    for (const target of highCpk.feature_cpk_targets) {
      expect(target.cpk_target).toBeGreaterThanOrEqual(2.0);
    }
  });

  it("handles process class standard", () => {
    const standard = lathePrintToleranceStackEngine.propagate(
      JM_DIE_SAMPLE_2,
      { process_class: "standard" }
    );

    expect(standard.feature_cpk_targets).toHaveLength(3);
    // Standard class should be achievable for loose tolerances
    expect(standard.overall_process_capability).toBe("achievable");
  });

  it("handles tolerance at exact budget limit", () => {
    const atLimit = createRecognitionResult([
      {
        id: "F1",
        type: "od_turn",
        tolerance_plus_mm: 0.05,
        tolerance_minus_mm: 0.05,
        gdt_requirements: [
          { symbol: "position", tolerance_mm: 0, datum_refs: ["A"] },
        ],
      },
    ]);

    const result = lathePrintToleranceStackEngine.propagate(atLimit, {
      tolerance_budget_mm: 0.1,
    });

    // Should not exceed budget
    expect(result.datum_chains[0].violationLevel).not.toBe("critical");
  });
});

// ============================================================================
// ADVERSARIAL INPUTS
// ============================================================================

describe("LathePrintToleranceStackEngine — Adversarial Inputs", () => {
  it("handles NaN tolerance values", () => {
    const nanTolerance = createRecognitionResult([
      { id: "F1", type: "od_turn", tolerance_plus_mm: NaN, tolerance_minus_mm: 0.01 },
    ]);

    const result = lathePrintToleranceStackEngine.propagate(nanTolerance);
    expect(result.feature_cpk_targets).toHaveLength(1);
    // Should use fallback calculation
    expect(Number.isFinite(result.feature_cpk_targets[0].tolerance_total_mm)).toBe(true);
  });

  it("handles Infinity tolerance values", () => {
    const infTolerance = createRecognitionResult([
      { id: "F1", type: "od_turn", tolerance_plus_mm: Infinity, tolerance_minus_mm: 0.01 },
    ]);

    const result = lathePrintToleranceStackEngine.propagate(infTolerance);
    expect(result.feature_cpk_targets).toHaveLength(1);
  });

  it("handles negative tolerance values (takes absolute)", () => {
    const negativeTol = createRecognitionResult([
      { id: "F1", type: "od_turn", tolerance_plus_mm: -0.05, tolerance_minus_mm: -0.05 },
    ]);

    const result = lathePrintToleranceStackEngine.propagate(negativeTol);
    expect(result.feature_cpk_targets[0].tolerance_total_mm).toBe(0.1);
  });

  it("handles malformed GD&T with null datum_refs", () => {
    const malformedGdt = createRecognitionResult([
      {
        id: "F1",
        type: "od_turn",
        gdt_requirements: [
          { symbol: "position", tolerance_mm: 0.05, datum_refs: null as unknown as string[] },
        ],
      },
    ]);

    // Should not throw
    expect(() => lathePrintToleranceStackEngine.propagate(malformedGdt)).not.toThrow();
  });

  it("handles unknown GD&T symbol", () => {
    const unknownSymbol = createRecognitionResult([
      {
        id: "F1",
        type: "od_turn",
        gdt_requirements: [
          { symbol: "unknown_gdt_symbol", tolerance_mm: 0.05, datum_refs: ["A"] },
        ],
      },
    ]);

    const result = lathePrintToleranceStackEngine.propagate(unknownSymbol);
    expect(result.feature_cpk_targets).toHaveLength(1);
  });

  it("handles zero tolerance budget", () => {
    const result = lathePrintToleranceStackEngine.propagate(
      JM_DIE_SAMPLE_1,
      { tolerance_budget_mm: 0 }
    );

    // Should flag violations
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles extremely large tolerance values", () => {
    const largeTol = createRecognitionResult([
      { id: "F1", type: "od_turn", tolerance_plus_mm: 1000, tolerance_minus_mm: 1000 },
    ]);

    const result = lathePrintToleranceStackEngine.propagate(largeTol);
    expect(result.feature_cpk_targets[0].tolerance_total_mm).toBe(2000);
    expect(result.feature_cpk_targets[0].process_capability_class).toBe("standard");
  });
});

// ============================================================================
// BATCH PROCESSING
// ============================================================================

describe("LathePrintToleranceStackEngine — Batch Processing", () => {
  it("batch processes multiple recognition results", () => {
    const results = lathePrintToleranceStackEngine.batchPropagate([
      JM_DIE_SAMPLE_1,
      JM_DIE_SAMPLE_2,
      TIGHT_TOLERANCE_SAMPLE,
    ]);

    expect(results).toHaveLength(3);
    expect(results[0].feature_cpk_targets).toHaveLength(4);
    expect(results[1].feature_cpk_targets).toHaveLength(3);
    expect(results[2].feature_cpk_targets).toHaveLength(2);
  });

  it("batch applies consistent options", () => {
    const results = lathePrintToleranceStackEngine.batchPropagate(
      [JM_DIE_SAMPLE_1, JM_DIE_SAMPLE_2],
      { target_cpk: 1.67, process_class: "precision" }
    );

    for (const result of results) {
      for (const target of result.feature_cpk_targets) {
        expect(target.cpk_target).toBeGreaterThanOrEqual(1.67);
      }
    }
  });
});

// ============================================================================
// VALIDATION
// ============================================================================

describe("LathePrintToleranceStackEngine — Validation", () => {
  it("validates correct output", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);
    const validation = lathePrintToleranceStackEngine.validate(result);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("output passes Zod schema validation", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);
    const parsed = ToleranceStackOutputSchema.safeParse(result);

    expect(parsed.success).toBe(true);
  });

  it("detects invalid Cpk below minimum", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);
    // Manually corrupt for test
    const corrupted: ToleranceStackOutput = {
      ...result,
      feature_cpk_targets: result.feature_cpk_targets.map(t => ({
        ...t,
        cpk_target: 0.5, // Below minimum
      })),
    };

    const validation = lathePrintToleranceStackEngine.validate(corrupted);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes("below minimum"))).toBe(true);
  });
});

// ============================================================================
// STATISTICS
// ============================================================================

describe("LathePrintToleranceStackEngine — Statistics", () => {
  it("calculates stack statistics", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);
    const stats = lathePrintToleranceStackEngine.getStackStats(result);

    expect(stats.total_features).toBe(4);
    expect(stats.critical_features).toBeGreaterThanOrEqual(2);
    expect(stats.avg_cpk_target).toBeGreaterThanOrEqual(1.33);
    expect(stats.min_cpk_target).toBeGreaterThanOrEqual(1.0);
    expect(stats.total_tolerance_budget_consumed).toBeGreaterThan(0);
  });

  it("handles empty result statistics", () => {
    const emptyResult = createRecognitionResult([]);
    const result = lathePrintToleranceStackEngine.propagate(emptyResult);
    const stats = lathePrintToleranceStackEngine.getStackStats(result);

    expect(stats.total_features).toBe(0);
    expect(stats.avg_cpk_target).toBe(0);
    expect(stats.min_cpk_target).toBe(0);
  });
});

// ============================================================================
// EXIT GATES
// ============================================================================

describe("LathePrintToleranceStackEngine — Exit Gates", () => {
  it("EXIT GATE: Cpk target assigned for every feature", () => {
    const testCases = [JM_DIE_SAMPLE_1, JM_DIE_SAMPLE_2, TIGHT_TOLERANCE_SAMPLE];

    for (const testCase of testCases) {
      const result = lathePrintToleranceStackEngine.propagate(testCase);

      expect(result.feature_cpk_targets.length).toBe(testCase.features.length);

      for (const target of result.feature_cpk_targets) {
        expect(target.cpk_target).toBeGreaterThanOrEqual(1.0);
        expect(target.featureId).toBeDefined();
        expect(target.tolerance_total_mm).toBeGreaterThan(0);
      }
    }
  });

  it("EXIT GATE: Stack-up warnings when budget exceeded", () => {
    // Force budget violation with very tight budget
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1, {
      tolerance_budget_mm: 0.001, // Impossibly tight
    });

    const budgetWarnings = result.warnings.filter(w =>
      w.code === "DATUM_BUDGET_EXCEEDED" || w.code === "STACK_BUDGET_EXCEEDED"
    );

    expect(budgetWarnings.length).toBeGreaterThan(0);
    expect(budgetWarnings[0].level).toBe("critical");
  });

  it("EXIT GATE: All datum chains have valid structure", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);

    for (const chain of result.datum_chains) {
      expect(chain.id).toBeDefined();
      expect(chain.totalBudget_mm).toBeGreaterThan(0);
      expect(chain.consumedBudget_mm).toBeGreaterThanOrEqual(0);
      expect(["none", "warning", "critical"]).toContain(chain.violationLevel);
    }
  });

  it("EXIT GATE: Process capability classification assigned", () => {
    const result = lathePrintToleranceStackEngine.propagate(TIGHT_TOLERANCE_SAMPLE);

    for (const target of result.feature_cpk_targets) {
      expect(["standard", "precision", "ultra-precision"]).toContain(
        target.process_capability_class
      );
    }
  });
});

// ============================================================================
// DISPATCHER INTEGRATION
// ============================================================================

describe("LathePrintToleranceStackEngine — Dispatcher Integration", () => {
  it("engine is exported as singleton", () => {
    expect(lathePrintToleranceStackEngine).toBeInstanceOf(LathePrintToleranceStackEngine);
  });

  it("class is exported for type checking", () => {
    expect(LathePrintToleranceStackEngine).toBeDefined();
  });

  it("dispatcher ACTIONS includes all tolerance stack actions", async () => {
    const { ACTIONS } = await import("../tools/dispatchers/camDispatcher.js");

    expect(ACTIONS).toContain("lathe_p2p_tolerance_propagate");
    expect(ACTIONS).toContain("lathe_p2p_tolerance_batch");
    expect(ACTIONS).toContain("lathe_p2p_tolerance_stats");
    expect(ACTIONS).toContain("lathe_p2p_tolerance_validate");
  });

  it("lathe_p2p_tolerance_propagate round-trip via engine", () => {
    const result = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1, {
      tolerance_budget_mm: 0.1,
      target_cpk: 1.33,
      process_class: "precision",
    });

    expect(result.feature_cpk_targets).toHaveLength(4);
    expect(result.datum_chains.length).toBeGreaterThanOrEqual(1);
    expect(result.timestamp).toBeDefined();
    expect(result.overall_process_capability).toBeDefined();
  });

  it("lathe_p2p_tolerance_batch round-trip via engine", () => {
    const results = lathePrintToleranceStackEngine.batchPropagate(
      [JM_DIE_SAMPLE_1, JM_DIE_SAMPLE_2],
      { target_cpk: 1.67 }
    );

    expect(results).toHaveLength(2);
    expect(results[0].feature_cpk_targets).toHaveLength(4);
    expect(results[1].feature_cpk_targets).toHaveLength(3);
  });

  it("lathe_p2p_tolerance_stats round-trip via engine", () => {
    const propagateResult = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);
    const stats = lathePrintToleranceStackEngine.getStackStats(propagateResult);

    expect(stats.total_features).toBe(4);
    expect(stats.critical_features).toBeGreaterThanOrEqual(2);
    expect(stats.avg_cpk_target).toBeGreaterThanOrEqual(1.33);
  });

  it("lathe_p2p_tolerance_validate round-trip via engine", () => {
    const propagateResult = lathePrintToleranceStackEngine.propagate(JM_DIE_SAMPLE_1);
    const validation = lathePrintToleranceStackEngine.validate(propagateResult);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
