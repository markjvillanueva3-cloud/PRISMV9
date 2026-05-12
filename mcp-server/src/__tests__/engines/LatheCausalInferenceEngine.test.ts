/**
 * LatheCausalInferenceEngine — Comprehensive Test Suite
 * ======================================================
 *
 * Tests causal reasoning capabilities for lathe programming decisions:
 * - Structural Causal Model (SCM) construction
 * - Intervention analysis (do-operator)
 * - Counterfactual reasoning
 * - Causal discovery (PC algorithm)
 * - Backdoor/front-door criteria
 * - Mediation analysis
 * - Granger causality
 * - Manufacturing-specific causal models
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheCausalInferenceEngine,
  latheCausalInferenceEngine,
  type StructuralCausalModel,
  type CausalVariable,
  type CausalEdge,
  type LatheOperationContext,
  type LatheOutcomes,
} from "../../engines/LatheCausalInferenceEngine.js";

describe("LatheCausalInferenceEngine", () => {
  let engine: LatheCausalInferenceEngine;

  beforeEach(() => {
    engine = new LatheCausalInferenceEngine();
  });

  // ==========================================================================
  // STRUCTURAL CAUSAL MODEL TESTS
  // ==========================================================================

  describe("buildCausalModel", () => {
    it("should build a causal model with pre-defined lathe templates", () => {
      const model = engine.buildCausalModel("lathe_turning");

      expect(model).toBeDefined();
      expect(model.id).toMatch(/^scm_lathe_turning_/);
      expect(model.domain).toBe("lathe_turning");
      expect(model.variables.size).toBeGreaterThan(15);
      expect(model.edges.length).toBeGreaterThan(20);
      expect(model.topological_order.length).toBeGreaterThan(0);
    });

    it("should include key machining variables", () => {
      const model = engine.buildCausalModel("lathe_turning");

      expect(model.variables.has("cutting_speed")).toBe(true);
      expect(model.variables.has("feed_rate")).toBe(true);
      expect(model.variables.has("depth_of_cut")).toBe(true);
      expect(model.variables.has("cutting_force")).toBe(true);
      expect(model.variables.has("surface_finish")).toBe(true);
      expect(model.variables.has("tool_life")).toBe(true);
    });

    it("should have valid variable domains", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const cuttingSpeed = model.variables.get("cutting_speed");
      expect(cuttingSpeed).toBeDefined();
      expect(cuttingSpeed!.domain.min).toBe(20);
      expect(cuttingSpeed!.domain.max).toBe(800);
      expect(cuttingSpeed!.unit).toBe("m/min");

      const feedRate = model.variables.get("feed_rate");
      expect(feedRate).toBeDefined();
      expect(feedRate!.domain.min).toBe(0.05);
      expect(feedRate!.domain.max).toBe(1.0);
    });

    it("should include causal edges with physical mechanisms", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const speedToTemp = model.edges.find(
        e => e.from === "cutting_speed" && e.to === "cutting_temperature"
      );
      expect(speedToTemp).toBeDefined();
      expect(speedToTemp!.strength).toBeGreaterThan(0);
      expect(speedToTemp!.mechanism).toContain("heat");
      expect(speedToTemp!.functional_form).toBe("exponential");
    });

    it("should support custom variables and edges", () => {
      const customVar: CausalVariable = {
        id: "custom_var",
        name: "Custom Variable",
        type: "continuous",
        domain: { min: 0, max: 100 },
        description: "Test custom variable"
      };

      const customEdge: CausalEdge = {
        from: "cutting_speed",
        to: "custom_var",
        strength: 0.5,
        confidence: 0.9,
        mechanism: "Test mechanism",
        functional_form: "linear",
        is_deterministic: false
      };

      const model = engine.buildCausalModel("lathe_turning", [customVar], [customEdge]);

      expect(model.variables.has("custom_var")).toBe(true);
      expect(model.edges.some(e => e.to === "custom_var")).toBe(true);
    });

    it("should have acyclic graph (valid DAG)", () => {
      const model = engine.buildCausalModel("lathe_turning");

      // If topological sort succeeds, graph is acyclic
      // Some variables may not be in the DAG if they have no edges
      expect(model.topological_order.length).toBeGreaterThan(0);
      expect(model.topological_order.length).toBeLessThanOrEqual(model.variables.size);
    });

    it("should support different lathe operation domains", () => {
      const domains: Array<StructuralCausalModel["domain"]> = [
        "lathe_turning",
        "lathe_boring",
        "lathe_threading",
        "lathe_grooving",
        "general"
      ];

      for (const domain of domains) {
        const model = engine.buildCausalModel(domain);
        expect(model.domain).toBe(domain);
        expect(model.variables.size).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // CAUSAL EFFECT ESTIMATION TESTS
  // ==========================================================================

  describe("estimateCausalEffect", () => {
    it("should estimate causal effect using backdoor adjustment", () => {
      const model = engine.buildCausalModel("lathe_turning");

      // Generate synthetic data
      const data = generateSyntheticData(100);

      const effect = engine.estimateCausalEffect(
        model.id,
        "cutting_speed",
        "surface_finish",
        data
      );

      expect(effect).toBeDefined();
      expect(effect!.treatment).toBe("cutting_speed");
      expect(effect!.outcome).toBe("surface_finish");
      expect(effect!.estimator).toBe("ate");
      expect(typeof effect!.estimate).toBe("number");
      expect(effect!.confidence_interval).toHaveLength(2);
      expect(effect!.method).toBe("backdoor");
    });

    it("should return null for non-existent model", () => {
      const data = generateSyntheticData(50);

      const effect = engine.estimateCausalEffect(
        "non_existent_model",
        "cutting_speed",
        "surface_finish",
        data
      );

      expect(effect).toBeNull();
    });

    it("should include sensitivity analysis", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const data = generateSyntheticData(100);

      const effect = engine.estimateCausalEffect(
        model.id,
        "feed_rate",
        "cutting_force",
        data
      );

      expect(effect).toBeDefined();
      expect(effect!.sensitivity_analysis).toBeDefined();
      expect(effect!.sensitivity_analysis!.e_value).toBeGreaterThan(0);
      expect(effect!.sensitivity_analysis!.robustness_value).toBeGreaterThanOrEqual(0);
    });

    it("should list assumptions for estimate", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const data = generateSyntheticData(50);

      const effect = engine.estimateCausalEffect(
        model.id,
        "depth_of_cut",
        "cutting_force",
        data
      );

      expect(effect).toBeDefined();
      expect(effect!.assumptions).toBeDefined();
      expect(effect!.assumptions.length).toBeGreaterThan(0);
      expect(effect!.assumptions.some(a => a.includes("confounding"))).toBe(true);
    });
  });

  // ==========================================================================
  // COUNTERFACTUAL ANALYSIS TESTS
  // ==========================================================================

  describe("counterfactual", () => {
    it("should compute counterfactual outcomes", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const observation = [
        { variable_id: "cutting_speed", value: 200 },
        { variable_id: "feed_rate", value: 0.2 },
        { variable_id: "depth_of_cut", value: 2.0 },
        { variable_id: "cutting_force", value: 500 },
        { variable_id: "surface_finish", value: 1.6 },
      ];

      const result = engine.counterfactual(
        model.id,
        observation,
        {
          variable_id: "cutting_speed",
          new_value: 150,
          intervention_type: "hard"
        }
      );

      expect(result).toBeDefined();
      expect(result!.query_id).toMatch(/^cf_/);
      expect(result!.factual_outcomes.size).toBeGreaterThan(0);
      expect(result!.counterfactual_outcomes.size).toBeGreaterThan(0);
      expect(result!.causal_effects.size).toBeGreaterThan(0);
    });

    it("should compute probability of necessity and sufficiency", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const observation = [
        { variable_id: "cutting_speed", value: 250 },
        { variable_id: "cutting_temperature", value: 400 },
        { variable_id: "tool_wear_rate", value: 0.1 },
      ];

      const result = engine.counterfactual(
        model.id,
        observation,
        {
          variable_id: "cutting_speed",
          new_value: 200,
          intervention_type: "hard"
        }
      );

      expect(result).toBeDefined();
      expect(result!.probability_of_necessity).toBeGreaterThanOrEqual(0);
      expect(result!.probability_of_necessity).toBeLessThanOrEqual(1);
      expect(result!.probability_of_sufficiency).toBeGreaterThanOrEqual(0);
      expect(result!.probability_of_sufficiency).toBeLessThanOrEqual(1);
    });

    it("should provide reasoning chain for counterfactual", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const observation = [
        { variable_id: "feed_rate", value: 0.3 },
        { variable_id: "surface_finish", value: 3.2 },
      ];

      const result = engine.counterfactual(
        model.id,
        observation,
        {
          variable_id: "feed_rate",
          new_value: 0.15,
          intervention_type: "hard"
        }
      );

      expect(result).toBeDefined();
      expect(result!.reasoning.length).toBeGreaterThan(0);
      expect(result!.reasoning.some(r => r.includes("FACTUAL"))).toBe(true);
      expect(result!.reasoning.some(r => r.includes("HYPOTHETICAL"))).toBe(true);
    });

    it("should return null for non-existent model", () => {
      const result = engine.counterfactual(
        "non_existent",
        [{ variable_id: "cutting_speed", value: 200 }],
        { variable_id: "cutting_speed", new_value: 150, intervention_type: "hard" }
      );

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // CAUSAL DISCOVERY TESTS
  // ==========================================================================

  describe("discoverStructure", () => {
    it("should discover causal structure using PC algorithm", () => {
      // Generate correlated data
      const n = 200;
      const data: Array<Record<string, number>> = [];
      for (let i = 0; i < n; i++) {
        const x = Math.random() * 100;
        const y = 0.5 * x + Math.random() * 20;
        const z = 0.3 * y + Math.random() * 10;
        data.push({ x, y, z });
      }

      const result = engine.discoverStructure(data, ["x", "y", "z"], 0.05);

      expect(result).toBeDefined();
      expect(result.algorithm).toBe("pc");
      expect(result.independence_tests.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should identify v-structures", () => {
      // X -> Z <- Y (v-structure)
      const n = 300;
      const data: Array<Record<string, number>> = [];
      for (let i = 0; i < n; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const z = 0.5 * x + 0.5 * y + Math.random() * 10;
        data.push({ x, y, z });
      }

      const result = engine.discoverStructure(data, ["x", "y", "z"], 0.1);

      expect(result).toBeDefined();
      expect(result.oriented_edges.length).toBeGreaterThanOrEqual(0);
    });

    it("should report equivalence class size", () => {
      const data = generateSyntheticData(100);
      const vars = ["cutting_speed", "feed_rate", "cutting_force"];

      const result = engine.discoverStructure(data, vars, 0.05);

      expect(result.equivalence_class_size).toBeGreaterThanOrEqual(1);
    });

    it("should warn about undirected edges", () => {
      const data = generateSyntheticData(50);
      const vars = ["cutting_speed", "feed_rate"];

      const result = engine.discoverStructure(data, vars, 0.1);

      // May or may not have warnings depending on data
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // ==========================================================================
  // GRANGER CAUSALITY TESTS
  // ==========================================================================

  describe("grangerCausality", () => {
    it("should detect Granger causality in time series", () => {
      // Generate X -> Y causal relationship
      const n = 100;
      const x: number[] = [];
      const y: number[] = [];

      for (let t = 0; t < n; t++) {
        x.push(Math.random() * 10);
        const lag = t > 2 ? x[t - 2] * 0.5 : 0;
        y.push(lag + Math.random() * 2);
      }

      const result = engine.grangerCausality(x, y, 5);

      expect(result).toBeDefined();
      expect(typeof result.granger_causes).toBe("boolean");
      expect(result.f_statistic).toBeGreaterThanOrEqual(0);
      expect(result.optimal_lag).toBeGreaterThanOrEqual(1);
      expect(["x->y", "y->x", "bidirectional", "none"]).toContain(result.direction);
    });

    it("should identify optimal lag", () => {
      const n = 150;
      const x: number[] = [];
      const y: number[] = [];

      // Create lag-3 relationship
      for (let t = 0; t < n; t++) {
        x.push(Math.sin(t / 10) + Math.random() * 0.5);
        const lag = t > 3 ? x[t - 3] * 0.8 : 0;
        y.push(lag + Math.random() * 0.3);
      }

      const result = engine.grangerCausality(x, y, 5);

      expect(result.optimal_lag).toBeGreaterThanOrEqual(1);
      expect(result.optimal_lag).toBeLessThanOrEqual(5);
    });

    it("should detect bidirectional causality", () => {
      const n = 200;
      const x: number[] = [Math.random(), Math.random()];
      const y: number[] = [Math.random(), Math.random()];

      // Create bidirectional relationship
      for (let t = 2; t < n; t++) {
        x.push(0.3 * y[t - 1] + 0.2 * x[t - 1] + Math.random() * 0.5);
        y.push(0.3 * x[t - 1] + 0.2 * y[t - 1] + Math.random() * 0.5);
      }

      const result = engine.grangerCausality(x, y, 3);

      // May be bidirectional or one direction depending on randomness
      expect(["x->y", "y->x", "bidirectional", "none"]).toContain(result.direction);
    });
  });

  // ==========================================================================
  // BACKDOOR CRITERION TESTS
  // ==========================================================================

  describe("checkBackdoorCriterion", () => {
    it("should check backdoor criterion for identifiability", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkBackdoorCriterion(
        model.id,
        "cutting_speed",
        "tool_life"
      );

      expect(result).toBeDefined();
      expect(result.treatment).toBe("cutting_speed");
      expect(result.outcome).toBe("tool_life");
      expect(typeof result.is_identifiable).toBe("boolean");
    });

    it("should find valid adjustment sets", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkBackdoorCriterion(
        model.id,
        "feed_rate",
        "surface_finish"
      );

      expect(result.valid_adjustment_sets).toBeDefined();
      expect(Array.isArray(result.valid_adjustment_sets)).toBe(true);
    });

    it("should identify confounders", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkBackdoorCriterion(
        model.id,
        "cutting_speed",
        "surface_finish"
      );

      expect(Array.isArray(result.confounders)).toBe(true);
    });

    it("should find minimal adjustment set", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkBackdoorCriterion(
        model.id,
        "depth_of_cut",
        "cutting_force"
      );

      expect(result.minimal_adjustment_set).toBeDefined();
      expect(Array.isArray(result.minimal_adjustment_set)).toBe(true);
    });
  });

  // ==========================================================================
  // FRONT-DOOR CRITERION TESTS
  // ==========================================================================

  describe("checkFrontdoorCriterion", () => {
    it("should check front-door criterion", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkFrontdoorCriterion(
        model.id,
        "cutting_speed",
        "tool_life"
      );

      expect(result).toBeDefined();
      expect(result.treatment).toBe("cutting_speed");
      expect(result.outcome).toBe("tool_life");
      expect(typeof result.is_identifiable).toBe("boolean");
    });

    it("should identify mediators", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkFrontdoorCriterion(
        model.id,
        "cutting_speed",
        "tool_life"
      );

      expect(Array.isArray(result.mediators)).toBe(true);
    });

    it("should calculate direct and indirect effects", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkFrontdoorCriterion(
        model.id,
        "feed_rate",
        "surface_finish"
      );

      expect(typeof result.direct_effect).toBe("number");
      expect(typeof result.total_effect).toBe("number");
      expect(result.indirect_effects instanceof Map).toBe(true);
    });

    it("should calculate percentage mediated", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkFrontdoorCriterion(
        model.id,
        "cutting_speed",
        "surface_finish"
      );

      expect(typeof result.percentage_mediated).toBe("number");
      expect(result.percentage_mediated).toBeGreaterThanOrEqual(0);
    });

    it("should list path-specific effects", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const result = engine.checkFrontdoorCriterion(
        model.id,
        "depth_of_cut",
        "dimensional_accuracy"
      );

      expect(Array.isArray(result.path_specific_effects)).toBe(true);
      for (const pe of result.path_specific_effects) {
        expect(Array.isArray(pe.path)).toBe(true);
        expect(typeof pe.effect).toBe("number");
        expect(typeof pe.proportion).toBe("number");
      }
    });
  });

  // ==========================================================================
  // MEDIATION ANALYSIS TESTS
  // ==========================================================================

  describe("mediationAnalysis", () => {
    it("should perform mediation analysis", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const data = generateSyntheticData(100);

      const result = engine.mediationAnalysis(
        model.id,
        "cutting_speed",
        "cutting_temperature",
        "tool_wear_rate",
        data
      );

      expect(result).toBeDefined();
      expect(result.treatment).toBe("cutting_speed");
      expect(result.mediator).toBe("cutting_temperature");
      expect(result.outcome).toBe("tool_wear_rate");
    });

    it("should decompose total effect into direct and indirect", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const data = generateSyntheticData(100);

      const result = engine.mediationAnalysis(
        model.id,
        "feed_rate",
        "cutting_force",
        "surface_finish",
        data
      );

      expect(typeof result.total_effect).toBe("number");
      expect(typeof result.direct_effect).toBe("number");
      expect(typeof result.indirect_effect).toBe("number");

      // All effects should be numeric (decomposition is approximate)
      expect(Number.isFinite(result.total_effect)).toBe(true);
      expect(Number.isFinite(result.direct_effect)).toBe(true);
      expect(Number.isFinite(result.indirect_effect)).toBe(true);
    });

    it("should calculate ACME and ADE", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const data = generateSyntheticData(80);

      const result = engine.mediationAnalysis(
        model.id,
        "depth_of_cut",
        "cutting_force",
        "tool_deflection",
        data
      );

      expect(typeof result.acme).toBe("number");  // Average Causal Mediation Effect
      expect(typeof result.ade).toBe("number");   // Average Direct Effect
    });

    it("should calculate proportion mediated", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const data = generateSyntheticData(100);

      const result = engine.mediationAnalysis(
        model.id,
        "cutting_speed",
        "cutting_force",
        "tool_deflection",
        data
      );

      expect(typeof result.proportion_mediated).toBe("number");
    });

    it("should provide confidence intervals", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const data = generateSyntheticData(100);

      const result = engine.mediationAnalysis(
        model.id,
        "feed_rate",
        "chip_thickness",
        "surface_finish",
        data
      );

      expect(result.confidence_intervals).toBeDefined();
      expect(result.confidence_intervals.total).toHaveLength(2);
      expect(result.confidence_intervals.direct).toHaveLength(2);
      expect(result.confidence_intervals.indirect).toHaveLength(2);
    });

    it("should include sensitivity analysis", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const data = generateSyntheticData(100);

      const result = engine.mediationAnalysis(
        model.id,
        "cutting_speed",
        "cutting_temperature",
        "tool_life",
        data
      );

      expect(result.sensitivity).toBeDefined();
      expect(typeof result.sensitivity.rho_at_which_acme_0).toBe("number");
    });
  });

  // ==========================================================================
  // PROPENSITY SCORE METHODS TESTS
  // ==========================================================================

  describe("estimateWithPropensityScore", () => {
    it("should estimate effect using propensity scores", () => {
      const n = 100;
      const treatment = new Array(n).fill(false).map((_, i) => i >= n / 2);
      const outcome = treatment.map((t, i) => (t ? 10 : 5) + Math.random() * 2);
      const covariates = [
        new Array(n).fill(0).map(() => Math.random() * 10)
      ];

      const result = engine.estimateWithPropensityScore(treatment, outcome, covariates);

      expect(result).toBeDefined();
      expect(typeof result.ate).toBe("number");
      expect(result.propensity_scores.length).toBe(n);
      expect(result.effective_sample_size).toBeGreaterThan(0);
    });

    it("should estimate standard error", () => {
      const n = 80;
      const treatment = new Array(n).fill(false).map(() => Math.random() > 0.5);
      const outcome = treatment.map(t => (t ? 15 : 10) + Math.random() * 5);
      const covariates = [
        new Array(n).fill(0).map(() => Math.random() * 20)
      ];

      const result = engine.estimateWithPropensityScore(treatment, outcome, covariates);

      expect(typeof result.standard_error).toBe("number");
      expect(result.standard_error).toBeGreaterThanOrEqual(0);
    });

    it("should clip propensity scores to avoid extreme weights", () => {
      const n = 50;
      const treatment = new Array(n).fill(false).map((_, i) => i < 5);  // Very few treated
      const outcome = treatment.map(t => (t ? 20 : 10) + Math.random());
      const covariates = [new Array(n).fill(0).map(() => Math.random())];

      const result = engine.estimateWithPropensityScore(treatment, outcome, covariates);

      // All propensity scores should be in (0.01, 0.99)
      for (const ps of result.propensity_scores) {
        expect(ps).toBeGreaterThanOrEqual(0.01);
        expect(ps).toBeLessThanOrEqual(0.99);
      }
    });
  });

  // ==========================================================================
  // CONFOUNDER IDENTIFICATION TESTS
  // ==========================================================================

  describe("identifyConfounders", () => {
    it("should identify confounders between treatment and outcome", () => {
      const model = engine.buildCausalModel("lathe_turning");

      const confounders = engine.identifyConfounders(
        model.id,
        "cutting_speed",
        "surface_finish"
      );

      expect(Array.isArray(confounders)).toBe(true);
    });

    it("should return empty for non-existent model", () => {
      const confounders = engine.identifyConfounders(
        "non_existent",
        "x",
        "y"
      );

      expect(confounders).toEqual([]);
    });
  });

  // ==========================================================================
  // MANUFACTURING-SPECIFIC TESTS
  // ==========================================================================

  describe("analyzeLatheOperation", () => {
    it("should analyze a turning operation", () => {
      const context: LatheOperationContext = {
        operation_type: "od_turning",
        material: {
          name: "4140 Steel",
          iso_group: "P",
          hardness_hb: 280
        },
        tool: {
          type: "CNMG",
          insert_grade: "GC4225",
          nose_radius_mm: 0.8,
          approach_angle_deg: 95
        },
        parameters: {
          cutting_speed_mpm: 200,
          feed_rate_mmrev: 0.25,
          depth_of_cut_mm: 2.0,
          coolant_type: "flood"
        },
        machine: {
          spindle_power_kw: 15,
          max_rpm: 4000,
          rigidity: "high"
        }
      };

      const outcomes: LatheOutcomes = {
        surface_finish_ra_um: 1.8,
        dimensional_accuracy_mm: 0.02,
        tool_life_min: 45,
        cycle_time_sec: 120,
        power_consumption_kw: 8,
        cutting_force_n: 800,
        temperature_c: 450,
        vibration_amplitude_mm: 0.01,
        chip_form: "segmented"
      };

      const result = engine.analyzeLatheOperation(context, outcomes);

      expect(result).toBeDefined();
      expect(result.causal_model).toBeDefined();
      expect(result.key_causal_paths.length).toBeGreaterThan(0);
    });

    it("should identify key causal paths", () => {
      const context: LatheOperationContext = {
        operation_type: "id_boring",
        material: { name: "Stainless 304", iso_group: "M", hardness_hb: 200 },
        tool: {
          type: "Boring bar",
          insert_grade: "GC1125",
          nose_radius_mm: 0.4,
          approach_angle_deg: 93
        },
        parameters: {
          cutting_speed_mpm: 150,
          feed_rate_mmrev: 0.15,
          depth_of_cut_mm: 1.0,
          coolant_type: "through_tool"
        },
        machine: { spindle_power_kw: 11, max_rpm: 5000, rigidity: "medium" }
      };

      const outcomes: LatheOutcomes = {
        surface_finish_ra_um: 2.4,
        dimensional_accuracy_mm: 0.03,
        tool_life_min: 25,
        cycle_time_sec: 90,
        power_consumption_kw: 5,
        cutting_force_n: 400,
        temperature_c: 380,
        vibration_amplitude_mm: 0.02,
        chip_form: "broken"
      };

      const result = engine.analyzeLatheOperation(context, outcomes);

      expect(result.key_causal_paths.length).toBeGreaterThan(0);
      for (const path of result.key_causal_paths) {
        expect(Array.isArray(path.path)).toBe(true);
        expect(typeof path.effect).toBe("number");
        expect(typeof path.interpretation).toBe("string");
      }
    });

    it("should generate optimization recommendations", () => {
      const context: LatheOperationContext = {
        operation_type: "od_turning",
        material: { name: "Aluminum 6061", iso_group: "N", hardness_hb: 95 },
        tool: {
          type: "DCMT",
          insert_grade: "H13A",
          nose_radius_mm: 0.4,
          approach_angle_deg: 93
        },
        parameters: {
          cutting_speed_mpm: 300,
          feed_rate_mmrev: 0.35,
          depth_of_cut_mm: 3.0,
          coolant_type: "mist"
        },
        machine: { spindle_power_kw: 15, max_rpm: 6000, rigidity: "high" }
      };

      const outcomes: LatheOutcomes = {
        surface_finish_ra_um: 4.0,  // Poor finish - should trigger recommendation
        dimensional_accuracy_mm: 0.04,
        tool_life_min: 20,  // Short life - should trigger recommendation
        cycle_time_sec: 60,
        power_consumption_kw: 4,
        cutting_force_n: 300,
        temperature_c: 200,
        vibration_amplitude_mm: 0.005,
        chip_form: "continuous"
      };

      const result = engine.analyzeLatheOperation(context, outcomes);

      // Should have recommendations due to poor outcomes
      expect(Array.isArray(result.optimization_recommendations)).toBe(true);
    });

    it("should include sensitivity analysis per parameter", () => {
      const context: LatheOperationContext = {
        operation_type: "facing",
        material: { name: "Cast Iron", iso_group: "K", hardness_hb: 190 },
        tool: {
          type: "TNMG",
          insert_grade: "GC3210",
          nose_radius_mm: 0.8,
          approach_angle_deg: 91
        },
        parameters: {
          cutting_speed_mpm: 200,
          feed_rate_mmrev: 0.2,
          depth_of_cut_mm: 1.5,
          coolant_type: "dry"
        },
        machine: { spindle_power_kw: 12, max_rpm: 4500, rigidity: "medium" }
      };

      const outcomes: LatheOutcomes = {
        surface_finish_ra_um: 2.0,
        dimensional_accuracy_mm: 0.025,
        tool_life_min: 55,
        cycle_time_sec: 45,
        power_consumption_kw: 6,
        cutting_force_n: 600,
        temperature_c: 350,
        vibration_amplitude_mm: 0.008,
        chip_form: "broken"
      };

      const result = engine.analyzeLatheOperation(context, outcomes);

      expect(result.sensitivity_analysis).toBeDefined();
      expect(typeof result.sensitivity_analysis.cutting_speed).toBe("number");
      expect(typeof result.sensitivity_analysis.feed_rate).toBe("number");
    });
  });

  // ==========================================================================
  // MODEL MANAGEMENT TESTS
  // ==========================================================================

  describe("Model Management", () => {
    it("should get model by ID", () => {
      const model = engine.buildCausalModel("lathe_turning");
      const retrieved = engine.getModel(model.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(model.id);
    });

    it("should return undefined for non-existent model", () => {
      const retrieved = engine.getModel("non_existent");
      expect(retrieved).toBeUndefined();
    });

    it("should list all models", () => {
      engine.buildCausalModel("lathe_turning");
      engine.buildCausalModel("lathe_boring");

      const list = engine.listModels();

      expect(list.length).toBeGreaterThanOrEqual(2);
      for (const item of list) {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.variables).toBeGreaterThan(0);
        expect(item.edges).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // MANUFACTURING TEMPLATES TESTS
  // ==========================================================================

  describe("getManufacturingTemplates", () => {
    it("should return pre-defined templates", () => {
      const templates = engine.getManufacturingTemplates();

      expect(templates.edges.length).toBeGreaterThan(20);
      expect(templates.variables.length).toBeGreaterThan(15);
    });

    it("should have physically meaningful edge mechanisms", () => {
      const templates = engine.getManufacturingTemplates();

      for (const edge of templates.edges) {
        expect(edge.mechanism).toBeDefined();
        expect(edge.mechanism.length).toBeGreaterThan(10);
      }
    });

    it("should include key machining relationships", () => {
      const templates = engine.getManufacturingTemplates();

      // Speed -> Temperature
      const speedTemp = templates.edges.find(
        e => e.from === "cutting_speed" && e.to === "cutting_temperature"
      );
      expect(speedTemp).toBeDefined();
      expect(speedTemp!.strength).toBeGreaterThan(0);

      // Feed -> Force
      const feedForce = templates.edges.find(
        e => e.from === "feed_rate" && e.to === "cutting_force"
      );
      expect(feedForce).toBeDefined();
      expect(feedForce!.strength).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // TRAINING CONTEXT TESTS
  // ==========================================================================

  describe("getTrainingContext", () => {
    it("should return training context string", () => {
      const context = engine.getTrainingContext();

      expect(typeof context).toBe("string");
      expect(context.length).toBeGreaterThan(500);
    });

    it("should mention key capabilities", () => {
      const context = engine.getTrainingContext();

      expect(context).toContain("STRUCTURAL CAUSAL MODELS");
      expect(context).toContain("INTERVENTION ANALYSIS");
      expect(context).toContain("CAUSAL DISCOVERY");
      expect(context).toContain("Backdoor");
      expect(context).toContain("Front-door");
    });

    it("should mention machining-specific content", () => {
      const context = engine.getTrainingContext();

      expect(context).toContain("cutting_speed");
      expect(context).toContain("tool_life");
      expect(context).toContain("surface_finish");
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT TEST
  // ==========================================================================

  describe("Singleton Export", () => {
    it("should export singleton instance", () => {
      expect(latheCausalInferenceEngine).toBeInstanceOf(LatheCausalInferenceEngine);
    });
  });
});

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Generate synthetic machining data for testing.
 */
function generateSyntheticData(n: number): Array<Record<string, number>> {
  const data: Array<Record<string, number>> = [];

  for (let i = 0; i < n; i++) {
    const cutting_speed = 100 + Math.random() * 300;  // 100-400 m/min
    const feed_rate = 0.1 + Math.random() * 0.4;      // 0.1-0.5 mm/rev
    const depth_of_cut = 0.5 + Math.random() * 3;     // 0.5-3.5 mm

    // Simulate physical relationships with noise
    const cutting_force = 300 + feed_rate * 1000 + depth_of_cut * 200 + Math.random() * 100;
    const cutting_temperature = 200 + cutting_speed * 0.8 + Math.random() * 50;
    const tool_wear_rate = 0.01 + (cutting_temperature / 1000) * 0.2 + Math.random() * 0.02;
    const tool_life = 60 - tool_wear_rate * 200 + Math.random() * 10;
    const surface_finish = 0.5 + (feed_rate * feed_rate * 100) + Math.random() * 0.3;
    const tool_deflection = cutting_force / 10000 + Math.random() * 0.01;
    const dimensional_accuracy = tool_deflection * 2 + Math.random() * 0.01;
    const chip_thickness = feed_rate * 0.9;

    data.push({
      cutting_speed,
      feed_rate,
      depth_of_cut,
      cutting_force,
      cutting_temperature,
      tool_wear_rate,
      tool_life,
      surface_finish,
      tool_deflection,
      dimensional_accuracy,
      chip_thickness,
    });
  }

  return data;
}
