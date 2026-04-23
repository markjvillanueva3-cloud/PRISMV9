/**
 * WEDMLearningLoopEngine Tests
 * U-PROD-20: Continuous learning from WEDM jobs
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMLearningLoopEngine,
  type JobOutcome,
} from "../engines/WEDMLearningLoopEngine.js";

describe("WEDMLearningLoopEngine", () => {
  let engine: WEDMLearningLoopEngine;

  beforeEach(() => {
    engine = new WEDMLearningLoopEngine();
  });

  function createOutcome(overrides: Partial<JobOutcome> = {}): JobOutcome {
    return {
      job_id: "J001",
      timestamp: new Date(),
      material: "D2",
      thickness_mm: 25,
      wire_type: "brass",
      wire_diameter_mm: 0.25,
      predicted: {
        cutting_speed_mm_min: 2.5,
        wire_tension_N: 15,
        peak_current_A: 12,
        passes: 2,
        time_min: 45,
      },
      actual: {
        cutting_speed_mm_min: 2.5,
        wire_tension_N: 15,
        peak_current_A: 12,
        passes: 2,
        time_min: 45,
        wire_breaks: 0,
      },
      success: true,
      ...overrides,
    };
  }

  describe("recordOutcome", () => {
    it("records job outcome", () => {
      const outcome = createOutcome();
      engine.recordOutcome(outcome);

      const stats = engine.getStats();
      expect(stats.total_jobs).toBe(1);
    });

    it("tracks multiple outcomes", () => {
      engine.recordOutcome(createOutcome({ job_id: "J001" }));
      engine.recordOutcome(createOutcome({ job_id: "J002" }));
      engine.recordOutcome(createOutcome({ job_id: "J003" }));

      const stats = engine.getStats();
      expect(stats.total_jobs).toBe(3);
    });
  });

  describe("getStats", () => {
    it("returns empty stats when no outcomes", () => {
      const stats = engine.getStats();

      expect(stats.total_jobs).toBe(0);
      expect(stats.success_rate).toBe(0);
    });

    it("calculates success rate", () => {
      engine.recordOutcome(createOutcome({ success: true }));
      engine.recordOutcome(createOutcome({ success: true }));
      engine.recordOutcome(createOutcome({ success: false }));

      const stats = engine.getStats();
      expect(stats.success_rate).toBeCloseTo(0.667, 2);
    });

    it("calculates wire break rate", () => {
      engine.recordOutcome(createOutcome({
        actual: {
          cutting_speed_mm_min: 2.5,
          wire_tension_N: 15,
          peak_current_A: 12,
          passes: 2,
          time_min: 45,
          wire_breaks: 2,
        },
      }));
      engine.recordOutcome(createOutcome({
        actual: {
          cutting_speed_mm_min: 2.5,
          wire_tension_N: 15,
          peak_current_A: 12,
          passes: 2,
          time_min: 45,
          wire_breaks: 0,
        },
      }));

      const stats = engine.getStats();
      expect(stats.wire_break_rate).toBe(1); // 2 breaks / 2 jobs
    });

    it("tracks unique materials", () => {
      engine.recordOutcome(createOutcome({ material: "D2" }));
      engine.recordOutcome(createOutcome({ material: "A2" }));
      engine.recordOutcome(createOutcome({ material: "D2" }));

      const stats = engine.getStats();
      expect(stats.materials_tracked).toContain("D2");
      expect(stats.materials_tracked).toContain("A2");
      expect(stats.materials_tracked).toHaveLength(2);
    });

    it("calculates speed deviation", () => {
      // Actual was 20% faster than predicted
      engine.recordOutcome(createOutcome({
        predicted: { cutting_speed_mm_min: 2.5, wire_tension_N: 15, peak_current_A: 12, passes: 2, time_min: 45 },
        actual: { cutting_speed_mm_min: 3.0, wire_tension_N: 15, peak_current_A: 12, passes: 2, time_min: 45, wire_breaks: 0 },
      }));

      const stats = engine.getStats();
      expect(stats.avg_speed_deviation_percent).toBeCloseTo(20, 1);
    });
  });

  describe("getRecommendations", () => {
    it("returns null with insufficient data", () => {
      engine.recordOutcome(createOutcome());

      const rec = engine.getRecommendations("D2", 25);
      expect(rec).toBeNull(); // Need 3+ jobs
    });

    it("returns recommendations with sufficient data", () => {
      // Record 3 jobs with consistent speed deviation
      for (let i = 0; i < 3; i++) {
        engine.recordOutcome(createOutcome({
          job_id: `J${i}`,
          predicted: { cutting_speed_mm_min: 2.5, wire_tension_N: 15, peak_current_A: 12, passes: 2, time_min: 45 },
          actual: { cutting_speed_mm_min: 3.0, wire_tension_N: 15, peak_current_A: 12, passes: 2, time_min: 45, wire_breaks: 0 },
        }));
      }

      const rec = engine.getRecommendations("D2", 25);
      expect(rec).not.toBeNull();
      expect(rec!.material).toBe("D2");
    });

    it("suggests speed adjustment for consistent deviations", () => {
      // All jobs ran 20% faster than predicted
      for (let i = 0; i < 5; i++) {
        engine.recordOutcome(createOutcome({
          job_id: `J${i}`,
          predicted: { cutting_speed_mm_min: 2.5, wire_tension_N: 15, peak_current_A: 12, passes: 2, time_min: 45 },
          actual: { cutting_speed_mm_min: 3.0, wire_tension_N: 15, peak_current_A: 12, passes: 2, time_min: 45, wire_breaks: 0 },
        }));
      }

      const rec = engine.getRecommendations("D2", 25);
      const speedAdj = rec?.adjustments.find(a => a.parameter === "cutting_speed_mm_min");

      expect(speedAdj).toBeDefined();
      expect(speedAdj!.suggested_factor).toBeGreaterThan(1);
    });

    it("suggests current reduction for wire breaks", () => {
      // Jobs with wire breaks
      for (let i = 0; i < 5; i++) {
        engine.recordOutcome(createOutcome({
          job_id: `J${i}`,
          actual: {
            cutting_speed_mm_min: 2.5,
            wire_tension_N: 15,
            peak_current_A: 12,
            passes: 2,
            time_min: 45,
            wire_breaks: 1,
          },
        }));
      }

      const rec = engine.getRecommendations("D2", 25);
      const currentAdj = rec?.adjustments.find(a => a.parameter === "peak_current_A");

      expect(currentAdj).toBeDefined();
      expect(currentAdj!.suggested_factor).toBeLessThan(1);
    });
  });

  describe("applyLearning", () => {
    it("returns original values when no learning data", () => {
      const result = engine.applyLearning("D2", 25, {
        cutting_speed_mm_min: 2.5,
        peak_current_A: 12,
        time_min: 45,
      });

      expect(result.adjusted_speed).toBe(2.5);
      expect(result.adjusted_current).toBe(12);
      expect(result.adjusted_time).toBe(45);
      expect(result.adjustments_applied).toHaveLength(0);
    });

    it("applies learned adjustments", () => {
      // Build up learning data
      for (let i = 0; i < 5; i++) {
        engine.recordOutcome(createOutcome({
          job_id: `J${i}`,
          predicted: { cutting_speed_mm_min: 2.5, wire_tension_N: 15, peak_current_A: 12, passes: 2, time_min: 45 },
          actual: { cutting_speed_mm_min: 3.0, wire_tension_N: 15, peak_current_A: 12, passes: 2, time_min: 45, wire_breaks: 0 },
        }));
      }

      const result = engine.applyLearning("D2", 25, {
        cutting_speed_mm_min: 2.5,
        peak_current_A: 12,
        time_min: 45,
      });

      // Should adjust speed upward
      expect(result.adjusted_speed).toBeGreaterThan(2.5);
      expect(result.adjustments_applied.length).toBeGreaterThan(0);
    });
  });

  describe("getOutcomesByMaterial", () => {
    it("filters outcomes by material", () => {
      engine.recordOutcome(createOutcome({ material: "D2" }));
      engine.recordOutcome(createOutcome({ material: "A2" }));
      engine.recordOutcome(createOutcome({ material: "D2" }));

      const d2Outcomes = engine.getOutcomesByMaterial("D2");
      expect(d2Outcomes).toHaveLength(2);
    });
  });

  describe("pruneOldOutcomes", () => {
    it("removes old outcomes", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

      engine.recordOutcome(createOutcome({ timestamp: oldDate, job_id: "OLD" }));
      engine.recordOutcome(createOutcome({ job_id: "NEW" }));

      const removed = engine.pruneOldOutcomes();
      expect(removed).toBe(1);

      const stats = engine.getStats();
      expect(stats.total_jobs).toBe(1);
    });
  });

  describe("exportData/importData", () => {
    it("exports learning data", () => {
      engine.recordOutcome(createOutcome({ job_id: "J1" }));
      engine.recordOutcome(createOutcome({ job_id: "J2" }));

      const exported = engine.exportData();
      expect(exported.outcomes).toHaveLength(2);
      expect(exported.exported_at).toBeInstanceOf(Date);
    });

    it("imports learning data", () => {
      const newEngine = new WEDMLearningLoopEngine();
      newEngine.importData({
        outcomes: [
          createOutcome({ job_id: "J1" }),
          createOutcome({ job_id: "J2" }),
        ],
      });

      const stats = newEngine.getStats();
      expect(stats.total_jobs).toBe(2);
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      engine.configure({ min_jobs_for_recommendation: 5 });
      expect(engine.getConfig().min_jobs_for_recommendation).toBe(5);
    });
  });
});
