import { describe, it, expect, beforeEach } from "vitest";
import {
  DeepLogicTraceEngine,
  ProofTreeBuilder,
  type LogicVariable,
  type InferenceSource,
} from "../engines/DeepLogicTraceEngine.js";

describe("DeepLogicTraceEngine", () => {
  let engine: DeepLogicTraceEngine;

  beforeEach(() => {
    engine = new DeepLogicTraceEngine();
  });

  describe("proof tree building", () => {
    it("should create a basic proof with premises and conclusion", () => {
      const builder = engine.beginProof("test-engine", { test: true });

      const materialKnown = builder.addPremise("material_known", [
        { name: "material", type: "string", value: "P20" },
      ]);

      const toolAvailable = builder.addPremise("tool_available", [
        { name: "tool", type: "string", value: "EM-12-4F" },
      ]);

      const source: InferenceSource = {
        type: "formula",
        id: "F-001",
        name: "Kienzle Cutting Force",
        citation: "Kienzle 1952",
      };

      builder.setConclusion(
        [materialKnown, toolAvailable],
        "cutting_force_valid",
        [
          { name: "force", type: "number", value: 450, unit: "N" },
          { name: "material", type: "string", value: "P20" },
          { name: "params", type: "object", value: { ap: 2, fz: 0.1 } },
        ],
        source,
        "Fc = kc1.1 * ap * fz^(1-mc)"
      );

      const tree = engine.finalizeProof(builder);

      expect(tree.id).toBeDefined();
      expect(tree.nodes.size).toBe(3);
      expect(tree.edges.length).toBe(2);
      expect(tree.isValid).toBe(true);
      expect(tree.depth).toBe(1);
    });

    it("should handle multi-step inference chains", () => {
      const builder = engine.beginProof("kienzle-engine", {});

      const kc11 = builder.addPremise("parameter_in_range", [
        { name: "kc1.1", type: "number", value: 1800, unit: "MPa" },
        { name: "min", type: "number", value: 1000 },
        { name: "max", type: "number", value: 3000 },
      ]);

      const ap = builder.addPremise("parameter_in_range", [
        { name: "ap", type: "number", value: 2, unit: "mm" },
        { name: "min", type: "number", value: 0.1 },
        { name: "max", type: "number", value: 10 },
      ]);

      const fz = builder.addPremise("parameter_in_range", [
        { name: "fz", type: "number", value: 0.1, unit: "mm" },
        { name: "min", type: "number", value: 0.01 },
        { name: "max", type: "number", value: 0.5 },
      ]);

      const kienzleSource: InferenceSource = {
        type: "formula",
        id: "F-001",
        name: "Kienzle Cutting Force",
        citation: "Kienzle 1952",
      };

      const forceCalc = builder.addInference(
        [kc11, ap, fz],
        "cutting_force_valid",
        [
          { name: "Fc", type: "number", value: 324, unit: "N" },
          { name: "material", type: "string", value: "P20" },
          { name: "confidence", type: "number", value: 0.85 },
        ],
        kienzleSource,
        "Fc = kc1.1 * h^(1-mc) * b"
      );

      const safetySource: InferenceSource = {
        type: "rule",
        id: "R-001",
        name: "Force Safety Margin",
      };

      builder.setConclusion(
        [forceCalc],
        "deflection_acceptable",
        [
          { name: "delta", type: "number", value: 0.012, unit: "mm" },
          { name: "limit", type: "number", value: 0.05, unit: "mm" },
        ],
        safetySource,
        "delta < limit implies acceptable"
      );

      const tree = engine.finalizeProof(builder);

      expect(tree.depth).toBe(2);
      expect(tree.nodes.size).toBe(5);
      expect(tree.premises.length).toBe(3);
    });

    it("should track hypothesis resolution", () => {
      const builder = engine.beginProof("stability-engine", {});

      builder.addPremise("parameter_in_range", [
        { name: "rpm", type: "number", value: 8000 },
        { name: "min", type: "number", value: 1000 },
        { name: "max", type: "number", value: 15000 },
      ]);

      const hypothesis = builder.addHypothesis("chatter_free", [
        { name: "rpm", type: "number", value: 8000 },
        { name: "ap", type: "number", value: 3, unit: "mm" },
        { name: "ae", type: "number", value: 6, unit: "mm" },
      ]);

      builder.resolveHypothesis(hypothesis, "true", 0.92, "SLD analysis shows stable region");

      const tree = builder.build();

      const hypothesisNode = tree.nodes.get(hypothesis);
      expect(hypothesisNode?.assertion.truth).toBe("true");
      expect(hypothesisNode?.assertion.confidence).toBeCloseTo(0.92);
    });
  });

  describe("proof validation", () => {
    it("should validate a correct proof tree", () => {
      const builder = engine.beginProof("test", {});

      const p1 = builder.addPremise("material_known", [
        { name: "material", type: "string", value: "Steel" },
      ]);

      const source: InferenceSource = {
        type: "axiom",
        id: "A-001",
        name: "Material Axiom",
      };

      builder.setConclusion(
        [p1],
        "machine_capable",
        [
          { name: "machine", type: "string", value: "VMC-850" },
          { name: "operation", type: "string", value: "roughing" },
        ],
        source,
        "Known material implies machine capability"
      );

      const tree = engine.finalizeProof(builder);
      const validation = engine.validateProof(tree.id);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect unresolved hypotheses", () => {
      const builder = engine.beginProof("test", {});

      builder.addPremise("material_known", [
        { name: "m", type: "string", value: "X" },
      ]);

      builder.addHypothesis("stability_achieved", [
        { name: "depth", type: "number", value: 5 },
        { name: "rpm", type: "number", value: 10000 },
      ]);

      const tree = builder.build();
      engine["storeTree"](tree);

      const validation = engine.validateProof(tree.id);

      expect(validation.unresolvedNodes.length).toBeGreaterThan(0);
    });

    it("should return error for missing proof", () => {
      const validation = engine.validateProof("nonexistent-id");

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Proof tree not found");
    });
  });

  describe("explain trace", () => {
    it("should generate human-readable explanation", () => {
      const builder = engine.beginProof("surface-finish-engine", {});

      const feedrate = builder.addPremise("parameter_in_range", [
        { name: "feed", type: "number", value: 0.15, unit: "mm/rev" },
        { name: "min", type: "number", value: 0.05 },
        { name: "max", type: "number", value: 0.3 },
      ]);

      const noseRadius = builder.addPremise("parameter_in_range", [
        { name: "nose_r", type: "number", value: 0.8, unit: "mm" },
        { name: "min", type: "number", value: 0.2 },
        { name: "max", type: "number", value: 1.6 },
      ]);

      const kinematicSource: InferenceSource = {
        type: "formula",
        id: "F-005",
        name: "Kinematic Surface Roughness",
        citation: "Brammertz 1961",
      };

      builder.setConclusion(
        [feedrate, noseRadius],
        "surface_finish_acceptable",
        [
          { name: "Ra", type: "number", value: 1.76, unit: "µm" },
          { name: "tolerance", type: "number", value: 3.2, unit: "µm" },
        ],
        kinematicSource,
        "Ra = f² / (32 * r)"
      );

      const tree = engine.finalizeProof(builder);
      const explanation = engine.explainTrace(tree.id);

      expect(explanation).not.toBeNull();
      expect(explanation!.steps.length).toBeGreaterThan(0);
      expect(explanation!.premises.length).toBe(2);
      expect(explanation!.citations).toContain("Brammertz 1961");
      expect(explanation!.conclusion).toContain("surface_finish_acceptable");
    });

    it("should return null for missing trace", () => {
      const explanation = engine.explainTrace("missing-id");
      expect(explanation).toBeNull();
    });
  });

  describe("query proofs", () => {
    it("should filter proofs by engine ID", () => {
      const builder1 = engine.beginProof("engine-A", {});
      builder1.addPremise("material_known", [{ name: "m", type: "string", value: "A" }]);
      engine.finalizeProof(builder1);

      const builder2 = engine.beginProof("engine-B", {});
      builder2.addPremise("material_known", [{ name: "m", type: "string", value: "B" }]);
      engine.finalizeProof(builder2);

      const builder3 = engine.beginProof("engine-A", {});
      builder3.addPremise("tool_available", [{ name: "t", type: "string", value: "T1" }]);
      engine.finalizeProof(builder3);

      const results = engine.queryProofs({ engineId: "engine-A" });

      expect(results.length).toBe(2);
    });

    it("should filter proofs by minimum depth", () => {
      const builder1 = engine.beginProof("shallow", {});
      builder1.addPremise("fact", [{ name: "x", type: "number", value: 1 }]);
      engine.finalizeProof(builder1);

      const builder2 = engine.beginProof("deep", {});
      const p1 = builder2.addPremise("fact", [{ name: "x", type: "number", value: 1 }]);
      const i1 = builder2.addInference(
        [p1],
        "inferred",
        [{ name: "y", type: "number", value: 2 }],
        { type: "rule", id: "R1", name: "Rule 1" },
        "x implies y"
      );
      builder2.setConclusion(
        [i1],
        "final",
        [{ name: "z", type: "number", value: 3 }],
        { type: "rule", id: "R2", name: "Rule 2" },
        "y implies z"
      );
      engine.finalizeProof(builder2);

      const shallowResults = engine.queryProofs({ minDepth: 0 });
      const deepResults = engine.queryProofs({ minDepth: 2 });

      expect(shallowResults.length).toBe(2);
      expect(deepResults.length).toBe(1);
    });

    it("should respect limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        const b = engine.beginProof(`engine-${i}`, {});
        b.addPremise("fact", [{ name: "i", type: "number", value: i }]);
        engine.finalizeProof(b);
      }

      const results = engine.queryProofs({ limit: 5 });
      expect(results.length).toBe(5);
    });
  });

  describe("statistics", () => {
    it("should calculate correct statistics", () => {
      const kienzleSource: InferenceSource = {
        type: "formula",
        id: "F-001",
        name: "Kienzle",
        citation: "Kienzle 1952",
      };

      for (let i = 0; i < 5; i++) {
        const b = engine.beginProof("test", {});
        const p = b.addPremise("fact", [{ name: "x", type: "number", value: i }]);
        b.setConclusion(
          [p],
          "result",
          [{ name: "y", type: "number", value: i * 2 }],
          kienzleSource,
          "double rule"
        );
        engine.finalizeProof(b);
      }

      const stats = engine.getStats();

      expect(stats.totalProofs).toBe(5);
      expect(stats.avgDepth).toBeCloseTo(1);
      expect(stats.avgSteps).toBeCloseTo(2);
      expect(stats.formulaCitations["Kienzle"]).toBe(5);
      expect(stats.validProofs).toBe(5);
    });
  });

  describe("predicate and formula registry", () => {
    it("should return built-in predicates", () => {
      const predicates = engine.getPredicates();

      expect(predicates.cutting_force_valid).toBeDefined();
      expect(predicates.tool_life_sufficient).toBeDefined();
      expect(predicates.stability_achieved).toBeDefined();
      expect(predicates.deflection_acceptable).toBeDefined();
    });

    it("should return formula registry", () => {
      const formulas = engine.getFormulaRegistry();

      expect(formulas.kienzle).toBeDefined();
      expect(formulas.kienzle.citation).toBe("Kienzle 1952");
      expect(formulas.taylor).toBeDefined();
      expect(formulas.taylor.citation).toBe("Taylor 1907");
    });
  });

  describe("proof summary", () => {
    it("should generate accurate summary", () => {
      const builder = engine.beginProof("summary-test", {});

      const p1 = builder.addPremise("material_known", [
        { name: "m", type: "string", value: "P20" },
      ]);

      const taylorSource: InferenceSource = {
        type: "formula",
        id: "F-002",
        name: "Taylor Tool Life",
        citation: "Taylor 1907",
      };

      builder.setConclusion(
        [p1],
        "tool_life_sufficient",
        [
          { name: "T", type: "number", value: 45, unit: "min" },
          { name: "threshold", type: "number", value: 30, unit: "min" },
        ],
        taylorSource,
        "VT^n = C"
      );

      const tree = engine.finalizeProof(builder);
      const summary = engine.getSummary(tree.id);

      expect(summary).not.toBeNull();
      expect(summary!.stepCount).toBe(2);
      expect(summary!.depth).toBe(1);
      expect(summary!.isValid).toBe(true);
      expect(summary!.sources.some(s => s.name === "Taylor Tool Life")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty context", () => {
      const builder = engine.beginProof("test", {});
      builder.addPremise("fact", [{ name: "x", type: "number", value: 1 }]);
      const tree = engine.finalizeProof(builder);

      expect(tree.context).toEqual({});
    });

    it("should handle custom predicates not in registry", () => {
      const builder = engine.beginProof("custom", {});

      const id = builder.addPremise("my_custom_predicate", [
        { name: "arg1", type: "string", value: "custom_value" },
        { name: "arg2", type: "number", value: 42 },
      ]);

      const tree = builder.build();
      const node = tree.nodes.get(id);

      expect(node?.assertion.predicate.name).toBe("my_custom_predicate");
      expect(node?.assertion.predicate.arity).toBe(2);
    });

    it("should calculate confidence through inference chain", () => {
      const builder = engine.beginProof("confidence", {});

      const p1 = builder.addPremise("fact1", [{ name: "x", type: "number", value: 1 }], "true", 0.9);
      const p2 = builder.addPremise("fact2", [{ name: "y", type: "number", value: 2 }], "true", 0.8);

      const i1 = builder.addInference(
        [p1, p2],
        "inferred",
        [{ name: "z", type: "number", value: 3 }],
        { type: "rule", id: "R1", name: "Rule" },
        "x + y = z"
      );

      const tree = builder.build();
      const inferredNode = tree.nodes.get(i1);

      expect(inferredNode?.assertion.confidence).toBeLessThan(0.9 * 0.8);
      expect(inferredNode?.assertion.confidence).toBeGreaterThan(0);
    });

    it("should clear all proofs", () => {
      const builder = engine.beginProof("test", {});
      builder.addPremise("fact", [{ name: "x", type: "number", value: 1 }]);
      engine.finalizeProof(builder);

      expect(engine.getStats().totalProofs).toBe(1);

      engine.clear();

      expect(engine.getStats().totalProofs).toBe(0);
    });
  });
});
