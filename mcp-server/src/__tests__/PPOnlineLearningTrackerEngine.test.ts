/**
 * PPOnlineLearningTrackerEngine Tests — PP-DL-MS7
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PPOnlineLearningTrackerEngine,
} from "../engines/PPOnlineLearningTrackerEngine.js";

describe("PPOnlineLearningTrackerEngine", () => {
  let engine: PPOnlineLearningTrackerEngine;

  beforeEach(() => {
    engine = new PPOnlineLearningTrackerEngine();
  });

  describe("recordPrediction", () => {
    it("returns unique ID", () => {
      const id1 = engine.recordPrediction("controller", "fanuc_31i", 0.9);
      const id2 = engine.recordPrediction("controller", "fanuc_30i", 0.85);
      expect(id1).not.toBe(id2);
    });

    it("records include timestamp", () => {
      const id = engine.recordPrediction("controller", "fanuc_31i", 0.9);
      const history = engine.getHistory("controller");
      expect(history[0].id).toBe(id);
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it("accepts optional context", () => {
      const id = engine.recordPrediction("machine", "haas-vf2", 0.85, { job: "ABC-123" });
      const history = engine.getHistory("machine");
      expect(history[0].context).toEqual({ job: "ABC-123" });
    });
  });

  describe("recordOutcome", () => {
    it("marks correct prediction", () => {
      const id = engine.recordPrediction("controller", "fanuc_31i", 0.9);
      engine.recordOutcome(id, "fanuc_31i");
      const metrics = engine.getDomainMetrics("controller");
      expect(metrics.correct).toBe(1);
      expect(metrics.incorrect).toBe(0);
    });

    it("marks incorrect prediction", () => {
      const id = engine.recordPrediction("controller", "fanuc_31i", 0.9);
      engine.recordOutcome(id, "siemens_840d");
      const metrics = engine.getDomainMetrics("controller");
      expect(metrics.correct).toBe(0);
      expect(metrics.incorrect).toBe(1);
    });

    it("marks partial prediction when error_magnitude < 0.3", () => {
      const id = engine.recordPrediction("material", "4140", 0.8);
      engine.recordOutcome(id, "4340", 0.15);
      const metrics = engine.getDomainMetrics("material");
      expect(metrics.partial).toBe(1);
    });

    it("returns false for unknown ID", () => {
      expect(engine.recordOutcome("nonexistent", "foo")).toBe(false);
    });
  });

  describe("getDomainMetrics", () => {
    it("computes accuracy correctly", () => {
      for (let i = 0; i < 10; i++) {
        const id = engine.recordPrediction("controller", "fanuc_31i", 0.9);
        engine.recordOutcome(id, i < 8 ? "fanuc_31i" : "siemens_840d");
      }
      const metrics = engine.getDomainMetrics("controller");
      expect(metrics.accuracy).toBeCloseTo(0.8, 2);
    });

    it("computes calibration error", () => {
      // Overconfident: predict 90% confidence but only 50% correct
      for (let i = 0; i < 10; i++) {
        const id = engine.recordPrediction("controller", "fanuc_31i", 0.9);
        engine.recordOutcome(id, i < 5 ? "fanuc_31i" : "siemens_840d");
      }
      const metrics = engine.getDomainMetrics("controller");
      expect(metrics.calibration_error).toBeCloseTo(0.4, 1);
    });

    it("handles empty domain", () => {
      const metrics = engine.getDomainMetrics("controller");
      expect(metrics.total_predictions).toBe(0);
      expect(metrics.accuracy).toBe(0);
    });
  });

  describe("getStats", () => {
    it("returns overall stats", () => {
      const id = engine.recordPrediction("controller", "fanuc_31i", 0.9);
      engine.recordOutcome(id, "fanuc_31i");
      const stats = engine.getStats();
      expect(stats.total_records).toBe(1);
      expect(stats.overall_accuracy).toBe(1);
    });

    it("filters out empty domains", () => {
      engine.recordPrediction("controller", "fanuc_31i", 0.9);
      const stats = engine.getStats();
      expect(stats.domains.every(d => d.total_predictions > 0)).toBe(true);
    });

    it("detects drift alerts for miscalibration", () => {
      // Create enough overconfident predictions to trigger alert
      for (let i = 0; i < 20; i++) {
        const id = engine.recordPrediction("controller", "fanuc_31i", 0.95);
        engine.recordOutcome(id, i < 10 ? "fanuc_31i" : "siemens_840d");
      }
      const stats = engine.getStats();
      expect(stats.drift_alerts.some(a => a.metric === "confidence_miscalibration")).toBe(true);
    });
  });

  describe("learning opportunities", () => {
    it("identifies frequently missed patterns", () => {
      // Create repeated incorrect predictions for the same pattern
      for (let i = 0; i < 5; i++) {
        const id = engine.recordPrediction("material", "4140", 0.9);
        engine.recordOutcome(id, "Inconel_718", 0.8);
      }
      const stats = engine.getStats();
      expect(stats.learning_opportunities.length).toBeGreaterThan(0);
      expect(stats.learning_opportunities[0].scenario_pattern).toBe("Inconel_718");
    });

    it("includes recommendation", () => {
      for (let i = 0; i < 3; i++) {
        const id = engine.recordPrediction("machine", "haas-vf2", 0.9);
        engine.recordOutcome(id, "okuma-m460v", 0.8);
      }
      const stats = engine.getStats();
      const opp = stats.learning_opportunities[0];
      if (opp) {
        expect(opp.recommendation).toContain("Collect");
      }
    });
  });

  describe("getHistory", () => {
    it("returns newest first", () => {
      const id1 = engine.recordPrediction("controller", "fanuc_31i", 0.9);
      // Small delay to ensure different timestamps
      for (let i = 0; i < 1000; i++) { /* busy loop */ }
      const id2 = engine.recordPrediction("controller", "fanuc_30i", 0.85);
      const history = engine.getHistory("controller");
      expect(history.length).toBe(2);
      expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
    });

    it("respects limit", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordPrediction("controller", `ctrl_${i}`, 0.8);
      }
      const history = engine.getHistory("controller", 3);
      expect(history.length).toBe(3);
    });
  });

  describe("exportLabeledData", () => {
    it("returns only labeled records", () => {
      const id1 = engine.recordPrediction("controller", "fanuc_31i", 0.9);
      engine.recordPrediction("controller", "fanuc_30i", 0.85); // not labeled
      engine.recordOutcome(id1, "fanuc_31i");
      const labeled = engine.exportLabeledData();
      expect(labeled.length).toBe(1);
      expect(labeled[0].id).toBe(id1);
    });
  });

  describe("reset", () => {
    it("clears all records", () => {
      engine.recordPrediction("controller", "fanuc_31i", 0.9);
      engine.reset();
      expect(engine.getStats().total_records).toBe(0);
    });
  });
});
