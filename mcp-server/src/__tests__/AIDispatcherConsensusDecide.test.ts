/**
 * AI Dispatcher — `consensus_decide` action
 * ==========================================
 * Tests for INFRA-CONSENSUS-WIRE-MS0 / P0-U01.
 *
 * Verifies:
 *   1. Schema validation — happy path + 4 envelope-mandated failure paths.
 *   2. Dispatcher round-trip — params correctly map to engine ConsensusInput.
 *   3. Contract promises declared in schema describe() are honored:
 *        - sandboxBudget takes precedence over timeoutMs when both present
 *        - voices toggles include{Claude,Grok,Gemini} faithfully
 *        - options presence flips mode to "vote", absence to "compare"
 *        - meetsCallerThreshold = (agreementScore >= agreementThreshold)
 *
 * Engine `multiModelConsensusEngine.ask` is mocked so we exercise the
 * dispatcher contract only — no real fan-out happens here.
 *
 * @module __tests__/AIDispatcherConsensusDecide
 * @milestone INFRA-CONSENSUS-WIRE-MS0/P0-U01
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConsensusResult } from "../engines/MultiModelConsensusEngine.js";

// Mock the engine module so the dispatcher's dynamic `await import(...)` for it
// resolves to a stub without dragging in its full import chain (the real engine
// references PRISMContextInjectorEngine which is currently absent from the tree —
// pre-existing breakage outside P0-U01 scope). Our contract test only needs
// `multiModelConsensusEngine.ask` to be a callable vi.fn we can drive.
vi.mock("../engines/MultiModelConsensusEngine.js", () => ({
  multiModelConsensusEngine: {
    ask: vi.fn(),
  },
}));

import { multiModelConsensusEngine } from "../engines/MultiModelConsensusEngine.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { ACTION_AI_REASONING_SCHEMAS, AI_REASONING_ACTIONS } from "../schemas/aiReasoningActionSchemas.js";

/** Typed handle on the vi-mocked ask() — vi.mocked preserves the signature. */
const mockedAsk = vi.mocked(multiModelConsensusEngine.ask);

/** Build a deterministic ConsensusResult for the mock to resolve with. */
function mkResult(overrides: Partial<ConsensusResult> = {}): ConsensusResult {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: true, answer: "alpha", latencyMs: 1200, tokens: 14, error: null },
      { model: "deepseek-r1:14b", vendor: "ollama", ok: true, answer: "alpha", latencyMs: 1800, tokens: 9, error: null },
    ],
    successCount: 2,
    agreementScore: 0.85,
    consensus: { answer: "alpha", voters: ["gpt-5.5", "deepseek-r1:14b"], confidence: 0.85 },
    recommendation: "accept",
    totalLatencyMs: 1900,
    factCheck: {},
    ...overrides,
  };
}

describe("aiReasoningDispatcher — consensus_decide schema (P0-U01)", () => {
  const schema = ACTION_AI_REASONING_SCHEMAS["consensus_decide"];

  it("accepts a fully-populated happy-path payload", () => {
    const result = schema.safeParse({
      question: "Should we use Kienzle or Johnson-Cook for Ti-6Al-4V?",
      options: ["kienzle", "johnson-cook"],
      voices: ["claude", "codex", "ollama"],
      agreementThreshold: 0.75,
      sandboxBudget: 30_000,
      taskType: "physics_model_select",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the minimal payload — just question + voices (mode defaults to compare)", () => {
    const result = schema.safeParse({
      question: "Best chip-thinning compensation factor for trochoidal at 25% radial?",
      voices: ["codex", "ollama"],
    });
    expect(result.success).toBe(true);
  });

  // Envelope failure path #1: empty options array
  it("rejects empty options[] (must be ≥2 when present)", () => {
    const result = schema.safeParse({
      question: "Pick one",
      options: [],
      voices: ["claude", "codex"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.issues);
      expect(msg).toMatch(/options/);
    }
  });

  // Envelope failure path #2: NaN threshold (z.number().finite() rejects)
  it("rejects NaN agreementThreshold (must be finite)", () => {
    const result = schema.safeParse({
      question: "Pick one",
      voices: ["codex", "ollama"],
      agreementThreshold: Number.NaN,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.issues);
      expect(msg).toMatch(/agreementThreshold|finite|nan/i);
    }
  });

  // Envelope failure path #3: voices not subset of allowed set
  it("rejects voices containing a non-enum value", () => {
    const result = schema.safeParse({
      question: "Pick one",
      voices: ["claude", "gpt4-fake-voice"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.issues);
      expect(msg).toMatch(/voices|enum/i);
    }
  });

  // Envelope failure path #4: voices length below minimum
  it("rejects voices.length < 2", () => {
    const result = schema.safeParse({
      question: "Pick one",
      voices: ["codex"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.issues);
      expect(msg).toMatch(/voices|too_small|min|at least/i);
    }
  });

  it("rejects agreementThreshold > 1 (must be ≤ 1)", () => {
    const result = schema.safeParse({
      question: "Pick one",
      voices: ["codex", "ollama"],
      agreementThreshold: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects timeoutMs above the 10-minute cap", () => {
    const result = schema.safeParse({
      question: "Pick one",
      voices: ["codex", "ollama"],
      timeoutMs: 86_400_000, // 24h — must be rejected to prevent DoS
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.issues);
      expect(msg).toMatch(/timeoutMs|too_big|max/i);
    }
  });

  it("rejects sandboxBudget below the 1-second floor", () => {
    const result = schema.safeParse({
      question: "Pick one",
      voices: ["codex", "ollama"],
      sandboxBudget: 500,
    });
    expect(result.success).toBe(false);
  });

  it("applies agreementThreshold default of 0.70 when caller omits the field", () => {
    // Schema declares .default(0.70). Verify parse output materializes the default
    // — this is the load-bearing contract for callers that just want to gate at
    // the engine's accept threshold without doing their own math.
    const parsed = schema.parse({
      question: "minimal call without threshold",
      voices: ["codex", "ollama"],
    }) as { agreementThreshold: number };
    expect(parsed.agreementThreshold).toBe(0.70);
  });

  it("registers `consensus_decide` in AI_REASONING_ACTIONS and the schema map (1:1 keying)", () => {
    expect(AI_REASONING_ACTIONS).toContain("consensus_decide");
    expect(ACTION_AI_REASONING_SCHEMAS).toHaveProperty("consensus_decide");
    // Anti-regression: action list and schema map keys must match cardinality.
    expect(AI_REASONING_ACTIONS.length).toBe(Object.keys(ACTION_AI_REASONING_SCHEMAS).length);
  });
});

describe("aiReasoningDispatcher — consensus_decide round-trip (P0-U01)", () => {
  beforeEach(() => {
    mockedAsk.mockReset();
  });

  it("dispatches successfully and returns engine fields + meetsCallerThreshold", async () => {
    mockedAsk.mockResolvedValue(mkResult({ agreementScore: 0.85 }));
    const res = await executeAIReasoningAction("consensus_decide", {
      question: "Pick the best roughing strategy for Ti-6Al-4V at 32 HRC",
      options: ["trochoidal", "adaptive_clearing"],
      voices: ["claude", "codex", "ollama"],
      agreementThreshold: 0.70,
    });
    expect(res.success).toBe(true);
    const data = res.data as { agreementScore: number; meetsCallerThreshold: boolean; callerAgreementThreshold: number; mode: string };
    expect(data.agreementScore).toBe(0.85);
    expect(data.meetsCallerThreshold).toBe(true); // 0.85 >= 0.70
    expect(data.callerAgreementThreshold).toBe(0.70);
    expect(mockedAsk).toHaveBeenCalledTimes(1);
  });

  it("translates voices[] → include{Claude,Grok,Gemini} faithfully (claude+codex+ollama only → grok/gemini off)", async () => {
    mockedAsk.mockResolvedValue(mkResult());
    await executeAIReasoningAction("consensus_decide", {
      question: "q",
      voices: ["claude", "codex", "ollama"],
    });
    const call = mockedAsk.mock.calls[0]?.[0];
    expect(call?.includeClaude).toBe(true);
    expect(call?.includeGrok).toBe(false);
    expect(call?.includeGemini).toBe(false);
  });

  it("turns on grok + gemini when voices includes them; turns off claude when omitted", async () => {
    mockedAsk.mockResolvedValue(mkResult());
    await executeAIReasoningAction("consensus_decide", {
      question: "q",
      voices: ["codex", "ollama", "grok", "gemini"],
    });
    const call = mockedAsk.mock.calls[0]?.[0];
    expect(call?.includeClaude).toBe(false);
    expect(call?.includeGrok).toBe(true);
    expect(call?.includeGemini).toBe(true);
  });

  it("maps options[] → mode='vote' + voteOptions; absence → mode='compare'", async () => {
    mockedAsk.mockResolvedValue(mkResult());

    await executeAIReasoningAction("consensus_decide", {
      question: "q",
      options: ["a", "b"],
      voices: ["codex", "ollama"],
    });
    expect(mockedAsk.mock.calls[0]?.[0]?.mode).toBe("vote");
    expect(mockedAsk.mock.calls[0]?.[0]?.voteOptions).toEqual(["a", "b"]);

    await executeAIReasoningAction("consensus_decide", {
      question: "q",
      voices: ["codex", "ollama"],
    });
    expect(mockedAsk.mock.calls[1]?.[0]?.mode).toBe("compare");
  });

  it("sandboxBudget takes precedence over timeoutMs when both are set (contract promise)", async () => {
    mockedAsk.mockResolvedValue(mkResult());
    await executeAIReasoningAction("consensus_decide", {
      question: "q",
      voices: ["codex", "ollama"],
      sandboxBudget: 5_000,
      timeoutMs: 300_000,
    });
    expect(mockedAsk.mock.calls[0]?.[0]?.timeoutMs).toBe(5_000);
  });

  it("falls back to timeoutMs when sandboxBudget is absent", async () => {
    mockedAsk.mockResolvedValue(mkResult());
    await executeAIReasoningAction("consensus_decide", {
      question: "q",
      voices: ["codex", "ollama"],
      timeoutMs: 45_000,
    });
    expect(mockedAsk.mock.calls[0]?.[0]?.timeoutMs).toBe(45_000);
  });

  it("computes meetsCallerThreshold=false when caller's threshold exceeds engine agreementScore", async () => {
    mockedAsk.mockResolvedValue(mkResult({ agreementScore: 0.55 }));
    const res = await executeAIReasoningAction("consensus_decide", {
      question: "q",
      voices: ["codex", "ollama"],
      agreementThreshold: 0.90,
    });
    expect(res.success).toBe(true);
    const data = res.data as { meetsCallerThreshold: boolean; recommendation: string };
    expect(data.meetsCallerThreshold).toBe(false);
    // recommendation still comes from engine (it would return "review" for 0.55 — preserved verbatim)
    expect(["accept", "review", "escalate"]).toContain(data.recommendation);
  });

  it("forwards taskType / persist / prismContext / usePerformanceWeights when provided", async () => {
    mockedAsk.mockResolvedValue(mkResult());
    await executeAIReasoningAction("consensus_decide", {
      question: "q",
      voices: ["codex", "ollama"],
      taskType: "safety_gate",
      persist: false,
      prismContext: false,
      usePerformanceWeights: true,
    });
    const call = mockedAsk.mock.calls[0]?.[0];
    expect(call?.taskType).toBe("safety_gate");
    expect(call?.persist).toBe(false);
    expect(call?.prismContext).toBe(false);
    expect(call?.usePerformanceWeights).toBe(true);
  });

  it("appends context verbatim to the engine call when provided", async () => {
    mockedAsk.mockResolvedValue(mkResult());
    await executeAIReasoningAction("consensus_decide", {
      question: "Pick one",
      voices: ["codex", "ollama"],
      context: "Ti-6Al-4V, 1/2\" 4FL endmill, RPM 6000, ae 25%",
    });
    expect(mockedAsk.mock.calls[0]?.[0]?.context).toBe("Ti-6Al-4V, 1/2\" 4FL endmill, RPM 6000, ae 25%");
  });

  it("returns a dispatcher error on schema-rejected params (without ever calling the engine)", async () => {
    mockedAsk.mockResolvedValue(mkResult());
    const res = await executeAIReasoningAction("consensus_decide", {
      // missing voices — required
      question: "q",
    });
    expect(res.success).toBe(false);
    expect(res.error ?? "").toMatch(/voices|invalid/i);
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it("surfaces engine failures as dispatcher errors (not thrown)", async () => {
    mockedAsk.mockRejectedValue(new Error("all voices timed out"));
    const res = await executeAIReasoningAction("consensus_decide", {
      question: "q",
      voices: ["codex", "ollama"],
    });
    expect(res.success).toBe(false);
    expect(res.error ?? "").toMatch(/timed out|voices/i);
  });
});
