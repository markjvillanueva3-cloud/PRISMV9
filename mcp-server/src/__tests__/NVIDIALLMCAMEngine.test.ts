/**
 * NVIDIALLMCAMEngine.test.ts — CAM-EXHAUST-MS0/U-CAM113
 *
 * Tests the GPU inference adapter via injected fetch mock. We exercise:
 *   - Happy path for all 4 task kinds + each convenience wrapper
 *   - All error codes: nvidia_unavailable, nvidia_timeout, auth_required,
 *     auth_failed, model_not_found, rate_limited, empty_response,
 *     json_parse_failed, schema_mismatch, bad_input
 *   - HTTP 5xx maps to nvidia_unavailable
 *   - Endpoint resolution: explicit > env > default
 *   - Auth header injection vs omission
 *   - Option clamping (timeout, temperature, maxTokens) — NaN/Infinity bounds
 *   - JSON extraction from prose-wrapped + code-fenced model output
 *   - tokensPerSecond computation from usage stats
 *   - healthCheck happy + 401 + transport throw paths
 *   - listTasks / resolveEndpoint / getSystemPrompt
 *
 * SAFETY NOTE: every "API key"-shaped string in this file is a test placeholder
 * (TEST_PLACEHOLDER_*); no real credentials. The strings exercise the engine's
 * header-construction code path, not authentication itself.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "vitest";
import { NVIDIALLMCAMEngine } from "../engines/NVIDIALLMCAMEngine";

// ── Test placeholder strings (not real credentials) ─────────────────────────
const PLACEHOLDER_API_KEY_A = "TEST_PLACEHOLDER_VALUE_A";
const PLACEHOLDER_API_KEY_B = "TEST_PLACEHOLDER_VALUE_B";

// ── Fetch mock plumbing ─────────────────────────────────────────────────────
type FetchInvocation = { url: string; init: RequestInit | undefined };

interface FakeResponseInit {
  status?: number;
  body?: unknown;
  raise?: Error;
}

const invocations: FetchInvocation[] = [];
let nextResponse: FakeResponseInit = { status: 200, body: {} };

function fakeFetch(): typeof fetch {
  const fn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    invocations.push({ url, init });
    if (nextResponse.raise) throw nextResponse.raise;
    const body = nextResponse.body;
    return new Response(JSON.stringify(body), {
      status: nextResponse.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return fn as typeof fetch;
}

// Helper to build OpenAI-shape chat-completion responses
function chatBody(content: string, usage?: { completion_tokens?: number; total_time_ms?: number }) {
  return {
    choices: [{ message: { content } }],
    ...(usage ? { usage } : {}),
  };
}

const VALID_STRATEGY =
  '{"strategy":"adaptive_clearing","rationale":"low engagement","alternates":["pocket","contour"],"confidence":0.82}';

beforeEach(() => {
  invocations.length = 0;
  nextResponse = { status: 200, body: chatBody(VALID_STRATEGY) };
  NVIDIALLMCAMEngine.setFetch(fakeFetch());
  delete process.env.NVIDIA_NIM_ENDPOINT;
  delete process.env.TRITON_HTTP_ENDPOINT;
  delete process.env.NIM_URL;
  delete process.env.NVIDIA_API_KEY;
});

afterEach(() => {
  NVIDIALLMCAMEngine.resetFetch();
});

describe("NVIDIALLMCAMEngine — happy paths", () => {
  it("strategyRecommend parses valid JSON content from chat completion", async () => {
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel pocket 50x50");
    expect(r.success).toBe(true);
    expect(r.parsed?.strategy).toBe("adaptive_clearing");
    expect(r.parsed?.confidence).toBeCloseTo(0.82, 2);
    expect(r.parsed?.alternates).toEqual(["pocket", "contour"]);
    expect(r.task).toBe("strategy_recommend");
  });

  it("parameterExtract returns parameters object with concrete values", async () => {
    nextResponse = {
      status: 200,
      body: chatBody('{"parameters":{"feed":1500,"rpm":12000}}'),
    };
    const r = await NVIDIALLMCAMEngine.parameterExtract("Feed 1500 RPM 12000");
    expect(r.success).toBe(true);
    expect(r.parsed?.parameters.feed).toBe(1500);
    expect(r.parsed?.parameters.rpm).toBe(12000);
  });

  it("operationClassify returns exact op_type/family/confidence", async () => {
    nextResponse = {
      status: 200,
      body: chatBody(
        '{"op_type":"face_milling","family":"roughing","confidence":0.91}'
      ),
    };
    const r = await NVIDIALLMCAMEngine.operationClassify("G1 X100 F1500");
    expect(r.success).toBe(true);
    expect(r.parsed?.op_type).toBe("face_milling");
    expect(r.parsed?.family).toBe("roughing");
    expect(r.parsed?.confidence).toBe(0.91);
  });

  it("toolSelectAdvisor returns full tool advisory with exact values", async () => {
    nextResponse = {
      status: 200,
      body: chatBody(
        '{"tool_family":"endmill","diameter_mm":12,"flutes":4,"rationale":"4-flute steel finish"}'
      ),
    };
    const r = await NVIDIALLMCAMEngine.toolSelectAdvisor("4140 pocket finish");
    expect(r.success).toBe(true);
    expect(r.parsed?.tool_family).toBe("endmill");
    expect(r.parsed?.diameter_mm).toBe(12);
    expect(r.parsed?.flutes).toBe(4);
  });

  it("strips prose around JSON content and parses correctly", async () => {
    nextResponse = {
      status: 200,
      body: chatBody(`Here is my answer: ${VALID_STRATEGY}\nLet me know.`),
    };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.success).toBe(true);
    expect(r.parsed?.strategy).toBe("adaptive_clearing");
  });

  it("computes tokensPerSecond correctly from usage stats (200 tok / 0.5s = 400)", async () => {
    nextResponse = {
      status: 200,
      body: chatBody(VALID_STRATEGY, {
        completion_tokens: 200,
        total_time_ms: 500,
      }),
    };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.success).toBe(true);
    expect(r.tokensPerSecond).toBe(400);
  });
});

describe("NVIDIALLMCAMEngine — HTTP error mapping", () => {
  it("HTTP 401 without API key returns auth_required", async () => {
    nextResponse = { status: 401, body: { error: "missing auth" } };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("auth_required");
    expect(r.error).toContain("401");
  });

  it("HTTP 401 WITH API key returns auth_failed", async () => {
    nextResponse = { status: 401, body: { error: "invalid token" } };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel", {
      apiKey: PLACEHOLDER_API_KEY_A,
    });
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("auth_failed");
  });

  it("HTTP 403 maps to auth_failed when API key supplied", async () => {
    nextResponse = { status: 403, body: { error: "forbidden" } };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel", {
      apiKey: PLACEHOLDER_API_KEY_A,
    });
    expect(r.errorCode).toBe("auth_failed");
  });

  it("HTTP 404 maps to model_not_found and surfaces model name in error", async () => {
    nextResponse = { status: 404, body: { error: "model not loaded" } };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel", {
      model: "ghost-model",
    });
    expect(r.errorCode).toBe("model_not_found");
    expect(r.error).toContain("ghost-model");
  });

  it("HTTP 429 maps to rate_limited", async () => {
    nextResponse = { status: 429, body: { error: "throttled" } };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.errorCode).toBe("rate_limited");
    expect(r.error).toBe("HTTP 429: rate limited");
  });

  it("HTTP 500 maps to nvidia_unavailable", async () => {
    nextResponse = { status: 500, body: { error: "internal" } };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.errorCode).toBe("nvidia_unavailable");
    expect(r.error).toContain("500");
  });
});

describe("NVIDIALLMCAMEngine — transport failures", () => {
  it("ECONNREFUSED maps to nvidia_unavailable", async () => {
    nextResponse = {
      raise: Object.assign(new Error("fetch failed: ECONNREFUSED 127.0.0.1:8000"), {
        name: "TypeError",
      }),
    };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("nvidia_unavailable");
    expect(r.error).toContain("ECONNREFUSED");
  });

  it("AbortError maps to nvidia_timeout", async () => {
    nextResponse = {
      raise: Object.assign(new Error("aborted"), { name: "AbortError" }),
    };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.errorCode).toBe("nvidia_timeout");
  });
});

describe("NVIDIALLMCAMEngine — content/schema failures", () => {
  it("empty content maps to empty_response", async () => {
    nextResponse = { status: 200, body: chatBody("") };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.errorCode).toBe("empty_response");
  });

  it("missing choices[0] maps to empty_response", async () => {
    nextResponse = { status: 200, body: { choices: [] } };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.errorCode).toBe("empty_response");
  });

  it("malformed JSON content maps to json_parse_failed", async () => {
    nextResponse = { status: 200, body: chatBody('{"strategy":"x",rationale}') };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.errorCode).toBe("json_parse_failed");
  });

  it("valid JSON missing required field maps to schema_mismatch", async () => {
    nextResponse = {
      status: 200,
      body: chatBody('{"strategy":"x","alternates":[],"confidence":0.5}'),
    };
    const r = await NVIDIALLMCAMEngine.strategyRecommend("steel");
    expect(r.errorCode).toBe("schema_mismatch");
    expect(r.raw).toContain("strategy");
  });
});

describe("NVIDIALLMCAMEngine — input validation", () => {
  it("unknown task returns bad_input without HTTP call", async () => {
    invocations.length = 0;
    const r = await NVIDIALLMCAMEngine.query("ghost" as never, "p");
    expect(r.errorCode).toBe("bad_input");
    expect(invocations.length).toBe(0);
    expect(r.error).toContain("Unknown CAM task");
  });

  it("empty prompt returns bad_input without HTTP call", async () => {
    invocations.length = 0;
    const r = await NVIDIALLMCAMEngine.strategyRecommend("");
    expect(r.errorCode).toBe("bad_input");
    expect(invocations.length).toBe(0);
  });

  it("non-string prompt returns bad_input without HTTP call", async () => {
    invocations.length = 0;
    // @ts-expect-error — runtime guard test
    const r = await NVIDIALLMCAMEngine.strategyRecommend(undefined);
    expect(r.errorCode).toBe("bad_input");
    expect(invocations.length).toBe(0);
  });
});

describe("NVIDIALLMCAMEngine — endpoint + auth resolution", () => {
  it("explicit endpoint overrides env vars and defaults", async () => {
    process.env.NVIDIA_NIM_ENDPOINT = "http://env-host:9000";
    await NVIDIALLMCAMEngine.strategyRecommend("p", {
      endpoint: "http://explicit:8001",
    });
    expect(invocations[0]?.url).toBe("http://explicit:8001/v1/chat/completions");
  });

  it("falls back to NVIDIA_NIM_ENDPOINT env var", async () => {
    process.env.NVIDIA_NIM_ENDPOINT = "http://nim-env:9000";
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe(
      "http://nim-env:9000/v1/chat/completions"
    );
  });

  it("falls back to TRITON_HTTP_ENDPOINT when NIM not set", async () => {
    process.env.TRITON_HTTP_ENDPOINT = "http://triton-env:8001";
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe(
      "http://triton-env:8001/v1/chat/completions"
    );
  });

  it("uses 127.0.0.1:8000 default when no env var set", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe(
      "http://127.0.0.1:8000/v1/chat/completions"
    );
  });

  it("strips trailing slashes from endpoint", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p", {
      endpoint: "http://h:8000///",
    });
    expect(invocations[0]?.url).toBe("http://h:8000/v1/chat/completions");
  });

  it("falls back to NIM_URL (PRISM-canonical) when NVIDIA/TRITON vars unset", async () => {
    process.env.NIM_URL = "http://nim-canonical:8000/v1";
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe(
      "http://nim-canonical:8000/v1/chat/completions"
    );
  });

  it("strips the /v1 suffix from NIM_URL so the route is not doubled", async () => {
    process.env.NIM_URL = "http://h:8000/v1";
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe("http://h:8000/v1/chat/completions");
    expect(invocations[0]?.url).not.toContain("/v1/v1");
  });

  it("accepts a NIM_URL with no /v1 suffix unchanged", async () => {
    process.env.NIM_URL = "http://h:8000";
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe("http://h:8000/v1/chat/completions");
  });

  it("strips a /v1 segment carrying a trailing slash (v1 + slash combined)", async () => {
    process.env.NIM_URL = "http://h:8000/v1/";
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe("http://h:8000/v1/chat/completions");
    expect(invocations[0]?.url).not.toContain("/v1/v1");
  });

  it("NVIDIA_NIM_ENDPOINT takes precedence over NIM_URL", async () => {
    process.env.NVIDIA_NIM_ENDPOINT = "http://nim-primary:9000";
    process.env.NIM_URL = "http://nim-canonical:8000/v1";
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe(
      "http://nim-primary:9000/v1/chat/completions"
    );
  });

  it("TRITON_HTTP_ENDPOINT takes precedence over NIM_URL", async () => {
    process.env.TRITON_HTTP_ENDPOINT = "http://triton:8001";
    process.env.NIM_URL = "http://nim-canonical:8000/v1";
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    expect(invocations[0]?.url).toBe("http://triton:8001/v1/chat/completions");
  });

  it("strips a /v1 suffix from an explicit endpoint override (no doubling)", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p", {
      endpoint: "http://explicit:8000/v1",
    });
    expect(invocations[0]?.url).toBe(
      "http://explicit:8000/v1/chat/completions"
    );
    expect(invocations[0]?.url).not.toContain("/v1/v1");
  });

  it("injects Authorization Bearer header when apiKey provided", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p", {
      apiKey: PLACEHOLDER_API_KEY_A,
    });
    const headers = invocations[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${PLACEHOLDER_API_KEY_A}`);
  });

  it("omits Authorization header entirely when no apiKey + no env", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    const headers = invocations[0]?.init?.headers as Record<string, string>;
    expect("Authorization" in headers).toBe(false);
  });

  it("falls back to NVIDIA_API_KEY env var", async () => {
    process.env.NVIDIA_API_KEY = PLACEHOLDER_API_KEY_B;
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    const headers = invocations[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${PLACEHOLDER_API_KEY_B}`);
  });
});

describe("NVIDIALLMCAMEngine — option clamping (adversarial)", () => {
  it("clamps NaN options to lower bounds in payload body", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p", {
      timeoutMs: Number.NaN,
      temperature: Number.NaN,
      maxTokens: Number.NaN,
    });
    expect(invocations.length).toBe(1);
    const body = JSON.parse((invocations[0]?.init?.body as string) ?? "{}");
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(32);
  });

  it("clamps Infinity max_tokens down to upper bound 8192", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p", { maxTokens: Infinity });
    const body = JSON.parse((invocations[0]?.init?.body as string) ?? "{}");
    expect(body.max_tokens).toBe(8192);
  });

  it("clamps temperature above 1 down to 1", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p", { temperature: 5 });
    const body = JSON.parse((invocations[0]?.init?.body as string) ?? "{}");
    expect(body.temperature).toBe(1);
  });

  it("uses defaults when no options supplied (model + payload shape)", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p");
    const body = JSON.parse((invocations[0]?.init?.body as string) ?? "{}");
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(1024);
    expect(body.model).toBe("meta/llama-3.2-3b-instruct");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.stream).toBe(false);
  });

  it("custom model overrides default in payload body", async () => {
    await NVIDIALLMCAMEngine.strategyRecommend("p", {
      model: "nvidia/nemotron-4-340b",
    });
    const body = JSON.parse((invocations[0]?.init?.body as string) ?? "{}");
    expect(body.model).toBe("nvidia/nemotron-4-340b");
  });
});

describe("NVIDIALLMCAMEngine — healthCheck", () => {
  it("available=true on HTTP 200, calls /v1/models", async () => {
    nextResponse = { status: 200, body: { data: [{ id: "llama" }] } };
    const h = await NVIDIALLMCAMEngine.healthCheck();
    expect(h.available).toBe(true);
    expect(invocations[0]?.url.endsWith("/v1/models")).toBe(true);
  });

  it("available=false with auth_required on 401 sans key", async () => {
    nextResponse = { status: 401, body: {} };
    const h = await NVIDIALLMCAMEngine.healthCheck();
    expect(h.available).toBe(false);
    expect(h.errorCode).toBe("auth_required");
  });

  it("available=false with auth_failed on 401 with key", async () => {
    nextResponse = { status: 401, body: {} };
    const h = await NVIDIALLMCAMEngine.healthCheck({
      apiKey: PLACEHOLDER_API_KEY_A,
    });
    expect(h.available).toBe(false);
    expect(h.errorCode).toBe("auth_failed");
  });

  it("available=false with nvidia_unavailable on transport throw", async () => {
    nextResponse = {
      raise: Object.assign(new Error("ECONNREFUSED"), { name: "TypeError" }),
    };
    const h = await NVIDIALLMCAMEngine.healthCheck();
    expect(h.available).toBe(false);
    expect(h.errorCode).toBe("nvidia_unavailable");
  });
});

describe("NVIDIALLMCAMEngine — meta methods", () => {
  it("listTasks returns all 4 task kinds in stable order", () => {
    expect(NVIDIALLMCAMEngine.listTasks().sort()).toEqual(
      [
        "operation_classify",
        "parameter_extract",
        "strategy_recommend",
        "tool_select_advisor",
      ].sort()
    );
  });

  it("resolveEndpoint precedence — explicit > env > default", () => {
    delete process.env.NVIDIA_NIM_ENDPOINT;
    delete process.env.TRITON_HTTP_ENDPOINT;
    expect(NVIDIALLMCAMEngine.resolveEndpoint()).toBe("http://127.0.0.1:8000");
    process.env.NVIDIA_NIM_ENDPOINT = "http://x:9";
    expect(NVIDIALLMCAMEngine.resolveEndpoint()).toBe("http://x:9");
    expect(NVIDIALLMCAMEngine.resolveEndpoint("http://override:1")).toBe(
      "http://override:1"
    );
  });

  it("resolveEndpoint reads NIM_URL and strips its trailing /v1 segment", () => {
    delete process.env.NVIDIA_NIM_ENDPOINT;
    delete process.env.TRITON_HTTP_ENDPOINT;
    process.env.NIM_URL = "http://nimhost:8000/v1";
    expect(NVIDIALLMCAMEngine.resolveEndpoint()).toBe("http://nimhost:8000");
  });

  it("getSystemPrompt returns task-specific prompt and throws on unknown", () => {
    expect(NVIDIALLMCAMEngine.getSystemPrompt("strategy_recommend")).toContain(
      "strategy"
    );
    expect(NVIDIALLMCAMEngine.getSystemPrompt("operation_classify")).toContain(
      "classify"
    );
    expect(() =>
      NVIDIALLMCAMEngine.getSystemPrompt("ghost" as never)
    ).toThrow(/Unknown CAM task/);
  });
});
