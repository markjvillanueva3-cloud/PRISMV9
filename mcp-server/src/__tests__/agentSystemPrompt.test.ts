/**
 * agentSystemPrompt Test Suite
 * =============================
 *
 * AGENT-MS5 U-AGT18 — Validates the optimized system prompt:
 *   - <5K tokens total
 *   - manufacturing domain expertise embedded
 *   - tools loaded dynamically (not hardcoded)
 *   - safety constraints clearly stated
 *
 * @milestone AGENT-MS5
 * @unit U-AGT18
 */

import { describe, it, expect } from "vitest";
import {
  buildAgentSystemPrompt,
  buildBaseSystemPrompt,
  estimateTokens,
  maxToolLinesWithinBudget,
  BASE_PROMPT_TOKEN_BUDGET,
  FULL_PROMPT_TOKEN_BUDGET,
  SAFETY_SECTION,
  CAPABILITIES_SECTION,
  TEST_SHOP_SECTION,
} from "../prompts/agentSystemPrompt.js";

describe("agentSystemPrompt", () => {
  // ── estimateTokens() ──────────────────────────────────────────────────

  describe("estimateTokens()", () => {
    it("returns positive integers for non-empty strings", () => {
      expect(estimateTokens("hello world")).toBeGreaterThan(0);
    });

    it("scales roughly linearly with length", () => {
      const short = estimateTokens("a".repeat(4));
      const long = estimateTokens("a".repeat(400));
      expect(long).toBeGreaterThan(short * 50);
    });
  });

  // ── buildBaseSystemPrompt() ───────────────────────────────────────────

  describe("buildBaseSystemPrompt()", () => {
    it("fits within the BASE_PROMPT_TOKEN_BUDGET", () => {
      const result = buildBaseSystemPrompt();
      expect(result.token_estimate).toBeLessThan(BASE_PROMPT_TOKEN_BUDGET);
      expect(result.within_budget).toBe(true);
    });

    it("includes identity header", () => {
      const { prompt } = buildBaseSystemPrompt();
      expect(prompt).toContain("PRISM Agent");
    });

    it("includes safety section with S(x) threshold", () => {
      const { prompt } = buildBaseSystemPrompt();
      expect(prompt).toContain("S(x)");
      expect(prompt).toContain("0.70");
    });

    it("embeds test shop (JM Die) info", () => {
      const { prompt } = buildBaseSystemPrompt();
      expect(prompt).toContain("JM Die");
      expect(prompt).toContain("24,545");
    });

    it("includes reasoning style section", () => {
      const { prompt } = buildBaseSystemPrompt();
      expect(prompt.toLowerCase()).toContain("reasoning");
      expect(prompt.toLowerCase()).toContain("material-first");
    });

    it("includes feedback + memory protocol", () => {
      const { prompt } = buildBaseSystemPrompt();
      expect(prompt).toContain("remember_correction");
    });

    it("does NOT include dynamic tool enumeration", () => {
      const { prompt } = buildBaseSystemPrompt();
      expect(prompt).not.toContain("# Available tools (");
    });

    it("embeds identity role when provided", () => {
      const { prompt } = buildBaseSystemPrompt({
        role: "advisor",
        model_id: "claude-opus-4-7",
      });
      expect(prompt).toContain("role=advisor");
      expect(prompt).toContain("claude-opus-4-7");
    });
  });

  // ── buildAgentSystemPrompt() full ─────────────────────────────────────

  describe("buildAgentSystemPrompt() full", () => {
    it("fits within FULL_PROMPT_TOKEN_BUDGET with no tools", () => {
      const result = buildAgentSystemPrompt();
      expect(result.within_budget).toBe(true);
      expect(result.token_estimate).toBeLessThan(FULL_PROMPT_TOKEN_BUDGET);
    });

    it("fits within budget when tool list is large", () => {
      const tools = Array.from({ length: 500 }, (_, i) => ({
        fullPath: `prism_foo:action_${i}`,
        description: `Action ${i} handles some stuff`,
      }));
      const result = buildAgentSystemPrompt({ tools, maxToolLines: 80 });
      expect(result.within_budget).toBe(true);
    });

    it("caps tool enumeration at maxToolLines", () => {
      const tools = Array.from({ length: 200 }, (_, i) => ({
        fullPath: `prism_foo:action_${i}`,
      }));
      const result = buildAgentSystemPrompt({ tools, maxToolLines: 10 });
      // Count action_ occurrences — should be exactly 10 in the enumerated section
      const matches = result.prompt.match(/prism_foo:action_/g);
      expect(matches?.length).toBe(10);
    });

    it("signals truncation when tools exceed maxToolLines", () => {
      const tools = Array.from({ length: 150 }, (_, i) => ({
        fullPath: `prism_foo:action_${i}`,
      }));
      const result = buildAgentSystemPrompt({ tools, maxToolLines: 50 });
      expect(result.prompt).toContain("100 more tools available");
    });

    it("appends extra constraints when provided", () => {
      const result = buildAgentSystemPrompt({
        extraConstraints: ["No 5-axis operations", "Ti-6Al-4V only"],
      });
      expect(result.prompt).toContain("No 5-axis operations");
      expect(result.prompt).toContain("Ti-6Al-4V only");
    });

    it("appends recalled memories when provided", () => {
      const result = buildAgentSystemPrompt({
        memorySnippet: "User prefers trochoidal pockets. Max RPM on LB3000 is 5000.",
      });
      expect(result.prompt).toContain("Recalled memories");
      expect(result.prompt).toContain("trochoidal pockets");
    });

    it("handles empty tool list gracefully", () => {
      const result = buildAgentSystemPrompt({ tools: [], includeTools: true });
      expect(result.prompt).toContain("Tool list unavailable");
    });
  });

  // ── Tool enumeration behavior ─────────────────────────────────────────

  describe("tool enumeration", () => {
    it("tools section contains fullPath entries", () => {
      const tools = [
        { fullPath: "prism_agent:chat", description: "One-shot agentic loop" },
        { fullPath: "prism_agent:memory" },
      ];
      const { prompt } = buildAgentSystemPrompt({ tools });
      expect(prompt).toContain("prism_agent:chat");
      expect(prompt).toContain("prism_agent:memory");
      expect(prompt).toContain("One-shot agentic loop");
    });
  });

  // ── maxToolLinesWithinBudget() ───────────────────────────────────────

  describe("maxToolLinesWithinBudget()", () => {
    it("returns a positive integer", () => {
      const max = maxToolLinesWithinBudget();
      expect(max).toBeGreaterThan(0);
      expect(Number.isInteger(max)).toBe(true);
    });

    it("returns fewer lines when base is larger", () => {
      const baseline = maxToolLinesWithinBudget();
      const constrained = maxToolLinesWithinBudget({
        extraConstraints: Array.from({ length: 20 }, (_, i) => `Constraint ${i} that takes up tokens`),
      });
      expect(constrained).toBeLessThanOrEqual(baseline);
    });
  });

  // ── Section exports ───────────────────────────────────────────────────

  describe("named section exports", () => {
    it("SAFETY_SECTION includes S(x) threshold language", () => {
      expect(SAFETY_SECTION).toContain("S(x)");
      expect(SAFETY_SECTION).toContain("0.70");
    });

    it("CAPABILITIES_SECTION references duplication check", () => {
      expect(CAPABILITIES_SECTION.toLowerCase()).toContain("search");
      expect(CAPABILITIES_SECTION.toLowerCase()).toContain("duplicat");
    });

    it("TEST_SHOP_SECTION includes JM Die machine inventory", () => {
      expect(TEST_SHOP_SECTION).toContain("Okuma");
      expect(TEST_SHOP_SECTION).toContain("21");
    });
  });

  // ── Design invariants ────────────────────────────────────────────────

  describe("design invariants", () => {
    it("does NOT hardcode specific tool definitions in the base prompt", () => {
      const { prompt } = buildBaseSystemPrompt();
      // Should not list individual actions inline
      expect(prompt).not.toMatch(/prism_\w+:\w+/);
    });

    it("explicitly cites the 5000-token full budget is feasible", () => {
      // Smoke check: the prompt system is designed to fit the budget
      const { within_budget } = buildAgentSystemPrompt();
      expect(within_budget).toBe(true);
    });

    it("token estimate matches real length ratio (~4 chars/token)", () => {
      const { prompt, token_estimate } = buildBaseSystemPrompt();
      const ratio = prompt.length / token_estimate;
      // Should be close to 4 chars per token
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(5);
    });
  });
});
