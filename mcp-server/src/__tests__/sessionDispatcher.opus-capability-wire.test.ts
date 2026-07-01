/**
 * U-OPUS-CAPABILITY-WIRE — wire the orphaned OpusCapabilityEngine (0 dispatcher refs;
 * stop_on_unwired_assets) into sessionDispatcher (prism_session) as opus_assess_complexity
 * + opus_stats. Round-trips the REAL dispatcher (registerSessionDispatcher → fakeServer
 * handler) through the PURE, deterministic model-tier complexity router and asserts the tier
 * recommendation + factor breakdown + stats shape land in the JSON response. No mocks of the SUT.
 *
 * The LLM-backed execute() entry is intentionally NOT wired/tested here — it needs a live
 * Anthropic client + a separate integration-test harness (follow-up U-OPUS-EXECUTE-WIRE).
 *
 * slot:bravo /loop (2026-06-02, claude-5e210e4e) — hermes-zulu mandate (model orchestration:
 * "which tier should answer this" is a routing decision).
 * @module __tests__/sessionDispatcher.opus-capability-wire
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

describe("prism_session::opus_assess_complexity + opus_stats (OpusCapabilityEngine round-trip)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = {
      tool: (_n: string, _d: string, _s: unknown, handler: Handler) => {
        captured = handler;
      },
    };
    registerSessionDispatcher(fakeServer);
    if (!captured) throw new Error("registerSessionDispatcher did not register the prism_session tool");
    const h = captured;
    invoke = async (action, params = {}) =>
      JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  it("routes a complex physics/formula request to the opus tier (score clamps to 1)", async () => {
    const r = await invoke("opus_assess_complexity", {
      request: {
        category: "formula_derivation",
        intent: "derive step by step the kienzle cutting force with safety critical precision across physics and business domains",
        context: { stress: 1, cost: 1 },
      },
    });
    const a = r.assessment as {
      score: number;
      recommended_tier: string;
      reasoning: string;
      factors: { physics_required: boolean; safety_critical: boolean; cross_domain: boolean; business_logic: boolean };
    };
    // 0.2(steps)+0.15(physics)+0.1(business)+0.15(cross)+0.2(novel)+0.15(safety)+0.1(precision)+0.25(formula_derivation) = 1.3, clamped to 1.
    expect(a.score).toBe(1);
    expect(a.recommended_tier).toBe("opus");
    expect(typeof a.reasoning).toBe("string");
    expect(a.factors.physics_required).toBe(true); // "kienzle","force"
    expect(a.factors.safety_critical).toBe(true); // "safety","critical"
    expect(a.factors.cross_domain).toBe(true); // physics + business
    expect(a.factors.business_logic).toBe(true); // "cost"
  });

  it("routes a trivial request to the haiku tier, strictly lower than the complex one", async () => {
    const r = await invoke("opus_assess_complexity", {
      request: { category: "nl_to_structured", intent: "hello", context: {} },
    });
    const a = r.assessment as { score: number; recommended_tier: string; factors: { physics_required: boolean } };
    expect(a.score).toBeLessThan(1);
    expect(a.score).toBeLessThanOrEqual(0.3); // COMPLEXITY_THRESHOLDS.simple → haiku
    expect(a.recommended_tier).toBe("haiku");
    expect(a.factors.physics_required).toBe(false);
  });

  it("opus_stats returns the well-formed usage-counter object", async () => {
    const r = await invoke("opus_stats");
    const s = r.stats as {
      total_requests: number;
      requests_by_tier: Record<string, number>;
      tier_distribution: Record<string, number>;
    };
    // assess_complexity is pure (does NOT increment stats) → counters are valid zeros, not dropped
    // by slimResponse (it drops only null/undefined + empty arrays, never 0 or empty objects).
    expect(typeof s.total_requests).toBe("number");
    expect(s.total_requests).toBeGreaterThanOrEqual(0);
    expect(s.requests_by_tier).toHaveProperty("haiku");
    expect(s.requests_by_tier).toHaveProperty("sonnet");
    expect(s.requests_by_tier).toHaveProperty("opus");
    expect(s.tier_distribution).toHaveProperty("opus");
  });
});
