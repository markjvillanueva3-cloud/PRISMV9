/**
 * WireEDMMasterAIEngine Tests
 *
 * Tests the master AI orchestration layer for Wire EDM including:
 *   - Multi-engine coordination
 *   - Tree-of-thought reasoning
 *   - Hypothesis ranking
 *   - Counterfactual analysis
 *   - Tribal knowledge integration
 *
 * @module __tests__/WireEDMMasterAIEngine.test
 */

import { describe, it, expect } from "vitest";
import {
  wireEDMMasterAIEngine,
  type MasterAIRequest,
  type MasterAIResult,
} from "../engines/WireEDMMasterAIEngine.js";

// ============================================================================
// BASIC ANALYSIS TESTS
// ============================================================================

describe("WireEDMMasterAIEngine", () => {
  describe("analyze", () => {
    it("performs parameter selection analysis", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "quick",
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.domain).toBe("parameter_selection");
      expect(result.depth).toBe("quick");
      expect(result.recommendation).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reasoning_chain.length).toBeGreaterThanOrEqual(3);
      expect(result.engines_consulted.length).toBeGreaterThan(0);
    });

    it("performs troubleshooting analysis", async () => {
      const request: MasterAIRequest = {
        domain: "troubleshooting",
        depth: "standard",
        question: "Wire keeps breaking during roughing pass",
        material: "D2",
        thickness_mm: 50,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.domain).toBe("troubleshooting");
      expect(result.recommendation).toBeTruthy();
      expect(result.ranked_hypotheses).toBeDefined();
      expect(result.ranked_hypotheses!.length).toBeGreaterThan(0);
    });

    it("performs optimization analysis", async () => {
      const request: MasterAIRequest = {
        domain: "optimization",
        depth: "standard",
        program_content: "G21\nE1221\nG01 X10.0 Y10.0\nM30",
        include_counterfactuals: true,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.domain).toBe("optimization");
      expect(result.counterfactuals).toBeDefined();
      expect(result.counterfactuals!.length).toBeGreaterThan(0);
    });

    it("includes tribal knowledge when requested", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "standard",
        material: "D2",
        thickness_mm: 25,
        include_tribal_knowledge: true,
        jm_die_context: true,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      // Tribal knowledge may or may not be available
      expect(result.tribal_knowledge).toBeDefined();
    });
  });

  // ============================================================================
  // REASONING DEPTH TESTS
  // ============================================================================

  describe("reasoning depth", () => {
    it("quick depth produces fewer steps", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "quick",
        material: "D2",
        thickness_mm: 25,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.total_reasoning_steps).toBeLessThanOrEqual(10);
      expect(result.thought_tree).toBeUndefined();
    });

    it("deep depth produces thought tree", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "deep",
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.15,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.thought_tree).toBeDefined();
      expect(result.thought_tree!.id).toBe("root");
      expect(result.thought_tree!.sub_branches).toBeDefined();
      expect(result.thought_tree!.sub_branches!.length).toBeGreaterThan(0);
    });

    it("exhaustive depth produces comprehensive analysis", async () => {
      const request: MasterAIRequest = {
        domain: "program_generation",
        depth: "exhaustive",
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.total_reasoning_steps).toBeGreaterThan(5);
      expect(result.ranked_hypotheses).toBeDefined();
      expect(result.counterfactuals).toBeDefined();
    });
  });

  // ============================================================================
  // SPECIALIZED ANALYSIS METHODS
  // ============================================================================

  describe("analyzeParameters", () => {
    it("analyzes parameters for standard D2 case", async () => {
      const result = await wireEDMMasterAIEngine.analyzeParameters("D2", 25, 0.8);

      expect(result.domain).toBe("parameter_selection");
      expect(result.recommendation).toContain("D2");
      expect(result.engine_insights.length).toBeGreaterThan(0);
    });

    it("analyzes parameters for ACU precision case", async () => {
      const result = await wireEDMMasterAIEngine.analyzeParameters("A2", 12.7, 0.15);

      expect(result.recommendation).toBeTruthy();
      expect(result.ranked_hypotheses).toBeDefined();
      // Should suggest ACU for Ra < 0.2
      expect(
        result.ranked_hypotheses?.some(h => h.id.includes("acu"))
      ).toBe(true);
    });

    it("analyzes parameters for thick section", async () => {
      const result = await wireEDMMasterAIEngine.analyzeParameters("D2", 100, 1.6);

      expect(result.recommendation).toBeTruthy();
      // Should mention thick section considerations
      expect(
        result.ranked_hypotheses?.some(h => h.description.toLowerCase().includes("thick"))
      ).toBe(true);
    });
  });

  describe("troubleshoot", () => {
    it("troubleshoots wire break issues", async () => {
      const result = await wireEDMMasterAIEngine.troubleshoot(
        "Wire breaks frequently during cutting",
        {
          material: "D2",
          thickness_mm: 75,
          current_params: { tension: 1200, on_time_us: 6 },
        }
      );

      expect(result.domain).toBe("troubleshooting");
      expect(result.ranked_hypotheses).toBeDefined();
      expect(result.ranked_hypotheses!.length).toBeGreaterThan(0);
      expect(result.counterfactuals).toBeDefined();
    });

    it("troubleshoots poor finish issues", async () => {
      const result = await wireEDMMasterAIEngine.troubleshoot(
        "Surface finish is worse than expected",
        {
          material: "A2",
          thickness_mm: 25,
        }
      );

      expect(result.domain).toBe("troubleshooting");
      expect(result.recommendation).toBeTruthy();
    });
  });

  describe("optimizeProgram", () => {
    it("optimizes for quality", async () => {
      const programContent = `
G21
E1221
G92 X0 Y0
G01 X50.0 F0.12
G01 Y50.0
G01 X0
G01 Y0
M30
      `.trim();

      const result = await wireEDMMasterAIEngine.optimizeProgram(programContent, ["quality"]);

      expect(result.domain).toBe("optimization");
      expect(result.counterfactuals).toBeDefined();
    });

    it("optimizes for speed", async () => {
      const programContent = "E1221\nG01 X10 Y10\nM30";

      const result = await wireEDMMasterAIEngine.optimizeProgram(programContent, ["speed"]);

      expect(result.domain).toBe("optimization");
      expect(result.ranked_hypotheses).toBeDefined();
    });
  });

  describe("generateProgram", () => {
    it("generates program with full AI orchestration", async () => {
      const result = await wireEDMMasterAIEngine.generateProgram("D2", 25, 0.8);

      expect(result.domain).toBe("program_generation");
      expect(result.depth).toBe("exhaustive");
      expect(result.recommendation).toBeTruthy();
      expect(result.engines_consulted).toContain("WEDMCompleteOrchestrationEngine");
    });
  });

  // ============================================================================
  // HYPOTHESIS RANKING TESTS
  // ============================================================================

  describe("hypothesis ranking", () => {
    it("ranks hypotheses by expected value", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "standard",
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.15,
        max_hypotheses: 5,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.ranked_hypotheses).toBeDefined();
      expect(result.ranked_hypotheses!.length).toBeLessThanOrEqual(5);

      // Verify sorted by expected value
      const hypotheses = result.ranked_hypotheses!;
      for (let i = 1; i < hypotheses.length; i++) {
        expect(hypotheses[i - 1].expected_value).toBeGreaterThanOrEqual(
          hypotheses[i].expected_value
        );
      }
    });

    it("includes confidence intervals", async () => {
      const request: MasterAIRequest = {
        domain: "troubleshooting",
        depth: "standard",
        question: "Wire keeps breaking",
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.ranked_hypotheses).toBeDefined();
      for (const h of result.ranked_hypotheses!) {
        expect(h.confidence_interval).toBeDefined();
        expect(h.confidence_interval[0]).toBeLessThanOrEqual(h.probability);
        expect(h.confidence_interval[1]).toBeGreaterThanOrEqual(h.probability);
      }
    });
  });

  // ============================================================================
  // COUNTERFACTUAL ANALYSIS TESTS
  // ============================================================================

  describe("counterfactual analysis", () => {
    it("generates counterfactual scenarios", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "standard",
        material: "D2",
        thickness_mm: 25,
        wire_diameter_mm: 0.25,
        include_counterfactuals: true,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.counterfactuals).toBeDefined();
      expect(result.counterfactuals!.length).toBeGreaterThan(0);

      const cf = result.counterfactuals![0];
      expect(cf.variable).toBeTruthy();
      expect(cf.original_value).toBeDefined();
      expect(cf.alternative_value).toBeDefined();
      expect(cf.predicted_outcome).toBeTruthy();
      expect(["low", "medium", "high"]).toContain(cf.risk_assessment);
    });

    it("skips counterfactuals when not requested", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "quick",
        material: "D2",
        thickness_mm: 25,
        include_counterfactuals: false,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.counterfactuals).toBeUndefined();
    });
  });

  // ============================================================================
  // ENGINE COORDINATION TESTS
  // ============================================================================

  describe("engine coordination", () => {
    it("consults correct engines for parameter selection", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "quick",
        material: "D2",
        thickness_mm: 25,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.engines_consulted).toContain("WireEDMSettingsEngine");
      expect(result.engines_consulted).toContain("WireEDMDeepAIHardeningEngine");
    });

    it("consults correct engines for troubleshooting", async () => {
      const request: MasterAIRequest = {
        domain: "troubleshooting",
        depth: "quick",
        question: "Wire breaks",
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.engines_consulted).toContain("WEDMFeedbackCalibrationEngine");
    });

    it("collects insights from multiple engines", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "standard",
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      expect(result.engine_insights.length).toBeGreaterThan(0);
      for (const insight of result.engine_insights) {
        expect(insight.engine).toBeTruthy();
        expect(insight.insight).toBeTruthy();
        expect(insight.confidence).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // COST OPTIMIZATION TESTS
  // ============================================================================

  describe("cost optimization", () => {
    it("generates cost-optimized strategy recommendations", async () => {
      const result = await wireEDMMasterAIEngine.optimizeForCost("D2", 25, 0.8);

      expect(result.recommended_strategy).toBeDefined();
      expect(result.all_strategies.length).toBe(4);
      expect(result.cost_breakdown).toBeDefined();
      expect(result.cost_breakdown.total_cost_usd).toBeGreaterThan(0);
    });

    it("includes wire cost and machine time in breakdown", async () => {
      const result = await wireEDMMasterAIEngine.optimizeForCost("D2", 50, 0.4);

      expect(result.cost_breakdown.wire_cost_usd).toBeGreaterThan(0);
      expect(result.cost_breakdown.machine_time_cost_usd).toBeGreaterThan(0);
      expect(result.cost_breakdown.total_cost_usd).toBe(
        result.cost_breakdown.wire_cost_usd + result.cost_breakdown.machine_time_cost_usd
      );
    });

    it("ranks strategies by ROI", async () => {
      const result = await wireEDMMasterAIEngine.optimizeForCost("D2", 25, 0.8);

      // Strategies should be sorted by ROI score
      const strategies = result.all_strategies;
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].roi_score).toBeGreaterThanOrEqual(strategies[i].roi_score!);
      }
    });

    it("generates innovation suggestions", async () => {
      const result = await wireEDMMasterAIEngine.optimizeForCost("D2", 100, 0.15);

      expect(result.innovations).toBeDefined();
      // Thick section + fine finish should trigger innovations
      expect(result.innovations.length).toBeGreaterThan(0);
    });

    it("predicts quality outcomes with confidence", async () => {
      const result = await wireEDMMasterAIEngine.optimizeForCost("A2", 25, 0.8);

      expect(result.quality_prediction.expected_ra_um).toBeGreaterThan(0);
      expect(result.quality_prediction.confidence).toBeGreaterThan(0.5);
      expect(result.quality_prediction.risk_of_scrap_pct).toBeLessThan(50);
    });
  });

  describe("hybrid strategies", () => {
    it("generates hybrid pass strategy", async () => {
      const result = await wireEDMMasterAIEngine.generateHybridStrategy("D2", 25, 0.8);

      expect(result.hybrid_passes).toBeDefined();
      expect(result.hybrid_passes.num_passes).toBeGreaterThanOrEqual(3);
      expect(result.sources.physics_contribution).toBeGreaterThan(0);
    });

    it("blends speed and quality weights", async () => {
      const speedResult = await wireEDMMasterAIEngine.generateHybridStrategy("D2", 25, 0.8, {
        speed_weight: 0.8,
        quality_weight: 0.2,
      });

      const qualityResult = await wireEDMMasterAIEngine.generateHybridStrategy("D2", 25, 0.8, {
        speed_weight: 0.2,
        quality_weight: 0.8,
      });

      // Quality-focused should have more passes or lower predicted Ra
      expect(
        qualityResult.hybrid_passes.num_passes >= speedResult.hybrid_passes.num_passes ||
        qualityResult.predicted_outcome.ra_um <= speedResult.predicted_outcome.ra_um
      ).toBe(true);
    });

    it("applies innovation at different levels", async () => {
      const conservative = await wireEDMMasterAIEngine.generateHybridStrategy("D2", 25, 0.8, {
        innovation_level: "conservative",
      });

      const aggressive = await wireEDMMasterAIEngine.generateHybridStrategy("D2", 25, 0.8, {
        innovation_level: "aggressive",
      });

      expect(conservative.innovation_applied).toBe(false);
      expect(aggressive.innovation_applied).toBe(true);
    });
  });

  describe("critical analysis", () => {
    it("identifies hidden assumptions", async () => {
      const result = await wireEDMMasterAIEngine.criticalAnalysis(
        "Program not achieving target Ra",
        {
          material: "D2",
          thickness_mm: 75,
          current_approach: "Standard 4-pass",
        }
      );

      expect(result.assumptions.length).toBeGreaterThan(0);
      expect(result.assumptions[0].validity).toBeLessThanOrEqual(1);
    });

    it("generates challenges to conventional thinking", async () => {
      const result = await wireEDMMasterAIEngine.criticalAnalysis(
        "Optimize cycle time",
        { material: "A2" }
      );

      expect(result.challenges.length).toBeGreaterThan(0);
      expect(result.challenges[0].conventional_wisdom).toBeTruthy();
      expect(result.challenges[0].counter_argument).toBeTruthy();
    });

    it("suggests alternative approaches", async () => {
      const result = await wireEDMMasterAIEngine.criticalAnalysis(
        "Wire breaks frequently",
        { material: "D2", thickness_mm: 100 }
      );

      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(result.alternatives[0].applicability);
    });

    it("provides actionable next steps", async () => {
      const result = await wireEDMMasterAIEngine.criticalAnalysis(
        "Quality issues on new part",
        { material: "S7" }
      );

      expect(result.next_steps.length).toBeGreaterThan(0);
      expect(result.recommended_action).toBeTruthy();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe("performance", () => {
    it("completes quick analysis in reasonable time", async () => {
      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "quick",
        material: "D2",
        thickness_mm: 25,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);

      // Quick analysis should complete in under 5 seconds
      expect(result.processing_time_ms).toBeLessThan(5000);
    });

    it("tracks processing time accurately", async () => {
      const startTime = Date.now();

      const request: MasterAIRequest = {
        domain: "parameter_selection",
        depth: "standard",
        material: "D2",
        thickness_mm: 25,
      };

      const result = await wireEDMMasterAIEngine.analyze(request);
      const actualTime = Date.now() - startTime;

      // Processing time should be within 500ms of actual
      expect(Math.abs(result.processing_time_ms - actualTime)).toBeLessThan(500);
    });
  });
});
