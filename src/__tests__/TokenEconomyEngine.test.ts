/**
 * TokenEconomyEngine Tests — MXU-MS2
 */
import { describe, it, expect, beforeEach } from "vitest";
import { tokenEconomyEngine } from "../engines/TokenEconomyEngine.js";

beforeEach(() => {
  tokenEconomyEngine.clearHistory();
});

// ── Budget Computation ───────────────────────────────────────

describe("TokenEconomyEngine — Budget", () => {

  it("returns budget for known task class", () => {
    const b = tokenEconomyEngine.getBudget("backend");
    expect(b.total_budget).toBe(200_000);
    expect(b.context_loading + b.tool_calls + b.reasoning + b.output + b.reserve).toBe(b.total_budget);
  });

  it("returns budget for all 9 task classes", () => {
    const classes = ["backend", "web", "cad_python", "roadmap", "audit", "speed_feed", "post_process", "erp", "general"] as const;
    for (const tc of classes) {
      const b = tokenEconomyEngine.getBudget(tc);
      expect(b.total_budget).toBeGreaterThan(0);
      expect(b.task_class).toBe(tc);
    }
  });

  it("scales budget correctly", () => {
    const base = tokenEconomyEngine.getBudget("backend");
    const scaled = tokenEconomyEngine.scaleBudget(base, 1.5);
    expect(scaled.total_budget).toBe(Math.round(base.total_budget * 1.5));
    expect(scaled.tool_calls).toBe(Math.round(base.tool_calls * 1.5));
  });

  it("budget components sum to total", () => {
    const b = tokenEconomyEngine.getBudget("speed_feed");
    const sum = b.context_loading + b.tool_calls + b.reasoning + b.output + b.reserve;
    expect(sum).toBe(b.total_budget);
  });
});

// ── Spending Tracking ────────────────────────────────────────

describe("TokenEconomyEngine — Spending", () => {

  it("records spending and computes utilization", () => {
    const s = tokenEconomyEngine.recordSpending("s1", "backend", {
      context_loading: 30_000,
      tool_calls: 60_000,
      reasoning: 40_000,
      output: 15_000,
    });
    expect(s.utilization_pct).toBeGreaterThan(0);
    expect(s.utilization_pct).toBeLessThanOrEqual(100);
    expect(s.overspend).toBe(false);
  });

  it("detects overspend", () => {
    const s = tokenEconomyEngine.recordSpending("s1", "speed_feed", {
      context_loading: 50_000,
      tool_calls: 50_000,
      reasoning: 30_000,
      output: 20_000,
    });
    // 150K actual vs 100K budget → overspend
    expect(s.overspend).toBe(true);
  });

  it("computes waste percentage", () => {
    const s = tokenEconomyEngine.recordSpending("s1", "backend", {
      context_loading: 80_000, // way over 40K budget
      tool_calls: 10_000,
      reasoning: 10_000,
      output: 10_000,
    });
    expect(s.waste_pct).toBeGreaterThan(0);
  });

  it("stores in history", () => {
    tokenEconomyEngine.recordSpending("s1", "backend", { context_loading: 1000, tool_calls: 1000, reasoning: 1000, output: 1000 });
    tokenEconomyEngine.recordSpending("s2", "web", { context_loading: 2000, tool_calls: 2000, reasoning: 2000, output: 2000 });
    expect(tokenEconomyEngine.getHistory()).toHaveLength(2);
  });
});

// ── Waste Detection ──────────────────────────────────────────

describe("TokenEconomyEngine — Waste Detection", () => {

  it("detects duplicate reads", () => {
    const w = tokenEconomyEngine.detectWaste(50, 30, 10, 5, 1);
    // 30 reads, 10 unique → ratio 3x → duplicate
    expect(w.some(p => p.pattern === "duplicate_reads")).toBe(true);
  });

  it("detects broad search", () => {
    const w = tokenEconomyEngine.detectWaste(50, 10, 10, 15, 1);
    expect(w.some(p => p.pattern === "broad_search")).toBe(true);
  });

  it("detects agent over-spawn", () => {
    const w = tokenEconomyEngine.detectWaste(50, 10, 10, 3, 8);
    expect(w.some(p => p.pattern === "agent_over_spawn")).toBe(true);
  });

  it("returns no waste for clean session", () => {
    const w = tokenEconomyEngine.detectWaste(50, 10, 10, 3, 1);
    expect(w).toHaveLength(0);
  });
});

// ── Compression Strategies ───────────────────────────────────

describe("TokenEconomyEngine — Compression", () => {

  it("returns strategies for backend tasks", () => {
    const s = tokenEconomyEngine.getCompressionStrategies("backend");
    expect(s.length).toBeGreaterThan(0);
    expect(s[0].estimated_savings_pct).toBeGreaterThanOrEqual(s[s.length - 1].estimated_savings_pct);
  });

  it("returns strategies for speed_feed tasks", () => {
    const s = tokenEconomyEngine.getCompressionStrategies("speed_feed");
    expect(s.length).toBeGreaterThan(0);
  });

  it("strategies sorted by savings descending", () => {
    const s = tokenEconomyEngine.getCompressionStrategies("audit");
    for (let i = 1; i < s.length; i++) {
      expect(s[i].estimated_savings_pct).toBeLessThanOrEqual(s[i - 1].estimated_savings_pct);
    }
  });
});

// ── ROI Computation ──────────────────────────────────────────

describe("TokenEconomyEngine — ROI", () => {

  it("excellent rating for efficient session", () => {
    const r = tokenEconomyEngine.computeROI("backend", 50_000, 10);
    expect(r.cost_per_capability).toBe(5_000);
    expect(r.efficiency_rating).toBe("excellent");
  });

  it("poor rating for wasteful session", () => {
    const r = tokenEconomyEngine.computeROI("backend", 500_000, 2);
    expect(r.efficiency_rating).toBe("poor");
  });

  it("handles zero capabilities", () => {
    const r = tokenEconomyEngine.computeROI("backend", 100_000, 0);
    expect(r.cost_per_capability).toBe(Infinity);
    expect(r.efficiency_rating).toBe("poor");
  });
});

// ── Economy Report ───────────────────────────────────────────

describe("TokenEconomyEngine — Report", () => {

  it("empty report with no history", () => {
    const r = tokenEconomyEngine.generateReport();
    expect(r.session_count).toBe(0);
    expect(r.total_tokens_spent).toBe(0);
  });

  it("report with spending data", () => {
    tokenEconomyEngine.recordSpending("s1", "backend", { context_loading: 30000, tool_calls: 50000, reasoning: 30000, output: 10000 });
    tokenEconomyEngine.recordSpending("s2", "speed_feed", { context_loading: 20000, tool_calls: 20000, reasoning: 15000, output: 8000 });
    const r = tokenEconomyEngine.generateReport();
    expect(r.session_count).toBe(2);
    expect(r.total_tokens_spent).toBe(183000);
    expect(r.task_class_breakdown).toHaveLength(2);
    expect(r.waste_patterns.length).toBeGreaterThan(0);
    expect(r.compression_recommendations.length).toBeGreaterThan(0);
  });

  it("breaks down by task class", () => {
    tokenEconomyEngine.recordSpending("s1", "backend", { context_loading: 10000, tool_calls: 10000, reasoning: 10000, output: 5000 });
    tokenEconomyEngine.recordSpending("s2", "backend", { context_loading: 15000, tool_calls: 15000, reasoning: 15000, output: 8000 });
    const r = tokenEconomyEngine.generateReport();
    const backend = r.task_class_breakdown.find(t => t.task_class === "backend");
    expect(backend).toBeDefined();
    expect(backend!.sessions).toBe(2);
    expect(backend!.avg_tokens).toBeGreaterThan(0);
  });
});
