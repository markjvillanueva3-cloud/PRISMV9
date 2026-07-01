/**
 * TwoPassCascadeEngine + prism_ai:two_pass dispatcher round-trip
 * =====================================================================
 * COST-CASCADE-MS0 / U-DISPATCHER-ACTION-TWO-PASS.
 *
 * Covers the engine control logic (pure, injected fake tentacles) AND the
 * `prism_ai:two_pass` dispatcher wiring (round-trip through
 * executeAIReasoningAction with the Ollama model server mocked — the model
 * server is an EXTERNAL dependency; the cascade + the dispatcher wiring are
 * the real systems under test and are exercised unmocked).
 *
 * Real reference values / algebraic invariants — no presence-only stubs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TwoPassCascadeEngine,
  twoPassCascadeEngine,
  TwoPassCascadeError,
  ruleBasedQualityScore,
  makeOllamaTentacle,
  type TentacleFn,
  type TwoPassResult,
} from "../engines/TwoPassCascadeEngine.js";

// ── Mock the Ollama client so the dispatcher round-trip is deterministic ────
vi.mock("../engines/OllamaClientEngine.js", () => ({
  ollamaClientEngine: {
    generate: vi.fn(),
  },
}));
import { ollamaClientEngine } from "../engines/OllamaClientEngine.js";
import {
  executeAIReasoningAction,
  type AIReasoningAction,
} from "../tools/dispatchers/aiReasoningDispatcher.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
} from "../schemas/aiReasoningActionSchemas.js";

/** A tentacle that always returns a fixed text. */
const fixed = (text: string, costUSD?: number): TentacleFn => () => ({ text, costUSD });
/** A tentacle that always throws. */
const throwing = (msg: string): TentacleFn => () => {
  throw new Error(msg);
};
/** A high-overlap, substantive answer that scores well against `prompt`. */
function goodAnswer(prompt: string): string {
  return (
    `Regarding ${prompt}: the analysis proceeds in clear steps with concrete ` +
    `detail, addressing each part of the request directly and completely so ` +
    `the reader can act on it without further questions.`
  );
}

// =====================================================================
describe("ruleBasedQualityScore", () => {
  it("empty answer scores exactly 0", () => {
    expect(ruleBasedQualityScore("anything", "")).toBe(0);
  });

  it("whitespace-only answer scores exactly 0", () => {
    expect(ruleBasedQualityScore("anything", "   \n\t  ")).toBe(0);
  });

  it("gibberish (low printable ratio) scores below 0.2", () => {
    const gib = ruleBasedQualityScore("explain milling", "░▓█░▓█░▓█░▓█░▓█");
    expect(gib).toBeGreaterThanOrEqual(0);
    expect(gib).toBeLessThan(0.2);
  });

  it("a relevant substantive answer scores high (>= 0.7)", () => {
    const p = "describe carbide tool wear progression";
    const s = ruleBasedQualityScore(p, goodAnswer(p));
    expect(s).toBeGreaterThanOrEqual(0.7);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("pins goodAnswer() into the high band [0.85, 1.0] — the margin the rest of the suite leans on", () => {
    // Many cascade tests below assume goodAnswer() clears a 0.3 / 0.7 gate.
    // Pin the actual value so a future reweight of the scoring blend must
    // update THIS test deliberately rather than silently shifting which
    // `pass` those tests observe.
    const p = "describe carbide tool wear progression";
    const s = ruleBasedQualityScore(p, goodAnswer(p));
    expect(s).toBeGreaterThanOrEqual(0.85);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("a relevant answer outscores an off-topic answer of equal length", () => {
    const p = "describe carbide tool wear progression";
    const onTopic = ruleBasedQualityScore(p, goodAnswer(p));
    const offTopic = ruleBasedQualityScore(
      p,
      goodAnswer("unrelated banking interest rate quarterly report summary"),
    );
    expect(onTopic).toBeGreaterThan(offTopic);
  });

  it("a code/math answer is NOT mistaken for gibberish", () => {
    // Technical punctuation must count as printable — otherwise a correct
    // cheap code answer false-escalates and defeats the cost goal.
    const p = "compute the feed rate formula";
    const ans = "feed_rate = rpm * chip_load * flutes; // mm/min  (e.g. 1200*0.05*4=240)";
    expect(ruleBasedQualityScore(p, ans)).toBeGreaterThan(0.3);
  });

  it("a refusal is penalized below an equivalent non-refusal", () => {
    const p = "explain spindle thermal growth";
    const real = goodAnswer(p);
    const refusal =
      `Regarding ${p}: I cannot answer that, I don't know the analysis, ` +
      `the request is unclear and addressing it completely is not possible.`;
    expect(ruleBasedQualityScore(p, refusal)).toBeLessThan(
      ruleBasedQualityScore(p, real),
    );
  });

  it("clamps an absurdly long answer into [0,1] (does not exceed 1)", () => {
    const huge = ruleBasedQualityScore("a b c topic", "topic ".repeat(2000));
    expect(huge).toBeGreaterThanOrEqual(0);
    expect(huge).toBeLessThanOrEqual(1);
  });

  it("a prompt with no content tokens still yields a finite score in (0,1]", () => {
    const s = ruleBasedQualityScore("the a of to", goodAnswer("the a of to"));
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

// =====================================================================
describe("TwoPassCascadeEngine.run — core cascade", () => {
  const engine = new TwoPassCascadeEngine();
  const PROMPT = "explain how chip load affects surface finish";

  it("CASE 1 cheap-pass: a good cheap answer is accepted (no escalation)", async () => {
    const strong = vi.fn(fixed("strong answer"));
    const r = await engine.run({
      prompt: PROMPT,
      qualityThreshold: 0.3,
      invokeCheap: fixed(goodAnswer(PROMPT)),
      invokeStrong: strong,
    });
    expect(r.pass).toBe("cheap");
    expect(r.escalated).toBe(false);
    expect(r.degraded).toBe(false);
    expect(r.result).toContain("chip load");
    expect(strong).not.toHaveBeenCalled();
    expect(r.qualityScore).toBeGreaterThanOrEqual(r.threshold);
  });

  it("CASE 2 cheap-fail → strong-pass: low cheap score escalates", async () => {
    const r = await engine.run({
      prompt: PROMPT,
      qualityThreshold: 0.99, // unreachable → forces escalation
      invokeCheap: fixed(goodAnswer(PROMPT)),
      invokeStrong: fixed("the strong escalation answer for this prompt"),
    });
    expect(r.pass).toBe("strong");
    expect(r.escalated).toBe(true);
    expect(r.degraded).toBe(false);
    expect(r.result).toBe("the strong escalation answer for this prompt");
  });

  it("CASE 3 both-fail: throws TwoPassCascadeError carrying BOTH surfaces", async () => {
    try {
      await engine.run({
        prompt: PROMPT,
        invokeCheap: throwing("cheap boom"),
        invokeStrong: throwing("strong boom"),
      });
      expect.fail("should have thrown");
    } catch (e) {
      // Assert the THROWN TYPE before reading typed props — a plain Error
      // here would otherwise produce a confusing TypeError on .cheapError.
      expect(e).toBeInstanceOf(TwoPassCascadeError);
      const err = e as TwoPassCascadeError;
      expect(err.cheapError).toContain("cheap boom");
      expect(err.strongError).toContain("strong boom");
      expect(err.message).toContain("both passes failed");
    }
  });

  it("CASE 4 threshold-edge: a score exactly == threshold is accepted (>=)", async () => {
    const r = await engine.run({
      prompt: PROMPT,
      qualityThreshold: 0.5,
      judge: () => 0.5, // exactly on the gate
      invokeCheap: fixed("edge answer"),
      invokeStrong: fixed("strong answer"),
    });
    expect(r.pass).toBe("cheap");
    expect(r.escalated).toBe(false);
    expect(r.qualityScore).toBe(0.5);
  });

  it("CASE 5 missing-quality-fn: omitting judge uses the default rule-based scorer", async () => {
    const r = await engine.run({
      prompt: PROMPT,
      qualityThreshold: 0.3,
      invokeCheap: fixed(goodAnswer(PROMPT)),
      invokeStrong: fixed("strong"),
      // no judge
    });
    expect(r.pass).toBe("cheap");
    expect(r.qualityScore).toBeGreaterThan(0.3);
  });

  it("forceStrong skips the cheap pass entirely", async () => {
    const cheap = vi.fn(fixed("cheap"));
    const r = await engine.run({
      prompt: PROMPT,
      forceStrong: true,
      invokeCheap: cheap,
      invokeStrong: fixed("forced strong answer"),
    });
    expect(r.pass).toBe("strong");
    expect(r.escalated).toBe(true);
    expect(r.degraded).toBe(false);
    expect(r.result).toBe("forced strong answer");
    expect(cheap).not.toHaveBeenCalled();
  });

  it("forceStrong + strong throws → TwoPassCascadeError naming the strong failure", async () => {
    try {
      await engine.run({
        prompt: PROMPT,
        forceStrong: true,
        invokeStrong: throwing("forced strong boom"),
      });
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as TwoPassCascadeError;
      expect(err).toBeInstanceOf(TwoPassCascadeError);
      expect(err.strongError).toContain("forced strong boom");
      expect(err.message).toContain("forced strong pass failed");
    }
  });

  it("strong fails after cheap rejected → degraded cheap fallback (R12 honest)", async () => {
    const r = await engine.run({
      prompt: PROMPT,
      qualityThreshold: 0.99,
      invokeCheap: fixed("a weak but real cheap answer about the topic"),
      invokeStrong: throwing("strong unreachable"),
    });
    expect(r.pass).toBe("cheap");
    expect(r.escalated).toBe(true);
    expect(r.degraded).toBe(true); // explicitly flagged sub-threshold
    expect(r.strongError).toContain("strong unreachable");
    expect(r.qualityScore).toBeLessThan(r.threshold);
    expect(r.result).toContain("weak but real cheap answer");
  });

  it("judge that throws → conservative escalation to strong", async () => {
    const r = await engine.run({
      prompt: PROMPT,
      judge: () => {
        throw new Error("judge offline");
      },
      invokeCheap: fixed(goodAnswer(PROMPT)),
      invokeStrong: fixed("strong answer after judge failure"),
    });
    expect(r.pass).toBe("strong"); // cheap could not be trusted → escalate
    expect(r.escalated).toBe(true);
    expect(r.result).toBe("strong answer after judge failure");
  });

  it("judge returning NaN → cheap treated as a fail, escalates", async () => {
    const r = await engine.run({
      prompt: PROMPT,
      judge: () => NaN,
      invokeCheap: fixed(goodAnswer(PROMPT)),
      invokeStrong: fixed("strong answer after NaN judge"),
    });
    expect(r.pass).toBe("strong");
    expect(r.escalated).toBe(true);
    expect(r.result).toBe("strong answer after NaN judge");
  });

  it("cheap tentacle returning a malformed result escalates (no .text)", async () => {
    const malformed = (() => ({ notText: 1 })) as unknown as TentacleFn;
    const r = await engine.run({
      prompt: PROMPT,
      qualityThreshold: 0.3,
      invokeCheap: malformed,
      invokeStrong: fixed(goodAnswer(PROMPT)),
    });
    expect(r.pass).toBe("strong");
    expect(r.escalated).toBe(true);
    expect(r.cheapError).toContain("malformed");
  });
});

// =====================================================================
describe("TwoPassCascadeEngine.run — adversarial input", () => {
  const engine = new TwoPassCascadeEngine();

  it("empty prompt rejects with a prompt-specific error", async () => {
    await expect(
      engine.run({ prompt: "", invokeCheap: fixed("x"), invokeStrong: fixed("y") }),
    ).rejects.toThrow(/prompt/);
  });

  it("whitespace-only prompt rejects", async () => {
    await expect(
      engine.run({ prompt: "   ", invokeCheap: fixed("x"), invokeStrong: fixed("y") }),
    ).rejects.toThrow(/prompt/);
  });

  it("null opts rejects", async () => {
    await expect(
      engine.run(null as unknown as Parameters<typeof engine.run>[0]),
    ).rejects.toThrow(/prompt/);
  });

  it("missing invokeStrong rejects with an invokeStrong-specific error", async () => {
    await expect(
      engine.run({ prompt: "p", invokeCheap: fixed("x") } as Parameters<typeof engine.run>[0]),
    ).rejects.toThrow(/invokeStrong/);
  });

  it("missing invokeCheap (non-forceStrong) rejects", async () => {
    await expect(
      engine.run({ prompt: "p", invokeStrong: fixed("y") } as Parameters<typeof engine.run>[0]),
    ).rejects.toThrow(/invokeCheap/);
  });

  it("cheap blank answer escalates to strong", async () => {
    const r = await engine.run({
      prompt: "explain feeds and speeds",
      qualityThreshold: 0.5,
      invokeCheap: fixed(" "),
      invokeStrong: fixed(goodAnswer("explain feeds and speeds")),
    });
    expect(r.pass).toBe("strong");
    expect(r.escalated).toBe(true);
  });

  it("qualityThreshold = NaN falls back to the 0.7 default", async () => {
    const r = await engine.run({
      prompt: "p topic",
      qualityThreshold: NaN,
      invokeCheap: fixed(goodAnswer("p topic")),
      invokeStrong: fixed("s"),
    });
    expect(r.threshold).toBe(0.7);
  });

  it("qualityThreshold = Infinity is non-finite → falls back to the 0.7 default", async () => {
    // Infinity is not finite — treated identically to NaN: fall back to the
    // default rather than silently behaving as an unreachable gate.
    const r = await engine.run({
      prompt: "p topic",
      qualityThreshold: Infinity,
      invokeCheap: fixed(goodAnswer("p topic")),
      invokeStrong: fixed("strong"),
    });
    expect(r.threshold).toBe(0.7);
  });

  it("qualityThreshold = 2 (finite, > 1) clamps to 1 → a sub-perfect cheap answer escalates", async () => {
    const r = await engine.run({
      prompt: "p topic",
      qualityThreshold: 2,
      invokeCheap: fixed(goodAnswer("p topic")),
      invokeStrong: fixed("strong"),
    });
    expect(r.threshold).toBe(1);
    expect(r.pass).toBe("strong"); // a rule-based score < 1 cannot pass a threshold of 1
  });

  it("qualityThreshold = -5 clamps to 0 → any non-empty cheap answer passes", async () => {
    const r = await engine.run({
      prompt: "p topic",
      qualityThreshold: -5,
      invokeCheap: fixed("short"),
      invokeStrong: fixed("strong"),
    });
    expect(r.threshold).toBe(0);
    expect(r.pass).toBe("cheap");
  });
});

// =====================================================================
describe("TwoPassCascadeEngine.run — cost accounting", () => {
  const engine = new TwoPassCascadeEngine();
  const P = "topic alpha beta";

  it("costModel present → costUSD summed across both passes, costRecorded:true", async () => {
    const r = await engine.run({
      prompt: P,
      qualityThreshold: 0.99, // escalate → both passes run
      invokeCheap: fixed("weak"),
      invokeStrong: fixed(goodAnswer(P)),
      costModel: { cheapUSD: 0.001, strongUSD: 0.02 },
    });
    expect(r.costRecorded).toBe(true);
    expect(r.costUSD).toBeCloseTo(0.021, 6);
  });

  it("no costModel and no measured cost → costUSD:0, costRecorded:false", async () => {
    const r = await engine.run({
      prompt: P,
      qualityThreshold: 0.3,
      invokeCheap: fixed(goodAnswer(P)),
      invokeStrong: fixed("s"),
    });
    expect(r.costUSD).toBe(0);
    expect(r.costRecorded).toBe(false);
  });

  it("a measured tentacle cost overrides the cost-model estimate", async () => {
    const r = await engine.run({
      prompt: P,
      qualityThreshold: 0.3,
      invokeCheap: fixed(goodAnswer(P), 0.005), // measured 0.005
      invokeStrong: fixed("s"),
      costModel: { cheapUSD: 0.001 }, // estimate must be ignored
    });
    expect(r.costUSD).toBeCloseTo(0.005, 6);
    expect(r.costRecorded).toBe(true);
  });

  it("a measured cost of exactly 0 is recorded (not treated as absent)", async () => {
    const r = await engine.run({
      prompt: P,
      qualityThreshold: 0.3,
      invokeCheap: fixed(goodAnswer(P), 0),
      invokeStrong: fixed("s"),
    });
    expect(r.costUSD).toBe(0);
    expect(r.costRecorded).toBe(true);
  });
});

// =====================================================================
describe("TwoPassCascadeEngine.run — variability (quality threshold)", () => {
  const engine = new TwoPassCascadeEngine();
  const P = "describe coolant strategy";
  // A judge pinned at 0.5 so the gate decision depends purely on threshold.
  const midJudge = () => 0.5;

  it("threshold 0.3: a 0.5-quality cheap answer is accepted (no escalation)", async () => {
    const r = await engine.run({
      prompt: P,
      qualityThreshold: 0.3,
      judge: midJudge,
      invokeCheap: fixed("mid answer"),
      invokeStrong: fixed("strong"),
    });
    expect(r.pass).toBe("cheap");
    expect(r.escalated).toBe(false);
  });

  it("threshold 0.7: the same 0.5-quality answer escalates to strong", async () => {
    const r = await engine.run({
      prompt: P,
      qualityThreshold: 0.7,
      judge: midJudge,
      invokeCheap: fixed("mid answer"),
      invokeStrong: fixed("strong"),
    });
    expect(r.pass).toBe("strong");
    expect(r.escalated).toBe(true);
  });

  it("threshold 0.95: the same 0.5-quality answer escalates to strong", async () => {
    const r = await engine.run({
      prompt: P,
      qualityThreshold: 0.95,
      judge: midJudge,
      invokeCheap: fixed("mid answer"),
      invokeStrong: fixed("strong"),
    });
    expect(r.pass).toBe("strong");
    expect(r.escalated).toBe(true);
  });
});

// =====================================================================
describe("makeOllamaTentacle", () => {
  it("returns the model text on a successful generate", async () => {
    const t = makeOllamaTentacle("m", async () => ({ ok: true, data: "hello" }));
    expect(await t("prompt")).toEqual({ text: "hello" });
  });

  it("throws (does not fabricate) when generate fails", async () => {
    const t = makeOllamaTentacle("m", async () => ({ ok: false, error: "down" }));
    await expect(t("prompt")).rejects.toThrow(/m.*down/);
  });

  it("throws when generate returns non-string data", async () => {
    const t = makeOllamaTentacle("m", async () => ({ ok: true }));
    await expect(t("prompt")).rejects.toThrow(/no data/);
  });
});

// =====================================================================
describe("twoPassCascadeEngine singleton", () => {
  it("the exported singleton runs a real cascade and accepts a good cheap answer", async () => {
    const p = "singleton smoke topic about machining";
    const r = await twoPassCascadeEngine.run({
      prompt: p,
      qualityThreshold: 0.3,
      invokeCheap: fixed(goodAnswer(p)),
      invokeStrong: fixed("strong"),
    });
    expect(r.pass).toBe("cheap");
    expect(r.result).toContain("singleton smoke topic");
  });
});

// =====================================================================
describe("prism_ai:two_pass — dispatcher wiring + round-trip", () => {
  const genMock = vi.mocked(ollamaClientEngine.generate);

  beforeEach(() => {
    genMock.mockReset();
  });

  /** OllamaResult-shaped success / failure. */
  const ok = (value: string) => ({ ok: true, value, error: null, wallMs: 1 });
  const fail = (error: string) => ({ ok: false, value: null, error, wallMs: 1 });

  it("action enum includes 'two_pass' exactly once", () => {
    const arr = AI_REASONING_ACTIONS as readonly string[];
    expect(arr.filter((a) => a === "two_pass").length).toBe(1);
  });

  it("schema accepts a valid payload and rejects unknown keys / bad values", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["two_pass" as AIReasoningAction] as {
      safeParse: (v: unknown) => { success: boolean };
    };
    expect(schema.safeParse({ prompt: "hello", qualityThreshold: 0.5 }).success).toBe(true);
    expect(schema.safeParse({ prompt: "hello", bogusKey: true }).success).toBe(false);
    expect(schema.safeParse({ qualityThreshold: 0.5 }).success).toBe(false); // missing prompt
    expect(schema.safeParse({ prompt: "hello", qualityThreshold: 2 }).success).toBe(false);
    expect(schema.safeParse({ prompt: "" }).success).toBe(false); // min(1)
  });

  it("round-trip: a good cheap answer ⇒ pass:'cheap', no escalation", async () => {
    const prompt = "explain tool deflection under load";
    genMock.mockResolvedValue(ok(goodAnswer(prompt)));
    const r = await executeAIReasoningAction("two_pass" as AIReasoningAction, {
      prompt,
      qualityThreshold: 0.3,
      cheapModel: "cheap-m",
      strongModel: "strong-m",
    });
    expect(r.success).toBe(true);
    const d = r.data as TwoPassResult;
    expect(d.pass).toBe("cheap");
    expect(d.escalated).toBe(false);
    expect(d.degraded).toBe(false);
  });

  it("round-trip: weak cheap + good strong ⇒ pass:'strong'", async () => {
    const prompt = "explain helical interpolation";
    genMock.mockImplementation(async (o: { model: string }) =>
      o.model === "strong-m" ? ok(goodAnswer(prompt)) : ok("weak"),
    );
    const r = await executeAIReasoningAction("two_pass" as AIReasoningAction, {
      prompt,
      qualityThreshold: 0.99, // unreachable → escalate
      cheapModel: "cheap-m",
      strongModel: "strong-m",
    });
    expect(r.success).toBe(true);
    const d = r.data as TwoPassResult;
    expect(d.pass).toBe("strong");
    expect(d.escalated).toBe(true);
    expect(d.result).toBe(goodAnswer(prompt));
  });

  it("round-trip: weak cheap + strong-model failure ⇒ degraded cheap fallback", async () => {
    // Exercises the degraded path end-to-end through the production wiring
    // (makeOllamaTentacle → adapter → engine). Also pins the production fact
    // that the shipped two_pass action reports no cost telemetry by
    // construction (makeOllamaTentacle never sets a measured cost).
    const prompt = "explain dwell in peck drilling cycles";
    genMock.mockImplementation(async (o: { model: string }) =>
      o.model === "strong-m" ? fail("strong model offline") : ok("weak"),
    );
    const r = await executeAIReasoningAction("two_pass" as AIReasoningAction, {
      prompt,
      qualityThreshold: 0.99, // unreachable → cheap rejected → escalate
      cheapModel: "cheap-m",
      strongModel: "strong-m",
    });
    expect(r.success).toBe(true); // a degraded fallback is NOT an error
    const d = r.data as TwoPassResult;
    expect(d.pass).toBe("cheap");
    expect(d.degraded).toBe(true);
    expect(d.escalated).toBe(true);
    expect(String(d.strongError)).toContain("strong model offline");
    expect(d.costRecorded).toBe(false); // production wiring carries no cost telemetry
  });

  it("round-trip: both passes fail ⇒ error envelope (success:false)", async () => {
    genMock.mockResolvedValue(fail("ollama daemon unreachable"));
    const r = await executeAIReasoningAction("two_pass" as AIReasoningAction, {
      prompt: "anything at all",
      cheapModel: "cheap-m",
      strongModel: "strong-m",
    });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/both passes failed|unreachable/i);
  });

  it("round-trip: forceStrong ⇒ pass:'strong', only the strong model is called", async () => {
    const prompt = "summarize fixturing best practice";
    genMock.mockResolvedValue(ok(goodAnswer(prompt)));
    const r = await executeAIReasoningAction("two_pass" as AIReasoningAction, {
      prompt,
      forceStrong: true,
      cheapModel: "cheap-m",
      strongModel: "strong-m",
    });
    expect(r.success).toBe(true);
    const d = r.data as TwoPassResult;
    expect(d.pass).toBe("strong");
    expect(d.escalated).toBe(true);
    const models = genMock.mock.calls.map((c) => (c[0] as { model: string }).model);
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m === "strong-m")).toBe(true);
  });

  it("round-trip: a missing prompt is rejected by schema BEFORE the engine runs", async () => {
    genMock.mockResolvedValue(ok("this answer must never be produced"));
    const r = await executeAIReasoningAction("two_pass" as AIReasoningAction, {
      qualityThreshold: 0.5,
    });
    expect(r.success).toBe(false);
    expect(genMock.mock.calls.length).toBe(0); // validation short-circuited the cascade
  });

  it("round-trip: qualityThreshold > 1 is rejected by schema BEFORE the engine runs", async () => {
    genMock.mockResolvedValue(ok("this answer must never be produced"));
    const r = await executeAIReasoningAction("two_pass" as AIReasoningAction, {
      prompt: "hello",
      qualityThreshold: 1.5,
    });
    expect(r.success).toBe(false);
    expect(genMock.mock.calls.length).toBe(0);
  });
});
