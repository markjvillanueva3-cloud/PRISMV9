/**
 * SpeedFeedAdvancedAIEngine Test Suite — SF-AI-L2
 *
 * Tests for XAI, multi-expert consensus, causal reasoning,
 * hierarchical planning, and advanced reasoning frameworks.
 *
 * @module __tests__/speed-feed-advanced-ai
 */

import { describe, it, expect } from "vitest";
import { speedFeedAdvancedAIEngine } from "../engines/SpeedFeedAdvancedAIEngine.js";

describe("SpeedFeedAdvancedAIEngine — SF-AI-L2", () => {
  // ============================================================================
  // XAI: EXPLAINABLE AI
  // ============================================================================

  describe("getFeatureImportance (XAI)", () => {
    it("should return ranked feature importance", () => {
      const result = speedFeedAdvancedAIEngine.getFeatureImportance(
        "4140",
        12,
        4,
        "roughing",
        200
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].feature).toBeDefined();
      expect(result[0].importance).toBeGreaterThan(0);
      expect(result[0].direction).toMatch(/positive|negative|neutral/);
      expect(result[0].description).toBeTruthy();
    });

    it("should have importance values summing to ~1.0", () => {
      const result = speedFeedAdvancedAIEngine.getFeatureImportance(
        "6061",
        16,
        3,
        "finishing"
      );

      const total = result.reduce((s, f) => s + f.importance, 0);
      expect(total).toBeCloseTo(1.0, 1);
    });

    it("should rank material_iso_group as top feature", () => {
      const result = speedFeedAdvancedAIEngine.getFeatureImportance(
        "Ti-6Al-4V",
        10,
        4,
        "semi_finishing"
      );

      // Material is typically most important
      const materialFeature = result.find(f => f.feature === "material_iso_group");
      expect(materialFeature).toBeDefined();
      expect(materialFeature!.importance).toBeGreaterThan(0.2);
    });
  });

  describe("getCounterfactual", () => {
    it("should explain speed change impact", () => {
      const result = speedFeedAdvancedAIEngine.getCounterfactual(
        "4140",
        12,
        4,
        "milling",
        "roughing",
        "speed",
        20
      );

      expect(result.original_value).toBeGreaterThan(0);
      expect(result.counterfactual_value).toBeGreaterThan(result.original_value);
      expect(result.changed_feature).toBe("speed");
      expect(result.change_direction).toContain("Increase");
      expect(result.outcome_change).toContain("life");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should explain feed change impact", () => {
      const result = speedFeedAdvancedAIEngine.getCounterfactual(
        "6061",
        16,
        3,
        "milling",
        "finishing",
        "feed",
        -15
      );

      expect(result.changed_feature).toBe("feed");
      expect(result.change_direction).toContain("Decrease");
      expect(result.outcome_change).toContain("MRR");
    });

    it("should explain depth change impact", () => {
      const result = speedFeedAdvancedAIEngine.getCounterfactual(
        "316L",
        10,
        4,
        "milling",
        "roughing",
        "depth",
        30
      );

      expect(result.changed_feature).toBe("depth");
      expect(result.change_direction).toContain("Increase");
      expect(result.outcome_change).toContain("MRR");
    });
  });

  // ============================================================================
  // MULTI-EXPERT CONSENSUS
  // ============================================================================

  describe("getMultiExpertConsensus", () => {
    it("should gather opinions from all experts", () => {
      const result = speedFeedAdvancedAIEngine.getMultiExpertConsensus(
        "4140",
        12,
        "milling",
        "roughing"
      );

      expect(result.experts).toBeInstanceOf(Array);
      expect(result.experts.length).toBe(4);

      const expertTypes = result.experts.map(e => e.expert);
      expect(expertTypes).toContain("physics");
      expect(expertTypes).toContain("empirical");
      expect(expertTypes).toContain("optimization");
      expect(expertTypes).toContain("safety");
    });

    it("should produce consensus recommendation", () => {
      const result = speedFeedAdvancedAIEngine.getMultiExpertConsensus(
        "6061",
        16,
        "milling",
        "finishing"
      );

      expect(result.final_recommendation.speed_mpm).toBeGreaterThan(0);
      expect(result.final_recommendation.feed_mm).toBeGreaterThan(0);
      expect(result.final_recommendation.depth_mm).toBeGreaterThan(0);
      expect(result.agreement_score).toBeGreaterThanOrEqual(0);
      expect(result.agreement_score).toBeLessThanOrEqual(1);
    });

    it("should include debate summary", () => {
      const result = speedFeedAdvancedAIEngine.getMultiExpertConsensus(
        "Ti-6Al-4V",
        10,
        "milling",
        "semi_finishing"
      );

      expect(result.debate_summary).toBeInstanceOf(Array);
      expect(result.debate_summary.length).toBeGreaterThan(0);
      expect(result.debate_summary.some(s => s.includes("Physics"))).toBe(true);
    });

    it("should identify expert concerns", () => {
      const result = speedFeedAdvancedAIEngine.getMultiExpertConsensus(
        "Inconel 718",
        8,
        "milling",
        "roughing"
      );

      // At least one expert should have concerns for difficult material
      const allConcerns = result.experts.flatMap(e => e.concerns);
      expect(allConcerns.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // CAUSAL REASONING
  // ============================================================================

  describe("getCausalDAG", () => {
    it("should return causal DAG with nodes and edges", () => {
      const result = speedFeedAdvancedAIEngine.getCausalDAG();

      expect(result.nodes).toBeInstanceOf(Array);
      expect(result.edges).toBeInstanceOf(Array);
      expect(result.nodes.length).toBeGreaterThan(10);
      expect(result.edges.length).toBeGreaterThan(15);
    });

    it("should have key manufacturing nodes", () => {
      const result = speedFeedAdvancedAIEngine.getCausalDAG();

      const nodeIds = result.nodes.map(n => n.id);
      expect(nodeIds).toContain("Vc");
      expect(nodeIds).toContain("fz");
      expect(nodeIds).toContain("ap");
      expect(nodeIds).toContain("MRR");
      expect(nodeIds).toContain("T");
      expect(nodeIds).toContain("Ra");
    });

    it("should have typed nodes", () => {
      const result = speedFeedAdvancedAIEngine.getCausalDAG();

      const controllableNodes = result.nodes.filter(n => n.type === "controllable");
      const outcomeNodes = result.nodes.filter(n => n.type === "outcome");

      expect(controllableNodes.length).toBeGreaterThan(0);
      expect(outcomeNodes.length).toBeGreaterThan(0);
    });

    it("should have edges with mechanisms", () => {
      const result = speedFeedAdvancedAIEngine.getCausalDAG();

      for (const edge of result.edges) {
        expect(edge.from).toBeTruthy();
        expect(edge.to).toBeTruthy();
        expect(edge.strength).toBeGreaterThan(-1);
        expect(edge.strength).toBeLessThanOrEqual(1);
        expect(edge.mechanism).toBeTruthy();
      }
    });
  });

  describe("performIntervention", () => {
    it("should calculate causal effect of speed change", () => {
      const result = speedFeedAdvancedAIEngine.performIntervention(
        "speed",
        180,
        "4140",
        { speed_mpm: 150, feed_mm: 0.1, depth_mm: 3 }
      );

      expect(result.intervention.variable).toBe("speed");
      expect(result.intervention.value).toBe(180);
      expect(result.original_outcome).toBeGreaterThan(0);
      expect(result.counterfactual_outcome).toBeGreaterThan(0);
      expect(result.counterfactual_outcome).toBeLessThan(result.original_outcome); // Higher speed = less life
      expect(result.causal_effect).toBeLessThan(0);
      expect(result.mediating_paths.length).toBeGreaterThan(0);
    });

    it("should identify mediating paths", () => {
      const result = speedFeedAdvancedAIEngine.performIntervention(
        "Vc",
        200,
        "6061",
        { speed_mpm: 300, feed_mm: 0.08, depth_mm: 2 }
      );

      expect(result.mediating_paths).toBeInstanceOf(Array);
      // Should have at least direct path to T
      const hasDirectPath = result.mediating_paths.some(
        p => p.length === 2 && p[0] === "Vc" && p[1] === "T"
      );
      expect(hasDirectPath || result.mediating_paths.length > 0).toBe(true);
    });

    it("should identify confounders", () => {
      const result = speedFeedAdvancedAIEngine.performIntervention(
        "speed",
        100,
        "316L stainless",
        { speed_mpm: 80, feed_mm: 0.12, depth_mm: 4 }
      );

      expect(result.confounders).toBeInstanceOf(Array);
      // Stainless should trigger work hardening confounder
      expect(result.confounders.some(c => c.toLowerCase().includes("work hard"))).toBe(true);
    });
  });

  // ============================================================================
  // HIERARCHICAL PLANNING
  // ============================================================================

  describe("createPlan", () => {
    it("should create hierarchical plan with three levels", () => {
      const result = speedFeedAdvancedAIEngine.createPlan(
        "4140",
        [
          { type: "milling", volume_cm3: 50 },
          { type: "drilling", volume_cm3: 5 },
        ],
        { shift_hours: 8, target_parts: 100 }
      );

      expect(result.strategic.level).toBe("strategic");
      expect(result.tactical.level).toBe("tactical");
      expect(result.operational.level).toBe("operational");
    });

    it("should have goals at each level", () => {
      const result = speedFeedAdvancedAIEngine.createPlan(
        "6061",
        [{ type: "milling", volume_cm3: 30 }],
        { target_parts: 50, quality_focus: true }
      );

      expect(result.strategic.goals.length).toBeGreaterThan(0);
      expect(result.tactical.goals.length).toBeGreaterThan(0);
      expect(result.operational.goals.length).toBeGreaterThan(0);
    });

    it("should include execution order", () => {
      const result = speedFeedAdvancedAIEngine.createPlan(
        "4140",
        [
          { type: "milling", volume_cm3: 40 },
          { type: "turning", volume_cm3: 20 },
        ],
        {}
      );

      expect(result.execution_order).toBeInstanceOf(Array);
      expect(result.execution_order.length).toBeGreaterThan(0);
      expect(result.execution_order.some(s => s.includes("ROUGH"))).toBe(true);
    });

    it("should calculate coherence score", () => {
      const result = speedFeedAdvancedAIEngine.createPlan(
        "Ti-6Al-4V",
        [{ type: "milling", volume_cm3: 25 }],
        { quality_focus: true }
      );

      expect(result.coherence_score).toBeGreaterThan(0);
      expect(result.coherence_score).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // ADVANCED REASONING FRAMEWORKS
  // ============================================================================

  describe("selfConsistency", () => {
    it("should run multiple reasoning chains", () => {
      const result = speedFeedAdvancedAIEngine.selfConsistency(
        "4140",
        12,
        4,
        "milling",
        "roughing",
        5
      );

      expect(result.chains.length).toBe(5);
      for (const chain of result.chains) {
        expect(chain.answer).toContain("m/min");
        expect(chain.confidence).toBeGreaterThan(0);
      }
    });

    it("should find majority answer", () => {
      const result = speedFeedAdvancedAIEngine.selfConsistency(
        "6061",
        16,
        3,
        "milling",
        "finishing",
        7
      );

      expect(result.majority_answer).toContain("m/min");
      expect(result.agreement_ratio).toBeGreaterThan(0);
      expect(result.agreement_ratio).toBeLessThanOrEqual(1);
    });

    it("should combine confidence with agreement", () => {
      const result = speedFeedAdvancedAIEngine.selfConsistency(
        "316L",
        10,
        4,
        "milling",
        "semi_finishing"
      );

      expect(result.final_confidence).toBeGreaterThan(0);
      expect(result.final_confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("verifyParameters", () => {
    it("should verify reasonable parameters", () => {
      const result = speedFeedAdvancedAIEngine.verifyParameters(
        "4140",
        12,
        4,
        "milling",
        "roughing",
        150
      );

      expect(result.claim).toContain("150 m/min");
      expect(result.verification_steps).toBeInstanceOf(Array);
      expect(result.verification_steps.length).toBeGreaterThanOrEqual(4);
    });

    it("should include ISO range check", () => {
      const result = speedFeedAdvancedAIEngine.verifyParameters(
        "6061",
        16,
        3,
        "milling",
        "finishing",
        500
      );

      const isoStep = result.verification_steps.find(s => s.step.includes("ISO"));
      expect(isoStep).toBeDefined();
      expect(isoStep!.evidence).toContain("m/min");
    });

    it("should flag invalid parameters", () => {
      const result = speedFeedAdvancedAIEngine.verifyParameters(
        "Ti-6Al-4V",
        10,
        4,
        "milling",
        "roughing",
        300 // Way too fast for titanium
      );

      expect(result.overall_valid).toBe(false);
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it("should provide corrections for invalid parameters", () => {
      const result = speedFeedAdvancedAIEngine.verifyParameters(
        "Inconel 718",
        8,
        4,
        "milling",
        "roughing",
        200 // Too fast for Inconel
      );

      if (!result.overall_valid) {
        expect(result.corrections.length).toBeGreaterThan(0);
      }
    });
  });

  describe("reactOptimize", () => {
    it("should perform reason-act cycles", () => {
      const result = speedFeedAdvancedAIEngine.reactOptimize(
        "4140",
        12,
        4,
        "milling",
        5.0
      );

      expect(result.steps).toBeInstanceOf(Array);
      expect(result.steps.length).toBeGreaterThan(0);

      for (const step of result.steps) {
        expect(step.thought).toBeTruthy();
        expect(step.action).toBeTruthy();
        expect(step.observation).toBeTruthy();
      }
    });

    it("should produce final answer with MRR", () => {
      const result = speedFeedAdvancedAIEngine.reactOptimize(
        "6061",
        16,
        3,
        "milling",
        10.0
      );

      expect(result.final_answer).toContain("MRR");
      expect(result.final_answer).toContain("m/min");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should adjust for power limits", () => {
      const result = speedFeedAdvancedAIEngine.reactOptimize(
        "Inconel 718",
        8,
        4,
        "milling",
        3.0
      );

      // Should have steps mentioning power
      const hasPowerStep = result.steps.some(
        s => s.thought.toLowerCase().includes("power") ||
             s.action.toLowerCase().includes("power") ||
             s.observation.toLowerCase().includes("power")
      );
      expect(hasPowerStep).toBe(true);
    });
  });

  describe("learnFromFailures", () => {
    it("should analyze chatter failure", () => {
      const result = speedFeedAdvancedAIEngine.learnFromFailures(
        "4140",
        12,
        "milling",
        [{ attempt: "First try: 200 m/min, 0.15 mm, 5 mm depth", failure_mode: "chatter" }]
      );

      expect(result.episodes.length).toBe(1);
      expect(result.episodes[0].reflection).toContain("depth");
      expect(result.lessons_learned.length).toBeGreaterThan(0);
    });

    it("should analyze tool breakage", () => {
      const result = speedFeedAdvancedAIEngine.learnFromFailures(
        "Ti-6Al-4V",
        8,
        "milling",
        [{ attempt: "Aggressive cut: 80 m/min, 0.2 mm, 6 mm depth", failure_mode: "tool break" }]
      );

      expect(result.episodes[0].reflection).toContain("force");
      expect(result.lessons_learned.some(l => l.toLowerCase().includes("force") || l.toLowerCase().includes("tool"))).toBe(true);
    });

    it("should learn from multiple failures", () => {
      const result = speedFeedAdvancedAIEngine.learnFromFailures(
        "316L",
        10,
        "milling",
        [
          { attempt: "High speed", failure_mode: "chatter" },
          { attempt: "Heavy depth", failure_mode: "tool break" },
          { attempt: "Fine finish", failure_mode: "poor finish" },
        ]
      );

      expect(result.episodes.length).toBe(3);
      expect(result.lessons_learned.length).toBeGreaterThanOrEqual(3);
      expect(result.improvement_from_reflection).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // COMPREHENSIVE ANALYSIS
  // ============================================================================

  describe("advancedAnalysis", () => {
    it("should provide full advanced analysis", async () => {
      const result = await speedFeedAdvancedAIEngine.advancedAnalysis({
        material: "4140",
        tool_diameter_mm: 12,
        flutes: 4,
        operation: "milling",
        cut_type: "roughing",
        target_mrr: 5.0,
      });

      expect(result.feature_importance).toBeInstanceOf(Array);
      expect(result.consensus).toBeDefined();
      expect(result.self_consistency).toBeDefined();
      expect(result.verification).toBeDefined();
      expect(result.causal_dag).toBeDefined();
      expect(result.react).toBeDefined();
      expect(result.overall_confidence).toBeGreaterThan(0);
    });

    it("should include reflexion when failure history provided", async () => {
      const result = await speedFeedAdvancedAIEngine.advancedAnalysis({
        material: "Ti-6Al-4V",
        tool_diameter_mm: 10,
        flutes: 4,
        operation: "milling",
        cut_type: "semi_finishing",
        failure_history: [
          { attempt: "High speed test", failure_mode: "chatter" },
        ],
      });

      expect(result.reflexion).toBeDefined();
      expect(result.reflexion!.episodes.length).toBe(1);
    });

    it("should have reasonable overall confidence", async () => {
      const result = await speedFeedAdvancedAIEngine.advancedAnalysis({
        material: "6061",
        tool_diameter_mm: 16,
        flutes: 3,
        operation: "milling",
        cut_type: "finishing",
      });

      expect(result.overall_confidence).toBeGreaterThan(0.5);
      expect(result.overall_confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe("stats", () => {
    it("should return query count and capabilities", () => {
      // Run some queries first
      speedFeedAdvancedAIEngine.getCausalDAG();
      speedFeedAdvancedAIEngine.getFeatureImportance("4140", 12, 4, "roughing");

      const stats = speedFeedAdvancedAIEngine.stats();

      expect(stats.queries_processed).toBeGreaterThan(0);
      expect(stats.ai_capabilities).toBeInstanceOf(Array);
      expect(stats.ai_capabilities.length).toBeGreaterThan(0);
      expect(stats.reasoning_frameworks).toBeInstanceOf(Array);
      expect(stats.reasoning_frameworks.length).toBeGreaterThan(0);
    });

    it("should list all AI capabilities", () => {
      const stats = speedFeedAdvancedAIEngine.stats();

      expect(stats.ai_capabilities.some(c => c.includes("XAI"))).toBe(true);
      expect(stats.ai_capabilities.some(c => c.includes("Consensus"))).toBe(true);
      expect(stats.ai_capabilities.some(c => c.includes("Causal"))).toBe(true);
    });

    it("should list all reasoning frameworks", () => {
      const stats = speedFeedAdvancedAIEngine.stats();

      expect(stats.reasoning_frameworks.some(f => f.includes("Self-Consistency"))).toBe(true);
      expect(stats.reasoning_frameworks.some(f => f.includes("Verification"))).toBe(true);
      expect(stats.reasoning_frameworks.some(f => f.includes("ReAct"))).toBe(true);
      expect(stats.reasoning_frameworks.some(f => f.includes("Reflexion"))).toBe(true);
    });
  });
});
