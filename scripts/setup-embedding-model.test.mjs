/**
 * setup-embedding-model — pure-logic tests for INTEL-OLLAMA-OBSIDIAN-MS0/P17-U01.
 *
 * Tests the 5 exported pure functions without touching a live Ollama instance.
 * The I/O glue (fetchTags / pullModel / callEmbedding / main) is exercised by
 * the live smoke test that the script runs at invocation time, not in vitest.
 *
 * Coverage targets:
 *   - isModelInstalled: 3 happy paths + 4 failure modes + 2 adversarial
 *   - validateEmbeddingResponse: 1 happy + 5 failure modes + 2 adversarial
 *   - median: 4 happy + 3 edge cases + 2 adversarial
 *   - decideSmokePass: 1 happy + 3 failure modes + 1 contract guarantee
 *   - parseArgs: 4 happy + 3 edge cases
 */

import { describe, it, expect } from "vitest";
import {
  isModelInstalled,
  validateEmbeddingResponse,
  median,
  decideSmokePass,
  parseArgs,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  EXPECTED_DIM,
  DEFAULT_WARM_CALLS,
  DEFAULT_WARM_BUDGET_MS,
} from "./setup-embedding-model.mjs";

describe("P17-U01 module constants", () => {
  it("exports stable defaults that match milestone exit_conditions", () => {
    expect(DEFAULT_BASE_URL).toBe("http://127.0.0.1:11434");
    expect(DEFAULT_MODEL).toBe("nomic-embed-text");
    expect(EXPECTED_DIM).toBe(768); // nomic-embed-text spec
    expect(DEFAULT_WARM_BUDGET_MS).toBe(100); // exit_condition: latency < 100ms
    expect(DEFAULT_WARM_CALLS).toBeGreaterThanOrEqual(3);
  });
});

describe("P17-U01 isModelInstalled", () => {
  const tags = {
    models: [
      { name: "nomic-embed-text:latest", model: "nomic-embed-text:latest" },
      { name: "qwen2.5-coder:7b", model: "qwen2.5-coder:7b" },
      { name: "deepseek-r1:14b", model: "deepseek-r1:14b" },
    ],
  };

  it("matches when target name has no :latest suffix and tag does", () => {
    expect(isModelInstalled(tags, "nomic-embed-text")).toBe(true);
  });

  it("matches when both target and tag carry :latest suffix", () => {
    expect(isModelInstalled(tags, "nomic-embed-text:latest")).toBe(true);
  });

  it("matches an explicit-version tag (qwen2.5-coder:7b)", () => {
    expect(isModelInstalled(tags, "qwen2.5-coder:7b")).toBe(true);
  });

  it("returns false for a model not in the list", () => {
    expect(isModelInstalled(tags, "llama3.3:70b")).toBe(false);
  });

  it("returns false on null tags response", () => {
    expect(isModelInstalled(null, "nomic-embed-text")).toBe(false);
  });

  it("returns false when response has no models array", () => {
    expect(isModelInstalled({}, "nomic-embed-text")).toBe(false);
    expect(isModelInstalled({ models: "not-an-array" }, "nomic-embed-text")).toBe(false);
  });

  it("returns false on empty / non-string model name", () => {
    expect(isModelInstalled(tags, "")).toBe(false);
    // @ts-expect-error - adversarial wrong-type input
    expect(isModelInstalled(tags, null)).toBe(false);
    // @ts-expect-error - adversarial wrong-type input
    expect(isModelInstalled(tags, 42)).toBe(false);
  });

  it("does not crash on malformed model entries (missing name/model)", () => {
    const malformed = { models: [{ size: 100 }, null, { name: "good:latest" }] };
    expect(isModelInstalled(malformed, "good")).toBe(true);
    expect(isModelInstalled(malformed, "missing")).toBe(false);
  });

  it("does NOT cross-match version tags (only :latest is stripped)", () => {
    // qwen2.5-coder:7b should not satisfy a request for qwen2.5-coder:14b.
    expect(isModelInstalled(tags, "qwen2.5-coder:14b")).toBe(false);
    // Bare name does not match an arbitrary version tag (only :latest tags do).
    const t = { models: [{ name: "foo:tag" }] };
    expect(isModelInstalled(t, "foo")).toBe(false);
  });

  it("treats nomic-bert:latest and nomic-bert as the same target (round-trip)", () => {
    const t = { models: [{ name: "nomic-bert" }] };
    expect(isModelInstalled(t, "nomic-bert:latest")).toBe(true);
    expect(isModelInstalled(t, "nomic-bert")).toBe(true);
  });
});

describe("P17-U01 validateEmbeddingResponse", () => {
  it("accepts a valid 768-dim numeric embedding", () => {
    const v = validateEmbeddingResponse({ embedding: Array(768).fill(0).map((_, i) => i * 0.001) });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.dim).toBe(768);
      expect(v.sample).toHaveLength(5);
    }
  });

  it("accepts shorter embeddings too (caller checks dim separately)", () => {
    const v = validateEmbeddingResponse({ embedding: [0.1, -0.2, 0.3] });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.dim).toBe(3);
  });

  it("rejects null/undefined", () => {
    expect(validateEmbeddingResponse(null)).toEqual({ ok: false, reason: "no-response" });
    expect(validateEmbeddingResponse(undefined)).toEqual({ ok: false, reason: "no-response" });
  });

  it("rejects non-object inputs", () => {
    expect(validateEmbeddingResponse("string")).toEqual({ ok: false, reason: "no-response" });
    expect(validateEmbeddingResponse(42)).toEqual({ ok: false, reason: "no-response" });
  });

  it("rejects responses with no embedding field", () => {
    expect(validateEmbeddingResponse({})).toEqual({ ok: false, reason: "no-embedding" });
    expect(validateEmbeddingResponse({ embedding: "not-array" })).toEqual({ ok: false, reason: "no-embedding" });
  });

  it("rejects empty embedding arrays", () => {
    expect(validateEmbeddingResponse({ embedding: [] })).toEqual({ ok: false, reason: "embedding-empty" });
  });

  it("rejects non-numeric values", () => {
    const r = validateEmbeddingResponse({ embedding: [0.1, "string", 0.3] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("wrong-type");
  });

  it("rejects NaN and Infinity (adversarial)", () => {
    const nan = validateEmbeddingResponse({ embedding: [0.1, NaN, 0.3] });
    expect(nan.ok).toBe(false);
    if (!nan.ok) expect(nan.reason).toBe("non-finite");
    const inf = validateEmbeddingResponse({ embedding: [0.1, Infinity] });
    expect(inf.ok).toBe(false);
    if (!inf.ok) expect(inf.reason).toBe("non-finite");
  });
});

describe("P17-U01 median", () => {
  it("returns the middle value for odd-length arrays", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([5, 1, 3])).toBe(3); // sorted = [1,3,5]
  });

  it("returns the average of two middle values for even-length arrays", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([100, 50, 200, 150])).toBe(125); // sorted [50,100,150,200] → (100+150)/2
  });

  it("filters out infinities and NaN before median", () => {
    expect(median([1, NaN, 3, Infinity, 5])).toBe(3); // valid = [1,3,5] → 3
  });

  it("ignores non-number values silently", () => {
    // @ts-expect-error - adversarial mixed input
    expect(median([1, "two", 3])).toBe(2);
  });

  it("returns null on empty input", () => {
    expect(median([])).toBeNull();
  });

  it("returns null on non-array input", () => {
    expect(median(null)).toBeNull();
    expect(median(undefined)).toBeNull();
    // @ts-expect-error - adversarial wrong-type input
    expect(median("not-array")).toBeNull();
  });

  it("returns null when all entries filter out", () => {
    expect(median([NaN, Infinity, -Infinity])).toBeNull();
    // @ts-expect-error - adversarial wrong-type input
    expect(median(["a", "b"])).toBeNull();
  });

  it("does not mutate the input array", () => {
    const xs = [3, 1, 2];
    median(xs);
    expect(xs).toEqual([3, 1, 2]);
  });
});

describe("P17-U01 decideSmokePass", () => {
  it("PASSES when dim matches and p50 is under budget", () => {
    expect(
      decideSmokePass({
        dimensionMatches: true,
        p50LatencyMs: 47,
        budgetMs: 100,
        expectedDim: 768,
        actualDim: 768,
      }),
    ).toEqual({ ok: true });
  });

  it("FAILS on dim mismatch even with great latency", () => {
    const r = decideSmokePass({
      dimensionMatches: false,
      p50LatencyMs: 5,
      budgetMs: 100,
      expectedDim: 768,
      actualDim: 384,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("dim-mismatch");
      expect(r.details).toEqual({ expected: 768, actual: 384 });
    }
  });

  it("FAILS when p50 is exactly over budget", () => {
    const r = decideSmokePass({
      dimensionMatches: true,
      p50LatencyMs: 101,
      budgetMs: 100,
      expectedDim: 768,
      actualDim: 768,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("latency-over-budget");
      expect(r.details).toEqual({ p50_ms: 101, budget_ms: 100 });
    }
  });

  it("PASSES when p50 == budget exactly (boundary, inclusive)", () => {
    const r = decideSmokePass({
      dimensionMatches: true,
      p50LatencyMs: 100,
      budgetMs: 100,
      expectedDim: 768,
      actualDim: 768,
    });
    expect(r.ok).toBe(true);
  });

  it("FAILS when no warm samples produced (p50 null/undefined)", () => {
    expect(
      decideSmokePass({
        dimensionMatches: true,
        p50LatencyMs: null,
        budgetMs: 100,
        expectedDim: 768,
        actualDim: 768,
      }).ok,
    ).toBe(false);
    expect(
      decideSmokePass({
        dimensionMatches: true,
        p50LatencyMs: undefined,
        budgetMs: 100,
        expectedDim: 768,
        actualDim: 768,
      }).ok,
    ).toBe(false);
  });

  it("dim check happens BEFORE latency check (failure ordering contract)", () => {
    // Both are bad — must report dim-mismatch, not latency-over-budget.
    const r = decideSmokePass({
      dimensionMatches: false,
      p50LatencyMs: 5000,
      budgetMs: 100,
      expectedDim: 768,
      actualDim: 1024,
    });
    if (!r.ok) expect(r.reason).toBe("dim-mismatch");
  });
});

describe("P17-U01 parseArgs", () => {
  it("returns defaults when no flags given", () => {
    const a = parseArgs([]);
    expect(a.baseUrl).toBe("");
    expect(a.model).toBe("");
    expect(a.forcePull).toBe(false);
    expect(a.warmCalls).toBe(0);
    expect(a.maxWarmMs).toBe(0);
    expect(a.json).toBe(false);
    expect(a._unknown).toEqual([]);
  });

  it("parses --key value pairs", () => {
    const a = parseArgs([
      "--base-url", "http://other:9999",
      "--model", "different-model",
      "--warm-calls", "10",
      "--max-warm-ms", "250",
    ]);
    expect(a.baseUrl).toBe("http://other:9999");
    expect(a.model).toBe("different-model");
    expect(a.warmCalls).toBe(10);
    expect(a.maxWarmMs).toBe(250);
  });

  it("parses --key=value pairs", () => {
    const a = parseArgs([
      "--base-url=http://x:1",
      "--model=foo",
      "--warm-calls=7",
      "--max-warm-ms=50",
    ]);
    expect(a.baseUrl).toBe("http://x:1");
    expect(a.model).toBe("foo");
    expect(a.warmCalls).toBe(7);
    expect(a.maxWarmMs).toBe(50);
  });

  it("parses boolean --force-pull and --json flags", () => {
    const a = parseArgs(["--force-pull", "--json"]);
    expect(a.forcePull).toBe(true);
    expect(a.json).toBe(true);
  });

  it("collects unknown flags in _unknown for later inspection", () => {
    const a = parseArgs(["--unknown-flag", "--another"]);
    expect(a._unknown).toEqual(["--unknown-flag", "--another"]);
  });

  it("handles bare numeric flag value gracefully (NaN preserved)", () => {
    const a = parseArgs(["--warm-calls", "not-a-number"]);
    expect(Number.isNaN(a.warmCalls)).toBe(true);
  });

  it("handles --key with no following value (defaults to empty string / NaN)", () => {
    const a = parseArgs(["--base-url"]);
    expect(a.baseUrl).toBe("");
  });
});
