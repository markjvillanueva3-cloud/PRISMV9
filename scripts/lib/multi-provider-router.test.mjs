#!/usr/bin/env node
// U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24 — tests for multi-provider-router.mjs
// Runner: node --test scripts/lib/multi-provider-router.test.mjs
// Pattern: mirrors episode-store test style (node:test, in-memory stubs for I/O).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  PROVIDERS,
  classifyTask,
  recordOutcome,
  loadOutcomes,
  recommendProviderFromHistory,
  localModelForProfile,
  isRateLimitError,
  routeWithFallback,
  routeTaskWithFallback,
} from "./multi-provider-router.mjs";

// ── reactive fallback executor (U-HERMES-LOCAL-AUTONOMY) ─────────────────────
describe("isRateLimitError", () => {
  it("true for 429 / 503 status (object or string)", () => {
    assert.equal(isRateLimitError({ status: 429 }), true);
    assert.equal(isRateLimitError({ statusCode: 503 }), true);
    assert.equal(isRateLimitError({ code: "429" }), true);
  });
  it("true for Anthropic/OpenAI error envelopes", () => {
    assert.equal(isRateLimitError({ error: { type: "rate_limit_error" } }), true);
    assert.equal(isRateLimitError({ type: "overloaded_error" }), true);
  });
  it("true for rate-limit messages + bare strings", () => {
    assert.equal(isRateLimitError(new Error("429 Too Many Requests")), true);
    assert.equal(isRateLimitError(new Error("model is overloaded, try again")), true);
    assert.equal(isRateLimitError("quota exhausted for this 5h window"), true);
  });
  it("false for hard errors + null (never mask a real bug)", () => {
    assert.equal(isRateLimitError(new Error("401 invalid api key")), false);
    assert.equal(isRateLimitError({ status: 400 }), false);
    assert.equal(isRateLimitError(new Error("TypeError: x is undefined")), false);
    assert.equal(isRateLimitError(null), false);
    assert.equal(isRateLimitError(undefined), false);
  });
});

describe("routeWithFallback", () => {
  it("primary succeeds → no fallback (attempts:1, fellBack:false)", async () => {
    const r = await routeWithFallback({ chain: ["claude", "ollama-qwen"], call: async (p) => `ok:${p}` });
    assert.equal(r.provider, "claude");
    assert.equal(r.result, "ok:claude");
    assert.equal(r.attempts, 1);
    assert.equal(r.fellBack, false);
  });
  it("primary rate-limits → falls through to the next provider", async () => {
    const seen = [];
    const r = await routeWithFallback({
      chain: ["claude", "gpt-oss-120b-local", "qwen3-coder-local"],
      call: async (p) => { seen.push(p); if (p === "claude") throw { status: 429, message: "rate_limit" }; return `served-by:${p}`; },
    });
    assert.deepEqual(seen, ["claude", "gpt-oss-120b-local"]);
    assert.equal(r.provider, "gpt-oss-120b-local");
    assert.equal(r.attempts, 2);
    assert.equal(r.fellBack, true);
  });
  it("a NON-rate-limit error fails LOUD immediately (no silent fallback)", async () => {
    let calls = 0;
    await assert.rejects(
      () => routeWithFallback({ chain: ["claude", "ollama-qwen"], call: async () => { calls++; throw new Error("401 auth failed"); } }),
      (e) => { assert.equal(e.code, "PROVIDER_FALLBACK_EXHAUSTED"); return true; },
    );
    assert.equal(calls, 1, "must NOT try the next provider on a hard error");
  });
  it("all providers rate-limit → throws PROVIDER_FALLBACK_EXHAUSTED with the trail", async () => {
    await assert.rejects(
      () => routeWithFallback({ chain: ["claude", "gemini"], call: async () => { throw { status: 429 }; } }),
      (e) => { assert.equal(e.code, "PROVIDER_FALLBACK_EXHAUSTED"); assert.equal(e.attempts.length, 2); return true; },
    );
  });
  it("onFallback observer fires on each switch", async () => {
    const switches = [];
    await routeWithFallback({
      chain: ["claude", "ollama-qwen"],
      call: async (p) => { if (p === "claude") throw new Error("overloaded"); return "ok"; },
      onFallback: (info) => switches.push(`${info.from}->${info.to}`),
    });
    assert.deepEqual(switches, ["claude->ollama-qwen"]);
  });
  it("empty chain / bad call → throws (guard)", async () => {
    await assert.rejects(() => routeWithFallback({ chain: [], call: async () => 1 }), /non-empty array/);
    await assert.rejects(() => routeWithFallback({ chain: ["claude"], call: null }), /must be a/);
  });
});

describe("routeTaskWithFallback", () => {
  it("classifies the prompt then executes its chain with fallback", async () => {
    const tried = [];
    const r = await routeTaskWithFallback({
      prompt: "refactor this function and add types",
      call: async (p) => { tried.push(p); if (tried.length === 1) throw { status: 429 }; return `done:${p}`; },
    });
    assert.ok(r.chain.length >= 2, "a primary + at least one fallback");
    assert.equal(r.fellBack, true, "first provider 429'd → fell back");
    assert.equal(typeof r.taskCategory, "string");
    assert.equal(r.attempts, 2);
  });
});

const SRC_PATH = join(dirname(fileURLToPath(import.meta.url)), "multi-provider-router.mjs");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an in-memory write/read stub that mimics appendFileSync + readFileSync */
function makeMemoryStore() {
  let buffer = "";
  return {
    storePath: "/mem/test-outcomes.jsonl",
    writeImpl: (_path, data, _enc) => { buffer += data; },
    readImpl:  (_path, _enc) => buffer,
    existsImpl: (_path) => buffer.length > 0,
    mkdirImpl:  () => {},
    get buffer() { return buffer; },
    reset() { buffer = ""; },
  };
}

// ---------------------------------------------------------------------------
// 1. PROVIDERS registry shape
// ---------------------------------------------------------------------------

describe("PROVIDERS registry", () => {
  it("contains exactly 6 providers", () => {
    assert.equal(PROVIDERS.length, 6);
  });

  it("every provider has required fields with correct types", () => {
    for (const p of PROVIDERS) {
      assert.equal(typeof p.id, "string",            `${p.id}: id must be string`);
      assert.ok(p.id.length > 0,                      `${p.id}: id must be non-empty`);
      assert.ok(["frontier","capable","local"].includes(p.tier), `${p.id}: invalid tier`);
      assert.ok(Array.isArray(p.strengths),            `${p.id}: strengths must be array`);
      assert.ok(p.strengths.length > 0,                `${p.id}: strengths must be non-empty`);
      assert.equal(typeof p.costPerToken, "number",   `${p.id}: costPerToken must be number`);
      assert.ok(p.costPerToken >= 0,                   `${p.id}: costPerToken must be >= 0`);
      assert.equal(typeof p.contextLimit, "number",   `${p.id}: contextLimit must be number`);
      assert.ok(p.contextLimit > 0,                    `${p.id}: contextLimit must be > 0`);
      assert.ok(["online","offline"].includes(p.availability), `${p.id}: invalid availability`);
    }
  });

  it("local providers have costPerToken = 0", () => {
    const locals = PROVIDERS.filter((p) => p.tier === "local");
    assert.ok(locals.length >= 2, "expect at least 2 local providers");
    for (const p of locals) {
      assert.equal(p.costPerToken, 0, `${p.id}: local provider must be free`);
    }
  });

  it("includes all required provider ids", () => {
    const ids = new Set(PROVIDERS.map((p) => p.id));
    for (const required of ["claude", "gemini", "gpt-4-1", "deepseek-r1", "ollama-qwen", "ollama-deepseek"]) {
      assert.ok(ids.has(required), `missing provider: ${required}`);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. classifyTask — task category detection
// ---------------------------------------------------------------------------

describe("classifyTask — category detection", () => {
  it("classifies 'explain physics of cutting force' → physics", () => {
    const r = classifyTask("explain physics of cutting force");
    assert.equal(r.taskCategory, "physics");
    assert.equal(r.primaryProvider, "claude");
    assert.ok(r.fallbackChain.length > 0, "fallback chain must be non-empty");
  });

  it("classifies 'summarize log file' → summarize + ollama-qwen primary", () => {
    const r = classifyTask("summarize log file");
    assert.equal(r.taskCategory, "summarize");
    assert.equal(r.primaryProvider, "ollama-qwen");
  });

  it("classifies 'write a regex to match ISO dates' → code + claude primary", () => {
    const r = classifyTask("write a regex to match ISO dates");
    assert.equal(r.taskCategory, "code");
    assert.equal(r.primaryProvider, "claude");
    assert.ok(r.fallbackChain.includes("deepseek-r1"), "deepseek-r1 in code fallback");
  });

  it("classifies 'reason about the strategy for this feature' → reasoning + claude primary", () => {
    const r = classifyTask("reason about the strategy for this feature");
    assert.equal(r.taskCategory, "reasoning");
    assert.equal(r.primaryProvider, "claude");
  });

  it("classifies 'classify the material group for P-steel' → classify + ollama-qwen", () => {
    const r = classifyTask("classify the material group for P-steel");
    assert.equal(r.taskCategory, "classify");
    assert.equal(r.primaryProvider, "ollama-qwen");
  });

  it("classifies 'find the engine that handles thermal' → search + ollama-qwen", () => {
    const r = classifyTask("find the engine that handles thermal");
    assert.equal(r.taskCategory, "search");
    assert.equal(r.primaryProvider, "ollama-qwen");
  });

  it("classifies 'bulk process 500 files' → batch + ollama-qwen", () => {
    const r = classifyTask("bulk process 500 files");
    assert.equal(r.taskCategory, "batch");
    assert.equal(r.primaryProvider, "ollama-qwen");
  });

  it("classifies unknown prompt → unknown + claude primary", () => {
    const r = classifyTask("xyzzy quux frobnicate");
    assert.equal(r.taskCategory, "unknown");
    assert.equal(r.primaryProvider, "claude");
  });

  it("result always has reasoning string", () => {
    for (const prompt of ["explain physics", "summarize log", "write code", "xyzzy"]) {
      const r = classifyTask(prompt);
      assert.equal(typeof r.reasoning, "string");
      assert.ok(r.reasoning.length > 0, `reasoning must be non-empty for: ${prompt}`);
    }
  });

  it("throws TypeError on non-string prompt", () => {
    assert.throws(() => classifyTask(42), TypeError);
    assert.throws(() => classifyTask(null), TypeError);
  });
});

// ---------------------------------------------------------------------------
// 3. classifyTask — context modifiers
// ---------------------------------------------------------------------------

describe("classifyTask — context modifiers", () => {
  it("preferOffline promotes a local provider to primary for reasoning", () => {
    const r = classifyTask("reason about the plan", { preferOffline: true });
    const localIds = PROVIDERS.filter((p) => p.availability === "offline").map((p) => p.id);
    assert.ok(localIds.includes(r.primaryProvider),
      `preferOffline should promote local; got ${r.primaryProvider}`);
  });

  it("excludeProviders removes claude from result for reasoning", () => {
    const r = classifyTask("reason about the plan", { excludeProviders: ["claude"] });
    assert.notEqual(r.primaryProvider, "claude");
    assert.ok(!r.fallbackChain.includes("claude"), "claude must not appear in fallback");
  });

  it("excludeProviders does not crash when all providers excluded (degrades gracefully)", () => {
    const all = PROVIDERS.map((p) => p.id);
    // Should not throw — just returns whatever survived filtering
    assert.doesNotThrow(() => classifyTask("reason", { excludeProviders: all }));
  });
});

// ---------------------------------------------------------------------------
// 4. recordOutcome — append shape
// ---------------------------------------------------------------------------

describe("recordOutcome", () => {
  it("returns an id string and appends a valid JSONL line", () => {
    const store = makeMemoryStore();
    const id = recordOutcome(
      { provider: "claude", taskCategory: "reasoning", success: true, latencyMs: 450 },
      store
    );
    assert.equal(typeof id, "string");
    assert.ok(id.startsWith("out-"), `id should start with 'out-'; got ${id}`);

    const lines = store.buffer.trim().split("\n");
    assert.equal(lines.length, 1);
    const rec = JSON.parse(lines[0]);
    assert.equal(rec.provider, "claude");
    assert.equal(rec.taskCategory, "reasoning");
    assert.equal(rec.success, true);
    assert.equal(rec.latencyMs, 450);
    assert.equal(typeof rec.ts, "string");
    assert.equal(typeof rec.id, "string");
  });

  it("throws TypeError on missing provider", () => {
    assert.throws(() => recordOutcome({ provider: "", taskCategory: "code", success: true, latencyMs: 100 }), TypeError);
  });

  it("throws TypeError on non-boolean success", () => {
    assert.throws(() => recordOutcome({ provider: "claude", taskCategory: "code", success: "yes", latencyMs: 100 }), TypeError);
  });

  it("throws TypeError on negative latencyMs", () => {
    assert.throws(() => recordOutcome({ provider: "claude", taskCategory: "code", success: true, latencyMs: -1 }), TypeError);
  });
});

// ---------------------------------------------------------------------------
// 5. loadOutcomes — defensive parsing
// ---------------------------------------------------------------------------

describe("loadOutcomes", () => {
  it("returns empty array when store does not exist", () => {
    const result = loadOutcomes({
      storePath: "/nonexistent/path.jsonl",
      existsImpl: () => false,
    });
    assert.deepEqual(result, []);
  });

  it("skips malformed lines without throwing", () => {
    const goodLine = JSON.stringify({ provider: "gemini", taskCategory: "code", success: true, latencyMs: 300, ts: new Date().toISOString(), id: "out-1" });
    const raw = [goodLine, "NOT JSON AT ALL", '{"partial":true}', ""].join("\n");
    const result = loadOutcomes({
      storePath: "/mem/outcomes.jsonl",
      existsImpl: () => true,
      readImpl: () => raw,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].provider, "gemini");
  });

  it("round-trips multiple records written by recordOutcome", () => {
    const store = makeMemoryStore();
    recordOutcome({ provider: "claude",   taskCategory: "reasoning", success: true,  latencyMs: 500 }, store);
    recordOutcome({ provider: "gpt-4-1",  taskCategory: "reasoning", success: false, latencyMs: 700 }, store);
    recordOutcome({ provider: "gemini",   taskCategory: "summarize",  success: true,  latencyMs: 200 }, store);

    const outcomes = loadOutcomes(store);
    assert.equal(outcomes.length, 3);
    assert.equal(outcomes[0].provider, "claude");
    assert.equal(outcomes[1].provider, "gpt-4-1");
    assert.equal(outcomes[2].provider, "gemini");
  });
});

// ---------------------------------------------------------------------------
// 6. recommendProviderFromHistory — scoring math
// ---------------------------------------------------------------------------

describe("recommendProviderFromHistory — scoring math", () => {
  it("returns static classifyTask primary when no history exists", () => {
    const result = recommendProviderFromHistory("reasoning", 10, {
      storePath: "/empty/path.jsonl",
      existsImpl: () => false,
    });
    // Static primary for reasoning is claude
    assert.equal(result, "claude");
  });

  it("prefers provider with higher success rate", () => {
    const store = makeMemoryStore();
    // ollama-qwen: 3/3 success at 300 ms → score = 1.0 × (1000/300) ≈ 3.33
    // claude:      1/3 success at 300 ms → score = 0.33 × (1000/300) ≈ 1.11
    for (let i = 0; i < 3; i++) {
      recordOutcome({ provider: "ollama-qwen", taskCategory: "summarize", success: true,  latencyMs: 300 }, store);
    }
    for (let i = 0; i < 2; i++) {
      recordOutcome({ provider: "claude",      taskCategory: "summarize", success: false, latencyMs: 300 }, store);
    }
    recordOutcome({ provider: "claude",        taskCategory: "summarize", success: true,  latencyMs: 300 }, store);

    const result = recommendProviderFromHistory("summarize", 10, store);
    assert.equal(result, "ollama-qwen", "higher success rate should win");
  });

  it("prefers provider with lower latency when success rates equal", () => {
    const store = makeMemoryStore();
    // gemini: 2/2 success at 200 ms → score = 1.0 × (1000/200) = 5.0
    // claude: 2/2 success at 600 ms → score = 1.0 × (1000/600) ≈ 1.67
    recordOutcome({ provider: "gemini", taskCategory: "reasoning", success: true, latencyMs: 200 }, store);
    recordOutcome({ provider: "gemini", taskCategory: "reasoning", success: true, latencyMs: 200 }, store);
    recordOutcome({ provider: "claude", taskCategory: "reasoning", success: true, latencyMs: 600 }, store);
    recordOutcome({ provider: "claude", taskCategory: "reasoning", success: true, latencyMs: 600 }, store);

    const result = recommendProviderFromHistory("reasoning", 10, store);
    assert.equal(result, "gemini", "lower latency should win when success rates equal");
  });

  it("respects the n window — only considers last n records", () => {
    const store = makeMemoryStore();
    // First 5 records: claude successful
    for (let i = 0; i < 5; i++) {
      recordOutcome({ provider: "claude",   taskCategory: "code", success: true,  latencyMs: 400 }, store);
    }
    // Last 3 records (within window=3): gemini faster and successful
    for (let i = 0; i < 3; i++) {
      recordOutcome({ provider: "gemini",   taskCategory: "code", success: true,  latencyMs: 100 }, store);
    }

    const result = recommendProviderFromHistory("code", 3, store);
    assert.equal(result, "gemini", "window=3 should only see the 3 gemini records");
  });

  it("ignores records for other categories", () => {
    const store = makeMemoryStore();
    // Many successful records for wrong category
    for (let i = 0; i < 5; i++) {
      recordOutcome({ provider: "gpt-4-1", taskCategory: "summarize", success: true, latencyMs: 100 }, store);
    }
    // One record for target category
    recordOutcome({ provider: "ollama-deepseek", taskCategory: "code", success: true, latencyMs: 200 }, store);

    const result = recommendProviderFromHistory("code", 10, store);
    assert.equal(result, "ollama-deepseek", "should only use records matching taskCategory");
  });
});

// ---------------------------------------------------------------------------
// 7. Host-aware honest reason wiring (Rank-8 token-savings / doc-vs-reality fix)
//
// INTENT: the routing REASON must NOT hardcode a stale small-model literal. It
// must derive the local model name from the resolved HardwareProfile AND reflect
// the routed model when the FINAL primary is a local provider. After the small
// coders (3b/7b/14b) were RETIRED fleet-wide (BLACKWELL-MODEL-UPGRADE-PLAN), every
// profile resolves to the kept floor qwen2.5-coder:32b. The routing DECISION must
// be unchanged by the host profile.
// ---------------------------------------------------------------------------

describe("localModelForProfile — profile→model single source of truth", () => {
  it("maps every HardwareProfile to the kept floor (small models retired)", () => {
    assert.equal(localModelForProfile("home_blackwell"), "qwen2.5-coder:32b");
    assert.equal(localModelForProfile("home_4080"), "qwen2.5-coder:32b");
    assert.equal(localModelForProfile("work_3080"), "qwen2.5-coder:32b");
    assert.equal(localModelForProfile("cloud_only"), "qwen2.5-coder:32b");
  });

  it("falls back to the kept floor for null/undefined/unknown host class", () => {
    assert.equal(localModelForProfile(null), "qwen2.5-coder:32b");
    assert.equal(localModelForProfile(undefined), "qwen2.5-coder:32b");
    assert.equal(localModelForProfile("not-a-real-profile"), "qwen2.5-coder:32b");
  });
});

describe("classifyTask — honest host-aware reason", () => {
  it("the model is derived (not a hardcoded reasonNote literal) AND no retired tag survives", () => {
    const src = readFileSync(SRC_PATH, "utf8");
    // The summarize reasonNote previously inlined "...(qwen2.5-coder:7b)...".
    // That literal-in-reason pattern must be gone — the model must be derived.
    assert.ok(
      !/reasonNote\s*=\s*["'`][^"'`]*qwen2\.5-coder:(3b|7b|14b)/.test(src),
      "a reasonNote assignment still hardcodes a retired small-model literal",
    );
    // Anti-revert: the retired small tags must NOT appear anywhere in the router —
    // they were deleted from the host, so every profile resolves to the 32b floor.
    assert.equal(
      (src.match(/qwen2\.5-coder:(3b|7b|14b)|deepseek-r1:14b/g) || []).length,
      0,
      "a retired model tag still appears in multi-provider-router.mjs",
    );
  });

  it("summarize reason names the Blackwell 32b model (not stale 7b) when pinned", () => {
    const r = classifyTask("summarize this long document", { hostProfile: "home_blackwell" });
    assert.equal(r.taskCategory, "summarize");
    assert.equal(r.primaryProvider, "ollama-qwen"); // decision unchanged
    assert.match(r.reasoning, /qwen2\.5-coder:32b/);
    assert.doesNotMatch(r.reasoning, /qwen2\.5-coder:7b/, "must not name stale 7b on a Blackwell host");
  });

  it("summarize reason names the kept 32b floor when pinned to work_3080 (small models retired)", () => {
    const r = classifyTask("tldr the meeting notes", { hostProfile: "work_3080" });
    assert.equal(r.taskCategory, "summarize");
    assert.match(r.reasoning, /qwen2\.5-coder:32b/);
    assert.doesNotMatch(r.reasoning, /qwen2\.5-coder:3b/, "must not name a retired small model");
  });

  it("summarize reason names the kept 32b floor for home_4080 (small models retired)", () => {
    const r = classifyTask("condense this file", { hostProfile: "home_4080" });
    assert.equal(r.taskCategory, "summarize");
    assert.match(r.reasoning, /qwen2\.5-coder:32b/);
  });

  it("unknown host class (null) yields the kept 32b floor in the reason", () => {
    const r = classifyTask("summarise the report", { hostProfile: null });
    assert.equal(r.taskCategory, "summarize");
    assert.match(r.reasoning, /qwen2\.5-coder:32b/);
  });

  it("resolves the profile via injected detectHostClassImpl (proves derivation, not hardcode)", () => {
    let called = 0;
    const fakeDetect = () => { called += 1; return "home_blackwell"; };
    const r = classifyTask("digest these docs", { detectHostClassImpl: fakeDetect });
    assert.equal(called, 1, "detectHostClassImpl must be invoked exactly once");
    assert.match(r.reasoning, /qwen2\.5-coder:32b/);
  });

  it("a local-primary route reflects the ROUTED local model in the reason", () => {
    const r = classifyTask("classify these line items", { hostProfile: "home_blackwell" });
    assert.equal(r.taskCategory, "classify");
    assert.equal(r.primaryProvider, "ollama-qwen"); // local primary
    assert.match(r.reasoning, /routed local model: qwen2\.5-coder:32b/);
  });

  it("a frontier-primary route (reasoning→claude) does NOT name any local model", () => {
    const r = classifyTask("explain why this design is sound", { hostProfile: "home_blackwell" });
    assert.equal(r.taskCategory, "reasoning");
    assert.equal(r.primaryProvider, "claude");
    assert.doesNotMatch(r.reasoning, /routed local model/);
    assert.doesNotMatch(r.reasoning, /qwen2\.5-coder/, "frontier route must not name a local model");
  });

  it("host profile changes the reason but NEVER the routing decision", () => {
    const prompts = [
      "summarize this",
      "classify these tags",
      "reason about the architecture",
      "write code to parse json",
      "batch process 500 files",
      "find the engine that handles thermal",
    ];
    const profiles = ["home_blackwell", "home_4080", "work_3080", "cloud_only", null];
    for (const p of prompts) {
      const base = classifyTask(p, { hostProfile: null });
      for (const prof of profiles) {
        const r = classifyTask(p, { hostProfile: prof });
        assert.equal(r.primaryProvider, base.primaryProvider, `primary drifted for "${p}" @ ${prof}`);
        assert.deepEqual(r.fallbackChain, base.fallbackChain, `fallback drifted for "${p}" @ ${prof}`);
        assert.equal(r.taskCategory, base.taskCategory, `category drifted for "${p}" @ ${prof}`);
      }
    }
  });

  it("preferOffline promotes a local primary and names the kept 32b floor", () => {
    const r = classifyTask("reason about the design", { preferOffline: true, hostProfile: "work_3080" });
    // reasoning normally → claude; preferOffline promotes the first local provider.
    assert.equal(r.primaryProvider, "ollama-qwen");
    assert.match(r.reasoning, /preferOffline/);
    assert.match(r.reasoning, /routed local model: qwen2\.5-coder:32b/);
  });
});
