/**
 * contextDispatcher — Token Economy wiring round-trip suite
 * ==========================================================
 *
 * COGNITIVE-BRIDGE-MS0 / U-WIRE-COG-BATCH1
 *
 * Verifies 4 token-economy engines reach prism_context dispatcher with
 * exact-value, math-invariant, and domain-membership assertions:
 *   - tokenEconomyEngine          → token_economy_get_budget / record_spending / detect_waste / report
 *   - tokenAccountingEngine       → token_accounting_record / report
 *   - tokenBudgetAllocatorEngine  → token_budget_allocate / can_afford
 *   - diffTokenEstimatorEngine    → diff_token_uncommitted / staged / between / last_commits
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH1
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";

// Canonical 1M-window budget profile — must match BUDGET_PROFILES in TokenEconomyEngine
const BACKEND_TOTAL = 200_000;
const BACKEND_CTX = 40_000;
const BACKEND_TOOL = 80_000;
const BACKEND_REASON = 50_000;
const BACKEND_OUTPUT = 20_000;
const BACKEND_RESERVE = 10_000;
const SYSTEM_RESERVE = 5_000; // TokenBudgetAllocatorEngine constant
const DUPLICATE_READS_RATIO = 1.5;

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult {
  ok: boolean;
  data: Record<string, unknown>;
}

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerContextDispatcher(server as unknown as Parameters<typeof registerContextDispatcher>[0]);
});

describe("U-WIRE-COG-BATCH1 / TokenEconomyEngine", () => {
  it("get_budget('backend') returns canonical profile and 5 line items sum to total", async () => {
    const r = await call(server, "token_economy_get_budget", { task_class: "backend" });
    expect(r.ok).toBe(true);
    const b = r.data.budget as Record<string, number>;
    expect(b.task_class).toBe("backend");
    expect(b.total_budget).toBe(BACKEND_TOTAL);
    expect(b.context_loading).toBe(BACKEND_CTX);
    expect(b.tool_calls).toBe(BACKEND_TOOL);
    expect(b.reasoning).toBe(BACKEND_REASON);
    expect(b.output).toBe(BACKEND_OUTPUT);
    expect(b.reserve).toBe(BACKEND_RESERVE);
    expect(b.context_loading + b.tool_calls + b.reasoning + b.output + b.reserve).toBe(b.total_budget);
  });

  it("get_budget multiplier=2 doubles every line item", async () => {
    const baseline = await call(server, "token_economy_get_budget", { task_class: "general" });
    const scaled = await call(server, "token_economy_get_budget", { task_class: "general", multiplier: 2 });
    const a = baseline.data.budget as Record<string, number>;
    const b = scaled.data.budget as Record<string, number>;
    expect(b.total_budget).toBe(a.total_budget * 2);
    expect(b.context_loading).toBe(a.context_loading * 2);
    expect(b.tool_calls).toBe(a.tool_calls * 2);
    expect(b.reasoning).toBe(a.reasoning * 2);
    expect(b.output).toBe(a.output * 2);
    expect(b.reserve).toBe(a.reserve * 2);
  });

  it("record_spending applies utilization (sum/total) and waste (overspend/sum) formulas", async () => {
    // Backend total 200k. Spend 165k = 82.5% util. Output category overspend 5k → waste 3.0303%.
    const r = await call(server, "token_economy_record_spending", {
      session_id: "sess-formula",
      task_class: "backend",
      actual: { context_loading: 30_000, tool_calls: 70_000, reasoning: 40_000, output: 25_000 },
    });
    expect(r.ok).toBe(true);
    const s = r.data.spending as Record<string, unknown>;
    expect(s.session_id).toBe("sess-formula");
    expect(s.task_class).toBe("backend");
    expect(s.utilization_pct).toBeCloseTo(82.5, 1);
    expect(s.waste_pct).toBeCloseTo(3.0, 1);
    expect(s.overspend).toBe(false);
  });

  it("record_spending flags overspend=true when total exceeds budget", async () => {
    const r = await call(server, "token_economy_record_spending", {
      session_id: "sess-over",
      task_class: "general",
      actual: { context_loading: 999_999, tool_calls: 1, reasoning: 1, output: 1 },
    });
    expect(r.ok).toBe(true);
    const s = r.data.spending as Record<string, unknown>;
    expect(s.overspend).toBe(true);
  });

  it(`detect_waste flags duplicate_reads when fileReads > ${DUPLICATE_READS_RATIO} * uniqueFiles`, async () => {
    const r = await call(server, "token_economy_detect_waste", {
      tool_call_count: 50,
      file_reads_count: 100,
      unique_files_read: 20,
      search_count: 5,
      agent_spawn_count: 2,
    });
    expect(r.ok).toBe(true);
    const wp = r.data.waste_patterns as Array<{ pattern: string; severity: string; estimated_waste_tokens: number }>;
    const dup = wp.filter(p => p.pattern === "duplicate_reads");
    expect(dup.length).toBe(1);
    expect(dup[0]!.severity).toBe("medium");
    expect(dup[0]!.estimated_waste_tokens).toBe(5_000);
  });

  it("detect_waste returns NO duplicate_reads when reads ≤ 1.5x unique", async () => {
    const r = await call(server, "token_economy_detect_waste", {
      tool_call_count: 30,
      file_reads_count: 18,
      unique_files_read: 15,
      search_count: 0,
      agent_spawn_count: 0,
    });
    expect(r.ok).toBe(true);
    const wp = r.data.waste_patterns as Array<{ pattern: string }>;
    expect(wp.filter(p => p.pattern === "duplicate_reads").length).toBe(0);
  });
});

describe("U-WIRE-COG-BATCH1 / TokenAccountingEngine", () => {
  it("3 records produce report with totalCalls=3, 2 grouped tools, exact totals", async () => {
    await call(server, "token_accounting_record", { tool: "Read", tokens_in: 100, tokens_out: 5000 });
    await call(server, "token_accounting_record", { tool: "Read", tokens_in: 50, tokens_out: 3000 });
    await call(server, "token_accounting_record", { tool: "Bash", tokens_in: 200, tokens_out: 1500 });
    const r = await call(server, "token_accounting_report");
    expect(r.ok).toBe(true);
    const rep = r.data.report as { totalCalls: number; totalTokensIn: number; totalTokensOut: number; byTool: Array<{ tool: string; callCount: number; totalTokens: number }> };
    expect(rep.totalCalls).toBe(3);
    expect(rep.totalTokensIn).toBe(350);
    expect(rep.totalTokensOut).toBe(9500);
    const reads = rep.byTool.filter(t => t.tool === "Read");
    expect(reads.length).toBe(1);
    expect(reads[0]!.callCount).toBe(2);
    expect(reads[0]!.totalTokens).toBe(150 + 8000);
  });
});

describe("U-WIRE-COG-BATCH1 / TokenBudgetAllocatorEngine", () => {
  it("allocate distributes within budget minus 5k system reserve, allocations.length === phases.length", async () => {
    const r = await call(server, "token_budget_allocate", {
      total_budget: 100_000,
      phases: [
        { name: "discovery", priority: 1, estimatedTokens: 30_000, minTokens: 20_000, flexible: true },
        { name: "wiring",    priority: 2, estimatedTokens: 40_000, minTokens: 30_000, flexible: true },
        { name: "tests",     priority: 3, estimatedTokens: 20_000, minTokens: 15_000, flexible: false },
      ],
    });
    expect(r.ok).toBe(true);
    const plan = r.data.plan as { allocations: Array<{ phase: string; allocated: number; canComplete: boolean }>; totalBudget: number; totalAllocated: number; reserve: number };
    expect(plan.allocations.length).toBe(3);
    expect(plan.totalBudget).toBe(100_000);
    // 95k available (100k − 5k system reserve). All three phases are non-critical
    // and exactly meet their estimates → totalAllocated = 30k+40k+20k = 90k.
    // `reserve` field is residual = totalBudget − totalAllocated = 10k.
    expect(plan.totalAllocated).toBe(90_000);
    expect(plan.reserve).toBe(10_000);
    const sumAllocated = plan.allocations.reduce((s, a) => s + a.allocated, 0);
    expect(sumAllocated).toBe(plan.totalAllocated);
  });

  it("allocate drops phase whose minTokens cannot be met", async () => {
    const r = await call(server, "token_budget_allocate", {
      total_budget: 50_000,
      phases: [
        { name: "critical", priority: 1, estimatedTokens: 40_000, minTokens: 40_000, flexible: false },
        { name: "optional", priority: 5, estimatedTokens: 20_000, minTokens: 20_000, flexible: false },
      ],
    });
    expect(r.ok).toBe(true);
    const plan = r.data.plan as { droppedPhases: string[]; canCompleteAll: boolean; allocations: Array<{ phase: string; allocated: number; canComplete: boolean }> };
    expect(plan.droppedPhases).toContain("optional");
    expect(plan.canCompleteAll).toBe(false);
    const critical = plan.allocations.filter(a => a.phase === "critical");
    expect(critical.length).toBe(1);
    expect(critical[0]!.allocated).toBe(40_000);
    expect(critical[0]!.canComplete).toBe(true);
  });

  it("can_afford honours must_reserve floor at and below threshold", async () => {
    const above = await call(server, "token_budget_can_afford", {
      remaining_budget: 50_000, estimated_cost: 20_000, must_reserve: 10_000,
    });
    expect(above.data.can_afford).toBe(true);
    const below = await call(server, "token_budget_can_afford", {
      remaining_budget: 25_000, estimated_cost: 20_000, must_reserve: 10_000,
    });
    expect(below.data.can_afford).toBe(false);
    const exact = await call(server, "token_budget_can_afford", {
      remaining_budget: 30_000, estimated_cost: 20_000, must_reserve: 10_000,
    });
    expect(exact.data.can_afford).toBe(true);
  });
});

describe("U-WIRE-COG-BATCH1 / DiffTokenEstimatorEngine", () => {
  it("uncommitted returns DiffEstimate with recommendation in {inline, summarize, skip}", async () => {
    const r = await call(server, "diff_token_uncommitted");
    expect(r.ok).toBe(true);
    const est = r.data.estimate as { totalTokens: number; totalChars: number; additions: number; deletions: number; filesChanged: number; recommendation: string; reason: string; perFile: unknown[] };
    expect(typeof est.totalTokens).toBe("number");
    expect(est.totalTokens).toBeGreaterThanOrEqual(0);
    expect(est.totalChars).toBeGreaterThanOrEqual(0);
    expect(est.additions).toBeGreaterThanOrEqual(0);
    expect(est.deletions).toBeGreaterThanOrEqual(0);
    expect(est.filesChanged).toBeGreaterThanOrEqual(0);
    expect(["inline", "summarize", "skip"]).toContain(est.recommendation);
    expect(est.reason.length).toBeGreaterThan(0);
    // perFile lists exactly the changed files; slimResponse strips it from the MCP
    // envelope only when empty (responseSlimmer drops empty arrays). So normalize a
    // stripped value to [] and assert the real invariant: one perFile entry per changed
    // file. This catches the silent-ENOBUFS regression (filesChanged>0 but perFile empty)
    // that the DiffTokenEstimator maxBuffer/--numstat fix repaired — a bare Array.isArray
    // check passed right through it.
    const perFile = (est.perFile ?? []) as unknown[];
    expect(perFile.length).toBe(est.filesChanged);
    expect(typeof r.data.summary).toBe("string");
    expect((r.data.summary as string).length).toBeGreaterThan(0);
  });

  it("last_commits with n=1 returns recommendation in domain", async () => {
    const r = await call(server, "diff_token_last_commits", { n: 1 });
    expect(r.ok).toBe(true);
    const est = r.data.estimate as { totalTokens: number; recommendation: string };
    expect(est.totalTokens).toBeGreaterThanOrEqual(0);
    expect(["inline", "summarize", "skip"]).toContain(est.recommendation);
  });
});

describe("U-WIRE-COG-BATCH1 / variability across task classes", () => {
  it.each([
    ["backend", BACKEND_TOTAL, BACKEND_CTX],
    ["web", 150_000, 30_000],
    ["roadmap", 0, 0],
  ])("get_budget(%s) returns line-items summing to total", async (tc, expectedTotal, expectedCtx) => {
    const r = await call(server, "token_economy_get_budget", { task_class: tc });
    expect(r.ok).toBe(true);
    const b = r.data.budget as Record<string, number>;
    expect(b.context_loading + b.tool_calls + b.reasoning + b.output + b.reserve).toBe(b.total_budget);
    if (expectedTotal > 0) expect(b.total_budget).toBe(expectedTotal);
    if (expectedCtx > 0) expect(b.context_loading).toBe(expectedCtx);
  });
});

describe("U-WIRE-COG-BATCH1 / schema rejections", () => {
  it("rejects unknown task_class", async () => {
    const r = await call(server, "token_economy_get_budget", { task_class: "definitely_not_a_class" });
    expect(r.ok).toBe(false);
  });

  it("rejects negative tokens_in", async () => {
    const r = await call(server, "token_accounting_record", { tool: "Read", tokens_in: -100, tokens_out: 50 });
    expect(r.ok).toBe(false);
  });

  it("rejects empty phases array", async () => {
    const r = await call(server, "token_budget_allocate", { total_budget: 100_000, phases: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects priority outside [1,5]", async () => {
    const r = await call(server, "token_budget_allocate", {
      total_budget: 50_000,
      phases: [{ name: "x", priority: 10, estimatedTokens: 1000, minTokens: 100, flexible: true }],
    });
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH1 / adversarial", () => {
  it("rejects NaN actual on record_spending", async () => {
    const r = await call(server, "token_economy_record_spending", {
      session_id: "adv",
      task_class: "backend",
      actual: { context_loading: NaN, tool_calls: 0, reasoning: 0, output: 0 },
    });
    expect(r.ok).toBe(false);
  });

  it("handles huge total_budget without arithmetic overflow", async () => {
    const r = await call(server, "token_budget_allocate", {
      total_budget: 1_000_000_000,
      phases: [{ name: "p", priority: 3, estimatedTokens: 100, minTokens: 100, flexible: true }],
    });
    expect(r.ok).toBe(true);
    const plan = r.data.plan as { totalAllocated: number; allocations: Array<{ allocated: number }> };
    expect(plan.totalAllocated).toBeGreaterThan(0);
    expect(plan.allocations[0]!.allocated).toBeGreaterThan(0);
    expect(Number.isFinite(plan.totalAllocated)).toBe(true);
  });
});

describe("U-TOKENECON-ROI / TokenEconomyEngine.computeROI via prism_context", () => {
  // rating bands (TokenEconomyEngine.ts:400-403): <10k excellent, <25k good, <50k fair, else poor
  it("compute_roi(backend, 8000, 2) → cost_per_capability 4000, rating 'excellent'", async () => {
    const r = await call(server, "token_economy_compute_roi", { task_class: "backend", tokens_spent: 8000, capabilities_delivered: 2 });
    expect(r.ok).toBe(true);
    const roi = r.data.roi as Record<string, unknown>;
    expect(roi.task_class).toBe("backend");
    expect(roi.tokens_spent).toBe(8000);
    expect(roi.capabilities_unlocked).toBe(2);
    expect(roi.cost_per_capability).toBe(4000); // 8000/2
    expect(roi.efficiency_rating).toBe("excellent"); // 4000 < 10_000
  });

  it("compute_roi cost 15000 → 'good' (10k ≤ x < 25k band)", async () => {
    const r = await call(server, "token_economy_compute_roi", { task_class: "web", tokens_spent: 30000, capabilities_delivered: 2 });
    expect(r.ok).toBe(true);
    const roi = r.data.roi as Record<string, unknown>;
    expect(roi.cost_per_capability).toBe(15000); // 30000/2
    expect(roi.efficiency_rating).toBe("good");
  });

  it("compute_roi cost 35000 → 'fair' (25k ≤ x < 50k band)", async () => {
    const r = await call(server, "token_economy_compute_roi", { task_class: "general", tokens_spent: 35000, capabilities_delivered: 1 });
    expect(r.ok).toBe(true);
    const roi = r.data.roi as Record<string, unknown>;
    expect(roi.cost_per_capability).toBe(35000);
    expect(roi.efficiency_rating).toBe("fair");
  });

  it("compute_roi cost ≥ 50000 → 'poor'", async () => {
    const r = await call(server, "token_economy_compute_roi", { task_class: "audit", tokens_spent: 120000, capabilities_delivered: 1 });
    expect(r.ok).toBe(true);
    const roi = r.data.roi as Record<string, unknown>;
    expect(roi.cost_per_capability).toBe(120000);
    expect(roi.efficiency_rating).toBe("poor");
  });

  it("compute_roi with 0 capabilities → Infinity cost (JSON-serialized to null), rating 'poor'", async () => {
    // The engine's ternary `capabilitiesDelivered > 0 ? spent/cap : Infinity` returns Infinity
    // (NOT 0/0=NaN — the guard prevents division), Math.round(Infinity)=Infinity, and
    // JSON.stringify(Infinity)=null over the MCP envelope. Honest round-trip assertion.
    const r = await call(server, "token_economy_compute_roi", { task_class: "backend", tokens_spent: 5000, capabilities_delivered: 0 });
    expect(r.ok).toBe(true);
    const roi = r.data.roi as Record<string, unknown>;
    expect(roi.cost_per_capability).toBeNull();
    expect(roi.efficiency_rating).toBe("poor");
  });

  // adversarial / schema rejections
  it("rejects unknown task_class", async () => {
    const r = await call(server, "token_economy_compute_roi", { task_class: "not_a_class", tokens_spent: 5000, capabilities_delivered: 2 });
    expect(r.ok).toBe(false);
  });

  it("rejects NaN tokens_spent (z.number().min(0) fails on NaN)", async () => {
    const r = await call(server, "token_economy_compute_roi", { task_class: "backend", tokens_spent: NaN, capabilities_delivered: 2 });
    expect(r.ok).toBe(false);
  });

  it("rejects negative tokens_spent", async () => {
    const r = await call(server, "token_economy_compute_roi", { task_class: "backend", tokens_spent: -1, capabilities_delivered: 2 });
    expect(r.ok).toBe(false);
  });

  it("rejects non-integer capabilities_delivered", async () => {
    const r = await call(server, "token_economy_compute_roi", { task_class: "backend", tokens_spent: 5000, capabilities_delivered: 2.5 });
    expect(r.ok).toBe(false);
  });
});
