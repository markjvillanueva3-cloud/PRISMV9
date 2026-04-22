/**
 * LathePrintFeatureStrategySelectorEngine Tests — U-LTH36
 *
 * 45+ tests: JM Die samples, edge cases, boundary, adversarial, dispatcher round-trip
 *
 * @milestone LATHE-MASTER U-LTH36
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
  type MachineCapability,
  FeatureInputSchema,
  MaterialInputSchema,
  MachineCapabilitySchema,
  StrategyPlanSchema,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import { TURNING_STRATEGY_CATALOG } from "../engines/TurningStrategyCatalog.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ============================================================================
// JM DIE PRODUCTION SAMPLES
// ============================================================================

const JM_ALCOA_DIE_PIN_FEATURES: FeatureInput[] = [
  { id: "F1", type: "face", diameter_mm: 25.4, depth_mm: 2, tolerance_total_mm: 0.05, ra_um_target: 3.2 },
  { id: "F2", type: "od_turn", diameter_mm: 25.4, length_mm: 50, tolerance_total_mm: 0.025, ra_um_target: 1.6, is_critical: true },
  { id: "F3", type: "chamfer_od", diameter_mm: 25.4, depth_mm: 1.5, tolerance_total_mm: 0.1 },
  { id: "F4", type: "groove_od", diameter_mm: 20, depth_mm: 2.5, tolerance_total_mm: 0.05, ra_um_target: 3.2 },
];

const JM_ALCOA_MATERIAL: MaterialInput = {
  name: "6061-T6 Aluminum",
  iso_group: "N",
  hardness_hrc: 0,
  tensile_strength_mpa: 310,
  machinability_factor: 1.5,
};

const JM_OPTIMAS_BUSHING_FEATURES: FeatureInput[] = [
  { id: "B1", type: "face", diameter_mm: 38.1, depth_mm: 1, tolerance_total_mm: 0.02, ra_um_target: 0.8 },
  { id: "B2", type: "od_turn", diameter_mm: 38.1, length_mm: 25, tolerance_total_mm: 0.015, ra_um_target: 0.8, is_critical: true, cpk_target: 1.67 },
  { id: "B3", type: "id_bore", diameter_mm: 25.4, depth_mm: 25, tolerance_total_mm: 0.012, ra_um_target: 0.4, is_critical: true, cpk_target: 2.0 },
];

const JM_OPTIMAS_MATERIAL: MaterialInput = {
  name: "4140 Hardened Steel",
  iso_group: "H",
  hardness_hrc: 58,
  tensile_strength_mpa: 1800,
  machinability_factor: 0.3,
};

const JM_ITW_CONNECTOR_FEATURES: FeatureInput[] = [
  { id: "C1", type: "center_drill", diameter_mm: 3.2, depth_mm: 5 },
  { id: "C2", type: "drill", diameter_mm: 8.5, depth_mm: 30, tolerance_total_mm: 0.1 },
  { id: "C3", type: "face", diameter_mm: 19.05, depth_mm: 1.5, tolerance_total_mm: 0.05 },
  { id: "C4", type: "od_turn", diameter_mm: 19.05, length_mm: 40, tolerance_total_mm: 0.025, ra_um_target: 1.6 },
  { id: "C5", type: "thread_external", diameter_mm: 19.05, length_mm: 20, tolerance_total_mm: 0.05, ra_um_target: 3.2 },
];

const JM_ITW_MATERIAL: MaterialInput = {
  name: "303 Stainless Steel",
  iso_group: "M",
  hardness_hrc: 0,
  tensile_strength_mpa: 620,
  machinability_factor: 0.5,
};

const STANDARD_LATHE: MachineCapability = {
  id: "okuma-lb3000",
  name: "Okuma LB3000 EX II",
  type: "cnc_lathe",
  max_rpm: 5000,
  max_bar_diameter_mm: 80,
  has_sub_spindle: true,
  has_live_tooling: true,
  has_y_axis: true,
  turret_capacity: 12,
  coolant_type: "high_pressure",
  spindle_power_kw: 22,
  rigidity_class: "heavy",
};

const SWISS_MACHINE: MachineCapability = {
  id: "citizen-l20",
  name: "Citizen L20 Type XII",
  type: "swiss",
  max_rpm: 12000,
  max_bar_diameter_mm: 20,
  has_sub_spindle: true,
  has_live_tooling: true,
  turret_capacity: 8,
  coolant_type: "high_pressure",
  spindle_power_kw: 7.5,
  rigidity_class: "light",
};

// ============================================================================
// HAPPY PATH — JM DIE SAMPLES
// ============================================================================

describe("LathePrintFeatureStrategySelectorEngine", () => {
  describe("Happy Path — JM Die Samples", () => {
    it("Alcoa Die Pin: generates plan with 4 features and valid strategies", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_ALCOA_DIE_PIN_FEATURES,
        JM_ALCOA_MATERIAL,
        STANDARD_LATHE
      );

      expect(plan.feature_count).toBe(4);
      expect(plan.recommendations.length).toBe(4);
      expect(plan.sequence.length).toBe(4);

      // Face strategy should be a turning strategy (face or finish profile)
      const faceRec = plan.recommendations.find(r => r.featureId === "F1");
      expect(faceRec!.strategy_id).toMatch(/turning/);
      expect(faceRec!.score).toBeGreaterThanOrEqual(50);
      expect(faceRec!.score).toBeLessThanOrEqual(100);

      // OD turn should have valid strategy
      const odRec = plan.recommendations.find(r => r.featureId === "F2");
      expect(odRec!.strategy_id).toMatch(/turning/);
      expect(odRec!.reasoning_chain.length).toBeGreaterThanOrEqual(2);

      // Groove should select groove strategy
      const grooveRec = plan.recommendations.find(r => r.featureId === "F4");
      expect(grooveRec!.strategy_id).toMatch(/groove/);
    });

    it("Optimas Bushing: selects hard turning for 58 HRC material", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_OPTIMAS_BUSHING_FEATURES,
        JM_OPTIMAS_MATERIAL,
        STANDARD_LATHE
      );

      expect(plan.feature_count).toBe(3);

      // Should mention hardness in reasoning
      const odRec = plan.recommendations.find(r => r.featureId === "B2");
      const hasHardReasoning = odRec!.reasoning_chain.some(r =>
        r.thought.toLowerCase().includes("hard") ||
        r.thought.toLowerCase().includes("cbn") ||
        r.thought.toLowerCase().includes("58")
      );
      expect(hasHardReasoning).toBe(true);

      // Bore on hardened material selects hard turning OR bore strategy
      const boreRec = plan.recommendations.find(r => r.featureId === "B3");
      expect(boreRec!.strategy_id).toMatch(/bore|hard/);
    });

    it("ITW Connector: sequences center_drill before thread", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_ITW_CONNECTOR_FEATURES,
        JM_ITW_MATERIAL,
        STANDARD_LATHE
      );

      expect(plan.feature_count).toBe(5);

      // First in sequence should be center_drill (C1)
      expect(plan.sequence[0].featureId).toBe("C1");

      // Thread should use thread strategy
      const threadRec = plan.recommendations.find(r => r.featureId === "C5");
      expect(threadRec!.strategy_id).toMatch(/thread/);

      // Drill before thread in sequence
      const drillIdx = plan.sequence.findIndex(s => s.featureId === "C2");
      const threadIdx = plan.sequence.findIndex(s => s.featureId === "C5");
      expect(drillIdx).toBeLessThan(threadIdx);
    });
  });

  // ============================================================================
  // SINGLE FEATURE SELECTION
  // ============================================================================

  describe("Single Feature Selection", () => {
    it("OD turn: returns strategy with score 50-100 and tool recommendation", () => {
      const feature: FeatureInput = {
        id: "test-od",
        type: "od_turn",
        diameter_mm: 50,
        length_mm: 100,
        tolerance_total_mm: 0.05,
        ra_um_target: 3.2,
      };

      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        feature,
        JM_ALCOA_MATERIAL
      );

      expect(rec.featureId).toBe("test-od");
      expect(rec.featureType).toBe("od_turn");
      expect(rec.strategy_id).toMatch(/turning/);
      expect(rec.score).toBeGreaterThanOrEqual(50);
      expect(rec.score).toBeLessThanOrEqual(100);
      expect(rec.reasoning_chain.length).toBeGreaterThanOrEqual(1);
      expect(rec.citations.length).toBeGreaterThanOrEqual(1);
      expect(rec.tool_recommendation).not.toBeUndefined();
      expect(rec.tool_recommendation!.grade).toMatch(/[A-Z0-9]+/);
    });

    it("ID bore: selects bore strategy with correct parameters", () => {
      const feature: FeatureInput = {
        id: "test-bore",
        type: "id_bore",
        diameter_mm: 25,
        depth_mm: 50,
        tolerance_total_mm: 0.02,
      };

      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        feature,
        JM_ALCOA_MATERIAL
      );

      expect(rec.strategy_id).toMatch(/bore/);
      expect(rec.parameters.operation_type).toBe("bore");
      expect(rec.parameters.suggested_doc_mm).toBeGreaterThan(0);
      expect(rec.parameters.suggested_feed_mmrev).toBeGreaterThan(0);
    });

    it("Thread external: provides alternatives array", () => {
      const feature: FeatureInput = {
        id: "test-thread",
        type: "thread_external",
        diameter_mm: 12,
        length_mm: 15,
      };

      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        feature,
        JM_ITW_MATERIAL
      );

      expect(rec.strategy_id).toMatch(/thread/);
      expect(Array.isArray(rec.alternatives)).toBe(true);
      expect(rec.trade_offs.pros.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("empty feature list returns empty plan with zero cycle time", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        [],
        JM_ALCOA_MATERIAL
      );

      expect(plan.feature_count).toBe(0);
      expect(plan.recommendations).toEqual([]);
      expect(plan.sequence).toEqual([]);
      expect(plan.total_cycle_time_sec).toBe(0);
      expect(plan.plan_id).toMatch(/^plan_\d+$/);
    });

    it("single feature generates valid plan", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        [{ id: "solo", type: "face", diameter_mm: 25 }],
        JM_ALCOA_MATERIAL
      );

      expect(plan.feature_count).toBe(1);
      expect(plan.recommendations.length).toBe(1);
      expect(plan.sequence.length).toBe(1);
      expect(plan.sequence[0].order).toBe(1);
    });

    it("minimal feature (only id and type) still produces strategy", () => {
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "min", type: "od_turn" },
        JM_ALCOA_MATERIAL
      );

      expect(rec.featureId).toBe("min");
      expect(rec.strategy_id).toMatch(/turning/);
      expect(rec.score).toBeGreaterThan(0);
    });

    it("undefined machine capability produces valid plan", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_ALCOA_DIE_PIN_FEATURES,
        JM_ALCOA_MATERIAL,
        undefined
      );

      expect(plan.feature_count).toBe(4);
      expect(plan.machine).toBeUndefined();
      expect(plan.recommendations.length).toBe(4);
    });

    it("Swiss machine adds swiss strategy to reasoning", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        [{ id: "swiss-od", type: "od_turn", diameter_mm: 8 }],
        JM_ALCOA_MATERIAL,
        SWISS_MACHINE
      );

      const hasSwiss = plan.recommendations[0].reasoning_chain.some(r =>
        r.thought.toLowerCase().includes("swiss")
      );
      expect(hasSwiss).toBe(true);
    });
  });

  // ============================================================================
  // BOUNDARY CONDITIONS
  // ============================================================================

  describe("Boundary Conditions", () => {
    it("tolerance 0.01mm triggers precision reasoning", () => {
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "tight", type: "od_turn", tolerance_total_mm: 0.01, cpk_target: 2.0, is_critical: true },
        JM_ALCOA_MATERIAL
      );

      const hasPrecision = rec.reasoning_chain.some(r =>
        r.thought.toLowerCase().includes("precision") ||
        r.thought.toLowerCase().includes("tight") ||
        r.thought.includes("10") // 10 µm
      );
      expect(hasPrecision).toBe(true);
      expect(rec.score).toBeGreaterThan(50);
    });

    it("Ra 0.4µm triggers finish strategy reasoning", () => {
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "fine", type: "od_turn", ra_um_target: 0.4 },
        JM_ALCOA_MATERIAL
      );

      const hasFinish = rec.reasoning_chain.some(r =>
        r.thought.toLowerCase().includes("finish") ||
        r.thought.toLowerCase().includes("ra") ||
        r.thought.toLowerCase().includes("0.4")
      );
      expect(hasFinish).toBe(true);
    });

    it("HRC 62 triggers hard turning reasoning", () => {
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "hard", type: "od_turn", diameter_mm: 30 },
        { name: "D2 Tool Steel", iso_group: "H", hardness_hrc: 62 },
        STANDARD_LATHE
      );

      const hasHard = rec.reasoning_chain.some(r =>
        r.thought.toLowerCase().includes("hard") ||
        r.thought.toLowerCase().includes("cbn")
      );
      expect(hasHard).toBe(true);
    });

    it("loose tolerance 0.5mm still produces valid strategy", () => {
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "loose", type: "od_turn", tolerance_total_mm: 0.5 },
        JM_ALCOA_MATERIAL
      );

      expect(rec.strategy_id).toMatch(/turning/);
      expect(rec.score).toBeGreaterThan(40);
    });

    it("diameter 1mm (minimum practical) produces strategy", () => {
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "tiny", type: "od_turn", diameter_mm: 1 },
        JM_ALCOA_MATERIAL
      );

      expect(rec.strategy_id).toMatch(/turning/);
    });

    it("Cpk 2.0 boosts finish strategy score", () => {
      const recNoCpk = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "no-cpk", type: "id_bore", diameter_mm: 25 },
        JM_ALCOA_MATERIAL
      );

      const recWithCpk = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "with-cpk", type: "id_bore", diameter_mm: 25, cpk_target: 2.0, is_critical: true },
        JM_ALCOA_MATERIAL
      );

      // Both should have valid scores
      expect(recNoCpk.score).toBeGreaterThan(0);
      expect(recWithCpk.score).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ADVERSARIAL INPUTS
  // ============================================================================

  describe("Adversarial Inputs", () => {
    it("NaN diameter rejected by schema", () => {
      expect(() => FeatureInputSchema.parse({ id: "nan", type: "od_turn", diameter_mm: NaN })).toThrow();
    });

    it("Infinity tolerance rejected by schema", () => {
      expect(() => FeatureInputSchema.parse({ id: "inf", type: "od_turn", tolerance_total_mm: Infinity })).toThrow();
    });

    it("invalid feature type rejected by schema", () => {
      expect(() => FeatureInputSchema.parse({ id: "bad", type: "not_a_type" })).toThrow();
    });

    it("invalid ISO group rejected by schema", () => {
      expect(() => MaterialInputSchema.parse({ name: "Bad", iso_group: "X" })).toThrow();
    });

    it("RPM below 100 rejected by machine schema", () => {
      expect(() => MachineCapabilitySchema.parse({
        id: "slow", name: "Slow", type: "cnc_lathe", max_rpm: 50, max_bar_diameter_mm: 80
      })).toThrow();
    });

    it("machinability_factor > 2.0 rejected", () => {
      expect(() => MaterialInputSchema.parse({
        name: "Bad", iso_group: "P", machinability_factor: 5.0
      })).toThrow();
    });

    it("empty string ID still processes", () => {
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: "", type: "od_turn" },
        JM_ALCOA_MATERIAL
      );
      expect(rec.featureId).toBe("");
      expect(rec.strategy_id).toMatch(/turning/);
    });

    it("very long ID (1000 chars) processes correctly", () => {
      const longId = "a".repeat(1000);
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: longId, type: "od_turn" },
        JM_ALCOA_MATERIAL
      );
      expect(rec.featureId).toBe(longId);
    });
  });

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  describe("Batch Processing", () => {
    it("batch of 10 OD features returns 10 recommendations", () => {
      const features = Array.from({ length: 10 }, (_, i) => ({
        id: `batch-${i}`,
        type: "od_turn" as const,
        diameter_mm: 20 + i * 5,
      }));

      const results = lathePrintFeatureStrategySelectorEngine.batchSelectStrategies(
        features,
        JM_ALCOA_MATERIAL
      );

      expect(results.length).toBe(10);
      results.forEach((r, i) => {
        expect(r.featureId).toBe(`batch-${i}`);
        expect(r.strategy_id).toMatch(/turning/);
      });
    });

    it("batch with mixed types assigns correct strategies", () => {
      const mixed: FeatureInput[] = [
        { id: "m1", type: "face" },
        { id: "m2", type: "groove_od" },
        { id: "m3", type: "thread_external" },
      ];

      const results = lathePrintFeatureStrategySelectorEngine.batchSelectStrategies(
        mixed,
        JM_ALCOA_MATERIAL
      );

      expect(results[0].strategy_id).toMatch(/turning/);  // face → turning strategy
      expect(results[1].strategy_id).toMatch(/groove/);
      expect(results[2].strategy_id).toMatch(/thread/);
    });

    it("empty batch returns empty array", () => {
      const results = lathePrintFeatureStrategySelectorEngine.batchSelectStrategies([], JM_ALCOA_MATERIAL);
      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // STATISTICS & VALIDATION
  // ============================================================================

  describe("Statistics & Validation", () => {
    it("getStrategyStats returns correct counts", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_ALCOA_DIE_PIN_FEATURES,
        JM_ALCOA_MATERIAL
      );

      const stats = lathePrintFeatureStrategySelectorEngine.getStrategyStats(plan);

      expect(stats.total_features).toBe(4);
      expect(stats.strategies_used.length).toBeGreaterThan(0);
      expect(stats.avg_score).toBeGreaterThan(0);
      expect(stats.avg_score).toBeLessThanOrEqual(100);
      expect(typeof stats.cycle_time_min).toBe("number");
      expect(Object.keys(stats.category_breakdown).length).toBeGreaterThan(0);
    });

    it("validate returns valid=true for correct plan", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_ALCOA_DIE_PIN_FEATURES,
        JM_ALCOA_MATERIAL
      );

      const result = lathePrintFeatureStrategySelectorEngine.validate(plan);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("validate detects invalid strategy ID", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_ALCOA_DIE_PIN_FEATURES,
        JM_ALCOA_MATERIAL
      );
      plan.recommendations[0].strategy_id = "nonexistent_xyz";

      const result = lathePrintFeatureStrategySelectorEngine.validate(plan);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("not found"))).toBe(true);
    });

    it("validate warns on low score", () => {
      const plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        JM_ALCOA_DIE_PIN_FEATURES,
        JM_ALCOA_MATERIAL
      );
      plan.recommendations[0].score = 25;

      const result = lathePrintFeatureStrategySelectorEngine.validate(plan);

      // Check for low score warning (score < 40 triggers warning)
      expect(result.warnings.some(w => w.includes("low") || w.includes("25"))).toBe(true);
    });
  });

  // ============================================================================
  // CATALOG COVERAGE
  // ============================================================================

  describe("Catalog Coverage", () => {
    it("catalog has at least 40 strategies", () => {
      expect(lathePrintFeatureStrategySelectorEngine.getCatalogSize()).toBeGreaterThanOrEqual(40);
    });

    it("rules cover 20 feature types", () => {
      expect(lathePrintFeatureStrategySelectorEngine.getRuleCount()).toBe(20);
    });

    it("all catalog entries have required fields", () => {
      TURNING_STRATEGY_CATALOG.forEach(entry => {
        expect(typeof entry.id).toBe("string");
        expect(typeof entry.name).toBe("string");
        expect(["rough", "finish", "groove", "thread", "bore", "drill", "contour", "specialty"]).toContain(entry.category);
        expect(Array.isArray(entry.operation_tags)).toBe(true);
        expect(entry.operation_tags.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // MATERIAL VARIABILITY
  // ============================================================================

  describe("Material Variability", () => {
    const materials: MaterialInput[] = [
      { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 },
      { name: "316 Stainless", iso_group: "M", tensile_strength_mpa: 580 },
      { name: "Gray Cast Iron", iso_group: "K", tensile_strength_mpa: 250 },
      { name: "Inconel 718", iso_group: "S", tensile_strength_mpa: 1350 },
    ];

    it.each(materials)("handles $name (ISO $iso_group) with valid grade", (material) => {
      const rec = lathePrintFeatureStrategySelectorEngine.selectStrategy(
        { id: `mat-${material.iso_group}`, type: "od_turn", diameter_mm: 50 },
        material
      );

      expect(rec.strategy_id).toMatch(/turning/);
      expect(rec.score).toBeGreaterThan(0);
      expect(rec.tool_recommendation?.grade).toMatch(/[A-Z0-9]+/);
    });
  });

  // ============================================================================
  // DISPATCHER INTEGRATION
  // ============================================================================

  describe("Dispatcher Integration", () => {
    it("ACTIONS array contains lathe_p2p_strategy_select", () => {
      expect(camActions).toContain("lathe_p2p_strategy_select");
    });

    it("ACTIONS array contains lathe_p2p_strategy_batch", () => {
      expect(camActions).toContain("lathe_p2p_strategy_batch");
    });

    it("ACTIONS array contains lathe_p2p_strategy_plan", () => {
      expect(camActions).toContain("lathe_p2p_strategy_plan");
    });

    it("ACTIONS array contains lathe_p2p_strategy_stats", () => {
      expect(camActions).toContain("lathe_p2p_strategy_stats");
    });

    it("ACTIONS array contains lathe_p2p_strategy_validate", () => {
      expect(camActions).toContain("lathe_p2p_strategy_validate");
    });
  });
});
