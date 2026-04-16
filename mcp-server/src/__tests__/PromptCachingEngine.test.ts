/**
 * PromptCachingEngine Test Suite
 * ================================
 *
 * AGENT-MS5 U-AGT19 — Validates cache_control marker wrapping, stats
 * tracking, and break-even analysis for Anthropic prompt caching.
 *
 * @milestone AGENT-MS5
 * @unit U-AGT19
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  promptCachingEngine,
  ANTHROPIC_MAX_CACHE_BREAKPOINTS,
  DEFAULT_MIN_CACHE_CHARS,
} from "../engines/PromptCachingEngine.js";

beforeEach(() => {
  promptCachingEngine.resetStats();
});

describe("PromptCachingEngine", () => {
  // ── Constants ────────────────────────────────────────────────────────

  describe("constants", () => {
    it("exports Anthropic's 4-breakpoint limit", () => {
      expect(ANTHROPIC_MAX_CACHE_BREAKPOINTS).toBe(4);
    });

    it("exports a non-trivial minimum cache char threshold", () => {
      expect(DEFAULT_MIN_CACHE_CHARS).toBeGreaterThanOrEqual(1024);
    });
  });

  // ── buildCachedSystem() ──────────────────────────────────────────────

  describe("buildCachedSystem()", () => {
    it("returns system blocks matching the Anthropic SDK shape", () => {
      const result = promptCachingEngine.buildCachedSystem({
        stable: ["a".repeat(5000)],
      });
      expect(result.system.length).toBe(1);
      expect(result.system[0]!.type).toBe("text");
      expect(result.system[0]!.cache_control?.type).toBe("ephemeral");
    });

    it("does NOT cache blocks smaller than minCacheChars", () => {
      const result = promptCachingEngine.buildCachedSystem({
        stable: ["small block"],
      });
      expect(result.system[0]!.cache_control).toBeUndefined();
      expect(result.cache_breakpoints).toBe(0);
    });

    it("caches large blocks up to maxBreakpoints", () => {
      const big = "a".repeat(5000);
      const result = promptCachingEngine.buildCachedSystem({
        stable: [big, big, big, big, big, big], // 6 big blocks
      });
      // Only 4 should get cache_control markers
      expect(result.cache_breakpoints).toBe(4);
      const markedCount = result.system.filter((b) => b.cache_control).length;
      expect(markedCount).toBe(4);
    });

    it("respects custom maxBreakpoints override", () => {
      const big = "a".repeat(5000);
      const result = promptCachingEngine.buildCachedSystem(
        { stable: [big, big, big] },
        { maxBreakpoints: 1 }
      );
      expect(result.cache_breakpoints).toBe(1);
    });

    it("respects custom minCacheChars override", () => {
      const result = promptCachingEngine.buildCachedSystem(
        { stable: ["this is ten or more", "this is also over ten"] },
        { minCacheChars: 10 }
      );
      // Both blocks exceed 10 chars, both should get cached
      expect(result.cache_breakpoints).toBe(2);
    });

    it("appends volatile blocks without cache_control", () => {
      const result = promptCachingEngine.buildCachedSystem({
        stable: ["a".repeat(5000)],
        volatile: ["recent memory snippet"],
      });
      expect(result.system.length).toBe(2);
      expect(result.system[1]!.cache_control).toBeUndefined();
    });

    it("filters empty strings from stable list", () => {
      const result = promptCachingEngine.buildCachedSystem({
        stable: ["", "a".repeat(5000), ""],
      });
      expect(result.system.length).toBe(1);
    });

    it("filters empty strings from volatile list", () => {
      const result = promptCachingEngine.buildCachedSystem({
        stable: ["a".repeat(5000)],
        volatile: ["", "something", ""],
      });
      expect(result.system.length).toBe(2);
      expect(result.system[1]!.text).toBe("something");
    });

    it("reports total chars and token estimate", () => {
      const result = promptCachingEngine.buildCachedSystem({
        stable: ["a".repeat(4000)],
      });
      expect(result.total_chars).toBe(4000);
      expect(result.token_estimate).toBe(1000);
    });

    it("sorts stable blocks largest-first for caching priority", () => {
      const small = "b".repeat(100);
      const big = "a".repeat(5000);
      const result = promptCachingEngine.buildCachedSystem({
        stable: [small, big],
      });
      // The large block should be first AND marked
      expect(result.system[0]!.text).toBe(big);
      expect(result.system[0]!.cache_control).toBeDefined();
    });

    it("stays within Anthropic breakpoint limit", () => {
      const big = "x".repeat(5000);
      const result = promptCachingEngine.buildCachedSystem({
        stable: Array.from({ length: 20 }, () => big),
      });
      expect(result.within_breakpoint_limit).toBe(true);
      expect(result.cache_breakpoints).toBeLessThanOrEqual(
        ANTHROPIC_MAX_CACHE_BREAKPOINTS
      );
    });
  });

  // ── wrapSystemPrompt() ───────────────────────────────────────────────

  describe("wrapSystemPrompt()", () => {
    it("wraps a single prompt as a stable cacheable block", () => {
      const result = promptCachingEngine.wrapSystemPrompt("a".repeat(5000));
      expect(result.cache_breakpoints).toBe(1);
    });

    it("appends volatile tail without caching", () => {
      const result = promptCachingEngine.wrapSystemPrompt(
        "a".repeat(5000),
        "User said: hello"
      );
      expect(result.system.length).toBe(2);
      expect(result.system[1]!.cache_control).toBeUndefined();
    });

    it("omits empty volatile tail", () => {
      const result = promptCachingEngine.wrapSystemPrompt("a".repeat(5000));
      expect(result.system.length).toBe(1);
    });
  });

  // ── recordUsage() + getStats() ────────────────────────────────────────

  describe("recordUsage() + getStats()", () => {
    it("starts with zero stats", () => {
      const stats = promptCachingEngine.getStats();
      expect(stats.total_requests).toBe(0);
      expect(stats.cache_hits).toBe(0);
      expect(stats.hit_rate).toBe(0);
    });

    it("increments total_requests on each record", () => {
      promptCachingEngine.recordUsage({ input_tokens: 100 });
      promptCachingEngine.recordUsage({ input_tokens: 200 });
      expect(promptCachingEngine.getStats().total_requests).toBe(2);
    });

    it("counts cache hits when cache_read_input_tokens > 0", () => {
      promptCachingEngine.recordUsage({
        cache_read_input_tokens: 500,
        input_tokens: 100,
      });
      const stats = promptCachingEngine.getStats();
      expect(stats.cache_hits).toBe(1);
      expect(stats.cached_input_tokens).toBe(500);
    });

    it("does NOT count as hit when cache_read_input_tokens is 0", () => {
      promptCachingEngine.recordUsage({
        cache_creation_input_tokens: 500,
        input_tokens: 100,
      });
      const stats = promptCachingEngine.getStats();
      expect(stats.cache_hits).toBe(0);
    });

    it("computes hit_rate as hits/total", () => {
      promptCachingEngine.recordUsage({ cache_read_input_tokens: 100 });
      promptCachingEngine.recordUsage({ input_tokens: 100 });
      promptCachingEngine.recordUsage({ cache_read_input_tokens: 100 });
      const stats = promptCachingEngine.getStats();
      expect(stats.hit_rate).toBeCloseTo(2 / 3, 5);
    });

    it("accumulates cached_input_tokens across requests", () => {
      promptCachingEngine.recordUsage({ cache_read_input_tokens: 100 });
      promptCachingEngine.recordUsage({ cache_read_input_tokens: 200 });
      expect(promptCachingEngine.getStats().cached_input_tokens).toBe(300);
    });

    it("accumulates cache_creation_tokens separately", () => {
      promptCachingEngine.recordUsage({ cache_creation_input_tokens: 500 });
      expect(promptCachingEngine.getStats().cache_creation_tokens).toBe(500);
    });

    it("estimates token savings — positive when reads >> writes", () => {
      // Simulate: 1 cache write (500 tokens), 5 cache reads (500 each)
      promptCachingEngine.recordUsage({ cache_creation_input_tokens: 500 });
      for (let i = 0; i < 5; i++) {
        promptCachingEngine.recordUsage({ cache_read_input_tokens: 500 });
      }
      const stats = promptCachingEngine.getStats();
      // 5 reads × 500 × 0.9 = 2250 savings; 1 write × 500 × 0.25 = 125 premium
      // Net savings ≈ 2125
      expect(stats.estimated_token_savings).toBeGreaterThan(1000);
    });

    it("resetStats clears everything", () => {
      promptCachingEngine.recordUsage({ cache_read_input_tokens: 100 });
      promptCachingEngine.resetStats();
      const stats = promptCachingEngine.getStats();
      expect(stats.total_requests).toBe(0);
      expect(stats.cache_hits).toBe(0);
      expect(stats.cached_input_tokens).toBe(0);
    });
  });

  // ── breakEvenReads() ─────────────────────────────────────────────────

  describe("breakEvenReads()", () => {
    it("returns Infinity for sub-minimum block size", () => {
      expect(promptCachingEngine.breakEvenReads(500)).toBe(Infinity);
    });

    it("returns 1 for >= 1024 tokens", () => {
      expect(promptCachingEngine.breakEvenReads(1024)).toBe(1);
      expect(promptCachingEngine.breakEvenReads(10000)).toBe(1);
    });
  });

  // ── Integration: full cycle ──────────────────────────────────────────

  describe("integration: cache build + record cycle", () => {
    it("simulates a cache-warm workflow with positive savings", () => {
      const systemPrompt = "a".repeat(8000);
      const wrapped = promptCachingEngine.wrapSystemPrompt(systemPrompt);
      expect(wrapped.cache_breakpoints).toBe(1);

      // First request: cache miss → write
      promptCachingEngine.recordUsage({
        cache_creation_input_tokens: 2000,
        input_tokens: 50,
      });

      // Next 10 requests: cache hit → read
      for (let i = 0; i < 10; i++) {
        promptCachingEngine.recordUsage({
          cache_read_input_tokens: 2000,
          input_tokens: 50,
        });
      }

      const stats = promptCachingEngine.getStats();
      expect(stats.total_requests).toBe(11);
      expect(stats.cache_hits).toBe(10);
      expect(stats.hit_rate).toBeCloseTo(10 / 11, 2);
      expect(stats.estimated_token_savings).toBeGreaterThan(0);
    });
  });
});
