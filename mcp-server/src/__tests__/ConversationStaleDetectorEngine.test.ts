/**
 * ConversationStaleDetectorEngine tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ConversationStaleDetectorEngine } from "../engines/ConversationStaleDetectorEngine.js";
import { existsSync, rmSync } from "node:fs";

describe("ConversationStaleDetectorEngine", () => {
  let engine: ConversationStaleDetectorEngine;
  const stateDir = "H:/prism/state/conversation-stale-detector";

  process.env.CLAUDE_SESSION_ID = "test-stale-detector";

  beforeEach(() => {
    const stateFile = `${stateDir}/segments-test-stale-detector.json`;
    if (existsSync(stateFile)) {
      rmSync(stateFile);
    }
    engine = new ConversationStaleDetectorEngine();
  });

  describe("recordSegment", () => {
    it("records segment with auto-generated ID and topic extraction", () => {
      const seg = engine.recordSegment(
        "user_message",
        "Please fix the bug in src/engines/MyEngine.ts at line 42"
      );
      expect(seg.id).toMatch(/^seg_/);
      expect(seg.topics).toContain("src/engines/MyEngine.ts");
      expect(seg.tokens).toBeGreaterThan(0);
    });

    it("extracts task IDs from text", () => {
      const seg = engine.recordSegment("user_message", "Working on U-CADC42 right now");
      expect(seg.topics).toContain("U-CADC42");
    });

    it("extracts error codes", () => {
      const seg = engine.recordSegment("tool_result", "Got error E0042 and ERR_NETWORK");
      expect(seg.topics.some((t) => /E0042|ERR_NETWORK/.test(t))).toBe(true);
    });
  });

  describe("prune - drop signals", () => {
    it("flags resolved errors as droppable", () => {
      const errorSeg = engine.recordSegment("tool_result", "Error: TypeError occurred", {
        status: "open",
      });
      engine.markStatus(errorSeg.id, "resolved");
      const report = engine.prune();
      const decision = report.droppable.find((d) => d.segmentId === errorSeg.id);
      expect(decision).toBeTruthy();
      expect(decision!.dropReasons).toContain("resolved_error");
    });

    it("flags completed tasks as droppable", () => {
      const seg = engine.recordSegment("assistant_response", "Task completed ✓ all tests pass");
      const report = engine.prune();
      const decision = report.droppable.find((d) => d.segmentId === seg.id);
      expect(decision).toBeTruthy();
    });

    it("flags failed exploration as droppable", () => {
      const seg = engine.recordSegment("tool_result", "No matches found for that pattern");
      const report = engine.prune();
      const decision = report.droppable.find((d) => d.segmentId === seg.id);
      expect(decision).toBeTruthy();
      expect(decision!.dropReasons).toContain("failed_exploration");
    });

    it("flags duplicate attempts as droppable", () => {
      // Three identical-topic segments
      engine.recordSegment("tool_call", "Searching for pattern in src/engines/Foo.ts");
      engine.recordSegment("tool_call", "Searching for pattern in src/engines/Foo.ts");
      engine.recordSegment("tool_call", "Searching for pattern in src/engines/Foo.ts");
      const report = engine.prune();
      const dups = report.droppable.filter((d) => d.dropReasons.includes("duplicate_attempt"));
      expect(dups.length).toBeGreaterThan(0);
    });

    it("flags abandoned plans as droppable", () => {
      const seg = engine.recordSegment("assistant_response", "Original plan", {
        status: "abandoned",
      });
      const report = engine.prune();
      const decision = report.droppable.find((d) => d.segmentId === seg.id);
      expect(decision!.dropReasons).toContain("abandoned_plan");
    });
  });

  describe("prune - keep signals override drop", () => {
    it("does NOT drop canonical references even if marked completed", () => {
      const seg = engine.recordSegment(
        "user_message",
        "Decision made: NEVER inline kc1.1 constants. This is MANDATORY."
      );
      const report = engine.prune();
      const decision = report.droppable.find((d) => d.segmentId === seg.id);
      expect(decision).toBeUndefined();
    });

    it("does NOT drop user preferences", () => {
      const seg = engine.recordSegment(
        "user_message",
        "User prefers terse responses with no trailing summary"
      );
      const report = engine.prune();
      const decision = report.droppable.find((d) => d.segmentId === seg.id);
      expect(decision).toBeUndefined();
    });

    it("keeps segments referenced by recent messages", () => {
      // Segment about Foo
      const seg = engine.recordSegment("tool_result", "No matches found for src/engines/Foo.ts");
      // Recent reference
      engine.recordSegment("user_message", "Try grep again on src/engines/Foo.ts");
      const report = engine.prune();
      const decision = report.droppable.find((d) => d.segmentId === seg.id);
      // Should be protected because Foo.ts is referenced recently
      expect(decision?.drop ?? false).toBe(false);
    });

    it("keeps segments with status=open", () => {
      const seg = engine.recordSegment("tool_call", "Some operation in progress", {
        status: "open",
      });
      const report = engine.prune();
      const decision = report.droppable.find((d) => d.segmentId === seg.id);
      expect(decision).toBeUndefined();
    });
  });

  describe("prune - report metrics", () => {
    it("returns empty report for fresh engine", () => {
      const report = engine.prune();
      expect(report.totalSegments).toBe(0);
      expect(report.droppable).toEqual([]);
      expect(report.estimatedTokensSaved).toBe(0);
    });

    it("calculates retention rate correctly", () => {
      engine.recordSegment("tool_result", "x".repeat(400)); // 100 tokens
      engine.recordSegment("tool_result", "No matches found"); // droppable
      const report = engine.prune();
      expect(report.totalTokens).toBeGreaterThan(0);
      expect(report.estimatedRetentionRate).toBeGreaterThan(0);
      expect(report.estimatedRetentionRate).toBeLessThanOrEqual(1);
    });

    it("recommends savings when threshold met", () => {
      // Add many failed explorations - keyword must be in first 200 chars (the summary)
      for (let i = 0; i < 8; i++) {
        engine.recordSegment(
          "tool_result",
          `No matches found for item-${i}: ${"x".repeat(2000)}`
        );
      }
      const report = engine.prune();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("warns when no stale segments found in long conversation", () => {
      // Real keep-content (canonical references)
      for (let i = 0; i < 12; i++) {
        engine.recordSegment(
          "user_message",
          `Decision: chose option ${i} canonical reference MUST follow`
        );
      }
      const report = engine.prune();
      expect(report.recommendations.some((r) => /lossy|no clearly stale/i.test(r))).toBe(true);
    });
  });

  describe("markStatus", () => {
    it("updates segment status", () => {
      const seg = engine.recordSegment("tool_call", "Some action");
      const ok = engine.markStatus(seg.id, "completed");
      expect(ok).toBe(true);
      const updated = engine.getSegments().find((s) => s.id === seg.id);
      expect(updated?.status).toBe("completed");
    });

    it("returns false for unknown segment ID", () => {
      const ok = engine.markStatus("nonexistent", "completed");
      expect(ok).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty text", () => {
      const seg = engine.recordSegment("user_message", "");
      expect(seg.tokens).toBe(0);
      expect(seg.topics).toEqual([]);
    });

    it("handles very long text", () => {
      const text = "x".repeat(10000);
      const seg = engine.recordSegment("user_message", text);
      expect(seg.tokens).toBe(2500);
      // summary is truncated
      expect(seg.summary.length).toBeLessThanOrEqual(200);
    });

    it("handles unicode and special chars", () => {
      const seg = engine.recordSegment("user_message", "Use 你好.ts file with ÑOÑO encoding");
      expect(seg.id).toMatch(/^seg_/);
    });

    it("prunes segments beyond MAX_SEGMENTS limit", () => {
      for (let i = 0; i < 600; i++) {
        engine.recordSegment("tool_result", `Item ${i}`);
      }
      expect(engine.getSegments().length).toBeLessThanOrEqual(500);
    });

    it("persists across instances", () => {
      engine.recordSegment("user_message", "Important content for testing persistence");
      const engine2 = new ConversationStaleDetectorEngine();
      expect(engine2.getSegments().length).toBe(1);
    });

    it("reset clears state", () => {
      engine.recordSegment("user_message", "test");
      engine.recordSegment("user_message", "test2");
      engine.reset();
      expect(engine.getSegments().length).toBe(0);
    });
  });
});
