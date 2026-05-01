/**
 * PRISMConsensusGateEngine.test.ts — 10 quorum scenarios for P4-U01.
 *
 * Coverage:
 *   1-5. Five unanimous-correct cases (all PASS, all FAIL, all CONDITIONAL,
 *        unanimous PASS with cloud+ollama mix, unanimous PASS at min size 3).
 *   6.   Split 3 vs 2 (PASS/FAIL).
 *   7.   Unanimous-wrong detected by dissent flags surfaced.
 *   8.   Timeout fallback — 1 provider exceeds 45 s, partial-quorum downgrade.
 *   9.   Cloud-mandatory — 4-ollama-only call REFUSED.
 *   10.  Codex chunked review — 25K-token diff produces ≥2 invocations,
 *        per-chunk verdicts merged via majority within the provider's vote.
 *
 * Plus: cache-hit smoke (input + provider-set unchanged returns cached result),
 * concurrency dedup (parallel calls share inflight promise), and arg validation.
 *
 * No real LLM calls. Test providers are real `QuorumProvider` implementations
 * whose `invoke` returns canned verdicts deterministically — they exercise
 * every code path the engine cares about (timeout, abort, throw, malformed).
 */

import { describe, expect, it } from "vitest";
import {
  PRISMConsensusGateEngine,
  chunkForCodex,
  createCodexChunkingProvider,
  estimateTokens,
  type Decision,
  type ProviderVerdict,
  type QuorumProvider,
} from "../engines/PRISMConsensusGateEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────

function staticVerdict(d: Decision, rationale = "test", flags: string[] = []): ProviderVerdict {
  return { decision: d, rationale, flags, confidence: 0.9 };
}

function fixedProvider(id: string, kind: "cloud" | "ollama", v: ProviderVerdict): QuorumProvider {
  return {
    id,
    kind,
    invoke: async (_input, _signal) => v,
  };
}

function timingOutProvider(id: string, kind: "cloud" | "ollama", delayMs: number): QuorumProvider {
  return {
    id,
    kind,
    invoke: (_input, signal) =>
      new Promise<ProviderVerdict>((resolve, reject) => {
        const timer = setTimeout(() => resolve(staticVerdict("PASS", "delayed")), delayMs);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("aborted"));
        });
      }),
  };
}

function fivePanel(verdicts: ProviderVerdict[]): QuorumProvider[] {
  // Index 0 + 1 are cloud (claude, codex), 2-4 are ollama-coder/qwen/mistral.
  return [
    fixedProvider("claude", "cloud", verdicts[0]),
    fixedProvider("codex", "cloud", verdicts[1]),
    fixedProvider("qwen-coder", "ollama", verdicts[2]),
    fixedProvider("qwen", "ollama", verdicts[3]),
    fixedProvider("mistral", "ollama", verdicts[4]),
  ];
}

// ── 1-5. Unanimous-correct ───────────────────────────────────────────

describe("PRISMConsensusGateEngine — unanimous correct", () => {
  it("Test 1: 5 providers unanimously PASS → PASS", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(
      "// add explanatory JSDoc — pure docs",
      fivePanel(Array(5).fill(staticVerdict("PASS")))
    );
    expect(r.decision).toBe("PASS");
    expect(r.reason).toBe("majority-pass");
    expect(r.votes).toEqual({ PASS: 5, CONDITIONAL: 0, FAIL: 0 });
    expect(r.validProviders).toBe(5);
    expect(r.partialQuorum).toBe(false);
    expect(r.cloudPresent).toBe(true);
    expect(r.dissent).toEqual([]);
    expect(r.cacheHit).toBe(false);
  });

  it("Test 2: 5 providers unanimously FAIL → FAIL", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(
      "// edit physics constants directly",
      fivePanel(Array(5).fill(staticVerdict("FAIL", "physics inline")))
    );
    expect(r.decision).toBe("FAIL");
    expect(r.votes.FAIL).toBe(5);
    expect(r.dissent).toEqual([]);
  });

  it("Test 3: 5 providers unanimously CONDITIONAL → CONDITIONAL", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(
      "// risky refactor, needs follow-up",
      fivePanel(Array(5).fill(staticVerdict("CONDITIONAL", "needs follow-up")))
    );
    expect(r.decision).toBe("CONDITIONAL");
    expect(r.votes.CONDITIONAL).toBe(5);
    expect(r.partialQuorum).toBe(false);
  });

  it("Test 4: cloud + ollama mix unanimously PASS → PASS (cloudPresent true)", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(
      "// add a typed enum entry",
      fivePanel([
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("PASS"),
      ])
    );
    expect(r.decision).toBe("PASS");
    expect(r.results.find((x) => x.providerId === "claude")?.kind).toBe("cloud");
    expect(r.results.find((x) => x.providerId === "qwen-coder")?.kind).toBe("ollama");
  });

  it("Test 5: 3-provider min-quorum unanimously PASS → PASS (no partial flag)", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote("// minor", [
      fixedProvider("claude", "cloud", staticVerdict("PASS")),
      fixedProvider("qwen", "ollama", staticVerdict("PASS")),
      fixedProvider("mistral", "ollama", staticVerdict("PASS")),
    ]);
    expect(r.decision).toBe("PASS");
    expect(r.validProviders).toBe(3);
    expect(r.totalProviders).toBe(3);
    expect(r.partialQuorum).toBe(false);
  });
});

// ── 6. Split 3 vs 2 ──────────────────────────────────────────────────

describe("PRISMConsensusGateEngine — split vote", () => {
  it("Test 6: 3 PASS / 2 FAIL → CONDITIONAL via bare-majority-downgrade (3/5 = 60% < 75%)", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(
      "// borderline — mixes a public API rename with internal cleanup",
      fivePanel([
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("FAIL", "API rename without callers updated"),
        staticVerdict("FAIL", "missing migration test"),
      ])
    );
    // The P4 phase requires 75% supermajority for a clean PASS. 3-of-5 = 60%
    // doesn't clear that bar — winning PASS gets downgraded to CONDITIONAL.
    expect(r.decision).toBe("CONDITIONAL");
    expect(r.reason).toMatch(/bare-majority-downgrade/);
    expect(r.votes.PASS).toBe(3);
    expect(r.votes.FAIL).toBe(2);
    expect(r.partialQuorum).toBe(false);
    // FAIL-side dissent must be captured for caller review.
    expect(r.dissent.length).toBe(2);
    expect(r.dissent.every((d) => d.decision === "FAIL")).toBe(true);
  });

  it("Test 6c: 4 PASS / 1 FAIL → PASS (clears 75% supermajority)", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(
      "// non-controversial — single dissenter on a stylistic call",
      fivePanel([
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("FAIL", "stylistic objection"),
      ])
    );
    // 4/5 = 80% ≥ 75% supermajority — clean PASS.
    expect(r.decision).toBe("PASS");
    expect(r.dissent.length).toBe(1);
  });

  it("Test 6b: 2 PASS / 2 FAIL / 1 CONDITIONAL → CONDITIONAL split-vote (no winner)", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(
      "// genuine split",
      fivePanel([
        staticVerdict("PASS"),
        staticVerdict("PASS"),
        staticVerdict("FAIL"),
        staticVerdict("FAIL"),
        staticVerdict("CONDITIONAL"),
      ])
    );
    expect(r.decision).toBe("CONDITIONAL");
    expect(r.reason).toContain("split-vote");
    expect(r.dissent.length).toBeGreaterThanOrEqual(2);
  });
});

// ── 7. Unanimous-wrong detected by dissent flags ─────────────────────

describe("PRISMConsensusGateEngine — unanimous wrong detected", () => {
  it("Test 7: all PASS but a flag in any rationale must surface in flagsSurfaced", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(
      "// adds a Kienzle coefficient call but inlines kc1.1",
      fivePanel([
        staticVerdict("PASS", "looks fine", []),
        staticVerdict("PASS", "looks fine", []),
        staticVerdict("PASS", "ok", ["physics-constant-inlined"]),
        staticVerdict("PASS", "fine", []),
        staticVerdict("PASS", "fine", ["dispatcher-not-wired"]),
      ])
    );
    expect(r.decision).toBe("PASS");
    expect(r.dissent).toEqual([]); // unanimous decision
    // The unanimous-wrong escape valve: flags surface even on unanimous PASS.
    expect(r.flagsSurfaced).toContain("physics-constant-inlined");
    expect(r.flagsSurfaced).toContain("dispatcher-not-wired");
    // Caller is responsible for downgrading on flagsSurfaced — engine does
    // not silently swallow flags into a PASS.
  });
});

// ── 8. Timeout fallback ──────────────────────────────────────────────

describe("PRISMConsensusGateEngine — timeout fallback", () => {
  it("Test 8: 1 provider times out → 4 valid → CONDITIONAL with partial-quorum downgrade", async () => {
    const engine = new PRISMConsensusGateEngine({ perProviderTimeoutMs: 60 });
    const r = await engine.vote("// slow review on one provider", [
      fixedProvider("claude", "cloud", staticVerdict("PASS")),
      fixedProvider("codex", "cloud", staticVerdict("PASS")),
      fixedProvider("qwen-coder", "ollama", staticVerdict("PASS")),
      fixedProvider("qwen", "ollama", staticVerdict("PASS")),
      timingOutProvider("mistral", "ollama", 500),
    ]);
    expect(r.validProviders).toBe(4);
    expect(r.partialQuorum).toBe(true);
    expect(r.decision).toBe("CONDITIONAL");
    expect(r.reason).toMatch(/partial-quorum-downgrade/);
    const slow = r.results.find((x) => x.providerId === "mistral");
    expect(slow?.valid).toBe(false);
    expect(slow?.error).toBe("timeout");
  });
});

// ── 9. Cloud-mandatory ───────────────────────────────────────────────

describe("PRISMConsensusGateEngine — cloud-provider mandatory", () => {
  it("Test 9: 4 ollama providers (no cloud) → REFUSED", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote("// any input", [
      fixedProvider("qwen-coder", "ollama", staticVerdict("PASS")),
      fixedProvider("qwen", "ollama", staticVerdict("PASS")),
      fixedProvider("mistral", "ollama", staticVerdict("PASS")),
      fixedProvider("llama", "ollama", staticVerdict("PASS")),
    ]);
    expect(r.decision).toBe("REFUSED");
    expect(r.reason).toMatch(/no-cloud-provider/);
    expect(r.validProviders).toBe(0);
    expect(r.cloudPresent).toBe(false);
    // None of the ollama providers should have actually been invoked.
    for (const x of r.results) {
      expect(x.valid).toBe(false);
      expect(x.error).toMatch(/cloud-provider-mandatory/);
    }
  });
});

// ── 10. Codex chunked review ─────────────────────────────────────────

describe("PRISMConsensusGateEngine — Codex chunked review", () => {
  it("estimateTokens approximates 4 chars per token", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(40))).toBe(10);
  });

  it("chunkForCodex passes inputs ≤ trigger through unchanged", () => {
    const small = "x".repeat(8_000); // 2K tokens — well under 18K
    expect(chunkForCodex(small)).toEqual([small]);
  });

  it("Test 10: 25K-token synthetic diff splits into ≥2 chunks each ≤16K tokens", () => {
    // Build paragraphs so the splitter can find boundaries naturally.
    const paragraph = ("// " + "diff line ".repeat(60)) + "\n";
    const big = paragraph.repeat(2_400); // ~144K chars ≈ 36K tokens
    expect(estimateTokens(big)).toBeGreaterThan(25_000);
    const chunks = chunkForCodex(big);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const c of chunks) {
      expect(estimateTokens(c)).toBeLessThanOrEqual(16_000);
    }
  });

  it("Test 10 (round-trip): chunked Codex provider invokes per-chunk and merges majority", async () => {
    const calls: string[] = [];
    const codex = createCodexChunkingProvider({
      id: "codex",
      maxTokens: 4_000,
      triggerTokens: 5_000,
      invokeChunk: async (chunk) => {
        calls.push(chunk);
        // First chunk PASS, second FAIL, third PASS — majority PASS.
        const verdict: Decision = calls.length === 2 ? "FAIL" : "PASS";
        return { decision: verdict, rationale: `chunk #${calls.length}`, flags: ["per-chunk"] };
      },
    });

    const para = ("section line ".repeat(120)) + "\n\n";
    const big = para.repeat(60); // forces splitter into multiple chunks
    expect(estimateTokens(big)).toBeGreaterThan(5_000);

    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote(big, [
      codex,
      fixedProvider("claude", "cloud", staticVerdict("PASS")),
      fixedProvider("qwen-coder", "ollama", staticVerdict("PASS")),
      fixedProvider("qwen", "ollama", staticVerdict("PASS")),
      fixedProvider("mistral", "ollama", staticVerdict("PASS")),
    ]);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    const codexResult = r.results.find((x) => x.providerId === "codex");
    expect(codexResult?.valid).toBe(true);
    expect(codexResult?.verdict?.rationale).toMatch(/chunked-review/);
    expect(codexResult?.verdict?.flags).toContain("per-chunk");
    expect(r.decision).toBe("PASS");
  });
});

// ── Cache + concurrency + arg validation ─────────────────────────────

describe("PRISMConsensusGateEngine — cache, concurrency, arg validation", () => {
  it("returns cacheHit=true on a second identical call", async () => {
    const engine = new PRISMConsensusGateEngine();
    const panel = fivePanel(Array(5).fill(staticVerdict("PASS")));
    const r1 = await engine.vote("input-A", panel);
    const r2 = await engine.vote("input-A", panel);
    expect(r1.cacheHit).toBe(false);
    expect(r2.cacheHit).toBe(true);
    expect(r2.decision).toBe(r1.decision);
    expect(r2.cacheKey).toBe(r1.cacheKey);
  });

  it("changes cacheKey when the provider set changes (no false cache hit)", async () => {
    const engine = new PRISMConsensusGateEngine();
    const panel1 = fivePanel(Array(5).fill(staticVerdict("PASS")));
    const r1 = await engine.vote("input-B", panel1);
    const panel2 = panel1.slice(0, 4); // drop mistral
    const r2 = await engine.vote("input-B", panel2);
    expect(r2.cacheHit).toBe(false);
    expect(r2.cacheKey).not.toBe(r1.cacheKey);
  });

  it("dedupes concurrent identical calls (single inflight)", async () => {
    let inflightCount = 0;
    const slowPass: QuorumProvider = {
      id: "claude",
      kind: "cloud",
      invoke: async () => {
        inflightCount += 1;
        await new Promise((r) => setTimeout(r, 30));
        return staticVerdict("PASS");
      },
    };
    const others = [
      fixedProvider("codex", "cloud", staticVerdict("PASS")),
      fixedProvider("qwen", "ollama", staticVerdict("PASS")),
      fixedProvider("mistral", "ollama", staticVerdict("PASS")),
    ];
    const engine = new PRISMConsensusGateEngine();
    const panel = [slowPass, ...others];
    const [a, b] = await Promise.all([
      engine.vote("input-C", panel),
      engine.vote("input-C", panel),
    ]);
    expect(inflightCount).toBe(1); // not 2 — second call shared the inflight promise
    expect(a.decision).toBe("PASS");
    expect(b.decision).toBe("PASS");
  });

  it("rejects empty provider list", async () => {
    const engine = new PRISMConsensusGateEngine();
    await expect(engine.vote("x", [])).rejects.toThrow(/non-empty/);
  });

  it("rejects duplicate provider ids", async () => {
    const engine = new PRISMConsensusGateEngine();
    await expect(
      engine.vote("x", [
        fixedProvider("claude", "cloud", staticVerdict("PASS")),
        fixedProvider("claude", "ollama", staticVerdict("PASS")),
      ])
    ).rejects.toThrow(/duplicate/);
  });

  it("rejects more than 5 providers (gate is N-of-5)", async () => {
    const engine = new PRISMConsensusGateEngine();
    const six = Array.from({ length: 6 }, (_, i) =>
      fixedProvider(`p${i}`, i === 0 ? "cloud" : "ollama", staticVerdict("PASS"))
    );
    await expect(engine.vote("x", six)).rejects.toThrow(/capped at 5/);
  });

  it("marks provider invalid when invoke throws non-Error", async () => {
    const engine = new PRISMConsensusGateEngine();
    const r = await engine.vote("x", [
      fixedProvider("claude", "cloud", staticVerdict("PASS")),
      fixedProvider("codex", "cloud", staticVerdict("PASS")),
      fixedProvider("qwen", "ollama", staticVerdict("PASS")),
      {
        id: "bad",
        kind: "ollama",
        invoke: async () => {
          // Non-Error throw exercises the err-normalization path.
          // eslint-disable-next-line no-throw-literal
          throw "string-throw";
        },
      },
    ]);
    const bad = r.results.find((x) => x.providerId === "bad");
    expect(bad?.valid).toBe(false);
    expect(bad?.error).toBe("string-throw");
  });
});
