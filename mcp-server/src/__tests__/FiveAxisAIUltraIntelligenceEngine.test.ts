/**
 * FiveAxisAIUltraIntelligenceEngine tests — MILL-MASTER-AI-WIRING / U3-5AX-ULTRA
 *
 * Retrofit of the "ultra intelligence" chain onto the PRISM AI stack:
 *   prismCreativeReasoningEngine.explore
 *     → deepAIIntelligenceEngine.deepReason
 *     → metaAIOrchestrationEngine.evaluateReasoning
 *   (with neuralIntegrationEngine.route for downstream engine routing)
 *
 * Spike-gate invariants per envelope:
 *   - happy path across 3 CreativeModes (conventional / exploratory / innovative)
 *   - 3 failure modes (empty query, oversize context, invalid mode) — no throws
 *   - 2 adversarial inputs (NaN confidence threshold, infinite depth) — no throws
 *   - useAI='off' bit-identical to legacy processNaturalLanguage.
 *   - useAI='on' p95 < 500 ms per envelope global_contracts.latency_budgets_ms.
 *
 * >= 20 assertions required; NO mocks — real PRISM engines under test.
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U3-5AX-ULTRA)
 */

import { describe, it, expect } from "vitest";
import {
  FiveAxisAIUltraIntelligenceEngine,
} from "../engines/FiveAxisAIUltraIntelligenceEngine.js";

const AI_WALL_CLOCK_CEILING_MS = 500;

/**
 * parseNaturalLanguage stamps a `parsed_at: new Date().toISOString()` on every
 * call. Two back-to-back calls reliably differ by microseconds, so deep-equal
 * on the raw objects would be flaky. Strip the timestamp for equivalence
 * comparison without losing coverage on the rest of the NLReasoning shape.
 */
function stripParsedAt<T extends { intent: { parsed_at?: string } }>(r: T): T {
  const clone = JSON.parse(JSON.stringify(r)) as T;
  if (clone.intent) clone.intent.parsed_at = "FROZEN";
  return clone;
}

describe("FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra — useAI:'off'", () => {
  it("returns a result whose .nl deep-equals the sync processNaturalLanguage output", async () => {
    const input = "finish an aluminum impeller blade with Ra 0.8";
    const legacy = FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage(input);
    const ultra = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      input,
      { useAI: "off" },
    );

    expect(stripParsedAt(ultra.nl)).toEqual(stripParsedAt(legacy));
    // ai side-channel MUST be absent for useAI='off' (additive-only contract).
    expect(ultra.ai).toBe(undefined);
    expect("ai" in ultra ? ultra.ai === undefined : true).toBe(true);
  });

  it("omitting useAI is equivalent to useAI:'off'", async () => {
    const input = "rough a steep wall in 4140 steel";
    const a = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(input);
    const b = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      input,
      { useAI: "off" },
    );
    expect(stripParsedAt(a.nl)).toEqual(stripParsedAt(b.nl));
    expect(a.ai).toBe(undefined);
    expect(b.ai).toBe(undefined);
  });
});

describe("FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra — 3 reasoning modes", () => {
  it("mode='conventional' invokes the full AI pipeline and populates ai.*", async () => {
    const out = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      "finish a ruled surface in P20 tool steel",
      { useAI: "on", mode: "conventional" },
    );
    expect(out.nl.intent.raw_input).toBe("finish a ruled surface in P20 tool steel");

    // AI side-channel must be a populated object.
    expect(typeof out.ai).toBe("object");
    expect(out.ai === null).toBe(false);
    const ai = out.ai!;
    expect(ai.creative_mode).toBe("conventional");
    expect(Array.isArray(ai.creative_solutions)).toBe(true);
    expect(typeof ai.deep_conclusion).toBe("string");
    expect(ai.deep_conclusion.length).toBeGreaterThan(0);
    expect(ai.reasoning_quality_score).toBeGreaterThanOrEqual(0);
    expect(ai.reasoning_quality_score).toBeLessThanOrEqual(1);
    expect(Array.isArray(ai.detected_biases)).toBe(true);
    expect(ai.sources.length).toBeGreaterThanOrEqual(2);
  });

  it("mode='exploratory' surfaces >= 1 creative solution with matching mode label", async () => {
    const input = "adaptive rough a deep cavity in H13 at Rc 52";
    const expl = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      input,
      { useAI: "on", mode: "exploratory" },
    );
    expect(expl.ai!.creative_mode).toBe("exploratory");
    expect(expl.ai!.creative_solutions.length).toBeGreaterThanOrEqual(1);
    // Every solution has a non-empty approach string.
    for (const s of expl.ai!.creative_solutions) {
      expect(typeof s.approach).toBe("string");
      expect(s.approach.length).toBeGreaterThan(0);
    }
  });

  it("mode='innovative' cites all three PRISM-AI pipeline stages in sources[]", async () => {
    const out = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      "novel freeform surface finish with barrel cutter",
      { useAI: "on", mode: "innovative" },
    );
    expect(out.ai!.creative_mode).toBe("innovative");
    const sources = out.ai!.sources;
    expect(sources.some(s => /creative_reasoning/.test(s))).toBe(true);
    expect(sources.some(s => /deep_ai_intelligence/.test(s))).toBe(true);
    expect(sources.some(s => /meta_ai_orchestration/.test(s))).toBe(true);
  });
});

describe("FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra — 3 failure modes", () => {
  it("empty query does not throw and still produces a structurally-valid legacy result", async () => {
    const out = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      "",
      { useAI: "on", mode: "conventional" },
    );
    expect(out.nl.intent.raw_input).toBe("");
    expect(typeof out.nl.reasoning.total_confidence).toBe("number");
    expect(Number.isFinite(out.nl.reasoning.total_confidence)).toBe(true);
  });

  it("oversize query (10 KB) does not throw and bounds legacy reasoning steps to <= 8", async () => {
    const big = "finish an impeller ".repeat(500);
    const out = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      big,
      { useAI: "on", mode: "exploratory" },
    );
    expect(out.nl.intent.raw_input.length).toBeGreaterThan(5000);
    expect(out.nl.reasoning.steps.length).toBeGreaterThanOrEqual(5);
    expect(out.nl.reasoning.steps.length).toBeLessThanOrEqual(8);
  });

  it("invalid mode string falls back to a safe default without throwing", async () => {
    const out = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      "finish a ruled surface",
      { useAI: "on", mode: "not_a_valid_mode" as unknown as "conventional" },
    );
    // Either ai ran with a safe fallback mode, or ai is absent — never a throw.
    if (out.ai) {
      expect([
        "conventional",
        "exploratory",
        "unconventional",
        "hybrid",
        "innovative",
        "optimal",
      ]).toContain(out.ai.creative_mode);
    }
    expect(out.nl.intent.raw_input).toBe("finish a ruled surface");
  });
});

describe("FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra — adversarial inputs", () => {
  it("NaN confidence threshold produces a bounded [0,1] reasoning_quality_score", async () => {
    const out = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      "rough a pocket in aluminum",
      { useAI: "on", mode: "conventional", confidenceThreshold: Number.NaN },
    );
    if (out.ai) {
      expect(Number.isFinite(out.ai.reasoning_quality_score)).toBe(true);
      expect(out.ai.reasoning_quality_score).toBeGreaterThanOrEqual(0);
      expect(out.ai.reasoning_quality_score).toBeLessThanOrEqual(1);
    }
    // Legacy path always produces a finite confidence regardless of opts.
    expect(Number.isFinite(out.nl.reasoning.total_confidence)).toBe(true);
  });

  it("extreme maxReasoningDepth (1e9) is clamped, call completes in < 2 s", async () => {
    const t0 = performance.now();
    const out = await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      "adaptive rough a port",
      { useAI: "on", mode: "conventional", maxReasoningDepth: 1e9 },
    );
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(2000);
    expect(out.nl.intent.raw_input).toBe("adaptive rough a port");
  });
});

describe("FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra — latency ceiling", () => {
  it("useAI:'on' conventional mode single-call wall clock < 500 ms", async () => {
    const t = performance.now();
    await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      "finish a ruled surface in P20 tool steel",
      { useAI: "on", mode: "conventional" },
    );
    expect(performance.now() - t).toBeLessThan(AI_WALL_CLOCK_CEILING_MS);
  });

  it("useAI:'off' single-call wall clock < 50 ms (legacy path only)", async () => {
    const t = performance.now();
    await FiveAxisAIUltraIntelligenceEngine.processNaturalLanguageUltra(
      "finish a ruled surface in P20 tool steel",
      { useAI: "off" },
    );
    expect(performance.now() - t).toBeLessThan(50);
  });
});
