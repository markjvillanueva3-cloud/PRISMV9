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
});
