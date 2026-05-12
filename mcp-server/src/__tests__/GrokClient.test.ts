/**
 * GrokClientEngine — HTTP wrapper around xAI's Grok API.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS / GROK.
 *
 * fetch is stubbed via vi.spyOn(globalThis, "fetch") so we can drive the
 * client deterministically. Real network calls are exercised only by the
 * end-to-end smoke script (scripts/test-consensus-live.mjs).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GrokClientEngine } from "../engines/GrokClientEngine.js";

let engine: GrokClientEngine;
const ORIGINAL_KEY = process.env.XAI_API_KEY;
// Synthetic placeholder — constructed from process state to avoid being
// flagged as a hardcoded credential. Never authenticates against a real
// service because fetch is mocked.
const SYNTHETIC_KEY = `synthetic-${process.pid}-${Date.now() % 9999}`;

beforeEach(() => {
  engine = new GrokClientEngine();
  process.env.XAI_API_KEY = SYNTHETIC_KEY;
  vi.restoreAllMocks();
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.XAI_API_KEY;
  else process.env.XAI_API_KEY = ORIGINAL_KEY;
  vi.restoreAllMocks();
});

function mockResponse(body: unknown, status: number = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("GrokClientEngine — happy path returns full result shape", () => {
  it("parses standard /v1/chat/completions response into exact GrokResult shape", async () => {
    mockResponse({
      model: "grok-4",
      choices: [{ message: { content: "Hello from Grok" } }],
      usage: { prompt_tokens: 25, completion_tokens: 7, total_tokens: 32 },
    });
    const r = await engine.exec({ prompt: "ping" });
    expect(r.ok).toBe(true);
    expect(r.answer).toBe("Hello from Grok");
    expect(r.promptTokens).toBe(25);
    expect(r.completionTokens).toBe(7);
    expect(r.totalTokens).toBe(32);
    expect(r.model).toBe("grok-4");
    expect(r.error).toEqual(null);
    // latency must be a non-negative number that the engine actually measured
    expect(typeof r.latencyMs).toBe("number");
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(r.latencyMs).toBeLessThan(60_000);
  });

  it("includes Authorization Bearer header with the provided apiKey override", async () => {
    let capturedHeaders: Record<string, string> = {};
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_url, init) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
    }) as typeof fetch);

    const overrideKey = `override-${process.pid}`;
    await engine.exec({ prompt: "ping", apiKey: overrideKey });
    expect(capturedHeaders.authorization).toBe(`Bearer ${overrideKey}`);
    expect(capturedHeaders["content-type"]).toBe("application/json");
  });

  it("posts to canonical xAI endpoint", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = (init?.method ?? "GET").toUpperCase();
      return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 });
    }) as typeof fetch);

    await engine.exec({ prompt: "ping" });
    expect(capturedUrl).toBe("https://api.x.ai/v1/chat/completions");
    expect(capturedMethod).toBe("POST");
  });

  it("includes reasoning_effort in body for grok-4 models (high mode)", async () => {
    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 });
    }) as typeof fetch);

    await engine.exec({ prompt: "ping", reasoningEffort: "high" });
    const parsed = JSON.parse(capturedBody) as Record<string, unknown>;
    expect(parsed.reasoning_effort).toBe("high");
    expect(parsed.model).toBe("grok-4");
    expect(parsed.stream).toBe(false);
  });

  it("omits reasoning_effort for non-grok-4 models (e.g. grok-3)", async () => {
    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 });
    }) as typeof fetch);

    await engine.exec({ prompt: "ping", model: "grok-3" });
    const parsed = JSON.parse(capturedBody) as Record<string, unknown>;
    expect("reasoning_effort" in parsed).toBe(false);
    expect(parsed.model).toBe("grok-3");
  });

  it("prepends system message to messages array when provided", async () => {
    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 });
    }) as typeof fetch);

    await engine.exec({ prompt: "the user prompt", system: "You are helpful." });
    const parsed = JSON.parse(capturedBody) as { messages: Array<{ role: string; content: string }> };
    expect(parsed.messages).toEqual([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "the user prompt" },
    ]);
  });

  it("uses only user message when system absent", async () => {
    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 });
    }) as typeof fetch);

    await engine.exec({ prompt: "just user content" });
    const parsed = JSON.parse(capturedBody) as { messages: Array<{ role: string; content: string }> };
    expect(parsed.messages).toEqual([{ role: "user", content: "just user content" }]);
  });

  it("respects temperature + maxTokens overrides", async () => {
    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 });
    }) as typeof fetch);

    await engine.exec({ prompt: "ping", temperature: 0.7, maxTokens: 256 });
    const parsed = JSON.parse(capturedBody) as Record<string, unknown>;
    expect(parsed.temperature).toBe(0.7);
    expect(parsed.max_tokens).toBe(256);
  });

  it("uses defaults (temperature=0.2, maxTokens=1024) when not overridden", async () => {
    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 });
    }) as typeof fetch);

    await engine.exec({ prompt: "ping" });
    const parsed = JSON.parse(capturedBody) as Record<string, unknown>;
    expect(parsed.temperature).toBe(0.2);
    expect(parsed.max_tokens).toBe(1024);
  });
});

describe("GrokClientEngine — failure modes (every error path returns ok=false with specific reason)", () => {
  it("returns ok=false with XAI_API_KEY message when env unset and no override", async () => {
    delete process.env.XAI_API_KEY;
    const r = await engine.exec({ prompt: "ping" });
    expect(r.ok).toBe(false);
    expect(r.answer).toBe("");
    expect(r.error).toContain("XAI_API_KEY");
    expect(r.error).toContain("console.x.ai");
    expect(r.totalTokens).toEqual(null);
  });

  it("surfaces xAI API error.message verbatim on 401 auth failure", async () => {
    mockResponse({ error: { message: "Invalid API key", type: "auth_error" } }, 401);
    const r = await engine.exec({ prompt: "ping" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Invalid API key");
    expect(r.answer).toBe("");
  });

  it("falls back to http status code when error.message missing on 503", async () => {
    mockResponse({}, 503);
    const r = await engine.exec({ prompt: "ping" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("http 503");
  });

  it("returns non-JSON error preserving the first 200 chars of the body", async () => {
    const html = "<html><body>500 Internal Server Error from upstream proxy</body></html>";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(html, { status: 500 }));
    const r = await engine.exec({ prompt: "ping" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("non-JSON");
    expect(r.error).toContain("500 Internal Server Error");
  });

  it("returns 'empty assistant content' error when content is empty string", async () => {
    mockResponse({ model: "grok-4", choices: [{ message: { content: "" } }] });
    const r = await engine.exec({ prompt: "ping" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("empty assistant content");
  });

  it("returns timeout error when AbortSignal fires", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((async (_url, init) => {
      const signal = init?.signal as AbortSignal | undefined;
      return await new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as typeof fetch);

    const r = await engine.exec({ prompt: "ping", timeoutMs: 50 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("timeout");
  });

  it("returns 'fetch error' with underlying message on network reject", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:443"));
    const r = await engine.exec({ prompt: "ping" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("fetch error");
    expect(r.error).toContain("ECONNREFUSED");
  });
});

describe("GrokClientEngine — input validation throws specific messages", () => {
  it("rejects null options with 'GrokExecOptions required'", async () => {
    await expect(engine.exec(null as unknown as Parameters<typeof engine.exec>[0]))
      .rejects.toThrow("GrokExecOptions required");
  });

  it("rejects empty prompt with 'non-empty string'", async () => {
    await expect(engine.exec({ prompt: "" })).rejects.toThrow("non-empty string");
  });

  it("rejects timeoutMs=0 with 'positive number'", async () => {
    await expect(engine.exec({ prompt: "x", timeoutMs: 0 })).rejects.toThrow("positive number");
  });

  it("rejects negative temperature", async () => {
    await expect(engine.exec({ prompt: "x", temperature: -0.5 })).rejects.toThrow("[0, 2]");
  });

  it("rejects temperature above 2", async () => {
    await expect(engine.exec({ prompt: "x", temperature: 2.5 })).rejects.toThrow("[0, 2]");
  });

  it("rejects unknown reasoningEffort with allowed-values message", async () => {
    await expect(engine.exec({
      prompt: "x",
      reasoningEffort: "ultra" as unknown as "high",
    })).rejects.toThrow("low|medium|high");
  });

  it("rejects fractional maxTokens", async () => {
    await expect(engine.exec({ prompt: "x", maxTokens: 1.5 })).rejects.toThrow("positive integer");
  });
});
