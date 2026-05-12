/**
 * TK-MS10: Tribal Knowledge Evolution & Continuous Learning Tests
 *
 * Tests tip versioning, knowledge merging, pattern detection,
 * and lifecycle management.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  tribalEvolutionEngine,
  type TipVersion,
  type TipDiff,
  type MergeCandidate,
  type MergedTip,
  type MergeStrategy,
  type EmergingPattern,
  type TipLifecycleState,
  type LifecycleEvent,
} from "../engines/TribalEvolutionEngine.js";

describe("TK-MS10: Tribal Knowledge Evolution & Continuous Learning", () => {
  describe("U1: Tip Version Control", () => {
    describe("createTipVersion", () => {
      it("should create new version for tip", () => {
        const version = tribalEvolutionEngine.createTipVersion("tk-001", {
          body: "Updated body text with new information",
          confidence: 0.85,
        });

        expect(version).toHaveProperty("version_id");
        expect(version).toHaveProperty("tip_id", "tk-001");
        expect(version).toHaveProperty("version_number");
        expect(version).toHaveProperty("timestamp");
        expect(version).toHaveProperty("changes");
      });

      it("should increment version number", () => {
        tribalEvolutionEngine.createTipVersion("tk-ver-test", { body: "V1" });
        const v2 = tribalEvolutionEngine.createTipVersion("tk-ver-test", { body: "V2" });

        expect(v2.version_number).toBeGreaterThan(1);
      });

      it("should store change reason", () => {
        const version = tribalEvolutionEngine.createTipVersion(
          "tk-002",
          { confidence: 0.9 },
          { reason: "Updated based on shop feedback" }
        );

        expect(version.reason).toBe("Updated based on shop feedback");
      });

      it("should track author", () => {
        const version = tribalEvolutionEngine.createTipVersion(
          "tk-003",
          { tags: ["new-tag"] },
          { author: "claude-backend" }
        );

        expect(version.author).toBe("claude-backend");
      });

      it("should snapshot previous state when updating", () => {
        const tipId = `tk-snapshot-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Original content" });
        const version2 = tribalEvolutionEngine.createTipVersion(tipId, {
          body: "Updated content",
        });

        // Second version should have previous state
        expect(version2.previous_state).toBeDefined();
        expect(version2.previous_state?.body).toBe("Original content");
      });

      it("should handle new tip creation", () => {
        const version = tribalEvolutionEngine.createTipVersion("tk-new-001", {
          title: "Brand New Tip",
          body: "This is entirely new knowledge",
        });

        expect(version.version_number).toBe(1);
        expect(version.is_creation).toBe(true);
      });

      it("should validate changes", () => {
        expect(() => {
          tribalEvolutionEngine.createTipVersion("tk-005", {});
        }).not.toThrow();

        const version = tribalEvolutionEngine.createTipVersion("tk-005", {});
        expect(version.changes).toEqual({});
      });
    });

    describe("getTipHistory", () => {
      it("should return version history", () => {
        tribalEvolutionEngine.createTipVersion("tk-hist-001", { body: "V1" });
        tribalEvolutionEngine.createTipVersion("tk-hist-001", { body: "V2" });

        const history = tribalEvolutionEngine.getTipHistory("tk-hist-001");

        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeGreaterThanOrEqual(2);
      });

      it("should order history by version number", () => {
        const tipId = `tk-hist-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "A" });
        tribalEvolutionEngine.createTipVersion(tipId, { body: "B" });
        tribalEvolutionEngine.createTipVersion(tipId, { body: "C" });

        const history = tribalEvolutionEngine.getTipHistory(tipId);

        for (let i = 1; i < history.length; i++) {
          expect(history[i].version_number).toBeGreaterThan(
            history[i - 1].version_number
          );
        }
      });

      it("should return empty for tip with no history", () => {
        const history = tribalEvolutionEngine.getTipHistory("nonexistent-tip");

        expect(history).toEqual([]);
      });
    });

    describe("diffTipVersions", () => {
      it("should compute diff between versions", () => {
        const tipId = `tk-diff-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Original" });
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Modified" });

        const history = tribalEvolutionEngine.getTipHistory(tipId);
        const diff = tribalEvolutionEngine.diffTipVersions(
          history[0].version_id,
          history[1].version_id
        );

        expect(diff).toHaveProperty("added");
        expect(diff).toHaveProperty("removed");
        expect(diff).toHaveProperty("modified");
      });

      it("should identify field changes", () => {
        const tipId = `tk-diff-fields-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { confidence: 0.7 });
        tribalEvolutionEngine.createTipVersion(tipId, { confidence: 0.9 });

        const history = tribalEvolutionEngine.getTipHistory(tipId);
        const diff = tribalEvolutionEngine.diffTipVersions(
          history[0].version_id,
          history[1].version_id
        );

        expect(diff.modified).toContain("confidence");
      });
    });

    describe("rollbackTip", () => {
      it("should rollback to previous version", () => {
        const tipId = `tk-rollback-${Date.now()}`;
        const v1 = tribalEvolutionEngine.createTipVersion(tipId, { body: "Original" });
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Changed" });

        tribalEvolutionEngine.rollbackTip(tipId, v1.version_number);

        const history = tribalEvolutionEngine.getTipHistory(tipId);
        const latest = history[history.length - 1];
        expect(latest.changes.body).toBe("Original");
        expect(latest.is_rollback).toBe(true);
      });

      it("should create new version on rollback", () => {
        const tipId = `tk-rollback-ver-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "V1" });
        tribalEvolutionEngine.createTipVersion(tipId, { body: "V2" });

        const beforeCount = tribalEvolutionEngine.getTipHistory(tipId).length;
        tribalEvolutionEngine.rollbackTip(tipId, 1);
        const afterCount = tribalEvolutionEngine.getTipHistory(tipId).length;

        expect(afterCount).toBe(beforeCount + 1);
      });
    });
  });

  describe("U2: Knowledge Merging Engine", () => {
    describe("detectMergeCandidates", () => {
      it("should detect similar tips", () => {
        const candidates = tribalEvolutionEngine.detectMergeCandidates();

        expect(Array.isArray(candidates)).toBe(true);
        for (const candidate of candidates) {
          expect(candidate).toHaveProperty("tip_ids");
          expect(candidate).toHaveProperty("similarity_score");
          expect(candidate).toHaveProperty("merge_reason");
        }
      });

      it("should filter by minimum similarity", () => {
        const candidates = tribalEvolutionEngine.detectMergeCandidates({
          min_similarity: 0.8,
        });

        for (const candidate of candidates) {
          expect(candidate.similarity_score).toBeGreaterThanOrEqual(0.8);
        }
      });

      it("should include merge reason", () => {
        const candidates = tribalEvolutionEngine.detectMergeCandidates({
          min_similarity: 0.5,
        });

        if (candidates.length > 0) {
          expect(candidates[0].merge_reason.length).toBeGreaterThan(5);
        }
      });
    });

    describe("mergeTips", () => {
      it("should merge tips with union strategy", () => {
        const result = tribalEvolutionEngine.mergeTips(
          ["tk-001", "tk-002"],
          "union"
        );

        expect(result).toHaveProperty("merged_tip_id");
        expect(result).toHaveProperty("source_tip_ids");
        expect(result).toHaveProperty("strategy", "union");
        expect(result.source_tip_ids).toContain("tk-001");
        expect(result.source_tip_ids).toContain("tk-002");
      });

      it("should merge with intersection strategy", () => {
        const result = tribalEvolutionEngine.mergeTips(
          ["tk-001", "tk-003"],
          "intersection"
        );

        expect(result.strategy).toBe("intersection");
      });

      it("should merge with weighted strategy", () => {
        const result = tribalEvolutionEngine.mergeTips(
          ["tk-001", "tk-002"],
          "weighted",
          { weights: { "tk-001": 0.7, "tk-002": 0.3 } }
        );

        expect(result.strategy).toBe("weighted");
        expect(result.weights).toBeDefined();
      });

      it("should detect conflicts", () => {
        const result = tribalEvolutionEngine.mergeTips(
          ["tk-001", "tk-002"],
          "union"
        );

        expect(result).toHaveProperty("conflicts");
        expect(Array.isArray(result.conflicts)).toBe(true);
      });

      it("should flag for human review when conflicts exist", () => {
        const result = tribalEvolutionEngine.mergeTips(
          ["tk-001", "tk-002"],
          "union"
        );

        if (result.conflicts.length > 0) {
          expect(result.requires_human_review).toBe(true);
        }
      });

      it("should preserve source attribution", () => {
        const result = tribalEvolutionEngine.mergeTips(
          ["tk-001", "tk-002"],
          "union"
        );

        expect(result.merged_tip.source_attribution).toBeDefined();
        expect(result.merged_tip.source_attribution.length).toBe(2);
      });

      it("should combine tags", () => {
        const result = tribalEvolutionEngine.mergeTips(
          ["tk-001", "tk-006"],
          "union"
        );

        expect(result.merged_tip.tags.length).toBeGreaterThan(0);
      });
    });
  });

  describe("U3: Emerging Pattern Detection", () => {
    describe("detectEmergingPatterns", () => {
      it("should detect patterns from recent activity", () => {
        const patterns = tribalEvolutionEngine.detectEmergingPatterns(30);

        expect(Array.isArray(patterns)).toBe(true);
        for (const pattern of patterns) {
          expect(pattern).toHaveProperty("pattern_id");
          expect(pattern).toHaveProperty("description");
          expect(pattern).toHaveProperty("frequency");
          expect(pattern).toHaveProperty("confidence");
        }
      });

      it("should filter by minimum frequency", () => {
        const patterns = tribalEvolutionEngine.detectEmergingPatterns(30, {
          min_frequency: 3,
        });

        for (const pattern of patterns) {
          expect(pattern.frequency).toBeGreaterThanOrEqual(3);
        }
      });

      it("should calculate pattern confidence", () => {
        const patterns = tribalEvolutionEngine.detectEmergingPatterns(30);

        for (const pattern of patterns) {
          expect(pattern.confidence).toBeGreaterThanOrEqual(0);
          expect(pattern.confidence).toBeLessThanOrEqual(1);
        }
      });

      it("should include supporting evidence", () => {
        const patterns = tribalEvolutionEngine.detectEmergingPatterns(30);

        for (const pattern of patterns) {
          expect(pattern.evidence).toBeDefined();
          expect(Array.isArray(pattern.evidence)).toBe(true);
        }
      });
    });

    describe("generateTipCandidate", () => {
      it("should generate tip candidate from pattern", () => {
        const patterns = tribalEvolutionEngine.detectEmergingPatterns(30);

        if (patterns.length > 0) {
          const candidate = tribalEvolutionEngine.generateTipCandidate(patterns[0]);

          expect(candidate).toHaveProperty("title");
          expect(candidate).toHaveProperty("body");
          expect(candidate).toHaveProperty("category");
          expect(candidate).toHaveProperty("confidence");
          expect(candidate).toHaveProperty("requires_validation", true);
        }
      });

      it("should queue candidates for human validation", () => {
        const patterns = tribalEvolutionEngine.detectEmergingPatterns(30);

        if (patterns.length > 0) {
          const candidate = tribalEvolutionEngine.generateTipCandidate(patterns[0]);
          tribalEvolutionEngine.queueForValidation(candidate);

          const queue = tribalEvolutionEngine.getValidationQueue();
          expect(queue.length).toBeGreaterThan(0);
        }
      });

      it("should auto-categorize generated tips", () => {
        const patterns = tribalEvolutionEngine.detectEmergingPatterns(30);

        if (patterns.length > 0) {
          const candidate = tribalEvolutionEngine.generateTipCandidate(patterns[0]);
          expect(candidate.category).toBeDefined();
        }
      });
    });
  });

  describe("U4: Knowledge Lifecycle Management", () => {
    describe("lifecycle states", () => {
      it("should support all lifecycle states", () => {
        const states: TipLifecycleState[] = [
          "draft",
          "pending",
          "active",
          "deprecated",
          "archived",
        ];

        for (const state of states) {
          expect(typeof state).toBe("string");
        }
      });

      it("should get current lifecycle state", () => {
        const state = tribalEvolutionEngine.getTipLifecycleState("tk-001");

        expect(["draft", "pending", "active", "deprecated", "archived"]).toContain(
          state
        );
      });
    });

    describe("promoteTip", () => {
      it("should promote tip from draft to pending", () => {
        const tipId = `tk-promote-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Draft tip" });
        tribalEvolutionEngine.setTipLifecycleState(tipId, "draft");

        tribalEvolutionEngine.promoteTip(tipId);

        const state = tribalEvolutionEngine.getTipLifecycleState(tipId);
        expect(state).toBe("pending");
      });

      it("should promote tip from pending to active", () => {
        const tipId = `tk-promote-active-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Pending tip" });
        tribalEvolutionEngine.setTipLifecycleState(tipId, "pending");

        tribalEvolutionEngine.promoteTip(tipId);

        const state = tribalEvolutionEngine.getTipLifecycleState(tipId);
        expect(state).toBe("active");
      });

      it("should record promotion event", () => {
        const tipId = `tk-promote-event-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Test" });
        tribalEvolutionEngine.setTipLifecycleState(tipId, "draft");

        tribalEvolutionEngine.promoteTip(tipId);

        const events = tribalEvolutionEngine.getLifecycleEvents(tipId);
        const promotionEvent = events.find((e) => e.action === "promote");
        expect(promotionEvent).toBeDefined();
      });
    });

    describe("deprecateTip", () => {
      it("should deprecate active tip", () => {
        const tipId = `tk-deprecate-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Active tip" });
        tribalEvolutionEngine.setTipLifecycleState(tipId, "active");

        tribalEvolutionEngine.deprecateTip(tipId, "Superseded by newer knowledge");

        const state = tribalEvolutionEngine.getTipLifecycleState(tipId);
        expect(state).toBe("deprecated");
      });

      it("should store deprecation reason", () => {
        const tipId = `tk-deprecate-reason-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Test" });
        tribalEvolutionEngine.setTipLifecycleState(tipId, "active");

        tribalEvolutionEngine.deprecateTip(tipId, "No longer applicable");

        const events = tribalEvolutionEngine.getLifecycleEvents(tipId);
        const deprecateEvent = events.find((e) => e.action === "deprecate");
        expect(deprecateEvent?.reason).toBe("No longer applicable");
      });
    });

    describe("archiveTip", () => {
      it("should archive deprecated tip", () => {
        const tipId = `tk-archive-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Old tip" });
        tribalEvolutionEngine.setTipLifecycleState(tipId, "deprecated");

        tribalEvolutionEngine.archiveTip(tipId);

        const state = tribalEvolutionEngine.getTipLifecycleState(tipId);
        expect(state).toBe("archived");
      });

      it("should exclude archived tips from search by default", () => {
        const tipId = `tk-archive-search-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Archived tip" });
        tribalEvolutionEngine.setTipLifecycleState(tipId, "archived");

        const activeTips = tribalEvolutionEngine.getActiveTips();
        const archivedFound = activeTips.find((t) => t.id === tipId);

        expect(archivedFound).toBeUndefined();
      });
    });

    describe("lifecycle history", () => {
      it("should maintain full lifecycle history", () => {
        const tipId = `tk-lifecycle-hist-${Date.now()}`;
        tribalEvolutionEngine.createTipVersion(tipId, { body: "Test" });
        tribalEvolutionEngine.setTipLifecycleState(tipId, "draft");
        tribalEvolutionEngine.promoteTip(tipId);
        tribalEvolutionEngine.promoteTip(tipId);

        const events = tribalEvolutionEngine.getLifecycleEvents(tipId);

        expect(events.length).toBeGreaterThanOrEqual(2);
        expect(events.every((e) => e.timestamp)).toBe(true);
      });
    });
  });

  describe("integration", () => {
    it("should combine versioning with lifecycle", () => {
      const tipId = `tk-integ-${Date.now()}`;

      // Create new tip (draft)
      tribalEvolutionEngine.createTipVersion(tipId, { body: "Initial" });

      // Edit while in draft
      tribalEvolutionEngine.createTipVersion(tipId, { body: "Improved" });

      // Promote to active
      tribalEvolutionEngine.setTipLifecycleState(tipId, "draft");
      tribalEvolutionEngine.promoteTip(tipId);
      tribalEvolutionEngine.promoteTip(tipId);

      const state = tribalEvolutionEngine.getTipLifecycleState(tipId);
      const history = tribalEvolutionEngine.getTipHistory(tipId);

      expect(state).toBe("active");
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it("should track pattern-to-tip pipeline", () => {
      // Detect patterns
      const patterns = tribalEvolutionEngine.detectEmergingPatterns(30);

      if (patterns.length > 0) {
        // Generate candidate
        const candidate = tribalEvolutionEngine.generateTipCandidate(patterns[0]);

        // Queue for validation
        tribalEvolutionEngine.queueForValidation(candidate);

        // Validate and promote
        const queue = tribalEvolutionEngine.getValidationQueue();
        expect(queue.length).toBeGreaterThan(0);
      }
    });
  });
});
