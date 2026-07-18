/** HermesParallelBudgetEnvelopeEngine tests — HZP03. */
import { describe, it, expect } from "vitest";
import {
  HermesParallelBudgetEnvelopeEngine,
  type FanoutBudgetRequest,
} from "../engines/HermesParallelBudgetEnvelopeEngine.js";

const req = (over: Partial<FanoutBudgetRequest> = {}): FanoutBudgetRequest => ({
  agents: [
    { agent_id: "a", size_hint: "short" },
    { agent_id: "b", size_hint: "medium" },
  ],
  remaining_budget_tokens: 100_000,
  ...over,
});

describe("HermesParallelBudgetEnvelopeEngine.estimate — happy", () => {
  it("two agents within budget → verdict=within", () => {
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req());
    expect(v.verdict).toBe("within");
    expect(v.max_parallel_fits).toBe(2);
  });

  it("computes total = sum of per-size costs", () => {
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req());
    expect(v.total_estimate_tokens).toBe(4_000 + 12_000);
  });

  it("per_agent_estimate carries agent_id+tokens", () => {
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req());
    expect(v.per_agent_estimate[0].agent_id).toBe("a");
    expect(v.per_agent_estimate[0].tokens).toBe(4_000);
  });

  it("default 10% parent reserve subtracts from available", () => {
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req({ remaining_budget_tokens: 10_000 }));
    expect(v.parent_reserve_tokens).toBe(1_000);
    expect(v.available_tokens).toBe(9_000);
  });

  it("custom parent_reserve_pct honored", () => {
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req({ remaining_budget_tokens: 100_000, parent_reserve_pct: 0.25 }));
    expect(v.parent_reserve_tokens).toBe(25_000);
  });
});

describe("HermesParallelBudgetEnvelopeEngine — degraded + refused", () => {
  it("over budget but some fit → verdict=over + max_parallel_fits>0", () => {
    const agents = [
      { agent_id: "a", size_hint: "short" as const },
      { agent_id: "b", size_hint: "large" as const },
      { agent_id: "c", size_hint: "large" as const },
    ];
    // budget = 20_000 → reserve 2_000 → available 18_000
    // a=4_000 fits, b=30_000 does not → max_parallel_fits = 1
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req({ agents, remaining_budget_tokens: 20_000 }));
    expect(v.verdict).toBe("over");
    expect(v.max_parallel_fits).toBe(1);
  });

  it("nothing fits → verdict=refused, max_parallel_fits=0", () => {
    const agents = [{ agent_id: "a", size_hint: "large" as const }];
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req({ agents, remaining_budget_tokens: 5_000 }));
    expect(v.verdict).toBe("refused");
    expect(v.max_parallel_fits).toBe(0);
  });

  it("zero remaining → refused even on a short agent", () => {
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req({ remaining_budget_tokens: 0 }));
    expect(v.verdict).toBe("refused");
  });
});

describe("HermesParallelBudgetEnvelopeEngine — schema rejection", () => {
  it("rejects empty agents array", () => {
    expect(() => HermesParallelBudgetEnvelopeEngine.estimate(req({ agents: [] }))).toThrow();
  });

  it("rejects unknown size_hint", () => {
    const bad = [{ agent_id: "a", size_hint: "huge" as never }];
    expect(() => HermesParallelBudgetEnvelopeEngine.estimate(req({ agents: bad }))).toThrow();
  });

  it("rejects negative remaining_budget_tokens", () => {
    expect(() => HermesParallelBudgetEnvelopeEngine.estimate(req({ remaining_budget_tokens: -1 }))).toThrow();
  });

  it("rejects parent_reserve_pct > 0.5", () => {
    expect(() => HermesParallelBudgetEnvelopeEngine.estimate(req({ parent_reserve_pct: 0.6 }))).toThrow();
  });

  it("renderVerdict shows tag + numbers", () => {
    const md = HermesParallelBudgetEnvelopeEngine.renderVerdict(HermesParallelBudgetEnvelopeEngine.estimate(req()));
    expect(md.includes("[BUDGET WITHIN]")).toBe(true);
    expect(md.includes("total=")).toBe(true);
    expect(md.includes("fits=")).toBe(true);
  });

  it("rejects a cost_table entry above the 2,000,000 ceiling", () => {
    expect(() =>
      HermesParallelBudgetEnvelopeEngine.estimate(
        req({ cost_table: { short: 20_000, medium: 60_000, large: 3_000_000 } }),
      ),
    ).toThrow();
  });
});

describe("HermesParallelBudgetEnvelopeEngine — cost_table override (U-ALPHA-HERMES-GRAPH-IMPROVE)", () => {
  // Opus tier = Sonnet baseline (4k/12k/30k) x (MODEL_COSTS.opus/MODEL_COSTS.sonnet=5).
  const OPUS = { short: 20_000, medium: 60_000, large: 150_000 } as const;

  it("absent cost_table == Sonnet baseline (back-compat, byte-identical numbers)", () => {
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req());
    // short + medium on the Sonnet table
    expect(v.total_estimate_tokens).toBe(4_000 + 12_000);
  });

  it("opus cost_table sizes each agent 5x the Sonnet baseline", () => {
    const v = HermesParallelBudgetEnvelopeEngine.estimate(req({ cost_table: OPUS }));
    // short=20k + medium=60k
    expect(v.total_estimate_tokens).toBe(20_000 + 60_000);
    expect(v.per_agent_estimate[0].tokens).toBe(20_000);
    expect(v.per_agent_estimate[1].tokens).toBe(60_000);
  });

  it("opus tier flips an otherwise-within fan-out to over (some fit, not all)", () => {
    // 3 medium agents. Sonnet: 3x12k=36k within. Opus: 3x60k=180k.
    const agents = [
      { agent_id: "a", size_hint: "medium" as const },
      { agent_id: "b", size_hint: "medium" as const },
      { agent_id: "c", size_hint: "medium" as const },
    ];
    // budget 150k -> reserve 15k -> available 135k.
    const sonnet = HermesParallelBudgetEnvelopeEngine.estimate(req({ agents, remaining_budget_tokens: 150_000 }));
    expect(sonnet.verdict).toBe("within");
    const opus = HermesParallelBudgetEnvelopeEngine.estimate(req({ agents, remaining_budget_tokens: 150_000, cost_table: OPUS }));
    // 60k+60k=120k fit, +60k=180k>135k -> over, 2 fit.
    expect(opus.verdict).toBe("over");
    expect(opus.max_parallel_fits).toBe(2);
  });

  it("opus tier refuses when not even one agent fits (correct refused semantic)", () => {
    // Two opus-large (150k each) vs available 90k -> nothing fits -> refused.
    const agents = [
      { agent_id: "a", size_hint: "large" as const },
      { agent_id: "b", size_hint: "large" as const },
    ];
    const opus = HermesParallelBudgetEnvelopeEngine.estimate(req({ agents, cost_table: OPUS }));
    expect(opus.verdict).toBe("refused");
    expect(opus.max_parallel_fits).toBe(0);
  });

  it("opus tier with a fat budget degrades gracefully to max_parallel_fits", () => {
    const agents = [
      { agent_id: "a", size_hint: "medium" as const },
      { agent_id: "b", size_hint: "medium" as const },
      { agent_id: "c", size_hint: "medium" as const },
    ];
    // available = 200k - 20k = 180k; opus medium = 60k -> 3 fit exactly
    const v = HermesParallelBudgetEnvelopeEngine.estimate(
      req({ agents, remaining_budget_tokens: 200_000, cost_table: OPUS }),
    );
    expect(v.max_parallel_fits).toBe(3);
    expect(v.verdict).toBe("within");
  });
});
