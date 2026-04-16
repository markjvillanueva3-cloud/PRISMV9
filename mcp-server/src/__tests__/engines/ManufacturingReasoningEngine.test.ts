/**
 * Tests for ManufacturingReasoningEngine
 *
 * AGENT ROADMAP: U-AGT07 (MS3)
 * Verifies domain-grounded chain-of-thought reasoning
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ManufacturingReasoningEngine,
  manufacturingReasoningEngine,
  ManufacturingProblem,
  ManufacturingReasoningChain,
  MaterialContext,
  ManufacturingDomain,
} from "../../engines/ManufacturingReasoningEngine.js";

describe("ManufacturingReasoningEngine", () => {
  let engine: ManufacturingReasoningEngine;

  beforeEach(() => {
    engine = new ManufacturingReasoningEngine();
  });

  describe("reason", () => {
    it("should create reasoning chain for machining problem", async () => {
      const problem: ManufacturingProblem = {
        problem: "Determine optimal cutting parameters for D2 tool steel roughing",
        goal: "Maximize material removal rate while maintaining tool life",
        domain: "machining",
        material: {
          material_id: "D2",
          material_name: "D2 Tool Steel",
          iso_group: "H",
          hardness: 58,
          hardness_unit: "HRC",
          machinability_index: 0.35,
          key_properties: { heat_treated: true }
        }
      };

      const chain = await engine.reason(problem);

      expect(chain.chain_id).toMatch(/^mfg_chain_/);
      expect(chain.domain).toBe("machining");
      expect(chain.steps.length).toBeGreaterThan(0);
      expect(chain.material_context).toBeDefined();
      expect(chain.material_context?.iso_group).toBe("H");
    });

    it("should apply material-first pattern", async () => {
      const problem: ManufacturingProblem = {
        problem: "Select appropriate tooling for 304 stainless",
        goal: "Choose tool with best material compatibility",
        domain: "machining",
        material: {
          material_id: "304SS",
          material_name: "304 Stainless Steel",
          iso_group: "M",
          hardness: 25,
          hardness_unit: "HRC",
          key_properties: { austenitic: true }
        }
      };

      const chain = await engine.reason(problem);

      // Should have material identification step
      const materialStep = chain.steps.find(
        s => s.content.includes("Material identified")
      );
      expect(materialStep).toBeDefined();

      // Should derive ISO M work-hardening constraint
      const workHardenConstraint = chain.constraints_checked.find(
        c => c.description.includes("work-harden")
      );
      expect(workHardenConstraint).toBeDefined();
    });

    it("should perform safety scan", async () => {
      const problem: ManufacturingProblem = {
        problem: "Plan roughing operation",
        goal: "Safe and efficient material removal",
        domain: "machining"
      };

      const chain = await engine.reason(problem);

      // Should have safety checks populated
      expect(chain.safety_checks.length).toBeGreaterThan(0);

      // Should have critical spindle safety check
      const spindleCheck = chain.safety_checks.find(
        s => s.id === "sc_spindle"
      );
      expect(spindleCheck).toBeDefined();
      expect(spindleCheck?.severity).toBe("critical");
    });

    it("should validate physics for machining domain", async () => {
      const problem: ManufacturingProblem = {
        problem: "Calculate cutting parameters",
        goal: "Determine safe cutting parameters",
        domain: "machining",
        material: {
          material_id: "4140",
          material_name: "4140 Steel",
          iso_group: "P",
          key_properties: {}
        }
      };

      const chain = await engine.reason(problem);

      // Should have physics validations
      expect(chain.physics_validations.length).toBeGreaterThan(0);

      // Should validate power and force
      const powerValidation = chain.physics_validations.find(
        p => p.parameter === "spindle_power"
      );
      expect(powerValidation).toBeDefined();

      const forceValidation = chain.physics_validations.find(
        p => p.parameter === "cutting_force"
      );
      expect(forceValidation).toBeDefined();
    });

    it("should calculate cost implications", async () => {
      const problem: ManufacturingProblem = {
        problem: "Estimate machining costs",
        goal: "Calculate cost per part",
        domain: "machining",
        budget: 1000
      };

      const chain = await engine.reason(problem);

      // Should have cost implications
      expect(chain.cost_implications.length).toBeGreaterThan(0);

      // Should include tooling cost
      const toolingCost = chain.cost_implications.find(
        c => c.category === "tooling"
      );
      expect(toolingCost).toBeDefined();
    });

    it("should handle problem without material context", async () => {
      const problem: ManufacturingProblem = {
        problem: "General tooling recommendation",
        goal: "Suggest appropriate tools",
        domain: "tooling"
      };

      const chain = await engine.reason(problem);

      // Should have observation about unknown material
      const unknownMaterialStep = chain.steps.find(
        s => s.content.includes("Material not specified")
      );
      expect(unknownMaterialStep).toBeDefined();
      expect(unknownMaterialStep?.confidence).toBeLessThan(0.8);
    });

    it("should apply quality domain reasoning", async () => {
      const problem: ManufacturingProblem = {
        problem: "Verify part meets tolerance requirements",
        goal: "Confirm dimensional accuracy",
        domain: "quality",
        quality_requirements: {
          tolerance: 0.001,
          surface_finish: 0.4
        },
        constraints: ["Tolerance must be within spec"]
      };

      const chain = await engine.reason(problem);

      // Should have quality-specific deductions
      const qualityStep = chain.steps.find(
        s => s.content.includes("tolerance") || s.content.includes("quality") || s.content.includes("Quality")
      );
      expect(qualityStep).toBeDefined();

      // Should have tolerance validation step
      const toleranceStep = chain.steps.find(
        s => s.content.includes("Tolerance target") || s.content.includes("Constraint:")
      );
      expect(toleranceStep).toBeDefined();
    });

    it("should include known facts as premises", async () => {
      const problem: ManufacturingProblem = {
        problem: "Optimize based on known conditions",
        goal: "Improve efficiency",
        domain: "machining",
        known_facts: [
          "Spindle max speed is 10000 RPM",
          "Tool diameter is 12mm"
        ]
      };

      const chain = await engine.reason(problem);

      // Should have observation steps for known facts
      const factSteps = chain.steps.filter(
        s => s.type === "observation" && s.premises.includes("Given information")
      );
      expect(factSteps.length).toBe(2);
    });

    it("should add constraints to validation", async () => {
      const problem: ManufacturingProblem = {
        problem: "Plan operation with constraints",
        goal: "Meet all constraints",
        domain: "machining",
        constraints: [
          "Must not exceed 500 SFM",
          "Tool life must exceed 30 minutes"
        ]
      };

      const chain = await engine.reason(problem);

      // Should have constraint validation steps
      const constraintSteps = chain.steps.filter(
        s => s.content.includes("Constraint:")
      );
      expect(constraintSteps.length).toBe(2);

      // Should track constraints
      expect(chain.constraints_checked.length).toBeGreaterThanOrEqual(2);
    });

    it("should synthesize final answer", async () => {
      const problem: ManufacturingProblem = {
        problem: "Recommend cutting parameters",
        goal: "Provide optimal parameters",
        domain: "machining"
      };

      const chain = await engine.reason(problem);

      expect(chain.final_answer).toBeDefined();
      expect(chain.final_answer?.confidence).toBeGreaterThan(0);
      expect(chain.final_answer?.evidence_strength).toBeDefined();
      expect(Array.isArray(chain.final_answer?.justification)).toBe(true);
    });

    it("should track audit trail", async () => {
      const problem: ManufacturingProblem = {
        problem: "Simple problem",
        goal: "Test audit",
        domain: "machining"
      };

      const chain = await engine.reason(problem);

      expect(chain.audit_trail.length).toBeGreaterThan(0);
      expect(chain.audit_trail[0]).toHaveProperty("timestamp");
      expect(chain.audit_trail[0]).toHaveProperty("action");
      expect(chain.audit_trail[0]).toHaveProperty("detail");
    });

    it("should complete in reasonable time", async () => {
      const problem: ManufacturingProblem = {
        problem: "Complex machining problem with all patterns",
        goal: "Full reasoning test",
        domain: "machining",
        material: {
          material_id: "Ti64",
          material_name: "Ti-6Al-4V",
          iso_group: "S",
          hardness: 36,
          hardness_unit: "HRC",
          key_properties: { titanium_alloy: true }
        },
        quality_requirements: { tolerance: 0.01 },
        budget: 5000
      };

      const chain = await engine.reason(problem);

      // Should complete in under 1 second
      expect(chain.total_time_ms).toBeLessThan(1000);
    });
  });

  describe("addConclusion", () => {
    it("should add conclusion step to chain", async () => {
      const problem: ManufacturingProblem = {
        problem: "Test",
        goal: "Test",
        domain: "machining"
      };

      const chain = await engine.reason(problem);
      const initialSteps = chain.steps.length;

      engine.addConclusion(chain, "Recommend 200 SFM with 0.004 IPR feed", 0.85);

      expect(chain.steps.length).toBe(initialSteps + 1);
      const lastStep = chain.steps[chain.steps.length - 1];
      expect(lastStep.type).toBe("conclusion");
      expect(lastStep.confidence).toBe(0.85);
    });
  });

  describe("backtrack", () => {
    it("should record dead end and add backtrack step", async () => {
      const problem: ManufacturingProblem = {
        problem: "Test",
        goal: "Test",
        domain: "machining"
      };

      const chain = await engine.reason(problem);
      const backtrackPoint = Math.floor(chain.steps.length / 2);

      engine.backtrack(chain, "Physics constraint violated", backtrackPoint);

      expect(chain.dead_ends.length).toBe(1);
      expect(chain.dead_ends[0].reason).toBe("Physics constraint violated");
      expect(chain.dead_ends[0].backtrack_to).toBe(backtrackPoint);
      expect(chain.meta.backtrack_count).toBe(1);

      const backtrackStep = chain.steps.find(s => s.type === "backtrack");
      expect(backtrackStep).toBeDefined();
    });
  });

  describe("validatePhysics", () => {
    it("should pass when calculated value is within limit", async () => {
      const problem: ManufacturingProblem = {
        problem: "Test",
        goal: "Test",
        domain: "machining"
      };

      const chain = await engine.reason(problem);
      const initialValidations = chain.physics_validations.length;

      const passes = engine.validatePhysics(
        chain,
        "Fc = kc1.1 * ap * fz",
        "cutting_force",
        2500,  // calculated
        5000,  // limit
        "N",
        "test"
      );

      expect(passes).toBe(true);
      expect(chain.physics_validations.length).toBe(initialValidations + 1);
    });

    it("should fail when calculated value exceeds limit", async () => {
      const problem: ManufacturingProblem = {
        problem: "Test",
        goal: "Test",
        domain: "machining"
      };

      const chain = await engine.reason(problem);
      const initialConfidence = chain.current_confidence;

      const passes = engine.validatePhysics(
        chain,
        "P = Fc * Vc",
        "spindle_power",
        20,   // calculated (exceeds)
        15,   // limit
        "kW",
        "test"
      );

      expect(passes).toBe(false);
      expect(chain.current_confidence).toBeLessThan(initialConfidence);
    });
  });

  describe("getReasoningSummary", () => {
    it("should generate summary for context injection", async () => {
      const problem: ManufacturingProblem = {
        problem: "Test problem for summary",
        goal: "Test goal",
        domain: "machining",
        budget: 100
      };

      const chain = await engine.reason(problem);
      engine.addConclusion(chain, "Use conservative parameters");

      const summary = engine.getReasoningSummary(chain, 500);

      expect(summary).toContain("Domain: machining");
      expect(summary).toContain("Confidence:");
      expect(summary).toContain("Steps:");
    });

    it("should respect token limit", async () => {
      const problem: ManufacturingProblem = {
        problem: "Generate long reasoning chain",
        goal: "Test token limit",
        domain: "machining",
        known_facts: Array(10).fill("Known fact for padding content here"),
        constraints: Array(10).fill("Constraint for padding content here")
      };

      const chain = await engine.reason(problem);

      // Add many conclusions to test truncation
      for (let i = 0; i < 10; i++) {
        engine.addConclusion(chain, `Conclusion number ${i} with some extra text for testing`, 0.9);
      }

      const summary = engine.getReasoningSummary(chain, 500);

      // Summary should be bounded and contain key elements
      expect(summary).toContain("Domain:");
      expect(summary).toContain("Confidence:");
      expect(summary.length).toBeGreaterThan(50);
      expect(summary.length).toBeLessThan(3000); // Reasonable bound
    });
  });

  describe("isReasoningValid", () => {
    it("should return true for valid reasoning without unmitigated critical safety", async () => {
      const problem: ManufacturingProblem = {
        problem: "Valid problem",
        goal: "Valid goal",
        domain: "cost" // Cost domain has no critical safety checks
      };

      const chain = await engine.reason(problem);

      // Chain without critical safety concerns should be valid
      expect(engine.isReasoningValid(chain)).toBe(true);
    });

    it("should flag critical safety concerns for machining domain", async () => {
      const problem: ManufacturingProblem = {
        problem: "Machining problem",
        goal: "Test safety flagging",
        domain: "machining"
      };

      const chain = await engine.reason(problem);

      // Machining has critical safety concerns by default
      const criticalSafety = chain.safety_checks.filter(
        s => s.severity === "critical"
      );
      expect(criticalSafety.length).toBeGreaterThan(0);
    });

    it("should return false when physics fails", async () => {
      const problem: ManufacturingProblem = {
        problem: "Test",
        goal: "Test",
        domain: "machining"
      };

      const chain = await engine.reason(problem);

      // Add failing physics validation
      engine.validatePhysics(chain, "test", "test", 100, 50, "N", "test");

      expect(engine.isReasoningValid(chain)).toBe(false);
    });

    it("should return false for fatal constraint violations", async () => {
      const problem: ManufacturingProblem = {
        problem: "Test",
        goal: "Test",
        domain: "machining"
      };

      const chain = await engine.reason(problem);

      // Add fatal violation
      chain.constraints_checked.push({
        id: "fatal_test",
        type: "safety_hard",
        description: "Fatal constraint",
        violation_severity: "fatal",
        checked: true,
        violated: true
      });

      expect(engine.isReasoningValid(chain)).toBe(false);
    });
  });

  describe("getApplicablePatterns", () => {
    it("should return patterns for machining domain", () => {
      const patterns = engine.getApplicablePatterns("machining");

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.map(p => p.name)).toContain("material_first");
      expect(patterns.map(p => p.name)).toContain("safety_scan");
      expect(patterns.map(p => p.name)).toContain("physics_validation");
    });

    it("should return patterns sorted by priority", () => {
      const patterns = engine.getApplicablePatterns("machining");

      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i].priority).toBeGreaterThanOrEqual(patterns[i - 1].priority);
      }
    });

    it("should return cost pattern for cost domain", () => {
      const patterns = engine.getApplicablePatterns("cost");

      expect(patterns.map(p => p.name)).toContain("cost_impact");
    });
  });

  describe("exportAuditTrail", () => {
    it("should export complete audit information", async () => {
      const problem: ManufacturingProblem = {
        problem: "Test audit export",
        goal: "Verify audit completeness",
        domain: "machining",
        material: {
          material_id: "test",
          material_name: "Test Material",
          iso_group: "P",
          key_properties: {}
        }
      };

      const chain = await engine.reason(problem);
      const audit = engine.exportAuditTrail(chain);

      expect(audit).toHaveProperty("chain_id");
      expect(audit).toHaveProperty("domain");
      expect(audit).toHaveProperty("total_steps");
      expect(audit).toHaveProperty("final_confidence");
      expect(audit).toHaveProperty("constraints_checked");
      expect(audit).toHaveProperty("physics_validations");
      expect(audit).toHaveProperty("safety_checks");
      expect(audit).toHaveProperty("reasoning_valid");
      expect(audit).toHaveProperty("audit_trail");
    });
  });

  describe("material constraints", () => {
    it("should derive hardness constraints for hard materials", async () => {
      const problem: ManufacturingProblem = {
        problem: "Cut hardened steel",
        goal: "Determine appropriate approach",
        domain: "machining",
        material: {
          material_id: "H13HT",
          material_name: "H13 Heat Treated",
          iso_group: "H",
          hardness: 55,
          hardness_unit: "HRC",
          key_properties: { heat_treated: true }
        }
      };

      const chain = await engine.reason(problem);

      // Should have hardness constraint
      const hardnessConstraint = chain.constraints_checked.find(
        c => c.type === "material_limit" && c.description.includes("HRC")
      );
      expect(hardnessConstraint).toBeDefined();
    });

    it("should derive ISO S constraints for heat-resistant alloys", async () => {
      const problem: ManufacturingProblem = {
        problem: "Machine Inconel",
        goal: "Safe machining parameters",
        domain: "machining",
        material: {
          material_id: "IN718",
          material_name: "Inconel 718",
          iso_group: "S",
          key_properties: { nickel_alloy: true }
        }
      };

      const chain = await engine.reason(problem);

      // Should have ISO S constraint
      const isoSConstraint = chain.constraints_checked.find(
        c => c.description.includes("Heat-resistant") || c.description.includes("ISO S")
      );
      expect(isoSConstraint).toBeDefined();
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(manufacturingReasoningEngine).toBeInstanceOf(ManufacturingReasoningEngine);
    });
  });
});
