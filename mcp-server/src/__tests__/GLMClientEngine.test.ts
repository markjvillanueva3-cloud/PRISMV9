/**
 * GLMClientEngine tests -- HERMES-UTIL/OCTOPUS-CONSENSUS/GLM (2026-06-18 slot:zulu).
 * Hermetic: stubs global fetch + manages process.env; no real network. R9: each
 * asserts intent (gate, retry policy, body shape), not just "defined".
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GLMClientEngine } from "../engines/GLMClientEngine.js";

const KEYS = ["GLM_API_KEY", "ZHIPU_API_KEY", "PRISM_GLM_MODEL", "GLM_BASE_URL"];
let saved: Record<string, string | undefined>;

function okResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeEach(() => {
  saved = {};
  for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
});
afterEach(() => {
  for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  vi.restoreAllMocks();
});

describe("GLMClientEngine", () => {
  const eng = new GLMClientEngine();

  it("validate: empty/missing prompt throws", async () => {
    await expect(eng.run({ prompt: "" })).rejects.toThrow(/non-empty/);
    // @ts-expect-error intentional bad input
    await expect(eng.run({})).rejects.toThrow(/non-empty/);
  });

  it("missing key -> ok:false with GLM-specific message, NO fetch call (strict no-op gate)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const r = await eng.run({ prompt: "hi" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/missing GLM_API_KEY \/ ZHIPU_API_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled(); // gated before any network
  });

  it("isAvailable reflects env key presence (the consensus includeX gate)", () => {
    expect(eng.isAvailable()).toBe(false);
    process.env.ZHIPU_API_KEY = "k";
    expect(eng.isAvailable()).toBe(true);
  });

  it("success: 200 OpenAI body -> ok:true with answer + tokens + model", async () => {
    process.env.GLM_API_KEY = "k";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse({
      choices: [{ message: { content: "GLM_OK" } }],
      usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
      model: "glm-4.6",
    }));
    const r = await eng.run({ prompt: "ping" });
    expect(r.ok).toBe(true);
    expect(r.answer).toBe("GLM_OK");
    expect(r.totalTokens).toBe(10);
    expect(r.model).toBe("glm-4.6");
    expect(r.error).toBeNull();
  });

  it("model override: PRISM_GLM_MODEL=glm-5.2 is sent in the request body", async () => {
    process.env.GLM_API_KEY = "k";
    process.env.PRISM_GLM_MODEL = "glm-5.2";
    let sentBody: any = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init: any) => {
      sentBody = JSON.parse(init.body);
      return okResponse({ choices: [{ message: { content: "x" } }] });
    });
    await eng.run({ prompt: "ping" });
    expect(sentBody.model).toBe("glm-5.2"); // the GLM-5.2 activation path
  });

  it("non-retriable HTTP 400 -> ok:false, single attempt (no retry)", async () => {
    process.env.GLM_API_KEY = "k";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okResponse({ error: { message: "bad request" } }, 400),
    );
    const r = await eng.run({ prompt: "ping", retries: 2, retryBaseDelayMs: 0 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/bad request/);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // 400 is fatal, not retried
  });

  it("retriable 429 then 200 -> ok:true after retry (retries=1)", async () => {
    process.env.GLM_API_KEY = "k";
    let n = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      n++;
      if (n === 1) return okResponse({ error: { message: "rate limited" } }, 429);
      return okResponse({ choices: [{ message: { content: "after-retry" } }] });
    });
    const r = await eng.run({ prompt: "ping", retries: 2, retryBaseDelayMs: 0 });
    expect(r.ok).toBe(true);
    expect(r.answer).toBe("after-retry");
    expect(r.retries).toBe(1);
  });

  it("empty assistant content -> ok:false (fatal, surfaced not silently passed)", async () => {
    process.env.GLM_API_KEY = "k";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okResponse({ choices: [{ message: { content: "" } }] }),
    );
    const r = await eng.run({ prompt: "ping" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/empty assistant content/);
  });
});
