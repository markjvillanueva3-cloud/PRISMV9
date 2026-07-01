/**
 * ContextBudgetEngine tests — covering the pre-existing R15-MS4 token-budget
 * allocator (manufacturing/development/context/reserve categories).  Static
 * state requires resetBudget() between tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ContextBudgetEngine } from "../engines/ContextBudgetEngine.js";

beforeEach(() => { ContextBudgetEngine.resetBudget(); });

describe("ContextBudgetEngine.getBudget", () => {
  it("returns default 100K total budget with 4 categories at known percentages", () => {
    const b = ContextBudgetEngine.getBudget();
    expect(b.totalBudget).toBe(100_000);
    expect(b.allocations.manufacturing.percentage).toBe(40);
    expect(b.allocations.development.percentage).toBe(20);
    expect(b.allocations.context.percentage).toBe(20);
    expect(b.allocations.reserve.percentage).toBe(20);
  });

  it("manufacturing allocation has token limit 40_000", () => {
    expect(ContextBudgetEngine.getBudget().allocations.manufacturing.tokenLimit).toBe(40_000);
  });

  it("returns zero tokensUsed for fresh state", () => {
    const b = ContextBudgetEngine.getBudget();
    for (const a of Object.values(b.allocations)) expect(a.tokensUsed).toBe(0);
  });
});

describe("ContextBudgetEngine.trackUsage", () => {
  it("tracks 1000 tokens against manufacturing → returns 1000 used + 40K limit", () => {
    const r = ContextBudgetEngine.trackUsage("manufacturing", 1000);
    expect(r.category).toBe("manufacturing");
    expect(r.tokensUsed).toBe(1000);
    expect(r.limit).toBe(40_000);
  });

  it("lowercases the category (case-insensitive)", () => {
    const r = ContextBudgetEngine.trackUsage("Manufacturing", 500);
    expect(r.category).toBe("manufacturing");
  });

  it("accumulates across multiple track calls", () => {
    ContextBudgetEngine.trackUsage("development", 100);
    ContextBudgetEngine.trackUsage("development", 200);
    const r = ContextBudgetEngine.trackUsage("development", 300);
    expect(r.tokensUsed).toBe(600);
  });

  it("unknown category falls back to reserve allocation (20K limit)", () => {
    const r = ContextBudgetEngine.trackUsage("brand_new_category", 100);
    expect(r.limit).toBe(20_000);
  });
});

describe("ContextBudgetEngine.isOverBudget", () => {
  it("returns overBudget=false when usage under limit", () => {
    ContextBudgetEngine.trackUsage("context", 1000);
    const r = ContextBudgetEngine.isOverBudget("context");
    expect(r.overBudget).toBe(false);
    expect(r.tokensUsed).toBe(1000);
    expect(r.limit).toBe(20_000);
    expect(r.overage).toBe(0);
  });

  it("returns overBudget=true with overage when usage exceeds limit", () => {
    ContextBudgetEngine.trackUsage("context", 25_000);
    const r = ContextBudgetEngine.isOverBudget("context");
    expect(r.overBudget).toBe(true);
    expect(r.overage).toBe(5_000);
  });
});

describe("ContextBudgetEngine.getUsageReport", () => {
  it("computes totalUsed across multiple categories", () => {
    ContextBudgetEngine.trackUsage("manufacturing", 1000);
    ContextBudgetEngine.trackUsage("development", 2000);
    const r = ContextBudgetEngine.getUsageReport();
    expect(r.totalUsed).toBe(3000);
    expect(r.totalBudget).toBe(100_000);
    expect(r.utilizationPercent).toBe(3);
  });

  it("flags over-budget categories", () => {
    ContextBudgetEngine.trackUsage("development", 25_000); // limit 20K → over
    const r = ContextBudgetEngine.getUsageReport();
    expect(r.overBudgetCategories.includes("development")).toBe(true);
  });
});

describe("ContextBudgetEngine.resetBudget", () => {
  it("clears all usage; returns previous total + category count", () => {
    ContextBudgetEngine.trackUsage("manufacturing", 1000);
    ContextBudgetEngine.trackUsage("reserve", 500);
    const r = ContextBudgetEngine.resetBudget();
    expect(r.reset).toBe(true);
    expect(r.previousTotal).toBe(1500);
    expect(r.categoriesCleared).toBe(2);
    expect(ContextBudgetEngine.getUsageReport().totalUsed).toBe(0);
  });
});
