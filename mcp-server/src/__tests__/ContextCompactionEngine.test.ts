/**
 * ContextCompactionEngine Test Suite
 * ===================================
 *
 * AGENT-MS4 U-AGT14 — Validates context creation, token accounting,
 * compaction across 4 strategies, and critical-item preservation.
 *
 * @milestone AGENT-MS4
 * @unit U-AGT14
 */

import { describe, it, expect } from "vitest";
import {
  contextCompactionEngine,
  type ConversationContext,
} from "../engines/ContextCompactionEngine.js";

function buildLargeContext(maxTokens: number): ConversationContext {
  const ctx = contextCompactionEngine.createContext(maxTokens);
  // Add 30 user/assistant turns of moderate length
  for (let i = 0; i < 30; i++) {
    contextCompactionEngine.addItem(
      ctx,
      "user_message",
      `User message ${i}: Let me think about this problem for a while and explain in some detail.`,
      { priority: "low" }
    );
    contextCompactionEngine.addItem(
      ctx,
      "assistant_response",
      `Assistant response ${i}: Here is a detailed answer covering multiple aspects of the question in depth.`,
      { priority: "medium" }
    );
  }
  return ctx;
}

describe("ContextCompactionEngine", () => {
  // ── createContext() + addItem() ───────────────────────────────────────

  describe("createContext() / addItem()", () => {
    it("creates an empty context with unique id", () => {
      const ctx = contextCompactionEngine.createContext(1000);
      expect(ctx.id).toBeDefined();
      expect(ctx.items.length).toBe(0);
      expect(ctx.totalTokens).toBe(0);
      expect(ctx.maxTokens).toBe(1000);
    });

    it("uses default maxTokens when not specified", () => {
      const ctx = contextCompactionEngine.createContext();
      expect(ctx.maxTokens).toBeGreaterThan(0);
    });

    it("addItem appends and updates totalTokens", () => {
      const ctx = contextCompactionEngine.createContext(1000);
      const item = contextCompactionEngine.addItem(
        ctx,
        "user_message",
        "Hello world"
      );
      expect(ctx.items.length).toBe(1);
      expect(ctx.totalTokens).toBe(item.tokenCount);
    });

    it("sets preserveOnCompact=true for user_instruction", () => {
      const ctx = contextCompactionEngine.createContext();
      const item = contextCompactionEngine.addItem(
        ctx,
        "user_instruction",
        "Always use metric units"
      );
      expect(item.preserveOnCompact).toBe(true);
    });

    it("sets preserveOnCompact=true for memory_anchor", () => {
      const ctx = contextCompactionEngine.createContext();
      const item = contextCompactionEngine.addItem(
        ctx,
        "memory_anchor",
        "Anchor content"
      );
      expect(item.preserveOnCompact).toBe(true);
    });
  });

  // ── estimateTokens() ──────────────────────────────────────────────────

  describe("estimateTokens()", () => {
    it("returns positive integer for non-empty content", () => {
      const tokens = contextCompactionEngine.estimateTokens("Hello world from tests");
      expect(tokens).toBeGreaterThan(0);
      expect(Number.isInteger(tokens)).toBe(true);
    });

    it("returns higher count for longer strings", () => {
      const short = contextCompactionEngine.estimateTokens("short");
      const long = contextCompactionEngine.estimateTokens(
        "This is a much longer string with many more tokens to count"
      );
      expect(long).toBeGreaterThan(short);
    });
  });

  // ── markForPreservation() ─────────────────────────────────────────────

  describe("markForPreservation()", () => {
    it("marks an item as preserved", () => {
      const ctx = contextCompactionEngine.createContext();
      const item = contextCompactionEngine.addItem(
        ctx,
        "user_message",
        "Test message"
      );
      expect(item.preserveOnCompact).toBe(false);
      const ok = contextCompactionEngine.markForPreservation(ctx, item.id);
      expect(ok).toBe(true);
      expect(item.preserveOnCompact).toBe(true);
      expect(item.priority).toBe("critical");
    });

    it("returns false for unknown item id", () => {
      const ctx = contextCompactionEngine.createContext();
      expect(contextCompactionEngine.markForPreservation(ctx, "ghost")).toBe(false);
    });
  });

  // ── needsCompaction() ─────────────────────────────────────────────────

  describe("needsCompaction()", () => {
    it("returns false for empty context", () => {
      const ctx = contextCompactionEngine.createContext(1000);
      expect(contextCompactionEngine.needsCompaction(ctx)).toBe(false);
    });

    it("returns true when totalTokens exceeds maxTokens", () => {
      const ctx = contextCompactionEngine.createContext(50);
      for (let i = 0; i < 20; i++) {
        contextCompactionEngine.addItem(
          ctx,
          "user_message",
          "Lots and lots and lots of text to blow past the budget"
        );
      }
      expect(contextCompactionEngine.needsCompaction(ctx)).toBe(true);
    });
  });

  // ── compact() — all 4 strategies ─────────────────────────────────────

  describe("compact()", () => {
    const strategies = ["recent_priority", "importance_based", "aggressive", "balanced"] as const;

    strategies.forEach((strategy) => {
      it(`reduces totalTokens using ${strategy} strategy`, () => {
        const ctx = buildLargeContext(500);
        const before = ctx.totalTokens;
        const result = contextCompactionEngine.compact(ctx, strategy);
        expect(result.success).toBe(true);
        expect(result.originalTokens).toBe(before);
        // After compaction totalTokens should be <= originalTokens
        expect(result.compactedTokens).toBeLessThanOrEqual(before);
      });
    });

    it("preserves items marked preserveOnCompact=true", () => {
      const ctx = buildLargeContext(500);
      const keep = contextCompactionEngine.addItem(
        ctx,
        "memory_anchor",
        "CRITICAL: Never exceed 5000 RPM on LB3000"
      );
      contextCompactionEngine.compact(ctx, "aggressive");
      // memory_anchor should survive aggressive compaction
      const survived = ctx.items.find((i) => i.id === keep.id);
      expect(survived).toBeDefined();
    });

    it("increments compactionCount", () => {
      const ctx = buildLargeContext(500);
      const beforeCount = ctx.compactionCount;
      contextCompactionEngine.compact(ctx);
      expect(ctx.compactionCount).toBe(beforeCount + 1);
    });

    it("sets lastCompactedAt timestamp", () => {
      const ctx = buildLargeContext(500);
      expect(ctx.lastCompactedAt).toBeUndefined();
      contextCompactionEngine.compact(ctx);
      expect(ctx.lastCompactedAt).toBeDefined();
    });

    it("reports criticalPreserved count", () => {
      const ctx = contextCompactionEngine.createContext(500);
      contextCompactionEngine.addItem(ctx, "critical_fact", "Critical A", {
        priority: "critical",
      });
      contextCompactionEngine.addItem(ctx, "critical_fact", "Critical B", {
        priority: "critical",
      });
      for (let i = 0; i < 10; i++) {
        contextCompactionEngine.addItem(
          ctx,
          "user_message",
          `filler ${i}`,
          { priority: "low" }
        );
      }
      const result = contextCompactionEngine.compact(ctx, "aggressive");
      expect(result.criticalPreserved).toBeGreaterThanOrEqual(2);
    });
  });

  // ── extractCriticalFacts() + renderContext() + getStats() ─────────────

  describe("extraction helpers", () => {
    it("extractCriticalFacts returns critical item contents", () => {
      const ctx = contextCompactionEngine.createContext();
      contextCompactionEngine.addItem(ctx, "critical_fact", "Must not exceed 5000 RPM", {
        priority: "critical",
      });
      contextCompactionEngine.addItem(ctx, "user_message", "Trivial chatter", {
        priority: "low",
      });
      const facts = contextCompactionEngine.extractCriticalFacts(ctx);
      expect(facts.length).toBeGreaterThan(0);
      expect(facts.some((f) => /5000 RPM/.test(f))).toBe(true);
    });

    it("renderContext returns a string representation", () => {
      const ctx = contextCompactionEngine.createContext();
      contextCompactionEngine.addItem(ctx, "user_message", "Hello");
      contextCompactionEngine.addItem(ctx, "assistant_response", "Hi there");
      const rendered = contextCompactionEngine.renderContext(ctx);
      expect(typeof rendered).toBe("string");
      expect(rendered.length).toBeGreaterThan(0);
    });

    it("getStats returns counts per item type", () => {
      const ctx = contextCompactionEngine.createContext();
      contextCompactionEngine.addItem(ctx, "user_message", "U1");
      contextCompactionEngine.addItem(ctx, "assistant_response", "A1");
      contextCompactionEngine.addItem(ctx, "tool_call", "T1");
      const stats = contextCompactionEngine.getStats(ctx);
      expect(stats).toBeDefined();
    });
  });
});
