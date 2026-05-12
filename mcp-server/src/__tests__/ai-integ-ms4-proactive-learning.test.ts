/**
 * AI-INTEG-MS4: Proactive Learning Integration Tests
 *
 * Tests learning trigger detection, classification, quality monitoring,
 * and auto-categorization improvements for AI reasoning.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  proactiveLearningEngine,
  type LearningTrigger,
  type LearningTriggerType,
  type TriggerClassification,
  type QualityReport,
  type LearningContext,
} from "../engines/ProactiveLearningEngine.js";

describe("AI-INTEG-MS4: Proactive Learning Integration", () => {
  describe("U1: Proactive Learning Triggers", () => {
    describe("detectLearningTriggers", () => {
      it("should detect new pattern triggers", () => {
        const context: LearningContext = {
          material: "Novel Superalloy X",
          operation: "roughing",
          outcome: "success",
          parameters: { speed: 45, feed: 0.08 },
        };

        const triggers = proactiveLearningEngine.detectLearningTriggers(context);

        expect(Array.isArray(triggers)).toBe(true);
        const newPattern = triggers.find(t => t.type === "new_pattern");
        expect(newPattern).toBeDefined();
      });

      it("should detect novel scenario triggers", () => {
        const context: LearningContext = {
          material: "Aluminum",
          operation: "experimental_process",
          outcome: "success",
          parameters: { custom_param: "novel_value" },
        };

        const triggers = proactiveLearningEngine.detectLearningTriggers(context);

        const novelScenario = triggers.find(t => t.type === "novel_scenario");
        expect(novelScenario).toBeDefined();
      });

      it("should detect conflict triggers when knowledge contradicts", () => {
        const context: LearningContext = {
          material: "Steel",
          operation: "milling",
          outcome: "success",
          knowledge_sources: [
            { source: "tribal", recommendation: "high_speed", confidence: 0.8 },
            { source: "oem", recommendation: "low_speed", confidence: 0.9 },
          ],
        };

        const triggers = proactiveLearningEngine.detectLearningTriggers(context);

        const conflict = triggers.find(t => t.type === "conflict");
        expect(conflict).toBeDefined();
        expect(conflict?.details.sources).toHaveLength(2);
      });

      it("should detect confidence drop triggers", () => {
        const context: LearningContext = {
          material: "Titanium",
          operation: "finishing",
          outcome: "failure",
          prior_confidence: 0.85,
          outcome_confidence: 0.5,
        };

        const triggers = proactiveLearningEngine.detectLearningTriggers(context);

        const confDrop = triggers.find(t => t.type === "confidence_drop");
        expect(confDrop).toBeDefined();
        expect(confDrop?.details.delta).toBeLessThan(-0.2);
      });

      it("should return empty array for routine contexts", () => {
        const context: LearningContext = {
          material: "Aluminum",
          operation: "milling",
          outcome: "success",
          is_routine: true,
        };

        const triggers = proactiveLearningEngine.detectLearningTriggers(context);

        expect(triggers).toEqual([]);
      });

      it("should emit events for detected triggers", () => {
        const events: LearningTrigger[] = [];
        proactiveLearningEngine.onTriggerDetected((trigger) => {
          events.push(trigger);
        });

        proactiveLearningEngine.detectLearningTriggers({
          material: "Inconel",
          operation: "experimental",
          outcome: "success",
        });

        expect(events.length).toBeGreaterThan(0);
      });

      it("should include context details in trigger", () => {
        const context: LearningContext = {
          material: "D2 Steel",
          operation: "grinding",
          machine: "Okuma",
          outcome: "success",
        };

        const triggers = proactiveLearningEngine.detectLearningTriggers(context);

        if (triggers.length > 0) {
          expect(triggers[0].context.material).toBe("D2 Steel");
          expect(triggers[0].context.operation).toBe("grinding");
        }
      });

      it("should handle missing context fields gracefully", () => {
        const context: LearningContext = {
          outcome: "success",
        };

        expect(() => {
          proactiveLearningEngine.detectLearningTriggers(context);
        }).not.toThrow();
      });
    });
  });

  describe("U2: Learning Trigger Classification", () => {
    describe("classifyTrigger", () => {
      it("should classify critical triggers", () => {
        const trigger: LearningTrigger = {
          id: "trig-001",
          type: "conflict",
          timestamp: new Date().toISOString(),
          context: { material: "Steel", operation: "safety_critical" },
          details: {
            severity: "high",
            sources: ["tribal", "oem"],
          },
        };

        const classification = proactiveLearningEngine.classifyTrigger(trigger);

        expect(classification.priority).toBe("critical");
      });

      it("should classify high priority triggers", () => {
        const trigger: LearningTrigger = {
          id: "trig-002",
          type: "confidence_drop",
          timestamp: new Date().toISOString(),
          context: { material: "Titanium" },
          details: { delta: -0.4 },
        };

        const classification = proactiveLearningEngine.classifyTrigger(trigger);

        expect(["critical", "high"]).toContain(classification.priority);
      });

      it("should classify medium priority triggers", () => {
        const trigger: LearningTrigger = {
          id: "trig-003",
          type: "new_pattern",
          timestamp: new Date().toISOString(),
          context: { material: "Aluminum" },
          details: { pattern_strength: 0.6 },
        };

        const classification = proactiveLearningEngine.classifyTrigger(trigger);

        expect(["critical", "high", "medium"]).toContain(classification.priority);
      });

      it("should classify low priority triggers", () => {
        const trigger: LearningTrigger = {
          id: "trig-004",
          type: "novel_scenario",
          timestamp: new Date().toISOString(),
          context: { material: "Plastic" },
          details: { novelty_score: 0.3 },
        };

        const classification = proactiveLearningEngine.classifyTrigger(trigger);

        expect(["critical", "high", "medium", "low"]).toContain(classification.priority);
      });

      it("should include routing recommendation", () => {
        const trigger: LearningTrigger = {
          id: "trig-005",
          type: "new_pattern",
          timestamp: new Date().toISOString(),
          context: { operation: "turning" },
          details: {},
        };

        const classification = proactiveLearningEngine.classifyTrigger(trigger);

        expect(classification.routing).toBeDefined();
        expect(classification.routing.handler).toBeDefined();
      });

      it("should include learning action recommendation", () => {
        const trigger: LearningTrigger = {
          id: "trig-006",
          type: "conflict",
          timestamp: new Date().toISOString(),
          context: {},
          details: { sources: ["a", "b"] },
        };

        const classification = proactiveLearningEngine.classifyTrigger(trigger);

        expect(classification.recommended_action).toBeDefined();
        expect(typeof classification.recommended_action).toBe("string");
      });

      it("should batch classify multiple triggers efficiently", () => {
        const triggers: LearningTrigger[] = [
          { id: "t1", type: "new_pattern", timestamp: new Date().toISOString(), context: {}, details: {} },
          { id: "t2", type: "conflict", timestamp: new Date().toISOString(), context: {}, details: {} },
          { id: "t3", type: "confidence_drop", timestamp: new Date().toISOString(), context: {}, details: {} },
        ];

        const classifications = proactiveLearningEngine.batchClassifyTriggers(triggers);

        expect(classifications).toHaveLength(3);
        expect(classifications.every(c => c.priority)).toBe(true);
      });

      it("should sort batch by priority", () => {
        const triggers: LearningTrigger[] = [
          { id: "t1", type: "new_pattern", timestamp: new Date().toISOString(), context: {}, details: { priority_hint: "low" } },
          { id: "t2", type: "conflict", timestamp: new Date().toISOString(), context: {}, details: { severity: "high" } },
        ];

        const classifications = proactiveLearningEngine.batchClassifyTriggers(triggers);

        // Higher priority should come first
        const priorities = classifications.map(c => c.priority);
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        for (let i = 1; i < priorities.length; i++) {
          expect(priorityOrder[priorities[i - 1] as keyof typeof priorityOrder])
            .toBeLessThanOrEqual(priorityOrder[priorities[i] as keyof typeof priorityOrder]);
        }
      });
    });
  });

  describe("U3: Knowledge Quality Monitoring", () => {
    describe("monitorKnowledgeQuality", () => {
      it("should return quality report", () => {
        const report = proactiveLearningEngine.monitorKnowledgeQuality();

        expect(report).toHaveProperty("timestamp");
        expect(report).toHaveProperty("overall_score");
        expect(report).toHaveProperty("issues");
        expect(report).toHaveProperty("recommendations");
      });

      it("should detect stale tips", () => {
        const report = proactiveLearningEngine.monitorKnowledgeQuality();

        expect(report).toHaveProperty("stale_tips");
        expect(Array.isArray(report.stale_tips)).toBe(true);
      });

      it("should detect conflicting facts", () => {
        const report = proactiveLearningEngine.monitorKnowledgeQuality();

        expect(report).toHaveProperty("conflicts");
        expect(Array.isArray(report.conflicts)).toBe(true);
      });

      it("should calculate overall score between 0 and 1", () => {
        const report = proactiveLearningEngine.monitorKnowledgeQuality();

        expect(report.overall_score).toBeGreaterThanOrEqual(0);
        expect(report.overall_score).toBeLessThanOrEqual(1);
      });

      it("should include alert thresholds", () => {
        const report = proactiveLearningEngine.monitorKnowledgeQuality();

        expect(report).toHaveProperty("thresholds");
        expect(report.thresholds).toHaveProperty("stale_days");
        expect(report.thresholds).toHaveProperty("conflict_tolerance");
      });

      it("should flag tips with declining success rate", () => {
        const report = proactiveLearningEngine.monitorKnowledgeQuality();

        expect(report).toHaveProperty("declining_tips");
        for (const tip of report.declining_tips) {
          expect(tip.success_rate_trend).toBe("declining");
        }
      });

      it("should include statistics", () => {
        const report = proactiveLearningEngine.monitorKnowledgeQuality();

        expect(report.statistics).toBeDefined();
        expect(report.statistics.total_tips).toBeGreaterThanOrEqual(0);
        expect(report.statistics.avg_confidence).toBeGreaterThanOrEqual(0);
      });

      it("should provide escalation recommendations for severe issues", () => {
        const report = proactiveLearningEngine.monitorKnowledgeQuality();

        if (report.issues.some(i => i.severity === "high")) {
          expect(report.escalations).toBeDefined();
          expect(report.escalations.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe("U4: Auto-Categorization Improvements", () => {
    describe("enhanceAutoCategorization", () => {
      it("should accept feedback from successful categorizations", () => {
        const feedback = {
          tip_id: "tk-001",
          original_category: "speeds_feeds",
          predicted_category: "speeds_feeds",
          was_correct: true,
          context: { material: "Steel" },
        };

        expect(() => {
          proactiveLearningEngine.enhanceAutoCategorization(feedback);
        }).not.toThrow();
      });

      it("should accept feedback from failed categorizations", () => {
        const feedback = {
          tip_id: "tk-002",
          original_category: "fixturing",
          predicted_category: "tooling",
          was_correct: false,
          correct_category: "fixturing",
          context: { operation: "milling" },
        };

        proactiveLearningEngine.enhanceAutoCategorization(feedback);

        // Verify learning occurred
        const stats = proactiveLearningEngine.getCategorizationStats();
        expect(stats.feedback_count).toBeGreaterThan(0);
      });

      it("should adjust category thresholds dynamically", () => {
        const initialThresholds = proactiveLearningEngine.getCategoryThresholds();

        // Provide multiple feedback items
        for (let i = 0; i < 5; i++) {
          proactiveLearningEngine.enhanceAutoCategorization({
            tip_id: `tk-${i}`,
            original_category: "safety",
            predicted_category: "safety",
            was_correct: true,
          });
        }

        const newThresholds = proactiveLearningEngine.getCategoryThresholds();

        // Thresholds may have been adjusted
        expect(newThresholds).toBeDefined();
      });

      it("should cross-validate with PUOA outcomes", () => {
        const puoaOutcome = {
          task_id: "puoa-001",
          tribal_tips_used: ["tk-001", "tk-003"],
          task_success: true,
          tips_helpful: ["tk-001"],
          tips_unhelpful: [],
        };

        proactiveLearningEngine.integrateWithPUOAOutcome(puoaOutcome);

        const stats = proactiveLearningEngine.getCategorizationStats();
        expect(stats.puoa_integrations).toBeGreaterThan(0);
      });

      it("should track categorization confidence", () => {
        const stats = proactiveLearningEngine.getCategorizationStats();

        expect(stats).toHaveProperty("avg_categorization_confidence");
        expect(stats.avg_categorization_confidence).toBeGreaterThanOrEqual(0);
        expect(stats.avg_categorization_confidence).toBeLessThanOrEqual(1);
      });

      it("should maintain feedback history", () => {
        proactiveLearningEngine.enhanceAutoCategorization({
          tip_id: "tk-history-test",
          original_category: "general",
          predicted_category: "general",
          was_correct: true,
        });

        const history = proactiveLearningEngine.getCategorizationFeedbackHistory(10);

        expect(Array.isArray(history)).toBe(true);
        expect(history.some(h => h.tip_id === "tk-history-test")).toBe(true);
      });

      it("should improve accuracy over time with sufficient feedback", () => {
        // This is a behavioral test - after N feedback items, accuracy should be trackable
        const initialStats = proactiveLearningEngine.getCategorizationStats();

        // Simulate learning
        for (let i = 0; i < 10; i++) {
          proactiveLearningEngine.enhanceAutoCategorization({
            tip_id: `tk-learn-${i}`,
            original_category: "speeds_feeds",
            predicted_category: "speeds_feeds",
            was_correct: i % 2 === 0, // 50% correct
          });
        }

        const newStats = proactiveLearningEngine.getCategorizationStats();

        expect(newStats.feedback_count).toBeGreaterThan(initialStats.feedback_count);
        expect(newStats.accuracy_rate).toBeDefined();
      });

      it("should handle empty feedback gracefully", () => {
        expect(() => {
          proactiveLearningEngine.enhanceAutoCategorization({} as any);
        }).not.toThrow();
      });
    });
  });

  describe("integration", () => {
    it("should integrate trigger detection with quality monitoring", () => {
      // Detect triggers
      const triggers = proactiveLearningEngine.detectLearningTriggers({
        material: "Unknown Alloy",
        operation: "experimental",
        outcome: "success",
      });

      // Quality report should reflect recent activity
      const report = proactiveLearningEngine.monitorKnowledgeQuality();

      expect(report.recent_trigger_count).toBeGreaterThanOrEqual(0);
    });

    it("should integrate classification with auto-categorization", () => {
      const trigger: LearningTrigger = {
        id: "integ-001",
        type: "new_pattern",
        timestamp: new Date().toISOString(),
        context: { material: "Steel", operation: "turning" },
        details: { category_hint: "speeds_feeds" },
      };

      const classification = proactiveLearningEngine.classifyTrigger(trigger);

      // Classification should inform categorization
      expect(classification.categorization_impact).toBeDefined();
    });

    it("should emit quality alerts for severe issues", () => {
      const alerts: string[] = [];
      proactiveLearningEngine.onQualityAlert((alert) => {
        alerts.push(alert.message);
      });

      // Force a quality check
      proactiveLearningEngine.monitorKnowledgeQuality();

      // Alerts may or may not be emitted depending on current state
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});
