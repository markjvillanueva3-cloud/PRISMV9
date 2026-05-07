/**
 * OutputCacheEngine tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { OutputCacheEngine, type BlockCategory } from "../engines/OutputCacheEngine.js";
import { existsSync, rmSync } from "node:fs";

describe("OutputCacheEngine", () => {
  let engine: OutputCacheEngine;
  const stateFile = "H:/prism/state/output-cache.json";

  beforeEach(() => {
    if (existsSync(stateFile)) {
      rmSync(stateFile);
    }
    engine = new OutputCacheEngine();
  });

  describe("store", () => {
    it("stores content and returns block with hash", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      const block = engine.store(content);

      expect(block).not.toBeNull();
      expect(block!.hash).toHaveLength(16);
      expect(block!.content).toBe(content);
      expect(block!.usageCount).toBe(1);
    });

    it("rejects content that is too short", () => {
      const block = engine.store("Too short");
      expect(block).toBeNull();
    });

    it("rejects content that is too long", () => {
      const block = engine.store("x".repeat(6000));
      expect(block).toBeNull();
    });

    it("increments usage count on duplicate store", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      engine.store(content);
      const block = engine.store(content);

      expect(block!.usageCount).toBe(2);
    });

    it("auto-detects category from content", () => {
      const summaryContent = "## Summary\nThis is a completed task summary with details.";
      const block = engine.store(summaryContent);
      expect(block!.category).toBe("summary");
    });

    it("detects code_pattern category", () => {
      const codeContent = "```typescript\nfunction example() {\n  return 42;\n}\n```";
      const block = engine.store(codeContent);
      expect(block!.category).toBe("code_pattern");
    });

    it("detects error_response category", () => {
      const errorContent = "Error: The operation failed because the file was not found in the expected location.";
      const block = engine.store(errorContent);
      expect(block!.category).toBe("error_response");
    });

    it("allows explicit category override", () => {
      const content = "This is generic content that could be anything at all really.";
      const block = engine.store(content, "commit_message");
      expect(block!.category).toBe("commit_message");
    });

    it("estimates tokens correctly", () => {
      const content = "x".repeat(100); // 100 chars ≈ 25 tokens
      const block = engine.store(content);
      expect(block!.tokens).toBe(25);
    });
  });

  describe("get", () => {
    it("retrieves block by hash", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      const stored = engine.store(content);
      const retrieved = engine.get(stored!.hash);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.content).toBe(content);
    });

    it("retrieves block by ID", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      const stored = engine.store(content);
      const retrieved = engine.get(stored!.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.content).toBe(content);
    });

    it("returns null for non-existent block", () => {
      const retrieved = engine.get("nonexistent");
      expect(retrieved).toBeNull();
    });

    it("increments usage count on retrieval", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      const stored = engine.store(content);
      engine.get(stored!.hash);
      const retrieved = engine.get(stored!.hash);

      expect(retrieved!.usageCount).toBe(3); // 1 store + 2 gets
    });

    it("tracks hit statistics", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      const stored = engine.store(content);
      engine.get(stored!.hash);
      engine.get(stored!.hash);
      engine.get("nonexistent");

      const stats = engine.getStats();
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    });
  });

  describe("find", () => {
    beforeEach(() => {
      engine.store("Summary: Task completed successfully with all tests passing.", "summary");
      engine.store("Error: Failed to connect to the database server.", "error_response");
      engine.store("```typescript\nconst x = 1;\n```", "code_pattern");
      engine.store("Another summary of completed work for the session.", "summary");
    });

    it("filters by category", () => {
      const summaries = engine.find({ category: "summary" });
      expect(summaries.length).toBe(2);
      summaries.forEach((b) => expect(b.category).toBe("summary"));
    });

    it("respects limit", () => {
      const results = engine.find({ limit: 1 });
      expect(results.length).toBe(1);
    });

    it("sorts by usage count", () => {
      const content = "Summary: Task completed successfully with all tests passing.";
      // Access multiple times to increase usage
      const block = engine.find({ category: "summary" })[0];
      engine.get(block.hash);
      engine.get(block.hash);

      const results = engine.find({ category: "summary" });
      expect(results[0].usageCount).toBeGreaterThanOrEqual(results[1].usageCount);
    });
  });

  describe("getReference and expandReference", () => {
    it("generates reference string", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      const block = engine.store(content);
      const ref = engine.getReference(block!);

      expect(ref).toMatch(/\[CACHED:blk_[a-f0-9]+\]/);
    });

    it("expands reference back to content", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      const block = engine.store(content);
      const ref = engine.getReference(block!);
      const expanded = engine.expandReference(ref);

      expect(expanded).toBe(content);
    });

    it("returns null for invalid reference", () => {
      const expanded = engine.expandReference("[INVALID:xyz]");
      expect(expanded).toBeNull();
    });

    it("returns null for non-existent block reference", () => {
      const expanded = engine.expandReference("[CACHED:blk_00000000]");
      expect(expanded).toBeNull();
    });
  });

  describe("getStats", () => {
    it("returns zero stats for fresh engine", () => {
      const stats = engine.getStats();

      expect(stats.totalBlocks).toBe(0);
      expect(stats.totalTokensCached).toBe(0);
      expect(stats.totalTokensSaved).toBe(0);
    });

    it("calculates tokens saved on hits", () => {
      const content = "This is a test summary that is long enough to be cached. ".repeat(3);
      const block = engine.store(content);
      engine.get(block!.hash);
      engine.get(block!.hash);

      const stats = engine.getStats();
      expect(stats.totalTokensSaved).toBe(block!.tokens * 2);
    });

    it("tracks category distribution", () => {
      engine.store("Summary one: Task completed successfully with all the details needed here.", "summary");
      engine.store("Summary two: Another task done with enough content to be cached.", "summary");
      engine.store("Error: Something went wrong here and this is the full error message.", "error_response");

      const stats = engine.getStats();
      expect(stats.topCategories[0].category).toBe("summary");
      expect(stats.topCategories[0].count).toBe(2);
    });
  });

  describe("reset", () => {
    it("clears all blocks and stats", () => {
      engine.store("This is a test summary that is long enough to be cached for future reuse.");
      engine.reset();

      const stats = engine.getStats();
      expect(stats.totalBlocks).toBe(0);
      expect(stats.totalTokensSaved).toBe(0);
    });
  });

  describe("persistence", () => {
    it("persists blocks across engine instances", () => {
      const content = "This is a test summary that is long enough to be cached for future reuse.";
      engine.store(content);

      const engine2 = new OutputCacheEngine();
      const stats = engine2.getStats();
      expect(stats.totalBlocks).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const block = engine.store("");
      expect(block).toBeNull();
    });

    it("handles content at exact minimum length", () => {
      const content = "x".repeat(50);
      const block = engine.store(content);
      expect(block).not.toBeNull();
    });

    it("handles content at exact maximum length", () => {
      const content = "x".repeat(5000);
      const block = engine.store(content);
      expect(block).not.toBeNull();
    });

    it("handles unicode content", () => {
      const content = "这是一个足够长的测试摘要，需要被缓存以供将来重用。日本語テスト。한국어 테스트。This needs to be long enough.";
      const block = engine.store(content);
      expect(block).not.toBeNull();
      expect(block!.content).toBe(content);
    });

    it("handles special characters", () => {
      const content = "Test with special chars: <>&\"'`${}[]()!@#%^*+=|\\;:?,./~";
      const block = engine.store(content);
      expect(block).not.toBeNull();
    });
  });
});
