import { describe, it, expect } from "vitest";
import {
  toolCostAmortizationEngine as eng,
  ToolCostAmortizationEngine,
  type ToolCostAmortizationInput,
  type ToolUsage,
} from "../engines/ToolCostAmortizationEngine.js";

function tool(o: Partial<ToolUsage> = {}): ToolUsage {
  return {
    tool_id: "T1",
    cost_usd: 80,                // typical 4-edge carbide insert ~$20/edge
    edges_per_tool: 4,
    parts_per_edge: 50,
    ...o,
  };
}

function nominal(o: Partial<ToolCostAmortizationInput> = {}): ToolCostAmortizationInput {
  return {
    tools: [tool()],
    batch_qty: 100,
    setup_cost_usd: 150,
    ...o,
  };
}

describe("ToolCostAmortizationEngine", () => {
  it("exports a singleton with estimate()", () => {
    expect(eng).toBeInstanceOf(ToolCostAmortizationEngine);
    expect(typeof eng.estimate).toBe("function");
  });

  it("throws on empty tools array", () => {
    expect(() => eng.estimate({ tools: [], batch_qty: 100, setup_cost_usd: 0 })).toThrow(/tools\[\] required/);
  });

  it("throws on non-positive batch_qty", () => {
    expect(() => eng.estimate(nominal({ batch_qty: 0 }))).toThrow(/positive batch_qty/);
    expect(() => eng.estimate(nominal({ batch_qty: -1 }))).toThrow(/positive batch_qty/);
  });

  it("throws on negative setup_cost", () => {
    expect(() => eng.estimate(nominal({ setup_cost_usd: -10 }))).toThrow(/non-negative setup_cost/);
  });

  it("throws on tool with cost_usd <= 0", () => {
    expect(() => eng.estimate(nominal({ tools: [tool({ cost_usd: 0 })] }))).toThrow(/cost_usd must be positive/);
  });

  it("throws on tool with non-positive edges/parts_per_edge", () => {
    expect(() => eng.estimate(nominal({ tools: [tool({ edges_per_tool: 0 })] }))).toThrow(/edges_per_tool \+ parts_per_edge must be positive/);
    expect(() => eng.estimate(nominal({ tools: [tool({ parts_per_edge: 0 })] }))).toThrow(/edges_per_tool \+ parts_per_edge must be positive/);
  });

  it("baseline: $80 / 4 edges / 50 parts = $0.40/part tool cost", () => {
    const r = eng.estimate(nominal());
    expect(r.per_part_tool_cost.value).toBeCloseTo(0.4, 3);
  });

  it("setup cost amortized: $150 / 100 batch = $1.50/part", () => {
    const r = eng.estimate(nominal());
    expect(r.per_part_setup_cost.value).toBeCloseTo(1.5, 3);
  });

  it("overhead is default 15% of tool cost ($0.40 × 0.15 = $0.06) at batch ≥ MOQ", () => {
    const r = eng.estimate(nominal({ batch_qty: 100 }));  // ≥ default MOQ 50
    expect(r.short_run_premium_applied).toBe(false);
    expect(r.per_part_overhead.value).toBeCloseTo(0.06, 4);
  });

  it("short-run premium applied when batch < MOQ", () => {
    const r = eng.estimate(nominal({ batch_qty: 10 }));  // < default MOQ 50
    expect(r.short_run_premium_applied).toBe(true);
    expect(r.warnings.some(w => /short-run premium/.test(w))).toBe(true);
    // overhead = $0.40 × 0.15 × 1.25 = $0.075
    expect(r.per_part_overhead.value).toBeCloseTo(0.075, 4);
  });

  it("total = tool + setup + overhead", () => {
    const r = eng.estimate(nominal());
    const expected = r.per_part_tool_cost.value + r.per_part_setup_cost.value + r.per_part_overhead.value;
    expect(r.per_part_total.value).toBeCloseTo(expected, 4);
  });

  it("multi-tool aggregates: 3 tools each $0.40 → $1.20/part total tool cost", () => {
    const r = eng.estimate(nominal({
      tools: [tool({ tool_id: "T1" }), tool({ tool_id: "T2" }), tool({ tool_id: "T3" })],
    }));
    expect(r.per_part_tool_cost.value).toBeCloseTo(1.2, 3);
    expect(r.tool_breakdown.length).toBe(3);
    expect(r.tool_breakdown[0].pct_of_total).toBeCloseTo(33.3, 0);
  });

  it("resharpen credit reduces per-edge net cost", () => {
    // $80 / 4 = $20/edge; with $5 resharpen credit → $15/edge / 50 parts = $0.30
    const r = eng.estimate(nominal({
      tools: [tool({ resharpen_credit_usd: 5 })],
    }));
    expect(r.per_part_tool_cost.value).toBeCloseTo(0.3, 3);
  });

  it("warns when resharpen credit exceeds per-edge new cost", () => {
    // $80/4=$20/edge; credit $30 → negative net
    const r = eng.estimate(nominal({
      tools: [tool({ resharpen_credit_usd: 30 })],
    }));
    expect(r.warnings.some(w => /resharpen credit exceeds/.test(w))).toBe(true);
    // Net clamped to 0 — per-part tool cost = 0
    expect(r.per_part_tool_cost.value).toBe(0);
  });

  it("tool_breakdown pct_of_total sums to 100", () => {
    const r = eng.estimate(nominal({
      tools: [
        tool({ tool_id: "T1", parts_per_edge: 25 }),  // $20/25 = $0.80
        tool({ tool_id: "T2", parts_per_edge: 100 }), // $20/100 = $0.20
      ],
    }));
    const sum = r.tool_breakdown.reduce((s, t) => s + t.pct_of_total, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it("warns when per-part tool cost > $50 (Kennametal sanity threshold)", () => {
    const r = eng.estimate(nominal({
      tools: [tool({ cost_usd: 5000, edges_per_tool: 1, parts_per_edge: 1 })],
    }));
    expect(r.warnings.some(w => /tool cost.*high|Kennametal/.test(w))).toBe(true);
  });

  it("custom overhead_pct overrides default", () => {
    const r = eng.estimate(nominal({ overhead_pct: 30, batch_qty: 100 }));
    // overhead = $0.40 × 0.30 = $0.12
    expect(r.per_part_overhead.value).toBeCloseTo(0.12, 4);
  });

  it("custom short_run_moq + premium_pct override defaults", () => {
    const r = eng.estimate(nominal({
      batch_qty: 5,
      short_run_moq: 10,           // 5 < 10 triggers premium
      short_run_premium_pct: 100,  // 100% markup
      overhead_pct: 10,
    }));
    expect(r.short_run_premium_applied).toBe(true);
    // overhead = $0.40 × 0.10 × 2.0 = $0.08
    expect(r.per_part_overhead.value).toBeCloseTo(0.08, 4);
  });

  it("source cites AIAG QS-9000 + Sandvik + Kennametal", () => {
    const r = eng.estimate(nominal());
    expect(r.source).toMatch(/AIAG|Sandvik|Kennametal/);
  });
});
