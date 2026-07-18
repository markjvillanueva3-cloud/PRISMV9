/**
 * ToolCostAmortizationEngine — per-part tool cost amortization
 *
 * Closes the iter20 P1 "tool cost amortization" gap. Quoting + ERP need accurate
 * per-part tool cost, including:
 *   - Insert/end-mill replacement cost (purchase price ÷ expected tool life)
 *   - Resharpen credit for HSS/carbide-shank tools (Cogsdill, Tungaloy resharpening)
 *   - Multi-tool jobs (sum across N tools used per part)
 *   - Setup amortization (one-time setup cost spread across batch quantity)
 *   - Premium markup for short-run jobs (under MOQ threshold)
 *
 * Formula:
 *   per_part_tool_cost = Σᵢ (cost_per_edge_i / parts_per_edge_i)
 *   per_part_setup    = setup_cost / batch_qty
 *   total_per_part    = per_part_tool_cost + per_part_setup + overhead × tool_cost
 *
 * Reference: AIAG QS-9000 Tooling Reimbursement §3; Sandvik Coromant Tooling
 *   Economy Guide §B-2; Kennametal Insert Economics §4; Modern Machine Shop
 *   "Tool Cost per Part" 2018 series. Industry rule-of-thumb: tool cost should
 *   be ≤ 3-5% of part sell price in production manufacturing (Kennametal).
 *
 * @version 1.0.0
 * @module ToolCostAmortizationEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface ToolUsage {
  tool_id: string;
  /** Tool acquisition cost (USD) — replacement, not initial fleet */
  cost_usd: number;
  /** Number of usable edges per tool (insert: 2-8 typically; end mill: 1) */
  edges_per_tool: number;
  /** Parts produced per edge before re-index/replacement */
  parts_per_edge: number;
  /** Resharpen credit per edge (USD, optional for HSS/PCBN) */
  resharpen_credit_usd?: number;
}

export interface ToolCostAmortizationInput {
  /** Tools used on this part */
  tools: ToolUsage[];
  /** Batch quantity for setup amortization */
  batch_qty: number;
  /** One-time setup cost USD (fixturing, programming, FAI) */
  setup_cost_usd: number;
  /** Overhead burden on tool cost (markup %, default 15) */
  overhead_pct?: number;
  /** Short-run MOQ threshold (default 50) — below triggers premium */
  short_run_moq?: number;
  /** Short-run premium markup % (default 25) */
  short_run_premium_pct?: number;
}

export interface ToolCostAmortizationResult {
  per_part_tool_cost: AtomicValue;
  per_part_setup_cost: AtomicValue;
  per_part_overhead: AtomicValue;
  per_part_total: AtomicValue;
  /** Per-tool breakdown */
  tool_breakdown: Array<{ tool_id: string; per_part_cost_usd: number; pct_of_total: number }>;
  /** True when batch_qty < short_run_moq, premium applied */
  short_run_premium_applied: boolean;
  warnings: string[];
  source: string;
}

export class ToolCostAmortizationEngine {
  estimate(input: ToolCostAmortizationInput): ToolCostAmortizationResult {
    if (!input || !input.tools || input.tools.length === 0) {
      throw new Error("ToolCostAmortizationEngine.estimate: tools[] required (non-empty)");
    }
    if (input.batch_qty <= 0) {
      throw new Error("ToolCostAmortizationEngine.estimate: positive batch_qty required");
    }
    if (input.setup_cost_usd < 0) {
      throw new Error("ToolCostAmortizationEngine.estimate: non-negative setup_cost_usd required");
    }

    const warnings: string[] = [];
    const overheadPct = input.overhead_pct ?? 15;
    const shortRunMoq = input.short_run_moq ?? 50;
    const shortRunPremiumPct = input.short_run_premium_pct ?? 25;

    // ── Per-tool amortization ─────────────────────────────────────────
    let perPartToolCost = 0;
    const toolBreakdown: ToolCostAmortizationResult["tool_breakdown"] = [];

    for (const tool of input.tools) {
      if (tool.cost_usd <= 0) {
        throw new Error(`ToolCostAmortizationEngine.estimate: tool ${tool.tool_id} cost_usd must be positive`);
      }
      if (tool.edges_per_tool <= 0 || tool.parts_per_edge <= 0) {
        throw new Error(`ToolCostAmortizationEngine.estimate: tool ${tool.tool_id} edges_per_tool + parts_per_edge must be positive`);
      }

      const resharpenCredit = tool.resharpen_credit_usd ?? 0;
      const netCostPerEdge = (tool.cost_usd / tool.edges_per_tool) - resharpenCredit;
      if (netCostPerEdge < 0) {
        warnings.push(`Tool ${tool.tool_id}: resharpen credit exceeds new-edge cost — verify resharpen_credit_usd input`);
      }
      const perPartCost = Math.max(netCostPerEdge, 0) / tool.parts_per_edge;
      perPartToolCost += perPartCost;
      toolBreakdown.push({ tool_id: tool.tool_id, per_part_cost_usd: Number(perPartCost.toFixed(4)), pct_of_total: 0 });
    }

    // Backfill pct_of_total
    if (perPartToolCost > 0) {
      for (const t of toolBreakdown) {
        t.pct_of_total = Number((t.per_part_cost_usd / perPartToolCost * 100).toFixed(1));
      }
    }

    // ── Setup amortization ────────────────────────────────────────────
    const perPartSetup = input.setup_cost_usd / input.batch_qty;

    // ── Overhead ──────────────────────────────────────────────────────
    let perPartOverhead = perPartToolCost * (overheadPct / 100);

    // ── Short-run premium ─────────────────────────────────────────────
    const shortRunApplied = input.batch_qty < shortRunMoq;
    let premiumMultiplier = 1.0;
    if (shortRunApplied) {
      premiumMultiplier = 1 + shortRunPremiumPct / 100;
      perPartOverhead = perPartOverhead * premiumMultiplier;
      warnings.push(`Batch ${input.batch_qty} < MOQ ${shortRunMoq} — ${shortRunPremiumPct}% short-run premium applied to overhead`);
    }

    const perPartTotal = perPartToolCost + perPartSetup + perPartOverhead;

    // ── Tool-cost ratio sanity check (Kennametal: ≤ 5% of sell price) ──
    if (perPartToolCost > 50) {
      warnings.push(`Per-part tool cost $${perPartToolCost.toFixed(2)} is high — verify tool-life inputs (Kennametal §4: target ≤ 3-5% of sell price)`);
    }

    return {
      per_part_tool_cost: {
        value: Number(perPartToolCost.toFixed(4)),
        unit: "USD/part",
        source: "Σ (net_cost_per_edge / parts_per_edge) per tool",
      },
      per_part_setup_cost: {
        value: Number(perPartSetup.toFixed(4)),
        unit: "USD/part",
        source: "setup_cost / batch_qty",
      },
      per_part_overhead: {
        value: Number(perPartOverhead.toFixed(4)),
        unit: "USD/part",
        source: `tool_cost × ${overheadPct}%${shortRunApplied ? ` × ${premiumMultiplier.toFixed(2)} short-run` : ""}`,
      },
      per_part_total: {
        value: Number(perPartTotal.toFixed(4)),
        unit: "USD/part",
        source: "tool + setup + overhead",
      },
      tool_breakdown: toolBreakdown,
      short_run_premium_applied: shortRunApplied,
      warnings,
      source: "ToolCostAmortizationEngine — AIAG QS-9000 §3 + Sandvik Tooling Economy §B-2 + Kennametal §4",
    };
  }
}

export const toolCostAmortizationEngine = new ToolCostAmortizationEngine();
