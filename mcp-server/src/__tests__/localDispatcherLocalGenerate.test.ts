// localDispatcherLocalGenerate.test.ts -- LOCAL-LLM-MS1 / U-LOCAL-GENERATE
// Verifies the local_generate action wiring on prism_local: the action that lets ANY
// caller route an arbitrary local-LLM generation THROUGH the MCP server (not direct :11434).
// DETERMINISTIC contract tests (no network): action registration, schema defaults, validation
// rejection. The live Ollama round-trip is proven at ship time and recorded in the commit --
// a committed test must not depend on a running Ollama daemon (R12: a silently-skipped test
// when Ollama is down would be a false pass).
import { describe, it, expect, afterEach } from "vitest";
import { localDispatcher } from "../tools/dispatchers/localDispatcher.js";
import {
  LOCAL_ACTIONS,
  LocalGenerateInputSchema,
  LocalGenerateOutputSchema,
  ACTION_LOCAL_SCHEMAS,
} from "../schemas/localActionSchemas.js";

describe("prism_local local_generate -- wiring + contract", () => {
  // Several tests stub globalThis.fetch + restore it in their own try/finally. This
  // afterEach is the belt-and-suspenders net: it guarantees the real fetch is restored
  // after EVERY test even if one ever throws before its finally, so a stubbed fetch can
  // never leak into a sibling test (the cross-test contamination scrutiny arm-A observed
  // once on the byte-identical-omit invariant). REAL_FETCH is captured at module load,
  // before any test stubs it.
  const REAL_FETCH = globalThis.fetch;
  afterEach(() => { globalThis.fetch = REAL_FETCH; });

  it("registers local_generate in the action enum (anti-regression: count strictly grew)", () => {
    expect(LOCAL_ACTIONS).toContain("local_generate");
    expect(LOCAL_ACTIONS.length).toBeGreaterThanOrEqual(18);
  });

  it("binds the input + output schemas in ACTION_LOCAL_SCHEMAS", () => {
    expect(ACTION_LOCAL_SCHEMAS.local_generate.input).toBe(LocalGenerateInputSchema);
    expect(ACTION_LOCAL_SCHEMAS.local_generate.output).toBe(LocalGenerateOutputSchema);
  });

  it("applies the documented defaults (model/system/temperature/maxTokens/timeout)", () => {
    const parsed = LocalGenerateInputSchema.parse({ prompt: "hello" });
    expect(parsed.model).toBe("gpt-oss:20b");
    expect(parsed.system).toBe("You are a concise, accurate assistant.");
    expect(parsed.temperature).toBe(0.2);
    expect(parsed.maxTokens).toBe(2048);
    expect(parsed.timeoutMs).toBe(120000);
  });

  it("preserves a caller-supplied model + temperature instead of the default", () => {
    const parsed = LocalGenerateInputSchema.parse({ prompt: "x", model: "gpt-oss:120b", temperature: 0.7 });
    expect(parsed.model).toBe("gpt-oss:120b");
    expect(parsed.temperature).toBe(0.7);
  });

  it("rejects an empty prompt (the required field) via the schema", () => {
    expect(LocalGenerateInputSchema.safeParse({ prompt: "" }).success).toBe(false);
  });

  it("clamps temperature to the valid 0..2 range", () => {
    expect(LocalGenerateInputSchema.safeParse({ prompt: "x", temperature: 3 }).success).toBe(false);
    expect(LocalGenerateInputSchema.safeParse({ prompt: "x", temperature: -0.1 }).success).toBe(false);
    expect(LocalGenerateInputSchema.safeParse({ prompt: "x", temperature: 1.5 }).success).toBe(true);
  });

  it("numCtx is optional (not materialized by default), accepts its 256..131072 bounds, rejects out-of-range", () => {
    const dflt = LocalGenerateInputSchema.parse({ prompt: "x" });
    expect(Object.prototype.hasOwnProperty.call(dflt, "numCtx")).toBe(false); // optional -> absent, not a default value
    expect(LocalGenerateInputSchema.parse({ prompt: "x", numCtx: 32768 }).numCtx).toBe(32768);
    expect(LocalGenerateInputSchema.safeParse({ prompt: "x", numCtx: 256 }).success).toBe(true);     // lower bound inclusive
    expect(LocalGenerateInputSchema.safeParse({ prompt: "x", numCtx: 131072 }).success).toBe(true);  // upper bound inclusive
    expect(LocalGenerateInputSchema.safeParse({ prompt: "x", numCtx: 255 }).success).toBe(false);    // below 256
    expect(LocalGenerateInputSchema.safeParse({ prompt: "x", numCtx: 131073 }).success).toBe(false); // above 131072
    expect(LocalGenerateInputSchema.safeParse({ prompt: "x", numCtx: 32768.5 }).success).toBe(false); // must be int
  });

  it("dispatcher rejects an empty prompt with a structured validation error (not a throw)", async () => {
    const res = await localDispatcher("local_generate", { prompt: "" });
    expect(res.success).toBe(false);
    expect(res.action).toBe("local_generate");
    expect(res.error).toMatch(/valid|prompt/i);
  });

  it("dispatcher rejects an unknown action and lists the valid actions", async () => {
    const res = await localDispatcher("not_a_real_action", {});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Invalid action/);
  });

  // Hermetic full-chain test (dispatcher -> engine -> Ollama request body) with fetch stubbed:
  // proves the caller's model/temperature/maxTokens/prompt actually reach the request, so a
  // silent mis-wire of the opts plumbing would FAIL here (it would otherwise pass every test above).
  it("plumbs caller model/temperature/maxTokens/prompt through to the Ollama request body", async () => {
    type OllamaBody = {
      model: string;
      options: { temperature: number; num_predict: number };
      messages: Array<{ role: string; content: string }>;
    };
    const origFetch = globalThis.fetch;
    let capturedBody: OllamaBody | null = null;
    globalThis.fetch = (async (_url: string, init: { body: string }) => {
      capturedBody = JSON.parse(init.body); // JSON.parse returns any -> assigns to OllamaBody
      return { ok: true, json: async () => ({ message: { content: "STUBBED-OK" } }) };
    }) as unknown as typeof fetch;
    try {
      const res = await localDispatcher("local_generate", {
        prompt: "ping", model: "qwen2.5-coder:32b", temperature: 0.9, maxTokens: 123,
      });
      expect(res.success).toBe(true);
      const data = res.data as { content: string; model: string };
      expect(data.content).toBe("STUBBED-OK");
      expect(data.model).toBe("qwen2.5-coder:32b");
      const body = capturedBody;
      if (!body) throw new Error("fetch was never called -- dispatcher did not reach the engine");
      expect(body.model).toBe("qwen2.5-coder:32b");
      expect(body.options.temperature).toBe(0.9);
      expect(body.options.num_predict).toBe(123);
      expect(body.messages[1].content).toBe("ping");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("plumbs numCtx through to the Ollama request as options.num_ctx (large-context callers must not truncate)", async () => {
    type OllamaBody = { options: { temperature: number; num_predict: number; num_ctx?: number } };
    const origFetch = globalThis.fetch;
    let capturedBody: OllamaBody | null = null;
    globalThis.fetch = (async (_url: string, init: { body: string }) => {
      capturedBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ message: { content: "OK" } }) };
    }) as unknown as typeof fetch;
    try {
      const res = await localDispatcher("local_generate", { prompt: "ping", numCtx: 32768 });
      expect(res.success).toBe(true);
      const body = capturedBody;
      if (!body) throw new Error("fetch was never called -- dispatcher did not reach the engine");
      expect(body.options.num_ctx).toBe(32768);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("omits num_ctx from the request when the caller does not set numCtx (byte-identical legacy: model default context)", async () => {
    type OllamaBody = { options: { temperature: number; num_predict: number; num_ctx?: number } };
    const origFetch = globalThis.fetch;
    let capturedBody: OllamaBody | null = null;
    globalThis.fetch = (async (_url: string, init: { body: string }) => {
      capturedBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ message: { content: "OK" } }) };
    }) as unknown as typeof fetch;
    try {
      await localDispatcher("local_generate", { prompt: "ping" });
      const body = capturedBody;
      if (!body) throw new Error("fetch was never called -- dispatcher did not reach the engine");
      expect(Object.prototype.hasOwnProperty.call(body.options, "num_ctx")).toBe(false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("surfaces an Ollama failure in `error` (not content) with success:false", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    try {
      const res = await localDispatcher("local_generate", { prompt: "ping" });
      expect(res.success).toBe(false);
      const data = res.data as { content: string; error?: string; ollamaUsed: boolean; tokensSaved: number };
      expect(data.content).toBe("");
      expect(data.error).toMatch(/Ollama HTTP 503/);
      expect(data.ollamaUsed).toBe(false);
      expect(data.tokensSaved).toBe(0);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
