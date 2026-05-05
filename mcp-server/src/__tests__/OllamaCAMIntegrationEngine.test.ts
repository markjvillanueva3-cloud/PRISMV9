/**
 * OllamaCAMIntegrationEngine.test.ts — CAM-EXHAUST-MS0/U-CAM112
 *
 * Mocks OllamaHookBridgeEngine at the module level so we exercise every
 * happy/failure path of the CAM-domain wrapper deterministically without
 * a live Ollama daemon.
 *
 * Coverage:
 *   - All 4 task kinds (strategy_recommend, parameter_extract,
 *     operation_classify, tool_select_advisor) — happy path
 *   - All 4 convenience wrappers
 *   - JSON extraction: bare object · code-fenced · prose-wrapped · no JSON
 *   - Schema validation: each task's required-field contract
 *   - Failure modes: ollama_unavailable, ollama_timeout, empty_response,
 *     json_parse_failed, schema_mismatch, bad_input, transport throw
 *   - Adversarial: clamped timeoutMs / temperature / maxTokens
 *   - Bounds: NaN/Infinity option values clamp to sane defaults
 *   - healthCheck happy + failure
 *   - listTasks / getSystemPrompt
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Module-level mock state (re-set in beforeEach) ──────────────────────────
type BridgeQueryResult = {
  success: boolean;
  response: string | null;
  model: string;
  latencyMs: number;
  error?: string;
  fallbackUsed: boolean;
};

interface MockBridgeState {
  queryImpl: () => Promise<BridgeQueryResult>;
  statusImpl: () => Promise<{
    available: boolean;
    baseUrl: string;
    models: string[];
    defaultModel: string;
    lastCheckMs: number;
    error?: string;
  }>;
  queryCalls: Array<{ prompt: string; options: Record<string, unknown> }>;
}

const bridgeState: MockBridgeState = {
  queryImpl: async () => ({
    success: false,
    response: null,
    model: "qwen2.5-coder:7b",
    latencyMs: 0,
    fallbackUsed: true,
    error: "default mock — set bridgeState.queryImpl in test",
  }),
  statusImpl: async () => ({
    available: false,
    baseUrl: "http://localhost:11434",
    models: [],
    defaultModel: "qwen2.5-coder:7b",
    lastCheckMs: 0,
    error: "default mock",
  }),
  queryCalls: [],
};

vi.mock("../engines/OllamaHookBridgeEngine.js", () => ({
  ollamaHookBridgeEngine: {
    query: async (prompt: string, options: Record<string, unknown>) => {
      bridgeState.queryCalls.push({ prompt, options });
      return bridgeState.queryImpl();
    },
    status: async () => bridgeState.statusImpl(),
  },
  OllamaHookBridgeEngine: class {
    static getInstance() {
      return null;
    }
  },
}));

// Import AFTER vi.mock so the dynamic import inside the engine resolves
// to the mock.
import { OllamaCAMIntegrationEngine } from "../engines/OllamaCAMIntegrationEngine";

// ── Helpers ─────────────────────────────────────────────────────────────────
const ok = (responseBody: string): BridgeQueryResult => ({
  success: true,
  response: responseBody,
  model: "qwen2.5-coder:7b",
  latencyMs: 50,
  fallbackUsed: false,
});

const fail = (error: string, fallbackUsed = true): BridgeQueryResult => ({
  success: false,
  response: null,
  model: "qwen2.5-coder:7b",
  latencyMs: 5,
  fallbackUsed,
  error,
});

beforeEach(() => {
  bridgeState.queryCalls = [];
  bridgeState.queryImpl = async () =>
    fail("default mock — set bridgeState.queryImpl in test");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("OllamaCAMIntegrationEngine — strategy_recommend", () => {
  const validBody =
    '{"strategy":"adaptive_clearing","rationale":"low engagement","alternates":["pocket","contour"],"confidence":0.82}';

  it("happy path — parses valid JSON and returns typed envelope", async () => {
    bridgeState.queryImpl = async () => ok(validBody);
    const r = await OllamaCAMIntegrationEngine.strategyRecommend(
      "Steel pocket 50x50x10mm, 12mm endmill"
    );
    expect(r.success).toBe(true);
    expect(r.task).toBe("strategy_recommend");
    expect(r.parsed?.strategy).toBe("adaptive_clearing");
    expect(r.parsed?.confidence).toBeCloseTo(0.82, 2);
    expect(r.parsed?.alternates).toEqual(["pocket", "contour"]);
    expect(r.fallbackUsed).toBe(false);
  });

  it("strips code fences when model wraps JSON in ```json ... ```", async () => {
    bridgeState.queryImpl = async () => ok("```json\n" + validBody + "\n```");
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel slot");
    expect(r.success).toBe(true);
    expect(r.parsed?.strategy).toBe("adaptive_clearing");
  });

  it("extracts JSON when surrounded by prose", async () => {
    bridgeState.queryImpl = async () =>
      ok(`Here is my answer: ${validBody}\n\nLet me know if you need more.`);
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel");
    expect(r.success).toBe(true);
    expect(r.parsed?.strategy).toBe("adaptive_clearing");
  });

  it("schema mismatch when JSON missing required key returns errorCode", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"strategy":"x","alternates":[],"confidence":0.5}'); // no rationale
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("schema_mismatch");
    expect(r.parsed).toBeNull();
    expect(r.raw).toContain("strategy");
  });
});

describe("OllamaCAMIntegrationEngine — parameter_extract", () => {
  it("happy path returns parameters object", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"parameters":{"feed":1500,"rpm":12000,"coolant":"flood"}}');
    const r = await OllamaCAMIntegrationEngine.parameterExtract(
      "Pocket: 6000mm/min feed, 12000 rpm, flood"
    );
    expect(r.success).toBe(true);
    expect(r.parsed?.parameters.feed).toBe(1500);
    expect(r.parsed?.parameters.coolant).toBe("flood");
  });

  it("schema mismatch when 'parameters' is null", async () => {
    bridgeState.queryImpl = async () => ok('{"parameters":null}');
    const r = await OllamaCAMIntegrationEngine.parameterExtract("anything");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("schema_mismatch");
  });
});

describe("OllamaCAMIntegrationEngine — operation_classify", () => {
  it("happy path classifies op_type/family", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"op_type":"face_milling","family":"roughing","confidence":0.91}');
    const r = await OllamaCAMIntegrationEngine.operationClassify(
      "G0 Z25 / G1 X100 F1500 / repeat across"
    );
    expect(r.success).toBe(true);
    expect(r.parsed?.op_type).toBe("face_milling");
    expect(r.parsed?.family).toBe("roughing");
  });

  it("schema mismatch when confidence is non-numeric", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"op_type":"x","family":"y","confidence":"high"}');
    const r = await OllamaCAMIntegrationEngine.operationClassify("any");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("schema_mismatch");
  });
});

describe("OllamaCAMIntegrationEngine — tool_select_advisor", () => {
  it("happy path returns tool advisory", async () => {
    bridgeState.queryImpl = async () =>
      ok(
        '{"tool_family":"endmill","diameter_mm":12,"flutes":4,"rationale":"4-flute for steel pocket finish"}'
      );
    const r = await OllamaCAMIntegrationEngine.toolSelectAdvisor(
      "Pocket finish in 4140 steel"
    );
    expect(r.success).toBe(true);
    expect(r.parsed?.diameter_mm).toBe(12);
    expect(r.parsed?.flutes).toBe(4);
  });

  it("schema mismatch when diameter_mm missing", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"tool_family":"endmill","flutes":4,"rationale":"x"}');
    const r = await OllamaCAMIntegrationEngine.toolSelectAdvisor("any");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("schema_mismatch");
  });
});

describe("OllamaCAMIntegrationEngine — failure modes", () => {
  it("returns ollama_timeout when bridge reports timeout", async () => {
    bridgeState.queryImpl = async () => fail("AbortError: timeout exceeded");
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("ollama_timeout");
  });

  it("returns ollama_unavailable when bridge reports ECONNREFUSED", async () => {
    bridgeState.queryImpl = async () =>
      fail("fetch failed: ECONNREFUSED 127.0.0.1:11434");
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("ollama_unavailable");
  });

  it("returns empty_response when bridge succeeds with empty body", async () => {
    bridgeState.queryImpl = async () => ({
      success: true,
      response: "",
      model: "qwen2.5-coder:7b",
      latencyMs: 10,
      fallbackUsed: false,
    });
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("empty_response");
  });

  it("returns json_parse_failed for response with no JSON object", async () => {
    bridgeState.queryImpl = async () => ok("Sorry, I cannot help with that.");
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("json_parse_failed");
    expect(r.raw).toBe("Sorry, I cannot help with that.");
  });

  it("returns json_parse_failed when JSON is malformed (truncated)", async () => {
    bridgeState.queryImpl = async () => ok('{"strategy":"x","rationale"');
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("json_parse_failed");
  });

  it("returns ollama_unavailable when bridge import throws", async () => {
    bridgeState.queryImpl = async () => {
      throw new Error("module load failure");
    };
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("steel");
    expect(r.success).toBe(false);
    // Thrown errors map to ollama_unavailable in the catch block
    expect(["ollama_unavailable", "ollama_timeout"]).toContain(r.errorCode);
  });
});

describe("OllamaCAMIntegrationEngine — input validation", () => {
  it("rejects unknown task kind with bad_input", async () => {
    const r = await OllamaCAMIntegrationEngine.query(
      "not_a_task" as never,
      "anything"
    );
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("bad_input");
    expect(r.error).toContain("Unknown CAM task");
  });

  it("rejects empty prompt with bad_input", async () => {
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("bad_input");
  });

  it("rejects whitespace-only prompt with bad_input", async () => {
    const r = await OllamaCAMIntegrationEngine.strategyRecommend("   \n\t");
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("bad_input");
  });

  it("rejects non-string prompt with bad_input", async () => {
    // @ts-expect-error — runtime guard test
    const r = await OllamaCAMIntegrationEngine.strategyRecommend(undefined);
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("bad_input");
  });
});

describe("OllamaCAMIntegrationEngine — option clamping (adversarial)", () => {
  it("clamps timeoutMs above 60000 down to 60000", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"strategy":"x","rationale":"y","alternates":[],"confidence":0.5}');
    await OllamaCAMIntegrationEngine.strategyRecommend("p", {
      timeoutMs: 10_000_000,
    });
    expect(bridgeState.queryCalls.at(-1)?.options.timeoutMs).toBe(60_000);
  });

  it("clamps timeoutMs below 500 up to 500", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"strategy":"x","rationale":"y","alternates":[],"confidence":0.5}');
    await OllamaCAMIntegrationEngine.strategyRecommend("p", { timeoutMs: 1 });
    expect(bridgeState.queryCalls.at(-1)?.options.timeoutMs).toBe(500);
  });

  it("clamps temperature above 1 down to 1", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"strategy":"x","rationale":"y","alternates":[],"confidence":0.5}');
    await OllamaCAMIntegrationEngine.strategyRecommend("p", { temperature: 5 });
    expect(bridgeState.queryCalls.at(-1)?.options.temperature).toBe(1);
  });

  it("clamps NaN options to lower-bound default", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"strategy":"x","rationale":"y","alternates":[],"confidence":0.5}');
    await OllamaCAMIntegrationEngine.strategyRecommend("p", {
      timeoutMs: Number.NaN,
      temperature: Number.NaN,
      maxTokens: Number.NaN,
    });
    const opts = bridgeState.queryCalls.at(-1)?.options;
    expect(opts?.timeoutMs).toBe(500);
    expect(opts?.temperature).toBe(0);
    expect(opts?.maxTokens).toBe(32);
  });

  it("clamps Infinity options to upper bound", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"strategy":"x","rationale":"y","alternates":[],"confidence":0.5}');
    await OllamaCAMIntegrationEngine.strategyRecommend("p", {
      timeoutMs: Infinity,
      maxTokens: Infinity,
    });
    const opts = bridgeState.queryCalls.at(-1)?.options;
    expect(opts?.timeoutMs).toBe(60_000);
    expect(opts?.maxTokens).toBe(4096);
  });

  it("uses defaults when options omitted", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"strategy":"x","rationale":"y","alternates":[],"confidence":0.5}');
    await OllamaCAMIntegrationEngine.strategyRecommend("p");
    const opts = bridgeState.queryCalls.at(-1)?.options;
    expect(opts?.timeoutMs).toBe(8000);
    expect(opts?.temperature).toBe(0);
    expect(opts?.maxTokens).toBe(800);
  });

  it("forwards correct system prompt for each task", async () => {
    bridgeState.queryImpl = async () =>
      ok('{"strategy":"x","rationale":"y","alternates":[],"confidence":0.5}');
    await OllamaCAMIntegrationEngine.strategyRecommend("p");
    const sysPrompt = bridgeState.queryCalls.at(-1)?.options.systemPrompt;
    expect(typeof sysPrompt).toBe("string");
    expect(String(sysPrompt)).toContain("strategy");
  });
});

describe("OllamaCAMIntegrationEngine — healthCheck", () => {
  it("returns available=true when bridge reports available", async () => {
    bridgeState.statusImpl = async () => ({
      available: true,
      baseUrl: "http://localhost:11434",
      models: ["qwen2.5-coder:7b", "deepseek-r1:14b"],
      defaultModel: "qwen2.5-coder:7b",
      lastCheckMs: 12,
    });
    const h = await OllamaCAMIntegrationEngine.healthCheck();
    expect(h.available).toBe(true);
    expect(h.models).toContain("qwen2.5-coder:7b");
    expect(h.models.length).toBeGreaterThanOrEqual(1);
  });

  it("returns available=false on bridge throw without throwing", async () => {
    bridgeState.statusImpl = async () => {
      throw new Error("bridge module unloadable");
    };
    const h = await OllamaCAMIntegrationEngine.healthCheck();
    expect(h.available).toBe(false);
    expect(h.error).toContain("bridge module unloadable");
  });
});

describe("OllamaCAMIntegrationEngine — listTasks / getSystemPrompt", () => {
  it("listTasks returns all 4 supported kinds", () => {
    const tasks = OllamaCAMIntegrationEngine.listTasks();
    expect(tasks.sort()).toEqual(
      [
        "operation_classify",
        "parameter_extract",
        "strategy_recommend",
        "tool_select_advisor",
      ].sort()
    );
  });

  it("getSystemPrompt returns task-appropriate prompt for each kind", () => {
    expect(
      OllamaCAMIntegrationEngine.getSystemPrompt("strategy_recommend")
    ).toContain("strategy");
    expect(
      OllamaCAMIntegrationEngine.getSystemPrompt("parameter_extract")
    ).toContain("parameters");
    expect(
      OllamaCAMIntegrationEngine.getSystemPrompt("operation_classify")
    ).toContain("classify");
    expect(
      OllamaCAMIntegrationEngine.getSystemPrompt("tool_select_advisor")
    ).toContain("tool");
  });

  it("getSystemPrompt throws on unknown task", () => {
    expect(() =>
      OllamaCAMIntegrationEngine.getSystemPrompt("ghost_task" as never)
    ).toThrow(/Unknown CAM task/);
  });
});
