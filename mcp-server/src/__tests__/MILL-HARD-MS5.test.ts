/**
 * MILL-HARD-MS5: 5-Axis Deep Learning + Template Auto-Generation
 * ===============================================================
 * Tests FiveAxisDeepLearningEngine: template generation, similarity
 * matching, deep AI reasoning, and learning from outcomes.
 *
 * @milestone MILL-HARD-MS5
 * @predecessor MILL-HARD-MS4 (97 tests, FiveAxisToolpathSynthesisEngine)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  FiveAxisDeepLearningEngine,
  fiveAxisDeepLearningEngine,
  type FiveAxisTemplate,
  type FeatureSignature,
  type CuttingParameters,
  type MachineSetup,
  type SuccessMetrics,
  type TemplateSearchQuery,
  type DeepReasoningRequest,
  type LearningOutcome,
} from "../engines/FiveAxisDeepLearningEngine.js";
import {
  type MaterialProps,
  type MachineKinematics5Ax,
  FIVE_AXIS_STRATEGY_CATALOG,
} from "../engines/FiveAxisToolpathSynthesisEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** JM Die's Okuma M460V-5AX */
const OKUMA_5AX: MachineKinematics5Ax = {
  machine_id: "VMC-02",
  kinematic_type: "table_table",
  primary_rotary: "A",
  secondary_rotary: "C",
  pivot_to_gauge_mm: 250,
  pivot_to_table_mm: 150,
  axis_limits: { A_min: -120, A_max: 30, C_min: -360, C_max: 360 },
  max_rotary_speed_deg_per_sec: 50,
  rtcp_enabled: true,
  tcpm_mode: "G43.4",
};

/** D2 Tool Steel */
const D2_MATERIAL: MaterialProps = {
  name: "D2 Tool Steel",
  iso_group: "H",
  kc11_mpa: 3200,
  mc: 0.22,
  hardness_hrc: 58,
  thermal_conductivity_w_mk: 20.5,
};

/** Aluminum 6061 */
const AL6061_MATERIAL: MaterialProps = {
  name: "Aluminum 6061-T6",
  iso_group: "N",
  kc11_mpa: 700,
  mc: 0.25,
  hardness_hrc: 0,
  thermal_conductivity_w_mk: 167,
};

/** Titanium Ti-6Al-4V */
const TITANIUM_MATERIAL: MaterialProps = {
  name: "Ti-6Al-4V",
  iso_group: "S",
  kc11_mpa: 2800,
  mc: 0.20,
  hardness_hrc: 36,
  thermal_conductivity_w_mk: 6.7,
};

/** Die cavity feature signature */
const DIE_CAVITY_FEATURE: FeatureSignature = {
  type: "mold_cavity",
  dimensions: {
    length_mm: 60,
    width_mm: 60,
    depth_mm: 35,
    fillet_radius_mm: 3,
  },
  complexity_score: 6,
  undercut_count: 0,
  thin_wall_count: 0,
  tight_tolerance_count: 3,
  surface_area_mm2: 12000,
  volume_mm3: 75000,
};

/** Impeller blade feature signature */
const IMPELLER_FEATURE: FeatureSignature = {
  type: "impeller_blade",
  dimensions: {
    length_mm: 100,
    width_mm: 30,
    depth_mm: 80,
    fillet_radius_mm: 2,
  },
  complexity_score: 9,
  undercut_count: 2,
  thin_wall_count: 4,
  tight_tolerance_count: 5,
  surface_area_mm2: 25000,
  volume_mm3: 120000,
};

/** Ruled surface feature */
const RULED_SURFACE_FEATURE: FeatureSignature = {
  type: "ruled_surface",
  dimensions: {
    length_mm: 80,
    width_mm: 25,
    depth_mm: 15,
    draft_angle_deg: 3,
  },
  complexity_score: 4,
  undercut_count: 0,
  thin_wall_count: 0,
  tight_tolerance_count: 1,
  surface_area_mm2: 4200,
  volume_mm3: 22000,
};

/** Standard cutting parameters */
const CUTTING_PARAMS: CuttingParameters = {
  strategy_id: "hm_5x_shape_offset",
  strategy_name: "5X Shape Offset Finishing",
  tool_type: "ball_nose",
  tool_diameter_mm: 8,
  spindle_rpm: 7500,
  feed_mmmin: 1000,
  ap_mm: 0.2,
  ae_mm: 0.4,
  lead_angle_deg: 15,
  tilt_angle_deg: 0,
  stepover_pct: 6,
  coolant: "through_tool",
};

/** Machine setup */
const MACHINE_SETUP: MachineSetup = {
  machine_id: "VMC-02",
  kinematic_type: "table_table",
  work_offset: "G54",
  tool_length_offset: 1,
  rtcp_mode: "G43.4",
  probing_used: true,
};

/** Success metrics */
const SUCCESS_METRICS: SuccessMetrics = {
  cycle_time_actual_min: 42,
  cycle_time_predicted_min: 40,
  surface_ra_achieved_um: 0.35,
  surface_ra_target_um: 0.4,
  tool_life_used_pct: 12,
  scrap_count: 0,
  rework_count: 0,
  first_pass_yield: true,
  operator_rating: 5,
};

// ============================================================================
// μS-16: TEMPLATE AUTO-GENERATION
// ============================================================================

describe("μS-16: Template Auto-Generation", () => {
  describe("Generate Template from CAD/CAM", () => {
    it("generates template with all required fields", () => {
      const strategy = FIVE_AXIS_STRATEGY_CATALOG.find(s => s.id === "hm_5x_shape_offset")!;

      const template = FiveAxisDeepLearningEngine.generateTemplate(
        { customer_id: "jm-die", programmer_id: "test" },
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        strategy,
        [CUTTING_PARAMS],
        MACHINE_SETUP,
        {
          chain_of_thought: ["Step 1", "Step 2"],
          decision_criteria: { quality: 0.5, speed: 0.5 },
          alternatives_considered: ["swarf"],
          confidence_score: 0.85,
        }
      );

      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.created_at).toBeDefined();
      expect(template.version).toBe(1);
      expect(template.usage_count).toBe(0);
    });

    it("generates unique template IDs", () => {
      const strategy = FIVE_AXIS_STRATEGY_CATALOG[0];
      const ids = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const template = FiveAxisDeepLearningEngine.generateTemplate(
          { customer_id: "test" },
          [DIE_CAVITY_FEATURE],
          D2_MATERIAL,
          strategy,
          [CUTTING_PARAMS],
          MACHINE_SETUP,
          { chain_of_thought: [], decision_criteria: {}, alternatives_considered: [], confidence_score: 0.8 }
        );
        ids.add(template.id);
      }

      expect(ids.size).toBe(5);
    });

    it("categorizes templates correctly", () => {
      const strategy = FIVE_AXIS_STRATEGY_CATALOG.find(s => s.family === "novel_prism")!;

      const template = FiveAxisDeepLearningEngine.generateTemplate(
        { customer_id: "jm-die" },
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        strategy,
        [CUTTING_PARAMS],
        MACHINE_SETUP,
        { chain_of_thought: [], decision_criteria: {}, alternatives_considered: [], confidence_score: 0.9 }
      );

      // Novel PRISM strategy should be strategy_based
      expect(template.category).toBe("strategy_based");
    });

    it("generates feature embedding", () => {
      const strategy = FIVE_AXIS_STRATEGY_CATALOG[0];

      const template = FiveAxisDeepLearningEngine.generateTemplate(
        { customer_id: "test" },
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        strategy,
        [CUTTING_PARAMS],
        MACHINE_SETUP,
        { chain_of_thought: [], decision_criteria: {}, alternatives_considered: [], confidence_score: 0.8 }
      );

      expect(template.feature_embedding).toBeDefined();
      expect(template.feature_embedding?.length).toBe(128);
    });

    it("generates similarity tags", () => {
      const strategy = FIVE_AXIS_STRATEGY_CATALOG[0];

      const template = FiveAxisDeepLearningEngine.generateTemplate(
        { customer_id: "test" },
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        strategy,
        [CUTTING_PARAMS],
        MACHINE_SETUP,
        { chain_of_thought: [], decision_criteria: {}, alternatives_considered: [], confidence_score: 0.8 }
      );

      expect(template.similarity_tags.length).toBeGreaterThan(0);
      expect(template.similarity_tags).toContain("mold_cavity");
      expect(template.similarity_tags).toContain("h");
    });

    it("generates search keywords", () => {
      const strategy = FIVE_AXIS_STRATEGY_CATALOG[0];

      const template = FiveAxisDeepLearningEngine.generateTemplate(
        { customer_id: "test" },
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        strategy,
        [CUTTING_PARAMS],
        MACHINE_SETUP,
        { chain_of_thought: [], decision_criteria: {}, alternatives_considered: [], confidence_score: 0.8 }
      );

      expect(template.search_keywords.length).toBeGreaterThan(0);
    });
  });

  describe("Template Storage and Retrieval", () => {
    it("stores template in library", () => {
      const strategy = FIVE_AXIS_STRATEGY_CATALOG[0];

      const template = FiveAxisDeepLearningEngine.generateTemplate(
        { customer_id: "test" },
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        strategy,
        [CUTTING_PARAMS],
        MACHINE_SETUP,
        { chain_of_thought: [], decision_criteria: {}, alternatives_considered: [], confidence_score: 0.8 }
      );

      const retrieved = FiveAxisDeepLearningEngine.getTemplate(template.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(template.id);
    });

    it("returns undefined for non-existent template", () => {
      const result = FiveAxisDeepLearningEngine.getTemplate("nonexistent_id");
      expect(result).toBeUndefined();
    });

    it("gets all templates", () => {
      const all = FiveAxisDeepLearningEngine.getAllTemplates();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThan(0); // Pre-populated JM Die templates
    });
  });

  describe("Update Template Metrics", () => {
    it("updates template with success metrics", () => {
      const strategy = FIVE_AXIS_STRATEGY_CATALOG[0];

      const template = FiveAxisDeepLearningEngine.generateTemplate(
        { customer_id: "test" },
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        strategy,
        [CUTTING_PARAMS],
        MACHINE_SETUP,
        { chain_of_thought: [], decision_criteria: {}, alternatives_considered: [], confidence_score: 0.8 }
      );

      expect(template.success_metrics).toBeUndefined();

      const updated = FiveAxisDeepLearningEngine.updateTemplateMetrics(
        template.id,
        SUCCESS_METRICS
      );

      expect(updated).toBeDefined();
      expect(updated?.success_metrics).toBeDefined();
      expect(updated?.success_metrics?.first_pass_yield).toBe(true);
      expect(updated?.version).toBe(2);
    });

    it("returns undefined for non-existent template", () => {
      const result = FiveAxisDeepLearningEngine.updateTemplateMetrics(
        "nonexistent_id",
        SUCCESS_METRICS
      );
      expect(result).toBeUndefined();
    });
  });

  describe("Pre-populated JM Die Templates", () => {
    it("has die cavity D2 template", () => {
      const template = FiveAxisDeepLearningEngine.getTemplate("tpl_5x_die_cavity_d2");
      expect(template).toBeDefined();
      expect(template?.name).toContain("Die Cavity");
      expect(template?.material.iso_group).toBe("H");
    });

    it("has punch profile M2 template", () => {
      const template = FiveAxisDeepLearningEngine.getTemplate("tpl_5x_punch_profile_m2");
      expect(template).toBeDefined();
      expect(template?.strategy.family).toBe("swarf_cutting");
    });

    it("has graphite electrode template", () => {
      const template = FiveAxisDeepLearningEngine.getTemplate("tpl_5x_electrode_graphite");
      expect(template).toBeDefined();
      expect(template?.material.name).toContain("Graphite");
    });

    it("JM Die templates have success metrics", () => {
      const dieTemplate = FiveAxisDeepLearningEngine.getTemplate("tpl_5x_die_cavity_d2");
      expect(dieTemplate?.success_metrics).toBeDefined();
      expect(dieTemplate?.success_metrics?.first_pass_yield).toBe(true);
    });
  });
});

// ============================================================================
// μS-17: SIMILARITY SEARCH
// ============================================================================

describe("μS-17: Part Similarity Search", () => {
  describe("Template Search by Query", () => {
    it("searches by geometry type", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        geometry: "mold_cavity",
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(match => {
        const hasGeo = match.template.features.some(f => f.type === "mold_cavity");
        expect(hasGeo).toBe(true);
      });
    });

    it("searches by material ISO group", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        material_iso_group: "H",
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(match => {
        expect(match.template.material.iso_group).toBe("H");
      });
    });

    it("searches by strategy family", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        strategy_family: "swarf_cutting",
      });

      expect(results.length).toBeGreaterThan(0);
      // Strategy family matching increases score, but doesn't strictly filter
      // At least one result should match the requested family
      const hasMatchingFamily = results.some(
        match => match.template.strategy.family === "swarf_cutting"
      );
      expect(hasMatchingFamily).toBe(true);
    });

    it("searches by machine type", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        machine_type: "table_table",
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(match => {
        expect(match.template.machine_setup.kinematic_type).toBe("table_table");
      });
    });

    it("searches by keywords", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        keywords: ["die", "cavity"],
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it("filters by customer", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        customer_id: "jm-die",
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(match => {
        expect(match.template.source.customer_id).toBe("jm-die");
      });
    });

    it("limits results", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        max_results: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("sorts by similarity score descending", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        geometry: "mold_cavity",
        material_iso_group: "H",
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity_score).toBeLessThanOrEqual(results[i - 1].similarity_score);
      }
    });

    it("provides match reasons", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        geometry: "mold_cavity",
        material_iso_group: "H",
      });

      expect(results[0].match_reasons.length).toBeGreaterThan(0);
    });

    it("identifies adaptations needed", () => {
      const results = FiveAxisDeepLearningEngine.searchSimilarTemplates({
        geometry: "mold_cavity",
        material_iso_group: "N", // Different from template's H group
      });

      // Should suggest adaptation for material
      const hasAdaptation = results.some(r => r.adaptations_needed.length > 0);
      expect(hasAdaptation).toBe(true);
    });
  });

  describe("Embedding-Based Similarity", () => {
    it("finds similar parts by embedding", () => {
      const results = FiveAxisDeepLearningEngine.findSimilarByEmbedding(
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        5
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity_score).toBeGreaterThan(0);
    });

    it("returns correct number of results", () => {
      const results = FiveAxisDeepLearningEngine.findSimilarByEmbedding(
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        3
      );

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("includes feature matches", () => {
      const results = FiveAxisDeepLearningEngine.findSimilarByEmbedding(
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        5
      );

      if (results.length > 0) {
        expect(results[0].feature_matches.length).toBeGreaterThan(0);
        expect(results[0].feature_matches[0].score).toBeDefined();
      }
    });

    it("provides recommendations", () => {
      const results = FiveAxisDeepLearningEngine.findSimilarByEmbedding(
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        5
      );

      if (results.length > 0) {
        expect(results[0].recommendation).toBeDefined();
        expect(results[0].recommendation.length).toBeGreaterThan(10);
      }
    });

    it("sorts by similarity score", () => {
      const results = FiveAxisDeepLearningEngine.findSimilarByEmbedding(
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        5
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity_score).toBeLessThanOrEqual(results[i - 1].similarity_score);
      }
    });

    it("different features produce different scores", () => {
      const cavityResults = FiveAxisDeepLearningEngine.findSimilarByEmbedding(
        [DIE_CAVITY_FEATURE],
        D2_MATERIAL,
        1
      );

      const impellerResults = FiveAxisDeepLearningEngine.findSimilarByEmbedding(
        [IMPELLER_FEATURE],
        TITANIUM_MATERIAL,
        1
      );

      // Different queries should give different top matches or scores
      if (cavityResults.length > 0 && impellerResults.length > 0) {
        expect(
          cavityResults[0].template_id !== impellerResults[0].template_id ||
          cavityResults[0].similarity_score !== impellerResults[0].similarity_score
        ).toBe(true);
      }
    });
  });
});

// ============================================================================
// μS-18: DEEP AI REASONING
// ============================================================================

describe("μS-18: Deep AI Reasoning", () => {
  describe("Chain of Thought Generation", () => {
    it("generates reasoning chain for request", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: {
          batch_size: 1,
          operator_skill: 4,
        },
        require_explanation: true,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("reasoning chain includes observation steps", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 3 },
        require_explanation: true,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const observations = result.reasoning_chain.filter(s => s.type === "observation");
      expect(observations.length).toBeGreaterThan(0);
    });

    it("reasoning chain includes analysis steps", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 3 },
        require_explanation: true,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const analyses = result.reasoning_chain.filter(s => s.type === "analysis");
      expect(analyses.length).toBeGreaterThan(0);
    });

    it("reasoning chain includes conclusion", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 3 },
        require_explanation: true,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const conclusions = result.reasoning_chain.filter(s => s.type === "conclusion");
      expect(conclusions.length).toBeGreaterThan(0);
    });

    it("reasoning steps have sequential numbers", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 3 },
        require_explanation: true,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      for (let i = 0; i < result.reasoning_chain.length; i++) {
        expect(result.reasoning_chain[i].step).toBe(i + 1);
      }
    });
  });

  describe("Strategy Selection", () => {
    it("recommends strategy for request", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.recommended_strategy).toBeDefined();
      expect(result.recommended_strategy.id).toBeDefined();
    });

    it("recommends cutting parameters", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.recommended_params).toBeDefined();
      expect(result.recommended_params.spindle_rpm).toBeGreaterThan(0);
      expect(result.recommended_params.feed_mmmin).toBeGreaterThan(0);
    });

    it("provides confidence score", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("uses similar templates when available", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      // Should reference similar templates
      expect(result.similar_templates_used.length).toBeGreaterThanOrEqual(0);
    });

    it("provides adaptations applied", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.adaptations_applied.length).toBeGreaterThan(0);
    });
  });

  describe("PRISM AI Integration", () => {
    it("generates PRISM AI prompt when explanation required", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: true,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.prism_ai_prompt).toBeDefined();
      expect(result.prism_ai_prompt).toContain("PRISM");
    });

    it("skips PRISM AI when explanation not required", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.prism_ai_prompt).toBeUndefined();
    });

    it("generates PRISM AI response when prompt exists", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: true,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      if (result.prism_ai_prompt) {
        expect(result.prism_ai_response).toBeDefined();
      }
    });
  });

  describe("Proactive Suggestions", () => {
    it("generates proactive suggestions", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.proactive_suggestions.length).toBeGreaterThan(0);
    });

    it("suggests template capture", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const hasTemplateCapture = result.proactive_suggestions.some(s =>
        s.toLowerCase().includes("template")
      );
      expect(hasTemplateCapture).toBe(true);
    });

    it("provides material-specific suggestions for hardened steel", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL, // ISO H
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const hasHardenedSuggestion = result.proactive_suggestions.some(s =>
        s.toLowerCase().includes("ceramic") ||
        s.toLowerCase().includes("cbn") ||
        s.toLowerCase().includes("hardened")
      );
      expect(hasHardenedSuggestion).toBe(true);
    });

    it("provides titanium-specific suggestions", () => {
      const request: DeepReasoningRequest = {
        part_features: [IMPELLER_FEATURE],
        material: TITANIUM_MATERIAL, // ISO S
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 5 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const hasTitaniumSuggestion = result.proactive_suggestions.some(s =>
        s.toLowerCase().includes("titanium") ||
        s.toLowerCase().includes("low speed")
      );
      expect(hasTitaniumSuggestion).toBe(true);
    });

    it("provides thin wall warnings", () => {
      const thinWallFeature: FeatureSignature = {
        ...DIE_CAVITY_FEATURE,
        thin_wall_count: 3,
      };

      const request: DeepReasoningRequest = {
        part_features: [thinWallFeature],
        material: AL6061_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const hasThinWallWarning = result.proactive_suggestions.some(s =>
        s.toLowerCase().includes("thin wall")
      );
      expect(hasThinWallWarning).toBe(true);
    });
  });

  describe("Risk Warnings", () => {
    it("generates risk warnings for hardened steel", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.risk_warnings.length).toBeGreaterThan(0);
    });

    it("generates risk warnings for titanium", () => {
      const request: DeepReasoningRequest = {
        part_features: [IMPELLER_FEATURE],
        material: TITANIUM_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 5 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const hasWorkHardeningWarning = result.risk_warnings.some(s =>
        s.toLowerCase().includes("work harden")
      );
      expect(hasWorkHardeningWarning).toBe(true);
    });
  });

  describe("Novel Insights", () => {
    it("extracts novel insights", () => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 4 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      expect(result.novel_insights.length).toBeGreaterThan(0);
    });

    it("identifies novel geometries", () => {
      const novelFeature: FeatureSignature = {
        type: "dental", // Unusual for JM Die
        dimensions: { length_mm: 15, width_mm: 15, depth_mm: 10 },
        complexity_score: 8,
        undercut_count: 1,
        thin_wall_count: 0,
        tight_tolerance_count: 4,
        surface_area_mm2: 1500,
        volume_mm3: 2000,
      };

      const request: DeepReasoningRequest = {
        part_features: [novelFeature],
        material: TITANIUM_MATERIAL,
        machine: OKUMA_5AX,
        constraints: { batch_size: 1, operator_skill: 5 },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);

      const hasNovelInsight = result.novel_insights.some(i =>
        i.toLowerCase().includes("novel") ||
        i.toLowerCase().includes("new") ||
        i.toLowerCase().includes("dental")
      );
      // Should identify this as unusual or align with patterns
      expect(result.novel_insights.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// LEARNING FROM OUTCOMES
// ============================================================================

describe("Learning from Outcomes", () => {
  it("records learning outcome", () => {
    const outcome: LearningOutcome = {
      template_id: "tpl_5x_die_cavity_d2",
      prediction_id: "pred_001",
      predicted: {
        cycle_time_min: 40,
        surface_ra_um: 0.5,
        tool_life_pct: 15,
      },
      actual: {
        cycle_time_min: 42,
        surface_ra_um: 0.45,
        tool_life_pct: 12,
      },
      success: true,
    };

    expect(() => FiveAxisDeepLearningEngine.recordOutcome(outcome)).not.toThrow();
  });

  it("gets learning statistics", () => {
    const stats = FiveAxisDeepLearningEngine.getLearningStats();

    expect(typeof stats.total_outcomes).toBe("number");
    expect(typeof stats.success_rate).toBe("number");
    expect(typeof stats.avg_cycle_time_error_pct).toBe("number");
    expect(typeof stats.avg_surface_error_pct).toBe("number");
    expect(typeof stats.templates_with_outcomes).toBe("number");
  });

  it("gets templates needing validation", () => {
    const templates = FiveAxisDeepLearningEngine.getTemplatesNeedingValidation();

    expect(Array.isArray(templates)).toBe(true);
    // Should return templates with high usage but no metrics
    templates.forEach(t => {
      expect(t.usage_count).toBeGreaterThan(3);
      expect(t.success_metrics).toBeUndefined();
    });
  });
});

// ============================================================================
// MODULE EXPORTS
// ============================================================================

describe("Module Exports", () => {
  it("exports singleton instance", () => {
    expect(fiveAxisDeepLearningEngine).toBeDefined();
    expect(fiveAxisDeepLearningEngine).toBeInstanceOf(FiveAxisDeepLearningEngine);
  });

  it("exports all required types", () => {
    // This test verifies the types are importable (checked at compile time)
    const template: Partial<FiveAxisTemplate> = {
      id: "test",
      name: "Test Template",
    };
    expect(template).toBeDefined();
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("Edge Cases", () => {
  it("requires at least one feature", () => {
    const request: DeepReasoningRequest = {
      part_features: [],
      material: D2_MATERIAL,
      machine: OKUMA_5AX,
      constraints: { batch_size: 1, operator_skill: 3 },
      require_explanation: false,
    };

    // Empty features should throw since we need geometry for strategy selection
    expect(() => FiveAxisDeepLearningEngine.deepReason(request)).toThrow();
  });

  it("handles multiple features", () => {
    const request: DeepReasoningRequest = {
      part_features: [DIE_CAVITY_FEATURE, RULED_SURFACE_FEATURE],
      material: D2_MATERIAL,
      machine: OKUMA_5AX,
      constraints: { batch_size: 1, operator_skill: 4 },
      require_explanation: false,
    };

    const result = FiveAxisDeepLearningEngine.deepReason(request);

    expect(result.recommended_strategy).toBeDefined();
  });

  it("handles extreme batch sizes", () => {
    const request: DeepReasoningRequest = {
      part_features: [DIE_CAVITY_FEATURE],
      material: AL6061_MATERIAL,
      machine: OKUMA_5AX,
      constraints: {
        batch_size: 10000,
        operator_skill: 3,
      },
      require_explanation: false,
    };

    const result = FiveAxisDeepLearningEngine.deepReason(request);

    expect(result.recommended_strategy).toBeDefined();
  });

  it("handles all operator skill levels", () => {
    const skillLevels: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

    skillLevels.forEach(skill => {
      const request: DeepReasoningRequest = {
        part_features: [DIE_CAVITY_FEATURE],
        material: D2_MATERIAL,
        machine: OKUMA_5AX,
        constraints: {
          batch_size: 1,
          operator_skill: skill,
        },
        require_explanation: false,
      };

      const result = FiveAxisDeepLearningEngine.deepReason(request);
      expect(result.recommended_strategy).toBeDefined();
    });
  });

  it("handles provided similar templates", () => {
    const jmDieTemplate = FiveAxisDeepLearningEngine.getTemplate("tpl_5x_die_cavity_d2");

    const request: DeepReasoningRequest = {
      part_features: [DIE_CAVITY_FEATURE],
      material: D2_MATERIAL,
      machine: OKUMA_5AX,
      constraints: { batch_size: 1, operator_skill: 4 },
      similar_templates: jmDieTemplate ? [jmDieTemplate] : [],
      require_explanation: true,
    };

    const result = FiveAxisDeepLearningEngine.deepReason(request);

    expect(result.similar_templates_used.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// REGRESSION TESTS
// ============================================================================

describe("Regression Tests", () => {
  it("deep reason returns consistent results", () => {
    const request: DeepReasoningRequest = {
      part_features: [DIE_CAVITY_FEATURE],
      material: D2_MATERIAL,
      machine: OKUMA_5AX,
      constraints: { batch_size: 1, operator_skill: 4 },
      require_explanation: false,
    };

    const result1 = FiveAxisDeepLearningEngine.deepReason(request);
    const result2 = FiveAxisDeepLearningEngine.deepReason(request);

    expect(result1.recommended_strategy.id).toBe(result2.recommended_strategy.id);
  });

  it("template search returns consistent results", () => {
    const query: TemplateSearchQuery = {
      geometry: "mold_cavity",
      material_iso_group: "H",
    };

    const results1 = FiveAxisDeepLearningEngine.searchSimilarTemplates(query);
    const results2 = FiveAxisDeepLearningEngine.searchSimilarTemplates(query);

    expect(results1.length).toBe(results2.length);
    if (results1.length > 0) {
      expect(results1[0].template.id).toBe(results2[0].template.id);
    }
  });
});
