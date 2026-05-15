/**
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SESSION-BUDGET-ADVISOR — wire test
 *
 * Verifies 4 SessionBudgetAdvisorEngine actions land through contextDispatcher's
 * prism_context tool.
 *
 *   session_budget_advise            — full BudgetAdvisory (status/message/recs)
 *   session_budget_one_liner         — emoji-prefix one-line summary
 *   session_budget_should_compact    — {shouldCompact: boolean}
 *   session_budget_estimate_capacity — {reads, greps, edits, bashes, agents, webSearches}
 *
 * Real-value assertions: status thresholds (healthy <60%, caution 60-84%,
 * critical ≥85%), shouldCompact gate at 85%, capacity arithmetic
 * (reads = floor(remaining/2000) per engine spec).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";

interface ToolCall {
  action: string;
  params?: Record<string, any>;
}

let handler:
  | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: any,
      fn: (args: any) => Promise<any>
    ) => {
      if (_name === "prism_context") handler = fn;
    },
  };
  registerContextDispatcher(fakeServer as any);
  if (!handler) throw new Error("contextDispatcher did not register prism_context tool");
});

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r = await handler(c);
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  if (r && typeof r === "object" && "error" in r) {
    return { raw: r, success: false, error: (r as any).error };
  }
  return { raw: r, success: true };
}

// ---- Tests ----

describe("contextDispatcher — SessionBudgetAdvisorEngine wire", () => {
  describe("session_budget_advise — status thresholds", () => {
    it("returns status='healthy' at 30% used", async () => {
      const r = await call({
        action: "session_budget_advise",
        params: { budgetMax: 100000, tokensUsed: 30000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.status).toBe("healthy");
      expect(data.percentUsed).toBe(30);
      expect(data.tokensRemaining).toBe(70000);
      expect(data.tokensBudget).toBe(100000);
      expect(data.tokensUsed).toBe(30000);
    });

    it("returns status='caution' at 60% used (boundary)", async () => {
      const r = await call({
        action: "session_budget_advise",
        params: { budgetMax: 100000, tokensUsed: 60000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.status).toBe("caution");
      expect(data.percentUsed).toBe(60);
    });

    it("returns status='critical' at 85% used (boundary)", async () => {
      const r = await call({
        action: "session_budget_advise",
        params: { budgetMax: 100000, tokensUsed: 85000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.status).toBe("critical");
      expect(data.percentUsed).toBe(85);
    });

    it("at 92% used includes 'Run /compact immediately' recommendation", async () => {
      const r = await call({
        action: "session_budget_advise",
        params: { budgetMax: 100000, tokensUsed: 92000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.status).toBe("critical");
      const recsText = (data.recommendations as string[]).join(" | ");
      expect(recsText.toLowerCase()).toContain("/compact");
    });

    it("flags low efficiency score (40%) in recommendations", async () => {
      const r = await call({
        action: "session_budget_advise",
        params: { budgetMax: 100000, tokensUsed: 30000, efficiencyScore: 40 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      const recsText = (data.recommendations as string[]).join(" | ");
      expect(recsText).toMatch(/efficiency/i);
      expect(recsText).toContain("40%");
    });

    it("surfaces anti-pattern count in recommendations", async () => {
      const r = await call({
        action: "session_budget_advise",
        params: {
          budgetMax: 100000,
          tokensUsed: 30000,
          antiPatterns: ["bash-find", "read-without-grep", "redundant-cat"],
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.antiPatterns).toBe(3);
      const recsText = (data.recommendations as string[]).join(" | ");
      expect(recsText).toContain("3 anti-pattern");
    });

    it("compactSummary contains all key metrics in pipe-delimited form", async () => {
      const r = await call({
        action: "session_budget_advise",
        params: {
          budgetMax: 200000,
          tokensUsed: 50000,
          toolCallCount: 42,
          hookSaves: 1500,
          efficiencyScore: 78,
        },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(typeof data.compactSummary).toBe("string");
      expect(data.compactSummary).toContain("HEALTHY");
      expect(data.compactSummary).toContain("25%");
      expect(data.compactSummary).toContain("50000/200000");
      expect(data.compactSummary).toContain("42 calls");
      expect(data.compactSummary).toContain("1500 saved");
      expect(data.compactSummary).toContain("78%");
    });
  });

  describe("session_budget_one_liner", () => {
    it("returns green emoji prefix for healthy (<60%) usage", async () => {
      const r = await call({
        action: "session_budget_one_liner",
        params: { budgetMax: 100000, tokensUsed: 30000, toolCallCount: 10, efficiencyScore: 95 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(typeof data.line).toBe("string");
      expect(data.line).toContain("🟢");
      expect(data.line).toContain("30%");
      expect(data.line).toContain("30000/100000");
      expect(data.line).toContain("10 calls");
      expect(data.line).toContain("Eff: 95%");
    });

    it("returns yellow emoji prefix for caution (60-84%) usage", async () => {
      const r = await call({
        action: "session_budget_one_liner",
        params: { budgetMax: 100000, tokensUsed: 70000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.line).toContain("🟡");
      expect(data.line).toContain("70%");
    });

    it("returns red emoji prefix for critical (≥85%) usage", async () => {
      const r = await call({
        action: "session_budget_one_liner",
        params: { budgetMax: 100000, tokensUsed: 90000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.line).toContain("🔴");
      expect(data.line).toContain("90%");
    });
  });

  describe("session_budget_should_compact — 85% gate", () => {
    it("returns shouldCompact=false at 84% used (just below threshold)", async () => {
      const r = await call({
        action: "session_budget_should_compact",
        params: { budgetMax: 100000, tokensUsed: 84000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.shouldCompact).toBe(false);
    });

    it("returns shouldCompact=true at 85% used (boundary)", async () => {
      const r = await call({
        action: "session_budget_should_compact",
        params: { budgetMax: 100000, tokensUsed: 85000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.shouldCompact).toBe(true);
    });

    it("returns shouldCompact=true at 100% used", async () => {
      const r = await call({
        action: "session_budget_should_compact",
        params: { budgetMax: 100000, tokensUsed: 100000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.shouldCompact).toBe(true);
    });
  });

  describe("session_budget_estimate_capacity — arithmetic", () => {
    it("returns {reads, greps, edits, bashes, agents, webSearches} computed from remaining", async () => {
      // Engine spec: reads = floor(rem/2000), greps = floor(rem/500),
      //              edits = floor(rem/300), bashes = floor(rem/1500),
      //              agents = floor(rem/5000), webSearches = floor(rem/1500)
      const REMAINING = 30000;
      const r = await call({
        action: "session_budget_estimate_capacity",
        params: { remaining: REMAINING },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.reads).toBe(Math.floor(REMAINING / 2000));
      expect(data.greps).toBe(Math.floor(REMAINING / 500));
      expect(data.edits).toBe(Math.floor(REMAINING / 300));
      expect(data.bashes).toBe(Math.floor(REMAINING / 1500));
      expect(data.agents).toBe(Math.floor(REMAINING / 5000));
      expect(data.webSearches).toBe(Math.floor(REMAINING / 1500));
    });

    it("returns all-zero capacity for remaining=0", async () => {
      const r = await call({
        action: "session_budget_estimate_capacity",
        params: { remaining: 0 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.reads).toBe(0);
      expect(data.greps).toBe(0);
      expect(data.edits).toBe(0);
      expect(data.bashes).toBe(0);
      expect(data.agents).toBe(0);
      expect(data.webSearches).toBe(0);
    });

    it("matches the engine's documented ratios at remaining=10000", async () => {
      // Sanity: reads should be cheaper-per-call (larger ratio = fewer fit) than
      // greps. So at any non-zero remaining: capacity.greps > capacity.reads.
      const r = await call({
        action: "session_budget_estimate_capacity",
        params: { remaining: 10000 },
      });
      expect(r.success).toBe(true);
      const data = r.raw.data ?? r.raw;
      expect(data.reads).toBe(5);
      expect(data.greps).toBe(20);
      expect(data.greps).toBeGreaterThan(data.reads);
      // edits is the cheapest action — should be the largest count
      expect(data.edits).toBeGreaterThan(data.greps);
    });
  });
});
