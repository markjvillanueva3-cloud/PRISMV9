/**
 * OpusFastMaxAgentSpecEngine tests -- U-ALPHA-HERMES-GRAPH-IMPROVE.
 *
 * Reference values: opus tier = Sonnet baseline (4k/12k/30k) x (MODEL_COSTS.opus 15 /
 * MODEL_COSTS.sonnet 3 = 5). These are ALGEBRAIC INVARIANTS -- if the ratio source
 * (OpusCapabilityEngine.MODEL_COSTS) or the Sonnet baseline changes, these fail loudly.
 */
import { describe, it, expect } from "vitest";
import { OpusFastMaxAgentSpecEngine } from "../engines/OpusFastMaxAgentSpecEngine.js";
import { MODEL_COSTS } from "../engines/OpusCapabilityEngine.js";
import { SONNET_COST_BY_SIZE } from "../engines/HermesParallelBudgetEnvelopeEngine.js";

describe("OpusFastMaxAgentSpecEngine.opusFastMaxSpec", () => {
  it("emits exactly opus + max + fast (the operator's named settings)", () => {
    const s = OpusFastMaxAgentSpecEngine.opusFastMaxSpec();
    expect(s.model).toBe("opus");
    expect(s.effort).toBe("max");
    expect(s.fastMode).toBe(true);
    expect(s.rationale).toContain("opus");
  });

  it("carries an optional label when supplied; omits it otherwise", () => {
    expect(OpusFastMaxAgentSpecEngine.opusFastMaxSpec("classify-ghosts").label).toBe("classify-ghosts");
    expect(OpusFastMaxAgentSpecEngine.opusFastMaxSpec().label).toBeUndefined();
  });
});

describe("OpusFastMaxAgentSpecEngine.costTableFor -- derived from tier ratio", () => {
  it("sonnet table is byte-identical to the baseline (ratio 1)", () => {
    expect(OpusFastMaxAgentSpecEngine.costTableFor("sonnet")).toEqual(SONNET_COST_BY_SIZE);
  });

  it("opus table is 5x the Sonnet baseline (15/3)", () => {
    const ratio = MODEL_COSTS.opus / MODEL_COSTS.sonnet; // 5
    const t = OpusFastMaxAgentSpecEngine.costTableFor("opus");
    expect(t.short).toBe(SONNET_COST_BY_SIZE.short * ratio); // 20_000
    expect(t.medium).toBe(SONNET_COST_BY_SIZE.medium * ratio); // 60_000
    expect(t.large).toBe(SONNET_COST_BY_SIZE.large * ratio); // 150_000
  });

  it("haiku table is 1/3 the Sonnet baseline, ceil'd to whole tokens (conservative, >=0)", () => {
    const t = OpusFastMaxAgentSpecEngine.costTableFor("haiku");
    // ceil: 4000/3=1333.3 -> 1334 (round UP, never under-report) ; 12000/3=4000 ; 30000/3=10000
    expect(t.short).toBe(1334);
    expect(t.medium).toBe(4000);
    expect(t.large).toBe(10000);
    expect(t.short).toBeGreaterThanOrEqual(0);
  });
});

describe("OpusFastMaxAgentSpecEngine.buildAgentSpecs -- multi-model fleet", () => {
  it("default: all N agents are opus-fast-max", () => {
    const specs = OpusFastMaxAgentSpecEngine.buildAgentSpecs(5);
    expect(specs).toHaveLength(5);
    expect(specs.every((s) => s.model === "opus" && s.effort === "max" && s.fastMode === true)).toBe(true);
  });

  it("tierMix cycles tiers across agents (different parallel hermes agents)", () => {
    const specs = OpusFastMaxAgentSpecEngine.buildAgentSpecs(4, { tierMix: ["opus", "sonnet"] });
    expect(specs.map((s) => s.model)).toEqual(["opus", "sonnet", "opus", "sonnet"]);
  });

  it("labels map per-agent", () => {
    const specs = OpusFastMaxAgentSpecEngine.buildAgentSpecs(2, { labels: ["edges", "ghosts"] });
    expect(specs[0].label).toBe("edges");
    expect(specs[1].label).toBe("ghosts");
  });

  it("rejects count < 1 (no zero-agent fleet)", () => {
    expect(() => OpusFastMaxAgentSpecEngine.buildAgentSpecs(0)).toThrow();
  });

  it("rejects count > 20 (envelope ceiling)", () => {
    expect(() => OpusFastMaxAgentSpecEngine.buildAgentSpecs(21)).toThrow();
  });
});

describe("OpusFastMaxAgentSpecEngine.planParallelism -- budget composition", () => {
  it("all desired opus agents fit a fat budget -> within, spawn=desired", () => {
    // 4 opus-medium = 4x60k=240k; budget 400k -> reserve 40k -> available 360k -> all fit.
    const p = OpusFastMaxAgentSpecEngine.planParallelism({
      remaining_budget_tokens: 400_000,
      desired_agents: 4,
      tier: "opus",
      size_hint: "medium",
      effort: "max",
      fast_mode: true,
    });
    expect(p.verdict.verdict).toBe("within");
    expect(p.recommended_parallel).toBe(4);
    expect(p.spec.model).toBe("opus");
    expect(p.cap_reason).toContain("all desired");
  });

  it("tight budget caps opus parallelism below desired (drastically-increase, budget-bounded)", () => {
    // 10 opus-medium desired; budget 200k -> available 180k; 60k each -> only 3 fit.
    const p = OpusFastMaxAgentSpecEngine.planParallelism({
      remaining_budget_tokens: 200_000,
      desired_agents: 10,
      tier: "opus",
      size_hint: "medium",
      effort: "max",
      fast_mode: true,
    });
    expect(p.recommended_parallel).toBe(3);
    expect(p.verdict.verdict).toBe("over");
    expect(p.cap_reason).toContain("caps");
  });

  it("budget too small for one opus-large -> recommend 0 + refused", () => {
    const p = OpusFastMaxAgentSpecEngine.planParallelism({
      remaining_budget_tokens: 100_000, // available 90k < opus large 150k
      desired_agents: 3,
      tier: "opus",
      size_hint: "large",
    });
    expect(p.recommended_parallel).toBe(0);
    expect(p.verdict.verdict).toBe("refused");
    expect(p.cap_reason).toContain("too small");
  });

  it("zero budget -> recommend 0 (adversarial)", () => {
    const p = OpusFastMaxAgentSpecEngine.planParallelism({
      remaining_budget_tokens: 0,
      desired_agents: 5,
      tier: "opus",
      size_hint: "short",
    });
    expect(p.recommended_parallel).toBe(0);
  });

  it("defaults applied when optionals omitted (tier=opus, size=medium, effort=max, fast=true)", () => {
    const p = OpusFastMaxAgentSpecEngine.planParallelism({
      remaining_budget_tokens: 500_000,
      desired_agents: 2,
    } as never);
    expect(p.spec.model).toBe("opus");
    expect(p.spec.effort).toBe("max");
    expect(p.spec.fastMode).toBe(true);
    expect(p.cost_table.medium).toBe(60_000);
  });

  it("rejects an unknown tier (adversarial -- never reaches cost math)", () => {
    expect(() =>
      OpusFastMaxAgentSpecEngine.planParallelism({
        remaining_budget_tokens: 100_000,
        desired_agents: 2,
        tier: "gpt5" as never,
      } as never),
    ).toThrow();
  });

  it("rejects desired_agents > 20 (adversarial -- over the envelope cap)", () => {
    expect(() =>
      OpusFastMaxAgentSpecEngine.planParallelism({
        remaining_budget_tokens: 10_000_000,
        desired_agents: 50,
        tier: "opus",
      } as never),
    ).toThrow();
  });

  it("renderPlan emits tag + spawn count", () => {
    const p = OpusFastMaxAgentSpecEngine.planParallelism({
      remaining_budget_tokens: 400_000,
      desired_agents: 2,
      tier: "opus",
      size_hint: "medium",
    });
    const md = OpusFastMaxAgentSpecEngine.renderPlan(p);
    expect(md).toContain("[OPUS-FANOUT");
    expect(md).toContain("spawn=2");
    expect(md).toContain("opus/max/fast=true");
  });
});
