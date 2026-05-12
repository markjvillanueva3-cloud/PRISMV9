/**
 * Tests for HypothesisRankerEngine
 */
import { describe, it, expect, beforeEach } from "vitest";
import { hypothesisRankerEngine, HypothesisRankerEngine } from "../engines/HypothesisRankerEngine.js";

describe("HypothesisRankerEngine", () => {
  let engine: HypothesisRankerEngine;

  beforeEach(() => {
    engine = new HypothesisRankerEngine();
  });

  describe("createHypothesisSet", () => {
    it("should create a new hypothesis set", () => {
      const set = engine.createHypothesisSet("Why is surface finish degrading?");

      expect(set).toBeDefined();
      expect(set.id).toBeDefined();
      expect(set.problem).toBe("Why is surface finish degrading?");
      expect(set.hypotheses.size).toBe(0);
      expect(set.consensus_reached).toBe(false);
    });
  });

  describe("addHypothesis", () => {
    it("should add a hypothesis to a set", () => {
      const set = engine.createHypothesisSet("Test problem");

      const hyp = engine.addHypothesis(
        set.id,
        "Tool wear is causing the issue",
        "root_cause",
        {
          prior: 0.6,
          assumptions: ["Tool has been in use for extended time"],
          testable_predictions: ["Fresh tool improves finish"],
          source: "expert_opinion",
          tribal_alignment: 0.8,
        }
      );

      expect(hyp).not.toBeNull();
      expect(hyp!.statement).toBe("Tool wear is causing the issue");
      expect(hyp!.category).toBe("root_cause");
      expect(hyp!.prior_probability).toBe(0.6);
      expect(hyp!.assumptions).toContain("Tool has been in use for extended time");
      expect(set.hypotheses.size).toBe(1);
    });

    it("should return null for invalid set ID", () => {
      const hyp = engine.addHypothesis("invalid_id", "Test", "root_cause");
      expect(hyp).toBeNull();
    });
  });

  describe("addEvidence", () => {
    it("should add supporting evidence and update posterior", () => {
      const set = engine.createHypothesisSet("Test problem");
      const hyp = engine.addHypothesis(set.id, "Test hypothesis", "root_cause", { prior: 0.5 });

      const evidence = engine.addEvidence(set.id, hyp!.id, {
        description: "Tool inspection shows wear marks",
        type: "observation",
        strength: 0.8,
        reliability: 0.9,
        source: "visual_inspection",
        supports: true,
      });

      expect(evidence).not.toBeNull();
      expect(hyp!.supporting_evidence.length).toBe(1);
      expect(hyp!.posterior_probability).toBeGreaterThan(hyp!.prior_probability);
    });

    it("should add contradicting evidence and decrease posterior", () => {
      const set = engine.createHypothesisSet("Test problem");
      const hyp = engine.addHypothesis(set.id, "Test hypothesis", "root_cause", { prior: 0.7 });

      engine.addEvidence(set.id, hyp!.id, {
        description: "Tool was just replaced last week",
        type: "historical",
        strength: 0.9,
        reliability: 0.95,
        source: "maintenance_records",
        supports: false,
      });

      expect(hyp!.contradicting_evidence.length).toBe(1);
      expect(hyp!.posterior_probability).toBeLessThan(hyp!.prior_probability);
    });

    it("should update confidence interval based on evidence count", () => {
      const set = engine.createHypothesisSet("Test problem");
      const hyp = engine.addHypothesis(set.id, "Test hypothesis", "root_cause", { prior: 0.5 });

      const initialInterval = hyp!.confidence_interval.high - hyp!.confidence_interval.low;

      // Add multiple pieces of evidence
      for (let i = 0; i < 3; i++) {
        engine.addEvidence(set.id, hyp!.id, {
          description: `Evidence ${i}`,
          type: "observation",
          strength: 0.5,
          reliability: 0.7,
          source: "test",
          supports: true,
        });
      }

      const finalInterval = hyp!.confidence_interval.high - hyp!.confidence_interval.low;

      expect(finalInterval).toBeLessThan(initialInterval); // More evidence = narrower interval
    });
  });

  describe("rankHypotheses", () => {
    it("should rank hypotheses by composite score", () => {
      const set = engine.createHypothesisSet("Quality issue");

      // High-quality hypothesis
      const hyp1 = engine.addHypothesis(set.id, "Tool wear is the cause", "root_cause", {
        prior: 0.7,
        tribal_alignment: 0.9,
        testable_predictions: ["Fresh tool helps", "Wear marks visible", "Dimension drift"],
      });
      engine.addEvidence(set.id, hyp1!.id, {
        description: "Tool shows wear",
        type: "observation",
        strength: 0.9,
        reliability: 0.9,
        source: "inspection",
        supports: true,
      });

      // Lower-quality hypothesis
      const hyp2 = engine.addHypothesis(set.id, "Machine vibration is the cause", "root_cause", {
        prior: 0.3,
        tribal_alignment: 0.4,
        assumptions: ["Machine is old", "Foundation loose", "Bearings worn", "Chuck unbalanced", "Spindle issue"],
      });

      const rankings = engine.rankHypotheses(set.id);

      expect(rankings.length).toBe(2);
      expect(rankings[0].hypothesis_id).toBe(hyp1!.id); // Higher quality should rank first
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(2);
      expect(rankings[0].score).toBeGreaterThan(rankings[1].score);
    });

    it("should identify strengths and weaknesses", () => {
      const set = engine.createHypothesisSet("Test problem");
      const hyp = engine.addHypothesis(set.id, "Test hypothesis", "root_cause", {
        prior: 0.8,
        tribal_alignment: 0.9,
        testable_predictions: ["pred1", "pred2", "pred3", "pred4"],
      });

      // Add strong supporting evidence
      engine.addEvidence(set.id, hyp!.id, {
        description: "Strong evidence",
        type: "measurement",
        strength: 0.95,
        reliability: 0.95,
        source: "test",
        supports: true,
      });

      const rankings = engine.rankHypotheses(set.id);

      expect(rankings[0].strengths.length).toBeGreaterThan(0);
      expect(rankings[0].strengths.some(s => s.includes("Evidence Support") || s.includes("Tribal Alignment"))).toBe(true);
    });
  });

  describe("generateHypothesesForProblem", () => {
    it("should generate hypotheses for quality issues", () => {
      const set = engine.createHypothesisSet("Surface finish is poor");
      const generated = engine.generateHypothesesForProblem(set.id, "quality_issue");

      expect(generated.length).toBe(4);
      expect(generated.some(h => h.statement.includes("tool wear"))).toBe(true);
      expect(generated.some(h => h.statement.includes("speed/feed"))).toBe(true);
    });

    it("should generate hypotheses for tool failures", () => {
      const set = engine.createHypothesisSet("Tool keeps breaking");
      const generated = engine.generateHypothesesForProblem(set.id, "tool_failure");

      expect(generated.length).toBe(4);
      expect(generated.some(h => h.statement.includes("cutting force") || h.statement.includes("DOC"))).toBe(true);
    });

    it("should generate hypotheses for cycle time optimization", () => {
      const set = engine.createHypothesisSet("Cycle time too long");
      const generated = engine.generateHypothesesForProblem(set.id, "cycle_time");

      expect(generated.length).toBe(3);
      expect(generated.some(h => h.category === "optimization")).toBe(true);
    });

    it("should generate hypotheses for dimensional errors", () => {
      const set = engine.createHypothesisSet("Part is out of tolerance");
      const generated = engine.generateHypothesesForProblem(set.id, "dimensional_error");

      expect(generated.length).toBe(4);
      expect(generated.some(h => h.statement.includes("thermal") || h.statement.includes("deflection"))).toBe(true);
    });
  });

  describe("getBestHypothesis", () => {
    it("should return the best hypothesis after ranking", () => {
      const set = engine.createHypothesisSet("Test problem");

      engine.addHypothesis(set.id, "Low quality hypothesis", "root_cause", { prior: 0.2 });
      engine.addHypothesis(set.id, "High quality hypothesis", "root_cause", {
        prior: 0.8,
        tribal_alignment: 0.9,
        testable_predictions: ["test1", "test2"],
      });

      engine.rankHypotheses(set.id);
      const best = engine.getBestHypothesis(set.id);

      expect(best).not.toBeNull();
      expect(best!.hypothesis.statement).toBe("High quality hypothesis");
      expect(best!.ranking.rank).toBe(1);
    });

    it("should return null if no hypotheses exist", () => {
      const set = engine.createHypothesisSet("Empty problem");
      const best = engine.getBestHypothesis(set.id);
      expect(best).toBeNull();
    });
  });

  describe("getTrainingContext", () => {
    it("should return training context string", () => {
      const context = engine.getTrainingContext();

      expect(context).toContain("HYPOTHESIS RANKER");
      expect(context).toContain("Bayesian");
      expect(context).toContain("Evidence Support");
      expect(context).toContain("Root cause");
    });
  });
});

describe("hypothesisRankerEngine singleton", () => {
  it("should be defined", () => {
    expect(hypothesisRankerEngine).toBeDefined();
    expect(hypothesisRankerEngine).toBeInstanceOf(HypothesisRankerEngine);
  });
});
