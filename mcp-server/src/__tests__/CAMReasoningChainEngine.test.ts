/**
 * CAMReasoningChainEngine — CAM-EXHAUST-MS0/U-CAM118 tests
 *
 * Verifies stepwise reasoning-chain synthesis from orchestrator AGIDecision
 * output. Most tests call buildFromDecision directly with literal AGIDecision
 * payloads (the real SUT path) — orchestrator wiring is exercised by the
 * end-to-end test that invokes the REAL CAMDeepLearningOrchestratorEngine
 * with every source disabled to keep network I/O out of the test loop while
 * still hitting production decision-aggregation code.
 *
 * Coverage axes:
 *   - happy-path full chain construction (8 steps for fully-voted decision)
 *   - missing-source handling (skipped step with no_vote error code)
 *   - escalation detection (operator-in-the-loop unconditional rule)
 *   - whyDecision keyword search across summary + detail + evidence
 *   - compareAlternatives ranking with typed rejection reasons
 *   - storage FIFO eviction at maxChains
 *   - chainId uniqueness across rapid sequential calls
 *   - input validation (rejects bad task / non-string prompt / missing decision)
 *   - real CAMDeepLearningOrchestratorEngine decide() integration (all sources
 *     disabled → deterministic abstain decision through production code path)
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CAMReasoningChainEngine } from "../engines/CAMReasoningChainEngine.js";
import {
  CAMDeepLearningOrchestratorEngine,
  type AGIDecision,
  type AGIDecisionTask,
  type SourceKind,
  type SourceVote,
} from "../engines/CAMDeepLearningOrchestratorEngine.js";

// ── Constants (avoid magic numbers) ────────────────────────────────────────

const STEP_COUNT_FULL = 8;
const SOURCE_STEP_COUNT = 4;
const FIFO_CAP_TEST = 3;
const RAPID_CHAIN_COUNT = 100;
const TIMESTAMP_NUDGE_MS = 2;
const STEP_IDX_INPUT_PARSE = 0;
const STEP_IDX_PHYSICS = 1;
const STEP_IDX_OLLAMA = 2;
const STEP_IDX_NVIDIA = 3;
const STEP_IDX_TRIBAL = 4;
const STEP_IDX_AGGREGATION = 5;
const STEP_IDX_ESCALATION = 6;
const STEP_IDX_FINAL = 7;

// ── Test helpers ──────────────────────────────────────────────────────────

const sourceWeight = (source: SourceKind): number => {
  if (source === "physics") return 1.0;
  if (source === "nvidia") return 0.7;
  if (source === "ollama") return 0.6;
  return 0.5;
};

const makeVote = (
  source: SourceKind,
  value: unknown,
  overrides: Partial<SourceVote<unknown>> = {}
): SourceVote<unknown> => ({
  source,
  value,
  confidence: 0.85,
  weight: sourceWeight(source),
  available: true,
  evidence: `${source} evidence text`,
  latencyMs: 42,
  ...overrides,
});

const makeDecision = <V>(
  overrides: Partial<AGIDecision<V>> = {}
): AGIDecision<V> => {
  const base: AGIDecision<unknown> = {
    task: "strategy_recommend",
    value: "trochoidal",
    confidence: 0.81,
    escalateToHuman: false,
    rationale: "physics + nvidia + ollama agreed on trochoidal for Ti-6Al thin wall",
    voices: [
      makeVote("physics", "trochoidal"),
      makeVote("ollama", "trochoidal"),
      makeVote("nvidia", "trochoidal"),
      makeVote("tribal", "trochoidal", { confidence: 0.6 }),
    ],
    totalLatencyMs: 153,
    agreeingSources: ["physics", "ollama", "nvidia", "tribal"],
    dissentingSources: [],
  };
  return { ...base, ...overrides } as AGIDecision<V>;
};

beforeEach(() => {
  CAMReasoningChainEngine.clearChains();
  CAMReasoningChainEngine.setMaxChains(1000);
  CAMReasoningChainEngine.resetOrchestrator();
});

afterEach(() => {
  CAMReasoningChainEngine.clearChains();
  CAMReasoningChainEngine.resetOrchestrator();
});

// ═══════════════════════════════════════════════════════════════════════════
// CHAIN CONSTRUCTION — happy path
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMReasoningChainEngine.buildFromDecision — happy path", () => {
  it("builds an 8-step chain when all 4 sources vote", () => {
    const chain = CAMReasoningChainEngine.buildFromDecision(makeDecision(), {
      task: "strategy_recommend",
      prompt: "thin-wall titanium pocket, 8mm depth",
    });

    expect(chain.steps.length).toBe(STEP_COUNT_FULL);
    expect(chain.steps[STEP_IDX_INPUT_PARSE].kind).toBe("input_parse");
    expect(chain.steps[STEP_IDX_PHYSICS].kind).toBe("physics_check");
    expect(chain.steps[STEP_IDX_PHYSICS].source).toBe("physics");
    expect(chain.steps[STEP_IDX_OLLAMA].kind).toBe("ml_inference");
    expect(chain.steps[STEP_IDX_OLLAMA].source).toBe("ollama");
    expect(chain.steps[STEP_IDX_NVIDIA].kind).toBe("ml_inference");
    expect(chain.steps[STEP_IDX_NVIDIA].source).toBe("nvidia");
    expect(chain.steps[STEP_IDX_TRIBAL].kind).toBe("tribal_lookup");
    expect(chain.steps[STEP_IDX_TRIBAL].source).toBe("tribal");
    expect(chain.steps[STEP_IDX_AGGREGATION].kind).toBe("aggregation");
    expect(chain.steps[STEP_IDX_ESCALATION].kind).toBe("escalation_check");
    expect(chain.steps[STEP_IDX_FINAL].kind).toBe("final_decision");
  });

  it("captures decision value, confidence, and rationale on the chain", () => {
    const chain = CAMReasoningChainEngine.buildFromDecision(
      makeDecision({ value: "adaptive_clearing", confidence: 0.93 }),
      { task: "strategy_recommend", prompt: "open pocket" }
    );
    expect(chain.finalValue).toBe("adaptive_clearing");
    expect(chain.overallConfidence).toBe(0.93);
    expect(chain.rationale).toContain("agreed");
    expect(chain.escalated).toBe(false);
  });

  it("preserves agreeing/dissenting source lists from the orchestrator", () => {
    const chain = CAMReasoningChainEngine.buildFromDecision(
      makeDecision({
        agreeingSources: ["physics", "nvidia"],
        dissentingSources: ["ollama"],
      }),
      { task: "strategy_recommend", prompt: "test" }
    );
    expect(chain.agreeingSources).toEqual(["physics", "nvidia"]);
    expect(chain.dissentingSources).toEqual(["ollama"]);
  });

  it("encodes weight + confidence + rationale evidence on every source step", () => {
    const chain = CAMReasoningChainEngine.buildFromDecision(makeDecision(), {
      task: "strategy_recommend",
      prompt: "test",
    });
    const physicsStep = chain.steps[STEP_IDX_PHYSICS];
    expect(physicsStep.source).toBe("physics");
    expect(physicsStep.confidence).toBe(0.85);
    expect(physicsStep.evidence.find((e) => e.type === "weight")?.description).toMatch(
      /weight=1\.000/
    );
    expect(
      physicsStep.evidence.find((e) => e.description.includes("confidence="))?.description
    ).toMatch(/confidence=0\.850/);
    expect(physicsStep.evidence.find((e) => e.type === "rationale")?.description).toBe(
      "physics evidence text"
    );
  });

  it("stores the chain so getChain returns it byteId", () => {
    const chain = CAMReasoningChainEngine.buildFromDecision(makeDecision(), {
      task: "strategy_recommend",
      prompt: "test",
    });
    const fetched = CAMReasoningChainEngine.getChain(chain.chainId);
    expect(fetched).not.toBeNull();
    expect(fetched?.chainId).toBe(chain.chainId);
    expect(fetched?.steps.length).toBe(STEP_COUNT_FULL);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAILURE MODES — Karpathy edge case discipline
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMReasoningChainEngine — failure modes", () => {
  it("FAILURE 1: handles missing-source vote with no_vote error code", () => {
    const decision = makeDecision({
      voices: [
        makeVote("physics", "adaptive"),
        makeVote("ollama", "adaptive"),
      ],
      agreeingSources: ["physics", "ollama"],
      dissentingSources: [],
    });
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: "strategy_recommend",
      prompt: "p",
    });
    const nvidiaStep = chain.steps[STEP_IDX_NVIDIA];
    const tribalStep = chain.steps[STEP_IDX_TRIBAL];
    expect(nvidiaStep.errorCode).toBe("no_vote");
    expect(nvidiaStep.confidence).toBe(0);
    expect(tribalStep.errorCode).toBe("no_vote");
    expect(tribalStep.summary).toContain("skipped");
  });

  it("FAILURE 2: handles unavailable source with explicit error code", () => {
    const decision = makeDecision({
      voices: [
        makeVote("physics", "trochoidal"),
        makeVote("ollama", null, {
          available: false,
          errorCode: "ollama_timeout",
          confidence: 0,
          evidence: "request timed out after 8000ms",
        }),
        makeVote("nvidia", "trochoidal"),
        makeVote("tribal", "trochoidal", { confidence: 0.5 }),
      ],
    });
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: "strategy_recommend",
      prompt: "test",
    });
    const ollamaStep = chain.steps[STEP_IDX_OLLAMA];
    expect(ollamaStep.summary).toContain("unavailable");
    expect(ollamaStep.summary).toContain("ollama_timeout");
    expect(ollamaStep.errorCode).toBe("ollama_timeout");
    expect(ollamaStep.confidence).toBe(0);
  });

  it("FAILURE 3: marks escalation step when orchestrator flagged escalateToHuman", () => {
    const decision = makeDecision({
      escalateToHuman: true,
      confidence: 0.42,
      rationale: "composite confidence 0.42 below threshold 0.55 — operator review required",
    });
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: "strategy_recommend",
      prompt: "test",
    });
    const escalationStep = chain.steps[STEP_IDX_ESCALATION];
    expect(escalationStep.summary).toMatch(/ESCALATE_TO_HUMAN/);
    expect(escalationStep.confidence).toBe(0);
    expect(chain.escalated).toBe(true);
  });

  it("FAILURE 4: handles abstained decision (value=null) with explicit final step", () => {
    const decision = makeDecision({
      value: null,
      confidence: 0,
      escalateToHuman: true,
      rationale: "no source produced a value — abstain",
      agreeingSources: [],
      dissentingSources: ["physics", "ollama", "nvidia", "tribal"],
    });
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: "strategy_recommend",
      prompt: "underspecified prompt",
    });
    const finalStep = chain.steps[chain.steps.length - 1];
    expect(finalStep.kind).toBe("final_decision");
    expect(finalStep.summary).toContain("ABSTAINED");
    expect(chain.finalValue).toBeNull();
  });

  it("FAILURE 5: rejects null decision with descriptive error", () => {
    expect(() =>
      CAMReasoningChainEngine.buildFromDecision(null as unknown as AGIDecision<unknown>, {
        task: "strategy_recommend",
        prompt: "test",
      })
    ).toThrow(/non-null AGIDecision/);
  });

  it("FAILURE 6: rejects bad task or non-string prompt", () => {
    const decision = makeDecision();
    expect(() =>
      CAMReasoningChainEngine.buildFromDecision(decision, {
        task: 123 as unknown as AGIDecisionTask,
        prompt: "ok",
      })
    ).toThrow(/task must be/);
    expect(() =>
      CAMReasoningChainEngine.buildFromDecision(decision, {
        task: "strategy_recommend",
        prompt: null as unknown as string,
      })
    ).toThrow(/prompt must be a string/);
  });

  it("FAILURE 7: handles empty voices array with all-skipped source steps", () => {
    const decision = makeDecision({
      voices: [],
      value: null,
      confidence: 0,
      escalateToHuman: true,
      agreeingSources: [],
      dissentingSources: [],
    });
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: "strategy_recommend",
      prompt: "test",
    });
    const sourceSteps = chain.steps.filter((s) => s.source !== null);
    expect(sourceSteps.length).toBe(SOURCE_STEP_COUNT);
    expect(sourceSteps.every((s) => s.errorCode === "no_vote")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WHY-DECISION QUERY
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMReasoningChainEngine.whyDecision", () => {
  it("matches steps by keyword in summary, detail, or evidence", () => {
    const chain = CAMReasoningChainEngine.buildFromDecision(makeDecision(), {
      task: "strategy_recommend",
      prompt: "thin-wall titanium pocket",
    });
    const why = CAMReasoningChainEngine.whyDecision(chain.chainId, "trochoidal");
    expect(why.matched).toBe(true);
    expect(why.matchedSteps.length).toBeGreaterThan(0);
    expect(why.confidence).toBeGreaterThan(0);
    expect(why.explanation).toContain("matched");
  });

  it("returns matched=false with explanatory message for missing chain", () => {
    const why = CAMReasoningChainEngine.whyDecision("nonexistent-chain-id", "trochoidal");
    expect(why.matched).toBe(false);
    expect(why.matchedSteps).toEqual([]);
    expect(why.explanation).toContain("not found");
  });

  it("returns matched=false when query has no meaningful tokens", () => {
    const chain = CAMReasoningChainEngine.buildFromDecision(makeDecision(), {
      task: "strategy_recommend",
      prompt: "test",
    });
    const why = CAMReasoningChainEngine.whyDecision(chain.chainId, "the a or with");
    expect(why.matched).toBe(false);
    expect(why.explanation).toContain("no meaningful tokens");
  });

  it("returns matched=false when query doesn't match any step", () => {
    const chain = CAMReasoningChainEngine.buildFromDecision(
      makeDecision({ value: "trochoidal" }),
      { task: "strategy_recommend", prompt: "test" }
    );
    const why = CAMReasoningChainEngine.whyDecision(chain.chainId, "zzznotinchainzzz");
    expect(why.matched).toBe(false);
    expect(why.matchedSteps).toEqual([]);
  });

  it("rejects empty chainId or non-string query", () => {
    expect(() => CAMReasoningChainEngine.whyDecision("", "q")).toThrow(/chainId/);
    expect(() =>
      CAMReasoningChainEngine.whyDecision("id", null as unknown as string)
    ).toThrow(/query must be/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPARE ALTERNATIVES
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMReasoningChainEngine.compareAlternatives", () => {
  it("ranks the highest weighted-score source as winner", () => {
    const decision = makeDecision({
      voices: [
        makeVote("physics", "trochoidal", { confidence: 0.9, weight: 1.0 }),
        makeVote("ollama", "adaptive", { confidence: 0.8, weight: 0.6 }),
        makeVote("nvidia", "trochoidal", { confidence: 0.7, weight: 0.7 }),
        makeVote("tribal", "peel", { confidence: 0.6, weight: 0.5 }),
      ],
      agreeingSources: ["physics", "nvidia"],
      dissentingSources: ["ollama", "tribal"],
    });
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: "strategy_recommend",
      prompt: "test",
    });
    const alts = CAMReasoningChainEngine.compareAlternatives(chain.chainId);
    expect(alts.winner.source).toBe("physics");
    expect(alts.winner.weightedScore).toBeCloseTo(0.9, 5);
    expect(alts.alternatives.length).toBe(SOURCE_STEP_COUNT - 1);
  });

  it("tags rejection reasons correctly: dissent vs lower-confidence vs unavailable", () => {
    const decision = makeDecision({
      voices: [
        makeVote("physics", "trochoidal", { confidence: 0.9, weight: 1.0 }),
        makeVote("ollama", "trochoidal", { confidence: 0.7, weight: 0.6 }),
        makeVote("nvidia", "adaptive", { confidence: 0.6, weight: 0.7 }),
        makeVote("tribal", null, {
          available: false,
          errorCode: "tribal_unavailable",
          confidence: 0,
          evidence: "tribal lookup empty",
        }),
      ],
      agreeingSources: ["physics", "ollama"],
      dissentingSources: ["nvidia"],
    });
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: "strategy_recommend",
      prompt: "test",
    });
    const alts = CAMReasoningChainEngine.compareAlternatives(chain.chainId);
    const reasons = new Map(alts.alternatives.map((a) => [a.source, a.rejectionReason]));
    expect(reasons.get("ollama")).toBe("lower_weighted_confidence");
    expect(reasons.get("nvidia")).toBe("dissented_from_majority");
    expect(reasons.get("tribal")).toBe("source_errored");
  });

  it("flags missing votes as source_unavailable", () => {
    const decision = makeDecision({
      voices: [makeVote("physics", "trochoidal")],
      agreeingSources: ["physics"],
      dissentingSources: [],
    });
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: "strategy_recommend",
      prompt: "test",
    });
    const alts = CAMReasoningChainEngine.compareAlternatives(chain.chainId);
    const missingReasons = alts.alternatives.filter(
      (a) => a.rejectionReason === "source_unavailable"
    );
    expect(missingReasons.length).toBe(SOURCE_STEP_COUNT - 1);
  });

  it("throws on unknown chainId", () => {
    expect(() => CAMReasoningChainEngine.compareAlternatives("nope")).toThrow(/not found/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LIST + STORAGE LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMReasoningChainEngine — storage lifecycle", () => {
  it("listChains returns chains sorted newest-first", async () => {
    for (let i = 0; i < FIFO_CAP_TEST; i++) {
      CAMReasoningChainEngine.buildFromDecision(makeDecision({ value: `strategy-${i}` }), {
        task: "strategy_recommend",
        prompt: `p${i}`,
      });
      await new Promise<void>((resolve) => setTimeout(resolve, TIMESTAMP_NUDGE_MS));
    }
    const list = CAMReasoningChainEngine.listChains();
    expect(list.length).toBe(FIFO_CAP_TEST);
    for (let i = 0; i < list.length - 1; i++) {
      expect(list[i].createdAt).toBeGreaterThanOrEqual(list[i + 1].createdAt);
    }
  });

  it("listChains filter by escalatedOnly drops non-escalated", () => {
    CAMReasoningChainEngine.buildFromDecision(
      makeDecision({ escalateToHuman: false }),
      { task: "strategy_recommend", prompt: "p1" }
    );
    CAMReasoningChainEngine.buildFromDecision(
      makeDecision({ escalateToHuman: true, value: "abstain" }),
      { task: "strategy_recommend", prompt: "p2" }
    );
    const escalated = CAMReasoningChainEngine.listChains({ escalatedOnly: true });
    expect(escalated.length).toBe(1);
    expect(escalated[0].escalated).toBe(true);
  });

  it("listChains filter by task narrows to matching task only", () => {
    CAMReasoningChainEngine.buildFromDecision(makeDecision({ task: "strategy_recommend" }), {
      task: "strategy_recommend",
      prompt: "p1",
    });
    CAMReasoningChainEngine.buildFromDecision(
      makeDecision({ task: "tool_select_advisor" }),
      { task: "tool_select_advisor", prompt: "p2" }
    );
    const filtered = CAMReasoningChainEngine.listChains({ task: "tool_select_advisor" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].task).toBe("tool_select_advisor");
  });

  it("FIFO eviction kicks in at maxChains", () => {
    CAMReasoningChainEngine.setMaxChains(FIFO_CAP_TEST);
    const ids: string[] = [];
    const totalChains = FIFO_CAP_TEST + 2;
    for (let i = 0; i < totalChains; i++) {
      const c = CAMReasoningChainEngine.buildFromDecision(makeDecision(), {
        task: "strategy_recommend",
        prompt: `p${i}`,
      });
      ids.push(c.chainId);
    }
    expect(CAMReasoningChainEngine.listChains().length).toBe(FIFO_CAP_TEST);
    expect(CAMReasoningChainEngine.getChain(ids[0])).toBeNull();
    expect(CAMReasoningChainEngine.getChain(ids[1])).toBeNull();
    expect(CAMReasoningChainEngine.getChain(ids[totalChains - 1])).not.toBeNull();
  });

  it("setMaxChains rejects non-positive values", () => {
    expect(() => CAMReasoningChainEngine.setMaxChains(0)).toThrow(/positive/);
    expect(() => CAMReasoningChainEngine.setMaxChains(-1)).toThrow(/positive/);
    expect(() => CAMReasoningChainEngine.setMaxChains(NaN)).toThrow(/positive/);
  });

  it("chainId values are unique across rapid sequential calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < RAPID_CHAIN_COUNT; i++) {
      const c = CAMReasoningChainEngine.buildFromDecision(makeDecision(), {
        task: "strategy_recommend",
        prompt: "p",
      });
      ids.add(c.chainId);
    }
    expect(ids.size).toBe(RAPID_CHAIN_COUNT);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REAL ORCHESTRATOR INTEGRATION
//
// Hits the actual CAMDeepLearningOrchestratorEngine.decide() with all sources
// disabled — production code path, no network/I/O, deterministic output. This
// is the SUT-level verification that decide() correctly chains the orchestrator
// to chain synthesis through the production wiring.
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMReasoningChainEngine.decide — real orchestrator integration", () => {
  it("produces a valid chain when all orchestrator sources are disabled", async () => {
    // Pre-condition: real orchestrator without source adapters returns
    // an unavailable vote per source — chain engine must still synthesize a
    // well-formed chain marked as escalated.
    CAMDeepLearningOrchestratorEngine.setPhysicsAdapter(null);
    CAMDeepLearningOrchestratorEngine.setTribalAdapter(null);

    const result = await CAMReasoningChainEngine.decide(
      "strategy_recommend",
      "open pocket, A36 steel",
      { disableSources: ["physics", "ollama", "nvidia", "tribal"] }
    );

    expect(result.decision.task).toBe("strategy_recommend");
    expect(result.chain.task).toBe("strategy_recommend");
    expect(result.chain.prompt).toBe("open pocket, A36 steel");
    expect(result.chain.steps.length).toBe(STEP_COUNT_FULL);
    expect(result.chain.escalated).toBe(true);
    expect(result.chain.finalValue).toBeNull();
    // All four source steps should be marked unavailable with errorCode="disabled"
    // (orchestrator emits a vote with available=false + errorCode="disabled" for
    // each source listed in opts.disableSources, see runWith() in the orchestrator).
    const sourceSteps = result.chain.steps.filter((s) => s.source !== null);
    expect(sourceSteps.length).toBe(SOURCE_STEP_COUNT);
    expect(sourceSteps.every((s) => s.errorCode === "disabled")).toBe(true);
    expect(sourceSteps.every((s) => s.confidence === 0)).toBe(true);
  });

  it("propagates options to the real orchestrator (timeoutMs, escalationThreshold)", async () => {
    const result = await CAMReasoningChainEngine.decide(
      "tool_select_advisor",
      "drilling steel",
      {
        disableSources: ["physics", "ollama", "nvidia", "tribal"],
        timeoutMs: 1000,
        escalationThreshold: 0.5,
      }
    );
    expect(result.decision.task).toBe("tool_select_advisor");
    expect(result.chain.task).toBe("tool_select_advisor");
    expect(result.chain.escalated).toBe(true);
  });

  it("orchestrator failure (rejected promise) propagates as a thrown error", async () => {
    // Inject a broken orchestrator adapter (legitimate DI on the chain engine,
    // not on the SUT's domain logic) — verifies error propagation contract.
    CAMReasoningChainEngine.setOrchestrator({
      decide: <V>(): Promise<AGIDecision<V>> => {
        throw new Error("orchestrator network failure");
      },
    });
    await expect(
      CAMReasoningChainEngine.decide("strategy_recommend", "p")
    ).rejects.toThrow(/network failure/);
  });
});
