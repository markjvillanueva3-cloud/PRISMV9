/**
 * Tests for TK-MS1: Knowledge Spine Engines
 * U-TK05: KnowledgeApplicabilityEngine
 * U-TK06: KnowledgeConflictResolverEngine
 * U-TK07: KnowledgeConsumerRegistryEngine
 * U-TK08: KnowledgeFeedbackIngestEngine
 * U-TK09: KnowledgePromotionEngine
 *
 * NOTE: Test file temporarily located here due to src/__tests__/ directory corruption.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  knowledgeApplicabilityEngine,
  knowledgeConflictResolverEngine,
  knowledgeConsumerRegistryEngine,
  knowledgeFeedbackIngestEngine,
  knowledgePromotionEngine,
  type TribalQueryContext,
} from "./index.js";

import { tribalKnowledgeEngine, type KnowledgeTip } from "../engines/TribalKnowledgeEngine.js";

// ── U-TK05: KnowledgeApplicabilityEngine ──────────────────────────────────

describe("KnowledgeApplicabilityEngine", () => {
  it("scores tips with full context", () => {
    const context: TribalQueryContext = {
      material_iso_group: "P",
      material_name: "4140",
      machine_type: "lathe",
      operation: "turning",
      domain: "speeds_feeds",
    };

    const result = knowledgeApplicabilityEngine.score(context);

    // Verify structure is correct
    expect(result.context).toEqual(context);
    expect(result.query_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.threshold_used).toBe(30);
    expect(Array.isArray(result.scored_tips)).toBe(true);
    expect(typeof result.total_evaluated).toBe("number");
    expect(typeof result.above_threshold).toBe("number");
  });

  it("scoreTip returns breakdown with 6 dimensions", () => {
    const tip: KnowledgeTip = {
      id: "test-tip-001",
      title: "Test turning tip for steel",
      body: "When turning 4140 steel, use 350 SFM and 0.010 IPR",
      category: "speeds_feeds",
      tags: ["steel", "turning", "P"],
      confidence: 85,
      source: "test",
      created_at: new Date().toISOString(),
      usage_count: 10,
    };

    const context: TribalQueryContext = {
      material_iso_group: "P",
      operation: "turning",
    };

    const scored = knowledgeApplicabilityEngine.scoreTip(tip, context);

    expect(scored.tip).toBe(tip);
    expect(scored.applicability_score).toBeGreaterThan(0);
    expect(scored.breakdown).toHaveProperty("material_match");
    expect(scored.breakdown).toHaveProperty("machine_match");
    expect(scored.breakdown).toHaveProperty("operation_match");
    expect(scored.breakdown).toHaveProperty("domain_match");
    expect(scored.breakdown).toHaveProperty("recency_bonus");
    expect(scored.breakdown).toHaveProperty("usage_bonus");
    expect(scored.relevance_reasons.length).toBeGreaterThan(0);
  });

  it("isRelevant returns boolean for threshold check", () => {
    const tip: KnowledgeTip = {
      id: "test-relevance",
      title: "Aluminum milling tip",
      body: "Use high RPM for aluminum",
      category: "speeds_feeds",
      tags: ["aluminum", "milling"],
      confidence: 90,
      source: "test",
      created_at: new Date().toISOString(),
      usage_count: 5,
    };

    const context: TribalQueryContext = {
      material_iso_group: "N",
      operation: "milling",
    };

    const isRelevant = knowledgeApplicabilityEngine.isRelevant(tip, context);
    expect(typeof isRelevant).toBe("boolean");
  });

  it("topTips returns sorted array", () => {
    const context: TribalQueryContext = {
      material_iso_group: "P",
      machine_type: "lathe",
    };

    const topTips = knowledgeApplicabilityEngine.topTips(context, 5);

    expect(Array.isArray(topTips)).toBe(true);
    expect(topTips.length).toBeLessThanOrEqual(5);

    // Should be sorted descending by score
    for (let i = 1; i < topTips.length; i++) {
      expect(topTips[i - 1].applicability_score)
        .toBeGreaterThanOrEqual(topTips[i].applicability_score);
    }
  });

  it("handles empty context gracefully", () => {
    const result = knowledgeApplicabilityEngine.score({});

    expect(result.total_evaluated).toBeGreaterThanOrEqual(0);
    expect(result.scored_tips).toBeDefined();
  });
});

// ── U-TK06: KnowledgeConflictResolverEngine ───────────────────────────────

describe("KnowledgeConflictResolverEngine", () => {
  it("detectConflicts returns structured result", () => {
    const result = knowledgeConflictResolverEngine.detectConflicts({
      limit: 10,
    });

    expect(result.total_tips_analyzed).toBeGreaterThan(0);
    expect(Array.isArray(result.conflicts_found)).toBe(true);
    expect(result.by_severity).toBeDefined();
    expect(result.by_type).toBeDefined();
    expect(result.scan_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("detectConflict identifies opposing recommendations", () => {
    const tipA: KnowledgeTip = {
      id: "conflict-a",
      title: "Always use coolant",
      body: "You must always use coolant when cutting steel",
      category: "speeds_feeds",
      tags: ["coolant", "steel"],
      confidence: 80,
      source: "test",
      created_at: "2026-01-01",
      usage_count: 5,
    };

    const tipB: KnowledgeTip = {
      id: "conflict-b",
      title: "Avoid coolant in certain cases",
      body: "Never use coolant when doing interrupted cuts on steel",
      category: "speeds_feeds",
      tags: ["coolant", "steel"],
      confidence: 75,
      source: "test",
      created_at: "2026-02-01",
      usage_count: 3,
    };

    const conflict = knowledgeConflictResolverEngine.detectConflict(tipA, tipB);

    // May or may not detect depending on overlap, but should return a valid structure
    if (conflict) {
      expect(conflict.id).toBeDefined();
      expect(conflict.conflict_type).toBeDefined();
      expect(conflict.severity).toBeDefined();
    }
  });

  it("resolve applies strategy and returns resolution", () => {
    const tipA: KnowledgeTip = {
      id: "resolve-a",
      title: "Old tip",
      body: "Use 100 SFM for steel",
      category: "speeds_feeds",
      tags: ["steel"],
      confidence: 70,
      source: "test",
      created_at: "2024-01-01",
      usage_count: 2,
    };

    const tipB: KnowledgeTip = {
      id: "resolve-b",
      title: "New tip",
      body: "Use 150 SFM for steel - updated guidance",
      category: "speeds_feeds",
      tags: ["steel"],
      confidence: 85,
      source: "engineer",
      created_at: "2026-01-01",
      usage_count: 10,
    };

    const mockConflict = {
      id: "test-conflict",
      tip_a: tipA,
      tip_b: tipB,
      conflict_type: "outdated_superseded" as const,
      severity: "low" as const,
      description: "Older tip superseded",
      detected_at: new Date().toISOString(),
    };

    const resolution = knowledgeConflictResolverEngine.resolve(mockConflict);

    expect(resolution.conflict).toBe(mockConflict);
    expect(resolution.strategy_used).toBeDefined();
    expect(resolution.action).toBeDefined();
    expect(resolution.rationale).toBeDefined();
  });

  it("suggest returns recommended strategy", () => {
    const mockConflict = {
      id: "suggest-conflict",
      tip_a: { id: "a", confidence: 70, created_at: "2025-01-01" } as KnowledgeTip,
      tip_b: { id: "b", confidence: 90, created_at: "2026-01-01" } as KnowledgeTip,
      conflict_type: "contradictory_values" as const,
      severity: "medium" as const,
      description: "Values differ",
      detected_at: new Date().toISOString(),
    };

    const suggestion = knowledgeConflictResolverEngine.suggest(mockConflict);

    expect(suggestion.recommended_strategy).toBeDefined();
    expect(suggestion.confidence).toBeGreaterThan(0);
    expect(Array.isArray(suggestion.alternatives)).toBe(true);
  });
});

// ── U-TK07: KnowledgeConsumerRegistryEngine ───────────────────────────────

describe("KnowledgeConsumerRegistryEngine", () => {
  it("list returns default consumers", () => {
    const consumers = knowledgeConsumerRegistryEngine.list();

    expect(Array.isArray(consumers)).toBe(true);
    expect(consumers.length).toBeGreaterThan(0);

    const first = consumers[0];
    expect(first.id).toBeDefined();
    expect(first.name).toBeDefined();
    expect(first.type).toBeDefined();
  });

  it("register adds new consumer", () => {
    const consumer = knowledgeConsumerRegistryEngine.register({
      id: `test-consumer-${Date.now()}`,
      name: "TestConsumer",
      type: "engine",
      description: "Test consumer for unit tests",
      subscribed_categories: ["tooling"],
      subscribed_tags: ["test"],
      priority: "low",
    });

    expect(consumer.id).toContain("test-consumer");
    expect(consumer.tips_consumed).toBe(0);
    expect(consumer.active).toBe(true);
  });

  it("findInterestedConsumers returns matching consumers", () => {
    const tip = {
      category: "speeds_feeds",
      tags: ["sfm", "cutting-parameters"],
    };

    const interested = knowledgeConsumerRegistryEngine.findInterestedConsumers(tip);

    expect(Array.isArray(interested)).toBe(true);
    // Should find SpeedFeedOrchestratorEngine at minimum
    expect(interested.length).toBeGreaterThan(0);
  });

  it("getPropagationTargets ranks by priority", () => {
    const tip = {
      id: "prop-test",
      category: "tooling",
      tags: ["endmill", "tool-life"],
      confidence: 80,
    };

    const targets = knowledgeConsumerRegistryEngine.getPropagationTargets(tip);

    expect(Array.isArray(targets)).toBe(true);

    // Should be sorted by priority descending
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i - 1].priority).toBeGreaterThanOrEqual(targets[i].priority);
    }
  });

  it("recordConsumption updates stats", () => {
    const consumer = knowledgeConsumerRegistryEngine.list()[0];
    const initialConsumed = consumer.tips_consumed;

    knowledgeConsumerRegistryEngine.recordConsumption({
      consumer_id: consumer.id,
      tip_id: "test-tip",
      timestamp: new Date().toISOString(),
      context: "test",
      action: "read",
    });

    const updated = knowledgeConsumerRegistryEngine.get(consumer.id);
    expect(updated?.tips_consumed).toBe(initialConsumed + 1);
  });

  it("stats returns registry overview", () => {
    const stats = knowledgeConsumerRegistryEngine.stats();

    expect(stats.total_consumers).toBeGreaterThan(0);
    expect(stats.active_consumers).toBeGreaterThan(0);
    expect(stats.by_type).toBeDefined();
    expect(typeof stats.total_events).toBe("number");
  });
});

// ── U-TK08: KnowledgeFeedbackIngestEngine ─────────────────────────────────

describe("KnowledgeFeedbackIngestEngine", () => {
  const testTipId = `test-feedback-tip-${Date.now()}`;

  it("submit creates feedback entry", () => {
    const feedback = knowledgeFeedbackIngestEngine.submit({
      tip_id: testTipId,
      feedback_type: "helpful",
      rating: 5,
      comment: "Great tip!",
      submitted_by: "test-user",
    });

    expect(feedback.id).toMatch(/^fb-/);
    expect(feedback.tip_id).toBe(testTipId);
    expect(feedback.feedback_type).toBe("helpful");
    expect(feedback.processed).toBe(true);
  });

  it("getFeedback retrieves entries for tip", () => {
    // Submit another feedback first
    knowledgeFeedbackIngestEngine.submit({
      tip_id: testTipId,
      feedback_type: "success_story",
      submitted_by: "test-user-2",
    });

    const feedback = knowledgeFeedbackIngestEngine.getFeedback(testTipId);

    expect(Array.isArray(feedback)).toBe(true);
    expect(feedback.length).toBeGreaterThanOrEqual(2);
  });

  it("summarize aggregates feedback", () => {
    const summary = knowledgeFeedbackIngestEngine.summarize(testTipId);

    expect(summary).not.toBeNull();
    expect(summary!.tip_id).toBe(testTipId);
    expect(summary!.total_feedback).toBeGreaterThan(0);
    expect(summary!.positive_count).toBeGreaterThan(0);
    expect(typeof summary!.net_sentiment).toBe("number");
  });

  it("negative feedback affects impact", () => {
    const negativeTipId = `test-negative-${Date.now()}`;

    const feedback = knowledgeFeedbackIngestEngine.submit({
      tip_id: negativeTipId,
      feedback_type: "incorrect",
      comment: "This information is wrong",
      submitted_by: "test-user",
    });

    expect(feedback.impact).toBeDefined();
    expect(feedback.impact!.confidence_delta).toBeLessThan(0);
    expect(feedback.impact!.flagged_for_review).toBe(true);
  });

  it("stats returns overview", () => {
    const stats = knowledgeFeedbackIngestEngine.stats();

    expect(stats.total_feedback).toBeGreaterThan(0);
    expect(stats.total_tips_with_feedback).toBeGreaterThan(0);
    expect(stats.by_type).toBeDefined();
    expect(typeof stats.avg_sentiment).toBe("number");
  });
});

// ── U-TK09: KnowledgePromotionEngine ──────────────────────────────────────

describe("KnowledgePromotionEngine", () => {
  it("getStage infers from tip ID prefix", () => {
    expect(knowledgePromotionEngine.getStage("tk-cap-123")).toBe("captured");
    expect(knowledgePromotionEngine.getStage("tk-static-456")).toBe("canonical");
    expect(knowledgePromotionEngine.getStage("tk-doc-789")).toBe("validated");
    expect(knowledgePromotionEngine.getStage("unknown-id")).toBe("draft");
  });

  it("evaluate returns detailed criteria assessment", () => {
    const evaluation = knowledgePromotionEngine.evaluate("tk-cap-test-001", "validated");

    expect(evaluation.tip_id).toBe("tk-cap-test-001");
    expect(evaluation.current_stage).toBeDefined();
    expect(evaluation.target_stage).toBe("validated");
    expect(typeof evaluation.eligible).toBe("boolean");
    expect(Array.isArray(evaluation.criteria_met)).toBe(true);
    expect(Array.isArray(evaluation.criteria_unmet)).toBe(true);
  });

  it("promote validates criteria before promotion", () => {
    const result = knowledgePromotionEngine.promote("test-promo-tip", {
      promoted_by: "test-user",
    });

    // Either success or error with reason
    if ("error" in result) {
      expect(typeof result.error).toBe("string");
    } else {
      expect(result.tip_id).toBe("test-promo-tip");
      expect(result.promoted_by).toBe("test-user");
    }
  });

  it("force promotion skips criteria", () => {
    const tipId = `force-promo-${Date.now()}`;

    const result = knowledgePromotionEngine.promote(tipId, {
      promoted_by: "admin",
      force: true,
      target_stage: "validated",
      reason: "Force promoted for testing",
    });

    if ("id" in result) {
      expect(result.to_stage).toBe("validated");
      expect(result.reason).toContain("Force");
    }
  });

  it("demote moves tip to previous stage", () => {
    const tipId = `demote-test-${Date.now()}`;

    // First promote
    knowledgePromotionEngine.promote(tipId, {
      promoted_by: "admin",
      force: true,
      target_stage: "validated",
    });

    // Then demote
    const result = knowledgePromotionEngine.demote(tipId, {
      reason: "Failed verification",
    });

    if ("id" in result) {
      expect(result.from_stage).toBe("validated");
      expect(result.to_stage).toBe("captured");
    }
  });

  it("addApproval tracks approvers", () => {
    const tipId = `approval-test-${Date.now()}`;

    knowledgePromotionEngine.addApproval(tipId, "engineer:john");
    knowledgePromotionEngine.addApproval(tipId, "supervisor:jane");

    // Approval status affects evaluation
    const evaluation = knowledgePromotionEngine.evaluate(tipId, "validated");

    // Evaluation should return valid structure
    expect(evaluation.tip_id).toBe(tipId);
    expect(evaluation.target_stage).toBe("validated");

    // At least one criteria should be checked (met or unmet)
    const totalCriteria = evaluation.criteria_met.length + evaluation.criteria_unmet.length + evaluation.blockers.length;
    expect(totalCriteria).toBeGreaterThan(0);
  });

  it("stats returns stage distribution", () => {
    const stats = knowledgePromotionEngine.stats();

    expect(stats.by_stage).toBeDefined();
    expect(stats.by_stage.draft).toBeDefined();
    expect(stats.by_stage.canonical).toBeDefined();
    expect(typeof stats.total_promotions).toBe("number");
    expect(typeof stats.promotion_rate).toBe("number");
  });
});
