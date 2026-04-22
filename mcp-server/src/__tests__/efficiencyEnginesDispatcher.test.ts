/**
 * Dispatcher round-trip tests for the 3 efficiency engines.
 * Verifies that ACTION enum, schemas, and lazy imports all align.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

describe("Efficiency engines — dispatcher wiring", () => {
  process.env.CLAUDE_SESSION_ID = "test-efficiency-dispatcher";

  beforeEach(() => {
    for (const file of [
      "H:/prism/state/tool-call-parallelization/parallelization-test-efficiency-dispatcher.json",
      "H:/prism/state/file-read-dedup/dedup-test-efficiency-dispatcher.json",
      "H:/prism/state/conversation-stale-detector/segments-test-efficiency-dispatcher.json",
    ]) {
      if (existsSync(file)) rmSync(file);
    }
  });

  describe("schema coverage", () => {
    it("declares schemas for all 9 new actions", () => {
      const expected = [
        "tool_call_record",
        "tool_call_analyze",
        "tool_call_reset",
        "file_read_record",
        "file_read_should_skip",
        "file_read_report",
        "stale_segment_record",
        "stale_segment_prune",
        "stale_segment_mark",
      ];
      for (const action of expected) {
        expect(ACTION_DEV_SCHEMAS[action], `schema missing: ${action}`).toBeTruthy();
      }
    });

    it("validates tool_call_record params", () => {
      const schema = ACTION_DEV_SCHEMAS.tool_call_record;
      const ok = schema.safeParse({ tool: "Read", inputs: { file_path: "/a.ts" } });
      expect(ok.success).toBe(true);
      const bad = schema.safeParse({ inputs: { file_path: "/a.ts" } }); // missing tool
      expect(bad.success).toBe(false);
    });

    it("validates stale_segment_record enum", () => {
      const schema = ACTION_DEV_SCHEMAS.stale_segment_record;
      const ok = schema.safeParse({ type: "user_message", text: "hi" });
      expect(ok.success).toBe(true);
      const bad = schema.safeParse({ type: "INVALID_TYPE", text: "hi" });
      expect(bad.success).toBe(false);
    });
  });

  describe("ToolCallParallelizationEngine via dispatcher path", () => {
    it("records and analyzes through the same lazy-import path", async () => {
      const { toolCallParallelizationEngine } = await import(
        "../engines/ToolCallParallelizationEngine.js"
      );
      toolCallParallelizationEngine.reset();
      toolCallParallelizationEngine.recordCall("Read", { file_path: "/a.ts" });
      toolCallParallelizationEngine.recordCall("Read", { file_path: "/b.ts" });
      toolCallParallelizationEngine.recordCall("Read", { file_path: "/c.ts" });
      const report = toolCallParallelizationEngine.analyze();
      expect(report.totalCalls).toBe(3);
      expect(report.opportunities.length).toBeGreaterThan(0);
    });
  });

  describe("FileReadDeduplicationEngine via dispatcher path", () => {
    it("detects redundant read through lazy import", async () => {
      const { fileReadDeduplicationEngine } = await import(
        "../engines/FileReadDeduplicationEngine.js"
      );
      fileReadDeduplicationEngine.reset();
      const r1 = fileReadDeduplicationEngine.recordRead("/a.ts", "hello", { mtimeMs: 1 });
      expect(r1.redundant).toBeNull();
      const r2 = fileReadDeduplicationEngine.recordRead("/a.ts", "hello", { mtimeMs: 1 });
      expect(r2.redundant).not.toBeNull();
      const report = fileReadDeduplicationEngine.report();
      expect(report.redundantReads).toBe(1);
    });

    it("shouldSkip returns true after prior full read", async () => {
      const { fileReadDeduplicationEngine } = await import(
        "../engines/FileReadDeduplicationEngine.js"
      );
      fileReadDeduplicationEngine.reset();
      fileReadDeduplicationEngine.recordRead("/a.ts", "hello", { mtimeMs: 1 });
      const decision = fileReadDeduplicationEngine.shouldSkip("/a.ts", { currentMtimeMs: 1 });
      expect(decision.skip).toBe(true);
    });
  });

  describe("ConversationStaleDetectorEngine via dispatcher path", () => {
    it("records segments and prunes through lazy import", async () => {
      const { conversationStaleDetectorEngine } = await import(
        "../engines/ConversationStaleDetectorEngine.js"
      );
      conversationStaleDetectorEngine.reset();
      conversationStaleDetectorEngine.recordSegment(
        "tool_result",
        "No matches found for the requested pattern"
      );
      const report = conversationStaleDetectorEngine.prune();
      expect(report.totalSegments).toBe(1);
      expect(report.droppable.length).toBe(1);
    });

    it("markStatus updates segment", async () => {
      const { conversationStaleDetectorEngine } = await import(
        "../engines/ConversationStaleDetectorEngine.js"
      );
      conversationStaleDetectorEngine.reset();
      const seg = conversationStaleDetectorEngine.recordSegment("user_message", "test content");
      const ok = conversationStaleDetectorEngine.markStatus(seg.id, "completed");
      expect(ok).toBe(true);
    });
  });

  describe("cross-engine integration", () => {
    it("all 3 engines record state independently in same session", async () => {
      const { toolCallParallelizationEngine } = await import(
        "../engines/ToolCallParallelizationEngine.js"
      );
      const { fileReadDeduplicationEngine } = await import(
        "../engines/FileReadDeduplicationEngine.js"
      );
      const { conversationStaleDetectorEngine } = await import(
        "../engines/ConversationStaleDetectorEngine.js"
      );
      toolCallParallelizationEngine.reset();
      fileReadDeduplicationEngine.reset();
      conversationStaleDetectorEngine.reset();

      toolCallParallelizationEngine.recordCall("Read", { file_path: "/x.ts" });
      fileReadDeduplicationEngine.recordRead("/x.ts", "content", { mtimeMs: 1 });
      conversationStaleDetectorEngine.recordSegment("tool_call", "Reading /x.ts");

      expect(toolCallParallelizationEngine.getCalls().length).toBe(1);
      expect(fileReadDeduplicationEngine.getReads().length).toBe(1);
      expect(conversationStaleDetectorEngine.getSegments().length).toBe(1);
    });
  });
});
