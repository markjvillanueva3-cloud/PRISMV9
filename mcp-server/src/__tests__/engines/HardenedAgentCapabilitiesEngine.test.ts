/**
 * Tests for HardenedAgentCapabilitiesEngine
 *
 * Tests physics grounding, cross-verification, tribal gates,
 * self-correction, uncertainty propagation, and calibration.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HardenedAgentCapabilitiesEngine,
  hardenedAgentCapabilities,
  type PhysicsGrounding,
  type HardenedAgentResult,
  type HardeningConfig,
} from "../../engines/HardenedAgentCapabilitiesEngine.js";

describe("HardenedAgentCapabilitiesEngine", () => {
  // ==========================================================================
  // INSTANTIATION
  // ==========================================================================

  describe("instantiation", () => {
    it("should export singleton hardenedAgentCapabilities", () => {
      expect(hardenedAgentCapabilities).toBeDefined();
      expect(hardenedAgentCapabilities).toBeInstanceOf(HardenedAgentCapabilitiesEngine);
    });

    it("should create instance with default config", () => {
      const engine = new HardenedAgentCapabilitiesEngine();
      const config = engine.getConfig();

      expect(config.require_physics_grounding).toBe(true);
      expect(config.min_physics_citations).toBe(1);
      expect(config.enable_tribal_gates).toBe(true);
      expect(config.enable_self_correction).toBe(true);
    });

    it("should allow custom config", () => {
      const engine = new HardenedAgentCapabilitiesEngine({
        min_physics_citations: 3,
        monte_carlo_samples: 5000,
      });
      const config = engine.getConfig();

      expect(config.min_physics_citations).toBe(3);
      expect(config.monte_carlo_samples).toBe(5000);
    });
  });

  // ==========================================================================
  // PHYSICS GROUNDING
  // ==========================================================================

  describe("physics grounding", () => {
    let engine: HardenedAgentCapabilitiesEngine;

    beforeEach(() => {
      engine = new HardenedAgentCapabilitiesEngine();
    });

    it("should create valid physics grounding", () => {
      const grounding = engine.createPhysicsGrounding(
        "kienzle_force",
        { kc11: 1800, ap: 2.0, f: 0.2, mc: 0.25 },
        450,
        "N",
        0.08
      );

      expect(grounding).not.toBeNull();
      expect(grounding!.formula_id).toBe("kienzle_force");
      expect(grounding!.formula_name).toBe("Kienzle Cutting Force");
      expect(grounding!.output_value).toBe(450);
      expect(grounding!.output_unit).toBe("N");
      expect(grounding!.confidence).toBeCloseTo(0.92);
    });

    it("should return null for unknown formula", () => {
      const grounding = engine.createPhysicsGrounding(
        "nonexistent_formula",
        {},
        100,
        "N",
        0.1
      );

      expect(grounding).toBeNull();
    });

    it("should validate sufficient physics citations", () => {
      const groundings: PhysicsGrounding[] = [
        {
          formula_id: "kienzle_force",
          formula_name: "Kienzle",
          formula_latex: "",
          input_values: {},
          output_value: 100,
          output_unit: "N",
          uncertainty: 0.05,
          source: "Kienzle (1952)",
          confidence: 0.95,
        },
      ];

      const result = engine.validatePhysicsGrounding({ force: 100 }, groundings);
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it("should flag insufficient physics citations", () => {
      const customEngine = new HardenedAgentCapabilitiesEngine({
        min_physics_citations: 3,
      });

      const groundings: PhysicsGrounding[] = [
        {
          formula_id: "kienzle_force",
          formula_name: "Kienzle",
          formula_latex: "",
          input_values: {},
          output_value: 100,
          output_unit: "N",
          uncertainty: 0.05,
          source: "Kienzle (1952)",
          confidence: 0.95,
        },
      ];

      const result = customEngine.validatePhysicsGrounding({}, groundings);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("Insufficient physics citations: 1 < 3");
    });

    it("should flag high uncertainty", () => {
      const groundings: PhysicsGrounding[] = [
        {
          formula_id: "kienzle_force",
          formula_name: "Kienzle",
          formula_latex: "",
          input_values: {},
          output_value: 100,
          output_unit: "N",
          uncertainty: 0.35,  // > 0.25 threshold
          source: "Kienzle (1952)",
          confidence: 0.65,
        },
      ];

      const result = engine.validatePhysicsGrounding({}, groundings);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("High uncertainty"))).toBe(true);
    });

    it("should return available formulas", () => {
      const formulas = engine.getAvailableFormulas();

      expect(formulas).toContain("kienzle_force");
      expect(formulas).toContain("taylor_tool_life");
      expect(formulas).toContain("merchant_shear");
      expect(formulas).toContain("johnson_cook");
      expect(formulas.length).toBeGreaterThanOrEqual(10);
    });
  });

  // ==========================================================================
  // TRIBAL GATES
  // ==========================================================================

  describe("tribal gates", () => {
    let engine: HardenedAgentCapabilitiesEngine;

    beforeEach(() => {
      engine = new HardenedAgentCapabilitiesEngine();
    });

    it("should pass gate for valid recommendation", () => {
      const recommendation = {
        speed: 200,
        feed: 0.15,
        coolant: "flood",
      };

      const gate = engine.applyTribalGate(recommendation, { material: "steel" });

      expect(gate.passed).toBe(true);
      expect(gate.rules_checked).toBeGreaterThan(0);
    });

    it("should fail gate for titanium without flood coolant", () => {
      const recommendation = {
        speed: 200,
        feed: 0.15,
        coolant: "dry",
      };

      const gate = engine.applyTribalGate(recommendation, { material: "Titanium Ti-6Al-4V" });

      expect(gate.passed).toBe(false);
      expect(gate.playbook_overrides.length).toBeGreaterThan(0);
      expect(gate.playbook_overrides[0].overridden_to).toBe("flood");
    });

    it("should add tribal tips for titanium", () => {
      const recommendation = { speed: 50, feed: 0.1, coolant: "flood" };
      const gate = engine.applyTribalGate(recommendation, { material: "Titanium" });

      expect(gate.tribal_tips_applied.some(t => t.includes("Titanium"))).toBe(true);
    });

    it("should add tribal tips for Inconel", () => {
      const recommendation = { speed: 30, feed: 0.08, coolant: "flood" };
      const gate = engine.applyTribalGate(recommendation, { material: "Inconel 718" });

      expect(gate.tribal_tips_applied.some(t => t.includes("Inconel"))).toBe(true);
    });

    it("should add finishing tips", () => {
      const recommendation = { speed: 300, feed: 0.05 };
      const gate = engine.applyTribalGate(recommendation, { operation: "finish pass" });

      expect(gate.tribal_tips_applied.some(t => t.includes("Finish"))).toBe(true);
    });
  });

  // ==========================================================================
  // CROSS-VERIFICATION
  // ==========================================================================

  describe("cross-verification", () => {
    let engine: HardenedAgentCapabilitiesEngine;

    beforeEach(() => {
      engine = new HardenedAgentCapabilitiesEngine();
    });

    it("should confirm matching results", () => {
      const primary: HardenedAgentResult = {
        agent_id: "physics-1",
        agent_type: "physics",
        task_id: "task-1",
        timestamp: new Date().toISOString(),
        output: { force: 450, power: 2.5 },
        confidence: 0.85,
        physics_grounding: [],
        cross_verifications: [],
        verification_consensus: 0,
        tribal_gate: { passed: true, rules_checked: 0, rules_violated: [], rules_confirmed: [], tribal_tips_applied: [], playbook_overrides: [] },
        self_corrections: [],
        final_iteration: 0,
        uncertainty_propagation: { monte_carlo_samples: 0, input_uncertainties: {}, output_distribution: { mean: 0, std: 0, p5: 0, p50: 0, p95: 0 }, sensitivity_analysis: {}, dominant_uncertainty_source: "" },
        reasoning_chain: [],
        evidence_citations: [],
        rollback_available: false,
      };

      const verifier: HardenedAgentResult = {
        ...primary,
        agent_id: "physics-2",
        output: { force: 455, power: 2.48 },  // Within 2%
        confidence: 0.82,
      };

      const verifications = engine.crossVerify(primary, [verifier]);

      expect(verifications.length).toBe(1);
      expect(verifications[0].verdict).toBe("confirmed");
      expect(verifications[0].discrepancies.length).toBe(0);
    });

    it("should dispute significantly different results", () => {
      const primary: HardenedAgentResult = {
        agent_id: "physics-1",
        agent_type: "physics",
        task_id: "task-1",
        timestamp: new Date().toISOString(),
        output: { force: 450, power: 2.5 },
        confidence: 0.85,
        physics_grounding: [],
        cross_verifications: [],
        verification_consensus: 0,
        tribal_gate: { passed: true, rules_checked: 0, rules_violated: [], rules_confirmed: [], tribal_tips_applied: [], playbook_overrides: [] },
        self_corrections: [],
        final_iteration: 0,
        uncertainty_propagation: { monte_carlo_samples: 0, input_uncertainties: {}, output_distribution: { mean: 0, std: 0, p5: 0, p50: 0, p95: 0 }, sensitivity_analysis: {}, dominant_uncertainty_source: "" },
        reasoning_chain: [],
        evidence_citations: [],
        rollback_available: false,
      };

      const verifier: HardenedAgentResult = {
        ...primary,
        agent_id: "physics-2",
        output: { force: 800, power: 4.5 },  // Way off
        confidence: 0.80,
      };

      const verifications = engine.crossVerify(primary, [verifier]);

      expect(verifications.length).toBe(1);
      expect(verifications[0].verdict).toBe("disputed");
      expect(verifications[0].discrepancies.length).toBeGreaterThan(0);
      // 78% difference maps to "major" severity (>25%)
      expect(["critical", "major"]).toContain(verifications[0].discrepancies[0].severity);
    });

    it("should calculate verification consensus", () => {
      const verifications = [
        { verifier_agent: "a1", verifier_type: "physics", verified_at: "", verdict: "confirmed" as const, confidence: 0.9, reasoning: "", discrepancies: [], suggested_corrections: [] },
        { verifier_agent: "a2", verifier_type: "physics", verified_at: "", verdict: "confirmed" as const, confidence: 0.8, reasoning: "", discrepancies: [], suggested_corrections: [] },
        { verifier_agent: "a3", verifier_type: "physics", verified_at: "", verdict: "uncertain" as const, confidence: 0.7, reasoning: "", discrepancies: [], suggested_corrections: [] },
      ];

      const consensus = engine.calculateVerificationConsensus(verifications);

      expect(consensus).toBeGreaterThan(0.7);
      expect(consensus).toBeLessThanOrEqual(1.0);
    });

    it("should return 0 consensus for empty verifications", () => {
      const consensus = engine.calculateVerificationConsensus([]);
      expect(consensus).toBe(0);
    });
  });

  // ==========================================================================
  // UNCERTAINTY PROPAGATION
  // ==========================================================================

  describe("uncertainty propagation", () => {
    let engine: HardenedAgentCapabilitiesEngine;

    beforeEach(() => {
      engine = new HardenedAgentCapabilitiesEngine({ monte_carlo_samples: 1000 });
    });

    it("should propagate uncertainty through linear function", () => {
      const inputs = {
        x: { mean: 100, std: 5 },
        y: { mean: 50, std: 2 },
      };

      const compute = (sample: Record<string, number>) => sample.x + sample.y;

      const result = engine.propagateUncertainty(inputs, compute, 1000);

      expect(result.monte_carlo_samples).toBe(1000);
      expect(result.output_distribution.mean).toBeCloseTo(150, 0);
      expect(result.output_distribution.std).toBeGreaterThan(0);
      expect(result.output_distribution.p5).toBeLessThan(result.output_distribution.mean);
      expect(result.output_distribution.p95).toBeGreaterThan(result.output_distribution.mean);
    });

    it("should identify dominant uncertainty source", () => {
      const inputs = {
        large_uncertainty: { mean: 100, std: 20 },  // High std
        small_uncertainty: { mean: 100, std: 1 },   // Low std
      };

      const compute = (sample: Record<string, number>) =>
        sample.large_uncertainty + sample.small_uncertainty;

      const result = engine.propagateUncertainty(inputs, compute, 1000);

      expect(result.dominant_uncertainty_source).toBe("large_uncertainty");
      expect(result.sensitivity_analysis.large_uncertainty).toBeGreaterThan(
        result.sensitivity_analysis.small_uncertainty
      );
    });

    it("should compute sensitivity analysis", () => {
      const inputs = {
        a: { mean: 10, std: 1 },
        b: { mean: 20, std: 2 },
      };

      const compute = (sample: Record<string, number>) => sample.a * 2 + sample.b;

      const result = engine.propagateUncertainty(inputs, compute, 1000);

      expect(result.sensitivity_analysis.a).toBeGreaterThan(0);
      expect(result.sensitivity_analysis.b).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // CALIBRATION
  // ==========================================================================

  describe("calibration", () => {
    let engine: HardenedAgentCapabilitiesEngine;

    beforeEach(() => {
      engine = new HardenedAgentCapabilitiesEngine();
    });

    it("should record predictions", () => {
      engine.recordPrediction("agent-1", "pred-1", 100, 0.85, "cutting");
      engine.recordActual("pred-1", 105);

      const metrics = engine.getCalibrationMetrics("agent-1");

      expect(metrics.total_predictions).toBe(1);
      expect(metrics.mean_absolute_error).toBeCloseTo(0.05, 1);
    });

    it("should return zero metrics for unknown agent", () => {
      const metrics = engine.getCalibrationMetrics("nonexistent-agent");

      expect(metrics.total_predictions).toBe(0);
      expect(metrics.mean_absolute_error).toBe(0);
      expect(metrics.calibration_score).toBe(0);
    });

    it("should track by domain", () => {
      engine.recordPrediction("agent-1", "pred-1", 100, 0.9, "cutting");
      engine.recordActual("pred-1", 100);

      engine.recordPrediction("agent-1", "pred-2", 50, 0.8, "finishing");
      engine.recordActual("pred-2", 55);

      const metrics = engine.getCalibrationMetrics("agent-1");

      expect(metrics.by_domain.cutting).toBeDefined();
      expect(metrics.by_domain.finishing).toBeDefined();
      expect(metrics.by_domain.cutting.count).toBe(1);
      expect(metrics.by_domain.finishing.count).toBe(1);
    });
  });

  // ==========================================================================
  // ROLLBACK
  // ==========================================================================

  describe("rollback", () => {
    let engine: HardenedAgentCapabilitiesEngine;

    beforeEach(() => {
      engine = new HardenedAgentCapabilitiesEngine({ enable_rollback: true });
    });

    it("should save and retrieve rollback snapshot", () => {
      const state = { speed: 200, feed: 0.15, depth: 2.0 };
      engine.saveRollbackSnapshot("task-1", state);

      const restored = engine.rollback("task-1");

      expect(restored).toEqual(state);
    });

    it("should return null for unknown task", () => {
      const restored = engine.rollback("nonexistent-task");
      expect(restored).toBeNull();
    });

    it("should deep copy snapshot", () => {
      const state = { nested: { value: 100 } };
      engine.saveRollbackSnapshot("task-1", state);

      // Modify original
      state.nested.value = 999;

      const restored = engine.rollback("task-1") as typeof state;
      expect(restored.nested.value).toBe(100);  // Should be original
    });
  });

  // ==========================================================================
  // HARDENED EXECUTION
  // ==========================================================================

  describe("hardened execution", () => {
    let engine: HardenedAgentCapabilitiesEngine;

    beforeEach(() => {
      engine = new HardenedAgentCapabilitiesEngine();
    });

    it("should execute with full hardening", async () => {
      const result = await engine.executeHardened(
        "test-agent",
        "physics",
        "task-1",
        async () => ({
          output: { speed: 200, feed: 0.15, coolant: "flood" },
          confidence: 0.85,
        }),
        { material: "steel", operation: "roughing" }
      );

      expect(result.agent_id).toBe("test-agent");
      expect(result.task_id).toBe("task-1");
      expect(result.tribal_gate.passed).toBe(true);
      expect(result.rollback_available).toBe(true);
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("should reduce confidence when tribal gate fails", async () => {
      const result = await engine.executeHardened(
        "test-agent",
        "physics",
        "task-2",
        async () => ({
          output: { speed: 200, feed: 0.15, coolant: "dry" },
          confidence: 0.85,
        }),
        { material: "Titanium Ti-6Al-4V" }
      );

      expect(result.tribal_gate.passed).toBe(false);
      expect(result.confidence).toBeLessThan(0.85);  // Reduced
    });

    it("should populate reasoning chain", async () => {
      const result = await engine.executeHardened(
        "test-agent",
        "physics",
        "task-3",
        async () => ({
          output: {},
          confidence: 0.9,
        })
      );

      expect(result.reasoning_chain).toContain("Agent test-agent executed task task-3");
      expect(result.reasoning_chain.some(r => r.includes("confidence"))).toBe(true);
    });
  });

  // ==========================================================================
  // SELF-CORRECTION
  // ==========================================================================

  describe("self-correction", () => {
    let engine: HardenedAgentCapabilitiesEngine;

    beforeEach(() => {
      engine = new HardenedAgentCapabilitiesEngine();
    });

    it("should converge when no contradictions", () => {
      const results: HardenedAgentResult[] = [
        {
          agent_id: "a1",
          agent_type: "physics",
          task_id: "t1",
          timestamp: "",
          output: { force: 100 },
          confidence: 0.9,
          physics_grounding: [],
          cross_verifications: [],
          verification_consensus: 0,
          tribal_gate: { passed: true, rules_checked: 0, rules_violated: [], rules_confirmed: [], tribal_tips_applied: [], playbook_overrides: [] },
          self_corrections: [],
          final_iteration: 0,
          uncertainty_propagation: { monte_carlo_samples: 0, input_uncertainties: {}, output_distribution: { mean: 0, std: 0, p5: 0, p50: 0, p95: 0 }, sensitivity_analysis: {}, dominant_uncertainty_source: "" },
          reasoning_chain: [],
          evidence_citations: [],
          rollback_available: false,
        },
        {
          agent_id: "a2",
          agent_type: "physics",
          task_id: "t1",
          timestamp: "",
          output: { force: 102 },  // Within tolerance
          confidence: 0.85,
          physics_grounding: [],
          cross_verifications: [],
          verification_consensus: 0,
          tribal_gate: { passed: true, rules_checked: 0, rules_violated: [], rules_confirmed: [], tribal_tips_applied: [], playbook_overrides: [] },
          self_corrections: [],
          final_iteration: 0,
          uncertainty_propagation: { monte_carlo_samples: 0, input_uncertainties: {}, output_distribution: { mean: 0, std: 0, p5: 0, p50: 0, p95: 0 }, sensitivity_analysis: {}, dominant_uncertainty_source: "" },
          reasoning_chain: [],
          evidence_citations: [],
          rollback_available: false,
        },
      ];

      const corrections = engine.runSelfCorrection(results, 3);

      expect(corrections.length).toBeGreaterThan(0);
      expect(corrections[corrections.length - 1].converged).toBe(true);
    });

    it("should detect contradictions", () => {
      const results: HardenedAgentResult[] = [
        {
          agent_id: "a1",
          agent_type: "physics",
          task_id: "t1",
          timestamp: "",
          output: { force: 100 },
          confidence: 0.9,
          physics_grounding: [],
          cross_verifications: [],
          verification_consensus: 0,
          tribal_gate: { passed: true, rules_checked: 0, rules_violated: [], rules_confirmed: [], tribal_tips_applied: [], playbook_overrides: [] },
          self_corrections: [],
          final_iteration: 0,
          uncertainty_propagation: { monte_carlo_samples: 0, input_uncertainties: {}, output_distribution: { mean: 0, std: 0, p5: 0, p50: 0, p95: 0 }, sensitivity_analysis: {}, dominant_uncertainty_source: "" },
          reasoning_chain: [],
          evidence_citations: [],
          rollback_available: false,
        },
        {
          agent_id: "a2",
          agent_type: "physics",
          task_id: "t1",
          timestamp: "",
          output: { force: 200 },  // 100% difference!
          confidence: 0.8,
          physics_grounding: [],
          cross_verifications: [],
          verification_consensus: 0,
          tribal_gate: { passed: true, rules_checked: 0, rules_violated: [], rules_confirmed: [], tribal_tips_applied: [], playbook_overrides: [] },
          self_corrections: [],
          final_iteration: 0,
          uncertainty_propagation: { monte_carlo_samples: 0, input_uncertainties: {}, output_distribution: { mean: 0, std: 0, p5: 0, p50: 0, p95: 0 }, sensitivity_analysis: {}, dominant_uncertainty_source: "" },
          reasoning_chain: [],
          evidence_citations: [],
          rollback_available: false,
        },
      ];

      const corrections = engine.runSelfCorrection(results, 3);

      expect(corrections[0].contradictions_found.length).toBeGreaterThan(0);
      expect(corrections[0].contradictions_found[0].field).toBe("force");
    });
  });
});
