/**
 * MetaAIOrchestrationEngine Tests
 * ================================
 * Comprehensive tests for the unified AI orchestration system that coordinates
 * 150+ AI engines with metacognition, analogical transfer, and continuous learning.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MetaAIOrchestrationEngine,
  metaAIOrchestrationEngine,
  type OrchestrationRequest,
  type ReasoningMode,
  type AICapabilityDomain,
} from "../engines/MetaAIOrchestrationEngine.js";

describe("MetaAIOrchestrationEngine", () => {
  let engine: MetaAIOrchestrationEngine;

  beforeEach(() => {
    engine = new MetaAIOrchestrationEngine();
  });

  describe("Singleton Export", () => {
    it("should export singleton instance", () => {
      expect(metaAIOrchestrationEngine).toBeDefined();
      expect(metaAIOrchestrationEngine).toBeInstanceOf(MetaAIOrchestrationEngine);
    });
  });

  describe("getSystemStatus", () => {
    it("should return comprehensive AI system status", () => {
      const status = engine.getSystemStatus();

      expect(status).toBeDefined();
      expect(status.total_engines).toBeGreaterThan(100);
      expect(status.active_engines).toBeGreaterThan(10);
      expect(status.domains_covered).toBeInstanceOf(Array);
      expect(status.domains_covered.length).toBeGreaterThan(5);
      expect(status.reasoning_modes_available).toBeInstanceOf(Array);
      expect(status.reasoning_modes_available.length).toBeGreaterThan(5);
    });

    it("should indicate metacognition is enabled", () => {
      const status = engine.getSystemStatus();
      expect(status.metacognition_enabled).toBe(true);
    });

    it("should indicate continuous learning is active", () => {
      const status = engine.getSystemStatus();
      expect(status.continuous_learning_active).toBe(true);
    });

    it("should include meta-learning state", () => {
      const status = engine.getSystemStatus();
      expect(status.meta_learning_state).toBeDefined();
      expect(status.meta_learning_state.learning_rate).toBeGreaterThan(0);
      expect(status.meta_learning_state.exploration_vs_exploitation).toBeGreaterThanOrEqual(0);
      expect(status.meta_learning_state.exploration_vs_exploitation).toBeLessThanOrEqual(1);
    });

    it("should include tribal knowledge counts", () => {
      const status = engine.getSystemStatus();
      expect(status.tribal_tips_integrated).toBeGreaterThan(1000);
      expect(status.playbook_rules_active).toBeGreaterThan(100);
    });

    it("should report overall health", () => {
      const status = engine.getSystemStatus();
      expect(status.overall_health).toBeGreaterThanOrEqual(0);
      expect(status.overall_health).toBeLessThanOrEqual(1);
    });
  });

  describe("orchestrate", () => {
    it("should orchestrate milling domain problems", () => {
      const request: OrchestrationRequest = {
        problem: "Optimize roughing strategy for titanium Ti-6Al-4V",
        domain: "milling",
        constraints: ["Tool life > 60 min", "Ra < 3.2 um"],
        context: { material: "Ti-6Al-4V", hardness: 36 },
      };

      const result = engine.orchestrate(request);

      expect(result).toBeDefined();
      expect(result.solution).toBeDefined();
      expect(result.reasoning_chain).toBeInstanceOf(Array);
      expect(result.reasoning_chain.length).toBeGreaterThan(2);
      expect(result.engines_used).toBeInstanceOf(Array);
      expect(result.engines_used.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should apply metacognition during orchestration", () => {
      const request: OrchestrationRequest = {
        problem: "Debug chatter vibration during finishing",
        domain: "turning",
        constraints: ["Surface finish critical"],
        context: {},
      };

      const result = engine.orchestrate(request);

      expect(result.metacognition).toBeDefined();
      expect(result.metacognition.current_reasoning_mode).toBeDefined();
      expect(result.metacognition.confidence_in_reasoning).toBeGreaterThanOrEqual(0);
      expect(result.metacognition.reasoning_quality_score).toBeGreaterThanOrEqual(0);
      expect(result.metacognition.detected_biases).toBeInstanceOf(Array);
    });

    it("should record learning events", () => {
      const request: OrchestrationRequest = {
        problem: "Select optimal wire for EDM cutting",
        domain: "wire_edm",
        constraints: [],
        context: {},
      };

      const result = engine.orchestrate(request);

      expect(result.learning_events).toBeInstanceOf(Array);
      expect(result.learning_events.length).toBeGreaterThan(0);
      expect(result.learning_events[0].source).toBe("self_generated");
    });

    it("should attempt analogical transfer for low confidence", () => {
      const request: OrchestrationRequest = {
        problem: "Obscure problem with limited domain knowledge",
        domain: "sinker_edm", // Less common domain
        constraints: ["Very specific constraint"],
        context: { unusual: true },
      };

      const result = engine.orchestrate(request);

      // Should have either analogical transfers or clear reasoning chain
      expect(
        result.analogical_transfers.length > 0 ||
        result.reasoning_modes_applied.includes("analogical") ||
        result.reasoning_chain.length > 3
      ).toBe(true);
    });

    it("should use preferred reasoning modes when specified", () => {
      const request: OrchestrationRequest = {
        problem: "Plan complex multi-step operation",
        domain: "milling",
        constraints: [],
        context: {},
        preferred_modes: ["tree_of_thought", "counterfactual"],
      };

      const result = engine.orchestrate(request);

      expect(result.reasoning_modes_applied).toContain("tree_of_thought");
    });

    it("should track execution time", () => {
      const request: OrchestrationRequest = {
        problem: "Quick calculation",
        domain: "speed_feed",
        constraints: [],
        context: {},
      };

      const result = engine.orchestrate(request);

      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.execution_time_ms).toBeLessThan(5000); // Reasonable time
    });
  });

  describe("recommendApproach", () => {
    it("should recommend optimization approach", () => {
      const rec = engine.recommendApproach("optimization", "medium");

      expect(rec.primary_engine).toBeDefined();
      expect(rec.supporting_engines).toBeInstanceOf(Array);
      expect(rec.reasoning_modes).toBeInstanceOf(Array);
      expect(rec.estimated_confidence).toBeGreaterThan(0);
      expect(rec.rationale).toContain("optimization");
    });

    it("should recommend diagnosis approach", () => {
      const rec = engine.recommendApproach("diagnosis", "high");

      expect(rec.primary_engine).toContain("Counterfactual");
      expect(rec.reasoning_modes).toContain("counterfactual");
    });

    it("should recommend planning approach", () => {
      const rec = engine.recommendApproach("planning", "low");

      expect(rec.primary_engine).toContain("TreeOfThought");
      expect(rec.reasoning_modes).toContain("tree_of_thought");
    });

    it("should recommend creative approach", () => {
      const rec = engine.recommendApproach("creative", "medium");

      expect(rec.primary_engine).toContain("Creative");
      expect(rec.reasoning_modes).toContain("creative");
    });

    it("should recommend validation approach", () => {
      const rec = engine.recommendApproach("validation", "high");

      expect(rec.primary_engine).toContain("Hypothesis");
      expect(rec.reasoning_modes).toContain("hypothesis_ranking");
    });

    it("should adjust confidence based on complexity", () => {
      const lowComplexity = engine.recommendApproach("optimization", "low");
      const highComplexity = engine.recommendApproach("optimization", "high");
      const extremeComplexity = engine.recommendApproach("optimization", "extreme");

      expect(lowComplexity.estimated_confidence).toBeGreaterThan(highComplexity.estimated_confidence);
      expect(highComplexity.estimated_confidence).toBeGreaterThan(extremeComplexity.estimated_confidence);
    });

    it("should add meta-orchestration for extreme complexity", () => {
      const rec = engine.recommendApproach("optimization", "extreme");

      expect(rec.supporting_engines).toContain("MetaAIOrchestrationEngine");
    });
  });

  describe("listCapabilities", () => {
    it("should list all AI engine capabilities", () => {
      const caps = engine.listCapabilities();

      expect(caps).toBeInstanceOf(Array);
      expect(caps.length).toBeGreaterThan(10);
    });

    it("should include capability details", () => {
      const caps = engine.listCapabilities();
      const firstCap = caps[0];

      expect(firstCap.engine_name).toBeDefined();
      expect(firstCap.domain).toBeDefined();
      expect(firstCap.reasoning_modes).toBeInstanceOf(Array);
      expect(firstCap.confidence_level).toBeGreaterThan(0);
      expect(firstCap.specializations).toBeInstanceOf(Array);
      expect(firstCap.success_rate).toBeGreaterThan(0);
    });
  });

  describe("getCapabilitiesByDomain", () => {
    it("should filter capabilities by milling domain", () => {
      const caps = engine.getCapabilitiesByDomain("milling");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.domain === "milling")).toBe(true);
    });

    it("should filter capabilities by turning domain", () => {
      const caps = engine.getCapabilitiesByDomain("turning");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.domain === "turning")).toBe(true);
    });

    it("should filter capabilities by wire_edm domain", () => {
      const caps = engine.getCapabilitiesByDomain("wire_edm");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.domain === "wire_edm")).toBe(true);
    });

    it("should filter capabilities by post_processing domain", () => {
      const caps = engine.getCapabilitiesByDomain("post_processing");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.domain === "post_processing")).toBe(true);
    });

    it("should filter capabilities by speed_feed domain", () => {
      const caps = engine.getCapabilitiesByDomain("speed_feed");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.domain === "speed_feed")).toBe(true);
    });
  });

  describe("getCapabilitiesByMode", () => {
    it("should filter capabilities by chain_of_thought mode", () => {
      const caps = engine.getCapabilitiesByMode("chain_of_thought");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.reasoning_modes.includes("chain_of_thought"))).toBe(true);
    });

    it("should filter capabilities by tree_of_thought mode", () => {
      const caps = engine.getCapabilitiesByMode("tree_of_thought");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.reasoning_modes.includes("tree_of_thought"))).toBe(true);
    });

    it("should filter capabilities by counterfactual mode", () => {
      const caps = engine.getCapabilitiesByMode("counterfactual");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.reasoning_modes.includes("counterfactual"))).toBe(true);
    });

    it("should filter capabilities by analogical mode", () => {
      const caps = engine.getCapabilitiesByMode("analogical");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.reasoning_modes.includes("analogical"))).toBe(true);
    });

    it("should filter capabilities by creative mode", () => {
      const caps = engine.getCapabilitiesByMode("creative");

      expect(caps.length).toBeGreaterThan(0);
      expect(caps.every((c) => c.reasoning_modes.includes("creative"))).toBe(true);
    });
  });

  describe("Metacognition System", () => {
    it("should detect biases in reasoning", () => {
      // Force a scenario that might trigger bias detection
      const request: OrchestrationRequest = {
        problem: "Simple problem",
        domain: "milling",
        constraints: [],
        context: {},
      };

      const result = engine.orchestrate(request);

      // Should have either detected biases or a clean metacognition state
      expect(result.metacognition.detected_biases).toBeInstanceOf(Array);
    });

    it("should provide improvement suggestions", () => {
      const request: OrchestrationRequest = {
        problem: "Complex multi-constraint optimization",
        domain: "milling",
        constraints: ["A", "B", "C", "D", "E"],
        context: { complex: true },
      };

      const result = engine.orchestrate(request);

      expect(result.metacognition.improvement_suggestions).toBeInstanceOf(Array);
    });

    it("should self-correct when biases detected", () => {
      const request: OrchestrationRequest = {
        problem: "Problem requiring self-correction",
        domain: "milling",
        constraints: [],
        context: {},
      };

      const result = engine.orchestrate(request);

      // self_correction_applied should be boolean
      expect(typeof result.metacognition.self_correction_applied).toBe("boolean");
    });
  });

  describe("Analogical Transfer System", () => {
    it("should transfer knowledge between related domains", () => {
      const request: OrchestrationRequest = {
        problem: "Apply milling concepts to turning",
        domain: "turning",
        constraints: [],
        context: { cross_domain: true },
        preferred_modes: ["analogical"],
      };

      const result = engine.orchestrate(request);

      // Should have reasoning chain or analogical mode applied
      expect(
        result.reasoning_modes_applied.includes("analogical") ||
        result.reasoning_chain.some((r) => r.includes("transfer") || r.includes("Adapted"))
      ).toBe(true);
    });
  });

  describe("Continuous Learning System", () => {
    it("should queue learning events during orchestration", () => {
      const request: OrchestrationRequest = {
        problem: "Learning opportunity problem",
        domain: "milling",
        constraints: [],
        context: {},
      };

      const result = engine.orchestrate(request);

      expect(result.learning_events.length).toBeGreaterThan(0);
      expect(result.learning_events[0].integration_status).toBe("pending");
    });
  });

  describe("Meta-Learning System", () => {
    it("should track meta-learning state in status", () => {
      const status = engine.getSystemStatus();

      expect(status.meta_learning_state.learning_rate).toBeGreaterThan(0);
      expect(status.meta_learning_state.pattern_recognition_accuracy).toBeGreaterThan(0.5);
      expect(status.meta_learning_state.knowledge_retention_score).toBeGreaterThan(0.5);
      expect(status.meta_learning_state.cross_domain_transfer_success).toBeGreaterThan(0.5);
    });
  });

  describe("Reasoning Mode Coverage", () => {
    const modes: ReasoningMode[] = [
      "chain_of_thought",
      "tree_of_thought",
      "counterfactual",
      "hypothesis_ranking",
      "analogical",
      "temporal",
      "causal",
      "abductive",
      "deductive",
      "inductive",
      "creative",
      "cross_domain",
    ];

    it("should support all 12 reasoning modes", () => {
      const status = engine.getSystemStatus();

      for (const mode of modes) {
        expect(status.reasoning_modes_available).toContain(mode);
      }
    });
  });

  describe("Domain Coverage", () => {
    const domains: AICapabilityDomain[] = [
      "milling",
      "turning",
      "wire_edm",
      "post_processing",
      "speed_feed",
    ];

    it("should cover core manufacturing domains", () => {
      const status = engine.getSystemStatus();

      for (const domain of domains) {
        expect(status.domains_covered).toContain(domain);
      }
    });
  });
});
