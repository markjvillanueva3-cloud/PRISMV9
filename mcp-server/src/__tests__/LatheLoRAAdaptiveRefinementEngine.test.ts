/**
 * LatheLoRAAdaptiveRefinementEngine Tests
 * LATHE-LORA-MS0 U-LLR27: Adaptive refinement
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAAdaptiveRefinementEngine } from "../engines/LatheLoRAAdaptiveRefinementEngine.js";

describe("LatheLoRAAdaptiveRefinementEngine", () => {
  beforeEach(() => {
    latheLoRAAdaptiveRefinementEngine.reset();
  });

  describe("setConfig / getConfig", () => {
    it("has sensible defaults", () => {
      const config = latheLoRAAdaptiveRefinementEngine.getConfig();

      expect(config.max_iterations).toBe(5);
      expect(config.convergence_threshold).toBe(0.90);
      expect(config.min_improvement).toBe(0.02);
    });

    it("allows config updates", () => {
      latheLoRAAdaptiveRefinementEngine.setConfig({
        max_iterations: 10,
        convergence_threshold: 0.95,
      });

      const config = latheLoRAAdaptiveRefinementEngine.getConfig();
      expect(config.max_iterations).toBe(10);
      expect(config.convergence_threshold).toBe(0.95);
    });
  });

  describe("scoreQuality", () => {
    it("scores physics accuracy", () => {
      const quality = latheLoRAAdaptiveRefinementEngine.scoreQuality(
        "Use 400 SFM with 0.012 feed for roughing."
      );

      expect(quality.physics_accuracy).toBeGreaterThan(0);
    });

    it("scores safety compliance", () => {
      const quality = latheLoRAAdaptiveRefinementEngine.scoreQuality(
        "G50 S3000 limits spindle. Verify clearance before rapid."
      );

      expect(quality.safety_compliance).toBeGreaterThan(0);
    });

    it("scores completeness", () => {
      const quality = latheLoRAAdaptiveRefinementEngine.scoreQuality(
        "First, set up the tool. Then, verify clearance. Finally, run the program."
      );

      expect(quality.completeness).toBeGreaterThan(0);
    });

    it("calculates weighted overall score", () => {
      const quality = latheLoRAAdaptiveRefinementEngine.scoreQuality(
        "For 4140 steel, use 400 SFM. G50 S3000 for safety. First set tool, then verify."
      );

      expect(quality.overall).toBeGreaterThan(0);
      expect(quality.overall).toBeLessThanOrEqual(1);
    });
  });

  describe("startSession", () => {
    it("creates refinement session", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession(
        "What SFM for steel?",
        "Use 400 SFM."
      );

      expect(session.id).toBeDefined();
      expect(session.original_query).toBe("What SFM for steel?");
      expect(session.original_response).toBe("Use 400 SFM.");
      expect(session.status).toBe("pending");
      expect(session.iterations.length).toBe(1); // Initial iteration
    });

    it("scores initial response", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession(
        "Query",
        "Use 400 SFM with feed 0.012 IPR."
      );

      expect(session.best_quality_score).toBeGreaterThan(0);
    });
  });

  describe("addFeedback", () => {
    it("adds feedback to session", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      const feedback = latheLoRAAdaptiveRefinementEngine.addFeedback(session.id, {
        type: "correction",
        content: "Missing safety information",
        dimension: "safety",
        severity: "moderate",
      });

      expect(feedback?.id).toBeDefined();
      expect(feedback?.type).toBe("correction");
    });

    it("returns null for unknown session", () => {
      const feedback = latheLoRAAdaptiveRefinementEngine.addFeedback("unknown", {
        type: "correction",
        content: "Test",
      });

      expect(feedback).toBeNull();
    });
  });

  describe("recordIteration", () => {
    it("records refinement iteration", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "Initial response");

      const iteration = latheLoRAAdaptiveRefinementEngine.recordIteration(
        session.id,
        "Improved response with SFM and feed details.",
        200
      );

      expect(iteration?.iteration).toBe(1);
      expect(iteration?.output).toContain("Improved");
    });

    it("updates best response if improved", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "Bad");

      latheLoRAAdaptiveRefinementEngine.recordIteration(
        session.id,
        "Good response with 400 SFM, 0.012 feed, G50 safety, first step then next step.",
        200
      );

      const updated = latheLoRAAdaptiveRefinementEngine.getSession(session.id);
      expect(updated?.current_best).toContain("Good response");
    });

    it("marks converged when threshold reached", () => {
      latheLoRAAdaptiveRefinementEngine.setConfig({ convergence_threshold: 0.3 });
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      latheLoRAAdaptiveRefinementEngine.recordIteration(
        session.id,
        "Excellent response with SFM, RPM, feed, force, G50, safe, clearance, first, then, finally, recommend, set, use, g-code.",
        100
      );

      const updated = latheLoRAAdaptiveRefinementEngine.getSession(session.id);
      expect(updated?.status).toBe("converged");
    });

    it("marks max_iterations when limit reached", () => {
      latheLoRAAdaptiveRefinementEngine.setConfig({ max_iterations: 2 });
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      latheLoRAAdaptiveRefinementEngine.recordIteration(session.id, "B", 100);

      const updated = latheLoRAAdaptiveRefinementEngine.getSession(session.id);
      expect(updated?.status).toBe("max_iterations");
    });
  });

  describe("generateRefinementPrompt", () => {
    it("generates prompt targeting weakest dimension", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession(
        "What SFM for steel?",
        "Use 400 SFM." // Missing safety, completeness
      );

      const prompt = latheLoRAAdaptiveRefinementEngine.generateRefinementPrompt(session.id);

      expect(prompt).toContain("Query:");
      expect(prompt).toContain("Use 400 SFM");
      expect(prompt).toContain("Focus on improving");
    });

    it("includes feedback if available", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      latheLoRAAdaptiveRefinementEngine.addFeedback(session.id, {
        type: "correction",
        content: "Add spindle limit",
      });

      const prompt = latheLoRAAdaptiveRefinementEngine.generateRefinementPrompt(session.id);

      expect(prompt).toContain("Add spindle limit");
    });

    it("returns null for unknown session", () => {
      expect(latheLoRAAdaptiveRefinementEngine.generateRefinementPrompt("unknown")).toBeNull();
    });
  });

  describe("getSession / getAllSessions", () => {
    it("retrieves session by ID", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");
      const retrieved = latheLoRAAdaptiveRefinementEngine.getSession(session.id);

      expect(retrieved?.id).toBe(session.id);
    });

    it("gets all sessions", () => {
      latheLoRAAdaptiveRefinementEngine.startSession("Q1", "A1");
      latheLoRAAdaptiveRefinementEngine.startSession("Q2", "A2");

      const sessions = latheLoRAAdaptiveRefinementEngine.getAllSessions();
      expect(sessions.length).toBe(2);
    });
  });

  describe("needsRefinement", () => {
    it("returns true for pending session", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");
      expect(latheLoRAAdaptiveRefinementEngine.needsRefinement(session.id)).toBe(true);
    });

    it("returns false for converged session", () => {
      latheLoRAAdaptiveRefinementEngine.setConfig({ convergence_threshold: 0.1 });
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      latheLoRAAdaptiveRefinementEngine.recordIteration(session.id, "Good", 100);

      expect(latheLoRAAdaptiveRefinementEngine.needsRefinement(session.id)).toBe(false);
    });
  });

  describe("getSummary", () => {
    it("returns session summary", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      latheLoRAAdaptiveRefinementEngine.recordIteration(session.id, "Better A", 150);

      const summary = latheLoRAAdaptiveRefinementEngine.getSummary(session.id);

      expect(summary).toContain("Refinement Session");
      expect(summary).toContain("Iterations:");
      expect(summary).toContain("Improvement:");
    });

    it("returns error for unknown session", () => {
      expect(latheLoRAAdaptiveRefinementEngine.getSummary("unknown")).toBe("Session not found");
    });
  });

  describe("getTrajectory", () => {
    it("returns score trajectory", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      latheLoRAAdaptiveRefinementEngine.recordIteration(session.id, "B", 100);
      latheLoRAAdaptiveRefinementEngine.recordIteration(session.id, "C with more details", 100);

      const trajectory = latheLoRAAdaptiveRefinementEngine.getTrajectory(session.id);

      expect(trajectory.length).toBe(3);
      expect(trajectory[0].iteration).toBe(0);
    });
  });

  describe("getBestResponse", () => {
    it("returns best response", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "Initial");

      latheLoRAAdaptiveRefinementEngine.recordIteration(
        session.id,
        "Better with SFM and feed",
        100
      );

      const best = latheLoRAAdaptiveRefinementEngine.getBestResponse(session.id);
      expect(best).toContain("Better");
    });

    it("returns null for unknown session", () => {
      expect(latheLoRAAdaptiveRefinementEngine.getBestResponse("unknown")).toBeNull();
    });
  });

  describe("markFailed", () => {
    it("marks session as failed", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      latheLoRAAdaptiveRefinementEngine.markFailed(session.id, "Model unavailable");

      const updated = latheLoRAAdaptiveRefinementEngine.getSession(session.id);
      expect(updated?.status).toBe("failed");
    });
  });

  describe("deleteSession", () => {
    it("deletes session", () => {
      const session = latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");

      expect(latheLoRAAdaptiveRefinementEngine.deleteSession(session.id)).toBe(true);
      expect(latheLoRAAdaptiveRefinementEngine.getSession(session.id)).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("returns statistics", () => {
      latheLoRAAdaptiveRefinementEngine.setConfig({ convergence_threshold: 0.1 });

      latheLoRAAdaptiveRefinementEngine.startSession("Q1", "A1");
      const s2 = latheLoRAAdaptiveRefinementEngine.startSession("Q2", "A2");
      latheLoRAAdaptiveRefinementEngine.recordIteration(s2.id, "Better", 100);

      const stats = latheLoRAAdaptiveRefinementEngine.getStats();

      expect(stats.total_sessions).toBe(2);
      expect(stats.converged).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      latheLoRAAdaptiveRefinementEngine.startSession("Q", "A");
      latheLoRAAdaptiveRefinementEngine.reset();

      expect(latheLoRAAdaptiveRefinementEngine.getAllSessions().length).toBe(0);
    });
  });
});
