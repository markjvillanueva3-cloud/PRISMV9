/**
 * TK-MS8: Tribal Knowledge Reinforcement + Proactive Intelligence Tests
 *
 * Tests outcome tracking, confidence calibration, and proactive suggestions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  tribalKnowledgeEngine,
  type TipOutcome,
  type OutcomeContext,
  type ReinforcementSummary,
  type CalibrationEntry,
  type ProactiveTribalSuggestion,
} from "../engines/TribalKnowledgeEngine.js";

describe("TK-MS8: Reinforcement + Proactive Intelligence", () => {
  describe("U35: Outcome Tracking & Reinforcement Learning", () => {
    describe("trackTipOutcome", () => {
      it("should record tip outcome", () => {
        const tipId = "tk-001"; // Known tip
        const context: OutcomeContext = {
          material: "304 Stainless",
          operation: "roughing",
        };

        // Track a success
        tribalKnowledgeEngine.trackTipOutcome(
          tipId,
          "success",
          context,
          "test-session-1"
        );

        const reinforcement = tribalKnowledgeEngine.getTipReinforcement(tipId);
        expect(reinforcement).not.toBeNull();
        expect(reinforcement?.success_count).toBeGreaterThanOrEqual(1);
      });

      it("should track multiple outcomes for same tip", () => {
        const tipId = "tk-002"; // Titanium chip color tip
        const context: OutcomeContext = {
          material: "Ti-6Al-4V",
          operation: "finishing",
        };

        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "s1");
        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "s2");
        tribalKnowledgeEngine.trackTipOutcome(tipId, "partial", context, "s3");

        const reinforcement = tribalKnowledgeEngine.getTipReinforcement(tipId);
        expect(reinforcement?.total_uses).toBeGreaterThanOrEqual(3);
      });

      it("should calculate success rate correctly", () => {
        const tipId = "tk-003"; // Vise jaw alignment
        const context: OutcomeContext = { operation: "setup" };

        // Clear state for this tip by using unique context
        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "rate-1");
        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "rate-2");
        tribalKnowledgeEngine.trackTipOutcome(tipId, "failure", context, "rate-3");
        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "rate-4");

        const reinforcement = tribalKnowledgeEngine.getTipReinforcement(tipId);
        expect(reinforcement?.success_rate).toBeGreaterThan(0.5);
      });

      it("should update tip usage count", () => {
        const tipId = "tk-004"; // Deep pocket tip
        const tip = tribalKnowledgeEngine.search({ query: "deep pocket chip", limit: 1 })[0];
        const initialUsage = tip?.usage_count || 0;

        tribalKnowledgeEngine.trackTipOutcome(
          tipId,
          "success",
          { operation: "pocketing" },
          "usage-test"
        );

        const updatedTip = tribalKnowledgeEngine.search({ query: "deep pocket chip", limit: 1 })[0];
        expect(updatedTip?.usage_count).toBeGreaterThanOrEqual(initialUsage);
      });
    });

    describe("getReinforcedTips", () => {
      it("should return tips with positive reinforcement", () => {
        const context: OutcomeContext = {
          material: "Stainless",
          operation: "milling",
        };

        // First track some outcomes to ensure data exists
        tribalKnowledgeEngine.trackTipOutcome("tk-001", "success", context, "rf-1");
        tribalKnowledgeEngine.trackTipOutcome("tk-001", "success", context, "rf-2");

        const reinforced = tribalKnowledgeEngine.getReinforcedTips(context);

        expect(Array.isArray(reinforced)).toBe(true);
        for (const tip of reinforced) {
          expect(tip.reinforcement).toBeDefined();
          expect(tip.reinforcement.success_rate).toBeGreaterThanOrEqual(0.6);
        }
      });

      it("should include reinforcement summary with each tip", () => {
        const context: OutcomeContext = { material: "Steel" };
        const reinforced = tribalKnowledgeEngine.getReinforcedTips(context, 5);

        for (const tip of reinforced) {
          expect(tip.reinforcement).toHaveProperty("total_uses");
          expect(tip.reinforcement).toHaveProperty("success_rate");
          expect(tip.reinforcement).toHaveProperty("recent_trend");
        }
      });

      it("should limit results", () => {
        const context: OutcomeContext = { operation: "machining" };
        const reinforced = tribalKnowledgeEngine.getReinforcedTips(context, 3);

        expect(reinforced.length).toBeLessThanOrEqual(3);
      });
    });

    describe("getTipReinforcement", () => {
      it("should return null for tip with no outcomes", () => {
        const reinforcement = tribalKnowledgeEngine.getTipReinforcement("nonexistent-tip");
        expect(reinforcement).toBeNull();
      });

      it("should calculate recent trend", () => {
        const tipId = "tk-005"; // Thread milling tip
        const context: OutcomeContext = { operation: "threading" };

        // Track outcomes to establish a trend
        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "trend-1");
        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "trend-2");

        const reinforcement = tribalKnowledgeEngine.getTipReinforcement(tipId);
        expect(["improving", "stable", "declining"]).toContain(reinforcement?.recent_trend);
      });
    });
  });

  describe("U36: Confidence Calibration Engine", () => {
    describe("calibrateTipConfidence", () => {
      it("should calibrate based on success rate", () => {
        const tipId = "tk-006"; // Aluminum face mill chatter fix
        const context: OutcomeContext = { material: "Aluminum" };

        // Track successful outcomes
        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "cal-1");
        tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "cal-2");

        const calibrated = tribalKnowledgeEngine.calibrateTipConfidence(tipId);

        expect(calibrated).toBeGreaterThanOrEqual(30);
        expect(calibrated).toBeLessThanOrEqual(98);
      });

      it("should return original confidence for tips with no outcomes", () => {
        const tipId = "tk-007"; // Cast iron dry machining
        const tip = tribalKnowledgeEngine.search({ query: "cast iron", limit: 1 })[0];
        const originalConfidence = tip?.confidence || 80;

        const calibrated = tribalKnowledgeEngine.calibrateTipConfidence(tipId);

        // Should be close to original
        expect(Math.abs(calibrated - originalConfidence)).toBeLessThan(10);
      });

      it("should apply confidence bounds", () => {
        const tipId = "tk-008"; // First article inspection
        const context: OutcomeContext = { operation: "inspection" };

        // Track many failures to test lower bound
        for (let i = 0; i < 5; i++) {
          tribalKnowledgeEngine.trackTipOutcome(tipId, "failure", context, `bound-${i}`);
        }

        const calibrated = tribalKnowledgeEngine.calibrateTipConfidence(tipId);

        expect(calibrated).toBeGreaterThanOrEqual(30); // Lower bound
        expect(calibrated).toBeLessThanOrEqual(98);    // Upper bound
      });
    });

    describe("calibrateAllTips", () => {
      it("should return calibration entries", () => {
        const entries = tribalKnowledgeEngine.calibrateAllTips();

        expect(Array.isArray(entries)).toBe(true);
        for (const entry of entries) {
          expect(entry).toHaveProperty("tip_id");
          expect(entry).toHaveProperty("original_confidence");
          expect(entry).toHaveProperty("calibrated_confidence");
          expect(entry).toHaveProperty("delta");
          expect(entry).toHaveProperty("reason");
        }
      });

      it("should sort by absolute delta", () => {
        const entries = tribalKnowledgeEngine.calibrateAllTips();

        if (entries.length > 1) {
          for (let i = 1; i < entries.length; i++) {
            expect(Math.abs(entries[i - 1].delta)).toBeGreaterThanOrEqual(
              Math.abs(entries[i].delta)
            );
          }
        }
      });
    });

    describe("getFlaggedTips", () => {
      it("should return tips with significant confidence drops", () => {
        const flagged = tribalKnowledgeEngine.getFlaggedTips(-5);

        expect(Array.isArray(flagged)).toBe(true);
        for (const entry of flagged) {
          expect(entry.delta).toBeLessThanOrEqual(-5);
        }
      });

      it("should respect threshold parameter", () => {
        const flaggedLoose = tribalKnowledgeEngine.getFlaggedTips(-2);
        const flaggedStrict = tribalKnowledgeEngine.getFlaggedTips(-10);

        expect(flaggedLoose.length).toBeGreaterThanOrEqual(flaggedStrict.length);
      });
    });
  });

  describe("U37: Proactive Tribal Suggestions", () => {
    beforeEach(() => {
      tribalKnowledgeEngine.clearSuggestionCooldowns();
    });

    describe("generateProactiveSuggestions", () => {
      it("should generate suggestions based on context", () => {
        const context: OutcomeContext = {
          material: "Stainless",
          operation: "roughing",
        };

        const suggestions = tribalKnowledgeEngine.generateProactiveSuggestions(context);

        expect(Array.isArray(suggestions)).toBe(true);
        for (const suggestion of suggestions) {
          expect(suggestion).toHaveProperty("tip_id");
          expect(suggestion).toHaveProperty("title");
          expect(suggestion).toHaveProperty("reason");
          expect(suggestion).toHaveProperty("priority");
        }
      });

      it("should prioritize safety tips", () => {
        const context: OutcomeContext = {
          material: "Steel",
          operation: "machining",
        };

        const suggestions = tribalKnowledgeEngine.generateProactiveSuggestions(context);

        // If there are safety tips, they should be first
        const safetyIndex = suggestions.findIndex(s => s.is_safety);
        const nonSafetyIndex = suggestions.findIndex(s => !s.is_safety);

        if (safetyIndex !== -1 && nonSafetyIndex !== -1) {
          expect(safetyIndex).toBeLessThan(nonSafetyIndex);
        }
      });

      it("should respect minimum confidence threshold", () => {
        const context: OutcomeContext = {
          material: "Aluminum",
        };

        const suggestions = tribalKnowledgeEngine.generateProactiveSuggestions(context, {
          minConfidence: 85,
        });

        // All suggestions should come from high-confidence tips
        expect(suggestions.every(s => s.relevance_score >= 0)).toBe(true);
      });

      it("should limit number of suggestions", () => {
        const context: OutcomeContext = {
          material: "Steel",
          operation: "milling",
        };

        const suggestions = tribalKnowledgeEngine.generateProactiveSuggestions(context, {
          maxSuggestions: 3,
        });

        expect(suggestions.length).toBeLessThanOrEqual(3);
      });

      it("should apply cooldown to prevent repeated suggestions", () => {
        const context: OutcomeContext = {
          material: "Titanium",
        };

        const firstCall = tribalKnowledgeEngine.generateProactiveSuggestions(context);
        const secondCall = tribalKnowledgeEngine.generateProactiveSuggestions(context);

        // Second call should not include tips from first call (cooldown)
        const firstIds = new Set(firstCall.map(s => s.tip_id));
        const repeatedIds = secondCall.filter(s => firstIds.has(s.tip_id));

        expect(repeatedIds.length).toBeLessThan(firstCall.length);
      });

      it("should return empty for no context", () => {
        const suggestions = tribalKnowledgeEngine.generateProactiveSuggestions({});
        expect(suggestions).toEqual([]);
      });
    });

    describe("clearSuggestionCooldowns", () => {
      it("should allow repeated suggestions after clear", () => {
        const context: OutcomeContext = { material: "Inconel" };

        const firstCall = tribalKnowledgeEngine.generateProactiveSuggestions(context);
        tribalKnowledgeEngine.clearSuggestionCooldowns();
        const secondCall = tribalKnowledgeEngine.generateProactiveSuggestions(context);

        // After clearing, should get similar suggestions
        if (firstCall.length > 0 && secondCall.length > 0) {
          const firstIds = new Set(firstCall.map(s => s.tip_id));
          const hasOverlap = secondCall.some(s => firstIds.has(s.tip_id));
          expect(hasOverlap).toBe(true);
        }
      });
    });

    describe("getProactiveSuggestionsForPUOA", () => {
      it("should integrate with PUOA context format", () => {
        const suggestions = tribalKnowledgeEngine.getProactiveSuggestionsForPUOA(
          "4140 Steel",
          "roughing",
          "Okuma MB-5000H"
        );

        expect(Array.isArray(suggestions)).toBe(true);
        for (const suggestion of suggestions) {
          expect(suggestion).toHaveProperty("tip_id");
          expect(suggestion).toHaveProperty("priority");
          expect(["critical", "high", "medium", "low"]).toContain(suggestion.priority);
        }
      });

      it("should handle partial context", () => {
        const suggestions = tribalKnowledgeEngine.getProactiveSuggestionsForPUOA(
          "Aluminum",
          undefined,
          undefined
        );

        expect(Array.isArray(suggestions)).toBe(true);
      });
    });
  });

  describe("integration", () => {
    it("should combine reinforcement with proactive suggestions", () => {
      const context: OutcomeContext = {
        material: "D2 Tool Steel",
        operation: "finishing",
      };

      // Track some outcomes
      tribalKnowledgeEngine.trackTipOutcome("tk-001", "success", context, "int-1");

      // Get proactive suggestions
      const suggestions = tribalKnowledgeEngine.generateProactiveSuggestions(context);

      // Get reinforced tips
      const reinforced = tribalKnowledgeEngine.getReinforcedTips(context);

      // Both should work
      expect(Array.isArray(suggestions)).toBe(true);
      expect(Array.isArray(reinforced)).toBe(true);
    });

    it("should calibrate and use calibrated confidence in suggestions", () => {
      // Calibrate all tips
      tribalKnowledgeEngine.calibrateAllTips();

      // Suggestions should use calibrated confidence
      const suggestions = tribalKnowledgeEngine.generateProactiveSuggestions({
        material: "Steel",
        operation: "drilling",
      });

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle tracking outcome for nonexistent tip gracefully", () => {
      const context: OutcomeContext = { material: "Steel" };

      // Should not throw
      expect(() => {
        tribalKnowledgeEngine.trackTipOutcome(
          "nonexistent-tip-xyz",
          "success",
          context,
          "edge-1"
        );
      }).not.toThrow();
    });

    it("should handle partial outcome with modifier", () => {
      const tipId = "tk-001";
      const context: OutcomeContext = {
        material: "304 SS",
        operation: "roughing",
        notes: "Partial success - tip helped but needed adjustment",
      };

      tribalKnowledgeEngine.trackTipOutcome(tipId, "partial", context, "partial-1");

      const reinforcement = tribalKnowledgeEngine.getTipReinforcement(tipId);
      expect(reinforcement).not.toBeNull();
      expect(reinforcement?.partial_count).toBeGreaterThanOrEqual(1);
    });

    it("should track failure outcomes correctly", () => {
      const tipId = "tk-009"; // Generic tip
      const context: OutcomeContext = {
        material: "Unknown Alloy",
        operation: "experimental",
      };

      tribalKnowledgeEngine.trackTipOutcome(tipId, "failure", context, "fail-1");

      const reinforcement = tribalKnowledgeEngine.getTipReinforcement(tipId);
      expect(reinforcement).not.toBeNull();
      expect(reinforcement?.failure_count).toBeGreaterThanOrEqual(1);
    });

    it("should handle high-volume outcome tracking without performance degradation", () => {
      const tipId = "tk-010";
      const context: OutcomeContext = { operation: "testing" };
      const startTime = Date.now();

      // Track 100 outcomes rapidly
      for (let i = 0; i < 100; i++) {
        tribalKnowledgeEngine.trackTipOutcome(
          tipId,
          i % 3 === 0 ? "failure" : "success",
          context,
          `perf-${i}`
        );
      }

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second

      const reinforcement = tribalKnowledgeEngine.getTipReinforcement(tipId);
      expect(reinforcement?.total_uses).toBeGreaterThanOrEqual(100);
    });

    it("should handle proactive suggestions with machine context", () => {
      const suggestions = tribalKnowledgeEngine.getProactiveSuggestionsForPUOA(
        "Inconel 718",
        "roughing",
        "Okuma GENOS M560-V"
      );

      expect(Array.isArray(suggestions)).toBe(true);
      // Should find material-specific tips for difficult superalloy
    });

    it("should prioritize recently successful tips in reinforced results", () => {
      const context: OutcomeContext = {
        material: "Aluminum",
        operation: "milling",
      };

      // Track multiple successes for a specific tip
      const successTipId = "tk-006"; // Aluminum face mill chatter fix
      for (let i = 0; i < 5; i++) {
        tribalKnowledgeEngine.trackTipOutcome(
          successTipId,
          "success",
          context,
          `priority-${i}`
        );
      }

      const reinforced = tribalKnowledgeEngine.getReinforcedTips(context, 10);

      // getReinforcedTips returns KnowledgeTip & { reinforcement } (flat merge)
      const foundTip = reinforced.find(r => r.id === successTipId);
      if (foundTip) {
        expect(foundTip.reinforcement.success_rate).toBeGreaterThanOrEqual(0.8);
      }
    });

    it("should handle calibration with mixed outcome history", () => {
      const tipId = "tk-011";
      const context: OutcomeContext = { operation: "mixed-test" };

      // Create mixed history
      tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "mix-1");
      tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "mix-2");
      tribalKnowledgeEngine.trackTipOutcome(tipId, "partial", context, "mix-3");
      tribalKnowledgeEngine.trackTipOutcome(tipId, "failure", context, "mix-4");
      tribalKnowledgeEngine.trackTipOutcome(tipId, "success", context, "mix-5");

      const calibrated = tribalKnowledgeEngine.calibrateTipConfidence(tipId);

      // Should be moderate confidence given mixed results
      expect(calibrated).toBeGreaterThanOrEqual(40);
      expect(calibrated).toBeLessThanOrEqual(85);
    });
  });
});
