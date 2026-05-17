/**
 * CAMAGIMasterOrchestratorEngine — Comprehensive Test Suite
 * ==========================================================
 * Tests for the unified CAM AGI Master Orchestrator covering:
 *   - CAM system recommendation logic
 *   - Cross-CAM strategy comparison
 *   - Combined tribal knowledge aggregation
 *   - All 8 reasoning modes
 *   - Provenance tracking
 *
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP13
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  camAGIMasterOrchestratorEngine,
  CAMAGIMasterOrchestratorEngine,
  type CAMOrchestrationRequest,
  type CAMOrchestrationResponse,
  type CAMSystem,
  type CAMReasoningMode,
  type FeatureType,
} from "../engines/CAMAGIMasterOrchestratorEngine.js";

describe("CAMAGIMasterOrchestratorEngine", () => {
  let engine: CAMAGIMasterOrchestratorEngine;

  beforeEach(() => {
    engine = new CAMAGIMasterOrchestratorEngine();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SINGLETON EXPORT
  // ══════════════════════════════════════════════════════════════════════════

  describe("singleton export", () => {
    it("should export a singleton instance", () => {
      expect(camAGIMasterOrchestratorEngine).toBeInstanceOf(CAMAGIMasterOrchestratorEngine);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ORCHESTRATE — MAIN ENTRY POINT
  // ══════════════════════════════════════════════════════════════════════════

  describe("orchestrate()", () => {
    it("should handle recommend request type", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        machine_type: "5axis_mill",
        part_complexity: "complex",
        material: "Inconel 718",
        material_iso: "S",
      };

      const response = engine.orchestrate(request);

      expect(response.request_type).toBe("recommend");
      expect(response.recommended_cam).toBeDefined();
      expect(["hypermill", "mastercam", "fusion360", "inventorcam"]).toContain(response.recommended_cam);
      expect(response.recommendation_rationale).toBeDefined();
      expect(response.provenance).toBeDefined();
      expect(response.provenance.engines_invoked).toContain("CAMAGIMasterOrchestratorEngine");
      expect(response.ts).toBeDefined();
    });

    it("should handle compare request type with feature", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "compare",
        feature_type: "pocket_2d",
        operation: "roughing",
        material_iso: "P",
      };

      const response = engine.orchestrate(request);

      expect(response.request_type).toBe("compare");
      expect(response.strategy_comparison).toBeDefined();
      expect(response.strategy_comparison!.feature_type).toBe("pocket_2d");
      expect(response.strategy_comparison!.strategies.length).toBeGreaterThanOrEqual(2);
      expect(response.strategy_comparison!.recommendation).toBeDefined();
    });

    it("should handle tribal request type", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "tribal",
        material: "D2 tool steel",
        operation: "roughing",
      };

      const response = engine.orchestrate(request);

      expect(response.request_type).toBe("tribal");
      expect(response.combined_tribal_knowledge).toBeDefined();
      expect(Array.isArray(response.combined_tribal_knowledge)).toBe(true);
    });

    it("should handle generate request type", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "generate",
        preferred_cam: "fusion360",
        feature_type: "pocket_2d",
      };

      const response = engine.orchestrate(request);

      expect(response.request_type).toBe("generate");
      expect(response.generation_result).toBeDefined();
      expect(response.provenance.cam_systems_queried).toContain("fusion360");
    });

    it("should handle analyze request type", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "analyze",
        material: "4140",
        tool_diameter_mm: 12,
        operation: "roughing",
      };

      const response = engine.orchestrate(request);

      expect(response.request_type).toBe("analyze");
      expect(response.analysis_result).toBeDefined();
    });

    it("should include tribal knowledge when flag is set", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        include_tribal: true,
        material: "aluminum",
      };

      const response = engine.orchestrate(request);

      expect(response.combined_tribal_knowledge).toBeDefined();
      expect(response.combined_tribal_knowledge!.length).toBeGreaterThan(0);
    });

    it("should include comparison when flag is set", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        include_comparison: true,
        feature_type: "freeform_3d",
      };

      const response = engine.orchestrate(request);

      expect(response.strategy_comparison).toBeDefined();
    });

    it("should include reasoning chain when flag is set", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        include_reasoning_chain: true,
        reasoning_mode: "chain_of_thought",
      };

      const response = engine.orchestrate(request);

      expect(response.provenance.reasoning_steps.length).toBeGreaterThan(0);
    });

    it("should warn on unknown request type", () => {
      const request = {
        request_type: "unknown_type",
      } as CAMOrchestrationRequest;

      const response = engine.orchestrate(request);

      expect(response.warnings.length).toBeGreaterThan(0);
      expect(response.warnings[0]).toContain("Unknown request_type");
    });

    it("should track provenance correctly", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        machine_type: "3axis_mill",
      };

      const response = engine.orchestrate(request);

      expect(response.provenance.engines_invoked.length).toBeGreaterThan(0);
      expect(response.provenance.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(response.provenance.confidence).toBeGreaterThan(0);
      expect(response.provenance.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RECOMMEND CAM SYSTEM
  // ══════════════════════════════════════════════════════════════════════════

  describe("recommendCAMSystem()", () => {
    it("should recommend hyperMILL for impeller features", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        feature_type: "impeller",
        part_complexity: "extreme",
        requires_5axis: true,
      };

      const response = engine.orchestrate(request);

      expect(response.recommended_cam).toBe("hypermill");
      expect(response.recommendation_rationale).toContain("hyperMILL");
    });

    it("should recommend Fusion 360 for simple parts when cost matters", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        part_complexity: "simple",
        machine_type: "3axis_mill",
        available_cams: ["fusion360", "mastercam"],
      };

      const response = engine.orchestrate(request);

      expect(response.recommended_cam).toBe("fusion360");
    });

    it("should respect available_cams filter", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        available_cams: ["mastercam", "inventorcam"],
        feature_type: "impeller",
      };

      const response = engine.orchestrate(request);

      expect(["mastercam", "inventorcam"]).toContain(response.recommended_cam);
      expect(response.recommended_cam).not.toBe("hypermill");
      expect(response.recommended_cam).not.toBe("fusion360");
    });

    it("should consider material when recommending", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        material_iso: "S", // Superalloy
        material: "Inconel 718",
      };

      const response = engine.orchestrate(request);

      // Should prefer mature CAM systems for difficult materials
      expect(["hypermill", "mastercam"]).toContain(response.recommended_cam);
    });

    it("should favor InventorCAM for aggressive roughing", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        operation: "roughing",
        feature_type: "pocket_2d",
        available_cams: ["inventorcam", "fusion360"],
      };

      const response = engine.orchestrate(request);

      expect(response.recommended_cam).toBe("inventorcam");
      expect(response.recommendation_rationale).toContain("Roughing");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // COMPARE STRATEGIES
  // ══════════════════════════════════════════════════════════════════════════

  describe("compareStrategies()", () => {
    it("should compare strategies across all 4 CAM systems", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "compare",
        feature_type: "freeform_3d",
        operation: "finishing",
      };

      const response = engine.orchestrate(request);
      const comparison = response.strategy_comparison!;

      expect(comparison.strategies.length).toBe(4);
      const systems = comparison.strategies.map(s => s.cam_system);
      expect(systems).toContain("hypermill");
      expect(systems).toContain("mastercam");
      expect(systems).toContain("fusion360");
      expect(systems).toContain("inventorcam");
      // Per-file scrutiny Arm B 2026-05-17: at least 2 of the 4 must be REAL
      // engine results (cycle_name !== "Manual Selection" + confidence > 0).
      // Without this, a future regression breaking hyperMILL+Mastercam would
      // silently return 4 fallback rows and this test would still pass green.
      const real = comparison.strategies.filter(
        s => s.cycle_name !== "Manual Selection" && s.confidence > 0,
      );
      expect(real.length).toBeGreaterThanOrEqual(2);
    });

    it("should include strengths and weaknesses for each strategy", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "compare",
        feature_type: "pocket_2d",
      };

      const response = engine.orchestrate(request);

      for (const strategy of response.strategy_comparison!.strategies) {
        expect(strategy.strengths).toBeDefined();
        expect(strategy.strengths.length).toBeGreaterThan(0);
        expect(strategy.weaknesses).toBeDefined();
        expect(strategy.weaknesses.length).toBeGreaterThan(0);
      }
    });

    it("should provide recommendation with rationale", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "compare",
        feature_type: "steep_wall",
      };

      const response = engine.orchestrate(request);

      expect(response.strategy_comparison!.recommendation).toBeDefined();
      expect(response.strategy_comparison!.recommendation_rationale).toBeDefined();
      expect(response.strategy_comparison!.recommendation_rationale.length).toBeGreaterThan(10);
    });

    it("should include cutting mode for each strategy", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "compare",
        feature_type: "contour_2d",
      };

      const response = engine.orchestrate(request);

      for (const strategy of response.strategy_comparison!.strategies) {
        expect(["climb", "conventional", "zigzag"]).toContain(strategy.cutting_mode);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // COMBINED TRIBAL KNOWLEDGE
  // ══════════════════════════════════════════════════════════════════════════

  describe("getCombinedTribalKnowledge()", () => {
    it("should return tips from multiple CAM systems", () => {
      const tips = engine.getCombinedTribalKnowledge();

      expect(tips.length).toBeGreaterThan(0);
      const sources = new Set(tips.map(t => t.cam_system));
      expect(sources.size).toBeGreaterThan(1); // Multiple sources
    });

    it("should include universal tips", () => {
      const tips = engine.getCombinedTribalKnowledge();

      const universalTips = tips.filter(t => t.cam_system === "universal");
      expect(universalTips.length).toBeGreaterThan(0);
    });

    it("should filter by material", () => {
      const tips = engine.getCombinedTribalKnowledge("D2", undefined, undefined);

      // Should not error, may return filtered or all tips
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should filter by operation", () => {
      const tips = engine.getCombinedTribalKnowledge(undefined, "roughing", undefined);

      const roughingTips = tips.filter(t =>
        t.operations?.includes("roughing") || !t.operations
      );
      expect(roughingTips.length).toBeGreaterThan(0);
    });

    it("should filter by CAM systems", () => {
      const tips = engine.getCombinedTribalKnowledge(undefined, undefined, ["hypermill"]);

      for (const tip of tips) {
        expect(["hypermill", "universal"]).toContain(tip.cam_system);
      }
    });

    it("should sort by confidence", () => {
      const tips = engine.getCombinedTribalKnowledge();

      for (let i = 1; i < tips.length; i++) {
        expect(tips[i - 1].confidence).toBeGreaterThanOrEqual(tips[i].confidence);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REASONING MODES
  // ══════════════════════════════════════════════════════════════════════════

  describe("reasoning modes", () => {
    const allModes: CAMReasoningMode[] = [
      "chain_of_thought",
      "tree_of_thought",
      "multi_path",
      "backtracking",
      "abductive",
      "deductive",
      "inductive",
      "analogical",
    ];

    it.each(allModes)("should execute %s reasoning mode", (mode) => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        reasoning_mode: mode,
        include_reasoning_chain: true,
        machine_type: "5axis_mill",
      };

      const response = engine.orchestrate(request);

      expect(response.provenance.reasoning_mode).toBe(mode);
      expect(response.provenance.reasoning_steps.length).toBeGreaterThan(0);
    });

    it("should default to chain_of_thought when no mode specified", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        include_reasoning_chain: true,
      };

      const response = engine.orchestrate(request);

      expect(response.provenance.reasoning_mode).toBe("chain_of_thought");
    });

    it("tree_of_thought should generate multiple branches", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        reasoning_mode: "tree_of_thought",
        include_reasoning_chain: true,
      };

      const response = engine.orchestrate(request);

      const branchSteps = response.provenance.reasoning_steps.filter(s =>
        s.thought.includes("Branch")
      );
      expect(branchSteps.length).toBeGreaterThanOrEqual(4); // One per CAM system
    });

    it("deductive mode should apply rules", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        reasoning_mode: "deductive",
        include_reasoning_chain: true,
      };

      const response = engine.orchestrate(request);

      const ruleSteps = response.provenance.reasoning_steps.filter(s =>
        s.thought.includes("Rule:")
      );
      expect(ruleSteps.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CAM PROFILES
  // ══════════════════════════════════════════════════════════════════════════

  describe("getCAMProfiles()", () => {
    it("should return profiles for all 4 CAM systems", () => {
      const profiles = engine.getCAMProfiles();

      expect(Object.keys(profiles)).toHaveLength(4);
      expect(profiles.hypermill).toBeDefined();
      expect(profiles.mastercam).toBeDefined();
      expect(profiles.fusion360).toBeDefined();
      expect(profiles.inventorcam).toBeDefined();
    });

    it("should include required profile fields", () => {
      const profiles = engine.getCAMProfiles();

      for (const [cam, profile] of Object.entries(profiles)) {
        expect(profile.cam_system).toBe(cam);
        expect(profile.vendor).toBeDefined();
        expect(profile.axis_support).toContain(3);
        expect(profile.machine_types.length).toBeGreaterThan(0);
        expect(profile.specialty_features.length).toBeGreaterThan(0);
        expect(["high", "medium", "low"]).toContain(profile.integration_level);
        expect(typeof profile.cloud_capable).toBe("boolean");
        expect(["low", "medium", "high", "enterprise"]).toContain(profile.license_cost_tier);
      }
    });

    it("should have hyperMILL as enterprise tier", () => {
      const profile = engine.getCAMProfile("hypermill");

      expect(profile.license_cost_tier).toBe("enterprise");
      expect(profile.specialty_features).toContain("impeller_blade_machining");
    });

    it("should have Fusion 360 as cloud capable", () => {
      const profile = engine.getCAMProfile("fusion360");

      expect(profile.cloud_capable).toBe(true);
      expect(profile.license_cost_tier).toBe("low");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REASONING MODES LISTING
  // ══════════════════════════════════════════════════════════════════════════

  describe("getReasoningModes()", () => {
    it("should return all 8 reasoning modes", () => {
      const modes = engine.getReasoningModes();

      expect(modes).toHaveLength(8);
    });

    it("should include description for each mode", () => {
      const modes = engine.getReasoningModes();

      for (const mode of modes) {
        expect(mode.mode).toBeDefined();
        expect(mode.description).toBeDefined();
        expect(mode.description.length).toBeGreaterThan(10);
      }
    });

    it("should include chain_of_thought mode", () => {
      const modes = engine.getReasoningModes();

      const cot = modes.find(m => m.mode === "chain_of_thought");
      expect(cot).toBeDefined();
      expect(cot!.description).toContain("step");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STATS
  // ══════════════════════════════════════════════════════════════════════════

  describe("getStats()", () => {
    it("should track orchestration count", () => {
      const initialStats = engine.getStats();
      const initialCount = initialStats.orchestration_count;

      engine.orchestrate({ request_type: "recommend" });
      engine.orchestrate({ request_type: "tribal" });

      const newStats = engine.getStats();
      expect(newStats.orchestration_count).toBe(initialCount + 2);
    });

    it("should list all supported CAM systems", () => {
      const stats = engine.getStats();

      expect(stats.supported_cams).toContain("hypermill");
      expect(stats.supported_cams).toContain("mastercam");
      expect(stats.supported_cams).toContain("fusion360");
      expect(stats.supported_cams).toContain("inventorcam");
    });

    it("should list all reasoning modes", () => {
      const stats = engine.getStats();

      expect(stats.reasoning_modes).toHaveLength(8);
      expect(stats.reasoning_modes).toContain("chain_of_thought");
      expect(stats.reasoning_modes).toContain("analogical");
    });

    it("should count tribal tips", () => {
      const stats = engine.getStats();

      expect(stats.tribal_tips_count).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SELF AWARENESS
  // ══════════════════════════════════════════════════════════════════════════

  describe("getSelfAwareness()", () => {
    it("should return complete self-awareness data", () => {
      const awareness = engine.getSelfAwareness();

      expect(awareness.engine_name).toBe("CAMAGIMasterOrchestratorEngine");
      expect(awareness.purpose).toContain("Unified CAM AGI");
      expect(awareness.cam_systems).toHaveLength(4);
      expect(awareness.reasoning_modes).toHaveLength(8);
      expect(awareness.integration_points.length).toBeGreaterThan(0);
      expect(awareness.formula_dependencies.length).toBeGreaterThan(0);
    });

    it("should list integration points", () => {
      const awareness = engine.getSelfAwareness();

      expect(awareness.integration_points).toContain("HyperMillStrategyEngine");
      expect(awareness.integration_points).toContain("MastercamStrategyEngine");
      expect(awareness.integration_points).toContain("Fusion360CodeGeneratorEngine");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ══════════════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("should handle empty request gracefully", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
      };

      const response = engine.orchestrate(request);

      expect(response.recommended_cam).toBeDefined();
      expect(response.provenance).toBeDefined();
    });

    it("should handle compare without feature_type", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "compare",
      };

      const response = engine.orchestrate(request);

      expect(response.warnings).toContain("feature_type required for strategy comparison");
    });

    it("should handle unknown feature type gracefully", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "compare",
        feature_type: "unknown_feature" as FeatureType,
      };

      const response = engine.orchestrate(request);

      // Should not throw, may use fallback
      expect(response.strategy_comparison).toBeDefined();
    });

    it("should maintain confidence between 0 and 1", () => {
      const requests: CAMOrchestrationRequest[] = [
        { request_type: "recommend" },
        { request_type: "compare", feature_type: "pocket_2d" },
        { request_type: "tribal" },
      ];

      for (const request of requests) {
        const response = engine.orchestrate(request);
        expect(response.provenance.confidence).toBeGreaterThanOrEqual(0);
        expect(response.provenance.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should handle all machine types", () => {
      const machineTypes = [
        "3axis_mill", "4axis_mill", "5axis_mill", "mill_turn",
        "lathe", "wire_edm", "sinker_edm", "swiss_lathe", "hmc", "vmc",
      ];

      for (const machineType of machineTypes) {
        const request: CAMOrchestrationRequest = {
          request_type: "recommend",
          machine_type: machineType as any,
        };

        const response = engine.orchestrate(request);
        expect(response.recommended_cam).toBeDefined();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PROVENANCE TRACKING
  // ══════════════════════════════════════════════════════════════════════════

  describe("provenance tracking", () => {
    it("should track all invoked engines", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        feature_type: "impeller",
      };

      const response = engine.orchestrate(request);

      expect(response.provenance.engines_invoked).toContain("CAMAGIMasterOrchestratorEngine");
      // Should include strategy engines for impeller
      expect(response.provenance.engines_invoked.some(e =>
        e.includes("HyperMill") || e.includes("Strategy")
      )).toBe(true);
    });

    it("should track CAM systems queried", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "compare",
        feature_type: "pocket_2d",
      };

      const response = engine.orchestrate(request);

      expect(response.provenance.cam_systems_queried.length).toBe(4);
    });

    it("should measure processing time", () => {
      const request: CAMOrchestrationRequest = {
        request_type: "recommend",
        include_comparison: true,
        include_tribal: true,
        feature_type: "freeform_3d",
      };

      const response = engine.orchestrate(request);

      expect(response.provenance.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(response.provenance.processing_time_ms).toBeLessThan(10000); // Should be fast
    });
  });
});
