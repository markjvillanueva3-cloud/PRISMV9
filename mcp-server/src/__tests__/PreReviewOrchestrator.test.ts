/**
 * PreReviewOrchestratorEngine — orchestration tests with Ollama stubbed.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P22-U01.
 *
 * The engine talks to Ollama for the actual draft. These tests stub the
 * generate path so we can assert: routing decisions flow through, escalation
 * skips drafting, parser handles <think>/</think> blocks, confidence math is
 * deterministic, validation rejects bad input, and connect/generate failures
 * surface as structured `ok: false` instead of throws.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PreReviewOrchestratorEngine } from "../engines/PreReviewOrchestratorEngine.js";
import { ollamaClientEngine } from "../engines/OllamaClientEngine.js";

describe("PreReviewOrchestratorEngine — parseDraft", () => {
  const engine = new PreReviewOrchestratorEngine();

  it("extracts <think> reasoning_chain and trailing draft", () => {
    const raw = "<think>The user wants X. Considering Y. Therefore Z.</think>\n\nFinal: do Z.";
    const d = engine.parseDraft(raw);
    expect(d.reasoning_chain).toBe("The user wants X. Considering Y. Therefore Z.");
    expect(d.draft).toBe("Final: do Z.");
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });

  it("when no <think> block, treats whole text as draft and sets low confidence", () => {
    const raw = "Just a flat answer with no chain.";
    const d = engine.parseDraft(raw);
    expect(d.reasoning_chain).toBe("");
    expect(d.draft).toBe("Just a flat answer with no chain.");
    expect(d.confidence).toBeLessThan(0.5); // missed the +0.4 think bump and the +0.3 chain bump
  });

  it("confidence is 1.0 when all three heuristics fire", () => {
    const longChain = "x".repeat(250);
    const longDraft = "y".repeat(60);
    const raw = `<think>${longChain}</think>${longDraft}`;
    const d = engine.parseDraft(raw);
    expect(d.confidence).toBe(1);
  });

  it("confidence is 0 for empty input", () => {
    const d = engine.parseDraft("");
    expect(d.reasoning_chain).toBe("");
    expect(d.draft).toBe("");
    expect(d.confidence).toBe(0);
  });

  it("multiline reasoning is preserved verbatim", () => {
    const raw = "<think>line1\nline2\nline3</think>\nfinal";
    const d = engine.parseDraft(raw);
    expect(d.reasoning_chain).toBe("line1\nline2\nline3");
    expect(d.draft).toBe("final");
  });
});

describe("PreReviewOrchestratorEngine — input validation", () => {
  const engine = new PreReviewOrchestratorEngine();

  it("rejects null input", async () => {
    await expect(engine.draftReview(null as unknown as Parameters<typeof engine.draftReview>[0]))
      .rejects.toThrow(/PreReviewInput required/);
  });

  it("rejects empty prompt", async () => {
    await expect(engine.draftReview({ prompt: "" })).rejects.toThrow(/prompt/);
  });

  it("rejects non-string context", async () => {
    await expect(engine.draftReview({ prompt: "x", context: 123 as unknown as string }))
      .rejects.toThrow(/context/);
  });

  it("rejects non-positive maxTokens", async () => {
    await expect(engine.draftReview({ prompt: "x", maxTokens: 0 })).rejects.toThrow(/maxTokens/);
    await expect(engine.draftReview({ prompt: "x", maxTokens: 1.5 })).rejects.toThrow(/maxTokens/);
  });

  it("rejects out-of-range temperature", async () => {
    await expect(engine.draftReview({ prompt: "x", temperature: -0.1 })).rejects.toThrow(/temperature/);
    await expect(engine.draftReview({ prompt: "x", temperature: 2.5 })).rejects.toThrow(/temperature/);
  });
});

describe("PreReviewOrchestratorEngine — routing + escalation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("escalates safety domain to Claude (skips R1, used=false)", async () => {
    const engine = new PreReviewOrchestratorEngine();
    const r = await engine.draftReview({
      prompt: "Validate Kienzle force calculation for AISI 4340 at 200m/min",
      domain: "safety",
    });
    expect(r.ok).toBe(true);
    expect(r.used).toBe(false);
    expect(r.tier).toBe(5);
    expect(r.model).toBe("claude");
    expect(r.draft).toBeNull();
    expect(r.reason).toContain("Claude leads");
  });

  it("escalates physics domain to Claude", async () => {
    const engine = new PreReviewOrchestratorEngine();
    const r = await engine.draftReview({ prompt: "Refactor toolpath optimizer", domain: "physics" });
    expect(r.used).toBe(false);
    expect(r.tier).toBe(5);
  });

  it("returns error result (not throws) when Ollama connect fails", async () => {
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(false);
    vi.spyOn(ollamaClientEngine, "connect").mockResolvedValue({
      ok: false,
      value: null,
      error: "ECONNREFUSED",
      wallMs: 5,
    });

    const engine = new PreReviewOrchestratorEngine();
    const r = await engine.draftReview({ prompt: "Refactor X", domain: "general" });
    expect(r.ok).toBe(false);
    expect(r.used).toBe(false);
    expect(r.error).toContain("escalation");
    expect(r.reason).toContain("ollama connect failed");
  });

  it("returns error result when Ollama generate fails", async () => {
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: false,
      value: null,
      error: "model loading timeout",
      wallMs: 30000,
    });

    const engine = new PreReviewOrchestratorEngine();
    const r = await engine.draftReview({ prompt: "Refactor X" });
    expect(r.ok).toBe(false);
    expect(r.used).toBe(false);
    expect(r.error).toContain("escalation");
  });

  it("happy path: stub generate, expect parsed draft + tier-3 model", async () => {
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: true,
      value: "<think>Need to refactor X. Plan: rename, add tests, run.</think>Final plan: rename X to Y; add 3 tests.",
      error: null,
      wallMs: 1234,
    });

    const engine = new PreReviewOrchestratorEngine();
    const r = await engine.draftReview({ prompt: "Refactor X to Y" });
    expect(r.ok).toBe(true);
    expect(r.used).toBe(true);
    expect(r.tier).toBe(3);
    expect(r.model).toBe("deepseek-r1:14b");
    expect(r.draft).not.toBeNull();
    expect(r.draft!.draft).toContain("rename X to Y");
    expect(r.draft!.reasoning_chain).toContain("rename, add tests, run");
    expect(r.draft!.confidence).toBeGreaterThan(0);
    expect(r.error).toBeNull();
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("appends context when provided", async () => {
    let capturedPrompt = "";
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      capturedPrompt = opts.prompt;
      return { ok: true, value: "<think>x</think>y", error: null, wallMs: 1 };
    });

    const engine = new PreReviewOrchestratorEngine();
    await engine.draftReview({ prompt: "fix bug", context: "function foo() { return 1; }" });

    expect(capturedPrompt).toContain("fix bug");
    expect(capturedPrompt).toContain("=== CONTEXT ===");
    expect(capturedPrompt).toContain("function foo()");
  });

  it("uses default temperature 0.2 unless overridden", async () => {
    let capturedTemp: number | undefined;
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      capturedTemp = opts.temperature;
      return { ok: true, value: "x", error: null, wallMs: 1 };
    });

    const engine = new PreReviewOrchestratorEngine();
    await engine.draftReview({ prompt: "fix" });
    expect(capturedTemp).toBe(0.2);

    await engine.draftReview({ prompt: "fix", temperature: 0.7 });
    expect(capturedTemp).toBe(0.7);
  });

  it("uses default maxTokens 1024 unless overridden", async () => {
    let capturedMax: number | undefined;
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      capturedMax = opts.maxTokens;
      return { ok: true, value: "x", error: null, wallMs: 1 };
    });

    const engine = new PreReviewOrchestratorEngine();
    await engine.draftReview({ prompt: "fix" });
    expect(capturedMax).toBe(1024);

    await engine.draftReview({ prompt: "fix", maxTokens: 256 });
    expect(capturedMax).toBe(256);
  });
});
